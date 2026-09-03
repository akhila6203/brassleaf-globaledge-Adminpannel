const pool = require('../config/db');
const P = require('../config/prefix');
const { nowLocal } = require('../utils/datetime');
const { withTransaction } = require('../utils/transaction');
const { upsertOrderMeta } = require('../utils/meta');

/*
 * Creates WooCommerce PDF Invoice number
 * using the SAME existing sequence table:
 *
 * wpwd_wcpdf_invoice_number
 *
 * Old data:
 * invoice 2081 -> order 13225
 *
 * Next generated invoice:
 * 2082
 *
 * IMPORTANT:
 * This function is idempotent.
 * Same order ki second time new invoice number create avvadu.
 */
async function ensureInvoiceNumber(
  orderId,
  existingConn = null
) {
  const numericOrderId =
    Number(orderId);

  if (
    !Number.isInteger(numericOrderId) ||
    numericOrderId <= 0
  ) {
    throw new Error(
      'Valid order ID is required for invoice generation.'
    );
  }

  const run =
    async (conn) => {
      /*
       * First check invoice sequence table.
       */
      const [[existingInvoice]] =
        await conn.query(
          `SELECT
             id,
             order_id,
             date,
             calculated_number
           FROM ${P}wcpdf_invoice_number
           WHERE order_id = ?
           ORDER BY id DESC
           LIMIT 1`,
          [numericOrderId]
        );

      /*
       * Already generated.
       * Just make sure metadata exists.
       */
      if (existingInvoice) {
        const invoiceNumber =
          Number(
            existingInvoice.calculated_number ||
            existingInvoice.id
          );

        const invoiceDate =
          existingInvoice.date ||
          nowLocal();

        await saveInvoiceMeta(
          conn,
          numericOrderId,
          invoiceNumber,
          invoiceDate
        );

        return {
          invoiceNumber,
          invoiceDate,
          created: false,
        };
      }

      /*
       * Check old WooCommerce invoice meta too.
       *
       * This protects old imported orders.
       */
      const [[existingMeta]] =
        await conn.query(
          `SELECT meta_value
           FROM ${P}wc_orders_meta
           WHERE order_id = ?
             AND meta_key = '_wcpdf_invoice_number'
           LIMIT 1`,
          [numericOrderId]
        );

      if (
        existingMeta &&
        Number(existingMeta.meta_value) > 0
      ) {
        const invoiceNumber =
          Number(existingMeta.meta_value);

        return {
          invoiceNumber,
          invoiceDate: null,
          created: false,
        };
      }

      const invoiceDate =
        nowLocal();

      /*
       * Insert into the SAME WordPress PDF Invoice sequence table.
       *
       * id is AUTO_INCREMENT.
       *
       * Existing database pattern:
       *
       * id 2081
       * calculated_number 2081
       *
       * So first insert gets new auto increment id,
       * then calculated_number is set to that id.
       */
      const [insertResult] =
        await conn.query(
          `INSERT INTO ${P}wcpdf_invoice_number
             (
               order_id,
               date,
               calculated_number
             )
           VALUES (?, ?, NULL)`,
          [
            numericOrderId,
            invoiceDate,
          ]
        );

      const invoiceNumber =
        Number(
          insertResult.insertId
        );

      await conn.query(
        `UPDATE ${P}wcpdf_invoice_number
         SET calculated_number = ?
         WHERE id = ?`,
        [
          invoiceNumber,
          invoiceNumber,
        ]
      );

      await saveInvoiceMeta(
        conn,
        numericOrderId,
        invoiceNumber,
        invoiceDate
      );

      return {
        invoiceNumber,
        invoiceDate,
        created: true,
      };
    };

  /*
   * If caller already has transaction,
   * use same connection.
   */
  if (existingConn) {
    return run(existingConn);
  }

  return withTransaction(
    pool,
    run
  );
}

async function saveInvoiceMeta(
  conn,
  orderId,
  invoiceNumber,
  invoiceDate
) {
  const formattedDate =
    formatMysqlDateTime(
      invoiceDate
    );

  const unixTimestamp =
    Math.floor(
      new Date(
        String(formattedDate)
          .replace(' ', 'T') +
          '+05:30'
      ).getTime() / 1000
    );

  /*
   * Same meta fields available
   * on old WordPress orders.
   */
  await upsertOrderMeta(
    conn,
    P,
    orderId,
    '_wcpdf_invoice_number',
    String(invoiceNumber)
  );

  await upsertOrderMeta(
    conn,
    P,
    orderId,
    '_wcpdf_invoice_date_formatted',
    formattedDate
  );

  await upsertOrderMeta(
    conn,
    P,
    orderId,
    '_wcpdf_invoice_date',
    String(
      Number.isFinite(unixTimestamp)
        ? unixTimestamp
        : Math.floor(Date.now() / 1000)
    )
  );

  /*
   * Optional compatibility meta.
   * Existing old WooCommerce PDF Invoice
   * orders contain this field.
   */
  const numberData =
    serializeInvoiceNumberData(
      invoiceNumber,
      orderId
    );

  await upsertOrderMeta(
    conn,
    P,
    orderId,
    '_wcpdf_invoice_number_data',
    numberData
  );
}

function formatMysqlDateTime(
  value
) {
  if (!value) {
    return nowLocal();
  }

  if (
    typeof value === 'string'
  ) {
    return value
      .slice(0, 19)
      .replace('T', ' ');
  }

  const d =
    new Date(value);

  if (
    Number.isNaN(d.getTime())
  ) {
    return nowLocal();
  }

  const pad =
    (n) =>
      String(n).padStart(
        2,
        '0'
      );

  return (
    `${d.getFullYear()}-` +
    `${pad(d.getMonth() + 1)}-` +
    `${pad(d.getDate())} ` +
    `${pad(d.getHours())}:` +
    `${pad(d.getMinutes())}:` +
    `${pad(d.getSeconds())}`
  );
}

/*
 * PHP serialized format compatible with
 * old _wcpdf_invoice_number_data values.
 */
function serializeInvoiceNumberData(
  invoiceNumber,
  orderId
) {
  const number =
    Number(invoiceNumber);

  const formattedNumber =
    String(number);

  const numericOrderId =
    Number(orderId);

  return (
    'a:7:{' +
    's:6:"number";' +
    `i:${number};` +
    's:16:"formatted_number";' +
    `s:${Buffer.byteLength(
      formattedNumber,
      'utf8'
    )}:"${formattedNumber}";` +
    's:6:"prefix";s:0:"";' +
    's:6:"suffix";s:0:"";' +
    's:13:"document_type";s:7:"invoice";' +
    's:8:"order_id";' +
    `i:${numericOrderId};` +
    's:7:"padding";s:0:"";' +
    '}'
  );
}

async function getInvoiceForOrder(
  orderId
) {
  const [[row]] =
    await pool.query(
      `SELECT
         inv.id,
         inv.order_id,
         inv.date,
         inv.calculated_number,
         invm.meta_value AS meta_invoice_number,
         invd.meta_value AS invoice_date_formatted
       FROM ${P}wc_orders o

       LEFT JOIN ${P}wcpdf_invoice_number inv
         ON inv.order_id = o.id

       LEFT JOIN ${P}wc_orders_meta invm
         ON invm.order_id = o.id
        AND invm.meta_key =
          '_wcpdf_invoice_number'

       LEFT JOIN ${P}wc_orders_meta invd
         ON invd.order_id = o.id
        AND invd.meta_key =
          '_wcpdf_invoice_date_formatted'

       WHERE o.id = ?
       LIMIT 1`,
      [Number(orderId)]
    );

  if (!row) {
    return null;
  }

  const invoiceNumber =
    row.calculated_number ??
    (
      row.meta_invoice_number != null
        ? Number(
            row.meta_invoice_number
          )
        : null
    );

  return {
    invoiceNumber,
    invoice_number:
      invoiceNumber,
    invoiceDate:
      row.invoice_date_formatted ||
      row.date ||
      null,
    invoice_date:
      row.invoice_date_formatted ||
      row.date ||
      null,
  };
}

module.exports = {
  ensureInvoiceNumber,
  getInvoiceForOrder,
};
const pool = require('../config/db');
const P = require('../config/prefix');
const { parseList, listResponse } = require('../utils/listParams');
const { nowLocal, nowGmt } = require('../utils/datetime');
const { upsertOrderMeta } = require('../utils/meta');
const { withTransaction } = require('../utils/transaction');
const { httpError } = require('../utils/httpError');

const SORT = {
  id: 'o.id',
  date: 'o.date_created_gmt',
  total: 'o.total_amount',
  status: 'o.status',
  email: 'o.billing_email',
};

function normalizeStatus(status) {
  if (!status) return null;
  let s = String(status).trim().toLowerCase();
  if (!s.startsWith('wc-')) s = `wc-${s}`;
  return s;
}

async function list(req) {
  const { page, limit, offset, sortCol, dir, search } = parseList(req, SORT, 'date');
  const status = req.query.status ? normalizeStatus(req.query.status) : '';
  const payment = req.query.payment_method || '';
  const params = [];
  // let where = `o.type = 'shop_order'`;
  let where = `
  o.type = 'shop_order'
  AND o.status IN (
    'wc-processing',
    'wc-completed'
  )
`;

  if (status) {
    where += ` AND o.status = ?`;
    params.push(status);
  }
  if (payment) {
    where += ` AND o.payment_method = ?`;
    params.push(payment);
  }
  if (search) {
    where += ` AND (o.billing_email LIKE ? OR CAST(o.id AS CHAR) LIKE ? OR a.first_name LIKE ? OR a.last_name LIKE ? OR o.transaction_id LIKE ?)`;
    const q = `%${search}%`;
    params.push(q, q, q, q, q);
  }

  const from = `
    FROM ${P}wc_orders o
    LEFT JOIN ${P}wc_order_addresses a
      ON a.order_id = o.id AND a.address_type = 'billing'`;

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(DISTINCT o.id) AS total ${from} WHERE ${where}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT
       o.id, o.status, o.currency, o.total_amount, o.tax_amount,
       o.billing_email, o.payment_method, o.payment_method_title,
       o.transaction_id, o.date_created_gmt, o.date_updated_gmt, o.customer_id,
       a.first_name, a.last_name, a.phone, a.city, a.state, a.country
     ${from}
     WHERE ${where}
     ORDER BY ${sortCol} ${dir}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return listResponse(rows, total, page, limit);
}

async function getById(id) {
  const [[order]] = await pool.query(
    `SELECT
       o.id, o.status, o.currency, o.type, o.total_amount, o.tax_amount,
       o.billing_email, o.payment_method, o.payment_method_title,
       o.transaction_id, o.ip_address, o.customer_note, o.user_agent,
       o.date_created_gmt, o.date_updated_gmt, o.customer_id, o.parent_order_id,
       op.order_key, op.created_via, op.woocommerce_version,
       op.prices_include_tax, op.date_paid_gmt, op.date_completed_gmt,
       op.shipping_total_amount, op.discount_total_amount,
       op.shipping_tax_amount, op.discount_tax_amount
     FROM ${P}wc_orders o
     LEFT JOIN ${P}wc_order_operational_data op ON op.order_id = o.id
     WHERE o.id = ?`,
    [id]
  );
  if (!order) throw httpError(404, 'Order not found');

  const [addresses] = await pool.query(
    `SELECT * FROM ${P}wc_order_addresses WHERE order_id = ?`,
    [id]
  );

  const [items] = await pool.query(
    `SELECT
       oi.order_item_id, oi.order_item_name, oi.order_item_type,
       oim_pid.meta_value AS product_id,
       oim_vid.meta_value AS variation_id,
       oim_qty.meta_value AS qty,
       oim_sub.meta_value AS line_subtotal,
       oim_tot.meta_value AS line_total,
       oim_tax.meta_value AS line_tax,
       oim_size.meta_value AS size,
       oim_sku.meta_value AS sku,
       oim_method.meta_value AS method_id,
       oim_instance.meta_value AS instance_id,
       oim_cost.meta_value AS cost,
       oim_total_tax.meta_value AS total_tax
     FROM ${P}woocommerce_order_items oi
     LEFT JOIN ${P}woocommerce_order_itemmeta oim_pid
       ON oim_pid.order_item_id = oi.order_item_id AND oim_pid.meta_key = '_product_id'
     LEFT JOIN ${P}woocommerce_order_itemmeta oim_vid
       ON oim_vid.order_item_id = oi.order_item_id AND oim_vid.meta_key = '_variation_id'
     LEFT JOIN ${P}woocommerce_order_itemmeta oim_qty
       ON oim_qty.order_item_id = oi.order_item_id AND oim_qty.meta_key = '_qty'
     LEFT JOIN ${P}woocommerce_order_itemmeta oim_sub
       ON oim_sub.order_item_id = oi.order_item_id AND oim_sub.meta_key = '_line_subtotal'
     LEFT JOIN ${P}woocommerce_order_itemmeta oim_tot
       ON oim_tot.order_item_id = oi.order_item_id AND oim_tot.meta_key = '_line_total'
     LEFT JOIN ${P}woocommerce_order_itemmeta oim_tax
       ON oim_tax.order_item_id = oi.order_item_id AND oim_tax.meta_key = '_line_tax'
     LEFT JOIN ${P}woocommerce_order_itemmeta oim_size
       ON oim_size.order_item_id = oi.order_item_id AND oim_size.meta_key = 'pa_size'
     LEFT JOIN ${P}woocommerce_order_itemmeta oim_sku
       ON oim_sku.order_item_id = oi.order_item_id AND oim_sku.meta_key = '_sku'
     LEFT JOIN ${P}woocommerce_order_itemmeta oim_method
       ON oim_method.order_item_id = oi.order_item_id AND oim_method.meta_key = 'method_id'
     LEFT JOIN ${P}woocommerce_order_itemmeta oim_instance
       ON oim_instance.order_item_id = oi.order_item_id AND oim_instance.meta_key = 'instance_id'
     LEFT JOIN ${P}woocommerce_order_itemmeta oim_cost
       ON oim_cost.order_item_id = oi.order_item_id AND oim_cost.meta_key = 'cost'
     LEFT JOIN ${P}woocommerce_order_itemmeta oim_total_tax
       ON oim_total_tax.order_item_id = oi.order_item_id AND oim_total_tax.meta_key = 'total_tax'
     WHERE oi.order_id = ?
     ORDER BY oi.order_item_type, oi.order_item_id`,
    [id]
  );

  const [meta] = await pool.query(
    `SELECT meta_key, meta_value FROM ${P}wc_orders_meta WHERE order_id = ?`,
    [id]
  );

  const [notes] = await pool.query(
    `SELECT comment_ID AS id, comment_content AS content, comment_date AS date,
            comment_date_gmt AS date_gmt, user_id, comment_author AS author
     FROM ${P}comments
     WHERE comment_post_ID = ? AND comment_type = 'order_note'
     ORDER BY comment_date_gmt DESC`,
    [id]
  );

  const [[paytm]] = await pool.query(
    `SELECT id, order_id, paytm_order_id, transaction_id, status, paytm_response,
            date_added, date_modified
     FROM ${P}paytm_order_data WHERE order_id = ?`,
    [id]
  );

  let paytmShaped = null;
  if (paytm) {
    try {
      const { parsePaytmResponse } = require('./paymentService');
      const { gateway, raw } = parsePaytmResponse(paytm.paytm_response);
      paytmShaped = {
        id: paytm.id,
        order_id: paytm.order_id,
        paytm_order_id: paytm.paytm_order_id,
        transaction_id: paytm.transaction_id,
        status: paytm.status,
        date_added: paytm.date_added,
        date_modified: paytm.date_modified,
        gateway,
        paytm_response: raw,
      };
    } catch {
      paytmShaped = {
        id: paytm.id,
        order_id: paytm.order_id,
        paytm_order_id: paytm.paytm_order_id,
        transaction_id: paytm.transaction_id,
        status: paytm.status,
        date_added: paytm.date_added,
        date_modified: paytm.date_modified,
      };
    }
  }

  const metaMap = {};
  for (const m of meta) metaMap[m.meta_key] = m.meta_value;

  const billing = addresses.find((a) => a.address_type === 'billing') || null;
  const shippingAddr = addresses.find((a) => a.address_type === 'shipping') || null;
  const lineItems = items.filter((i) => i.order_item_type === 'line_item');
  const shippingItems = items.filter((i) => i.order_item_type === 'shipping');
  const taxItems = items.filter((i) => i.order_item_type === 'tax');
  const couponItems = items.filter((i) => i.order_item_type === 'coupon');
  const feeItems = items.filter((i) => i.order_item_type === 'fee');

  return {
    ...order,
    addresses,
    billing,
    shipping: shippingAddr,
    items,
    line_items: lineItems,
    shipping_items: shippingItems,
    tax_items: taxItems,
    coupon_items: couponItems,
    fee_items: feeItems,
    meta,
    notes,
    paytm: paytmShaped,
    tracking_number: metaMap._tracking_number || null,
    tracking_provider: metaMap._tracking_provider || null,
    shipment_status: metaMap._shipment_status || null,
  };
}

async function insertOrderNote(conn, orderId, content, userId = 0, author = 'WooCommerce') {
  const local = nowLocal();
  const gmt = nowGmt();
  const [result] = await conn.query(
    `INSERT INTO ${P}comments
      (comment_post_ID, comment_author, comment_author_email, comment_author_url,
       comment_author_IP, comment_date, comment_date_gmt, comment_content,
       comment_karma, comment_approved, comment_agent, comment_type, comment_parent, user_id)
     VALUES (?, ?, '', '', '', ?, ?, ?, 0, '1', 'WooCommerce', 'order_note', 0, ?)`,
    [orderId, author, local, gmt, content, userId || 0]
  );
  return result.insertId;
}

async function updateStatus(id, status, adminUserId = 0) {
  const normalized = normalizeStatus(status);
  if (!normalized) throw httpError(400, 'status is required');

  const [[order]] = await pool.query(
    `SELECT id, status FROM ${P}wc_orders WHERE id = ?`,
    [id]
  );
  if (!order) throw httpError(404, 'Order not found');

  return withTransaction(pool, async (conn) => {
    const gmt = nowGmt();
    await conn.query(
      `UPDATE ${P}wc_orders SET status = ?, date_updated_gmt = ? WHERE id = ?`,
      [normalized, gmt, id]
    );
    await conn.query(
      `UPDATE ${P}posts SET post_status = ?, post_modified_gmt = ?
       WHERE ID = ? AND post_type = 'shop_order_placehold'`,
      [normalized, gmt, id]
    );
    await conn.query(
      `UPDATE ${P}wc_order_stats SET status = ? WHERE order_id = ?`,
      [normalized, id]
    );

    if (normalized === 'wc-completed') {
      await conn.query(
        `UPDATE ${P}wc_order_operational_data
         SET date_completed_gmt = COALESCE(date_completed_gmt, ?)
         WHERE order_id = ?`,
        [gmt, id]
      );
    }

    await insertOrderNote(
      conn,
      id,
      `Order status changed from ${order.status} to ${normalized}.`,
      adminUserId
    );

    return getById(id);
  });
}

async function addNote(id, content, adminUserId = 0, isCustomerNote = false) {
  if (!content) throw httpError(400, 'content is required');
  const [[order]] = await pool.query(`SELECT id FROM ${P}wc_orders WHERE id = ?`, [id]);
  if (!order) throw httpError(404, 'Order not found');

  return withTransaction(pool, async (conn) => {
    const noteId = await insertOrderNote(conn, id, content, adminUserId);
    if (isCustomerNote) {
      await conn.query(
        `INSERT INTO ${P}commentmeta (comment_id, meta_key, meta_value) VALUES (?, 'is_customer_note', '1')`,
        [noteId]
      );
    }
    return getById(id);
  });
}

async function updateShipment(id, data = {}) {
  const [[order]] = await pool.query(`SELECT id FROM ${P}wc_orders WHERE id = ?`, [id]);
  if (!order) throw httpError(404, 'Order not found');

  return withTransaction(pool, async (conn) => {
    if (data.tracking_number != null) {
      await upsertOrderMeta(conn, P, id, '_tracking_number', data.tracking_number);
    }
    if (data.tracking_provider != null) {
      await upsertOrderMeta(conn, P, id, '_tracking_provider', data.tracking_provider);
    }
    if (data.shipment_status != null) {
      await upsertOrderMeta(conn, P, id, '_shipment_status', data.shipment_status);
    }
    const parts = [];
    if (data.tracking_number) parts.push(`tracking ${data.tracking_number}`);
    if (data.tracking_provider) parts.push(`via ${data.tracking_provider}`);
    if (data.shipment_status) parts.push(`status ${data.shipment_status}`);
    if (parts.length) {
      await insertOrderNote(conn, id, `Shipment updated: ${parts.join(', ')}.`);
    }
    await conn.query(
      `UPDATE ${P}wc_orders SET date_updated_gmt = ? WHERE id = ?`,
      [nowGmt(), id]
    );
    return getById(id);
  });
}

module.exports = { list, getById, updateStatus, addNote, updateShipment, normalizeStatus };



// const pool = require('../config/db');
// const P = require('../config/prefix');
// const { parseList, listResponse } = require('../utils/listParams');
// const { nowLocal, nowGmt } = require('../utils/datetime');
// const { upsertOrderMeta } = require('../utils/meta');
// const { withTransaction } = require('../utils/transaction');
// const { httpError } = require('../utils/httpError');

// const SORT = {
//   id: 'o.id',
//   date: 'o.date_created_gmt',
//   total: 'o.total_amount',
//   status: 'o.status',
//   email: 'o.billing_email',
// };

// function normalizeStatus(status) {
//   if (!status) return null;
//   let s = String(status).trim().toLowerCase();
//   if (!s.startsWith('wc-')) s = `wc-${s}`;
//   return s;
// }

// async function list(req) {
//   const { page, limit, offset, sortCol, dir, search } = parseList(req, SORT, 'date');
//   const status = req.query.status ? normalizeStatus(req.query.status) : '';
//   const payment = req.query.payment_method || '';
//   const params = [];
//   let where = `o.type = 'shop_order'`;

//   if (status) {
//     where += ` AND o.status = ?`;
//     params.push(status);
//   }
//   if (payment) {
//     where += ` AND o.payment_method = ?`;
//     params.push(payment);
//   }
//   if (search) {
//     where += ` AND (o.billing_email LIKE ? OR CAST(o.id AS CHAR) LIKE ? OR a.first_name LIKE ? OR a.last_name LIKE ? OR o.transaction_id LIKE ?)`;
//     const q = `%${search}%`;
//     params.push(q, q, q, q, q);
//   }

//   const from = `
//     FROM ${P}wc_orders o
//     LEFT JOIN ${P}wc_order_addresses a
//       ON a.order_id = o.id AND a.address_type = 'billing'`;

//   const [[{ total }]] = await pool.query(
//     `SELECT COUNT(DISTINCT o.id) AS total ${from} WHERE ${where}`,
//     params
//   );

//   const [rows] = await pool.query(
//     `SELECT
//        o.id, o.status, o.currency, o.total_amount, o.tax_amount,
//        o.billing_email, o.payment_method, o.payment_method_title,
//        o.transaction_id, o.date_created_gmt, o.date_updated_gmt, o.customer_id,
//        a.first_name, a.last_name, a.phone, a.city, a.state, a.country
//      ${from}
//      WHERE ${where}
//      ORDER BY ${sortCol} ${dir}
//      LIMIT ? OFFSET ?`,
//     [...params, limit, offset]
//   );

//   return listResponse(rows, total, page, limit);
// }

// async function getById(id) {
//   const [[order]] = await pool.query(
//     `SELECT
//        o.id, o.status, o.currency, o.type, o.total_amount, o.tax_amount,
//        o.billing_email, o.payment_method, o.payment_method_title,
//        o.transaction_id, o.ip_address, o.customer_note, o.user_agent,
//        o.date_created_gmt, o.date_updated_gmt, o.customer_id, o.parent_order_id,
//        op.order_key, op.created_via, op.woocommerce_version,
//        op.prices_include_tax, op.date_paid_gmt, op.date_completed_gmt,
//        op.shipping_total_amount, op.discount_total_amount,
//        op.shipping_tax_amount, op.discount_tax_amount
//      FROM ${P}wc_orders o
//      LEFT JOIN ${P}wc_order_operational_data op ON op.order_id = o.id
//      WHERE o.id = ?`,
//     [id]
//   );
//   if (!order) throw httpError(404, 'Order not found');

//   const [addresses] = await pool.query(
//     `SELECT * FROM ${P}wc_order_addresses WHERE order_id = ?`,
//     [id]
//   );

//   const [items] = await pool.query(
//     `SELECT
//        oi.order_item_id, oi.order_item_name, oi.order_item_type,
//        oim_pid.meta_value AS product_id,
//        oim_vid.meta_value AS variation_id,
//        oim_qty.meta_value AS qty,
//        oim_sub.meta_value AS line_subtotal,
//        oim_tot.meta_value AS line_total,
//        oim_tax.meta_value AS line_tax,
//        oim_size.meta_value AS size,
//        oim_sku.meta_value AS sku,
//        oim_method.meta_value AS method_id,
//        oim_instance.meta_value AS instance_id,
//        oim_cost.meta_value AS cost,
//        oim_total_tax.meta_value AS total_tax
//      FROM ${P}woocommerce_order_items oi
//      LEFT JOIN ${P}woocommerce_order_itemmeta oim_pid
//        ON oim_pid.order_item_id = oi.order_item_id AND oim_pid.meta_key = '_product_id'
//      LEFT JOIN ${P}woocommerce_order_itemmeta oim_vid
//        ON oim_vid.order_item_id = oi.order_item_id AND oim_vid.meta_key = '_variation_id'
//      LEFT JOIN ${P}woocommerce_order_itemmeta oim_qty
//        ON oim_qty.order_item_id = oi.order_item_id AND oim_qty.meta_key = '_qty'
//      LEFT JOIN ${P}woocommerce_order_itemmeta oim_sub
//        ON oim_sub.order_item_id = oi.order_item_id AND oim_sub.meta_key = '_line_subtotal'
//      LEFT JOIN ${P}woocommerce_order_itemmeta oim_tot
//        ON oim_tot.order_item_id = oi.order_item_id AND oim_tot.meta_key = '_line_total'
//      LEFT JOIN ${P}woocommerce_order_itemmeta oim_tax
//        ON oim_tax.order_item_id = oi.order_item_id AND oim_tax.meta_key = '_line_tax'
//      LEFT JOIN ${P}woocommerce_order_itemmeta oim_size
//        ON oim_size.order_item_id = oi.order_item_id AND oim_size.meta_key = 'pa_size'
//      LEFT JOIN ${P}woocommerce_order_itemmeta oim_sku
//        ON oim_sku.order_item_id = oi.order_item_id AND oim_sku.meta_key = '_sku'
//      LEFT JOIN ${P}woocommerce_order_itemmeta oim_method
//        ON oim_method.order_item_id = oi.order_item_id AND oim_method.meta_key = 'method_id'
//      LEFT JOIN ${P}woocommerce_order_itemmeta oim_instance
//        ON oim_instance.order_item_id = oi.order_item_id AND oim_instance.meta_key = 'instance_id'
//      LEFT JOIN ${P}woocommerce_order_itemmeta oim_cost
//        ON oim_cost.order_item_id = oi.order_item_id AND oim_cost.meta_key = 'cost'
//      LEFT JOIN ${P}woocommerce_order_itemmeta oim_total_tax
//        ON oim_total_tax.order_item_id = oi.order_item_id AND oim_total_tax.meta_key = 'total_tax'
//      WHERE oi.order_id = ?
//      ORDER BY oi.order_item_type, oi.order_item_id`,
//     [id]
//   );

//   const [meta] = await pool.query(
//     `SELECT meta_key, meta_value FROM ${P}wc_orders_meta WHERE order_id = ?`,
//     [id]
//   );

//   const [notes] = await pool.query(
//     `SELECT comment_ID AS id, comment_content AS content, comment_date AS date,
//             comment_date_gmt AS date_gmt, user_id, comment_author AS author
//      FROM ${P}comments
//      WHERE comment_post_ID = ? AND comment_type = 'order_note'
//      ORDER BY comment_date_gmt DESC`,
//     [id]
//   );

//   const [[paytm]] = await pool.query(
//     `SELECT id, order_id, paytm_order_id, transaction_id, status, paytm_response,
//             date_added, date_modified
//      FROM ${P}paytm_order_data WHERE order_id = ?`,
//     [id]
//   );

//   let paytmShaped = null;
//   if (paytm) {
//     try {
//       const { parsePaytmResponse } = require('./paymentService');
//       const { gateway, raw } = parsePaytmResponse(paytm.paytm_response);
//       paytmShaped = {
//         id: paytm.id,
//         order_id: paytm.order_id,
//         paytm_order_id: paytm.paytm_order_id,
//         transaction_id: paytm.transaction_id,
//         status: paytm.status,
//         date_added: paytm.date_added,
//         date_modified: paytm.date_modified,
//         gateway,
//         paytm_response: raw,
//       };
//     } catch {
//       paytmShaped = {
//         id: paytm.id,
//         order_id: paytm.order_id,
//         paytm_order_id: paytm.paytm_order_id,
//         transaction_id: paytm.transaction_id,
//         status: paytm.status,
//         date_added: paytm.date_added,
//         date_modified: paytm.date_modified,
//       };
//     }
//   }

//   const metaMap = {};
//   for (const m of meta) metaMap[m.meta_key] = m.meta_value;

//   const billing = addresses.find((a) => a.address_type === 'billing') || null;
//   const shippingAddr = addresses.find((a) => a.address_type === 'shipping') || null;
//   const lineItems = items.filter((i) => i.order_item_type === 'line_item');
//   const shippingItems = items.filter((i) => i.order_item_type === 'shipping');
//   const taxItems = items.filter((i) => i.order_item_type === 'tax');
//   const couponItems = items.filter((i) => i.order_item_type === 'coupon');
//   const feeItems = items.filter((i) => i.order_item_type === 'fee');

//   return {
//     ...order,
//     addresses,
//     billing,
//     shipping: shippingAddr,
//     items,
//     line_items: lineItems,
//     shipping_items: shippingItems,
//     tax_items: taxItems,
//     coupon_items: couponItems,
//     fee_items: feeItems,
//     meta,
//     notes,
//     paytm: paytmShaped,
//     tracking_number: metaMap._tracking_number || null,
//     tracking_provider: metaMap._tracking_provider || null,
//     shipment_status: metaMap._shipment_status || null,
//   };
// }

// async function insertOrderNote(conn, orderId, content, userId = 0, author = 'WooCommerce') {
//   const local = nowLocal();
//   const gmt = nowGmt();
//   const [result] = await conn.query(
//     `INSERT INTO ${P}comments
//       (comment_post_ID, comment_author, comment_author_email, comment_author_url,
//        comment_author_IP, comment_date, comment_date_gmt, comment_content,
//        comment_karma, comment_approved, comment_agent, comment_type, comment_parent, user_id)
//      VALUES (?, ?, '', '', '', ?, ?, ?, 0, '1', 'WooCommerce', 'order_note', 0, ?)`,
//     [orderId, author, local, gmt, content, userId || 0]
//   );
//   return result.insertId;
// }

// async function updateStatus(id, status, adminUserId = 0) {
//   const normalized = normalizeStatus(status);
//   if (!normalized) throw httpError(400, 'status is required');

//   const [[order]] = await pool.query(
//     `SELECT id, status FROM ${P}wc_orders WHERE id = ?`,
//     [id]
//   );
//   if (!order) throw httpError(404, 'Order not found');

//   return withTransaction(pool, async (conn) => {
//     const gmt = nowGmt();
//     await conn.query(
//       `UPDATE ${P}wc_orders SET status = ?, date_updated_gmt = ? WHERE id = ?`,
//       [normalized, gmt, id]
//     );
//     await conn.query(
//       `UPDATE ${P}posts SET post_status = ?, post_modified_gmt = ?
//        WHERE ID = ? AND post_type = 'shop_order_placehold'`,
//       [normalized, gmt, id]
//     );
//     await conn.query(
//       `UPDATE ${P}wc_order_stats SET status = ? WHERE order_id = ?`,
//       [normalized, id]
//     );

//     if (normalized === 'wc-completed') {
//       await conn.query(
//         `UPDATE ${P}wc_order_operational_data
//          SET date_completed_gmt = COALESCE(date_completed_gmt, ?)
//          WHERE order_id = ?`,
//         [gmt, id]
//       );
//     }

//     await insertOrderNote(
//       conn,
//       id,
//       `Order status changed from ${order.status} to ${normalized}.`,
//       adminUserId
//     );

//     return getById(id);
//   });
// }

// async function addNote(id, content, adminUserId = 0, isCustomerNote = false) {
//   if (!content) throw httpError(400, 'content is required');
//   const [[order]] = await pool.query(`SELECT id FROM ${P}wc_orders WHERE id = ?`, [id]);
//   if (!order) throw httpError(404, 'Order not found');

//   return withTransaction(pool, async (conn) => {
//     const noteId = await insertOrderNote(conn, id, content, adminUserId);
//     if (isCustomerNote) {
//       await conn.query(
//         `INSERT INTO ${P}commentmeta (comment_id, meta_key, meta_value) VALUES (?, 'is_customer_note', '1')`,
//         [noteId]
//       );
//     }
//     return getById(id);
//   });
// }

// async function updateShipment(id, data = {}) {
//   const [[order]] = await pool.query(`SELECT id FROM ${P}wc_orders WHERE id = ?`, [id]);
//   if (!order) throw httpError(404, 'Order not found');

//   return withTransaction(pool, async (conn) => {
//     if (data.tracking_number != null) {
//       await upsertOrderMeta(conn, P, id, '_tracking_number', data.tracking_number);
//     }
//     if (data.tracking_provider != null) {
//       await upsertOrderMeta(conn, P, id, '_tracking_provider', data.tracking_provider);
//     }
//     if (data.shipment_status != null) {
//       await upsertOrderMeta(conn, P, id, '_shipment_status', data.shipment_status);
//     }
//     const parts = [];
//     if (data.tracking_number) parts.push(`tracking ${data.tracking_number}`);
//     if (data.tracking_provider) parts.push(`via ${data.tracking_provider}`);
//     if (data.shipment_status) parts.push(`status ${data.shipment_status}`);
//     if (parts.length) {
//       await insertOrderNote(conn, id, `Shipment updated: ${parts.join(', ')}.`);
//     }
//     await conn.query(
//       `UPDATE ${P}wc_orders SET date_updated_gmt = ? WHERE id = ?`,
//       [nowGmt(), id]
//     );
//     return getById(id);
//   });
// }

// module.exports = { list, getById, updateStatus, addNote, updateShipment, normalizeStatus };

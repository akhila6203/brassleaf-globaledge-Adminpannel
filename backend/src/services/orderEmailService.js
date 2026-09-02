const pool = require('../config/db');
const P = require('../config/prefix');
const { sendMail } = require('./mailService');
const reportService = require('./reportService');

async function markOrderEmailsSent(orderId) {
  await pool.query(
    `UPDATE ${P}wc_order_operational_data
     SET new_order_email_sent = 1
     WHERE order_id = ?`,
    [orderId]
  );
}

async function wereOrderEmailsSent(orderId) {
  const [[row]] = await pool.query(
    `SELECT new_order_email_sent
     FROM ${P}wc_order_operational_data
     WHERE order_id = ?
     LIMIT 1`,
    [orderId]
  );

  return Number(row?.new_order_email_sent) === 1;
}

async function sendOrderEmails(orderId) {
  if (!orderId) {
    return {
      sent: false,
      reason: 'missing_order_id',
    };
  }

  /*
   * Avoid duplicate invoice emails
   * if Paytm callback is triggered again.
   */
  if (await wereOrderEmailsSent(orderId)) {
    return {
      sent: false,
      reason: 'already_sent',
    };
  }

  /*
   * CUSTOMER ONLY:
   * Generate invoice PDF.
   *
   * Do NOT generate packing slip here.
   * Packing slips are only used in
   * scheduled admin daily reports.
   */
  const invoiceDoc =
    await reportService.buildPdfForOrder(
      orderId,
      'invoice'
    );

  const order = invoiceDoc.order;

  const customerEmail =
    order.billing?.email ||
    order.billing_email ||
    '';

  /*
   * No customer email available.
   */
  if (!customerEmail) {
    return {
      sent: false,
      reason: 'no_customer_email',
      orderId,
    };
  }

  const invoiceAttachment = {
    filename: invoiceDoc.filename,
    content: invoiceDoc.pdf,
    contentType: 'application/pdf',
  };

  try {
    /*
     * CUSTOMER EMAIL ONLY
     *
     * Admin does NOT receive
     * individual order emails.
     */
    await sendMail({
      to: customerEmail,

      subject:
        `Your BrassLeaf Invoice #${
          order.invoice_number ||
          order.id
        }`,

      html: `
        <div
          style="
            font-family: Arial, sans-serif;
            color: #243346;
            line-height: 1.6;
          "
        >
          <p>
            Dear ${
              order.billing?.first_name ||
              'Customer'
            },
          </p>

          <p>
            Thank you for your order with BrassLeaf.
          </p>

          <p>
            Your invoice for order
            <strong>#${order.id}</strong>
            is attached to this email.
          </p>

          <p>
            Regards,<br/>
            BrassLeaf Uniforms
          </p>
        </div>
      `,

      text:
        `Dear ${
          order.billing?.first_name ||
          'Customer'
        },\n\n` +
        `Thank you for your order with BrassLeaf.\n` +
        `Your invoice for order #${order.id} is attached.\n\n` +
        `Regards,\nBrassLeaf Uniforms`,

      attachments: [
        invoiceAttachment,
      ],
    });

    /*
     * Mark invoice email as sent
     * only after mail succeeds.
     */
    await markOrderEmailsSent(orderId);

    return {
      sent: true,
      orderId,
      customer: true,
      admin: false,
    };
  } catch (err) {
    console.error(
      '[Order email]',
      err.message
    );

    throw err;
  }
}

module.exports = {
  sendOrderEmails,
  wereOrderEmailsSent,
};



// const pool = require('../config/db');
// const P = require('../config/prefix');
// const env = require('../config/env');
// const { sendMail } = require('./mailService');
// const reportService = require('./reportService');

// async function markOrderEmailsSent(orderId) {
//   await pool.query(
//     `UPDATE ${P}wc_order_operational_data
//      SET new_order_email_sent = 1
//      WHERE order_id = ?`,
//     [orderId]
//   );
// }

// async function wereOrderEmailsSent(orderId) {
//   const [[row]] = await pool.query(
//     `SELECT new_order_email_sent FROM ${P}wc_order_operational_data WHERE order_id = ? LIMIT 1`,
//     [orderId]
//   );
//   return Number(row?.new_order_email_sent) === 1;
// }

// async function sendOrderEmails(orderId) {
//   if (!orderId) return { sent: false, reason: 'missing_order_id' };

//   if (await wereOrderEmailsSent(orderId)) {
//     return { sent: false, reason: 'already_sent' };
//   }

//   const invoiceDoc = await reportService.buildPdfForOrder(orderId, 'invoice');
//   const slipDoc = await reportService.buildPdfForOrder(orderId, 'packing-slip');
//   const order = invoiceDoc.order;

//   const customerEmail =
//     order.billing?.email || order.billing_email || '';
//   const adminEmail = env.adminEmail;

//   if (!adminEmail && !customerEmail) {
//     return { sent: false, reason: 'no_recipients' };
//   }

//   const invoiceAttachment = {
//     filename: invoiceDoc.filename,
//     content: invoiceDoc.pdf,
//     contentType: 'application/pdf',
//   };

//   const slipAttachment = {
//     filename: slipDoc.filename,
//     content: slipDoc.pdf,
//     contentType: 'application/pdf',
//   };

//   const results = { admin: false, customer: false };

//   try {
//     if (adminEmail) {
//       await sendMail({
//         to: adminEmail,
//         subject: `New BrassLeaf Order #${order.id} — Invoice & Packing Slip`,
//         html: `
//           <p>A new order has been placed on BrassLeaf.</p>
//           <p><strong>Order #${order.id}</strong> — ${order.customer_name || customerEmail || 'Customer'}</p>
//           <p>Invoice and packing slip PDFs are attached.</p>
//         `,
//         text: `New order #${order.id}. Invoice and packing slip are attached.`,
//         attachments: [invoiceAttachment, slipAttachment],
//       });
//       results.admin = true;
//     }

//     if (customerEmail) {
//       await sendMail({
//         to: customerEmail,
//         subject: `Your BrassLeaf Invoice #${order.invoice_number || order.id}`,
//         html: `
//           <p>Dear ${order.billing?.first_name || 'Customer'},</p>
//           <p>Thank you for your order with BrassLeaf.</p>
//           <p>Your invoice for order <strong>#${order.id}</strong> is attached.</p>
//           <p>BrassLeaf Uniforms</p>
//         `,
//         text: `Thank you for your order #${order.id}. Your invoice is attached.`,
//         attachments: [invoiceAttachment],
//       });
//       results.customer = true;
//     }

//     await markOrderEmailsSent(orderId);

//     return {
//       sent: results.admin || results.customer,
//       orderId,
//       ...results,
//     };
//   } catch (err) {
//     console.error('[Order email]', err.message);
//     throw err;
//   }
// }

// module.exports = {
//   sendOrderEmails,
//   wereOrderEmailsSent,
// };

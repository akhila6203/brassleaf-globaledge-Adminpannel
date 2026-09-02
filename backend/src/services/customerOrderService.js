const crypto = require('crypto');
const pool = require('../config/db');
const P = require('../config/prefix');
const { nowLocal, nowGmt } = require('../utils/datetime');
const { upsertOrderMeta } = require('../utils/meta');
const { withTransaction } = require('../utils/transaction');
const { httpError } = require('../utils/httpError');
const orderService = require('./orderService');

function normalizeIncomingStatus(status) {
  const value = String(status || 'pending')
    .trim()
    .toLowerCase()
    .replace(/^wc-/, '');
  return value === 'pending-payment' ? 'pending' : value;
}

function toDbStatus(status) {
  const normalized = normalizeIncomingStatus(status);
  return normalized.startsWith('wc-') ? normalized : `wc-${normalized}`;
}

function randomOrderKey() {
  return `wc_order_${crypto.randomBytes(8).toString('hex')}`;
}

async function insertOrderItemMeta(conn, itemId, pairs) {
  for (const [key, value] of pairs) {
    await conn.query(
      `INSERT INTO ${P}woocommerce_order_itemmeta (order_item_id, meta_key, meta_value)
       VALUES (?, ?, ?)`,
      [itemId, key, value == null ? '' : String(value)]
    );
  }
}

async function insertLineItem(conn, orderId, item, taxPerUnit) {
  const qty = Number(item.quantity) || 1;
  const price = Number(item.price) || 0;
  const lineTotal = price * qty;
  const lineTax = Number(taxPerUnit) * qty || 0;

  const [itemRes] = await conn.query(
    `INSERT INTO ${P}woocommerce_order_items (order_item_name, order_item_type, order_id)
     VALUES (?, 'line_item', ?)`,
    [item.name || 'Product', orderId]
  );

  const itemId = itemRes.insertId;

  await insertOrderItemMeta(conn, itemId, [
    ['_product_id', item.productId || item.product_id || ''],
    ['_variation_id', item.variationId || item.variation_id || '0'],
    ['_qty', qty],
    ['_line_subtotal', lineTotal.toFixed(2)],
    ['_line_total', lineTotal.toFixed(2)],
    ['_line_tax', lineTax.toFixed(4)],
    ['_line_subtotal_tax', lineTax.toFixed(4)],
    ['pa_size', item.size || ''],
  ]);

  return { itemId, qty, lineTotal, lineTax };
}

async function insertShippingItem(conn, orderId, shippingAmount) {
  const amount = Number(shippingAmount) || 0;

  const [itemRes] = await conn.query(
    `INSERT INTO ${P}woocommerce_order_items (order_item_name, order_item_type, order_id)
     VALUES ('Flat rate', 'shipping', ?)`,
    [orderId]
  );

  const itemId = itemRes.insertId;

  await insertOrderItemMeta(conn, itemId, [
    ['method_id', 'flat_rate'],
    ['instance_id', '2'],
    ['cost', amount.toFixed(2)],
    ['total_tax', '0'],
  ]);

  return itemId;
}

async function insertTaxItem(conn, orderId, label, amount) {
  const taxAmount = Number(amount) || 0;
  if (taxAmount <= 0) return null;

  const [itemRes] = await conn.query(
    `INSERT INTO ${P}woocommerce_order_items (order_item_name, order_item_type, order_id)
     VALUES (?, 'tax', ?)`,
    [label, orderId]
  );

  const itemId = itemRes.insertId;

  await insertOrderItemMeta(conn, itemId, [
    ['rate_id', label.includes('CGST') ? '1' : '2'],
    ['label', label],
    ['compound', ''],
    ['tax_amount', taxAmount.toFixed(4)],
    ['shipping_tax_amount', '0'],
    ['rate_percent', '2.5'],
  ]);

  return itemId;
}

async function insertAddress(conn, orderId, type, billing) {
  await conn.query(
    `INSERT INTO ${P}wc_order_addresses
      (order_id, address_type, first_name, last_name, company, address_1, address_2,
       city, state, postcode, country, email, phone)
     VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      orderId,
      type,
      billing.firstName || '',
      billing.lastName || '',
      billing.address1 || billing.address || '',
      billing.address2 || '',
      billing.city || '',
      billing.state || '',
      billing.postcode || billing.pincode || '',
      billing.country || 'IN',
      billing.email || '',
      billing.phone || '',
    ]
  );
}

function shapeCustomerOrder(row, extras = {}) {
  const status = String(row.status || '').replace(/^wc-/, '');

  return {
    id: row.id,
    orderId: row.id,
    status,
    currency: row.currency || 'INR',
    subtotal: extras.subtotal != null ? Number(extras.subtotal) : null,
    shipping: extras.shipping != null ? Number(extras.shipping) : null,
    total: Number(row.total_amount),
    total_amount: Number(row.total_amount),
    tax_amount: Number(row.tax_amount),
    cgst: extras.cgst != null ? Number(extras.cgst) : null,
    sgst: extras.sgst != null ? Number(extras.sgst) : null,
    paymentMethod: row.payment_method,
    payment_method: row.payment_method,
    paymentMethodTitle: row.payment_method_title,
    payment_method_title: row.payment_method_title,
    transactionId: row.transaction_id || null,
    transaction_id: row.transaction_id || null,
    date: row.date_created_gmt,
    createdAt: row.date_created_gmt,
    created_at: row.date_created_gmt,
    date_created: row.date_created_gmt,
    itemCount: extras.itemCount || 0,
    item_count: extras.itemCount || 0,
    billing: extras.billing || null,
    items: extras.items || [],
    notes: row.customer_note || '',
    customerNote: row.customer_note || '',
  };
}

async function createOrder(customerId, payload = {}, reqMeta = {}) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) throw httpError(400, 'Cart is empty.');

  const billing = payload.billing || {};
  if (!billing.email) throw httpError(400, 'Billing email is required.');

  const subtotal = Number(payload.subtotal) || 0;
  const shipping = Number(payload.shipping) || 0;
  const total = Number(payload.total) || subtotal + shipping;
  const cgst = Number(payload.cgst) || 0;
  const sgst = Number(payload.sgst) || 0;
  const taxAmount = cgst + sgst;
  const status = toDbStatus(payload.status || 'pending');
  const paymentMethod = payload.paymentMethod || 'paytm';
  const paymentMethodTitle = payload.paymentMethodTitle || 'Paytm Payment Gateway';
  const notes = payload.notes || '';

  const orderId = await withTransaction(pool, async (conn) => {
    const local = nowLocal();
    const gmt = nowGmt();

    const [postRes] = await conn.query(
      `INSERT INTO ${P}posts
        (post_author, post_date, post_date_gmt, post_content, post_title, post_excerpt,
         post_status, comment_status, ping_status, post_password, post_name, to_ping, pinged,
         post_modified, post_modified_gmt, post_content_filtered, post_parent, guid,
         menu_order, post_type, post_mime_type, comment_count)
       VALUES (?, ?, ?, '', '', '', 'draft', 'closed', 'closed', '', '', '', '', ?, ?, '', 0, '', 0, 'shop_order_placehold', '', 0)`,
      [customerId, local, gmt, local, gmt]
    );

    const id = postRes.insertId;

    await conn.query(
      `INSERT INTO ${P}wc_orders
        (id, status, currency, type, tax_amount, total_amount, customer_id, billing_email,
         date_created_gmt, date_updated_gmt, parent_order_id, payment_method, payment_method_title,
         transaction_id, ip_address, user_agent, customer_note)
       VALUES (?, ?, 'INR', 'shop_order', ?, ?, ?, ?, ?, ?, 0, ?, ?, '', ?, ?, ?)`,
      [
        id,
        status,
        taxAmount,
        total,
        customerId,
        billing.email,
        gmt,
        gmt,
        paymentMethod,
        paymentMethodTitle,
        reqMeta.ip || '',
        reqMeta.userAgent || '',
        notes,
      ]
    );

    const orderKey = randomOrderKey();

    await conn.query(
      `INSERT INTO ${P}wc_order_operational_data
        (order_id, created_via, woocommerce_version, prices_include_tax, coupon_usages_are_counted,
         download_permission_granted, cart_hash, new_order_email_sent, order_key, order_stock_reduced,
         date_paid_gmt, date_completed_gmt, shipping_tax_amount, shipping_total_amount,
         discount_tax_amount, discount_total_amount, recorded_sales)
       VALUES (?, 'checkout', '8.9.3', 1, 0, 0, '', 0, ?, 0, NULL, NULL, 0, ?, 0, 0, 0)`,
      [id, orderKey, shipping]
    );

    await insertAddress(conn, id, 'billing', billing);
    await insertAddress(conn, id, 'shipping', billing);

    let itemCount = 0;
    for (const item of items) {
      const taxPerUnit = subtotal > 0 ? (taxAmount / subtotal) * Number(item.price) : 0;
      const inserted = await insertLineItem(conn, id, item, taxPerUnit);
      itemCount += inserted.qty;
    }

    await insertShippingItem(conn, id, shipping);
    await insertTaxItem(conn, id, 'IN-2.5% CGST-1', cgst);
    await insertTaxItem(conn, id, 'IN-2.5% SGST-1', sgst);

    await upsertOrderMeta(conn, P, id, 'student_class', billing.studentClass || '');
    await upsertOrderMeta(conn, P, id, 'student_admin', billing.admissionNo || '');
    await upsertOrderMeta(conn, P, id, 'parent_name', billing.parentName || '');
    await upsertOrderMeta(conn, P, id, '_order_currency', 'INR');
    await upsertOrderMeta(conn, P, id, '_prices_include_tax', 'yes');

    const netTotal = Math.max(total - taxAmount - shipping, 0);

    await conn.query(
      `INSERT INTO ${P}wc_order_stats
        (order_id, parent_id, date_created, date_created_gmt, date_paid, date_completed,
         num_items_sold, total_sales, tax_total, shipping_total, net_total, returning_customer, status, customer_id)
       VALUES (?, 0, ?, ?, '0000-00-00 00:00:00', NULL, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, local, gmt, itemCount, total, taxAmount, shipping, netTotal, status, customerId]
    );

    await conn.query(
      `INSERT INTO ${P}comments
        (comment_post_ID, comment_author, comment_author_email, comment_author_url,
         comment_author_IP, comment_date, comment_date_gmt, comment_content,
         comment_karma, comment_approved, comment_agent, comment_type, comment_parent, user_id)
       VALUES (?, 'WooCommerce', 'woocommerce@brassleaf.store', '', '', ?, ?, ?, 0, '1', 'WooCommerce', 'order_note', 0, 0)`,
      [id, local, gmt, 'Order created from Brassleaf checkout.']
    );

    return id;
  });

  return getOrderForCustomer(customerId, orderId);
}

async function listOrdersForCustomer(customerId) {
  const [rows] = await pool.query(
    `SELECT
       o.id, o.status, o.currency, o.total_amount, o.tax_amount,
       o.billing_email, o.payment_method, o.payment_method_title,
       o.transaction_id, o.date_created_gmt, o.customer_note,
       op.shipping_total_amount,
       (SELECT COALESCE(SUM(CAST(q.meta_value AS UNSIGNED)), 0)
        FROM ${P}woocommerce_order_items oi
        JOIN ${P}woocommerce_order_itemmeta q
          ON q.order_item_id = oi.order_item_id AND q.meta_key = '_qty'
        WHERE oi.order_id = o.id AND oi.order_item_type = 'line_item') AS item_count
     FROM ${P}wc_orders o
     LEFT JOIN ${P}wc_order_operational_data op ON op.order_id = o.id
     WHERE o.customer_id = ? AND o.type = 'shop_order'
     ORDER BY o.date_created_gmt DESC
     LIMIT 100`,
    [customerId]
  );

  return rows.map((row) =>
    shapeCustomerOrder(row, {
      shipping: row.shipping_total_amount,
      itemCount: Number(row.item_count) || 0,
    })
  );
}

async function getOrderForCustomer(customerId, orderId) {
  const [[row]] = await pool.query(
    `SELECT
       o.id, o.status, o.currency, o.total_amount, o.tax_amount,
       o.billing_email, o.payment_method, o.payment_method_title,
       o.transaction_id, o.date_created_gmt, o.customer_note, o.customer_id,
       op.shipping_total_amount
     FROM ${P}wc_orders o
     LEFT JOIN ${P}wc_order_operational_data op ON op.order_id = o.id
     WHERE o.id = ? AND o.type = 'shop_order'`,
    [orderId]
  );

  if (!row) throw httpError(404, 'Order not found');
  if (Number(row.customer_id) !== Number(customerId)) {
    throw httpError(403, 'You do not have access to this order.');
  }

  const full = await orderService.getById(orderId);

  const [metaRows] = await pool.query(
    `SELECT meta_key, meta_value FROM ${P}wc_orders_meta WHERE order_id = ?`,
    [orderId]
  );

  const meta = Object.fromEntries(metaRows.map((m) => [m.meta_key, m.meta_value]));

  const billing = full.billing
    ? {
        firstName: full.billing.first_name,
        lastName: full.billing.last_name,
        email: full.billing.email,
        phone: full.billing.phone,
        address1: full.billing.address_1,
        address2: full.billing.address_2,
        city: full.billing.city,
        state: full.billing.state,
        postcode: full.billing.postcode,
        country: full.billing.country,
        studentClass: meta.student_class || '',
        admissionNo: meta.student_admin || '',
        parentName: meta.parent_name || '',
      }
    : null;

  const lineItems = (full.line_items || []).map((item) => ({
    id: item.order_item_id,
    name: item.order_item_name,
    productId: item.product_id,
    variationId: item.variation_id,
    quantity: Number(item.qty) || 1,
    size: item.size || '',
    total: Number(item.line_total) || 0,
  }));

  const itemCount = lineItems.reduce((sum, item) => sum + item.quantity, 0);

  let cgst = 0;
  let sgst = 0;
  for (const tax of full.tax_items || []) {
    const amount = Number(tax.tax_amount) || 0;
    if (String(tax.order_item_name).includes('CGST')) cgst += amount;
    if (String(tax.order_item_name).includes('SGST')) sgst += amount;
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);

  return {
    ...shapeCustomerOrder(row, {
      subtotal,
      shipping: full.shipping_total_amount ?? row.shipping_total_amount,
      cgst,
      sgst,
      itemCount,
      billing,
      items: lineItems,
    }),
    billingDetails: {
      studentClass: meta.student_class || '',
      admissionNo: meta.student_admin || '',
      parentName: meta.parent_name || '',
      note:
        'Any exchanges should be done at the BrassLeaf, Punjagutta store only.',
    },
    billingAddress: billing,
    paytm: full.paytm,
  };
}

async function cancelOrder(customerId, orderId) {
  const order = await getOrderForCustomer(customerId, orderId);
  const status = String(order.status || '').toLowerCase();

  if (!['pending', 'failed', 'on-hold'].includes(status)) {
    throw httpError(400, 'Only pending orders can be cancelled.');
  }

  return withTransaction(pool, async (conn) => {
    const gmt = nowGmt();
    const local = nowLocal();

    await conn.query(
      `UPDATE ${P}wc_orders SET status = 'wc-cancelled', date_updated_gmt = ? WHERE id = ?`,
      [gmt, orderId]
    );

    await conn.query(
      `UPDATE ${P}posts SET post_status = 'wc-cancelled', post_modified_gmt = ? WHERE ID = ?`,
      [gmt, orderId]
    );

    await conn.query(
      `UPDATE ${P}wc_order_stats SET status = 'wc-cancelled' WHERE order_id = ?`,
      [orderId]
    );

    await conn.query(
      `INSERT INTO ${P}comments
        (comment_post_ID, comment_author, comment_author_email, comment_author_url,
         comment_author_IP, comment_date, comment_date_gmt, comment_content,
         comment_karma, comment_approved, comment_agent, comment_type, comment_parent, user_id)
       VALUES (?, 'WooCommerce', 'woocommerce@brassleaf.store', '', '', ?, ?, ?, 0, '1', 'WooCommerce', 'order_note', 0, 0)`,
      [orderId, local, gmt, 'Order cancelled by customer.']
    );

    return getOrderForCustomer(customerId, orderId);
  });
}

module.exports = {
  createOrder,
  listOrdersForCustomer,
  getOrderForCustomer,
  cancelOrder,
};

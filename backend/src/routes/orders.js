const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const P = require('../db/prefix');
const asyncHandler = require('../middleware/asyncHandler');
const { parseList, listResponse } = require('../lib/listParams');

const SORT = {
  id: 'o.id',
  date: 'o.date_created_gmt',
  total: 'o.total_amount',
  status: 'o.status',
  email: 'o.billing_email',
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, offset, sortCol, dir, search } = parseList(req, SORT, 'date');
    const status = req.query.status || '';
    const payment = req.query.payment_method || '';
    const params = [];
    let where = `o.type = 'shop_order'`;

    if (status) {
      where += ` AND o.status = ?`;
      params.push(status);
    }
    if (payment) {
      where += ` AND o.payment_method = ?`;
      params.push(payment);
    }
    if (search) {
      where += ` AND (o.billing_email LIKE ? OR o.id LIKE ? OR a.first_name LIKE ? OR a.last_name LIKE ? OR o.transaction_id LIKE ?)`;
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
         o.id,
         o.status,
         o.currency,
         o.total_amount,
         o.tax_amount,
         o.billing_email,
         o.payment_method,
         o.payment_method_title,
         o.transaction_id,
         o.date_created_gmt,
         o.date_updated_gmt,
         o.customer_id,
         a.first_name,
         a.last_name,
         a.phone,
         a.city,
         a.state,
         a.country
       ${from}
       WHERE ${where}
       ORDER BY ${sortCol} ${dir}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json(listResponse(rows, total, page, limit));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
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
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const [addresses] = await pool.query(
      `SELECT * FROM ${P}wc_order_addresses WHERE order_id = ?`,
      [id]
    );

    const [items] = await pool.query(
      `SELECT
         oi.order_item_id,
         oi.order_item_name,
         oi.order_item_type,
         oim_pid.meta_value  AS product_id,
         oim_vid.meta_value  AS variation_id,
         oim_qty.meta_value  AS qty,
         oim_sub.meta_value  AS line_subtotal,
         oim_tot.meta_value  AS line_total,
         oim_tax.meta_value  AS line_tax,
         oim_size.meta_value AS size
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
       WHERE oi.order_id = ?
       ORDER BY oi.order_item_type, oi.order_item_id`,
      [id]
    );

    const [meta] = await pool.query(
      `SELECT meta_key, meta_value FROM ${P}wc_orders_meta WHERE order_id = ?`,
      [id]
    );

    const [[paytm]] = await pool.query(
      `SELECT id, order_id, paytm_order_id, transaction_id, status, date_added, date_modified
       FROM ${P}paytm_order_data WHERE order_id = ?`,
      [id]
    );

    res.json({ ...order, addresses, items, meta, paytm: paytm || null });
  })
);

module.exports = router;

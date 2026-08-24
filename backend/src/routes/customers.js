const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const P = require('../db/prefix');
const asyncHandler = require('../middleware/asyncHandler');
const { parseList, listResponse } = require('../lib/listParams');

const SORT = {
  id: 'cl.customer_id',
  email: 'cl.email',
  name: 'cl.last_name',
  registered: 'cl.date_registered',
  active: 'cl.date_last_active',
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, offset, sortCol, dir, search } = parseList(req, SORT, 'active');
    const country = req.query.country || '';
    const params = [];
    let where = '1=1';

    if (search) {
      where += ` AND (cl.email LIKE ? OR cl.first_name LIKE ? OR cl.last_name LIKE ? OR cl.username LIKE ?)`;
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }
    if (country) {
      where += ` AND cl.country = ?`;
      params.push(country);
    }

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM ${P}wc_customer_lookup cl WHERE ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT
         cl.customer_id,
         cl.user_id,
         cl.username,
         cl.first_name,
         cl.last_name,
         cl.email,
         cl.country,
         cl.city,
         cl.state,
         cl.postcode,
         cl.date_registered,
         cl.date_last_active,
         u.user_registered,
         (
           SELECT COUNT(*) FROM ${P}wc_orders o
           WHERE o.customer_id = cl.user_id AND o.type = 'shop_order'
         ) AS order_count,
         (
           SELECT ROUND(SUM(o.total_amount), 2) FROM ${P}wc_orders o
           WHERE o.customer_id = cl.user_id AND o.type = 'shop_order'
         ) AS lifetime_value
       FROM ${P}wc_customer_lookup cl
       LEFT JOIN ${P}users u ON u.ID = cl.user_id
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
    const [[customer]] = await pool.query(
      `SELECT
         cl.*,
         u.user_login,
         u.user_email,
         u.display_name,
         u.user_registered,
         u.user_status
       FROM ${P}wc_customer_lookup cl
       LEFT JOIN ${P}users u ON u.ID = cl.user_id
       WHERE cl.customer_id = ?`,
      [id]
    );
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const [meta] = await pool.query(
      `SELECT meta_key, meta_value
       FROM ${P}usermeta
       WHERE user_id = ?
         AND meta_key IN (
           'billing_first_name','billing_last_name','billing_email','billing_phone',
           'billing_address_1','billing_address_2','billing_city','billing_state',
           'billing_postcode','billing_country',
           'shipping_first_name','shipping_last_name','shipping_address_1',
           'shipping_address_2','shipping_city','shipping_state',
           'shipping_postcode','shipping_country'
         )`,
      [customer.user_id]
    );

    const [orders] = await pool.query(
      `SELECT id, status, total_amount, currency, date_created_gmt, payment_method
       FROM ${P}wc_orders
       WHERE customer_id = ? AND type = 'shop_order'
       ORDER BY date_created_gmt DESC
       LIMIT 20`,
      [customer.user_id]
    );

    res.json({ ...customer, meta, orders });
  })
);

module.exports = router;

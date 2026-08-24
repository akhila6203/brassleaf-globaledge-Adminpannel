const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const P = require('../db/prefix');
const asyncHandler = require('../middleware/asyncHandler');
const { parseList, listResponse } = require('../lib/listParams');

const SORT = {
  date: 'p.date_added',
  amount: 'o.total_amount',
  order: 'p.order_id',
  status: 'p.status',
};

router.get(
  '/stats/summary',
  asyncHandler(async (req, res) => {
    const [[summary]] = await pool.query(
      `SELECT
         COUNT(*) AS total_transactions,
         SUM(CASE WHEN p.status = '1' THEN 1 ELSE 0 END) AS successful,
         SUM(CASE WHEN p.status = '0' THEN 1 ELSE 0 END) AS failed_or_pending,
         ROUND(SUM(CASE WHEN p.status = '1' THEN o.total_amount ELSE 0 END), 2) AS total_collected
       FROM ${P}paytm_order_data p
       JOIN ${P}wc_orders o ON o.id = p.order_id`
    );

    const [byMonth] = await pool.query(
      `SELECT
         DATE_FORMAT(p.date_added, '%Y-%m') AS month,
         COUNT(*) AS transactions,
         ROUND(SUM(o.total_amount), 2) AS revenue
       FROM ${P}paytm_order_data p
       JOIN ${P}wc_orders o ON o.id = p.order_id
       WHERE p.status = '1'
       GROUP BY month
       ORDER BY month DESC
       LIMIT 12`
    );

    res.json({ summary, byMonth });
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, offset, sortCol, dir, search } = parseList(req, SORT, 'date');
    const status = req.query.status;
    const params = [];
    let where = '1=1';

    if (status === '0' || status === '1') {
      where += ` AND p.status = ?`;
      params.push(status);
    }
    if (search) {
      where += ` AND (p.paytm_order_id LIKE ? OR p.transaction_id LIKE ? OR o.billing_email LIKE ? OR CAST(p.order_id AS CHAR) LIKE ?)`;
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }

    const from = `
      FROM ${P}paytm_order_data p
      JOIN ${P}wc_orders o ON o.id = p.order_id
      LEFT JOIN ${P}wc_order_addresses a
        ON a.order_id = p.order_id AND a.address_type = 'billing'`;

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total ${from} WHERE ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT
         p.id,
         p.order_id,
         p.paytm_order_id,
         p.transaction_id,
         p.status,
         p.date_added,
         p.date_modified,
         o.total_amount,
         o.currency,
         o.billing_email,
         o.status AS order_status,
         a.first_name,
         a.last_name,
         a.phone
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
  '/:orderId',
  asyncHandler(async (req, res) => {
    const orderId = parseInt(req.params.orderId, 10);
    const [[payment]] = await pool.query(
      `SELECT
         p.id, p.order_id, p.paytm_order_id, p.transaction_id, p.status,
         p.date_added, p.date_modified,
         o.total_amount, o.currency, o.billing_email, o.status AS order_status,
         o.payment_method_title
       FROM ${P}paytm_order_data p
       JOIN ${P}wc_orders o ON o.id = p.order_id
       WHERE p.order_id = ?`,
      [orderId]
    );
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json(payment);
  })
);

module.exports = router;

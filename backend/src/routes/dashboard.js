const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const P = require('../db/prefix');
const asyncHandler = require('../middleware/asyncHandler');

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [[orders]] = await pool.query(
      `SELECT
         COUNT(*) AS total_orders,
         SUM(CASE WHEN status = 'wc-processing' THEN 1 ELSE 0 END) AS processing,
         SUM(CASE WHEN status = 'wc-cancelled'  THEN 1 ELSE 0 END) AS cancelled,
         SUM(CASE WHEN status = 'wc-failed'     THEN 1 ELSE 0 END) AS failed,
         ROUND(SUM(total_amount), 2) AS total_revenue,
         ROUND(AVG(total_amount), 2) AS avg_order_value
       FROM ${P}wc_orders
       WHERE type = 'shop_order'`
    );

    const [[products]] = await pool.query(
      `SELECT
         SUM(CASE WHEN post_type = 'product' THEN 1 ELSE 0 END) AS total_products,
         SUM(CASE WHEN post_type = 'product_variation' THEN 1 ELSE 0 END) AS total_variations
       FROM ${P}posts
       WHERE post_type IN ('product','product_variation')
         AND post_status = 'publish'`
    );

    const [[users]] = await pool.query(
      `SELECT COUNT(*) AS total_users FROM ${P}users`
    );

    const [[customers]] = await pool.query(
      `SELECT COUNT(*) AS total_customers FROM ${P}wc_customer_lookup`
    );

    const [[stock]] = await pool.query(
      `SELECT
         SUM(CASE WHEN stock_status = 'instock' THEN 1 ELSE 0 END) AS instock,
         SUM(CASE WHEN stock_status = 'outofstock' THEN 1 ELSE 0 END) AS outofstock
       FROM ${P}wc_product_meta_lookup`
    );

    const [[payments]] = await pool.query(
      `SELECT
         COUNT(*) AS total_transactions,
         SUM(CASE WHEN status = '1' THEN 1 ELSE 0 END) AS successful,
         SUM(CASE WHEN status = '0' THEN 1 ELSE 0 END) AS failed_or_pending
       FROM ${P}paytm_order_data`
    );

    const [revenueByMonth] = await pool.query(
      `SELECT
         DATE_FORMAT(date_created_gmt, '%Y-%m') AS month,
         COUNT(*) AS order_count,
         ROUND(SUM(total_amount), 2) AS revenue
       FROM ${P}wc_orders
       WHERE type = 'shop_order'
         AND date_created_gmt >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 MONTH)
       GROUP BY month
       ORDER BY month ASC`
    );

    const [topProducts] = await pool.query(
      `SELECT
         p.post_title AS product_name,
         SUM(pl.product_qty) AS units_sold,
         ROUND(SUM(pl.product_gross_revenue), 2) AS gross_revenue
       FROM ${P}wc_order_product_lookup pl
       JOIN ${P}posts p ON p.ID = pl.product_id
       GROUP BY pl.product_id, p.post_title
       ORDER BY gross_revenue DESC
       LIMIT 5`
    );

    res.json({
      orders,
      products,
      users,
      customers,
      stock,
      payments,
      revenueByMonth,
      topProducts,
    });
  })
);

module.exports = router;

const pool = require('../config/db');
const P = require('../config/prefix');

async function getDashboard() {
  const [[orders]] = await pool.query(
    `SELECT
       COUNT(*) AS total_orders,
       SUM(CASE WHEN status = 'wc-pending' THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN status = 'wc-processing' THEN 1 ELSE 0 END) AS processing,
       SUM(CASE WHEN status = 'wc-completed' THEN 1 ELSE 0 END) AS completed,
       SUM(CASE WHEN status = 'wc-cancelled'  THEN 1 ELSE 0 END) AS cancelled,
       SUM(CASE WHEN status = 'wc-failed'     THEN 1 ELSE 0 END) AS failed,
       SUM(CASE WHEN status = 'wc-refunded'   THEN 1 ELSE 0 END) AS refunded,
       ROUND(COALESCE(SUM(total_amount), 0), 2) AS total_revenue,
       ROUND(COALESCE(AVG(total_amount), 0), 2) AS avg_order_value,
       ROUND(COALESCE(SUM(CASE WHEN DATE(date_created_gmt) = UTC_DATE() THEN total_amount ELSE 0 END), 0), 2) AS today_sales,
       ROUND(COALESCE(SUM(CASE WHEN date_created_gmt >= DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-01') THEN total_amount ELSE 0 END), 0), 2) AS monthly_sales
     FROM ${P}wc_orders
     WHERE type = 'shop_order'`
  );

  const [[shipped]] = await pool.query(
    `SELECT COUNT(DISTINCT order_id) AS shipped
     FROM ${P}wc_orders_meta
     WHERE meta_key = '_shipment_status' AND meta_value = 'shipped'`
  );

  const [[products]] = await pool.query(
    `SELECT
       SUM(CASE WHEN post_type = 'product' AND post_status = 'publish' THEN 1 ELSE 0 END) AS total_products,
       SUM(CASE WHEN post_type = 'product' AND post_status = 'draft' THEN 1 ELSE 0 END) AS draft_products,
       SUM(CASE WHEN post_type = 'product' AND post_status IN ('publish','draft','private','pending') THEN 1 ELSE 0 END) AS all_products,
       SUM(CASE WHEN post_type = 'product_variation' AND post_status = 'publish' THEN 1 ELSE 0 END) AS total_variations
     FROM ${P}posts
     WHERE post_type IN ('product','product_variation')`
  );

  const [[categories]] = await pool.query(
    `SELECT COUNT(*) AS total_categories
     FROM ${P}term_taxonomy
     WHERE taxonomy = 'product_cat'`
  );

  const [[payments]] = await pool.query(
    `SELECT
       COUNT(*) AS total_payments,
       SUM(CASE WHEN p.status = '1' THEN 1 ELSE 0 END) AS successful,
       SUM(CASE WHEN p.status = '0' THEN 1 ELSE 0 END) AS failed_or_pending,
       ROUND(SUM(CASE WHEN p.status = '1' THEN o.total_amount ELSE 0 END), 2) AS total_collected
     FROM ${P}paytm_order_data p
     LEFT JOIN ${P}wc_orders o ON o.id = p.order_id`
  );

  const [[stock]] = await pool.query(
    `SELECT
       SUM(CASE WHEN stock_status = 'outofstock' THEN 1 ELSE 0 END) AS outofstock,
       SUM(CASE WHEN stock_status = 'instock' AND stock_quantity IS NOT NULL AND stock_quantity <= 5 THEN 1 ELSE 0 END) AS low_stock
     FROM ${P}wc_product_meta_lookup`
  );

  const [[users]] = await pool.query(
    `SELECT COUNT(*) AS total_users FROM ${P}users`
  );

  const [[customers]] = await pool.query(
    `SELECT COUNT(*) AS total_customers FROM ${P}wc_customer_lookup`
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

  const [dailySales] = await pool.query(
    `SELECT
       DATE(date_created_gmt) AS day,
       COUNT(*) AS order_count,
       ROUND(SUM(total_amount), 2) AS revenue
     FROM ${P}wc_orders
     WHERE type = 'shop_order'
       AND date_created_gmt >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)
     GROUP BY DATE(date_created_gmt)
     ORDER BY day ASC`
  );

  const [ordersByStatus] = await pool.query(
    `SELECT status, COUNT(*) AS count
     FROM ${P}wc_orders
     WHERE type = 'shop_order'
     GROUP BY status
     ORDER BY count DESC`
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
     LIMIT 10`
  );

  const [topCustomers] = await pool.query(
    `SELECT
       cl.user_id,
       cl.first_name,
       cl.last_name,
       cl.email,
       COUNT(o.id) AS order_count,
       ROUND(SUM(o.total_amount), 2) AS total_spent
     FROM ${P}wc_orders o
     JOIN ${P}wc_customer_lookup cl ON cl.user_id = o.customer_id
     WHERE o.type = 'shop_order' AND o.status NOT IN ('wc-cancelled','wc-failed')
     GROUP BY cl.user_id, cl.first_name, cl.last_name, cl.email
     ORDER BY total_spent DESC
     LIMIT 10`
  );

  const [recentOrders] = await pool.query(
    `SELECT id, status, total_amount, billing_email, date_created_gmt, payment_method
     FROM ${P}wc_orders
     WHERE type = 'shop_order'
     ORDER BY date_created_gmt DESC
     LIMIT 10`
  );

  const [recentCustomers] = await pool.query(
    `SELECT customer_id, user_id, username, first_name, last_name, email, date_registered
     FROM ${P}wc_customer_lookup
     ORDER BY date_registered DESC
     LIMIT 10`
  );

  return {
    orders: {
      total_orders: Number(orders.total_orders) || 0,
      pending: Number(orders.pending) || 0,
      processing: Number(orders.processing) || 0,
      shipped: Number(shipped.shipped) || 0,
      completed: Number(orders.completed) || 0,
      cancelled: Number(orders.cancelled) || 0,
      failed: Number(orders.failed) || 0,
      refunded: Number(orders.refunded) || 0,
      total_revenue: Number(orders.total_revenue) || 0,
      today_sales: Number(orders.today_sales) || 0,
      monthly_sales: Number(orders.monthly_sales) || 0,
      avg_order_value: Number(orders.avg_order_value) || 0,
    },
    products: {
      total_products: Number(products.total_products) || 0,
      draft_products: Number(products.draft_products) || 0,
      all_products: Number(products.all_products) || 0,
      total_variations: Number(products.total_variations) || 0,
      low_stock: Number(stock.low_stock) || 0,
      outofstock: Number(stock.outofstock) || 0,
    },
    categories: {
      total_categories: Number(categories.total_categories) || 0,
    },
    payments: {
      total_payments: Number(payments.total_payments) || 0,
      successful: Number(payments.successful) || 0,
      failed_or_pending: Number(payments.failed_or_pending) || 0,
      total_collected: Number(payments.total_collected) || 0,
    },
    customers: {
      total_customers: Number(customers.total_customers) || 0,
    },
    users: {
      total_users: Number(users.total_users) || 0,
    },
    revenueByMonth,
    dailySales,
    ordersByStatus,
    topProducts,
    topCustomers,
    recentOrders,
    recentCustomers,
  };
}

module.exports = { getDashboard };

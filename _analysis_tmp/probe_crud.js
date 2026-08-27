const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'brassleaf',
  });

  const q = async (label, sql, params = []) => {
    const [rows] = await c.query(sql, params);
    console.log('\n=== ' + label + ' ===');
    console.log(JSON.stringify(rows, null, 2));
    return rows;
  };

  await q('tables count', 'SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema=DATABASE()');

  await q(
    'HPOS options',
    `SELECT option_name, option_value FROM wpwd_options
     WHERE option_name IN (
       'woocommerce_custom_orders_table_enabled',
       'woocommerce_custom_orders_table_data_sync_enabled',
       'siteurl','home','upload_path','upload_url_path'
     )`
  );

  await q(
    'order statuses',
    'SELECT status, COUNT(*) c FROM wpwd_wc_orders GROUP BY status ORDER BY c DESC'
  );

  await q(
    'customer_id sample (orders vs lookup)',
    `SELECT o.id, o.customer_id, cl.customer_id AS lookup_customer_id, cl.user_id
     FROM wpwd_wc_orders o
     LEFT JOIN wpwd_wc_customer_lookup cl ON cl.user_id = o.customer_id
     LIMIT 5`
  );

  await q(
    'customer_id match rates',
    `SELECT
       SUM(CASE WHEN cl_user.user_id IS NOT NULL THEN 1 ELSE 0 END) AS match_as_user_id,
       SUM(CASE WHEN cl_cust.customer_id IS NOT NULL THEN 1 ELSE 0 END) AS match_as_customer_id,
       COUNT(*) AS total
     FROM wpwd_wc_orders o
     LEFT JOIN wpwd_wc_customer_lookup cl_user ON cl_user.user_id = o.customer_id
     LEFT JOIN wpwd_wc_customer_lookup cl_cust ON cl_cust.customer_id = o.customer_id`
  );

  await q(
    'product meta keys',
    `SELECT DISTINCT meta_key FROM wpwd_postmeta
     WHERE post_id IN (SELECT ID FROM wpwd_posts WHERE post_type='product')
     ORDER BY meta_key`
  );

  await q(
    'coupon count',
    `SELECT COUNT(*) AS coupons FROM wpwd_posts WHERE post_type='shop_coupon'`
  );

  await q(
    'product_type terms',
    `SELECT t.term_id, t.name, t.slug, tt.term_taxonomy_id, tt.count
     FROM wpwd_terms t
     JOIN wpwd_term_taxonomy tt ON tt.term_id = t.term_id
     WHERE tt.taxonomy='product_type'`
  );

  await q(
    'visibility terms',
    `SELECT t.term_id, t.name, t.slug, tt.term_taxonomy_id
     FROM wpwd_terms t
     JOIN wpwd_term_taxonomy tt ON tt.term_id = t.term_id
     WHERE tt.taxonomy='product_visibility'`
  );

  await q(
    'product_cat terms',
    `SELECT t.term_id, t.name, t.slug, tt.term_taxonomy_id, tt.parent, tt.count
     FROM wpwd_terms t
     JOIN wpwd_term_taxonomy tt ON tt.term_id = t.term_id
     WHERE tt.taxonomy='product_cat'`
  );

  await q(
    'shipping zones/methods',
    `SELECT z.zone_id, z.zone_name, m.instance_id, m.method_id, m.is_enabled
     FROM wpwd_woocommerce_shipping_zones z
     LEFT JOIN wpwd_woocommerce_shipping_zone_methods m ON m.zone_id = z.zone_id`
  );

  await q('paytm describe', 'DESCRIBE wpwd_paytm_order_data');

  await q(
    'shipping item meta keys',
    `SELECT DISTINCT oim.meta_key
     FROM wpwd_woocommerce_order_itemmeta oim
     JOIN wpwd_woocommerce_order_items oi ON oi.order_item_id = oim.order_item_id
     WHERE oi.order_item_type='shipping'
     ORDER BY oim.meta_key`
  );

  await q(
    'order notes sample',
    `SELECT comment_ID, comment_post_ID, comment_type, LEFT(comment_content,80) AS content, comment_approved
     FROM wpwd_comments
     WHERE comment_type IN ('order_note','')
     ORDER BY comment_ID DESC LIMIT 5`
  );

  await q(
    'admin user',
    `SELECT u.ID, u.user_login, u.user_email, LEFT(u.user_pass,20) AS pass_prefix, um.meta_value AS caps
     FROM wpwd_users u
     JOIN wpwd_usermeta um ON um.user_id=u.ID AND um.meta_key='wpwd_capabilities'
     WHERE um.meta_value LIKE '%administrator%'`
  );

  await q(
    'sample product with type',
    `SELECT p.ID, p.post_title, p.post_status, t.name AS product_type, t.slug
     FROM wpwd_posts p
     JOIN wpwd_term_relationships tr ON tr.object_id = p.ID
     JOIN wpwd_term_taxonomy tt ON tt.term_taxonomy_id = tr.term_taxonomy_id AND tt.taxonomy='product_type'
     JOIN wpwd_terms t ON t.term_id = tt.term_id
     WHERE p.post_type='product'
     LIMIT 12`
  );

  await q(
    'orders_meta tracking-like keys',
    `SELECT DISTINCT meta_key FROM wpwd_wc_orders_meta
     WHERE meta_key LIKE '%track%' OR meta_key LIKE '%ship%' OR meta_key LIKE '%courier%'
     ORDER BY meta_key LIMIT 50`
  );

  await q(
    'coupon meta keys if any',
    `SELECT DISTINCT meta_key FROM wpwd_postmeta
     WHERE post_id IN (SELECT ID FROM wpwd_posts WHERE post_type='shop_coupon')
     ORDER BY meta_key`
  );

  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

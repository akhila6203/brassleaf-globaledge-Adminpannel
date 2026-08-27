require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'brassleaf',
  });

  const q = async (sql, label) => {
    const [r] = await c.query(sql);
    console.log(label + ':', JSON.stringify(r));
  };

  await q('SELECT COUNT(*) AS c FROM wpwd_users', 'users');
  await q('SELECT COUNT(*) AS c FROM wpwd_wc_customer_lookup', 'customers');
  await q("SELECT COUNT(*) AS c FROM wpwd_posts WHERE post_type='product'", 'products');
  await q("SELECT COUNT(*) AS c FROM wpwd_posts WHERE post_type='product_variation'", 'variations');
  await q("SELECT COUNT(*) AS c FROM wpwd_term_taxonomy WHERE taxonomy='product_cat'", 'product_cat');
  await q('SELECT COUNT(*) AS c FROM wpwd_wc_orders', 'orders');
  await q("SELECT COUNT(*) AS c FROM wpwd_woocommerce_order_items WHERE order_item_type='line_item'", 'line_items');
  await q('SELECT COUNT(*) AS c FROM wpwd_paytm_order_data', 'paytm');
  await q("SELECT COUNT(*) AS c FROM wpwd_posts WHERE post_type='attachment'", 'attachments');
  await q("SELECT COUNT(*) AS c FROM wpwd_posts WHERE post_type='shop_coupon'", 'coupons');
  await q(
    "SELECT option_value FROM wpwd_options WHERE option_name='woocommerce_custom_orders_table_enabled' LIMIT 1",
    'hpos'
  );
  await q(
    'SELECT attribute_name, attribute_label FROM wpwd_woocommerce_attribute_taxonomies',
    'attrs'
  );
  await q('SELECT DISTINCT meta_key FROM wpwd_termmeta LIMIT 40', 'termmeta_keys');
  await q('SELECT zone_id, zone_name, zone_order FROM wpwd_woocommerce_shipping_zones', 'zones');
  await q(
    "SELECT meta_key, COUNT(*) c FROM wpwd_postmeta WHERE post_id IN (SELECT ID FROM wpwd_posts WHERE post_type='product') GROUP BY meta_key ORDER BY c DESC LIMIT 40",
    'product_meta_keys'
  );
  await q(
    "SELECT SUBSTRING(paytm_response,1,400) sample FROM wpwd_paytm_order_data WHERE paytm_response IS NOT NULL AND paytm_response<>'' LIMIT 1",
    'paytm_sample'
  );

  await c.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

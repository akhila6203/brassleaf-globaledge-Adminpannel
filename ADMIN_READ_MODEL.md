# Admin read model (existing WordPress / WooCommerce tables)

Database: `brassleaf`  
Prefix: `wpwd_`  
Mode: **SELECT only**. No new tables, no migrations, no ID changes.

Verified live counts:

| Data | Table | Count |
|------|--------|------:|
| Users | `wpwd_users` | 1,043 |
| Products | `wpwd_posts` `post_type='product'` | 12 |
| Variations | `wpwd_posts` `post_type='product_variation'` | 207 |
| Product categories | `wpwd_term_taxonomy` `taxonomy='product_cat'` | 2 |
| HPOS orders | `wpwd_wc_orders` | 1,302 |
| Order line items | `wpwd_woocommerce_order_items` (`line_item`) | 5,775 |
| Customers (analytics) | `wpwd_wc_customer_lookup` | 1,040 |
| Paytm payments | `wpwd_paytm_order_data` | 1,257 |
| Attachments | `wpwd_posts` `post_type='attachment'` | 32 |

---

## 1. Users

**Tables:** `wpwd_users`, `wpwd_usermeta`  
**Role key:** `wpwd_usermeta.meta_key = 'wpwd_capabilities'`  
**Orders link:** `wpwd_wc_orders.customer_id = wpwd_users.ID`

List:

```sql
SELECT u.ID, u.user_login, u.user_email, u.display_name, u.user_registered, u.user_status,
       cap.meta_value AS capabilities, fn.meta_value AS first_name, ln.meta_value AS last_name
FROM wpwd_users u
LEFT JOIN wpwd_usermeta cap ON cap.user_id = u.ID AND cap.meta_key = 'wpwd_capabilities'
LEFT JOIN wpwd_usermeta fn  ON fn.user_id  = u.ID AND fn.meta_key  = 'first_name'
LEFT JOIN wpwd_usermeta ln  ON ln.user_id  = u.ID AND ln.meta_key  = 'last_name'
```

API: `GET /api/users` · `GET /api/users/:id`  
Page: `/admin/users`

---

## 2. Products

**Tables:** `wpwd_posts`, `wpwd_postmeta`, `wpwd_wc_product_meta_lookup`  
**Type:** `wpwd_posts.post_type = 'product'`  
**Variations:** `post_type = 'product_variation'` AND `post_parent = product.ID`

Lookup join: `wpwd_wc_product_meta_lookup.product_id = wpwd_posts.ID`

API: `GET /api/products` · `GET /api/products/:id`  
Page: `/admin/products`

---

## 3. Product categories

**Tables:** `wpwd_terms`, `wpwd_term_taxonomy`, `wpwd_term_relationships`  
**Filter:** `wpwd_term_taxonomy.taxonomy = 'product_cat'`

```sql
SELECT t.term_id, t.name, t.slug, tt.parent, tt.count
FROM wpwd_terms t
JOIN wpwd_term_taxonomy tt ON tt.term_id = t.term_id
WHERE tt.taxonomy = 'product_cat'
```

Product assignment: `wpwd_term_relationships.object_id = wpwd_posts.ID`

API: `GET /api/categories` · `GET /api/categories/:id`  
Page: `/admin/categories`

---

## 4. Orders (HPOS)

**Primary:** `wpwd_wc_orders` (`type = 'shop_order'`)  
**Addresses:** `wpwd_wc_order_addresses.order_id` (`address_type` billing/shipping)  
**Ops:** `wpwd_wc_order_operational_data.order_id`  
**Meta:** `wpwd_wc_orders_meta.order_id`  
**Placeholder posts:** `wpwd_posts.post_type = 'shop_order_placehold'` (not used as source of truth)

API: `GET /api/orders` · `GET /api/orders/:id`  
Page: `/admin/orders`

---

## 5. Order items

**Tables:** `wpwd_woocommerce_order_items`, `wpwd_woocommerce_order_itemmeta`  
**Link:** `order_id` → `wpwd_wc_orders.id`  
**Types:** `line_item`, `shipping`, `tax`  
**Meta keys:** `_product_id`, `_variation_id`, `_qty`, `_line_subtotal`, `_line_total`, `_line_tax`, `pa_size`

Analytics copy: `wpwd_wc_order_product_lookup`

---

## 6. Customers

**Tables:** `wpwd_wc_customer_lookup`, `wpwd_users`, `wpwd_usermeta`  
**Important:** `wpwd_wc_orders.customer_id` is the **WordPress user ID**, not `customer_lookup.customer_id`.

Join:

```sql
wpwd_wc_customer_lookup.user_id = wpwd_users.ID
wpwd_wc_orders.customer_id     = wpwd_wc_customer_lookup.user_id
```

API: `GET /api/customers` · `GET /api/customers/:id`  
Page: `/admin/customers`

---

## 7. Payments

**Tables:** `wpwd_paytm_order_data`  
**Join:** `wpwd_paytm_order_data.order_id = wpwd_wc_orders.id`  
**Status:** enum `'0'` pending/fail, `'1'` success  
**Also on order:** `wpwd_wc_orders.payment_method`, `transaction_id`

API: `GET /api/payments` · `GET /api/payments/stats/summary` · `GET /api/payments/:orderId`  
Page: `/admin/payments`

---

## 8. Product images

**Tables:** `wpwd_postmeta`, `wpwd_posts` (attachments)

- Featured: `wpwd_postmeta.meta_key = '_thumbnail_id'` → attachment `wpwd_posts.ID`
- Gallery: `wpwd_postmeta.meta_key = '_product_image_gallery'` (comma-separated IDs)
- File: attachment meta `_wp_attached_file`
- URL used in UI: attachment `guid`

---

## Dashboard

Reads the same tables: `wpwd_wc_orders`, `wpwd_posts`, `wpwd_users`, `wpwd_wc_customer_lookup`, `wpwd_wc_product_meta_lookup`, `wpwd_paytm_order_data`, `wpwd_wc_order_product_lookup`.

API: `GET /api/dashboard`  
Page: `/admin/dashboard`

---

Write operations are **not** implemented. Do not INSERT/UPDATE/DELETE these tables from this app until explicitly approved.

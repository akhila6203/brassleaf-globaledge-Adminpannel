# DATABASE CRUD MAPPING — Brassleaf Admin Panel

> **Source of truth:** Live MySQL database `brassleaf` (imported from `brassleaf_wp416_cornerstone.sql`)  
> **Table prefix:** `wpwd_`  
> **HPOS:** Enabled (`woocommerce_custom_orders_table_enabled = yes`)  
> **Site URL:** `https://brassleaf.store/cornerstone/`  
> **Rule:** Every write must keep WordPress/WooCommerce compatible. No duplicate business tables. No DROP/TRUNCATE/schema changes.

This document **supersedes** the “never write” guidance in `DATABASE_ANALYSIS.md` Section 20 for the Admin Panel.  
Safety still applies: never DROP/TRUNCATE/RENAME tables, never change existing primary keys/IDs, never recreate WordPress tables.

---

## Confirmed live facts (re-verified)

| Fact | Value |
|------|-------|
| Tables | 76 |
| Products | 12 (`post_type=product`) — 11 variable + 1 simple |
| Variations | 207 |
| Orders (HPOS) | 1,302 in `wpwd_wc_orders` |
| Order statuses present | `wc-processing` (1180), `wc-cancelled` (118), `wc-failed` (4) |
| Customers | `wpwd_wc_orders.customer_id` = **WordPress user ID** (1302/1302 match on `user_id`) |
| Payments | Paytm via `wpwd_paytm_order_data` + order payment fields |
| Coupons | 0 `shop_coupon` posts (structure still standard WC) |
| Shipping zones | Zone “All Shipping” → `flat_rate` instance 1 |
| Admin user | ID 1 / `admin` / capabilities PHP serialize `administrator` |
| Password format | WordPress 6.8+ `$wp$2y$…` (bcrypt with `$wp$` prefix) |
| Tracking meta | **None found** — tracking stored only if we add order meta keys (documented below) |

---

## Global write rules

1. Use **MySQL transactions** for any multi-table mutation.
2. Use **parameterized** queries only.
3. Prefer **upsert helpers** for postmeta/usermeta/orders_meta (insert-or-update by key).
4. Keep **lookup/analytics tables** synchronized when mutating source rows (WC expects them for admin analytics).
5. Soft-delete where WC does: `post_status = 'trash'` / `draft` — hard DELETE only when WC-safe and orphan-free.
6. Never expose `user_pass`, gateway secrets, card data, JWT secret, or DB credentials to React.
7. Never invent columns. Meta keys may be added only where WC/plugins already use EAV (`postmeta`, `usermeta`, `wc_orders_meta`).

---

# 1. AUTHENTICATION / ADMIN LOGIN

### Tables
- `wpwd_users` — `ID`, `user_login`, `user_email`, `user_pass`, `display_name`, `user_status`
- `wpwd_usermeta` — `meta_key = 'wpwd_capabilities'`

### Relationships
- User → capabilities via `usermeta.user_id = users.ID`

### Read
```sql
SELECT u.ID, u.user_login, u.user_email, u.user_pass, u.display_name, u.user_status,
       cap.meta_value AS capabilities
FROM wpwd_users u
LEFT JOIN wpwd_usermeta cap
  ON cap.user_id = u.ID AND cap.meta_key = 'wpwd_capabilities'
WHERE u.user_login = ? OR u.user_email = ?
LIMIT 1;
```

### Auth strategy
1. Load user + capabilities.
2. Allow login only if capabilities contain `administrator` (or other admin roles assigned later).
3. Verify password:
   - If hash starts with `$wp$`, strip `$wp` prefix → bcrypt compare (`$2y$…`).
   - Else use WordPress phpass (`$P$` / `$H$`) verifier.
4. Issue JWT containing `{ id, login, email, roles }` — **never** include `user_pass`.
5. Password reset (admin): hash new password with `$wp$` + bcrypt; UPDATE `user_pass` only for that user.

### Insert / Update / Delete
- Login: no DB write required (optional: update `last_login` is **not** a WP standard key — skip).
- Reset password: `UPDATE wpwd_users SET user_pass = ? WHERE ID = ?`

### Transaction
- Single-row update — transaction optional.

### WooCommerce / WP compatibility
- Must not rewrite unrelated users’ hashes.
- Capabilities stay PHP-serialized: `a:1:{s:13:"administrator";b:1;}`

---

# 2. PRODUCTS

## Tables used
| Table | Role |
|-------|------|
| `wpwd_posts` | Product / variation rows |
| `wpwd_postmeta` | Price, stock, SKU, images, attributes, shipping dims, tax |
| `wpwd_term_relationships` | product_type, product_cat, product_tag, product_visibility, pa_* |
| `wpwd_term_taxonomy` / `wpwd_terms` | Taxonomy resolution |
| `wpwd_wc_product_meta_lookup` | Denormalized price/stock cache — **must sync on write** |
| `wpwd_wc_product_attributes_lookup` | Variation attribute cache — **must sync for variations** |
| `wpwd_woocommerce_attribute_taxonomies` | Global attributes (read; create attribute terms carefully) |

## Columns (posts)
`ID, post_author, post_date, post_date_gmt, post_content, post_title, post_excerpt, post_status, comment_status, ping_status, post_password, post_name, to_ping, pinged, post_modified, post_modified_gmt, post_content_filtered, post_parent, guid, menu_order, post_type, post_mime_type, comment_count`

## Critical meta keys (confirmed present)
`_sku`, `_regular_price`, `_sale_price` (may be absent until set), `_price`, `_stock`, `_stock_status`, `_manage_stock`, `_backorders`, `_sold_individually`, `_virtual`, `_downloadable`, `_tax_status`, `_tax_class`, `_thumbnail_id`, `_product_image_gallery`, `_product_attributes`, `_weight`/`_length`/`_width`/`_height` (set when shipping managed), `total_sales`

## Product type taxonomy (confirmed term_taxonomy_ids)
| slug | term_taxonomy_id |
|------|------------------|
| simple | 2 |
| grouped | 3 |
| variable | 4 |
| external | 5 |
| woosb | 139 |

## Visibility taxonomy (confirmed)
| slug | term_taxonomy_id |
|------|------------------|
| exclude-from-search | 6 |
| exclude-from-catalog | 7 |
| featured | 8 |
| outofstock | 9 |

## Categories (confirmed)
| name | term_id | term_taxonomy_id |
|------|---------|------------------|
| Uncategorized | 15 | 15 |
| Uniforms | 144 | 144 |

---

### READ — list (paginated)
Join `wpwd_posts` + `wpwd_wc_product_meta_lookup` (+ optional category via term_relationships).  
Filter: search title/SKU, stock_status, category, status, type.  
`ORDER BY` whitelist + `LIMIT/OFFSET`.

### READ — detail
- Post row
- All relevant postmeta
- Categories / tags / type / visibility terms
- Variations: `post_type='product_variation' AND post_parent=?`
- Images via `_thumbnail_id` + `_product_image_gallery` → attachment posts

---

### CREATE product (transaction required)

```
BEGIN
1. INSERT wpwd_posts (post_type='product', post_status, title, content, excerpt, author, dates, post_name/slug, guid placeholder)
2. UPDATE guid to siteurl?p=ID (or uploads-compatible URL later)
3. Upsert postmeta for all WC keys listed above
   - Set _price = sale_price if set else regular_price
4. INSERT term_relationships:
   - product_type (required)
   - product_cat (default Uncategorized if none)
   - product_visibility (featured / catalog visibility / outofstock as needed)
5. UPDATE term_taxonomy.count for touched taxonomies
6. INSERT/UPDATE wpwd_wc_product_meta_lookup
7. If variable: create variations (see below) + attributes lookup
COMMIT / ROLLBACK
```

### UPDATE product (transaction)
- UPDATE posts fields
- Upsert/delete postmeta keys as needed
- Replace category/tag/visibility relationships (delete old product_cat/tag/visibility rows for object, insert new)
- Sync `wpwd_wc_product_meta_lookup`
- If stock_status changes: sync `product_visibility` `outofstock` term relationship
- Touch `post_modified` / `post_modified_gmt`

### DELETE / deactivate strategy
| Action | Strategy |
|--------|----------|
| Deactivate | `post_status = 'draft'` (or `private`) |
| Soft delete | `post_status = 'trash'` |
| Hard delete | Only if no order line references OR after trash purge; delete meta, relationships, lookup rows, then post. Prefer trash. |

### Variations CREATE/UPDATE
For each variation:
1. `wpwd_posts` `post_type='product_variation'`, `post_parent=product_id`
2. Meta: `_sku`, `_regular_price`, `_sale_price`, `_price`, `_stock`, `_stock_status`, `_manage_stock`, `attribute_pa_size`, etc.
3. Upsert `wpwd_wc_product_meta_lookup`
4. Upsert `wpwd_wc_product_attributes_lookup` (`taxonomy='pa_size'`, term_id, in_stock)
5. Parent `_product_attributes` PHP-serialized must stay consistent

### Transaction requirements
**Always** for create/update/delete involving posts + meta + terms + lookup.

### WC compatibility
- Variable parents usually have empty `_regular_price`/`_price` at parent; prices live on variations.
- `_price` must stay synchronized with sale/regular.
- Catalog visibility uses **term relationships**, not only `_visibility` meta (legacy meta may exist).

---

# 3. CATEGORIES

## Tables
`wpwd_terms`, `wpwd_term_taxonomy` (`taxonomy='product_cat'`), `wpwd_term_relationships`, `wpwd_termmeta`, `wpwd_wc_category_lookup`

## CREATE
```
BEGIN
INSERT wpwd_terms (name, slug, term_group=0)
INSERT wpwd_term_taxonomy (term_id, taxonomy='product_cat', description, parent, count=0)
Optional termmeta (thumbnail_id, display_type)
INSERT wpwd_wc_category_lookup rows for tree
COMMIT
```

## UPDATE
- Update `terms.name` / `slug`
- Update `term_taxonomy.parent` / `description`
- Rebuild affected `wpwd_wc_category_lookup` rows for that subtree

## ASSIGN / REMOVE products
- INSERT/DELETE `wpwd_term_relationships (object_id, term_taxonomy_id)`
- Recalculate `term_taxonomy.count`

## DELETE strategy
- Block delete if `count > 0` unless products reassigned
- DELETE relationships → termmeta → category_lookup → term_taxonomy → terms
- Never delete default `Uncategorized` (term_id 15) if WC relies on it

---

# 4. MEDIA / PRODUCT IMAGES

## Tables
`wpwd_posts` (`post_type='attachment'`), `wpwd_postmeta` (`_wp_attached_file`, `_wp_attachment_metadata`, `_thumbnail_id`, `_product_image_gallery`)

## Rules
- **Never change existing attachment IDs**
- **Never rewrite existing `guid` / file paths** for current attachments
- New uploads: create new attachment post + meta; store file under configured uploads path; set `guid` to absolute URL compatible with site (`siteurl` + `wp-content/uploads/...`)

## Set featured image
`UPDATE/INSERT postmeta post_id=product, meta_key='_thumbnail_id', meta_value=attachment_id`

## Gallery
`_product_image_gallery` = comma-separated attachment IDs (preserve order)

## Remove gallery image
Rewrite gallery meta without that ID; do **not** delete attachment unless unused and admin explicitly requests media delete

---

# 5. ORDERS (HPOS)

## Primary tables (WRITE these for order ops)
| Table | Use |
|-------|-----|
| `wpwd_wc_orders` | status, totals, payment fields, customer_id, dates |
| `wpwd_wc_orders_meta` | searchable address indexes, custom tracking meta, PDF meta (read mostly) |
| `wpwd_wc_order_addresses` | billing / shipping |
| `wpwd_wc_order_operational_data` | date_paid_gmt, date_completed_gmt, discount/shipping amounts |
| `wpwd_woocommerce_order_items` | line/shipping/tax items |
| `wpwd_woocommerce_order_itemmeta` | qty, prices, product ids |
| `wpwd_posts` | placeholder `shop_order_placehold` — **sync status** when updating order |
| `wpwd_comments` | order notes (`comment_type='order_note'`, `comment_post_ID=order_id`) |
| `wpwd_wc_order_stats` | sync status/totals/dates for analytics |
| `wpwd_wc_order_product_lookup` | sync only if line items change |

## DO NOT use `wpwd_posts` as primary order store
HPOS is active. Placeholder posts exist with same ID — update their `post_status` when order status changes for compatibility.

## Status values (WC format)
Supported lifecycle for admin UI:
`wc-pending` → `wc-processing` → `wc-on-hold` / custom shipped handling → `wc-completed`  
Also: `wc-cancelled`, `wc-refunded`, `wc-failed`

**Note:** DB currently has almost only processing/cancelled/failed. “Shipped” is not a core WC status. Strategy:
- Prefer `wc-completed` for delivered/completed
- For “shipped”, store shipment info in order meta + order note, keep status `wc-processing` **or** map UI “Shipped” → status `wc-completed` with note — **document choice:** use meta `_shipment_status=shipped` + tracking meta while order remains `wc-processing` until completed. This avoids inventing a non-registered core status that breaks WC.

### Tracking meta keys (new, EAV-safe — none exist today)
Stored in `wpwd_wc_orders_meta`:
- `_tracking_number`
- `_tracking_provider`
- `_shipment_status` (`pending`|`processing`|`shipped`|`delivered`)

## UPDATE status (transaction)
```
BEGIN
UPDATE wpwd_wc_orders SET status=?, date_updated_gmt=UTC_TIMESTAMP() WHERE id=?
UPDATE wpwd_posts SET post_status=? WHERE ID=? AND post_type='shop_order_placehold'
UPDATE wpwd_wc_order_stats SET status=? WHERE order_id=?
If completed: set operational_data.date_completed_gmt
INSERT order_note comment
Optional: sync shipment meta
COMMIT
```

## UPDATE addresses
`UPDATE wpwd_wc_order_addresses` for billing/shipping; refresh `_billing_address_index` / `_shipping_address_index` in orders_meta.

## Order notes
```sql
INSERT INTO wpwd_comments
(comment_post_ID, comment_author, comment_author_email, comment_date, comment_date_gmt,
 comment_content, comment_approved, comment_type, user_id, ...)
VALUES (order_id, 'WooCommerce', '', NOW(), UTC_TIMESTAMP(), ?, '1', 'order_note', admin_user_id, ...);
```
Customer-visible notes: add `commentmeta` `is_customer_note = 1`.

## Refunds (safe subset)
- Create `wpwd_wc_orders` row `type='shop_order_refund'`, `parent_order_id=original`
- Or set status `wc-refunded` + note when full refund without gateway call
- **Do not** call Paytm refund API from this panel unless credentials exist and are explicitly configured — mark refund in WC tables + note only
- Never expose Paytm secrets

## Line item edits
Allowed carefully: update qty/totals in itemmeta + recalculate order totals in `wpwd_wc_orders` + operational_data + order_stats + product_lookup. Prefer status/notes/address updates over rewriting historical line items.

---

# 6. CUSTOMERS

## Tables
`wpwd_users`, `wpwd_usermeta`, `wpwd_wc_customer_lookup`

## Important
`wpwd_wc_orders.customer_id` = **`wpwd_users.ID`**, not `customer_lookup.customer_id`.

## CREATE
```
BEGIN
INSERT wpwd_users (login, pass hashed, nicename, email, registered, display_name, status=0)
INSERT usermeta: nickname, first_name, last_name, wpwd_capabilities=customer,
  billing_*, shipping_*, wpwd_user_level=0
INSERT wpwd_wc_customer_lookup (user_id, username, first_name, last_name, email, dates, geo fields)
COMMIT
```

## UPDATE
- Update users email/display_name (not login if risky)
- Upsert usermeta billing/shipping/name
- Sync `wpwd_wc_customer_lookup` matching `user_id`

## READ
Never SELECT `user_pass` into API responses.

## DELETE strategy
- Prefer deactivate: capabilities remove / mark; do not hard-delete users with orders
- If must delete: only users with zero orders; remove usermeta + customer_lookup + user

---

# 7. USERS / ADMINS

## Tables
Same as customers: `wpwd_users` + `wpwd_usermeta`

## Role assignment
`meta_key='wpwd_capabilities'` PHP-serialized role map.

## CREATE admin
Insert user + capabilities `administrator` (or custom role). Hash password with `$wp$`+bcrypt.

## Activate / deactivate
- Soft: set `user_status` or remove administrator capability / set to subscriber
- Prefer capability change over deleting

## Reset password
Update `user_pass` only; leave other hashes intact.

---

# 8. PAYMENTS

## Tables
| Table | Role |
|-------|------|
| `wpwd_wc_orders` | `payment_method`, `payment_method_title`, `transaction_id`, `total_amount`, status |
| `wpwd_paytm_order_data` | Paytm status enum `'0'|'1'`, transaction ids, response JSON |
| `wpwd_wc_order_operational_data` | `date_paid_gmt` |

## READ
Join orders ↔ paytm on `order_id`. Strip/redact `paytm_response` secrets if any; never return gateway API keys from `wpwd_options`.

## UPDATE payment status (limited)
- Update `wpwd_paytm_order_data.status` when manually reconciling
- Sync order status / `date_paid_gmt` / transaction_id when marking paid
- Refunds: see Orders — no card data ever stored here

## Forbidden
Card numbers, CVV, Paytm merchant secrets from options, API tokens.

---

# 9. SHIPPING

## Existing structures (do not invent columns)
| Source | Fields |
|--------|--------|
| `wpwd_wc_order_addresses` | shipping + billing address fields |
| Order shipping line item | `method_id`, `instance_id`, `cost`, `taxes`, `Items` |
| `wpwd_woocommerce_shipping_zones*` | Zone config (zone 1 “All Shipping”, flat_rate) |
| `wpwd_wc_order_operational_data` | `shipping_total_amount`, `shipping_tax_amount` |

## Admin writable workflow
1. Edit shipping/billing addresses on order
2. View/update shipping method title/cost on shipping order item (careful recalculation)
3. Shipment tracking via `wpwd_wc_orders_meta` keys documented in Orders section
4. Zone CRUD optional: update zone methods `is_enabled`, locations — advanced settings page

---

# 10. COUPONS

## Tables
`wpwd_posts` (`post_type='shop_coupon'`), `wpwd_postmeta`, optionally `wpwd_wc_order_coupon_lookup` (analytics when used)

## Standard WC coupon meta keys (even though 0 coupons exist today)
`discount_type`, `coupon_amount`, `expiry_date` / `date_expires`, `usage_limit`, `usage_limit_per_user`, `usage_count`, `individual_use`, `product_ids`, `excluded_product_ids`, `product_categories`, `excluded_product_categories`, `minimum_amount`, `maximum_amount`, `customer_email`, `free_shipping`

## CREATE / UPDATE
Same pattern as products: post + meta in a transaction.  
Activate/deactivate via `post_status` publish/draft.

## DELETE
Trash coupon post (`post_status='trash'`).

---

# 11. DASHBOARD (READ-ONLY aggregates)

## Tables
`wpwd_wc_orders`, `wpwd_wc_order_stats`, `wpwd_wc_order_product_lookup`, `wpwd_posts`, `wpwd_wc_product_meta_lookup`, `wpwd_users`, `wpwd_wc_customer_lookup`, `wpwd_paytm_order_data`

All metrics from live SQL — no mocks.  
Status buckets map:
- Pending: `wc-pending`
- Processing: `wc-processing`
- Shipped: meta `_shipment_status='shipped'` OR treat as subset of processing with meta
- Completed: `wc-completed`
- Cancelled: `wc-cancelled`

---

# 12. MODULE → API MAP

| Module | Base path | Ops |
|--------|-----------|-----|
| Auth | `/api/auth` | POST login, POST logout, GET me, POST reset-password (admin) |
| Dashboard | `/api/dashboard` | GET |
| Products | `/api/products` | GET list/detail, POST, PUT, PATCH status, DELETE(trash) |
| Categories | `/api/categories` | GET, POST, PUT, DELETE, POST assign/remove products |
| Media | `/api/media` | POST upload, GET, DELETE (safe), PATCH attach |
| Orders | `/api/orders` | GET, GET :id, PATCH status, PATCH addresses, POST notes, PATCH shipping meta |
| Customers | `/api/customers` | GET, POST, PUT, GET orders |
| Payments | `/api/payments` | GET, GET :id, PATCH reconcile status |
| Shipping | `/api/shipping` | GET zones/methods, PATCH zone method, order shipment endpoints under orders |
| Coupons | `/api/coupons` | GET, POST, PUT, DELETE |
| Users | `/api/users` | GET admins, POST, PUT, PATCH roles/password |

---

# 13. IMPLEMENTATION ORDER CHECKLIST

| Phase | Deliverable | Status |
|-------|-------------|--------|
| 1–2 | DB analysis | Done (`DATABASE_ANALYSIS.md`) |
| 3 | This mapping | Done |
| 4 | DB connection pool | Next |
| 5 | JWT auth | Next |
| 6 | READ APIs | Next |
| 7 | React MUI shell + dashboard | Next |
| 8–15 | Module CRUD | After mapping confirmation |
| 16–17 | Integration tests vs live DB + WP visibility | Final |

---

# 14. SAFETY SUMMARY

| Allowed | Forbidden |
|---------|-----------|
| INSERT/UPDATE existing WC/WP tables for admin ops | DROP/TRUNCATE/RENAME TABLE |
| Trash / draft soft deletes | DELETE ALL / wipe tables |
| Sync lookup tables to match source writes | Changing existing IDs / PKs |
| New EAV meta keys for tracking | Duplicate `products`/`orders`/`customers` tables |
| Transactions + parameterized SQL | Exposing hashes, secrets, card data |

---

*Generated from live schema inspection of database `brassleaf` on 2026-08-26.*

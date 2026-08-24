# DATABASE ANALYSIS — Brassleaf WordPress + WooCommerce

> **Source file:** `brassleaf_wp416_cornerstone.sql` (25 MB, read-only inspection only)
> **Table prefix:** `wpwd_`
> **Total tables:** 76
> **Charset:** `utf8mb4_unicode_520_ci` (InnoDB throughout)
> **This database is the single source of truth. No tables should be duplicated.**

---

## 1. ALL TABLES (76)

| # | Table Name |
|---|-----------|
| 1 | `wpwd_actionscheduler_actions` |
| 2 | `wpwd_actionscheduler_claims` |
| 3 | `wpwd_actionscheduler_groups` |
| 4 | `wpwd_actionscheduler_logs` |
| 5 | `wpwd_commentmeta` |
| 6 | `wpwd_comments` |
| 7 | `wpwd_e_events` |
| 8 | `wpwd_e_submissions` |
| 9 | `wpwd_e_submissions_actions_log` |
| 10 | `wpwd_e_submissions_values` |
| 11 | `wpwd_links` |
| 12 | `wpwd_nfd_data_event_queue` |
| 13 | `wpwd_options` |
| 14 | `wpwd_paytm_order_data` |
| 15 | `wpwd_postmeta` |
| 16 | `wpwd_posts` |
| 17 | `wpwd_revslider_css` |
| 18 | `wpwd_revslider_css_bkp` |
| 19 | `wpwd_revslider_layer_animations` |
| 20 | `wpwd_revslider_layer_animations_bkp` |
| 21 | `wpwd_revslider_navigations` |
| 22 | `wpwd_revslider_navigations_bkp` |
| 23 | `wpwd_revslider_sliders` |
| 24 | `wpwd_revslider_sliders_bkp` |
| 25 | `wpwd_revslider_slides` |
| 26 | `wpwd_revslider_slides_bkp` |
| 27 | `wpwd_revslider_static_slides` |
| 28 | `wpwd_revslider_static_slides_bkp` |
| 29 | `wpwd_termmeta` |
| 30 | `wpwd_terms` |
| 31 | `wpwd_term_relationships` |
| 32 | `wpwd_term_taxonomy` |
| 33 | `wpwd_usermeta` |
| 34 | `wpwd_users` |
| 35 | `wpwd_wcpdf_invoice_number` |
| 36 | `wpwd_wcpdf_packing_slip_number` |
| 37 | `wpwd_wc_admin_notes` |
| 38 | `wpwd_wc_admin_note_actions` |
| 39 | `wpwd_wc_category_lookup` |
| 40 | `wpwd_wc_customer_lookup` |
| 41 | `wpwd_wc_download_log` |
| 42 | `wpwd_wc_orders` |
| 43 | `wpwd_wc_orders_meta` |
| 44 | `wpwd_wc_order_addresses` |
| 45 | `wpwd_wc_order_coupon_lookup` |
| 46 | `wpwd_wc_order_operational_data` |
| 47 | `wpwd_wc_order_product_lookup` |
| 48 | `wpwd_wc_order_stats` |
| 49 | `wpwd_wc_order_tax_lookup` |
| 50 | `wpwd_wc_product_attributes_lookup` |
| 51 | `wpwd_wc_product_download_directories` |
| 52 | `wpwd_wc_product_meta_lookup` |
| 53 | `wpwd_wc_rate_limits` |
| 54 | `wpwd_wc_reserved_stock` |
| 55 | `wpwd_wc_tax_rate_classes` |
| 56 | `wpwd_wc_webhooks` |
| 57 | `wpwd_woocommerce_api_keys` |
| 58 | `wpwd_woocommerce_attribute_taxonomies` |
| 59 | `wpwd_woocommerce_downloadable_product_permissions` |
| 60 | `wpwd_woocommerce_log` |
| 61 | `wpwd_woocommerce_order_itemmeta` |
| 62 | `wpwd_woocommerce_order_items` |
| 63 | `wpwd_woocommerce_payment_tokenmeta` |
| 64 | `wpwd_woocommerce_payment_tokens` |
| 65 | `wpwd_woocommerce_sessions` |
| 66 | `wpwd_woocommerce_shipping_zones` |
| 67 | `wpwd_woocommerce_shipping_zone_locations` |
| 68 | `wpwd_woocommerce_shipping_zone_methods` |
| 69 | `wpwd_woocommerce_tax_rates` |
| 70 | `wpwd_woocommerce_tax_rate_locations` |
| 71 | `wpwd_wpforms_logs` |
| 72 | `wpwd_wpforms_payments` |
| 73 | `wpwd_wpforms_payment_meta` |
| 74 | `wpwd_wpforms_tasks_meta` |
| 75 | `wpwd_yith_wcwl` |
| 76 | `wpwd_yith_wcwl_lists` |

---

## 2. WORDPRESS CORE TABLES

These 11 tables are standard WordPress core tables (prefixed `wpwd_` instead of the default `wp_`):

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `wpwd_posts` | All content (products, pages, orders, attachments, revisions) | `ID`, `post_author`, `post_type`, `post_status`, `post_parent`, `post_title`, `post_content`, `post_date`, `post_name` |
| `wpwd_postmeta` | EAV metadata for every post | `meta_id`, `post_id`, `meta_key`, `meta_value` |
| `wpwd_users` | WordPress user accounts | `ID`, `user_login`, `user_pass`, `user_email`, `user_registered`, `display_name` |
| `wpwd_usermeta` | EAV metadata for users (roles, WC customer data) | `umeta_id`, `user_id`, `meta_key`, `meta_value` |
| `wpwd_terms` | Taxonomy terms (categories, tags, attributes) | `term_id`, `name`, `slug`, `term_group` |
| `wpwd_term_taxonomy` | Connects terms to their taxonomy | `term_taxonomy_id`, `term_id`, `taxonomy`, `parent`, `count` |
| `wpwd_term_relationships` | Maps posts/objects to taxonomy terms | `object_id`, `term_taxonomy_id`, `term_order` |
| `wpwd_termmeta` | EAV metadata for taxonomy terms | `meta_id`, `term_id`, `meta_key`, `meta_value` |
| `wpwd_options` | Site-wide settings (serialised PHP) | `option_id`, `option_name`, `option_value`, `autoload` |
| `wpwd_comments` | Product reviews and order notes | `comment_ID`, `comment_post_ID`, `comment_type`, `comment_content`, `user_id` |
| `wpwd_commentmeta` | EAV metadata for comments | `meta_id`, `comment_id`, `meta_key`, `meta_value` |
| `wpwd_links` | WordPress blogroll links (legacy) | `link_id`, `link_url`, `link_name` |

---

## 3. WOOCOMMERCE LEGACY / STANDARD TABLES

These tables are part of the classic WooCommerce schema (pre-HPOS):

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `wpwd_woocommerce_order_items` | Order line items, shipping rows, tax rows | `order_item_id`, `order_item_name`, `order_item_type`, `order_id` |
| `wpwd_woocommerce_order_itemmeta` | EAV metadata per order item | `meta_id`, `order_item_id`, `meta_key`, `meta_value` |
| `wpwd_woocommerce_sessions` | Guest/logged-in cart sessions | `session_id`, `session_key`, `session_value`, `session_expiry` |
| `wpwd_woocommerce_attribute_taxonomies` | Global product attribute definitions | `attribute_id`, `attribute_name`, `attribute_label`, `attribute_type`, `attribute_orderby` |
| `wpwd_woocommerce_downloadable_product_permissions` | Per-order download access grants | `permission_id`, `download_id`, `product_id`, `order_id`, `user_email`, `user_id` |
| `wpwd_woocommerce_payment_tokens` | Saved payment tokens (cards etc.) | `token_id`, `gateway_id`, `token`, `user_id`, `type`, `is_default` |
| `wpwd_woocommerce_payment_tokenmeta` | Metadata for payment tokens | `meta_id`, `payment_token_id`, `meta_key`, `meta_value` |
| `wpwd_woocommerce_shipping_zones` | Defined shipping zones | `zone_id`, `zone_name`, `zone_order` |
| `wpwd_woocommerce_shipping_zone_locations` | Countries/postcodes per zone | `location_id`, `zone_id`, `location_code`, `location_type` |
| `wpwd_woocommerce_shipping_zone_methods` | Methods enabled per zone | `instance_id`, `zone_id`, `method_id`, `is_enabled` |
| `wpwd_woocommerce_tax_rates` | Tax rate definitions | `tax_rate_id`, `tax_rate_country`, `tax_rate_state`, `tax_rate`, `tax_rate_name` |
| `wpwd_woocommerce_tax_rate_locations` | Postcodes/cities per tax rate | `location_id`, `tax_rate_id`, `location_code`, `location_type` |
| `wpwd_woocommerce_api_keys` | REST API consumer keys | `key_id`, `user_id`, `permissions`, `consumer_key`, `consumer_secret` |
| `wpwd_woocommerce_log` | WooCommerce internal logs | `log_id` |

---

## 4. WOOCOMMERCE HPOS TABLES (High-Performance Order Storage)

This site has **HPOS enabled**. Orders are stored in a dedicated relational structure rather than `wpwd_posts`. The `wpwd_posts` table contains `shop_order_placehold` placeholder records only (1,302 found).

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `wpwd_wc_orders` | **Primary order table** — replaces `wp_posts` for orders | `id`, `status`, `currency`, `type`, `tax_amount`, `total_amount`, `customer_id`, `billing_email`, `date_created_gmt`, `date_updated_gmt`, `payment_method`, `payment_method_title`, `transaction_id`, `ip_address` |
| `wpwd_wc_orders_meta` | Arbitrary order metadata (mirrors old `postmeta`) | `id`, `order_id`, `meta_key`, `meta_value` |
| `wpwd_wc_order_addresses` | Billing and shipping addresses (one row each per order) | `id`, `order_id`, `address_type` (`billing`/`shipping`), `first_name`, `last_name`, `company`, `address_1`, `address_2`, `city`, `state`, `postcode`, `country`, `email`, `phone` |
| `wpwd_wc_order_operational_data` | Order flags and computed fields | `id`, `order_id`, `created_via`, `order_key`, `prices_include_tax`, `cart_hash`, `date_paid_gmt`, `date_completed_gmt`, `shipping_tax_amount`, `shipping_total_amount`, `discount_tax_amount`, `discount_total_amount` |
| `wpwd_wc_order_stats` | Analytics summary per order | `order_id`, `total_sales`, `tax_total`, `shipping_total`, `net_total`, `num_items_sold`, `customer_id`, `status`, `date_paid`, `date_completed` |
| `wpwd_wc_order_product_lookup` | Analytics: which products were in which orders | `order_item_id`, `order_id`, `product_id`, `variation_id`, `customer_id`, `product_qty`, `product_net_revenue`, `product_gross_revenue`, `coupon_amount`, `tax_amount` |
| `wpwd_wc_order_coupon_lookup` | Analytics: coupons applied per order | `order_id`, `coupon_id`, `date_created`, `discount_amount` |
| `wpwd_wc_order_tax_lookup` | Analytics: tax breakdown per order | `order_id`, `tax_rate_id`, `shipping_tax`, `order_tax`, `total_tax` |
| `wpwd_wc_customer_lookup` | Analytics: customer summary (mirrors `wpwd_users`) | `customer_id`, `user_id`, `username`, `first_name`, `last_name`, `email`, `country`, `city`, `postcode`, `date_last_active`, `date_registered` |

> **Note:** The `wpwd_woocommerce_order_items` and `wpwd_woocommerce_order_itemmeta` tables are still used alongside HPOS for line-item storage. They are linked to HPOS orders via the shared `order_id`.

---

## 5. PRODUCT TABLES & DATA STRUCTURE

Products in WordPress/WooCommerce are stored as posts with `post_type = 'product'`.

### Primary Product Storage

| Table | Role |
|-------|------|
| `wpwd_posts` | One row per product (`post_type = 'product'`). 12 products found. |
| `wpwd_postmeta` | All product attributes stored as key-value rows |

### Product Counts (actual data)
- **Products (`post_type = 'product'`):** 12
- **Product Variations (`post_type = 'product_variation'`):** 207
- **Attachments (media):** 32
- **Stock status `instock`:** 200 (postmeta rows)
- **Stock status `outofstock`:** 19 (postmeta rows)

### `wpwd_posts` columns relevant to products

```
ID              bigint UNSIGNED  — product ID
post_author     bigint           — author/creator user ID
post_date       datetime         — created date
post_title      text             — product name
post_content    longtext         — full description
post_excerpt    text             — short description
post_status     varchar(20)      — 'publish', 'draft', etc.
post_name       varchar(200)     — URL slug
post_parent     bigint           — parent product ID (for variations)
post_type       varchar(20)      — 'product' or 'product_variation'
post_mime_type  varchar(100)     — used for attachments
```

### WooCommerce Product Meta Lookup Table

`wpwd_wc_product_meta_lookup` — denormalised fast-query table:

```
product_id      bigint      — FK → wpwd_posts.ID
sku             varchar(100)
virtual         tinyint(1)
downloadable    tinyint(1)
min_price       decimal(19,4)
max_price       decimal(19,4)
onsale          tinyint(1)
stock_quantity  double
stock_status    varchar(100)  — 'instock' / 'outofstock'
rating_count    bigint
average_rating  decimal(3,2)
total_sales     bigint
tax_status      varchar(100)
tax_class       varchar(100)
global_unique_id varchar(100)
```

---

## 6. PRODUCT METADATA (`wpwd_postmeta`)

All product-specific data is stored as EAV rows in `wpwd_postmeta` where `post_id` = the product's `ID`. The following keys were confirmed present in the actual data:

| `meta_key` | Description |
|-----------|-------------|
| `_sku` | Stock Keeping Unit identifier |
| `_regular_price` | Standard selling price |
| `_sale_price` | Discounted price (if on sale) |
| `_price` | Current active price (regular or sale) |
| `_sale_price_dates_to` | Sale end date timestamp |
| `_stock` | Current stock quantity |
| `_stock_status` | `instock` / `outofstock` / `onbackorder` |
| `_manage_stock` | `yes` / `no` — whether stock is tracked |
| `_backorders` | `no` / `notify` / `yes` |
| `_sold_individually` | `yes` / `no` |
| `_virtual` | `yes` / `no` |
| `_downloadable` | `yes` / `no` |
| `_weight` | Product weight |
| `_length` | Product length |
| `_width` | Product width |
| `_height` | Product height |
| `_tax_status` | `taxable` / `shipping` / `none` |
| `_tax_class` | Tax class name |
| `_thumbnail_id` | FK → `wpwd_posts.ID` (attachment) — featured image |
| `_product_image_gallery` | Comma-separated attachment IDs for gallery |
| `_product_attributes` | Serialised PHP array of attribute definitions |
| `total_sales` | Cumulative units sold |
| `attribute_pa_size` | Selected attribute value for `pa_size` taxonomy |
| `_variation_description` | Description specific to a variation |
| `_elementor_data` | Elementor page builder JSON (for page layouts) |
| `_wp_attached_file` | Relative file path (on attachments) |
| `_wp_attachment_metadata` | Serialised image metadata (sizes, dimensions) |

---

## 7. PRODUCT VARIATIONS

Variations are stored as child posts in `wpwd_posts`:

```
post_type   = 'product_variation'
post_parent = <parent product ID>
post_status = 'publish'
```

- **207 variations** found in the actual data
- Each variation has its own rows in `wpwd_postmeta` for `_price`, `_sku`, `_stock`, `_stock_status`, `attribute_pa_size`, etc.
- The product attribute used for variations is **`pa_size`** (size attribute taxonomy)
- Size values: 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44

### Attribute Lookup Table

`wpwd_wc_product_attributes_lookup` — used for fast variation filtering:

```
product_id              bigint  — the variation's post ID
product_or_parent_id    bigint  — parent product post ID
taxonomy                varchar(32)  — e.g. 'pa_size'
term_id                 bigint  — FK → wpwd_terms.term_id
is_variation_attribute  tinyint(1)
in_stock                tinyint(1)
```

---

## 8. CATEGORIES AND TAXONOMY RELATIONSHIPS

WordPress uses a three-table taxonomy system. WooCommerce extends it with additional taxonomies.

### Tables

| Table | Columns | Role |
|-------|---------|------|
| `wpwd_terms` | `term_id`, `name`, `slug`, `term_group` | The term itself |
| `wpwd_term_taxonomy` | `term_taxonomy_id`, `term_id`, `taxonomy`, `parent`, `count` | Associates term with a taxonomy type |
| `wpwd_term_relationships` | `object_id`, `term_taxonomy_id`, `term_order` | Maps posts to taxonomy terms |
| `wpwd_termmeta` | `meta_id`, `term_id`, `meta_key`, `meta_value` | EAV metadata for terms |
| `wpwd_wc_category_lookup` | `category_tree_id`, `category_id` | Flattened category hierarchy for fast queries |

### Taxonomies Found in This Database

| Taxonomy | Count | Purpose |
|---------|-------|---------|
| `product_cat` | 2 | Product categories (1 = `Uncategorized`, 144 = `Uniforms`) |
| `product_type` | 5 | `simple`, `grouped`, `variable`, `external`, `woosb` |
| `product_visibility` | 9 | `exclude-from-search`, `exclude-from-catalog`, `featured`, `outofstock`, `rated-1` … `rated-5` |
| `pa_size` | 24 | Product attribute: sizes (2–44) |
| `category` | 1 | WordPress post categories |
| `nav_menu` | 6 | Navigation menus (`Main Menu`, `Menu ldp`, `Shop by Department`, `Home Menu`, `USD`, `English`) |
| `elementor_library_type` | 4 | Elementor template types (`page`, `section`, `header`, `footer`) |
| `wp_theme` | 1 | Active theme (`freshio`) |

### How to resolve: product → category

```sql
SELECT t.name, tt.taxonomy
FROM wpwd_term_relationships tr
JOIN wpwd_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
JOIN wpwd_terms t ON tt.term_id = t.term_id
WHERE tr.object_id = <product_post_id>
  AND tt.taxonomy = 'product_cat';
```

---

## 9. CUSTOMERS

WooCommerce customer data lives in two places:

### A. WordPress Users (`wpwd_users` + `wpwd_usermeta`)

- **1,043 users** total: 1 administrator + 1,042 customers
- The `customer` role is stored in `wpwd_usermeta` as `meta_key = 'wpwd_capabilities'`

### B. WooCommerce Customer Lookup (`wpwd_wc_customer_lookup`)

Denormalised analytics table — 1 row per customer:

```
customer_id      bigint UNSIGNED  — auto-increment PK
user_id          bigint UNSIGNED  — FK → wpwd_users.ID (nullable for guests)
username         varchar(60)
first_name       varchar(255)
last_name        varchar(255)
email            varchar(100)
date_last_active timestamp
date_registered  timestamp
country          char(2)
postcode         varchar(20)
city             varchar(100)
state            varchar(100)
```

### C. Customer Address Data in Orders (`wpwd_wc_order_addresses`)

Billing/shipping info is stored per-order (see Section 15).

### D. Customer Meta in `wpwd_usermeta`

Key `meta_key` values for WooCommerce customers:

| `meta_key` | Content |
|-----------|---------|
| `wpwd_capabilities` | Serialised role array, e.g. `{"customer":true}` |
| `billing_first_name` | Customer default billing first name |
| `billing_last_name` | Customer default billing last name |
| `billing_email` | Billing email |
| `billing_phone` | Billing phone |
| `billing_address_1` | Billing street address |
| `billing_city` | Billing city |
| `billing_state` | Billing state |
| `billing_postcode` | Billing postcode |
| `billing_country` | Billing country code |
| `shipping_*` | Same fields for shipping |
| `last_update` | Timestamp of last profile update |

---

## 10. WORDPRESS USERS

Table: `wpwd_users`

```sql
CREATE TABLE `wpwd_users` (
  `ID`                  bigint UNSIGNED NOT NULL,
  `user_login`          varchar(60)     -- login username
  `user_pass`           varchar(255)    -- bcrypt hashed password
  `user_nicename`       varchar(50)     -- URL-safe slug
  `user_email`          varchar(100)    -- email address
  `user_url`            varchar(100)    -- website URL
  `user_registered`     datetime        -- account creation date
  `user_activation_key` varchar(255)    -- password reset token
  `user_status`         int             -- 0 = active
  `display_name`        varchar(250)    -- public display name
)
```

**Row counts:** 1,043 users (1 admin + 1,042 customers)

---

## 11. USER ROLES

Roles are stored in `wpwd_usermeta`:

```
meta_key   = 'wpwd_capabilities'
meta_value = serialised PHP: a:1:{s:13:"administrator";b:1;}
           = serialised PHP: a:1:{s:8:"customer";b:1;}
```

| Role | Count |
|------|-------|
| `administrator` | 1 |
| `customer` | 1,042 |

The prefix `wpwd_` on `wpwd_capabilities` matches the table prefix — this is how WordPress knows which site's capabilities to read on multisite.

---

## 12. ORDERS

### HPOS Primary Table: `wpwd_wc_orders`

**1,302 orders** of type `shop_order`.

```sql
CREATE TABLE `wpwd_wc_orders` (
  `id`                   bigint UNSIGNED   -- PK, shared with wpwd_posts placeholder
  `status`               varchar(20)       -- 'wc-processing', 'wc-cancelled', 'wc-failed'
  `currency`             varchar(10)       -- 'INR' (implied by Paytm)
  `type`                 varchar(20)       -- 'shop_order'
  `tax_amount`           decimal(26,8)
  `total_amount`         decimal(26,8)
  `customer_id`          bigint UNSIGNED   -- FK → wpwd_wc_customer_lookup.customer_id
  `billing_email`        varchar(320)
  `date_created_gmt`     datetime
  `date_updated_gmt`     datetime
  `parent_order_id`      bigint UNSIGNED
  `payment_method`       varchar(100)      -- 'paytm' (all 1,302 orders)
  `payment_method_title` text
  `transaction_id`       varchar(100)      -- Paytm transaction reference
  `ip_address`           varchar(100)
  `user_agent`           text
  `customer_note`        text
)
```

### Order Statuses Found

| Status | Count |
|--------|-------|
| `wc-processing` | 1,180 |
| `wc-cancelled` | 118 |
| `wc-failed` | 4 |

### Legacy Placeholder in `wpwd_posts`

Each HPOS order has a mirrored placeholder row:
```
post_type   = 'shop_order_placehold'
post_status = 'wc-processing' / 'wc-cancelled' / 'wc-failed'
ID          = same as wpwd_wc_orders.id
```

---

## 13. ORDER ITEMS

Table: `wpwd_woocommerce_order_items`

```sql
CREATE TABLE `wpwd_woocommerce_order_items` (
  `order_item_id`   bigint UNSIGNED  -- PK
  `order_item_name` text             -- product name at time of purchase
  `order_item_type` varchar(200)     -- 'line_item', 'shipping', 'tax'
  `order_id`        bigint UNSIGNED  -- FK → wpwd_wc_orders.id
)
```

**9,681 total order item rows:**

| `order_item_type` | Count |
|------------------|-------|
| `line_item` | 5,775 |
| `shipping` | 1,302 |
| `tax` | 2,604 |

### Order Item Metadata: `wpwd_woocommerce_order_itemmeta`

Key EAV metadata stored per order item:

| `meta_key` | Description |
|-----------|-------------|
| `_product_id` | FK → `wpwd_posts.ID` (the product) |
| `_variation_id` | FK → `wpwd_posts.ID` (the variation, if applicable) |
| `_qty` | Quantity ordered |
| `_line_subtotal` | Line subtotal before discounts |
| `_line_total` | Line total after discounts |
| `_line_subtotal_tax` | Tax on subtotal |
| `_line_tax` | Tax on total |
| `_line_tax_data` | Serialised tax breakdown |
| `_tax_class` | Tax class of product |
| `pa_size` | Selected size attribute value |
| `_reduced_stock` | Stock reduction applied flag |

---

## 14. ORDER METADATA (`wpwd_wc_orders_meta`)

Stores arbitrary key-value metadata per HPOS order. Confirmed keys:

| `meta_key` | Count | Description |
|-----------|-------|-------------|
| `is_vat_exempt` | 1,302 | VAT exemption flag |
| `_billing_address_index` | 1,302 | Billing address search index string |
| `_shipping_address_index` | 1,302 | Shipping address search index string |
| `_wc_order_attribution_*` | 12,248 | Order attribution tracking (source, medium, utm_*) |
| `_wcpdf_invoice_number` | 1,182 | PDF invoice sequential number |
| `_wcpdf_invoice_date` | 1,182 | PDF invoice date |
| `_wcpdf_*` | 8,274 total | All PDF invoice/packing slip meta |

---

## 15. BILLING / SHIPPING ADDRESSES

### HPOS Addresses Table: `wpwd_wc_order_addresses`

**2,608 address rows** (billing + shipping per order):

```sql
CREATE TABLE `wpwd_wc_order_addresses` (
  `id`           bigint UNSIGNED   -- PK
  `order_id`     bigint UNSIGNED   -- FK → wpwd_wc_orders.id
  `address_type` varchar(20)       -- 'billing' or 'shipping'
  `first_name`   text
  `last_name`    text
  `company`      text
  `address_1`    text
  `address_2`    text
  `city`         text
  `state`        text
  `postcode`     text
  `country`      text
  `email`        varchar(320)      -- billing only
  `phone`        varchar(100)      -- billing only
)
```

### Customer Default Addresses

Customer default billing/shipping addresses are also stored in `wpwd_usermeta` as `billing_*` and `shipping_*` meta keys (see Section 9D).

---

## 16. PAYMENTS

### All orders use Paytm exclusively (payment_method = 'paytm', 1,302/1,302 orders)

### A. HPOS Payment Fields in `wpwd_wc_orders`

```
payment_method       = 'paytm'
payment_method_title = (title string e.g. 'Paytm')
transaction_id       = Paytm transaction reference string
```

### B. Paytm-Specific Table: `wpwd_paytm_order_data`

**1,257 rows** of detailed Paytm transaction records:

```sql
CREATE TABLE `wpwd_paytm_order_data` (
  `id`             int          -- PK
  `order_id`       int          -- FK → wpwd_wc_orders.id
  `paytm_order_id` varchar(255) -- Paytm's own order reference
  `transaction_id` varchar(255) -- Paytm transaction ID
  `status`         enum('0','1') -- 0 = pending/failed, 1 = success
  `paytm_response` text         -- raw JSON response from Paytm gateway
  `date_added`     datetime
  `date_modified`  datetime
)
```

### C. WPForms Payments: `wpwd_wpforms_payments`

Payments processed through WPForms (contact/order forms):

```sql
CREATE TABLE `wpwd_wpforms_payments` (
  `id`                  bigint
  `form_id`             bigint
  `status`              varchar(10)
  `subtotal_amount`     decimal(26,8)
  `discount_amount`     decimal(26,8)
  `total_amount`        decimal(26,8)
  `currency`            varchar(3)
  `entry_id`            bigint
  `gateway`             varchar(20)
  `type`                varchar(12)
  `mode`                varchar(4)    -- 'live' / 'test'
  `transaction_id`      varchar(40)
  `customer_id`         varchar(40)
  `title`               varchar(255)
  `date_created_gmt`    datetime
  `date_updated_gmt`    datetime
  `is_published`        tinyint(1)
)
```

### D. Saved Payment Tokens: `wpwd_woocommerce_payment_tokens`

Currently **0 rows** (no saved cards/tokens in this dataset).

### E. PDF Invoice/Packing Slip Numbers

| Table | Purpose |
|-------|---------|
| `wpwd_wcpdf_invoice_number` | Sequential invoice number per order |
| `wpwd_wcpdf_packing_slip_number` | Sequential packing slip number per order |

---

## 17. COUPONS

Coupons in WooCommerce are stored as posts with `post_type = 'shop_coupon'` in `wpwd_posts`. No `shop_coupon` post type rows were found in the data, indicating no coupons are configured in this store.

The analytics table `wpwd_wc_order_coupon_lookup` exists but has **0 rows** — confirming no coupons have been applied to any order.

```sql
CREATE TABLE `wpwd_wc_order_coupon_lookup` (
  `order_id`        bigint UNSIGNED
  `coupon_id`       bigint          -- FK → wpwd_posts.ID (shop_coupon)
  `date_created`    datetime
  `discount_amount` double
)
```

---

## 18. PRODUCT IMAGES / MEDIA

### Featured Images

- Stored as `post_type = 'attachment'` rows in `wpwd_posts`
- **32 attachment records** found
- Linked to products via `wpwd_postmeta` → `meta_key = '_thumbnail_id'` (**150 such meta rows**)
- File path stored in `wpwd_postmeta` → `meta_key = '_wp_attached_file'` (32 rows)
- Image size variants stored in `wpwd_postmeta` → `meta_key = '_wp_attachment_metadata'` (serialised)

### Gallery Images

- Linked via `wpwd_postmeta` → `meta_key = '_product_image_gallery'`
- Value is a comma-separated list of attachment post IDs
- **2 gallery meta rows** found

### How to retrieve product image URL

```sql
-- Step 1: Get thumbnail attachment ID
SELECT meta_value AS attachment_id
FROM wpwd_postmeta
WHERE post_id = <product_id> AND meta_key = '_thumbnail_id';

-- Step 2: Get file path from that attachment
SELECT meta_value AS file_path
FROM wpwd_postmeta
WHERE post_id = <attachment_id> AND meta_key = '_wp_attached_file';
-- File path is relative to wp-content/uploads/
```

---

## 19. IMPORTANT TABLE RELATIONSHIPS

```
wpwd_users.ID
  └─► wpwd_usermeta.user_id                    (user metadata, roles, billing defaults)
  └─► wpwd_wc_customer_lookup.user_id          (analytics customer record)
  └─► wpwd_wc_orders.customer_id               (via wc_customer_lookup.customer_id)
  └─► wpwd_comments.user_id                    (reviews, order notes)

wpwd_posts.ID  [post_type='product']
  └─► wpwd_postmeta.post_id                    (all product meta: price, stock, images)
  └─► wpwd_term_relationships.object_id        (→ categories, types, visibility, attributes)
  └─► wpwd_wc_product_meta_lookup.product_id   (denormalised product data)
  └─► wpwd_wc_product_attributes_lookup.product_or_parent_id

wpwd_posts.ID  [post_type='product_variation']
  └─► wpwd_posts.post_parent                   (→ parent product ID)
  └─► wpwd_postmeta.post_id                    (variation-specific price, stock, attributes)
  └─► wpwd_wc_product_attributes_lookup.product_id

wpwd_wc_orders.id
  └─► wpwd_wc_order_addresses.order_id         (billing + shipping addresses)
  └─► wpwd_wc_orders_meta.order_id             (arbitrary meta, invoice numbers, attribution)
  └─► wpwd_wc_order_operational_data.order_id  (order_key, payment dates, flags)
  └─► wpwd_woocommerce_order_items.order_id    (line items, shipping rows, tax rows)
  └─► wpwd_wc_order_stats.order_id             (analytics summary)
  └─► wpwd_wc_order_product_lookup.order_id    (product analytics)
  └─► wpwd_wc_order_tax_lookup.order_id        (tax analytics)
  └─► wpwd_wc_order_coupon_lookup.order_id     (coupon usage analytics)
  └─► wpwd_paytm_order_data.order_id           (Paytm transaction details)
  └─► wpwd_posts.ID                            (placeholder: post_type='shop_order_placehold')

wpwd_woocommerce_order_items.order_item_id
  └─► wpwd_woocommerce_order_itemmeta.order_item_id  (product_id, variation_id, qty, price)
  └─► wpwd_wc_order_product_lookup.order_item_id     (analytics cross-reference)

wpwd_terms.term_id
  └─► wpwd_term_taxonomy.term_id               (taxonomy classification)
  └─► wpwd_term_relationships.term_taxonomy_id (via term_taxonomy_id)
  └─► wpwd_termmeta.term_id                    (term metadata)
  └─► wpwd_wc_product_attributes_lookup.term_id

wpwd_woocommerce_attribute_taxonomies.attribute_name
  └─► wpwd_terms (via taxonomy 'pa_<attribute_name>')  — 'pa_size' in this store

wpwd_woocommerce_order_items.order_item_id [type='shipping']
  └─► wpwd_woocommerce_order_itemmeta         (method_id, method_title, cost, taxes)

wpwd_woocommerce_sessions.session_key
  └─► wpwd_users.user_login (for logged-in users) or a random key (for guests)

wpwd_paytm_order_data.order_id
  └─► wpwd_wc_orders.id

wpwd_wcpdf_invoice_number.order_id
  └─► wpwd_wc_orders.id

wpwd_yith_wcwl.prod_id
  └─► wpwd_posts.ID (product)
wpwd_yith_wcwl.user_id
  └─► wpwd_users.ID
wpwd_yith_wcwl.wishlist_id
  └─► wpwd_yith_wcwl_lists.ID

wpwd_comments.comment_post_ID
  └─► wpwd_posts.ID (product or order)
wpwd_commentmeta.comment_id
  └─► wpwd_comments.comment_ID
```

---

## 20. TABLES THAT MUST NEVER BE MODIFIED

The following tables are the live source-of-truth. They must **never be altered, truncated, dropped, or written to** by any external application:

### Absolute No-Touch (core business data)

| Table | Reason |
|-------|--------|
| `wpwd_posts` | Contains all products, pages, media, order placeholders |
| `wpwd_postmeta` | All product attributes, prices, stock, image references |
| `wpwd_users` | All user accounts including customer logins |
| `wpwd_usermeta` | User roles, billing/shipping defaults, WC customer data |
| `wpwd_wc_orders` | All HPOS order records — primary order store |
| `wpwd_wc_orders_meta` | Order metadata including invoice numbers and attribution |
| `wpwd_wc_order_addresses` | Every billing and shipping address on record |
| `wpwd_wc_order_operational_data` | Order keys, payment dates, financial flags |
| `wpwd_woocommerce_order_items` | Every line item, shipping charge, and tax row |
| `wpwd_woocommerce_order_itemmeta` | Prices, quantities, product IDs per line item |
| `wpwd_terms` | All taxonomy terms |
| `wpwd_term_taxonomy` | Taxonomy type assignments |
| `wpwd_term_relationships` | Product-to-category and product-to-attribute mappings |
| `wpwd_termmeta` | Term metadata |
| `wpwd_options` | WordPress/WooCommerce site configuration |
| `wpwd_paytm_order_data` | Paytm payment transaction records |

### Analytics / Lookup Tables (read-only from external app)

These are WooCommerce-managed caches — never write to them externally:

| Table | Reason |
|-------|--------|
| `wpwd_wc_product_meta_lookup` | WC-managed product denorm cache |
| `wpwd_wc_product_attributes_lookup` | WC-managed attribute filter cache |
| `wpwd_wc_customer_lookup` | WC-managed customer analytics cache |
| `wpwd_wc_order_stats` | WC-managed order analytics |
| `wpwd_wc_order_product_lookup` | WC-managed product analytics |
| `wpwd_wc_order_coupon_lookup` | WC-managed coupon analytics |
| `wpwd_wc_order_tax_lookup` | WC-managed tax analytics |
| `wpwd_wc_category_lookup` | WC-managed category hierarchy cache |
| `wpwd_wcpdf_invoice_number` | Invoice number sequence — must stay in sync |
| `wpwd_wcpdf_packing_slip_number` | Packing slip sequence |

### Plugin Tables (do not modify — managed by their respective plugins)

| Table | Plugin |
|-------|--------|
| `wpwd_revslider_*` (8 tables) | Revolution Slider |
| `wpwd_e_submissions*`, `wpwd_e_events` | Elementor Forms |
| `wpwd_actionscheduler_*` | Action Scheduler (WooCommerce background jobs) |
| `wpwd_yith_wcwl`, `wpwd_yith_wcwl_lists` | YITH WooCommerce Wishlist |
| `wpwd_wpforms_*` | WPForms |
| `wpwd_nfd_data_event_queue` | Newfold (Bluehost) telemetry |
| `wpwd_woocommerce_sessions` | WooCommerce cart/session data |
| `wpwd_woocommerce_shipping_zones*` | WooCommerce shipping configuration |
| `wpwd_woocommerce_tax_rates*` | WooCommerce tax configuration |
| `wpwd_wc_webhooks` | WooCommerce webhooks |
| `wpwd_wc_rate_limits` | WooCommerce REST API rate limiting |
| `wpwd_wc_reserved_stock` | Transient stock reservation during checkout |

---

## APPENDIX A: Plugin & Theme Inventory

Based on tables present in the database:

| Plugin/Component | Tables |
|-----------------|--------|
| **Revolution Slider** | `wpwd_revslider_css`, `wpwd_revslider_css_bkp`, `wpwd_revslider_layer_animations`, `wpwd_revslider_layer_animations_bkp`, `wpwd_revslider_navigations`, `wpwd_revslider_navigations_bkp`, `wpwd_revslider_sliders`, `wpwd_revslider_sliders_bkp`, `wpwd_revslider_slides`, `wpwd_revslider_slides_bkp`, `wpwd_revslider_static_slides`, `wpwd_revslider_static_slides_bkp` |
| **Elementor** | `wpwd_e_events`, `wpwd_e_submissions`, `wpwd_e_submissions_actions_log`, `wpwd_e_submissions_values` |
| **WPForms** | `wpwd_wpforms_logs`, `wpwd_wpforms_payments`, `wpwd_wpforms_payment_meta`, `wpwd_wpforms_tasks_meta` |
| **WooCommerce PDF Invoices** | `wpwd_wcpdf_invoice_number`, `wpwd_wcpdf_packing_slip_number` |
| **Paytm Payment Gateway** | `wpwd_paytm_order_data` |
| **YITH WooCommerce Wishlist** | `wpwd_yith_wcwl`, `wpwd_yith_wcwl_lists` |
| **Action Scheduler** | `wpwd_actionscheduler_actions`, `wpwd_actionscheduler_claims`, `wpwd_actionscheduler_groups`, `wpwd_actionscheduler_logs` |
| **Newfold/Bluehost** | `wpwd_nfd_data_event_queue` |
| **Active Theme** | `freshio` (confirmed from `wpwd_terms`) |
| **Page Builder** | Elementor (confirmed from `_elementor_data` postmeta + `elementor_library` post type) |

---

## APPENDIX B: Quick Reference — Key Query Patterns for External App

> These are **read-only** queries your Node.js/React app should use.

```sql
-- All published products with price and stock
SELECT p.ID, p.post_title, p.post_name,
       pm_price.meta_value  AS price,
       pm_stock.meta_value  AS stock_status,
       pm_sku.meta_value    AS sku
FROM wpwd_posts p
LEFT JOIN wpwd_postmeta pm_price  ON pm_price.post_id  = p.ID AND pm_price.meta_key  = '_price'
LEFT JOIN wpwd_postmeta pm_stock  ON pm_stock.post_id  = p.ID AND pm_stock.meta_key  = '_stock_status'
LEFT JOIN wpwd_postmeta pm_sku    ON pm_sku.post_id    = p.ID AND pm_sku.meta_key    = '_sku'
WHERE p.post_type = 'product' AND p.post_status = 'publish';

-- All variations of a product
SELECT p.ID, p.post_title, pm.meta_key, pm.meta_value
FROM wpwd_posts p
JOIN wpwd_postmeta pm ON pm.post_id = p.ID
WHERE p.post_type = 'product_variation'
  AND p.post_parent = <parent_product_id>;

-- Order with addresses and items
SELECT o.id, o.status, o.total_amount, o.date_created_gmt,
       a.address_type, a.first_name, a.last_name, a.address_1, a.city, a.country
FROM wpwd_wc_orders o
JOIN wpwd_wc_order_addresses a ON a.order_id = o.id
WHERE o.id = <order_id>;

-- Line items for an order
SELECT oi.order_item_name,
       oim_qty.meta_value   AS qty,
       oim_total.meta_value AS line_total,
       oim_pid.meta_value   AS product_id,
       oim_vid.meta_value   AS variation_id
FROM wpwd_woocommerce_order_items oi
LEFT JOIN wpwd_woocommerce_order_itemmeta oim_qty   ON oim_qty.order_item_id   = oi.order_item_id AND oim_qty.meta_key   = '_qty'
LEFT JOIN wpwd_woocommerce_order_itemmeta oim_total ON oim_total.order_item_id = oi.order_item_id AND oim_total.meta_key = '_line_total'
LEFT JOIN wpwd_woocommerce_order_itemmeta oim_pid   ON oim_pid.order_item_id   = oi.order_item_id AND oim_pid.meta_key   = '_product_id'
LEFT JOIN wpwd_woocommerce_order_itemmeta oim_vid   ON oim_vid.order_item_id   = oi.order_item_id AND oim_vid.meta_key   = '_variation_id'
WHERE oi.order_id = <order_id> AND oi.order_item_type = 'line_item';

-- Customers list
SELECT u.ID, u.user_email, u.display_name, u.user_registered,
       cl.country, cl.city, cl.date_last_active
FROM wpwd_users u
JOIN wpwd_usermeta um ON um.user_id = u.ID AND um.meta_key = 'wpwd_capabilities'
JOIN wpwd_wc_customer_lookup cl ON cl.user_id = u.ID
WHERE um.meta_value LIKE '%customer%';
```

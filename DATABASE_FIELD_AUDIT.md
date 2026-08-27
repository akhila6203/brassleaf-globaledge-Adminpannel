# DATABASE FIELD AUDIT — Brassleaf Admin Panel

> **Database:** `brassleaf`  
> **Table prefix:** `wpwd_`  
> **Source dump:** `brassleaf_wp416_cornerstone.sql`  
> **HPOS:** Enabled (`woocommerce_custom_orders_table_enabled = yes`)  
> **Audit date:** 2026-08-26 (refreshed against live DB + current code)  
> **Rule:** Restore complete data display FIRST. Add CRUD WITHOUT removing fields.  
> **Status:** Audit only — **no implementation changes in this document.**

This audit compares:

1. Actual live schema columns / relationships (from dump + live MySQL)  
2. Backend API responses currently returned  
3. Frontend UI fields currently displayed / reachable  

---

## Verified live row counts

| Entity | Source | Count |
|--------|--------|------:|
| Users | `wpwd_users` | 1,043 |
| Customers (lookup) | `wpwd_wc_customer_lookup` | 1,040 |
| Products | `wpwd_posts` `post_type=product` | 13 |
| Variations | `wpwd_posts` `post_type=product_variation` | 207 |
| Categories | `product_cat` | 2 |
| HPOS orders | `wpwd_wc_orders` | 1,302 |
| Order line items | `woocommerce_order_items` type=`line_item` | 5,775 |
| Paytm payments | `wpwd_paytm_order_data` | 1,257 |
| Attachments | `post_type=attachment` | 32 |
| Coupons | `post_type=shop_coupon` | 0 |
| Shipping zones | `woocommerce_shipping_zones` | 1 (`All Shipping`) |

**Confirmed taxonomies in use:** `product_cat`, `product_type`, `product_visibility`, `pa_size`  
**Confirmed global attribute:** `size` / label `size`  
**No `product_tag` taxonomy rows present** (UI/API can still support tags for future data).

---

## Critical routing gaps (data exists but unreachable)

| Page file | Intended route | Registered in `AppRoutes.jsx`? | Impact |
|-----------|----------------|--------------------------------|--------|
| `pages/categories/CategoryDetails.jsx` | `/admin/categories/:id` | **NO** | List click → catch-all → dashboard. Full category + products table invisible. |
| `pages/payments/PaymentDetails.jsx` | `/admin/payments/:id` | **NO** | List/order links → catch-all → dashboard. Gateway response + related order/customer invisible. |

These are the highest-severity “data disappeared” issues: **detail UIs exist, routes were not wired.**

---

# 1. DASHBOARD

## Tables
`wpwd_wc_orders`, `wpwd_wc_orders_meta` (shipment), `wpwd_posts`, `wpwd_wc_product_meta_lookup`, `wpwd_users`, `wpwd_wc_customer_lookup`, `wpwd_wc_order_product_lookup`, `wpwd_term_taxonomy` (needed for category totals)

## Backend currently returns (`GET /api/dashboard`)
- Orders: total, pending, processing, shipped, completed, cancelled, failed, refunded, total_revenue, today_sales, monthly_sales, avg_order_value  
- Products: total, variations, low_stock, outofstock  
- Customers / users totals  
- Charts: revenueByMonth, dailySales, ordersByStatus, topProducts, topCustomers  
- Feeds: recentOrders, recentCustomers  

## UI currently displays
- KPI: Total revenue (+ avg order), Total orders (+ processing), Customers (+ users), Products (+ variations)  
- KPI: Processing / Cancelled / Failed  
- Charts: monthly revenue, top products  

## DISPLAY — missing from UI (often already in API)

| Field / section | In API? | In UI? |
|-----------------|---------|--------|
| today_sales | Yes | **No** |
| monthly_sales | Yes | **No** |
| pending / completed / shipped / refunded | Yes | **No** |
| low_stock / outofstock | Yes | **No** |
| published vs draft products | **No** | No |
| Total categories | **No** | No |
| Payment success / fail / collected | **No** (payments module only) | No |
| dailySales chart | Yes | **No** |
| ordersByStatus chart | Yes | **No** |
| topCustomers | Yes | **No** |
| recentOrders / recentCustomers tables | Yes | **No** |

## CRUD
None (read-only aggregates)

## Read-only
All dashboard metrics

## CRUD / restore plan
1. Bind unused API fields into KPI cards + charts + recent tables.  
2. Extend API for published/draft products, category count, Paytm payment KPIs / total collected.

---

# 2. PRODUCTS

## Tables
| Table | Role |
|-------|------|
| `wpwd_posts` | product / product_variation / attachment |
| `wpwd_postmeta` | EAV: prices, stock, images, attributes, shipping, tax, HSN, theme |
| `wpwd_term_relationships` + `term_taxonomy` + `terms` | type, cat, visibility, `pa_size` |
| `wpwd_wc_product_meta_lookup` | denormalized price/stock/sales |
| `wpwd_wc_product_attributes_lookup` | variation attribute index |
| `wpwd_woocommerce_attribute_taxonomies` | global attrs (`size`) |

## Relevant columns / meta

**posts:** `ID`, `post_title`, `post_content`, `post_excerpt`, `post_status`, `post_name`, `post_date`, `post_modified`, `post_parent`, `post_type`, `guid`, `menu_order`

**Confirmed product meta keys (live):**  
`_sku`, `_price`, `_stock`, `_stock_status`, `_manage_stock`, `_backorders`, `_sold_individually`, `_virtual`, `_downloadable`, `_tax_status`, `_tax_class`, `_thumbnail_id`, `_product_image_gallery`, `_product_attributes`, `_visibility`, `total_sales`, `hsn_prod_id`, `_sizechart_select`, download limits, Elementor/theme keys (display selectively)

**Lookup:** `sku`, `min_price`, `max_price`, `onsale`, `stock_quantity`, `stock_status`, `total_sales`, `tax_*`, `virtual`, `downloadable`, ratings

## RELATIONSHIPS
- Product → variations: `posts.post_parent` + `post_type=product_variation`  
- Product → categories: `term_relationships` → `term_taxonomy.taxonomy=product_cat`  
- Product → size attrs: `pa_size` + `_product_attributes` + attributes lookup  
- Product → images: `_thumbnail_id`, `_product_image_gallery` → attachment posts  

## DISPLAY — UI currently

### List (`/admin/products`)
ID, image, name+slug, SKU, type, status, categories, price range, stock qty, stock status, sales, created

### Details (`/admin/products/:id`)
Header (name, ID, slug, badges) · featured + gallery · SKU/type/prices/onsale/stock/manage/backorders/tax/weight/dims/sales/dates · categories/tags/visibility/featured · short + full description · variations (ID, SKU, size, prices, stock) · selective business meta

### Form (`/new`, `/:id/edit`) — **simplified**
Name, SKU, regular price, sale price, stock status, stock qty, status, description only

## Missing / incomplete

| Field | DB | API | List | Details | Form |
|-------|----|-----|------|---------|------|
| Regular / sale / current as separate list cols | Yes | Detail yes | Range only | Yes | Partial |
| Short description | Yes | Detail yes | — | Yes | **Missing** |
| Manage stock / backorders / tax / dims | Yes | Detail yes | No | Yes | **Missing** |
| Categories / tags / visibility / featured | Yes | Detail yes | Cats text | Yes | **Missing** |
| Images / gallery upload | Yes | Detail yes | Thumb | Yes | **Missing** |
| Attributes editor | Yes | Partial | No | Size on vars | **Missing** |
| Variation CRUD | Yes | Read-only | — | Read-only | **No** |
| Related / upsells / cross-sells | meta possible | No | No | No | No |
| `_sold_individually`, downloads | Yes | Partial/meta | No | Partial | No |

## Editable (planned)
Create/Update: title, slug, status, description, short description, type, SKU, prices, stock fields, tax, dims, categories, visibility/featured, thumbnail, gallery, attributes, variations  
Soft delete: `post_status=trash`  

## Read-only
ID, `total_sales`, ratings, Elementor/theme internals (show selectively), existing attachment GUIDs for legacy media

---

# 3. CATEGORIES

## Tables
`wpwd_terms`, `wpwd_term_taxonomy` (`product_cat`), `wpwd_term_relationships`, `wpwd_termmeta`, `wpwd_wc_category_lookup`

## COLUMNS
| Table | Columns |
|-------|---------|
| terms | `term_id`, `name`, `slug`, `term_group` |
| term_taxonomy | `term_taxonomy_id`, `term_id`, `taxonomy`, `description`, `parent`, `count` |
| term_relationships | `object_id`, `term_taxonomy_id`, `term_order` |
| termmeta (live keys) | `product_count_product_cat`, `order` |
| category_lookup | `category_tree_id`, `category_id` |

## RELATIONSHIPS
- Parent/child via `term_taxonomy.parent`  
- Products via `term_relationships.object_id` → product posts  
- Sort via termmeta `order` when present  

## DISPLAY — UI currently

### List (`/admin/categories`)
ID, name, slug, description (truncated), parent name/#id, product count  
Row navigates to `/admin/categories/:id` → **route missing** → dashboard

### Details (`CategoryDetails.jsx` — **unrouted**)
Category info (ID, name, slug, description, parent, count, term_group) · children chips · **products table** (ID, name, SKU, price, stock, status)

### Form
Name, slug, parent term ID, description

## Missing / incomplete

| Field / section | Status |
|-----------------|--------|
| Details route registration | **Critical — page exists, route missing** |
| Products-in-category visible | Blocked by missing route (API + page ready) |
| Sort/order meta (`termmeta.order`) | Not shown on list/details |
| Category thumbnail | Not in live termmeta; support if added |
| Assign/remove products UI | API `POST .../products` exists; **no UI** |
| Parent picker (names) in form | Raw parent ID only |

## Editable
name, slug, description, parent, product assignments, order meta  
Delete: only if no products; protect Uncategorized  

## Read-only
`term_id`, `term_taxonomy_id`, derived `count`

---

# 4. CUSTOMERS

## Tables
`wpwd_wc_customer_lookup`, `wpwd_users`, `wpwd_usermeta`, `wpwd_wc_orders`, `wpwd_wc_order_addresses`, `wpwd_paytm_order_data` (related)

## COLUMNS (lookup — all must remain accessible)
`customer_id`, `user_id`, `username`, `first_name`, `last_name`, `email`, `date_last_active`, `date_registered`, `country`, `postcode`, `city`, `state`

**users:** `ID`, `user_login`, `user_email`, `display_name`, `user_registered`, `user_status` — **never `user_pass`**

**usermeta address keys:**  
`billing_*` / `shipping_*` (name, company, address_1/2, city, state, postcode, country, email, phone)

## RELATIONSHIPS
- lookup.user_id → users.ID  
- orders.customer_id → WP user ID (HPOS)  
- Paytm via order_id  

## DISPLAY — UI currently

### List (`/admin/customers`) — **largely complete**
Customer ID, User ID, full name, username, email, country, state, city, postcode, registered, last active, orders, lifetime value, last order date

### Details (`/admin/customers/:id`) — **largely complete**
Profile (incl. phone, user_status) · statistics breakdown · billing + shipping cards · orders table · payments table

### Form — **simplified**
First name, last name, email, username, phone only (**no address blocks**)

## Missing / incomplete

| Field / section | Backend | UI |
|-----------------|---------|-----|
| Billing/shipping editable on form | Partial write API | **Form missing address fields** |
| Customer status badge on list | Partial | Missing |
| Full usermeta dump | Filtered (correct) | N/A |
| Refunds / downloads / tokens | No | No |

## Editable
Profile names, email, username (careful), phone, billing/shipping address fields  
Create: user + customer role + lookup + addresses  
Prefer deactivate / block hard delete when orders exist  

## Read-only
`customer_id`, `user_id`, order aggregates, payment history, registration date (usually), never password hash

---

# 5. ORDERS (HPOS)

## Tables
| Table | Role |
|-------|------|
| `wpwd_wc_orders` | primary order |
| `wpwd_wc_order_addresses` | billing / shipping |
| `wpwd_wc_order_operational_data` | paid/completed, discount/shipping amounts |
| `wpwd_wc_orders_meta` | tracking, PDF, attribution, etc. |
| `wpwd_woocommerce_order_items` + `itemmeta` | lines, shipping, tax, coupons |
| `wpwd_posts` `shop_order_placehold` | status mirror |
| `wpwd_comments` `order_note` | history |
| `wpwd_paytm_order_data` | payment |
| `wpwd_wc_order_stats` / product_lookup / coupon_lookup / tax_lookup | analytics |

## KEY COLUMNS
**orders:** `id`, `status`, `currency`, `type`, `tax_amount`, `total_amount`, `customer_id`, `billing_email`, dates, `payment_method(title)`, `transaction_id`, `ip_address`, `user_agent`, `customer_note`, `parent_order_id`

**operational:** `order_key`, `created_via`, `date_paid_gmt`, `date_completed_gmt`, `shipping_total_amount`, `shipping_tax_amount`, `discount_total_amount`, `discount_tax_amount`, …

**addresses:** full name/company/lines/city/state/postcode/country/email/phone per `address_type`

## DISPLAY — UI currently

### List
ID, date, status, customer name, email, customer ID, total, tax, currency, payment method, transaction ID

### Details — **rich**
Financial breakdown · paid/completed/updated · order key · created via · customer note · IP · line items (product/variation/SKU/size/qty/money) · shipping/tax/coupon rows · addresses · payment + Paytm summary · notes (+ add) · status update · shipment tracking

## Missing / incomplete

| Field / section | Status |
|-----------------|--------|
| List: shipping/discount totals, item count, paid date | Not on list (OK if on details) |
| Full itemmeta dump (beyond selected keys) | API pivots selected keys only |
| Refunds (`shop_order_refund` / parent) | Not implemented |
| Address edit / line-item edit / create order | No |
| Coupon usage via `wc_order_coupon_lookup` | Not joined as analytics section |
| Payment details deep-link | Links to unrouted `/admin/payments/:id` |

## Editable
status, notes, shipment meta; later addresses / limited line edits  
Prefer **not** free-edit historical totals without recalc  

## Read-only
Historical financials (default), gateway secrets, IDs

---

# 6. PAYMENTS

## Tables
`wpwd_paytm_order_data` + join `wpwd_wc_orders` + billing address + customer lookup

## COLUMNS
`id`, `order_id`, `paytm_order_id`, `transaction_id`, `status` (`0`|`1`), **`paytm_response`**, `date_added`, `date_modified`

## Confirmed `paytm_response` JSON keys (live sample)
`TXNID`, `BANKTXNID`, `ORDERID`, `TXNAMOUNT`, `STATUS`, `TXNTYPE`, `GATEWAYNAME`, `RESPCODE`, `RESPMSG`, `MID`, `PAYMENTMODE`, `REFUNDAMT`, `TXNDATE`

## Backend
List/detail **do SELECT and parse** `paytm_response`; sanitize secrets; embed order on detail.

## DISPLAY — UI currently

### List (`/admin/payments`) — **rich**
Stats cards · Payment ID, Order ID, Paytm Order ID, Transaction ID, customer, email, amount, payment status, order status, payment mode, gateway, bank TXN, refund, TXN date, date added

### Details (`PaymentDetails.jsx` — **unrouted**)
Payment fields · gateway response table · billing · related order · customer · reconcile status control

## Missing / incomplete

| Field / section | Status |
|-----------------|--------|
| Details route registration | **Critical — page exists, route missing** |
| `date_modified` on list | Detail only / missing on list |
| Non-Paytm gateways as first-class rows | Paytm-centric by design of this table |
| Refund *workflow* | Read `REFUNDAMT` only |
| Create / delete payment rows | Intentionally limited |

## Editable
Reconcile status (`0`/`1`) + optional order sync  

## Read-only
Raw gateway response (redacted), MID display careful, never card data / merchant keys

**Do NOT expose:** card numbers, CVV, merchant API keys from options, auth tokens

---

# 7. COUPONS

## Tables
`wpwd_posts` (`shop_coupon`) + `wpwd_postmeta`  
Related: `wpwd_wc_order_coupon_lookup`

## Meta keys (standard WC)
`discount_type`, `coupon_amount`, `expiry_date` / `date_expires`, `usage_limit`, `usage_limit_per_user`, `usage_count`, `individual_use`, `free_shipping`, `product_ids`, `excluded_*`, `product_categories`, `excluded_product_categories`, `minimum_amount`, `maximum_amount`, `customer_email`

## Live data
**0 coupons** currently — UI/API must still support full WC coupon shape.

## DISPLAY
List: ID, code, type, amount, usage, expiry, status  
Form: code, type, amount, usage_limit, description  
**No dedicated read-only details page** (list → edit)

## Missing from form/UI
expiry, min/max amount, free shipping, individual use, product/category restrictions, per-user limit, customer email restrictions, usage history

## Editable
All coupon meta above + `post_status`  
Delete: trash  

## Read-only
`usage_count` (system), ID

---

# 8. SHIPPING

## Tables
`wpwd_woocommerce_shipping_zones`, `_zone_methods`, `_zone_locations`  
Method settings typically in `wpwd_options` (`woocommerce_{method}_{instance}_settings`)  
Order-level: addresses, shipping line items, order meta tracking keys

## Live data
1 zone “All Shipping”, flat_rate instance, locations present

## DISPLAY
Zone list only: ID, name, order, methods count, regions  
Order tracking UI lives on **Order details** (not Shipping page)

## Missing
Method title/cost/taxable from options, location CRUD, create/delete zones, shipping classes

## Editable
zone_name, method `is_enabled`; later locations/method settings; order tracking meta  

## Read-only
`instance_id` history on past orders

---

# 9. USERS / ADMINS

## Tables
`wpwd_users`, `wpwd_usermeta` (`wpwd_capabilities`, names)

## COLUMNS
`ID`, `user_login`, `user_email`, `display_name`, `user_registered`, `user_status` + meta names/roles  
**Never return `user_pass`**

## DISPLAY
List: ID, display/login/email, role, registered  
Details: ID, login, email, first/last, registered, capabilities  
**No create/edit form in UI** (API supports create/update/soft-deactivate)

## Missing from UI
Create admin, edit roles, reset password, activate/deactivate controls

## Editable
login (create), email, display_name, names, roles, password set/reset, soft deactivate (capabilities → subscriber)  

## Read-only
ID, registered; never hashes / activation keys to React

---

# 10. MEDIA / PRODUCT IMAGES

## Tables
`wpwd_posts` (`attachment`) + postmeta `_wp_attached_file`, `_wp_attachment_metadata`  
Product: `_thumbnail_id`, `_product_image_gallery`

## DISPLAY
No dedicated media library page; product details **do** show featured + gallery when present.

## Gaps
Upload/attach UI on product form; preserve existing attachment IDs/URLs/`guid` compatibility with WordPress uploads.

---

# CROSS-MODULE: WHAT IS STILL SIMPLIFIED OR BLOCKED

| Module | Severity | Primary issue |
|--------|----------|---------------|
| Categories | **Critical** | Details page unrouted → products-in-category invisible |
| Payments | **Critical** | Details page unrouted → gateway JSON / related entities invisible |
| Products form | **High** | Form fields << details fields |
| Customer form | **Medium** | No address CRUD UI |
| Coupons form | **Medium** | Minimal meta vs full WC coupon |
| Shipping | **Medium** | List-only; no method settings |
| Users | **Medium** | No create/edit UI |
| Dashboard | **Medium** | API richer than UI |
| Orders | **Low–Medium** | Details rich; no refunds / create / full itemmeta |
| Customers list/details | **Low** | Mostly restored already |

---

# MODULE SUMMARY

| # | Module | Primary tables | List | Details | Missing critical | Editable |
|---|--------|----------------|------|---------|------------------|----------|
| 1 | Dashboard | orders, products, customers, (+paytm needed) | Partial KPIs | — | unused API + payment/category KPIs | none |
| 2 | Products | posts, postmeta, lookup, terms | Rich | Rich | form/variation CRUD/media write | most product fields; trash |
| 3 | Categories | terms, taxonomy, relationships, termmeta | Good | **Unreachable** | **route + assign UI** | name/slug/parent/desc/assign |
| 4 | Customers | customer_lookup, users, usermeta, orders | Complete | Complete | address form fields | profile+addresses; soft delete |
| 5 | Orders | HPOS + items + notes + paytm | Good | Rich | refunds; payment deep-link | status, notes, shipment |
| 6 | Payments | paytm_order_data + orders | Rich | **Unreachable** | **route** | reconcile status |
| 7 | Coupons | shop_coupon posts | Basic | edit-only | full meta form | coupon meta; trash |
| 8 | Shipping | shipping_zones* | Basic | none | method settings | enable/name; tracking on orders |
| 9 | Users | users, usermeta | Basic | basic | create/edit UI | roles/password/active |

---

# FIELDS THAT MUST REMAIN READ-ONLY

- All primary keys / existing IDs  
- `user_pass` / activation keys (never to React)  
- Paytm merchant secrets / API credentials in `wpwd_options`  
- Card data (not present; keep that way)  
- Analytics lookup derived fields unless intentionally synced  
- Historical order financials unless carefully recalculated  
- Existing attachment IDs / guids / file paths for legacy media  
- System counters: `usage_count`, product `total_sales` (unless WC-compatible sync)

---

# CRUD IMPLEMENTATION PLAN (AFTER APPROVAL)

## Phase A — Restore complete READ display (no schema inventing)
1. **Wire routes:** register `CategoryDetails` and `PaymentDetails` in `AppRoutes.jsx`.  
2. **Dashboard:** bind already-returned API fields (today/monthly sales, stock, pending/completed, recent feeds, charts); add category + payment KPIs.  
3. **Products:** keep details rich; ensure list does not drop columns; remove any remaining caps on variations if present.  
4. **Orders:** keep details; fix payment deep-links once payments route exists; optionally enrich list with discount/shipping.  
5. **Customers / Payments list:** already rich — verify no regression; ensure detail navigation works.  

## Phase B — CRUD without shrinking display
1. Keep details pages intact; forms are additional routes (never replace details).  
2. **Products:** expand form to match details (short desc, tax, dims, categories, images, attributes); add variation editor.  
3. **Categories:** keep details; improve parent picker; assign products UI.  
4. **Customers:** add billing/shipping blocks to form; soft-deactivate strategy.  
5. **Orders:** status + notes + shipment (exists); address edit later; refunds carefully.  
6. **Payments:** reconcile only; never casual delete.  
7. **Coupons:** full WC meta form + optional usage history.  
8. **Users:** wire create/edit/password/role UI to existing API.  
9. **Shipping:** zone enable + method settings from options; order tracking remains on orders.  

## Phase C — Safety
- Soft trash products/coupons (`post_status=trash`)  
- Block category delete when products assigned  
- Block hard customer delete when orders exist  
- Transactions for multi-table writes  
- No DROP/TRUNCATE/duplicate business tables  
- Never invent columns; never simplify SELECT lists for convenience on detail endpoints  

---

# DELIVERABLE CHECKLIST (this audit)

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | `DATABASE_FIELD_AUDIT.md` | **This file** |
| 2 | List of all modules | Dashboard, Products, Categories, Customers, Orders, Payments, Coupons, Shipping, Users/Admins (+ Media/Settings) |
| 3 | Tables used by each module | Documented per section |
| 4 | Fields being displayed | Documented per list/details/form |
| 5 | Fields currently missing from UI | Documented per module (+ routing gaps) |
| 6 | Fields that will be editable | Documented per module |
| 7 | Fields that must remain read-only | Cross-module section |
| 8 | CRUD implementation plan | Phase A → B → C |

---

# NEXT STEP GATE

Per requirements: **do not modify implementation until this audit is reviewed.**

After approval, execute **Phase A** first (wire Category + Payment detail routes, restore Dashboard unused fields), then Phase B CRUD expansion **without reducing displayed information**.

---

*Generated from live MySQL queries, `brassleaf_wp416_cornerstone.sql` CREATE TABLE definitions, backend service source, and frontend page/route audit.*

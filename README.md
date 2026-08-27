# Brassleaf Admin Panel

Full **CRUD** ecommerce admin for the existing WordPress + WooCommerce MySQL database (`wpwd_` prefix, **HPOS enabled**).

The React admin talks to a Node/Express API that reads and writes the live WooCommerce schema — no duplicate business tables.

## Stack

| Layer | Tech |
|-------|------|
| Database | Existing WooCommerce MySQL (`brassleaf`) |
| Backend | Node.js, Express, mysql2, JWT |
| Frontend | React, Vite, Material UI, Axios, Recharts, React Router |

## Docs

- `DATABASE_ANALYSIS.md` — schema inspection
- `DATABASE_CRUD_MAPPING.md` — write mappings per module (required before CRUD)

## Setup

### 1. Database

Import `brassleaf_wp416_cornerstone.sql` into MySQL as database `brassleaf` (if not already done).

### 2. Backend

```bash
cd backend
cp .env.example .env
# Set DB_* and JWT_SECRET
npm install
npm run dev
```

API: **http://localhost:4000**

Optional (local only): set a known admin password for JWT login:

```bash
node scripts/set_admin_password.js
# default password: Admin@12345  (override with BOOTSTRAP_ADMIN_PASSWORD)
```

Login uses WordPress user `admin` with role `administrator`. Password hashes use WordPress `$wp$` + bcrypt.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

UI: **http://localhost:5173** (Vite proxies `/api` → `:4000`)

## API modules

| Path | Ops |
|------|-----|
| `/api/auth` | login, me, reset-password |
| `/api/dashboard` | live KPIs + charts data |
| `/api/products` | GET/POST/PUT/PATCH/DELETE (trash) |
| `/api/categories` | CRUD + assign products |
| `/api/orders` | list/detail, status, notes, shipment meta |
| `/api/customers` | CRUD (never returns password hashes) |
| `/api/payments` | Paytm list/reconcile |
| `/api/coupons` | shop_coupon CRUD |
| `/api/shipping` | zones/methods |
| `/api/users` | admin users / roles / password |
| `/api/media` | upload, featured/gallery attach |

All module routes (except login/health) require `Authorization: Bearer <JWT>`.

## Safety

- No DROP / TRUNCATE / schema recreation
- Multi-table writes use MySQL transactions
- Orders use **HPOS** (`wpwd_wc_orders`), not posts as source of truth
- Soft-delete products/coupons via `post_status = trash`
- Existing attachment IDs and URLs are not rewritten

## Important notes

- `wpwd_wc_orders.customer_id` = WordPress **user ID**
- Shipment tracking uses order meta: `_tracking_number`, `_tracking_provider`, `_shipment_status`
- New media uploads are stored under `backend/uploads` for admin preview; sync into WordPress `wp-content/uploads` on the live host for storefront URLs

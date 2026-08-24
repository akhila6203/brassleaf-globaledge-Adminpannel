# Brassleaf Admin Dashboard

Read-only admin dashboard for the Brassleaf WooCommerce store.

## Stack

| Layer    | Tech |
|----------|------|
| Database | MySQL — existing WooCommerce DB (`wpwd_` prefix, HPOS enabled) |
| Backend  | Node.js + Express + mysql2 |
| Frontend | React + Vite + Tailwind CSS v4 + Recharts + React Router |

---

## Setup

### 1. Import the database

Import `brassleaf_wp416_cornerstone.sql` into your local MySQL server:

```bash
mysql -u root -p your_database_name < brassleaf_wp416_cornerstone.sql
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
# Edit .env — set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
```

### 3. Start the backend

```bash
cd backend
npm install
npm run dev        # development (nodemon)
# or
npm start          # production
```

Backend runs on **http://localhost:4000**

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:5173**

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | DB connectivity check |
| GET | `/api/dashboard` | KPIs, revenue chart, top products |
| GET | `/api/products` | Paginated product list (`?page&limit&search&stock_status&category`) |
| GET | `/api/products/:id` | Product detail + variations + meta + categories |
| GET | `/api/orders` | Paginated orders (`?page&limit&status&search`) |
| GET | `/api/orders/:id` | Order detail + addresses + items + paytm |
| GET | `/api/customers` | Paginated customers (`?page&limit&search`) |
| GET | `/api/customers/:id` | Customer detail + meta + recent orders |
| GET | `/api/payments` | Paginated Paytm transactions (`?page&limit&status`) |
| GET | `/api/payments/stats/summary` | Payment aggregate stats |
| GET | `/api/categories` | All product categories |
| GET | `/api/categories/:id/products` | Products in a category |

---

## Important

- **This app never writes to the database.** All queries are SELECT only.
- The WooCommerce MySQL database is the single source of truth.
- No duplicate tables (products, orders, customers, etc.) are created.
- Table prefix is `wpwd_` — confirmed from the actual SQL dump.
- HPOS is enabled: orders live in `wpwd_wc_orders`, not `wpwd_posts`.

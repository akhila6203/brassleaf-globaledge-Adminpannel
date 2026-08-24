require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db/pool');
const P = require('./db/prefix');

const dashboardRouter  = require('./routes/dashboard');
const usersRouter      = require('./routes/users');
const productsRouter   = require('./routes/products');
const ordersRouter     = require('./routes/orders');
const customersRouter  = require('./routes/customers');
const paymentsRouter   = require('./routes/payments');
const categoriesRouter = require('./routes/categories');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    const [[row]] = await pool.query('SELECT DATABASE() AS db, COUNT(*) AS users FROM ??', [`${P}users`]);
    res.json({
      status: 'ok',
      db: 'connected',
      database: row.db,
      prefix: P,
      users: row.users,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.use('/api/dashboard',  dashboardRouter);
app.use('/api/users',      usersRouter);
app.use('/api/products',   productsRouter);
app.use('/api/orders',     ordersRouter);
app.use('/api/customers',  customersRouter);
app.use('/api/payments',   paymentsRouter);
app.use('/api/categories', categoriesRouter);

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`Brassleaf API running on http://localhost:${PORT} (prefix ${P})`);
});

const path = require('path');
const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const pool = require('./config/db');
const P = require('./config/prefix');
const errorHandler = require('./middleware/errorHandler');
const { ensureUploadDir } = require('./services/mediaService');

const authRouter = require('./routes/auth');
const dashboardRouter = require('./routes/dashboard');
const productsRouter = require('./routes/products');
const categoriesRouter = require('./routes/categories');
const ordersRouter = require('./routes/orders');
const customersRouter = require('./routes/customers');
const paymentsRouter = require('./routes/payments');
const couponsRouter = require('./routes/coupons');
const shippingRouter = require('./routes/shipping');
const usersRouter = require('./routes/users');
const mediaRouter = require('./routes/media');
const reportsRouter = require('./routes/reports');
const settingsRouter = require('./routes/settings');

const app = express();

app.use(cors({ origin: env.frontendUrl || '*' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const uploadDir = ensureUploadDir();
app.use('/uploads', express.static(uploadDir));

app.get('/api/health', async (req, res) => {
  try {
    const [[row]] = await pool.query('SELECT DATABASE() AS db, COUNT(*) AS users FROM ??', [
      `${P}users`,
    ]);
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

app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/shipping', shippingRouter);
app.use('/api/users', usersRouter);
app.use('/api/media', mediaRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);

app.use(errorHandler);

module.exports = app;

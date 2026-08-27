const jwt = require('jsonwebtoken');
const env = require('../config/env');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing token' });
  }
  try {
    req.user = jwt.verify(token, env.jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  const roles = req.user?.roles || [];
  const ok = roles.some((r) =>
    ['administrator', 'shop_manager', 'editor'].includes(r)
  );
  if (!ok) {
    return res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
  }
  return next();
}

module.exports = { authenticate, requireAdmin };

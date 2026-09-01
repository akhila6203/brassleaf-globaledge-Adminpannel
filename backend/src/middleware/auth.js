const jwt = require("jsonwebtoken");
const env = require("../config/env");

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie || "";

  const cookies = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);

  for (const cookie of cookies) {
    const index = cookie.indexOf("=");

    if (index === -1) continue;

    const key = cookie.slice(0, index);
    const value = cookie.slice(index + 1);

    if (key === name) {
      return decodeURIComponent(value);
    }
  }

  return null;
}

function authenticate(req, res, next) {
  /*
   * Keep Authorization header support
   * because admin panel may already use it.
   */
  const header =
    req.headers.authorization || "";

  const bearerToken =
    header.startsWith("Bearer ")
      ? header.slice(7)
      : null;

  /*
   * Customer website uses HttpOnly cookie.
   */
  const cookieToken =
    getCookie(
      req,
      "customer_token"
    );

  const token =
    bearerToken ||
    cookieToken;

  if (!token) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Missing authentication token",
    });
  }

  try {
    req.user = jwt.verify(
      token,
      env.jwtSecret
    );

    return next();
  } catch {
    return res.status(401).json({
      error: "Unauthorized",
      message:
        "Invalid or expired authentication token",
    });
  }
}

function requireCustomer(
  req,
  res,
  next
) {
  if (
    req.user?.type !==
    "customer"
  ) {
    return res.status(403).json({
      error: "Forbidden",
      message:
        "Customer account required",
    });
  }

  return next();
}

function requireAdmin(
  req,
  res,
  next
) {
  const roles =
    req.user?.roles || [];

  const ok = roles.some(
    (role) =>
      [
        "administrator",
        "shop_manager",
        "editor",
      ].includes(role)
  );

  if (!ok) {
    return res.status(403).json({
      error: "Forbidden",
      message:
        "Admin access required",
    });
  }

  return next();
}

module.exports = {
  authenticate,
  requireCustomer,
  requireAdmin,
};


// const jwt = require('jsonwebtoken');
// const env = require('../config/env');

// function authenticate(req, res, next) {
//   const header = req.headers.authorization || '';
//   const token = header.startsWith('Bearer ') ? header.slice(7) : null;
//   if (!token) {
//     return res.status(401).json({ error: 'Unauthorized', message: 'Missing token' });
//   }
//   try {
//     req.user = jwt.verify(token, env.jwtSecret);
//     return next();
//   } catch {
//     return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
//   }
// }

// function requireAdmin(req, res, next) {
//   const roles = req.user?.roles || [];
//   const ok = roles.some((r) =>
//     ['administrator', 'shop_manager', 'editor'].includes(r)
//   );
//   if (!ok) {
//     return res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
//   }
//   return next();
// }

// module.exports = { authenticate, requireAdmin };
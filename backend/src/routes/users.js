const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const P = require('../db/prefix');
const asyncHandler = require('../middleware/asyncHandler');
const { parseList, listResponse } = require('../lib/listParams');

const SORT = {
  id: `u.ID`,
  login: `u.user_login`,
  email: `u.user_email`,
  name: `u.display_name`,
  registered: `u.user_registered`,
};

function parseRole(metaValue) {
  if (!metaValue) return [];
  const roles = [];
  const re = /s:\d+:"([^"]+)";b:1;/g;
  let m;
  while ((m = re.exec(metaValue))) roles.push(m[1]);
  return roles;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, offset, sortCol, dir, search } = parseList(req, SORT, 'id');
    const role = req.query.role || '';
    const params = [];
    let where = '1=1';

    if (search) {
      where += ` AND (u.user_login LIKE ? OR u.user_email LIKE ? OR u.display_name LIKE ?)`;
      const q = `%${search}%`;
      params.push(q, q, q);
    }
    if (role) {
      where += ` AND cap.meta_value LIKE ?`;
      params.push(`%"${role}"%`);
    }

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM ${P}users u
       LEFT JOIN ${P}usermeta cap
         ON cap.user_id = u.ID AND cap.meta_key = 'wpwd_capabilities'
       WHERE ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT
         u.ID,
         u.user_login,
         u.user_email,
         u.user_nicename,
         u.display_name,
         u.user_registered,
         u.user_status,
         cap.meta_value AS capabilities,
         fn.meta_value AS first_name,
         ln.meta_value AS last_name
       FROM ${P}users u
       LEFT JOIN ${P}usermeta cap
         ON cap.user_id = u.ID AND cap.meta_key = 'wpwd_capabilities'
       LEFT JOIN ${P}usermeta fn
         ON fn.user_id = u.ID AND fn.meta_key = 'first_name'
       LEFT JOIN ${P}usermeta ln
         ON ln.user_id = u.ID AND ln.meta_key = 'last_name'
       WHERE ${where}
       ORDER BY ${sortCol} ${dir}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json(
      listResponse(
        rows.map(({ capabilities, ...r }) => ({
          ...r,
          roles: parseRole(capabilities),
        })),
        total,
        page,
        limit
      )
    );
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const [[user]] = await pool.query(
      `SELECT
         ID, user_login, user_email, user_nicename, display_name,
         user_url, user_registered, user_status
       FROM ${P}users
       WHERE ID = ?`,
      [id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [meta] = await pool.query(
      `SELECT meta_key, meta_value
       FROM ${P}usermeta
       WHERE user_id = ?
         AND meta_key NOT IN ('session_tokens')
         AND meta_key NOT LIKE '%_user_pass%'`,
      [id]
    );

    const cap = meta.find((m) => m.meta_key === 'wpwd_capabilities');
    const roles = parseRole(cap?.meta_value);

    const [orders] = await pool.query(
      `SELECT id, status, total_amount, currency, date_created_gmt, payment_method, billing_email
       FROM ${P}wc_orders
       WHERE customer_id = ? AND type = 'shop_order'
       ORDER BY date_created_gmt DESC
       LIMIT 20`,
      [id]
    );

    const safeMeta = meta
      .filter((m) => !['wpwd_capabilities'].includes(m.meta_key))
      .filter((m) => !String(m.meta_value || '').startsWith('$P$') && !String(m.meta_value || '').startsWith('$2y$'));

    res.json({ ...user, roles, meta: safeMeta, orders });
  })
);

module.exports = router;

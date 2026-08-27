/**
 * Local-dev only: set WordPress admin password to a known value for JWT login testing.
 * Does not run automatically. Usage: node scripts/set_admin_password.js
 */
require('dotenv').config();
const pool = require('../src/config/db');
const P = require('../src/config/prefix');
const { hashPassword } = require('../src/utils/password');

const NEW_PASSWORD = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'Admin@12345';

(async () => {
  const hash = hashPassword(NEW_PASSWORD);
  const [result] = await pool.query(
    `UPDATE ${P}users SET user_pass = ? WHERE user_login = 'admin' OR ID = 1 LIMIT 1`,
    [hash]
  );
  console.log('Updated admin password rows:', result.affectedRows);
  console.log('Login with user_login=admin and password=', NEW_PASSWORD);
  await pool.end();
})().catch(async (e) => {
  console.error(e);
  process.exit(1);
});

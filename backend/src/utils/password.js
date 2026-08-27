const bcrypt = require('bcryptjs');

/**
 * WordPress 6.8+ uses `$wp$` + bcrypt (`$2y$…`).
 * Older installs may use phpass (`$P$` / `$H$`) — not verified here beyond rejection.
 */
function verifyPassword(plain, stored) {
  if (!plain || !stored) return false;
  if (stored.startsWith('$wp$')) {
    const bcryptHash = stored.slice(3); // '$2y$…'
    return bcrypt.compareSync(plain, bcryptHash);
  }
  if (stored.startsWith('$2y$') || stored.startsWith('$2a$') || stored.startsWith('$2b$')) {
    return bcrypt.compareSync(plain, stored);
  }
  // Unsupported legacy phpass — return false rather than destroying hashes
  return false;
}

function hashPassword(plain) {
  const hash = bcrypt.hashSync(String(plain), 10).replace(/^\$2a\$/, '$2y$').replace(/^\$2b\$/, '$2y$');
  return `$wp${hash}`;
}

module.exports = { verifyPassword, hashPassword };

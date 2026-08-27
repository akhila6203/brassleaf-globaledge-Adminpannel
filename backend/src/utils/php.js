const { serialize, unserialize } = require('php-serialize');

function serializePhp(value) {
  return serialize(value);
}

function unserializePhp(value) {
  if (value == null || value === '') return null;
  try {
    return unserialize(String(value));
  } catch {
    return null;
  }
}

/** Build WP capabilities meta: a:1:{s:N:"role";b:1;} */
function serializeCapabilities(roles) {
  const obj = {};
  for (const role of roles) obj[role] = true;
  return serializePhp(obj);
}

function parseCapabilities(metaValue) {
  const parsed = unserializePhp(metaValue);
  if (!parsed || typeof parsed !== 'object') return [];
  return Object.keys(parsed).filter((k) => parsed[k]);
}

function hasAdminRole(roles) {
  const adminRoles = new Set(['administrator', 'shop_manager', 'editor']);
  return roles.some((r) => adminRoles.has(r));
}

module.exports = {
  serializePhp,
  unserializePhp,
  serializeCapabilities,
  parseCapabilities,
  hasAdminRole,
};

const pool = require('../config/db');
const P = require('../config/prefix');
const { httpError } = require('../utils/httpError');
const { withTransaction } = require('../utils/transaction');

async function listZones() {
  const [zones] = await pool.query(
    `SELECT zone_id, zone_name, zone_order
     FROM ${P}woocommerce_shipping_zones
     ORDER BY zone_order ASC, zone_id ASC`
  );

  const [methods] = await pool.query(
    `SELECT instance_id, zone_id, method_id, method_order, is_enabled
     FROM ${P}woocommerce_shipping_zone_methods
     ORDER BY method_order ASC, instance_id ASC`
  );

  const [locations] = await pool.query(
    `SELECT location_id, zone_id, location_code, location_type
     FROM ${P}woocommerce_shipping_zone_locations`
  );

  return zones.map((z) => ({
    ...z,
    methods: methods.filter((m) => m.zone_id === z.zone_id),
    locations: locations.filter((l) => l.zone_id === z.zone_id),
  }));
}

async function getZone(id) {
  const zones = await listZones();
  const zone = zones.find((z) => Number(z.zone_id) === Number(id));
  if (!zone) throw httpError(404, 'Shipping zone not found');
  return zone;
}

async function updateZone(id, body) {
  const { zone_name, methods } = body || {};
  const zone = await getZone(id);

  return withTransaction(pool, async (conn) => {
    if (zone_name != null) {
      await conn.query(
        `UPDATE ${P}woocommerce_shipping_zones SET zone_name = ? WHERE zone_id = ?`,
        [zone_name, id]
      );
    }

    if (Array.isArray(methods)) {
      for (const m of methods) {
        if (!m.instance_id) continue;
        if (m.is_enabled != null) {
          await conn.query(
            `UPDATE ${P}woocommerce_shipping_zone_methods
             SET is_enabled = ?
             WHERE instance_id = ? AND zone_id = ?`,
            [m.is_enabled ? 1 : 0, m.instance_id, id]
          );
        }
      }
    }

    return getZone(id);
  });
}

module.exports = { listZones, getZone, updateZone };

const shippingService = require('../services/shippingService');

async function list(req, res) {
  const zones = await shippingService.listZones();
  res.json({ data: zones, total: zones.length });
}
async function getById(req, res) {
  res.json(await shippingService.getZone(parseInt(req.params.id, 10)));
}
async function update(req, res) {
  res.json(await shippingService.updateZone(parseInt(req.params.id, 10), req.body || {}));
}

module.exports = { list, getById, update };

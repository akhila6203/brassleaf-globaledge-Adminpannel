const orderService = require('../services/orderService');

async function list(req, res) {
  res.json(await orderService.list(req));
}
async function getById(req, res) {
  res.json(await orderService.getById(parseInt(req.params.id, 10)));
}
async function updateStatus(req, res) {
  res.json(
    await orderService.updateStatus(
      parseInt(req.params.id, 10),
      req.body?.status,
      req.user?.id || 1
    )
  );
}
async function addNote(req, res) {
  res.status(201).json(
    await orderService.addNote(
      parseInt(req.params.id, 10),
      req.body?.note || req.body?.content,
      req.user?.id || 1,
      Boolean(req.body?.customer_note)
    )
  );
}
async function updateShipment(req, res) {
  res.json(
    await orderService.updateShipment(parseInt(req.params.id, 10), req.body || {}, req.user?.id || 1)
  );
}

module.exports = { list, getById, updateStatus, addNote, updateShipment };

const couponService = require('../services/couponService');

async function list(req, res) {
  res.json(await couponService.list(req));
}
async function getById(req, res) {
  res.json(await couponService.getById(parseInt(req.params.id, 10)));
}
async function create(req, res) {
  res.status(201).json(await couponService.create(req.body || {}, req.user?.id || 1));
}
async function update(req, res) {
  res.json(await couponService.update(parseInt(req.params.id, 10), req.body || {}));
}
async function remove(req, res) {
  res.json(await couponService.trash(parseInt(req.params.id, 10)));
}

module.exports = { list, getById, create, update, remove };

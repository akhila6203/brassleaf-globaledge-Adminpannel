const customerService = require('../services/customerService');

async function list(req, res) {
  res.json(await customerService.list(req));
}
async function getById(req, res) {
  res.json(await customerService.getById(parseInt(req.params.id, 10)));
}
async function create(req, res) {
  res.status(201).json(await customerService.create(req.body || {}));
}
async function update(req, res) {
  res.json(await customerService.update(parseInt(req.params.id, 10), req.body || {}));
}
async function remove(req, res) {
  res.json(await customerService.remove(parseInt(req.params.id, 10)));
}

module.exports = { list, getById, create, update, remove };

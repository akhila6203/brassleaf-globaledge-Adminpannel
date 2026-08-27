const userService = require('../services/userService');

async function list(req, res) {
  res.json(await userService.list(req));
}
async function getById(req, res) {
  res.json(await userService.getById(parseInt(req.params.id, 10)));
}
async function create(req, res) {
  res.status(201).json(await userService.create(req.body || {}));
}
async function update(req, res) {
  res.json(await userService.update(parseInt(req.params.id, 10), req.body || {}));
}
async function remove(req, res) {
  res.json(await userService.remove(parseInt(req.params.id, 10)));
}

module.exports = { list, getById, create, update, remove };

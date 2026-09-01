const settingsService = require('../services/settingsService');

async function get(req, res) {
  res.json(await settingsService.getSettings());
}

async function update(req, res) {
  res.json(await settingsService.updateSettings(req.body || {}));
}

module.exports = { get, update };

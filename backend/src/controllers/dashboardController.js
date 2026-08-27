const dashboardService = require('../services/dashboardService');

async function getDashboard(req, res) {
  const data = await dashboardService.getDashboard();
  res.json(data);
}

module.exports = { getDashboard };

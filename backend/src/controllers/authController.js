const authService = require('../services/authService');

async function login(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required', message: 'username and password required' });
  }
  const result = await authService.login(username, password);
  res.json(result);
}

async function me(req, res) {
  const result = await authService.me(req.user.id);
  res.json(result);
}

async function resetPassword(req, res) {
  const { password, newPassword, userId } = req.body || {};
  const targetId = userId || req.user.id;
  const pwd = newPassword || password;
  const result = await authService.resetPassword(targetId, pwd);
  res.json(result);
}

module.exports = { login, me, resetPassword };

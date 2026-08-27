const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { authenticate, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

router.post('/login', asyncHandler(ctrl.login));
router.get('/me', authenticate, requireAdmin, asyncHandler(ctrl.me));
router.post('/reset-password', authenticate, requireAdmin, asyncHandler(ctrl.resetPassword));

module.exports = router;

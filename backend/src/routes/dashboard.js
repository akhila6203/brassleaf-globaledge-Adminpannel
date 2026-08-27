const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { authenticate, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/dashboardController');

router.use(authenticate, requireAdmin);
router.get('/', asyncHandler(ctrl.getDashboard));

module.exports = router;

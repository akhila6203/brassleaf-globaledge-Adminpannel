const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { authenticate, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/settingsController');

router.use(authenticate, requireAdmin);
router.get('/', asyncHandler(ctrl.get));
router.put('/', asyncHandler(ctrl.update));
router.patch('/', asyncHandler(ctrl.update));

module.exports = router;

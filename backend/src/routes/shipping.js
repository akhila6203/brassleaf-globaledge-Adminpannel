const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { authenticate, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/shippingController');

router.use(authenticate, requireAdmin);
router.get('/', asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.getById));
router.put('/:id', asyncHandler(ctrl.update));
router.patch('/:id', asyncHandler(ctrl.update));

module.exports = router;

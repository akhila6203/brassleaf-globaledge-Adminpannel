const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { authenticate, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/orderController');

router.use(authenticate, requireAdmin);
router.get('/', asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.getById));
router.patch('/:id/status', asyncHandler(ctrl.updateStatus));
router.post('/:id/notes', asyncHandler(ctrl.addNote));
router.patch('/:id/shipment', asyncHandler(ctrl.updateShipment));

module.exports = router;

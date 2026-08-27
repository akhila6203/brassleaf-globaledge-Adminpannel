const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { authenticate, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/productController');

router.use(authenticate, requireAdmin);
router.get('/', asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.getById));
router.post('/', asyncHandler(ctrl.create));
router.put('/:id', asyncHandler(ctrl.update));
router.patch('/:id', asyncHandler(ctrl.update));
router.patch('/:id/variations/:vid', asyncHandler(ctrl.updateVariation));
router.put('/:id/variations/:vid', asyncHandler(ctrl.updateVariation));
router.delete('/:id', asyncHandler(ctrl.remove));

module.exports = router;

const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { authenticate, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/paymentController');

router.use(authenticate, requireAdmin);
router.get('/stats/summary', asyncHandler(ctrl.statsSummary));
router.get('/', asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.getById));
router.patch('/:id', asyncHandler(ctrl.reconcile));

module.exports = router;

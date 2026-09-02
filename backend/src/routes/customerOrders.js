const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { authenticate, requireCustomer } = require('../middleware/auth');
const ctrl = require('../controllers/customerOrderController');

router.post(
  '/payments/paytm/callback',
  asyncHandler(ctrl.paytmCallback)
);

router.get(
  '/payments/paytm/config',
  asyncHandler(ctrl.paytmConfig)
);

router.use(authenticate, requireCustomer);

router.get('/orders', asyncHandler(ctrl.listOrders));
router.post('/orders', asyncHandler(ctrl.createOrder));
router.get('/orders/:id', asyncHandler(ctrl.getOrder));
router.post('/orders/:id/cancel', asyncHandler(ctrl.cancelOrder));
router.post('/orders/:id/payment/initiate', asyncHandler(ctrl.initiatePayment));

module.exports = router;

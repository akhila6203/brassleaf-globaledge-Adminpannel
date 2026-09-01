const express = require('express');
const router = express.Router();

const asyncHandler = require('../middleware/asyncHandler');
const ctrl = require('../controllers/productController');

router.get(
  '/',
  asyncHandler(ctrl.publicList)
);

router.get(
  '/:id',
  asyncHandler(ctrl.publicGetById)
);

module.exports = router;
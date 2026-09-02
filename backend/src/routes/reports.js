const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { authenticate, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/reportController');

router.use(authenticate, requireAdmin);
router.get('/summary', asyncHandler(ctrl.summary));
router.get('/', asyncHandler(ctrl.list));
router.get('/schedule', asyncHandler(ctrl.getSchedule));
router.put('/schedule', asyncHandler(ctrl.saveSchedule));
router.get('/download', asyncHandler(ctrl.download));
router.post('/email/daily', asyncHandler(ctrl.emailDaily));

module.exports = router;

const express = require('express');
const multer = require('multer');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { authenticate, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/mediaController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(authenticate, requireAdmin);
router.get('/', asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.getById));
router.post('/', upload.single('file'), asyncHandler(ctrl.upload));
router.delete('/:id', asyncHandler(ctrl.remove));
router.post('/product/:productId/featured', asyncHandler(ctrl.setFeatured));
router.post('/product/:productId/gallery', asyncHandler(ctrl.setGallery));

module.exports = router;

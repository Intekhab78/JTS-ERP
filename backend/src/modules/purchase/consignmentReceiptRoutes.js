const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../core/middleware/authMiddleware');
const controller = require('./consignmentReceiptController');

router.use(protect);

router.get('/', controller.getReceipts);
router.post('/', authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'PURCHASE_MANAGER'), controller.createReceipt);
router.get('/:id', controller.getReceipt);
router.post('/:id/confirm', authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'PURCHASE_MANAGER'), controller.confirmReceipt);
router.post('/:id/validate', authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'PURCHASE_MANAGER'), controller.validateReceipt);

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../core/middleware/authMiddleware');
const consignmentController = require('./consignmentController');

router.use(protect);

router.get('/', consignmentController.getConsignments);
router.post('/', authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'PURCHASE_MANAGER'), consignmentController.createConsignment);
router.get('/:id', consignmentController.getConsignment);
router.put('/:id', authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'PURCHASE_MANAGER'), consignmentController.updateConsignment);
router.post('/:id/confirm', authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'PURCHASE_MANAGER'), consignmentController.confirmConsignment);
router.post('/:id/activate', authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'PURCHASE_MANAGER'), consignmentController.activateConsignment);
router.post('/:id/consume', authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'PURCHASE_MANAGER'), consignmentController.consumeConsignmentStock);
router.post('/:id/close', authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'PURCHASE_MANAGER'), consignmentController.closeConsignment);
router.post('/:id/cancel', authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'PURCHASE_MANAGER'), consignmentController.cancelConsignment);

module.exports = router;

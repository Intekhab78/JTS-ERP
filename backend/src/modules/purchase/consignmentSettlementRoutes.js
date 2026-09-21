const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../core/middleware/authMiddleware');
const consignmentSettlementController = require('./consignmentSettlementController');

router.use(protect);

router.get('/', consignmentSettlementController.getSettlements);
router.post('/', authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'PURCHASE_MANAGER', 'FINANCE_MANAGER'), consignmentSettlementController.createSettlement);
router.get('/:id', consignmentSettlementController.getSettlement);
router.post('/:id/validate', authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'FINANCE_MANAGER'), consignmentSettlementController.validateSettlement);

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../core/middleware/authMiddleware');
const controller = require('./consignmentReturnController');

router.use(protect);

router.get('/', controller.getReturns);
router.post('/', authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'PURCHASE_MANAGER'), controller.createReturn);
router.get('/:id', controller.getReturn);
router.post('/:id/confirm', authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'PURCHASE_MANAGER'), controller.confirmReturn);
router.post('/:id/validate', authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'PURCHASE_MANAGER'), controller.validateReturn);

module.exports = router;

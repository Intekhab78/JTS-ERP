const express = require('express');
const router = express.Router();
const salesReturnController = require('./salesReturnController');
const { protect, authorize } = require('../../core/middleware/authMiddleware');

router.use(protect);

router.get('/', salesReturnController.getSalesReturns);
router.post('/', authorize('admin', 'sales_manager', 'inventory_manager'), salesReturnController.createSalesReturn);
router.get('/:id', salesReturnController.getSalesReturnById);
router.put('/:id', authorize('admin', 'sales_manager', 'inventory_manager'), salesReturnController.updateSalesReturn);
router.patch('/:id/status', authorize('admin', 'sales_manager', 'inventory_manager'), salesReturnController.updateStatus);
router.post('/:id/validate', authorize('admin', 'sales_manager', 'inventory_manager'), salesReturnController.validateSalesReturn);
router.get('/returnable/:deliveryNoteId', salesReturnController.getReturnableInfo);

module.exports = router;

const express = require('express');
const router = express.Router();
const { 
  getBranchStock, 
  getStockMovements,
  getTransfers,
  createTransfer,
  validateTransfer,
  getAdjustments,
  createAdjustment,
  validateAdjustment
} = require('./stockController');
const { protect, authorize } = require('../../core/middleware/authMiddleware');

// Transfers
router.route('/transfers')
  .get(protect, authorize('VIEW_INVENTORY'), getTransfers)
  .post(protect, authorize('CREATE_INVENTORY', 'EDIT_INVENTORY'), createTransfer);

router.route('/transfers/:id/validate')
  .put(protect, authorize('CREATE_INVENTORY', 'EDIT_INVENTORY'), validateTransfer);

// Adjustments
router.route('/adjustments')
  .get(protect, authorize('VIEW_INVENTORY'), getAdjustments)
  .post(protect, authorize('CREATE_INVENTORY', 'EDIT_INVENTORY'), createAdjustment);

router.route('/adjustments/:id/validate')
  .put(protect, authorize('CREATE_INVENTORY', 'EDIT_INVENTORY'), validateAdjustment);

// Legacy routes (removed updateStock and direct transferStock)
// MUST BE AT THE BOTTOM to avoid catching /transfers etc as :branchId
router.route('/:branchId')
  .get(protect, authorize('VIEW_INVENTORY'), getBranchStock);

router.route('/movements/:branchId')
  .get(protect, authorize('VIEW_INVENTORY'), getStockMovements);

module.exports = router;

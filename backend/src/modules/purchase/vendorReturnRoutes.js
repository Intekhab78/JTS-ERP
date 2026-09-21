const express = require('express');
const router = express.Router();
const { 
  getVendorReturns, 
  getVendorReturnById, 
  createVendorReturn, 
  updateVendorReturn,
  deleteVendorReturn,
  confirmVendorReturn, 
  validateVendorReturn,
  getReturnableItems,
  getSupplierReturnableItems,
  createReturnAllVendorReturn
} = require('./vendorReturnController');
const { protect, authorize } = require('../../core/middleware/authMiddleware');

router.route('/')
  .get(protect, authorize('VIEW_PURCHASE_ORDER'), getVendorReturns)
  .post(protect, authorize('CREATE_PURCHASE_ORDER'), createVendorReturn);

router.route('/po/:poId/returnable-items')
  .get(protect, authorize('VIEW_PURCHASE_ORDER'), getReturnableItems);

router.route('/supplier/:supplierId/returnable-items')
  .get(protect, authorize('VIEW_PURCHASE_ORDER'), getSupplierReturnableItems);

router.route('/supplier/:supplierId/return-all')
  .post(protect, authorize('CREATE_PURCHASE_ORDER'), createReturnAllVendorReturn);

router.route('/:id')
  .get(protect, authorize('VIEW_PURCHASE_ORDER'), getVendorReturnById)
  .put(protect, authorize('EDIT_PURCHASE_ORDER'), updateVendorReturn)
  .delete(protect, authorize('EDIT_PURCHASE_ORDER'), deleteVendorReturn);

router.route('/:id/confirm')
  .post(protect, authorize('EDIT_PURCHASE_ORDER'), confirmVendorReturn);

router.route('/:id/validate')
  .post(protect, authorize('CREATE_PURCHASE_ORDER'), validateVendorReturn);

module.exports = router;

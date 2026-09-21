const express = require('express');
const router = express.Router();
const { protect } = require('../../core/middleware/authMiddleware');
const vendorBillController = require('./vendorBillController');

router.route('/')
  .get(protect, vendorBillController.getVendorBills)
  .post(protect, vendorBillController.createVendorBill);

router.route('/:id')
  .get(protect, vendorBillController.getVendorBillById)
  .put(protect, vendorBillController.updateVendorBill)
  .delete(protect, vendorBillController.deleteVendorBill);

router.route('/:id/post')
  .post(protect, vendorBillController.postVendorBill);

router.route('/:id/cancel')
  .post(protect, vendorBillController.cancelVendorBill);

module.exports = router;

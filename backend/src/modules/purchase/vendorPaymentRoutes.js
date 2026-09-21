const express = require('express');
const router = express.Router();
const { protect } = require('../../core/middleware/authMiddleware');
const vendorPaymentController = require('./vendorPaymentController');

router.route('/')
  .get(protect, vendorPaymentController.getVendorPayments)
  .post(protect, vendorPaymentController.createVendorPayment);

router.route('/:id')
  .get(protect, vendorPaymentController.getVendorPaymentById);

module.exports = router;

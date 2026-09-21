const express = require('express');
const router = express.Router();
const {
  createPayment,
  getPayments
} = require('./paymentController');

const { protect, authorize } = require('../../core/middleware/authMiddleware');

router.route('/')
  .post(protect, authorize('CREATE_PAYMENT'), createPayment)
  .get(protect, authorize('VIEW_PAYMENT'), getPayments);

module.exports = router;

const express = require('express');
const router = express.Router();
const { getSales, getSaleById, createSale, confirmOrder } = require('./salesController');
const { protect, authorize } = require('../../core/middleware/authMiddleware');

router.route('/')
  .get(protect, authorize('VIEW_SALES_ORDER'), getSales)
  .post(protect, authorize('CREATE_SALES_ORDER'), createSale);

router.route('/:id')
  .get(protect, authorize('VIEW_SALES_ORDER'), getSaleById);

router.route('/:id/confirm')
  .patch(protect, authorize('EDIT_SALES_ORDER'), confirmOrder);

module.exports = router;

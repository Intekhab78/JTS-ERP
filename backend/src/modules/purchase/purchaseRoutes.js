const express = require('express');
const router = express.Router();
const { getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, getPurchaseOrderById, confirmPurchaseOrder, cancelPurchaseOrder, 
  getPurchaseOrderSchedules, createPurchaseOrderSchedule, createBulkPurchaseOrderSchedules, updatePurchaseOrderSchedule, deletePurchaseOrderSchedule, cancelPurchaseOrderSchedule,
  previewEqualDistributionPurchaseOrderSchedules, createEqualDistributionPurchaseOrderSchedules
} = require('./purchaseController');
const { protect } = require('../../core/middleware/authMiddleware');

router.route('/')
  .get(protect, getPurchaseOrders)
  .post(protect, createPurchaseOrder);

router.route('/:id')
  .get(protect, getPurchaseOrderById)
  .put(protect, updatePurchaseOrder)
  .delete(protect, deletePurchaseOrder);

router.route('/:id/confirm')
  .post(protect, confirmPurchaseOrder);

router.route('/:id/cancel')
  .post(protect, cancelPurchaseOrder);

// Schedule Routes
router.route('/:id/schedules')
  .get(protect, getPurchaseOrderSchedules)
  .post(protect, createPurchaseOrderSchedule);

router.route('/:id/schedules/bulk')
  .post(protect, createBulkPurchaseOrderSchedules);

router.route('/:id/schedules/equal-distribution/preview')
  .post(protect, previewEqualDistributionPurchaseOrderSchedules);

router.route('/:id/schedules/equal-distribution')
  .post(protect, createEqualDistributionPurchaseOrderSchedules);

router.route('/:id/schedules/:scheduleId')
  .put(protect, updatePurchaseOrderSchedule)
  .delete(protect, deletePurchaseOrderSchedule);

router.route('/:id/schedules/:scheduleId/cancel')
  .post(protect, cancelPurchaseOrderSchedule);

module.exports = router;

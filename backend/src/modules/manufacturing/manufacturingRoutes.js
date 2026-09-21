const express = require('express');
const router = express.Router();
const { 
  getBOMs, 
  createBOM, 
  getManufacturingOrders,
  getManufacturingOrderById,
  createManufacturingOrder, 
  confirmOrder,
  checkAvailability,
  consumeMaterials,
  produceFinishedGoods,
  cancelOrder
} = require('./manufacturingController');
const { protect } = require('../../core/middleware/authMiddleware');

router.route('/bom')
  .get(protect, getBOMs)
  .post(protect, createBOM);

router.route('/orders')
  .get(protect, getManufacturingOrders)
  .post(protect, createManufacturingOrder);

router.route('/orders/:id')
  .get(protect, getManufacturingOrderById);

router.route('/orders/:id/confirm')
  .post(protect, confirmOrder);

router.route('/orders/:id/check-availability')
  .post(protect, checkAvailability);

router.route('/orders/:id/consume')
  .post(protect, consumeMaterials);

router.route('/orders/:id/produce')
  .post(protect, produceFinishedGoods);

router.route('/orders/:id/cancel')
  .post(protect, cancelOrder);

module.exports = router;

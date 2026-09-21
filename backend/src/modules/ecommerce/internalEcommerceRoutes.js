const express = require('express');
const router = express.Router();
const { 
  getWebOrders,
  updateWebOrderStatus,
  getApiKeys,
  createApiKey,
  getStoreSettings,
  updateStoreSettings,
  getCoupons,
  createCoupon
} = require('./internalEcommerceController');
const { protect } = require('../../core/middleware/authMiddleware');

router.route('/orders')
  .get(protect, getWebOrders);

router.route('/orders/:id/status')
  .put(protect, updateWebOrderStatus);

router.route('/apikeys')
  .get(protect, getApiKeys)
  .post(protect, createApiKey);

router.route('/settings')
  .get(protect, getStoreSettings)
  .put(protect, updateStoreSettings);

router.route('/coupons')
  .get(protect, getCoupons)
  .post(protect, createCoupon);

module.exports = router;

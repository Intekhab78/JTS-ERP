const express = require('express');
const router = express.Router();
const { 
  getWebOrders,
  getWebOrderDetail,
  updateWebOrderStatus,
  assignLogistics,
  bulkAssignRider,
  settleRiderCodCash,
  processReturnAction,
  resendReturnPickupOtp,
  getEcomSettings,
  updateEcomSettings,
  getStatuses,
  createStatus,
  updateStatus,
  deleteStatus,
  getLogistics,
  createLogistics,
  updateLogistics,
  deleteLogistics,
  getApiKeys,
  createApiKey,
  getCoupons,
  createCoupon,
  getAdminReviews,
  updateReviewStatus,
  deleteReview
} = require('./internalEcommerceController');
const { protect } = require('../../core/middleware/authMiddleware');

// Orders Processing Dashboard
router.route('/orders')
  .get(protect, getWebOrders);

router.route('/orders/bulk-assign-rider')
  .put(protect, bulkAssignRider);

router.route('/orders/settle-rider-cash')
  .put(protect, settleRiderCodCash);

router.route('/orders/:id')
  .get(protect, getWebOrderDetail);


router.route('/orders/:id/status')
  .put(protect, updateWebOrderStatus);

router.route('/orders/:id/logistics')
  .put(protect, assignLogistics);

router.route('/orders/:id/return-action')
  .put(protect, processReturnAction);

router.route('/orders/:id/resend-return-otp')
  .post(protect, resendReturnPickupOtp);


// Settings Master (Multi-location stock, safety stock rules, pick priorities)
router.route('/settings')
  .get(protect, getEcomSettings)
  .put(protect, updateEcomSettings);

// Status Master (with email toggle)
router.route('/statuses')
  .get(protect, getStatuses)
  .post(protect, createStatus);

router.route('/statuses/:id')
  .put(protect, updateStatus)
  .delete(protect, deleteStatus);

// Logistics Carrier Mapping
router.route('/logistics')
  .get(protect, getLogistics)
  .post(protect, createLogistics);

router.route('/logistics/:id')
  .put(protect, updateLogistics)
  .delete(protect, deleteLogistics);

// API Keys & Coupons
router.route('/apikeys')
  .get(protect, getApiKeys)
  .post(protect, createApiKey);

router.route('/coupons')
  .get(protect, getCoupons)
  .post(protect, createCoupon);

// Dynamic Banners, Home Blocks, Company & Hierarchy Mapping, Product Media
const {
  getAdminBanners,
  createAdminBanner,
  updateAdminBanner,
  deleteAdminBanner,
  getAdminHomeBlocks,
  createAdminHomeBlock,
  updateAdminHomeBlock,
  deleteAdminHomeBlock,
  getCompanyHierarchyForMapping,
  getCatalogHierarchyForMapping,
  getAdminProducts,
  updateAdminProductMedia
} = require('./ecommerceAdminController');

router.route('/banners')
  .get(protect, getAdminBanners)
  .post(protect, createAdminBanner);

router.route('/banners/:id')
  .put(protect, updateAdminBanner)
  .delete(protect, deleteAdminBanner);

router.route('/home-blocks')
  .get(protect, getAdminHomeBlocks)
  .post(protect, createAdminHomeBlock);

router.route('/home-blocks/:id')
  .put(protect, updateAdminHomeBlock)
  .delete(protect, deleteAdminHomeBlock);

router.route('/company-hierarchy')
  .get(protect, getCompanyHierarchyForMapping);

router.route('/catalog-hierarchy')
  .get(protect, getCatalogHierarchyForMapping);

const { uploadProductImages } = require('../../core/utils/upload');
const { uploadProductImage, deleteProductImage } = require('../inventory/inventoryController');

router.route('/products')
  .get(protect, getAdminProducts);

router.route('/products/:id')
  .put(protect, updateAdminProductMedia);

router.route('/products/:id/images')
  .post(protect, uploadProductImages.array('images', 10), uploadProductImage);

router.route('/products/:id/images/:imageName')
  .delete(protect, deleteProductImage);

// Customer Reviews & Ratings
router.route('/reviews')
  .get(protect, getAdminReviews);

router.route('/reviews/:id/status')
  .put(protect, updateReviewStatus);

router.route('/reviews/:id')
  .delete(protect, deleteReview);

module.exports = router;

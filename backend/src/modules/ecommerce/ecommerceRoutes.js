const express = require('express');
const router = express.Router();
const { 
  getCategoriesTree,
  getStorefrontConfig,
  quoteCheckout,
  validateCartStock,
  getPublicProducts, 
  getPublicProductById,
  submitWebOrder,
  getCustomerOrders,
  getCustomerOrderById,
  trackOrderByToken,
  trackOrderByDetails,
  cancelCustomerOrder,
  requestOrderReturn,
  addProductReview,
  validateCoupon,
  toggleWishlist,
  getWishlist,
  getSearchSuggestions
} = require('./ecommerceController');

const {
  sendRegisterOtp,
  verifyOtpAndRegister,
  sendForgotPasswordOtp,
  resetPasswordWithOtp,
  loginCustomer,
  getCustomerProfile,
  updateCustomerProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} = require('./customerAuthController');

const { protectApiKey } = require('../../core/middleware/apiAuthMiddleware');
const { protectCustomer } = require('../../core/middleware/customerAuthMiddleware');
const { protect } = require('../../core/middleware/authMiddleware');

const {
  getAdminBanners,
  getPublicBanners,
  createAdminBanner,
  updateAdminBanner,
  deleteAdminBanner,
  getAdminHomeBlocks,
  getPublicHomeBlocks,
  createAdminHomeBlock,
  updateAdminHomeBlock,
  deleteAdminHomeBlock,
  getCompanyHierarchyForMapping,
  getCatalogHierarchyForMapping,
  getAdminEcomSettings,
  updateAdminEcomSettings,
  getAdminProducts,
  updateAdminProductMedia
} = require('./ecommerceAdminController');

// Customer Authentication with Email OTP
router.post('/auth/send-otp', protectApiKey, sendRegisterOtp);
router.post('/auth/verify-otp-register', protectApiKey, verifyOtpAndRegister);
router.post('/auth/forgot-password-otp', protectApiKey, sendForgotPasswordOtp);
router.post('/auth/reset-password', protectApiKey, resetPasswordWithOtp);
router.post('/auth/login', protectApiKey, loginCustomer);
router.get('/auth/profile', protectCustomer, getCustomerProfile);
router.put('/auth/profile', protectCustomer, updateCustomerProfile);

// Customer Address Book
router.post('/auth/addresses', protectCustomer, addAddress);
router.put('/auth/addresses/:id/default', protectCustomer, setDefaultAddress);
router.put('/auth/addresses/:id', protectCustomer, updateAddress);
router.delete('/auth/addresses/:id', protectCustomer, deleteAddress);

// Public Storefront Dynamic Data: Banners, Categories, Blocks & Products
router.get('/store-config', protectApiKey, getStorefrontConfig);
router.get('/banners', protectApiKey, getPublicBanners);
router.get('/home-blocks', protectApiKey, getPublicHomeBlocks);
router.get('/categories', protectApiKey, getCategoriesTree);
router.get('/products', protectApiKey, getPublicProducts);
router.get('/search-suggestions', protectApiKey, getSearchSuggestions);
router.get('/products/:id', protectApiKey, getPublicProductById);
router.post('/products/:id/reviews', protectCustomer, addProductReview);

// Orders & Checkout
router.post('/checkout', protectApiKey, submitWebOrder);
router.post('/checkout/quote', protectApiKey, quoteCheckout);
router.post('/cart/validate', protectApiKey, validateCartStock);
router.post('/orders/checkout', protectApiKey, submitWebOrder);
router.post('/orders/track', protectApiKey, trackOrderByDetails);
router.get('/orders/track/:token', protectApiKey, trackOrderByToken);
router.get('/orders', protectCustomer, getCustomerOrders);
router.get('/orders/:id', protectCustomer, getCustomerOrderById);
router.post('/orders/:id/cancel', protectCustomer, cancelCustomerOrder);
router.post('/orders/:id/return', protectCustomer, requestOrderReturn);

// Coupons & Wishlist
router.post('/coupons/validate', protectApiKey, validateCoupon);
router.get('/wishlist', protectCustomer, getWishlist);
router.post('/wishlist/:productId', protectCustomer, toggleWishlist);

// ==========================================
// RIDER DOORSTEP DELIVERY & POD (METHOD 1 & 2)
// ==========================================
const {
  getRiderOrder,
  confirmRiderDelivery,
  confirmRiderPickup,
  getRiderAssignedOrders,
  cancelRiderDelivery,
  simulateRiderCodPayment
} = require('./riderController');

router.get('/rider/order/:id', getRiderOrder);
router.post('/rider/deliver/:id', confirmRiderDelivery);
router.post('/rider/collect-cod/:id', simulateRiderCodPayment);
router.post('/rider/cancel/:id', cancelRiderDelivery);
router.post('/rider/pickup/:id', confirmRiderPickup);
router.get('/rider/assigned-orders', getRiderAssignedOrders);

// ==========================================
// ERP ADMIN ROUTES (Protected with Staff Auth)
// ==========================================

// Banners Admin
router.get('/admin/banners', protect, getAdminBanners);
router.post('/admin/banners', protect, createAdminBanner);
router.put('/admin/banners/:id', protect, updateAdminBanner);
router.delete('/admin/banners/:id', protect, deleteAdminBanner);

// Home Blocks Admin
router.get('/admin/home-blocks', protect, getAdminHomeBlocks);
router.post('/admin/home-blocks', protect, createAdminHomeBlock);
router.put('/admin/home-blocks/:id', protect, updateAdminHomeBlock);
router.delete('/admin/home-blocks/:id', protect, deleteAdminHomeBlock);

// Settings, Company & Hierarchy Mapping Admin
router.get('/admin/company-hierarchy', protect, getCompanyHierarchyForMapping);
router.get('/admin/catalog-hierarchy', protect, getCatalogHierarchyForMapping);
router.get('/admin/settings', protect, getAdminEcomSettings);
router.put('/admin/settings', protect, updateAdminEcomSettings);

// Product Media & E-Commerce Attributes Admin
router.get('/admin/products', protect, getAdminProducts);
router.put('/admin/products/:id', protect, updateAdminProductMedia);

module.exports = router;

const express = require('express');
const router = express.Router();
const { 
  getPublicProducts, 
  submitWebOrder,
  getPublicProductById,
  addProductReview,
  validateCoupon,
  toggleWishlist
} = require('./ecommerceController');
const { protectApiKey } = require('../../core/middleware/apiAuthMiddleware');
const { protectCustomer } = require('../../core/middleware/customerAuthMiddleware');
const customerAuthController = require('./customerAuthController');

// Auth routes (Customer)
router.post('/auth/register', protectApiKey, customerAuthController.registerCustomer);
router.post('/auth/login', protectApiKey, customerAuthController.loginCustomer);
router.get('/auth/profile', protectCustomer, customerAuthController.getCustomerProfile);

// Catalog routes
router.route('/products')
  .get(protectApiKey, getPublicProducts);

router.route('/products/:id')
  .get(protectApiKey, getPublicProductById);

router.route('/products/:id/reviews')
  .post(protectCustomer, addProductReview);

// Checkout & Wishlist
router.route('/checkout')
  .post(protectApiKey, submitWebOrder);

router.route('/coupons/validate')
  .post(protectApiKey, validateCoupon);

router.route('/wishlist/:productId')
  .post(protectCustomer, toggleWishlist);

module.exports = router;

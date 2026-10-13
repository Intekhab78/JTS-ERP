const express = require('express');
const router = express.Router();
const {
  getDiscounts,
  createDiscount,
  getDiscountById,
  updateDiscount,
  deleteDiscount,
  validateDiscount
} = require('./discountController');
const { protect, authorize } = require('../../core/middleware/authMiddleware');


router.use(protect);
router.post('/validate', validateDiscount);

router.route('/')
  .get(getDiscounts)
  .post(authorize('TENANT ADMIN', 'MANAGE_DISCOUNTS'), createDiscount);

router.route('/:id')
  .get(getDiscountById)
  .put(authorize('TENANT ADMIN', 'MANAGE_DISCOUNTS'), updateDiscount)
  .delete(authorize('TENANT ADMIN', 'MANAGE_DISCOUNTS'), deleteDiscount);

module.exports = router;

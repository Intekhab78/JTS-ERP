const express = require('express');
const {
  getTaxes,
  getTax,
  createTax,
  updateTax,
  deleteTax
} = require('./taxController');

const { protect, authorize } = require('../../core/middleware/authMiddleware');

const router = express.Router();

router.use(protect);
// Restrict to MANAGE_COMPANY or similar settings permission
router.use(authorize('MANAGE_COMPANY', '*'));

router
  .route('/')
  .get(getTaxes)
  .post(createTax);

router
  .route('/:id')
  .get(getTax)
  .put(updateTax)
  .delete(deleteTax);

module.exports = router;

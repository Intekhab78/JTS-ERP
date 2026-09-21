const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../core/middleware/authMiddleware');
const { 
  createGRN, 
  getGRNs, 
  getGRNById, 
  updateGRN, 
  deleteGRN,
  confirmGRN,
  validateGRN,
  cancelGRN
} = require('./grnController');

router.use(protect);

router.route('/')
  .post(createGRN)
  .get(getGRNs);

router.route('/:id')
  .get(getGRNById)
  .put(updateGRN)
  .delete(deleteGRN);

router.route('/:id/confirm')
  .put(confirmGRN);

router.route('/:id/validate')
  .put(validateGRN);

router.route('/:id/cancel')
  .put(cancelGRN);

module.exports = router;

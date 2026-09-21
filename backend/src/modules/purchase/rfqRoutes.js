const express = require('express');
const router = express.Router();
const { 
  getRFQs, 
  getRFQById, 
  createRFQ, 
  updateRFQ,
  updateRFQStatus, 
  convertToPO 
} = require('./rfqController');
const { protect, authorize } = require('../../core/middleware/authMiddleware');

router.route('/')
  .get(protect, authorize('VIEW_PURCHASE_ORDER'), getRFQs)
  .post(protect, authorize('CREATE_PURCHASE_ORDER'), createRFQ);

router.route('/:id')
  .get(protect, authorize('VIEW_PURCHASE_ORDER'), getRFQById)
  .put(protect, authorize('EDIT_PURCHASE_ORDER'), updateRFQ);

router.route('/:id/status')
  .patch(protect, authorize('EDIT_PURCHASE_ORDER'), updateRFQStatus);

router.route('/:id/convert')
  .post(protect, authorize('CREATE_PURCHASE_ORDER'), convertToPO);

module.exports = router;

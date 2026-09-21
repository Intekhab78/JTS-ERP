const express = require('express');
const router = express.Router();
const {
  createQuote,
  getQuotes,
  getQuoteById,
  updateQuote,
  updateQuoteStatus,
  deleteQuote,
  convertQuote,
  reviseQuote,
  getQuoteRevisions
} = require('./quoteController');

const { protect, authorize } = require('../../core/middleware/authMiddleware');

router.route('/')
  .post(protect, authorize('CREATE_QUOTATION'), createQuote)
  .get(protect, authorize('VIEW_QUOTATION'), getQuotes);

router.route('/:id')
  .get(protect, authorize('VIEW_QUOTATION'), getQuoteById)
  .put(protect, authorize('EDIT_QUOTATION'), updateQuote)
  .delete(protect, authorize('DELETE_QUOTATION'), deleteQuote);

router.route('/:id/status')
  .patch(protect, authorize('APPROVE_QUOTATION', 'EDIT_QUOTATION'), updateQuoteStatus);

// Revise Quote endpoint
router.route('/:id/revise')
  .post(protect, authorize('REVISE_QUOTATION'), reviseQuote);

// Get Quote Revisions
router.route('/:id/revisions')
  .get(protect, authorize('VIEW_QUOTATION'), getQuoteRevisions);

// RBAC: Convert to sales order needs CREATE_SALES_ORDER
router.route('/:id/convert')
  .post(protect, authorize('CREATE_SALES_ORDER'), convertQuote);

module.exports = router;

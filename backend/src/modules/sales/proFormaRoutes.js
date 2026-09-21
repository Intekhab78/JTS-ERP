const express = require('express');
const router = express.Router();
const {
  createProFormaInvoice,
  generateFromQuote,
  generateFromOrder,
  getProFormaInvoices,
  getProFormaInvoiceById,
  updateProFormaInvoice,
  updateStatus,
  deleteProFormaInvoice
} = require('./proFormaController');

const { protect, authorize } = require('../../core/middleware/authMiddleware');

router.route('/')
  .post(protect, authorize('CREATE_PROFORMA'), createProFormaInvoice)
  .get(protect, authorize('VIEW_PROFORMA'), getProFormaInvoices);

router.post('/generate/quote/:quoteId', protect, authorize('CREATE_PROFORMA'), generateFromQuote);
router.post('/generate/order/:orderId', protect, authorize('CREATE_PROFORMA'), generateFromOrder);

router.route('/:id')
  .get(protect, authorize('VIEW_PROFORMA'), getProFormaInvoiceById)
  .put(protect, authorize('EDIT_PROFORMA'), updateProFormaInvoice)
  .delete(protect, authorize('DELETE_PROFORMA'), deleteProFormaInvoice);

router.route('/:id/status')
  .patch(protect, authorize('EDIT_PROFORMA'), updateStatus);

module.exports = router;

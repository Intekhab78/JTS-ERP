const express = require('express');
const router = express.Router();
const {
  createInvoiceFromOrder,
  createTaxInvoice,
  updateTaxInvoice,
  getTaxInvoices,
  getTaxInvoiceById,
  updateTaxInvoiceStatus,
  deleteTaxInvoice
} = require('./taxInvoiceController');

const { protect, authorize } = require('../../core/middleware/authMiddleware');

router.route('/')
  .get(protect, authorize('VIEW_TAX_INVOICE'), getTaxInvoices)
  .post(protect, authorize('CREATE_TAX_INVOICE'), createTaxInvoice);

router.post('/generate/order/:orderId', protect, authorize('CREATE_TAX_INVOICE'), createInvoiceFromOrder);

router.route('/:id')
  .get(protect, authorize('VIEW_TAX_INVOICE'), getTaxInvoiceById)
  .put(protect, authorize('EDIT_TAX_INVOICE'), updateTaxInvoice)
  .delete(protect, authorize('DELETE_TAX_INVOICE'), deleteTaxInvoice);

router.route('/:id/status')
  .patch(protect, authorize('EDIT_TAX_INVOICE'), updateTaxInvoiceStatus);

module.exports = router;

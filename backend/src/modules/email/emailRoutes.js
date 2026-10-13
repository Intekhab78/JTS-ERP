const express = require('express');
const router = express.Router();
const {
  sendTaxInvoice,
  sendQuote,
  sendProForma,
  sendDeliveryNote,
  sendPurchaseOrder,
  sendRFQ,
  sendPayslip,
  sendLead,
  sendCustom
} = require('./emailController');
const { protect } = require('../../core/middleware/authMiddleware');

router.use(protect);

router.post('/tax-invoice/:id', sendTaxInvoice);
router.post('/quote/:id', sendQuote);
router.post('/proforma/:id', sendProForma);
router.post('/delivery-note/:id', sendDeliveryNote);
router.post('/purchase-order/:id', sendPurchaseOrder);
router.post('/rfq/:id', sendRFQ);
router.post('/payslip/:id', sendPayslip);
router.post('/lead/:id', sendLead);
router.post('/send', sendCustom);

module.exports = router;

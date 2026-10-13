const TaxInvoice = require('../../core/models/TaxInvoice');
const Quote = require('../../core/models/Quote');
const ProForma = require('../../core/models/ProFormaInvoice');
const DeliveryNote = require('../../core/models/DeliveryNote');
const PurchaseOrder = require('../../core/models/PurchaseOrder');
const PurchaseOrderItem = require('../../core/models/PurchaseOrderItem');
const RFQ = require('../../core/models/RFQ');
const Payslip = require('../../core/models/Payslip');
const Lead = require('../../core/models/Lead');
const Company = require('../../core/models/Company');
const LegalCompany = require('../../core/models/LegalCompany');
const emailService = require('../../services/emailService');
const payrollPdfService = require('../hr/payrollPayslipPdfService');

// Helper to get company name
const getCompanyName = async (tenantId, legalCompanyId = null) => {
  if (legalCompanyId) {
    const lc = await LegalCompany.findById(legalCompanyId);
    if (lc && lc.name) return lc.name;
  }
  const comp = await Company.findById(tenantId);
  return comp?.name || 'JTS ERP';
};

// 1. Tax Invoice
exports.sendTaxInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { recipientEmail, customMessage } = req.body;
    const tenantId = req.user.tenantId;

    const invoice = await TaxInvoice.findOne({ _id: id, tenantId });
    if (!invoice) return res.status(404).json({ message: 'Tax invoice not found' });

    const companyName = await getCompanyName(tenantId, invoice.legalCompanyId);
    const result = await emailService.sendTaxInvoiceEmail({
      invoice,
      recipientEmail,
      customMessage,
      companyName
    });

    res.status(200).json({ success: true, message: 'Invoice sent successfully', result });
  } catch (error) {
    console.error('sendTaxInvoice error:', error);
    res.status(500).json({ message: error.message || 'Failed to send tax invoice email' });
  }
};

// 2. Quotation
exports.sendQuote = async (req, res) => {
  try {
    const { id } = req.params;
    const { recipientEmail, customMessage } = req.body;
    const tenantId = req.user.tenantId;

    const quote = await Quote.findOne({ _id: id, tenantId });
    if (!quote) return res.status(404).json({ message: 'Quote not found' });

    const companyName = await getCompanyName(tenantId);
    const result = await emailService.sendQuoteEmail({
      quote,
      recipientEmail,
      customMessage,
      companyName
    });

    res.status(200).json({ success: true, message: 'Quote sent successfully', result });
  } catch (error) {
    console.error('sendQuote error:', error);
    res.status(500).json({ message: error.message || 'Failed to send quotation email' });
  }
};

// 3. Pro-Forma Invoice
exports.sendProForma = async (req, res) => {
  try {
    const { id } = req.params;
    const { recipientEmail, customMessage } = req.body;
    const tenantId = req.user.tenantId;

    const proforma = await ProForma.findOne({ _id: id, tenantId });
    if (!proforma) return res.status(404).json({ message: 'Pro-Forma invoice not found' });

    const companyName = await getCompanyName(tenantId);
    const result = await emailService.sendProFormaEmail({
      proforma,
      recipientEmail,
      customMessage,
      companyName
    });

    res.status(200).json({ success: true, message: 'Pro-Forma sent successfully', result });
  } catch (error) {
    console.error('sendProForma error:', error);
    res.status(500).json({ message: error.message || 'Failed to send pro-forma email' });
  }
};

// 4. Delivery Note
exports.sendDeliveryNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { recipientEmail, customMessage } = req.body;
    const tenantId = req.user.tenantId;

    const deliveryNote = await DeliveryNote.findOne({ _id: id, tenantId });
    if (!deliveryNote) return res.status(404).json({ message: 'Delivery note not found' });

    const companyName = await getCompanyName(tenantId, deliveryNote.legalCompanyId);
    const result = await emailService.sendDeliveryNoteEmail({
      deliveryNote,
      recipientEmail,
      customMessage,
      companyName
    });

    res.status(200).json({ success: true, message: 'Delivery note sent successfully', result });
  } catch (error) {
    console.error('sendDeliveryNote error:', error);
    res.status(500).json({ message: error.message || 'Failed to send delivery note email' });
  }
};

// 5. Purchase Order
exports.sendPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { recipientEmail, customMessage } = req.body;
    const tenantId = req.user.tenantId;

    const po = await PurchaseOrder.findOne({ _id: id, tenantId })
      .populate('supplierId', 'name email phone address');
    if (!po) return res.status(404).json({ message: 'Purchase order not found' });

    const poItems = await PurchaseOrderItem.find({ purchaseOrderId: po._id }).populate('productId', 'name sku');
    po.items = poItems;

    const companyName = await getCompanyName(tenantId, po.legalCompanyId);
    const result = await emailService.sendPurchaseOrderEmail({
      po,
      recipientEmail,
      customMessage,
      companyName
    });

    res.status(200).json({ success: true, message: 'Purchase order sent successfully', result });
  } catch (error) {
    console.error('sendPurchaseOrder error:', error);
    res.status(500).json({ message: error.message || 'Failed to send purchase order email' });
  }
};

// 6. RFQ
exports.sendRFQ = async (req, res) => {
  try {
    const { id } = req.params;
    const { recipientEmail, customMessage } = req.body;
    const tenantId = req.user.tenantId;

    const rfq = await RFQ.findOne({ _id: id, tenantId })
      .populate('supplierId', 'name email phone')
      .populate('items.productId', 'name sku');
    if (!rfq) return res.status(404).json({ message: 'RFQ not found' });

    const companyName = await getCompanyName(tenantId);
    const result = await emailService.sendRFQEmail({
      rfq,
      recipientEmail,
      customMessage,
      companyName
    });

    res.status(200).json({ success: true, message: 'RFQ sent successfully', result });
  } catch (error) {
    console.error('sendRFQ error:', error);
    res.status(500).json({ message: error.message || 'Failed to send RFQ email' });
  }
};

// 7. Payslip with PDF Attachment
exports.sendPayslip = async (req, res) => {
  try {
    const { id } = req.params;
    const { recipientEmail, customMessage } = req.body;
    const tenantId = req.user.tenantId;

    const payslip = await Payslip.findOne({ _id: id, tenantId })
      .populate('payrollPeriodId', 'name periodStart periodEnd paymentDate')
      .populate('employeeId', 'firstName lastName email personalEmail employeeCode');
    if (!payslip) return res.status(404).json({ message: 'Payslip not found' });

    const company = await Company.findById(tenantId);
    const pdfBuffer = await payrollPdfService.generatePayslipPdf(payslip, company);

    const result = await emailService.sendPayslipEmail({
      payslip,
      recipientEmail,
      pdfBuffer,
      customMessage,
      companyName: company?.name || 'JTS ERP'
    });

    res.status(200).json({ success: true, message: 'Payslip emailed successfully', result });
  } catch (error) {
    console.error('sendPayslip error:', error);
    res.status(500).json({ message: error.message || 'Failed to email payslip' });
  }
};

// 8. Lead Follow-up Email
exports.sendLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { recipientEmail, subject, message } = req.body;
    const tenantId = req.user.tenantId;

    const lead = await Lead.findOne({ _id: id, tenantId });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const companyName = await getCompanyName(tenantId);
    const result = await emailService.sendLeadEmail({
      lead,
      recipientEmail,
      subject,
      message,
      companyName
    });

    res.status(200).json({ success: true, message: 'Lead email sent successfully', result });
  } catch (error) {
    console.error('sendLead error:', error);
    res.status(500).json({ message: error.message || 'Failed to send email to lead' });
  }
};

// 9. Custom / Direct Email
exports.sendCustom = async (req, res) => {
  try {
    const { to, subject, html, text, attachments } = req.body;
    if (!to || !subject) return res.status(400).json({ message: 'Recipient and subject are required' });

    const result = await emailService.sendEmail({ to, subject, html, text, attachments });
    res.status(200).json({ success: true, message: 'Email sent successfully', result });
  } catch (error) {
    console.error('sendCustom error:', error);
    res.status(500).json({ message: error.message || 'Failed to send email' });
  }
};

const nodemailer = require('nodemailer');

// Create reusable transporter
const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });
  }

  // Fallback: If SMTP is not yet configured, provide simulated transport
  return null;
};

// Generic Base Send Mail function
const sendEmail = async ({ to, subject, html, text, attachments = [] }) => {
  if (!to) {
    throw new Error('Recipient email address is required');
  }

  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || `"JTS ERP System" <noreply@erp.local>`;

  if (!transporter) {
    console.log(`\n================= [SIMULATED EMAIL DISPATCH] =================`);
    console.log(`TO: ${to}`);
    console.log(`FROM: ${from}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`ATTACHMENTS: ${attachments.length} file(s)`);
    console.log(`--------------------------------------------------------------`);
    console.log(text || html?.replace(/<[^>]*>?/gm, '').slice(0, 300) + '...');
    console.log(`==============================================================\n`);

    return {
      success: true,
      simulated: true,
      message: 'SMTP credentials not configured in .env. Email simulated successfully in server logs.',
      recipient: to
    };
  }

  const mailOptions = {
    from,
    to,
    subject,
    text,
    html,
    attachments
  };

  const info = await transporter.sendMail(mailOptions);
  return {
    success: true,
    simulated: false,
    messageId: info.messageId,
    recipient: to
  };
};

// Reusable Responsive HTML Layout Wrapper
const wrapEmailTemplate = ({ title, preheader = '', contentHtml, companyName = 'JTS ERP' }) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #ffffff; padding: 28px 32px; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
    .header p { margin: 6px 0 0; font-size: 13px; color: #94a3b8; }
    .content { padding: 32px; line-height: 1.6; font-size: 14px; }
    .table-container { margin: 24px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f8fafc; padding: 10px 14px; text-align: left; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; }
    td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
    tr:last-child td { border-bottom: none; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .totals-box { margin-top: 16px; margin-left: auto; width: 260px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
    .total-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
    .total-grand { font-size: 15px; font-weight: 800; color: #0f172a; border-top: 2px dashed #cbd5e1; padding-top: 8px; margin-top: 6px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .badge-blue { background: #e0e7ff; color: #3730a3; }
    .badge-green { background: #dcfce7; color: #166534; }
    .custom-note { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 18px; border-radius: 4px; margin: 20px 0; font-size: 13px; color: #334155; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#f1f5f9;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader || title}
  </div>
  <div class="container">
    <div class="header">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1>${companyName}</h1>
          <p>${title}</p>
        </div>
      </div>
    </div>
    <div class="content">
      ${contentHtml}
    </div>
    <div class="footer">
      <p style="margin:0 0 6px;">This is an automated notification from <strong>${companyName}</strong> Enterprise System.</p>
      <p style="margin:0;">Please do not reply directly to this email unless specified.</p>
    </div>
  </div>
</body>
</html>
  `;
};

// 1. Tax Invoice Email
const sendTaxInvoiceEmail = async ({ invoice, recipientEmail, customMessage = '', companyName = 'JTS ERP' }) => {
  const to = recipientEmail || invoice.customerSnapshot?.email;
  if (!to) throw new Error('No valid customer email address found for this Invoice');

  const itemsRows = (invoice.items || []).map((it, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${it.itemName || 'Item'}</strong><br><small style="color:#64748b;">${it.sku || ''}</small></td>
      <td class="text-right">${it.quantity} ${it.uom || 'PCS'}</td>
      <td class="text-right">${Number(it.unitPrice || 0).toFixed(2)}</td>
      <td class="text-right">${Number(it.lineTotal || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  const contentHtml = `
    <p>Dear <strong>${invoice.customerSnapshot?.name || 'Customer'}</strong>,</p>
    <p>Please find attached the details of your Tax Invoice <strong>#${invoice.invoiceNumber}</strong>.</p>
    
    ${customMessage ? `<div class="custom-note"><strong>Note from Sender:</strong><br>${customMessage.replace(/\n/g, '<br>')}</div>` : ''}

    <div style="margin:20px 0; padding:14px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0;">
      <table style="width:100%;">
        <tr>
          <td><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</td>
          <td class="text-right"><strong>Issue Date:</strong> ${new Date(invoice.issueDate || Date.now()).toLocaleDateString()}</td>
        </tr>
        <tr>
          <td><strong>Due Date:</strong> ${new Date(invoice.dueDate || Date.now()).toLocaleDateString()}</td>
          <td class="text-right"><strong>Status:</strong> <span class="badge badge-green">${invoice.status || 'ISSUED'}</span></td>
        </tr>
      </table>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width:30px;">#</th>
            <th>Item Details</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Rate</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
    </div>

    <div style="text-align:right;">
      <div class="totals-box">
        <div class="total-row"><span>Subtotal:</span> <strong>${Number(invoice.subtotal || 0).toFixed(2)}</strong></div>
        <div class="total-row"><span>Tax Total:</span> <strong>${Number(invoice.taxTotal || 0).toFixed(2)}</strong></div>
        <div class="total-row total-grand"><span>Grand Total:</span> <span>${Number(invoice.grandTotal || 0).toFixed(2)}</span></div>
        <div class="total-row" style="color:#dc2626; margin-top:6px;"><span>Balance Due:</span> <strong>${Number(invoice.balanceDue || 0).toFixed(2)}</strong></div>
      </div>
    </div>

    <p style="margin-top:28px;">If you have any questions regarding this invoice, please feel free to reach out to our accounts team.</p>
  `;

  return sendEmail({
    to,
    subject: `Tax Invoice #${invoice.invoiceNumber} - ${companyName}`,
    html: wrapEmailTemplate({ title: `Tax Invoice #${invoice.invoiceNumber}`, contentHtml, companyName }),
    text: `Tax Invoice #${invoice.invoiceNumber} from ${companyName}. Grand Total: ${invoice.grandTotal}. Balance Due: ${invoice.balanceDue}.`
  });
};

// 2. Quotation Email
const sendQuoteEmail = async ({ quote, recipientEmail, customMessage = '', companyName = 'JTS ERP' }) => {
  const to = recipientEmail || quote.customerSnapshot?.email;
  if (!to) throw new Error('No valid customer email address found for this Quotation');

  const itemsRows = (quote.items || []).map((it, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${it.itemName || 'Item'}</strong><br><small style="color:#64748b;">${it.sku || ''}</small></td>
      <td class="text-right">${it.quantity}</td>
      <td class="text-right">${Number(it.unitPrice || 0).toFixed(2)}</td>
      <td class="text-right">${Number(it.total || it.lineTotal || (it.quantity * it.unitPrice)).toFixed(2)}</td>
    </tr>
  `).join('');

  const contentHtml = `
    <p>Dear <strong>${quote.customerSnapshot?.name || 'Customer'}</strong>,</p>
    <p>Thank you for your interest. Please review your Quotation <strong>#${quote.quoteNumber}</strong> below.</p>
    
    ${customMessage ? `<div class="custom-note"><strong>Message:</strong><br>${customMessage.replace(/\n/g, '<br>')}</div>` : ''}

    <div style="margin:20px 0; padding:14px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0;">
      <table style="width:100%;">
        <tr>
          <td><strong>Quote #:</strong> ${quote.quoteNumber}</td>
          <td class="text-right"><strong>Date:</strong> ${new Date(quote.quoteDate || Date.now()).toLocaleDateString()}</td>
        </tr>
        <tr>
          <td><strong>Status:</strong> <span class="badge badge-blue">${quote.status || 'DRAFT'}</span></td>
          <td class="text-right"><strong>Valid Until:</strong> ${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : 'N/A'}</td>
        </tr>
      </table>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width:30px;">#</th>
            <th>Item</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Price</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
    </div>

    <div style="text-align:right;">
      <div class="totals-box">
        <div class="total-row"><span>Total Amount:</span> <strong>${Number(quote.grandTotal || 0).toFixed(2)}</strong></div>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Quotation #${quote.quoteNumber} - ${companyName}`,
    html: wrapEmailTemplate({ title: `Quotation #${quote.quoteNumber}`, contentHtml, companyName }),
    text: `Quotation #${quote.quoteNumber} from ${companyName}. Total: ${quote.grandTotal}.`
  });
};

// 3. Pro-Forma Invoice Email
const sendProFormaEmail = async ({ proforma, recipientEmail, customMessage = '', companyName = 'JTS ERP' }) => {
  const to = recipientEmail || proforma.customerSnapshot?.email;
  if (!to) throw new Error('No valid customer email address found for this Pro-Forma Invoice');

  const itemsRows = (proforma.items || []).map((it, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${it.itemName || 'Item'}</strong></td>
      <td class="text-right">${it.quantity}</td>
      <td class="text-right">${Number(it.unitPrice || 0).toFixed(2)}</td>
      <td class="text-right">${Number(it.lineTotal || (it.quantity * it.unitPrice)).toFixed(2)}</td>
    </tr>
  `).join('');

  const contentHtml = `
    <p>Dear <strong>${proforma.customerSnapshot?.name || 'Customer'}</strong>,</p>
    <p>Here are the details of your Pro-Forma Invoice <strong>#${proforma.proFormaNumber}</strong>.</p>
    
    ${customMessage ? `<div class="custom-note"><strong>Note:</strong><br>${customMessage.replace(/\n/g, '<br>')}</div>` : ''}

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Item</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Unit Price</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
    </div>

    <div style="text-align:right;">
      <div class="totals-box">
        <div class="total-row total-grand"><span>Total:</span> <span>${Number(proforma.grandTotal || 0).toFixed(2)}</span></div>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Pro-Forma Invoice #${proforma.proFormaNumber} - ${companyName}`,
    html: wrapEmailTemplate({ title: `Pro-Forma Invoice #${proforma.proFormaNumber}`, contentHtml, companyName }),
    text: `Pro-Forma Invoice #${proforma.proFormaNumber}. Grand Total: ${proforma.grandTotal}.`
  });
};

// 4. Delivery Note Email
const sendDeliveryNoteEmail = async ({ deliveryNote, recipientEmail, customMessage = '', companyName = 'JTS ERP' }) => {
  const to = recipientEmail || deliveryNote.customerSnapshot?.email;
  if (!to) throw new Error('No valid customer email address found for this Delivery Note');

  const itemsRows = (deliveryNote.items || []).map((it, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${it.itemName || 'Item'}</strong></td>
      <td class="text-right">${it.quantity}</td>
    </tr>
  `).join('');

  const contentHtml = `
    <p>Dear <strong>${deliveryNote.customerSnapshot?.name || 'Customer'}</strong>,</p>
    <p>Your order dispatch has been processed. Please find details for Delivery Note <strong>#${deliveryNote.deliveryNoteNumber}</strong>.</p>

    ${customMessage ? `<div class="custom-note"><strong>Delivery Note:</strong><br>${customMessage.replace(/\n/g, '<br>')}</div>` : ''}

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Item Dispatched</th>
            <th class="text-right">Dispatched Qty</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Delivery Note #${deliveryNote.deliveryNoteNumber} - ${companyName}`,
    html: wrapEmailTemplate({ title: `Delivery Note #${deliveryNote.deliveryNoteNumber}`, contentHtml, companyName }),
    text: `Delivery Note #${deliveryNote.deliveryNoteNumber} from ${companyName}.`
  });
};

// 5. Purchase Order (PO) Email
const sendPurchaseOrderEmail = async ({ po, recipientEmail, customMessage = '', companyName = 'JTS ERP' }) => {
  const to = recipientEmail || po.supplierId?.email || po.supplierSnapshot?.email;
  if (!to) throw new Error('No valid supplier email address found for this Purchase Order');

  const itemsRows = (po.items || []).map((it, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${it.productId?.name || it.itemName || 'Product'}</strong></td>
      <td class="text-right">${it.quantity}</td>
      <td class="text-right">${Number(it.unitPrice || 0).toFixed(2)}</td>
      <td class="text-right">${Number(it.lineTotal || (it.quantity * it.unitPrice)).toFixed(2)}</td>
    </tr>
  `).join('');

  const contentHtml = `
    <p>Dear <strong>${po.supplierId?.name || 'Supplier'}</strong>,</p>
    <p>Please find below the Purchase Order <strong>#${po.poNumber || po.purchaseOrderNumber}</strong> issued to your company.</p>

    ${customMessage ? `<div class="custom-note"><strong>Instructions:</strong><br>${customMessage.replace(/\n/g, '<br>')}</div>` : ''}

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Item Description</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Unit Price</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
    </div>

    <div style="text-align:right;">
      <div class="totals-box">
        <div class="total-row total-grand"><span>PO Total:</span> <span>${Number(po.grandTotal || po.totalAmount || 0).toFixed(2)}</span></div>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Purchase Order #${po.poNumber || po.purchaseOrderNumber} - ${companyName}`,
    html: wrapEmailTemplate({ title: `Purchase Order #${po.poNumber || po.purchaseOrderNumber}`, contentHtml, companyName }),
    text: `Purchase Order #${po.poNumber || po.purchaseOrderNumber} from ${companyName}. Total: ${po.grandTotal || po.totalAmount}.`
  });
};

// 6. RFQ (Request for Quotation) Email
const sendRFQEmail = async ({ rfq, recipientEmail, customMessage = '', companyName = 'JTS ERP' }) => {
  const to = recipientEmail || rfq.supplierId?.email;
  if (!to) throw new Error('No valid supplier email address found for this RFQ');

  const itemsRows = (rfq.items || []).map((it, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${it.productId?.name || it.itemName || 'Item'}</strong></td>
      <td class="text-right">${it.requestedQuantity || it.quantity}</td>
      <td>${it.specifications || it.notes || '-'}</td>
    </tr>
  `).join('');

  const contentHtml = `
    <p>Dear <strong>${rfq.supplierId?.name || 'Vendor'}</strong>,</p>
    <p>We invite you to submit your best price quote for the following items under RFQ <strong>#${rfq.rfqNumber}</strong>.</p>

    ${customMessage ? `<div class="custom-note"><strong>RFQ Instructions:</strong><br>${customMessage.replace(/\n/g, '<br>')}</div>` : ''}

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Requested Item</th>
            <th class="text-right">Qty Needed</th>
            <th>Specifications</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
    </div>

    <p>Please provide your competitive price and estimated delivery timelines at your earliest convenience.</p>
  `;

  return sendEmail({
    to,
    subject: `Request for Quotation #${rfq.rfqNumber} - ${companyName}`,
    html: wrapEmailTemplate({ title: `RFQ #${rfq.rfqNumber}`, contentHtml, companyName }),
    text: `Request for Quotation #${rfq.rfqNumber} from ${companyName}.`
  });
};

// 7. Payslip Email with PDF Attachment
const sendPayslipEmail = async ({ payslip, recipientEmail, pdfBuffer, customMessage = '', companyName = 'JTS ERP' }) => {
  const to = recipientEmail || payslip.employeeId?.email || payslip.employeeId?.personalEmail;
  if (!to) throw new Error('No valid employee email address found for this payslip');

  const contentHtml = `
    <p>Dear <strong>${payslip.employeeName || payslip.employeeId?.firstName || 'Employee'}</strong>,</p>
    <p>Your payslip for pay period <strong>${payslip.payrollPeriodId?.name || 'Recent'}</strong> has been generated and is attached to this email.</p>

    <div style="margin:20px 0; padding:16px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px;">
      <h3 style="margin:0 0 10px; color:#15803d;">Net Salary: ${Number(payslip.netSalary || 0).toLocaleString()} ${payslip.currency || 'USD'}</h3>
      <p style="margin:0; font-size:13px; color:#374151;">Payment Date: ${new Date(payslip.paymentDate || Date.now()).toLocaleDateString()}</p>
    </div>

    ${customMessage ? `<div class="custom-note"><strong>HR Message:</strong><br>${customMessage.replace(/\n/g, '<br>')}</div>` : ''}

    <p>Please find the official PDF payslip document attached for your records.</p>
  `;

  const attachments = [];
  if (pdfBuffer) {
    attachments.push({
      filename: `${payslip.payslipNumber || 'Payslip'}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    });
  }

  return sendEmail({
    to,
    subject: `Payslip ${payslip.payslipNumber} for ${payslip.payrollPeriodId?.name || 'Payroll'} - ${companyName}`,
    html: wrapEmailTemplate({ title: `Payslip #${payslip.payslipNumber}`, contentHtml, companyName }),
    text: `Your payslip ${payslip.payslipNumber} has been issued. Net Salary: ${payslip.netSalary} ${payslip.currency}.`,
    attachments
  });
};

// 8. Lead / CRM Quick Follow-up Email
const sendLeadEmail = async ({ lead, recipientEmail, subject, message, companyName = 'JTS ERP' }) => {
  const to = recipientEmail || lead.email;
  if (!to) throw new Error('No valid lead email address found');

  const contentHtml = `
    <p>Dear <strong>${lead.name || 'Valued Contact'}</strong>,</p>
    <div style="margin:20px 0; font-size:14px; line-height:1.7;">
      ${message.replace(/\n/g, '<br>')}
    </div>
  `;

  return sendEmail({
    to,
    subject: subject || `Regarding your inquiry with ${companyName}`,
    html: wrapEmailTemplate({ title: `Communication from ${companyName}`, contentHtml, companyName }),
    text: message
  });
};

// 9. Password Reset Email
const sendPasswordResetEmail = async ({ user, resetUrl, resetToken, companyName = 'JTS ERP' }) => {
  const to = user.email;
  if (!to) throw new Error('No user email address found');

  const contentHtml = `
    <p style="font-size:15px; color:#1e293b; margin-bottom:16px;">Hello <strong>${user.firstName || 'User'}</strong>,</p>
    <p style="font-size:14px; color:#475569; line-height:1.6; margin-bottom:24px;">
      We received a request to reset the password for your <strong>${companyName}</strong> account.
      Click the secure button below to set a new password:
    </p>

    <div style="margin: 32px 0; text-align: center;">
      <a href="${resetUrl}" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; font-weight: 700; font-size: 14px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.25);">
        Reset My Password
      </a>
    </div>

    <p style="font-size: 13px; color: #64748b; margin-top:24px;">Or copy and paste this link into your browser:</p>
    <p style="font-size: 12px; word-break: break-all; background: #f8fafc; padding: 12px 14px; border-radius: 6px; border: 1px solid #e2e8f0; color: #334155; font-family: monospace;">
      ${resetUrl}
    </p>

    <div style="margin-top: 28px; padding: 14px 16px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px; font-size: 12px; color: #92400e; line-height: 1.5;">
      <strong>Security Notice:</strong> This link is valid for <strong>1 hour</strong> only. If you did not request a password reset, please ignore this email or notify your system administrator.
    </div>
  `;

  return sendEmail({
    to,
    subject: `Password Reset Request - ${companyName}`,
    html: wrapEmailTemplate({ title: 'Password Reset Request', preheader: 'Reset your ERP account password', contentHtml, companyName }),
    text: `You requested a password reset for ${companyName}. Please open the following URL to set a new password (valid for 1 hour): ${resetUrl}`
  });
};

module.exports = {
  sendEmail,
  sendTaxInvoiceEmail,
  sendQuoteEmail,
  sendProFormaEmail,
  sendDeliveryNoteEmail,
  sendPurchaseOrderEmail,
  sendRFQEmail,
  sendPayslipEmail,
  sendLeadEmail,
  sendPasswordResetEmail
};


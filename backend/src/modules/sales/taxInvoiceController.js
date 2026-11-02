const mongoose = require('mongoose');
const TaxInvoice = require('../../core/models/TaxInvoice');
const Order = require('../../core/models/Order');
const OrderItem = require('../../core/models/OrderItem');
const Customer = require('../../core/models/Customer');
const Branch = require('../../core/models/Branch');
const Counter = require('../../core/models/Counter');
const { getReadFilter, validateCreateScope } = require('../../core/utils/scopeHelper');
const AutoPostingService = require('../../services/autoPostingService');

const generateInvoiceNumber = async (tenantId, session) => {
  const currentYear = new Date().getFullYear();
  const counterId = `TAX_INVOICE_${currentYear}`;
  
  const counter = await Counter.findOneAndUpdate(
    { tenantId, sequenceName: counterId, year: currentYear },
    { $inc: { sequenceValue: 1 } },
    { returnDocument: 'after', upsert: true, session }
  );

  const seqStr = String(counter.sequenceValue).padStart(6, '0');
  return `INV-${currentYear}-${seqStr}`;
};

exports.createInvoiceFromOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const tenantId = req.user.tenantId;
    const filter = getReadFilter(req);
    const { orderId } = req.params;
    const { itemsToInvoice, dueDate, notes, termsAndConditions } = req.body;

    const order = await Order.findOne({ _id: orderId, ...filter }).session(session);
    if (!order) throw new Error('Sales Order not found');

    const customer = await Customer.findOne({ _id: order.customerId, ...filter }).session(session);
    if (!customer) throw new Error('Customer not found');

    const orderItems = await OrderItem.find({ orderId: order._id, ...filter }).populate('productId').session(session);
    
    let subtotal = 0;
    let taxTotal = 0;
    const invoiceItems = [];

    const inputItemsMap = {};
    if (itemsToInvoice && Array.isArray(itemsToInvoice)) {
      itemsToInvoice.forEach(i => {
        inputItemsMap[i.productId] = i.quantity;
      });
    }

    for (const oi of orderItems) {
      const remainingInvoiceQty = Math.max(0, oi.quantity - (oi.invoicedQuantity || 0));
      if (remainingInvoiceQty <= 0) continue;

      let qtyToInvoice = remainingInvoiceQty;
      
      if (itemsToInvoice) {
         if (inputItemsMap[oi.productId._id.toString()] !== undefined) {
           qtyToInvoice = Number(inputItemsMap[oi.productId._id.toString()]);
           if (qtyToInvoice > remainingInvoiceQty) {
             throw new Error(`Cannot invoice ${qtyToInvoice} units for product. Only ${remainingInvoiceQty} units remain to be invoiced.`);
           }
         } else {
           qtyToInvoice = 0;
         }
      }

      if (qtyToInvoice <= 0) continue;

      const unitPrice = oi.unitPrice;
      const taxRate = oi.productId.taxRate || 0;
      
      const lineTotalBeforeTax = qtyToInvoice * unitPrice;
      const taxAmount = (lineTotalBeforeTax * taxRate) / 100;
      const lineTotal = lineTotalBeforeTax + taxAmount;

      subtotal += lineTotalBeforeTax;
      taxTotal += taxAmount;

      invoiceItems.push({
        productId: oi.productId._id,
        variantId: oi.variantId || null,
        variantSku: oi.variantSku || oi.productId.sku,
        attributes: oi.selectedAttributes ? (oi.selectedAttributes instanceof Map ? Object.fromEntries(oi.selectedAttributes) : oi.selectedAttributes) : undefined,
        itemName: oi.variantSku ? `${oi.productId.name} (${oi.variantSku})` : oi.productId.name,
        sku: oi.variantSku || oi.productId.sku,
        uom: oi.productId.uom || 'PCS',
        quantity: qtyToInvoice,
        unitPrice,
        taxRate,
        taxAmount,
        lineTotal
      });

      oi.invoicedQuantity = (oi.invoicedQuantity || 0) + qtyToInvoice;
      await oi.save({ session });
    }

    if (invoiceItems.length === 0) {
      throw new Error('No items to invoice');
    }

    const grandTotal = subtotal + taxTotal;
    const invoiceNumber = await generateInvoiceNumber(tenantId, session);

    const taxInvoice = new TaxInvoice({
      tenantId,
      legalCompanyId: order.legalCompanyId,
      branchId: order.branchId,
      invoiceNumber,
      orderId: order._id,
      customerId: order.customerId,
      customerSnapshot: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        billingAddress: customer.billingAddress,
        taxRegistrationNumber: customer.taxRegistrationNumber || ''
      },
      salespersonId: order.userId,
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'DRAFT',
      items: invoiceItems,
      subtotal,
      taxTotal,
      grandTotal,
      balanceDue: grandTotal,
      notes,
      termsAndConditions,
      createdBy: req.user._id
    });

    await taxInvoice.save({ session });

    let allInvoiced = true;
    let someInvoiced = false;
    for (const oi of orderItems) {
      if ((oi.invoicedQuantity || 0) > 0) someInvoiced = true;
      if ((oi.invoicedQuantity || 0) < oi.quantity) allInvoiced = false;
    }

    if (allInvoiced) {
      order.invoiceStatus = 'INVOICED';
    } else if (someInvoiced) {
      order.invoiceStatus = 'PARTIAL';
    }
    await order.save({ session });

    await session.commitTransaction();
    res.status(201).json(taxInvoice);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message || 'Error generating invoice' });
  } finally {
    session.endSession();
  }
};

exports.getTaxInvoices = async (req, res) => {
  try {
    const query = { ...getReadFilter(req), isActive: true };
    const taxInvoices = await TaxInvoice.find(query).sort({ createdAt: -1 });
    res.status(200).json(taxInvoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTaxInvoiceById = async (req, res) => {
  try {
    const filter = getReadFilter(req);
    const taxInvoice = await TaxInvoice.findOne({ _id: req.params.id, ...filter, isActive: true })
      .populate('items.variantId', 'sku title attributes salesPrice purchasePrice uploadImage');
    if (!taxInvoice) return res.status(404).json({ message: 'TaxInvoice not found' });
    
    res.status(200).json(taxInvoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateTaxInvoiceStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const filter = getReadFilter(req);
    const taxInvoice = await TaxInvoice.findOneAndUpdate(
      { _id: req.params.id, ...filter, isActive: true },
      { status, updatedBy: req.user._id },
      { returnDocument: 'after' }
    );
    if (!taxInvoice) return res.status(404).json({ message: 'TaxInvoice not found' });

    // Trigger Double-Entry Auto-Posting
    if (['APPROVED', 'SENT', 'PAID_FULL', 'PAID_PARTIAL'].includes(status)) {
      await AutoPostingService.postSalesInvoice(taxInvoice, req.user._id);
    } else if (status === 'CANCELLED') {
      await AutoPostingService.reverseSourceEntry(taxInvoice._id, 'TaxInvoice', taxInvoice.tenantId, req.user._id);
    }

    res.status(200).json(taxInvoice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.createTaxInvoice = async (req, res) => {
  try {
    let scopedBody;
    try {
      scopedBody = validateCreateScope(req, req.body);
    } catch {
      scopedBody = { ...req.body };
    }

    const { items = [], customerId, ...rest } = scopedBody;

    if (!customerId) {
      return res.status(400).json({ message: 'Customer is required' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    const tenantId = req.user.tenantId;

    // 1. Resolve Customer Snapshot
    let customerSnapshot = rest.customerSnapshot;
    if (!customerSnapshot || !customerSnapshot.name) {
      const customer = await Customer.findOne({ _id: customerId, tenantId });
      if (customer) {
        customerSnapshot = {
          name: customer.name || 'Customer',
          email: customer.email || '',
          phone: customer.phone || '',
          billingAddress: typeof customer.billingAddress === 'string'
            ? customer.billingAddress
            : (customer.billingAddress?.street || customer.billingAddress?.city || ''),
          taxRegistrationNumber: customer.taxRegistrationNumber || ''
        };
      } else {
        customerSnapshot = { name: 'Customer' };
      }
    }

    // 2. Resolve Branch ID
    let branchId = rest.branchId;
    if (!branchId) {
      if (req.user.branchId) {
        branchId = req.user.branchId;
      } else if (req.user.accessibleBranchIds && req.user.accessibleBranchIds.length > 0) {
        branchId = req.user.accessibleBranchIds[0];
      } else {
        const defaultBranch = await Branch.findOne({ tenantId, isActive: true }) || await Branch.findOne({ tenantId });
        branchId = defaultBranch?._id;
      }
    }

    if (!branchId) {
      // Auto-create or fetch primary branch if none exists
      let primaryBranch = await Branch.findOne({ tenantId });
      if (!primaryBranch) {
        primaryBranch = await Branch.create({
          tenantId,
          name: 'Main Branch',
          type: 'Store',
          isActive: true
        });
      }
      branchId = primaryBranch._id;
    }

    // 3. Resolve Legal Company ID
    let legalCompanyId = scopedBody.legalCompanyId || rest.legalCompanyId;
    if (!legalCompanyId && req.user.accessibleCompanyIds && req.user.accessibleCompanyIds.length > 0) {
      legalCompanyId = req.user.accessibleCompanyIds[0];
    }

    // 4. Sanitize items
    const sanitizedItems = [];
    let calculatedSubtotal = 0;
    let calculatedTaxTotal = 0;
    let calculatedDiscountTotal = 0;

    for (const item of items) {
      if (!item.productId) continue;

      const qty = Number(item.quantity) || 1;
      const unitPrice = Number(item.unitPrice) || 0;
      const discount = Number(item.discount) || 0;
      const taxRate = Number(item.taxRate) || 0;

      const taxable = Math.max(0, (qty * unitPrice) - discount);
      const taxAmount = (item.taxAmount !== undefined && item.taxAmount !== null && item.taxAmount !== '')
        ? Number(item.taxAmount)
        : (taxable * taxRate) / 100;
      const lineTotal = Number(item.lineTotal) || (taxable + taxAmount);

      calculatedSubtotal += (qty * unitPrice);
      calculatedDiscountTotal += discount;
      calculatedTaxTotal += taxAmount;

      sanitizedItems.push({
        productId: item.productId,
        variantId: item.variantId || null,
        variantSku: item.variantSku || '',
        attributes: item.attributes || {},
        itemName: item.itemName || 'Product',
        sku: item.sku || 'SKU',
        uom: item.uom || 'PCS',
        quantity: qty,
        unitPrice,
        discount,
        taxRate,
        taxAmount,
        lineTotal
      });
    }

    if (sanitizedItems.length === 0) {
      return res.status(400).json({ message: 'Please add at least one product item to the invoice.' });
    }

    const shippingCharges = Number(rest.shippingCharges) || 0;
    const otherCharges = Number(rest.otherCharges) || 0;
    const grandTotal = Number(rest.grandTotal) || (calculatedSubtotal - calculatedDiscountTotal + calculatedTaxTotal + shippingCharges + otherCharges);

    const invoiceNumber = rest.invoiceNumber || await generateInvoiceNumber(tenantId, null);

    const taxInvoice = new TaxInvoice({
      ...rest,
      tenantId,
      legalCompanyId,
      branchId,
      invoiceNumber,
      customerId,
      customerSnapshot,
      items: sanitizedItems,
      subtotal: Number(rest.subtotal) || calculatedSubtotal,
      discountTotal: Number(rest.discountTotal) || calculatedDiscountTotal,
      taxTotal: Number(rest.taxTotal) || calculatedTaxTotal,
      shippingCharges,
      grandTotal,
      balanceDue: grandTotal,
      amountPaid: 0,
      createdBy: req.user._id,
      status: rest.status || 'DRAFT'
    });

    await taxInvoice.save();

    // Trigger Double-Entry Auto-Posting if status is non-DRAFT
    if (['APPROVED', 'SENT', 'PAID_FULL', 'PAID_PARTIAL'].includes(taxInvoice.status)) {
      await AutoPostingService.postSalesInvoice(taxInvoice, req.user._id);
    }

    res.status(201).json(taxInvoice);
  } catch (error) {
    console.error('createTaxInvoice error:', error);
    res.status(400).json({ message: error.message || 'Error creating manual Tax Invoice' });
  }
};

exports.updateTaxInvoice = async (req, res) => {
  try {
    const filter = getReadFilter(req);
    const existing = await TaxInvoice.findOne({ _id: req.params.id, ...filter, isActive: true });
    if (!existing) return res.status(404).json({ message: 'TaxInvoice not found' });
    if (existing.status !== 'DRAFT') {
      return res.status(403).json({ message: 'Only DRAFT invoices can be edited' });
    }

    const { items, customerId, ...rest } = req.body;

    const updateFields = { ...rest, updatedBy: req.user._id };

    if (customerId) {
      updateFields.customerId = customerId;
      const customer = await Customer.findOne({ _id: customerId, tenantId: req.user.tenantId });
      if (customer) {
        updateFields.customerSnapshot = {
          name: customer.name || 'Customer',
          email: customer.email || '',
          phone: customer.phone || '',
          billingAddress: typeof customer.billingAddress === 'string'
            ? customer.billingAddress
            : (customer.billingAddress?.street || customer.billingAddress?.city || ''),
          taxRegistrationNumber: customer.taxRegistrationNumber || ''
        };
      }
    }

    if (items && Array.isArray(items)) {
      const sanitizedItems = [];
      let calculatedSubtotal = 0;
      let calculatedTaxTotal = 0;
      let calculatedDiscountTotal = 0;

      for (const item of items) {
        if (!item.productId) continue;

        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.unitPrice) || 0;
        const discount = Number(item.discount) || 0;
        const taxRate = Number(item.taxRate) || 0;

        const taxable = Math.max(0, (qty * unitPrice) - discount);
        const taxAmount = (item.taxAmount !== undefined && item.taxAmount !== null && item.taxAmount !== '')
          ? Number(item.taxAmount)
          : (taxable * taxRate) / 100;
        const lineTotal = Number(item.lineTotal) || (taxable + taxAmount);

        calculatedSubtotal += (qty * unitPrice);
        calculatedDiscountTotal += discount;
        calculatedTaxTotal += taxAmount;

        sanitizedItems.push({
          productId: item.productId,
          variantId: item.variantId || null,
          variantSku: item.variantSku || '',
          attributes: item.attributes || {},
          itemName: item.itemName || 'Product',
          sku: item.sku || 'SKU',
          uom: item.uom || 'PCS',
          quantity: qty,
          unitPrice,
          discount,
          taxRate,
          taxAmount,
          lineTotal
        });
      }

      if (sanitizedItems.length > 0) {
        updateFields.items = sanitizedItems;
        updateFields.subtotal = Number(rest.subtotal) || calculatedSubtotal;
        updateFields.discountTotal = Number(rest.discountTotal) || calculatedDiscountTotal;
        updateFields.taxTotal = Number(rest.taxTotal) || calculatedTaxTotal;
        const shippingCharges = Number(rest.shippingCharges !== undefined ? rest.shippingCharges : existing.shippingCharges) || 0;
        const otherCharges = Number(rest.otherCharges !== undefined ? rest.otherCharges : existing.otherCharges) || 0;
        const grandTotal = Number(rest.grandTotal) || (updateFields.subtotal - updateFields.discountTotal + updateFields.taxTotal + shippingCharges + otherCharges);
        updateFields.grandTotal = grandTotal;
        updateFields.balanceDue = grandTotal - (existing.amountPaid || 0);
      }
    }

    const updated = await TaxInvoice.findOneAndUpdate(
      { _id: req.params.id, ...filter },
      updateFields,
      { returnDocument: 'after' }
    );
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteTaxInvoice = async (req, res) => {
  try {
    const filter = getReadFilter(req);
    const taxInvoice = await TaxInvoice.findOneAndUpdate(
      { _id: req.params.id, ...filter, status: 'DRAFT' },
      { isActive: false, updatedBy: req.user._id }
    );
    if (!taxInvoice) return res.status(404).json({ message: 'TaxInvoice not found or cannot be deleted in its current state' });
    res.status(200).json({ message: 'TaxInvoice successfully deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

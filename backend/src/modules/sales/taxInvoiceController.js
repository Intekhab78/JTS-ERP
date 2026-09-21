const mongoose = require('mongoose');
const TaxInvoice = require('../../core/models/TaxInvoice');
const Order = require('../../core/models/Order');
const OrderItem = require('../../core/models/OrderItem');
const Customer = require('../../core/models/Customer');
const Counter = require('../../core/models/Counter');

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
    const { orderId } = req.params;
    const { itemsToInvoice, dueDate, notes, termsAndConditions } = req.body;

    const order = await Order.findOne({ _id: orderId, tenantId }).session(session);
    if (!order) throw new Error('Sales Order not found');

    const customer = await Customer.findOne({ _id: order.customerId, tenantId }).session(session);
    if (!customer) throw new Error('Customer not found');

    const orderItems = await OrderItem.find({ orderId: order._id, tenantId }).populate('productId').session(session);
    
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
        itemName: oi.productId.name,
        sku: oi.productId.sku,
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
    const query = { tenantId: req.user.tenantId, isActive: true };
    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      query.branchId = { $in: req.user.branches };
    } else if (!hasWildcard) {
      query.branchId = { $in: [] };
    }
    const taxInvoices = await TaxInvoice.find(query).sort({ createdAt: -1 });
    res.status(200).json(taxInvoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTaxInvoiceById = async (req, res) => {
  try {
    const taxInvoice = await TaxInvoice.findOne({ _id: req.params.id, tenantId: req.user.tenantId, isActive: true });
    if (!taxInvoice) return res.status(404).json({ message: 'TaxInvoice not found' });
    
    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      if (!req.user.branches.includes(taxInvoice.branchId?.toString())) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    } else if (!hasWildcard) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.status(200).json(taxInvoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateTaxInvoiceStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const taxInvoice = await TaxInvoice.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId, isActive: true },
      { status, updatedBy: req.user._id },
      { returnDocument: 'after' }
    );
    if (!taxInvoice) return res.status(404).json({ message: 'TaxInvoice not found' });
    res.status(200).json(taxInvoice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.createTaxInvoice = async (req, res) => {
  try {
    const { items, ...rest } = req.body;
    const invoiceNumber = await generateInvoiceNumber(req.user.tenantId, null);

    const taxInvoice = new TaxInvoice({
      ...rest,
      tenantId: req.user.tenantId,
      branchId: rest.branchId,
      invoiceNumber,
      items,
      createdBy: req.user._id,
      status: 'DRAFT'
    });

    await taxInvoice.save();
    res.status(201).json(taxInvoice);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Error creating manual Tax Invoice' });
  }
};

exports.updateTaxInvoice = async (req, res) => {
  try {
    const existing = await TaxInvoice.findOne({ _id: req.params.id, tenantId: req.user.tenantId, isActive: true });
    if (!existing) return res.status(404).json({ message: 'TaxInvoice not found' });
    if (existing.status !== 'DRAFT') {
      return res.status(403).json({ message: 'Only DRAFT invoices can be edited' });
    }

    const { items, ...rest } = req.body;
    
    // Recalculate totals if items are provided, though frontend usually does it.
    // It's safer to rely on frontend sent totals or calculate here. We'll trust frontend grandTotal for simplicity in this manual flow, matching ProForma.
    const updated = await TaxInvoice.findByIdAndUpdate(
      req.params.id,
      { ...rest, items, updatedBy: req.user._id },
      { returnDocument: 'after' }
    );
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteTaxInvoice = async (req, res) => {
  try {
    const taxInvoice = await TaxInvoice.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId, status: 'DRAFT' },
      { isActive: false, updatedBy: req.user._id }
    );
    if (!taxInvoice) return res.status(404).json({ message: 'TaxInvoice not found or cannot be deleted in its current state' });
    res.status(200).json({ message: 'TaxInvoice successfully deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

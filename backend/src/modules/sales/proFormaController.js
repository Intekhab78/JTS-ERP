const ProFormaInvoice = require('../../core/models/ProFormaInvoice');
const Quote = require('../../core/models/Quote');
const Order = require('../../core/models/Order');
const Customer = require('../../core/models/Customer');
const Counter = require('../../core/models/Counter');
const mongoose = require('mongoose');

const generatePfNumber = async (tenantId) => {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { tenantId, sequenceName: 'PROFORMA', year },
    { $inc: { sequenceValue: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  return `PFI-${year}-${String(counter.sequenceValue).padStart(6, '0')}`;
};

const calculateTotals = (items) => {
  let subtotal = 0;
  let taxTotal = 0;
  let discountTotal = 0;

  items.forEach(item => {
    subtotal += item.quantity * item.unitPrice;
    discountTotal += item.discount || 0;
    taxTotal += item.taxAmount || 0;
  });

  return {
    subtotal,
    taxTotal,
    discountTotal,
    grandTotal: subtotal - discountTotal + taxTotal
  };
};

exports.createProFormaInvoice = async (req, res) => {
  try {
    const { customerId, items, shippingCharges = 0, otherCharges = 0, ...rest } = req.body;
    
    // Fetch customer to build snapshot
    const customer = await Customer.findOne({ _id: customerId, tenantId: req.user.tenantId });
    if (!customer) return res.status(404).json({ message: 'Customer not found in this tenant' });

    const customerSnapshot = {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      billingAddress: customer.billingAddress?.street || '',
      shippingAddress: customer.shippingAddress?.street || ''
    };

    const totals = calculateTotals(items || []);
    const grandTotal = totals.grandTotal + shippingCharges + otherCharges;

    const pfNumber = await generatePfNumber(req.user.tenantId);

    const proForma = await ProFormaInvoice.create({
      ...rest,
      tenantId: req.user.tenantId,
      branchId: req.user.branchId, // Ensure branch is attached
      pfNumber,
      customerId,
      customerSnapshot,
      items: items || [],
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      discountTotal: totals.discountTotal,
      shippingCharges,
      otherCharges,
      grandTotal,
      paymentRequestAmount: grandTotal, // default 100%
      createdBy: req.user._id
    });
    
    res.status(201).json(proForma);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.generateFromQuote = async (req, res) => {
  try {
    const quote = await Quote.findOne({ _id: req.params.quoteId, tenantId: req.user.tenantId });
    if (!quote) return res.status(404).json({ message: 'Quote not found' });
    
    if (!['ACCEPTED', 'CONVERTED'].includes(quote.status)) {
      return res.status(400).json({ message: 'Only ACCEPTED or CONVERTED quotes can be converted to Pro-Forma' });
    }

    const pfNumber = await generatePfNumber(req.user.tenantId);
    
    // Check existing Pro-Formas to calculate remaining balance
    const existingPFs = await ProFormaInvoice.find({ quoteId: quote._id, tenantId: req.user.tenantId, isActive: true, status: { $ne: 'CANCELLED' } });
    
    let totalRequestedPercentage = 0;
    existingPFs.forEach(pf => {
      totalRequestedPercentage += (pf.paymentRequestPercentage || 0);
    });

    if (totalRequestedPercentage >= 100) {
      return res.status(400).json({ message: '100% of this quote has already been billed via Pro-Forma invoices.' });
    }

    const remainingPercentage = 100 - totalRequestedPercentage;
    const defaultAmount = Number((quote.grandTotal * (remainingPercentage / 100)).toFixed(2));
    const billingType = remainingPercentage === 100 ? 'ADVANCE' : 'PROGRESSIVE';

    const proForma = await ProFormaInvoice.create({
      tenantId: req.user.tenantId,
      branchId: quote.branchId || req.user.branchId,
      pfNumber,
      sourceType: 'QUOTE',
      sourceId: quote._id,
      quoteId: quote._id,
      customerId: quote.customerId,
      customerSnapshot: quote.customerSnapshot,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default +30 days
      currency: quote.currency,
      items: quote.items,
      subtotal: quote.subtotal,
      discountTotal: quote.discountTotal,
      taxTotal: quote.taxTotal,
      shippingCharges: quote.shippingCharges,
      otherCharges: quote.otherCharges,
      grandTotal: quote.grandTotal,
      billingType: billingType,
      paymentRequestPercentage: remainingPercentage,
      paymentRequestAmount: defaultAmount,
      paymentTerms: quote.paymentTerms,
      deliveryTerms: quote.deliveryTerms,
      notes: quote.notes,
      termsAndConditions: quote.termsAndConditions,
      createdBy: req.user._id
    });

    res.status(201).json(proForma);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A Pro-Forma Invoice has already been generated from this Quote.' });
    }
    res.status(400).json({ message: error.message });
  }
};

exports.generateFromOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.orderId, tenantId: req.user.tenantId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Ensure order is not CANCELLED
    if (order.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Cannot generate Pro-Forma from a CANCELLED Order' });
    }

    // Attempt to load order items
    const OrderItem = require('../../core/models/OrderItem');
    const orderItems = await OrderItem.find({ orderId: order._id, tenantId: req.user.tenantId });

    // Map orderItems to proFormaItems snapshot
    const items = orderItems.map(oi => ({
      productId: oi.productId,
      itemName: oi.productName || 'Unknown Product',
      sku: oi.sku || 'N/A',
      quantity: oi.quantity,
      unitPrice: oi.price,
      lineTotal: oi.quantity * oi.price
    }));

    const pfNumber = await generatePfNumber(req.user.tenantId);

    const proForma = await ProFormaInvoice.create({
      tenantId: req.user.tenantId,
      branchId: order.branchId || req.user.branchId,
      pfNumber,
      sourceType: 'ORDER',
      sourceId: order._id,
      salesOrderId: order._id,
      customerId: order.customerId,
      customerSnapshot: {
        name: order.customerName,
        billingAddress: order.shippingAddress || '',
        shippingAddress: order.shippingAddress || ''
      },
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: items,
      subtotal: order.totalAmount - order.taxAmount + order.discountAmount,
      discountTotal: order.discountAmount,
      taxTotal: order.taxAmount,
      grandTotal: order.totalAmount,
      paymentRequestAmount: order.totalAmount,
      createdBy: req.user._id
    });

    res.status(201).json(proForma);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A Pro-Forma Invoice has already been generated from this Order.' });
    }
    res.status(400).json({ message: error.message });
  }
};

exports.getProFormaInvoices = async (req, res) => {
  try {
    const query = { tenantId: req.user.tenantId, isActive: true };
    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      query.branchId = { $in: req.user.branches };
    } else if (!hasWildcard) {
      query.branchId = { $in: [] };
    }
    const proFormas = await ProFormaInvoice.find(query).sort({ createdAt: -1 });
    res.status(200).json(proFormas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProFormaInvoiceById = async (req, res) => {
  try {
    const proForma = await ProFormaInvoice.findOne({ _id: req.params.id, tenantId: req.user.tenantId, isActive: true });
    if (!proForma) return res.status(404).json({ message: 'Pro-Forma Invoice not found' });

    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      if (!req.user.branches.includes(proForma.branchId?.toString())) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    } else if (!hasWildcard) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.status(200).json(proForma);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProFormaInvoice = async (req, res) => {
  try {
    const existing = await ProFormaInvoice.findOne({ _id: req.params.id, tenantId: req.user.tenantId, isActive: true });
    if (!existing) return res.status(404).json({ message: 'Pro-Forma Invoice not found' });

    if (existing.status !== 'DRAFT') {
      return res.status(403).json({ message: 'Only DRAFT invoices can be edited' });
    }

    const { items, shippingCharges = 0, otherCharges = 0, ...rest } = req.body;
    let totals = existing;
    if (items) {
      totals = calculateTotals(items);
      rest.items = items;
      rest.subtotal = totals.subtotal;
      rest.taxTotal = totals.taxTotal;
      rest.discountTotal = totals.discountTotal;
      rest.shippingCharges = shippingCharges;
      rest.otherCharges = otherCharges;
      rest.grandTotal = totals.grandTotal + shippingCharges + otherCharges;
    }

    if (existing.sourceType === 'QUOTE' && rest.paymentRequestPercentage !== undefined) {
      const otherPFs = await ProFormaInvoice.find({ 
        quoteId: existing.quoteId, 
        _id: { $ne: existing._id },
        tenantId: req.user.tenantId, 
        isActive: true, 
        status: { $ne: 'CANCELLED' } 
      });
      
      let otherTotal = 0;
      otherPFs.forEach(pf => {
        otherTotal += (pf.paymentRequestPercentage || 0);
      });
      
      if (otherTotal + Number(rest.paymentRequestPercentage) > 100) {
        return res.status(400).json({ message: `Cannot exceed 100%. Other Pro-Formas have already requested ${otherTotal}%. You can only request up to ${100 - otherTotal}%.` });
      }
    }

    const updated = await ProFormaInvoice.findByIdAndUpdate(
      req.params.id,
      { ...rest, updatedBy: req.user._id },
      { returnDocument: 'after' }
    );
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const existing = await ProFormaInvoice.findOne({ _id: req.params.id, tenantId: req.user.tenantId, isActive: true });
    
    if (!existing) return res.status(404).json({ message: 'Pro-Forma Invoice not found' });
    
    existing.status = status;
    existing.updatedBy = req.user._id;
    await existing.save();

    res.status(200).json(existing);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteProFormaInvoice = async (req, res) => {
  try {
    const proForma = await ProFormaInvoice.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { isActive: false, updatedBy: req.user._id }
    );
    if (!proForma) return res.status(404).json({ message: 'Pro-Forma Invoice not found' });
    res.status(200).json({ message: 'Pro-Forma Invoice successfully soft-deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

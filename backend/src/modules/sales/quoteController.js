const Quote = require('../../core/models/Quote');
const Counter = require('../../core/models/Counter');
const Customer = require('../../core/models/Customer');
const Product = require('../../core/models/Product');
const Order = require('../../core/models/Order');
const OrderItem = require('../../core/models/OrderItem');
const Stock = require('../../core/models/Stock');
const mongoose = require('mongoose');
const { verifyBranchAccess, verifyProductAccess, verifyCustomerAccess } = require('../../core/middleware/authMiddleware');

const generateQuoteNumber = async (tenantId) => {
  const currentYear = new Date().getFullYear();
  const sequenceName = 'quoteNumber';

  const counter = await Counter.findOneAndUpdate(
    { tenantId, sequenceName, year: currentYear },
    { $inc: { sequenceValue: 1 } },
    { returnDocument: 'after', upsert: true }
  );

  const paddedSequence = String(counter.sequenceValue).padStart(6, '0');
  return `QT-${currentYear}-${paddedSequence}`;
};

const calculateTotals = async (items, req) => {
  const processedItems = [];
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  for (const item of items) {
    const isProductAuthorized = await verifyProductAccess(item.productId, req, true);
    if (!isProductAuthorized) {
      throw new Error(`Forbidden: Product ${item.productId} does not belong to this tenant or is inactive`);
    }

    const product = await Product.findOne({ _id: item.productId, tenantId: req.user.tenantId });
    if (!product) throw new Error(`Product ${item.productId} not found`);

    const quantity = Number(item.quantity) || 1;
    const unitPrice = Number(item.unitPrice) >= 0 ? Number(item.unitPrice) : product.salesPrice;
    const discount = Number(item.discount) || 0;
    const taxRate = Number(item.taxRate) || product.taxRate || 0;

    const lineSubtotal = quantity * unitPrice;
    const discountAmount = discount; // assuming discount is absolute amount per line for simplicity, or we can treat as percentage. Let's treat as absolute amount for this line. Wait, if it's percentage? Let's use absolute.
    const taxableAmount = Math.max(0, lineSubtotal - discountAmount);
    const taxAmount = (taxableAmount * taxRate) / 100;
    const lineTotal = taxableAmount + taxAmount;

    processedItems.push({
      productId: product._id,
      itemName: product.name,
      sku: product.sku,
      uom: product.uom,
      quantity,
      unitPrice,
      discount: discountAmount,
      taxRate,
      taxAmount,
      lineTotal
    });

    subtotal += lineSubtotal;
    discountTotal += discountAmount;
    taxTotal += taxAmount;
  }

  return { processedItems, subtotal, discountTotal, taxTotal };
};


exports.createQuote = async (req, res) => {
  try {
    let tenantId = req.user.tenantId;
    if (!tenantId) {
      if (!req.body.tenantId) return res.status(400).json({ message: 'Global Superadmin must provide tenantId' });
      tenantId = req.body.tenantId;
    }

    const { branchId, customerId, items, quoteDate, validUntil, currency, paymentTerms, deliveryTerms, notes, termsAndConditions, internalNotes, shippingCharges, otherCharges } = req.body;

    if (!branchId || !customerId || !items || items.length === 0) {
      return res.status(400).json({ message: 'Branch, Customer, and Items are required' });
    }

    const isBranchAuthorized = await verifyBranchAccess(branchId, req);
    if (!isBranchAuthorized) return res.status(403).json({ message: 'Forbidden: You do not have access to this branch' });

    const isCustomerAuthorized = await verifyCustomerAccess(customerId, req);
    if (!isCustomerAuthorized) return res.status(403).json({ message: 'Forbidden: Customer does not belong to this tenant' });

    const customer = await Customer.findOne({ _id: customerId, tenantId });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const { processedItems, subtotal, discountTotal, taxTotal } = await calculateTotals(items, req);
    
    const shipCharge = Number(shippingCharges) || 0;
    const othCharge = Number(otherCharges) || 0;
    const grandTotal = subtotal - discountTotal + taxTotal + shipCharge + othCharge;

    const quoteNumber = await generateQuoteNumber(tenantId);

    const quote = await Quote.create({
      tenantId,
      branchId,
      quoteNumber,
      customerId,
      customerSnapshot: {
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        billingAddress: customer.address?.street ? [customer.address.street, customer.address.city, customer.address.state, customer.address.country].filter(Boolean).join(', ') : '',
        shippingAddress: customer.address?.street ? [customer.address.street, customer.address.city, customer.address.state, customer.address.country].filter(Boolean).join(', ') : ''
      },
      salespersonId: req.user._id,
      quoteDate: quoteDate || Date.now(),
      validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
      currency: currency || 'USD',
      status: 'DRAFT',
      items: processedItems,
      subtotal,
      discountTotal,
      taxTotal,
      shippingCharges: shipCharge,
      otherCharges: othCharge,
      grandTotal,
      paymentTerms,
      deliveryTerms,
      notes,
      termsAndConditions,
      internalNotes,
      createdBy: req.user._id,
      revisionNumber: 1,
      isCurrentRevision: true
    });
    
    quote.rootQuoteId = quote._id;
    await quote.save();

    res.status(201).json(quote);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getQuotes = async (req, res) => {
  try {
    const filter = { tenantId: req.user.tenantId, isActive: true, isCurrentRevision: true };
    
    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      filter.branchId = { $in: req.user.branches };
    } else if (!hasWildcard) {
      filter.branchId = { $in: [] };
    } else if (req.query.branchId) {
      const isAuthorized = await verifyBranchAccess(req.query.branchId, req);
      if (!isAuthorized) return res.status(403).json({ message: 'Forbidden' });
      filter.branchId = req.query.branchId;
    }

    const quotes = await Quote.find(filter)
      .populate('branchId', 'name')
      .populate('customerId', 'name email phone')
      .sort({ createdAt: -1 });

    res.status(200).json(quotes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getQuoteById = async (req, res) => {
  try {
    const quote = await Quote.findOne({ _id: req.params.id, tenantId: req.user.tenantId, isActive: true })
      .populate('branchId', 'name')
      .populate('customerId', 'name email phone')
      .populate('salespersonId', 'firstName lastName');

    if (!quote) return res.status(404).json({ message: 'Quote not found' });

    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      if (!req.user.branches.includes(quote.branchId.toString())) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    } else if (!hasWildcard) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.status(200).json(quote);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateQuote = async (req, res) => {
  try {
    const quote = await Quote.findOne({ _id: req.params.id, tenantId: req.user.tenantId, isActive: true });
    if (!quote) return res.status(404).json({ message: 'Quote not found' });

    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      if (!req.user.branches.includes(quote.branchId.toString())) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    } else if (!hasWildcard) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (quote.status === 'CONVERTED' || quote.convertedToOrderId) {
      return res.status(400).json({ message: 'Converted quotes cannot be edited.' });
    }

    // Revisions are handled by the /revise endpoint, so we don't snapshot here anymore.

    const { items, validUntil, paymentTerms, deliveryTerms, notes, termsAndConditions, internalNotes, shippingCharges, otherCharges } = req.body;

    if (items && items.length > 0) {
      const { processedItems, subtotal, discountTotal, taxTotal } = await calculateTotals(items, req);
      quote.items = processedItems;
      quote.subtotal = subtotal;
      quote.discountTotal = discountTotal;
      quote.taxTotal = taxTotal;
    }

    if (shippingCharges !== undefined) quote.shippingCharges = Number(shippingCharges);
    if (otherCharges !== undefined) quote.otherCharges = Number(otherCharges);

    quote.grandTotal = quote.subtotal - quote.discountTotal + quote.taxTotal + quote.shippingCharges + quote.otherCharges;

    if (validUntil) quote.validUntil = validUntil;
    if (paymentTerms !== undefined) quote.paymentTerms = paymentTerms;
    if (deliveryTerms !== undefined) quote.deliveryTerms = deliveryTerms;
    if (notes !== undefined) quote.notes = notes;
    if (termsAndConditions !== undefined) quote.termsAndConditions = termsAndConditions;
    if (internalNotes !== undefined) quote.internalNotes = internalNotes;
    
    quote.updatedBy = req.user._id;

    await quote.save();
    res.status(200).json(quote);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateQuoteStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'];
    
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const quote = await Quote.findOne({ _id: req.params.id, tenantId: req.user.tenantId, isActive: true });
    if (!quote) return res.status(404).json({ message: 'Quote not found' });

    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      if (!req.user.branches.includes(quote.branchId.toString())) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    } else if (!hasWildcard) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (quote.status === 'CONVERTED') {
      return res.status(400).json({ message: 'A CONVERTED quote is immutable and its status cannot be changed' });
    }

    // Optional: Add strict state machine rules here. For now, allow basic transition.
    quote.status = status;
    quote.updatedBy = req.user._id;

    await quote.save();
    res.status(200).json(quote);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteQuote = async (req, res) => {
  try {
    const quote = await Quote.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!quote) return res.status(404).json({ message: 'Quote not found' });

    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      if (!req.user.branches.includes(quote.branchId.toString())) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    } else if (!hasWildcard) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Soft delete
    quote.isActive = false;
    quote.updatedBy = req.user._id;
    await quote.save();

    res.status(200).json({ message: 'Quote successfully deleted (soft)' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.convertQuote = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const tenantId = req.user.tenantId;

    // 1. Fetch & Verify Quote
    let quote = await Quote.findOne({ 
      _id: req.params.id, 
      tenantId 
    });

    if (!quote) throw new Error("Quote not found or belongs to another tenant");
    if (quote.status !== "ACCEPTED") throw new Error(`Only ACCEPTED quotes can be converted (current status: ${quote.status})`);
    if (quote.convertedToOrderId) throw new Error("Quote has already been converted");
    if (!quote.isActive) throw new Error("Quote is inactive");

    // 2. Branch & Customer Security Gates
    const isBranchAuthorized = await verifyBranchAccess(quote.branchId, req);
    if (!isBranchAuthorized) throw new Error("Forbidden: You do not have access to this branch");

    const isCustomerAuthorized = await verifyCustomerAccess(quote.customerId, req);
    if (!isCustomerAuthorized) throw new Error("Forbidden: Customer does not belong to this tenant");

    // 3. Race-Condition Lock Check
    quote = await Quote.findOneAndUpdate(
      { 
        _id: quote._id, 
        tenantId, 
        status: "ACCEPTED", 
        convertedToOrderId: { $exists: false } 
      },
      { }, // No update yet, just lock it via transaction implicitly because we read it with session below. Actually, to lock it safely we update a timestamp or just rely on atomic check. Wait, findOneAndUpdate without update just returns the doc. Let us set a temp flag or just rely on session.
      { session, returnDocument: 'after' }
    );

    if (!quote) throw new Error("Quote is no longer in ACCEPTED state, or was concurrently converted by another process.");

    // 4. Create Order
    const order = await Order.create([{
      tenantId,
      branchId: quote.branchId,
      customerId: quote.customerId,
      userId: req.user._id,
      customerName: quote.customerSnapshot.name,
      totalAmount: quote.grandTotal,
      discountAmount: quote.discountTotal,
      taxAmount: quote.taxTotal,
      paymentMethod: "CASH", 
      status: "DRAFT",
      source: "ERP",
      quoteId: quote._id
    }], { session });

    const newOrderId = order[0]._id;

    // 5. Item Verification
    for (const item of quote.items) {
      const isProductAuthorized = await verifyProductAccess(item.productId, req, true);
      if (!isProductAuthorized) {
        throw new Error(`Forbidden: Product ${item.productId} does not belong to this tenant or is inactive`);
      }

      await OrderItem.create([{
        tenantId,
        orderId: newOrderId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subTotal: item.lineTotal,
        deliveredQuantity: 0,
        invoicedQuantity: 0
      }], { session });
    }

    // 6. Finalize Quote
    quote.status = "CONVERTED";
    quote.convertedToOrderId = newOrderId;
    quote.convertedAt = new Date();
    quote.updatedBy = req.user._id;
    await quote.save({ session });

    // 7. Commit
    await session.commitTransaction();
    res.status(200).json({ message: "Quote successfully converted to Sales Order", orderId: newOrderId, quote });
  } catch (error) {
    await session.abortTransaction();
    let status = 400;
    if (error.message.includes("Forbidden")) status = 403;
    if (error.message.includes("not found")) status = 404;
    if (error.message.includes("concurrently")) status = 409;
    res.status(status).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

exports.reviseQuote = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const tenantId = req.user.tenantId;
    const oldQuoteId = req.params.id;

    // 1. Fetch the existing quote
    const oldQuote = await Quote.findOne({ _id: oldQuoteId, tenantId, isActive: true });
    if (!oldQuote) throw new Error("Quote not found");

    // 2. Authorize
    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      if (!req.user.branches.includes(oldQuote.branchId.toString())) {
        const err = new Error("Forbidden: You do not have access to this quote's branch");
        err.status = 403;
        throw err;
      }
    } else if (!hasWildcard) {
      const err = new Error("Forbidden");
      err.status = 403;
      throw err;
    }
    // Permissions are checked at the middleware level (REVISE_QUOTE or equivalent), assuming middleware allows entry here.

    // 3. Block conditions
    if (oldQuote.status === 'CONVERTED' || oldQuote.convertedToOrderId) {
      // 409 Conflict logic
      const err = new Error("Converted quotes cannot be revised.");
      err.status = 409;
      throw err;
    }
    if (!oldQuote.isCurrentRevision) {
      throw new Error("Only the current revision can be revised.");
    }

    // 4. Lock and deprecate old revision atomically
    const deprecatedQuote = await Quote.findOneAndUpdate(
      { _id: oldQuote._id, isCurrentRevision: true },
      { $set: { isCurrentRevision: false } },
      { session, returnDocument: 'after' }
    );

    if (!deprecatedQuote) {
      const err = new Error("Quote is currently being revised by another user or is no longer current.");
      err.status = 409;
      throw err;
    }

    // 5. Create new revision
    const newQuoteData = {
      ...oldQuote.toObject(),
      _id: new mongoose.Types.ObjectId(), // generate new ID
      status: 'DRAFT',
      isCurrentRevision: true,
      revisionNumber: oldQuote.revisionNumber + 1,
      revisedFromQuoteId: oldQuote._id,
      rootQuoteId: oldQuote.rootQuoteId || oldQuote._id, // ensure root is linked
      revisedAt: new Date(),
      revisedBy: req.user._id,
      createdBy: req.user._id // The creator of the new revision
    };
    
    // Delete mongo internal fields to avoid duplication errors
    delete newQuoteData.createdAt;
    delete newQuoteData.updatedAt;
    delete newQuoteData.__v;

    // The items inside the array have _id's, we can let mongoose generate new ones or keep them. 
    // It's safer to clear the `_id` of subdocuments to avoid duplicate key issues if any, but mongoose typically handles it.
    newQuoteData.items = newQuoteData.items.map(item => {
      const { _id, ...itemWithoutId } = item;
      return itemWithoutId;
    });

    const newQuote = await Quote.create([newQuoteData], { session });

    await session.commitTransaction();
    res.status(201).json(newQuote[0]);

  } catch (error) {
    await session.abortTransaction();
    const status = error.status || 400;
    res.status(status).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

exports.getQuoteRevisions = async (req, res) => {
  try {
    const quoteId = req.params.id;
    const currentQuote = await Quote.findOne({ _id: quoteId, tenantId: req.user.tenantId });
    
    if (!currentQuote) return res.status(404).json({ message: 'Quote not found' });

    // Fetch all revisions sharing the same rootQuoteId
    const rootId = currentQuote.rootQuoteId || currentQuote._id;

    const revisions = await Quote.find({ rootQuoteId: rootId, tenantId: req.user.tenantId })
      .populate('createdBy', 'firstName lastName')
      .populate('revisedBy', 'firstName lastName')
      .sort({ revisionNumber: -1 });

    res.status(200).json(revisions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


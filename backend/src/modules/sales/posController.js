const mongoose = require('mongoose');
const POSOrder = require('../../core/models/POSOrder');
const POSPayment = require('../../core/models/POSPayment');
const POSSession = require('../../core/models/POSSession');
const POSReturn = require('../../core/models/POSReturn');
const Stock = require('../../core/models/Stock');
const StockMovement = require('../../core/models/StockMovement');
const Counter = require('../../core/models/Counter');
const Product = require('../../core/models/Product');
const TaxInvoice = require('../../core/models/TaxInvoice');
const Customer = require('../../core/models/Customer');
const Company = require('../../core/models/Company');
const { verifyBranchAccess, verifyProductAccess, verifyPOSOverrideToken } = require('../../core/middleware/authMiddleware');
const auditService = require('../audit/auditService');
const { getPOSSessionForCashier } = require('./posSessionController');

const generateReceiptNumber = async (tenantId, session) => {
  const currentYear = new Date().getFullYear();
  const counterId = `POS_${currentYear}`;
  
  const counter = await Counter.findOneAndUpdate(
    { tenantId, sequenceName: counterId, year: currentYear },
    { $inc: { sequenceValue: 1 } },
    { returnDocument: 'after', upsert: true, session }
  );

  const seqStr = String(counter.sequenceValue).padStart(6, '0');
  return `POS-${currentYear}-${seqStr}`;
};

// @desc    Create a new POS order
// @route   POST /api/v1/pos/orders
// @access  Private
exports.createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      branchId, 
      locationId,
      customerId, 
      customerName, 
      items, 
      payments, 
      discountAmount, 
      taxAmount,
      totalAmount,
      currency,
      idempotencyKey,
      discountOverrideToken,
      priceOverrideToken
    } = req.body;
    
    if (!branchId) {
      throw new Error('Branch ID is required for a POS sale');
    }

    const isAuthorized = await verifyBranchAccess(branchId, req);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this branch' });
    }

    // 1. Verify Active Session — policy-aware (supports both SINGLE and MULTIPLE cashier modes)
    const posSession = await getPOSSessionForCashier(req, { branchId });

    if (!posSession) {
      throw new Error('No active POS session found for this user. Please open a session first.');
    }

    if (posSession.branchId.toString() !== branchId.toString()) {
      throw new Error(`Your active session is for a different branch. Please select the correct branch or close the session.`);
    }

    if (!items || items.length === 0) {
      throw new Error('No items in the cart');
    }

    if (!payments || payments.length === 0) {
      throw new Error('No payments provided');
    }

    if (idempotencyKey) {
      if (typeof idempotencyKey !== 'string' || idempotencyKey.trim().length === 0 || idempotencyKey.length > 100) {
        throw new Error('Invalid idempotency key format');
      }
    }

    // 2. Validate Items and Calculate Server-Side Totals
    let serverTotalAmount = 0;
    let serverTaxAmount = 0;
    let totalSubtotalWithoutDiscount = 0;
    let totalItemDiscount = 0;
    const validatedItems = [];
    const auditEvents = [];

    const company = await Company.findOne({ _id: req.user.tenantId }).session(session);
    const posMaxDiscountLimit = company?.settings?.posMaxDiscountLimit ?? 10;
    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    const hasPriceOverridePerm = hasWildcard || req.user.roleId?.permissions?.includes('OVERRIDE_POS_PRICE');
    const hasDiscountOverridePerm = hasWildcard || req.user.roleId?.permissions?.includes('OVERRIDE_POS_DISCOUNT');

    let priceOverrideValidated = false;
    let priceManagerId = null;

    let discountOverrideValidated = false;
    let discountManagerId = null;

    for (const item of items) {
      const isProductAuthorized = await verifyProductAccess(item.productId, req, true);
      if (!isProductAuthorized) {
        throw new Error(`Forbidden: Product ${item.productId} does not belong to this tenant or is inactive`);
      }

      if (item.quantity <= 0) {
        throw new Error(`Invalid quantity for product ${item.productId}`);
      }

      // Fetch authoritative product and tax configuration
      const product = await Product.findOne({ 
        _id: item.productId, 
        tenantId: req.user.tenantId 
      }).populate('tax1');

      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      let authPrice = product.price || product.salesPrice || 0;
      let finalUnitPrice = authPrice;
      
      // Price Override Logic
      if (item.overriddenPrice !== undefined && item.overriddenPrice !== null && Number(item.overriddenPrice) !== authPrice) {
        const reqPrice = Number(item.overriddenPrice);
        if (isNaN(reqPrice) || !isFinite(reqPrice) || reqPrice < 0) {
          throw new Error(`Invalid overridden price for product ${product.name}`);
        }
        
        if (!hasPriceOverridePerm) {
          if (!priceOverrideToken) {
            throw new Error(`Price override requires manager authorization for product ${product.name}`);
          }
          if (!priceOverrideValidated) {
            const decoded = verifyPOSOverrideToken(priceOverrideToken, 'OVERRIDE_POS_PRICE', req);
            priceManagerId = decoded.managerId;
            priceOverrideValidated = true;
          }
        }
        finalUnitPrice = reqPrice;
        
        auditEvents.push({
          action: 'PRICE_OVERRIDE',
          entityType: 'POSOrder',
          metadata: {
            productId: item.productId,
            originalPrice: authPrice,
            overriddenPrice: reqPrice,
            managerId: priceManagerId || req.user._id,
            overrideAction: 'OVERRIDE_POS_PRICE'
          }
        });
      }

      const subtotal = item.quantity * finalUnitPrice;
      const lineDiscount = Number(item.discount) || 0;
      
      if (typeof lineDiscount !== 'number' || isNaN(lineDiscount) || !isFinite(lineDiscount)) {
        throw new Error(`Invalid discount for product ${item.productId}`);
      }
      if (lineDiscount < 0) {
        throw new Error(`Discount cannot be negative for product ${item.productId}`);
      }
      if (lineDiscount > subtotal) {
        throw new Error(`Discount cannot exceed subtotal for product ${item.productId}`);
      }

      const taxableAmount = subtotal - lineDiscount;
      
      let lineTax = 0;
      let appliedTaxRate = 0;

      if (product.tax1) {
        if (product.tax1.tenantId.toString() !== req.user.tenantId.toString()) {
           throw new Error(`Forbidden: Tax configuration belongs to another tenant`);
        }
        if (!product.tax1.isActive) {
           throw new Error(`Product tax configuration is inactive. Please update the tax configuration before checkout.`);
        }
        appliedTaxRate = product.tax1.rate;
        if (product.tax1.type === 'Fixed') {
          lineTax = product.tax1.rate * item.quantity;
        } else {
          lineTax = taxableAmount * (product.tax1.rate / 100);
        }
      } else {
        appliedTaxRate = product.taxRate || 0;
        lineTax = taxableAmount * (appliedTaxRate / 100);
      }

      const total = taxableAmount + lineTax;

      if (!isFinite(subtotal) || !isFinite(lineDiscount) || !isFinite(taxableAmount) || !isFinite(lineTax) || !isFinite(total)) {
         throw new Error(`Invalid monetary calculation for product ${item.productId}`);
      }

      validatedItems.push({
        productId: item.productId,
        productName: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unitPrice: finalUnitPrice,
        discount: lineDiscount,
        tax: lineTax,
        taxRate: appliedTaxRate,
        subtotal,
        total
      });

      totalSubtotalWithoutDiscount += subtotal;
      totalItemDiscount += lineDiscount;
      serverTotalAmount += total;
      serverTaxAmount += lineTax;
    }
    
    serverTotalAmount = serverTotalAmount - (discountAmount || 0);
    
    if (!isFinite(serverTotalAmount) || serverTotalAmount < 0) {
       throw new Error(`Invalid server total amount calculated`);
    }

    // Discount Override Logic
    const totalOrderDiscount = totalItemDiscount + (discountAmount || 0);
    if (totalSubtotalWithoutDiscount > 0) {
      const discountPercentage = (totalOrderDiscount / totalSubtotalWithoutDiscount) * 100;
      if (discountPercentage > posMaxDiscountLimit) {
        if (!hasDiscountOverridePerm) {
          if (!discountOverrideToken) {
            throw new Error(`Discount of ${discountPercentage.toFixed(2)}% exceeds limit of ${posMaxDiscountLimit}%. Manager authorization required.`);
          }
          if (!discountOverrideValidated) {
            const decoded = verifyPOSOverrideToken(discountOverrideToken, 'OVERRIDE_POS_DISCOUNT', req);
            discountManagerId = decoded.managerId;
            discountOverrideValidated = true;
          }
        }
        
        auditEvents.push({
          action: 'DISCOUNT_OVERRIDE',
          entityType: 'POSOrder',
          metadata: {
            maxDiscountLimit: posMaxDiscountLimit,
            actualDiscountPercentage: discountPercentage.toFixed(2),
            originalDiscount: 0,
            orderDiscount: discountAmount || 0,
            lineDiscount: totalItemDiscount,
            managerId: discountManagerId || req.user._id,
            overrideAction: 'OVERRIDE_POS_DISCOUNT'
          }
        });
      }
    }

    // Use an epsilon for float comparison against client's total
    if (Math.abs(serverTotalAmount - totalAmount) > 0.01) {
       throw new Error(`Total amount mismatch. Server calculated: ${serverTotalAmount}, Client sent: ${totalAmount}. Order total changed. Please review the cart and try again.`);
    }

    // 3. Validate Payments
    let totalPaid = 0;
    for (const payment of payments) {
      if (typeof payment.amount !== 'number' || isNaN(payment.amount) || !isFinite(payment.amount) || payment.amount <= 0) {
        throw new Error('Payment amount must be a valid positive number');
      }
      
      if (payment.method === 'CASH') {
        const cashTendered = payment.cashTendered !== undefined ? Number(payment.cashTendered) : payment.amount;
        
        if (typeof cashTendered !== 'number' || isNaN(cashTendered) || !isFinite(cashTendered)) {
          throw new Error('Cash tendered must be a valid finite number');
        }
        if (cashTendered < 0) {
          throw new Error('Cash tendered cannot be negative');
        }
        if (cashTendered < payment.amount) {
          throw new Error('Insufficient cash tendered');
        }
        
        // Backend recalculates authoritative change due
        payment.serverChangeDue = cashTendered - payment.amount;
        payment.cashTendered = cashTendered;
      }
      
      totalPaid += payment.amount;
    }

    if (Math.abs(totalPaid - serverTotalAmount) > 0.01) {
      throw new Error(`Payment mismatch. Total paid: ${totalPaid}, Order total: ${serverTotalAmount}`);
    }

    // 4. Generate Receipt Number
    const receiptNumber = await generateReceiptNumber(req.user.tenantId, session);

    // 5. Create POSOrder
    const [order] = await POSOrder.create([{
      tenantId: req.user.tenantId,
      branchId,
      locationId: locationId || undefined,
      sessionId: posSession._id,
      registerId: posSession.registerId,
      receiptNumber,
      customerId: customerId || undefined,
      customerName: customerName || 'Walk-in Customer',
      items: validatedItems,
      discountAmount: discountAmount || 0,
      taxAmount: serverTaxAmount,
      totalAmount: serverTotalAmount,
      currency,
      idempotencyKey: idempotencyKey ? idempotencyKey.trim() : undefined,
      status: 'PAID',
      createdBy: req.user._id
    }], { session });

    // 6. Create POSPayments
    const paymentDocs = payments.map(p => {
      const doc = {
        tenantId: req.user.tenantId,
        branchId,
        posOrderId: order._id,
        sessionId: posSession._id,
        method: p.method,
        amount: p.amount,
        reference: p.reference,
        currency,
        createdBy: req.user._id
      };
      
      if (p.method === 'CASH') {
        doc.cashTendered = p.cashTendered;
        doc.changeDue = p.serverChangeDue;
      }
      
      return doc;
    });
    
    await POSPayment.insertMany(paymentDocs, { session });

    // 7. Deduct Stock and Create StockMovement
    for (const item of validatedItems) {
      const stock = await Stock.findOne({
        tenantId: req.user.tenantId,
        branchId,
        productId: item.productId
      }).session(session);

      if (!stock || stock.quantity < item.quantity) {
        throw new Error(`Insufficient stock for product ${item.productName} (SKU: ${item.sku}) at this branch`);
      }

      stock.quantity -= item.quantity;
      await stock.save({ session });

      await StockMovement.create([{
        tenantId: req.user.tenantId,
        branchId,
        productId: item.productId,
        type: 'DELIVERY',
        quantity: item.quantity,
        referenceType: 'POS_ORDER',
        referenceId: order._id,
        notes: `POS Sale - Receipt ${receiptNumber}`,
        createdBy: req.user._id
      }], { session });
    }

    // 8. Create TaxInvoice
    let actualCustomerId = customerId;
    let actualCustomerName = customerName || 'Walk-in Customer';
    let customerSnapshot = {
      name: actualCustomerName,
      email: '',
      phone: '',
      billingAddress: '',
      taxRegistrationNumber: ''
    };
    
    if (actualCustomerId) {
       const customer = await Customer.findOne({ _id: actualCustomerId, tenantId: req.user.tenantId }).session(session);
       if (!customer) throw new Error('Customer not found for TaxInvoice');
       actualCustomerName = customer.name;
       customerSnapshot = {
         name: customer.name,
         email: customer.email || '',
         phone: customer.phone || '',
         billingAddress: customer.billingAddress?.street ? `${customer.billingAddress.street}, ${customer.billingAddress.city}` : '',
         taxRegistrationNumber: customer.taxId || ''
       };
    } else {
       // Safely handle Walk-in Customer per tenant
       let walkInCustomer = await Customer.findOne({ tenantId: req.user.tenantId, name: 'Walk-in Customer' }).session(session);
       if (!walkInCustomer) {
         const newWalkIn = new Customer({
           tenantId: req.user.tenantId,
           name: 'Walk-in Customer',
           customerType: 'Person',
           customerGroup: 'RETAIL'
         });
         await newWalkIn.save({ session });
         walkInCustomer = newWalkIn;
       }
       actualCustomerId = walkInCustomer._id;
    }
    
    // Generate Invoice Number safely within the transaction
    const currentYear = new Date().getFullYear();
    const invoiceCounterId = `TAX_INVOICE_${currentYear}`;
    const invoiceCounter = await Counter.findOneAndUpdate(
      { tenantId: req.user.tenantId, sequenceName: invoiceCounterId, year: currentYear },
      { $inc: { sequenceValue: 1 } },
      { returnDocument: 'after', upsert: true, session }
    );
    const invoiceSeqStr = String(invoiceCounter.sequenceValue).padStart(6, '0');
    const invoiceNumber = `INV-${currentYear}-${invoiceSeqStr}`;
    
    // Map POS items to TaxInvoice items ensuring authoritative preservation
    const invoiceItems = validatedItems.map(item => ({
      productId: item.productId,
      itemName: item.productName,
      sku: item.sku,
      uom: 'PCS',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      taxRate: item.taxRate,
      taxAmount: item.tax,
      lineTotal: (item.quantity * item.unitPrice) - item.discount + item.tax
    }));
    
    const taxInvoice = new TaxInvoice({
      tenantId: req.user.tenantId,
      branchId,
      invoiceNumber,
      orderId: order._id,
      customerId: actualCustomerId,
      customerSnapshot,
      salespersonId: req.user._id,
      issueDate: new Date(),
      dueDate: new Date(),
      status: 'PAID_FULL',
      items: invoiceItems,
      subtotal: validatedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
      discountTotal: discountAmount || 0,
      taxTotal: serverTaxAmount,
      grandTotal: serverTotalAmount,
      amountPaid: serverTotalAmount,
      balanceDue: 0,
      currency,
      createdBy: req.user._id
    });
    
    // Safety check - Invoice must mathematically exactly match POSOrder
    if (Math.abs(taxInvoice.grandTotal - order.totalAmount) > 0.01) {
      throw new Error('Fatal: TaxInvoice grandTotal does not match POSOrder totalAmount');
    }
    
    await taxInvoice.save({ session });
    
    // Link Invoice back to POSOrder
    order.invoiceId = taxInvoice._id;
    await order.save({ session });

    await auditService.logAuditEventTx(req, {
      action: 'POS_ORDER_CREATE',
      entityType: 'POSOrder',
      entityId: order._id,
      branchId: branchId,
      registerId: posSession.registerId,
      sessionId: posSession._id,
      metadata: { 
        total: order.totalAmount, 
        paymentMethods: payments.map(p => p.method),
        idempotencyKey 
      }
    }, session);

    for (const evt of auditEvents) {
      evt.entityId = order._id;
      evt.branchId = branchId;
      evt.registerId = posSession.registerId;
      evt.sessionId = posSession._id;
      await auditService.logAuditEventTx(req, evt, session);
    }

    await session.commitTransaction();
    res.status(201).json(order);
  } catch (error) {
    await session.abortTransaction();
    
    // Handle Idempotency Key Duplicate Error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.idempotencyKey) {
      try {
        const existingOrder = await POSOrder.findOne({ 
          tenantId: req.user.tenantId, 
          idempotencyKey: req.body.idempotencyKey.trim() 
        });
        
        if (existingOrder) {
          // Verify this is actually the same sale attempt by checking the total
          if (Math.abs(existingOrder.totalAmount - (req.body.totalAmount || 0)) > 0.01) {
            return res.status(409).json({ message: 'Conflict: An order with this idempotency key exists but the order data differs.' });
          }
          // Return the already created order
          return res.status(200).json(existingOrder);
        }
      } catch (findErr) {
        console.error('Error recovering idempotent order:', findErr);
      }
      return res.status(409).json({ message: 'Transaction is already being processed.' });
    }

    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Get all POS orders for a branch
// @route   GET /api/v1/pos/orders
// @access  Private
exports.getOrders = async (req, res) => {
  try {
    const filter = { tenantId: req.user.tenantId };
    
    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';

    if (req.user.branches && req.user.branches.length > 0) {
      filter.branchId = { $in: req.user.branches };
    } else if (!hasWildcard) {
      filter.branchId = { $in: [] };
    }

    if (req.query.branchId) {
      // If a specific branch is requested, further restrict it
      if (filter.branchId) {
        if (!req.user.branches?.includes(req.query.branchId) && !hasWildcard) {
          return res.status(403).json({ message: 'Forbidden: You do not have access to this branch' });
        }
      }
      filter.branchId = req.query.branchId;
    }

    const orders = await POSOrder.find(filter)
      .populate('branchId', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('customerId', 'name')
      .populate('registerId', 'name code')
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get POS order details
// @route   GET /api/v1/pos/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
  try {
    const order = await POSOrder.findOne({ _id: req.params.id, tenantId: req.user.tenantId })
      .populate('branchId', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('customerId', 'name email phone address')
      .populate('registerId', 'name code');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      if (!req.user.branches.includes(order.branchId._id.toString())) {
        return res.status(403).json({ message: 'Forbidden: You do not have access to this branch' });
      }
    } else if (!hasWildcard) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to any branch' });
    }

    const payments = await POSPayment.find({ posOrderId: order._id, tenantId: req.user.tenantId });
    const returns = await POSReturn.find({ originalOrderId: order._id, tenantId: req.user.tenantId })
      .populate('createdBy', 'firstName lastName')
      .populate('returnItems.productId', 'name sku')
      .sort({ createdAt: -1 });

    res.status(200).json({ order, payments, returns });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get POS Returns
// @route   GET /api/v1/pos/returns
// @access  Private
exports.getReturns = async (req, res) => {
  try {
    const filter = { tenantId: req.user.tenantId };
    
    // Check branch access permissions
    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (!hasWildcard) {
      if (!req.user.branches || req.user.branches.length === 0) {
        return res.status(403).json({ message: 'Forbidden: You do not have access to any branch' });
      }
      filter.branchId = { $in: req.user.branches };
    }

    if (req.query.branchId) {
      if (!hasWildcard && !req.user.branches.includes(req.query.branchId)) {
        return res.status(403).json({ message: 'Forbidden: You do not have access to this branch' });
      }
      filter.branchId = req.query.branchId;
    }

    const returns = await POSReturn.find(filter)
      .populate('branchId', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('originalOrderId', 'receiptNumber customerName')
      .sort({ createdAt: -1 });

    res.status(200).json(returns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Process a POS Return
// @route   POST /api/v1/pos/returns
// @access  Private
exports.createReturn = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { originalOrderId, returnItems, refundMethod, refundAllocations, reason, idempotencyKey, overrideToken } = req.body;

    // Check permissions
    const perms = req.user.roleId?.permissions || req.user.permissions || [];
    const hasPermission = perms.includes('*') || perms.includes('CREATE_POS_RETURNS') || req.user.roleId?.name === 'TENANT ADMIN' || req.user.roleId?.name === 'admin';
    let returnManagerId = null;

    if (!hasPermission) {
      if (!overrideToken) {
        await session.abortTransaction();
        session.endSession();
        return res.status(403).json({
          success: false,
          requiresOverride: true,
          requestedAction: 'OVERRIDE_POS_RETURN',
          message: 'Manager approval required'
        });
      }
      
      const decoded = verifyPOSOverrideToken(overrideToken, 'OVERRIDE_POS_RETURN', req);
      returnManagerId = decoded.id || decoded.managerId;
    }

    if (idempotencyKey) {
      const existingReturn = await POSReturn.findOne({
        tenantId: req.user.tenantId,
        idempotencyKey: idempotencyKey.trim()
      });
      if (existingReturn) {
        await session.abortTransaction();
        session.endSession();
        return res.status(200).json(existingReturn);
      }
    }

    const originalOrder = await POSOrder.findOne({ _id: originalOrderId, tenantId: req.user.tenantId }).session(session);
    if (!originalOrder) {
      throw new Error('Original order not found');
    }

    if (originalOrder.status === 'VOIDED' || originalOrder.status === 'CANCELLED') {
      throw new Error('Cannot return a voided or cancelled order');
    }

    if (req.user.branchId && originalOrder.branchId.toString() !== req.user.branchId.toString()) {
      throw new Error('Forbidden: You do not have access to this branch');
    }

    // Verify Active Session — policy-aware (supports both SINGLE and MULTIPLE cashier modes)
    const posSession = await getPOSSessionForCashier(req, { branchId: originalOrder.branchId });

    if (!posSession) {
      throw new Error('No active POS session found. Please open a session before processing returns.');
    }

    let totalRefundAmount = 0;
    const validatedReturnItems = [];

    // Find previous returns for this order to validate return quantities
    const previousReturns = await POSReturn.find({ originalOrderId: originalOrder._id, tenantId: req.user.tenantId }).session(session);
    const returnedQtys = {};
    for (const pr of previousReturns) {
      for (const item of pr.returnItems) {
        returnedQtys[item.productId.toString()] = (returnedQtys[item.productId.toString()] || 0) + item.quantity;
      }
    }

    for (const rItem of returnItems) {
      const originalItem = originalOrder.items.find(i => i.productId.toString() === rItem.productId.toString());
      if (!originalItem) {
        throw new Error(`Product ${rItem.productId} was not part of the original order`);
      }

      if (rItem.quantity <= 0) {
        throw new Error('Return quantity must be greater than zero');
      }

      const previouslyReturned = returnedQtys[rItem.productId.toString()] || 0;
      if (rItem.quantity + previouslyReturned > originalItem.quantity) {
        throw new Error(`Cannot return ${rItem.quantity} of product ${originalItem.productName}. Only ${originalItem.quantity - previouslyReturned} remaining for return.`);
      }

      // Pro-rata refund calculation: (total / quantity) * returnQty
      const unitRefund = originalItem.total / originalItem.quantity;
      const refundAmount = rItem.quantity * unitRefund;

      validatedReturnItems.push({
        productId: originalItem.productId,
        quantity: rItem.quantity,
        refundAmount
      });

      totalRefundAmount += refundAmount;
    }

    // Normalize and validate allocations
    let finalAllocations = [];
    if (refundAllocations && Array.isArray(refundAllocations) && refundAllocations.length > 0) {
      const allocationMap = {};
      let allocTotal = 0;
      for (const alloc of refundAllocations) {
        if (!alloc.method || typeof alloc.amount !== 'number' || alloc.amount < 0) {
          throw new Error('Invalid refund allocation');
        }
        allocationMap[alloc.method] = (allocationMap[alloc.method] || 0) + alloc.amount;
        allocTotal += alloc.amount;
      }
      
      if (Math.abs(allocTotal - totalRefundAmount) > 0.01) {
         throw new Error(`Refund allocations total (${allocTotal}) does not match calculated refund amount (${totalRefundAmount})`);
      }
      
      for (const method of Object.keys(allocationMap)) {
        if (allocationMap[method] > 0) {
          finalAllocations.push({ method, amount: allocationMap[method] });
        }
      }
    } else if (refundMethod) {
      finalAllocations = [{ method: refundMethod, amount: totalRefundAmount }];
    } else {
      throw new Error('No refund method or allocations provided');
    }

    // Validate allocations against original payments
    const paymentLedger = await POSPayment.aggregate([
      { $match: { posOrderId: originalOrder._id, tenantId: req.user.tenantId } },
      { $group: { _id: "$method", netPaid: { $sum: "$amount" } } }
    ]).session(session);

    const paidByMethod = {};
    for (const p of paymentLedger) {
      paidByMethod[p._id] = p.netPaid;
    }

    for (const alloc of finalAllocations) {
      const maxRefundable = paidByMethod[alloc.method] || 0;
      if (alloc.amount > maxRefundable + 0.01) {
        throw new Error(`Refund allocation for ${alloc.method} (${alloc.amount}) exceeds remaining refundable amount (${maxRefundable})`);
      }
    }

    // 1. Create POSReturn
    const [posReturn] = await POSReturn.create([{
      tenantId: req.user.tenantId,
      branchId: originalOrder.branchId,
      originalOrderId: originalOrder._id,
      returnItems: validatedReturnItems,
      refundAmount: totalRefundAmount,
      refundMethod: refundMethod || undefined, // legacy support
      refundAllocations: finalAllocations,
      reason,
      idempotencyKey: idempotencyKey ? idempotencyKey.trim() : undefined,
      createdBy: req.user._id
    }], { session });

    // 2. Create negative POSPayments for each allocation
    const negativePayments = finalAllocations.map(alloc => ({
      tenantId: req.user.tenantId,
      branchId: originalOrder.branchId,
      posOrderId: originalOrder._id,
      sessionId: posSession._id,
      method: alloc.method,
      amount: -alloc.amount, // Negative amount for refund
      reference: `Refund for POS Return ${posReturn._id}`,
      currency: originalOrder.currency,
      createdBy: req.user._id
    }));
    
    if (negativePayments.length > 0) {
      await POSPayment.insertMany(negativePayments, { session });
    }

    // 3. Increase Stock and Create StockMovement
    for (const item of validatedReturnItems) {
      const stock = await Stock.findOne({
        tenantId: req.user.tenantId,
        branchId: originalOrder.branchId,
        productId: item.productId
      }).session(session);

      if (stock) {
        stock.quantity += item.quantity;
        await stock.save({ session });
      } else {
        // If somehow stock doesn't exist, create it
        await Stock.create([{
          tenantId: req.user.tenantId,
          branchId: originalOrder.branchId,
          productId: item.productId,
          quantity: item.quantity
        }], { session });
      }

      await StockMovement.create([{
        tenantId: req.user.tenantId,
        branchId: originalOrder.branchId,
        productId: item.productId,
        type: 'SALES_RETURN',
        quantity: item.quantity,
        referenceType: 'POS_RETURN',
        referenceId: posReturn._id,
        notes: `POS Return ${reason || ''}`,
        createdBy: req.user._id
      }], { session });
    }

    const auditMetadata = { 
      originalOrderId: originalOrderId,
      refundAmount: posReturn.refundAmount,
      allocations: refundAllocations
    };
    if (returnManagerId) {
      auditMetadata.managerId = returnManagerId;
    }

    await auditService.logAuditEventTx(req, {
      action: 'POS_RETURN_CREATE',
      entityType: 'POSReturn',
      entityId: posReturn._id,
      branchId: posReturn.branchId,
      sessionId: posSession._id,
      metadata: auditMetadata
    }, session);

    await session.commitTransaction();
    res.status(201).json(posReturn);
  } catch (error) {
    await session.abortTransaction();
    
    if (error.code === 11000 && error.keyPattern && error.keyPattern.idempotencyKey) {
      try {
        const existingReturn = await POSReturn.findOne({ 
          tenantId: req.user.tenantId, 
          idempotencyKey: req.body.idempotencyKey.trim() 
        });
        if (existingReturn) {
          return res.status(200).json(existingReturn);
        }
      } catch (err) {
         // ignore
      }
    }
    
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Get POS Reports
// @route   GET /api/v1/pos/reports
// @access  Private
exports.getReports = async (req, res) => {
  try {
    const { startDate, endDate, branchId } = req.query;
    
    const matchStage = { tenantId: req.user.tenantId, status: 'PAID' };
    
    if (branchId) {
      matchStage.branchId = new mongoose.Types.ObjectId(branchId);
    } else if (req.user.branchId) {
      matchStage.branchId = req.user.branchId;
    }

    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const salesByPaymentMethod = await POSPayment.aggregate([
      { $match: { 
          tenantId: req.user.tenantId, 
          ...(matchStage.branchId ? { branchId: matchStage.branchId } : {}),
          ...(matchStage.createdAt ? { paidAt: matchStage.createdAt } : {})
      } },
      { $group: { _id: '$method', total: { $sum: '$amount' } } }
    ]);

    const dailySales = await POSOrder.aggregate([
      { $match: matchStage },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalSales: { $sum: '$totalAmount' },
          totalDiscount: { $sum: '$discountAmount' },
          totalTax: { $sum: '$taxAmount' },
          orderCount: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    const salesByCashier = await POSOrder.aggregate([
      { $match: matchStage },
      { $group: {
          _id: '$createdBy',
          totalSales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
      }},
      { $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'cashier'
      }},
      { $unwind: '$cashier' },
      { $project: {
          cashierName: { $concat: ['$cashier.firstName', ' ', '$cashier.lastName'] },
          totalSales: 1,
          orderCount: 1
      }}
    ]);

    res.status(200).json({
      dailySales,
      salesByPaymentMethod,
      salesByCashier
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Void POS Order
// @route   POST /api/v1/pos/orders/:id/void
// @access  Private
exports.voidOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { reason, overrideToken } = req.body;
    
    if (!reason || typeof reason !== 'string' || reason.trim().length < 5 || reason.trim().length > 150) {
      throw new Error('Void reason must be between 5 and 150 characters');
    }

    const orderId = req.params.id;
    const order = await POSOrder.findOne({ _id: orderId, tenantId: req.user.tenantId }).session(session);
    
    if (!order) {
      throw new Error('Order not found');
    }

    // Verify branch access
    const isAuthorizedBranch = await verifyBranchAccess(order.branchId, req);
    if (!isAuthorizedBranch) {
       throw new Error('Forbidden: You do not have access to this branch');
    }

    if (order.status === 'VOIDED' || order.status === 'CANCELLED') {
      throw new Error('Order is already voided or cancelled');
    }

    // Verify POS Return constraint
    const existingReturn = await POSReturn.findOne({ originalOrderId: order._id, tenantId: req.user.tenantId }).session(session);
    if (existingReturn) {
      throw new Error('Cannot void an order that has an associated return');
    }

    // Check permissions
    const perms = req.user.roleId?.permissions || req.user.permissions || [];
    const hasPermission = perms.includes('*') || perms.includes('VOID_POS_ORDER') || req.user.roleId?.name === 'TENANT ADMIN' || req.user.roleId?.name === 'admin';

    let voidManagerId = null;

    if (!hasPermission) {
      if (!overrideToken) {
        throw new Error('Forbidden: VOID_POS_ORDER permission required');
      }
      
      const decoded = verifyPOSOverrideToken(overrideToken, 'VOID_POS_ORDER', req);
      
      if (decoded.branchId && decoded.branchId.toString() !== order.branchId.toString()) {
         throw new Error('Override token branch does not match order branch');
      }
      
      voidManagerId = decoded.id;
    }

    // Mark POSOrder as VOIDED
    order.status = 'VOIDED';
    order.voidReason = reason.trim();
    order.voidedAt = new Date();
    order.voidedBy = req.user._id;
    if (voidManagerId) {
      order.voidManagerId = voidManagerId;
    }
    await order.save({ session });

    // Inventory Reversal
    for (const item of order.items) {
      const stock = await Stock.findOne({
        tenantId: req.user.tenantId,
        branchId: order.branchId,
        productId: item.productId
      }).session(session);
      
      if (stock) {
        stock.quantity += item.quantity;
        await stock.save({ session });
        
        await StockMovement.create([{
          tenantId: req.user.tenantId,
          branchId: order.branchId,
          productId: item.productId,
          quantity: item.quantity,
          type: 'SALES_RETURN',
          referenceId: `VOID-${order.receiptNumber}`,
          referenceType: 'POS_ORDER_VOID',
          notes: `Voided POS Order ${order.receiptNumber}`,
          createdBy: req.user._id
        }], { session });
      }
    }

    // Payment Reversal
    const originalPayments = await POSPayment.find({ posOrderId: order._id, tenantId: req.user.tenantId }).session(session);
    
    for (const payment of originalPayments) {
      await POSPayment.create([{
        tenantId: req.user.tenantId,
        branchId: order.branchId,
        posOrderId: order._id,
        sessionId: payment.sessionId,
        method: payment.method,
        amount: -Math.abs(payment.amount),
        cashTendered: payment.cashTendered ? -Math.abs(payment.cashTendered) : undefined,
        changeDue: payment.changeDue ? -Math.abs(payment.changeDue) : undefined,
        reference: `VOID-${order.receiptNumber}`,
        currency: payment.currency,
        paidAt: new Date(),
        createdBy: req.user._id
      }], { session });
    }

    // Invoice Cancellation
    if (order.invoiceId) {
      const invoice = await TaxInvoice.findOne({ _id: order.invoiceId, tenantId: req.user.tenantId }).session(session);
      if (invoice) {
        invoice.status = 'CANCELLED';
        await invoice.save({ session });
      }
    }

    // Audit Log
    await auditService.logAuditEventTx(req, {
      action: 'POS_ORDER_VOID',
      entityType: 'POSOrder',
      entityId: order._id,
      branchId: order.branchId,
      registerId: order.registerId,
      sessionId: order.sessionId,
      reason: reason.trim(),
      metadata: {
        originalTotalAmount: order.totalAmount,
        invoiceId: order.invoiceId,
        managerId: voidManagerId,
        receiptNumber: order.receiptNumber
      }
    }, session);

    await session.commitTransaction();
    res.status(200).json(order);
  } catch (error) {
    await session.abortTransaction();
    const statusCode = error.message.includes('Forbidden') ? 403 : error.message.includes('Order not found') ? 404 : 400;
    res.status(statusCode).json({ message: error.message, requiresOverride: error.message.includes('permission required'), requestedAction: 'VOID_POS_ORDER' });
  } finally {
    session.endSession();
  }
};

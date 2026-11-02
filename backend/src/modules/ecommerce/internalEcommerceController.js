const Order = require('../../core/models/Order');
const OrderItem = require('../../core/models/OrderItem');
const EcomSettings = require('../../core/models/EcomSettings');
const EcomStatus = require('../../core/models/EcomStatus');
const EcomLogistics = require('../../core/models/EcomLogistics');
const ApiKey = require('../../core/models/ApiKey');
const Coupon = require('../../core/models/Coupon');
const Branch = require('../../core/models/Branch');
const Stock = require('../../core/models/Stock');
const Company = require('../../core/models/Company');
const Product = require('../../core/models/Product');
const Review = require('../../core/models/Review');
const { seedEcomMastersIfEmpty } = require('./ecomSeedHelper');
const { sendOrderStatusUpdateEmail, sendReturnPickupOtpEmail } = require('../../services/emailService');

// Helper to get tenantId (handles super admins)
const getTenantId = async (req) => {
  if (req.user && req.user.tenantId) return req.user.tenantId;
  const activeProduct = await Product.findOne({ isActive: true });
  if (activeProduct && activeProduct.tenantId) return activeProduct.tenantId;
  const company = await Company.findOne({ name: /JTS middleeast/i }) || await Company.findOne();
  if (!company) throw new Error('No company found in the system');
  return company._id;
};

// ==========================================
// 1. ORDER PROCESSING DASHBOARD CONTROLLERS
// ==========================================

// @desc    Get all web orders with advanced filters
// @route   GET /api/v1/ecommerce-admin/orders
// @access  Private (ERP User)
exports.getWebOrders = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const { status, search, startDate, endDate, returnStatus } = req.query;

    const query = { tenantId, source: 'WEB' };

    if (status && status !== 'ALL') {
      query.$or = [{ ecomStatusCode: status }, { status }];
    }

    if (returnStatus && returnStatus !== 'ALL') {
      query.returnStatus = returnStatus;
    }

    if (search) {
      const searchConditions = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { trackingNumber: { $regex: search, $options: 'i' } },
        { orderNumber: { $regex: search, $options: 'i' } },
        { shippingAddress: { $regex: search, $options: 'i' } },
        { 'shippingAddressObj.fullName': { $regex: search, $options: 'i' } },
        { 'shippingAddressObj.phone': { $regex: search, $options: 'i' } },
        { driverName: { $regex: search, $options: 'i' } },
        { driverPhone: { $regex: search, $options: 'i' } }
      ];

      // Check if search matches hex ObjectId
      if (search.match(/^[0-9a-fA-F]{24}$/)) {
        searchConditions.push({ _id: search });
      }

      // Check if item name matches search
      try {
        const matchingOrderItems = await OrderItem.find({
          name: { $regex: search, $options: 'i' }
        }).select('orderId').lean();

        if (matchingOrderItems.length > 0) {
          const orderIds = matchingOrderItems.map(it => it.orderId);
          searchConditions.push({ _id: { $in: orderIds } });
        }
      } catch (err) {
        // Fallback gracefully
      }

      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: searchConditions }
        ];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const orders = await Order.find(query)
      .populate('branchId', 'name')
      .populate('ecomStatusId', 'name code color badgeVariant sendEmailToCustomer')
      .populate('carrierId', 'carrierName trackingUrlTemplate')
      .sort({ createdAt: -1 });

    // Attach items count and summary
    const populatedOrders = await Promise.all(orders.map(async (ord) => {
      const items = await OrderItem.find({ orderId: ord._id }).populate('productId', 'name sku');
      return {
        ...ord.toObject(),
        items
      };
    }));

    res.status(200).json(populatedOrders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single order detail with full fulfillment breakdown
// @route   GET /api/v1/ecommerce-admin/orders/:id
// @access  Private (ERP User)
exports.getWebOrderDetail = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const order = await Order.findOne({ _id: req.params.id, tenantId, source: 'WEB' })
      .populate('branchId', 'name')
      .populate('ecomStatusId', 'name code color badgeVariant sendEmailToCustomer')
      .populate('carrierId', 'carrierName trackingUrlTemplate websiteUrl');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    const items = await OrderItem.find({ orderId: order._id })
      .populate('productId', 'name sku salesPrice price uploadImage');

    res.status(200).json({ order, items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update web order status with conditional customer email notification
// @route   PUT /api/v1/ecommerce-admin/orders/:id/status
// @access  Private (ERP User)
exports.updateWebOrderStatus = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const { statusId, statusCode, status, note, customSendEmail } = req.body;
    const targetCode = statusCode || status;

    const order = await Order.findOne({ _id: req.params.id, tenantId, source: 'WEB' });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Look up status in EcomStatus master
    let statusDoc = null;
    if (statusId) {
      statusDoc = await EcomStatus.findOne({ _id: statusId, tenantId });
    } else if (targetCode) {
      statusDoc = await EcomStatus.findOne({ 
        $or: [{ code: targetCode }, { name: targetCode }],
        tenantId 
      });
    }

    const newStatusName = statusDoc ? statusDoc.name : (targetCode || 'UPDATED');
    const newStatusCode = (statusDoc ? statusDoc.code : (targetCode || 'UPDATED')).toUpperCase();
    const currentCode = (order.ecomStatusCode || order.status || '').toUpperCase();

    // 1. CANCELLED is a Terminal state: Cannot be modified, shipped, or delivered
    if (currentCode === 'CANCELLED') {
      return res.status(400).json({
        message: 'Order is CANCELLED. Cancelled orders are in a terminal state and cannot be modified, shipped, or marked delivered.'
      });
    }

    // 2. DELIVERED is Fulfilled: Cannot revert backwards to pending, transit, or cancelled
    if (currentCode === 'DELIVERED') {
      const allowedReturnTransitions = [
        'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURNED', 'REFUNDED',
        'EXCHANGE_REQUESTED', 'EXCHANGE_APPROVED', 'EXCHANGE_DISPATCHED'
      ];
      if (!allowedReturnTransitions.includes(newStatusCode)) {
        return res.status(400).json({
          message: 'Order is already DELIVERED. It cannot be reverted back to pending, transit, or cancelled. Only return/exchange/refund workflow is permitted.'
        });
      }
    }

    // 3. RETURNED / REFUNDED is also a Terminal state
    if (['RETURNED', 'REFUNDED'].includes(currentCode)) {
      return res.status(400).json({
        message: `Order is already ${currentCode}. Status cannot be altered.`
      });
    }

    // 4. Same status check (no-op)
    if (currentCode === newStatusCode) {
      return res.status(400).json({
        message: `Order is already in '${newStatusName}' status.`
      });
    }

    // 5. If moving TO 'CANCELLED' from an active order: restore stock and log cancellation
    if (newStatusCode === 'CANCELLED' && currentCode !== 'CANCELLED') {
      if (order.fulfillmentLocations && order.fulfillmentLocations.length > 0) {
        for (const fl of order.fulfillmentLocations) {
          if (fl.productId && fl.branchId) {
            await Stock.findOneAndUpdate(
              { tenantId: order.tenantId, productId: fl.productId, branchId: fl.branchId },
              { $inc: { quantity: fl.quantity } }
            );
          }
        }
      } else if (order.branchId) {
        const orderItems = await OrderItem.find({ orderId: order._id });
        for (const item of orderItems) {
          if (item.productId) {
            await Stock.findOneAndUpdate(
              { tenantId: order.tenantId, productId: item.productId, branchId: order.branchId },
              { $inc: { quantity: item.quantity } }
            );
          }
        }
      }
      order.cancellationReason = note || 'Cancelled by Store Admin';
      order.cancelledAt = new Date();
    }

    order.status = newStatusCode;
    order.ecomStatusCode = newStatusCode;
    if (statusDoc) order.ecomStatusId = statusDoc._id;

    // Check email option:
    // User requirement: In ecom status master screen, option to select/de-select email option.
    // If sendEmailToCustomer is false (e.g. for internal processing), NO email sent to customer!
    const shouldSendEmail = customSendEmail !== undefined 
      ? Boolean(customSendEmail) 
      : Boolean(statusDoc && statusDoc.sendEmailToCustomer);

    let emailSentResult = false;

    if (shouldSendEmail && order.customerEmail) {
      const company = await Company.findById(tenantId);
      const companyName = company ? company.name : 'JTS Online Store';

      try {
        await sendOrderStatusUpdateEmail({
          to: order.customerEmail,
          order,
          statusName: newStatusName,
          statusNote: note || (statusDoc ? statusDoc.emailTemplate : ''),
          trackingUrl: order.trackingUrl,
          carrierName: order.carrier,
          trackingNumber: order.trackingNumber,
          companyName
        });
        emailSentResult = true;
      } catch (emailErr) {
        console.warn('Customer status email failed or simulated:', emailErr.message);
      }
    }

    // Append to status history
    order.statusHistory.push({
      status: newStatusName,
      statusCode: newStatusCode,
      note: note || '',
      changedAt: new Date(),
      changedBy: req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'ERP Admin',
      emailSent: emailSentResult
    });

    await order.save();

    res.status(200).json({
      message: `Order status updated to '${newStatusName}'. Email notification ${emailSentResult ? 'sent to customer' : 'skipped (internal processing)'}.`,
      order,
      emailSent: emailSentResult
    });
  } catch (error) {
    console.error('updateWebOrderStatus error:', error);
    res.status(400).json({ message: error.message });
  }
};

// @desc    Assign logistics, courier partner, tracking number & generate tracking link
// @route   PUT /api/v1/ecommerce-admin/orders/:id/logistics
// @access  Private (ERP User)
exports.assignLogistics = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const {
      carrierId, trackingNumber, updateToShipped, note,
      deliveryType = 'THIRD_PARTY', driverName, driverPhone, vehicleNumber
    } = req.body;

    const order = await Order.findOne({ _id: req.params.id, tenantId, source: 'WEB' });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const currentCode = (order.ecomStatusCode || order.status || '').toUpperCase();
    if (currentCode === 'CANCELLED') {
      return res.status(400).json({ message: 'Cannot assign courier or dispatch a CANCELLED order.' });
    }
    if (currentCode === 'DELIVERED') {
      return res.status(400).json({ message: 'Order is already DELIVERED. Logistics cannot be re-assigned.' });
    }
    if (['RETURNED', 'REFUNDED'].includes(currentCode)) {
      return res.status(400).json({ message: `Order is already ${currentCode}. Logistics cannot be modified.` });
    }

    const prevDriverName = (order.driverName || '').trim();
    const prevDriverPhone = (order.driverPhone || '').trim();

    order.deliveryType = deliveryType === 'IN_HOUSE' ? 'IN_HOUSE' : 'THIRD_PARTY';

    if (order.deliveryType === 'IN_HOUSE') {
      order.driverName = (driverName || '').trim();
      order.driverPhone = (driverPhone || '').trim();
      order.vehicleNumber = (vehicleNumber || '').trim();
      order.carrier = req.body.carrierName || 'JTS In-House Fleet';
      order.carrierId = null;
      order.trackingNumber = trackingNumber || (order.driverName ? `${order.driverName} (${order.vehicleNumber || 'Fleet'})` : 'JTS-SELF-01');
      order.trackingUrl = order.driverPhone ? `tel:${order.driverPhone}` : `${process.env.STOREFRONT_URL || 'http://localhost:5174'}/track?orderId=${order._id}`;

      if (!order.deliveryOtp) {
        order.deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
      }
    } else {
      let carrierDoc = null;
      if (carrierId) {
        carrierDoc = await EcomLogistics.findOne({ _id: carrierId, tenantId });
      }

      order.carrierId = carrierDoc ? carrierDoc._id : null;
      order.carrier = carrierDoc ? carrierDoc.carrierName : (req.body.carrierName || 'Courier');
      order.trackingNumber = trackingNumber || '';

      // Generate tracking URL
      if (carrierDoc && carrierDoc.trackingUrlTemplate && trackingNumber) {
        order.trackingUrl = carrierDoc.trackingUrlTemplate.replace(/\{\{trackingNumber\}\}/g, trackingNumber.trim());
      } else if (trackingNumber) {
        order.trackingUrl = `${process.env.STOREFRONT_URL || 'http://localhost:5174'}/track?orderId=${order._id}`;
      }
    }

    let emailSent = false;

    if (updateToShipped) {
      const shippedStatus = await EcomStatus.findOne({ tenantId, code: 'SHIPPED' });
      order.status = 'SHIPPED';
      order.ecomStatusCode = 'SHIPPED';
      if (shippedStatus) order.ecomStatusId = shippedStatus._id;

      if (shippedStatus && shippedStatus.sendEmailToCustomer && order.customerEmail) {
        const company = await Company.findById(tenantId);
        try {
          await sendOrderStatusUpdateEmail({
            to: order.customerEmail,
            order,
            statusName: 'Dispatched / In Transit',
            statusNote: note || 'Your package has been dispatched and is on its way.',
            trackingUrl: order.trackingUrl,
            carrierName: order.carrier,
            trackingNumber: order.trackingNumber,
            companyName: company ? company.name : 'JTS Store'
          });
          emailSent = true;
        } catch (e) {
          console.warn('Dispatch email warning:', e.message);
        }
      }

      const isReassigned = prevDriverName && (prevDriverName !== order.driverName || prevDriverPhone !== order.driverPhone);
      order.statusHistory.push({
        status: 'Dispatched / In Transit',
        statusCode: 'SHIPPED',
        note: order.deliveryType === 'IN_HOUSE'
          ? (isReassigned
              ? `Reassigned In-House Rider from ${prevDriverName} (${prevDriverPhone || 'N/A'}) to ${order.driverName} (Tel: ${order.driverPhone || 'N/A'}${order.vehicleNumber ? `, Vehicle: ${order.vehicleNumber}` : ''})`
              : `Dispatched with In-House Driver: ${order.driverName || 'Self Fleet'} (Tel: ${order.driverPhone || 'N/A'}${order.vehicleNumber ? `, Vehicle: ${order.vehicleNumber}` : ''})`)
          : `Assigned carrier ${order.carrier} (AWB: ${trackingNumber})`,
        changedAt: new Date(),
        changedBy: req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'ERP Admin',
        emailSent
      });
    } else if (order.deliveryType === 'IN_HOUSE' && (prevDriverName !== order.driverName || prevDriverPhone !== order.driverPhone)) {
      order.statusHistory.push({
        status: prevDriverName ? 'Rider Reassigned' : 'Rider Assigned',
        statusCode: currentCode || 'SHIPPED',
        note: prevDriverName
          ? `Reassigned In-House Rider from ${prevDriverName} (${prevDriverPhone || 'N/A'}) to ${order.driverName} (Tel: ${order.driverPhone || 'N/A'}${order.vehicleNumber ? `, Vehicle: ${order.vehicleNumber}` : ''})`
          : `Assigned In-House Rider: ${order.driverName} (Tel: ${order.driverPhone || 'N/A'}${order.vehicleNumber ? `, Vehicle: ${order.vehicleNumber}` : ''})`,
        changedAt: new Date(),
        changedBy: req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'ERP Admin',
        emailSent: false
      });
    }

    await order.save();

    res.status(200).json({
      message: 'Logistics details assigned successfully',
      order,
      emailSent
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Bulk assign multiple web orders to an in-house rider
// @route   PUT /api/v1/ecommerce-admin/orders/bulk-assign-rider
// @access  Private (ERP User)
exports.bulkAssignRider = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const {
      orderIds,
      driverName,
      driverPhone,
      vehicleNumber,
      carrierName,
      updateToShipped = true,
      note
    } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ message: 'No orders selected for bulk rider assignment.' });
    }
    if (!driverName && !driverPhone) {
      return res.status(400).json({ message: 'Rider Name or Mobile Number is required.' });
    }

    const cleanDriverName = (driverName || '').trim();
    const cleanDriverPhone = (driverPhone || '').trim();
    const cleanVehicleNumber = (vehicleNumber || '').trim();
    const fleetName = (carrierName || 'JTS In-House Fleet').trim();

    const shippedStatus = await EcomStatus.findOne({ tenantId, code: 'SHIPPED' });

    const orders = await Order.find({
      _id: { $in: orderIds },
      tenantId,
      source: 'WEB'
    });

    const updatedOrderIds = [];
    const skippedOrders = [];

    for (const order of orders) {
      const currentCode = (order.ecomStatusCode || order.status || '').toUpperCase();
      // Skip terminal states
      if (['CANCELLED', 'DELIVERED', 'RETURNED', 'REFUNDED'].includes(currentCode)) {
        skippedOrders.push({
          id: order._id,
          orderRef: `WEB-${order._id.toString().slice(-6).toUpperCase()}`,
          reason: `Already ${currentCode}`
        });
        continue;
      }

      order.deliveryType = 'IN_HOUSE';
      order.driverName = cleanDriverName;
      order.driverPhone = cleanDriverPhone;
      order.vehicleNumber = cleanVehicleNumber;
      order.carrier = fleetName;
      order.carrierId = null;
      order.trackingNumber = `${cleanDriverName.split(' ')[0] || 'RIDER'}-${order._id.toString().slice(-4).toUpperCase()}`;
      order.trackingUrl = cleanDriverPhone ? `tel:${cleanDriverPhone}` : `${process.env.STOREFRONT_URL || 'http://localhost:5174'}/track?orderId=${order._id}`;

      // Auto-generate 4-digit Delivery OTP if missing
      if (!order.deliveryOtp) {
        order.deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
      }

      if (updateToShipped) {
        order.status = 'SHIPPED';
        order.ecomStatusCode = 'SHIPPED';
        if (shippedStatus) order.ecomStatusId = shippedStatus._id;

        order.statusHistory.push({
          status: 'Dispatched / In Transit',
          statusCode: 'SHIPPED',
          note: `Bulk assigned to In-House Rider: ${cleanDriverName || 'Fleet'} (${cleanDriverPhone || 'No Phone'}${cleanVehicleNumber ? `, Vehicle: ${cleanVehicleNumber}` : ''})${note ? ` - ${note}` : ''}`,
          changedAt: new Date(),
          changedBy: req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'ERP Admin',
          emailSent: false
        });
      }

      await order.save();
      updatedOrderIds.push(order._id);
    }

    res.status(200).json({
      success: true,
      message: `Successfully assigned ${updatedOrderIds.length} parcels to Rider ${cleanDriverName || cleanDriverPhone}.`,
      assignedCount: updatedOrderIds.length,
      skippedCount: skippedOrders.length,
      updatedOrderIds,
      skippedOrders
    });
  } catch (error) {
    console.error('bulkAssignRider error:', error);
    res.status(500).json({ message: error.message || 'Failed to bulk assign rider.' });
  }
};

// @desc    Settle / Receive COD Physical Cash at Hub from In-House Rider (Admin / Hub Manager)
// @route   PUT /api/v1/ecommerce-admin/orders/settle-rider-cash
// @access  Private (ERP User)
exports.settleRiderCodCash = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const { orderIds, note } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ message: 'Please provide at least one order ID to settle COD cash.' });
    }

    const managerName = req.user
      ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email || 'Hub Manager'
      : 'Hub Manager';

    const orders = await Order.find({
      _id: { $in: orderIds },
      tenantId,
      source: 'WEB'
    });

    let totalSettledAmount = 0;
    let settledCount = 0;
    const receiptRef = `HUB-SETTLE-${Date.now().toString().slice(-6)}`;

    for (const order of orders) {
      if (order.codSettlementStatus === 'SETTLED_TO_HUB') {
        continue;
      }

      const amount = Number(order.codCollectedAmount || order.totalAmount || 0);
      order.codCollectionMethod = order.codCollectionMethod && order.codCollectionMethod !== 'NONE'
        ? order.codCollectionMethod
        : 'CASH';
      order.codSettlementStatus = 'SETTLED_TO_HUB';
      order.codSettledAt = new Date();
      order.codSettledBy = managerName;
      order.codSettlementRef = note ? `${receiptRef} (${note})` : receiptRef;
      order.paymentStatus = 'PAID';

      order.statusHistory.push({
        status: 'COD Cash Settled at Hub',
        statusCode: order.ecomStatusCode || order.status || 'DELIVERED',
        note: `Physical COD Cash (${order.currency || 'INR'} ${amount.toFixed(2)}) handed over by Rider (${order.driverName || order.deliveredByRider || 'Rider'}) and received at Hub by ${managerName}. Ref: ${receiptRef}${note ? ` - ${note}` : ''}`,
        changedAt: new Date(),
        changedBy: managerName,
        emailSent: false
      });

      await order.save();
      totalSettledAmount += amount;
      settledCount += 1;
    }

    res.status(200).json({
      success: true,
      message: `Successfully received and settled ₹${totalSettledAmount.toLocaleString('en-IN')} cash across ${settledCount} order(s) at Hub.`,
      settledCount,
      totalSettledAmount,
      receiptRef,
      settledBy: managerName
    });
  } catch (error) {
    console.error('settleRiderCodCash error:', error);
    res.status(500).json({ message: error.message || 'Failed to settle rider COD cash.' });
  }
};


// @desc    Process customer return or exchange request (Approve, Reject, Dispatch Exchange, Restock, Process Refund)
// @route   PUT /api/v1/ecommerce-admin/orders/:id/return-action
// @access  Private (ERP User)
exports.processReturnAction = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const {
      action, // 'APPROVE', 'REJECT', 'ASSIGN_PICKUP', 'CONFIRM_PICKUP', 'INSPECT_WAREHOUSE', 'DISPATCH_EXCHANGE', 'COMPLETE_EXCHANGE', 'RESTOCK', 'PROCESS_REFUND'
      restockBranchId,
      refundAmount,
      refundTransactionId,
      refundMode,
      // Reverse Logistics / Pickup fields:
      deliveryType, // 'IN_HOUSE' | 'THIRD_PARTY'
      riderName,
      riderPhone,
      vehicleNumber,
      carrierName,
      trackingNumber,
      pickupOtpEntered,
      handoverProof,
      // Inspection fields:
      inspectionResult, // 'PASSED_SELLABLE' | 'FAILED_DAMAGED'
      inspectionNotes,
      // Exchange Dispatch fields:
      exchangeDeliveryType,
      exchangeRiderName,
      exchangeRiderPhone,
      exchangeVehicleNumber,
      exchangeCarrierName,
      exchangeTrackingNumber,
      note
    } = req.body;

    const order = await Order.findOne({ _id: req.params.id, tenantId, source: 'WEB' });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isExchange = order.returnType === 'EXCHANGE';
    const actorName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'ERP Admin';

    if (!order.returnAuditTrail) order.returnAuditTrail = [];
    if (!order.statusHistory) order.statusHistory = [];

    // ==========================================
    // STEP 2: ELIGIBILITY & APPROVAL
    // ==========================================
    if (action === 'APPROVE' || action === 'APPROVE_AND_ASSIGN') {
      const isAssigningImmediately = action === 'APPROVE_AND_ASSIGN' || Boolean(riderName || order.driverName || carrierName);
      const code = isExchange 
        ? (isAssigningImmediately ? 'EXCHANGE_OUT_FOR_PICKUP' : 'EXCHANGE_APPROVED')
        : (isAssigningImmediately ? 'OUT_FOR_PICKUP' : 'RETURN_APPROVED');

      let statusDoc = await EcomStatus.findOne({ tenantId, code });
      if (!statusDoc) statusDoc = await EcomStatus.findOne({ tenantId, code: isExchange ? 'EXCHANGE_APPROVED' : 'RETURN_APPROVED' });

      order.returnStatus = isAssigningImmediately ? 'PICKUP_ASSIGNED' : 'APPROVED';
      order.status = code;
      order.ecomStatusCode = code;
      if (statusDoc) order.ecomStatusId = statusDoc._id;

      const dType = deliveryType || order.deliveryType || 'IN_HOUSE';
      order.returnDeliveryType = dType;

      if (dType === 'IN_HOUSE') {
        const assignedRider = (riderName || order.driverName || 'In-House Rider').trim();
        const assignedPhone = (riderPhone || order.driverPhone || '').trim();
        const assignedVehicle = (vehicleNumber || order.vehicleNumber || '').trim();

        order.returnRiderName = assignedRider;
        order.returnRiderPhone = assignedPhone;
        order.returnVehicleNumber = assignedVehicle;

        if (isExchange) {
          order.exchangeDeliveryType = 'IN_HOUSE';
          order.exchangeRiderName = assignedRider;
          order.exchangeRiderPhone = assignedPhone;
          order.exchangeVehicleNumber = assignedVehicle;
        }
      } else {
        order.returnCarrierName = (carrierName || order.carrier || 'Third Party Logistics').trim();
        order.returnTrackingNumber = (trackingNumber || `AWB-REV-${Date.now().toString().slice(-6)}`).trim();
      }

      order.returnAuditTrail.push({
        step: isAssigningImmediately ? 'PICKUP_ASSIGNED' : 'APPROVED',
        title: isAssigningImmediately 
          ? `${isExchange ? 'Exchange Doorstep Swap' : 'Return Pickup'} Assigned to Rider (${order.returnRiderName || order.returnCarrierName})`
          : `${isExchange ? 'Exchange' : 'Return'} Approved`,
        actor: actorName,
        deliveryType: dType,
        carrierOrRider: dType === 'IN_HOUSE' ? `${order.returnRiderName} (${order.returnRiderPhone || 'No Phone'})` : order.returnCarrierName,
        trackingOrProof: dType === 'IN_HOUSE' ? `Vehicle: ${order.returnVehicleNumber || 'N/A'}` : `AWB: ${order.returnTrackingNumber}`,
        note: note || (isAssigningImmediately 
          ? `Dispatched for doorstep ${isExchange ? 'swap' : 'pickup'}. Verification OTP generated for customer.`
          : 'Request verified against store policy. Approved for pickup.'),
        timestamp: new Date()
      });
    } else if (action === 'REJECT') {
      const code = isExchange ? 'EXCHANGE_REJECTED' : 'RETURN_REJECTED';
      let statusDoc = await EcomStatus.findOne({ tenantId, code });
      if (!statusDoc) statusDoc = await EcomStatus.findOne({ tenantId, code: 'RETURN_REJECTED' });

      order.returnStatus = 'REJECTED';
      order.status = code;
      order.ecomStatusCode = code;
      if (statusDoc) order.ecomStatusId = statusDoc._id;

      order.returnAuditTrail.push({
        step: 'REJECTED',
        title: `${isExchange ? 'Exchange' : 'Return'} Rejected`,
        actor: actorName,
        deliveryType: 'N/A',
        carrierOrRider: 'N/A',
        trackingOrProof: 'Rejected',
        note: note || 'Request does not fulfill return conditions or policy window expired.',
        timestamp: new Date()
      });
    }

    // ==========================================
    // STEP 3: RIDER / COURIER PICKUP ASSIGNMENT
    // ==========================================
    else if (action === 'ASSIGN_PICKUP') {
      const dType = deliveryType || 'IN_HOUSE';
      order.returnDeliveryType = dType;
      order.returnStatus = 'PICKUP_ASSIGNED';

      if (dType === 'IN_HOUSE') {
        order.returnRiderName = riderName || 'Company Fleet Rider';
        order.returnRiderPhone = riderPhone || '';
        order.returnVehicleNumber = vehicleNumber || '';
      } else {
        order.returnCarrierName = carrierName || 'Third Party Logistics';
        order.returnTrackingNumber = trackingNumber || `AWB-REV-${Date.now().toString().slice(-6)}`;
      }

      const code = isExchange ? 'EXCHANGE_OUT_FOR_PICKUP' : 'OUT_FOR_PICKUP';
      let statusDoc = await EcomStatus.findOne({ tenantId, code });
      if (!statusDoc) statusDoc = await EcomStatus.findOne({ tenantId, code: 'SHIPPED' });

      order.status = code;
      order.ecomStatusCode = code;
      if (statusDoc) order.ecomStatusId = statusDoc._id;

      order.returnAuditTrail.push({
        step: 'PICKUP_ASSIGNED',
        title: `Reverse Pickup Assigned (${dType === 'IN_HOUSE' ? 'In-House Fleet' : '3PL Courier'})`,
        actor: actorName,
        deliveryType: dType,
        carrierOrRider: dType === 'IN_HOUSE' ? `${riderName || 'Rider'} (${riderPhone || 'No Phone'})` : (carrierName || '3PL Courier'),
        trackingOrProof: dType === 'IN_HOUSE' ? `Vehicle: ${vehicleNumber || 'N/A'} | OTP: ${order.returnPickupOtp}` : `AWB: ${trackingNumber}`,
        note: note || `Pickup dispatched to customer doorstep. Verification code required at handover.`,
        timestamp: new Date()
      });
    }

    // ==========================================
    // STEP 3: DOORSTEP HANDOVER & PICKUP CONFIRMATION
    // ==========================================
    else if (action === 'CONFIRM_PICKUP') {
      // Validate OTP if provided
      if (pickupOtpEntered && order.returnPickupOtp && pickupOtpEntered.trim() !== order.returnPickupOtp.trim()) {
        return res.status(400).json({ message: 'Invalid Doorstep Pickup Verification Code (OTP). Please check with customer.' });
      }

      order.returnStatus = 'PICKED_UP';
      order.returnPickedUpAt = new Date();
      order.returnPickupProof = handoverProof || `Picked up by ${order.returnRiderName || order.returnCarrierName || 'Rider'}. OTP Verified.`;

      const code = 'ITEM_PICKED_UP';
      let statusDoc = await EcomStatus.findOne({ tenantId, code });
      if (!statusDoc) statusDoc = await EcomStatus.findOne({ tenantId, code: 'RETURN_APPROVED' });

      order.status = code;
      order.ecomStatusCode = code;
      if (statusDoc) order.ecomStatusId = statusDoc._id;

      order.returnAuditTrail.push({
        step: 'PICKED_UP',
        title: 'Package Handed Over & Picked Up from Customer',
        actor: order.returnRiderName || actorName,
        deliveryType: order.returnDeliveryType || 'IN_HOUSE',
        carrierOrRider: order.returnDeliveryType === 'IN_HOUSE' ? order.returnRiderName : order.returnCarrierName,
        trackingOrProof: `OTP Verified | ${handoverProof || 'Handover Successful'}`,
        note: note || 'Package received from customer in sealed bag. En route to fulfillment warehouse.',
        timestamp: new Date()
      });
    }

    // ==========================================
    // STEP 4: WAREHOUSE RECEIPT & QUALITY INSPECTION
    // ==========================================
    else if (action === 'INSPECT_WAREHOUSE' || action === 'RESTOCK') {
      const result = inspectionResult || 'PASSED_SELLABLE';
      order.inspectionResult = result;
      order.inspectionNotes = inspectionNotes || note || 'Barcode verified. Condition intact.';
      order.inspectedBy = actorName;
      order.inspectedAt = new Date();
      order.returnStatus = 'INSPECTED';

      const branchToRestock = restockBranchId || order.branchId;
      order.restockBranchId = branchToRestock;

      // If passed inspection, auto restock inventory
      if (result === 'PASSED_SELLABLE' && branchToRestock) {
        const items = await OrderItem.find({ orderId: order._id });
        for (const item of items) {
          if (item.productId) {
            await Stock.findOneAndUpdate(
              { tenantId, productId: item.productId, branchId: branchToRestock },
              { $inc: { quantity: item.quantity } },
              { upsert: true }
            );
          }
        }
      }

      const code = result === 'PASSED_SELLABLE' ? 'RETURNED' : 'INSPECTION_FAILED';
      let statusDoc = await EcomStatus.findOne({ tenantId, code });
      if (!statusDoc) statusDoc = await EcomStatus.findOne({ tenantId, code: 'RETURNED' });

      order.status = code;
      order.ecomStatusCode = code;
      if (statusDoc) order.ecomStatusId = statusDoc._id;

      order.returnAuditTrail.push({
        step: 'WAREHOUSE_INSPECTED',
        title: `Warehouse Quality Inspection: ${result === 'PASSED_SELLABLE' ? 'PASSED (Restocked)' : 'FAILED (Damaged)'}`,
        actor: actorName,
        deliveryType: order.returnDeliveryType || 'IN_HOUSE',
        carrierOrRider: 'Fulfillment Center QC',
        trackingOrProof: result === 'PASSED_SELLABLE' ? `Restocked to Branch ID: ${branchToRestock}` : 'Classified Damaged / RTV',
        note: inspectionNotes || note || `Quality checked by ${actorName}. Condition: ${result}`,
        timestamp: new Date()
      });
    }

    // ==========================================
    // STEP 5: REFUND PROCESSING (FOR RETURNS)
    // ==========================================
    else if (action === 'PROCESS_REFUND') {
      order.returnStatus = 'COMPLETED';
      order.status = 'REFUNDED';
      order.ecomStatusCode = 'REFUNDED';
      order.paymentStatus = 'REFUNDED';
      const fallbackRefund = order.refundAmount || order.subtotalAmount || (order.totalAmount - Number(order.shippingAmount || 0)) || order.totalAmount;
      order.refundAmount = Number(refundAmount != null && refundAmount !== '' ? refundAmount : fallbackRefund);
      order.refundTransactionId = refundTransactionId || `RFND-${Date.now().toString().slice(-6)}`;
      order.refundedAt = new Date();
      if (refundMode) order.refundMode = refundMode;

      const statusDoc = await EcomStatus.findOne({ tenantId, code: 'REFUNDED' });
      if (statusDoc) order.ecomStatusId = statusDoc._id;

      order.returnAuditTrail.push({
        step: 'REFUND_PROCESSED',
        title: `Refund Issued (₹${order.refundAmount})`,
        actor: actorName,
        deliveryType: 'BANKING_PAYMENT_GATEWAY',
        carrierOrRider: `Mode: ${order.refundMode}`,
        trackingOrProof: `Txn ID: ${order.refundTransactionId}`,
        note: note || `Refund of ₹${order.refundAmount} credited to customer account (${order.refundMode}).`,
        timestamp: new Date()
      });
    }

    // ==========================================
    // STEP 5: REPLACEMENT DISPATCH (FOR EXCHANGES)
    // ==========================================
    else if (action === 'DISPATCH_EXCHANGE') {
      const dType = exchangeDeliveryType || 'IN_HOUSE';
      order.exchangeDeliveryType = dType;

      if (dType === 'IN_HOUSE') {
        order.exchangeRiderName = exchangeRiderName || 'In-House Delivery Fleet';
        order.exchangeRiderPhone = exchangeRiderPhone || '';
        order.exchangeVehicleNumber = exchangeVehicleNumber || '';
      } else {
        order.exchangeCarrierName = exchangeCarrierName || 'Express Courier';
        order.exchangeTrackingNumber = exchangeTrackingNumber || `AWB-EXC-${Date.now().toString().slice(-6)}`;
      }

      const deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();
      order.exchangeDeliveryOtp = deliveryOtp;

      let statusDoc = await EcomStatus.findOne({ tenantId, code: 'EXCHANGE_DISPATCHED' });
      if (!statusDoc) statusDoc = await EcomStatus.findOne({ tenantId, code: 'SHIPPED' });

      order.status = 'EXCHANGE_DISPATCHED';
      order.ecomStatusCode = 'EXCHANGE_DISPATCHED';
      if (statusDoc) order.ecomStatusId = statusDoc._id;

      order.returnAuditTrail.push({
        step: 'EXCHANGE_DISPATCHED',
        title: `Replacement Product Dispatched (${dType === 'IN_HOUSE' ? 'In-House Fleet' : '3PL Courier'})`,
        actor: actorName,
        deliveryType: dType,
        carrierOrRider: dType === 'IN_HOUSE' ? `${exchangeRiderName || 'Rider'} (${exchangeRiderPhone || ''})` : (exchangeCarrierName || 'Courier'),
        trackingOrProof: dType === 'IN_HOUSE' ? `Vehicle: ${exchangeVehicleNumber} | Handover OTP: ${deliveryOtp}` : `AWB: ${order.exchangeTrackingNumber}`,
        note: note || `Replacement item dispatched. Customer will receive delivery and OTP verification.`,
        timestamp: new Date()
      });
    }

    // ==========================================
    // STEP 5: EXCHANGE DELIVERY COMPLETION
    // ==========================================
    else if (action === 'COMPLETE_EXCHANGE') {
      order.returnStatus = 'COMPLETED';
      order.status = 'DELIVERED';
      order.ecomStatusCode = 'DELIVERED';
      order.exchangeDeliveredAt = new Date();
      if (order.exchangeDifferenceAction === 'COLLECT_FROM_CUSTOMER') {
        order.exchangeDifferencePaymentStatus = 'PAID';
      }

      const statusDoc = await EcomStatus.findOne({ tenantId, code: 'DELIVERED' });
      if (statusDoc) order.ecomStatusId = statusDoc._id;

      // Auto restock original returned item back into selected branch if not done yet
      const branchToRestock = restockBranchId || order.branchId;
      if (branchToRestock && order.inspectionResult !== 'PASSED_SELLABLE') {
        const items = await OrderItem.find({ orderId: order._id });
        for (const item of items) {
          if (item.productId) {
            await Stock.findOneAndUpdate(
              { tenantId, productId: item.productId, branchId: branchToRestock },
              { $inc: { quantity: item.quantity } },
              { upsert: true }
            );
          }
        }
      }

      order.returnAuditTrail.push({
        step: 'EXCHANGE_COMPLETED',
        title: 'Exchange Replacement Delivered & Closed',
        actor: actorName,
        deliveryType: order.exchangeDeliveryType || 'IN_HOUSE',
        carrierOrRider: order.exchangeDeliveryType === 'IN_HOUSE' ? order.exchangeRiderName : order.exchangeCarrierName,
        trackingOrProof: 'Delivered Successfully. Doorstep swap complete.',
        note: note || 'Customer received replacement piece. Old product returned to warehouse.',
        timestamp: new Date()
      });
    }

    // If action is APPROVE or ASSIGN_PICKUP, dispatch pickup OTP email to customer
    if (['APPROVE', 'ASSIGN_PICKUP', 'APPROVE_AND_ASSIGN'].includes(action) && order.customerEmail) {
      if (!order.returnPickupOtp) {
        order.returnPickupOtp = Math.floor(100000 + Math.random() * 900000).toString();
      }
      try {
        const company = await Company.findById(tenantId);
        await sendReturnPickupOtpEmail({
          to: order.customerEmail,
          customerName: order.customerName,
          orderRef: `WEB-${order._id.toString().slice(-6).toUpperCase()}`,
          pickupOtp: order.returnPickupOtp,
          returnType: order.returnType || 'RETURN',
          itemName: order.returnItem?.name || order.exchangeItemDetails || 'Ordered Product',
          riderName: order.returnRiderName || (['ASSIGN_PICKUP', 'APPROVE_AND_ASSIGN'].includes(action) ? riderName : '') || '',
          riderPhone: order.returnRiderPhone || (['ASSIGN_PICKUP', 'APPROVE_AND_ASSIGN'].includes(action) ? riderPhone : '') || '',
          companyName: company ? company.name : 'JTS Store'
        });
      } catch (emailErr) {
        console.warn('Pickup OTP email dispatch warning:', emailErr.message);
      }
    }

    // Status history log
    order.statusHistory.push({
      status: order.status,
      statusCode: order.ecomStatusCode,
      note: `${isExchange ? 'Exchange' : 'Return'} action '${action}': ${note || ''}`,
      changedAt: new Date(),
      changedBy: actorName,
      emailSent: Boolean(order.customerEmail && ['APPROVE', 'ASSIGN_PICKUP', 'APPROVE_AND_ASSIGN'].includes(action))
    });

    await order.save();

    res.status(200).json({
      message: `${isExchange ? 'Exchange' : 'Return/Refund'} action '${action}' processed successfully`,
      order
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Resend doorstep return / exchange pickup OTP email to customer
// @route   POST /api/v1/ecommerce-admin/orders/:id/resend-return-otp
// @access  Private (ERP User)
exports.resendReturnPickupOtp = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const order = await Order.findOne({ _id: req.params.id, tenantId, source: 'WEB' });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (!order.customerEmail) {
      return res.status(400).json({ message: 'Customer does not have an email address on file.' });
    }

    if (!order.returnPickupOtp) {
      order.returnPickupOtp = Math.floor(100000 + Math.random() * 900000).toString();
      await order.save();
    }

    const company = await Company.findById(tenantId);
    await sendReturnPickupOtpEmail({
      to: order.customerEmail,
      customerName: order.customerName,
      orderRef: `WEB-${order._id.toString().slice(-6).toUpperCase()}`,
      pickupOtp: order.returnPickupOtp,
      returnType: order.returnType || 'RETURN',
      itemName: order.returnItem?.name || order.exchangeItemDetails || 'Ordered Product',
      riderName: order.returnRiderName || order.driverName || '',
      riderPhone: order.returnRiderPhone || order.driverPhone || '',
      companyName: company ? company.name : 'JTS Store'
    });

    res.status(200).json({
      success: true,
      message: `Pickup Verification OTP (${order.returnPickupOtp}) has been emailed to ${order.customerEmail} successfully!`
    });
  } catch (error) {
    console.error('resendReturnPickupOtp error:', error);
    res.status(500).json({ message: error.message || 'Failed to send OTP email.' });
  }
};


// ==========================================
// 2. E-COM SETTINGS & MULTI-LOCATION STOCK
// ==========================================

// @desc    Get E-Com settings with all available branches for configuration
// @route   GET /api/v1/ecommerce-admin/settings
// @access  Private (ERP User)
exports.getEcomSettings = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    await seedEcomMastersIfEmpty(tenantId);

    const [settingsDoc, allBranches] = await Promise.all([
      EcomSettings.findOne({ tenantId }),
      Branch.find({ tenantId, isActive: true }).select('name type address')
    ]);

    let settings = settingsDoc;
    if (!settings) {
      const defaultLocations = allBranches.map((b, idx) => ({
        branchId: b._id,
        branchName: b.name,
        safetyStockType: 'FIXED',
        safetyStockValue: 10,
        pickPriority: idx + 1,
        isActive: true
      }));

      settings = await EcomSettings.create({
        tenantId,
        includedLocations: defaultLocations,
        defaultSafetyStockType: 'FIXED',
        defaultSafetyStockValue: 10
      });
    }

    res.status(200).json({
      settings,
      availableBranches: allBranches
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update E-Com settings (Locations, safety stocks, pick priorities, store policies)
// @route   PUT /api/v1/ecommerce-admin/settings
// @access  Private (ERP User)
exports.updateEcomSettings = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const settings = await EcomSettings.findOneAndUpdate(
      { tenantId },
      req.body,
      { returnDocument: 'after', upsert: true, runValidators: true }
    );
    res.status(200).json(settings);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ==========================================
// 3. E-COM STATUS MASTER CONTROLLERS
// ==========================================

// @desc    Get all order statuses (with sendEmailToCustomer flag)
// @route   GET /api/v1/ecommerce-admin/statuses
// @access  Private (ERP User)
exports.getStatuses = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    await seedEcomMastersIfEmpty(tenantId);

    const statuses = await EcomStatus.find({ tenantId }).sort({ order: 1 });
    res.status(200).json(statuses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new order status
// @route   POST /api/v1/ecommerce-admin/statuses
// @access  Private (ERP User)
exports.createStatus = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const { name, code, color, badgeVariant, order, sendEmailToCustomer, emailSubject, emailTemplate } = req.body;

    const newStatus = await EcomStatus.create({
      tenantId,
      name,
      code: code ? code.toUpperCase().trim() : name.toUpperCase().replace(/\s+/g, '_'),
      color: color || '#3b82f6',
      badgeVariant: badgeVariant || 'info',
      order: Number(order) || 0,
      sendEmailToCustomer: Boolean(sendEmailToCustomer),
      emailSubject: emailSubject || 'Order #{{orderId}} status update',
      emailTemplate: emailTemplate || 'Your order status has been updated.',
      isSystem: false
    });

    res.status(201).json(newStatus);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update order status (including email toggle checkbox)
// @route   PUT /api/v1/ecommerce-admin/statuses/:id
// @access  Private (ERP User)
exports.updateStatus = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const updated = await EcomStatus.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      req.body,
      { returnDocument: 'after', runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Status not found' });
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete custom status (system statuses protected)
// @route   DELETE /api/v1/ecommerce-admin/statuses/:id
// @access  Private (ERP User)
exports.deleteStatus = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const status = await EcomStatus.findOne({ _id: req.params.id, tenantId });
    if (!status) return res.status(404).json({ message: 'Status not found' });

    if (status.isSystem) {
      return res.status(400).json({ message: 'System default statuses cannot be deleted. You can modify their name or email options.' });
    }

    await EcomStatus.deleteOne({ _id: status._id });
    res.status(200).json({ message: 'Status deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ==========================================
// 4. LOGISTICS & CARRIER MAPPING CONTROLLERS
// ==========================================

// @desc    Get all logistics carrier mappings
// @route   GET /api/v1/ecommerce-admin/logistics
// @access  Private (ERP User)
exports.getLogistics = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    await seedEcomMastersIfEmpty(tenantId);

    const carriers = await EcomLogistics.find({ tenantId }).sort({ createdAt: 1 });
    res.status(200).json(carriers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new logistics carrier mapping
// @route   POST /api/v1/ecommerce-admin/logistics
// @access  Private (ERP User)
exports.createLogistics = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const carrier = await EcomLogistics.create({
      tenantId,
      ...req.body
    });
    res.status(201).json(carrier);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update carrier mapping
// @route   PUT /api/v1/ecommerce-admin/logistics/:id
// @access  Private (ERP User)
exports.updateLogistics = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const updated = await EcomLogistics.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      req.body,
      { returnDocument: 'after', runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Carrier not found' });
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete carrier mapping
// @route   DELETE /api/v1/ecommerce-admin/logistics/:id
// @access  Private (ERP User)
exports.deleteLogistics = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    await EcomLogistics.findOneAndDelete({ _id: req.params.id, tenantId });
    res.status(200).json({ message: 'Carrier deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ==========================================
// 5. API KEYS & COUPONS
// ==========================================

exports.getApiKeys = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const keys = await ApiKey.find({ tenantId });
    res.status(200).json(keys);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createApiKey = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const apiKey = await ApiKey.create({
      tenantId,
      name: req.body.name || 'Storefront Key'
    });
    res.status(201).json(apiKey);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getCoupons = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const coupons = await Coupon.find({ tenantId });
    res.status(200).json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createCoupon = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const coupon = await Coupon.create({
      tenantId,
      ...req.body
    });
    res.status(201).json(coupon);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ==========================================
// 8. CUSTOMER REVIEWS & RATINGS CONTROLLERS
// ==========================================

// @desc    Get all reviews with product grouping & statistics
// @route   GET /api/v1/ecommerce-admin/reviews
// @access  Private (ERP Admin)
exports.getAdminReviews = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const { productId, rating, status, search } = req.query;

    const filter = { tenantId };
    if (productId && productId !== 'ALL') {
      filter.productId = productId;
    }
    if (rating && rating !== 'ALL') {
      filter.rating = Number(rating);
    }
    if (status === 'APPROVED') {
      filter.isApproved = true;
    } else if (status === 'PENDING') {
      filter.isApproved = false;
    }

    const reviews = await Review.find(filter)
      .populate('productId', 'name sku brand uploadImage salesPrice price')
      .populate('customerId', 'name firstName lastName email phone')
      .sort({ createdAt: -1 });

    let filteredReviews = reviews;
    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      filteredReviews = reviews.filter(r => {
        const prodName = r.productId?.name?.toLowerCase() || '';
        const prodSku = r.productId?.sku?.toLowerCase() || '';
        const custName = (r.customerId?.name || `${r.customerId?.firstName || ''} ${r.customerId?.lastName || ''}`).toLowerCase();
        const custEmail = r.customerId?.email?.toLowerCase() || '';
        const comment = r.comment?.toLowerCase() || '';
        return prodName.includes(s) || prodSku.includes(s) || custName.includes(s) || custEmail.includes(s) || comment.includes(s);
      });
    }

    // All reviews for product-level grouping and KPIs
    const allReviewsForTenant = await Review.find({ tenantId })
      .populate('productId', 'name sku brand uploadImage salesPrice price')
      .populate('customerId', 'name firstName lastName email');

    const productMap = {};
    let totalRatingSum = 0;
    let approvedCount = 0;
    let pendingCount = 0;

    allReviewsForTenant.forEach(r => {
      totalRatingSum += Number(r.rating) || 0;
      if (r.isApproved) approvedCount++;
      else pendingCount++;

      const pId = r.productId?._id?.toString() || 'unknown';
      if (!productMap[pId]) {
        productMap[pId] = {
          productId: pId,
          name: r.productId?.name || 'Unknown Product',
          sku: r.productId?.sku || 'N/A',
          brand: r.productId?.brand || '',
          uploadImage: r.productId?.uploadImage || '',
          salesPrice: r.productId?.salesPrice || r.productId?.price || 0,
          reviewCount: 0,
          ratingSum: 0,
          ratings: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        };
      }
      productMap[pId].reviewCount++;
      productMap[pId].ratingSum += Number(r.rating) || 0;
      const rateRounded = Math.round(Number(r.rating) || 5);
      if (productMap[pId].ratings[rateRounded] !== undefined) {
        productMap[pId].ratings[rateRounded]++;
      }
    });

    const productStats = Object.values(productMap).map(p => ({
      ...p,
      avgRating: p.reviewCount > 0 ? (p.ratingSum / p.reviewCount).toFixed(1) : '0.0'
    })).sort((a, b) => b.reviewCount - a.reviewCount);

    const totalReviews = allReviewsForTenant.length;
    const avgStoreRating = totalReviews > 0 ? (totalRatingSum / totalReviews).toFixed(1) : '0.0';

    res.status(200).json({
      reviews: filteredReviews,
      productStats,
      summary: {
        totalReviews,
        avgStoreRating,
        approvedCount,
        pendingCount,
        productsWithReviews: productStats.length
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update review status (approve or hide)
// @route   PUT /api/v1/ecommerce-admin/reviews/:id/status
// @access  Private (ERP Admin)
exports.updateReviewStatus = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const { id } = req.params;
    const { isApproved } = req.body;
    const review = await Review.findOneAndUpdate(
      { _id: id, tenantId },
      { isApproved: Boolean(isApproved) },
      { new: true }
    ).populate('productId', 'name sku').populate('customerId', 'name email');
    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.status(200).json(review);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete review
// @route   DELETE /api/v1/ecommerce-admin/reviews/:id
// @access  Private (ERP Admin)
exports.deleteReview = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const { id } = req.params;
    const review = await Review.findOneAndDelete({ _id: id, tenantId });
    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


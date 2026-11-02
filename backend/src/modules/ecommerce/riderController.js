const Order = require('../../core/models/Order');
const OrderItem = require('../../core/models/OrderItem');
const EcomStatus = require('../../core/models/EcomStatus');
const EcomSettings = require('../../core/models/EcomSettings');
const Stock = require('../../core/models/Stock');
const Company = require('../../core/models/Company');

// @desc    Get order details for Rider delivery verification (No-Login QR Scan)
// @route   GET /api/v1/ecommerce/rider/order/:id
// @access  Public (Order ID)
exports.getRiderOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).select('+trackingTokenHash');
    if (!order) {
      return res.status(404).json({ message: 'Order not found or invalid delivery QR code.' });
    }

    // Auto-generate 4-digit Delivery OTP if missing
    if (!order.deliveryOtp) {
      order.deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
      await order.save();
    }

    const [items, settings] = await Promise.all([
      OrderItem.find({ orderId: order._id }).populate('productId', 'name uploadImage images sku salesPrice'),
      EcomSettings.findOne({ tenantId: order.tenantId }).lean()
    ]);

    const enablePhotoPod = settings ? settings.enableRiderPhotoPod !== false : true;
    const enableSignaturePod = settings ? settings.enableRiderSignaturePod !== false : true;
    const requireDeliveryPod = enablePhotoPod || enableSignaturePod;
    const enableCodUpi = settings ? settings.enableRiderCodUpi !== false : true;
    const enableCodCard = settings ? settings.enableRiderCodCard !== false : true;

    const isReturnOrExchange = Boolean(
      (order.returnStatus && !['NONE', 'REJECTED', 'COMPLETED'].includes(order.returnStatus)) ||
      String(order.ecomStatusCode || order.status || '').toUpperCase().includes('RETURN') ||
      String(order.ecomStatusCode || order.status || '').toUpperCase().includes('EXCHANGE')
    );
    const isCOD = isReturnOrExchange
      ? (order.returnType === 'EXCHANGE' && Number(order.exchangePriceDifference || 0) > 0)
      : ((order.paymentMethod || '').toUpperCase().includes('COD') || (order.paymentStatus || '').toUpperCase() === 'UNPAID');
    const isDelivered = (order.ecomStatusCode || order.status || '').toUpperCase() === 'DELIVERED' && !isReturnOrExchange;

    res.status(200).json({
      success: true,
      order: {
        _id: order._id,
        orderRef: `WEB-${order._id.toString().slice(-6).toUpperCase()}`,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        shippingAddress: order.shippingAddress,
        shippingAddressObj: order.shippingAddressObj,
        status: order.ecomStatusCode || order.status,
        deliveryStatus: order.deliveryStatus,
        deliveryType: order.deliveryType,
        driverName: order.driverName,
        driverPhone: order.driverPhone,
        vehicleNumber: order.vehicleNumber,
        carrier: order.carrier,
        trackingNumber: order.trackingNumber,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        paymentReference: order.paymentReference,
        isCOD,
        codCollectionMethod: order.codCollectionMethod || 'NONE',
        codTransactionId: order.codTransactionId || '',
        codCollectedAmount: order.codCollectedAmount || 0,
        codCollectedAt: order.codCollectedAt || null,
        codSettlementStatus: order.codSettlementStatus || 'NOT_APPLICABLE',
        codSettledAt: order.codSettledAt || null,
        codSettledBy: order.codSettledBy || '',
        totalAmount: order.totalAmount,
        currency: order.currency || 'INR',
        isDelivered,
        deliveredAt: order.deliveredAt,
        deliveredByRider: order.deliveredByRider,
        deliveryProofPhoto: order.deliveryProofPhoto,
        deliveryNotes: order.deliveryNotes,
        customerSignature: order.customerSignature,
        requireDeliveryPod,
        enablePhotoPod,
        enableSignaturePod,
        enableCodUpi,
        enableCodCard,
        // Reverse Return Info (if order is also/instead a return pickup):
        returnStatus: order.returnStatus,
        returnType: order.returnType,
        returnPickupOtp: order.returnPickupOtp,
        returnRiderName: order.returnRiderName,
        returnPickupProof: order.returnPickupProof,
        returnItem: order.returnItem,
        returnReason: order.returnReason,
        returnSubReason: order.returnSubReason,
        exchangeMode: order.exchangeMode,
        exchangePriceDifference: order.exchangePriceDifference,
        exchangeDifferenceAction: order.exchangeDifferenceAction,
        items: items.map(it => ({
          name: it.productId?.name || it.name,
          sku: it.productId?.sku || it.sku,
          quantity: it.quantity,
          price: it.price || it.unitPrice,
          image: it.productId?.uploadImage || (it.productId?.images && it.productId.images[0]) || it.image
        })),
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    console.error('getRiderOrder error:', error);
    res.status(500).json({ message: 'Failed to retrieve order details for delivery.' });
  }
};

// @desc    Confirm doorstep delivery by rider with OTP & Camera Photo Proof (POD)
// @route   POST /api/v1/ecommerce/rider/deliver/:id
// @access  Public / Rider
exports.confirmRiderDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp, photoProof, customerSignature, riderName, notes, codCollectionMethod, codTransactionId } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    if ((order.ecomStatusCode || order.status || '').toUpperCase() === 'DELIVERED') {
      return res.status(400).json({ message: 'This package has already been marked as DELIVERED.' });
    }

    if ((order.ecomStatusCode || order.status || '').toUpperCase() === 'CANCELLED') {
      return res.status(400).json({ message: 'Cannot deliver a CANCELLED order. Please return package to warehouse.' });
    }

    // Verify OTP (supports both Forward Delivery OTP and Reverse Return/Exchange Pickup OTP)
    const cleanInputOtp = String(otp || '').trim();
    const expectedOtp = String(order.deliveryOtp || '').trim();
    const expectedReturnOtp = String(order.returnPickupOtp || '').trim();

    if (!cleanInputOtp) {
      return res.status(400).json({ message: 'Please enter the Customer Verification OTP.' });
    }

    // Match against expected OTP, returnPickupOtp, or fallback if OTP wasn't initialized
    const isValidOtp =
      (expectedOtp && cleanInputOtp === expectedOtp) ||
      (expectedReturnOtp && cleanInputOtp === expectedReturnOtp) ||
      (!expectedOtp && !expectedReturnOtp && cleanInputOtp === order._id.toString().slice(-4).toUpperCase());

    if (!isValidOtp) {
      return res.status(400).json({
        message: 'Invalid OTP! Please ask the customer to check the Verification OTP sent to their email/phone or storefront order screen.'
      });
    }

    // Check POD settings for this tenant
    const settings = await EcomSettings.findOne({ tenantId: order.tenantId }).lean();
    const enablePhotoPod = settings ? settings.enableRiderPhotoPod !== false : true;
    const enableSignaturePod = settings ? settings.enableRiderSignaturePod !== false : true;

    // Require Proof of Delivery based on which checkpoints are enabled in E-Commerce Settings
    if (enablePhotoPod && !enableSignaturePod && !photoProof) {
      return res.status(400).json({
        message: 'Doorstep Photo Proof (POD) is required! Please capture or upload a photo before confirming.'
      });
    }
    if (!enablePhotoPod && enableSignaturePod && !customerSignature) {
      return res.status(400).json({
        message: 'Customer E-Signature is required! Please collect customer signature before confirming.'
      });
    }
    if (enablePhotoPod && enableSignaturePod && !photoProof && !customerSignature) {
      return res.status(400).json({
        message: 'Proof of Delivery is required! Please provide a Photo Proof (POD) or Customer Signature before confirming.'
      });
    }

    const isReturnOrExchange = Boolean(
      (order.returnStatus && !['NONE', 'REJECTED', 'COMPLETED'].includes(order.returnStatus)) ||
      String(order.ecomStatusCode || order.status || '').toUpperCase().includes('RETURN') ||
      String(order.ecomStatusCode || order.status || '').toUpperCase().includes('EXCHANGE')
    );
    const isCOD = isReturnOrExchange
      ? (order.returnType === 'EXCHANGE' && Number(order.exchangePriceDifference || 0) > 0)
      : ((order.paymentMethod || '').toUpperCase().includes('COD') || (order.paymentStatus || '').toUpperCase() === 'UNPAID');
    const effectiveCodMethod = codCollectionMethod || order.codCollectionMethod || 'NONE';

    if (isCOD && (!effectiveCodMethod || effectiveCodMethod === 'NONE')) {
      return res.status(400).json({
        message: 'Pay on Delivery (COD) collection is required! Please collect payment via Dynamic UPI QR, Card (POS), or Cash before confirming delivery.'
      });
    }

    // If this was a Return / Exchange Pickup, also update returnStatus
    if (isReturnOrExchange && ['REQUESTED', 'APPROVED', 'PICKUP_ASSIGNED'].includes(order.returnStatus)) {
      order.returnStatus = 'PICKED_UP';
      order.returnPickedUpAt = new Date();
      order.returnPickupProof = photoProof || customerSignature || '';
      order.returnRiderName = riderName || order.returnRiderName || order.driverName || 'In-House Rider';
    }

    // Update Order to DELIVERED
    order.status = 'DELIVERED';
    order.ecomStatusCode = 'DELIVERED';
    order.deliveryStatus = 'DELIVERED';
    order.deliveredAt = new Date();
    order.deliveryProofPhoto = photoProof || '';
    order.customerSignature = customerSignature || '';
    order.deliveredByRider = riderName || order.driverName || 'In-House Rider';
    order.deliveryNotes = notes || '';

    // If COD, mark payment as collected / PAID with exact method (UPI_QR / CARD_POS / CASH)
    let codHistoryNote = '';
    if (isCOD) {
      const finalMethod = ['CASH', 'UPI_QR', 'CARD_POS'].includes(effectiveCodMethod) ? effectiveCodMethod : 'CASH';
      const finalTxnId = codTransactionId || order.codTransactionId || (
        finalMethod === 'UPI_QR'
          ? `UPI-UTR-${Math.floor(100000000000 + Math.random() * 900000000000)}`
          : finalMethod === 'CARD_POS'
            ? `POS-RRN-${Math.floor(1000000000 + Math.random() * 9000000000)}`
            : `CASH-RCPT-${order._id.toString().slice(-6).toUpperCase()}`
      );

      order.paymentStatus = 'PAID';
      order.codCollectionMethod = finalMethod;
      order.codTransactionId = finalTxnId;
      order.codCollectedAmount = Number(order.totalAmount || 0);
      order.codCollectedAt = order.codCollectedAt || new Date();
      if (order.codSettlementStatus !== 'SETTLED_TO_HUB') {
        order.codSettlementStatus = finalMethod === 'CASH' ? 'IN_RIDER_HAND' : 'SETTLED_DIGITAL';
      }
      order.paymentReference = `${finalMethod}_DOORSTEP_${finalTxnId}_BY_${(riderName || order.driverName || 'RIDER').toUpperCase()}`;

      const methodLabel = finalMethod === 'UPI_QR' ? 'Dynamic UPI QR' : finalMethod === 'CARD_POS' ? 'Card (M-POS)' : 'Cash';
      codHistoryNote = ` Pay-on-Delivery collected via ${methodLabel}: ${(order.currency || 'INR')} ${order.totalAmount} (Ref: ${finalTxnId}).`;
    }

    // Match Delivered status doc if available
    const deliveredStatus = await EcomStatus.findOne({ tenantId: order.tenantId, code: 'DELIVERED' });
    if (deliveredStatus) {
      order.ecomStatusId = deliveredStatus._id;
    }

    // Append to status history
    const podSummary = (photoProof || customerSignature)
      ? `Proof of delivery captured by ${order.deliveredByRider}.`
      : `Delivered by ${order.deliveredByRider}.`;

    order.statusHistory.push({
      status: 'Delivered',
      statusCode: 'DELIVERED',
      note: `Package handed over at doorstep. Customer OTP verified. ${podSummary}${codHistoryNote}`,
      changedAt: new Date(),
      changedBy: order.deliveredByRider,
      emailSent: false
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Delivery confirmed successfully! Package marked as DELIVERED with proof photo.',
      deliveredAt: order.deliveredAt,
      deliveredByRider: order.deliveredByRider,
      orderRef: `WEB-${order._id.toString().slice(-6).toUpperCase()}`
    });
  } catch (error) {
    console.error('confirmRiderDelivery error:', error);
    res.status(500).json({ message: error.message || 'Failed to confirm delivery.' });
  }
};

// @desc    Confirm return pickup by rider with return OTP & photo proof
// @route   POST /api/v1/ecommerce/rider/pickup/:id
// @access  Public / Rider
exports.confirmRiderPickup = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp, photoProof, riderName, notes } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    if (order.returnStatus === 'PICKED_UP' || order.returnStatus === 'INSPECTED' || order.returnStatus === 'COMPLETED') {
      return res.status(400).json({ message: 'This return item has already been picked up.' });
    }

    const cleanInputOtp = String(otp || '').trim();
    const expectedOtp = String(order.returnPickupOtp || '').trim();

    if (!cleanInputOtp) {
      return res.status(400).json({ message: 'Please enter the 6-digit Customer Return Pickup OTP.' });
    }

    if (expectedOtp && cleanInputOtp !== expectedOtp) {
      return res.status(400).json({ message: 'Invalid Return Pickup OTP. Please ask customer for the OTP shown on their screen.' });
    }

    if (!photoProof) {
      return res.status(400).json({ message: 'Photo proof of the returned item/packaging is required before pickup.' });
    }

    order.returnStatus = 'PICKED_UP';
    order.returnPickedUpAt = new Date();
    order.returnPickupProof = photoProof;
    order.returnRiderName = riderName || order.returnRiderName || order.driverName || 'In-House Rider';

    order.returnAuditTrail.push({
      step: 'PICKUP_COMPLETED',
      title: 'Item Picked Up at Doorstep',
      actor: order.returnRiderName,
      deliveryType: 'IN_HOUSE',
      carrierOrRider: order.returnRiderName,
      trackingOrProof: 'OTP Handover Verified + Photo Proof Uploaded',
      note: notes || 'Item successfully collected from customer. En route to warehouse for inspection.',
      timestamp: new Date()
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Return pickup confirmed successfully! Item collected and verified.',
      returnPickedUpAt: order.returnPickedUpAt
    });
  } catch (error) {
    console.error('confirmRiderPickup error:', error);
    res.status(500).json({ message: error.message || 'Failed to confirm return pickup.' });
  }
};

// @desc    Get assigned orders for Rider Portal (Method 2)
// @route   GET /api/v1/ecommerce/rider/assigned-orders
// @access  Public / Rider
exports.getRiderAssignedOrders = async (req, res) => {
  try {
    const { phone, driverName, status } = req.query;

    const query = {
      source: 'WEB',
      status: { $ne: 'CANCELLED' }
    };

    // Filter by rider phone or name if provided
    if (phone) {
      query.$or = [
        { driverPhone: phone.trim() },
        { returnRiderPhone: phone.trim() }
      ];
    } else if (driverName) {
      query.$or = [
        { driverName: { $regex: driverName.trim(), $options: 'i' } },
        { returnRiderName: { $regex: driverName.trim(), $options: 'i' } }
      ];
    } else {
      // Return in-house deliveries or recent active orders
      query.deliveryType = 'IN_HOUSE';
    }

    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    const orderIds = orders.map(ord => ord._id);
    const orderItems = await OrderItem.find({ orderId: { $in: orderIds } })
      .populate('productId', 'name uploadImage images sku salesPrice');

    const itemsByOrder = {};
    for (const it of orderItems) {
      const oId = it.orderId.toString();
      if (!itemsByOrder[oId]) itemsByOrder[oId] = [];
      itemsByOrder[oId].push({
        _id: it._id,
        name: it.productId?.name || it.name || 'Product Item',
        sku: it.productId?.sku || it.sku || it.variantSku || '',
        quantity: it.quantity,
        price: it.unitPrice || it.price || 0,
        subTotal: it.subTotal || ((it.unitPrice || 0) * (it.quantity || 1)),
        image: it.productId?.uploadImage || (it.productId?.images && it.productId.images[0]) || it.image,
        attributes: it.selectedAttributes ? (it.selectedAttributes instanceof Map ? Object.fromEntries(it.selectedAttributes) : it.selectedAttributes) : {}
      });
    }

    // Ensure deliveryOtp is assigned for any pending order
    for (const ord of orders) {
      if (!ord.deliveryOtp && !ord.deliveredAt) {
        ord.deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
        await ord.save();
      }
    }

    const firstTenantId = orders[0]?.tenantId;
    const settings = firstTenantId
      ? await EcomSettings.findOne({ tenantId: firstTenantId }).lean()
      : await EcomSettings.findOne().lean();

    const enablePhotoPod = settings ? settings.enableRiderPhotoPod !== false : true;
    const enableSignaturePod = settings ? settings.enableRiderSignaturePod !== false : true;
    const requireDeliveryPod = enablePhotoPod || enableSignaturePod;
    const enableCodUpi = settings ? settings.enableRiderCodUpi !== false : true;
    const enableCodCard = settings ? settings.enableRiderCodCard !== false : true;

    const formatted = orders.map(ord => ({
      _id: ord._id,
      orderRef: `WEB-${ord._id.toString().slice(-6).toUpperCase()}`,
      customerName: ord.customerName,
      customerPhone: ord.customerPhone,
      customerEmail: ord.customerEmail,
      shippingAddress: ord.shippingAddress,
      shippingAddressObj: ord.shippingAddressObj,
      totalAmount: ord.totalAmount,
      currency: ord.currency || 'INR',
      status: ord.ecomStatusCode || ord.status,
      deliveryStatus: ord.deliveryStatus,
      isCOD: (
        (ord.returnStatus && !['NONE', 'REJECTED', 'COMPLETED'].includes(ord.returnStatus)) ||
        String(ord.ecomStatusCode || ord.status || '').toUpperCase().includes('RETURN') ||
        String(ord.ecomStatusCode || ord.status || '').toUpperCase().includes('EXCHANGE')
      )
        ? (ord.returnType === 'EXCHANGE' && Number(ord.exchangePriceDifference || 0) > 0)
        : ((ord.paymentMethod || '').toUpperCase().includes('COD') || (ord.paymentStatus || '').toUpperCase() === 'UNPAID'),
      paymentMethod: ord.paymentMethod,
      paymentStatus: ord.paymentStatus,
      codCollectionMethod: ord.codCollectionMethod || 'NONE',
      codTransactionId: ord.codTransactionId || '',
      codCollectedAmount: ord.codCollectedAmount || 0,
      codCollectedAt: ord.codCollectedAt || null,
      codSettlementStatus: ord.codSettlementStatus || 'NOT_APPLICABLE',
      codSettledAt: ord.codSettledAt || null,
      codSettledBy: ord.codSettledBy || '',
      driverName: ord.driverName,
      driverPhone: ord.driverPhone,
      vehicleNumber: ord.vehicleNumber,
      deliveryOtp: ord.deliveryOtp,
      deliveredAt: ord.deliveredAt,
      deliveryProofPhoto: ord.deliveryProofPhoto,
      customerSignature: ord.customerSignature,
      requireDeliveryPod,
      enablePhotoPod,
      enableSignaturePod,
      enableCodUpi,
      enableCodCard,
      isDelivered: (ord.ecomStatusCode || ord.status || '').toUpperCase() === 'DELIVERED',
      returnStatus: ord.returnStatus,
      returnType: ord.returnType,
      returnPickupOtp: ord.returnPickupOtp,
      exchangePriceDifference: ord.exchangePriceDifference || 0,
      items: itemsByOrder[ord._id.toString()] || [],
      itemsCount: (itemsByOrder[ord._id.toString()] || []).reduce((acc, i) => acc + (i.quantity || 1), 0),
      createdAt: ord.createdAt
    }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      orders: formatted
    });
  } catch (error) {
    console.error('getRiderAssignedOrders error:', error);
    res.status(500).json({ message: 'Failed to retrieve assigned orders.' });
  }
};

// @desc    Cancel / Reject delivery at doorstep by rider (RTO - Customer Refused / Unreachable)
// @route   POST /api/v1/ecommerce/rider/cancel/:id
// @access  Public / Rider
exports.cancelRiderDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, notes, riderName } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const currentCode = (order.ecomStatusCode || order.status || '').toUpperCase();
    if (currentCode === 'DELIVERED') {
      return res.status(400).json({ message: 'Order is already DELIVERED and cannot be cancelled.' });
    }
    if (currentCode === 'CANCELLED') {
      return res.status(400).json({ message: 'Order is already marked as CANCELLED.' });
    }

    // Restore stock back to fulfillment branch(es) (RTO - Return to Origin)
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

    const finalRider = riderName || order.driverName || 'In-House Rider';
    const fullReason = `${reason || 'Customer Refused at Doorstep'}${notes ? ' - ' + notes : ''}`;

    order.status = 'CANCELLED';
    order.ecomStatusCode = 'CANCELLED';
    order.cancellationReason = `Cancelled by Rider (${finalRider}): ${fullReason}`;
    order.cancelledAt = new Date();

    const cancelledStatus = await EcomStatus.findOne({ tenantId: order.tenantId, code: 'CANCELLED' });
    if (cancelledStatus) {
      order.ecomStatusId = cancelledStatus._id;
    }

    order.statusHistory.push({
      status: 'Cancelled (Doorstep RTO)',
      statusCode: 'CANCELLED',
      note: `Order cancelled at doorstep by Rider (${finalRider}). Reason: ${fullReason}. Inventory stock restored to warehouse.`,
      changedAt: new Date(),
      changedBy: finalRider,
      emailSent: false
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order marked as CANCELLED (RTO) and stock restored to warehouse.',
      cancelledAt: order.cancelledAt,
      cancellationReason: order.cancellationReason
    });
  } catch (error) {
    console.error('cancelRiderDelivery error:', error);
    res.status(500).json({ message: error.message || 'Failed to cancel order.' });
  }
};

// @desc    Simulate / Collect Doorstep Pay-on-Delivery (COD) via Dynamic UPI QR, Card M-POS, or Cash
// @route   POST /api/v1/ecommerce/rider/collect-cod/:id
// @access  Public / Rider
exports.simulateRiderCodPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { collectionMethod, cardLast4, riderName } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    if ((order.ecomStatusCode || order.status || '').toUpperCase() === 'CANCELLED') {
      return res.status(400).json({ message: 'Cannot collect payment for a CANCELLED order.' });
    }

    const validMethod = ['UPI_QR', 'CARD_POS', 'CASH'].includes(collectionMethod) ? collectionMethod : 'CASH';
    let txnId = '';

    if (validMethod === 'UPI_QR') {
      txnId = `UPI-UTR-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    } else if (validMethod === 'CARD_POS') {
      const last4 = String(cardLast4 || '4242').replace(/\D/g, '').slice(-4) || '4242';
      txnId = `POS-RRN-${Math.floor(10000000 + Math.random() * 90000000)}-XX${last4}`;
    } else {
      txnId = `CASH-RCPT-${order._id.toString().slice(-6).toUpperCase()}`;
    }

    const actor = riderName || order.driverName || 'In-House Rider';

    order.codCollectionMethod = validMethod;
    order.codTransactionId = txnId;
    order.codCollectedAmount = Number(order.totalAmount || 0);
    order.codCollectedAt = new Date();
    order.codSettlementStatus = validMethod === 'CASH' ? 'IN_RIDER_HAND' : 'SETTLED_DIGITAL';
    order.paymentStatus = 'PAID';
    order.paymentProvider = validMethod === 'CASH' ? 'DOORSTEP_CASH' : 'DUMMY_DOORSTEP_GATEWAY';
    order.paymentReference = `${validMethod}_DOORSTEP_${txnId}_BY_${actor.toUpperCase()}`;

    await order.save();

    res.status(200).json({
      success: true,
      message: validMethod === 'UPI_QR'
        ? `Dummy UPI QR Payment Verified! UTR: ${txnId}`
        : validMethod === 'CARD_POS'
          ? `Dummy Card M-POS Payment Approved! RRN: ${txnId}`
          : `Cash Collection Confirmed (${order.currency || 'INR'} ${order.totalAmount})`,
      codCollectionMethod: order.codCollectionMethod,
      codTransactionId: order.codTransactionId,
      codCollectedAmount: order.codCollectedAmount,
      codCollectedAt: order.codCollectedAt,
      paymentStatus: order.paymentStatus
    });
  } catch (error) {
    console.error('simulateRiderCodPayment error:', error);
    res.status(500).json({ message: error.message || 'Failed to record COD collection.' });
  }
};

const Order = require('../../core/models/Order');
const OrderItem = require('../../core/models/OrderItem');
const Stock = require('../../core/models/Stock');
const mongoose = require('mongoose');
const { verifyBranchAccess, verifyProductAccess } = require('../../core/middleware/authMiddleware');

// @desc    Get all sales orders for a branch (or all branches for global admin)
// @route   GET /api/v1/sales
// @access  Private
exports.getSales = async (req, res) => {
  try {
    const filter = { tenantId: req.user.tenantId };
    
    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    
    if (req.user.branches && req.user.branches.length > 0) {
      filter.branchId = { $in: req.user.branches };
    } else if (!hasWildcard) {
      filter.branchId = { $in: [] };
    }

    if (req.query.branchId) {
      if (filter.branchId) {
        if (!req.user.branches?.includes(req.query.branchId) && !hasWildcard) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      }
      filter.branchId = req.query.branchId;
    }

    const orders = await Order.find(filter)
      .populate('branchId', 'name')
      .populate('userId', 'firstName lastName')
      .populate('quoteId', 'quoteNumber')
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Process a new checkout/sale
// @route   POST /api/v1/sales
// @access  Private
exports.createSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { branchId, customerId, customerName, items, paymentMethod, discountAmount, taxAmount } = req.body;
    
    if (!branchId) {
      throw new Error('Branch ID is required for a POS sale');
    }

    const isAuthorized = await verifyBranchAccess(branchId, req);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this branch' });
    }

    if (!items || items.length === 0) {
      throw new Error('No items in the cart');
    }

    // Calculate total
    let totalAmount = 0;
    for (const item of items) {
      const isProductAuthorized = await verifyProductAccess(item.productId, req, true);
      if (!isProductAuthorized) {
        throw new Error(`Forbidden: Product ${item.productId} does not belong to this tenant or is inactive`);
      }

      totalAmount += (item.quantity * item.unitPrice);
    }
    
    totalAmount = totalAmount - (discountAmount || 0) + (taxAmount || 0);

    // 1. Create the Order
    const order = await Order.create([{
      tenantId: req.user.tenantId,
      branchId,
      customerId: customerId || undefined,
      userId: req.user._id,
      customerName,
      totalAmount,
      discountAmount,
      taxAmount,
      paymentMethod,
      status: 'COMPLETED'
    }], { session });

    // 2. Create Order Items & Deduct Stock
    for (const item of items) {
      await OrderItem.create([{
        tenantId: req.user.tenantId,
        orderId: order[0]._id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subTotal: item.quantity * item.unitPrice
      }], { session });

      // Find stock for this branch and product
      const stock = await Stock.findOne({
        tenantId: req.user.tenantId,
        branchId,
        productId: item.productId
      }).session(session);

      if (!stock || stock.quantity < item.quantity) {
        throw new Error(`Insufficient stock for product ID ${item.productId} at this branch`);
      }

      // Deduct stock
      stock.quantity -= item.quantity;
      await stock.save({ session });
    }

    await session.commitTransaction();
    res.status(201).json(order[0]);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Get single sales order by ID
// @route   GET /api/v1/sales/:id
// @access  Private
exports.getSaleById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, tenantId: req.user.tenantId })
      .populate('branchId', 'name')
      .populate('userId', 'firstName lastName')
      .populate('customerId', 'name email phone address');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      if (!req.user.branches.includes(order.branchId._id.toString())) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    } else if (!hasWildcard) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const items = await OrderItem.find({ orderId: order._id, tenantId: req.user.tenantId })
      .populate('productId', 'name sku uom');

    res.status(200).json({ order, items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Confirm a DRAFT Sales Order
// @route   PATCH /api/v1/sales/:id/confirm
// @access  Private
exports.confirmOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      if (!req.user.branches.includes(order.branchId.toString())) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    } else if (!hasWildcard) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (order.status !== 'DRAFT') {
      return res.status(400).json({ message: `Cannot confirm order in ${order.status} status` });
    }

    order.status = 'CONFIRMED';
    await order.save();

    res.status(200).json({ message: 'Order confirmed successfully', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

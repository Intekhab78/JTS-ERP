const PurchaseOrder = require('../../core/models/PurchaseOrder');
const PurchaseOrderItem = require('../../core/models/PurchaseOrderItem');
const PurchaseOrderSchedule = require('../../core/models/PurchaseOrderSchedule');
const GRN = require('../../core/models/GRN');
const Stock = require('../../core/models/Stock');
const Company = require('../../core/models/Company');
const Counter = require('../../core/models/Counter');
const Branch = require('../../core/models/Branch');
const mongoose = require('mongoose');
const { verifyBranchAccess, verifyProductAccess } = require('../../core/middleware/authMiddleware');
const { validateSupplierTradeLicense } = require('./purchaseHelper');

const generatePONumber = async (tenantId, session) => {
  const currentYear = new Date().getFullYear();
  const counterId = `PO_${currentYear}`;

  const counter = await Counter.findOneAndUpdate(
    { tenantId, sequenceName: counterId, year: currentYear },
    { $inc: { sequenceValue: 1 } },
    { returnDocument: 'after', upsert: true, session }
  );

  const seqStr = String(counter.sequenceValue).padStart(6, '0');
  return `PO-${currentYear}-${seqStr}`;
};

// @desc    Get all purchase orders
// @route   GET /api/v1/purchases
// @access  Private
exports.getPurchaseOrders = async (req, res) => {
  try {
    const filter = { tenantId: req.user.tenantId };
    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      filter.branchId = { $in: req.user.branches };
    } else if (!hasWildcard) {
      filter.branchId = { $in: [] };
    }

    const pos = await PurchaseOrder.find(filter)
      .populate('supplierId', 'name')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json(pos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single purchase order
// @route   GET /api/v1/purchases/:id
// @access  Private
exports.getPurchaseOrderById = async (req, res) => {
  try {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, tenantId: req.user.tenantId })
      .populate('supplierId', 'name email phone address')
      .populate('branchId', 'name');

    if (!po) return res.status(404).json({ message: 'PO not found' });

    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      if (!req.user.branches.includes(po.branchId?._id?.toString() || po.branchId?.toString())) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    } else if (!hasWildcard) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const items = await PurchaseOrderItem.find({ purchaseOrderId: po._id }).populate('productId', 'name sku');

    // Fetch related GRNs
    const grns = await GRN.find({ purchaseOrderId: po._id, isActive: true })
      .select('grnNumber status receiptDate')
      .sort({ createdAt: -1 });

    const schedules = await PurchaseOrderSchedule.find({ purchaseOrderId: po._id }).populate('branchId', 'name').populate('productId', 'name sku');

    res.status(200).json({ ...po.toObject(), items, grns, schedules });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new PO
// @route   POST /api/v1/purchases
// @access  Private
exports.createPurchaseOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { branchId, supplierId, items, expectedDate, notes, currency, paymentTerms } = req.body;

    const isAuthorized = await verifyBranchAccess(branchId, req);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this branch' });
    }

    const tradeLicenseValidation = await validateSupplierTradeLicense(supplierId, req.user.tenantId);
    if (!tradeLicenseValidation.valid) {
      return res.status(400).json({
        success: false,
        message: tradeLicenseValidation.message,
        code: tradeLicenseValidation.code
      });
    }

    if (!items || items.length === 0) {
      throw new Error('No items in the purchase order');
    }

    let totalAmount = 0;
    for (const item of items) {
      const isProductAuthorized = await verifyProductAccess(item.productId, req, true);
      if (!isProductAuthorized) {
        throw new Error(`Forbidden: Product ${item.productId} does not belong to this tenant or is inactive`);
      }
      totalAmount += (item.quantity * item.unitCost);
    }

    // Default currency if not provided
    let poCurrency = currency;
    if (!poCurrency) {
      const company = await Company.findById(req.user.tenantId).session(session);
      poCurrency = company?.currency || 'AED';
    }

    const purchaseOrderNumber = await generatePONumber(req.user.tenantId, session);

    const po = await PurchaseOrder.create([{
      tenantId: req.user.tenantId,
      purchaseOrderNumber,
      branchId,
      supplierId,
      userId: req.user._id,
      totalAmount,
      expectedDate,
      notes,
      currency: poCurrency,
      paymentTerms: paymentTerms || 'Immediate',
      status: 'DRAFT'
    }], { session });

    for (const item of items) {
      await PurchaseOrderItem.create([{
        tenantId: req.user.tenantId,
        purchaseOrderId: po[0]._id,
        productId: item.productId,
        quantity: item.quantity,
        description: item.description || '',
        uom: item.uom || 'PCS',
        unitCost: item.unitCost,
        subTotal: item.quantity * item.unitCost
      }], { session });
    }

    await session.commitTransaction();
    res.status(201).json(po[0]);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Update a PO
// @route   PUT /api/v1/purchases/:id
// @access  Private
exports.updatePurchaseOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { branchId, supplierId, items, expectedDate, notes, currency, paymentTerms } = req.body;
    const po = await PurchaseOrder.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).session(session);

    if (!po) throw new Error('Purchase Order not found');
    if (po.status !== 'DRAFT') throw new Error('Only DRAFT POs can be edited');

    const isAuthorized = await verifyBranchAccess(branchId || po.branchId, req);
    if (!isAuthorized) return res.status(403).json({ message: 'Forbidden: You do not have access to this branch' });

    let totalAmount = 0;
    if (items && items.length > 0) {
      for (const item of items) {
        const isProductAuthorized = await verifyProductAccess(item.productId, req, true);
        if (!isProductAuthorized) throw new Error(`Forbidden: Product ${item.productId} does not belong to this tenant`);
        totalAmount += (item.quantity * item.unitCost);
      }

      await PurchaseOrderItem.deleteMany({ purchaseOrderId: po._id }).session(session);
      for (const item of items) {
        await PurchaseOrderItem.create([{
          tenantId: req.user.tenantId,
          purchaseOrderId: po._id,
          productId: item.productId,
          quantity: item.quantity,
          description: item.description || '',
          uom: item.uom || 'PCS',
          unitCost: item.unitCost,
          subTotal: item.quantity * item.unitCost
        }], { session });
      }
      po.totalAmount = totalAmount;
    }

    if (branchId) po.branchId = branchId;
    if (supplierId) po.supplierId = supplierId;
    if (expectedDate !== undefined) po.expectedDate = expectedDate;
    if (notes !== undefined) po.notes = notes;
    if (currency !== undefined) po.currency = currency;
    if (paymentTerms !== undefined) po.paymentTerms = paymentTerms;

    await po.save({ session });
    await session.commitTransaction();
    res.status(200).json(po);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Confirm a PO
// @route   POST /api/v1/purchases/:id/confirm
// @access  Private
exports.confirmPurchaseOrder = async (req, res) => {
  try {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!po) return res.status(404).json({ message: 'Purchase Order not found' });

    if (po.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only DRAFT POs can be confirmed' });
    }

    const tradeLicenseValidation = await validateSupplierTradeLicense(po.supplierId, req.user.tenantId);
    if (!tradeLicenseValidation.valid) {
      return res.status(400).json({
        success: false,
        message: tradeLicenseValidation.message,
        code: tradeLicenseValidation.code
      });
    }

    po.status = 'CONFIRMED';
    await po.save();

    res.status(200).json(po);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel a PO
// @route   POST /api/v1/purchases/:id/cancel
// @access  Private
exports.cancelPurchaseOrder = async (req, res) => {
  try {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!po) return res.status(404).json({ message: 'Purchase Order not found' });

    if (po.status !== 'DRAFT' && po.status !== 'CONFIRMED') {
      return res.status(400).json({ message: 'Cannot cancel a PO that has been partially or fully received' });
    }

    // Check if there are active GRNs
    const grns = await GRN.countDocuments({ purchaseOrderId: po._id, status: { $ne: 'CANCELLED' } });
    if (grns > 0) {
      return res.status(400).json({ message: 'Cannot cancel PO. Active GRNs exist. Cancel them first.' });
    }

    po.status = 'CANCELLED';
    await po.save();

    res.status(200).json(po);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a PO
// @route   DELETE /api/v1/purchases/:id
// @access  Private
exports.deletePurchaseOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).session(session);
    if (!po) throw new Error('Purchase Order not found');

    if (po.status !== 'DRAFT' && po.status !== 'CANCELLED') {
      throw new Error('Only DRAFT or CANCELLED POs can be deleted');
    }

    const isAuthorized = await verifyBranchAccess(po.branchId, req);
    if (!isAuthorized) return res.status(403).json({ message: 'Forbidden: You do not have access to this branch' });

    await PurchaseOrderItem.deleteMany({ purchaseOrderId: po._id }).session(session);
    await PurchaseOrder.deleteOne({ _id: po._id }).session(session);

    await session.commitTransaction();
    res.status(200).json({ message: 'Purchase Order deleted' });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Get all schedules for a PO
// @route   GET /api/v1/purchases/:id/schedules
// @access  Private
exports.getPurchaseOrderSchedules = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    
    // Enforce limits and minimums
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;
    
    let productMatch = {};
    const trimmedSearch = search.trim();
    if (trimmedSearch) {
      const regex = new RegExp(trimmedSearch, 'i');
      const products = await Product.find({
        tenantId: req.user.tenantId,
        $or: [{ name: regex }, { sku: regex }, { barcode: regex }]
      }).select('_id').lean();
      
      const productIds = products.map(p => p._id);
      productMatch = { productId: { $in: productIds } };
    }
    
    const query = {
      purchaseOrderId: req.params.id,
      ...productMatch
    };
    
    const total = await PurchaseOrderItem.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);
    
    const items = await PurchaseOrderItem.find(query)
      .skip(skip)
      .limit(limitNum)
      .populate('productId', 'name sku barcode')
      .lean();
      
    const itemIds = items.map(item => item._id);
    
    const schedules = await PurchaseOrderSchedule.find({
      purchaseOrderId: req.params.id,
      tenantId: req.user.tenantId,
      purchaseOrderItemId: { $in: itemIds }
    }).populate('branchId', 'name').populate('productId', 'name sku barcode').lean();

    res.status(200).json({
      data: {
        items,
        schedules
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a schedule
// @route   POST /api/v1/purchases/:id/schedules
// @access  Private
exports.createPurchaseOrderSchedule = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { purchaseOrderItemId, productId, scheduledQuantity, expectedDate, destinationType, branchId, notes } = req.body;

    const po = await PurchaseOrder.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).session(session);
    if (!po) throw new Error('Purchase Order not found');
    if (po.status !== 'DRAFT' && po.status !== 'CONFIRMED') {
      throw new Error('Schedules can only be created for DRAFT or CONFIRMED POs');
    }

    const poItem = await PurchaseOrderItem.findOne({
      _id: purchaseOrderItemId,
      purchaseOrderId: po._id
    }).session(session);

    if (!poItem) throw new Error('Purchase Order Item not found');

    if (Number(scheduledQuantity) <= 0) throw new Error('Scheduled quantity must be greater than 0');

    const availableToSchedule = poItem.quantity - (poItem.scheduledQuantity || 0);
    if (Number(scheduledQuantity) > availableToSchedule) {
      throw new Error(`Cannot schedule more than available quantity (${availableToSchedule})`);
    }

    if (!branchId) {
      throw new Error('Destination (branchId) is required');
    }

    const branch = await Branch.findOne({ _id: branchId, tenantId: req.user.tenantId }).session(session);
    if (!branch) {
      throw new Error('Invalid destination. Location not found or does not belong to your tenant');
    }

    let expectedBranchType = destinationType;
    if (destinationType === 'Branch') expectedBranchType = 'Office';

    if (branch.type !== expectedBranchType) {
      throw new Error(`Destination type mismatch. Selected location is a ${branch.type}, but schedule expects ${destinationType}`);
    }

    const schedule = await PurchaseOrderSchedule.create([{
      tenantId: req.user.tenantId,
      purchaseOrderId: po._id,
      purchaseOrderItemId: poItem._id,
      productId: productId || poItem.productId,
      scheduledQuantity: Number(scheduledQuantity),
      expectedDate,
      destinationType,
      branchId,
      notes
    }], { session });

    poItem.scheduledQuantity = (poItem.scheduledQuantity || 0) + Number(scheduledQuantity);
    await poItem.save({ session });

    await session.commitTransaction();
    res.status(201).json(schedule[0]);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Create multiple schedules in bulk
// @route   POST /api/v1/purchases/:id/schedules/bulk
// @access  Private
exports.createBulkPurchaseOrderSchedules = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { schedules } = req.body;

    if (!Array.isArray(schedules) || schedules.length === 0) {
      throw new Error('Schedules array is required and must not be empty');
    }

    const po = await PurchaseOrder.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).session(session);
    if (!po) throw new Error('Purchase Order not found');
    if (po.status !== 'DRAFT' && po.status !== 'CONFIRMED') {
      throw new Error('Schedules can only be created for DRAFT or CONFIRMED POs');
    }

    const poItemsList = await PurchaseOrderItem.find({ purchaseOrderId: po._id }).session(session);
    const poItemsMap = new Map();
    poItemsList.forEach(item => poItemsMap.set(item._id.toString(), item));

    const requestedQuantities = {};
    for (const schedule of schedules) {
      const itemId = schedule.purchaseOrderItemId;
      if (!itemId) throw new Error('purchaseOrderItemId is required for all rows');

      const qty = Number(schedule.scheduledQuantity);
      if (isNaN(qty) || qty <= 0) throw new Error(`Scheduled quantity must be greater than 0 for item ${itemId}`);

      requestedQuantities[itemId] = (requestedQuantities[itemId] || 0) + qty;
    }

    for (const [itemId, requestedQty] of Object.entries(requestedQuantities)) {
      const poItem = poItemsMap.get(itemId);
      if (!poItem) throw new Error(`Purchase Order Item ${itemId} not found in this PO`);

      const availableToSchedule = poItem.quantity - (poItem.scheduledQuantity || 0);
      if (requestedQty > availableToSchedule) {
        throw new Error(`Cannot schedule more than available quantity (${availableToSchedule}) for product ${poItem.productId}. Requested: ${requestedQty}`);
      }
    }

    const branchIds = [...new Set(schedules.map(s => s.branchId).filter(Boolean))];
    const branches = await Branch.find({ _id: { $in: branchIds }, tenantId: req.user.tenantId }).session(session);
    const branchMap = new Map();
    branches.forEach(b => branchMap.set(b._id.toString(), b));

    const newSchedules = [];
    for (const schedule of schedules) {
      const poItem = poItemsMap.get(schedule.purchaseOrderItemId);

      if (!schedule.branchId) {
        throw new Error(`Destination (branchId) is required for product ${poItem.productId}`);
      }

      const branch = branchMap.get(schedule.branchId);
      if (!branch) {
        throw new Error(`Invalid destination. Location not found or does not belong to your tenant for product ${poItem.productId}`);
      }

      let expectedBranchType = schedule.destinationType;
      if (schedule.destinationType === 'Branch') expectedBranchType = 'Office';

      if (branch.type !== expectedBranchType) {
        throw new Error(`Destination type mismatch. Selected location is a ${branch.type}, but schedule expects ${schedule.destinationType}`);
      }

      newSchedules.push({
        tenantId: req.user.tenantId,
        purchaseOrderId: po._id,
        purchaseOrderItemId: poItem._id,
        productId: schedule.productId || poItem.productId,
        scheduledQuantity: Number(schedule.scheduledQuantity),
        expectedDate: schedule.expectedDate,
        destinationType: schedule.destinationType,
        branchId: schedule.branchId,
        notes: schedule.notes
      });
    }

    const createdSchedules = await PurchaseOrderSchedule.insertMany(newSchedules, { session });

    for (const [itemId, requestedQty] of Object.entries(requestedQuantities)) {
      const poItem = poItemsMap.get(itemId);
      poItem.scheduledQuantity = (poItem.scheduledQuantity || 0) + requestedQty;
      await poItem.save({ session });
    }

    await session.commitTransaction();
    res.status(201).json(createdSchedules);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Update a schedule
// @route   PUT /api/v1/purchases/:id/schedules/:scheduleId
// @access  Private
exports.updatePurchaseOrderSchedule = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { scheduledQuantity, expectedDate, destinationType, branchId, notes } = req.body;

    const po = await PurchaseOrder.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).session(session);
    if (!po) throw new Error('Purchase Order not found');
    if (po.status !== 'DRAFT' && po.status !== 'CONFIRMED') {
      throw new Error('Schedules can only be edited for DRAFT or CONFIRMED POs');
    }

    const schedule = await PurchaseOrderSchedule.findOne({
      _id: req.params.scheduleId,
      purchaseOrderId: po._id
    }).session(session);
    if (!schedule) throw new Error('Schedule not found');

    const poItem = await PurchaseOrderItem.findOne({
      _id: schedule.purchaseOrderItemId
    }).session(session);
    if (!poItem) throw new Error('Purchase Order Item not found');

    if (scheduledQuantity !== undefined) {
      const newQty = Number(scheduledQuantity);
      if (newQty <= 0) throw new Error('Scheduled quantity must be greater than 0');
      if (newQty < schedule.receivedQuantity) {
        throw new Error(`Cannot reduce scheduled quantity below already received quantity (${schedule.receivedQuantity})`);
      }

      const diff = newQty - schedule.scheduledQuantity;
      const availableToSchedule = poItem.quantity - (poItem.scheduledQuantity || 0);

      if (diff > availableToSchedule) {
        throw new Error(`Cannot increase schedule by ${diff}. Only ${availableToSchedule} available.`);
      }

      poItem.scheduledQuantity = (poItem.scheduledQuantity || 0) + diff;
      await poItem.save({ session });
      schedule.scheduledQuantity = newQty;
    }

    if (branchId || destinationType) {
      const bId = branchId || schedule.branchId;
      const dType = destinationType || schedule.destinationType;
      const branch = await Branch.findOne({ _id: bId, tenantId: req.user.tenantId }).session(session);
      if (!branch) {
        throw new Error('Invalid destination. Location not found or does not belong to your tenant');
      }
      let expectedBranchType = dType;
      if (dType === 'Branch') expectedBranchType = 'Office';
      if (branch.type !== expectedBranchType) {
        throw new Error(`Destination type mismatch. Selected location is a ${branch.type}, but schedule expects ${dType}`);
      }
    }

    if (expectedDate) schedule.expectedDate = expectedDate;
    if (destinationType) schedule.destinationType = destinationType;
    if (branchId) schedule.branchId = branchId;
    if (notes !== undefined) schedule.notes = notes;

    await schedule.save({ session });

    await session.commitTransaction();
    res.status(200).json(schedule);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Delete a schedule
// @route   DELETE /api/v1/purchases/:id/schedules/:scheduleId
// @access  Private
exports.deletePurchaseOrderSchedule = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).session(session);
    if (!po) throw new Error('Purchase Order not found');
    if (po.status !== 'DRAFT' && po.status !== 'CONFIRMED') {
      throw new Error('Schedules can only be deleted for DRAFT or CONFIRMED POs');
    }

    const schedule = await PurchaseOrderSchedule.findOne({
      _id: req.params.scheduleId,
      purchaseOrderId: po._id
    }).session(session);
    if (!schedule) throw new Error('Schedule not found');

    if (schedule.receivedQuantity > 0) {
      throw new Error('Cannot delete a schedule that has already been partially or fully received');
    }

    const poItem = await PurchaseOrderItem.findOne({
      _id: schedule.purchaseOrderItemId
    }).session(session);

    if (poItem) {
      poItem.scheduledQuantity = Math.max(0, (poItem.scheduledQuantity || 0) - schedule.scheduledQuantity);
      await poItem.save({ session });
    }

    await PurchaseOrderSchedule.deleteOne({ _id: schedule._id }).session(session);

    await session.commitTransaction();
    res.status(200).json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Cancel a schedule
// @route   POST /api/v1/purchases/:id/schedules/:scheduleId/cancel
// @access  Private
exports.cancelPurchaseOrderSchedule = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { cancelReason } = req.body;
    if (!cancelReason) throw new Error('Cancellation reason is required');

    const po = await PurchaseOrder.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).session(session);
    if (!po) throw new Error('Purchase Order not found');

    const schedule = await PurchaseOrderSchedule.findOne({
      _id: req.params.scheduleId,
      purchaseOrderId: po._id
    }).session(session);
    if (!schedule) throw new Error('Schedule not found');

    if (schedule.status === 'CANCELLED') {
      throw new Error('Schedule is already cancelled');
    }

    if (schedule.receivedQuantity > 0) {
      throw new Error('Cannot cancel a schedule that has already been partially or fully received');
    }

    schedule.status = 'CANCELLED';
    schedule.cancelReason = cancelReason;
    await schedule.save({ session });

    const poItem = await PurchaseOrderItem.findOne({
      _id: schedule.purchaseOrderItemId
    }).session(session);

    if (poItem) {
      poItem.scheduledQuantity = Math.max(0, (poItem.scheduledQuantity || 0) - schedule.scheduledQuantity);
      await poItem.save({ session });
    }

    await session.commitTransaction();
    res.status(200).json({ message: 'Schedule cancelled successfully', schedule });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// Helper function to calculate equal distribution
const calculateEqualDistribution = (poItems, branches, expectedDate, destinationType, tenantId, poId) => {
  let poItemsWithRemainingQuantity = 0;
  let totalRemainingQuantity = 0;
  let totalSchedulesCreated = 0;
  let totalQuantityAllocated = 0;
  let itemsProcessed = 0;
  
  const newSchedules = [];
  const bulkItemUpdates = [];
  const storeCount = branches.length;

  for (const item of poItems) {
    // Existing cumulative scheduling logic: quantity - scheduledQuantity
    const remaining = Number((item.quantity - (item.scheduledQuantity || 0)).toFixed(6));
    
    // Ignore items with no schedulable quantity
    if (remaining <= 0) continue;

    itemsProcessed++;
    poItemsWithRemainingQuantity++;
    totalRemainingQuantity += remaining;
    
    let allocatedForThisItem = 0;
    const isIntegerQty = Number.isInteger(remaining);

    if (isIntegerQty) {
      const baseQuantity = Math.floor(remaining / storeCount);
      let remainder = remaining % storeCount;

      for (let i = 0; i < storeCount; i++) {
        const branch = branches[i];
        let qtyToAllocate = baseQuantity + (i < remainder ? 1 : 0);

        if (qtyToAllocate > 0) {
          newSchedules.push({
            tenantId,
            purchaseOrderId: poId,
            purchaseOrderItemId: item._id,
            productId: item.productId,
            scheduledQuantity: qtyToAllocate,
            expectedDate,
            destinationType,
            branchId: branch._id,
            notes: 'Equal Distribution'
          });
          allocatedForThisItem += qtyToAllocate;
          totalSchedulesCreated++;
        }
      }
    } else {
      const PRECISION = 1000000;
      const remainingUnits = Math.round(remaining * PRECISION);
      const baseUnits = Math.floor(remainingUnits / storeCount);
      const remainderUnits = remainingUnits % storeCount;

      for (let i = 0; i < storeCount; i++) {
        const branch = branches[i];
        const units = baseUnits + (i < remainderUnits ? 1 : 0);
        let qtyToAllocate = Number((units / PRECISION).toFixed(6));

        if (qtyToAllocate > 0) {
          newSchedules.push({
            tenantId,
            purchaseOrderId: poId,
            purchaseOrderItemId: item._id,
            productId: item.productId,
            scheduledQuantity: qtyToAllocate,
            expectedDate,
            destinationType,
            branchId: branch._id,
            notes: 'Equal Distribution'
          });
          allocatedForThisItem = Number((allocatedForThisItem + qtyToAllocate).toFixed(6));
          totalSchedulesCreated++;
        }
      }
    }

    if (Number(allocatedForThisItem.toFixed(6)) !== Number(remaining.toFixed(6))) {
      throw new Error(`Distribution calculation mismatch for item ${item._id}. Expected: ${remaining}, Allocated: ${allocatedForThisItem}`);
    }

    totalQuantityAllocated += allocatedForThisItem;

    bulkItemUpdates.push({
      updateOne: {
        filter: { _id: item._id },
        update: { $inc: { scheduledQuantity: allocatedForThisItem } }
      }
    });
  }

  return {
    poItemsWithRemainingQuantity,
    totalRemainingQuantity: Number(totalRemainingQuantity.toFixed(6)),
    totalSchedulesCreated,
    totalQuantityAllocated: Number(totalQuantityAllocated.toFixed(6)),
    itemsProcessed,
    newSchedules,
    bulkItemUpdates
  };
};

// @desc    Preview Equal Distribution Bulk Schedules
// @route   POST /api/v1/purchases/:id/schedules/equal-distribution/preview
// @access  Private
exports.previewEqualDistributionPurchaseOrderSchedules = async (req, res) => {
  try {
    const { branchIds, destinationType } = req.body;

    if (!Array.isArray(branchIds) || branchIds.length === 0) {
      throw new Error('At least one store must be selected');
    }

    const po = await PurchaseOrder.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!po) throw new Error('Purchase Order not found');
    if (po.status !== 'DRAFT' && po.status !== 'CONFIRMED') {
      throw new Error('Schedules can only be created for DRAFT or CONFIRMED POs');
    }

    const branches = await Branch.find({ _id: { $in: branchIds }, tenantId: req.user.tenantId });
    if (branches.length !== branchIds.length) {
      throw new Error('One or more selected branches are invalid or do not belong to your tenant');
    }

    let expectedBranchType = destinationType;
    if (destinationType === 'Branch') expectedBranchType = 'Office';

    for (const branch of branches) {
      if (branch.type !== expectedBranchType) {
        throw new Error(`Destination type mismatch. Selected location ${branch.name} is a ${branch.type}, but schedule expects ${destinationType}`);
      }
    }

    const poItems = await PurchaseOrderItem.find({ purchaseOrderId: po._id });
    
    const calculation = calculateEqualDistribution(poItems, branches, null, destinationType, req.user.tenantId, po._id);

    res.status(200).json({
      success: true,
      data: {
        poItemsWithRemainingQuantity: calculation.poItemsWithRemainingQuantity,
        totalPOItems: poItems.length,
        selectedStores: branches.length,
        totalRemainingQuantity: calculation.totalRemainingQuantity,
        schedulesToCreate: calculation.totalSchedulesCreated,
        distribution: {
          method: "EQUAL",
          remainderHandling: "DISTRIBUTE_AUTOMATICALLY"
        }
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Create Equal Distribution Bulk Schedules
// @route   POST /api/v1/purchases/:id/schedules/equal-distribution
// @access  Private
exports.createEqualDistributionPurchaseOrderSchedules = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { branchIds, destinationType, expectedDate } = req.body;

    if (!Array.isArray(branchIds) || branchIds.length === 0) {
      throw new Error('At least one store must be selected');
    }
    if (!expectedDate) {
      throw new Error('Expected date is required');
    }

    const po = await PurchaseOrder.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).session(session);
    if (!po) throw new Error('Purchase Order not found');
    if (po.status !== 'DRAFT' && po.status !== 'CONFIRMED') {
      throw new Error('Schedules can only be created for DRAFT or CONFIRMED POs');
    }

    const branches = await Branch.find({ _id: { $in: branchIds }, tenantId: req.user.tenantId }).session(session);
    if (branches.length !== branchIds.length) {
      throw new Error('One or more selected branches are invalid or do not belong to your tenant');
    }

    let expectedBranchType = destinationType;
    if (destinationType === 'Branch') expectedBranchType = 'Office';

    for (const branch of branches) {
      if (branch.type !== expectedBranchType) {
        throw new Error(`Destination type mismatch. Selected location ${branch.name} is a ${branch.type}, but schedule expects ${destinationType}`);
      }
    }

    const poItems = await PurchaseOrderItem.find({ purchaseOrderId: po._id }).session(session);
    
    // Use shared calculation logic to generate deterministic distribution
    const calculation = calculateEqualDistribution(poItems, branches, expectedDate, destinationType, req.user.tenantId, po._id);

    if (calculation.newSchedules.length === 0) {
      throw new Error('No items have remaining quantity to schedule');
    }

    // Insert schedules in chunks to avoid blowing up memory in a single mongo doc
    const CHUNK_SIZE = 5000;
    for (let i = 0; i < calculation.newSchedules.length; i += CHUNK_SIZE) {
      const chunk = calculation.newSchedules.slice(i, i + CHUNK_SIZE);
      await PurchaseOrderSchedule.insertMany(chunk, { session });
    }

    // Update po items in bulk
    if (calculation.bulkItemUpdates.length > 0) {
      await PurchaseOrderItem.bulkWrite(calculation.bulkItemUpdates, { session });
    }

    await session.commitTransaction();
    
    res.status(201).json({
      success: true,
      data: {
        itemsProcessed: calculation.itemsProcessed,
        storesProcessed: branches.length,
        schedulesCreated: calculation.totalSchedulesCreated,
        quantityAllocated: calculation.totalQuantityAllocated
      }
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

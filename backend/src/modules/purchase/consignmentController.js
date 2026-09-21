const Consignment = require('../../core/models/Consignment');
const ConsignmentStock = require('../../core/models/ConsignmentStock');
const Stock = require('../../core/models/Stock');
const StockMovement = require('../../core/models/StockMovement');
const Supplier = require('../../core/models/Supplier');
const Product = require('../../core/models/Product');
const Counter = require('../../core/models/Counter');
const mongoose = require('mongoose');

const generateConsignmentNumber = async (tenantId, session = null) => {
  const currentYear = new Date().getFullYear();
  const counterId = `CNS_${currentYear}`;
  const counter = await Counter.findOneAndUpdate(
    { tenantId, sequenceName: counterId, year: currentYear },
    { $inc: { sequenceValue: 1 } },
    { returnDocument: 'after', upsert: true, session }
  );
  return `CNS-${currentYear}-${String(counter.sequenceValue).padStart(6, '0')}`;
};

exports.createConsignment = async (req, res) => {
  try {
    const { supplierId, startDate, endDate, notes, defaultBranchId, items } = req.body;
    
    // Validate supplier belongs to tenant
    const supplier = await Supplier.findOne({ _id: supplierId, tenantId: req.user.tenantId });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found for this tenant' });
    }

    // Generate Consignment Number using Counter sequence
    const consignmentNumber = await generateConsignmentNumber(req.user.tenantId);

    const consignment = new Consignment({
      tenantId: req.user.tenantId,
      supplierId,
      consignmentNumber,
      startDate,
      endDate,
      notes,
      defaultBranchId,
      items,
      createdBy: req.user._id
    });

    await consignment.save();

    res.status(201).json({
      success: true,
      data: consignment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getConsignments = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    
    const query = { tenantId: req.user.tenantId };
    
    if (search) {
      query.consignmentNumber = { $regex: search, $options: 'i' };
    }

    const consignments = await Consignment.find(query)
      .populate('supplierId', 'name email')
      .populate('items.productId', 'name sku')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Consignment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: consignments,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getConsignment = async (req, res) => {
  try {
    const consignment = await Consignment.findOne({ 
      _id: req.params.id, 
      tenantId: req.user.tenantId 
    })
    .populate('supplierId')
    .populate('defaultBranchId')
    .populate('items.productId')
    .populate('createdBy', 'name')
    .populate('confirmedBy', 'name')
    .populate('activatedBy', 'name');

    if (!consignment) {
      return res.status(404).json({ success: false, message: 'Consignment not found' });
    }

    res.status(200).json({
      success: true,
      data: consignment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateConsignment = async (req, res) => {
  try {
    const consignment = await Consignment.findOne({ 
      _id: req.params.id, 
      tenantId: req.user.tenantId 
    });

    if (!consignment) {
      return res.status(404).json({ success: false, message: 'Consignment not found' });
    }

    if (consignment.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Can only update draft consignments' });
    }

    const updated = await Consignment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: 'after', runValidators: true }
    );

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.confirmConsignment = async (req, res) => {
  try {
    const consignment = await Consignment.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId, status: 'DRAFT' },
      { status: 'CONFIRMED', confirmedBy: req.user._id, confirmedAt: new Date() },
      { returnDocument: 'after' }
    );

    if (!consignment) {
      return res.status(404).json({ success: false, message: 'Consignment not found or not in draft status' });
    }

    res.status(200).json({ success: true, data: consignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.activateConsignment = async (req, res) => {
  try {
    // Can activate from DRAFT or CONFIRMED for backwards compatibility and flexbility
    const consignment = await Consignment.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId, status: { $in: ['DRAFT', 'CONFIRMED'] } },
      { status: 'ACTIVE', activatedBy: req.user._id },
      { returnDocument: 'after' }
    );

    if (!consignment) {
      return res.status(404).json({ success: false, message: 'Consignment not found or cannot be activated' });
    }

    res.status(200).json({ success: true, data: consignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.consumeConsignmentStock = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { branchId, productId, consumptionQuantity, reason, referenceType, referenceId, notes } = req.body;

    const consignment = await Consignment.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).session(session);
    if (!consignment) throw new Error('Consignment not found');
    if (consignment.status !== 'ACTIVE' && consignment.status !== 'CONFIRMED') {
      throw new Error('Consignment is not active');
    }

    // Validate ConsignmentStock
    let cStock = await ConsignmentStock.findOne({
      tenantId: req.user.tenantId,
      consignmentId: consignment._id,
      supplierId: consignment.supplierId,
      branchId,
      productId
    }).session(session);

    if (!cStock) {
      throw new Error('Consignment stock not found for this product and location');
    }

    if (consumptionQuantity > cStock.availableQuantity) {
      throw new Error(`Cannot consume ${consumptionQuantity}. Only ${cStock.availableQuantity} available in consignment stock.`);
    }

    // Validate Physical Stock
    let stock = await Stock.findOne({
      tenantId: req.user.tenantId,
      branchId,
      productId,
      ownerType: 'SUPPLIER',
      ownerId: consignment.supplierId
    }).session(session);

    if (!stock || stock.quantity < consumptionQuantity) {
      throw new Error(`Insufficient physical supplier stock at this location.`);
    }

    // Decrease physical stock
    stock.quantity -= consumptionQuantity;
    await stock.save({ session });

    // Increase ConsignmentStock.consumedQuantity
    cStock.consumedQuantity += consumptionQuantity;
    cStock.availableQuantity = cStock.receivedQuantity - cStock.consumedQuantity - cStock.returnedQuantity;
    cStock.lastActivityAt = new Date();
    await cStock.save({ session });

    // Create StockMovement
    await StockMovement.create([{
      tenantId: req.user.tenantId,
      branchId,
      productId,
      quantity: consumptionQuantity,
      documentQuantity: consumptionQuantity,
      documentUom: cStock.uom,
      baseQuantity: consumptionQuantity,
      baseUom: cStock.baseUom,
      type: 'OUT',
      referenceId: referenceId || req.params.id,
      referenceType: referenceType || 'CONSIGNMENT_CONSUMPTION',
      ownerType: 'SUPPLIER',
      ownerId: consignment.supplierId,
      createdBy: req.user._id,
      notes: reason || notes
    }], { session });

    // Update main Consignment document
    const cItem = consignment.items.find(i => i.productId.toString() === productId.toString());
    if (cItem) {
      cItem.consumedQuantity = (cItem.consumedQuantity || 0) + consumptionQuantity;
      await consignment.save({ session });
    }

    await session.commitTransaction();
    res.status(200).json({ success: true, message: 'Consumption successful', data: cStock });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

exports.closeConsignment = async (req, res) => {
  try {
    const consignment = await Consignment.findOne({ _id: req.params.id, tenantId: req.user.tenantId, status: 'ACTIVE' });
    if (!consignment) {
      return res.status(404).json({ success: false, message: 'Consignment not found or not active' });
    }

    const outstandingItems = [];
    for (const item of consignment.items) {
      const availableQuantity = (item.receivedQuantity || 0) - (item.consumedQuantity || 0) - (item.returnedQuantity || 0);
      if (availableQuantity > 0) {
        outstandingItems.push(`Product ${item.productId} has ${availableQuantity} units still available`);
      }
    }

    if (outstandingItems.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot close consignment while stock is still available. Outstanding stock:',
        details: outstandingItems
      });
    }

    consignment.status = 'CLOSED';
    consignment.closedBy = req.user._id;
    await consignment.save();

    res.status(200).json({ success: true, data: consignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.cancelConsignment = async (req, res) => {
  try {
    const consignment = await Consignment.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId, status: { $in: ['DRAFT', 'CONFIRMED'] } },
      { status: 'CANCELLED', cancelledBy: req.user._id },
      { returnDocument: 'after' }
    );

    if (!consignment) {
      return res.status(404).json({ success: false, message: 'Consignment not found or cannot be cancelled' });
    }

    res.status(200).json({ success: true, data: consignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

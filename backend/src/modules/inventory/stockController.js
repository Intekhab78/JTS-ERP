const mongoose = require('mongoose');
const Stock = require('../../core/models/Stock');
const StockMovement = require('../../core/models/StockMovement');
const StockTransfer = require('../../core/models/StockTransfer');
const StockAdjustment = require('../../core/models/StockAdjustment');
const { verifyBranchAccess, verifyProductAccess } = require('../../core/middleware/authMiddleware');

// @desc    Get all stock for a specific branch
// @route   GET /api/v1/stock/:branchId
exports.getBranchStock = async (req, res) => {
  try {
    const isAuthorized = await verifyBranchAccess(req.params.branchId, req);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this branch' });
    }

    const stock = await Stock.find({
      tenantId: req.user.tenantId,
      branchId: req.params.branchId
    }).populate('productId');
    
    res.status(200).json(stock);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all stock movements
// @route   GET /api/v1/stock/movements/:branchId
exports.getStockMovements = async (req, res) => {
  try {
    const isAuthorized = await verifyBranchAccess(req.params.branchId, req);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this branch' });
    }

    const movements = await StockMovement.find({
      tenantId: req.user.tenantId,
      branchId: req.params.branchId
    }).populate('productId', 'name sku').sort({ createdAt: -1 });

    res.status(200).json(movements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- STOCK TRANSFERS ---

exports.getTransfers = async (req, res) => {
  try {
    const filter = { tenantId: req.user.tenantId };
    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      filter.$or = [
        { sourceBranchId: { $in: req.user.branches } },
        { destinationBranchId: { $in: req.user.branches } }
      ];
    } else if (!hasWildcard) {
      filter.sourceBranchId = { $in: [] };
    }

    const transfers = await StockTransfer.find(filter)
      .populate('sourceBranchId', 'name')
      .populate('destinationBranchId', 'name')
      .populate('items.productId', 'name sku')
      .sort({ createdAt: -1 });
    res.status(200).json(transfers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createTransfer = async (req, res) => {
  try {
    const { sourceBranchId, destinationBranchId, items, notes } = req.body;
    
    if (sourceBranchId === destinationBranchId) {
      return res.status(400).json({ message: 'Source and destination branches must be different' });
    }
    
    const isSourceAuthorized = await verifyBranchAccess(sourceBranchId, req);
    if (!isSourceAuthorized) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to the source branch' });
    }

    const referenceNumber = `TRF-${Date.now()}`;
    const transfer = await StockTransfer.create({
      tenantId: req.user.tenantId,
      sourceBranchId,
      destinationBranchId,
      referenceNumber,
      items,
      notes,
      status: 'DRAFT',
      createdBy: req.user._id
    });

    res.status(201).json(transfer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.validateTransfer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const transfer = await StockTransfer.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).session(session);
    
    if (!transfer) throw new Error('Transfer not found');
    if (transfer.status !== 'DRAFT') throw new Error('Transfer is not in DRAFT status');

    const sourceBranchId = transfer.sourceBranchId;
    const destinationBranchId = transfer.destinationBranchId;

    for (const item of transfer.items) {
      const productId = item.productId;
      const quantity = item.quantity;

      // 1. Deduct from source
      const sourceStock = await Stock.findOneAndUpdate(
        { tenantId: req.user.tenantId, branchId: sourceBranchId, productId, quantity: { $gte: quantity } },
        { $inc: { quantity: -quantity } },
        { session, returnDocument: 'after' }
      );

      if (!sourceStock) {
        throw new Error(`Insufficient stock at source branch for product ID: ${productId}`);
      }

      // 2. Add to destination
      let destStock = await Stock.findOne({ tenantId: req.user.tenantId, branchId: destinationBranchId, productId }).session(session);
      if (!destStock) {
        destStock = await Stock.create([{
          tenantId: req.user.tenantId,
          branchId: destinationBranchId,
          productId,
          quantity
        }], { session });
      } else {
        destStock.quantity += quantity;
        await destStock.save({ session });
      }

      // 3. Create Movements
      await StockMovement.create([{
        tenantId: req.user.tenantId,
        branchId: sourceBranchId,
        productId,
        quantity: -quantity,
        type: 'TRANSFER_OUT',
        referenceId: transfer.referenceNumber,
        referenceType: 'StockTransfer',
        notes: transfer.notes,
        createdBy: req.user._id
      }], { session });

      await StockMovement.create([{
        tenantId: req.user.tenantId,
        branchId: destinationBranchId,
        productId,
        quantity,
        type: 'TRANSFER_IN',
        referenceId: transfer.referenceNumber,
        referenceType: 'StockTransfer',
        notes: transfer.notes,
        createdBy: req.user._id
      }], { session });
    }

    transfer.status = 'VALIDATED';
    transfer.validatedBy = req.user._id;
    transfer.validatedAt = new Date();
    await transfer.save({ session });

    await session.commitTransaction();
    res.status(200).json(transfer);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// --- STOCK ADJUSTMENTS ---

exports.getAdjustments = async (req, res) => {
  try {
    const filter = { tenantId: req.user.tenantId };
    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      filter.branchId = { $in: req.user.branches };
    } else if (!hasWildcard) {
      filter.branchId = { $in: [] };
    }

    const adjustments = await StockAdjustment.find(filter)
      .populate('branchId', 'name')
      .populate('items.productId', 'name sku')
      .sort({ createdAt: -1 });
    res.status(200).json(adjustments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createAdjustment = async (req, res) => {
  try {
    const { branchId, items, reason, notes } = req.body;
    
    const isAuthorized = await verifyBranchAccess(branchId, req);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this branch' });
    }

    const referenceNumber = `ADJ-${Date.now()}`;
    
    // Calculate difference for each item
    const formattedItems = items.map(item => ({
      productId: item.productId,
      expectedQuantity: item.expectedQuantity,
      actualQuantity: item.actualQuantity,
      difference: item.actualQuantity - item.expectedQuantity
    }));

    const adjustment = await StockAdjustment.create({
      tenantId: req.user.tenantId,
      branchId,
      referenceNumber,
      items: formattedItems,
      reason,
      notes,
      status: 'DRAFT',
      createdBy: req.user._id
    });

    res.status(201).json(adjustment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.validateAdjustment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const adjustment = await StockAdjustment.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).session(session);
    
    if (!adjustment) throw new Error('Adjustment not found');
    if (adjustment.status !== 'DRAFT') throw new Error('Adjustment is not in DRAFT status');

    for (const item of adjustment.items) {
      if (item.difference === 0) continue;

      const productId = item.productId;
      const quantity = item.difference;

      let stock = await Stock.findOne({ tenantId: req.user.tenantId, branchId: adjustment.branchId, productId }).session(session);
      
      if (!stock) {
        if (item.actualQuantity < 0) {
          throw new Error('Stock cannot be negative');
        }
        stock = await Stock.create([{
          tenantId: req.user.tenantId,
          branchId: adjustment.branchId,
          productId,
          quantity: item.actualQuantity
        }], { session });
      } else {
        // Enforce min 0
        if (stock.quantity + quantity < 0) {
          throw new Error(`Insufficient stock for adjustment on product ID: ${productId}`);
        }
        stock.quantity += quantity;
        await stock.save({ session });
      }

      await StockMovement.create([{
        tenantId: req.user.tenantId,
        branchId: adjustment.branchId,
        productId,
        quantity,
        type: 'ADJUSTMENT',
        referenceId: adjustment.referenceNumber,
        referenceType: 'StockAdjustment',
        notes: adjustment.notes || adjustment.reason,
        createdBy: req.user._id
      }], { session });
    }

    adjustment.status = 'VALIDATED';
    adjustment.validatedBy = req.user._id;
    adjustment.validatedAt = new Date();
    await adjustment.save({ session });

    await session.commitTransaction();
    res.status(200).json(adjustment);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

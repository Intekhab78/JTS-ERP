const mongoose = require('mongoose');
const ConsignmentReceipt = require('../../core/models/ConsignmentReceipt');
const Consignment = require('../../core/models/Consignment');
const ConsignmentStock = require('../../core/models/ConsignmentStock');
const Stock = require('../../core/models/Stock');
const StockMovement = require('../../core/models/StockMovement');
const Counter = require('../../core/models/Counter');

const generateReceiptNumber = async (tenantId, session = null) => {
  const currentYear = new Date().getFullYear();
  const counterId = `CNR_${currentYear}`;
  const counter = await Counter.findOneAndUpdate(
    { tenantId, sequenceName: counterId, year: currentYear },
    { $inc: { sequenceValue: 1 } },
    { returnDocument: 'after', upsert: true, session }
  );
  return `CNR-${currentYear}-${String(counter.sequenceValue).padStart(6, '0')}`;
};

exports.createReceipt = async (req, res) => {
  try {
    const { consignmentId, supplierId, branchId, receiptDate, items, notes, reference } = req.body;
    
    // Validate Consignment
    const consignment = await Consignment.findOne({ _id: consignmentId, tenantId: req.user.tenantId });
    if (!consignment) {
      return res.status(404).json({ success: false, message: 'Consignment not found' });
    }
    
    if (consignment.status !== 'CONFIRMED' && consignment.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Can only create receipts for CONFIRMED or ACTIVE consignments' });
    }

    const receiptNumber = await generateReceiptNumber(req.user.tenantId);

    const receipt = new ConsignmentReceipt({
      tenantId: req.user.tenantId,
      receiptNumber,
      consignmentId,
      supplierId,
      branchId,
      receiptDate,
      items,
      notes,
      reference,
      createdBy: req.user._id,
      status: 'DRAFT'
    });

    await receipt.save();
    res.status(201).json({ success: true, data: receipt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getReceipts = async (req, res) => {
  try {
    const query = { tenantId: req.user.tenantId };
    if (req.query.consignmentId) query.consignmentId = req.query.consignmentId;
    if (req.query.search) {
      query.receiptNumber = { $regex: req.query.search, $options: 'i' };
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await ConsignmentReceipt.countDocuments(query);
    const pages = Math.ceil(total / limit);
    
    const receipts = await ConsignmentReceipt.find(query)
      .populate('supplierId', 'name')
      .populate('branchId', 'name')
      .populate('items.productId', 'name sku')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    res.status(200).json({ 
      success: true, 
      data: receipts,
      pagination: { total, pages, page, limit }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getReceipt = async (req, res) => {
  try {
    const receipt = await ConsignmentReceipt.findOne({ _id: req.params.id, tenantId: req.user.tenantId })
      .populate('supplierId')
      .populate('branchId')
      .populate('items.productId')
      .populate('createdBy', 'name')
      .populate('validatedBy', 'name');
      
    if (!receipt) return res.status(404).json({ success: false, message: 'Receipt not found' });
    res.status(200).json({ success: true, data: receipt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.confirmReceipt = async (req, res) => {
  try {
    const receipt = await ConsignmentReceipt.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!receipt) return res.status(404).json({ success: false, message: 'Receipt not found' });
    if (receipt.status !== 'DRAFT') return res.status(400).json({ success: false, message: 'Only DRAFT receipts can be confirmed' });

    receipt.status = 'CONFIRMED';
    receipt.confirmedBy = req.user._id;
    receipt.confirmedAt = new Date();
    await receipt.save();

    res.status(200).json({ success: true, data: receipt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.validateReceipt = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const receipt = await ConsignmentReceipt.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).session(session);
    if (!receipt) throw new Error('Receipt not found');
    if (receipt.status !== 'CONFIRMED' && receipt.status !== 'DRAFT') {
      throw new Error(`Cannot validate receipt in ${receipt.status} status`);
    }

    const consignment = await Consignment.findOne({ _id: receipt.consignmentId, tenantId: req.user.tenantId }).session(session);
    if (!consignment) throw new Error('Consignment not found');
    if (consignment.status !== 'CONFIRMED' && consignment.status !== 'ACTIVE') {
      throw new Error('Consignment must be CONFIRMED or ACTIVE');
    }

    if (consignment.status === 'CONFIRMED') {
       consignment.status = 'ACTIVE';
       consignment.activatedBy = req.user._id;
       await consignment.save({ session });
    }

    for (const item of receipt.items) {
      if (item.acceptedQuantity > 0) {
        // Increase physical stock
        let stock = await Stock.findOne({
          tenantId: req.user.tenantId,
          branchId: receipt.branchId,
          productId: item.productId,
          ownerType: 'SUPPLIER',
          ownerId: receipt.supplierId
        }).session(session);

        if (stock) {
          stock.quantity += item.baseQuantity;
          await stock.save({ session });
        } else {
          await Stock.create([{
            tenantId: req.user.tenantId,
            branchId: receipt.branchId,
            productId: item.productId,
            quantity: item.baseQuantity,
            ownerType: 'SUPPLIER',
            ownerId: receipt.supplierId
          }], { session });
        }

        // Create StockMovement
        await StockMovement.create([{
          tenantId: req.user.tenantId,
          branchId: receipt.branchId,
          productId: item.productId,
          quantity: item.baseQuantity,
          documentQuantity: item.acceptedQuantity,
          documentUom: item.uom,
          baseQuantity: item.baseQuantity,
          baseUom: item.baseUom,
          type: 'IN',
          referenceId: receipt.receiptNumber,
          referenceType: 'CONSIGNMENT_RECEIPT',
          ownerType: 'SUPPLIER',
          ownerId: receipt.supplierId,
          createdBy: req.user._id
        }], { session });

        // Update ConsignmentStock
        let cStock = await ConsignmentStock.findOne({
          tenantId: req.user.tenantId,
          supplierId: receipt.supplierId,
          consignmentId: receipt.consignmentId,
          productId: item.productId,
          branchId: receipt.branchId
        }).session(session);

        if (cStock) {
          cStock.receivedQuantity += item.baseQuantity;
          cStock.availableQuantity = cStock.receivedQuantity - cStock.consumedQuantity - cStock.returnedQuantity;
          cStock.lastActivityAt = new Date();
          await cStock.save({ session });
        } else {
          await ConsignmentStock.create([{
            tenantId: req.user.tenantId,
            supplierId: receipt.supplierId,
            consignmentId: receipt.consignmentId,
            productId: item.productId,
            branchId: receipt.branchId,
            receivedQuantity: item.baseQuantity,
            availableQuantity: item.baseQuantity,
            uom: item.uom,
            baseQuantity: item.baseQuantity,
            baseUom: item.baseUom
          }], { session });
        }

        // Update main Consignment document item totals
        const cItem = consignment.items.find(i => i.productId.toString() === item.productId.toString());
        if (cItem) {
          cItem.receivedQuantity = (cItem.receivedQuantity || 0) + item.acceptedQuantity;
          await consignment.save({ session });
        }
      }
    }

    receipt.status = 'VALIDATED';
    receipt.validatedBy = req.user._id;
    receipt.validatedAt = new Date();
    await receipt.save({ session });

    await session.commitTransaction();
    res.status(200).json({ success: true, data: receipt });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

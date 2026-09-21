const ConsignmentSettlement = require('../../core/models/ConsignmentSettlement');

const Consignment = require('../../core/models/Consignment');
const Counter = require('../../core/models/Counter');
const mongoose = require('mongoose');

const generateSettlementNumber = async (tenantId, session = null) => {
  const currentYear = new Date().getFullYear();
  const counterId = `CST_${currentYear}`;
  const counter = await Counter.findOneAndUpdate(
    { tenantId, sequenceName: counterId, year: currentYear },
    { $inc: { sequenceValue: 1 } },
    { returnDocument: 'after', upsert: true, session }
  );
  return `CST-${currentYear}-${String(counter.sequenceValue).padStart(6, '0')}`;
};

exports.createSettlement = async (req, res) => {
  try {
    const { consignmentId, items, notes } = req.body;
    
    const consignment = await Consignment.findOne({ _id: consignmentId, tenantId: req.user.tenantId });
    if (!consignment) return res.status(404).json({ success: false, message: 'Consignment not found' });

    let totalAmount = 0;
    for (const item of items) {
      const consItem = consignment.items.find(i => i.productId.toString() === item.productId.toString());
      if (!consItem) throw new Error(`Product ${item.productId} not found in consignment agreement`);
      
      const eligible = consItem.consumedQuantity - consItem.settledQuantity;
      if (item.settlementQuantity > eligible) {
        throw new Error(`Cannot settle more than eligible consumed quantity. Eligible: ${eligible}, Requested: ${item.settlementQuantity}`);
      }

      item.settlementAmount = item.settlementQuantity * item.unitPrice;
      totalAmount += item.settlementAmount;
    }

    const settlementNumber = await generateSettlementNumber(req.user.tenantId);

    const settlement = new ConsignmentSettlement({
      tenantId: req.user.tenantId,
      supplierId: consignment.supplierId,
      consignmentId,
      settlementNumber,
      items,
      totalAmount,
      notes,
      createdBy: req.user._id
    });

    await settlement.save();
    res.status(201).json({ success: true, data: settlement });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getSettlements = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const query = { tenantId: req.user.tenantId };
    
    if (search) {
      query.settlementNumber = { $regex: search, $options: 'i' };
    }

    const settlements = await ConsignmentSettlement.find(query)
      .populate('supplierId', 'name email')
      .populate('consignmentId', 'consignmentNumber')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await ConsignmentSettlement.countDocuments(query);

    res.status(200).json({
      success: true,
      data: settlements,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSettlement = async (req, res) => {
  try {
    const settlement = await ConsignmentSettlement.findOne({ _id: req.params.id, tenantId: req.user.tenantId })
      .populate('supplierId')
      .populate('consignmentId')
      .populate('items.productId')
      .populate('items.branchId')
      .populate('createdBy', 'name')
      .populate('validatedBy', 'name');

    if (!settlement) return res.status(404).json({ success: false, message: 'Settlement not found' });
    res.status(200).json({ success: true, data: settlement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.validateSettlement = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const settlement = await ConsignmentSettlement.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).session(session);
    if (!settlement) throw new Error('Settlement not found');
    if (settlement.status !== 'DRAFT') throw new Error('Settlement is already validated or cancelled');

    const consignment = await Consignment.findOne({ _id: settlement.consignmentId, tenantId: req.user.tenantId }).session(session);
    if (!consignment) throw new Error('Consignment not found');

    for (const item of settlement.items) {
      const consItem = consignment.items.find(i => i.productId.toString() === item.productId.toString());
      if (!consItem) throw new Error(`Product ${item.productId} not found in consignment agreement`);
      
      const eligible = consItem.consumedQuantity - consItem.settledQuantity;
      if (item.settlementQuantity > eligible) {
        throw new Error(`Cannot settle more than eligible consumed quantity. Product ${item.productId}. Eligible: ${eligible}, Requested: ${item.settlementQuantity}`);
      }

      consItem.settledQuantity += item.settlementQuantity;
    }
    
    await consignment.save({ session });

    settlement.status = 'VALIDATED';
    settlement.validatedBy = req.user._id;
    settlement.validatedAt = new Date();
    await settlement.save({ session });

    await session.commitTransaction();
    res.status(200).json({ success: true, data: settlement });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

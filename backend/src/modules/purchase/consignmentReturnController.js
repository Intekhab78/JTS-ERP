const mongoose = require('mongoose');
const ConsignmentReturn = require('../../core/models/ConsignmentReturn');
const Consignment = require('../../core/models/Consignment');
const ConsignmentStock = require('../../core/models/ConsignmentStock');
const Stock = require('../../core/models/Stock');
const StockMovement = require('../../core/models/StockMovement');
const Counter = require('../../core/models/Counter');

const generateReturnNumber = async (tenantId, session = null) => {
  const currentYear = new Date().getFullYear();
  const counterId = `CNR_RET_${currentYear}`;
  const counter = await Counter.findOneAndUpdate(
    { tenantId, sequenceName: counterId, year: currentYear },
    { $inc: { sequenceValue: 1 } },
    { returnDocument: 'after', upsert: true, session }
  );
  return `CNRET-${currentYear}-${String(counter.sequenceValue).padStart(6, '0')}`;
};

exports.createReturn = async (req, res) => {
  try {
    const { consignmentId, supplierId, branchId, returnDate, items, notes, reference } = req.body;
    
    const consignment = await Consignment.findOne({ _id: consignmentId, tenantId: req.user.tenantId });
    if (!consignment) {
      return res.status(404).json({ success: false, message: 'Consignment not found' });
    }
    
    if (consignment.status !== 'ACTIVE' && consignment.status !== 'CLOSED') {
      return res.status(400).json({ success: false, message: 'Cannot create returns for unactivated consignments' });
    }

    const returnNumber = await generateReturnNumber(req.user.tenantId);

    const cr = new ConsignmentReturn({
      tenantId: req.user.tenantId,
      returnNumber,
      consignmentId,
      supplierId,
      branchId,
      returnDate,
      items,
      notes,
      reference,
      createdBy: req.user._id,
      status: 'DRAFT'
    });

    await cr.save();
    res.status(201).json({ success: true, data: cr });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getReturns = async (req, res) => {
  try {
    const query = { tenantId: req.user.tenantId };
    if (req.query.consignmentId) query.consignmentId = req.query.consignmentId;
    
    const returns = await ConsignmentReturn.find(query)
      .populate('supplierId', 'name')
      .populate('branchId', 'name')
      .populate('items.productId', 'name sku')
      .sort({ createdAt: -1 });
      
    res.status(200).json({ success: true, data: returns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getReturn = async (req, res) => {
  try {
    const cr = await ConsignmentReturn.findOne({ _id: req.params.id, tenantId: req.user.tenantId })
      .populate('supplierId')
      .populate('branchId')
      .populate('items.productId')
      .populate('createdBy', 'name')
      .populate('validatedBy', 'name');
      
    if (!cr) return res.status(404).json({ success: false, message: 'Return not found' });
    res.status(200).json({ success: true, data: cr });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.confirmReturn = async (req, res) => {
  try {
    const cr = await ConsignmentReturn.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!cr) return res.status(404).json({ success: false, message: 'Return not found' });
    if (cr.status !== 'DRAFT') return res.status(400).json({ success: false, message: 'Only DRAFT returns can be confirmed' });

    cr.status = 'CONFIRMED';
    cr.confirmedBy = req.user._id;
    cr.confirmedAt = new Date();
    await cr.save();

    res.status(200).json({ success: true, data: cr });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.validateReturn = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const cr = await ConsignmentReturn.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).session(session);
    if (!cr) throw new Error('Return not found');
    if (cr.status !== 'CONFIRMED' && cr.status !== 'DRAFT') {
      throw new Error(`Cannot validate return in ${cr.status} status`);
    }

    const consignment = await Consignment.findOne({ _id: cr.consignmentId, tenantId: req.user.tenantId }).session(session);
    if (!consignment) throw new Error('Consignment not found');

    for (const item of cr.items) {
      if (item.returnQuantity > 0) {
        // Validate against ConsignmentStock
        let cStock = await ConsignmentStock.findOne({
          tenantId: req.user.tenantId,
          supplierId: cr.supplierId,
          consignmentId: cr.consignmentId,
          productId: item.productId,
          branchId: cr.branchId
        }).session(session);

        if (!cStock) {
          throw new Error(`No consignment stock found for product ${item.productId}`);
        }
        
        if (item.baseQuantity > cStock.availableQuantity) {
          throw new Error(`Cannot return ${item.baseQuantity}. Only ${cStock.availableQuantity} available in consignment stock for product ${item.productId}`);
        }

        // Validate physical stock
        let stock = await Stock.findOne({
          tenantId: req.user.tenantId,
          branchId: cr.branchId,
          productId: item.productId,
          ownerType: 'SUPPLIER',
          ownerId: cr.supplierId
        }).session(session);

        if (!stock || stock.quantity < item.baseQuantity) {
           throw new Error(`Insufficient physical stock at location for product ${item.productId}`);
        }

        // Decrease physical stock
        stock.quantity -= item.baseQuantity;
        await stock.save({ session });

        // Decrease ConsignmentStock available, increase returned
        cStock.returnedQuantity += item.baseQuantity;
        cStock.availableQuantity = cStock.receivedQuantity - cStock.consumedQuantity - cStock.returnedQuantity;
        cStock.lastActivityAt = new Date();
        await cStock.save({ session });

        // Update main Consignment document item totals
        const cItem = consignment.items.find(i => i.productId.toString() === item.productId.toString());
        if (cItem) {
          cItem.returnedQuantity = (cItem.returnedQuantity || 0) + item.returnQuantity;
          await consignment.save({ session });
        }

        // Create StockMovement
        await StockMovement.create([{
          tenantId: req.user.tenantId,
          branchId: cr.branchId,
          productId: item.productId,
          quantity: item.baseQuantity,
          documentQuantity: item.returnQuantity,
          documentUom: item.uom,
          baseQuantity: item.baseQuantity,
          baseUom: item.baseUom,
          type: 'OUT',
          referenceId: cr.returnNumber,
          referenceType: 'CONSIGNMENT_RETURN',
          ownerType: 'SUPPLIER',
          ownerId: cr.supplierId,
          createdBy: req.user._id
        }], { session });
      }
    }

    cr.status = 'VALIDATED';
    cr.validatedBy = req.user._id;
    cr.validatedAt = new Date();
    await cr.save({ session });

    await session.commitTransaction();
    res.status(200).json({ success: true, data: cr });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

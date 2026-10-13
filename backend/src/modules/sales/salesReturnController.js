const mongoose = require('mongoose');
const SalesReturn = require('../../core/models/SalesReturn');
const DeliveryNote = require('../../core/models/DeliveryNote');
const Stock = require('../../core/models/Stock');
const StockMovement = require('../../core/models/StockMovement');
const Counter = require('../../core/models/Counter');
const uomService = require('../../utils/uomService');
const { verifyBranchAccess } = require('../../core/middleware/authMiddleware');
const { getReadFilter } = require('../../core/utils/scopeHelper');

const generateSRNumber = async (tenantId, session) => {
  const currentYear = new Date().getFullYear();
  const counterId = `SR_${currentYear}`;
  
  const counter = await Counter.findOneAndUpdate(
    { tenantId, sequenceName: counterId, year: currentYear },
    { $inc: { sequenceValue: 1 } },
    { returnDocument: 'after', upsert: true, session }
  );

  const seqStr = String(counter.sequenceValue).padStart(6, '0');
  return `SR-${currentYear}-${seqStr}`;
};

exports.getSalesReturns = async (req, res) => {
  try {
    const query = { ...getReadFilter(req), isActive: true };

    const srList = await SalesReturn.find(query)
      .populate('customerId', 'name')
      .populate('deliveryNoteId', 'deliveryNoteNumber')
      .populate('salesOrderId', 'orderNumber')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json(srList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSalesReturnById = async (req, res) => {
  try {
    const filter = getReadFilter(req);
    const sr = await SalesReturn.findOne({ _id: req.params.id, ...filter })
      .populate('customerId', 'name email phone')
      .populate('deliveryNoteId', 'deliveryNoteNumber')
      .populate('salesOrderId', 'orderNumber')
      .populate('branchId', 'name')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');

    if (!sr) return res.status(404).json({ message: 'Sales Return not found' });

    res.status(200).json(sr);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper function to calculate returnable quantities
const getReturnableQuantities = async (deliveryNoteId, req, session) => {
  const filter = getReadFilter(req);
  const deliveryNote = await DeliveryNote.findOne({ _id: deliveryNoteId, ...filter }).session(session);
  if (!deliveryNote) throw new Error('Delivery Note not found');

  const existingReturns = await SalesReturn.find({
    deliveryNoteId,
    ...filter,
    status: { $ne: 'CANCELLED' }
  }).session(session);

  const returnableQuantities = {};
  
  deliveryNote.items.forEach(item => {
    returnableQuantities[item.productId.toString()] = {
      deliveredQuantity: item.deliveryQuantity,
      alreadyReturned: 0,
      returnable: item.deliveryQuantity
    };
  });

  existingReturns.forEach(sr => {
    sr.items.forEach(srItem => {
      if (returnableQuantities[srItem.productId.toString()]) {
        returnableQuantities[srItem.productId.toString()].alreadyReturned += srItem.returnQuantity;
        returnableQuantities[srItem.productId.toString()].returnable -= srItem.returnQuantity;
      }
    });
  });

  return { deliveryNote, returnableQuantities };
};

exports.createSalesReturn = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const tenantId = req.user.tenantId;
    const body = { ...req.body };

    const { deliveryNote, returnableQuantities } = await getReturnableQuantities(body.deliveryNoteId, req, session);

    if (deliveryNote.status !== 'DELIVERED') { // Validated delivery note
      // NOTE: Wait, what is the status for a validated Delivery Note? Usually 'DELIVERED'.
      // Let's assume DELIVERED based on the schema I read: enum: ['DRAFT', 'READY', 'DISPATCHED', 'PARTIALLY_DELIVERED', 'DELIVERED', 'CANCELLED']
    }
    // To be safer, let's just allow DELIVERED and PARTIALLY_DELIVERED, or we can just assume DELIVERED is validated.
    if (!['DELIVERED', 'PARTIALLY_DELIVERED'].includes(deliveryNote.status)) {
       throw new Error('Sales Returns can only be created from DELIVERED Delivery Notes');
    }

    // Validate return quantities
    for (const item of body.items) {
      const rq = returnableQuantities[item.productId.toString()];
      if (!rq) {
        throw new Error(`Product ${item.productId} is not part of this Delivery Note`);
      }
      if (item.returnQuantity <= 0) {
        throw new Error('Return quantity must be greater than zero');
      }
      if (item.returnQuantity > rq.returnable) {
        throw new Error(`Cannot return more than returnable quantity (${rq.returnable}) for product ${item.productId}`);
      }
      item.deliveredQuantity = rq.deliveredQuantity;
      item.previouslyReturnedQuantity = rq.alreadyReturned;
    }

    // Snapshot UOM details from Product Master
    if (body.items && body.items.length > 0) {
      const productIds = body.items.map(i => i.productId);
      const filter = getReadFilter(req);
      const products = await mongoose.model('Product').find({ _id: { $in: productIds }, ...filter }).session(session);
      for (const item of body.items) {
        const product = products.find(p => p._id.toString() === item.productId.toString());
        if (product) {
          item.uom = product.uomDetails?.salesUnit || product.uom || 'PCS';
          item.conversionFactor = product.uomDetails?.salesConversionFactor || 1;
          item.baseUom = product.uomDetails?.baseUnit || product.uom || 'PCS';
          item.baseQuantity = uomService.convertToBase(item.returnQuantity, item.conversionFactor);
        }
      }
    }

    body.returnNumber = await generateSRNumber(tenantId, session);
    body.tenantId = tenantId;
    body.legalCompanyId = deliveryNote.legalCompanyId;
    body.branchId = deliveryNote.branchId;
    body.customerId = deliveryNote.customerId;
    body.salesOrderId = deliveryNote.salesOrderId;
    body.createdBy = req.user._id;
    body.status = 'DRAFT';

    const sr = await SalesReturn.create([body], { session });

    await session.commitTransaction();
    res.status(201).json(sr[0]);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

exports.updateSalesReturn = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const filter = getReadFilter(req);
    const srId = req.params.id;

    const sr = await SalesReturn.findOne({ _id: srId, ...filter }).session(session);
    if (!sr) throw new Error('Sales Return not found');

    if (sr.status !== 'DRAFT') {
      throw new Error(`Cannot edit Sales Return in ${sr.status} status`);
    }

    if (req.body.items) {
      const deliveryNote = await DeliveryNote.findOne({ _id: sr.deliveryNoteId, ...filter }).session(session);
      const existingReturns = await SalesReturn.find({
        deliveryNoteId: sr.deliveryNoteId,
        ...filter,
        _id: { $ne: srId },
        status: { $ne: 'CANCELLED' }
      }).session(session);

      const returnableQuantities = {};
      deliveryNote.items.forEach(item => {
        returnableQuantities[item.productId.toString()] = {
          deliveredQuantity: item.deliveryQuantity,
          alreadyReturned: 0,
          returnable: item.deliveryQuantity
        };
      });

      existingReturns.forEach(esr => {
        esr.items.forEach(srItem => {
          if (returnableQuantities[srItem.productId.toString()]) {
             returnableQuantities[srItem.productId.toString()].alreadyReturned += srItem.returnQuantity;
             returnableQuantities[srItem.productId.toString()].returnable -= srItem.returnQuantity;
          }
        });
      });

      for (const item of req.body.items) {
        const rq = returnableQuantities[item.productId.toString()];
        if (item.returnQuantity > rq.returnable) {
          throw new Error(`Cannot return more than returnable quantity (${rq.returnable}) for product ${item.productId}`);
        }
        item.deliveredQuantity = rq.deliveredQuantity;
        item.previouslyReturnedQuantity = rq.alreadyReturned;
      }

      // Snapshot UOM details from Product Master on update
      const productIds = req.body.items.map(i => i.productId);
      const products = await mongoose.model('Product').find({ _id: { $in: productIds }, ...filter }).session(session);
      for (const item of req.body.items) {
        const product = products.find(p => p._id.toString() === item.productId.toString());
        if (product) {
          item.uom = product.uomDetails?.salesUnit || product.uom || 'PCS';
          item.conversionFactor = product.uomDetails?.salesConversionFactor || 1;
          item.baseUom = product.uomDetails?.baseUnit || product.uom || 'PCS';
          item.baseQuantity = uomService.convertToBase(item.returnQuantity, item.conversionFactor);
        }
      }
    }

    const updated = await SalesReturn.findOneAndUpdate(
      { _id: srId, ...filter },
      { ...req.body, updatedBy: req.user._id },
      { returnDocument: 'after', session }
    );

    await session.commitTransaction();
    res.status(200).json(updated);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const filter = getReadFilter(req);
    const sr = await SalesReturn.findOne({ _id: req.params.id, ...filter });
    if (!sr) return res.status(404).json({ message: 'Sales Return not found' });
    
    if (sr.status !== 'DRAFT') {
      return res.status(400).json({ message: `Cannot change status from ${sr.status}` });
    }
    
    sr.status = status;
    sr.updatedBy = req.user._id;
    await sr.save();

    res.status(200).json(sr);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.validateSalesReturn = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const tenantId = req.user.tenantId;
    const filter = getReadFilter(req);
    const sr = await SalesReturn.findOne({ _id: req.params.id, ...filter }).session(session);

    if (!sr) throw new Error('Sales Return not found');
    if (sr.status !== 'CONFIRMED' && sr.status !== 'DRAFT') {
      throw new Error(`Cannot validate Sales Return in ${sr.status} status`);
    }

    for (const item of sr.items) {
      if (item.returnQuantity <= 0) continue;

      const product = await mongoose.model('Product').findOne({ _id: item.productId, ...filter }).session(session);
      if (!product) throw new Error(`Product not found`);

      if (product.type !== 'SERVICE') {
        const baseReturnQty = uomService.convertToBase(item.returnQuantity, item.conversionFactor);

        const stockUpdate = await Stock.findOneAndUpdate(
          {
            tenantId,
            legalCompanyId: sr.legalCompanyId,
            branchId: sr.branchId,
            productId: item.productId
          },
          { $inc: { quantity: baseReturnQty } }, // Increase stock
          { session, returnDocument: 'after', upsert: true }
        );

        await StockMovement.create([{
          tenantId,
          legalCompanyId: sr.legalCompanyId,
          branchId: sr.branchId,
          productId: item.productId,
          quantity: baseReturnQty, // Positive quantity
          documentQuantity: item.returnQuantity,
          documentUom: item.uom,
          baseQuantity: baseReturnQty,
          baseUom: item.baseUom,
          type: 'SALES_RETURN',
          referenceId: sr.returnNumber,
          referenceType: 'SalesReturn',
          createdBy: req.user._id
        }], { session });
      }
    }

    sr.status = 'VALIDATED';
    sr.stockAdded = true;
    sr.stockAddedAt = new Date();
    sr.updatedBy = req.user._id;
    await sr.save({ session });

    await session.commitTransaction();
    res.status(200).json(sr);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

exports.getReturnableInfo = async (req, res) => {
  try {
    const { deliveryNoteId } = req.params;
    const { returnableQuantities } = await getReturnableQuantities(deliveryNoteId, req, null);
    res.status(200).json(returnableQuantities);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

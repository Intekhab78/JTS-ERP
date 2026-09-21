const mongoose = require('mongoose');
const GRN = require('../../core/models/GRN');
const PurchaseOrder = require('../../core/models/PurchaseOrder');
const PurchaseOrderItem = require('../../core/models/PurchaseOrderItem');
const PurchaseOrderSchedule = require('../../core/models/PurchaseOrderSchedule');
const Stock = require('../../core/models/Stock');
const StockMovement = require('../../core/models/StockMovement');
const Counter = require('../../core/models/Counter');
const Product = require('../../core/models/Product');
const Consignment = require('../../core/models/Consignment');
const uomService = require('../../utils/uomService');
const landedCostService = require('../../services/landedCostService');
const { verifyBranchAccess } = require('../../core/middleware/authMiddleware');

const generateGRNNumber = async (tenantId, session) => {
  const currentYear = new Date().getFullYear();
  const counterId = `GRN_${currentYear}`;

  const counter = await Counter.findOneAndUpdate(
    { tenantId, sequenceName: counterId, year: currentYear },
    { $inc: { sequenceValue: 1 } },
    { returnDocument: 'after', upsert: true, session }
  );

  const seqStr = String(counter.sequenceValue).padStart(6, '0');
  return `GRN-${currentYear}-${seqStr}`;
};

exports.getGRNs = async (req, res) => {
  try {
    const grns = await GRN.find({ tenantId: req.user.tenantId, isActive: true })
      .populate('branchId', 'name')
      .populate('supplierId', 'name email phone')
      .populate('purchaseOrderId', '_id expectedDate')
      .sort({ createdAt: -1 });
    res.status(200).json(grns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getGRNById = async (req, res) => {
  try {
    const grn = await GRN.findOne({ _id: req.params.id, tenantId: req.user.tenantId, isActive: true })
      .populate('branchId', 'name')
      .populate('supplierId', 'name email phone')
      .populate('purchaseOrderId', '_id')
      .populate('createdBy', 'name')
      .populate('validatedBy', 'name');
    if (!grn) return res.status(404).json({ message: 'GRN not found' });
    res.status(200).json(grn);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createGRN = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const tenantId = req.user.tenantId;
    const body = { ...req.body };

    // Auto-generate GRN number if not provided
    if (!body.grnNumber) {
      body.grnNumber = await generateGRNNumber(tenantId, session);
    }

    // Validate PO constraints if linked to PO
    if (body.purchaseOrderId && body.items) {
      const po = await PurchaseOrder.findOne({ _id: body.purchaseOrderId, tenantId }).session(session);
      if (!po) throw new Error('Purchase Order not found');
      if (po.status !== 'CONFIRMED' && po.status !== 'PARTIALLY_RECEIVED') {
        throw new Error('GRNs can only be created for CONFIRMED or PARTIALLY_RECEIVED Purchase Orders');
      }

      const poItems = await PurchaseOrderItem.find({ purchaseOrderId: body.purchaseOrderId, tenantId }).session(session);
      const schedules = await PurchaseOrderSchedule.find({ purchaseOrderId: body.purchaseOrderId, tenantId }).session(session);

      for (const item of body.items) {
        const poItem = poItems.find(pi => pi.productId.toString() === item.productId.toString());
        if (!poItem) {
          throw new Error(`Product ${item.productId} is not part of this Purchase Order`);
        }

        let remaining = poItem.quantity - (poItem.receivedQuantity || 0);

        if (item.purchaseOrderScheduleId) {
          const schedule = schedules.find(s => s._id.toString() === item.purchaseOrderScheduleId.toString());
          if (!schedule) {
            throw new Error(`Schedule not found for product ${item.productId}`);
          }
          if (schedule.branchId.toString() !== body.branchId.toString()) {
            throw new Error(`Schedule destination (${schedule.branchId}) does not match GRN destination (${body.branchId})`);
          }
          const scheduleRemaining = schedule.scheduledQuantity - (schedule.receivedQuantity || 0);
          remaining = Math.min(remaining, scheduleRemaining);
        }

        if (item.receivedQuantity > remaining) {
          throw new Error(`Cannot receive more than remaining quantity (${remaining}) for product ${item.productId}`);
        }
      }
    }

    // Snapshot UOM details from Product Master
    if (body.items && body.items.length > 0) {
      const productIds = body.items.map(i => i.productId);
      const products = await Product.find({ _id: { $in: productIds }, tenantId }).session(session);
      for (const item of body.items) {
        const product = products.find(p => p._id.toString() === item.productId.toString());
        if (product) {
          item.uom = product.uomDetails?.purchaseUnit || product.uom || 'PCS';
          item.conversionFactor = product.uomDetails?.purchaseConversionFactor || 1;
          item.baseUom = product.uomDetails?.baseUnit || product.uom || 'PCS';
          item.baseQuantity = uomService.convertToBase(item.orderedQuantity, item.conversionFactor);
        }
      }
    }

    // Calculate Landed Cost
    const processedBody = await landedCostService.calculateLandedCost(body, tenantId);

    const grn = await GRN.create([{
      ...processedBody,
      tenantId,
      createdBy: req.user._id,
      status: 'DRAFT'
    }], { session });

    await session.commitTransaction();
    res.status(201).json(grn[0]);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

exports.updateGRN = async (req, res) => {
  try {
    const grn = await GRN.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!grn) return res.status(404).json({ message: 'GRN not found' });

    if (grn.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only DRAFT GRNs can be updated' });
    }

    // Validate quantities
    if (req.body.items) {
      for (const item of req.body.items) {
        if (item.acceptedQuantity + (item.rejectedQuantity || 0) > item.receivedQuantity) {
          return res.status(400).json({ message: 'Accepted + Rejected cannot exceed Received' });
        }
      }

      // Snapshot UOM details from Product Master on update
      const productIds = req.body.items.map(i => i.productId);
      const products = await Product.find({ _id: { $in: productIds }, tenantId: req.user.tenantId });
      for (const item of req.body.items) {
        const product = products.find(p => p._id.toString() === item.productId.toString());
        if (product) {
          item.uom = product.uomDetails?.purchaseUnit || product.uom || 'PCS';
          item.conversionFactor = product.uomDetails?.purchaseConversionFactor || 1;
          item.baseUom = product.uomDetails?.baseUnit || product.uom || 'PCS';
          item.baseQuantity = uomService.convertToBase(item.orderedQuantity, item.conversionFactor);
        }
      }
    }

    const processedBody = await landedCostService.calculateLandedCost(req.body, req.user.tenantId);

    const updatedGrn = await GRN.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { ...processedBody, updatedBy: req.user._id },
      { returnDocument: 'after' }
    );
    res.status(200).json(updatedGrn);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.confirmGRN = async (req, res) => {
  try {
    const grn = await GRN.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!grn) return res.status(404).json({ message: 'GRN not found' });

    if (grn.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only DRAFT GRNs can be confirmed' });
    }

    grn.status = 'CONFIRMED';
    grn.updatedBy = req.user._id;
    await grn.save();

    res.status(200).json(grn);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.validateGRN = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const grn = await GRN.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).session(session);
    if (!grn) throw new Error('GRN not found');

    if (grn.status === 'VALIDATED') {
      throw new Error('GRN is already validated');
    }

    if (grn.status !== 'CONFIRMED' && grn.status !== 'DRAFT') {
      throw new Error(`Cannot validate GRN in ${grn.status} status`);
    }

    // Atomic Stock Update and PO update
    for (const item of grn.items) {
      if (item.acceptedQuantity > 0) {
        const baseAcceptedQty = uomService.convertToBase(item.acceptedQuantity, item.conversionFactor);

        // Update Stock
        let stock = await Stock.findOne({
          tenantId: req.user.tenantId,
          branchId: grn.branchId,
          productId: item.productId,
          ownerType: item.ownerType || 'COMPANY',
          ownerId: item.ownerId || null
        }).session(session);

        if (stock) {
          stock.quantity += baseAcceptedQty;
          await stock.save({ session });
        } else {
          await Stock.create([{
            tenantId: req.user.tenantId,
            branchId: grn.branchId,
            productId: item.productId,
            quantity: baseAcceptedQty,
            ownerType: item.ownerType || 'COMPANY',
            ownerId: item.ownerId || null
          }], { session });
        }

        // Create Stock Movement log
        await StockMovement.create([{
          tenantId: req.user.tenantId,
          branchId: grn.branchId,
          productId: item.productId,
          quantity: baseAcceptedQty,
          documentQuantity: item.acceptedQuantity,
          documentUom: item.uom,
          baseQuantity: baseAcceptedQty,
          baseUom: item.baseUom,
          type: 'GRN',
          referenceId: grn.grnNumber,
          referenceType: 'GRN',
          ownerType: item.ownerType || 'COMPANY',
          ownerId: item.ownerId || null,
          createdBy: req.user._id
        }], { session });

        // Update Consignment receivedQuantity if supplier owned
        if ((item.ownerType === 'SUPPLIER') && item.ownerId) {
          const cons = await Consignment.findOne({
            tenantId: req.user.tenantId,
            supplierId: item.ownerId,
            status: { $in: ['ACTIVE', 'CLOSED'] },
            'items.productId': item.productId
          }).session(session);

          if (cons) {
            const consItem = cons.items.find(i => i.productId.toString() === item.productId.toString());
            if (consItem) {
              consItem.receivedQuantity = (consItem.receivedQuantity || 0) + item.acceptedQuantity;
              await cons.save({ session });
            }
          }
        }
      }

      // Update PurchaseOrderItem if linked
      if (grn.purchaseOrderId) {
        const poItem = await PurchaseOrderItem.findOne({
          purchaseOrderId: grn.purchaseOrderId,
          productId: item.productId,
          tenantId: req.user.tenantId
        }).session(session);

        if (poItem) {
          if ((poItem.receivedQuantity || 0) + item.receivedQuantity > poItem.quantity) {
            throw new Error(`Validating this GRN exceeds the ordered quantity for product ${item.productId}`);
          }
          poItem.receivedQuantity = (poItem.receivedQuantity || 0) + item.receivedQuantity;
          await poItem.save({ session });
        }

        if (item.purchaseOrderScheduleId) {
          const schedule = await PurchaseOrderSchedule.findOne({
            _id: item.purchaseOrderScheduleId,
            tenantId: req.user.tenantId
          }).session(session);

          if (schedule) {
            if ((schedule.receivedQuantity || 0) + item.receivedQuantity > schedule.scheduledQuantity) {
              throw new Error(`Validating this GRN exceeds the scheduled quantity for product ${item.productId}`);
            }
            schedule.receivedQuantity = (schedule.receivedQuantity || 0) + item.receivedQuantity;

            if (schedule.receivedQuantity >= schedule.scheduledQuantity) {
              schedule.status = 'RECEIVED';
            } else if (schedule.receivedQuantity > 0) {
              schedule.status = 'PARTIALLY_RECEIVED';
            }

            await schedule.save({ session });
          }
        }
      }
    }

    // Check if entire PO is fulfilled
    if (grn.purchaseOrderId) {
      const allPoItems = await PurchaseOrderItem.find({ purchaseOrderId: grn.purchaseOrderId, tenantId: req.user.tenantId }).session(session);
      const isFullyReceived = allPoItems.every(i => (i.receivedQuantity || 0) >= i.quantity);
      const hasSomeReceipts = allPoItems.some(i => (i.receivedQuantity || 0) > 0);

      if (isFullyReceived) {
        await PurchaseOrder.findOneAndUpdate(
          { _id: grn.purchaseOrderId, tenantId: req.user.tenantId },
          { status: 'RECEIVED' },
          { session }
        );
      } else if (hasSomeReceipts) {
        await PurchaseOrder.findOneAndUpdate(
          { _id: grn.purchaseOrderId, tenantId: req.user.tenantId },
          { status: 'PARTIALLY_RECEIVED' },
          { session }
        );
      }
    }

    grn.status = 'VALIDATED';
    grn.validatedBy = req.user._id;
    grn.validatedAt = new Date();
    await grn.save({ session });

    await session.commitTransaction();
    res.status(200).json(grn);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

exports.cancelGRN = async (req, res) => {
  try {
    const grn = await GRN.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!grn) return res.status(404).json({ message: 'GRN not found' });

    if (grn.status === 'VALIDATED') {
      return res.status(400).json({ message: 'Cannot cancel a VALIDATED GRN. Use an inventory reversal instead.' });
    }

    grn.status = 'CANCELLED';
    grn.updatedBy = req.user._id;
    await grn.save();

    res.status(200).json({ message: 'GRN successfully cancelled', grn });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteGRN = async (req, res) => {
  try {
    const grn = await GRN.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!grn) return res.status(404).json({ message: 'GRN not found' });

    if (grn.status === 'VALIDATED') {
      return res.status(400).json({ message: 'Cannot delete a VALIDATED GRN' });
    }

    grn.isActive = false;
    grn.updatedBy = req.user._id;
    await grn.save();

    res.status(200).json({ message: 'GRN successfully deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

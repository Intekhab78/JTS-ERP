const mongoose = require('mongoose');
const BOM = require('../../core/models/BOM');
const ManufacturingOrder = require('../../core/models/ManufacturingOrder');
const Stock = require('../../core/models/Stock');
const StockMovement = require('../../core/models/StockMovement');
const Counter = require('../../core/models/Counter');
const Product = require('../../core/models/Product');
const uomService = require('../../utils/uomService');
const { verifyBranchAccess, verifyProductAccess } = require('../../core/middleware/authMiddleware');

const generateMONumber = async (tenantId, session) => {
  const currentYear = new Date().getFullYear();
  const counterId = `MO_${currentYear}`;
  
  const counter = await Counter.findOneAndUpdate(
    { tenantId, sequenceName: counterId, year: currentYear },
    { $inc: { sequenceValue: 1 } },
    { returnDocument: 'after', upsert: true, session }
  );

  const seqStr = String(counter.sequenceValue).padStart(6, '0');
  return `MO-${currentYear}-${seqStr}`;
};

// @desc    Get all BOMs
exports.getBOMs = async (req, res) => {
  try {
    const boms = await BOM.find({ tenantId: req.user.tenantId })
      .populate('finishedProductId', 'name sku type uom')
      .populate('components.productId', 'name sku uom')
      .sort({ createdAt: -1 });
    res.status(200).json(boms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a BOM
exports.createBOM = async (req, res) => {
  try {
    const isFinishedProductAuthorized = await verifyProductAccess(req.body.finishedProductId, req, true);
    if (!isFinishedProductAuthorized) {
      return res.status(403).json({ message: 'Forbidden: Finished product does not belong to this tenant or is inactive' });
    }

    if (req.body.components && Array.isArray(req.body.components)) {
      for (const comp of req.body.components) {
        const isCompAuthorized = await verifyProductAccess(comp.productId, req, true);
        if (!isCompAuthorized) {
          return res.status(403).json({ message: `Forbidden: Component ${comp.productId} does not belong to this tenant or is inactive` });
        }
      }
    }

    const bom = await BOM.create({
      tenantId: req.user.tenantId,
      ...req.body
    });
    const populated = await BOM.findById(bom._id)
      .populate('finishedProductId', 'name sku type uom')
      .populate('components.productId', 'name sku uom');
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all Manufacturing Orders
exports.getManufacturingOrders = async (req, res) => {
  try {
    const filter = { tenantId: req.user.tenantId };
    if (req.user.branchId) {
      filter.branchId = req.user.branchId;
    }
    
    const orders = await ManufacturingOrder.find(filter)
      .populate({
        path: 'bomId',
        populate: { path: 'finishedProductId', select: 'name sku type uom' }
      })
      .populate('branchId', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getManufacturingOrderById = async (req, res) => {
  try {
    const filter = { _id: req.params.id, tenantId: req.user.tenantId };
    const order = await ManufacturingOrder.findOne(filter)
      .populate({
        path: 'bomId',
        populate: { path: 'finishedProductId', select: 'name sku type uom' }
      })
      .populate('branchId', 'name');
    
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.branchId && order.branchId._id.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this branch' });
    }

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a Manufacturing Order (DRAFT)
exports.createManufacturingOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (req.body.branchId) {
      const isAuthorized = await verifyBranchAccess(req.body.branchId, req);
      if (!isAuthorized) throw new Error('Forbidden: You do not have access to this branch');
    }

    const orderNumber = await generateMONumber(req.user.tenantId, session);

    const order = await ManufacturingOrder.create([{
      tenantId: req.user.tenantId,
      ...req.body,
      orderNumber,
      status: 'DRAFT',
      producedQuantity: 0
    }], { session });
    
    await session.commitTransaction();

    const populated = await ManufacturingOrder.findById(order[0]._id)
      .populate({
        path: 'bomId',
        populate: { path: 'finishedProductId', select: 'name sku type uom' }
      })
      .populate('branchId', 'name');

    res.status(201).json(populated);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Confirm MO (Snapshot BOM)
exports.confirmOrder = async (req, res) => {
  try {
    const order = await ManufacturingOrder.findOne({ _id: req.params.id, tenantId: req.user.tenantId })
      .populate({ path: 'bomId', populate: { path: 'components.productId' }});

    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'DRAFT') return res.status(400).json({ message: 'Order must be DRAFT to confirm' });

    const rawMaterials = order.bomId.components.map(comp => {
      const product = comp.productId;
      const baseUnit = product.uomDetails?.baseUnit || product.uom || 'PCS';
      const requiredQty = comp.quantity * order.quantityToProduce;
      return {
        productId: product._id,
        itemName: product.name,
        uom: baseUnit,
        conversionFactor: 1,
        baseUom: baseUnit,
        baseQuantity: requiredQty,
        requiredQuantity: requiredQty,
        consumedQuantity: 0
      };
    });

    order.rawMaterials = rawMaterials;
    order.status = 'CONFIRMED';
    await order.save();

    res.status(200).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Check Availability
exports.checkAvailability = async (req, res) => {
  try {
    const order = await ManufacturingOrder.findOne({ _id: req.params.id, tenantId: req.user.tenantId });

    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'CONFIRMED') return res.status(400).json({ message: 'Order must be CONFIRMED to check availability' });

    let isAvailable = true;
    for (const rm of order.rawMaterials) {
      const stock = await Stock.findOne({ tenantId: req.user.tenantId, branchId: order.branchId, productId: rm.productId });
      if (!stock || stock.quantity < rm.requiredQuantity) {
        isAvailable = false;
        break;
      }
    }

    if (!isAvailable) {
      return res.status(400).json({ message: 'Insufficient stock for one or more raw materials' });
    }

    order.status = 'READY';
    await order.save();

    res.status(200).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Consume Materials
exports.consumeMaterials = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const order = await ManufacturingOrder.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).session(session);

    if (!order) throw new Error('Order not found');
    if (order.status !== 'READY' && order.status !== 'IN_PROGRESS') {
      throw new Error('Order must be READY or IN_PROGRESS to consume materials');
    }

    let consumedAny = false;

    for (const rm of order.rawMaterials) {
      const remainingToConsume = rm.requiredQuantity - rm.consumedQuantity;
      if (remainingToConsume <= 0) continue;

      const baseConsumeQty = uomService.convertToBase(remainingToConsume, rm.conversionFactor || 1);

      let stock = await Stock.findOne({
        tenantId: req.user.tenantId,
        branchId: order.branchId,
        productId: rm.productId
      }).session(session);

      if (!stock || stock.quantity < baseConsumeQty) {
        throw new Error(`Insufficient stock for component: ${rm.itemName}. Requires ${baseConsumeQty} (Base UOM), found ${stock ? stock.quantity : 0}`);
      }

      stock.quantity -= baseConsumeQty;
      await stock.save({ session });

      await StockMovement.create([{
        tenantId: req.user.tenantId,
        branchId: order.branchId,
        productId: rm.productId,
        quantity: -baseConsumeQty,
        documentQuantity: remainingToConsume,
        documentUom: rm.uom,
        baseQuantity: baseConsumeQty,
        baseUom: rm.baseUom,
        type: 'MANUFACTURING_CONSUMPTION',
        referenceId: order.orderNumber,
        referenceType: 'ManufacturingOrder',
        createdBy: req.user._id
      }], { session });

      rm.consumedQuantity += remainingToConsume;
      consumedAny = true;
    }

    if (!consumedAny) {
      throw new Error('All materials are already consumed.');
    }

    if (order.status === 'READY') {
      order.status = 'IN_PROGRESS';
      order.startDate = new Date();
    }
    
    await order.save({ session });
    await session.commitTransaction();

    res.status(200).json(order);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Produce Finished Goods
exports.produceFinishedGoods = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { productionQuantity } = req.body;
    
    if (!productionQuantity || productionQuantity <= 0) {
      throw new Error('Production quantity must be greater than zero');
    }

    const order = await ManufacturingOrder.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).populate('bomId').session(session);

    if (!order) throw new Error('Order not found');
    if (order.status !== 'IN_PROGRESS') {
      throw new Error('Order must be IN_PROGRESS to produce goods');
    }

    const remainingToProduce = order.quantityToProduce - order.producedQuantity;
    
    if (productionQuantity > remainingToProduce) {
      throw new Error(`Cannot produce more than planned. Remaining to produce: ${remainingToProduce}`);
    }

    const finishedProductId = order.bomId.finishedProductId;
    const product = await Product.findOne({ _id: finishedProductId, tenantId: req.user.tenantId }).session(session);
    const baseUnit = product?.uomDetails?.baseUnit || product?.uom || 'PCS';
    const baseProductionQty = uomService.convertToBase(productionQuantity, 1); // Assume MO produces in Base UOM

    let finishedStock = await Stock.findOne({
      tenantId: req.user.tenantId,
      branchId: order.branchId,
      productId: finishedProductId
    }).session(session);

    if (!finishedStock) {
      finishedStock = new Stock({
        tenantId: req.user.tenantId,
        branchId: order.branchId,
        productId: finishedProductId,
        quantity: baseProductionQty
      });
    } else {
      finishedStock.quantity += baseProductionQty;
    }
    
    await finishedStock.save({ session });

    await StockMovement.create([{
      tenantId: req.user.tenantId,
      branchId: order.branchId,
      productId: finishedProductId,
      quantity: baseProductionQty,
      documentQuantity: productionQuantity,
      documentUom: baseUnit,
      baseQuantity: baseProductionQty,
      baseUom: baseUnit,
      type: 'MANUFACTURING_PRODUCTION',
      referenceId: order.orderNumber,
      referenceType: 'ManufacturingOrder',
      createdBy: req.user._id
    }], { session });

    order.producedQuantity += productionQuantity;

    if (order.producedQuantity >= order.quantityToProduce) {
      order.status = 'DONE';
      order.endDate = new Date();
    }

    await order.save({ session });
    await session.commitTransaction();

    res.status(200).json(order);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Cancel Order
exports.cancelOrder = async (req, res) => {
  try {
    const order = await ManufacturingOrder.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    if (order.status !== 'DRAFT' && order.status !== 'CONFIRMED') {
      return res.status(400).json({ message: 'Only DRAFT or CONFIRMED orders can be cancelled without manual stock adjustment' });
    }

    order.status = 'CANCELLED';
    await order.save();
    res.status(200).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

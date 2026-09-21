const mongoose = require('mongoose');
const RFQ = require('../../core/models/RFQ');
const RFQItem = require('../../core/models/RFQItem');
const PurchaseOrder = require('../../core/models/PurchaseOrder');
const PurchaseOrderItem = require('../../core/models/PurchaseOrderItem');
const Counter = require('../../core/models/Counter');
const { verifyBranchAccess } = require('../../core/middleware/authMiddleware');

const generateRFQNumber = async (tenantId, session) => {
  const currentYear = new Date().getFullYear();
  const counterId = `RFQ_${currentYear}`;
  
  const counter = await Counter.findOneAndUpdate(
    { tenantId, sequenceName: counterId, year: currentYear },
    { $inc: { sequenceValue: 1 } },
    { returnDocument: 'after', upsert: true, session }
  );

  const seqStr = String(counter.sequenceValue).padStart(6, '0');
  return `RFQ-${currentYear}-${seqStr}`;
};

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

exports.getRFQs = async (req, res) => {
  try {
    const query = { tenantId: req.user.tenantId };
    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      query.branchId = { $in: req.user.branches };
    } else if (!hasWildcard) {
      query.branchId = { $in: [] };
    }

    const rfqs = await RFQ.find(query)
      .populate('supplierId', 'name')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json(rfqs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRFQById = async (req, res) => {
  try {
    const rfq = await RFQ.findOne({ _id: req.params.id, tenantId: req.user.tenantId })
      .populate('supplierId', 'name email phone')
      .populate('branchId', 'name');

    if (!rfq) return res.status(404).json({ message: 'RFQ not found' });

    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      if (!req.user.branches.includes(rfq.branchId?.toString())) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    } else if (!hasWildcard) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const items = await RFQItem.find({ rfqId: rfq._id, tenantId: req.user.tenantId })
      .populate('productId', 'name sku uom');

    // Check if PO exists
    const po = await PurchaseOrder.findOne({ rfqId: rfq._id, tenantId: req.user.tenantId })
      .select('_id purchaseOrderNumber status');

    res.status(200).json({ rfq, items, purchaseOrder: po });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createRFQ = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { items, ...rfqData } = req.body;
    
    // Auto-generate RFQ number without session
    rfqData.rfqNumber = await generateRFQNumber(tenantId, null);
    rfqData.tenantId = tenantId;
    rfqData.userId = req.user._id;

    if (!items || items.length === 0) {
      throw new Error('RFQ must have at least one item');
    }

    // Calculate total
    let totalAmount = 0;
    const itemDocs = items.map(item => {
      const subTotal = (item.quantity || 0) * (item.unitCost || 0);
      totalAmount += subTotal;
      return {
        ...item,
        tenantId,
        subTotal
      };
    });
    rfqData.totalAmount = totalAmount;

    const rfq = await RFQ.create(rfqData);
    const newRfqId = rfq._id;

    const itemsToInsert = itemDocs.map(item => ({ ...item, rfqId: newRfqId }));
    await RFQItem.insertMany(itemsToInsert);

    res.status(201).json(rfq);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateRFQ = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const rfqId = req.params.id;
    const { items, ...updateData } = req.body;

    const rfq = await RFQ.findOne({ _id: rfqId, tenantId });
    if (!rfq) throw new Error('RFQ not found');

    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      if (!req.user.branches.includes(rfq.branchId?.toString())) {
        throw new Error('Access denied to this branch');
      }
    } else if (!hasWildcard) {
      throw new Error('Access denied to this branch');
    }

    if (rfq.status !== 'DRAFT') {
      throw new Error('Only DRAFT RFQs can be edited');
    }

    if (!items || items.length === 0) {
      throw new Error('RFQ must have at least one item');
    }

    let totalAmount = 0;
    const itemDocs = items.map(item => {
      if (item.quantity <= 0) throw new Error('Quantity must be greater than 0');
      if (item.unitCost < 0) throw new Error('Unit price cannot be negative');
      const subTotal = (item.quantity || 0) * (item.unitCost || 0);
      totalAmount += subTotal;
      return {
        ...item,
        tenantId,
        rfqId,
        subTotal
      };
    });

    Object.assign(rfq, updateData);
    rfq.totalAmount = totalAmount;

    await rfq.save();

    // Replace items
    await RFQItem.deleteMany({ rfqId, tenantId });
    await RFQItem.insertMany(itemDocs);

    res.status(200).json(rfq);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateRFQStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const rfq = await RFQ.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    
    if (!rfq) return res.status(404).json({ message: 'RFQ not found' });
    
    // Security
    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      if (!req.user.branches.includes(rfq.branchId?.toString())) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (!hasWildcard) {
      return res.status(403).json({ message: 'Access denied' });
    }

    rfq.status = status;
    await rfq.save();

    res.status(200).json(rfq);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.convertToPO = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const rfqId = req.params.id;

    const rfq = await RFQ.findOne({ _id: rfqId, tenantId });
    if (!rfq) throw new Error('RFQ not found');

    if (rfq.status !== 'QUOTED' && rfq.status !== 'CONFIRMED') {
      throw new Error(`Cannot convert RFQ from status: ${rfq.status}`);
    }

    // Check if PO already exists
    const existingPo = await PurchaseOrder.findOne({ rfqId, tenantId });
    if (existingPo) throw new Error('Purchase Order already exists for this RFQ');

    const poNumber = await generatePONumber(tenantId, null);

    const poData = {
      tenantId,
      purchaseOrderNumber: poNumber,
      branchId: rfq.branchId,
      supplierId: rfq.supplierId,
      userId: req.user._id,
      totalAmount: rfq.totalAmount,
      currency: rfq.currency,
      paymentTerms: rfq.paymentTerms,
      status: 'DRAFT', // Odoo-style conversion to PO keeps it unconfirmed
      expectedDate: rfq.expectedDate,
      notes: rfq.notes,
      rfqId: rfq._id
    };

    const po = await PurchaseOrder.create(poData);
    const newPoId = po._id;

    const rfqItems = await RFQItem.find({ rfqId, tenantId });
    
    const poItems = rfqItems.map(item => ({
      tenantId,
      purchaseOrderId: newPoId,
      productId: item.productId,
      description: item.description,
      uom: item.uom,
      quantity: item.quantity,
      unitCost: item.unitCost,
      subTotal: item.subTotal
    }));

    await PurchaseOrderItem.insertMany(poItems);

    rfq.status = 'CONFIRMED';
    await rfq.save();

    res.status(201).json(po);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

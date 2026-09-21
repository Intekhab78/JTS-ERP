const mongoose = require('mongoose');
const DeliveryNote = require('../../core/models/DeliveryNote');
const Order = require('../../core/models/Order');
const OrderItem = require('../../core/models/OrderItem');
const Counter = require('../../core/models/Counter');
const Customer = require('../../core/models/Customer');
const Stock = require('../../core/models/Stock');
const StockMovement = require('../../core/models/StockMovement');
const Product = require('../../core/models/Product');
const uomService = require('../../utils/uomService');

// Helper to generate DN Number
const generateDNNumber = async (tenantId, session) => {
  const currentYear = new Date().getFullYear();
  
  const counter = await Counter.findOneAndUpdate(
    { tenantId, sequenceName: 'DELIVERY_NOTE', year: currentYear },
    { $inc: { sequenceValue: 1 } },
    { returnDocument: 'after', upsert: true, session }
  );

  const seqStr = String(counter.sequenceValue).padStart(6, '0');
  return `DN-${currentYear}-${seqStr}`;
};

// Helper to get aggregated previously delivered quantities for an order
const getDeliveredQuantities = async (tenantId, orderId, session) => {
  const deliveryNotes = await DeliveryNote.find({
    tenantId,
    salesOrderId: orderId,
    status: { $ne: 'CANCELLED' },
    isActive: true
  }).session(session);

  const deliveredMap = {};
  for (const dn of deliveryNotes) {
    for (const item of dn.items) {
      if (!deliveredMap[item.productId.toString()]) {
        deliveredMap[item.productId.toString()] = 0;
      }
      deliveredMap[item.productId.toString()] += item.deliveryQuantity;
    }
  }
  return deliveredMap;
};

exports.generateFromOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const tenantId = req.user.tenantId;

    const query = { _id: orderId, tenantId };
    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      query.branchId = { $in: req.user.branches };
    } else if (!hasWildcard) {
      query.branchId = { $in: [] };
    }
    const order = await Order.findOne(query);
    if (!order) return res.status(404).json({ message: 'Sales Order not found' });

    const customer = await Customer.findOne({ _id: order.customerId, tenantId });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const orderItems = await OrderItem.find({ orderId: order._id, tenantId }).populate('productId');
    
    // Using transaction just for safety, though it's a read for generating a draft
    const session = await mongoose.startSession();
    let deliveredMap;
    session.startTransaction();
    try {
      deliveredMap = await getDeliveredQuantities(tenantId, orderId, session);
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    const items = orderItems.map(item => {
      const previouslyDelivered = deliveredMap[item.productId._id.toString()] || 0;
      const remaining = item.quantity - previouslyDelivered;
      return {
        productId: item.productId._id,
        itemName: item.productId.name,
        sku: item.productId.sku,
        uom: item.productId.uomDetails?.salesUnit || item.productId.uom || 'PCS',
        orderedQuantity: item.quantity,
        previouslyDeliveredQuantity: previouslyDelivered,
        remainingQuantity: remaining,
        deliveryQuantity: remaining > 0 ? remaining : 0
      };
    });

    const getAddressString = (addr) => {
      if (!addr) return '';
      if (typeof addr === 'string') return addr;
      return [addr.street, addr.street2, addr.city, addr.state, addr.zip, addr.country].filter(Boolean).join(', ');
    };

    res.status(200).json({
      salesOrderId: order._id,
      customerId: customer._id,
      branchId: order.branchId,
      customerSnapshot: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        billingAddress: getAddressString(customer.address),
        shippingAddress: order.shippingAddress || getAddressString(customer.address)
      },
      items,
      deliveryAddress: order.shippingAddress || getAddressString(customer.address)
    });
  } catch (error) {
    console.error('Error generating from order:', error);
    res.status(500).json({ message: 'Error generating Delivery Note from Order', error: error.message });
  }
};

exports.createDeliveryNote = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const tenantId = req.user.tenantId;
    const { salesOrderId, customerId, items, ...rest } = req.body;

    const query = { _id: salesOrderId, tenantId };
    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      query.branchId = { $in: req.user.branches };
    } else if (!hasWildcard) {
      query.branchId = { $in: [] };
    }
    const order = await Order.findOne(query).session(session);
    if (!order) {
      throw new Error('Sales Order not found or access denied');
    }

    const customer = await Customer.findOne({ _id: customerId, tenantId }).session(session);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Enforce over-delivery protection
    const deliveredMap = await getDeliveredQuantities(tenantId, salesOrderId, session);
    const orderItems = await OrderItem.find({ orderId: salesOrderId, tenantId }).session(session);
    const orderItemMap = {};
    for (const oi of orderItems) {
      orderItemMap[oi.productId.toString()] = oi.quantity;
    }

    let hasValidDelivery = false;
    for (const item of items) {
      const ordered = orderItemMap[item.productId.toString()] || 0;
      const previouslyDelivered = deliveredMap[item.productId.toString()] || 0;
      const remaining = ordered - previouslyDelivered;

      if (item.deliveryQuantity > remaining) {
        throw new Error(`Cannot deliver ${item.deliveryQuantity} units of ${item.itemName}. Only ${remaining} units remaining.`);
      }

      if (item.deliveryQuantity > 0) hasValidDelivery = true;

      item.orderedQuantity = ordered;
      item.previouslyDeliveredQuantity = previouslyDelivered;
      item.remainingQuantity = remaining;
    }

    if (!hasValidDelivery) {
      throw new Error('No valid delivery quantities provided. All items are either zero or fully delivered.');
    }

    // Snapshot UOM details from Product Master
    if (items && items.length > 0) {
      const productIds = items.map(i => i.productId);
      const products = await Product.find({ _id: { $in: productIds }, tenantId }).session(session);
      for (const item of items) {
        const product = products.find(p => p._id.toString() === item.productId.toString());
        if (product) {
          item.uom = product.uomDetails?.salesUnit || product.uom || 'PCS';
          item.conversionFactor = product.uomDetails?.salesConversionFactor || 1;
          item.baseUom = product.uomDetails?.baseUnit || product.uom || 'PCS';
          item.baseQuantity = uomService.convertToBase(item.deliveryQuantity, item.conversionFactor);
        }
      }
    }

    const deliveryNoteNumber = await generateDNNumber(tenantId, session);

    const dn = new DeliveryNote({
      ...rest,
      tenantId,
      branchId: order.branchId,
      deliveryNoteNumber,
      salesOrderId,
      customerId,
      customerSnapshot: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        billingAddress: customer.billingAddress,
        shippingAddress: customer.shippingAddress
      },
      items,
      createdBy: req.user._id,
      status: 'DRAFT'
    });

    await dn.save({ session });
    await session.commitTransaction();
    res.status(201).json(dn);
  } catch (error) {
    await session.abortTransaction();
    console.error('Error creating delivery note:', error);
    res.status(400).json({ message: error.message || 'Error creating Delivery Note' });
  } finally {
    session.endSession();
  }
};

exports.getDeliveryNotes = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const query = { tenantId, isActive: true };
    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      query.branchId = { $in: req.user.branches };
    } else if (!hasWildcard) {
      query.branchId = { $in: [] };
    }

    const dns = await DeliveryNote.find(query)
      .populate('salesOrderId', 'orderNumber status')
      .populate('customerId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json(dns);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching Delivery Notes' });
  }
};

exports.getDeliveryNoteById = async (req, res) => {
  try {
    const dn = await DeliveryNote.findOne({ 
      _id: req.params.id, 
      tenantId: req.user.tenantId,
      isActive: true 
    })
    .populate('salesOrderId')
    .populate('customerId');

    if (!dn) return res.status(404).json({ message: 'Delivery Note not found' });
    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      if (!req.user.branches.includes(dn.branchId.toString())) {
        return res.status(403).json({ message: 'Access denied to this branch\'s Delivery Note' });
      }
    } else if (!hasWildcard) {
      return res.status(403).json({ message: 'Access denied to this branch\'s Delivery Note' });
    }

    res.status(200).json(dn);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching Delivery Note' });
  }
};

exports.updateDeliveryNote = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const dn = await DeliveryNote.findOne({ 
      _id: req.params.id, 
      tenantId: req.user.tenantId,
      isActive: true 
    }).session(session);

    if (!dn) throw new Error('Delivery Note not found');
    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      if (!req.user.branches.includes(dn.branchId.toString())) {
        throw new Error('Access denied');
      }
    } else if (!hasWildcard) {
      throw new Error('Access denied');
    }
    if (dn.status !== 'DRAFT') {
      throw new Error(`Cannot edit Delivery Note in ${dn.status} status.`);
    }

    const { items, ...rest } = req.body;

    // Must re-validate quantities if items are modified
    if (items) {
      // Get previously delivered quantities BUT exclude THIS delivery note since we're updating it
      const allDeliveryNotes = await DeliveryNote.find({
        tenantId: req.user.tenantId,
        salesOrderId: dn.salesOrderId,
        status: { $ne: 'CANCELLED' },
        isActive: true,
        _id: { $ne: dn._id } // exclude self
      }).session(session);

      const deliveredMap = {};
      for (const otherDn of allDeliveryNotes) {
        for (const item of otherDn.items) {
          if (!deliveredMap[item.productId.toString()]) {
            deliveredMap[item.productId.toString()] = 0;
          }
          deliveredMap[item.productId.toString()] += item.deliveryQuantity;
        }
      }

      const orderItems = await OrderItem.find({ orderId: dn.salesOrderId, tenantId: req.user.tenantId }).session(session);
      const orderItemMap = {};
      for (const oi of orderItems) {
        orderItemMap[oi.productId.toString()] = oi.quantity;
      }

      for (const item of items) {
        const ordered = orderItemMap[item.productId.toString()] || 0;
        const previouslyDelivered = deliveredMap[item.productId.toString()] || 0;
        const remaining = ordered - previouslyDelivered;

        if (item.deliveryQuantity > remaining) {
          throw new Error(`Cannot deliver ${item.deliveryQuantity} units of ${item.itemName}. Only ${remaining} units remaining.`);
        }

        item.orderedQuantity = ordered;
        item.previouslyDeliveredQuantity = previouslyDelivered;
        item.remainingQuantity = remaining;
      }
      
      // Snapshot UOM details from Product Master on update
      const productIds = items.map(i => i.productId);
      const products = await Product.find({ _id: { $in: productIds }, tenantId: req.user.tenantId }).session(session);
      for (const item of items) {
        const product = products.find(p => p._id.toString() === item.productId.toString());
        if (product) {
          item.uom = product.uomDetails?.salesUnit || product.uom || 'PCS';
          item.conversionFactor = product.uomDetails?.salesConversionFactor || 1;
          item.baseUom = product.uomDetails?.baseUnit || product.uom || 'PCS';
          item.baseQuantity = uomService.convertToBase(item.deliveryQuantity, item.conversionFactor);
        }
      }

      dn.items = items;
    }

    // Update allowable fields
    const updatableFields = ['deliveryDate', 'expectedDeliveryDate', 'transporterName', 'vehicleNumber', 'driverName', 'driverPhone', 'trackingNumber', 'lrNumber', 'deliveryAddress', 'deliveryInstructions', 'receivedBy', 'receiverDesignation', 'receivedAt', 'receiverPhone', 'signatureUrl', 'notes', 'internalNotes'];
    
    for (const field of updatableFields) {
      if (rest[field] !== undefined) dn[field] = rest[field];
    }
    
    dn.updatedBy = req.user._id;

    await dn.save({ session });
    await session.commitTransaction();
    res.status(200).json(dn);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message || 'Error updating Delivery Note' });
  } finally {
    session.endSession();
  }
};

exports.deleteDeliveryNote = async (req, res) => {
  try {
    const dn = await DeliveryNote.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!dn) return res.status(404).json({ message: 'Delivery Note not found' });
    if (dn.status !== 'DRAFT' && dn.status !== 'CANCELLED') {
      return res.status(400).json({ message: `Cannot delete Delivery Note in ${dn.status} status` });
    }

    dn.isActive = false;
    dn.updatedBy = req.user._id;
    await dn.save();

    res.status(200).json({ message: 'Delivery Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting Delivery Note' });
  }
};

// Status transition helpers
const updateStatus = async (req, res, currentAllowed, newStatus) => {
  try {
    const dn = await DeliveryNote.findOne({ 
      _id: req.params.id, 
      tenantId: req.user.tenantId,
      isActive: true 
    });

    if (!dn) return res.status(404).json({ message: 'Delivery Note not found' });
    if (!currentAllowed.includes(dn.status)) {
      return res.status(400).json({ message: `Invalid status transition from ${dn.status} to ${newStatus}` });
    }

    dn.status = newStatus;
    dn.updatedBy = req.user._id;
    
    if (newStatus === 'DISPATCHED') {
      dn.dispatchDate = new Date();
    }
    
    await dn.save();
    res.status(200).json(dn);
  } catch (error) {
    res.status(500).json({ message: `Error updating status to ${newStatus}` });
  }
};

exports.markReady = (req, res) => updateStatus(req, res, ['DRAFT'], 'READY');

exports.dispatchDeliveryNote = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const dn = await DeliveryNote.findOne({ 
      _id: req.params.id, 
      tenantId: req.user.tenantId,
      isActive: true 
    }).session(session);

    if (!dn) throw new Error('Delivery Note not found');
    if (dn.status !== 'READY') {
      throw new Error(`Invalid status transition from ${dn.status} to DISPATCHED`);
    }
    if (dn.stockDeducted) {
      throw new Error('Stock has already been deducted for this Delivery Note');
    }

    // Deduct stock and update OrderItem
    for (const item of dn.items) {
      if (item.deliveryQuantity <= 0) continue;

      // Fetch Product to check its type
      const product = await mongoose.model('Product').findOne({
        _id: item.productId,
        tenantId: dn.tenantId
      }).session(session);

      if (!product) {
        throw new Error(`Product not found for ID ${item.productId}`);
      }

      // 1. Deduct Stock (only if it's NOT a SERVICE)
      if (product.type !== 'SERVICE') {
        const baseDeliveryQty = uomService.convertToBase(item.deliveryQuantity, item.conversionFactor);
        
        let remainingToDeduct = baseDeliveryQty;
        const movementsToCreate = [];

        // Try COMPANY stock first
        const companyStock = await Stock.findOne({
          tenantId: dn.tenantId,
          branchId: dn.branchId,
          productId: item.productId,
          ownerType: 'COMPANY'
        }).session(session);

        if (companyStock && companyStock.quantity > 0) {
          const deductQty = Math.min(companyStock.quantity, remainingToDeduct);
          companyStock.quantity -= deductQty;
          await companyStock.save({ session });
          remainingToDeduct -= deductQty;

          movementsToCreate.push({
            tenantId: req.user.tenantId,
            branchId: dn.branchId,
            productId: item.productId,
            quantity: -deductQty,
            documentQuantity: (deductQty / baseDeliveryQty) * item.deliveryQuantity,
            documentUom: item.uom,
            baseQuantity: deductQty,
            baseUom: item.baseUom,
            type: 'DELIVERY',
            referenceId: dn.deliveryNoteNumber,
            referenceType: 'DeliveryNote',
            ownerType: 'COMPANY',
            createdBy: req.user._id
          });
        }

        // If still remaining, try SUPPLIER stock
        if (remainingToDeduct > 0) {
          const supplierStocks = await Stock.find({
            tenantId: dn.tenantId,
            branchId: dn.branchId,
            productId: item.productId,
            ownerType: 'SUPPLIER',
            quantity: { $gt: 0 }
          }).session(session);

          for (const sStock of supplierStocks) {
            if (remainingToDeduct <= 0) break;
            const deductQty = Math.min(sStock.quantity, remainingToDeduct);
            sStock.quantity -= deductQty;
            await sStock.save({ session });
            remainingToDeduct -= deductQty;

            movementsToCreate.push({
              tenantId: req.user.tenantId,
              branchId: dn.branchId,
              productId: item.productId,
              quantity: -deductQty,
              documentQuantity: (deductQty / baseDeliveryQty) * item.deliveryQuantity,
              documentUom: item.uom,
              baseQuantity: deductQty,
              baseUom: item.baseUom,
              type: 'DELIVERY',
              referenceId: dn.deliveryNoteNumber,
              referenceType: 'DeliveryNote',
              ownerType: 'SUPPLIER',
              ownerId: sStock.ownerId,
              createdBy: req.user._id
            });

            // Trigger hook for Consignment consumption safely
            try {
              const Consignment = require('../../core/models/Consignment');
              // Find active consignment for this supplier and product
              const consignment = await Consignment.findOne({
                tenantId: dn.tenantId,
                supplierId: sStock.ownerId,
                status: 'ACTIVE',
                'items.productId': item.productId
              }).session(session);
              
              if (consignment) {
                const consItem = consignment.items.find(i => i.productId.toString() === item.productId.toString());
                if (consItem) {
                  consItem.consumedQuantity += deductQty;
                  await consignment.save({ session });
                  
                  // Create consumption movement
                  await StockMovement.create([{
                    tenantId: req.user.tenantId,
                    branchId: dn.branchId,
                    productId: item.productId,
                    quantity: -deductQty,
                    type: 'CONSIGNMENT_CONSUMPTION',
                    referenceId: dn.deliveryNoteNumber,
                    referenceType: 'DeliveryNote',
                    ownerType: 'SUPPLIER',
                    ownerId: sStock.ownerId,
                    createdBy: req.user._id
                  }], { session });
                }
              }
            } catch (err) {
              console.error('Error updating consignment consumption, falling back to normal flow:', err);
              // Log the error but do NOT throw, to prevent blocking the delivery
            }
          }
        }

        if (remainingToDeduct > 0) {
          throw new Error(`Insufficient stock for ${product.name} at this branch. Needed: ${baseDeliveryQty} (Base UOM)`);
        }

        if (movementsToCreate.length > 0) {
          await StockMovement.insertMany(movementsToCreate, { session });
        }
      }

      // 2. Update OrderItem
      const orderItem = await OrderItem.findOne({
        tenantId: dn.tenantId,
        orderId: dn.salesOrderId,
        productId: item.productId
      }).session(session);

      if (orderItem) {
        orderItem.deliveredQuantity += item.deliveryQuantity;
        await orderItem.save({ session });
      }
    }

    // Check Order fulfillment status
    const orderItems = await OrderItem.find({ orderId: dn.salesOrderId, tenantId: dn.tenantId }).session(session);
    let allDelivered = true;
    let someDelivered = false;

    for (const oi of orderItems) {
      if (oi.deliveredQuantity > 0) someDelivered = true;
      if (oi.deliveredQuantity < oi.quantity) allDelivered = false;
    }

    const order = await Order.findById(dn.salesOrderId).session(session);
    if (order) {
      if (allDelivered) {
        order.deliveryStatus = 'DELIVERED';
      } else if (someDelivered) {
        order.deliveryStatus = 'PARTIAL';
      }
      await order.save({ session });
    }

    dn.status = 'DISPATCHED';
    dn.dispatchDate = new Date();
    dn.stockDeducted = true;
    dn.stockDeductedAt = new Date();
    dn.updatedBy = req.user._id;
    
    await dn.save({ session });
    await session.commitTransaction();
    res.status(200).json(dn);
  } catch (error) {
    await session.abortTransaction();
    console.error('Dispatch Error:', error);
    res.status(400).json({ message: error.message || 'Error dispatching delivery note' });
  } finally {
    session.endSession();
  }
};

exports.deliverDeliveryNote = async (req, res) => {
  try {
    // Deliver could result in PARTIALLY_DELIVERED or DELIVERED. We need a transaction to check remaining vs ordered of the Sales Order
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const dn = await DeliveryNote.findOne({ 
        _id: req.params.id, 
        tenantId: req.user.tenantId,
        isActive: true 
      }).session(session);

      if (!dn) throw new Error('Delivery Note not found');
      if (!['DISPATCHED', 'PARTIALLY_DELIVERED'].includes(dn.status)) {
        throw new Error(`Invalid status transition from ${dn.status} to DELIVERED`);
      }

      // We just mark it DELIVERED for this specific note. The Sales Order's overall fulfillment is determined by active Delivery Notes.
      // But wait! "PARTIALLY_DELIVERED" is a status of the Delivery Note itself if IT is partially delivered? 
      // User says: "For partial delivery: DISPATCHED -> PARTIALLY_DELIVERED -> DELIVERED"
      // If the driver only delivers 3 out of 5 items on THIS note, it becomes PARTIALLY_DELIVERED. 
      // But the user didn't request a payload to update delivered quantities during delivery. 
      // We will assume "DELIVERED" means this specific note's goods have been delivered.
      
      dn.status = 'DELIVERED';
      dn.updatedBy = req.user._id;
      // Note: we do NOT update Stock here because user explicitly forbade it.
      
      await dn.save({ session });
      await session.commitTransaction();
      res.status(200).json(dn);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    res.status(400).json({ message: error.message || 'Error delivering note' });
  }
};

exports.cancelDeliveryNote = (req, res) => updateStatus(req, res, ['DRAFT', 'READY'], 'CANCELLED');

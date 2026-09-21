const mongoose = require('mongoose');
const VendorReturn = require('../../core/models/VendorReturn');
const PurchaseOrder = require('../../core/models/PurchaseOrder');
const PurchaseOrderItem = require('../../core/models/PurchaseOrderItem');
const GRN = require('../../core/models/GRN');
const Stock = require('../../core/models/Stock');
const StockMovement = require('../../core/models/StockMovement');
const Counter = require('../../core/models/Counter');
const Product = require('../../core/models/Product');
const Branch = require('../../core/models/Branch');

const generateVendorReturnNumber = async (tenantId, session) => {
  const currentYear = new Date().getFullYear();
  const counterId = `VR_${currentYear}`;
  
  const counter = await Counter.findOneAndUpdate(
    { tenantId, sequenceName: counterId, year: currentYear },
    { $inc: { sequenceValue: 1 } },
    { returnDocument: 'after', upsert: true, session }
  );

  const seqStr = String(counter.sequenceValue).padStart(6, '0');
  return `VR-${currentYear}-${seqStr}`;
};

exports.getVendorReturns = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = { tenantId: req.user.tenantId, isActive: true };
    
    if (req.query.search) {
      query.$or = [
        { vendorReturnNumber: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const returns = await VendorReturn.find(query)
      .populate('supplierId', 'name')
      .populate('purchaseOrderId', 'purchaseOrderNumber')
      .populate('grnId', 'grnNumber') // legacy
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await VendorReturn.countDocuments(query);

    res.status(200).json({
      data: returns,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getVendorReturnById = async (req, res) => {
  try {
    const vr = await VendorReturn.findOne({ _id: req.params.id, tenantId: req.user.tenantId })
      .populate('supplierId', 'name email phone')
      .populate('purchaseOrderId', 'purchaseOrderNumber expectedDate currency')
      .populate('grnId', 'grnNumber')
      .populate('branchId', 'name')
      .populate('createdBy', 'name')
      .populate('validatedBy', 'name')
      .populate('items.productId', 'name sku uom')
      .populate('items.branchId', 'name');
      
    if (!vr) return res.status(404).json({ message: 'Vendor Return not found' });
    res.status(200).json(vr);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Merged endpoint that supports both PO-wide and specific GRN returnable aggregation
exports.getReturnableItems = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const purchaseOrderId = req.params.poId;
    const grnId = req.query.grnId; // Optional single GRN mode

    const po = await PurchaseOrder.findOne({ _id: purchaseOrderId, tenantId });
    if (!po) return res.status(404).json({ message: 'Purchase Order not found' });

    // 1. Get VALIDATED GRNs for this PO (optionally filtered by grnId)
    const grnQuery = { purchaseOrderId, tenantId, status: 'VALIDATED' };
    if (grnId) grnQuery._id = grnId;
    
    const grns = await GRN.find(grnQuery);
    
    // Aggregate GRN quantities by productId + purchaseOrderItemId + branchId
    const aggregatedGrns = {};
    for (const grn of grns) {
      for (const item of grn.items) {
        if (item.acceptedQuantity > 0) {
          const key = `${item.productId.toString()}_${item.purchaseOrderItemId?.toString() || 'NA'}_${grn.branchId.toString()}`;
          if (!aggregatedGrns[key]) {
            aggregatedGrns[key] = {
              productId: item.productId,
              purchaseOrderItemId: item.purchaseOrderItemId,
              branchId: grn.branchId,
              receivedQuantity: 0,
              unitCost: item.unitCost || 0,
              sourceGRNIds: [],
              itemName: item.itemName,
              sku: item.sku,
              uom: item.uom
            };
          }
          aggregatedGrns[key].receivedQuantity += item.acceptedQuantity;
          if (!aggregatedGrns[key].sourceGRNIds.includes(grn._id.toString())) {
            aggregatedGrns[key].sourceGRNIds.push(grn._id.toString());
          }
        }
      }
    }

    // 2. Get all VALIDATED Vendor Returns for this PO (if grnId filter, only check returns linked to that GRN, but to be safe calculate globally per PO to avoid over-return)
    const prs = await VendorReturn.find({ purchaseOrderId, tenantId, status: 'VALIDATED' });
    
    const aggregatedReturns = {};
    for (const pr of prs) {
      for (const item of pr.items) {
        // If we are filtering by grnId, only consider returns that specifically originated from this GRN
        if (grnId) {
          // New model uses sourceGRNIds array, legacy uses grnId on header
          const hasSourceGrn = (item.sourceGRNIds && item.sourceGRNIds.includes(grnId)) || pr.grnId?.toString() === grnId;
          if (!hasSourceGrn) continue;
        }

        const bId = item.branchId ? item.branchId.toString() : pr.branchId?.toString();
        if (!bId) continue;
        
        const key = `${(item.productId._id || item.productId).toString()}_${item.purchaseOrderItemId?.toString() || 'NA'}_${bId}`;
        if (!aggregatedReturns[key]) aggregatedReturns[key] = 0;
        aggregatedReturns[key] += item.returnQuantity;
      }
    }

    // 3. Calculate Returnable Quantities
    const returnableItems = [];
    const productIds = [];
    const branchIds = [];

    for (const key in aggregatedGrns) {
      const received = aggregatedGrns[key].receivedQuantity;
      const returned = aggregatedReturns[key] || 0;
      const returnable = received - returned;

      if (returnable > 0) {
        const itemData = aggregatedGrns[key];
        productIds.push(itemData.productId);
        branchIds.push(itemData.branchId);
        
        returnableItems.push({
          productId: itemData.productId,
          purchaseOrderItemId: itemData.purchaseOrderItemId,
          branchId: itemData.branchId,
          receivedQuantity: received,
          alreadyReturnedQuantity: returned,
          returnableQuantity: returnable,
          unitCost: itemData.unitCost,
          sourceGRNIds: itemData.sourceGRNIds,
          itemName: itemData.itemName,
          sku: itemData.sku,
          uom: itemData.uom
        });
      }
    }

    // 4. Populate Product and Branch details
    const products = await Product.find({ _id: { $in: productIds } });
    const branches = await Branch.find({ _id: { $in: branchIds } });

    const populatedReturnableItems = returnableItems.map(item => {
      const product = products.find(p => p._id.toString() === item.productId.toString());
      const branch = branches.find(b => b._id.toString() === item.branchId.toString());
      return {
        ...item,
        product: product ? { _id: product._id, name: product.name, sku: product.sku, uom: product.uom } : null,
        branch: branch ? { _id: branch._id, name: branch.name } : null
      };
    });

    res.status(200).json(populatedReturnableItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSupplierReturnableItems = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { supplierId } = req.params;
    const { fromDate, toDate, branchId, productId, search, page = 1, limit = 10 } = req.query;

    const grnMatch = { 
      tenantId: new mongoose.Types.ObjectId(tenantId), 
      supplierId: new mongoose.Types.ObjectId(supplierId), 
      status: 'VALIDATED' 
    };

    if (branchId) grnMatch.branchId = new mongoose.Types.ObjectId(branchId);
    
    if (fromDate || toDate) {
      grnMatch.createdAt = {};
      if (fromDate) grnMatch.createdAt.$gte = new Date(fromDate);
      if (toDate) grnMatch.createdAt.$lte = new Date(toDate);
    }

    // 1. Aggregate GRNs
    const pipeline = [
      { $match: grnMatch },
      { $unwind: "$items" },
      { $match: { "items.acceptedQuantity": { $gt: 0 } } }
    ];

    if (productId) {
      pipeline.push({ $match: { "items.productId": new mongoose.Types.ObjectId(productId) } });
    }

    pipeline.push({
      $group: {
        _id: {
          productId: "$items.productId",
          purchaseOrderItemId: "$items.purchaseOrderItemId",
          purchaseOrderId: "$purchaseOrderId",
          branchId: "$branchId"
        },
        receivedQuantity: { $sum: "$items.acceptedQuantity" },
        unitCost: { $first: "$items.unitCost" },
        itemName: { $first: "$items.itemName" },
        sku: { $first: "$items.sku" },
        uom: { $first: "$items.uom" },
        sourceGRNIds: { $addToSet: "$_id" }
      }
    });

    const aggregatedGrns = await GRN.aggregate(pipeline);

    // 2. Fetch Previous Returns
    const vrQuery = { tenantId, supplierId, status: 'VALIDATED' };
    const previousVrs = await VendorReturn.find(vrQuery);
    
    const aggregatedReturns = {};
    for (const pr of previousVrs) {
      for (const item of pr.items) {
        const bId = item.branchId ? item.branchId.toString() : pr.branchId?.toString();
        if (!bId) continue;
        const poId = item.purchaseOrderId ? item.purchaseOrderId.toString() : pr.purchaseOrderId?.toString();
        
        const key = `${(item.productId._id || item.productId).toString()}_${item.purchaseOrderItemId?.toString() || 'NA'}_${bId}_${poId || 'NA'}`;
        if (!aggregatedReturns[key]) aggregatedReturns[key] = 0;
        aggregatedReturns[key] += item.returnQuantity;
      }
    }

    // 3. Calculate Returnable Quantities
    let returnableItems = [];
    const productIds = new Set();
    const branchIds = new Set();
    const poIds = new Set();

    for (const grnAgg of aggregatedGrns) {
      const pId = grnAgg._id.productId.toString();
      const poItemId = grnAgg._id.purchaseOrderItemId?.toString() || 'NA';
      const bId = grnAgg._id.branchId.toString();
      const poId = grnAgg._id.purchaseOrderId?.toString() || 'NA';
      
      const key = `${pId}_${poItemId}_${bId}_${poId}`;
      const received = grnAgg.receivedQuantity;
      const returned = aggregatedReturns[key] || 0;
      const returnable = received - returned;

      if (returnable > 0) {
        // Physical Stock lookup
        productIds.add(pId);
        branchIds.add(bId);
        if (poId !== 'NA') poIds.add(poId);
        
        returnableItems.push({
          productId: pId,
          purchaseOrderId: poId !== 'NA' ? poId : null,
          purchaseOrderItemId: poItemId !== 'NA' ? poItemId : null,
          branchId: bId,
          receivedQuantity: received,
          alreadyReturnedQuantity: returned,
          logicalReturnableQuantity: returnable, // before stock constraint
          unitCost: grnAgg.unitCost,
          sourceGRNIds: grnAgg.sourceGRNIds,
          itemName: grnAgg.itemName,
          sku: grnAgg.sku,
          uom: grnAgg.uom
        });
      }
    }

    // Lookup physical stock for all identified product-branch pairs
    const stocks = await Stock.find({
      tenantId,
      productId: { $in: Array.from(productIds) },
      branchId: { $in: Array.from(branchIds) }
    });

    const stockMap = {};
    for (const st of stocks) {
      stockMap[`${st.productId.toString()}_${st.branchId.toString()}`] = st.quantity;
    }

    // Apply physical stock clamp
    // Since the same product+branch might exist across multiple POs, we need to track remaining stock allocation
    // We will allocate stock based on PO order (oldest first or arbitrary, doesn't matter as long as total sum <= stock)
    // To be perfectly safe, we'll just track allocated stock.
    const allocatedStock = {};
    
    returnableItems = returnableItems.map(item => {
      const stockKey = `${item.productId}_${item.branchId}`;
      const availablePhysical = stockMap[stockKey] || 0;
      const alreadyAllocated = allocatedStock[stockKey] || 0;
      const remainingPhysical = Math.max(0, availablePhysical - alreadyAllocated);
      
      const actualReturnable = Math.min(item.logicalReturnableQuantity, remainingPhysical);
      
      if (actualReturnable > 0) {
        allocatedStock[stockKey] = alreadyAllocated + actualReturnable;
      }
      
      return {
        ...item,
        returnableQuantity: actualReturnable
      };
    }).filter(item => item.returnableQuantity > 0);

    // Search filter if provided
    if (search) {
      const lowerSearch = search.toLowerCase();
      returnableItems = returnableItems.filter(item => 
        item.itemName?.toLowerCase().includes(lowerSearch) || 
        item.sku?.toLowerCase().includes(lowerSearch)
      );
    }

    // 4. Calculate Summary
    const summary = {
      supplierId,
      purchaseOrderCount: new Set(returnableItems.map(i => i.purchaseOrderId)).size,
      grnCount: new Set(returnableItems.flatMap(i => i.sourceGRNIds.map(id => id.toString()))).size,
      productCount: new Set(returnableItems.map(i => i.productId)).size,
      totalReceivedQuantity: returnableItems.reduce((acc, curr) => acc + curr.receivedQuantity, 0),
      totalAlreadyReturnedQuantity: returnableItems.reduce((acc, curr) => acc + curr.alreadyReturnedQuantity, 0),
      totalReturnableQuantity: returnableItems.reduce((acc, curr) => acc + curr.returnableQuantity, 0)
    };

    // 5. Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const paginatedItems = returnableItems.slice(skip, skip + limitNum);

    // 6. Populate for paginated items
    const products = await Product.find({ _id: { $in: Array.from(productIds) } });
    const branches = await Branch.find({ _id: { $in: Array.from(branchIds) } });
    const pos = await PurchaseOrder.find({ _id: { $in: Array.from(poIds) } });
    
    // We also need GRN numbers
    const allSourceGrnIds = [...new Set(paginatedItems.flatMap(i => i.sourceGRNIds))];
    const grnDocs = await GRN.find({ _id: { $in: allSourceGrnIds } });

    const fullyPopulated = paginatedItems.map(item => {
      const product = products.find(p => p._id.toString() === item.productId);
      const branch = branches.find(b => b._id.toString() === item.branchId);
      const po = pos.find(p => p._id.toString() === item.purchaseOrderId);
      
      const itemGrns = grnDocs.filter(g => item.sourceGRNIds.map(id => id.toString()).includes(g._id.toString()));

      return {
        ...item,
        product: product ? { _id: product._id, name: product.name, sku: product.sku, uom: product.uom } : null,
        branch: branch ? { _id: branch._id, name: branch.name } : null,
        purchaseOrder: po ? { _id: po._id, purchaseOrderNumber: po.purchaseOrderNumber } : null,
        sourceGRNs: itemGrns.map(g => ({ _id: g._id, grnNumber: g.grnNumber }))
      };
    });

    res.status(200).json({
      items: fullyPopulated,
      pagination: {
        total: returnableItems.length,
        page: pageNum,
        totalPages: Math.ceil(returnableItems.length / limitNum),
        limit: limitNum
      },
      summary
    });
  } catch (error) {
    console.error('Error in getSupplierReturnableItems:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.createReturnAllVendorReturn = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const tenantId = req.user.tenantId;
    const { supplierId } = req.params;
    const { fromDate, toDate, branchId } = req.body;

    // We reuse the logic from getSupplierReturnableItems, but within a transaction
    // and without pagination, directly generating a Draft return.
    
    const grnMatch = { 
      tenantId: new mongoose.Types.ObjectId(tenantId), 
      supplierId: new mongoose.Types.ObjectId(supplierId), 
      status: 'VALIDATED' 
    };

    if (branchId) grnMatch.branchId = new mongoose.Types.ObjectId(branchId);
    
    if (fromDate || toDate) {
      grnMatch.createdAt = {};
      if (fromDate) grnMatch.createdAt.$gte = new Date(fromDate);
      if (toDate) grnMatch.createdAt.$lte = new Date(toDate);
    }

    const pipeline = [
      { $match: grnMatch },
      { $unwind: "$items" },
      { $match: { "items.acceptedQuantity": { $gt: 0 } } },
      {
        $group: {
          _id: {
            productId: "$items.productId",
            purchaseOrderItemId: "$items.purchaseOrderItemId",
            purchaseOrderId: "$purchaseOrderId",
            branchId: "$branchId"
          },
          receivedQuantity: { $sum: "$items.acceptedQuantity" },
          unitCost: { $first: "$items.unitCost" },
          itemName: { $first: "$items.itemName" },
          sku: { $first: "$items.sku" },
          uom: { $first: "$items.uom" },
          sourceGRNIds: { $addToSet: "$_id" }
        }
      }
    ];

    const aggregatedGrns = await GRN.aggregate(pipeline).session(session);

    const vrQuery = { tenantId, supplierId, status: 'VALIDATED' };
    const previousVrs = await VendorReturn.find(vrQuery).session(session);
    
    const aggregatedReturns = {};
    for (const pr of previousVrs) {
      for (const item of pr.items) {
        const bId = item.branchId ? item.branchId.toString() : pr.branchId?.toString();
        if (!bId) continue;
        const poId = item.purchaseOrderId ? item.purchaseOrderId.toString() : pr.purchaseOrderId?.toString();
        
        const key = `${(item.productId._id || item.productId).toString()}_${item.purchaseOrderItemId?.toString() || 'NA'}_${bId}_${poId || 'NA'}`;
        if (!aggregatedReturns[key]) aggregatedReturns[key] = 0;
        aggregatedReturns[key] += item.returnQuantity;
      }
    }

    const productIds = new Set();
    const branchIds = new Set();
    
    let logicalItems = [];

    for (const grnAgg of aggregatedGrns) {
      const pId = grnAgg._id.productId.toString();
      const poItemId = grnAgg._id.purchaseOrderItemId?.toString() || 'NA';
      const bId = grnAgg._id.branchId.toString();
      const poId = grnAgg._id.purchaseOrderId?.toString() || 'NA';
      
      const key = `${pId}_${poItemId}_${bId}_${poId}`;
      const received = grnAgg.receivedQuantity;
      const returned = aggregatedReturns[key] || 0;
      const returnable = received - returned;

      if (returnable > 0) {
        productIds.add(pId);
        branchIds.add(bId);
        
        logicalItems.push({
          productId: pId,
          purchaseOrderId: poId !== 'NA' ? poId : null,
          purchaseOrderItemId: poItemId !== 'NA' ? poItemId : null,
          branchId: bId,
          logicalReturnableQuantity: returnable,
          unitCost: grnAgg.unitCost || 0,
          sourceGRNIds: grnAgg.sourceGRNIds,
          itemName: grnAgg.itemName,
          sku: grnAgg.sku,
          uom: grnAgg.uom
        });
      }
    }

    const stocks = await Stock.find({
      tenantId,
      productId: { $in: Array.from(productIds) },
      branchId: { $in: Array.from(branchIds) }
    }).session(session);

    const stockMap = {};
    for (const st of stocks) {
      stockMap[`${st.productId.toString()}_${st.branchId.toString()}`] = st.quantity;
    }

    const allocatedStock = {};
    const finalReturnItems = [];
    let totalReturnAmount = 0;

    for (const item of logicalItems) {
      const stockKey = `${item.productId}_${item.branchId}`;
      const availablePhysical = stockMap[stockKey] || 0;
      const alreadyAllocated = allocatedStock[stockKey] || 0;
      const remainingPhysical = Math.max(0, availablePhysical - alreadyAllocated);
      
      const actualReturnable = Math.min(item.logicalReturnableQuantity, remainingPhysical);
      
      if (actualReturnable > 0) {
        allocatedStock[stockKey] = alreadyAllocated + actualReturnable;
        
        const returnAmount = Number(actualReturnable) * Number(item.unitCost);
        totalReturnAmount += returnAmount;

        finalReturnItems.push({
          productId: item.productId,
          purchaseOrderId: item.purchaseOrderId,
          purchaseOrderItemId: item.purchaseOrderItemId,
          branchId: item.branchId,
          itemName: item.itemName || 'Unknown',
          sku: item.sku || 'Unknown',
          uom: item.uom || 'PCS',
          returnQuantity: actualReturnable,
          unitCost: item.unitCost,
          sourceGRNIds: item.sourceGRNIds,
          returnAmount: returnAmount,
          reason: 'Return All Remaining Stock'
        });
      }
    }

    if (finalReturnItems.length === 0) {
      throw new Error('No physical returnable stock found for this supplier based on existing GRNs and available stock.');
    }

    const vendorReturnNumber = await generateVendorReturnNumber(tenantId, session);

    const vr = await VendorReturn.create([{ 
      tenantId,
      vendorReturnNumber,
      returnType: 'SUPPLIER_CONSOLIDATED',
      supplierId: supplierId,
      notes: req.body.notes || 'Auto-generated Return All Remaining',
      totalReturnAmount,
      items: finalReturnItems,
      createdBy: req.user._id,
      status: 'DRAFT'
    }], { session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: 'All remaining supplier stock added to draft return',
      vendorReturnId: vr[0]._id,
      summary: {
        purchaseOrders: new Set(finalReturnItems.map(i => i.purchaseOrderId)).size,
        grns: new Set(finalReturnItems.flatMap(i => i.sourceGRNIds)).size,
        products: new Set(finalReturnItems.map(i => i.productId)).size,
        totalReturnQuantity: finalReturnItems.reduce((acc, curr) => acc + curr.returnQuantity, 0),
        totalLines: finalReturnItems.length
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error in createReturnAllVendorReturn:', error);
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

exports.createVendorReturn = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const tenantId = req.user.tenantId;
    const body = { ...req.body };
    
    const po = await PurchaseOrder.findOne({ _id: body.purchaseOrderId, tenantId }).session(session);
    if (!po && body.returnType !== 'SUPPLIER_CONSOLIDATED') {
      throw new Error('Purchase Order not found');
    }

    if (!body.vendorReturnNumber) {
      body.vendorReturnNumber = await generateVendorReturnNumber(tenantId, session);
    }
    
    let totalReturnAmount = 0;
    if (body.items) {
      for (const item of body.items) {
        // Fallback for UI that doesn't send these optional fields yet
        if (!item.unitCost) item.unitCost = 0;
        item.returnAmount = Number(item.returnQuantity) * Number(item.unitCost);
        totalReturnAmount += item.returnAmount;
      }
    }
    body.totalReturnAmount = totalReturnAmount;

    const vr = await VendorReturn.create([{ 
      ...body, 
      tenantId,
      supplierId: body.supplierId || (po ? po.supplierId : null),
      createdBy: req.user._id,
      status: 'DRAFT'
    }], { session });

    await session.commitTransaction();
    res.status(201).json(vr[0]);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

exports.updateVendorReturn = async (req, res) => {
  try {
    const vr = await VendorReturn.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!vr) return res.status(404).json({ message: 'Vendor Return not found' });

    if (vr.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only DRAFT returns can be updated' });
    }

    let totalReturnAmount = 0;
    if (req.body.items) {
      for (const item of req.body.items) {
        if (!item.unitCost) item.unitCost = 0;
        item.returnAmount = Number(item.returnQuantity) * Number(item.unitCost);
        totalReturnAmount += item.returnAmount;
      }
      req.body.totalReturnAmount = totalReturnAmount;
    }

    const updatedVr = await VendorReturn.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { ...req.body, updatedBy: req.user._id },
      { returnDocument: 'after' }
    );
    res.status(200).json(updatedVr);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteVendorReturn = async (req, res) => {
  try {
    const vr = await VendorReturn.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!vr) return res.status(404).json({ message: 'Vendor Return not found' });

    if (vr.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only DRAFT Vendor Returns can be deleted.' });
    }

    await VendorReturn.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Vendor Return deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.confirmVendorReturn = async (req, res) => {
  try {
    const vr = await VendorReturn.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!vr) return res.status(404).json({ message: 'Vendor Return not found' });

    if (vr.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only DRAFT returns can be confirmed' });
    }

    vr.status = 'CONFIRMED';
    vr.updatedBy = req.user._id;
    await vr.save();
    
    res.status(200).json(vr);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.validateVendorReturn = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const tenantId = req.user.tenantId;
    const vr = await VendorReturn.findOne({ _id: req.params.id, tenantId }).session(session);
    if (!vr) throw new Error('Vendor Return not found');

    if (vr.status === 'VALIDATED') {
      throw new Error('Vendor Return is already validated');
    }
    
    if (vr.status !== 'CONFIRMED' && vr.status !== 'DRAFT') {
      throw new Error(`Cannot validate Vendor Return in ${vr.status} status`);
    }

    const grnQuery = { tenantId, status: 'VALIDATED' };
    if (vr.returnType === 'SUPPLIER_CONSOLIDATED') {
      grnQuery.supplierId = vr.supplierId;
    } else {
      grnQuery.purchaseOrderId = vr.purchaseOrderId;
      if (vr.grnId) grnQuery._id = vr.grnId; // Legacy single-mode
    }

    const grns = await GRN.find(grnQuery).session(session);
    const aggregatedGrns = {};
    for (const grn of grns) {
      for (const item of grn.items) {
        if (item.acceptedQuantity > 0) {
          const poId = vr.returnType === 'SUPPLIER_CONSOLIDATED' ? grn.purchaseOrderId?.toString() : vr.purchaseOrderId?.toString();
          const key = `${item.productId.toString()}_${item.purchaseOrderItemId?.toString() || 'NA'}_${grn.branchId.toString()}_${poId || 'NA'}`;
          if (!aggregatedGrns[key]) aggregatedGrns[key] = 0;
          aggregatedGrns[key] += item.acceptedQuantity;
        }
      }
    }

    const vrQuery = { tenantId, status: 'VALIDATED' };
    if (vr.returnType === 'SUPPLIER_CONSOLIDATED') {
      vrQuery.supplierId = vr.supplierId;
    } else {
      vrQuery.purchaseOrderId = vr.purchaseOrderId;
    }
    
    const previousVrs = await VendorReturn.find(vrQuery).session(session);
    const aggregatedReturns = {};
    for (const prevVr of previousVrs) {
      for (const item of prevVr.items) {
        const bId = item.branchId ? item.branchId.toString() : prevVr.branchId?.toString();
        if (!bId) continue;

        if (vr.returnType !== 'SUPPLIER_CONSOLIDATED' && vr.grnId) {
          // If validating a specific GRN return, only subtract previous returns for THAT GRN
          const hasSourceGrn = (item.sourceGRNIds && item.sourceGRNIds.includes(vr.grnId)) || prevVr.grnId?.toString() === vr.grnId.toString();
          if (!hasSourceGrn) continue;
        }

        const poId = vr.returnType === 'SUPPLIER_CONSOLIDATED' ? (item.purchaseOrderId?.toString() || prevVr.purchaseOrderId?.toString()) : vr.purchaseOrderId?.toString();
        const key = `${(item.productId._id || item.productId).toString()}_${item.purchaseOrderItemId?.toString() || 'NA'}_${bId}_${poId || 'NA'}`;
        if (!aggregatedReturns[key]) aggregatedReturns[key] = 0;
        aggregatedReturns[key] += item.returnQuantity;
      }
    }

    // 2. Validate items
    for (const item of vr.items) {
      if (item.returnQuantity <= 0) {
        throw new Error(`Return quantity must be greater than 0 for product ${item.productId}`);
      }

      // Legacy fallback
      const effectiveBranchId = item.branchId || vr.branchId;
      if (!effectiveBranchId) throw new Error(`Branch ID missing for item ${item.productId}`);

      const poId = vr.returnType === 'SUPPLIER_CONSOLIDATED' ? item.purchaseOrderId?.toString() : vr.purchaseOrderId?.toString();
      const key = `${(item.productId._id || item.productId).toString()}_${item.purchaseOrderItemId?.toString() || 'NA'}_${effectiveBranchId.toString()}_${poId || 'NA'}`;
      const received = aggregatedGrns[key] || 0;
      const returned = aggregatedReturns[key] || 0;
      const returnable = received - returned;

      if (item.returnQuantity > returnable) {
        throw new Error(`Return quantity (${item.returnQuantity}) exceeds returnable quantity (${returnable}) for product ${item.productId} at branch ${effectiveBranchId}`);
      }

      // 3. Decrement Stock
      const stock = await Stock.findOne({
        tenantId,
        branchId: effectiveBranchId,
        productId: item.productId._id || item.productId
      }).session(session);

      if (!stock || stock.quantity < item.returnQuantity) {
        throw new Error(`Insufficient stock for product ${item.productId} at branch ${effectiveBranchId}. Available: ${stock ? stock.quantity : 0}, Required: ${item.returnQuantity}`);
      }

      stock.quantity -= item.returnQuantity;
      await stock.save({ session });

      // 4. Create StockMovement
      await StockMovement.create([{
        tenantId,
        branchId: effectiveBranchId,
        productId: item.productId._id || item.productId,
        quantity: -item.returnQuantity,
        documentQuantity: item.returnQuantity,
        type: 'VENDOR_RETURN', // Use VENDOR_RETURN as it's the existing enum
        referenceId: vr.vendorReturnNumber,
        referenceType: 'VendorReturn',
        createdBy: req.user._id
      }], { session });
    }

    // Mark as validated
    vr.status = 'VALIDATED';
    vr.validatedBy = req.user._id;
    vr.validatedAt = new Date();
    await vr.save({ session });

    await session.commitTransaction();
    res.status(200).json(vr);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

exports.cancelVendorReturn = async (req, res) => {
  try {
    const vr = await VendorReturn.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!vr) return res.status(404).json({ message: 'Vendor Return not found' });

    if (vr.status === 'VALIDATED') {
      return res.status(400).json({ message: 'Cannot cancel a VALIDATED Vendor Return.' });
    }

    vr.status = 'CANCELLED';
    vr.updatedBy = req.user._id;
    await vr.save();
    
    res.status(200).json({ message: 'Vendor Return successfully cancelled', vr });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

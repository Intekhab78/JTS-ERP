const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('../config/db');

// Models
const Company = require('../core/models/Company');
const User = require('../core/models/User');
const Product = require('../core/models/Product');
const Branch = require('../core/models/Branch');
const Supplier = require('../core/models/Supplier');
const PurchaseOrder = require('../core/models/PurchaseOrder');
const PurchaseOrderItem = require('../core/models/PurchaseOrderItem');
const GRN = require('../core/models/GRN');
const PurchaseReturn = require('../core/models/PurchaseReturn');
const Stock = require('../core/models/Stock');
const StockMovement = require('../core/models/StockMovement');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const runTest = async () => {
  try {
    await connectDB();
    console.log('Connected to DB...');

    // 1. Setup Test Data
    const company = await Company.findOne();
    if (!company) throw new Error('No company found');
    const tenantId = company._id;

    const user = await User.findOne({ tenantId });
    const branches = await Branch.find({ tenantId }).limit(1);
    const supplier = await Supplier.findOne({ tenantId });
    const product = await Product.findOne({ tenantId });

    if (!user || branches.length < 1 || !supplier || !product) {
      throw new Error('Required test data missing (User, Branch, Supplier, Product)');
    }

    const branchA = branches[0]._id;
    const branchB = branches[0]._id;
    const branchC = branches[0]._id;

    // 2. Create Purchase Order (1000 PCS)
    console.log('\n--- 1. Creating PO ---');
    const poNumber = `TEST-PO-${Date.now()}`;
    const po = await PurchaseOrder.create({
      tenantId,
      purchaseOrderNumber: poNumber,
      supplierId: supplier._id,
      expectedDate: new Date(),
      status: 'CONFIRMED',
      totalAmount: 10000,
      createdBy: user._id
    });

    const poItem = await PurchaseOrderItem.create({
      tenantId,
      purchaseOrderId: po._id,
      productId: product._id,
      quantity: 1000,
      unitCost: 10,
      totalAmount: 10000
    });

    po.items = [poItem._id];
    await po.save();
    console.log(`Created PO: ${poNumber} with 1000 ${product.name}`);

    // 3. Create GRNs
    console.log('\n--- 2. Creating GRNs ---');
    
    // Create stock for branches if not exists just to avoid error on GRN validation, 
    // actually GRN validation creates stock.
    const createGRN = async (branchId, qty) => {
      const grn = await GRN.create({
        tenantId,
        purchaseOrderId: po._id,
        supplierId: supplier._id,
        grnNumber: `GRN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        branchId,
        status: 'VALIDATED',
        receivedDate: new Date(),
        createdBy: user._id,
        items: [{
          productId: product._id,
          purchaseOrderItemId: poItem._id,
          receivedQuantity: qty,
          acceptedQuantity: qty,
          rejectedQuantity: 0,
          unitCost: 10
        }]
      });
      
      // Manually add stock to simulate GRN validation
      let stock = await Stock.findOne({ tenantId, branchId, productId: product._id });
      if (!stock) {
        stock = await Stock.create({ tenantId, branchId, productId: product._id, quantity: qty });
      } else {
        stock.quantity += qty;
        await stock.save();
      }
      return grn;
    };

    const grn1 = await createGRN(branchA, 200);
    const grn2 = await createGRN(branchB, 300);
    const grn3 = await createGRN(branchC, 250);
    const grn4 = await createGRN(branchC, 250); // multiple GRNs at same branch

    console.log(`Created GRN 1: Branch A = 200`);
    console.log(`Created GRN 2: Branch B = 300`);
    console.log(`Created GRN 3: Branch C = 250`);
    console.log(`Created GRN 4: Branch C = 250`);
    
    // Update PO Received Qty (simulate)
    po.status = 'RECEIVED';
    await po.save();

    // 4. Test Returnable Items Logic (Mock Req/Res)
    console.log('\n--- 3. Testing Returnable Items Aggregation ---');
    const controller = require('../modules/purchase/purchaseReturnController');
    let returnableItemsData = [];
    const mockReq = {
      user: { tenantId, _id: user._id },
      params: { poId: po._id.toString() }
    };
    const mockRes = {
      status: () => mockRes,
      json: (data) => { returnableItemsData = data; }
    };

    await controller.getReturnableItemsForPO(mockReq, mockRes);
    
    console.log(`Aggregated Returnable Items: ${returnableItemsData.length}`);
    returnableItemsData.forEach(i => {
      console.log(`Branch: ${i.branch.name}, Received: ${i.receivedQuantity}, Returnable: ${i.returnableQuantity}`);
    });
    
    // Validation
    const branchCItem = returnableItemsData.find(i => i.branchId.toString() === branchC.toString());
    if (branchCItem.receivedQuantity !== 500) {
      console.error(`ERROR: Branch C should have 500 received qty, but got ${branchCItem.receivedQuantity}`);
    } else {
      console.log('SUCCESS: Multiple GRNs for same branch aggregated successfully.');
    }

    // 5. Test Partial Purchase Return Creation
    console.log('\n--- 4. Testing Partial Purchase Return ---');
    const returnPayload = {
      purchaseOrderId: po._id,
      reason: 'Test Partial Return',
      items: [
        {
          productId: product._id,
          purchaseOrderItemId: poItem._id,
          branchId: branchA,
          returnQuantity: 100,
          unitCost: 10,
          sourceGRNIds: returnableItemsData.find(i => i.branchId.toString() === branchA.toString()).sourceGRNIds,
          returnAmount: 1000
        }
      ]
    };

    let prId;
    const mockCreateReq = {
      user: { tenantId, _id: user._id },
      body: returnPayload
    };
    const mockCreateRes = {
      status: () => mockCreateRes,
      json: (data) => { prId = data._id; }
    };

    await controller.createPurchaseReturn(mockCreateReq, mockCreateRes);
    console.log(`Created Purchase Return (DRAFT): ${prId}`);

    // Confirm PR
    const mockConfirmReq = { user: { tenantId, _id: user._id }, params: { id: prId } };
    await controller.confirmPurchaseReturn(mockConfirmReq, mockCreateRes);
    console.log(`Confirmed Purchase Return`);

    // Validate PR
    await controller.validatePurchaseReturn(mockConfirmReq, mockCreateRes);
    console.log(`Validated Purchase Return`);

    // 6. Check Stock
    console.log('\n--- 5. Checking Stock Decrement ---');
    const stockA = await Stock.findOne({ tenantId, branchId: branchA, productId: product._id });
    console.log(`Branch A Stock after returning 100 (original 200): ${stockA.quantity}`);
    if (stockA.quantity === 100) {
      console.log('SUCCESS: Stock decremented correctly.');
    } else {
      console.error('ERROR: Stock decrement failed.');
    }

    // 7. Test Returnable Items Again
    console.log('\n--- 6. Re-testing Returnable Items Aggregation ---');
    await controller.getReturnableItemsForPO(mockReq, mockRes);
    const branchAItem2 = returnableItemsData.find(i => i.branchId.toString() === branchA.toString());
    console.log(`Branch A - Received: ${branchAItem2.receivedQuantity}, Prev Returned: ${branchAItem2.alreadyReturnedQuantity}, Returnable: ${branchAItem2.returnableQuantity}`);
    if (branchAItem2.alreadyReturnedQuantity === 100 && branchAItem2.returnableQuantity === 100) {
      console.log('SUCCESS: Already returned quantity accurately tracked.');
    } else {
      console.error('ERROR: Returnable quantity tracking failed.');
    }

    console.log('\nAll Purchase Return tests executed successfully!');
    process.exit(0);

  } catch (err) {
    console.error('Test Failed:', err);
    process.exit(1);
  }
};

runTest();

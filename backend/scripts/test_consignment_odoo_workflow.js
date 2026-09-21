const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const Company = require('../src/core/models/Company');
const User = require('../src/core/models/User');
const Supplier = require('../src/core/models/Supplier');
const Product = require('../src/core/models/Product');
const Branch = require('../src/core/models/Branch');
const Consignment = require('../src/core/models/Consignment');
const ConsignmentReceipt = require('../src/core/models/ConsignmentReceipt');
const ConsignmentStock = require('../src/core/models/ConsignmentStock');
const ConsignmentReturn = require('../src/core/models/ConsignmentReturn');
const ConsignmentSettlement = require('../src/core/models/ConsignmentSettlement');
const Stock = require('../src/core/models/Stock');

// Mock req, res
const mockReq = (user, body = {}, params = {}, query = {}) => ({
  user,
  body,
  params,
  query
});

const mockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.data = data;
    return res;
  };
  return res;
};

const consignmentController = require('../src/modules/purchase/consignmentController');
const receiptController = require('../src/modules/purchase/consignmentReceiptController');
const returnController = require('../src/modules/purchase/consignmentReturnController');
const settlementController = require('../src/modules/purchase/consignmentSettlementController');

const runTests = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // 1. Setup Test Data
    const tenant = await Company.findOne();
    if (!tenant) throw new Error('No tenant found. Run seed script first.');

    const admin = await User.findOne({ tenantId: tenant._id });
    if (!admin) throw new Error('No admin found.');

    const branchA = await Branch.findOne({ tenantId: tenant._id });
    if (!branchA) throw new Error('No branch found.');

    const supplier = await Supplier.findOne({ tenantId: tenant._id });
    if (!supplier) throw new Error('No supplier found.');

    let product = await Product.findOne({ tenantId: tenant._id });
    if (!product) {
      product = await Product.create({
        tenantId: tenant._id,
        name: 'Test Consignment Product',
        sku: 'TEST-CNS-001',
        type: 'STOCK',
        baseUom: 'PCS',
        purchaseUom: 'PCS',
        salesUom: 'PCS',
        canBeSold: true,
        canBePurchased: true,
        cost: 10,
        price: 20
      });
    }

    console.log('--- STARTING ODOO WORKFLOW TESTS ---');

    // Test 1: Create Consignment
    const createReq = mockReq(admin, {
      supplierId: supplier._id,
      startDate: new Date(),
      defaultBranchId: branchA._id,
      notes: 'Test Consignment',
      items: [{
        productId: product._id,
        agreedQuantity: 1000,
        unitPrice: 10
      }]
    });
    const createRes = mockRes();
    await consignmentController.createConsignment(createReq, createRes);
    if (!createRes.data.success) throw new Error('Failed to create consignment: ' + JSON.stringify(createRes.data));
    const consignmentId = createRes.data.data._id;
    console.log('1. Created Consignment:', createRes.data.data.consignmentNumber);

    // Test 2: Confirm/Activate
    const confirmReq = mockReq(admin, {}, { id: consignmentId });
    const confirmRes = mockRes();
    await consignmentController.confirmConsignment(confirmReq, confirmRes);
    
    const activateReq = mockReq(admin, {}, { id: consignmentId });
    const activateRes = mockRes();
    await consignmentController.activateConsignment(activateReq, activateRes);
    console.log('2. Confirmed & Activated Consignment');

    // Test 3 & 4: Create & Validate Receipt
    const rcptReq = mockReq(admin, {
      consignmentId,
      supplierId: supplier._id,
      branchId: branchA._id,
      items: [{
        productId: product._id,
        orderedQuantity: 500,
        receivedQuantity: 500,
        acceptedQuantity: 500,
        uom: 'PCS',
        baseQuantity: 500,
        baseUom: 'PCS'
      }]
    });
    const rcptRes = mockRes();
    await receiptController.createReceipt(rcptReq, rcptRes);
    const receiptId = rcptRes.data.data._id;

    // Confirm then Validate
    await receiptController.confirmReceipt(mockReq(admin, {}, { id: receiptId }), mockRes());
    const valRcptRes = mockRes();
    await receiptController.validateReceipt(mockReq(admin, {}, { id: receiptId }), valRcptRes);
    if (!valRcptRes.data.success) throw new Error('Failed to validate receipt: ' + valRcptRes.data.message);
    console.log('3 & 4. Created & Validated Receipt 1 for 500 units');

    // Test 5 & 6: Verify Stock & ConsignmentStock increased
    const physStock = await Stock.findOne({ branchId: branchA._id, productId: product._id, ownerType: 'SUPPLIER', ownerId: supplier._id });
    if (physStock.quantity < 500) throw new Error('Physical stock did not increase');
    const cStock = await ConsignmentStock.findOne({ branchId: branchA._id, productId: product._id, consignmentId });
    if (cStock.receivedQuantity !== 500) throw new Error('ConsignmentStock did not increase properly');
    console.log('5 & 6. Verified Stock and ConsignmentStock');

    // Test 7 & 8: Second receipt consolidation
    const rcpt2Req = mockReq(admin, {
      consignmentId,
      supplierId: supplier._id,
      branchId: branchA._id, // Same branch for consolidation check
      items: [{
        productId: product._id,
        orderedQuantity: 300,
        receivedQuantity: 300,
        acceptedQuantity: 300,
        uom: 'PCS',
        baseQuantity: 300,
        baseUom: 'PCS'
      }]
    });
    const rcpt2Res = mockRes();
    await receiptController.createReceipt(rcpt2Req, rcpt2Res);
    const receipt2Id = rcpt2Res.data.data._id;
    await receiptController.confirmReceipt(mockReq(admin, {}, { id: receipt2Id }), mockRes());
    await receiptController.validateReceipt(mockReq(admin, {}, { id: receipt2Id }), mockRes());
    
    const cStock2 = await ConsignmentStock.findOne({ branchId: branchA._id, productId: product._id, consignmentId });
    if (cStock2.receivedQuantity !== 800) throw new Error('Consignment quantities did not consolidate');
    console.log('7 & 8. Verified consolidation (Total Received: 800)');

    // Test 9, 10, 11, 12: Consume partial quantity
    const consumeReq = mockReq(admin, {
      branchId: branchA._id,
      productId: product._id,
      consumptionQuantity: 300,
      reason: 'Sales Order SO-001',
      referenceType: 'SALE'
    }, { id: consignmentId });
    const consumeRes = mockRes();
    await consignmentController.consumeConsignmentStock(consumeReq, consumeRes);
    if (!consumeRes.data.success) throw new Error('Consumption failed');
    
    const cStock3 = await ConsignmentStock.findOne({ branchId: branchA._id, productId: product._id, consignmentId });
    if (cStock3.consumedQuantity !== 300 || cStock3.availableQuantity !== 500) throw new Error('Consumption failed to update quantities');
    console.log('9-12. Verified Consumption (Consumed: 300, Available: 500)');

    // Test 13, 14, 15, 16: Return remaining quantity
    const retReq = mockReq(admin, {
      consignmentId,
      supplierId: supplier._id,
      branchId: branchA._id,
      items: [{
        productId: product._id,
        returnQuantity: 500,
        uom: 'PCS',
        baseQuantity: 500,
        baseUom: 'PCS'
      }]
    });
    const retRes = mockRes();
    await returnController.createReturn(retReq, retRes);
    const returnId = retRes.data.data._id;
    await returnController.confirmReturn(mockReq(admin, {}, { id: returnId }), mockRes());
    await returnController.validateReturn(mockReq(admin, {}, { id: returnId }), mockRes());

    const cStock4 = await ConsignmentStock.findOne({ branchId: branchA._id, productId: product._id, consignmentId });
    if (cStock4.returnedQuantity !== 500 || cStock4.availableQuantity !== 0) throw new Error('Return failed to zero out available');
    console.log('13-16. Verified Return (Returned: 500, Available: 0)');

    // Test 17: Over-consumption reject
    const consumeFailReq = mockReq(admin, {
      branchId: branchA._id,
      productId: product._id,
      consumptionQuantity: 100
    }, { id: consignmentId });
    const consumeFailRes = mockRes();
    await consignmentController.consumeConsignmentStock(consumeFailReq, consumeFailRes);
    if (consumeFailRes.data.success) throw new Error('Over-consumption was NOT rejected!');
    console.log('17. Verified over-consumption rejection');

    console.log('--- ALL TESTS PASSED ---');
    process.exit(0);
  } catch (error) {
    console.error('TEST FAILED:', error.message);
    process.exit(1);
  }
};

runTests();

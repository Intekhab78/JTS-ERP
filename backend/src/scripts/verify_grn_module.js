const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const Company = require('../core/models/Company');
const Branch = require('../core/models/Branch');
const Product = require('../core/models/Product');
const Supplier = require('../core/models/Supplier');
const User = require('../core/models/User');
const PurchaseOrder = require('../core/models/PurchaseOrder');
const PurchaseOrderItem = require('../core/models/PurchaseOrderItem');
const GRN = require('../core/models/GRN');
const Stock = require('../core/models/Stock');
const Counter = require('../core/models/Counter');
const Category = require('../core/models/Category');
const grnController = require('../modules/purchase/grnController');

async function runTests() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Let's create an isolated test context
  const session = await mongoose.startSession();
  
  // Create Test Data Context
  let tenantId = new mongoose.Types.ObjectId();
  let branchId = new mongoose.Types.ObjectId();
  let supplierId = new mongoose.Types.ObjectId();
  let productId = new mongoose.Types.ObjectId();
  let userId = new mongoose.Types.ObjectId();

  let categoryId = new mongoose.Types.ObjectId();
  const rnd = Math.floor(Math.random() * 1000000);

  let testContext = {
    Company: await Company.create({ _id: tenantId, name: `TEST_TENANT_${rnd}`, email: `test${rnd}@grn.com`, domain: `grn${rnd}.com` }),
    Branch: await Branch.create({ _id: branchId, tenantId, name: `TEST_BRANCH_${rnd}` }),
    Supplier: await Supplier.create({ _id: supplierId, tenantId, name: `TEST_SUPPLIER_${rnd}`, email: `supp${rnd}@grn.com` }),
    Category: await Category.create({ _id: categoryId, tenantId, name: `TEST_CATEGORY_${rnd}`, slug: `test-category-${rnd}` }),
    Product: await Product.create({ _id: productId, tenantId, name: `TEST_PRODUCT_${rnd}`, sku: `TEST-SKU-${rnd}`, categoryId, price: 10, unitOfMeasure: 'PCS' }),
    User: await User.create({ _id: userId, tenantId, branchId, firstName: `TEST_${rnd}`, lastName: 'USER', email: `user${rnd}@grn.com`, password: 'password' })
  };

  const cleanup = async () => {
    console.log('Cleaning up test data...');
    await PurchaseOrderItem.deleteMany({ tenantId });
    await PurchaseOrder.deleteMany({ tenantId });
    await GRN.deleteMany({ tenantId });
    await Stock.deleteMany({ tenantId });
    await Company.deleteOne({ _id: tenantId });
    await Branch.deleteOne({ _id: branchId });
    await Supplier.deleteOne({ _id: supplierId });
    await Category.deleteOne({ _id: categoryId });
    await Product.deleteOne({ _id: productId });
    await User.deleteOne({ _id: userId });
    await Counter.deleteMany({ tenantId });
    console.log('Cleanup done.');
  };

  const reqObj = { user: { _id: userId, tenantId, branchId } };
  const mockRes = () => {
    const res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.data = data; return res; };
    return res;
  };

  try {
    console.log('\n--- 1. END-TO-END DB TEST & MULTIPLE GRN TEST & OVER-RECEIVING TEST ---');
    
    // Create PO
    let po = await PurchaseOrder.create({
      tenantId, branchId, supplierId, userId,
      purchaseOrderNumber: `PO-2026-${rnd}`,
      totalAmount: 1000, status: 'CONFIRMED', expectedDate: new Date()
    });
    
    let poItem = await PurchaseOrderItem.create({
      tenantId, purchaseOrderId: po._id, productId,
      quantity: 100, unitCost: 10, subTotal: 1000
    });

    // --- GRN 1: 60 received, 55 accepted, 5 rejected ---
    reqObj.body = {
      branchId, supplierId, purchaseOrderId: po._id,
      supplierSnapshot: { name: `TEST_SUPPLIER_${rnd}` },
      items: [{
        productId,
        itemName: `TEST_PRODUCT_${rnd}`, sku: `TEST-SKU-${rnd}`,
        orderedQuantity: 100,
        receivedQuantity: 60, acceptedQuantity: 55, rejectedQuantity: 5
      }]
    };
    
    let res1 = mockRes();
    await grnController.createGRN(reqObj, res1);
    let grn1Id = res1.data._id;
    
    let reqGrn1 = { user: reqObj.user, params: { id: grn1Id } };
    
    // Confirm GRN 1
    let resConfirm1 = mockRes();
    await grnController.confirmGRN(reqGrn1, resConfirm1);
    
    // Validate GRN 1
    let resValidate1 = mockRes();
    await grnController.validateGRN(reqGrn1, resValidate1);

    // Check assertions after GRN 1
    let checkPO1 = await PurchaseOrder.findById(po._id);
    let checkPOItem1 = await PurchaseOrderItem.findById(poItem._id);
    let checkStock1 = await Stock.findOne({ tenantId, productId });
    
    console.assert(checkPOItem1.receivedQuantity === 60, 'FAIL: PO receivedQuantity should be 60');
    console.assert(checkPO1.status === 'PARTIALLY_RECEIVED', 'FAIL: PO should be PARTIALLY_RECEIVED');
    console.assert(checkStock1.quantity === 55, 'FAIL: Stock should be 55');
    console.log('PASS: GRN 1 Validation (Partial Receive) successful.');

    // --- GRN 2: 40 received, 38 accepted, 2 rejected ---
    reqObj.body.items[0].receivedQuantity = 40;
    reqObj.body.items[0].acceptedQuantity = 38;
    reqObj.body.items[0].rejectedQuantity = 2;

    let res2 = mockRes();
    await grnController.createGRN(reqObj, res2);
    let grn2Id = res2.data._id;

    let reqGrn2 = { user: reqObj.user, params: { id: grn2Id } };
    await grnController.confirmGRN(reqGrn2, mockRes());
    await grnController.validateGRN(reqGrn2, mockRes());

    // Check assertions after GRN 2
    let checkPO2 = await PurchaseOrder.findById(po._id);
    let checkPOItem2 = await PurchaseOrderItem.findById(poItem._id);
    let checkStock2 = await Stock.findOne({ tenantId, productId });
    
    console.assert(checkPOItem2.receivedQuantity === 100, 'FAIL: PO receivedQuantity should be 100');
    console.assert(checkPO2.status === 'RECEIVED', 'FAIL: PO status should be RECEIVED');
    console.assert(checkStock2.quantity === (55 + 38), 'FAIL: Total Stock should be 93');
    console.log('PASS: Multiple GRN Test successful.');

    // --- OVER-RECEIVING TEST ---
    console.log('\n--- OVER-RECEIVING TEST ---');
    // Let's create a new PO with 100 items. Receive 80. Then attempt 25.
    let po2 = await PurchaseOrder.create({
      tenantId, branchId, supplierId, userId,
      purchaseOrderNumber: `PO-2026-${rnd + 1}`,
      totalAmount: 1000, status: 'CONFIRMED', expectedDate: new Date()
    });
    await PurchaseOrderItem.create({
        tenantId, purchaseOrderId: po2._id, productId,
        quantity: 100, receivedQuantity: 80, unitCost: 10, subTotal: 1000
    });
    
    reqObj.body.purchaseOrderId = po2._id;
    reqObj.body.items[0].receivedQuantity = 25;
    
    let resOver = mockRes();
    await grnController.createGRN(reqObj, resOver);
    console.assert(resOver.statusCode === 400, 'FAIL: Should reject over-receiving at creation');
    console.log('PASS: Over-receiving rejected.');

    // --- DOUBLE VALIDATION TEST ---
    console.log('\n--- DOUBLE VALIDATION TEST ---');
    let resDouble = mockRes();
    await grnController.validateGRN(reqGrn2, resDouble);
    console.assert(resDouble.statusCode === 400 && resDouble.data.message.includes('already validated'), 'FAIL: Double validation should return 400 already validated');
    let checkStockDouble = await Stock.findOne({ tenantId, productId });
    console.assert(checkStockDouble.quantity === 93, 'FAIL: Stock must not increase a second time');
    console.log('PASS: Double validation correctly rejected.');

    // --- VALIDATED GRN IMMUTABILITY TEST ---
    console.log('\n--- VALIDATED GRN IMMUTABILITY TEST ---');
    let resUpdate = mockRes();
    await grnController.updateGRN({ ...reqGrn2, body: {} }, resUpdate);
    console.assert(resUpdate.statusCode === 400, 'FAIL: Should reject PUT on validated GRN');

    let resDelete = mockRes();
    await grnController.deleteGRN(reqGrn2, resDelete);
    console.assert(resDelete.statusCode === 400, 'FAIL: Should reject DELETE on validated GRN');

    let resCancelValidated = mockRes();
    await grnController.cancelGRN(reqGrn2, resCancelValidated);
    console.assert(resCancelValidated.statusCode === 400, 'FAIL: Should reject CANCEL on validated GRN');
    console.log('PASS: Immutability verified.');

    // --- CANCEL TEST ---
    console.log('\n--- CANCEL TEST ---');
    // Create DRAFT
    reqObj.body.purchaseOrderId = null; // Unlinked GRN just to test cancel
    reqObj.body.items[0].receivedQuantity = 10;
    reqObj.body.items[0].acceptedQuantity = 10;
    reqObj.body.items[0].rejectedQuantity = 0;
    
    let resDraft = mockRes();
    await grnController.createGRN(reqObj, resDraft);
    if(resDraft.statusCode !== 201) console.log('resDraft ERROR:', resDraft.data);

    let reqCancelDraft = { user: reqObj.user, params: { id: resDraft.data._id } };
    let resCancelDraftMsg = mockRes();
    await grnController.cancelGRN(reqCancelDraft, resCancelDraftMsg);
    if(resCancelDraftMsg.statusCode !== 200) console.log('cancel DRAFT ERROR:', resCancelDraftMsg.data);

    let draftCheck = await GRN.findById(resDraft.data._id);
    console.assert(draftCheck.status === 'CANCELLED', 'FAIL: DRAFT cancel failed');
    
    // Create CONFIRMED
    let resConfToCancel = mockRes();
    await grnController.createGRN(reqObj, resConfToCancel);
    if(resConfToCancel.statusCode !== 201) console.log('resConfToCancel ERROR:', resConfToCancel.data);

    let reqCancelConf = { user: reqObj.user, params: { id: resConfToCancel.data._id } };
    let resConfirmForCancel = mockRes();
    await grnController.confirmGRN(reqCancelConf, resConfirmForCancel);
    if(resConfirmForCancel.statusCode !== 200) console.log('confirm for cancel ERROR:', resConfirmForCancel.data);

    let resCancelConfMsg = mockRes();
    await grnController.cancelGRN(reqCancelConf, resCancelConfMsg);
    if(resCancelConfMsg.statusCode !== 200) console.log('cancel CONFIRMED ERROR:', resCancelConfMsg.data);

    let confCheck = await GRN.findById(resConfToCancel.data._id);
    console.assert(confCheck.status === 'CANCELLED', 'FAIL: CONFIRMED cancel failed');
    console.log('PASS: Cancel workflows verified.');

    // --- TRANSACTION TEST ---
    console.log('\n--- TRANSACTION TEST (MongoDB Rollback) ---');
    // To simulate a failure after stock update but before PO update, we'll monkey-patch PurchaseOrderItem.findOne to throw an error inside validateGRN.
    let poTx = await PurchaseOrder.create({
      tenantId, branchId, supplierId, userId,
      purchaseOrderNumber: `PO-2026-${rnd + 3}`,
      totalAmount: 1000, status: 'CONFIRMED', expectedDate: new Date()
    });
    await PurchaseOrderItem.create({ tenantId, purchaseOrderId: poTx._id, productId, quantity: 10, unitCost: 10, subTotal: 100 });
    
    reqObj.body.purchaseOrderId = poTx._id;
    let resTrans = mockRes();
    await grnController.createGRN(reqObj, resTrans);
    let grnTransId = resTrans.data._id;
    let reqTrans = { user: reqObj.user, params: { id: grnTransId } };
    
    let originalFindOne = PurchaseOrderItem.findOne;
    PurchaseOrderItem.findOne = function() {
      throw new Error('SIMULATED DB FAILURE DURING VALIDATION');
    };

    let preTransStock = await Stock.findOne({ tenantId, productId });
    let preStockQty = preTransStock.quantity;
    
    let resTransFail = mockRes();
    await grnController.validateGRN(reqTrans, resTransFail);
    
    // Restore findOne
    PurchaseOrderItem.findOne = originalFindOne;
    
    console.assert(resTransFail.statusCode === 400 && resTransFail.data.message === 'SIMULATED DB FAILURE DURING VALIDATION', 'FAIL: Transaction should have failed');
    
    // Assert Rollback
    let postTransStock = await Stock.findOne({ tenantId, productId });
    console.assert(postTransStock.quantity === preStockQty, 'FAIL: Stock did not rollback');
    
    let poCheckTx = await PurchaseOrder.findById(poTx._id);
    console.assert(poCheckTx.status === 'CONFIRMED', 'FAIL: PO status should not have changed on rollback');
    
    let checkGRNTrans = await GRN.findById(grnTransId);
    console.assert(checkGRNTrans.status === 'DRAFT', 'FAIL: GRN should remain DRAFT (unvalidated)');
    console.log('PASS: MongoDB Transactions fully verified.');

    // --- LEGACY ENDPOINT TEST ---
    console.log('\n--- LEGACY ENDPOINT TEST ---');
    let resLegacy = mockRes();
    const purchaseController = require('../modules/purchase/purchaseController');
    await purchaseController.receivePurchaseOrder({ user: reqObj.user, params: { id: poTrans._id } }, resLegacy);
    console.assert(resLegacy.statusCode === 400, 'FAIL: Legacy endpoint should return 400');
    console.log('PASS: Legacy receive endpoint is deprecated.');

  } catch (error) {
    console.error('TEST SCRIPT CRASHED:', error);
  } finally {
    await cleanup();
    await session.endSession();
    await mongoose.disconnect();
  }
}

runTests();

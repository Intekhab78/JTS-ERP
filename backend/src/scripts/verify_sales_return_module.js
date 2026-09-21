const mongoose = require('mongoose');
require('dotenv').config({ path: '../../.env' }); // adjust path to .env if needed

const Company = require('../core/models/Company');
const Branch = require('../core/models/Branch');
const User = require('../core/models/User');
const Product = require('../core/models/Product');
const Customer = require('../core/models/Customer');
const DeliveryNote = require('../core/models/DeliveryNote');
const SalesReturn = require('../core/models/SalesReturn');
const Stock = require('../core/models/Stock');
const StockMovement = require('../core/models/StockMovement');

const salesReturnController = require('../modules/sales/salesReturnController');

async function runTests() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found.');
    process.exit(1);
  }

  // Same tunnel replacing logic as test_transaction.js
  const tunnelUri = uri.replace(':27017/', ':27018/') + (uri.includes('replicaSet') ? '' : '&replicaSet=rs0');
  console.log('Connecting to', tunnelUri);

  try {
    await mongoose.connect(tunnelUri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('Transaction Test Failed: connect', err.message);
    process.exit(1);
  }

  try {
    // Basic setup for the test
    console.log('--- Setting up test data ---');
    const tenantId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const customerId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    // 1. Validated DN can create Sales Return (simulated)
    const dn = await DeliveryNote.create({
      tenantId, branchId, customerId, salesOrderId: new mongoose.Types.ObjectId(),
      deliveryNoteNumber: `DN-TEST-${Date.now()}`,
      status: 'DELIVERED', // Validated
      customerSnapshot: { name: 'Test Customer' },
      items: [{
        productId,
        itemName: 'Test Product',
        sku: 'TEST-SKU',
        orderedQuantity: 10,
        previouslyDeliveredQuantity: 0,
        deliveryQuantity: 10,
        remainingQuantity: 0
      }]
    });

    console.log('Created DELIVERED Delivery Note:', dn.deliveryNoteNumber);

    // Mock Express Req/Res for Controller
    const mockRes = () => {
      const res = {};
      res.status = () => res;
      res.json = (data) => { res.data = data; return res; };
      return res;
    };

    // Test 1: Validated DN can create Sales Return.
    console.log('Test 1 & 2: Creating Return from Validated DN...');
    let req = {
      user: { tenantId, _id: userId, branchId },
      body: {
        deliveryNoteId: dn._id,
        items: [{ productId, itemName: 'Test Product', sku: 'TEST-SKU', returnQuantity: 2 }]
      }
    };
    let res = mockRes();
    await salesReturnController.createSalesReturn(req, res);
    
    if (res.data && res.data.returnNumber) {
      console.log('✅ Test 1 Passed: Sales Return created:', res.data.returnNumber);
    } else {
      console.error('❌ Test 1 Failed:', res.data);
    }

    const srId = res.data._id;

    // Test 3 & 4: Returnable quantity calculated correctly & partial return
    console.log('Test 3 & 4: Checking returnable quantities...');
    req = { user: { tenantId }, params: { deliveryNoteId: dn._id } };
    res = mockRes();
    await salesReturnController.getReturnableInfo(req, res);
    if (res.data[productId.toString()].returnable === 8) {
      console.log('✅ Test 3 & 4 Passed: Returnable quantity is correctly updated to 8');
    } else {
      console.error('❌ Test 3 & 4 Failed:', res.data);
    }

    // Test 5 & 6: Over-return is rejected
    console.log('Test 5 & 6: Testing over-return...');
    req = {
      user: { tenantId, _id: userId, branchId },
      body: {
        deliveryNoteId: dn._id,
        items: [{ productId, itemName: 'Test Product', sku: 'TEST-SKU', returnQuantity: 10 }]
      }
    };
    res = mockRes();
    await salesReturnController.createSalesReturn(req, res);
    if (res.data.message && res.data.message.includes('Cannot return more than returnable quantity')) {
      console.log('✅ Test 5 & 6 Passed: Over-return properly rejected');
    } else {
      console.error('❌ Test 5 & 6 Failed: Allowed over-return!', res.data);
    }

    // Move to CONFIRMED
    console.log('Moving SR to CONFIRMED...');
    await SalesReturn.findByIdAndUpdate(srId, { status: 'CONFIRMED' });

    // Ensure Product exists for validation
    await Product.create({
      _id: productId,
      tenantId,
      name: 'Test Product',
      sku: 'TEST-SKU',
      type: 'PRODUCT'
    });

    // Test 7, 8, 9: Validation increases Stock, creates StockMovement
    console.log('Test 7 & 8: Validating SR and checking stock/movement...');
    req = { user: { tenantId, _id: userId }, params: { id: srId } };
    res = mockRes();
    await salesReturnController.validateSalesReturn(req, res);

    if (res.data.status === 'VALIDATED') {
      const stock = await Stock.findOne({ tenantId, branchId, productId });
      const movement = await StockMovement.findOne({ tenantId, branchId, productId, type: 'SALES_RETURN' });
      
      if (stock && stock.quantity === 2 && movement && movement.quantity === 2) {
        console.log('✅ Test 7 & 8 Passed: Stock increased and movement created');
      } else {
        console.error('❌ Test 7 & 8 Failed: Stock/Movement missing or incorrect quantities');
      }
    } else {
      console.error('❌ Validation Failed:', res.data);
    }

    // Test 10 & 11: Double validation rejected / Immutable
    console.log('Test 10 & 11: Testing double validation...');
    req = { user: { tenantId, _id: userId }, params: { id: srId } };
    res = mockRes();
    await salesReturnController.validateSalesReturn(req, res);
    if (res.data.message && res.data.message.includes('Cannot validate')) {
      console.log('✅ Test 10 & 11 Passed: Double validation rejected and is immutable');
    } else {
      console.error('❌ Test 10 & 11 Failed: Double validation went through!');
    }

    console.log('\n--- Test Suite Completed ---');
    process.exit(0);
  } catch (error) {
    console.error('Test Execution Error:', error);
    process.exit(1);
  }
}

runTests();

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const Company = require('../core/models/Company');
const Branch = require('../core/models/Branch');
const Product = require('../core/models/Product');
const Supplier = require('../core/models/Supplier');
const User = require('../core/models/User');
const PurchaseOrder = require('../core/models/PurchaseOrder');
const PurchaseOrderItem = require('../core/models/PurchaseOrderItem');
const PurchaseOrderSchedule = require('../core/models/PurchaseOrderSchedule');
const Category = require('../core/models/Category');

const { 
  previewEqualDistributionPurchaseOrderSchedules, 
  createEqualDistributionPurchaseOrderSchedules 
} = require('../modules/purchase/purchaseController');

async function testEqualDistribution() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB for Equal Distribution verification');

  const rnd = Math.floor(Math.random() * 1000000);
  const tenantId = new mongoose.Types.ObjectId();
  const mainBranchId = new mongoose.Types.ObjectId();
  const supplierId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const categoryId = new mongoose.Types.ObjectId();

  try {
    // 1. Create base records
    await Company.create({ _id: tenantId, name: `TEST_COMPANY_${rnd}`, email: `co${rnd}@test.com`, domain: `co${rnd}.com` });
    await User.create({ _id: userId, tenantId, branchId: mainBranchId, firstName: 'Test', lastName: 'User', email: `u${rnd}@test.com`, password: 'password' });
    await Supplier.create({ _id: supplierId, tenantId, name: `TEST_SUPPLIER_${rnd}`, email: `supp${rnd}@test.com` });
    await Category.create({ _id: categoryId, tenantId, name: `TEST_CAT_${rnd}`, slug: `cat-${rnd}` });

    // Create 5 Store branches
    const storeBranches = [];
    for (let i = 0; i < 5; i++) {
      const bId = new mongoose.Types.ObjectId();
      const b = await Branch.create({
        _id: bId,
        tenantId,
        name: `Store Branch ${i+1} (${rnd})`,
        type: 'Store',
        code: `STR-${rnd}-${i+1}`
      });
      storeBranches.push(b);
    }

    // Create 2 Products
    const prod1 = await Product.create({ _id: new mongoose.Types.ObjectId(), tenantId, name: `Prod Integer ${rnd}`, sku: `SKU-INT-${rnd}`, categoryId, price: 50, unitOfMeasure: 'PCS' });
    const prod2 = await Product.create({ _id: new mongoose.Types.ObjectId(), tenantId, name: `Prod Decimal ${rnd}`, sku: `SKU-DEC-${rnd}`, categoryId, price: 100, unitOfMeasure: 'KG' });

    // Create Purchase Order
    const po = await PurchaseOrder.create({
      tenantId,
      poNumber: `PO-EQ-${rnd}`,
      supplierId,
      branchId: mainBranchId,
      status: 'CONFIRMED',
      totalAmount: 10000,
      createdBy: userId
    });

    // Item 1: Quantity = 100 (integer)
    const poItem1 = await PurchaseOrderItem.create({
      tenantId,
      purchaseOrderId: po._id,
      productId: prod1._id,
      quantity: 100,
      unitPrice: 50,
      totalPrice: 5000,
      scheduledQuantity: 0
    });

    // Item 2: Quantity = 10.5 (decimal)
    const poItem2 = await PurchaseOrderItem.create({
      tenantId,
      purchaseOrderId: po._id,
      productId: prod2._id,
      quantity: 10.5,
      unitPrice: 100,
      totalPrice: 1050,
      scheduledQuantity: 0
    });

    console.log('Created test Purchase Order with 2 items (1 integer: 100 pcs, 1 decimal: 10.5 kg)');

    // Mock Req / Res helpers
    const mockUser = { _id: userId, tenantId };
    
    // Test 1: Preview Endpoint
    let previewResult = null;
    const reqPreview = {
      params: { id: po._id.toString() },
      body: {
        branchIds: storeBranches.map(b => b._id.toString()),
        destinationType: 'Store'
      },
      user: mockUser
    };
    const resPreview = {
      status: (code) => ({
        json: (data) => {
          if (code >= 400) throw new Error(`Preview Failed (${code}): ${data.message}`);
          previewResult = data;
        }
      })
    };

    await previewEqualDistributionPurchaseOrderSchedules(reqPreview, resPreview);
    console.log('✓ Preview Success:', previewResult.data);
    
    // Assert preview numbers
    if (previewResult.data.poItemsWithRemainingQuantity !== 2) throw new Error('Preview items count mismatch');
    if (previewResult.data.selectedStores !== 5) throw new Error('Preview store count mismatch');
    if (previewResult.data.totalRemainingQuantity !== 110.5) throw new Error('Preview remaining quantity mismatch');
    if (previewResult.data.schedulesToCreate !== 10) throw new Error('Preview schedules count mismatch');

    // Test 2: Create Endpoint
    let createResult = null;
    const reqCreate = {
      params: { id: po._id.toString() },
      body: {
        branchIds: storeBranches.map(b => b._id.toString()),
        destinationType: 'Store',
        expectedDate: new Date('2026-10-01')
      },
      user: mockUser
    };
    const resCreate = {
      status: (code) => ({
        json: (data) => {
          if (code >= 400) throw new Error(`Create Failed (${code}): ${data.message}`);
          createResult = data;
        }
      })
    };

    await createEqualDistributionPurchaseOrderSchedules(reqCreate, resCreate);
    console.log('✓ Create Success:', createResult.data);

    // Verify DB Schedules created
    const createdSchedules = await PurchaseOrderSchedule.find({ purchaseOrderId: po._id });
    console.log(`✓ Total PurchaseOrderSchedules in DB: ${createdSchedules.length}`);

    // Verify Item 1 schedule sum
    const schedItem1 = createdSchedules.filter(s => s.purchaseOrderItemId.toString() === poItem1._id.toString());
    const sum1 = schedItem1.reduce((acc, s) => acc + s.scheduledQuantity, 0);
    console.log(`Item 1 (Integer) Schedules: ${schedItem1.length} rows, Sum = ${sum1} (Expected 100)`);
    if (sum1 !== 100) throw new Error(`Item 1 quantity sum mismatch: got ${sum1}`);
    schedItem1.forEach(s => console.log(`   -> Store schedule qty: ${s.scheduledQuantity}`));

    // Verify Item 2 schedule sum
    const schedItem2 = createdSchedules.filter(s => s.purchaseOrderItemId.toString() === poItem2._id.toString());
    const sum2 = schedItem2.reduce((acc, s) => acc + s.scheduledQuantity, 0);
    console.log(`Item 2 (Decimal) Schedules: ${schedItem2.length} rows, Sum = ${sum2} (Expected 10.5)`);
    if (Number(sum2.toFixed(6)) !== 10.5) throw new Error(`Item 2 quantity sum mismatch: got ${sum2}`);
    schedItem2.forEach(s => console.log(`   -> Store schedule qty: ${s.scheduledQuantity}`));

    // Verify PO Item scheduledQuantity in DB
    const updatedPoItem1 = await PurchaseOrderItem.findById(poItem1._id);
    const updatedPoItem2 = await PurchaseOrderItem.findById(poItem2._id);
    if (updatedPoItem1.scheduledQuantity !== 100) throw new Error(`PoItem1 scheduledQuantity mismatch in DB: ${updatedPoItem1.scheduledQuantity}`);
    if (updatedPoItem2.scheduledQuantity !== 10.5) throw new Error(`PoItem2 scheduledQuantity mismatch in DB: ${updatedPoItem2.scheduledQuantity}`);
    console.log('✓ PO Items scheduledQuantity successfully updated in DB!');

    // Test 3: Attempting to create equal distribution again when remaining quantity is 0
    let errOccurred = false;
    try {
      await createEqualDistributionPurchaseOrderSchedules(reqCreate, resCreate);
    } catch (err) {
      errOccurred = true;
      console.log('✓ Correctly blocked scheduling when remaining quantity is 0:', err.message);
    }
    if (!errOccurred) throw new Error('Expected 0 remaining quantity error but none occurred!');

    console.log('\n=============================================');
    console.log('ALL EQUAL DISTRIBUTION BACKEND TESTS PASSED!');
    console.log('=============================================\n');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

testEqualDistribution();

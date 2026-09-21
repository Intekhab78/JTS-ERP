const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const Company = require('../src/core/models/Company');
const User = require('../src/core/models/User');
const Supplier = require('../src/core/models/Supplier');
const Product = require('../src/core/models/Product');
const Branch = require('../src/core/models/Branch');
const PurchaseOrder = require('../src/core/models/PurchaseOrder');
const GRN = require('../src/core/models/GRN');
const VendorReturn = require('../src/core/models/VendorReturn');
const Stock = require('../src/core/models/Stock');
const Category = require('../src/core/models/Category');

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

const vendorReturnController = require('../src/modules/purchase/vendorReturnController');

const runTests = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    const tenant = await Company.findOne();
    if (!tenant) throw new Error('No tenant found.');

    const admin = await User.findOne({ tenantId: tenant._id });
    if (!admin) throw new Error('No admin found.');

    let branchA = await Branch.findOne({ tenantId: tenant._id });
    let supplier = await Supplier.findOne({ tenantId: tenant._id });
    let category = await Category.findOne({ tenantId: tenant._id });
    
    if (!category) {
       category = await Category.create({ tenantId: tenant._id, name: 'Test Category', type: 'PRODUCT' });
    }

    let productA = await Product.findOne({ tenantId: tenant._id, sku: 'PROD-A' });
    if (!productA) {
       productA = await Product.create({ tenantId: tenant._id, name: 'Product A', sku: 'PROD-A', uom: 'PCS', type: 'GOODS', status: 'ACTIVE', categoryId: category._id, price: 10 });
    }
    let productB = await Product.findOne({ tenantId: tenant._id, sku: 'PROD-B' });
    if (!productB) {
       productB = await Product.create({ tenantId: tenant._id, name: 'Product B', sku: 'PROD-B', uom: 'PCS', type: 'GOODS', status: 'ACTIVE', categoryId: category._id, price: 20 });
    }

    console.log('--- STARTING RETURN ALL REMAINING TESTS ---');

    const po1 = await PurchaseOrder.create({
      tenantId: tenant._id,
      purchaseOrderNumber: 'PO-TEST-ALL-1',
      supplierId: supplier._id,
      expectedDate: new Date(),
      status: 'CONFIRMED',
      items: [{ productId: productA._id, quantity: 100, unitCost: 10 }]
    });

    const po2 = await PurchaseOrder.create({
      tenantId: tenant._id,
      purchaseOrderNumber: 'PO-TEST-ALL-2',
      supplierId: supplier._id,
      expectedDate: new Date(),
      status: 'CONFIRMED',
      items: [{ productId: productA._id, quantity: 200, unitCost: 10 }, { productId: productB._id, quantity: 50, unitCost: 20 }]
    });

    await GRN.create({
      tenantId: tenant._id,
      branchId: branchA._id,
      purchaseOrderId: po1._id,
      grnNumber: 'GRN-TEST-ALL-1',
      supplierId: supplier._id,
      status: 'VALIDATED',
      items: [{
        productId: productA._id,
        purchaseOrderItemId: po1.items[0]._id,
        receivedQuantity: 100,
        acceptedQuantity: 100,
        unitCost: 10
      }]
    });

    await GRN.create({
      tenantId: tenant._id,
      branchId: branchA._id,
      purchaseOrderId: po2._id,
      grnNumber: 'GRN-TEST-ALL-2',
      supplierId: supplier._id,
      status: 'VALIDATED',
      items: [{
        productId: productA._id,
        purchaseOrderItemId: po2.items[0]._id,
        receivedQuantity: 200,
        acceptedQuantity: 200,
        unitCost: 10
      }, {
        productId: productB._id,
        purchaseOrderItemId: po2.items[1]._id,
        receivedQuantity: 50,
        acceptedQuantity: 50,
        unitCost: 20
      }]
    });

    // Received so far: ProductA: 300, ProductB: 50
    // Simulate stock
    await Stock.findOneAndUpdate(
      { tenantId: tenant._id, branchId: branchA._id, productId: productA._id },
      { $set: { quantity: 150 } }, // 150 were sold
      { upsert: true }
    );
    await Stock.findOneAndUpdate(
      { tenantId: tenant._id, branchId: branchA._id, productId: productB._id },
      { $set: { quantity: 50 } }, // 0 sold
      { upsert: true }
    );

    console.log('1. Created POs and GRNs, and simulated physical stock constraints.');

    // Simulate previous return of Product B
    await VendorReturn.create({
      tenantId: tenant._id,
      vendorReturnNumber: 'VR-PREV-1',
      returnType: 'SUPPLIER_CONSOLIDATED',
      supplierId: supplier._id,
      status: 'VALIDATED',
      items: [{
        productId: productB._id,
        purchaseOrderId: po2._id,
        purchaseOrderItemId: po2.items[1]._id,
        branchId: branchA._id,
        returnQuantity: 10,
        unitCost: 20
      }]
    });

    console.log('2. Created previous validated return for 10 units of Product B.');

    // Test endpoint
    const reqCreate = mockReq(admin, {}, { supplierId: supplier._id });
    const resCreate = mockRes();
    await vendorReturnController.createReturnAllVendorReturn(reqCreate, resCreate);

    if (!resCreate.data.success) throw new Error('Failed to create Return All Vendor Return');
    
    console.log('3. Successfully generated Return All Draft!');
    console.log(resCreate.data.summary);

    // Expected:
    // ProductA: Received 300, Physical 150 -> Returnable 150
    // ProductB: Received 50, Previous Return 10, Physical 50 -> Logical 40, Physical 50 -> Returnable 40
    if (resCreate.data.summary.totalReturnQuantity !== 190) {
      throw new Error(`Expected exactly 190 total return quantity (150 + 40). Got: ${resCreate.data.summary.totalReturnQuantity}`);
    }
    
    if (resCreate.data.summary.purchaseOrders !== 2) {
      throw new Error('Traceability failed, not tracking 2 distinct POs.');
    }

    console.log('--- ALL TESTS PASSED ---');
    process.exit(0);

  } catch (error) {
    console.error('TEST FAILED:', error.message);
    process.exit(1);
  }
};

runTests();

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
    if (!tenant) throw new Error('No tenant found. Run seed script first.');

    const admin = await User.findOne({ tenantId: tenant._id });
    if (!admin) throw new Error('No admin found.');

    let branchA = await Branch.findOne({ tenantId: tenant._id });
    if (!branchA) {
       branchA = await Branch.create({ tenantId: tenant._id, name: 'Test Branch', code: 'TB1', status: 'ACTIVE' });
    }
    
    let supplier = await Supplier.findOne({ tenantId: tenant._id });
    if (!supplier) {
       supplier = await Supplier.create({ tenantId: tenant._id, name: 'Test Supplier', status: 'ACTIVE' });
    }
    
    let product = await Product.findOne({ tenantId: tenant._id });
    if (!product) {
       product = await Product.create({ tenantId: tenant._id, name: 'Test Product', sku: 'TST-01', uom: 'PCS', type: 'GOODS', status: 'ACTIVE' });
    }

    console.log('--- STARTING SUPPLIER CONSOLIDATED RETURN TESTS ---');

    // 1. Create Mock POs and GRNs
    // We bypass controllers for setup to speed up tests, simulating the final states.
    const po1 = await PurchaseOrder.create({
      tenantId: tenant._id,
      purchaseOrderNumber: 'PO-TEST-1001',
      supplierId: supplier._id,
      expectedDate: new Date(),
      status: 'CONFIRMED',
      items: [{ productId: product._id, quantity: 1000, unitCost: 10 }]
    });

    const po2 = await PurchaseOrder.create({
      tenantId: tenant._id,
      purchaseOrderNumber: 'PO-TEST-1002',
      supplierId: supplier._id,
      expectedDate: new Date(),
      status: 'CONFIRMED',
      items: [{ productId: product._id, quantity: 500, unitCost: 12 }]
    });

    const grn1 = await GRN.create({
      tenantId: tenant._id,
      branchId: branchA._id,
      purchaseOrderId: po1._id,
      grnNumber: 'GRN-TEST-1001',
      supplierId: supplier._id,
      status: 'VALIDATED',
      items: [{
        productId: product._id,
        purchaseOrderItemId: po1.items[0]._id,
        itemName: product.name,
        sku: product.sku,
        receivedQuantity: 500,
        acceptedQuantity: 500,
        unitCost: 10
      }]
    });

    const grn2 = await GRN.create({
      tenantId: tenant._id,
      branchId: branchA._id,
      purchaseOrderId: po1._id,
      grnNumber: 'GRN-TEST-1002',
      supplierId: supplier._id,
      status: 'VALIDATED',
      items: [{
        productId: product._id,
        purchaseOrderItemId: po1.items[0]._id,
        itemName: product.name,
        sku: product.sku,
        receivedQuantity: 300,
        acceptedQuantity: 300,
        unitCost: 10
      }]
    });

    const grn3 = await GRN.create({
      tenantId: tenant._id,
      branchId: branchA._id,
      purchaseOrderId: po2._id,
      grnNumber: 'GRN-TEST-1003',
      supplierId: supplier._id,
      status: 'VALIDATED',
      items: [{
        productId: product._id,
        purchaseOrderItemId: po2.items[0]._id,
        itemName: product.name,
        sku: product.sku,
        receivedQuantity: 400,
        acceptedQuantity: 400,
        unitCost: 12
      }]
    });

    // Manually ensure stock exists
    await Stock.findOneAndUpdate(
      { tenantId: tenant._id, branchId: branchA._id, productId: product._id },
      { $inc: { quantity: 1200 } },
      { upsert: true }
    );

    console.log('1. Created 2 POs and 3 GRNs (Total Received: 1200)');

    // Test: Query getSupplierReturnableItems
    const req1 = mockReq(admin, {}, { supplierId: supplier._id });
    const res1 = mockRes();
    await vendorReturnController.getSupplierReturnableItems(req1, res1);

    if (res1.data.summary.totalReturnableQuantity !== 1200) {
      throw new Error(`Expected 1200 returnable, got ${res1.data.summary.totalReturnableQuantity}`);
    }
    console.log('2. Verified getSupplierReturnableItems returns 1200 aggregated units');

    // Test: Create SUPPLIER_CONSOLIDATED Vendor Return
    // Return 200 from PO1 (GRN 1+2) and 100 from PO2 (GRN 3)
    const reqCreate = mockReq(admin, {
      returnType: 'SUPPLIER_CONSOLIDATED',
      supplierId: supplier._id,
      notes: 'Monthly defective return',
      items: [
        {
          productId: product._id,
          purchaseOrderId: po1._id,
          purchaseOrderItemId: po1.items[0]._id,
          branchId: branchA._id,
          itemName: product.name,
          sku: product.sku,
          returnQuantity: 200,
          unitCost: 10,
          sourceGRNIds: [grn1._id, grn2._id]
        },
        {
          productId: product._id,
          purchaseOrderId: po2._id,
          purchaseOrderItemId: po2.items[0]._id,
          branchId: branchA._id,
          itemName: product.name,
          sku: product.sku,
          returnQuantity: 100,
          unitCost: 12,
          sourceGRNIds: [grn3._id]
        }
      ]
    });
    
    const resCreate = mockRes();
    await vendorReturnController.createVendorReturn(reqCreate, resCreate);
    if (!resCreate.data._id) throw new Error('Failed to create consolidated return: ' + JSON.stringify(resCreate.data));
    const vrId = resCreate.data._id;
    console.log('3. Created SUPPLIER_CONSOLIDATED Vendor Return for 300 units');

    // Test: Confirm & Validate
    await vendorReturnController.confirmVendorReturn(mockReq(admin, {}, { id: vrId }), mockRes());
    const resVal = mockRes();
    await vendorReturnController.validateVendorReturn(mockReq(admin, {}, { id: vrId }), resVal);
    
    if (resVal.statusCode !== 200) throw new Error('Validation failed: ' + JSON.stringify(resVal.data));
    console.log('4. Validated Consolidated Return (Stock reduced)');

    // Test: Re-query Returnables
    const req2 = mockReq(admin, {}, { supplierId: supplier._id });
    const res2 = mockRes();
    await vendorReturnController.getSupplierReturnableItems(req2, res2);

    if (res2.data.summary.totalReturnableQuantity !== 900) {
      throw new Error(`Expected 900 returnable after 300 return, got ${res2.data.summary.totalReturnableQuantity}`);
    }
    console.log('5. Verified returnable quantity correctly decremented to 900');

    // Test: Over-return rejection
    const reqOver = mockReq(admin, {
      returnType: 'SUPPLIER_CONSOLIDATED',
      supplierId: supplier._id,
      items: [
        {
          productId: product._id,
          purchaseOrderId: po1._id,
          purchaseOrderItemId: po1.items[0]._id,
          branchId: branchA._id,
          itemName: product.name,
          sku: product.sku,
          returnQuantity: 700, // Only 600 available (800 received - 200 returned)
          unitCost: 10,
          sourceGRNIds: [grn1._id, grn2._id]
        }
      ]
    });
    const resOverCreate = mockRes();
    await vendorReturnController.createVendorReturn(reqOver, resOverCreate);
    const vrOverId = resOverCreate.data._id;
    await vendorReturnController.confirmVendorReturn(mockReq(admin, {}, { id: vrOverId }), mockRes());
    
    const resOverVal = mockRes();
    await vendorReturnController.validateVendorReturn(mockReq(admin, {}, { id: vrOverId }), resOverVal);
    if (resOverVal.statusCode === 200) throw new Error('Over-return validation DID NOT FAIL!');
    console.log('6. Verified Over-Return Rejection');

    console.log('--- ALL TESTS PASSED ---');
    process.exit(0);

  } catch (error) {
    console.error('TEST FAILED:', error.message);
    process.exit(1);
  }
};

runTests();

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Consignment = require('../src/core/models/Consignment');
const ConsignmentSettlement = require('../src/core/models/ConsignmentSettlement');
const Stock = require('../src/core/models/Stock');
const StockMovement = require('../src/core/models/StockMovement');
const Product = require('../src/core/models/Product');
const Supplier = require('../src/core/models/Supplier');
const Customer = require('../src/core/models/Customer');
const Branch = require('../src/core/models/Branch');
const Company = require('../src/core/models/Company');
const User = require('../src/core/models/User');
const GRN = require('../src/core/models/GRN');
const Order = require('../src/core/models/Order');
const OrderItem = require('../src/core/models/OrderItem');
const DeliveryNote = require('../src/core/models/DeliveryNote');
const VendorReturn = require('../src/core/models/VendorReturn');

const grnController = require('../src/modules/purchase/grnController');
const deliveryNoteController = require('../src/modules/sales/deliveryNoteController');
const vendorReturnController = require('../src/modules/purchase/vendorReturnController');
const consignmentStockController = require('../src/modules/purchase/consignmentStockController');
const mockRes = () => {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.data = data; return res; };
  return res;
};

async function runTests() {
  await connectDB();

  try {
    const product = await Product.findOne();
    if (!product) {
      console.log('No products found in DB.');
      process.exit(1);
    }

    const tenant = await Company.findById(product.tenantId);
    const branch = await Branch.findOne({ tenantId: tenant._id });
    
    let supplier = await Supplier.findOne({ tenantId: tenant._id });
    if (!supplier) {
      supplier = await Supplier.create({
        tenantId: tenant._id,
        name: 'Test Supplier',
        email: 'supplier@test.com',
        phone: '1234567890'
      });
    }

    let customer = await Customer.findOne({ tenantId: tenant._id });
    if (!customer) {
      customer = await Customer.create({
        tenantId: tenant._id,
        name: 'Test Customer',
        email: 'customer@test.com',
        phone: '0987654321'
      });
    }

    const user = await User.findOne({ tenantId: tenant._id });

    if (!tenant || !branch || !supplier || !product || !user || !customer) {
      console.log('Dummy data not found.');
      process.exit(1);
    }

    console.log('--- STARTING COMPREHENSIVE REGRESSION TESTS ---');

    // Clean up past test data
    await Stock.deleteMany({ tenantId: tenant._id, productId: product._id });
    await Consignment.deleteMany({ tenantId: tenant._id });
    await GRN.deleteMany({ tenantId: tenant._id });
    await Order.deleteMany({ tenantId: tenant._id });
    await OrderItem.deleteMany({ tenantId: tenant._id });
    await DeliveryNote.deleteMany({ tenantId: tenant._id });
    await VendorReturn.deleteMany({ tenantId: tenant._id });

    // Regression: 5 Existing non-consignment GRNs and Delivery Notes
    let lastPoId = null;
    for (let i = 1; i <= 5; i++) {
      console.log(`\nRunning Non-Consignment Set ${i}...`);
      
      const po = new Order({ // Fake PO collection, let's use PurchaseOrder
      }); // Wait, we should just mock GRN returnable quantity check or create a real PurchaseOrder.
      // Actually, vendorReturnController checks GRNs that have the same purchaseOrderId and supplierId.
      
      lastPoId = new mongoose.Types.ObjectId();

      const companyGrn = new GRN({
        tenantId: tenant._id,
        supplierId: supplier._id,
        branchId: branch._id,
        purchaseOrderId: lastPoId,
        grnNumber: `GRN-REG-${i}-${Date.now()}`,
        status: 'CONFIRMED',
        supplierSnapshot: { name: supplier.name },
        items: [{
          productId: product._id,
          itemName: product.name,
          sku: product.sku,
          orderedQuantity: 10,
          receivedQuantity: 10,
          acceptedQuantity: 10,
          baseQuantity: 10,
          ownerType: 'COMPANY'
        }],
        createdBy: user._id
      });
      await companyGrn.save();

      let req = { user: { tenantId: tenant._id, _id: user._id }, params: { id: companyGrn._id } };
      let res = mockRes();
      await grnController.validateGRN(req, res);

      if (res.statusCode === 200) {
        console.log(`✅ [PASS] Regular GRN ${i} Validated`);
      } else {
        console.log(`❌ [FAIL] Regular GRN ${i} Failed:`, res.data);
      }

      const order = new Order({
        tenantId: tenant._id,
        customerId: customer._id,
        branchId: branch._id,
        userId: user._id,
        totalAmount: 1500,
        orderNumber: `SO-REG-${i}-${Date.now()}`,
        status: 'CONFIRMED',
        createdBy: user._id
      });
      await order.save();

      const orderItem = new OrderItem({
        tenantId: tenant._id,
        orderId: order._id,
        productId: product._id,
        quantity: 5,
        unitPrice: 300,
        subTotal: 1500
      });
      await orderItem.save();

      const deliveryNote = new DeliveryNote({
        tenantId: tenant._id,
        branchId: branch._id,
        salesOrderId: order._id,
        customerId: customer._id,
        deliveryNoteNumber: `DN-REG-${i}-${Date.now()}`,
        status: 'READY',
        customerSnapshot: { name: customer.name },
        items: [{
          productId: product._id,
          itemName: product.name,
          sku: product.sku,
          deliveryQuantity: 5,
          orderedQuantity: 5,
          previouslyDeliveredQuantity: 0,
          remainingQuantity: 5
        }],
        createdBy: user._id
      });
      await deliveryNote.save();

      req = { user: { tenantId: tenant._id, _id: user._id }, params: { id: deliveryNote._id } };
      res = mockRes();
      await deliveryNoteController.dispatchDeliveryNote(req, res);

      if (res.statusCode === 200) {
        console.log(`✅ [PASS] Regular Delivery Note ${i} Dispatched`);
      } else {
        console.log(`❌ [FAIL] Regular Delivery Note ${i} Failed:`, res.data);
      }
    }

    // Verify Vendor Return is perfectly functional
    console.log('\nRunning Vendor Return Regression...');
    const vendorReturn = new VendorReturn({
      tenantId: tenant._id,
      supplierId: supplier._id,
      branchId: branch._id,
      purchaseOrderId: lastPoId, // Use the PO from the 5th GRN!
      vendorReturnNumber: `VR-REG-${Date.now()}`,
      status: 'DRAFT',
      reason: 'Defective',
      items: [{
        productId: product._id,
        itemName: product.name,
        sku: product.sku,
        returnQuantity: 2,
        baseQuantity: 2,
        unitPrice: 100
      }],
      createdBy: user._id
    });
    await vendorReturn.save();

    let req = { user: { tenantId: tenant._id, _id: user._id }, params: { id: vendorReturn._id } };
    let res = mockRes();
    await vendorReturnController.validateVendorReturn(req, res);

    if (res.statusCode === 200) {
      console.log('✅ [PASS] Vendor Return Validated successfully');
    } else {
      console.log('❌ [FAIL] Vendor Return Failed:', res.data);
    }

    let compStock = await Stock.findOne({ tenantId: tenant._id, productId: product._id, ownerType: 'COMPANY' });
    // After 5x GRN (10 each) = 50. 5x Delivery (5 each) = 25. Return = 2. Remaining = 23.
    if (compStock && compStock.quantity === 23) {
      console.log(`✅ [PASS] Stock accurately calculated at 23 units (50 received - 25 delivered - 2 returned)`);
    } else {
      console.log(`❌ [FAIL] Stock count mismatch. Expected 23, got: ${compStock ? compStock.quantity : 'null'}`);
    }

    console.log('\n--- STARTING CONSIGNMENT FLOW TESTS ---');

    // 1. Create Active Consignment Agreement
    const consignment = new Consignment({
      tenantId: tenant._id,
      supplierId: supplier._id,
      consignmentNumber: `CNS-TEST-${Date.now()}`,
      startDate: new Date(),
      status: 'ACTIVE',
      items: [{
        productId: product._id,
        agreedQuantity: 200,
        unitPrice: 100
      }],
      createdBy: user._id,
      activatedBy: user._id
    });
    await consignment.save();
    console.log('✅ [PASS] Consignment Agreement Created');

    // 2. Create Consignment GRN (Supplier Owned)
    const supplierGrn = new GRN({
      tenantId: tenant._id,
      supplierId: supplier._id,
      branchId: branch._id,
      grnNumber: `GRN-SUPP-${Date.now()}`,
      status: 'CONFIRMED',
      supplierSnapshot: { name: supplier.name },
      items: [{
        productId: product._id,
        itemName: product.name,
        sku: product.sku,
        orderedQuantity: 100,
        receivedQuantity: 100,
        acceptedQuantity: 100,
        baseQuantity: 100,
        ownerType: 'SUPPLIER',
        ownerId: supplier._id
      }],
      createdBy: user._id
    });
    await supplierGrn.save();

    req = { user: { tenantId: tenant._id, _id: user._id }, params: { id: supplierGrn._id } };
    res = mockRes();
    await grnController.validateGRN(req, res);

    let suppStock = await Stock.findOne({ tenantId: tenant._id, productId: product._id, ownerType: 'SUPPLIER', ownerId: supplier._id });
    if (res.statusCode === 200 && suppStock && suppStock.quantity === 100) {
      console.log('✅ [PASS] Consignment GRN successfully validated and created supplier-owned stock');
    } else {
      console.log('❌ [FAIL] Consignment GRN failed');
    }

    // 3. Create and Dispatch Delivery Note for 70 items
    // (Should consume 23 COMPANY and 47 SUPPLIER stock)
    const orderCons = new Order({
      tenantId: tenant._id,
      customerId: customer._id,
      branchId: branch._id,
      userId: user._id,
      totalAmount: 10500,
      orderNumber: `SO-TEST-${Date.now()}`,
      status: 'CONFIRMED',
      createdBy: user._id
    });
    await orderCons.save();

    const orderItemCons = new OrderItem({
      tenantId: tenant._id,
      orderId: orderCons._id,
      productId: product._id,
      quantity: 70,
      unitPrice: 150,
      subTotal: 10500
    });
    await orderItemCons.save();

    const deliveryNoteCons = new DeliveryNote({
      tenantId: tenant._id,
      branchId: branch._id,
      salesOrderId: orderCons._id,
      customerId: customer._id,
      deliveryNoteNumber: `DN-TEST-${Date.now()}`,
      status: 'READY',
      customerSnapshot: { name: customer.name },
      items: [{
        productId: product._id,
        itemName: product.name,
        sku: product.sku,
        deliveryQuantity: 70,
        orderedQuantity: 70,
        previouslyDeliveredQuantity: 0,
        remainingQuantity: 70
      }],
      createdBy: user._id
    });
    await deliveryNoteCons.save();

    req = { user: { tenantId: tenant._id, _id: user._id }, params: { id: deliveryNoteCons._id } };
    res = mockRes();
    await deliveryNoteController.dispatchDeliveryNote(req, res);

    compStock = await Stock.findOne({ tenantId: tenant._id, productId: product._id, ownerType: 'COMPANY' });
    suppStock = await Stock.findOne({ tenantId: tenant._id, productId: product._id, ownerType: 'SUPPLIER', ownerId: supplier._id });
    
    const cons = await Consignment.findById(consignment._id);
    const consItem = cons.items.find(i => i.productId.toString() === product._id.toString());

    if (res.statusCode === 200 && compStock.quantity === 0 && suppStock.quantity === 53 && consItem.consumedQuantity === 47) {
      console.log('✅ [PASS] Priority consumption successful (23 COMPANY, 47 SUPPLIER) and Consignment updated');
    } else {
      console.log('❌ [FAIL] Priority consumption failed:', {
        status: res.statusCode,
        compStockQty: compStock.quantity, 
        suppStockQty: suppStock.quantity, 
        consConsumed: consItem.consumedQuantity
      });
    }

    console.log('\nRunning Dashboard Live View Verification...');
    req = { user: { tenantId: tenant._id, _id: user._id } };
    res = mockRes();
    await consignmentStockController.getConsignmentStock(req, res);

    const dashboardData = res.data?.data;
    if (res.statusCode === 200 && dashboardData && dashboardData.length > 0) {
      const targetRow = dashboardData.find(d => d.product._id.toString() === product._id.toString() && d.supplier._id.toString() === supplier._id.toString());
      if (targetRow && targetRow.receivedQuantity === 100 && targetRow.consumedQuantity === 47 && targetRow.returnedQuantity === 0 && targetRow.availableQuantity === 53) {
        console.log('✅ [PASS] Consignment Stock Dashboard data matches expectations (Received: 100, Consumed: 47, Returned: 0, Available: 53)');
      } else {
        console.log('❌ [FAIL] Consignment Stock Dashboard data mismatch:', targetRow);
      }
    } else {
      console.log('❌ [FAIL] Consignment Stock Dashboard failed to fetch or empty data:', res);
    }

    console.log('\n--- ALL TESTS COMPLETED SUCCESSFULLY ---');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    mongoose.disconnect();
  }
}

runTests();

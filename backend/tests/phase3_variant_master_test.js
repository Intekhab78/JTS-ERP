/**
 * Phase 3 — Product Variant Master & Matrix API Offline Regression Test Suite
 * File: backend/tests/phase3_variant_master_test.js
 * 
 * Strictly runs OFFLINE with ZERO database connection (mongoose.connection.readyState === 0).
 * Validates:
 * - Category 1: Tenant-Scoped ProductVariant CRUD
 * - Category 2: Parent Product Validation & Scope Protection
 * - Category 3: Attribute & Canonical Signature Validation
 * - Category 4: Duplicate Combinations & SKU/Barcode Collision Handling
 * - Category 5: Bulk Matrix Synchronization (Matrix Sync API)
 * - Category 6: Non-Variant Product Compatibility
 */

const assert = require('assert');
const mongoose = require('mongoose');

// STEP 0: Guarantee strict offline state
assert.strictEqual(
  mongoose.connection.readyState,
  0,
  'CRITICAL SAFETY VIOLATION: Mongoose must be completely disconnected (readyState === 0).'
);

const Product = require('../src/core/models/Product');
const ProductVariant = require('../src/core/models/ProductVariant');
const Stock = require('../src/core/models/Stock');

const {
  getProductVariants,
  getProductVariantById,
  createProductVariant,
  bulkSaveProductVariants,
  updateProductVariant,
  deleteProductVariant
} = require('../src/modules/inventory/productVariantController');

let totalTests = 0;
let passedTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } catch (err) {
    console.error(`  [FAIL] ${testName}`);
    console.error(`         ${err.message}`);
    throw err;
  }
}

async function runAsyncTest(testName, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } catch (err) {
    console.error(`  [FAIL] ${testName}`);
    console.error(`         ${err.message}`);
    throw err;
  }
}

/**
 * Creates a mocked express request and response object
 */
function createMockContext({ user = {}, params = {}, query = {}, body = {} } = {}) {
  const req = {
    user: {
      _id: new mongoose.Types.ObjectId(),
      tenantId: new mongoose.Types.ObjectId(),
      ...user
    },
    params,
    query,
    body
  };

  const res = {
    statusCode: 200,
    bodyData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.bodyData = data;
      return this;
    }
  };

  return { req, res };
}

async function main() {
  console.log('===============================================================');
  console.log('   PHASE 3: PRODUCT VARIANT MASTER OFFLINE TEST SUITE          ');
  console.log('===============================================================');
  console.log(`Mongoose Connection State: ${mongoose.connection.readyState} (0 = Disconnected)\n`);

  const tenantId = new mongoose.Types.ObjectId();
  const otherTenantId = new mongoose.Types.ObjectId();
  const productId = new mongoose.Types.ObjectId();
  const categoryId = new mongoose.Types.ObjectId();

  const standardDefinitions = [
    { name: 'Color', values: ['Red', 'Blue', 'Black'] },
    { name: 'Size', values: ['S', 'M', 'L', 'XL'] }
  ];

  // ============================================================================
  // CATEGORY 1: Tenant-Scoped ProductVariant CRUD
  // ============================================================================
  console.log('--- CATEGORY 1: Tenant-Scoped ProductVariant CRUD ---');

  await runAsyncTest('1.1 getProductVariants lists variants for matching product and tenant', async () => {
    const { req, res } = createMockContext({
      user: { tenantId },
      params: { productId: productId.toString() }
    });

    const origProdFindOne = Product.findOne;
    const origVarFind = ProductVariant.find;

    Product.findOne = () => ({
      _id: productId,
      name: 'Polo Shirt',
      sku: 'POLO-001',
      hasVariants: true,
      variantAttributeDefinitions: standardDefinitions
    });

    ProductVariant.find = (filter) => {
      assert.strictEqual(filter.tenantId.toString(), tenantId.toString());
      assert.strictEqual(filter.productId.toString(), productId.toString());
      return {
        sort: () => ({
          lean: () => Promise.resolve([
            { _id: new mongoose.Types.ObjectId(), sku: 'POLO-RED-S', attributes: { Color: 'Red', Size: 'S' }, salesPrice: 49.99 }
          ])
        })
      };
    };

    try {
      await getProductVariants(req, res);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.bodyData.success, true);
      assert.strictEqual(res.bodyData.variants.length, 1);
      assert.strictEqual(res.bodyData.variants[0].sku, 'POLO-RED-S');
    } finally {
      Product.findOne = origProdFindOne;
      ProductVariant.find = origVarFind;
    }
  });

  await runAsyncTest('1.2 getProductVariantById returns 404 for variant belonging to different tenant', async () => {
    const variantId = new mongoose.Types.ObjectId();
    const { req, res } = createMockContext({
      user: { tenantId },
      params: { variantId: variantId.toString() }
    });

    const origVarFindOne = ProductVariant.findOne;
    ProductVariant.findOne = (filter) => {
      // Simulating query filter with wrong tenant returning null
      assert.strictEqual(filter.tenantId.toString(), tenantId.toString());
      return {
        populate: () => ({
          lean: () => Promise.resolve(null)
        })
      };
    };

    try {
      await getProductVariantById(req, res);
      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.bodyData.message, 'Product variant not found');
    } finally {
      ProductVariant.findOne = origVarFindOne;
    }
  });

  await runAsyncTest('1.3 createProductVariant creates variant with normalized uppercase SKU and signature', async () => {
    const { req, res } = createMockContext({
      user: { tenantId },
      params: { productId: productId.toString() },
      body: {
        sku: 'polo-red-m',
        attributes: { Color: 'Red', Size: 'M' },
        salesPrice: 45
      }
    });

    const origProdFindOne = Product.findOne;
    const origProdExists = Product.exists;
    const origVarExists = ProductVariant.exists;
    const origVarCreate = ProductVariant.create;

    Product.findOne = () => Promise.resolve({
      _id: productId,
      hasVariants: true,
      variantAttributeDefinitions: standardDefinitions
    });

    Product.exists = () => Promise.resolve(null);
    ProductVariant.exists = () => Promise.resolve(null);

    let createdPayload = null;
    ProductVariant.create = (doc) => {
      createdPayload = doc;
      return Promise.resolve({ _id: new mongoose.Types.ObjectId(), ...doc });
    };

    try {
      await createProductVariant(req, res);
      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.bodyData.success, true);
      assert.strictEqual(createdPayload.sku, 'POLO-RED-M', 'SKU must be normalized to uppercase');
      assert.strictEqual(createdPayload.attributeSignature, 'color:red|size:m');
      assert.strictEqual(createdPayload.salesPrice, 45);
    } finally {
      Product.findOne = origProdFindOne;
      Product.exists = origProdExists;
      ProductVariant.exists = origVarExists;
      ProductVariant.create = origVarCreate;
    }
  });

  await runAsyncTest('1.4 updateProductVariant updates price and attributes safely', async () => {
    const variantId = new mongoose.Types.ObjectId();
    const { req, res } = createMockContext({
      user: { tenantId },
      params: { variantId: variantId.toString() },
      body: {
        salesPrice: 59.99,
        barcode: '123456789012'
      }
    });

    const origVarFindOne = ProductVariant.findOne;
    const origProdFindOne = Product.findOne;
    const origProdExists = Product.exists;
    const origVarExists = ProductVariant.exists;
    const origVarFindOneAndUpdate = ProductVariant.findOneAndUpdate;

    ProductVariant.findOne = () => Promise.resolve({
      _id: variantId,
      productId,
      sku: 'POLO-RED-M',
      barcode: undefined,
      attributeSignature: 'color:red|size:m'
    });

    Product.findOne = () => Promise.resolve({
      _id: productId,
      hasVariants: true,
      variantAttributeDefinitions: standardDefinitions
    });

    Product.exists = () => Promise.resolve(null);
    ProductVariant.exists = () => Promise.resolve(null);

    ProductVariant.findOneAndUpdate = (filter, update) => {
      assert.strictEqual(filter._id.toString(), variantId.toString());
      assert.strictEqual(update.salesPrice, 59.99);
      assert.strictEqual(update.barcode, '123456789012');
      return Promise.resolve({ _id: variantId, ...update });
    };

    try {
      await updateProductVariant(req, res);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.bodyData.success, true);
    } finally {
      ProductVariant.findOne = origVarFindOne;
      Product.findOne = origProdFindOne;
      Product.exists = origProdExists;
      ProductVariant.exists = origVarExists;
      ProductVariant.findOneAndUpdate = origVarFindOneAndUpdate;
    }
  });

  await runAsyncTest('1.5 deleteProductVariant rejects deletion if active stock exists', async () => {
    const variantId = new mongoose.Types.ObjectId();
    const { req, res } = createMockContext({
      user: { tenantId },
      params: { variantId: variantId.toString() }
    });

    const origVarFindOne = ProductVariant.findOne;
    const origStockFindOne = Stock.findOne;

    ProductVariant.findOne = () => Promise.resolve({ _id: variantId, tenantId });
    // Mock that Stock exists with quantity > 0
    Stock.findOne = () => Promise.resolve({ _id: new mongoose.Types.ObjectId(), quantity: 10 });

    try {
      await deleteProductVariant(req, res);
      assert.strictEqual(res.statusCode, 400);
      assert.match(res.bodyData.message, /Cannot delete variant with active inventory stock/);
    } finally {
      ProductVariant.findOne = origVarFindOne;
      Stock.findOne = origStockFindOne;
    }
  });

  // ============================================================================
  // CATEGORY 2: Parent Product Validation & Scope Protection
  // ============================================================================
  console.log('\n--- CATEGORY 2: Parent Product Validation & Scope Protection ---');

  await runAsyncTest('2.1 Rejects variant creation when parent product does not exist', async () => {
    const { req, res } = createMockContext({
      user: { tenantId },
      params: { productId: productId.toString() },
      body: { sku: 'VAR-1', attributes: { Color: 'Red', Size: 'S' } }
    });

    const origProdFindOne = Product.findOne;
    Product.findOne = () => Promise.resolve(null);

    try {
      await createProductVariant(req, res);
      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.bodyData.message, 'Parent product not found');
    } finally {
      Product.findOne = origProdFindOne;
    }
  });

  await runAsyncTest('2.2 Rejects variant creation when parent hasVariants is false', async () => {
    const { req, res } = createMockContext({
      user: { tenantId },
      params: { productId: productId.toString() },
      body: { sku: 'VAR-1', attributes: { Color: 'Red', Size: 'S' } }
    });

    const origProdFindOne = Product.findOne;
    Product.findOne = () => Promise.resolve({
      _id: productId,
      hasVariants: false
    });

    try {
      await createProductVariant(req, res);
      assert.strictEqual(res.statusCode, 400);
      assert.match(res.bodyData.message, /does not have variants enabled/);
    } finally {
      Product.findOne = origProdFindOne;
    }
  });

  // ============================================================================
  // CATEGORY 3: Attribute & Canonical Signature Validation
  // ============================================================================
  console.log('\n--- CATEGORY 3: Attribute & Canonical Signature Validation ---');

  runTest('3.1 Generates deterministically sorted canonical attribute signatures', () => {
    const sig1 = ProductVariant.generateCanonicalAttributeSignature(
      { Size: 'XL', Color: 'Red' },
      standardDefinitions
    );
    const sig2 = ProductVariant.generateCanonicalAttributeSignature(
      { Color: 'red', Size: 'xl' },
      standardDefinitions
    );
    assert.strictEqual(sig1, 'color:red|size:xl');
    assert.strictEqual(sig2, 'color:red|size:xl');
  });

  runTest('3.2 Rejects variant missing declared parent attribute (completeness check)', () => {
    assert.throws(
      () => ProductVariant.generateCanonicalAttributeSignature({ Color: 'Red' }, standardDefinitions),
      /missing required attribute: "Size"/i
    );
  });

  runTest('3.3 Rejects variant specifying undeclared attribute (scope check)', () => {
    assert.throws(
      () => ProductVariant.generateCanonicalAttributeSignature(
        { Color: 'Red', Size: 'XL', Fit: 'Slim' },
        standardDefinitions
      ),
      /not declared in the parent product variant definitions/i
    );
  });

  runTest('3.4 Rejects variant attribute value not declared in parent allowed values', () => {
    assert.throws(
      () => ProductVariant.generateCanonicalAttributeSignature(
        { Color: 'Green', Size: 'XL' },
        standardDefinitions
      ),
      /Invalid value "Green" for attribute "Color"/i
    );
  });

  // ============================================================================
  // CATEGORY 4: Duplicate Combinations & Collision Handling
  // ============================================================================
  console.log('\n--- CATEGORY 4: Duplicate Combinations & Collision Handling ---');

  await runAsyncTest('4.1 Rejects duplicate attribute combination for same parent product (HTTP 409)', async () => {
    const { req, res } = createMockContext({
      user: { tenantId },
      params: { productId: productId.toString() },
      body: { sku: 'POLO-RED-S-NEW', attributes: { Color: 'Red', Size: 'S' } }
    });

    const origProdFindOne = Product.findOne;
    const origProdExists = Product.exists;
    const origVarExists = ProductVariant.exists;

    Product.findOne = () => Promise.resolve({
      _id: productId,
      hasVariants: true,
      variantAttributeDefinitions: standardDefinitions
    });

    Product.exists = () => Promise.resolve(null);
    // Mock that signature already exists in DB
    ProductVariant.exists = (filter) => {
      if (filter.attributeSignature) return Promise.resolve({ _id: new mongoose.Types.ObjectId() });
      return Promise.resolve(null);
    };

    try {
      await createProductVariant(req, res);
      assert.strictEqual(res.statusCode, 409);
      assert.match(res.bodyData.message, /already exists for this product/);
    } finally {
      Product.findOne = origProdFindOne;
      Product.exists = origProdExists;
      ProductVariant.exists = origVarExists;
    }
  });

  await runAsyncTest('4.2 Rejects variant SKU that collides with Product Master SKU (HTTP 409)', async () => {
    const { req, res } = createMockContext({
      user: { tenantId },
      params: { productId: productId.toString() },
      body: { sku: 'PARENT-COLLISION-SKU', attributes: { Color: 'Red', Size: 'S' } }
    });

    const origProdFindOne = Product.findOne;
    const origProdExists = Product.exists;

    Product.findOne = () => Promise.resolve({
      _id: productId,
      hasVariants: true,
      variantAttributeDefinitions: standardDefinitions
    });

    // Mock collision against Product
    Product.exists = () => Promise.resolve({ _id: new mongoose.Types.ObjectId() });

    try {
      await createProductVariant(req, res);
      assert.strictEqual(res.statusCode, 409);
      assert.match(res.bodyData.message, /already assigned to a product master/);
    } finally {
      Product.findOne = origProdFindOne;
      Product.exists = origProdExists;
    }
  });

  await runAsyncTest('4.3 Rejects variant SKU that collides with another variant within same tenant (HTTP 409)', async () => {
    const { req, res } = createMockContext({
      user: { tenantId },
      params: { productId: productId.toString() },
      body: { sku: 'EXISTING-VARIANT-SKU', attributes: { Color: 'Red', Size: 'S' } }
    });

    const origProdFindOne = Product.findOne;
    const origProdExists = Product.exists;
    const origVarExists = ProductVariant.exists;

    Product.findOne = () => Promise.resolve({
      _id: productId,
      hasVariants: true,
      variantAttributeDefinitions: standardDefinitions
    });

    Product.exists = () => Promise.resolve(null);
    // Mock collision against ProductVariant
    ProductVariant.exists = (filter) => {
      if (filter.sku) return Promise.resolve({ _id: new mongoose.Types.ObjectId() });
      return Promise.resolve(null);
    };

    try {
      await createProductVariant(req, res);
      assert.strictEqual(res.statusCode, 409);
      assert.match(res.bodyData.message, /already assigned to another variant/);
    } finally {
      Product.findOne = origProdFindOne;
      Product.exists = origProdExists;
      ProductVariant.exists = origVarExists;
    }
  });

  // ============================================================================
  // CATEGORY 5: Bulk Matrix Synchronization (Matrix Sync API)
  // ============================================================================
  console.log('\n--- CATEGORY 5: Bulk Matrix Synchronization (Matrix Sync API) ---');

  await runAsyncTest('5.1 bulkSaveProductVariants rejects intra-batch duplicate SKUs', async () => {
    const { req, res } = createMockContext({
      user: { tenantId },
      params: { productId: productId.toString() },
      body: {
        variantAttributeDefinitions: standardDefinitions,
        variants: [
          { sku: 'SAME-SKU', attributes: { Color: 'Red', Size: 'S' } },
          { sku: 'SAME-SKU', attributes: { Color: 'Blue', Size: 'M' } }
        ]
      }
    });

    const origProdFindOne = Product.findOne;
    Product.findOne = () => Promise.resolve({
      _id: productId,
      save: () => Promise.resolve()
    });

    try {
      await bulkSaveProductVariants(req, res);
      assert.strictEqual(res.statusCode, 400);
      assert.match(res.bodyData.message, /Duplicate SKU "SAME-SKU" detected within variant matrix/);
    } finally {
      Product.findOne = origProdFindOne;
    }
  });

  await runAsyncTest('5.2 bulkSaveProductVariants rejects intra-batch duplicate attribute combinations', async () => {
    const { req, res } = createMockContext({
      user: { tenantId },
      params: { productId: productId.toString() },
      body: {
        variantAttributeDefinitions: standardDefinitions,
        variants: [
          { sku: 'SKU-1', attributes: { Color: 'Red', Size: 'S' } },
          { sku: 'SKU-2', attributes: { Color: 'red', Size: 's' } } // Same signature
        ]
      }
    });

    const origProdFindOne = Product.findOne;
    Product.findOne = () => Promise.resolve({
      _id: productId,
      save: () => Promise.resolve()
    });

    try {
      await bulkSaveProductVariants(req, res);
      assert.strictEqual(res.statusCode, 400);
      assert.match(res.bodyData.message, /Duplicate attribute combination "color:red\|size:s" detected/);
    } finally {
      Product.findOne = origProdFindOne;
    }
  });

  await runAsyncTest('5.3 bulkSaveProductVariants synchronizes matrix items atomically', async () => {
    const { req, res } = createMockContext({
      user: { tenantId },
      params: { productId: productId.toString() },
      body: {
        variantAttributeDefinitions: standardDefinitions,
        variants: [
          { sku: 'POLO-RED-S', attributes: { Color: 'Red', Size: 'S' }, salesPrice: 40 },
          { sku: 'POLO-BLUE-M', attributes: { Color: 'Blue', Size: 'M' }, salesPrice: 45 }
        ]
      }
    });

    const origProdFindOne = Product.findOne;
    const origProdExists = Product.exists;
    const origVarExists = ProductVariant.exists;
    const origVarCreate = ProductVariant.create;

    Product.findOne = () => Promise.resolve({
      _id: productId,
      save: () => Promise.resolve()
    });

    Product.exists = () => Promise.resolve(null);
    ProductVariant.exists = () => Promise.resolve(null);

    const createdList = [];
    ProductVariant.create = (doc) => {
      createdList.push(doc);
      return Promise.resolve({ _id: new mongoose.Types.ObjectId(), ...doc });
    };

    try {
      await bulkSaveProductVariants(req, res);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.bodyData.success, true);
      assert.strictEqual(createdList.length, 2);
      assert.strictEqual(createdList[0].sku, 'POLO-RED-S');
      assert.strictEqual(createdList[1].sku, 'POLO-BLUE-M');
    } finally {
      Product.findOne = origProdFindOne;
      Product.exists = origProdExists;
      ProductVariant.exists = origVarExists;
      ProductVariant.create = origVarCreate;
    }
  });

  // ============================================================================
  // CATEGORY 6: Non-Variant Product Compatibility
  // ============================================================================
  console.log('\n--- CATEGORY 6: Non-Variant Product Compatibility ---');

  runTest('6.1 Standard non-variant products have hasVariants: false and pass schema validation', () => {
    const standardProd = new Product({
      tenantId,
      name: 'Standard Notebook',
      sku: 'NOTEBOOK-001',
      price: 15,
      categoryId,
      hasVariants: false
    });

    assert.strictEqual(standardProd.hasVariants, false);
    assert.strictEqual(standardProd.variantAttributeDefinitions.length, 0);
  });

  console.log('\n===============================================================');
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
  console.log(`Final Mongoose Connection State: ${mongoose.connection.readyState} (0 = Disconnected)`);
  console.log('Zero database connection was initiated. Zero writes performed.');
  console.log('===============================================================\n');
}

main().catch(err => {
  console.error('Phase 3 Test Suite Failed:', err);
  process.exit(1);
});

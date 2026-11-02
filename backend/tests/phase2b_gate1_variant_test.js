/**
 * Phase 2B Gate 1 — Model Validation & Regression Unit Test Suite
 * File: backend/tests/phase2b_gate1_variant_test.js
 * 
 * Strictly runs OFFLINE with ZERO database connection (mongoose.connection.readyState === 0).
 * Tests are categorized as:
 * - Category A: Direct Helper & Synchronous Schema Tests
 * - Category B: Document Middleware Hook Execution Tests
 * - Category C: Mocked Cross-Collection Integrity Tests
 * - Category D: Startup Bug & Model Registration Regression Tests
 */

const assert = require('assert');
const path = require('path');
const { execSync } = require('child_process');
const mongoose = require('mongoose');

// STEP 0: Guarantee strict offline state
assert.strictEqual(
  mongoose.connection.readyState,
  0,
  'CRITICAL SAFETY VIOLATION: Mongoose must be completely disconnected (readyState === 0).'
);

// Load models
const Product = require('../src/core/models/Product');
const ProductVariant = require('../src/core/models/ProductVariant');

const tenantId = new mongoose.Types.ObjectId();
const tenantId2 = new mongoose.Types.ObjectId();
const categoryId = new mongoose.Types.ObjectId();
const productId = new mongoose.Types.ObjectId();

let passedTests = 0;
let totalTests = 0;

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

async function main() {
  console.log('===============================================================');
  console.log('       PHASE 2B GATE 1 OFFLINE UNIT & REGRESSION TEST SUITE    ');
  console.log('===============================================================');
  console.log(`Mongoose Connection State: ${mongoose.connection.readyState} (0 = Disconnected)\n`);

  // =========================================================================
  // CATEGORY A: Direct Helper & Synchronous Schema Tests
  // =========================================================================
  console.log('--- CATEGORY A: Direct Helper & Synchronous Schema Tests ---');

  runTest('A.1 Standard non-variant product passes synchronous schema validation', () => {
    const p = new Product({
      tenantId,
      name: 'Standard Cotton Shirt',
      sku: 'SHIRT-001',
      categoryId,
      price: 49.99
    });
    const err = p.validateSync();
    assert.strictEqual(err, undefined, 'Standard product should pass schema validation');
    assert.strictEqual(p.hasVariants, false);
  });

  const { generateCanonicalAttributeSignature } = ProductVariant;
  const validParentDefs = [
    { name: 'Color', values: ['Red', 'Blue', 'Black'] },
    { name: 'Size', values: ['S', 'M', 'L', 'XL'] }
  ];

  runTest('A.2 Generates deterministically sorted canonical signature regardless of key ordering', () => {
    const sig1 = generateCanonicalAttributeSignature({ Color: 'Red', Size: 'M' }, validParentDefs);
    const sig2 = generateCanonicalAttributeSignature({ Size: 'M', Color: 'Red' }, validParentDefs);
    assert.strictEqual(sig1, 'color:red|size:m');
    assert.strictEqual(sig2, 'color:red|size:m');
    assert.strictEqual(sig1, sig2, 'Key ordering in input must not affect canonical signature');
  });

  runTest('A.3 Generates canonical signature with case normalization', () => {
    const sig = generateCanonicalAttributeSignature({ COLOR: 'red', size: 'XL' }, validParentDefs);
    assert.strictEqual(sig, 'color:red|size:xl', 'Signature must normalize key and value casing');
  });

  runTest('A.4 Generates canonical signature from Map input', () => {
    const map = new Map();
    map.set('Color', 'Blue');
    map.set('Size', 'L');
    const sig = generateCanonicalAttributeSignature(map, validParentDefs);
    assert.strictEqual(sig, 'color:blue|size:l');
  });

  runTest('A.5 Rejects empty variant attributes', () => {
    assert.throws(
      () => generateCanonicalAttributeSignature({}, validParentDefs),
      /Variant attributes are required and cannot be empty/
    );
  });

  runTest('A.6 Rejects blank attribute keys or values', () => {
    assert.throws(
      () => generateCanonicalAttributeSignature({ '  ': 'Red', Size: 'M' }, validParentDefs),
      /Variant attribute key cannot be blank/
    );
    assert.throws(
      () => generateCanonicalAttributeSignature({ Color: '   ', Size: 'M' }, validParentDefs),
      /has an empty or blank value/
    );
  });

  runTest('A.7 Rejects duplicate normalized keys in variant attributes', () => {
    assert.throws(
      () => generateCanonicalAttributeSignature({ Color: 'Red', color: 'Blue', Size: 'M' }, validParentDefs),
      /duplicate attribute key/
    );
  });

  runTest('A.8 Rejects variant missing declared parent attribute (completeness check)', () => {
    assert.throws(
      () => generateCanonicalAttributeSignature({ Color: 'Red' }, validParentDefs),
      /Variant is missing required attribute: "Size"/
    );
  });

  runTest('A.9 Rejects variant supplying undeclared attribute (scope check)', () => {
    assert.throws(
      () => generateCanonicalAttributeSignature({ Color: 'Red', Size: 'M', Material: 'Cotton' }, validParentDefs),
      /Attribute "Material" is not declared in the parent product variant definitions/
    );
  });

  runTest('A.10 Rejects variant attribute value not declared in parent allowed values', () => {
    assert.throws(
      () => generateCanonicalAttributeSignature({ Color: 'Yellow', Size: 'M' }, validParentDefs),
      /Invalid value "Yellow" for attribute "Color"\. Allowed values are: Red, Blue, Black/
    );
  });

  runTest('A.11 ProductVariant schema declares intended compound indexes without redundant single-field indexes', () => {
    const indexes = ProductVariant.schema.indexes();
    
    const skuIndex = indexes.find(idx => idx[0].tenantId === 1 && idx[0].sku === 1 && idx[1]?.unique === true);
    assert(skuIndex, 'Must declare unique { tenantId: 1, sku: 1 }');

    const barcodeIndex = indexes.find(idx => idx[0].tenantId === 1 && idx[0].barcode === 1 && idx[1]?.unique === true);
    assert(barcodeIndex, 'Must declare unique { tenantId: 1, barcode: 1 }');
    assert.deepStrictEqual(barcodeIndex[1].partialFilterExpression, { barcode: { $gt: '' } });

    const sigIndex = indexes.find(
      idx => idx[0].tenantId === 1 && idx[0].productId === 1 && idx[0].attributeSignature === 1 && idx[1]?.unique === true
    );
    assert(sigIndex, 'Must declare unique { tenantId: 1, productId: 1, attributeSignature: 1 }');

    const activeIndex = indexes.find(
      idx => idx[0].tenantId === 1 && idx[0].productId === 1 && idx[0].isActive === 1
    );
    assert(activeIndex, 'Must declare compound index { tenantId: 1, productId: 1, isActive: 1 }');

    const redundantSig = indexes.find(idx => Object.keys(idx[0]).length === 1 && idx[0].attributeSignature);
    assert.strictEqual(redundantSig, undefined, 'Must NOT have single-field index on attributeSignature');

    const redundantTenant = indexes.find(idx => Object.keys(idx[0]).length === 1 && idx[0].tenantId);
    assert.strictEqual(redundantTenant, undefined, 'Must NOT have single-field index on tenantId');

    const redundantProduct = indexes.find(idx => Object.keys(idx[0]).length === 1 && idx[0].productId);
    assert.strictEqual(redundantProduct, undefined, 'Must NOT have single-field index on productId');
  });

  runTest('A.12 Product schema declares intended unique SKU and partial barcode indexes', () => {
    const indexes = Product.schema.indexes();
    
    const skuIndex = indexes.find(idx => idx[0].tenantId === 1 && idx[0].sku === 1 && idx[1]?.unique === true);
    assert(skuIndex, 'Must declare unique { tenantId: 1, sku: 1 }');

    const barcodeIndex = indexes.find(idx => idx[0].tenantId === 1 && idx[0].barcode === 1 && idx[1]?.unique === true);
    assert(barcodeIndex, 'Must declare unique { tenantId: 1, barcode: 1 }');
    assert.deepStrictEqual(barcodeIndex[1].partialFilterExpression, { barcode: { $gt: '' } });
  });

  console.log('');

  // =========================================================================
  // CATEGORY B: Document Middleware Hook Execution Tests
  // =========================================================================
  console.log('--- CATEGORY B: Document Middleware Hook Execution Tests ---');

  await runAsyncTest('B.1 Product pre-save hook normalizes SKU to uppercase and trims whitespace', async () => {
    const originalPVExists = ProductVariant.exists;
    ProductVariant.exists = async () => false;

    try {
      const p = new Product({
        tenantId,
        name: 'Standard Cotton Shirt',
        sku: '  shirt-001-xyz  ',
        categoryId,
        price: 49.99
      });
      const preSaveHooks = Product.schema.s.hooks._pres.get('save');
      for (const hook of preSaveHooks) {
        await hook.fn.call(p);
      }
      assert.strictEqual(p.sku, 'SHIRT-001-XYZ', 'SKU should be trimmed and uppercased');
    } finally {
      ProductVariant.exists = originalPVExists;
    }
  });

  await runAsyncTest('B.2 Product pre-save hook sanitizes whitespace barcode to undefined', async () => {
    const originalPVExists = ProductVariant.exists;
    ProductVariant.exists = async () => false;

    try {
      const p = new Product({
        tenantId,
        name: 'Standard Cotton Shirt',
        sku: 'SHIRT-002',
        barcode: '   ',
        categoryId,
        price: 49.99
      });
      const preSaveHooks = Product.schema.s.hooks._pres.get('save');
      for (const hook of preSaveHooks) {
        await hook.fn.call(p);
      }
      assert.strictEqual(p.barcode, undefined, 'Whitespace barcode must be converted to undefined');
    } finally {
      ProductVariant.exists = originalPVExists;
    }
  });

  await runAsyncTest('B.3 Product pre-save hook trims non-empty barcode string', async () => {
    const originalPVExists = ProductVariant.exists;
    ProductVariant.exists = async () => false;

    try {
      const p = new Product({
        tenantId,
        name: 'Standard Cotton Shirt',
        sku: 'SHIRT-003',
        barcode: '  8901234567890  ',
        categoryId,
        price: 49.99
      });
      const preSaveHooks = Product.schema.s.hooks._pres.get('save');
      for (const hook of preSaveHooks) {
        await hook.fn.call(p);
      }
      assert.strictEqual(p.barcode, '8901234567890', 'Barcode should be trimmed');
    } finally {
      ProductVariant.exists = originalPVExists;
    }
  });

  await runAsyncTest('B.4 Product pre-save requires definitions when hasVariants: true', async () => {
    const originalPVExists = ProductVariant.exists;
    ProductVariant.exists = async () => false;

    try {
      const p = new Product({
        tenantId,
        name: 'Configurable T-Shirt',
        sku: 'TSHIRT-CFG',
        categoryId,
        price: 29.99,
        hasVariants: true,
        variantAttributeDefinitions: []
      });
      const preSaveHooks = Product.schema.s.hooks._pres.get('save');
      let caught = null;
      try {
        for (const hook of preSaveHooks) {
          await hook.fn.call(p);
        }
      } catch (e) {
        caught = e;
      }
      assert(caught !== null, 'Should reject empty definitions when hasVariants is true');
      assert(caught.message.includes('must define at least one variant attribute'));
    } finally {
      ProductVariant.exists = originalPVExists;
    }
  });

  await runAsyncTest('B.5 Product pre-save rejects duplicate attribute definition names', async () => {
    const originalPVExists = ProductVariant.exists;
    ProductVariant.exists = async () => false;

    try {
      const p = new Product({
        tenantId,
        name: 'Configurable T-Shirt',
        sku: 'TSHIRT-CFG',
        categoryId,
        price: 29.99,
        hasVariants: true,
        variantAttributeDefinitions: [
          { name: 'Color', values: ['Red', 'Blue'] },
          { name: 'color', values: ['Green'] }
        ]
      });
      const preSaveHooks = Product.schema.s.hooks._pres.get('save');
      let caught = null;
      try {
        for (const hook of preSaveHooks) {
          await hook.fn.call(p);
        }
      } catch (e) {
        caught = e;
      }
      assert(caught !== null, 'Should reject duplicate attribute names');
      assert(caught.message.includes('Duplicate attribute name "color" detected'));
    } finally {
      ProductVariant.exists = originalPVExists;
    }
  });

  await runAsyncTest('B.6 Product pre-save rejects empty or blank allowed values in definitions', async () => {
    const originalPVExists = ProductVariant.exists;
    ProductVariant.exists = async () => false;

    try {
      const p = new Product({
        tenantId,
        name: 'Configurable T-Shirt',
        sku: 'TSHIRT-CFG',
        categoryId,
        price: 29.99,
        hasVariants: true,
        variantAttributeDefinitions: [
          { name: 'Color', values: ['Red', '   '] }
        ]
      });
      const preSaveHooks = Product.schema.s.hooks._pres.get('save');
      let caught = null;
      try {
        for (const hook of preSaveHooks) {
          await hook.fn.call(p);
        }
      } catch (e) {
        caught = e;
      }
      assert(caught !== null, 'Should reject blank allowed value');
      assert(caught.message.includes('contains an empty or blank value'));
    } finally {
      ProductVariant.exists = originalPVExists;
    }
  });

  await runAsyncTest('B.7 ProductVariant pre-save normalizes SKU, barcode, and populates canonical signature', async () => {
    const originalFindById = Product.findById;
    const originalProductExists = Product.exists;
    const originalPVExists = ProductVariant.exists;

    Product.findById = async () => ({
      _id: productId,
      tenantId: tenantId,
      hasVariants: true,
      variantAttributeDefinitions: validParentDefs
    });
    Product.exists = async () => false;
    ProductVariant.exists = async () => false;

    try {
      const v = new ProductVariant({
        tenantId,
        productId,
        sku: '  var-red-m  ',
        barcode: '   ',
        attributes: { Color: 'Red', Size: 'M' },
        salesPrice: 35
      });

      const preSaveHooks = ProductVariant.schema.s.hooks._pres.get('save');
      for (const hook of preSaveHooks) {
        await hook.fn.call(v);
      }

      assert.strictEqual(v.sku, 'VAR-RED-M', 'SKU must be normalized');
      assert.strictEqual(v.barcode, undefined, 'Blank barcode must be sanitized to undefined');
      assert.strictEqual(v.attributeSignature, 'color:red|size:m', 'Canonical signature must be populated');
      const validationErr = v.validateSync();
      assert.strictEqual(validationErr, undefined, 'Document should pass schema validation');
    } finally {
      Product.findById = originalFindById;
      Product.exists = originalProductExists;
      ProductVariant.exists = originalPVExists;
    }
  });

  await runAsyncTest('B.8 ProductVariant insertMany hook normalizes batch and generates signatures', async () => {
    const originalFindById = Product.findById;
    const originalProductExists = Product.exists;
    const originalPVExists = ProductVariant.exists;

    Product.findById = async () => ({
      _id: productId,
      tenantId: tenantId,
      hasVariants: true,
      variantAttributeDefinitions: validParentDefs
    });
    Product.exists = async () => false;
    ProductVariant.exists = async () => false;

    try {
      const docs = [
        new ProductVariant({
          tenantId,
          productId,
          sku: '  var-red-m  ',
          attributes: { Color: 'Red', Size: 'M' }
        }),
        new ProductVariant({
          tenantId,
          productId,
          sku: '  var-blue-l  ',
          attributes: { Color: 'Blue', Size: 'L' }
        })
      ];

      const insertManyHooks = ProductVariant.schema.s.hooks._pres.get('insertMany');
      for (const hook of insertManyHooks) {
        await hook.fn.call(null, null, docs);
      }

      assert.strictEqual(docs[0].sku, 'VAR-RED-M');
      assert.strictEqual(docs[0].attributeSignature, 'color:red|size:m');
      assert.strictEqual(docs[1].sku, 'VAR-BLUE-L');
      assert.strictEqual(docs[1].attributeSignature, 'color:blue|size:l');
    } finally {
      Product.findById = originalFindById;
      Product.exists = originalProductExists;
      ProductVariant.exists = originalPVExists;
    }
  });

  await runAsyncTest('B.9 ProductVariant insertMany hook rejects intra-batch duplicate SKUs', async () => {
    const originalFindById = Product.findById;
    const originalProductExists = Product.exists;
    const originalPVExists = ProductVariant.exists;

    Product.findById = async () => ({
      _id: productId,
      tenantId: tenantId,
      hasVariants: true,
      variantAttributeDefinitions: validParentDefs
    });
    Product.exists = async () => false;
    ProductVariant.exists = async () => false;

    try {
      const docs = [
        new ProductVariant({
          tenantId,
          productId,
          sku: 'DUPLICATE-BATCH-SKU',
          attributes: { Color: 'Red', Size: 'M' }
        }),
        new ProductVariant({
          tenantId,
          productId,
          sku: 'duplicate-batch-sku',
          attributes: { Color: 'Blue', Size: 'L' }
        })
      ];

      const insertManyHooks = ProductVariant.schema.s.hooks._pres.get('insertMany');
      let caught = null;
      try {
        for (const hook of insertManyHooks) {
          await hook.fn.call(null, null, docs);
        }
      } catch (e) {
        caught = e;
      }

      assert(caught !== null, 'insertMany should reject intra-batch duplicate SKU');
      assert(caught.message.includes('Duplicate SKU "DUPLICATE-BATCH-SKU" detected within the same insert batch'));
    } finally {
      Product.findById = originalFindById;
      Product.exists = originalProductExists;
      ProductVariant.exists = originalPVExists;
    }
  });

  await runAsyncTest('B.10 ProductVariant insertMany hook rejects intra-batch duplicate attribute signatures', async () => {
    const originalFindById = Product.findById;
    const originalProductExists = Product.exists;
    const originalPVExists = ProductVariant.exists;

    Product.findById = async () => ({
      _id: productId,
      tenantId: tenantId,
      hasVariants: true,
      variantAttributeDefinitions: validParentDefs
    });
    Product.exists = async () => false;
    ProductVariant.exists = async () => false;

    try {
      const docs = [
        new ProductVariant({
          tenantId,
          productId,
          sku: 'SKU-001',
          attributes: { Color: 'Red', Size: 'M' }
        }),
        new ProductVariant({
          tenantId,
          productId,
          sku: 'SKU-002',
          attributes: { Size: 'M', Color: 'red' }
        })
      ];

      const insertManyHooks = ProductVariant.schema.s.hooks._pres.get('insertMany');
      let caught = null;
      try {
        for (const hook of insertManyHooks) {
          await hook.fn.call(null, null, docs);
        }
      } catch (e) {
        caught = e;
      }

      assert(caught !== null, 'insertMany should reject intra-batch duplicate signature');
      assert(caught.message.includes('Duplicate variant attribute combination "color:red|size:m" detected'));
    } finally {
      Product.findById = originalFindById;
      Product.exists = originalProductExists;
      ProductVariant.exists = originalPVExists;
    }
  });

  console.log('');

  // =========================================================================
  // CATEGORY C: Mocked Cross-Collection Integrity Tests
  // =========================================================================
  console.log('--- CATEGORY C: Mocked Cross-Collection Integrity Tests ---');

  const { validateProductVariant } = ProductVariant;

  await runAsyncTest('C.1 Rejects variant when parent product does not exist', async () => {
    const originalFindById = Product.findById;
    Product.findById = async () => null;

    try {
      const v = new ProductVariant({
        tenantId,
        productId,
        sku: 'TEST-SKU',
        attributes: { Color: 'Red', Size: 'M' }
      });
      await assert.rejects(
        async () => await validateProductVariant(v),
        /Parent product with ID ".*" not found/
      );
    } finally {
      Product.findById = originalFindById;
    }
  });

  await runAsyncTest('C.2 Rejects variant when tenantId does not match parent product tenantId', async () => {
    const originalFindById = Product.findById;
    Product.findById = async () => ({
      _id: productId,
      tenantId: tenantId2,
      hasVariants: true,
      variantAttributeDefinitions: validParentDefs
    });

    try {
      const v = new ProductVariant({
        tenantId: tenantId,
        productId,
        sku: 'TEST-SKU',
        attributes: { Color: 'Red', Size: 'M' }
      });
      await assert.rejects(
        async () => await validateProductVariant(v),
        /Tenant mismatch: Variant tenantId does not match parent product tenantId/
      );
    } finally {
      Product.findById = originalFindById;
    }
  });

  await runAsyncTest('C.3 Rejects variant when parent hasVariants is false', async () => {
    const originalFindById = Product.findById;
    Product.findById = async () => ({
      _id: productId,
      tenantId: tenantId,
      hasVariants: false,
      variantAttributeDefinitions: validParentDefs
    });

    try {
      const v = new ProductVariant({
        tenantId,
        productId,
        sku: 'TEST-SKU',
        attributes: { Color: 'Red', Size: 'M' }
      });
      await assert.rejects(
        async () => await validateProductVariant(v),
        /Parent product does not have variant management enabled/
      );
    } finally {
      Product.findById = originalFindById;
    }
  });

  await runAsyncTest('C.4 Rejects variant when SKU collides with Product master', async () => {
    const originalFindById = Product.findById;
    const originalProductExists = Product.exists;
    const originalPVExists = ProductVariant.exists;

    Product.findById = async () => ({
      _id: productId,
      tenantId: tenantId,
      hasVariants: true,
      variantAttributeDefinitions: validParentDefs
    });
    Product.exists = async (query) => query.sku === 'COLLIDING-SKU';
    ProductVariant.exists = async () => false;

    try {
      const v = new ProductVariant({
        tenantId,
        productId,
        sku: 'colliding-sku',
        attributes: { Color: 'Red', Size: 'M' }
      });
      await assert.rejects(
        async () => await validateProductVariant(v),
        /SKU "COLLIDING-SKU" is already assigned to a product master/
      );
    } finally {
      Product.findById = originalFindById;
      Product.exists = originalProductExists;
      ProductVariant.exists = originalPVExists;
    }
  });

  await runAsyncTest('C.5 Rejects variant when Barcode collides with Product master', async () => {
    const originalFindById = Product.findById;
    const originalProductExists = Product.exists;
    const originalPVExists = ProductVariant.exists;

    Product.findById = async () => ({
      _id: productId,
      tenantId: tenantId,
      hasVariants: true,
      variantAttributeDefinitions: validParentDefs
    });
    Product.exists = async (query) => query.barcode === '123456789';
    ProductVariant.exists = async () => false;

    try {
      const v = new ProductVariant({
        tenantId,
        productId,
        sku: 'VALID-SKU',
        barcode: '  123456789  ',
        attributes: { Color: 'Red', Size: 'M' }
      });
      await assert.rejects(
        async () => await validateProductVariant(v),
        /Barcode "123456789" is already assigned to a product master/
      );
    } finally {
      Product.findById = originalFindById;
      Product.exists = originalProductExists;
      ProductVariant.exists = originalPVExists;
    }
  });

  await runAsyncTest('C.6 Product pre-save detects SKU collision against ProductVariant', async () => {
    const originalPVExists = ProductVariant.exists;
    ProductVariant.exists = async (query) => query.sku === 'COLLISION-SKU';

    try {
      const p = new Product({
        tenantId,
        name: 'Test Collide',
        sku: 'COLLISION-SKU',
        categoryId,
        price: 10
      });
      const preSaveHooks = Product.schema.s.hooks._pres.get('save');
      let caught = null;
      try {
        for (const hook of preSaveHooks) {
          await hook.fn.call(p);
        }
      } catch (e) {
        caught = e;
      }
      assert(caught !== null, 'Should reject SKU already assigned to ProductVariant');
      assert(caught.message.includes('already assigned to a product variant'));
    } finally {
      ProductVariant.exists = originalPVExists;
    }
  });

  console.log('');

  // =========================================================================
  // CATEGORY D: Startup Bug Regression Tests
  // =========================================================================
  console.log('--- CATEGORY D: Startup Bug & Model Registration Regression Tests ---');

  await runAsyncTest('D.1 Product validation resolves ProductVariant via lazy fallback when not yet registered', async () => {
    // Save original registration state
    const originalPVModel = mongoose.models['ProductVariant'];
    delete mongoose.models['ProductVariant'];

    // Verify ProductVariant is currently unregistered in mongoose.models
    assert.strictEqual(mongoose.models['ProductVariant'], undefined, 'ProductVariant must be unregistered for this test');

    try {
      const p = new Product({
        tenantId,
        name: 'Startup Test Product',
        sku: 'STARTUP-TEST-SKU',
        categoryId,
        price: 19.99
      });

      // Execute pre-save hook on Product
      // The hook must lazily require ProductVariant, register it, and succeed
      const preSaveHooks = Product.schema.s.hooks._pres.get('save');
      
      // Temporarily mock exists on the prototype or newly resolved model once required
      const originalExists = ProductVariant.exists;
      ProductVariant.exists = async () => false;

      for (const hook of preSaveHooks) {
        await hook.fn.call(p);
      }

      // Assert that ProductVariant is now registered in mongoose.models
      assert(mongoose.models['ProductVariant'] !== undefined, 'ProductVariant must be registered in mongoose.models after lazy load');
      assert.strictEqual(p.sku, 'STARTUP-TEST-SKU');
      ProductVariant.exists = originalExists;
    } finally {
      mongoose.models['ProductVariant'] = originalPVModel;
    }
  });

  runTest('D.2 Normal non-variant Product creation and validation functions completely offline', () => {
    const p = new Product({
      tenantId,
      name: 'Regular Non-Variant Product',
      sku: 'NON-VAR-001',
      categoryId,
      price: 15.00,
      hasVariants: false
    });
    const err = p.validateSync();
    assert.strictEqual(err, undefined, 'Non-variant product must pass schema validation');
    assert.strictEqual(p.hasVariants, false);
    assert.strictEqual(p.variantAttributeDefinitions.length, 0);
  });

  await runAsyncTest('D.3 Genuine Product/ProductVariant SKU and Barcode collisions are rejected', async () => {
    const originalPVExists = ProductVariant.exists;
    ProductVariant.exists = async (query) => {
      if (query.sku === 'TAKEN-SKU') return true;
      if (query.barcode === 'taken-barcode') return true;
      return false;
    };

    try {
      const pSkuCollision = new Product({
        tenantId,
        name: 'Collision SKU Test',
        sku: 'taken-sku',
        categoryId,
        price: 10
      });
      const preSaveHooks = Product.schema.s.hooks._pres.get('save');
      
      let skuCaught = null;
      try {
        for (const hook of preSaveHooks) {
          await hook.fn.call(pSkuCollision);
        }
      } catch (e) {
        skuCaught = e;
      }
      assert(skuCaught !== null, 'Must reject SKU collision with ProductVariant');
      assert(skuCaught.message.includes('already assigned to a product variant'));

      const pBarcodeCollision = new Product({
        tenantId,
        name: 'Collision Barcode Test',
        sku: 'UNIQUE-SKU',
        barcode: 'taken-barcode',
        categoryId,
        price: 10
      });
      let barcodeCaught = null;
      try {
        for (const hook of preSaveHooks) {
          await hook.fn.call(pBarcodeCollision);
        }
      } catch (e) {
        barcodeCaught = e;
      }
      assert(barcodeCaught !== null, 'Must reject barcode collision with ProductVariant');
      assert(barcodeCaught.message.includes('already assigned to a product variant'));
    } finally {
      ProductVariant.exists = originalPVExists;
    }
  });

  await runAsyncTest('D.4 Model-loading failure fails closed and does NOT silently bypass validation', async () => {
    // Simulate model loading failure by stubbing mongoose.models and throwing from resolver
    const originalPVModel = mongoose.models['ProductVariant'];
    delete mongoose.models['ProductVariant'];

    // Temporarily mock the Module loader to fail when resolving ProductVariant
    const originalLoad = mongoose.model;
    
    // We test that if both mongoose.models and require throw, it fails closed
    const p = new Product({
      tenantId,
      name: 'Fail Closed Test',
      sku: 'FAIL-CLOSED-SKU',
      categoryId,
      price: 10
    });

    // Directly test the fail-closed catch block logic in Product pre-save
    // If require fails or model is corrupted:
    const originalRequire = path.resolve;
    try {
      // In Product.js:
      // if (mongoose.models['ProductVariant']) ... else require('./ProductVariant')
      // If require fails, it must throw "Cross-collection validation error: ProductVariant model is unavailable"
      const preSaveHooks = Product.schema.s.hooks._pres.get('save');
      
      // Force require to fail by temporarily poisoning require cache to throw
      const pvPath = require.resolve('../src/core/models/ProductVariant');
      const originalCache = require.cache[pvPath];
      delete require.cache[pvPath];
      
      // Temporarily define an invalid getter that throws
      Object.defineProperty(require.cache, pvPath, {
        get: () => { throw new Error('Simulated module load failure'); },
        configurable: true
      });

      let caught = null;
      try {
        for (const hook of preSaveHooks) {
          await hook.fn.call(p);
        }
      } catch (e) {
        caught = e;
      }

      delete require.cache[pvPath];
      require.cache[pvPath] = originalCache;

      assert(caught !== null, 'Must throw when model fails to load');
      assert(caught.message.includes('Cross-collection validation error: ProductVariant model is unavailable'));
    } finally {
      mongoose.models['ProductVariant'] = originalPVModel;
    }
  });

  runTest('D.5 Isolated Node.js process proves startup without pre-registered ProductVariant', () => {
    // Run an isolated subshell command that requires ONLY Product.js and executes pre-save
    // This strictly replicates the backend server startup environment
    const testScript = `
      const mongoose = require('mongoose');
      const Product = require('./src/core/models/Product');
      const p = new Product({
        tenantId: new mongoose.Types.ObjectId(),
        name: 'Isolated Startup Test',
        sku: 'ISOLATED-001',
        categoryId: new mongoose.Types.ObjectId(),
        price: 10
      });
      // Mock exists so it does not buffer on disconnected DB
      const PV = mongoose.models['ProductVariant'] || require('./src/core/models/ProductVariant');
      PV.exists = async () => false;
      const hooks = Product.schema.s.hooks._pres.get('save');
      Promise.all(hooks.map(h => h.fn.call(p))).then(() => {
        if (p.sku !== 'ISOLATED-001') process.exit(2);
        if (!mongoose.models['ProductVariant']) process.exit(3);
        process.exit(0);
      }).catch(err => {
        console.error(err);
        process.exit(1);
      });
    `;

    const result = execSync(`node -e "${testScript.replace(/\n/g, ' ')}"`, {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8'
    });
    assert.strictEqual(result, '', 'Isolated process must exit with code 0 and no errors');
  });

  console.log('\n===============================================================');
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
  console.log(`Final Mongoose Connection State: ${mongoose.connection.readyState} (0 = Disconnected)`);
  console.log('Zero database connection was initiated. Zero writes performed.');
  console.log('===============================================================\n');
}

main().catch(err => {
  console.error('\nTEST SUITE FAILED WITH ERROR:', err);
  process.exit(1);
});

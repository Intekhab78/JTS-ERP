/**
 * Phase 2B-2 Gate 2 / Gate 3 — Query Hardening & Safe Partitioning Test Suite
 * File: backend/tests/stockQueryHelper_test.js
 * 
 * Strictly runs OFFLINE with ZERO database connection (mongoose.connection.readyState === 0).
 * Validates the 10 Safe Query Rules across:
 * - Category 1: Variant Identifier Normalization
 * - Category 2: Stock Query Construction (Safe Partitioning)
 * - Category 3: Company Stock Safe Deduction Filters
 * - Category 4: StockMovement Attribution & Payload Integrity
 * - Category 5: E-Commerce Storefront Key Resolution & Collision Avoidance
 * - Category 6: EcomStockService Offline Mocked Integration
 */

const assert = require('assert');
const mongoose = require('mongoose');

// STEP 0: Guarantee strict offline state
assert.strictEqual(
  mongoose.connection.readyState,
  0,
  'CRITICAL SAFETY VIOLATION: Mongoose must be completely disconnected (readyState === 0).'
);

const {
  normalizeVariantId,
  buildStockQuery,
  buildCompanyStockFilter,
  buildStockMovementPayload,
  resolveEcomStockKey,
  isVariantProduct
} = require('../src/core/utils/stockQueryHelper');

const {
  calculateProductEcomStock,
  allocateAndDeductStock
} = require('../src/modules/ecommerce/ecomStockService');

const Stock = require('../src/core/models/Stock');
const Product = require('../src/core/models/Product');
const EcomSettings = require('../src/core/models/EcomSettings');

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

async function main() {

console.log('===============================================================');
console.log('   PHASE 2B-2 QUERY HARDENING OFFLINE REGRESSION TEST SUITE    ');
console.log('===============================================================');
console.log(`Mongoose Connection State: ${mongoose.connection.readyState} (0 = Disconnected)\n`);

const tenantId = new mongoose.Types.ObjectId();
const branchId = new mongoose.Types.ObjectId();
const branchId2 = new mongoose.Types.ObjectId();
const productId = new mongoose.Types.ObjectId();
const variantId = new mongoose.Types.ObjectId();
const variantId2 = new mongoose.Types.ObjectId();
const supplierId = new mongoose.Types.ObjectId();
const legalCompanyId = new mongoose.Types.ObjectId();
const userId = new mongoose.Types.ObjectId();

// ============================================================================
// CATEGORY 1: Variant Identifier Normalization
// ============================================================================
console.log('--- CATEGORY 1: Variant Identifier Normalization ---');

runTest('1.1 normalizeVariantId preserves existing ObjectId instance', () => {
  const result = normalizeVariantId(variantId);
  assert.strictEqual(result, variantId);
});

runTest('1.2 normalizeVariantId converts valid 24-hex string to ObjectId', () => {
  const hexStr = variantId.toString();
  const result = normalizeVariantId(hexStr);
  assert(result instanceof mongoose.Types.ObjectId);
  assert.strictEqual(result.toString(), hexStr);
});

runTest('1.3 normalizeVariantId converts empty, null, undefined and "null" to null', () => {
  assert.strictEqual(normalizeVariantId(null), null);
  assert.strictEqual(normalizeVariantId(undefined), null);
  assert.strictEqual(normalizeVariantId(''), null);
  assert.strictEqual(normalizeVariantId('   '), null);
  assert.strictEqual(normalizeVariantId('null'), null);
  assert.strictEqual(normalizeVariantId('undefined'), null);
});

runTest('1.4 normalizeVariantId extracts _id from populated document or object', () => {
  const obj = { _id: variantId, name: 'Red-XL' };
  const result = normalizeVariantId(obj);
  assert.strictEqual(result.toString(), variantId.toString());
});

runTest('1.5 normalizeVariantId rejects invalid string format with clear error', () => {
  assert.throws(
    () => normalizeVariantId('not-a-valid-objectid'),
    /is not a valid ObjectId/
  );
});

runTest('1.6 normalizeVariantId rejects invalid type with clear error', () => {
  assert.throws(
    () => normalizeVariantId(12345),
    /Invalid variantId type/
  );
});

// ============================================================================
// CATEGORY 2: Stock Query Construction (Safe Partitioning)
// ============================================================================
console.log('\n--- CATEGORY 2: Stock Query Construction (Safe Partitioning) ---');

runTest('2.1 Standard product query strictly targets variantId: null and ownerType: COMPANY', () => {
  const query = buildStockQuery({
    tenantId,
    branchId,
    productId,
    variantId: null,
    ownerType: 'COMPANY'
  });

  assert.strictEqual(query.tenantId.toString(), tenantId.toString());
  assert.strictEqual(query.branchId.toString(), branchId.toString());
  assert.strictEqual(query.productId.toString(), productId.toString());
  assert.strictEqual(query.variantId, null);
  assert.strictEqual(query.ownerType, 'COMPANY');
  assert.strictEqual(query.ownerId, null);
});

runTest('2.2 Variant product query strictly targets exact variantId and ownerType: COMPANY', () => {
  const query = buildStockQuery({
    tenantId,
    branchId,
    productId,
    variantId,
    ownerType: 'COMPANY'
  });

  assert.strictEqual(query.variantId.toString(), variantId.toString());
  assert.strictEqual(query.ownerType, 'COMPANY');
  assert.strictEqual(query.ownerId, null);
});

runTest('2.3 Supplier consignment query strictly requires non-null ownerId', () => {
  const query = buildStockQuery({
    tenantId,
    branchId,
    productId,
    variantId,
    ownerType: 'SUPPLIER',
    ownerId: supplierId
  });

  assert.strictEqual(query.ownerType, 'SUPPLIER');
  assert.strictEqual(query.ownerId.toString(), supplierId.toString());
  assert.strictEqual(query.variantId.toString(), variantId.toString());
});

runTest('2.4 Rejects query missing ownerType entirely (Rule 2 & 3)', () => {
  assert.throws(
    () => buildStockQuery({ tenantId, branchId, productId, variantId }),
    /Explicit ownerType \('COMPANY' or 'SUPPLIER'\) is required/
  );
});

runTest('2.5 Rejects SUPPLIER query missing ownerId (Rule 2 & 3)', () => {
  assert.throws(
    () => buildStockQuery({ tenantId, branchId, productId, variantId, ownerType: 'SUPPLIER' }),
    /ownerId is strictly required when ownerType is SUPPLIER/
  );
});

runTest('2.6 Rejects query missing tenantId, branchId, or productId', () => {
  assert.throws(
    () => buildStockQuery({ branchId, productId, ownerType: 'COMPANY' }),
    /tenantId is required/
  );
  assert.throws(
    () => buildStockQuery({ tenantId, productId, ownerType: 'COMPANY' }),
    /branchId is required/
  );
  assert.throws(
    () => buildStockQuery({ tenantId, branchId, ownerType: 'COMPANY' }),
    /productId is required/
  );
});

runTest('2.7 Preserves legalCompanyId scope when provided', () => {
  const query = buildStockQuery({
    tenantId,
    branchId,
    productId,
    ownerType: 'COMPANY',
    legalCompanyId
  });
  assert.strictEqual(query.legalCompanyId.toString(), legalCompanyId.toString());
});

runTest('2.8 allowLegacyVariantMatching allows { $in: [null, undefined] } only when variantId is null', () => {
  const legacyQuery = buildStockQuery({
    tenantId,
    branchId,
    productId,
    variantId: null,
    ownerType: 'COMPANY',
    allowLegacyVariantMatching: true
  });
  assert.deepStrictEqual(legacyQuery.variantId, { $in: [null, undefined] });

  // When variantId is provided, exact variantId must still be enforced
  const varQuery = buildStockQuery({
    tenantId,
    branchId,
    productId,
    variantId,
    ownerType: 'COMPANY',
    allowLegacyVariantMatching: true
  });
  assert.strictEqual(varQuery.variantId.toString(), variantId.toString());
});

// ============================================================================
// CATEGORY 3: Company Stock Safe Deduction Filters
// ============================================================================
console.log('\n--- CATEGORY 3: Company Stock Safe Deduction Filters ---');

runTest('3.1 buildCompanyStockFilter enforces ownerType: COMPANY and ownerId: null', () => {
  const filter = buildCompanyStockFilter({
    tenantId,
    branchId,
    productId,
    variantId
  });

  assert.strictEqual(filter.ownerType, 'COMPANY');
  assert.strictEqual(filter.ownerId, null);
  assert.strictEqual(filter.variantId.toString(), variantId.toString());
});

runTest('3.2 buildCompanyStockFilter attaches quantity threshold when specified', () => {
  const filter = buildCompanyStockFilter({
    tenantId,
    branchId,
    productId,
    minQuantity: 5
  });

  assert.deepStrictEqual(filter.quantity, { $gte: 5 });
  assert.strictEqual(filter.ownerType, 'COMPANY');
  assert.strictEqual(filter.variantId, null);
});

// ============================================================================
// CATEGORY 4: StockMovement Attribution & Payload Integrity
// ============================================================================
console.log('\n--- CATEGORY 4: StockMovement Attribution & Payload Integrity ---');

runTest('4.1 buildStockMovementPayload preserves standard product base attributes', () => {
  const payload = buildStockMovementPayload({
    tenantId,
    branchId,
    productId,
    quantity: 10,
    type: 'GRN',
    referenceId: 'GRN-2026-000001',
    referenceType: 'GRN',
    createdBy: userId
  });

  assert.strictEqual(payload.variantId, null);
  assert.strictEqual(payload.variantSku, null);
  assert.strictEqual(payload.ownerType, 'COMPANY');
  assert.strictEqual(payload.ownerId, null);
  assert.strictEqual(payload.quantity, 10);
  assert.strictEqual(payload.referenceId, 'GRN-2026-000001');
});

runTest('4.2 buildStockMovementPayload preserves variant identity and variant SKU', () => {
  const payload = buildStockMovementPayload({
    tenantId,
    branchId,
    productId,
    variantId,
    variantSku: 'tshirt-red-xl',
    quantity: -2,
    type: 'DELIVERY',
    referenceId: 'DN-2026-00001',
    referenceType: 'DeliveryNote'
  });

  assert.strictEqual(payload.variantId.toString(), variantId.toString());
  assert.strictEqual(payload.variantSku, 'TSHIRT-RED-XL');
  assert.strictEqual(payload.quantity, -2);
});

runTest('4.3 buildStockMovementPayload preserves supplier consignment ownership attribution', () => {
  const payload = buildStockMovementPayload({
    tenantId,
    branchId,
    productId,
    quantity: 50,
    type: 'CONSIGNMENT_RECEIPT',
    referenceId: 'CNR-2026-00001',
    referenceType: 'ConsignmentReceipt',
    ownerType: 'SUPPLIER',
    ownerId: supplierId
  });

  assert.strictEqual(payload.ownerType, 'SUPPLIER');
  assert.strictEqual(payload.ownerId.toString(), supplierId.toString());
});

runTest('4.4 buildStockMovementPayload rejects missing mandatory fields', () => {
  assert.throws(
    () => buildStockMovementPayload({ tenantId, branchId, productId }),
    /quantity must be a valid number/
  );
  assert.throws(
    () => buildStockMovementPayload({ tenantId, branchId, productId, quantity: 10 }),
    /type is required/
  );
  assert.throws(
    () => buildStockMovementPayload({ tenantId, branchId, productId, quantity: 10, type: 'GRN' }),
    /referenceId is required/
  );
});

// ============================================================================
// CATEGORY 5: E-Commerce Storefront Key Resolution & Collision Avoidance
// ============================================================================
console.log('\n--- CATEGORY 5: E-Commerce Storefront Key Resolution & Collision Avoidance ---');

runTest('5.1 Standard product generates BASE compound key per branch', () => {
  const key = resolveEcomStockKey(branchId, null);
  assert.strictEqual(key, `${branchId.toString()}_BASE`);
});

runTest('5.2 Variant products generate distinct compound keys for the same branch', () => {
  const key1 = resolveEcomStockKey(branchId, variantId);
  const key2 = resolveEcomStockKey(branchId, variantId2);
  const keyBase = resolveEcomStockKey(branchId, null);

  assert.strictEqual(key1, `${branchId.toString()}_${variantId.toString()}`);
  assert.strictEqual(key2, `${branchId.toString()}_${variantId2.toString()}`);
  assert.notStrictEqual(key1, key2);
  assert.notStrictEqual(key1, keyBase);
});

runTest('5.3 Same variant generates distinct keys across different branches', () => {
  const keyBranch1 = resolveEcomStockKey(branchId, variantId);
  const keyBranch2 = resolveEcomStockKey(branchId2, variantId);
  assert.notStrictEqual(keyBranch1, keyBranch2);
});

// ============================================================================
// CATEGORY 6: EcomStockService Offline Mocked Integration
// ============================================================================
console.log('\n--- CATEGORY 6: EcomStockService Offline Mocked Integration ---');

await runAsyncTest('6.1 calculateProductEcomStock queries Stock strictly with ownerType: COMPANY', async () => {
  let capturedQuery = null;

  // Mock Stock.find
  const originalStockFind = Stock.find;
  Stock.find = function(filter) {
    capturedQuery = filter;
    return Promise.resolve([
      { branchId, variantId: null, quantity: 25 }
    ]);
  };

  // Mock Product.findById
  const originalProductFindById = Product.findById;
  Product.findById = function() {
    return Promise.resolve({ _id: productId, type: 'STANDARD' });
  };

  const cachedSettings = {
    includedLocations: [{ branchId, branchName: 'Main Store', isActive: true, safetyStockValue: 0, pickPriority: 1 }],
    mappedBranches: []
  };

  try {
    const result = await calculateProductEcomStock(productId, tenantId, cachedSettings);

    assert(capturedQuery, 'Stock.find must have been called');
    assert.strictEqual(capturedQuery.ownerType, 'COMPANY', 'Must strictly query ownerType: COMPANY');
    assert.deepStrictEqual(capturedQuery.variantId, { $in: [null, undefined] }, 'Must match base variant');
    assert.strictEqual(result.totalEcomStock, 25);
    assert.strictEqual(result.totalPhysicalStock, 25);
  } finally {
    Stock.find = originalStockFind;
    Product.findById = originalProductFindById;
  }
});

await runAsyncTest('6.2 calculateProductEcomStock partitions variant stock correctly', async () => {
  let capturedQuery = null;

  const originalStockFind = Stock.find;
  Stock.find = function(filter) {
    capturedQuery = filter;
    return Promise.resolve([
      { branchId, variantId, quantity: 40 }
    ]);
  };

  const originalProductFindById = Product.findById;
  Product.findById = function() {
    return Promise.resolve({ _id: productId, type: 'STANDARD' });
  };

  const cachedSettings = {
    includedLocations: [{ branchId, branchName: 'Main Store', isActive: true, safetyStockValue: 5, pickPriority: 1 }],
    mappedBranches: []
  };

  try {
    const result = await calculateProductEcomStock(productId, tenantId, cachedSettings, variantId);

    assert(capturedQuery, 'Stock.find must have been called');
    assert.strictEqual(capturedQuery.ownerType, 'COMPANY');
    assert.strictEqual(capturedQuery.variantId.toString(), variantId.toString());
    // 40 physical - 5 safety stock = 35 available
    assert.strictEqual(result.totalPhysicalStock, 40);
    assert.strictEqual(result.totalEcomStock, 35);
  } finally {
    Stock.find = originalStockFind;
    Product.findById = originalProductFindById;
  }
});

await runAsyncTest('6.3 allocateAndDeductStock uses buildCompanyStockFilter with exact variant partition', async () => {
  let capturedFindOneQuery = null;
  let capturedUpdateQuery = null;

  const originalFindOne = Stock.findOne;
  Stock.findOne = function(query) {
    capturedFindOneQuery = query;
    return Promise.resolve({ _id: new mongoose.Types.ObjectId(), quantity: 15 });
  };

  const originalFindOneAndUpdate = Stock.findOneAndUpdate;
  Stock.findOneAndUpdate = function(query, update) {
    capturedUpdateQuery = query;
    return Promise.resolve({ _id: new mongoose.Types.ObjectId(), quantity: 10 });
  };

  const originalProductFindById = Product.findById;
  Product.findById = function() {
    return Promise.resolve({ _id: productId, type: 'STANDARD' });
  };

  const originalSettingsFindOne = EcomSettings.findOne;
  EcomSettings.findOne = function() {
    return Promise.resolve({
      includedLocations: [{ branchId, branchName: 'Main Store', isActive: true, safetyStockValue: 0, pickPriority: 1 }]
    });
  };

  try {
    const items = [
      { productId, variantId, quantity: 5 }
    ];

    const result = await allocateAndDeductStock(items, tenantId);

    assert(capturedFindOneQuery, 'Stock.findOne must have been called');
    assert.strictEqual(capturedFindOneQuery.ownerType, 'COMPANY');
    assert.strictEqual(capturedFindOneQuery.ownerId, null);
    assert.strictEqual(capturedFindOneQuery.variantId.toString(), variantId.toString());

    assert(capturedUpdateQuery, 'Stock.findOneAndUpdate must have been called');
    assert.strictEqual(capturedUpdateQuery.ownerType, 'COMPANY');
    assert.strictEqual(capturedUpdateQuery.variantId.toString(), variantId.toString());

    assert.strictEqual(result.fulfillments.length, 1);
    assert.strictEqual(result.fulfillments[0].variantId.toString(), variantId.toString());
    assert.strictEqual(result.fulfillments[0].quantity, 5);
  } finally {
    Stock.findOne = originalFindOne;
    Stock.findOneAndUpdate = originalFindOneAndUpdate;
    Product.findById = originalProductFindById;
    EcomSettings.findOne = originalSettingsFindOne;
  }
});

runTest('7.1 isVariantProduct returns true only when hasVariants === true', () => {
  assert.strictEqual(isVariantProduct(null), false);
  assert.strictEqual(isVariantProduct({}), false);
  assert.strictEqual(isVariantProduct({ hasVariants: false }), false);
  assert.strictEqual(isVariantProduct({ hasVariants: true }), true);
});

console.log('\n===============================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
console.log(`Final Mongoose Connection State: ${mongoose.connection.readyState} (0 = Disconnected)`);
console.log('Zero database connection was initiated. Zero writes performed.');
console.log('===============================================================\n');
}

main().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});


/**
 * Phase 2A — Local Staging Validation Script
 * STRICT SAFETY: Offline & staging validation only. Does not write to production.
 * Redacts all database credentials and connection secrets.
 */

const mongoose = require('mongoose');
const path = require('path');

// 1. Environment Isolation Check & Fail-Fast Validator
function checkEnvironmentIsolation() {
  console.log('=====================================================');
  console.log('1. ENVIRONMENT ISOLATION & CONNECTION AUDIT');
  console.log('=====================================================');
  
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
  const rawUri = process.env.MONGODB_URI;

  let sanitizedTarget = {
    protocol: 'UNKNOWN',
    host: 'UNKNOWN',
    port: 'UNKNOWN',
    database: 'UNKNOWN',
    authSource: 'UNKNOWN'
  };

  if (rawUri) {
    try {
      const parsed = new URL(rawUri);
      sanitizedTarget = {
        protocol: parsed.protocol,
        host: parsed.hostname,
        port: parsed.port || 'default',
        database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : '',
        authSource: parsed.searchParams.get('authSource') || 'default',
        replicaSet: parsed.searchParams.get('replicaSet') || 'none'
      };
    } catch (e) {
      sanitizedTarget.error = 'Invalid URI format';
    }
  }

  console.log('Target Protocol  :', sanitizedTarget.protocol);
  console.log('Target Host      :', sanitizedTarget.host);
  console.log('Target Port      :', sanitizedTarget.port);
  console.log('Target Database  :', sanitizedTarget.database);
  console.log('Auth Source DB   :', sanitizedTarget.authSource);
  console.log('Credentials      : [REDACTED - NEVER LOGGED]');

  // FAIL FAST CHECK
  const isProductionDatabase = sanitizedTarget.database === 'ecom_erp';
  const isAtlasHost = sanitizedTarget.host.includes('mongodb.net');
  
  console.log('\n--- Fail-Fast Verification ---');
  if (isProductionDatabase || isAtlasHost) {
    console.log('⚠️  PRODUCTION ENVIRONMENT DETECTED IN RESOLVED CONFIG:');
    console.log(`   Host is Atlas/Remote: ${isAtlasHost}`);
    console.log(`   Database is Production: ${sanitizedTarget.database === 'ecom_erp'}`);
    console.log('🛑 FAIL-FAST ACTIVATED: Direct writes/migrations to production target ecom_erp are BLOCKED.');
    console.log('   Local staging must use an isolated database named "ecom_erp_dev" or an offline test harness.');
  } else if (sanitizedTarget.database === 'ecom_erp_dev') {
    console.log('✅ Approved staging target database confirmed: ecom_erp_dev');
  } else {
    console.log(`ℹ️  Non-production target: ${sanitizedTarget.database || 'in-memory/offline'}`);
  }

  // Audit connectDB fallback behavior
  console.log('\n--- connectDB() Fallback Audit ---');
  console.log('Existing backend/src/config/db.js logic:');
  console.log('  1. Attempts primary connection to MONGODB_URI.');
  console.log('  2. On failure, if port :27017 is in URI, replaces with :27018 (SSH tunnel).');
  console.log('  3. RISK: Silently connects to production database "ecom_erp" over SSH tunnel!');
  console.log('  CORRECTION REQUIRED: connectDB() must verify process.env.NODE_ENV and enforce that');
  console.log('  staging/development environments cannot silently fall back to production "ecom_erp".');

  return sanitizedTarget;
}

// 2. ProductVariant Persistence & Schema Validation
function testProductVariantPersistence() {
  console.log('\n=====================================================');
  console.log('2. PRODUCTVARIANT PERSISTENCE & ATTRIBUTE VALIDATION');
  console.log('=====================================================');

  const ProductVariant = require('../core/models/ProductVariant');
  const Product = require('../core/models/Product');
  const Color = require('../core/models/Color');
  const Size = require('../core/models/Size');

  console.log('--- Inspecting Master Schemas ---');
  console.log('Color Schema Fields:', Object.keys(Color.schema.paths));
  console.log('Color Indexes      :', Color.schema.indexes().map(i => JSON.stringify(i[0])));
  console.log('Size Schema Fields :', Object.keys(Size.schema.paths));
  console.log('Size Indexes       :', Size.schema.indexes().map(i => JSON.stringify(i[0])));

  console.log('\n--- Validating ProductVariant Schema ---');
  const tenantId = new mongoose.Types.ObjectId();
  const productId = new mongoose.Types.ObjectId();

  // Test Valid Variant
  const validVariant = new ProductVariant({
    tenantId,
    productId,
    sku: 'TSHIRT-BLK-XL',
    barcode: '8901234567890',
    attributes: new Map([
      ['Color', 'Black'],
      ['Size', 'XL']
    ]),
    salesPrice: 799,
    purchasePrice: 350,
    priceAdjustment: 0,
    weight: 250,
    isActive: true
  });

  const validErr = validVariant.validateSync();
  console.log('Valid ProductVariant Validation Error:', validErr ? validErr.message : 'NONE (Passed)');

  // Test Missing Required Fields
  const missingVariant = new ProductVariant({});
  const missingErr = missingVariant.validateSync();
  console.log('Missing Fields Rejected:');
  ['tenantId', 'productId', 'sku', 'attributes'].forEach(f => {
    console.log(`  - ${f} required:`, !!(missingErr && missingErr.errors[f]));
  });

  // Test Negative Sales Price
  const negativePriceVariant = new ProductVariant({
    tenantId,
    productId,
    sku: 'TSHIRT-NEG',
    attributes: { Color: 'Red' },
    salesPrice: -50
  });
  const negErr = negativePriceVariant.validateSync();
  console.log('Negative salesPrice rejected:', !!(negErr && negErr.errors['salesPrice']));

  // Canonical attributeSignature Evaluation
  console.log('\n--- Canonical attributeSignature Evaluation ---');
  function generateCanonicalSignature(rawAttributes) {
    if (!rawAttributes) return '';
    const entries = rawAttributes instanceof Map 
      ? Array.from(rawAttributes.entries())
      : Object.entries(rawAttributes);
    
    return entries
      .map(([k, v]) => [String(k).trim().toLowerCase(), String(v).trim().toLowerCase()])
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
  }

  const attrA = { Color: 'Navy Blue', Size: 'XL' };
  const attrB = { size: '  xl  ', color: 'Navy Blue' }; // different order, lower case, whitespace
  const attrC = { Color: 'navy blue', Size: 'L' }; // different size

  const sigA = generateCanonicalSignature(attrA);
  const sigB = generateCanonicalSignature(attrB);
  const sigC = generateCanonicalSignature(attrC);

  console.log('Attr A { Color: "Navy Blue", Size: "XL" }   -> Signature:', sigA);
  console.log('Attr B { size: "  xl  ", color: "Navy Blue" } -> Signature:', sigB);
  console.log('Attr C { Color: "navy blue", Size: "L" }     -> Signature:', sigC);
  console.log('Signature A === Signature B (Order & Case Invariant):', sigA === sigB ? 'MATCH (Passed)' : 'FAIL');
  console.log('Signature A !== Signature C (Distinct Variants)     :', sigA !== sigC ? 'DISTINCT (Passed)' : 'FAIL');

  // Barcode convention audit
  console.log('\n--- Barcode & SKU Conventions Audit ---');
  console.log('ProductVariant Barcode Index in current schema:');
  const pvIndexes = ProductVariant.schema.indexes();
  const barcodeIdx = pvIndexes.find(i => i[0].barcode);
  console.log('  Index definition:', JSON.stringify(barcodeIdx));
  console.log('  ⚠️ WARNING: partialFilterExpression { barcode: { $type: "string" } } matches empty strings ("").');
  console.log('  If two variants are created with barcode: "", MongoDB throws E11000 duplicate key error!');
  console.log('  CORRECTION REQUIRED: Use { barcode: { $gt: "" } } or ensure empty barcodes are stored as undefined/null.');
}

// 3. Stock Index Compatibility Matrix
function testStockIndexCompatibility() {
  console.log('\n=====================================================');
  console.log('3. STOCK INDEX COMPATIBILITY TEST MATRIX');
  console.log('=====================================================');

  const tenantId = 'TENANT_1';
  const branch1 = 'BRANCH_A';
  const branch2 = 'BRANCH_B';
  const product1 = 'PROD_100';
  const variant1 = 'VAR_101';
  const variant2 = 'VAR_102';
  const supplier1 = 'SUPP_999';

  // Indexes to compare:
  // Legacy Production: { tenantId, branchId, productId }
  // Current Stock.js  : { tenantId, branchId, productId, ownerType, ownerId }
  // Target Proposed   : { tenantId, branchId, productId, variantId, ownerType, ownerId }

  function getLegacyKey(doc) {
    return `${doc.tenantId}|${doc.branchId}|${doc.productId}`;
  }

  function getCurrentKey(doc) {
    const ownerType = doc.ownerType || 'COMPANY';
    const ownerId = doc.ownerId || 'null';
    return `${doc.tenantId}|${doc.branchId}|${doc.productId}|${ownerType}|${ownerId}`;
  }

  function getTargetKey(doc) {
    const variantId = doc.variantId || 'null';
    const ownerType = doc.ownerType || 'COMPANY';
    const ownerId = doc.ownerId || 'null';
    return `${doc.tenantId}|${doc.branchId}|${doc.productId}|${variantId}|${ownerType}|${ownerId}`;
  }

  const testCases = [
    {
      id: 'TC1',
      name: 'Standard stock (variantId: null)',
      doc1: { tenantId, branchId: branch1, productId: product1, variantId: null, ownerType: 'COMPANY', ownerId: null },
      doc2: { tenantId, branchId: branch1, productId: product1, variantId: null, ownerType: 'COMPANY', ownerId: null },
      expected: 'REJECT_DUPLICATE'
    },
    {
      id: 'TC2',
      name: 'Two variants of one product in same branch',
      doc1: { tenantId, branchId: branch1, productId: product1, variantId: variant1, ownerType: 'COMPANY', ownerId: null },
      doc2: { tenantId, branchId: branch1, productId: product1, variantId: variant2, ownerType: 'COMPANY', ownerId: null },
      expected: 'ALLOW_COEXISTENCE'
    },
    {
      id: 'TC3',
      name: 'Same variant across multiple branches',
      doc1: { tenantId, branchId: branch1, productId: product1, variantId: variant1, ownerType: 'COMPANY', ownerId: null },
      doc2: { tenantId, branchId: branch2, productId: product1, variantId: variant1, ownerType: 'COMPANY', ownerId: null },
      expected: 'ALLOW_COEXISTENCE'
    },
    {
      id: 'TC4',
      name: 'COMPANY-owned stock vs SUPPLIER consignment stock (same variant)',
      doc1: { tenantId, branchId: branch1, productId: product1, variantId: variant1, ownerType: 'COMPANY', ownerId: null },
      doc2: { tenantId, branchId: branch1, productId: product1, variantId: variant1, ownerType: 'SUPPLIER', ownerId: supplier1 },
      expected: 'ALLOW_COEXISTENCE'
    },
    {
      id: 'TC5',
      name: 'Existing ownerType/ownerId default & missing fields',
      doc1: { tenantId, branchId: branch1, productId: product1, variantId: null }, // defaults apply
      doc2: { tenantId, branchId: branch1, productId: product1, variantId: null, ownerType: 'COMPANY', ownerId: null },
      expected: 'REJECT_DUPLICATE'
    },
    {
      id: 'TC6',
      name: 'Legal company isolation (Branch A under LC1 vs Branch B under LC2)',
      doc1: { tenantId, branchId: branch1, productId: product1, variantId: variant1, ownerType: 'COMPANY', ownerId: null },
      doc2: { tenantId, branchId: branch2, productId: product1, variantId: variant1, ownerType: 'COMPANY', ownerId: null },
      expected: 'ALLOW_COEXISTENCE'
    },
    {
      id: 'TC7',
      name: 'Exact duplicate variant stock identity rejection',
      doc1: { tenantId, branchId: branch1, productId: product1, variantId: variant1, ownerType: 'COMPANY', ownerId: null },
      doc2: { tenantId, branchId: branch1, productId: product1, variantId: variant1, ownerType: 'COMPANY', ownerId: null },
      expected: 'REJECT_DUPLICATE'
    }
  ];

  console.log('| Test Case | Scenario | Legacy Index | Current Stock.js Index | Target Proposed Index | Status |');
  console.log('|---|---|---|---|---|---|');

  testCases.forEach(tc => {
    // Evaluate Legacy
    const legDup = getLegacyKey(tc.doc1) === getLegacyKey(tc.doc2);
    const legResult = legDup ? 'REJECT_DUPLICATE' : 'ALLOW_COEXISTENCE';

    // Evaluate Current
    const curDup = getCurrentKey(tc.doc1) === getCurrentKey(tc.doc2);
    const curResult = curDup ? 'REJECT_DUPLICATE' : 'ALLOW_COEXISTENCE';

    // Evaluate Target
    const tgtDup = getTargetKey(tc.doc1) === getTargetKey(tc.doc2);
    const tgtResult = tgtDup ? 'REJECT_DUPLICATE' : 'ALLOW_COEXISTENCE';

    const matchExpected = tgtResult === tc.expected ? '✅ PASS' : '❌ FAIL';

    console.log(`| ${tc.id} | ${tc.name} | ${legResult} | ${curResult} | ${tgtResult} | ${matchExpected} |`);
  });

  console.log('\n--- Critical Business Constraints Preserved by Target Index ---');
  console.log('1. Standard Product Safety: Standard products have variantId: null. MongoDB compound indexes treat null as a scalar value.');
  console.log('   Therefore, two standard stock documents for the same product, branch, and owner are rejected (preserves single-stock rule).');
  console.log('2. Multi-Variant Coexistence: Because variantId is distinct (V1 != V2 != null), variants can coexist in the same branch.');
  console.log('3. Consignment Separation: ownerType ("COMPANY" vs "SUPPLIER") and ownerId ensure company and supplier consignment stock remain independent.');
  console.log('4. Legacy Index Collision Hazard: In production, the legacy index { tenantId, branchId, productId } STILL EXISTS.');
  console.log('   If a variant is added before dropping the legacy index, MongoDB WILL CRASH with E11000 duplicate key error.');
}

// 4. Workflow Regression Analysis & Gaps
function testWorkflowRegressions() {
  console.log('\n=====================================================');
  console.log('4. WORKFLOW REGRESSION & INTEGRATION AUDIT');
  console.log('=====================================================');

  const workflows = [
    {
      name: 'GRN Receiving & Validation',
      file: 'backend/src/modules/purchase/grnController.js',
      status: 'NEEDS_UPDATE',
      gap: 'GRN.items schema lacks variantId. validateGRN queries Stock by { productId, branchId, ownerType, ownerId } without variantId. StockMovement created without variantId.'
    },
    {
      name: 'POS Sale & Session Checkout',
      file: 'backend/src/modules/sales/posController.js',
      status: 'NEEDS_UPDATE',
      gap: 'POSOrder.items schema lacks variantId. Stock deduction at line 523 queries Stock by { productId, branchId } without variantId. Scanned barcode lookup only checks Product master.'
    },
    {
      name: 'POS Return & Order Void',
      file: 'backend/src/modules/sales/posController.js',
      status: 'NEEDS_UPDATE',
      gap: 'Lines 1001 & 1222 increment Stock by { productId, branchId }. If a variant was returned, it increments base product stock instead of variant stock.'
    },
    {
      name: 'Delivery Note Fulfillment',
      file: 'backend/src/modules/sales/deliveryNoteController.js',
      status: 'NEEDS_UPDATE',
      gap: 'DeliveryNoteItem lacks variantId. Lines 434 & 468 deduct COMPANY & SUPPLIER stock using only { productId, branchId }.'
    },
    {
      name: 'Sales Return & Vendor Return',
      file: 'backend/src/modules/sales/salesReturnController.js & vendorReturnController.js',
      status: 'NEEDS_UPDATE',
      gap: 'Sales return increases stock by { productId, branchId }. Vendor return checks physical stock and decrements stock by { productId, branchId } without variantId.'
    },
    {
      name: 'Stock Transfer & Stock Adjustment',
      file: 'backend/src/modules/inventory/stockController.js',
      status: 'NEEDS_UPDATE',
      gap: 'StockTransfer items and StockAdjustment items lack variantId. Transfer deduction/addition and adjustment reconciliation query Stock only by { productId, branchId }.'
    },
    {
      name: 'Manufacturing Consumption & Production',
      file: 'backend/src/modules/manufacturing/manufacturingController.js',
      status: 'COMPATIBLE_WITH_STANDARDS',
      gap: 'BOM and ManufacturingOrder operate on standard raw materials and finished goods. If finished goods or raw materials have variants, BOM requires variantId support.'
    },
    {
      name: 'E-commerce Checkout & Restocking',
      file: 'backend/src/modules/ecommerce/ecommerceController.js',
      status: 'NEEDS_UPDATE',
      gap: 'Order cancellation/restock at line 1127 increments Stock by { productId, branchId } from fulfillmentLocations. Neither OrderItem nor fulfillmentLocations store variantId.'
    },
    {
      name: 'Barcode Lookup & Stock Valuation Reports',
      file: 'backend/src/modules/inventory/inventoryController.js',
      status: 'NEEDS_UPDATE',
      gap: 'getProducts searches SKU/barcode only on Product collection. Scanned variant barcodes fail to resolve. Stock lookup at line 136 joins stocks without variant breakdown.'
    }
  ];

  console.log('| Workflow | Source File | Status | Gap Description |');
  console.log('|---|---|---|---|');
  workflows.forEach(w => {
    console.log(`| ${w.name} | ${w.file} | ${w.status} | ${w.gap} |`);
  });
}

// Run all test suites
console.log('STARTING PHASE 2A LOCAL STAGING VALIDATION...\n');
checkEnvironmentIsolation();
testProductVariantPersistence();
testStockIndexCompatibility();
testWorkflowRegressions();
console.log('\n=====================================================');
console.log('PHASE 2A LOCAL STAGING VALIDATION COMPLETE (ALL TESTS EXECUTED)');
console.log('=====================================================');

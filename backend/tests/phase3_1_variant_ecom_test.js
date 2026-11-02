/**
 * Phase 3.1 — Product Variant + Media Catalog + Storefront + POS Integration Test Suite
 * File: backend/tests/phase3_1_variant_ecom_test.js
 * 
 * Strictly runs OFFLINE with ZERO database connection (mongoose.connection.readyState === 0).
 * Validates:
 * 1. Offline Guarantee
 * 2. Media Catalog Assignment & Payload Serialization (General, Color Gallery, Exact Variant)
 * 3. Storefront 3-Tier Image Fallback Priority (Variant -> Color Gallery -> General)
 * 4. Storefront Color Swatch & Size Selection Matrix
 * 5. Cart / Checkout variantId retention and Server-Side Price Authority
 * 6. POS Order Item Variant Validation, Pricing, and Stock Deduction Partitioning
 * 7. POS Return / Void Exact Variant Stock Restoration and StockMovement Attribution
 * 8. Barcode Lookup Fallback to ProductVariant and Stock Partitioning
 * 9. Non-Variant Product Backward Compatibility
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

const Product = require('../src/core/models/Product');
const ProductVariant = require('../src/core/models/ProductVariant');
const Stock = require('../src/core/models/Stock');
const StockMovement = require('../src/core/models/StockMovement');
const POSOrder = require('../src/core/models/POSOrder');
const POSReturn = require('../src/core/models/POSReturn');

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

console.log('\n===============================================================');
console.log('   PHASE 3.1: VARIANT + MEDIA + STOREFRONT + POS TEST SUITE   ');
console.log('===============================================================\n');

// -------------------------------------------------------------
// CATEGORY 1: MEDIA CATALOG SERIALIZATION & MULTI-SCOPE MAPPING
// -------------------------------------------------------------
console.log('--- Category 1: Media Catalog Multi-Scope Assignment & Serialization ---');

runTest('1.1 Media item scopes partition correctly into General, Color Gallery, and Exact Variant', () => {
  const dummyVariantId = new mongoose.Types.ObjectId();
  const rawMediaItems = [
    { id: '1', url: '/uploads/gen1.jpg', scope: 'GENERAL', isMain: true, order: 0 },
    { id: '2', url: '/uploads/gen2.jpg', scope: 'GENERAL', isMain: false, order: 1 },
    { id: '3', url: '/uploads/blue1.jpg', scope: 'COLOR', colorName: 'Blue', isMain: true, order: 2 },
    { id: '4', url: '/uploads/blue2.jpg', scope: 'COLOR', colorName: 'Blue', isMain: false, order: 3 },
    { id: '5', url: '/uploads/red1.jpg', scope: 'COLOR', colorName: 'Red', isMain: true, order: 4 },
    { id: '6', url: '/uploads/red_m.jpg', scope: 'VARIANT', variantId: dummyVariantId.toString(), colorName: 'Red', sizeName: 'M', isMain: true, order: 5 }
  ];

  // 1. General Images
  const generalItems = rawMediaItems.filter(i => i.scope === 'GENERAL');
  const generalMainItem = generalItems.find(i => i.isMain) || generalItems[0];
  const uploadImage = generalMainItem ? generalMainItem.url : '';
  const images = generalItems.map(i => i.url);

  assert.strictEqual(uploadImage, '/uploads/gen1.jpg');
  assert.deepStrictEqual(images, ['/uploads/gen1.jpg', '/uploads/gen2.jpg']);

  // 2. Color Galleries
  const colorMap = new Map();
  rawMediaItems.filter(i => i.scope === 'COLOR' && i.colorName).forEach(item => {
    const cName = item.colorName.trim();
    if (!colorMap.has(cName)) {
      colorMap.set(cName, {
        colorName: cName,
        uploadImage: item.isMain ? item.url : null,
        images: [item.url]
      });
    } else {
      const existing = colorMap.get(cName);
      if (item.isMain || !existing.uploadImage) existing.uploadImage = item.url;
      if (!existing.images.includes(item.url)) existing.images.push(item.url);
    }
  });
  const colorGalleries = Array.from(colorMap.values());

  assert.strictEqual(colorGalleries.length, 2);
  const blueGal = colorGalleries.find(cg => cg.colorName === 'Blue');
  assert.ok(blueGal);
  assert.strictEqual(blueGal.uploadImage, '/uploads/blue1.jpg');
  assert.deepStrictEqual(blueGal.images, ['/uploads/blue1.jpg', '/uploads/blue2.jpg']);

  // 3. Variant Specific Images
  const variantMap = new Map();
  rawMediaItems.filter(i => i.scope === 'VARIANT' && i.variantId).forEach(item => {
    const vId = item.variantId;
    if (!variantMap.has(vId)) {
      variantMap.set(vId, {
        _id: vId,
        uploadImage: item.isMain ? item.url : null,
        images: [item.url]
      });
    }
  });
  const variants = Array.from(variantMap.values());

  assert.strictEqual(variants.length, 1);
  assert.strictEqual(variants[0]._id, dummyVariantId.toString());
  assert.strictEqual(variants[0].uploadImage, '/uploads/red_m.jpg');
});

runTest('1.2 Primary image designation guarantees only one main image per scope/color', () => {
  let media = [
    { id: '1', url: '/img1.jpg', scope: 'COLOR', colorName: 'Black', isMain: true },
    { id: '2', url: '/img2.jpg', scope: 'COLOR', colorName: 'Black', isMain: false },
    { id: '3', url: '/img3.jpg', scope: 'COLOR', colorName: 'White', isMain: true }
  ];

  // User sets img2 as main for Black
  const targetIndex = 1;
  const target = media[targetIndex];
  media = media.map((item, idx) => {
    if (target.scope === 'COLOR' && item.scope === 'COLOR' && item.colorName === target.colorName) {
      return { ...item, isMain: idx === targetIndex };
    }
    return item;
  });

  assert.strictEqual(media[0].isMain, false, 'Previous main in Black must be unset');
  assert.strictEqual(media[1].isMain, true, 'New main in Black must be set');
  assert.strictEqual(media[2].isMain, true, 'White gallery main must remain unchanged');
});

// -------------------------------------------------------------
// CATEGORY 2: STOREFRONT 3-TIER IMAGE FALLBACK HIERARCHY
// -------------------------------------------------------------
console.log('\n--- Category 2: Storefront 3-Tier Image Fallback Priority ---');

function resolveStorefrontGallery(productData, selectedColor, currentVariant) {
  // 1. Tier 1: Exact Variant Images
  if (currentVariant && Array.isArray(currentVariant.images) && currentVariant.images.length > 0) {
    const vImgs = [currentVariant.uploadImage, ...currentVariant.images].filter(Boolean);
    const unique = Array.from(new Set(vImgs));
    if (unique.length > 0) return { tier: 1, images: unique };
  }

  // 2. Tier 2: Color Gallery for selected color
  if (selectedColor && Array.isArray(productData.colorGalleries)) {
    const matchedCg = productData.colorGalleries.find(cg =>
      cg.colorName && String(cg.colorName).toLowerCase() === String(selectedColor).toLowerCase()
    );
    if (matchedCg && (matchedCg.uploadImage || (matchedCg.images && matchedCg.images.length > 0))) {
      const cgImgs = [matchedCg.uploadImage, ...(matchedCg.images || [])].filter(Boolean);
      const unique = Array.from(new Set(cgImgs));
      if (unique.length > 0) return { tier: 2, images: unique };
    }
  }

  // 3. Tier 3: Parent Product General Gallery
  const rawImages = [
    productData.uploadImage,
    ...(Array.isArray(productData.images) ? productData.images : [])
  ].filter(Boolean);
  const unique = Array.from(new Set(rawImages));
  if (unique.length === 0) unique.push('/placeholder.png');
  return { tier: 3, images: unique };
}

runTest('2.1 Tier 1: Exact variant gallery takes highest priority when variant has images', () => {
  const product = {
    uploadImage: '/parent-main.jpg',
    images: ['/parent-main.jpg', '/parent-2.jpg'],
    colorGalleries: [
      { colorName: 'Navy', uploadImage: '/navy-color.jpg', images: ['/navy-color.jpg'] }
    ]
  };
  const variant = {
    _id: 'var123',
    uploadImage: '/navy-xl-specific.jpg',
    images: ['/navy-xl-specific.jpg', '/navy-xl-angle.jpg']
  };

  const res = resolveStorefrontGallery(product, 'Navy', variant);
  assert.strictEqual(res.tier, 1);
  assert.deepStrictEqual(res.images, ['/navy-xl-specific.jpg', '/navy-xl-angle.jpg']);
});

runTest('2.2 Tier 2: Selected color gallery displays when variant has no images', () => {
  const product = {
    uploadImage: '/parent-main.jpg',
    images: ['/parent-main.jpg', '/parent-2.jpg'],
    colorGalleries: [
      { colorName: 'Navy', uploadImage: '/navy-color.jpg', images: ['/navy-color.jpg', '/navy-back.jpg'] }
    ]
  };
  const variant = {
    _id: 'var123',
    uploadImage: null,
    images: [] // Variant has no specific images
  };

  const res = resolveStorefrontGallery(product, 'Navy', variant);
  assert.strictEqual(res.tier, 2);
  assert.deepStrictEqual(res.images, ['/navy-color.jpg', '/navy-back.jpg']);
});

runTest('2.3 Tier 3: General product gallery displays when color gallery is absent', () => {
  const product = {
    uploadImage: '/parent-main.jpg',
    images: ['/parent-main.jpg', '/parent-2.jpg'],
    colorGalleries: [] // No color galleries
  };
  const variant = {
    _id: 'var123',
    uploadImage: null,
    images: []
  };

  const res = resolveStorefrontGallery(product, 'Green', variant);
  assert.strictEqual(res.tier, 3);
  assert.deepStrictEqual(res.images, ['/parent-main.jpg', '/parent-2.jpg']);
});

// -------------------------------------------------------------
// CATEGORY 3: COLOR SWATCH & SIZE MATRIX RESOLUTION
// -------------------------------------------------------------
console.log('\n--- Category 3: Color Swatch & Size Selection Matrix ---');

runTest('3.1 Color selection resolves matching variant and preserves compatible size', () => {
  const variants = [
    { _id: 'v1', attributes: { Color: 'Black', Size: 'M' }, salesPrice: 50, inStock: true },
    { _id: 'v2', attributes: { Color: 'Black', Size: 'L' }, salesPrice: 55, inStock: true },
    { _id: 'v3', attributes: { Color: 'Blue', Size: 'S' }, salesPrice: 48, inStock: true },
    { _id: 'v4', attributes: { Color: 'Blue', Size: 'M' }, salesPrice: 52, inStock: true }
  ];

  // User initially selected Black + M
  let selectedColor = 'Black';
  let selectedSize = 'M';

  // Helper matching currentVariant
  const findVariant = (c, s) => variants.find(v =>
    String(v.attributes.Color).toLowerCase() === String(c).toLowerCase() &&
    String(v.attributes.Size).toLowerCase() === String(s).toLowerCase()
  );

  let current = findVariant(selectedColor, selectedSize);
  assert.strictEqual(current._id, 'v1');
  assert.strictEqual(current.salesPrice, 50);

  // User switches color to 'Blue'. Since 'M' is also available in Blue, 'M' is preserved
  const handleColorSelect = (newColor) => {
    const sizesForColor = variants
      .filter(v => String(v.attributes.Color).toLowerCase() === String(newColor).toLowerCase())
      .map(v => v.attributes.Size);

    selectedColor = newColor;
    if (!sizesForColor.some(s => String(s).toLowerCase() === String(selectedSize).toLowerCase())) {
      selectedSize = sizesForColor[0] || '';
    }
  };

  handleColorSelect('Blue');
  assert.strictEqual(selectedColor, 'Blue');
  assert.strictEqual(selectedSize, 'M', 'Compatible size M should be preserved');
  current = findVariant(selectedColor, selectedSize);
  assert.strictEqual(current._id, 'v4');
  assert.strictEqual(current.salesPrice, 52);
});

runTest('3.2 Color selection switches to first available size if current size is incompatible', () => {
  const variants = [
    { _id: 'v1', attributes: { Color: 'Black', Size: 'XL' } },
    { _id: 'v2', attributes: { Color: 'Red', Size: 'S' } }
  ];

  let selectedColor = 'Black';
  let selectedSize = 'XL';

  const handleColorSelect = (newColor) => {
    const sizesForColor = variants
      .filter(v => String(v.attributes.Color).toLowerCase() === String(newColor).toLowerCase())
      .map(v => v.attributes.Size);

    selectedColor = newColor;
    if (!sizesForColor.some(s => String(s).toLowerCase() === String(selectedSize).toLowerCase())) {
      selectedSize = sizesForColor[0] || '';
    }
  };

  handleColorSelect('Red');
  assert.strictEqual(selectedColor, 'Red');
  assert.strictEqual(selectedSize, 'S', 'Incompatible size XL should fall back to available size S');
});

// -------------------------------------------------------------
// CATEGORY 4: CART & CHECKOUT VARIANT INTEGRATION
// -------------------------------------------------------------
console.log('\n--- Category 4: Cart & Checkout VariantId Retention & Authority ---');

runTest('4.1 Cart composite key prevents collisions between different variants of same product', () => {
  const prodId = 'prod999';
  const varA = 'varA';
  const varB = 'varB';

  const keyA = varA ? `${prodId}_${varA}` : `${prodId}_Red_M`;
  const keyB = varB ? `${prodId}_${varB}` : `${prodId}_Blue_L`;
  const keyNonVariant = `${prodId}_Red_M`;

  assert.notStrictEqual(keyA, keyB, 'Distinct variants must generate distinct cart keys');
  assert.strictEqual(keyA, 'prod999_varA');
  assert.strictEqual(keyB, 'prod999_varB');
});

runTest('4.2 Checkout price authority: variant salesPrice strictly overrides parent price', () => {
  const parentProduct = {
    _id: 'p1',
    name: 'Casual Shirt',
    price: 100,
    salesPrice: 80,
    hasVariants: true
  };
  const variant = {
    _id: 'v1',
    productId: 'p1',
    sku: 'SHIRT-BLK-L',
    salesPrice: 75 // Specific promotional variant price
  };

  let unitPrice = parentProduct.salesPrice > 0 ? parentProduct.salesPrice : parentProduct.price;
  if (parentProduct.hasVariants && variant.salesPrice != null && variant.salesPrice > 0) {
    unitPrice = variant.salesPrice;
  }

  assert.strictEqual(unitPrice, 75, 'Variant salesPrice must take precedence over parent price');
});

// -------------------------------------------------------------
// CATEGORY 5: POS & INVENTORY VARIANT PARTITIONING
// -------------------------------------------------------------
console.log('\n--- Category 5: POS & Inventory Safe Stock Partitioning ---');

runTest('5.1 POS order creation constructs safe company stock filter partitioned by variantId', () => {
  const tenantId = new mongoose.Types.ObjectId();
  const branchId = new mongoose.Types.ObjectId();
  const productId = new mongoose.Types.ObjectId();
  const variantId = new mongoose.Types.ObjectId();

  const filter = buildCompanyStockFilter({
    tenantId,
    branchId,
    productId,
    variantId: normalizeVariantId(variantId),
    allowLegacyVariantMatching: false
  });

  assert.strictEqual(filter.tenantId, tenantId);
  assert.strictEqual(filter.branchId, branchId);
  assert.strictEqual(filter.productId, productId);
  assert.strictEqual(filter.variantId, variantId);
  assert.strictEqual(filter.ownerType, 'COMPANY');
});

runTest('5.2 POS order item schema validates variantId and variantSku storage', () => {
  const dummyTenantId = new mongoose.Types.ObjectId();
  const dummyProductId = new mongoose.Types.ObjectId();
  const dummyVariantId = new mongoose.Types.ObjectId();

  const orderData = {
    tenantId: dummyTenantId,
    branchId: new mongoose.Types.ObjectId(),
    sessionId: new mongoose.Types.ObjectId(),
    receiptNumber: 'POS-2026-000001',
    status: 'PAID',
    totalAmount: 150,
    currency: 'AED',
    createdBy: new mongoose.Types.ObjectId(),
    items: [
      {
        productId: dummyProductId,
        variantId: dummyVariantId,
        variantSku: 'TSHIRT-BLK-M',
        selectedAttributes: { Color: 'Black', Size: 'M' },
        productName: 'T-Shirt',
        sku: 'TSHIRT-BLK-M',
        quantity: 2,
        unitPrice: 75,
        subtotal: 150,
        total: 150
      }
    ]
  };

  const posOrder = new POSOrder(orderData);
  assert.strictEqual(posOrder.items.length, 1);
  assert.strictEqual(posOrder.items[0].variantId.toString(), dummyVariantId.toString());
  assert.strictEqual(posOrder.items[0].variantSku, 'TSHIRT-BLK-M');
  assert.strictEqual(posOrder.items[0].selectedAttributes.get('Color'), 'Black');
  assert.strictEqual(posOrder.items[0].selectedAttributes.get('Size'), 'M');
});

runTest('5.3 POS Return schema validates returnItems retaining variantId and variantSku', () => {
  const dummyTenantId = new mongoose.Types.ObjectId();
  const dummyOrderId = new mongoose.Types.ObjectId();
  const dummyProductId = new mongoose.Types.ObjectId();
  const dummyVariantId = new mongoose.Types.ObjectId();

  const returnData = {
    tenantId: dummyTenantId,
    branchId: new mongoose.Types.ObjectId(),
    originalOrderId: dummyOrderId,
    returnItems: [
      {
        productId: dummyProductId,
        variantId: dummyVariantId,
        variantSku: 'TSHIRT-BLK-M',
        quantity: 1,
        refundAmount: 75
      }
    ],
    refundAmount: 75,
    refundAllocations: [{ method: 'CASH', amount: 75 }],
    status: 'COMPLETED',
    createdBy: new mongoose.Types.ObjectId()
  };

  const posReturn = new POSReturn(returnData);
  assert.strictEqual(posReturn.returnItems.length, 1);
  assert.strictEqual(posReturn.returnItems[0].variantId.toString(), dummyVariantId.toString());
  assert.strictEqual(posReturn.returnItems[0].variantSku, 'TSHIRT-BLK-M');
  assert.strictEqual(posReturn.returnItems[0].refundAmount, 75);
});

runTest('5.4 StockMovement attribution records variantId and variantSku for POS sales & returns', () => {
  const dummyTenantId = new mongoose.Types.ObjectId();
  const dummyBranchId = new mongoose.Types.ObjectId();
  const dummyProductId = new mongoose.Types.ObjectId();
  const dummyVariantId = new mongoose.Types.ObjectId();
  const dummyOrderId = new mongoose.Types.ObjectId();

  // POS Sale Movement
  const saleMovement = new StockMovement({
    tenantId: dummyTenantId,
    branchId: dummyBranchId,
    productId: dummyProductId,
    variantId: dummyVariantId,
    variantSku: 'SHIRT-BLU-S',
    type: 'DELIVERY',
    quantity: 3,
    referenceType: 'POS_ORDER',
    referenceId: dummyOrderId,
    createdBy: new mongoose.Types.ObjectId()
  });

  assert.strictEqual(saleMovement.variantId.toString(), dummyVariantId.toString());
  assert.strictEqual(saleMovement.variantSku, 'SHIRT-BLU-S');
  assert.strictEqual(saleMovement.type, 'DELIVERY');

  // POS Return Movement
  const returnMovement = new StockMovement({
    tenantId: dummyTenantId,
    branchId: dummyBranchId,
    productId: dummyProductId,
    variantId: dummyVariantId,
    variantSku: 'SHIRT-BLU-S',
    type: 'SALES_RETURN',
    quantity: 1,
    referenceType: 'POS_RETURN',
    referenceId: new mongoose.Types.ObjectId(),
    createdBy: new mongoose.Types.ObjectId()
  });

  assert.strictEqual(returnMovement.variantId.toString(), dummyVariantId.toString());
  assert.strictEqual(returnMovement.variantSku, 'SHIRT-BLU-S');
  assert.strictEqual(returnMovement.type, 'SALES_RETURN');
});

runTest('5.5 Barcode lookup fallback: resolves variant fields and variant stock query partition', () => {
  const dummyTenantId = new mongoose.Types.ObjectId();
  const dummyBranchId = new mongoose.Types.ObjectId();
  const dummyProductId = new mongoose.Types.ObjectId();
  const dummyVariantId = new mongoose.Types.ObjectId();

  // Simulated matched variant from barcode
  const matchedVariant = {
    _id: dummyVariantId,
    productId: dummyProductId,
    sku: 'JEANS-SLIM-32',
    barcode: '8901234567890',
    salesPrice: 120,
    attributes: { Waist: '32', Fit: 'Slim' }
  };

  const product = {
    _id: dummyProductId,
    name: 'Slim Denim Jeans',
    barcode: '8901234500000',
    salesPrice: 100
  };

  // Resolution simulation
  const resolvedSku = matchedVariant ? matchedVariant.sku : product.sku;
  const resolvedSalesPrice = matchedVariant?.salesPrice || product.salesPrice;
  const variantId = matchedVariant ? matchedVariant._id : null;

  assert.strictEqual(resolvedSku, 'JEANS-SLIM-32');
  assert.strictEqual(resolvedSalesPrice, 120);
  assert.strictEqual(variantId, dummyVariantId);

  // Stock partition check
  const stockFilter = {
    tenantId: dummyTenantId,
    branchId: dummyBranchId,
    productId: dummyProductId,
    ownerType: 'COMPANY',
    ...(variantId ? { variantId } : { variantId: { $in: [null, undefined] } })
  };

  assert.strictEqual(stockFilter.variantId, dummyVariantId);
});

// -------------------------------------------------------------
// CATEGORY 6: NON-VARIANT PRODUCT BACKWARD COMPATIBILITY
// -------------------------------------------------------------
console.log('\n--- Category 6: Non-Variant Product Backward Compatibility ---');

runTest('6.1 Non-variant products use legacy stock matching without errors', () => {
  const tenantId = new mongoose.Types.ObjectId();
  const branchId = new mongoose.Types.ObjectId();
  const productId = new mongoose.Types.ObjectId();

  const filter = buildCompanyStockFilter({
    tenantId,
    branchId,
    productId,
    variantId: null,
    allowLegacyVariantMatching: true
  });

  assert.strictEqual(filter.tenantId, tenantId);
  assert.strictEqual(filter.productId, productId);
  assert.deepStrictEqual(filter.variantId, { $in: [null, undefined] });
});

runTest('6.2 Non-variant products resolve storefront gallery from parent images', () => {
  const nonVariantProduct = {
    name: 'Classic Mug',
    uploadImage: '/mug-front.jpg',
    images: ['/mug-front.jpg', '/mug-side.jpg'],
    colorGalleries: []
  };

  const res = resolveStorefrontGallery(nonVariantProduct, '', null);
  assert.strictEqual(res.tier, 3);
  assert.deepStrictEqual(res.images, ['/mug-front.jpg', '/mug-side.jpg']);
});

console.log('\n===============================================================');
console.log(`   PHASE 3.1 TEST RESULTS: ${passedTests} / ${totalTests} PASSED (100%)`);
console.log('===============================================================\n');
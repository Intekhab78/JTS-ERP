const mongoose = require('mongoose');

/**
 * Concurrency & Write Path Limitations:
 * 1. Application-level pre-save and pre-insertMany cross-collection checks (Product vs ProductVariant)
 *    are susceptible to TOCTOU (Time-of-Check to Time-of-Use) race conditions under high concurrency.
 *    MongoDB does not enforce cross-collection unique constraints natively.
 * 2. Mongoose middleware (pre-save, pre-insertMany) is bypassed by direct query updates:
 *    findOneAndUpdate, updateOne, updateMany, replaceOne, and bulkWrite.
 *    Direct query writes must not be used for SKU/barcode/attribute modifications;
 *    updates must flow through validated document save() or centralized service layers.
 * 3. Unique compound index { tenantId: 1, productId: 1, attributeSignature: 1 } strictly guarantees
 *    that no duplicate variant combinations can be committed to the database per parent product.
 */

const productVariantSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Tenant ID is required']
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product reference is required']
  },
  sku: {
    type: String,
    required: [true, 'Variant SKU is required'],
    trim: true
  },
  barcode: {
    type: String,
    trim: true
  },
  // Key-value pairs for variant attributes, e.g. { Color: 'Red', Size: 'XL' }
  attributes: {
    type: Map,
    of: String,
    required: [true, 'Variant attributes are required']
  },
  // Canonical deterministically sorted attribute signature e.g. "color:red|size:xl"
  attributeSignature: {
    type: String,
    required: [true, 'Canonical attribute signature is required']
  },
  salesPrice: {
    type: Number,
    min: [0, 'Sales price cannot be negative'],
    default: null
  },
  purchasePrice: {
    type: Number,
    min: [0, 'Purchase price cannot be negative'],
    default: null
  },
  priceAdjustment: {
    type: Number,
    default: 0
  },
  uploadImage: {
    type: String,
    default: null
  },
  images: [{
    type: String
  }],
  weight: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

/**
 * Helper to safely extract key-value pairs from either a MongooseMap or a plain JS object.
 */
function extractAttributes(attrInput) {
  if (!attrInput) return null;
  if (attrInput instanceof Map || (typeof attrInput.entries === 'function' && typeof attrInput.get === 'function')) {
    const obj = {};
    for (const [k, v] of attrInput.entries()) {
      obj[k] = v;
    }
    return obj;
  }
  if (typeof attrInput === 'object') {
    return { ...attrInput };
  }
  return null;
}

/**
 * Validates variant attributes and generates a canonical, deterministic attribute signature.
 * 
 * Rules enforced:
 * - Variant attributes cannot be empty.
 * - Attribute keys cannot be blank.
 * - Attribute values cannot be blank or non-string/number.
 * - Rejects duplicate normalized keys (e.g. { Color: 'Red', color: 'Blue' }).
 * - Parent must have declared variantAttributeDefinitions.
 * - Completeness check: Variant must supply all declared parent attributes.
 * - Completeness check: Variant cannot supply attributes undeclared in the parent.
 * - Allowed values check: Variant attribute values must exist in parent's declared allowed values.
 * - Generates sorted "normKey:normVal|normKey2:normVal2" string.
 */
function generateCanonicalAttributeSignature(attributes, variantAttributeDefinitions) {
  const attrObj = extractAttributes(attributes);
  if (!attrObj || typeof attrObj !== 'object' || Object.keys(attrObj).length === 0) {
    throw new Error('Variant attributes are required and cannot be empty.');
  }

  if (!Array.isArray(variantAttributeDefinitions) || variantAttributeDefinitions.length === 0) {
    throw new Error('Parent product does not define any variant attributes.');
  }

  // Build normalized lookup map from parent definitions
  const defMap = new Map();
  for (const def of variantAttributeDefinitions) {
    if (!def || !def.name || typeof def.name !== 'string' || def.name.trim() === '') {
      throw new Error('Parent attribute definition contains an invalid or blank name.');
    }
    const normDefName = def.name.trim().toLowerCase();
    if (defMap.has(normDefName)) {
      throw new Error(`Parent product has duplicate attribute definition: "${def.name.trim()}".`);
    }
    if (!Array.isArray(def.values) || def.values.length === 0) {
      throw new Error(`Parent attribute definition "${def.name.trim()}" has no declared allowed values.`);
    }

    const allowedNormVals = new Set();
    const allowedDisplayVals = [];
    for (const v of def.values) {
      if (typeof v === 'string' && v.trim() !== '') {
        allowedNormVals.add(v.trim().toLowerCase());
        allowedDisplayVals.push(v.trim());
      }
    }
    defMap.set(normDefName, {
      originalName: def.name.trim(),
      allowedNormVals,
      allowedDisplayVals
    });
  }

  // Parse and check variant attributes
  const variantNormEntries = new Map();
  for (const [key, val] of Object.entries(attrObj)) {
    if (!key || typeof key !== 'string' || key.trim() === '') {
      throw new Error('Variant attribute key cannot be blank.');
    }
    const normKey = key.trim().toLowerCase();
    if (variantNormEntries.has(normKey)) {
      throw new Error(`Variant has duplicate attribute key "${key.trim()}".`);
    }

    if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
      throw new Error(`Variant attribute "${key.trim()}" has an empty or blank value.`);
    }
    if (typeof val !== 'string' && typeof val !== 'number') {
      throw new Error(`Variant attribute "${key.trim()}" must have a string value.`);
    }

    const cleanVal = String(val).trim();
    const normVal = cleanVal.toLowerCase();
    variantNormEntries.set(normKey, { originalKey: key.trim(), originalVal: cleanVal, normVal });
  }

  // Completeness check 1: Variant must supply all declared parent attributes
  for (const [normDefName, defData] of defMap.entries()) {
    if (!variantNormEntries.has(normDefName)) {
      throw new Error(`Variant is missing required attribute: "${defData.originalName}". All parent attributes must be specified.`);
    }
  }

  // Completeness check 2: Variant cannot supply attributes undeclared in parent
  for (const [normKey, varData] of variantNormEntries.entries()) {
    if (!defMap.has(normKey)) {
      throw new Error(`Attribute "${varData.originalKey}" is not declared in the parent product variant definitions.`);
    }
    // Allowed values check
    const defData = defMap.get(normKey);
    if (!defData.allowedNormVals.has(varData.normVal)) {
      throw new Error(`Invalid value "${varData.originalVal}" for attribute "${defData.originalName}". Allowed values are: ${defData.allowedDisplayVals.join(', ')}.`);
    }
  }

  // Deterministically sort keys and build canonical signature
  const sortedKeys = Array.from(variantNormEntries.keys()).sort();
  const signatureParts = sortedKeys.map(k => {
    const vData = variantNormEntries.get(k);
    return `${k}:${vData.normVal}`;
  });

  return signatureParts.join('|');
}

/**
 * Validates a variant document, normalizes fields, checks parent integrity,
 * computes the canonical signature, and performs cross-collection uniqueness checks.
 */
async function validateProductVariant(doc) {
  // 1. SKU Normalization
  if (doc.sku) {
    doc.sku = String(doc.sku).trim().toUpperCase();
  }

  // 2. Barcode Sanitization (convert empty/whitespace strings to undefined)
  if (doc.barcode === '' || (typeof doc.barcode === 'string' && doc.barcode.trim() === '')) {
    doc.barcode = undefined;
  } else if (typeof doc.barcode === 'string') {
    doc.barcode = doc.barcode.trim();
  }

  // 3. Fail-closed cross-collection check: verify Product model is available
  let Product;
  try {
    if (mongoose.models['Product']) {
      Product = mongoose.models['Product'];
    } else {
      Product = require('./Product');
      if (Product && !mongoose.models['Product']) {
        mongoose.models['Product'] = Product;
      }
    }
  } catch (err) {
    throw new Error(`Cross-collection validation error: Product model is unavailable: ${err.message}`);
  }

  if (!Product) {
    throw new Error('Cross-collection validation error: Product model is not registered.');
  }

  // 4. Fetch parent product and validate existence, tenantId, and hasVariants
  if (!doc.productId) {
    throw new Error('Product reference (productId) is required.');
  }

  const parent = await Product.findById(doc.productId);
  if (!parent) {
    throw new Error(`Parent product with ID "${doc.productId}" not found.`);
  }

  if (String(parent.tenantId) !== String(doc.tenantId)) {
    throw new Error('Tenant mismatch: Variant tenantId does not match parent product tenantId.');
  }

  if (!parent.hasVariants) {
    throw new Error('Parent product does not have variant management enabled (hasVariants must be true).');
  }

  // 5. Generate and assign canonical attribute signature
  doc.attributeSignature = generateCanonicalAttributeSignature(doc.attributes, parent.variantAttributeDefinitions);

  // 6. Cross-collection uniqueness checks against Product master
  if (doc.sku) {
    const productSkuConflict = await Product.exists({ tenantId: doc.tenantId, sku: doc.sku });
    if (productSkuConflict) {
      throw new Error(`SKU "${doc.sku}" is already assigned to a product master.`);
    }
  }

  if (doc.barcode) {
    const productBarcodeConflict = await Product.exists({ tenantId: doc.tenantId, barcode: doc.barcode });
    if (productBarcodeConflict) {
      throw new Error(`Barcode "${doc.barcode}" is already assigned to a product master.`);
    }
  }

  // 7. Same-collection defense-in-depth uniqueness checks
  let ProductVariant;
  try {
    ProductVariant = (doc.constructor && typeof doc.constructor.exists === 'function')
      ? doc.constructor
      : (mongoose.models['ProductVariant'] || mongoose.model('ProductVariant'));
  } catch (_) {
    ProductVariant = mongoose.models['ProductVariant'];
  }

  if (ProductVariant && typeof ProductVariant.exists === 'function') {
    if (doc.sku) {
      const querySku = { tenantId: doc.tenantId, sku: doc.sku };
      if (doc._id) querySku._id = { $ne: doc._id };
      const variantSkuConflict = await ProductVariant.exists(querySku);
      if (variantSkuConflict) {
        throw new Error(`SKU "${doc.sku}" is already assigned to another variant.`);
      }
    }

    if (doc.barcode) {
      const queryBarcode = { tenantId: doc.tenantId, barcode: doc.barcode };
      if (doc._id) queryBarcode._id = { $ne: doc._id };
      const variantBarcodeConflict = await ProductVariant.exists(queryBarcode);
      if (variantBarcodeConflict) {
        throw new Error(`Barcode "${doc.barcode}" is already assigned to another variant.`);
      }
    }

    if (doc.attributeSignature) {
      const querySig = {
        tenantId: doc.tenantId,
        productId: doc.productId,
        attributeSignature: doc.attributeSignature
      };
      if (doc._id) querySig._id = { $ne: doc._id };
      const variantSigConflict = await ProductVariant.exists(querySig);
      if (variantSigConflict) {
        throw new Error(`A variant with the combination "${doc.attributeSignature}" already exists for this product.`);
      }
    }
  }
}

// Pre-save middleware
productVariantSchema.pre('save', async function() {
  await validateProductVariant(this);
});

// Pre-insertMany middleware for batch operations
productVariantSchema.pre('insertMany', async function(next, docs) {
  const actualDocs = Array.isArray(next) ? next : docs;
  if (!Array.isArray(actualDocs) || actualDocs.length === 0) {
    if (typeof next === 'function') return next();
    return;
  }

  const batchSkus = new Set();
  const batchBarcodes = new Set();
  const batchSignatures = new Set();

  for (const doc of actualDocs) {
    await validateProductVariant(doc);

    // Intra-batch uniqueness validation
    if (doc.sku) {
      const skuKey = `${doc.tenantId}_${doc.sku}`;
      if (batchSkus.has(skuKey)) {
        throw new Error(`Duplicate SKU "${doc.sku}" detected within the same insert batch.`);
      }
      batchSkus.add(skuKey);
    }

    if (doc.barcode) {
      const barcodeKey = `${doc.tenantId}_${doc.barcode}`;
      if (batchBarcodes.has(barcodeKey)) {
        throw new Error(`Duplicate Barcode "${doc.barcode}" detected within the same insert batch.`);
      }
      batchBarcodes.add(barcodeKey);
    }

    if (doc.attributeSignature) {
      const sigKey = `${doc.tenantId}_${doc.productId}_${doc.attributeSignature}`;
      if (batchSignatures.has(sigKey)) {
        throw new Error(`Duplicate variant attribute combination "${doc.attributeSignature}" detected within the same insert batch.`);
      }
      batchSignatures.add(sigKey);
    }
  }

  if (typeof next === 'function') next();
});

// Static helper attachments for service and testing accessibility
productVariantSchema.statics.generateCanonicalAttributeSignature = generateCanonicalAttributeSignature;
productVariantSchema.statics.validateProductVariant = validateProductVariant;

// Ensure SKU is unique per tenant
productVariantSchema.index({ tenantId: 1, sku: 1 }, { unique: true });

// Ensure barcode is unique per tenant if provided as a non-empty string
productVariantSchema.index(
  { tenantId: 1, barcode: 1 },
  {
    unique: true,
    partialFilterExpression: { barcode: { $gt: '' } }
  }
);

// Compound unique index for variant combination per product within a tenant
productVariantSchema.index(
  { tenantId: 1, productId: 1, attributeSignature: 1 },
  { unique: true }
);

// Compound index for querying variants belonging to a specific product within a tenant
productVariantSchema.index({ tenantId: 1, productId: 1, isActive: 1 });

module.exports = mongoose.model('ProductVariant', productVariantSchema);

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    trim: true
  },
  sku: {
    type: String,
    required: [true, 'Please add a SKU'],
    trim: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  type: {
    type: String,
    default: 'STANDARD',
    trim: true
  },
  uom: {
    type: String,
    default: 'PCS'
  },
  uomDetails: {
    baseUnit: { type: String },
    purchaseUnit: { type: String },
    purchaseConversionFactor: { type: Number, default: 1 },
    salesUnit: { type: String },
    salesConversionFactor: { type: Number, default: 1 }
  },
  brand: {
    type: String,
    trim: true
  },
  barcode: {
    type: String,
    trim: true
  },
  purchasePrice: {
    type: Number,
    default: 0,
    min: 0
  },
  landedCost: {
    type: Number,
    default: 0,
    min: 0
  },
  salesPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  costingMethod: {
    type: String,
    enum: ['FIFO', 'LIFO', 'AVCO', 'AVERAGE', 'STANDARD'],
    default: 'AVCO'
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0
  },
  price: {
    type: Number,
    required: [true, 'Please add a price'],
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  allowDiscount: {
    type: Boolean,
    default: true
  },
  // Classification
  department: { type: String },
  family: { type: String },
  subFamily: { type: String },
  color: { type: String },
  size: { type: String },
  hsnCode: { type: String },
  itemReference: { type: String },
  styleCode: { type: String },
  // Description
  longDescription: { type: String },
  description3: { type: String },
  description4: { type: String },
  itemDescriptionDetails: { type: String },
  note1: { type: String },
  note2: { type: String },
  note3: { type: String },
  // Inventory
  minStockLevel: { type: Number, default: 0 },
  maxStockLevel: { type: Number, default: 0 },
  stockManagement: { type: String, enum: ['MANAGED', 'UNMANAGED', 'NONE', 'MANUAL', 'AUTOMATIC', 'REORDER_LEVEL'], default: 'MANAGED' },
  weight: { type: Number, default: 0 },
  weightUom: { type: String },
  expiry: { type: Date },
  expiryType: { type: String },
  expiryDays: { type: Number },
  date1: { type: Date },
  date2: { type: Date },
  uploadImage: { type: String },
  images: [{ type: String }],
  // E-Commerce Specific Attributes
  isPublishedToEcommerce: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  isBestSeller: { type: Boolean, default: false },
  isTrending: { type: Boolean, default: false },
  isDealOfTheDay: { type: Boolean, default: false },
  isNewArrival: { type: Boolean, default: false },
  ecommerceBadge: { type: String, trim: true },
  // Return & Exchange Policy Configuration
  isReturnable: { type: Boolean, default: true },
  isExchangeable: { type: Boolean, default: true },
  returnPolicyType: {
    type: String,
    enum: ['RETURN_AND_EXCHANGE', 'EXCHANGE_ONLY', 'NON_RETURNABLE'],
    default: 'RETURN_AND_EXCHANGE'
  },
  returnWindowDays: { type: Number, default: 7 },
  nonReturnableReason: { type: String, trim: true, default: '' },
  specifications: [{
    key: { type: String, trim: true },
    value: { type: String, trim: true }
  }],
  features: [{ type: String, trim: true }],
  // Variant Configuration
  hasVariants: {
    type: Boolean,
    default: false,
    index: true
  },
  variantAttributeDefinitions: [{
    name: { type: String, trim: true },
    values: [{ type: String, trim: true }]
  }],
  // Color-specific media galleries
  colorGalleries: [{
    colorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Color'
    },
    colorName: {
      type: String,
      trim: true
    },
    colorCode: {
      type: String,
      trim: true
    },
    uploadImage: {
      type: String,
      trim: true
    },
    images: [{
      type: String,
      trim: true
    }]
  }],
  // Additional Master data
  company: { type: String },
  companyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LegalCompany' }],
  location: { type: String },
  branchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
  tax1: { type: mongoose.Schema.Types.ObjectId, ref: 'Tax' },
  supplierName: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

/**
 * Concurrency & Write Path Limitations:
 * 1. Application-level pre-save cross-collection checks (Product vs ProductVariant)
 *    are susceptible to TOCTOU (Time-of-Check to Time-of-Use) race conditions under high concurrency.
 *    MongoDB does not enforce cross-collection unique constraints natively.
 * 2. Mongoose middleware (pre-save) is bypassed by direct query updates:
 *    findOneAndUpdate, updateOne, updateMany, replaceOne, and bulkWrite.
 *    Direct query writes must not be used for SKU/barcode modifications;
 *    updates must flow through validated document save() or centralized service layers.
 */

// Pre-save validation, normalization, and cross-collection integrity checks
productSchema.pre('save', async function() {
  // 1. SKU Normalization
  if (this.sku) {
    this.sku = this.sku.trim().toUpperCase();
  }

  // 2. Barcode Sanitization (convert empty/whitespace strings to undefined)
  if (this.barcode === '' || (typeof this.barcode === 'string' && this.barcode.trim() === '')) {
    this.barcode = undefined;
  } else if (typeof this.barcode === 'string') {
    this.barcode = this.barcode.trim();
  }

  // 3. Variant Attribute Definitions Validation when hasVariants is enabled
  if (this.hasVariants) {
    // Automatically prune unconfigured / empty attribute definitions (e.g. Size left empty for color-only products)
    if (Array.isArray(this.variantAttributeDefinitions)) {
      this.variantAttributeDefinitions = this.variantAttributeDefinitions.filter(
        def => def && def.name && typeof def.name === 'string' && def.name.trim() !== '' && Array.isArray(def.values) && def.values.some(v => typeof v === 'string' && v.trim() !== '')
      );
    }

    if (!Array.isArray(this.variantAttributeDefinitions) || this.variantAttributeDefinitions.length === 0) {
      throw new Error('Variant-enabled products must define at least one variant attribute with values.');
    }

    const seenNames = new Set();
    for (const def of this.variantAttributeDefinitions) {
      if (!def.name || typeof def.name !== 'string' || def.name.trim() === '') {
        throw new Error('Variant attribute definition name cannot be blank.');
      }
      const cleanName = def.name.trim().toLowerCase();
      if (seenNames.has(cleanName)) {
        throw new Error(`Duplicate attribute name "${def.name.trim()}" detected in variant definitions.`);
      }
      seenNames.add(cleanName);

      if (!Array.isArray(def.values) || def.values.length === 0) {
        throw new Error(`Variant attribute "${def.name.trim()}" must provide at least one allowed value.`);
      }

      const cleanValues = [];
      const seenVals = new Set();
      for (const val of def.values) {
        if (!val || typeof val !== 'string' || val.trim() === '') {
          throw new Error(`Variant attribute "${def.name.trim()}" contains an empty or blank value.`);
        }
        const cleanVal = val.trim();
        const normVal = cleanVal.toLowerCase();
        if (seenVals.has(normVal)) {
          throw new Error(`Duplicate allowed value "${cleanVal}" in variant attribute "${def.name.trim()}".`);
        }
        seenVals.add(normVal);
        cleanValues.push(cleanVal);
      }
      def.values = cleanValues;
      def.name = def.name.trim();
    }
  }

  // 4. Cross-collection uniqueness check (defense-in-depth, fails closed if model missing)
  if (this.isNew || this.isModified('sku') || this.isModified('barcode')) {
    let ProductVariant;
    try {
      if (mongoose.models['ProductVariant']) {
        ProductVariant = mongoose.models['ProductVariant'];
      } else {
        ProductVariant = require('./ProductVariant');
        if (ProductVariant && !mongoose.models['ProductVariant']) {
          mongoose.models['ProductVariant'] = ProductVariant;
        }
      }
    } catch (err) {
      throw new Error(`Cross-collection validation error: ProductVariant model is unavailable: ${err.message}`);
    }

    if (!ProductVariant) {
      throw new Error('Cross-collection validation error: ProductVariant model is not registered.');
    }

    if (this.sku) {
      const skuCollision = await ProductVariant.exists({ tenantId: this.tenantId, sku: this.sku });
      if (skuCollision) {
        throw new Error(`SKU "${this.sku}" is already assigned to a product variant.`);
      }
    }

    if (this.barcode) {
      const barcodeCollision = await ProductVariant.exists({ tenantId: this.tenantId, barcode: this.barcode });
      if (barcodeCollision) {
        throw new Error(`Barcode "${this.barcode}" is already assigned to a product variant.`);
      }
    }
  }
});

// Ensure SKU is unique per tenant
productSchema.index({ tenantId: 1, sku: 1 }, { unique: true });

// Ensure barcode is unique per tenant if provided as non-empty string
productSchema.index(
  { tenantId: 1, barcode: 1 },
  { unique: true, partialFilterExpression: { barcode: { $gt: '' } } }
);

module.exports = mongoose.model('Product', productSchema);


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
    enum: ['STANDARD', 'SERVICE', 'RAW_MATERIAL', 'PACKING_MATERIAL', 'SEMI_FINISHED_GOODS', 'CONSUMABLE', 'PHANTOM'],
    default: 'STANDARD'
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
  // Additional Master data
  company: { type: String },
  location: { type: String },
  tax1: { type: mongoose.Schema.Types.ObjectId, ref: 'Tax' },
  supplierName: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Ensure SKU is unique per tenant
productSchema.index({ tenantId: 1, sku: 1 }, { unique: true });

// Ensure barcode is unique per tenant if provided
productSchema.index(
  { tenantId: 1, barcode: 1 },
  { unique: true, partialFilterExpression: { barcode: { $type: 'string' } } }
);

module.exports = mongoose.model('Product', productSchema);

const mongoose = require('mongoose');

const homeBlockSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please provide a block title'],
    trim: true
  },
  subtitle: {
    type: String,
    trim: true
  },
  blockType: {
    type: String,
    enum: [
      'HERO_BANNER',        // Top Hero Carousel / Banner
      'SINGLE_BANNER',      // Full-width custom promotional banner with image & CTA
      'MULTI_BANNER',       // 2 or 3-column banner promo grid
      'TRUST_STRIP',        // Trust badges & guarantee strip
      'CATEGORY_BUBBLES',   // Visual circular category bubbles (Flipkart style)
      'DEAL_FLASH',         // Lightning deal with countdown clock
      'BEST_SELLERS',       // Best selling products
      'NEW_ARRIVALS',       // Fresh arrivals
      'CATEGORY_PRODUCTS',  // Products from a specific mapped category/department/family
      'PROMO_GRID',         // Amazon 4-quadrant promotional tiles
      'CUSTOM_GRID',        // Custom filtered items
      'CATALOG_PICKS'       // Curated Catalog Picks tabbed section
    ],
    default: 'CATEGORY_PRODUCTS'
  },
  filterType: {
    type: String,
    enum: ['department', 'category', 'family', 'brand', 'tag', 'all'],
    default: 'all'
  },
  filterValue: {
    type: String,
    trim: true
  },
  itemLimit: {
    type: Number,
    default: 8,
    min: 1,
    max: 24
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  customConfig: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

homeBlockSchema.index({ tenantId: 1, order: 1 });

module.exports = mongoose.model('HomeBlock', homeBlockSchema);

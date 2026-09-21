const mongoose = require('mongoose');

const storeSettingsSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    unique: true // One store settings per company
  },
  storeName: {
    type: String,
    default: 'My E-Commerce Store'
  },
  heroTitle: {
    type: String,
    default: 'Welcome to our store!'
  },
  heroSubtitle: {
    type: String,
    default: 'Discover our amazing products.'
  },
  heroImage: {
    type: String,
    default: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80'
  },
  primaryColor: {
    type: String,
    default: '#2563eb' // blue-600
  },
  featuredProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('StoreSettings', storeSettingsSchema);

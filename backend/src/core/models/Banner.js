const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please provide a banner title'],
    trim: true
  },
  subtitle: {
    type: String,
    trim: true
  },
  badge: {
    type: String,
    trim: true
  },
  hoverText: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String,
    required: [true, 'Please provide an image URL'],
    trim: true
  },
  buttonText: {
    type: String,
    default: 'Shop Now',
    trim: true
  },
  linkUrl: {
    type: String,
    default: '/catalog',
    trim: true
  },
  placement: {
    type: String,
    enum: ['HERO_CAROUSEL', 'DEAL_BANNER', 'PROMO_TILE', 'FOOTER_BANNER'],
    default: 'HERO_CAROUSEL'
  },
  gradient: {
    type: String,
    default: 'from-slate-950 via-blue-950 to-slate-900'
  },
  order: {
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
  }
}, {
  timestamps: true
});

bannerSchema.index({ tenantId: 1, placement: 1, order: 1 });

module.exports = mongoose.model('Banner', bannerSchema);

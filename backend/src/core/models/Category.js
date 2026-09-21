const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please add a category name'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  itemDepartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ItemDepartment'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Category', categorySchema);

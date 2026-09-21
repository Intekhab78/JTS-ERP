const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  calendarId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HolidayCalendar',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  holidayType: {
    type: String,
    enum: ['PUBLIC', 'COMPANY', 'OPTIONAL'],
    default: 'PUBLIC'
  },
  countryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Country'
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Holiday', holidaySchema);

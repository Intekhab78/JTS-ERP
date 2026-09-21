const mongoose = require('mongoose');

const countrySchema = new mongoose.Schema({
  countryCode: { type: String, required: true, unique: true, trim: true }, // e.g. "US", "IN", "AE"
  countryName: { type: String, required: true, trim: true },
  currency: { type: String, trim: true }, // e.g. "USD", "INR", "AED"
  timezone: { type: String, trim: true },
  dateFormat: { type: String, trim: true, default: 'YYYY-MM-DD' },
  phoneCode: { type: String, trim: true }, // e.g. "+1", "+91", "+971"
  workingWeek: { type: [String], default: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] },
  weekendDays: { type: [String], default: ['SATURDAY', 'SUNDAY'] },
  payrollEnabled: { type: Boolean, default: false },
  taxEnabled: { type: Boolean, default: false },
  socialSecurityEnabled: { type: Boolean, default: false },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Country', countrySchema);

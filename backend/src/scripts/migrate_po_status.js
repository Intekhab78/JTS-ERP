const mongoose = require('mongoose');
const dotenv = require('dotenv');
const PurchaseOrder = require('../core/models/PurchaseOrder');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function runMigration() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/enterprise-erp');
    console.log('Connected to Database.');

    const totalPOs = await PurchaseOrder.countDocuments();
    
    // Aggregate status counts
    const statusCounts = await PurchaseOrder.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const getCount = (status) => {
      const match = statusCounts.find(s => s._id === status);
      return match ? match.count : 0;
    };

    console.log('--- DRY RUN REPORT ---');
    console.log(`Total Purchase Orders: ${totalPOs}`);
    console.log(`DRAFT count: ${getCount('DRAFT')}`);
    console.log(`PENDING count: ${getCount('PENDING')}`);
    console.log(`CONFIRMED count: ${getCount('CONFIRMED')}`);
    console.log(`PARTIALLY_RECEIVED count: ${getCount('PARTIALLY_RECEIVED')}`);
    console.log(`RECEIVED count: ${getCount('RECEIVED')}`);
    console.log(`CANCELLED count: ${getCount('CANCELLED')}`);
    console.log('----------------------');

    if (getCount('PENDING') > 0) {
      console.log('NOTE: PENDING records exist. Based on historical data, we need to decide if they should be mapped to DRAFT or CONFIRMED.');
    } else {
      console.log('NOTE: No PENDING records found. Migration of status is not needed.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

runMigration();

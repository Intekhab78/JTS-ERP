require('dotenv').config();
const mongoose = require('mongoose');
const AuditLog = require('./src/core/models/AuditLog');

async function testImmutability() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/erp');
  console.log('Connected to DB');

  try {
    const log = new AuditLog({
      tenantId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      action: 'POS_SESSION_OPEN',
      entityType: 'Test',
      entityId: new mongoose.Types.ObjectId(),
      ipAddress: '127.0.0.1'
    });

    await log.save();
    console.log('Saved original log successfully.');

    let failedAsExpected = false;
    try {
      await AuditLog.updateOne({ _id: log._id }, { action: 'POS_SESSION_CLOSE' });
    } catch (err) {
      if (err.message.includes('immutable')) {
        console.log('SUCCESS: updateOne blocked ->', err.message);
        failedAsExpected = true;
      } else {
        throw err;
      }
    }

    if (!failedAsExpected) {
      console.error('FAIL: updateOne was not blocked.');
      process.exit(1);
    }
    
    failedAsExpected = false;
    try {
      await AuditLog.findByIdAndDelete(log._id);
    } catch (err) {
      if (err.message.includes('immutable')) {
        console.log('SUCCESS: findByIdAndDelete blocked ->', err.message);
        failedAsExpected = true;
      } else {
        throw err;
      }
    }
    
    if (!failedAsExpected) {
      console.error('FAIL: findByIdAndDelete was not blocked.');
      process.exit(1);
    }
    
    failedAsExpected = false;
    try {
      log.reason = 'Testing save';
      await log.save();
    } catch(err) {
       if (err.message.includes('immutable')) {
        console.log('SUCCESS: save (on existing document) blocked ->', err.message);
        failedAsExpected = true;
      } else {
        throw err;
      }
    }
    
    if (!failedAsExpected) {
      console.error('FAIL: save (on existing document) was not blocked.');
      process.exit(1);
    }

    // Clean up purely via direct native mongo driver bypass for testing only
    await mongoose.connection.db.collection('auditlogs').deleteOne({ _id: log._id });
    console.log('Cleaned up test record via raw driver bypass.');

    console.log('ALL IMMUTABILITY TESTS PASSED.');
    process.exit(0);
  } catch (error) {
    console.error('Test failed with unexpected error:', error);
    process.exit(1);
  }
}

testImmutability();

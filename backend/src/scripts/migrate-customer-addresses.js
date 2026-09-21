const mongoose = require('mongoose');
const Customer = require('../core/models/Customer');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function migrateAddresses() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected. Starting migration...');

    // We can use db.collection to bypass Mongoose strict schema casting issues when changing types
    const db = mongoose.connection.db;
    const collection = db.collection('customers');
    
    const customers = await collection.find({}).toArray();
    let migratedCount = 0;

    for (const customer of customers) {
      if (typeof customer.address === 'string') {
        const oldAddress = customer.address;
        await collection.updateOne(
          { _id: customer._id },
          { 
            $set: { 
              address: {
                street: oldAddress || '',
                street2: '',
                city: '',
                state: '',
                zip: '',
                country: ''
              }
            } 
          }
        );
        migratedCount++;
        console.log(`Migrated customer: ${customer.name}`);
      }
    }

    console.log(`Migration completed. Migrated ${migratedCount} customers.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateAddresses();

const mongoose = require('mongoose');
const Product = require('../core/models/Product');
const Branch = require('../core/models/Branch');
const Stock = require('../core/models/Stock');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function fixStock() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    const products = await Product.find();
    console.log(`Found ${products.length} products.`);

    const branches = await Branch.find();
    console.log(`Found ${branches.length} branches.`);

    for (const product of products) {
      for (const branch of branches) {
        if (product.tenantId.toString() === branch.tenantId.toString()) {
          const stockDoc = await Stock.findOneAndUpdate(
            { tenantId: product.tenantId, branchId: branch._id, productId: product._id },
            { $set: { quantity: 100 } },
            { returnDocument: 'after', upsert: true }
          );
          console.log(`Set stock to 100 for Product ${product.name} in Branch ${branch.name}`);
        }
      }
    }

    console.log('All missing branch stocks have been initialized to 100!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixStock();

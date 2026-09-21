const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI.replace(':27017/', ':27018/');

mongoose.connect(uri).then(async () => {
  console.log('Connected to DB via 27018');
  
  // 2. Give TENANT ADMIN the * permission
  const Role = require('./src/core/models/Role');
  const roleRes = await Role.updateMany(
    { name: 'Tenant Admin' },
    { $addToSet: { permissions: '*' } }
  );
  console.log(`Updated ${roleRes.modifiedCount} Tenant Admin roles with '*' permission`);
  
  mongoose.disconnect();
}).catch(console.error);

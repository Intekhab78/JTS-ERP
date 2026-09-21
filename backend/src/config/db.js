const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    if (uri && uri.includes(':27017/')) {
      const tunnelUri = uri.replace(':27017/', ':27018/');
      try {
        console.log('⚠️ Failed on port 27017, trying local SSH tunnel port 27018...');
        const tunnelConn = await mongoose.connect(tunnelUri, { serverSelectionTimeoutMS: 5000 });
        console.log(`✅ Connected to VPS MongoDB via SSH Tunnel: ${tunnelConn.connection.host}`);
        return;
      } catch (tunnelErr) {
        console.error(`❌ SSH Tunnel MongoDB Connection Error: ${tunnelErr.message}`);
      }
    }
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

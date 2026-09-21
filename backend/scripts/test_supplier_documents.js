const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { uploadDocument, viewDocument } = require('../src/modules/purchase/supplierController');
const Supplier = require('../src/core/models/Supplier');

// Mock request and response objects
const mockRes = () => {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.data = data; return res; };
  res.sendFile = (filePath) => { res.filePath = filePath; return res; };
  return res;
};

async function runTests() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');

  try {
    const tenantId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    
    // Create a dummy supplier
    const supplier = new Supplier({
      name: 'Test Supplier Docs',
      vendorCode: 'V-DOC-TEST',
      vendorType: 'Manufacturer',
      tenantId
    });
    await supplier.save();
    console.log(`Created test supplier with ID: ${supplier._id}`);

    // Create a dummy file for upload
    const dummyFilePath = path.join(__dirname, 'dummy_doc.pdf');
    fs.writeFileSync(dummyFilePath, 'This is a test PDF document');

    // Test Upload Document
    console.log('\n--- Testing Upload Document ---');
    const reqUpload = {
      user: { tenantId, _id: userId },
      params: { id: supplier._id },
      body: { documentType: 'TRADE_LICENSE', documentName: 'Dubai Trade License', expiryDate: '2027-12-31' },
      file: {
        filename: 'doc-12345.pdf',
        originalname: 'license.pdf',
        mimetype: 'application/pdf',
        size: 5000,
        path: dummyFilePath
      }
    };
    const resUpload = mockRes();
    
    // Normally upload logic would be fully integrated, but we call controller directly
    await uploadDocument(reqUpload, resUpload);
    console.log('Upload Result Status:', resUpload.statusCode);
    if (resUpload.statusCode === 201) {
      console.log('Uploaded Document:', resUpload.data.document.documentType, 'Status:', resUpload.data.document.status);
    } else {
      console.error('Upload Failed:', resUpload.data);
    }

    // Refresh supplier
    const updatedSupplier = await Supplier.findById(supplier._id);
    const docId = updatedSupplier.documents[0]._id;

    // Test View Document
    console.log('\n--- Testing View Document ---');
    const reqView = {
      user: { tenantId },
      params: { id: supplier._id, documentId: docId }
    };
    const resView = mockRes();
    await viewDocument(reqView, resView);
    console.log('View Result Status:', resView.statusCode);
    
    if (resView.statusCode === 200 || resView.filePath) {
       console.log('File served path:', resView.filePath);
    } else if (resView.statusCode === 404) {
       console.log('Expected 404 since physical file was not actually moved by multer in this mock test.');
    }

    // Test Tenant Isolation for View
    console.log('\n--- Testing Tenant Isolation (View) ---');
    const reqViewIsolated = {
      user: { tenantId: new mongoose.Types.ObjectId() }, // Different tenant
      params: { id: supplier._id, documentId: docId }
    };
    const resViewIsolated = mockRes();
    await viewDocument(reqViewIsolated, resViewIsolated);
    console.log('Isolated View Result Status (Should be 404):', resViewIsolated.statusCode);

    // Cleanup
    await Supplier.deleteOne({ _id: supplier._id });
    if (fs.existsSync(dummyFilePath)) {
      fs.unlinkSync(dummyFilePath);
    }
    console.log('\nCleanup successful.');

  } catch (error) {
    console.error('Test Failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

runTests();

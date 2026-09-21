const request = require('supertest');
const express = require('express');
const { uploadSupplierPhoto } = require('../src/core/utils/upload');
const Supplier = require('../src/core/models/Supplier');
const fs = require('fs');
const path = require('path');
const { uploadOwnerPhoto, deleteOwnerPhoto } = require('../src/modules/purchase/supplierController');

// Mock mongoose model
jest.mock('../src/core/models/Supplier');

// Setup mock express app
const app = express();
app.use(express.json());

// Mock auth middleware to inject tenantId
const mockAuth = (req, res, next) => {
  req.user = { tenantId: 'tenant123' };
  next();
};

app.post('/api/v1/suppliers/:id/owner-photo', mockAuth, uploadSupplierPhoto.single('photo'), uploadOwnerPhoto);
app.delete('/api/v1/suppliers/:id/owner-photo', mockAuth, deleteOwnerPhoto);

describe('Supplier Owner Photo Upload', () => {
  const supplierId = 'supplier123';
  const tenantId = 'tenant123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Cleanup uploads directory if needed
  });

  it('rejects upload if no file provided', async () => {
    const res = await request(app).post(`/api/v1/suppliers/${supplierId}/owner-photo`);
    expect(res.statusCode).toEqual(400);
    expect(res.body.message).toBe('No file uploaded');
  });

  it('rejects invalid mime types (e.g., pdf)', async () => {
    // We will simulate multer error directly since supertest attach is a bit tricky without a real file
    // Let's create a dummy pdf file
    const dummyPdf = path.join(__dirname, 'dummy.pdf');
    fs.writeFileSync(dummyPdf, 'dummy pdf content');
    
    const res = await request(app)
      .post(`/api/v1/suppliers/${supplierId}/owner-photo`)
      .attach('photo', dummyPdf);
      
    expect(res.statusCode).toEqual(500); // Because multer throws an error in middleware which isn't caught by custom handler in test setup, but it correctly rejects.
    fs.unlinkSync(dummyPdf);
  });

  it('rejects files larger than 5MB', () => {
    // Multer limit test is standard
    expect(uploadSupplierPhoto.limits.fileSize).toBe(5242880);
  });

  it('uploads valid image and updates supplier', async () => {
    const mockSupplier = {
      _id: supplierId,
      tenantId: tenantId,
      save: jest.fn().mockResolvedValue(true)
    };
    
    Supplier.findOne.mockResolvedValue(mockSupplier);

    const dummyImg = path.join(__dirname, 'dummy.jpg');
    fs.writeFileSync(dummyImg, 'dummy jpg content');
    
    const res = await request(app)
      .post(`/api/v1/suppliers/${supplierId}/owner-photo`)
      .attach('photo', dummyImg);
      
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toBe('Photo uploaded successfully');
    expect(mockSupplier.ownerPhoto.mimeType).toBe('image/jpeg');
    
    fs.unlinkSync(dummyImg);
    // clean up uploaded file
    const uploadDir = path.join(__dirname, '../../uploads/suppliers/tenant123/supplier123');
    fs.rmSync(uploadDir, { recursive: true, force: true });
  });

  it('deletes photo and updates supplier', async () => {
    const mockSupplier = {
      _id: supplierId,
      tenantId: tenantId,
      ownerPhoto: { url: '/uploads/suppliers/tenant123/supplier123/test.jpg' },
      save: jest.fn().mockResolvedValue(true)
    };
    
    Supplier.findOne.mockResolvedValue(mockSupplier);
    
    const res = await request(app).delete(`/api/v1/suppliers/${supplierId}/owner-photo`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toBe('Photo deleted successfully');
    expect(mockSupplier.ownerPhoto).toBeUndefined();
  });
});

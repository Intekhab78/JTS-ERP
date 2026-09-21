const Supplier = require('../../core/models/Supplier');
const Counter = require('../../core/models/Counter');

// @desc    Get all suppliers
// @route   GET /api/v1/suppliers
// @access  Private
exports.getSuppliers = async (req, res) => {
  try {
    const { search, vendorType, status, location, page, limit } = req.query;
    
    const query = { tenantId: req.user.tenantId };
    
    if (status) query.status = status;
    if (vendorType) query.vendorType = vendorType;
    if (location) {
      if (location === 'Other') {
        query['addressDetails.city'] = { $nin: ['Dubai', 'Abu Dhabi', 'Sharjah'] };
      } else {
        query['addressDetails.city'] = { $regex: new RegExp(location, 'i') };
      }
    }
    
    if (search) {
      query.$or = [
        { vendorCode: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Default to a reasonably high limit if not specified, 
    // to preserve backward compatibility for old UI if it doesn't send page info
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 100;
    const startIndex = (pageNum - 1) * limitNum;

    const total = await Supplier.countDocuments(query);
    const suppliers = await Supplier.find(query).skip(startIndex).limit(limitNum).sort({ createdAt: -1 });

    if (!req.query.page && !req.query.limit) {
      // Backward compatibility for old UI components expecting a flat array
      return res.status(200).json(suppliers);
    }

    res.status(200).json({
      data: suppliers,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single supplier
// @route   GET /api/v1/suppliers/:id
// @access  Private
exports.getSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    res.status(200).json(supplier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new supplier
// @route   POST /api/v1/suppliers
// @access  Private
exports.createSupplier = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    let { 
      vendorCode, vendorType, name, contactName, email, phone, address, taxId, 
      website, contactDetails, addressDetails, bankDetails, legalDetails, documents, remarks, status 
    } = req.body;
    
    if (!vendorCode) {
      const currentYear = new Date().getFullYear();
      const counterId = `VEN_${currentYear}`;
      const counter = await Counter.findOneAndUpdate(
        { tenantId, sequenceName: counterId, year: currentYear },
        { $inc: { sequenceValue: 1 } },
        { returnDocument: 'after', upsert: true }
      );
      vendorCode = `VEN-${currentYear}-${String(counter.sequenceValue).padStart(4, '0')}`;
    } else {
      const existing = await Supplier.findOne({ tenantId, vendorCode });
      if (existing) {
        return res.status(400).json({ message: 'Vendor Code already exists' });
      }
    }

    const supplier = await Supplier.create({
      tenantId,
      vendorCode,
      vendorType,
      name,
      contactName,
      email,
      phone,
      address,
      taxId,
      website,
      contactDetails,
      addressDetails,
      bankDetails,
      legalDetails,
      documents,
      remarks,
      status
    });

    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a supplier
// @route   PUT /api/v1/suppliers/:id
// @access  Private
exports.updateSupplier = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    let supplier = await Supplier.findOne({ _id: req.params.id, tenantId });
    
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    if (req.body.vendorCode && req.body.vendorCode !== supplier.vendorCode) {
      const existing = await Supplier.findOne({ tenantId, vendorCode: req.body.vendorCode });
      if (existing) {
        return res.status(400).json({ message: 'Vendor Code already exists' });
      }
    }

    // Merge explicitly provided fields to avoid overwriting with undefined
    const fieldsToUpdate = [
      'vendorCode', 'vendorType', 'name', 'contactName', 'email', 'phone', 'address', 'taxId',
      'website', 'contactDetails', 'addressDetails', 'bankDetails', 'legalDetails', 'documents', 'remarks', 'status'
    ];

    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined) {
        supplier[field] = req.body[field];
      }
    });

    await supplier.save();
    res.status(200).json(supplier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a supplier
// @route   DELETE /api/v1/suppliers/:id
// @access  Private
exports.deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    await supplier.deleteOne();
    res.status(200).json({ message: 'Supplier removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload supplier owner photo
// @route   POST /api/v1/suppliers/:id/owner-photo
// @access  Private
exports.uploadOwnerPhoto = async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const tenantId = req.user.tenantId;
    const supplierId = req.params.id;

    const supplier = await Supplier.findOne({ _id: supplierId, tenantId });
    if (!supplier) {
      // If supplier not found, clean up the uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // Delete existing photo if replacing
    if (supplier.ownerPhoto && supplier.ownerPhoto.url) {
      // url format is like /uploads/suppliers/tenant/supplier/filename
      // Convert it to local file path
      const oldFilePath = path.join(__dirname, '../../../../', supplier.ownerPhoto.url);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (err) {
          console.error('Error deleting old photo:', err);
        }
      }
    }

    // Prepare new photo metadata
    const relativeUrl = `/uploads/suppliers/${tenantId}/${supplierId}/${req.file.filename}`;
    
    supplier.ownerPhoto = {
      url: relativeUrl,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date()
    };

    await supplier.save();
    res.status(200).json({ message: 'Photo uploaded successfully', ownerPhoto: supplier.ownerPhoto });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete supplier owner photo
// @route   DELETE /api/v1/suppliers/:id/owner-photo
// @access  Private
exports.deleteOwnerPhoto = async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const tenantId = req.user.tenantId;
    const supplierId = req.params.id;

    const supplier = await Supplier.findOne({ _id: supplierId, tenantId });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    if (!supplier.ownerPhoto || !supplier.ownerPhoto.url) {
      return res.status(400).json({ message: 'No photo exists for this supplier' });
    }

    const oldFilePath = path.join(__dirname, '../../../../', supplier.ownerPhoto.url);
    if (fs.existsSync(oldFilePath)) {
      try {
        fs.unlinkSync(oldFilePath);
      } catch (err) {
        console.error('Error deleting photo file:', err);
      }
    }

    supplier.ownerPhoto = undefined;
    await supplier.save();

    res.status(200).json({ message: 'Photo deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const calculateDocumentStatus = (expiryDate) => {
  if (!expiryDate) return 'NOT_PROVIDED';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  return exp < today ? 'EXPIRED' : 'ACTIVE';
};

// @desc    Upload supplier document
// @route   POST /api/v1/suppliers/:id/documents
// @access  Private
exports.uploadDocument = async (req, res) => {
  try {
    const fs = require('fs');
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const tenantId = req.user.tenantId;
    const supplierId = req.params.id;
    const { documentType, documentName, expiryDate } = req.body;

    if (!documentType) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'documentType is required' });
    }

    const supplier = await Supplier.findOne({ _id: supplierId, tenantId });
    if (!supplier) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const relativeUrl = `/uploads/suppliers/${tenantId}/${supplierId}/documents/${req.file.filename}`;
    
    const newDoc = {
      documentType,
      documentName: documentName || documentType,
      fileUrl: relativeUrl,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      status: calculateDocumentStatus(expiryDate),
      uploadedAt: new Date(),
      uploadedBy: req.user._id
    };

    supplier.documents.push(newDoc);
    await supplier.save();

    res.status(201).json({ 
      message: 'Document uploaded successfully', 
      document: supplier.documents[supplier.documents.length - 1] 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all supplier documents
// @route   GET /api/v1/suppliers/:id/documents
// @access  Private
exports.getDocuments = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const supplierId = req.params.id;

    const supplier = await Supplier.findOne({ _id: supplierId, tenantId });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // Filter out old legacy documents that don't have fileUrl if needed,
    // or just return all and let frontend handle
    const docs = supplier.documents || [];
    res.status(200).json(docs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Securely view/download a supplier document
// @route   GET /api/v1/suppliers/:id/documents/:documentId/view
// @access  Private
exports.viewDocument = async (req, res) => {
  try {
    const path = require('path');
    const fs = require('fs');
    const tenantId = req.user.tenantId;
    const { id: supplierId, documentId } = req.params;

    const supplier = await Supplier.findOne({ _id: supplierId, tenantId });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const doc = supplier.documents.id(documentId);
    if (!doc || !doc.fileUrl) {
      return res.status(404).json({ message: 'Document file not found' });
    }

    const absolutePath = path.join(__dirname, '../../../../', doc.fileUrl);
    
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: 'Physical file not found on server' });
    }

    res.sendFile(absolutePath);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a supplier document
// @route   DELETE /api/v1/suppliers/:id/documents/:documentId
// @access  Private
exports.deleteDocument = async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const tenantId = req.user.tenantId;
    const { id: supplierId, documentId } = req.params;

    const supplier = await Supplier.findOne({ _id: supplierId, tenantId });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const doc = supplier.documents.id(documentId);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (doc.fileUrl) {
      const oldFilePath = path.join(__dirname, '../../../../', doc.fileUrl);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (err) {
          console.error('Error deleting document file:', err);
        }
      }
    }

    supplier.documents.pull(documentId);
    await supplier.save();

    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Replace a supplier document
// @route   PUT /api/v1/suppliers/:id/documents/:documentId
// @access  Private
exports.replaceDocument = async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded for replacement' });
    }

    const tenantId = req.user.tenantId;
    const { id: supplierId, documentId } = req.params;
    const { documentName, expiryDate } = req.body;

    const supplier = await Supplier.findOne({ _id: supplierId, tenantId });
    if (!supplier) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const doc = supplier.documents.id(documentId);
    if (!doc) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Document not found' });
    }

    // Remove old file
    if (doc.fileUrl) {
      const oldFilePath = path.join(__dirname, '../../../../', doc.fileUrl);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (err) {
          console.error('Error deleting old document file:', err);
        }
      }
    }

    const relativeUrl = `/uploads/suppliers/${tenantId}/${supplierId}/documents/${req.file.filename}`;
    
    // Update doc fields
    if (documentName) doc.documentName = documentName;
    if (expiryDate !== undefined) {
      doc.expiryDate = expiryDate ? new Date(expiryDate) : undefined;
      doc.status = calculateDocumentStatus(doc.expiryDate);
    }
    
    doc.fileUrl = relativeUrl;
    doc.fileName = req.file.originalname;
    doc.mimeType = req.file.mimetype;
    doc.fileSize = req.file.size;
    doc.uploadedAt = new Date();
    doc.uploadedBy = req.user._id;

    await supplier.save();

    res.status(200).json({ 
      message: 'Document replaced successfully', 
      document: doc 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const EmployeeDocument = require('../../core/models/EmployeeDocument');
const Employee = require('../../core/models/Employee');
const DocumentType = require('../../core/models/DocumentType');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Helper to determine status based on expiry
const determineStatus = (expiryDate) => {
  if (!expiryDate) return 'ACTIVE';
  
  const now = new Date();
  const expiry = new Date(expiryDate);
  
  if (expiry < now) {
    return 'EXPIRED';
  }
  
  // 30 days warning period
  const warningDate = new Date(now);
  warningDate.setDate(warningDate.getDate() + 30);
  
  if (expiry <= warningDate) {
    return 'EXPIRING_SOON';
  }
  
  return 'ACTIVE';
};

exports.uploadDocument = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { documentTypeId, documentType, documentName, documentNumber, issuingCountry, issueDate, expiryDate, notes } = req.body;
    const tenantId = req.user.tenantId;

    if (!req.file) {
      return res.status(400).json({ message: 'File is required.' });
    }

    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
       fs.unlinkSync(req.file.path);
       return res.status(400).json({ message: 'Invalid file type.' });
    }
    
    if (req.file.size > MAX_FILE_SIZE) {
       fs.unlinkSync(req.file.path);
       return res.status(400).json({ message: 'File size exceeds 5MB limit.' });
    }

    const employee = await Employee.findOne({ _id: employeeId, tenantId });
    if (!employee) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Employee not found.' });
    }
    
    let docTypeRecord = null;
    if (documentTypeId) {
       docTypeRecord = await DocumentType.findOne({ _id: documentTypeId, tenantId });
       if (!docTypeRecord) {
         fs.unlinkSync(req.file.path);
         return res.status(404).json({ message: 'Document Type not found.' });
       }
    }

    const status = determineStatus(expiryDate);
    
    const storageKey = uuidv4() + path.extname(req.file.originalname);
    
    // Move from public uploads to a more secure structure or rename to storageKey
    const secureDir = path.join(__dirname, '../../../../private_uploads', tenantId.toString(), employeeId.toString());
    if (!fs.existsSync(secureDir)){
        fs.mkdirSync(secureDir, { recursive: true });
    }
    const securePath = path.join(secureDir, storageKey);
    fs.renameSync(req.file.path, securePath); // Move file

    const doc = new EmployeeDocument({
      tenantId,
      employeeId,
      documentTypeId,
      documentType: documentType || (docTypeRecord ? docTypeRecord.code : undefined),
      documentName: documentName || (docTypeRecord ? docTypeRecord.name : undefined),
      documentNumber,
      issuingCountry,
      issueDate: issueDate || null,
      expiryDate: expiryDate || null,
      fileUrl: null, // Legacy
      storageKey,
      originalFileName: req.file.originalname,
      storedFileName: storageKey,
      fileName: req.file.originalname, // Legacy
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      status,
      notes,
      uploadedBy: req.user.id
    });

    await doc.save();
    res.status(201).json(doc);
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Error uploading employee document:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const tenantId = req.user.tenantId;
    
    // Auth Check
    const employee = await Employee.findOne({ _id: employeeId, tenantId });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    // Find and update status if expired
    const docs = await EmployeeDocument.find({ tenantId, employeeId }).populate('documentTypeId').sort('-createdAt');
    
    // Auto-update status based on current date
    const updatedDocs = await Promise.all(docs.map(async (doc) => {
      const newStatus = determineStatus(doc.expiryDate);
      if (newStatus !== doc.status) {
        doc.status = newStatus;
        await doc.save();
      }
      return doc;
    }));
    
    res.json(updatedDocs);
  } catch (error) {
    console.error('Error getting employee documents:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.viewDocument = async (req, res) => {
  try {
    const { employeeId, documentId } = req.params;
    const tenantId = req.user.tenantId;

    const doc = await EmployeeDocument.findOne({ _id: documentId, employeeId, tenantId });
    if (!doc) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    let filePath;
    if (doc.storageKey) {
       filePath = path.join(__dirname, '../../../../private_uploads', tenantId.toString(), employeeId.toString(), doc.storageKey);
    } else if (doc.fileUrl) {
       filePath = path.join(__dirname, '../../../../', doc.fileUrl);
    }

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: 'Physical file not found.' });
    }
  } catch (error) {
    console.error('Error viewing employee document:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.updateDocument = async (req, res) => {
  try {
    const { employeeId, documentId } = req.params;
    const { documentName, documentNumber, issuingCountry, issueDate, expiryDate, notes } = req.body;
    const tenantId = req.user.tenantId;

    let doc = await EmployeeDocument.findOne({ _id: documentId, employeeId, tenantId });
    if (!doc) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Document not found.' });
    }

    if (req.file) {
        if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
           fs.unlinkSync(req.file.path);
           return res.status(400).json({ message: 'Invalid file type.' });
        }
        if (req.file.size > MAX_FILE_SIZE) {
           fs.unlinkSync(req.file.path);
           return res.status(400).json({ message: 'File size exceeds 5MB limit.' });
        }
        
        // Delete old file
        let oldPath;
        if (doc.storageKey) {
           oldPath = path.join(__dirname, '../../../../private_uploads', tenantId.toString(), employeeId.toString(), doc.storageKey);
        } else if (doc.fileUrl) {
           oldPath = path.join(__dirname, '../../../../', doc.fileUrl);
        }
        
        if (oldPath && fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
        
        const storageKey = uuidv4() + path.extname(req.file.originalname);
        const secureDir = path.join(__dirname, '../../../../private_uploads', tenantId.toString(), employeeId.toString());
        if (!fs.existsSync(secureDir)){
            fs.mkdirSync(secureDir, { recursive: true });
        }
        const securePath = path.join(secureDir, storageKey);
        fs.renameSync(req.file.path, securePath);
        
        doc.storageKey = storageKey;
        doc.originalFileName = req.file.originalname;
        doc.storedFileName = storageKey;
        doc.fileName = req.file.originalname; // Legacy
        doc.mimeType = req.file.mimetype;
        doc.fileSize = req.file.size;
    }

    if (documentName !== undefined) doc.documentName = documentName;
    if (documentNumber !== undefined) doc.documentNumber = documentNumber;
    if (issuingCountry !== undefined) doc.issuingCountry = issuingCountry;
    if (issueDate !== undefined) doc.issueDate = issueDate || null;
    if (expiryDate !== undefined) {
      doc.expiryDate = expiryDate || null;
      doc.status = determineStatus(doc.expiryDate);
    }
    if (notes !== undefined) doc.notes = notes;

    await doc.save();
    res.json(doc);
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Error updating employee document:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const { employeeId, documentId } = req.params;
    const tenantId = req.user.tenantId;

    const doc = await EmployeeDocument.findOne({ _id: documentId, employeeId, tenantId });
    if (!doc) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    let oldPath;
    if (doc.storageKey) {
       oldPath = path.join(__dirname, '../../../../private_uploads', tenantId.toString(), employeeId.toString(), doc.storageKey);
    } else if (doc.fileUrl) {
       oldPath = path.join(__dirname, '../../../../', doc.fileUrl);
    }
    
    if (oldPath && fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }

    await EmployeeDocument.deleteOne({ _id: documentId });
    res.json({ message: 'Document deleted successfully.' });
  } catch (error) {
    console.error('Error deleting employee document:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

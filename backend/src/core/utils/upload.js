const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the base uploads directory exists
const baseSupplierUploadDir = path.join(__dirname, '../../../uploads/suppliers');
if (!fs.existsSync(baseSupplierUploadDir)) {
  fs.mkdirSync(baseSupplierUploadDir, { recursive: true });
}

const baseEmployeeUploadDir = path.join(__dirname, '../../../uploads/employees');
if (!fs.existsSync(baseEmployeeUploadDir)) {
  fs.mkdirSync(baseEmployeeUploadDir, { recursive: true });
}

const baseProductUploadDir = path.join(__dirname, '../../../uploads/products');
if (!fs.existsSync(baseProductUploadDir)) {
  fs.mkdirSync(baseProductUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tenantId = req.user?.tenantId;
    const supplierId = req.params.id;
    
    if (!tenantId || !supplierId) {
      return cb(new Error('Missing tenantId or supplierId for file upload.'));
    }
    
    const dir = path.join(baseSupplierUploadDir, tenantId.toString(), supplierId.toString());
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'owner-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
  }
};

const uploadSupplierPhoto = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  },
  fileFilter: fileFilter
});

const documentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tenantId = req.user?.tenantId;
    const supplierId = req.params.id;
    
    if (!tenantId || !supplierId) {
      return cb(new Error('Missing tenantId or supplierId for file upload.'));
    }
    
    const dir = path.join(baseSupplierUploadDir, tenantId.toString(), supplierId.toString(), 'documents');
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'doc-' + uniqueSuffix + ext);
  }
});

const documentFilter = (req, file, cb) => {
  const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPEG, PNG, and WebP are allowed.'));
  }
};

const uploadSupplierDocument = multer({
  storage: documentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB
  },
  fileFilter: documentFilter
});

const employeeDocumentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tenantId = req.user?.tenantId;
    const employeeId = req.params.employeeId;
    
    if (!tenantId || !employeeId) {
      return cb(new Error('Missing tenantId or employeeId for file upload.'));
    }
    
    const dir = path.join(baseEmployeeUploadDir, tenantId.toString(), employeeId.toString(), 'documents');
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'emp-doc-' + uniqueSuffix + ext);
  }
});

const uploadEmployeeDocument = multer({
  storage: employeeDocumentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB
  },
  fileFilter: documentFilter
});

const employeePhotoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tenantId = req.user?.tenantId;
    const employeeId = req.params.id;
    
    if (!tenantId || !employeeId) {
      return cb(new Error('Missing tenantId or employeeId for file upload.'));
    }
    
    const dir = path.join(baseEmployeeUploadDir, tenantId.toString(), employeeId.toString(), 'photo');
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'profile-' + uniqueSuffix + ext);
  }
});

const uploadEmployeePhoto = multer({
  storage: employeePhotoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  },
  fileFilter: fileFilter
});

const familyDocumentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tenantId = req.user?.tenantId;
    const employeeId = req.params.id;
    
    if (!tenantId || !employeeId) {
      return cb(new Error('Missing tenantId or employeeId for file upload.'));
    }
    
    const dir = path.join(baseEmployeeUploadDir, tenantId.toString(), employeeId.toString(), 'family');
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'family-doc-' + uniqueSuffix + ext);
  }
});

const uploadFamilyDocument = multer({
  storage: familyDocumentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB
  },
  fileFilter: documentFilter
});

const productPhotoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tenantId = req.user?.tenantId;
    const productId = req.params.id;
    
    if (!tenantId || !productId) {
      return cb(new Error('Missing tenantId or productId for file upload.'));
    }
    
    const dir = path.join(baseProductUploadDir, tenantId.toString(), productId.toString());
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'product-' + uniqueSuffix + ext);
  }
});

const uploadProductImages = multer({
  storage: productPhotoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  },
  fileFilter: fileFilter
});

module.exports = {
  uploadSupplierPhoto,
  uploadSupplierDocument,
  uploadEmployeeDocument,
  uploadEmployeePhoto,
  uploadFamilyDocument,
  uploadProductImages
};

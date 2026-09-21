const EmployeeIdentification = require('../../core/models/EmployeeIdentification');
const Employee = require('../../core/models/Employee');

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

const maskString = (str) => {
  if (!str) return '';
  if (str.length <= 4) return '****';
  return '*'.repeat(str.length - 4) + str.substring(str.length - 4);
};

exports.createIdentification = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { identificationType, identificationNumber, issuingCountry, issueDate, expiryDate, remarks } = req.body;
    const tenantId = req.user.tenantId;

    if (!identificationType || !identificationNumber) {
      return res.status(400).json({ message: 'Type and Number are required.' });
    }

    const employee = await Employee.findOne({ _id: employeeId, tenantId });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    const status = determineStatus(expiryDate);
    const maskedIdentificationNumber = maskString(identificationNumber);

    const ident = new EmployeeIdentification({
      tenantId,
      employeeId,
      identificationType,
      identificationNumber, // Storing full number but protected
      maskedIdentificationNumber,
      issuingCountry,
      issueDate: issueDate || null,
      expiryDate: expiryDate || null,
      status,
      remarks,
      createdBy: req.user.id
    });

    await ident.save();
    
    // Return masked version by default
    const identObj = ident.toObject();
    delete identObj.identificationNumber;
    
    res.status(201).json(identObj);
  } catch (error) {
    console.error('Error creating employee identification:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.getIdentifications = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const tenantId = req.user.tenantId;
    
    const employee = await Employee.findOne({ _id: employeeId, tenantId });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    const idents = await EmployeeIdentification.find({ tenantId, employeeId }).select('-identificationNumber').sort('-createdAt');
    res.json(idents);
  } catch (error) {
    console.error('Error getting employee identifications:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.updateIdentification = async (req, res) => {
  try {
    const { employeeId, identificationId } = req.params;
    const { identificationType, identificationNumber, issuingCountry, issueDate, expiryDate, remarks } = req.body;
    const tenantId = req.user.tenantId;

    let ident = await EmployeeIdentification.findOne({ _id: identificationId, employeeId, tenantId });
    if (!ident) {
      return res.status(404).json({ message: 'Identification not found.' });
    }

    if (identificationType !== undefined) ident.identificationType = identificationType;
    if (identificationNumber) {
      ident.identificationNumber = identificationNumber;
      ident.maskedIdentificationNumber = maskString(identificationNumber);
    }
    if (issuingCountry !== undefined) ident.issuingCountry = issuingCountry;
    if (issueDate !== undefined) ident.issueDate = issueDate || null;
    if (expiryDate !== undefined) {
      ident.expiryDate = expiryDate || null;
      ident.status = determineStatus(ident.expiryDate);
    }
    if (remarks !== undefined) ident.remarks = remarks;
    ident.updatedBy = req.user.id;

    await ident.save();
    
    const identObj = ident.toObject();
    delete identObj.identificationNumber;
    
    res.json(identObj);
  } catch (error) {
    console.error('Error updating employee identification:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.deleteIdentification = async (req, res) => {
  try {
    const { employeeId, identificationId } = req.params;
    const tenantId = req.user.tenantId;

    const result = await EmployeeIdentification.deleteOne({ _id: identificationId, employeeId, tenantId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Identification not found.' });
    }

    res.json({ message: 'Identification deleted successfully.' });
  } catch (error) {
    console.error('Error deleting employee identification:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.unmaskIdentification = async (req, res) => {
  try {
    const { employeeId, identificationId } = req.params;
    const tenantId = req.user.tenantId;
    
    // Auth Check for unmask permission should happen in middleware, but we'll assume it's there
    // If we have explicit permission check we could do it here
    if (!req.user.permissions?.includes('*') && !req.user.permissions?.includes('HR.EMPLOYEE_IDENTIFICATION.VIEW_SENSITIVE')) {
      return res.status(403).json({ message: 'Forbidden. Required permission: HR.EMPLOYEE_IDENTIFICATION.VIEW_SENSITIVE' });
    }

    const ident = await EmployeeIdentification.findOne({ _id: identificationId, employeeId, tenantId });
    if (!ident) {
      return res.status(404).json({ message: 'Identification not found.' });
    }

    res.json({ identificationNumber: ident.identificationNumber });
  } catch (error) {
    console.error('Error unmasking employee identification:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

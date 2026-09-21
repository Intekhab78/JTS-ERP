const Company = require('../../core/models/Company');

// @desc    Get company profile
// @route   GET /api/v1/company
// @access  Private
exports.getCompanyProfile = async (req, res) => {
  try {
    if (!req.user.tenantId) {
      // Global superadmin case
      return res.status(200).json({ 
        name: 'Platform (Global Admin)', 
        isPlatform: true,
        address: {},
        currency: 'USD'
      });
    }

    const company = await Company.findById(req.user.tenantId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    res.status(200).json(company);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update company profile
// @route   PUT /api/v1/company
// @access  Private
exports.updateCompanyProfile = async (req, res) => {
  try {
    if (!req.user.tenantId) {
      return res.status(400).json({ message: 'Global Superadmins do not have a company profile to update.' });
    }

    const company = await Company.findByIdAndUpdate(
      req.user.tenantId,
      req.body,
      { returnDocument: 'after', runValidators: true }
    );
    res.status(200).json(company);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all companies (Superadmin only)
// @route   GET /api/v1/company/all
// @access  Private/Superadmin
exports.getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });
    res.status(200).json(companies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new company (Superadmin only)
// @route   POST /api/v1/company
// @access  Private/Superadmin
exports.createCompany = async (req, res) => {
  try {
    const { 
      name, legalName, taxId, registrationNumber, industry, companyType,
      contact, address, currency, settings
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Company name is required' });
    }
    if (!address || !address.country) {
      return res.status(400).json({ message: 'Country is required' });
    }
    if (!currency) {
      return res.status(400).json({ message: 'Default Currency is required' });
    }

    const company = await Company.create({
      name: name.trim(),
      legalName: legalName ? legalName.trim() : undefined,
      taxId: taxId ? taxId.trim() : undefined,
      registrationNumber: registrationNumber ? registrationNumber.trim() : undefined,
      industry,
      companyType,
      contact,
      address,
      currency,
      settings: {
        timeZone: settings?.timeZone || 'UTC',
        fiscalYearStart: settings?.fiscalYearStart || 'January',
        dateFormat: settings?.dateFormat || 'YYYY-MM-DD'
      }
    });

    // Automatically create a Tenant Admin role for the new company
    const Role = require('../../core/models/Role');
    await Role.create({
      name: 'Tenant Admin',
      description: 'Full access to tenant resources',
      permissions: ['*'],
      tenantId: company._id,
      isSystem: true
    });

    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

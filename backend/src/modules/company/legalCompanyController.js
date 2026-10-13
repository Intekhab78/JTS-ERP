const LegalCompany = require('../../core/models/LegalCompany');

// @desc    Get all accessible legal companies for the current user/workspace (for dropdowns/selectors)
// @route   GET /api/v1/legal-company/my-companies
// @access  Private
exports.getMyCompanies = async (req, res) => {
  try {
    const tenantId = req.user && (req.user.activeTenantId || req.user.tenantId);
    if (!tenantId) {
      return res.status(403).json({ message: 'Forbidden: Missing tenant context' });
    }

    const accessibleCompanyIds = req.user.accessibleCompanyIds || [];
    
    if (accessibleCompanyIds.length === 0) {
      return res.status(200).json([]);
    }

    const companies = await LegalCompany.find({
      _id: { $in: accessibleCompanyIds },
      tenantId: tenantId
    }).sort({ name: 1 });

    res.status(200).json(companies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all legal companies under a tenant (Admin view)
// @route   GET /api/v1/legal-company
// @access  Private
exports.getAllLegalCompanies = async (req, res) => {
  try {
    const tenantId = req.user && (req.user.activeTenantId || req.user.tenantId);
    const accessibleCompanyIds = req.user.accessibleCompanyIds || [];
    
    if (accessibleCompanyIds.length === 0) {
      return res.status(200).json([]);
    }

    const companies = await LegalCompany.find({ 
      _id: { $in: accessibleCompanyIds },
      tenantId: tenantId 
    }).sort({ createdAt: -1 });
    
    res.status(200).json(companies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new legal company
// @route   POST /api/v1/legal-company
// @access  Private
exports.createLegalCompany = async (req, res) => {
  try {
    const tenantId = req.user && (req.user.activeTenantId || req.user.tenantId);
    const newCompany = await LegalCompany.create({
      ...req.body,
      tenantId: tenantId,
      createdBy: req.user._id
    });
    res.status(201).json(newCompany);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get a single legal company by ID
// @route   GET /api/v1/legal-company/:id
// @access  Private
exports.getLegalCompanyById = async (req, res) => {
  try {
    const tenantId = req.user && (req.user.activeTenantId || req.user.tenantId);
    const company = await LegalCompany.findOne({ _id: req.params.id, tenantId });
    
    if (!company) {
      return res.status(404).json({ message: 'Legal company not found' });
    }
    
    if (!req.user.isGlobalAdmin && !req.user.isTenantAdmin) {
      const accessibleCompanyIds = req.user.accessibleCompanyIds || [];
      if (!accessibleCompanyIds.includes(company._id.toString())) {
        return res.status(403).json({ message: 'Forbidden: No access to this company' });
      }
    }
    
    res.status(200).json(company);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a legal company
// @route   PUT /api/v1/legal-company/:id
// @access  Private
exports.updateLegalCompany = async (req, res) => {
  try {
    const tenantId = req.user && (req.user.activeTenantId || req.user.tenantId);
    const company = await LegalCompany.findOneAndUpdate(
      { _id: req.params.id, tenantId: tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!company) {
      return res.status(404).json({ message: 'Legal company not found' });
    }
    res.status(200).json(company);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a legal company
// @route   DELETE /api/v1/legal-company/:id
// @access  Private
exports.deleteLegalCompany = async (req, res) => {
  try {
    const tenantId = req.user && (req.user.activeTenantId || req.user.tenantId);
    const company = await LegalCompany.findOneAndDelete({ _id: req.params.id, tenantId: tenantId });
    if (!company) {
      return res.status(404).json({ message: 'Legal company not found' });
    }
    res.status(200).json({ message: 'Legal company removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

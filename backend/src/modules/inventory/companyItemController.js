const companyItemService = require('../../services/companyItemService');

// @desc    Create a new CompanyItem
// @route   POST /api/v1/company-items
// @access  Private
exports.createCompanyItem = async (req, res) => {
  try {
    const tenantId = req.user.activeTenantId || req.user.tenantId;
    if (!tenantId) return res.status(403).json({ message: 'Missing tenant context' });

    const companyItem = await companyItemService.createCompanyItem(
      { ...req.body, tenantId },
      req.user
    );

    res.status(201).json(companyItem);
  } catch (error) {
    if (error.message.includes('authorized') || error.message.includes('not found or does not belong')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a CompanyItem
// @route   PUT /api/v1/company-items/:id
// @access  Private
exports.updateCompanyItem = async (req, res) => {
  try {
    const tenantId = req.user.activeTenantId || req.user.tenantId;
    if (!tenantId) return res.status(403).json({ message: 'Missing tenant context' });

    const companyItem = await companyItemService.updateCompanyItem(
      req.params.id,
      req.body,
      tenantId,
      req.user
    );

    res.status(200).json(companyItem);
  } catch (error) {
    if (error.message.includes('authorized') || error.message.includes('not found')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get a CompanyItem by ID
// @route   GET /api/v1/company-items/:id
// @access  Private
exports.getCompanyItemById = async (req, res) => {
  try {
    const tenantId = req.user.activeTenantId || req.user.tenantId;
    if (!tenantId) return res.status(403).json({ message: 'Missing tenant context' });

    const companyItem = await companyItemService.getCompanyItemById(
      req.params.id,
      tenantId,
      req.user
    );

    if (!companyItem) {
      return res.status(404).json({ message: 'CompanyItem not found' });
    }

    res.status(200).json(companyItem);
  } catch (error) {
    if (error.message.includes('authorized')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get CompanyItem by Product and LegalCompany
// @route   GET /api/v1/company-items/lookup
// @access  Private
exports.lookupCompanyItem = async (req, res) => {
  try {
    const tenantId = req.user.activeTenantId || req.user.tenantId;
    if (!tenantId) return res.status(403).json({ message: 'Missing tenant context' });

    const { productId, legalCompanyId, companySku } = req.query;

    if (!legalCompanyId) {
      return res.status(400).json({ message: 'legalCompanyId query parameter is required' });
    }

    let companyItem;
    if (productId) {
      companyItem = await companyItemService.getByProductAndCompany(productId, legalCompanyId, tenantId, req.user);
    } else if (companySku) {
      companyItem = await companyItemService.getByCompanySku(companySku, legalCompanyId, tenantId, req.user);
    } else {
      return res.status(400).json({ message: 'productId or companySku query parameter is required' });
    }

    if (!companyItem) {
      return res.status(404).json({ message: 'CompanyItem not found' });
    }

    res.status(200).json(companyItem);
  } catch (error) {
    if (error.message.includes('authorized')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(400).json({ message: error.message });
  }
};

const mongoose = require('mongoose');
const Uom = require('../../core/models/Uom');
const UomConversion = require('../../core/models/UomConversion');
const Product = require('../../core/models/Product');
const Company = require('../../core/models/Company');

// Helper to resolve dynamic tenant ID (supports Global Admin workspace selection)
const getTenantId = async (req) => {
  if (req.user && (req.user.activeTenantId || req.user.tenantId)) {
    return req.user.activeTenantId || req.user.tenantId;
  }
  const headerTenant = req.headers ? req.headers['x-tenant-id'] : null;
  if (headerTenant && headerTenant !== 'ALL') {
    return headerTenant;
  }
  const company = await Company.findOne({ name: /JTS middleeast/i }) || await Company.findOne();
  if (!company) throw new Error('No company/tenant found in the system');
  return company._id;
};

// Helper to safely filter by either ObjectId or Code/Name
const getIdOrNameFilter = (id, tenantId) => {
  const decoded = decodeURIComponent(id);
  if (mongoose.isValidObjectId(decoded)) {
    return { _id: decoded, tenantId };
  }
  return {
    tenantId,
    $or: [
      { code: new RegExp(`^${decoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      { name: new RegExp(`^${decoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    ]
  };
};

// Standard ERP UOM templates
const DEFAULT_UOMS = [
  { name: 'Piece', code: 'PCS' },
  { name: 'Box', code: 'BOX' },
  { name: 'Kilogram', code: 'KG' },
  { name: 'Gram', code: 'G' },
  { name: 'Meter', code: 'MTR' },
  { name: 'Liter', code: 'LTR' },
  { name: 'Dozen', code: 'DOZ' },
  { name: 'Pack', code: 'PCK' },
  { name: 'Carton', code: 'CTN' },
  { name: 'Set', code: 'SET' },
  { name: 'Pair', code: 'PR' },
  { name: 'Roll', code: 'ROL' }
];

// Standard conversion rules
const DEFAULT_CONVERSIONS = [
  { fromUom: 'Dozen', toUom: 'Piece', conversionFactor: 12 },
  { fromUom: 'Box', toUom: 'Piece', conversionFactor: 10 },
  { fromUom: 'Carton', toUom: 'Piece', conversionFactor: 24 },
  { fromUom: 'Kilogram', toUom: 'Gram', conversionFactor: 1000 },
  { fromUom: 'Set', toUom: 'Piece', conversionFactor: 2 }
];

// ==========================================
// UOM Master
// ==========================================

// @desc    Get all UOMs for the tenant
// @route   GET /api/v1/inventory/uoms
// @access  Private
exports.getUoms = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);

    const filter = { tenantId };
    if (req.query.includeInactive !== 'true') {
      filter.isActive = { $ne: false };
    }

    let uoms = await Uom.find(filter).sort({ name: 1 });

    // Auto-seed standard UOMs if tenant currently has none
    if (uoms.length === 0) {
      const uomsToInsert = DEFAULT_UOMS.map(u => ({ ...u, tenantId, isActive: true }));
      await Uom.insertMany(uomsToInsert, { ordered: false }).catch(() => {});
      uoms = await Uom.find(filter).sort({ name: 1 });
    }

    res.status(200).json(uoms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a UOM
// @route   POST /api/v1/inventory/uoms
// @access  Private
exports.createUom = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const { name, code, isActive } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Please provide a UOM name' });
    }
    if (!code || !code.trim()) {
      return res.status(400).json({ message: 'Please provide a UOM code' });
    }

    const uom = await Uom.create({
      tenantId,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json(uom);
  } catch (error) {
    let errorMsg = error.message;
    if (error.code === 11000) {
      errorMsg = 'A UOM with this code already exists.';
    }
    res.status(400).json({ message: errorMsg || 'Error creating UOM', error: error.message });
  }
};

// @desc    Update a UOM
// @route   PUT /api/v1/inventory/uoms/:id
// @access  Private
exports.updateUom = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const filter = getIdOrNameFilter(req.params.id, tenantId);
    
    const updateData = { ...req.body };
    if (updateData.code) updateData.code = updateData.code.trim().toUpperCase();
    if (updateData.name) updateData.name = updateData.name.trim();

    const uom = await Uom.findOneAndUpdate(
      filter,
      updateData,
      { returnDocument: 'after', runValidators: true }
    );

    if (!uom) return res.status(404).json({ message: 'UOM not found' });
    res.status(200).json(uom);
  } catch (error) {
    let errorMsg = error.message;
    if (error.code === 11000) {
      errorMsg = 'A UOM with this code already exists.';
    }
    res.status(400).json({ message: errorMsg || 'Error updating UOM', error: error.message });
  }
};

// @desc    Delete a UOM
// @route   DELETE /api/v1/inventory/uoms/:id
// @access  Private
exports.deleteUom = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const filter = getIdOrNameFilter(req.params.id, tenantId);
    
    const uom = await Uom.findOne(filter);
    if (!uom) return res.status(404).json({ message: 'UOM not found' });

    // Delete protection check
    const isUsed = await Product.exists({
      tenantId,
      $or: [
        { uom: uom.name },
        { 'uomDetails.baseUnit': uom.name },
        { 'uomDetails.purchaseUnit': uom.name },
        { 'uomDetails.salesUnit': uom.name },
        { weightUom: uom.name }
      ]
    });
    if (isUsed) {
      return res.status(400).json({ message: 'UOM cannot be deleted because it is being used by existing products or transactions.' });
    }

    await Uom.findOneAndDelete({ _id: uom._id });
    res.status(200).json({ message: 'UOM deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting UOM', error: error.message });
  }
};

// ==========================================
// UOM Conversion Master
// ==========================================

// @desc    Get all UOM Conversions
// @route   GET /api/v1/inventory/uom-conversions
// @access  Private
exports.getConversions = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);

    const filter = { tenantId };
    if (req.query.includeInactive !== 'true') {
      filter.isActive = { $ne: false };
    }

    let conversions = await UomConversion.find(filter).sort({ fromUom: 1, toUom: 1 });

    // Auto-seed standard conversions if tenant has none
    if (conversions.length === 0) {
      const convsToInsert = DEFAULT_CONVERSIONS.map(c => ({ ...c, tenantId, isActive: true }));
      await UomConversion.insertMany(convsToInsert, { ordered: false }).catch(() => {});
      conversions = await UomConversion.find(filter).sort({ fromUom: 1, toUom: 1 });
    }

    res.status(200).json(conversions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a UOM Conversion
// @route   POST /api/v1/inventory/uom-conversions
// @access  Private
exports.createConversion = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const { fromUom, toUom, conversionFactor, isActive } = req.body;

    if (!fromUom || !toUom || !conversionFactor) {
      return res.status(400).json({ message: 'Please provide from UOM, to UOM, and conversion factor' });
    }

    const conversion = await UomConversion.create({
      tenantId,
      fromUom: fromUom.trim(),
      toUom: toUom.trim(),
      conversionFactor: Number(conversionFactor),
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json(conversion);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'This conversion mapping already exists.' });
    }
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a UOM Conversion
// @route   PUT /api/v1/inventory/uom-conversions/:id
// @access  Private
exports.updateConversion = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    
    const updateData = { ...req.body };
    if (updateData.conversionFactor) updateData.conversionFactor = Number(updateData.conversionFactor);

    const conversion = await UomConversion.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      updateData,
      { returnDocument: 'after', runValidators: true }
    );

    if (!conversion) return res.status(404).json({ message: 'Conversion not found' });
    res.status(200).json(conversion);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'This conversion mapping already exists.' });
    }
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a UOM Conversion
// @route   DELETE /api/v1/inventory/uom-conversions/:id
// @access  Private
exports.deleteConversion = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    
    const conversion = await UomConversion.findOne({ _id: req.params.id, tenantId });
    if (!conversion) return res.status(404).json({ message: 'Conversion not found' });

    // Delete protection check
    const isUsed = await Product.exists({
      tenantId,
      'uomDetails.baseUnit': conversion.toUom,
      $or: [
        { 'uomDetails.purchaseUnit': conversion.fromUom },
        { 'uomDetails.salesUnit': conversion.fromUom }
      ]
    });
    if (isUsed) {
      return res.status(400).json({ message: 'Conversion cannot be deleted because it is being used by existing products.' });
    }

    await UomConversion.findOneAndDelete({ _id: req.params.id, tenantId });
    res.status(200).json({ message: 'Conversion deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

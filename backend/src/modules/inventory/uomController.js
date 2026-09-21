const Uom = require('../../core/models/Uom');
const UomConversion = require('../../core/models/UomConversion');
const Product = require('../../core/models/Product');

// ==========================================
// UOM Master
// ==========================================

// @desc    Get all UOMs for the tenant
// @route   GET /api/v1/inventory/uoms
// @access  Private
exports.getUoms = async (req, res) => {
  try {
    let tenantId = req.user.tenantId;
    if (!tenantId) tenantId = req.query.tenantId;

    const filter = { tenantId };
    if (req.query.includeInactive !== 'true') {
      filter.isActive = { $ne: false };
    }

    const uoms = await Uom.find(filter).sort({ name: 1 });
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
    let tenantId = req.user.tenantId || req.body.tenantId;
    
    const { name, code, isActive } = req.body;

    const uom = await Uom.create({
      tenantId, name, code, isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json(uom);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'UOM with this code already exists.' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a UOM
// @route   PUT /api/v1/inventory/uoms/:id
// @access  Private
exports.updateUom = async (req, res) => {
  try {
    let tenantId = req.user.tenantId || req.body.tenantId || req.query.tenantId;
    
    const uom = await Uom.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      req.body,
      { returnDocument: 'after', runValidators: true }
    );

    if (!uom) return res.status(404).json({ message: 'UOM not found' });
    res.status(200).json(uom);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'UOM with this code already exists.' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a UOM
// @route   DELETE /api/v1/inventory/uoms/:id
// @access  Private
exports.deleteUom = async (req, res) => {
  try {
    let tenantId = req.user.tenantId || req.body.tenantId || req.query.tenantId;
    
    const uom = await Uom.findOne({ _id: req.params.id, tenantId });
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

    await Uom.findOneAndDelete({ _id: req.params.id, tenantId });
    res.status(200).json({ message: 'UOM deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    let tenantId = req.user.tenantId;
    if (!tenantId) tenantId = req.query.tenantId;

    const filter = { tenantId };
    if (req.query.includeInactive !== 'true') {
      filter.isActive = { $ne: false };
    }

    const conversions = await UomConversion.find(filter).sort({ fromUom: 1, toUom: 1 });
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
    let tenantId = req.user.tenantId || req.body.tenantId;
    const { fromUom, toUom, conversionFactor, isActive } = req.body;

    const conversion = await UomConversion.create({
      tenantId, fromUom, toUom, conversionFactor, isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json(conversion);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'This conversion mapping already exists.' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a UOM Conversion
// @route   PUT /api/v1/inventory/uom-conversions/:id
// @access  Private
exports.updateConversion = async (req, res) => {
  try {
    let tenantId = req.user.tenantId || req.body.tenantId || req.query.tenantId;
    
    const conversion = await UomConversion.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      req.body,
      { returnDocument: 'after', runValidators: true }
    );

    if (!conversion) return res.status(404).json({ message: 'Conversion not found' });
    res.status(200).json(conversion);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'This conversion mapping already exists.' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a UOM Conversion
// @route   DELETE /api/v1/inventory/uom-conversions/:id
// @access  Private
exports.deleteConversion = async (req, res) => {
  try {
    let tenantId = req.user.tenantId || req.body.tenantId || req.query.tenantId;
    
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
    res.status(200).json({ message: 'Conversion deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

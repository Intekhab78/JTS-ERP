const mongoose = require('mongoose');
const Family = require('../../core/models/Family');
const SubFamily = require('../../core/models/SubFamily');
const Size = require('../../core/models/Size');
const Color = require('../../core/models/Color');
const ItemDepartment = require('../../core/models/ItemDepartment');
const Product = require('../../core/models/Product');
const ItemType = require('../../core/models/ItemType');
const Company = require('../../core/models/Company');
const EcomSettings = require('../../core/models/EcomSettings');

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

// Helper to safely filter by either ObjectId or Name
const getIdOrNameFilter = (id, tenantId) => {
  const decoded = decodeURIComponent(id);
  if (mongoose.isValidObjectId(decoded)) {
    return { _id: decoded, tenantId };
  }
  return { name: new RegExp(`^${decoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), tenantId };
};

// --- ITEM DEPARTMENT CONTROLLERS ---

exports.getDepartments = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const departments = await ItemDepartment.find({ tenantId }).sort({ createdAt: -1 });
    res.status(200).json(departments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching departments', error: error.message });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const { name, code, isActive } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Please provide a department name' });
    }
    const department = await ItemDepartment.create({
      tenantId,
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : undefined,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user._id
    });

    // Auto-map to ecommerce settings so products show up seamlessly
    EcomSettings.updateOne(
      { tenantId },
      { $addToSet: { mappedDepartments: department._id.toString() } }
    ).catch(() => {});

    res.status(201).json(department);
  } catch (error) {
    let errorMsg = error.message;
    if (error.code === 11000) {
      errorMsg = 'A department with this name or code already exists.';
    }
    res.status(400).json({ message: errorMsg || 'Error creating department', error: error.message });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const filter = getIdOrNameFilter(req.params.id, tenantId);
    const department = await ItemDepartment.findOneAndUpdate(
      filter,
      { ...req.body, updatedBy: req.user?._id },
      { returnDocument: 'after', runValidators: true }
    );
    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.status(200).json(department);
  } catch (error) {
    res.status(400).json({ message: 'Error updating department', error: error.message });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const filter = getIdOrNameFilter(req.params.id, tenantId);
    const department = await ItemDepartment.findOne(filter);
    if (!department) return res.status(404).json({ message: 'Department not found' });

    // Delete protection check
    const isUsed = await Product.exists({ tenantId, department: department.name });
    if (isUsed) {
      return res.status(400).json({ message: 'Department cannot be deleted because it is being used by existing products.' });
    }

    await ItemDepartment.findOneAndDelete({ _id: department._id });
    res.status(200).json({ message: 'Department deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting department', error: error.message });
  }
};

// --- FAMILY CONTROLLERS ---

exports.getFamilies = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const families = await Family.find({ tenantId }).populate('categoryId', 'name code').sort({ createdAt: -1 });
    res.status(200).json(families);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching families', error: error.message });
  }
};

exports.createFamily = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const { name, code, isActive, categoryId } = req.body;
    const family = await Family.create({
      tenantId,
      name,
      code: code ? code.trim().toUpperCase() : undefined,
      isActive: isActive !== undefined ? isActive : true,
      categoryId: categoryId || undefined,
      createdBy: req.user._id
    });

    // Auto-map to ecommerce settings
    EcomSettings.updateOne(
      { tenantId },
      { $addToSet: { mappedFamilies: family._id.toString() } }
    ).catch(() => {});

    const populated = await Family.findById(family._id).populate('categoryId', 'name code');
    res.status(201).json(populated || family);
  } catch (error) {
    res.status(400).json({ message: 'Error creating family', error: error.message });
  }
};

exports.updateFamily = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const filter = getIdOrNameFilter(req.params.id, tenantId);
    const updateData = { ...req.body, updatedBy: req.user?._id };
    if (updateData.code) {
      updateData.code = updateData.code.trim().toUpperCase();
    }
    const family = await Family.findOneAndUpdate(
      filter,
      updateData,
      { returnDocument: 'after', runValidators: true }
    ).populate('categoryId', 'name code');
    if (!family) return res.status(404).json({ message: 'Family not found' });
    res.status(200).json(family);
  } catch (error) {
    res.status(400).json({ message: 'Error updating family', error: error.message });
  }
};

exports.deleteFamily = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const filter = getIdOrNameFilter(req.params.id, tenantId);
    const family = await Family.findOne(filter);
    if (!family) return res.status(404).json({ message: 'Family not found' });

    // Delete protection check
    const isUsed = await Product.exists({ tenantId, family: family.name });
    if (isUsed) {
      return res.status(400).json({ message: 'Family cannot be deleted because it is being used by existing products.' });
    }

    await Family.findOneAndDelete({ _id: family._id });
    res.status(200).json({ message: 'Family deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting family', error: error.message });
  }
};

// --- SUB-FAMILY CONTROLLERS ---

exports.getSubFamilies = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    let query = { tenantId };
    if (req.query.familyId) {
      query.familyId = req.query.familyId;
    }
    const subFamilies = await SubFamily.find(query).populate('familyId', 'name').sort({ createdAt: -1 });
    res.status(200).json(subFamilies);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sub-families', error: error.message });
  }
};

exports.createSubFamily = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const { familyId, name, code, isActive } = req.body;
    if (!familyId) {
      return res.status(400).json({ message: 'Parent Family is required to create a Sub Family' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Please provide a sub-family name' });
    }
    const subFamily = await SubFamily.create({
      tenantId,
      familyId,
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : undefined,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user ? req.user._id : undefined
    });

    // Auto-map to ecommerce settings
    EcomSettings.updateOne(
      { tenantId },
      { $addToSet: { mappedSubFamilies: subFamily._id.toString() } }
    ).catch(() => {});

    const populated = await SubFamily.findById(subFamily._id).populate('familyId', 'name');
    res.status(201).json(populated || subFamily);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Sub Family with this name or code already exists for this Family.' });
    }
    res.status(400).json({ message: 'Error creating sub-family', error: error.message });
  }
};

exports.updateSubFamily = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const filter = getIdOrNameFilter(req.params.id, tenantId);
    const updateData = { ...req.body, updatedBy: req.user?._id };
    if (updateData.code) {
      updateData.code = updateData.code.trim().toUpperCase();
    }
    const subFamily = await SubFamily.findOneAndUpdate(
      filter,
      updateData,
      { returnDocument: 'after', runValidators: true }
    ).populate('familyId', 'name');
    if (!subFamily) return res.status(404).json({ message: 'SubFamily not found' });
    res.status(200).json(subFamily);
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.code) {
      return res.status(400).json({ message: 'Sub Family code already exists for this Family.' });
    }
    res.status(400).json({ message: 'Error updating sub-family', error: error.message });
  }
};

exports.deleteSubFamily = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const filter = getIdOrNameFilter(req.params.id, tenantId);
    const subFamily = await SubFamily.findOne(filter);
    if (!subFamily) return res.status(404).json({ message: 'SubFamily not found' });

    // Delete protection check
    const isUsed = await Product.exists({ tenantId, subFamily: subFamily.name });
    if (isUsed) {
      return res.status(400).json({ message: 'Sub Family cannot be deleted because it is being used by existing products.' });
    }

    await SubFamily.findOneAndDelete({ _id: subFamily._id });
    res.status(200).json({ message: 'SubFamily deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting sub-family', error: error.message });
  }
};

// --- SIZE CONTROLLERS ---

exports.getSizes = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const sizes = await Size.find({ tenantId }).sort({ createdAt: -1 });
    res.status(200).json(sizes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sizes', error: error.message });
  }
};

exports.createSize = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const { name, code, isActive } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Please provide a size name' });
    }
    const size = await Size.create({
      tenantId,
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : undefined,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user ? req.user._id : undefined
    });
    res.status(201).json(size);
  } catch (error) {
    let errorMsg = error.message;
    if (error.code === 11000) {
      errorMsg = 'A size with this name or code already exists.';
    }
    res.status(400).json({ message: errorMsg || 'Error creating size', error: error.message });
  }
};

exports.updateSize = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const filter = getIdOrNameFilter(req.params.id, tenantId);
    const size = await Size.findOneAndUpdate(
      filter,
      { ...req.body, updatedBy: req.user ? req.user._id : undefined },
      { returnDocument: 'after', runValidators: true }
    );
    if (!size) return res.status(404).json({ message: 'Size not found' });
    res.status(200).json(size);
  } catch (error) {
    res.status(400).json({ message: 'Error updating size', error: error.message });
  }
};

exports.deleteSize = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const filter = getIdOrNameFilter(req.params.id, tenantId);
    const size = await Size.findOne(filter);
    if (!size) return res.status(404).json({ message: 'Size not found' });

    // Delete protection check
    const isUsed = await Product.exists({ tenantId, size: size.name });
    if (isUsed) {
      return res.status(400).json({ message: 'Size cannot be deleted because it is being used by existing products.' });
    }

    await Size.findOneAndDelete({ _id: size._id });
    res.status(200).json({ message: 'Size deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting size', error: error.message });
  }
};

// --- COLOR CONTROLLERS ---

exports.getColors = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const colors = await Color.find({ tenantId }).sort({ createdAt: -1 });
    res.status(200).json(colors);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching colors', error: error.message });
  }
};

exports.createColor = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const { name, code, isActive } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Please provide a color name' });
    }
    const color = await Color.create({
      tenantId,
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : undefined,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user ? req.user._id : undefined
    });
    res.status(201).json(color);
  } catch (error) {
    let errorMsg = error.message;
    if (error.code === 11000) {
      errorMsg = 'A color with this name or code already exists.';
    }
    res.status(400).json({ message: errorMsg || 'Error creating color', error: error.message });
  }
};

exports.updateColor = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const filter = getIdOrNameFilter(req.params.id, tenantId);
    const color = await Color.findOneAndUpdate(
      filter,
      { ...req.body, updatedBy: req.user ? req.user._id : undefined },
      { returnDocument: 'after', runValidators: true }
    );
    if (!color) return res.status(404).json({ message: 'Color not found' });
    res.status(200).json(color);
  } catch (error) {
    res.status(400).json({ message: 'Error updating color', error: error.message });
  }
};

exports.deleteColor = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const filter = getIdOrNameFilter(req.params.id, tenantId);
    const color = await Color.findOne(filter);
    if (!color) return res.status(404).json({ message: 'Color not found' });

    // Delete protection check
    const isUsed = await Product.exists({ tenantId, color: color.name });
    if (isUsed) {
      return res.status(400).json({ message: 'Color cannot be deleted because it is being used by existing products.' });
    }

    await Color.findOneAndDelete({ _id: color._id });
    res.status(200).json({ message: 'Color deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting color', error: error.message });
  }
};

// --- ITEM TYPE CONTROLLERS ---

exports.getItemTypes = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const itemTypes = await ItemType.find({ tenantId }).sort({ createdAt: -1 });
    res.status(200).json(itemTypes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching item types', error: error.message });
  }
};

exports.createItemType = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const { name, code, isActive } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Please provide an item type name' });
    }
    const itemType = await ItemType.create({
      tenantId,
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : undefined,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user ? req.user._id : undefined
    });
    res.status(201).json(itemType);
  } catch (error) {
    let errorMsg = error.message;
    if (error.code === 11000) {
      errorMsg = 'An item type with this name or code already exists.';
    }
    res.status(400).json({ message: errorMsg || 'Error creating item type', error: error.message });
  }
};

exports.updateItemType = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const filter = getIdOrNameFilter(req.params.id, tenantId);
    const itemType = await ItemType.findOneAndUpdate(
      filter,
      { ...req.body, updatedBy: req.user ? req.user._id : undefined },
      { returnDocument: 'after', runValidators: true }
    );
    if (!itemType) return res.status(404).json({ message: 'Item Type not found' });
    res.status(200).json(itemType);
  } catch (error) {
    res.status(400).json({ message: 'Error updating item type', error: error.message });
  }
};

exports.deleteItemType = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const filter = getIdOrNameFilter(req.params.id, tenantId);
    const itemType = await ItemType.findOne(filter);
    if (!itemType) return res.status(404).json({ message: 'Item Type not found' });
    await ItemType.findOneAndDelete({ _id: itemType._id });
    res.status(200).json({ message: 'Item Type deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting item type', error: error.message });
  }
};


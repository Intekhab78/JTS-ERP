const Family = require('../../core/models/Family');
const SubFamily = require('../../core/models/SubFamily');
const Size = require('../../core/models/Size');
const Color = require('../../core/models/Color');
const ItemDepartment = require('../../core/models/ItemDepartment');
const Product = require('../../core/models/Product');

// --- ITEM DEPARTMENT CONTROLLERS ---

exports.getDepartments = async (req, res) => {
  try {
    const departments = await ItemDepartment.find({ tenantId: req.user.tenantId }).sort({ createdAt: -1 });
    res.status(200).json(departments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching departments', error: error.message });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const { name, code, isActive } = req.body;
    const department = await ItemDepartment.create({
      tenantId: req.user.tenantId,
      name,
      code,
      isActive,
      createdBy: req.user._id
    });
    res.status(201).json(department);
  } catch (error) {
    res.status(400).json({ message: 'Error creating department', error: error.message });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const department = await ItemDepartment.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { ...req.body, updatedBy: req.user._id },
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
    const department = await ItemDepartment.findOneAndDelete({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.status(200).json({ message: 'Department deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting department', error: error.message });
  }
};

// --- FAMILY CONTROLLERS ---

exports.getFamilies = async (req, res) => {
  try {
    const families = await Family.find({ tenantId: req.user.tenantId }).sort({ createdAt: -1 });
    res.status(200).json(families);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching families', error: error.message });
  }
};

exports.createFamily = async (req, res) => {
  try {
    const { name, code, isActive, categoryId } = req.body;
    const family = await Family.create({
      tenantId: req.user.tenantId,
      name,
      code,
      isActive,
      categoryId,
      createdBy: req.user._id
    });
    res.status(201).json(family);
  } catch (error) {
    res.status(400).json({ message: 'Error creating family', error: error.message });
  }
};

exports.updateFamily = async (req, res) => {
  try {
    const family = await Family.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { ...req.body, updatedBy: req.user._id },
      { returnDocument: 'after', runValidators: true }
    );
    if (!family) return res.status(404).json({ message: 'Family not found' });
    res.status(200).json(family);
  } catch (error) {
    res.status(400).json({ message: 'Error updating family', error: error.message });
  }
};

exports.deleteFamily = async (req, res) => {
  try {
    const family = await Family.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!family) return res.status(404).json({ message: 'Family not found' });

    // Delete protection check
    const isUsed = await Product.exists({ tenantId: req.user.tenantId, family: family.name });
    if (isUsed) {
      return res.status(400).json({ message: 'Family cannot be deleted because it is being used by existing products.' });
    }

    await Family.findOneAndDelete({ _id: req.params.id, tenantId: req.user.tenantId });
    res.status(200).json({ message: 'Family deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting family', error: error.message });
  }
};

// --- SUB-FAMILY CONTROLLERS ---

exports.getSubFamilies = async (req, res) => {
  try {
    let query = { tenantId: req.user.tenantId };
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
    const { familyId, name, code, isActive } = req.body;
    const subFamily = await SubFamily.create({
      tenantId: req.user.tenantId,
      familyId,
      name,
      code,
      isActive,
      createdBy: req.user._id
    });
    res.status(201).json(subFamily);
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.code) {
      return res.status(400).json({ message: 'Sub Family code already exists for this Family.' });
    }
    res.status(400).json({ message: 'Error creating sub-family', error: error.message });
  }
};

exports.updateSubFamily = async (req, res) => {
  try {
    const subFamily = await SubFamily.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { ...req.body, updatedBy: req.user._id },
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
    const subFamily = await SubFamily.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!subFamily) return res.status(404).json({ message: 'SubFamily not found' });

    // Delete protection check
    const isUsed = await Product.exists({ tenantId: req.user.tenantId, subFamily: subFamily.name });
    if (isUsed) {
      return res.status(400).json({ message: 'Sub Family cannot be deleted because it is being used by existing products.' });
    }

    await SubFamily.findOneAndDelete({ _id: req.params.id, tenantId: req.user.tenantId });
    res.status(200).json({ message: 'SubFamily deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting sub-family', error: error.message });
  }
};

// --- SIZE CONTROLLERS ---

exports.getSizes = async (req, res) => {
  try {
    const sizes = await Size.find({ tenantId: req.user.tenantId }).sort({ createdAt: -1 });
    res.status(200).json(sizes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sizes', error: error.message });
  }
};

exports.createSize = async (req, res) => {
  try {
    const { name, code, isActive } = req.body;
    const size = await Size.create({
      tenantId: req.user.tenantId,
      name,
      code,
      isActive,
      createdBy: req.user._id
    });
    res.status(201).json(size);
  } catch (error) {
    res.status(400).json({ message: 'Error creating size', error: error.message });
  }
};

exports.updateSize = async (req, res) => {
  try {
    const size = await Size.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { ...req.body, updatedBy: req.user._id },
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
    const size = await Size.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!size) return res.status(404).json({ message: 'Size not found' });

    // Delete protection check
    const isUsed = await Product.exists({ tenantId: req.user.tenantId, size: size.name });
    if (isUsed) {
      return res.status(400).json({ message: 'Size cannot be deleted because it is being used by existing products.' });
    }

    await Size.findOneAndDelete({ _id: req.params.id, tenantId: req.user.tenantId });
    res.status(200).json({ message: 'Size deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting size', error: error.message });
  }
};

// --- COLOR CONTROLLERS ---

exports.getColors = async (req, res) => {
  try {
    const colors = await Color.find({ tenantId: req.user.tenantId }).sort({ createdAt: -1 });
    res.status(200).json(colors);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching colors', error: error.message });
  }
};

exports.createColor = async (req, res) => {
  try {
    const { name, code, isActive } = req.body;
    const color = await Color.create({
      tenantId: req.user.tenantId,
      name,
      code,
      isActive,
      createdBy: req.user._id
    });
    res.status(201).json(color);
  } catch (error) {
    res.status(400).json({ message: 'Error creating color', error: error.message });
  }
};

exports.updateColor = async (req, res) => {
  try {
    const color = await Color.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { ...req.body, updatedBy: req.user._id },
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
    const color = await Color.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!color) return res.status(404).json({ message: 'Color not found' });

    // Delete protection check
    const isUsed = await Product.exists({ tenantId: req.user.tenantId, color: color.name });
    if (isUsed) {
      return res.status(400).json({ message: 'Color cannot be deleted because it is being used by existing products.' });
    }

    await Color.findOneAndDelete({ _id: req.params.id, tenantId: req.user.tenantId });
    res.status(200).json({ message: 'Color deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting color', error: error.message });
  }
};

const Role = require('../models/Role');

// @desc    Get all roles for tenant
// @route   GET /api/v1/roles
// @access  Private
const getRoles = async (req, res) => {
  try {
    const query = {};
    if (req.user.tenantId) query.tenantId = req.user.tenantId;
    else if (req.query.tenantId) query.tenantId = req.query.tenantId;

    const roles = await Role.find(query).populate('tenantId', 'name');
    res.status(200).json(roles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new role
// @route   POST /api/v1/roles
// @access  Private
const createRole = async (req, res) => {
  try {
    const { name, description, permissions, tenantId: bodyTenantId } = req.body;

    const targetTenantId = req.user.tenantId || bodyTenantId;

    if (!targetTenantId) {
      return res.status(400).json({ message: 'tenantId is required' });
    }

    const roleExists = await Role.findOne({ name, tenantId: targetTenantId });
    if (roleExists) {
      return res.status(400).json({ message: 'Role name already exists in this company' });
    }

    const role = await Role.create({
      tenantId: targetTenantId,
      name,
      description,
      permissions
    });

    res.status(201).json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a role
// @route   PUT /api/v1/roles/:id
// @access  Private
const updateRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    
    // Prevent modification of system roles (e.g. Tenant Admin)
    if (role.isSystem) {
      return res.status(403).json({ message: 'System roles cannot be modified' });
    }

    // Check tenant access
    if (req.user.tenantId && role.tenantId.toString() !== req.user.tenantId.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this role' });
    }

    role.name = name || role.name;
    role.description = description !== undefined ? description : role.description;
    role.permissions = permissions || role.permissions;

    const updatedRole = await role.save();
    res.status(200).json(updatedRole);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a role
// @route   DELETE /api/v1/roles/:id
// @access  Private
const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Prevent deletion of system roles
    if (role.isSystem) {
      return res.status(403).json({ message: 'System roles cannot be deleted' });
    }

    // Check tenant access
    if (req.user.tenantId && role.tenantId.toString() !== req.user.tenantId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this role' });
    }

    await role.deleteOne();
    res.status(200).json({ message: 'Role removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getRoles, createRole, updateRole, deleteRole };

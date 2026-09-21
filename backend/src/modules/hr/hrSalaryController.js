const SalaryComponent = require('../../core/models/SalaryComponent');
const SalaryStructure = require('../../core/models/SalaryStructure');
const EmployeeSalary = require('../../core/models/EmployeeSalary');
const mongoose = require('mongoose');

// ==========================================
// SALARY COMPONENT CONTROLLERS
// ==========================================

exports.getSalaryComponents = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const components = await SalaryComponent.find({ tenantId }).sort({ createdAt: -1 });
    res.json(components);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching components' });
  }
};

exports.createSalaryComponent = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    
    // Check for duplicate code
    const existing = await SalaryComponent.findOne({ tenantId, code: req.body.code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ message: `Component with code ${req.body.code} already exists.` });
    }

    const component = new SalaryComponent({
      ...req.body,
      tenantId,
      code: req.body.code.toUpperCase(),
      createdBy: req.user.id
    });
    
    await component.save();
    res.status(201).json(component);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateSalaryComponent = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    
    const component = await SalaryComponent.findOneAndUpdate(
      { _id: id, tenantId },
      { ...req.body, updatedBy: req.user.id },
      { returnDocument: 'after', runValidators: true }
    );
    
    if (!component) return res.status(404).json({ message: 'Component not found' });
    res.json(component);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteSalaryComponent = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    
    // Check if used in structures
    const isUsed = await SalaryStructure.findOne({ tenantId, 'components.componentId': id });
    if (isUsed) {
      return res.status(400).json({ message: 'Cannot delete component because it is used in a salary structure.' });
    }

    const component = await SalaryComponent.findOneAndDelete({ _id: id, tenantId });
    if (!component) return res.status(404).json({ message: 'Component not found' });
    
    res.json({ message: 'Component deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting component' });
  }
};

// ==========================================
// SALARY STRUCTURE CONTROLLERS
// ==========================================

exports.getSalaryStructures = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const structures = await SalaryStructure.find({ tenantId })
      .populate('countryId', 'countryName')
      .populate('components.componentId', 'name type code')
      .sort({ createdAt: -1 });
    res.json(structures);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching structures' });
  }
};

exports.getSalaryStructureById = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const structure = await SalaryStructure.findOne({ _id: req.params.id, tenantId })
      .populate('countryId', 'countryName')
      .populate('components.componentId', 'name type code');
      
    if (!structure) return res.status(404).json({ message: 'Structure not found' });
    res.json(structure);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching structure' });
  }
};

exports.createSalaryStructure = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    
    const existing = await SalaryStructure.findOne({ tenantId, code: req.body.code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ message: `Structure with code ${req.body.code} already exists.` });
    }

    const structure = new SalaryStructure({
      ...req.body,
      tenantId,
      code: req.body.code.toUpperCase(),
      createdBy: req.user.id
    });
    
    await structure.save();
    res.status(201).json(structure);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateSalaryStructure = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    
    const structure = await SalaryStructure.findOneAndUpdate(
      { _id: id, tenantId },
      { ...req.body, updatedBy: req.user.id },
      { returnDocument: 'after', runValidators: true }
    );
    
    if (!structure) return res.status(404).json({ message: 'Structure not found' });
    res.json(structure);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteSalaryStructure = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    
    // Check if used in EmployeeSalary
    const isUsed = await EmployeeSalary.findOne({ tenantId, salaryStructureId: id });
    if (isUsed) {
      return res.status(400).json({ message: 'Cannot delete structure because it is assigned to an employee.' });
    }

    const structure = await SalaryStructure.findOneAndDelete({ _id: id, tenantId });
    if (!structure) return res.status(404).json({ message: 'Structure not found' });
    
    res.json({ message: 'Structure deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting structure' });
  }
};

// ==========================================
// EMPLOYEE SALARY CONTROLLERS
// ==========================================

// Helper to compute salary totals
const computeSalaryTotals = (basicSalary, components) => {
  let totalEarnings = basicSalary;
  let totalDeductions = 0;
  let employerContributions = 0;

  components.forEach(c => {
    let amt = 0;
    if (c.calculationType === 'FIXED') {
      amt = c.amount;
    } else if (c.calculationType === 'PERCENTAGE') {
      // In this phase, percentage is of basic salary or fixed component.
      // We will assume percentage of basic salary if percentageOf is null, else it should be calculated dynamically.
      // For simplicity in Phase 3C, we use the provided amount from frontend which pre-calculates, or we do a simple basic * % here.
      amt = c.amount; // The frontend should calculate the amount, or we compute it if amount is missing.
    } else {
      amt = c.amount;
    }

    if (c.typeSnapshot === 'EARNING') {
      totalEarnings += amt;
    } else if (c.typeSnapshot === 'DEDUCTION') {
      totalDeductions += amt;
    } else if (c.typeSnapshot === 'EMPLOYER_CONTRIBUTION') {
      employerContributions += amt;
    }
  });

  return {
    totalEarnings,
    totalDeductions,
    employerContributions,
    grossSalary: totalEarnings,
    netSalary: totalEarnings - totalDeductions
  };
};

exports.getEmployeeSalary = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const tenantId = req.user.tenantId;

    const salary = await EmployeeSalary.findOne({ employeeId, tenantId, status: 'ACTIVE' })
      .populate('salaryStructureId', 'name code');
      
    res.json(salary || null);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching salary' });
  }
};

exports.getEmployeeSalaryHistory = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const tenantId = req.user.tenantId;

    const history = await EmployeeSalary.find({ employeeId, tenantId })
      .populate('salaryStructureId', 'name code')
      .sort({ effectiveFrom: -1 });
      
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching salary history' });
  }
};

exports.assignEmployeeSalary = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const tenantId = req.user.tenantId;
    const { salaryStructureId, effectiveFrom, currency, payFrequency, basicSalary, components, notes } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check for overlapping active salary
      const activeSalary = await EmployeeSalary.findOne({ employeeId, tenantId, status: 'ACTIVE' }).session(session);
      if (activeSalary) {
        throw new Error('Employee already has an active salary. Please use the Revise endpoint.');
      }

      const totals = computeSalaryTotals(basicSalary, components);

      const salary = new EmployeeSalary({
        tenantId,
        employeeId,
        salaryStructureId,
        effectiveFrom: new Date(effectiveFrom),
        currency,
        payFrequency,
        basicSalary,
        components,
        ...totals,
        status: 'ACTIVE',
        notes,
        createdBy: req.user.id
      });

      await salary.save({ session });
      await session.commitTransaction();
      res.status(201).json(salary);
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.reviseEmployeeSalary = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const tenantId = req.user.tenantId;
    const { salaryStructureId, effectiveFrom, currency, payFrequency, basicSalary, components, reasonForRevision, notes } = req.body;

    if (!effectiveFrom) {
      return res.status(400).json({ message: 'Effective date is required for salary revision.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const activeSalary = await EmployeeSalary.findOne({ employeeId, tenantId, status: 'ACTIVE' }).session(session);
      
      if (activeSalary) {
        const effectiveDate = new Date(effectiveFrom);
        if (activeSalary.effectiveFrom >= effectiveDate) {
          throw new Error('New effective date must be after the current salary effective date.');
        }
        
        activeSalary.status = 'HISTORICAL';
        activeSalary.effectiveTo = new Date(effectiveDate.getTime() - 86400000); // 1 day before
        await activeSalary.save({ session });
      }

      const totals = computeSalaryTotals(basicSalary, components);

      const newSalary = new EmployeeSalary({
        tenantId,
        employeeId,
        salaryStructureId,
        effectiveFrom: new Date(effectiveFrom),
        currency,
        payFrequency,
        basicSalary,
        components,
        ...totals,
        status: 'ACTIVE',
        reasonForRevision,
        notes,
        createdBy: req.user.id
      });

      await newSalary.save({ session });
      await session.commitTransaction();
      res.status(201).json(newSalary);
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

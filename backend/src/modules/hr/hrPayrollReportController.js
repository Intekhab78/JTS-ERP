const PayrollRecord = require('../../core/models/PayrollRecord');
const Payslip = require('../../core/models/Payslip');
const { Parser } = require('json2csv');

const downloadCsv = (res, fileName, fields, data) => {
  try {
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment(fileName);
    return res.send(csv);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to generate CSV' });
  }
};

exports.getSummaryReport = async (req, res) => {
  try {
    const { period, download } = req.query;
    const matchStage = { tenantId: req.user.tenantId, status: { $in: ['FINALIZED', 'GENERATED'] } };
    
    if (period) {
      matchStage.payrollPeriodId = period;
    }

    const summary = await Payslip.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$currency',
          employeeCount: { $sum: 1 },
          totalGross: { $sum: '$grossSalary' },
          totalDeductions: { $sum: '$totalDeductions' },
          totalNet: { $sum: '$netSalary' },
          totalEmployerContributions: { $sum: '$employerContributionsTotal' },
          totalOvertime: { $sum: '$overtimeMinutes' }, // Might need amount if stored
          totalPaidLeave: { $sum: '$paidLeaveDays' },
          totalUnpaidLeave: { $sum: '$unpaidLeaveDays' }
        }
      }
    ]);

    if (download === 'true') {
      const fields = ['_id', 'employeeCount', 'totalGross', 'totalDeductions', 'totalNet', 'totalEmployerContributions'];
      return downloadCsv(res, 'payroll_summary.csv', fields, summary);
    }

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEmployeeReport = async (req, res) => {
  try {
    const { period, download } = req.query;
    const matchStage = { tenantId: req.user.tenantId, status: { $in: ['FINALIZED', 'GENERATED'] } };
    
    if (period) {
      matchStage.payrollPeriodId = period;
    }

    const records = await Payslip.find(matchStage).sort({ employeeName: 1 });

    if (download === 'true') {
      const fields = [
        'payslipNumber', 'employeeCode', 'employeeName', 'department', 'designation', 
        'currency', 'basicSalary', 'grossSalary', 'totalDeductions', 'netSalary',
        'employerContributionsTotal', 'workingDays', 'presentDays', 'absentDays'
      ];
      return downloadCsv(res, 'employee_payroll.csv', fields, records);
    }

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDepartmentReport = async (req, res) => {
  try {
    const { period, download } = req.query;
    const matchStage = { tenantId: req.user.tenantId, status: { $in: ['FINALIZED', 'GENERATED'] } };
    if (period) matchStage.payrollPeriodId = period;

    const summary = await Payslip.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { department: '$department', currency: '$currency' },
          employeeCount: { $sum: 1 },
          totalGross: { $sum: '$grossSalary' },
          totalDeductions: { $sum: '$totalDeductions' },
          totalNet: { $sum: '$netSalary' },
          totalEmployerContributions: { $sum: '$employerContributionsTotal' }
        }
      },
      {
        $project: {
          department: '$_id.department',
          currency: '$_id.currency',
          employeeCount: 1, totalGross: 1, totalDeductions: 1, totalNet: 1, totalEmployerContributions: 1, _id: 0
        }
      },
      { $sort: { department: 1 } }
    ]);

    if (download === 'true') {
      const fields = ['department', 'currency', 'employeeCount', 'totalGross', 'totalDeductions', 'totalNet'];
      return downloadCsv(res, 'department_payroll.csv', fields, summary);
    }

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEarningsReport = async (req, res) => {
  try {
    const { period, download } = req.query;
    const matchStage = { tenantId: req.user.tenantId, status: { $in: ['FINALIZED', 'GENERATED'] } };
    if (period) matchStage.payrollPeriodId = period;

    const summary = await Payslip.aggregate([
      { $match: matchStage },
      { $unwind: '$earnings' },
      {
        $group: {
          _id: { name: '$earnings.name', type: '$earnings.type', currency: '$currency' },
          employeeCount: { $sum: 1 },
          totalAmount: { $sum: '$earnings.amount' }
        }
      },
      {
        $project: {
          component: '$_id.name',
          type: '$_id.type',
          currency: '$_id.currency',
          employeeCount: 1,
          totalAmount: 1,
          _id: 0
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    if (download === 'true') {
      const fields = ['component', 'type', 'currency', 'employeeCount', 'totalAmount'];
      return downloadCsv(res, 'earnings_report.csv', fields, summary);
    }

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDeductionsReport = async (req, res) => {
  try {
    const { period, download } = req.query;
    const matchStage = { tenantId: req.user.tenantId, status: { $in: ['FINALIZED', 'GENERATED'] } };
    if (period) matchStage.payrollPeriodId = period;

    const summary = await Payslip.aggregate([
      { $match: matchStage },
      { $unwind: '$deductions' },
      {
        $group: {
          _id: { name: '$deductions.name', type: '$deductions.type', currency: '$currency' },
          employeeCount: { $sum: 1 },
          totalAmount: { $sum: '$deductions.amount' }
        }
      },
      {
        $project: {
          component: '$_id.name',
          type: '$_id.type',
          currency: '$_id.currency',
          employeeCount: 1,
          totalAmount: 1,
          _id: 0
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    if (download === 'true') {
      const fields = ['component', 'type', 'currency', 'employeeCount', 'totalAmount'];
      return downloadCsv(res, 'deductions_report.csv', fields, summary);
    }

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

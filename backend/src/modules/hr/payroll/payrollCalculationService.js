const PayrollPeriod = require('../../../core/models/PayrollPeriod');
const PayrollRecord = require('../../../core/models/PayrollRecord');
const Employee = require('../../../core/models/Employee');
const EmployeeSalary = require('../../../core/models/EmployeeSalary');
const EmployeeAttendance = require('../../../core/models/EmployeeAttendance');
const LeaveRequest = require('../../../core/models/LeaveRequest');
const PayrollRule = require('../../../core/models/PayrollRule');

/**
 * Payroll Calculation Engine
 */
class PayrollCalculationService {
  
  static async calculatePayrollForPeriod(tenantId, payrollPeriodId, requestedByUserId) {
    const period = await PayrollPeriod.findOne({ _id: payrollPeriodId, tenantId });
    if (!period) throw new Error('Payroll period not found');
    if (['APPROVED', 'LOCKED', 'PAID', 'CANCELLED'].includes(period.status)) {
      throw new Error(`Cannot calculate payroll in ${period.status} status`);
    }

    const { periodStart, periodEnd } = period;
    
    // 1. Find eligible employees for the period (Active employees hired before periodEnd)
    // For simplicity, finding those whose hireDate is <= periodEnd
    const employees = await Employee.find({
      tenantId,
      status: { $in: ['ACTIVE', 'ON_LEAVE'] },
      hireDate: { $lte: periodEnd }
    });

    const results = [];

    // 2. Iterate each employee and calculate
    for (const emp of employees) {
      try {
        const record = await this._calculateForEmployee(tenantId, period, emp, requestedByUserId);
        if (record) results.push(record);
      } catch (err) {
        console.error(`Error calculating payroll for emp ${emp._id}:`, err);
      }
    }

    // Update period status
    if (period.status === 'DRAFT' || period.status === 'OPEN') {
      period.status = 'PROCESSING';
      await period.save();
    }

    return results;
  }

  static async _calculateForEmployee(tenantId, period, employee, userId) {
    // A. Find effective salary
    // Find ACTIVE salary or one that intersects the period
    const salary = await EmployeeSalary.findOne({
      tenantId,
      employeeId: employee._id,
      status: 'ACTIVE'
    }).populate('components.componentId');

    if (!salary) {
      return null; // Skip employees without assigned salary
    }

    // B. Attendance & Leaves (Snapshot)
    const attendanceRecords = await EmployeeAttendance.find({
      tenantId,
      employeeId: employee._id,
      attendanceDate: { $gte: period.periodStart, $lte: period.periodEnd }
    });

    const leaveRequests = await LeaveRequest.find({
      tenantId,
      employeeId: employee._id,
      status: 'APPROVED',
      fromDate: { $lte: period.periodEnd },
      toDate: { $gte: period.periodStart }
    }).populate('leaveTypeId');

    // Aggregate calendar/working/present days
    // This is a simplified fallback calculation for demonstration. Real systems will use HolidayCalendar etc.
    const timeDiff = period.periodEnd.getTime() - period.periodStart.getTime();
    const calendarDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    let workingDays = calendarDays; // Needs proper WorkSchedule handling
    let presentDays = attendanceRecords.filter(a => a.status === 'PRESENT').length;
    let absentDays = attendanceRecords.filter(a => a.status === 'ABSENT').length;
    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;
    
    leaveRequests.forEach(lr => {
      // Very crude approximation, assuming full overlap
      if (lr.leaveTypeId && lr.leaveTypeId.paidLeave) {
        paidLeaveDays += lr.requestedUnits || 1;
      } else {
        unpaidLeaveDays += lr.requestedUnits || 1;
      }
    });

    // Overtime
    let overtimeMinutes = attendanceRecords.reduce((acc, curr) => acc + (curr.overtimeMinutes || 0), 0);

    // C. Proration (Fixed logic: WORKING_DAYS or FIXED_MONTHLY based on config)
    // Default config: Assuming CALENDAR_DAYS proration
    const dailyRate = salary.basicSalary / (calendarDays || 30);
    const unpaidAbsenceAmount = (absentDays + unpaidLeaveDays) * dailyRate;

    // D. Compute Earnings & Deductions
    const earnings = [];
    const deductions = [];
    const employerContributions = [];

    // Map snapshots
    let totalEarnings = 0;
    let totalDeductions = 0;
    let totalEmployerContributions = 0;

    // Standard components from salary structure
    for (const comp of salary.components) {
      const snap = {
        componentId: comp.componentId?._id,
        nameSnapshot: comp.nameSnapshot,
        codeSnapshot: comp.componentId?.code || 'UN',
        typeSnapshot: comp.typeSnapshot,
        amount: comp.amount,
        isTaxable: comp.componentId?.taxable ?? true
      };

      if (comp.typeSnapshot === 'EARNING') {
        // Handle proration for components if applicable. For now, flat amount minus unpaid absence ratio
        let finalAmount = comp.amount;
        if (comp.calculationType !== 'FIXED' || true) {
             const compDailyRate = comp.amount / calendarDays;
             finalAmount = comp.amount - (compDailyRate * (absentDays + unpaidLeaveDays));
        }
        snap.amount = Math.max(0, finalAmount); // No negative earnings
        earnings.push(snap);
        totalEarnings += snap.amount;
      } else if (comp.typeSnapshot === 'DEDUCTION') {
        deductions.push(snap);
        totalDeductions += snap.amount;
      } else if (comp.typeSnapshot === 'EMPLOYER_CONTRIBUTION') {
        employerContributions.push(snap);
        totalEmployerContributions += snap.amount;
      }
    }

    // Apply basic salary rules if not explicitly broken into an EARNING component
    let proratedBasic = salary.basicSalary - unpaidAbsenceAmount;
    proratedBasic = Math.max(0, proratedBasic);

    // E. Dynamic Payroll Rules
    const rules = await PayrollRule.find({
      tenantId,
      status: 'ACTIVE',
      effectiveFrom: { $lte: period.periodEnd }
      // Could filter by countryId
    });

    for (const rule of rules) {
      if (rule.ruleType === 'TAX') {
        // Simplified Tax logic
        let ruleAmt = 0;
        if (rule.calculationType === 'PERCENTAGE') {
          ruleAmt = (proratedBasic * rule.percentage) / 100;
        } else if (rule.calculationType === 'FIXED') {
          ruleAmt = rule.fixedAmount;
        }
        
        const empDeduction = (ruleAmt * rule.employeeShare) / 100;
        if (empDeduction > 0) {
          deductions.push({
            nameSnapshot: rule.name,
            codeSnapshot: rule.code,
            typeSnapshot: 'TAX',
            amount: empDeduction,
            isTaxable: false
          });
          totalDeductions += empDeduction;
        }
      }
      // Expand for SOCIAL_SECURITY, INSURANCE etc.
    }

    const grossSalary = proratedBasic + (totalEarnings - proratedBasic > 0 ? totalEarnings - proratedBasic : 0);
    const netSalary = grossSalary - totalDeductions;
    const payableAmount = netSalary; // plus reimbursements etc.

    // F. Find or Create PayrollRecord
    let record = await PayrollRecord.findOne({
      tenantId,
      payrollPeriodId: period._id,
      employeeId: employee._id
    });

    if (record && ['APPROVED', 'LOCKED', 'PAID', 'CANCELLED'].includes(record.status)) {
      // Do not recalculate finalized records
      return record;
    }

    if (!record) {
      record = new PayrollRecord({
        tenantId,
        payrollPeriodId: period._id,
        employeeId: employee._id,
        employeeSalaryId: salary._id,
        currency: salary.currency,
        payFrequency: salary.payFrequency
      });
    } else {
      record.calculationVersion = (record.calculationVersion || 1) + 1;
    }

    record.calendarDays = calendarDays;
    record.workingDays = workingDays;
    record.presentDays = presentDays;
    record.absentDays = absentDays;
    record.paidLeaveDays = paidLeaveDays;
    record.unpaidLeaveDays = unpaidLeaveDays;
    record.overtimeMinutes = overtimeMinutes;

    record.basicSalary = proratedBasic;
    record.earnings = earnings;
    record.deductions = deductions;
    record.employerContributions = employerContributions;
    
    record.totalEarnings = totalEarnings;
    record.totalDeductions = totalDeductions;
    record.totalEmployerContributions = totalEmployerContributions;
    record.grossSalary = grossSalary;
    record.netSalary = netSalary;
    record.payableAmount = payableAmount;
    record.unpaidAbsenceAmount = unpaidAbsenceAmount;

    record.status = 'CALCULATED';
    record.calculatedAt = new Date();
    record.calculatedBy = userId;

    await record.save();
    return record;
  }
}

module.exports = PayrollCalculationService;

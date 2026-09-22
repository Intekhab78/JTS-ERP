const express = require('express');
const router = express.Router();
const { 
  getDepartments, 
  createDepartment, 
  getEmployees, 
  createEmployee,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  linkUser,
  unlinkUser,
  uploadFamilyDocument
} = require('./hrController');
const { protect, authorize } = require('../../core/middleware/authMiddleware');
const { 
  uploadEmployeeDocument, 
  uploadEmployeePhoto,
  uploadFamilyDocument: uploadFamilyDocMiddleware
} = require('../../core/utils/upload');
const hrDocumentsController = require('./hrDocumentsController');
const hrIdentificationsController = require('./hrIdentificationsController');
const hrShiftController = require('./hrShiftController');
const hrAttendanceController = require('./hrAttendanceController');
const hrLeaveController = require('./hrLeaveController');
const hrHolidayController = require('./hrHolidayController');
const hrSalaryController = require('./hrSalaryController');
const hrPayrollController = require('./hrPayrollController');
const hrPayslipController = require('./hrPayslipController');
const hrPayrollReportController = require('./hrPayrollReportController');
const hrReferenceController = require('./hrReferenceController');

// Sub-routers
const documentTypeRoutes = require('./documentTypeRoutes');

router.route('/locations')
  .get(protect, hrReferenceController.getLocations)
  .post(protect, hrReferenceController.createLocation);

router.route('/teams')
  .get(protect, hrReferenceController.getTeams)
  .post(protect, hrReferenceController.createTeam);

router.route('/designations')
  .get(protect, hrReferenceController.getDesignations)
  .post(protect, hrReferenceController.createDesignation);

router.route('/job-levels')
  .get(protect, hrReferenceController.getJobLevels)
  .post(protect, hrReferenceController.createJobLevel);

router.route('/departments')
  .get(protect, getDepartments)
  .post(protect, createDepartment);

router.route('/employees')
  .get(protect, getEmployees)
  .post(protect, createEmployee);

// Sub-routes
router.use('/document-types', documentTypeRoutes);

router.route('/employees/:id')
  .get(protect, getEmployeeById)
  .put(protect, updateEmployee)
  .delete(protect, authorize('HR.EMPLOYEE.DELETE', '*'), deleteEmployee);

router.route('/employees/:id/link-user')
  .post(protect, linkUser);

router.route('/employees/:id/unlink-user')
  .post(protect, unlinkUser);

router.route('/employees/:id/photo')
  .post(protect, uploadEmployeePhoto.single('photo'), require('./hrController').uploadPhoto);

router.route('/employees/:id/family/:index/document')
  .post(protect, uploadFamilyDocMiddleware.single('document'), uploadFamilyDocument);

// --- Documents ---
router.route('/employees/:employeeId/documents')
  .get(protect, authorize('HR.EMPLOYEE_DOCUMENT.VIEW', '*'), hrDocumentsController.getDocuments)
  .post(protect, authorize('HR.EMPLOYEE_DOCUMENT.CREATE', '*'), uploadEmployeeDocument.single('file'), hrDocumentsController.uploadDocument);

router.route('/employees/:employeeId/documents/:documentId')
  .put(protect, authorize('HR.EMPLOYEE_DOCUMENT.EDIT', '*'), uploadEmployeeDocument.single('file'), hrDocumentsController.updateDocument)
  .delete(protect, authorize('HR.EMPLOYEE_DOCUMENT.DELETE', '*'), hrDocumentsController.deleteDocument);

router.route('/employees/:employeeId/documents/:documentId/view')
  .get(protect, authorize('HR.EMPLOYEE_DOCUMENT.VIEW', '*'), hrDocumentsController.viewDocument);

// --- Identifications ---
router.route('/employees/:employeeId/identifications')
  .get(protect, authorize('HR.EMPLOYEE_IDENTIFICATION.VIEW', '*'), hrIdentificationsController.getIdentifications)
  .post(protect, authorize('HR.EMPLOYEE_IDENTIFICATION.CREATE', '*'), hrIdentificationsController.createIdentification);

router.route('/employees/:employeeId/identifications/:identificationId')
  .put(protect, authorize('HR.EMPLOYEE_IDENTIFICATION.EDIT', '*'), hrIdentificationsController.updateIdentification)
  .delete(protect, authorize('HR.EMPLOYEE_IDENTIFICATION.DELETE', '*'), hrIdentificationsController.deleteIdentification);

router.route('/employees/:employeeId/identifications/:identificationId/unmask')
  .get(protect, authorize('HR.EMPLOYEE_IDENTIFICATION.VIEW_SENSITIVE', '*'), hrIdentificationsController.unmaskIdentification);

// --- Shifts ---
router.route('/shifts')
  .get(protect, authorize('SHIFT.VIEW', '*'), hrShiftController.getShifts)
  .post(protect, authorize('SHIFT.CREATE', '*'), hrShiftController.createShift);

router.route('/shifts/:id')
  .put(protect, authorize('SHIFT.EDIT', '*'), hrShiftController.updateShift)
  .delete(protect, authorize('SHIFT.DELETE', '*'), hrShiftController.deleteShift);

// --- Employee Shifts ---
router.route('/employees/:employeeId/shifts')
  .get(protect, authorize('SHIFT.VIEW', '*'), hrShiftController.getEmployeeShifts)
  .post(protect, authorize('SHIFT.EDIT', '*'), hrShiftController.assignEmployeeShift);

router.route('/employees/:employeeId/shifts/:assignmentId')
  .delete(protect, authorize('SHIFT.EDIT', '*'), hrShiftController.deleteEmployeeShift);

// --- Attendance ---
router.route('/attendance/daily')
  .get(protect, authorize('ATTENDANCE.VIEW', '*'), hrAttendanceController.getDailyAttendance);

router.route('/employees/:employeeId/attendance')
  .get(protect, authorize('ATTENDANCE.VIEW', '*'), hrAttendanceController.getEmployeeAttendance)
  .post(protect, authorize('ATTENDANCE.CREATE', '*'), hrAttendanceController.markAttendance);

router.route('/attendance/:id')
  .put(protect, authorize('ATTENDANCE.EDIT', '*'), hrAttendanceController.updateAttendance);

// --- Leave Types ---
router.route('/leave-types')
  .get(protect, authorize('LEAVE.TYPE.VIEW', '*'), hrLeaveController.getLeaveTypes)
  .post(protect, authorize('LEAVE.TYPE.CREATE', '*'), hrLeaveController.createLeaveType);

router.route('/leave-types/:id')
  .put(protect, authorize('LEAVE.TYPE.EDIT', '*'), hrLeaveController.updateLeaveType);

// --- Leave Balances ---
router.route('/leave-balances')
  .get(protect, authorize('LEAVE.BALANCE.VIEW', '*'), hrLeaveController.getEmployeeBalances);

router.route('/leave-balances/:id/adjust')
  .post(protect, authorize('LEAVE.BALANCE.ADJUST', '*'), hrLeaveController.adjustLeaveBalance);

// --- Leave Requests ---
router.route('/leave-requests')
  .get(protect, authorize('LEAVE.REQUEST.VIEW', '*'), hrLeaveController.getLeaveRequests)
  .post(protect, authorize('LEAVE.REQUEST.SUBMIT', '*'), hrLeaveController.submitLeaveRequest);

router.route('/leave-requests/:id/approve')
  .post(protect, authorize('LEAVE.REQUEST.APPROVE', '*'), hrLeaveController.approveLeaveRequest);

router.route('/leave-requests/:id/reject')
  .post(protect, authorize('LEAVE.REQUEST.REJECT', '*'), hrLeaveController.rejectLeaveRequest);

// --- Holidays ---
router.route('/holiday-calendars')
  .get(protect, authorize('HOLIDAY.CALENDAR.VIEW', '*'), hrHolidayController.getCalendars)
  .post(protect, authorize('HOLIDAY.CALENDAR.CREATE', '*'), hrHolidayController.createCalendar);

router.route('/holiday-calendars/:id')
  .put(protect, authorize('HOLIDAY.CALENDAR.EDIT', '*'), hrHolidayController.updateCalendar)
  .delete(protect, authorize('HOLIDAY.CALENDAR.DELETE', '*'), hrHolidayController.deleteCalendar);

router.route('/holiday-calendars/:calendarId/holidays')
  .get(protect, authorize('HOLIDAY.VIEW', '*'), hrHolidayController.getHolidays)
  .post(protect, authorize('HOLIDAY.CREATE', '*'), hrHolidayController.createHoliday);

router.route('/holidays/:id')
  .put(protect, authorize('HOLIDAY.EDIT', '*'), hrHolidayController.updateHoliday)
  .delete(protect, authorize('HOLIDAY.DELETE', '*'), hrHolidayController.deleteHoliday);

// --- Salary Components ---
router.route('/salary-components')
  .get(protect, authorize('PAYROLL.SALARY_COMPONENT.VIEW', '*'), hrSalaryController.getSalaryComponents)
  .post(protect, authorize('PAYROLL.SALARY_COMPONENT.CREATE', '*'), hrSalaryController.createSalaryComponent);

router.route('/salary-components/:id')
  .put(protect, authorize('PAYROLL.SALARY_COMPONENT.EDIT', '*'), hrSalaryController.updateSalaryComponent)
  .delete(protect, authorize('PAYROLL.SALARY_COMPONENT.DELETE', '*'), hrSalaryController.deleteSalaryComponent);

// --- Salary Structures ---
router.route('/salary-structures')
  .get(protect, authorize('PAYROLL.SALARY_STRUCTURE.VIEW', '*'), hrSalaryController.getSalaryStructures)
  .post(protect, authorize('PAYROLL.SALARY_STRUCTURE.CREATE', '*'), hrSalaryController.createSalaryStructure);

router.route('/salary-structures/:id')
  .get(protect, authorize('PAYROLL.SALARY_STRUCTURE.VIEW', '*'), hrSalaryController.getSalaryStructureById)
  .put(protect, authorize('PAYROLL.SALARY_STRUCTURE.EDIT', '*'), hrSalaryController.updateSalaryStructure)
  .delete(protect, authorize('PAYROLL.SALARY_STRUCTURE.DELETE', '*'), hrSalaryController.deleteSalaryStructure);

// --- Employee Salary ---
router.route('/employees/:employeeId/salary')
  .get(protect, authorize('PAYROLL.EMPLOYEE_SALARY.VIEW', '*'), hrSalaryController.getEmployeeSalary)
  .post(protect, authorize('PAYROLL.EMPLOYEE_SALARY.CREATE', '*'), hrSalaryController.assignEmployeeSalary);

router.route('/employees/:employeeId/salary/history')
  .get(protect, authorize('PAYROLL.EMPLOYEE_SALARY.VIEW', '*'), hrSalaryController.getEmployeeSalaryHistory);

router.route('/employees/:employeeId/salary/revise')
  .post(protect, authorize('PAYROLL.EMPLOYEE_SALARY.REVISE', '*'), hrSalaryController.reviseEmployeeSalary);

// --- Payroll ---
router.route('/payroll-rules')
  .post(protect, authorize('PAYROLL.RULE.CREATE', '*'), hrPayrollController.createPayrollRule)
  .get(protect, authorize('PAYROLL.RULE.VIEW', '*'), hrPayrollController.getPayrollRules);

router.route('/payroll-periods')
  .post(protect, authorize('PAYROLL.PERIOD.CREATE', '*'), hrPayrollController.createPayrollPeriod)
  .get(protect, authorize('PAYROLL.PERIOD.VIEW', '*'), hrPayrollController.getPayrollPeriods);

router.route('/payroll-periods/:id')
  .get(protect, authorize('PAYROLL.PERIOD.VIEW', '*'), hrPayrollController.getPayrollPeriod);

router.route('/payroll-periods/:id/open')
  .post(protect, authorize('PAYROLL.PERIOD.OPEN', '*'), hrPayrollController.openPayrollPeriod);

router.route('/payroll-periods/:id/calculate')
  .post(protect, authorize('PAYROLL.PERIOD.CALCULATE', '*'), hrPayrollController.calculatePayroll);

router.route('/payroll-periods/:id/review')
  .post(protect, authorize('PAYROLL.PERIOD.REVIEW', '*'), hrPayrollController.reviewPayrollPeriod);

router.route('/payroll-periods/:id/approve')
  .post(protect, authorize('PAYROLL.PERIOD.APPROVE', '*'), hrPayrollController.approvePayrollPeriod);

router.route('/payroll-periods/:id/lock')
  .post(protect, authorize('PAYROLL.PERIOD.LOCK', '*'), hrPayrollController.lockPayrollPeriod);

router.route('/payroll-periods/:id/records')
  .get(protect, authorize('PAYROLL.RECORD.VIEW', '*'), hrPayrollController.getPayrollRecords);

router.route('/employees/:id/payroll-history')
  .get(protect, authorize('PAYROLL.RECORD.VIEW', '*'), hrPayrollController.getEmployeePayrollHistory);

// --- Phase 3E: Payslips ---
router.route('/payslips')
  .get(protect, authorize('PAYROLL.PAYSLIP.VIEW', '*'), hrPayslipController.getPayslips);

router.route('/payslips/:id')
  .get(protect, authorize('PAYROLL.PAYSLIP.VIEW', '*'), hrPayslipController.getPayslip);

router.route('/payslips/:id/pdf')
  .get(protect, authorize('PAYROLL.PAYSLIP.DOWNLOAD', '*'), hrPayslipController.downloadPayslipPdf);

router.route('/payslips/:id/finalize')
  .post(protect, authorize('PAYROLL.PAYSLIP.FINALIZE', '*'), hrPayslipController.finalizePayslip);

router.route('/payslips/:id/cancel')
  .post(protect, authorize('PAYROLL.PAYSLIP.CANCEL', '*'), hrPayslipController.cancelPayslip);

router.route('/payroll-records/:id/generate-payslip')
  .post(protect, authorize('PAYROLL.PAYSLIP.CREATE', '*'), hrPayslipController.generatePayslip);

router.route('/payroll-periods/:id/generate-payslips')
  .post(protect, authorize('PAYROLL.PAYSLIP.CREATE', '*'), hrPayslipController.generatePayslipsForPeriod);

// --- Phase 3E: Payroll Reports ---
router.route('/payroll-reports/summary')
  .get(protect, authorize('PAYROLL.REPORT.SUMMARY', '*'), hrPayrollReportController.getSummaryReport);

router.route('/payroll-reports/employees')
  .get(protect, authorize('PAYROLL.REPORT.EMPLOYEE', '*'), hrPayrollReportController.getEmployeeReport);

router.route('/payroll-reports/departments')
  .get(protect, authorize('PAYROLL.REPORT.DEPARTMENT', '*'), hrPayrollReportController.getDepartmentReport);

router.route('/payroll-reports/earnings')
  .get(protect, authorize('PAYROLL.REPORT.EARNINGS', '*'), hrPayrollReportController.getEarningsReport);

router.route('/payroll-reports/deductions')
  .get(protect, authorize('PAYROLL.REPORT.DEDUCTIONS', '*'), hrPayrollReportController.getDeductionsReport);

module.exports = router;

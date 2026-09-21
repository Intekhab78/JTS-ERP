import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AppShell from './components/layout/AppShell';
import Dashboard from './pages/dashboard/Dashboard';
import RoleManagement from './pages/users/RoleManagement';
import UserManagement from './pages/users/UserManagement';

import AuthLayout from './pages/auth/AuthLayout';

import Inventory from './pages/inventory/Inventory';
import StockOverview from './pages/inventory/StockOverview';
import StockMovements from './pages/inventory/StockMovements';
import StockTransfers from './pages/inventory/StockTransfers';
import StockTransferForm from './pages/inventory/StockTransferForm';
import StockAdjustments from './pages/inventory/StockAdjustments';
import StockAdjustmentForm from './pages/inventory/StockAdjustmentForm';
import CompanySettings from './pages/company/CompanySettings';
import BranchManagement from './pages/company/BranchManagement';
import Suppliers from './pages/purchase/Suppliers';
import SupplierForm from './pages/purchase/SupplierForm';
import SupplierDetail from './pages/purchase/SupplierDetail';
import RFQs from './pages/purchase/RFQs';
import RFQForm from './pages/purchase/RFQForm';
import RFQDetail from './pages/purchase/RFQDetail';
import PurchaseOrders from './pages/purchase/PurchaseOrders';
import PurchaseOrderDetail from './pages/purchase/PurchaseOrderDetail';
import VendorReturns from './pages/purchase/VendorReturns';
import VendorReturnForm from './pages/purchase/VendorReturnForm';
import VendorReturnDetail from './pages/purchase/VendorReturnDetail';
import VendorBills from './pages/purchase/VendorBills';
import VendorBillDetail from './pages/purchase/VendorBillDetail';
import VendorBillForm from './pages/purchase/VendorBillForm';
import Consignments from './pages/purchase/Consignments';
import ConsignmentForm from './pages/purchase/ConsignmentForm';
import ConsignmentDetail from './pages/purchase/ConsignmentDetail';
import ConsignmentReceipts from './pages/purchase/ConsignmentReceipts';
import ConsignmentReceiptForm from './pages/purchase/ConsignmentReceiptForm';
import ConsignmentReceiptDetail from './pages/purchase/ConsignmentReceiptDetail';
import ConsignmentStock from './pages/purchase/ConsignmentStock';
import ConsignmentSettlements from './pages/purchase/ConsignmentSettlements';
import ConsignmentSettlementForm from './pages/purchase/ConsignmentSettlementForm';
import Accounts from './pages/accounts/Accounts';
import AccountMapping from './pages/accounts/AccountMapping';
import Journal from './pages/accounts/Journal';
import Leads from './pages/crm/Leads';
import Customers from './pages/crm/Customers';
import CustomerForm from './pages/crm/CustomerForm';
import Departments from './pages/hr/Departments';
import Employees from './pages/hr/Employees';
import EmployeeForm from './pages/hr/EmployeeForm';
import EmployeeDetail from './pages/hr/EmployeeDetail';
import Shifts from './pages/hr/Shifts';
import ShiftForm from './pages/hr/ShiftForm';
import Attendance from './pages/hr/Attendance';
import LeaveTypes from './pages/hr/leave/LeaveTypes';
import LeaveTypeForm from './pages/hr/leave/LeaveTypeForm';
import HolidayCalendars from './pages/hr/leave/HolidayCalendars';
import HolidayCalendarForm from './pages/hr/leave/HolidayCalendarForm';
import HolidayDetail from './pages/hr/leave/HolidayDetail';
import LeaveBalances from './pages/hr/leave/LeaveBalances';
import LeaveRequests from './pages/hr/leave/LeaveRequests';
import LeaveRequestForm from './pages/hr/leave/LeaveRequestForm';

import SalaryComponents from './pages/hr/payroll/SalaryComponents';
import SalaryComponentForm from './pages/hr/payroll/SalaryComponentForm';
import SalaryStructures from './pages/hr/payroll/SalaryStructures';
import SalaryStructureForm from './pages/hr/payroll/SalaryStructureForm';
import PayrollPeriods from './pages/hr/payroll/PayrollPeriods';
import PayrollPeriodForm from './pages/hr/payroll/PayrollPeriodForm';
import PayrollPeriodDetail from './pages/hr/payroll/PayrollPeriodDetail';
import PayrollRules from './pages/hr/payroll/PayrollRules';
import PayrollRuleForm from './pages/hr/payroll/PayrollRuleForm';
import Payslips from './pages/hr/payroll/Payslips';
import PayslipDetail from './pages/hr/payroll/PayslipDetail';
import PayrollReports from './pages/hr/payroll/PayrollReports';

import Payroll from './pages/hr/Payroll';
import BOM from './pages/manufacturing/BOM';
import ManufacturingOrders from './pages/manufacturing/ManufacturingOrders';
import ManufacturingOrderForm from './pages/manufacturing/ManufacturingOrderForm';
import ManufacturingOrderDetail from './pages/manufacturing/ManufacturingOrderDetail';
import WebOrders from './pages/ecommerce/WebOrders';
import ApiKeys from './pages/ecommerce/ApiKeys';
import POS from './pages/sales/POS';
import POSOrders from './pages/sales/POSOrders';
import POSSessions from './pages/sales/POSSessions';
import POSReports from './pages/sales/POSReports';
import POSReturns from './pages/sales/POSReturns';
import POSRegisters from './pages/sales/POSRegisters';
import SalesHistory from './pages/sales/SalesHistory';
import OrderView from './pages/sales/OrderView';
import Quotes from './pages/sales/Quotes';
import QuoteForm from './pages/sales/QuoteForm';
import ProForma from './pages/sales/ProForma';
import ProFormaForm from './pages/sales/ProFormaForm';
import ProFormaPrint from './pages/sales/ProFormaPrint';
import DeliveryNotes from './pages/sales/DeliveryNotes';
import DeliveryNoteForm from './pages/sales/DeliveryNoteForm';
import DeliveryNotePrint from './pages/sales/DeliveryNotePrint';
import TaxInvoices from './pages/sales/TaxInvoices';
import TaxInvoiceForm from './pages/sales/TaxInvoiceForm';
import TaxInvoicePrint from './pages/sales/TaxInvoicePrint';
import SalesReturns from './pages/sales/SalesReturns';
import SalesReturnForm from './pages/sales/SalesReturnForm';
import SalesReturnDetail from './pages/sales/SalesReturnDetail';
import GRN from './pages/purchase/GRN';
import GRNForm from './pages/purchase/GRNForm';
import UomMaster from './pages/inventory/UomMaster';
import UomConversionMaster from './pages/inventory/UomConversionMaster';
import DepartmentMaster from './pages/hierarchy/DepartmentMaster'; 
import CategoryMaster from './pages/hierarchy/CategoryMaster';
import FamilyMaster from './pages/hierarchy/FamilyMaster';
import SubFamilyMaster from './pages/hierarchy/SubFamilyMaster';
import SizeMaster from './pages/hierarchy/SizeMaster';
import ColorMaster from './pages/hierarchy/ColorMaster';
import GRNView from './pages/purchase/GRNView';
import Settings from './pages/settings/Settings';

import { CurrencyProvider } from './contexts/CurrencyContext';

import TaxMaster from './pages/settings/TaxMaster';
import AuditLogs from './pages/settings/AuditLogs';

// Simple Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Public Routes */}
        <Route path="/login" element={<AuthLayout />} />
        <Route path="/register" element={<AuthLayout />} />
        
        {/* Protected Application Routes with AppShell */}
        <Route 
          element={
            <ProtectedRoute>
              <CurrencyProvider>
                <AppShell />
              </CurrencyProvider>
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/inventory/overview" element={<StockOverview />} />
          <Route path="/inventory/movements" element={<StockMovements />} />
          <Route path="/inventory/transfers" element={<StockTransfers />} />
          <Route path="/inventory/transfers/new" element={<StockTransferForm />} />
          <Route path="/inventory/adjustments" element={<StockAdjustments />} />
          <Route path="/inventory/adjustments/new" element={<StockAdjustmentForm />} />
          <Route path="/inventory/uom-master" element={<UomMaster />} />
          <Route path="/inventory/uom-conversions" element={<UomConversionMaster />} />
          <Route path="/hierarchy/departments" element={<DepartmentMaster />} />
          <Route path="/hierarchy/categories" element={<CategoryMaster />} />
          <Route path="/hierarchy/families" element={<FamilyMaster />} />
          <Route path="/hierarchy/subfamilies" element={<SubFamilyMaster />} />
          <Route path="/hierarchy/sizes" element={<SizeMaster />} />
          <Route path="/hierarchy/colors" element={<ColorMaster />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/suppliers/new" element={<SupplierForm />} />
          <Route path="/suppliers/:id" element={<SupplierDetail />} />
          <Route path="/suppliers/edit/:id" element={<SupplierForm />} />
          <Route path="/purchases" element={<PurchaseOrders />} />
          <Route path="/purchases/:id" element={<PurchaseOrderDetail />} />
          <Route path="/purchases/bills" element={<VendorBills />} />
          <Route path="/purchases/bills/new" element={<VendorBillForm />} />
          <Route path="/purchases/bills/:id" element={<VendorBillDetail />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/account-mappings" element={<AccountMapping />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/new" element={<CustomerForm />} />
          <Route path="/customers/edit/:id" element={<CustomerForm />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/employees/new" element={<EmployeeForm />} />
          <Route path="/employees/:id" element={<EmployeeDetail />} />
          <Route path="/employees/edit/:id" element={<EmployeeForm />} />
          <Route path="/shifts" element={<Shifts />} />
          <Route path="/shifts/new" element={<ShiftForm />} />
          <Route path="/shifts/edit/:id" element={<ShiftForm />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/leave-types" element={<LeaveTypes />} />
          <Route path="/leave-types/new" element={<LeaveTypeForm />} />
          <Route path="/leave-types/edit/:id" element={<LeaveTypeForm />} />
          <Route path="/holidays" element={<HolidayCalendars />} />
          <Route path="/holiday-calendars/new" element={<HolidayCalendarForm />} />
          <Route path="/holiday-calendars/edit/:id" element={<HolidayCalendarForm />} />
          <Route path="/holiday-calendars/:id" element={<HolidayDetail />} />
          <Route path="/leave-balances" element={<LeaveBalances />} />
          <Route path="/leave-requests" element={<LeaveRequests />} />
          <Route path="/leave-requests/new" element={<ProtectedRoute><LeaveRequestForm /></ProtectedRoute>} />
          
          <Route path="/salary-components" element={<ProtectedRoute><SalaryComponents /></ProtectedRoute>} />
          <Route path="/salary-components/new" element={<ProtectedRoute><SalaryComponentForm /></ProtectedRoute>} />
          <Route path="/salary-components/edit/:id" element={<ProtectedRoute><SalaryComponentForm /></ProtectedRoute>} />
          
          <Route path="/salary-structures" element={<ProtectedRoute><SalaryStructures /></ProtectedRoute>} />
          <Route path="/salary-structures/new" element={<ProtectedRoute><SalaryStructureForm /></ProtectedRoute>} />
          <Route path="/salary-structures/edit/:id" element={<ProtectedRoute><SalaryStructureForm /></ProtectedRoute>} />
          
          <Route path="/payroll-periods" element={<ProtectedRoute><PayrollPeriods /></ProtectedRoute>} />
          <Route path="/payroll-periods/new" element={<ProtectedRoute><PayrollPeriodForm /></ProtectedRoute>} />
          <Route path="/payroll-periods/:id" element={<ProtectedRoute><PayrollPeriodDetail /></ProtectedRoute>} />
          
          <Route path="/payroll-rules" element={<ProtectedRoute><PayrollRules /></ProtectedRoute>} />
          <Route path="/payroll-rules/new" element={<ProtectedRoute><PayrollRuleForm /></ProtectedRoute>} />
          <Route path="/payroll-rules/edit/:id" element={<ProtectedRoute><PayrollRuleForm /></ProtectedRoute>} />
          
          <Route path="/payslips" element={<ProtectedRoute><Payslips /></ProtectedRoute>} />
          <Route path="/payslips/:id" element={<ProtectedRoute><PayslipDetail /></ProtectedRoute>} />
          <Route path="/payroll-reports" element={<ProtectedRoute><PayrollReports /></ProtectedRoute>} />

          <Route path="/leave-requests/new" element={<LeaveRequestForm />} />
          <Route path="/payroll" element={<Payroll />} />
          <Route path="/bom" element={<BOM />} />
          <Route path="/manufacturing" element={<ManufacturingOrders />} />
          <Route path="/manufacturing/new" element={<ManufacturingOrderForm />} />
          <Route path="/manufacturing/:id" element={<ManufacturingOrderDetail />} />
          <Route path="/web-orders" element={<WebOrders />} />
          <Route path="/api-keys" element={<ApiKeys />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/pos/sessions" element={<POSSessions />} />
          <Route path="/pos/orders" element={<POSOrders />} />
          <Route path="/pos/returns" element={<POSReturns />} />
          <Route path="/pos/reports" element={<POSReports />} />
          <Route path="/pos/registers" element={<POSRegisters />} />
          <Route path="/sales" element={<SalesHistory />} />
          <Route path="/sales/orders/:id" element={<OrderView />} />
          <Route path="/sales/quotes" element={<Quotes />} />
          <Route path="/sales/quotes/new" element={<QuoteForm />} />
          <Route path="/sales/quotes/edit/:id" element={<QuoteForm />} />
          <Route path="/sales/proforma" element={<ProForma />} />
          <Route path="/sales/proforma/new" element={<ProFormaForm />} />
          <Route path="/sales/proforma/edit/:id" element={<ProFormaForm />} />
          <Route path="/sales/proforma/print/:id" element={<ProFormaPrint />} />
          <Route path="/sales/delivery-notes" element={<DeliveryNotes />} />
          <Route path="/sales/delivery-notes/new" element={<DeliveryNoteForm />} />
          <Route path="/sales/delivery-notes/edit/:id" element={<DeliveryNoteForm />} />
          <Route path="/sales/delivery-notes/print/:id" element={<DeliveryNotePrint />} />
          <Route path="/sales/returns" element={<SalesReturns />} />
          <Route path="/sales/returns/new" element={<SalesReturnForm />} />
          <Route path="/sales/returns/:id" element={<SalesReturnDetail />} />
          <Route path="/sales/returns/edit/:id" element={<SalesReturnForm />} />
          <Route path="/sales/tax-invoices" element={<TaxInvoices />} />
          <Route path="/sales/tax-invoices/new" element={<TaxInvoiceForm />} />
          <Route path="/sales/tax-invoices/edit/:id" element={<TaxInvoiceForm />} />
          <Route path="/sales/tax-invoices/print/:id" element={<TaxInvoicePrint />} />
          <Route path="/purchases/rfqs" element={<RFQs />} />
          <Route path="/purchases/rfqs/new" element={<RFQForm />} />
          <Route path="/purchases/rfqs/:id" element={<RFQDetail />} />
          <Route path="/purchases/rfqs/edit/:id" element={<RFQForm />} />
          <Route path="/purchases/grn" element={<GRN />} />
          <Route path="/purchases/grn/new" element={<GRNForm />} />
          <Route path="/purchases/grn/:id" element={<GRNView />} />
          <Route path="/purchases/grn/edit/:id" element={<GRNForm />} />
          <Route path="/purchases/returns" element={<VendorReturns />} />
          <Route path="/purchases/returns/new" element={<VendorReturnForm />} />
          <Route path="/purchases/returns/:id" element={<VendorReturnDetail />} />
          <Route path="/purchases/returns/edit/:id" element={<VendorReturnForm />} />

          {/* Consignments */}
          <Route path="/purchases/consignments" element={<Consignments />} />
          <Route path="/purchases/consignments/new" element={<ConsignmentForm />} />
          <Route path="/purchases/consignments/:id" element={<ConsignmentDetail />} />
          <Route path="/purchases/consignments/edit/:id" element={<ConsignmentForm />} />
          <Route path="/purchases/consignments/receipts" element={<ConsignmentReceipts />} />
          <Route path="/purchases/consignments/receipts/new" element={<ConsignmentReceiptForm />} />
          <Route path="/purchases/consignments/receipts/:id" element={<ConsignmentReceiptDetail />} />
          <Route path="/purchases/consignments/stock" element={<ConsignmentStock />} />
          <Route path="/purchases/consignments/settlements" element={<ConsignmentSettlements />} />
          <Route path="/purchases/consignments/settlements/new" element={<ConsignmentSettlementForm />} />

          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/general" element={<Navigate to="/settings/company" replace />} />
          <Route path="/settings/company" element={<CompanySettings />} />
          <Route path="/settings/branches" element={<BranchManagement />} />
          <Route path="/settings/users" element={<UserManagement />} />
          <Route path="/settings/roles" element={<RoleManagement />} />
          <Route path="/settings/taxes" element={<TaxMaster />} />
          <Route path="/settings/audit-logs" element={<AuditLogs />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

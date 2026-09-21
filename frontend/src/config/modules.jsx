import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Package,
  ShoppingCart,
  Users,
  Settings,
  Shield,
  Truck,
  ShoppingBag,
  BookOpen,
  FileText,
  Target,
  Layers,
  UserCircle,
  Banknote,
  Factory,
  Wrench,
  Globe,
  Key,
  MapPin,
  FileCheck,
  Receipt,
  ClipboardList,
  Tag,
  Boxes,
  Box,
  Ruler,
  Palette,
  Building,
  Clock,
  CalendarDays
} from 'lucide-react';

export const ACTIONS = [
  { id: 'VIEW', label: 'View', color: 'bg-blue-500', textClass: 'text-blue-500' },
  { id: 'CREATE', label: 'Create', color: 'bg-green-500', textClass: 'text-green-500' },
  { id: 'EDIT', label: 'Edit', color: 'bg-amber-500', textClass: 'text-amber-500' },
  { id: 'DELETE', label: 'Delete', color: 'bg-red-500', textClass: 'text-red-500' }
];

export const ERP_MODULES = [
  {
    id: 'DASHBOARD',
    name: 'Dashboard',
    icon: <LayoutDashboard size={18} />,
    path: '/dashboard',
    isParent: false
  },
  {
    id: 'SALES',
    name: 'Sales',
    icon: <ShoppingCart size={18} />,
    isParent: true,
    actions: [
      'VIEW',
      'POS.VIEW', 'POS.SESSION.VIEW', 'POS.SESSION.OPEN', 'POS.SESSION.CLOSE',
      'POS.ORDER.VIEW', 'POS.ORDER.CREATE', 'POS.ORDER.CANCEL',
      'POS.DISCOUNT.APPLY', 'POS.PAYMENT.CREATE',
      'POS.RETURN.VIEW', 'POS.RETURN.CREATE', 'POS.REPORT.VIEW'
    ],
    subModules: [
      { 
        id: 'POS_GROUP', 
        name: 'Point of Sale',
        path: '/pos',
        icon: <ShoppingCart size={16} />,
        children: [
          { id: 'POS_SESSIONS', name: 'POS Sessions', path: '/pos/sessions', icon: <Clock size={14} /> },
          { id: 'POS_ORDERS', name: 'POS Orders', path: '/pos/orders', icon: <ClipboardList size={14} /> },
          { id: 'POS_RETURNS', name: 'POS Returns', path: '/pos/returns', icon: <Package size={14} /> },
          { id: 'POS_REPORTS', name: 'POS Reports', path: '/pos/reports', icon: <FileText size={14} /> },
          { id: 'POS_REGISTERS', name: 'POS Registers', path: '/pos/registers', icon: <Settings size={14} /> }
        ]
      },
      { id: 'QUOTATIONS', name: 'Quotations', path: '/sales/quotes', icon: <FileText size={16} /> },
      { id: 'SALES_ORDERS', name: 'Sales Orders', path: '/sales', icon: <ClipboardList size={16} /> },
      { id: 'PROFORMA', name: 'Pro-Forma Invoice', path: '/sales/proforma', icon: <FileCheck size={16} /> },
      { id: 'DELIVERY_NOTE', name: 'Delivery Note', path: '/sales/delivery-notes', icon: <Truck size={16} /> },
      { id: 'SALES_RETURNS', name: 'Sales Returns', path: '/sales/returns', icon: <Package size={16} /> },
      { id: 'TAX_INVOICE', name: 'Tax Invoice', path: '/sales/tax-invoices', icon: <Receipt size={16} /> },
      { id: 'CRM', name: 'Sales Pipeline (CRM)', path: '/leads', icon: <Target size={16} /> },
      { id: 'CUSTOMERS', name: 'Customers', path: '/customers', icon: <Users size={16} /> }
    ]
  },
  {
    id: 'PURCHASE',
    name: 'Purchase',
    icon: <ShoppingBag size={18} />,
    isParent: true,
    subModules: [
      { id: 'SUPPLIERS', name: 'Suppliers', path: '/suppliers', icon: <Truck size={16} /> },
      { id: 'RFQS', name: 'Requests for Quotation', path: '/purchases/rfqs', icon: <FileText size={16} /> },
      { id: 'PURCHASE_ORDERS', name: 'Purchase Orders', path: '/purchases', icon: <ShoppingBag size={16} /> },
      { id: 'GRN', name: 'Goods Receipt Note (GRN)', path: '/purchases/grn', icon: <ClipboardList size={16} /> },
      { id: 'VENDOR_RETURNS', name: 'Vendor Returns', path: '/purchases/returns', icon: <Package size={16} /> },
      { id: 'VENDOR_BILLS', name: 'Vendor Bills', path: '/purchases/bills', icon: <Receipt size={16} /> },
      { id: 'CONSIGNMENT_AGREEMENTS', name: 'Consignments', path: '/purchases/consignments', icon: <Building size={16} /> },
      { id: 'CONSIGNMENT_RECEIPTS', name: 'Consignment Receipts', path: '/purchases/consignments/receipts', icon: <Building size={16} /> },
      { id: 'CONSIGNMENT_STOCK', name: 'Consignment Stock', path: '/purchases/consignments/stock', icon: <Building size={16} /> },
      { id: 'CONSIGNMENT_SETTLEMENTS', name: 'Consignment Settlements', path: '/purchases/consignments/settlements', icon: <Building size={16} /> }
    ]
  },
  {
    id: 'INVENTORY_MODULE',
    name: 'Inventory',
    icon: <Package size={18} />,
    isParent: true,
    subModules: [
      { id: 'INVENTORY_OVERVIEW', name: 'Stock Overview', path: '/inventory/overview', icon: <LayoutDashboard size={16} /> },
      { id: 'INVENTORY', name: 'Products Master', path: '/inventory', icon: <Package size={16} /> },
      { id: 'INVENTORY_MOVEMENTS', name: 'Stock Movements', path: '/inventory/movements', icon: <ClipboardList size={16} /> },
      { id: 'INVENTORY_TRANSFERS', name: 'Transfers', path: '/inventory/transfers', icon: <Truck size={16} /> },
      { id: 'INVENTORY_ADJUSTMENTS', name: 'Adjustments', path: '/inventory/adjustments', icon: <Target size={16} /> }
    ]
  },
  {
    id: 'ITEM_HIERARCHY',
    name: 'Item Hierarchy',
    icon: <Layers size={18} />,
    isParent: true,
    subModules: [
      { id: 'DEPARTMENT_MASTER', name: 'Department Master', path: '/hierarchy/departments', icon: <Layers size={16} /> },
      { id: 'CATEGORY_MASTER', name: 'Category Master', path: '/hierarchy/categories', icon: <Tag size={16} /> },
      { id: 'FAMILY_MASTER', name: 'Family Master', path: '/hierarchy/families', icon: <Boxes size={16} /> },
      { id: 'SUBFAMILY_MASTER', name: 'Sub Family Master', path: '/hierarchy/subfamilies', icon: <Box size={16} /> },
      { id: 'SIZE_MASTER', name: 'Size Master', path: '/hierarchy/sizes', icon: <Ruler size={16} /> },
      { id: 'COLOR_MASTER', name: 'Color Master', path: '/hierarchy/colors', icon: <Palette size={16} /> },
      { id: 'UOM_MASTER', name: 'UOM Master', path: '/inventory/uom-master', icon: <Settings size={16} /> },
      { id: 'UOM_CONVERSIONS', name: 'UOM Conversions', path: '/inventory/uom-conversions', icon: <Settings size={16} /> }
    ]
  },
  {
    id: 'MANUFACTURING_MODULE',
    name: 'Manufacturing',
    icon: <Factory size={18} />,
    isParent: true,
    subModules: [
      { id: 'BOM', name: 'Bill of Materials', path: '/bom', icon: <Wrench size={16} /> },
      { id: 'MANUFACTURING', name: 'Manufacturing Orders', path: '/manufacturing', icon: <Factory size={16} /> }
    ]
  },
  {
    id: 'ACCOUNTS',
    name: 'Accounts',
    icon: <BookOpen size={18} />,
    isParent: true,
    subModules: [
      { id: 'CHART_OF_ACCOUNTS', name: 'Chart of Accounts', path: '/accounts', icon: <BookOpen size={16} /> },
      { id: 'ACCOUNT_MAPPINGS', name: 'Account Mappings', path: '/account-mappings', icon: <BookOpen size={16} /> },
      { id: 'JOURNAL', name: 'General Journal', path: '/journal', icon: <FileText size={16} /> }
    ]
  },
  {
    id: 'HR_PAYROLL',
    name: 'HR & Payroll',
    icon: <Users size={18} />,
    isParent: true,
    actions: [
      'VIEW',
      'SALARY_COMPONENT.CREATE', 'SALARY_COMPONENT.EDIT', 'SALARY_COMPONENT.DELETE',
      'SALARY_STRUCTURE.CREATE', 'SALARY_STRUCTURE.EDIT', 'SALARY_STRUCTURE.DELETE',
      'EMPLOYEE_SALARY.VIEW', 'EMPLOYEE_SALARY.CREATE', 'EMPLOYEE_SALARY.REVISE',
      'PERIOD.VIEW', 'PERIOD.CREATE', 'PERIOD.EDIT', 'PERIOD.OPEN', 'PERIOD.CALCULATE', 'PERIOD.RECALCULATE', 'PERIOD.REVIEW', 'PERIOD.APPROVE', 'PERIOD.LOCK', 'PERIOD.CANCEL',
      'RECORD.VIEW', 'RECORD.EDIT', 'RECORD.PAY',
      'RULE.VIEW', 'RULE.CREATE', 'RULE.EDIT', 'RULE.DELETE',
      'PAYSLIP.VIEW', 'PAYSLIP.CREATE', 'PAYSLIP.FINALIZE', 'PAYSLIP.CANCEL', 'PAYSLIP.DOWNLOAD', 'PAYSLIP.PRINT',
      'REPORT.VIEW', 'REPORT.EXPORT', 'REPORT.SUMMARY', 'REPORT.EMPLOYEE', 'REPORT.DEPARTMENT', 'REPORT.BRANCH', 'REPORT.EARNINGS', 'REPORT.DEDUCTIONS', 'REPORT.CONTRIBUTION', 'REPORT.ATTENDANCE'
    ],
    subModules: [
      { id: 'DEPARTMENTS', name: 'Departments', path: '/departments', icon: <Layers size={16} /> },
      { id: 'EMPLOYEES', name: 'Employees', path: '/employees', icon: <UserCircle size={16} /> },
      { id: 'SHIFTS', name: 'Shifts', path: '/shifts', icon: <Clock size={16} /> },
      { id: 'ATTENDANCE', name: 'Daily Attendance', path: '/attendance', icon: <CalendarDays size={16} /> },
      { id: 'LEAVE_TYPE', name: 'Leave Types', path: '/leave-types', icon: <FileText size={16} /> },
      { id: 'HOLIDAY', name: 'Holidays', path: '/holidays', icon: <CalendarDays size={16} /> },
      { id: 'LEAVE_BALANCE', name: 'Leave Balances', path: '/leave-balances', icon: <Target size={16} /> },
      { id: 'LEAVE_REQUEST', name: 'Leave Requests', path: '/leave-requests', icon: <FileCheck size={16} /> },
      { id: 'PAYROLL', name: 'Payroll', path: '/payroll', icon: <Banknote size={16} /> },
      { id: 'SALARY_COMPONENT', name: 'Salary Components', path: '/salary-components', icon: <Banknote size={16} /> },
      { id: 'SALARY_STRUCTURE', name: 'Salary Structures', path: '/salary-structures', icon: <FileText size={16} /> },
      { id: 'PAYROLL_PERIOD', name: 'Payroll Periods', path: '/payroll-periods', icon: <Banknote size={16} /> },
      { id: 'PAYROLL_RULE', name: 'Payroll Rules', path: '/payroll-rules', icon: <Banknote size={16} /> },
      { id: 'PAYSLIPS', name: 'Payslips', path: '/payslips', icon: <Receipt size={16} /> },
      { id: 'PAYROLL_REPORTS', name: 'Payroll Reports', path: '/payroll-reports', icon: <FileText size={16} /> },
      { id: 'EMPLOYEE_SALARY', name: 'Employee Salary', path: '', icon: <UserCircle size={16} /> }
    ]
  },
  {
    id: 'ECOMMERCE',
    name: 'E-Commerce',
    icon: <Globe size={18} />,
    isParent: true,
    subModules: [
      { id: 'WEB_ORDERS', name: 'Web Orders', path: '/web-orders', icon: <Globe size={16} /> },
      { id: 'API_KEYS', name: 'API Keys', path: '/api-keys', icon: <Key size={16} /> }
    ]
  },
  {
    id: 'SETTINGS',
    name: 'Settings',
    icon: <Settings size={18} />,
    path: '/settings',
    isParent: true,
    subModules: [
      { id: 'GENERAL_SETTINGS', name: 'General Settings', path: '/settings/general', icon: <Settings size={16} /> },
      { id: 'COMPANY', name: 'Company Setup', path: '/settings/company', icon: <Building2 size={16} /> },
      { id: 'BRANCHES', name: 'Branches', path: '/settings/branches', icon: <MapPin size={16} /> },
      { id: 'USERS', name: 'Users', path: '/settings/users', icon: <Users size={16} /> },
      { id: 'ROLES', name: 'Roles & Permissions', path: '/settings/roles', icon: <Shield size={16} /> },
      { id: 'TAXES', name: 'Tax Master', path: '/settings/taxes', icon: <Receipt size={16} /> },
      { id: 'AUDIT_LOGS', name: 'Audit Logs', path: '/settings/audit-logs', icon: <Shield size={16} /> }
    ]
  }
];

// Helper to get a flat list of all submodules for permission checking
export const getAllPermissionModules = () => {
  let modules = [];
  ERP_MODULES.forEach(mod => {
    if (mod.isParent) {
      mod.subModules.forEach(sub => {
        if (sub.children) {
          modules = [...modules, ...sub.children];
        } else {
          modules.push(sub);
        }
      });
    } else {
      modules.push(mod);
    }
  });
  return modules;
};

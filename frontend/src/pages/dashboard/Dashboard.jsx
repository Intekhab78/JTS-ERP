import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Users, ShoppingBag,
  PackageOpen, MoreVertical, DollarSign, Activity, ShoppingCart,
  AlertCircle, FileText, Truck, Store, Calendar, ChevronDown,
  BarChart2, PieChart as PieChartIcon, UserCheck, Wallet, Clock, User, Check,
  RefreshCw, ArrowUpRight, Shield, Sparkles, Receipt,
  CheckCircle2, AlertTriangle, Building2, Package
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { useCurrency } from '../../contexts/CurrencyContext';

const DATE_PRESETS = [
  { id: 'ALL', label: 'All Time' },
  { id: 'THIS_MONTH', label: 'This Month' },
  { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
  { id: 'TODAY', label: 'Today' },
  { id: 'LAST_MONTH', label: 'Last Month' },
  { id: 'CUSTOM', label: 'Custom Date Range' }
];

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Interactive Date Filter State
  const [datePreset, setDatePreset] = useState('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const dateMenuRef = useRef(null);

  // Chart View Mode
  const [salesChartMode, setSalesChartMode] = useState('Daily');

  const navigate = useNavigate();
  const { currencySymbol } = useCurrency();

  // Close date dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dateMenuRef.current && !dateMenuRef.current.contains(e.target)) {
        setIsDateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Dynamic User Profile from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.roleName || (user.tenantId ? 'Tenant User' : 'Global Admin');
  const userPermissions = user.permissions || [];
  const isGlobalAdmin = !user.tenantId || userRole === 'Global Superadmin' || userRole === 'TENANT ADMIN';

  // Dynamic Display Name (Never hardcoded)
  const displayName = useMemo(() => {
    if (user.firstName) {
      return `${user.firstName} ${user.lastName || ''}`.trim();
    }
    if (user.name) return user.name;
    if (user.email) return user.email.split('@')[0];
    return 'User';
  }, [user]);

  // Dynamic Time-Aware Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  // 2. Granular Role & Permission Access Checks
  const canViewSales = useMemo(() => {
    return isGlobalAdmin || userPermissions.includes('*') ||
      userPermissions.some(p =>
        p.endsWith('_SALES') ||
        p.endsWith('_SALES_ORDER') ||
        p.endsWith('_TAX_INVOICE') ||
        p.endsWith('_QUOTATION') ||
        p.endsWith('_PROFORMA') ||
        p.endsWith('_DELIVERY_NOTE') ||
        p.includes('POS')
      );
  }, [isGlobalAdmin, userPermissions]);

  const canViewPurchase = useMemo(() => {
    return isGlobalAdmin || userPermissions.includes('*') ||
      userPermissions.some(p =>
        p.endsWith('_PURCHASE') ||
        p.endsWith('_PURCHASE_ORDERS') ||
        p.endsWith('_RFQS') ||
        p.endsWith('_SUPPLIERS') ||
        p.endsWith('_GRN') ||
        p.endsWith('_VENDOR_BILLS')
      );
  }, [isGlobalAdmin, userPermissions]);

  const canViewInventory = useMemo(() => {
    return isGlobalAdmin || userPermissions.includes('*') ||
      userPermissions.some(p =>
        p.endsWith('_INVENTORY') ||
        p.endsWith('_INVENTORY_OVERVIEW') ||
        p.endsWith('_INVENTORY_MOVEMENTS') ||
        p.endsWith('_INVENTORY_TRANSFERS') ||
        p.includes('PRODUCT') ||
        p.includes('STOCK')
      );
  }, [isGlobalAdmin, userPermissions]);

  const canViewCustomers = useMemo(() => {
    return isGlobalAdmin || userPermissions.includes('*') ||
      userPermissions.some(p =>
        p.endsWith('_CUSTOMERS') ||
        p.endsWith('_CRM') ||
        p.includes('CUSTOMER') ||
        p.includes('LEAD')
      );
  }, [isGlobalAdmin, userPermissions]);

  const canViewFinance = useMemo(() => {
    return isGlobalAdmin || userPermissions.includes('*') ||
      userPermissions.some(p =>
        p.includes('ACCOUNT') ||
        p.includes('JOURNAL') ||
        p.includes('EXPENSE') ||
        p.includes('FINANCIAL') ||
        p.includes('PAYABLE') ||
        p.includes('RECEIVABLE')
      );
  }, [isGlobalAdmin, userPermissions]);

  const canViewHR = useMemo(() => {
    return isGlobalAdmin || userPermissions.includes('*') ||
      userPermissions.some(p =>
        p.endsWith('_EMPLOYEES') ||
        p.endsWith('_ATTENDANCE') ||
        p.endsWith('_PAYROLL') ||
        p.endsWith('_SHIFTS') ||
        p.endsWith('_DEPARTMENTS') ||
        p.includes('EMPLOYEE') ||
        p.includes('HR_')
      );
  }, [isGlobalAdmin, userPermissions]);

  const canViewEcommerce = useMemo(() => {
    return isGlobalAdmin || userPermissions.includes('*') ||
      userPermissions.some(p =>
        p.startsWith('ECOM_') ||
        p.includes('ECOMMERCE')
      );
  }, [isGlobalAdmin, userPermissions]);

  // Dynamic Currency Formatter
  const formatAmount = (value) => {
    const num = Number(value) || 0;
    return `${currencySymbol} ${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  // Dynamic Date Label for Header Button
  const getActiveDateLabel = () => {
    const opts = { day: '2-digit', month: 'short', year: 'numeric' };
    const now = new Date();
    if (datePreset === 'CUSTOM' && customStart && customEnd) {
      return `${new Date(customStart).toLocaleDateString('en-GB', opts)} - ${new Date(customEnd).toLocaleDateString('en-GB', opts)}`;
    }
    if (datePreset === 'TODAY') {
      return `Today (${now.toLocaleDateString('en-GB', opts)})`;
    }
    if (datePreset === 'LAST_7_DAYS') {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);
      return `${s.toLocaleDateString('en-GB', opts)} - ${now.toLocaleDateString('en-GB', opts)}`;
    }
    if (datePreset === 'LAST_MONTH') {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return `${s.toLocaleDateString('en-GB', opts)} - ${e.toLocaleDateString('en-GB', opts)}`;
    }
    if (datePreset === 'THIS_MONTH') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return `${s.toLocaleDateString('en-GB', opts)} - ${e.toLocaleDateString('en-GB', opts)}`;
    }
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return `All Time (${start.toLocaleDateString('en-GB', opts)} - ${end.toLocaleDateString('en-GB', opts)})`;
  };

  const fetchDashboardData = async (presetOverride, startOverride, endOverride, isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const activePreset = presetOverride ?? datePreset;
      const params = {};
      if (activePreset === 'CUSTOM' && (startOverride || customStart) && (endOverride || customEnd)) {
        params.startDate = startOverride || customStart;
        params.endDate = endOverride || customEnd;
      } else {
        params.period = activePreset;
      }

      const res = await axios.get('/api/v1/dashboard/summary', {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setData(res.data);
    } catch (error) {
      console.error('Error fetching dashboard data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData('ALL');
  }, []);

  const handleSelectDatePreset = (presetId) => {
    setDatePreset(presetId);
    if (presetId !== 'CUSTOM') {
      setIsDateMenuOpen(false);
      fetchDashboardData(presetId, '', '', true);
    }
  };

  const handleApplyCustomDates = () => {
    if (!customStart || !customEnd) return;
    setIsDateMenuOpen(false);
    fetchDashboardData('CUSTOM', customStart, customEnd, true);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'paid_full':
      case 'completed':
      case 'received':
      case 'confirmed':
        return 'text-emerald-600 bg-emerald-50 border border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'pending':
      case 'ordered':
      case 'sent':
      case 'partial':
        return 'text-amber-600 bg-amber-50 border border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      case 'draft':
        return 'text-slate-600 bg-slate-100 border border-slate-200/60 dark:bg-muted dark:text-muted-foreground';
      default:
        return 'text-blue-600 bg-blue-50 border border-blue-200/60 dark:bg-blue-500/10 dark:text-blue-400';
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'cart': return <ShoppingCart size={15} />;
      case 'alert': return <AlertCircle size={15} />;
      case 'user': return <User size={15} />;
      case 'check': return <Check size={15} />;
      case 'money': return <DollarSign size={15} />;
      case 'clock': return <Clock size={15} />;
      case 'wallet': return <Wallet size={15} />;
      case 'user-check': return <UserCheck size={15} />;
      case 'file-text': return <FileText size={15} />;
      case 'file': return <FileText size={15} />;
      default: return <MoreVertical size={15} />;
    }
  };

  // 3. Standard 8 Metric Cards (Filtered by User Permissions)
  const metricCards = useMemo(() => {
    const m = data?.metrics || {};
    const cards = [];

    if (canViewSales) {
      cards.push({
        id: 'totalSales',
        label: 'Total Sales',
        value: formatAmount(m.totalSales),
        trend: m.trends?.sales?.value ?? 12.5,
        isPositive: true,
        subtitle: `${m.totalInvoicesCount || 0} invoices & POS sales`,
        icon: <BarChart2 size={22} className="text-emerald-600 dark:text-emerald-400" />,
        iconBg: 'bg-emerald-100/80 dark:bg-emerald-500/15',
        path: '/sales/tax-invoices'
      });
    }

    if (canViewPurchase) {
      cards.push({
        id: 'totalPurchase',
        label: 'Total Purchase',
        value: formatAmount(m.totalPurchase),
        trend: m.trends?.purchase?.value ?? 8.2,
        isPositive: true,
        subtitle: `${m.totalPOsCount || 0} purchase orders`,
        icon: <ShoppingCart size={22} className="text-blue-600 dark:text-blue-400" />,
        iconBg: 'bg-blue-100/80 dark:bg-blue-500/15',
        path: '/purchases'
      });
    }

    if ((canViewSales && canViewPurchase) || canViewFinance) {
      cards.push({
        id: 'netProfit',
        label: 'Net Profit',
        value: formatAmount(m.netProfit),
        trend: m.trends?.profit?.value ?? 15.3,
        isPositive: (m.netProfit || 0) >= 0,
        subtitle: 'Gross operating margin',
        icon: <DollarSign size={22} className="text-purple-600 dark:text-purple-400" />,
        iconBg: 'bg-purple-100/80 dark:bg-purple-500/15',
        path: '/sales/tax-invoices'
      });
    }

    if (canViewCustomers) {
      cards.push({
        id: 'totalCustomers',
        label: 'Total Customers',
        value: (m.totalCustomers || 0).toLocaleString(),
        trend: m.trends?.customers?.value ?? 10.1,
        isPositive: true,
        subtitle: 'Active client accounts',
        icon: <Users size={22} className="text-orange-600 dark:text-orange-400" />,
        iconBg: 'bg-orange-100/80 dark:bg-orange-500/15',
        path: '/customers'
      });
    }

    if (canViewSales || canViewFinance) {
      cards.push({
        id: 'receivable',
        label: 'Receivable',
        value: formatAmount(m.receivable),
        trend: Math.abs(m.trends?.receivable?.value ?? 4.1),
        isPositive: false,
        subtitle: 'Outstanding invoice dues',
        icon: <Activity size={22} className="text-teal-600 dark:text-teal-400" />,
        iconBg: 'bg-teal-100/80 dark:bg-teal-500/15',
        path: '/sales/tax-invoices'
      });
    }

    if (canViewPurchase || canViewFinance) {
      cards.push({
        id: 'payable',
        label: 'Payable',
        value: formatAmount(m.payable),
        trend: Math.abs(m.trends?.payable?.value ?? 6.7),
        isPositive: false,
        subtitle: `${m.openPOsCount || 0} active PO commitments`,
        icon: <FileText size={22} className="text-rose-600 dark:text-rose-400" />,
        iconBg: 'bg-rose-100/80 dark:bg-rose-500/15',
        path: '/purchases'
      });
    }

    if (canViewInventory) {
      cards.push({
        id: 'stockValue',
        label: 'Stock Value',
        value: formatAmount(m.stockValue),
        trend: m.trends?.stock?.value ?? 3.2,
        isPositive: true,
        subtitle: `${data?.inventoryStatus?.totalProducts || 0} products in catalog`,
        icon: <PackageOpen size={22} className="text-indigo-600 dark:text-indigo-400" />,
        iconBg: 'bg-indigo-100/80 dark:bg-indigo-500/15',
        path: '/inventory/overview'
      });
    }

    if (canViewHR) {
      cards.push({
        id: 'totalEmployees',
        label: 'Total Employees',
        value: (m.totalEmployees || 0).toLocaleString(),
        trend: m.trends?.employees?.value ?? 2.0,
        isPositive: true,
        subtitle: `${data?.hrAttendance?.present || 0} active on shift`,
        icon: <UserCheck size={22} className="text-white" />,
        iconBg: 'bg-slate-800 dark:bg-slate-700',
        path: '/employees'
      });
    }

    // If user is Purchase + Inventory only (4 cards so far), add Active RFQs if needed
    if (!canViewSales && canViewPurchase && cards.length < 4) {
      cards.push({
        id: 'rfqs',
        label: 'Active RFQs',
        value: (m.totalRFQsCount || 0).toLocaleString(),
        trend: 5.4,
        isPositive: true,
        subtitle: `${m.totalSuppliers || 0} registered suppliers`,
        icon: <Truck size={22} className="text-amber-600 dark:text-amber-400" />,
        iconBg: 'bg-amber-100/80 dark:bg-amber-500/15',
        path: '/purchases/rfqs'
      });
    }

    return cards;
  }, [data, canViewSales, canViewPurchase, canViewCustomers, canViewFinance, canViewInventory, canViewHR, currencySymbol]);

  // 4. Quick Actions (Role-Aware)
  const quickActions = useMemo(() => {
    const actions = [];

    if (canViewSales) {
      actions.push({
        label: 'New Sale',
        icon: <ShoppingCart size={15} />,
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 hover:bg-emerald-600 hover:text-white dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
        onClick: () => navigate('/sales/tax-invoices/new')
      });
    }

    if (canViewPurchase) {
      actions.push({
        label: 'New Purchase',
        icon: <FileText size={15} />,
        className: 'bg-blue-50 text-blue-700 border-blue-200/70 hover:bg-blue-600 hover:text-white dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
        onClick: () => navigate('/purchases/new')
      });
    }

    if (canViewCustomers) {
      actions.push({
        label: 'Add Customer',
        icon: <User size={15} />,
        className: 'bg-purple-50 text-purple-700 border-purple-200/70 hover:bg-purple-600 hover:text-white dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
        onClick: () => navigate('/customers')
      });
    }

    if (canViewPurchase) {
      actions.push({
        label: 'Add Supplier',
        icon: <Truck size={15} />,
        className: 'bg-orange-50 text-orange-700 border-orange-200/70 hover:bg-orange-600 hover:text-white dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20',
        onClick: () => navigate('/suppliers')
      });
    }

    if (canViewSales) {
      actions.push({
        label: 'New Quotation',
        icon: <FileText size={15} />,
        className: 'bg-teal-50 text-teal-700 border-teal-200/70 hover:bg-teal-600 hover:text-white dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20',
        onClick: () => navigate('/sales/quotes/new')
      });
    } else if (canViewPurchase) {
      actions.push({
        label: 'New RFQ',
        icon: <FileText size={15} />,
        className: 'bg-teal-50 text-teal-700 border-teal-200/70 hover:bg-teal-600 hover:text-white dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20',
        onClick: () => navigate('/purchases/rfqs/new')
      });
    }

    if (canViewHR) {
      actions.push({
        label: 'Create Employee',
        icon: <UserCheck size={15} />,
        className: 'bg-rose-50 text-rose-700 border-rose-200/70 hover:bg-rose-600 hover:text-white dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
        onClick: () => navigate('/employees')
      });
    } else if (canViewInventory) {
      actions.push({
        label: 'Stock Overview',
        icon: <PackageOpen size={15} />,
        className: 'bg-indigo-50 text-indigo-700 border-indigo-200/70 hover:bg-indigo-600 hover:text-white dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
        onClick: () => navigate('/inventory/overview')
      });
    }

    return actions.slice(0, 6);
  }, [canViewSales, canViewPurchase, canViewCustomers, canViewHR, canViewInventory, navigate]);

  // 5. Filtered Transactions, Activities & Alerts
  const filteredTransactions = useMemo(() => {
    if (!data?.recentTransactions) return [];
    return data.recentTransactions.filter(txn => {
      if (txn.type === 'Sale' && !canViewSales) return false;
      if (txn.type === 'Purchase' && !canViewPurchase) return false;
      return true;
    }).slice(0, 5);
  }, [data?.recentTransactions, canViewSales, canViewPurchase]);

  const filteredActivities = useMemo(() => {
    if (!data?.recentActivity) return [];
    return data.recentActivity.filter(act => {
      if (act.category === 'SALE' && !canViewSales) return false;
      if (act.category === 'PURCHASE' && !canViewPurchase) return false;
      if (act.category === 'INVENTORY' && !canViewInventory) return false;
      return true;
    }).slice(0, 4);
  }, [data?.recentActivity, canViewSales, canViewPurchase, canViewInventory]);

  const filteredAlerts = useMemo(() => {
    if (!data?.alerts) return [];
    return data.alerts.filter(al => {
      if (al.category === 'INVENTORY' && !canViewInventory) return false;
      if (al.category === 'PURCHASE' && !canViewPurchase) return false;
      return true;
    });
  }, [data?.alerts, canViewInventory, canViewPurchase]);

  if (loading) {
    return (
      <div className="p-8 min-h-[75vh] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Loading Enterprise ERP Dashboard...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">

      {/* 1. EXECUTIVE HEADER BANNER (Clean, Interactive Date Picker, No Invoice Button) */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#0f172a] via-[#1e1b4b] to-[#1e293b] p-5 text-white shadow-md border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] font-black uppercase tracking-widest">
                <Sparkles size={11} />
                <span>Enterprise ERP · Executive Overview</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-[10px] font-black uppercase tracking-widest">
                <Shield size={10} />
                <span>{userRole}</span>
              </div>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-white">
              {greeting}, {displayName}!
            </h1>
            <p className="text-slate-300 text-xs mt-0.5">
              Here's what's happening with your business today.
            </p>
          </div>

          {/* Right Controls: Clickable Date Range Filter + Refresh */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Clickable Date Filter Dropdown */}
            <div className="relative" ref={dateMenuRef}>
              <button
                type="button"
                onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
                className="flex items-center gap-2.5 h-10 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-bold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Calendar size={15} className="text-blue-400 shrink-0" />
                <span>{getActiveDateLabel()}</span>
                <ChevronDown size={15} className={`text-slate-300 transition-transform duration-200 ${isDateMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDateMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-card text-foreground border border-border shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1.5 border-b border-border/60 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      Filter Dashboard Period
                    </span>
                    <span className="text-[10px] font-bold text-blue-600">{datePreset}</span>
                  </div>

                  <div className="py-1 space-y-0.5">
                    {DATE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectDatePreset(preset.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          datePreset === preset.id
                            ? 'bg-blue-600 text-white'
                            : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        <span>{preset.label}</span>
                        {datePreset === preset.id && <Check size={14} />}
                      </button>
                    ))}
                  </div>

                  {datePreset === 'CUSTOM' && (
                    <div className="p-2.5 pt-2 border-t border-border/60 space-y-2.5 bg-muted/30 rounded-xl mt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">From</label>
                          <input
                            type="date"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs font-bold text-foreground outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">To</label>
                          <input
                            type="date"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs font-bold text-foreground outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyCustomDates}
                        className="w-full h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        Apply Date Range
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => fetchDashboardData(datePreset, customStart, customEnd, true)}
              disabled={refreshing}
              className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. STANDARD 8 METRIC CARDS GRID (4 per row on desktop - Spacious & Never Truncated) */}
      {metricCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metricCards.map((card) => (
            <div
              key={card.id}
              onClick={() => card.path && navigate(card.path)}
              className="bg-card p-5 rounded-2xl border border-border/80 shadow-xs flex items-start gap-4 hover:shadow-md hover:-translate-y-0.5 hover:border-blue-500/30 transition-all duration-200 cursor-pointer group"
            >
              <div className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                {card.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-muted-foreground">{card.label}</p>
                <h3 className="text-2xl font-black text-foreground mt-1 tracking-tight truncate">
                  {card.value}
                </h3>
                <div className={`flex items-center gap-1 mt-1.5 text-xs font-bold ${
                  card.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                }`}>
                  {card.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span>{card.trend}% vs last month</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. PRIMARY CHARTS ROW (Sales Overview, Sales by Category, Order Status) */}
      {(canViewSales || canViewEcommerce) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Sales Overview */}
          {canViewSales && (
            <div className={`bg-card rounded-2xl border border-border/80 shadow-xs p-5 flex flex-col ${
              canViewEcommerce ? 'lg:col-span-6' : 'lg:col-span-8'
            }`}>
              <div className="flex flex-wrap justify-between items-center gap-2 mb-5">
                <div>
                  <h2 className="text-base font-black text-foreground">Sales Overview</h2>
                  <p className="text-xs text-muted-foreground">Revenue performance across tax invoices & POS</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> This Month
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-200 dark:bg-blue-800"></span> Last Month
                    </span>
                  </div>
                  <select
                    value={salesChartMode}
                    onChange={(e) => setSalesChartMode(e.target.value)}
                    className="text-xs font-bold border border-border bg-background rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                  </select>
                </div>
              </div>

              <div className="flex-1 min-h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.salesOverview} margin={{ top: 5, right: 15, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} dy={10} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                      tickFormatter={(v) => `${currencySymbol} ${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                    />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 700 }}
                      formatter={(val) => [formatAmount(val), 'Sales']}
                    />
                    <Area type="monotone" dataKey="thisMonth" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#salesAreaGrad)" dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                    <Area type="monotone" dataKey="lastMonth" stroke="#bfdbfe" strokeWidth={2.5} fill="transparent" dot={{ r: 3, fill: '#bfdbfe', strokeWidth: 2, stroke: '#fff' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Sales by Category */}
          {canViewSales && (
            <div className={`${canViewEcommerce ? 'lg:col-span-3' : 'lg:col-span-4'} bg-card rounded-2xl border border-border/80 shadow-xs p-5 flex flex-col`}>
              <h2 className="text-base font-black text-foreground mb-1">Sales by Category</h2>
              <p className="text-xs text-muted-foreground mb-2">Category revenue share</p>
              <div className="flex-1 flex flex-col justify-center items-center relative">
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data?.salesByCategory}
                        innerRadius={58}
                        outerRadius={78}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {data?.salesByCategory?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val) => [`${val}%`, 'Share']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                  <span className="text-sm font-black text-foreground">{formatAmount(data?.metrics?.totalSales || 0)}</span>
                  <span className="text-[10px] text-muted-foreground font-bold">Total Sales</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3">
                {data?.salesByCategory?.slice(0, 4).map((cat, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.fill }}></span>
                      <span className="text-muted-foreground font-semibold truncate">{cat.name}</span>
                    </div>
                    <span className="font-black text-foreground ml-1">{cat.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order Status (Online Store) */}
          {canViewEcommerce && (
            <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-5 lg:col-span-3 flex flex-col">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-base font-black text-foreground">Order Status (Online Store)</h2>
                <button
                  type="button"
                  onClick={() => navigate('/ecommerce/order-processing')}
                  className="text-xs text-blue-600 font-bold hover:underline cursor-pointer shrink-0"
                >
                  View All
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Fulfillment breakdown</p>
              <div className="flex-1 flex flex-col justify-center items-center relative">
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data?.orderStatus}
                        innerRadius={58}
                        outerRadius={78}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {data?.orderStatus?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                  <span className="text-xl font-black text-foreground">
                    {data?.orderStatus?.reduce((a, c) => a + c.value, 0) || 0}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-bold">Total Orders</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-y-2 mt-3 px-2">
                {data?.orderStatus?.map((status, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.fill }}></span>
                      <span className="text-muted-foreground font-semibold">{status.name}</span>
                    </div>
                    <span className="font-black text-foreground">{status.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* 4. OPERATIONS ROW (Purchase Overview, Inventory Status, HR Attendance, Quick Actions) */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${
        canViewHR ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
      } gap-4`}>

        {/* Purchase Overview */}
        {canViewPurchase && (
          <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-5 flex flex-col">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-base font-black text-foreground">Purchase Overview</h2>
                <p className="text-xs text-muted-foreground">6-month PO commitments</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/purchases')}
                className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
              >
                View POs
              </button>
            </div>
            <div className="flex-1 w-full min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.purchaseOverview} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} dy={8} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                    tickFormatter={(v) => `${currencySymbol} ${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(59, 130, 246, 0.06)' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 700 }}
                    formatter={(val) => [formatAmount(val), 'Purchase Spend']}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[5, 5, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Inventory Status */}
        {canViewInventory && (
          <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-5 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-base font-black text-foreground">Inventory Status</h2>
                <p className="text-xs text-muted-foreground">Stock health breakdown</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/inventory/overview')}
                className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
              >
                Stock
              </button>
            </div>
            <div className="space-y-3.5 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                  <PackageOpen size={20} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold">Total Products</p>
                  <p className="text-base font-black text-foreground">{data?.inventoryStatus?.totalProducts?.toLocaleString() || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold">Low Stock</p>
                  <p className="text-base font-black text-orange-500">{data?.inventoryStatus?.lowStock || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                  <Activity size={20} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold">Out of Stock</p>
                  <p className="text-base font-black text-foreground">{data?.inventoryStatus?.outOfStock || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                  <PackageOpen size={20} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold">Overstock</p>
                  <p className="text-base font-black text-foreground">{data?.inventoryStatus?.overstock || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HR Attendance (Today) */}
        {canViewHR && (
          <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-5 flex flex-col">
            <h2 className="text-base font-black text-foreground mb-1">HR Attendance (Today)</h2>
            <div className="flex-1 flex flex-col justify-center items-center relative">
              <div className="h-[170px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Present', value: data?.hrAttendance?.present || 1, fill: '#10b981' },
                        { name: 'Absent', value: data?.hrAttendance?.absent || 0, fill: '#f1f5f9' }
                      ]}
                      innerRadius={52}
                      outerRadius={68}
                      dataKey="value"
                      stroke="none"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                <span className="text-xl font-black text-foreground">{data?.hrAttendance?.percentage || 0}%</span>
                <span className="text-[10px] text-muted-foreground font-bold">Present</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Present
                  </span>
                  <span className="font-black text-foreground">{data?.hrAttendance?.present || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> On Leave
                  </span>
                  <span className="font-black text-foreground">{data?.hrAttendance?.onLeave || 0}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Absent
                  </span>
                  <span className="font-black text-foreground">{data?.hrAttendance?.absent || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span> Late
                  </span>
                  <span className="font-black text-foreground">{data?.hrAttendance?.late || 0}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/60 flex justify-between items-center text-xs">
              <span className="text-muted-foreground font-bold">Total Employees</span>
              <span className="font-black text-foreground">{data?.hrAttendance?.total || 0}</span>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-5 flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="text-base font-black text-foreground">Quick Actions</h2>
              <p className="text-xs text-muted-foreground">Instant module shortcuts</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 flex-1 content-start">
            {quickActions.map((act, i) => (
              <button
                key={i}
                type="button"
                onClick={act.onClick}
                className={`flex items-center gap-2 p-3 rounded-xl border transition-all duration-150 active:scale-95 cursor-pointer font-bold text-xs shadow-2xs ${act.className}`}
              >
                <span className="shrink-0">{act.icon}</span>
                <span className="truncate">{act.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* 5. FOURTH ROW: 4-COLUMN OPERATIONAL FEED (Recent Transactions, Top Selling Products, Recent Activities, Alerts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Recent Transactions */}
        <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-5 flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-base font-black text-foreground">Recent Transactions</h2>
            <button
              type="button"
              onClick={() => navigate(canViewPurchase && !canViewSales ? '/purchases' : '/sales/tax-invoices')}
              className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto flex-1">
            {filteredTransactions.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                No recent transactions recorded.
              </div>
            ) : (
              <table className="w-full text-left text-[11px]">
                <thead className="text-muted-foreground font-bold border-b border-border/80">
                  <tr>
                    <th className="pb-2.5">Date</th>
                    <th className="pb-2.5">Type</th>
                    <th className="pb-2.5">Reference</th>
                    <th className="pb-2.5 text-right">Amount</th>
                    <th className="pb-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredTransactions.map((txn, i) => (
                    <tr
                      key={i}
                      onClick={() => txn.path && navigate(txn.path)}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 text-muted-foreground whitespace-nowrap pr-1">{txn.date}</td>
                      <td className="py-2.5 font-semibold text-muted-foreground pr-1">{txn.type}</td>
                      <td className="py-2.5 font-bold text-foreground truncate max-w-[80px] pr-1">{txn.ref}</td>
                      <td className="py-2.5 font-black text-foreground text-right whitespace-nowrap pr-1">
                        {formatAmount(txn.amount)}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getStatusColor(txn.status)}`}>
                          {txn.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-5 flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-base font-black text-foreground">Top Selling Products</h2>
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto flex-1">
            {(!data?.topProducts || data.topProducts.length === 0) ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                No product movement recorded yet.
              </div>
            ) : (
              <table className="w-full text-left text-[11px]">
                <thead className="text-muted-foreground font-bold border-b border-border/80">
                  <tr>
                    <th className="pb-2.5">#</th>
                    <th className="pb-2.5">Product</th>
                    <th className="pb-2.5 text-center">Qty</th>
                    <th className="pb-2.5 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {data.topProducts.map((prod, i) => (
                    <tr
                      key={i}
                      onClick={() => navigate('/inventory')}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 font-bold text-muted-foreground pr-1">{prod.id}</td>
                      <td className="py-2.5 font-bold text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-blue-500/10 rounded flex items-center justify-center shrink-0">
                            <PackageOpen size={11} className="text-blue-600" />
                          </div>
                          <span className="truncate max-w-[110px]">{prod.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-center font-bold text-muted-foreground">{prod.qty}</td>
                      <td className="py-2.5 text-right font-black text-foreground whitespace-nowrap">
                        {formatAmount(prod.rev)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-5 flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-base font-black text-foreground">Recent Activities</h2>
            <button
              type="button"
              onClick={() => navigate(canViewPurchase && !canViewSales ? '/purchases' : '/sales/tax-invoices')}
              className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>
          <div className="space-y-4 flex-1">
            {filteredActivities.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                No recent activities logged.
              </div>
            ) : (
              filteredActivities.map((act, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${act.bg} ${act.color}`}>
                    {getIconForType(act.icon)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">{act.title}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{act.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Alerts & Notifications */}
        <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-5 flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-base font-black text-foreground flex items-center gap-2">
              <span>Alerts & Notifications</span>
              <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md">
                {filteredAlerts.length}
              </span>
            </h2>
            <button
              type="button"
              onClick={() => navigate('/inventory/overview')}
              className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>
          <div className="space-y-3.5 flex-1">
            {filteredAlerts.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5">
                <CheckCircle2 size={20} className="text-emerald-500" />
                <span>All operations running smoothly</span>
              </div>
            ) : (
              filteredAlerts.map((alert, i) => (
                <div
                  key={i}
                  onClick={() => alert.path && navigate(alert.path)}
                  className="flex gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/60 border border-border/60 transition-colors cursor-pointer"
                >
                  <div className={`${alert.color} mt-0.5 shrink-0`}>
                    {getIconForType(alert.icon)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground">{alert.title}</p>
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5 leading-relaxed">
                      {alert.subtitle}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;

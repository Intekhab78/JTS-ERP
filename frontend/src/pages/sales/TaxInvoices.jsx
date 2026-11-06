import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCurrency } from '../../contexts/CurrencyContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { EmailSendModal } from '../../components/common/EmailSendModal';
import {
  Search, X, Plus, RefreshCw, Eye, Printer, Mail, Calendar, Clock,
  CheckCircle2, AlertTriangle, FileText, Sparkles, Percent, Trash2,
  DollarSign, Receipt, User, ArrowUpRight, Check, MoreVertical,
  AlertCircle
} from 'lucide-react';

/**
 * Three-Dot Action Popover: Portal based so it is NEVER clipped by tables.
 * Styled to exact match RFQ & E-Commerce Hub.
 */
function ActionMenu({ invoice, onEdit, onPrint, onEmail, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const updatePosition = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuHeight = invoice.status === 'DRAFT' ? 260 : 210;
    const menuWidth = 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight && rect.top > menuHeight;

    setCoords({
      top: openUp ? rect.top - menuHeight - 6 : rect.bottom + 6,
      left: Math.max(8, rect.right - menuWidth)
    });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleClickOutside = (e) => {
        if (
          btnRef.current && !btnRef.current.contains(e.target) &&
          menuRef.current && !menuRef.current.contains(e.target)
        ) {
          setIsOpen(false);
        }
      };
      const handleScroll = () => updatePosition();
      const handleResize = () => updatePosition();

      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen]);

  return (
    <div className="relative inline-block" onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
          isOpen
            ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-95'
            : 'bg-muted/40 hover:bg-muted text-foreground border-border/80 hover:border-blue-500/40 hover:scale-105 active:scale-95'
        }`}
        title="Invoice Actions"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: '260px',
            zIndex: 9999
          }}
          className="rounded-2xl bg-card border border-border shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150 text-xs"
        >
          {/* Header Bar */}
          <div className="px-2.5 py-1.5 border-b border-border/60 flex items-center justify-between">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground truncate">
              Actions · {invoice.invoiceNumber}
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
              {invoice.status}
            </span>
          </div>

          {/* 1. View / Edit Details */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onEdit(invoice._id);
            }}
            className="w-full text-left p-2 rounded-xl hover:bg-blue-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
              <Eye size={14} />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-foreground group-hover:text-blue-600">
                View Invoice Details
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                Full breakdown & tax ledger details
              </div>
            </div>
          </button>

          {/* 2. Dispatch via Email */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onEmail(invoice);
            }}
            className="w-full text-left p-2 rounded-xl hover:bg-emerald-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
              <Mail size={14} />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-foreground group-hover:text-emerald-600">
                Dispatch via Email
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                Send statutory PDF invoice to customer
              </div>
            </div>
          </button>

          {/* 3. Print A4 Tax Invoice */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onPrint(invoice._id);
            }}
            className="w-full text-left p-2 rounded-xl hover:bg-indigo-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
              <Printer size={14} />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-foreground group-hover:text-indigo-600">
                Print Tax Invoice
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                Generate compliant A4 invoice sheet
              </div>
            </div>
          </button>

          {/* 4. Delete Invoice (if DRAFT) */}
          {invoice.status === 'DRAFT' && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onDelete(invoice._id, invoice.invoiceNumber);
              }}
              className="w-full text-left p-2 rounded-xl hover:bg-rose-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer border-t border-border/50 pt-1.5"
            >
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 group-hover:bg-rose-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                <Trash2 size={14} />
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-rose-600">
                  Delete Tax Invoice
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  Permanently remove draft record
                </div>
              </div>
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

const TaxInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const { formatCurrency, currencySymbol } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [datePreset, setDatePreset] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [emailModal, setEmailModal] = useState({ isOpen: false, invoice: null });
  const navigate = useNavigate();

  const fetchInvoices = async () => {
    try {
      const res = await axios.get('/api/v1/tax-invoices', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setInvoices(res.data || []);
    } catch (error) {
      console.error('Failed to fetch tax invoices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInvoices();
  };

  const handleDelete = async (id, invNum) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${invNum || ''}?`)) return;
    try {
      await axios.delete(`/api/v1/tax-invoices/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchInvoices();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete invoice.');
      console.error(error);
    }
  };

  // Quick Date Presets (Exact match to E-Commerce & Sourcing Hub)
  const handleDatePreset = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    const formatDateStr = (d) => d.toISOString().split('T')[0];

    if (preset === 'ALL') {
      setDateFrom('');
      setDateTo('');
    } else if (preset === 'TODAY') {
      const dStr = formatDateStr(today);
      setDateFrom(dStr);
      setDateTo(dStr);
    } else if (preset === 'YESTERDAY') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const dStr = formatDateStr(y);
      setDateFrom(dStr);
      setDateTo(dStr);
    } else if (preset === 'LAST_7_DAYS') {
      const past = new Date(today);
      past.setDate(past.getDate() - 6);
      setDateFrom(formatDateStr(past));
      setDateTo(formatDateStr(today));
    } else if (preset === 'THIS_MONTH') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      setDateFrom(formatDateStr(first));
      setDateTo(formatDateStr(today));
    }
  };

  // 1. Date Filter
  const dateFilteredInvoices = useMemo(() => {
    if (!dateFrom && !dateTo) return invoices;
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

    return invoices.filter(inv => {
      const dateVal = inv.issueDate || inv.createdAt;
      if (!dateVal) return false;
      const t = new Date(dateVal).getTime();
      if (fromTime && t < fromTime) return false;
      if (toTime && t > toTime) return false;
      return true;
    });
  }, [invoices, dateFrom, dateTo]);

  // 2. Metrics calculation
  const metrics = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);

    let totalBilled = 0;
    let totalTax = 0;
    let totalPaid = 0;
    let totalBalance = 0;

    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;
    let overdueCount = 0;
    let draftCount = 0;

    dateFilteredInvoices.forEach(inv => {
      const grand = Number(inv.grandTotal) || 0;
      const tax = Number(inv.taxTotal) || 0;
      const paid = Number(inv.amountPaid) || 0;
      const balance = Number(inv.balanceDue !== undefined ? inv.balanceDue : (grand - paid)) || 0;
      const isOverdue = inv.dueDate && new Date(inv.dueDate).getTime() < today && balance > 0;

      totalBilled += grand;
      totalTax += tax;
      totalPaid += paid;
      totalBalance += balance;

      if (inv.status === 'PAID_FULL' || balance <= 0) {
        paidCount++;
      } else if (inv.status === 'PAID_PARTIAL' || (paid > 0 && balance > 0)) {
        partialCount++;
      } else if (inv.status === 'DRAFT') {
        draftCount++;
      } else if (isOverdue || inv.status === 'OVERDUE') {
        overdueCount++;
      } else {
        unpaidCount++;
      }
    });

    return {
      totalCount: dateFilteredInvoices.length,
      totalBilled,
      totalTax,
      totalPaid,
      totalBalance,
      paidCount,
      partialCount,
      unpaidCount,
      overdueCount,
      draftCount
    };
  }, [dateFilteredInvoices]);

  // 3. Search and Tab Filter
  const filteredInvoices = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);

    return dateFilteredInvoices.filter(inv => {
      const balance = Number(inv.balanceDue !== undefined ? inv.balanceDue : (inv.grandTotal - (inv.amountPaid || 0))) || 0;
      const isOverdue = inv.dueDate && new Date(inv.dueDate).getTime() < today && balance > 0;

      if (activeTab === 'PAID' && !(inv.status === 'PAID_FULL' || balance <= 0)) return false;
      if (activeTab === 'PARTIAL' && !(inv.status === 'PAID_PARTIAL' || ((inv.amountPaid || 0) > 0 && balance > 0))) return false;
      if (activeTab === 'UNPAID' && (inv.status === 'PAID_FULL' || balance <= 0 || inv.status === 'DRAFT' || isOverdue)) return false;
      if (activeTab === 'OVERDUE' && !(isOverdue || inv.status === 'OVERDUE')) return false;
      if (activeTab === 'DRAFT' && inv.status !== 'DRAFT') return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const num = (inv.invoiceNumber || '').toLowerCase();
      const cust = (inv.customerSnapshot?.name || '').toLowerCase();
      const email = (inv.customerSnapshot?.email || '').toLowerCase();
      const phone = (inv.customerSnapshot?.phone || '').toLowerCase();
      const trn = (inv.customerSnapshot?.taxRegistrationNumber || '').toLowerCase();

      return num.includes(q) || cust.includes(q) || email.includes(q) || phone.includes(q) || trn.includes(q);
    });
  }, [dateFilteredInvoices, activeTab, searchTerm]);

  const getStatusBadge = (inv) => {
    const today = new Date().setHours(0, 0, 0, 0);
    const balance = Number(inv.balanceDue !== undefined ? inv.balanceDue : (inv.grandTotal - (inv.amountPaid || 0))) || 0;
    const isOverdue = inv.dueDate && new Date(inv.dueDate).getTime() < today && balance > 0;

    if (inv.status === 'PAID_FULL' || balance <= 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          PAID IN FULL
        </span>
      );
    }
    if (inv.status === 'PAID_PARTIAL' || ((inv.amountPaid || 0) > 0 && balance > 0)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          PARTIALLY PAID
        </span>
      );
    }
    if (isOverdue || inv.status === 'OVERDUE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          OVERDUE
        </span>
      );
    }
    if (inv.status === 'SENT' || inv.status === 'APPROVED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          AWAITING PAYMENT
        </span>
      );
    }
    if (inv.status === 'CANCELLED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-500/15 text-slate-500 border border-slate-500/30">
          CANCELLED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30">
        DRAFT
      </span>
    );
  };

  return (
    <div className="space-y-4 pb-12 max-w-[1440px] mx-auto text-foreground">

      {/* ========================================================================= */}
      {/* 1. COMPACT HERO HEADER                                                    */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-4 sm:p-5 text-white shadow-md border border-blue-900/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          
          {/* Left: Branding & Subtitle */}
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase tracking-wider">
              <Sparkles size={11} className="text-blue-400" />
              Fiscal Sales & Revenue Engine · Statutory Tax Ledger
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
              Tax Invoices
            </h1>
            <p className="text-xs text-blue-100/75 max-w-xl leading-snug">
              Manage statutory tax invoices, monitor VAT collections, review settlement statuses, and dispatch legal invoices.
            </p>
          </div>

          {/* Right: Search Input + New Invoice Button + Refresh */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <div className="relative w-full sm:w-64 md:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search invoice #, customer, TRN..."
                className="w-full h-9 pl-9 pr-8 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs font-medium text-white placeholder-slate-400 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400/50"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate('/sales/tax-invoices/new')}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>New Invoice</span>
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              title="Refresh Tax Invoices"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

        </div>

        {/* Ambient subtle light */}
        <div className="absolute right-0 top-0 w-80 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ========================================================================= */}
      {/* 2. SIX KPI METRIC CARDS (WITH HOVER ELEVATION ANIMATION)                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        {[
          {
            id: 'ALL',
            label: 'Total Invoices',
            count: metrics.totalCount,
            sub: `${currencySymbol} ${metrics.totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            color: 'text-foreground',
            bg: 'bg-blue-600',
            icon: Receipt
          },
          {
            id: 'PAID',
            label: 'Paid in Full',
            count: metrics.paidCount,
            sub: `${currencySymbol} ${metrics.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-600',
            icon: CheckCircle2
          },
          {
            id: 'PARTIAL',
            label: 'Partially Paid',
            count: metrics.partialCount,
            sub: 'Partial collections',
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-600',
            icon: Clock
          },
          {
            id: 'UNPAID',
            label: 'Unpaid / Sent',
            count: metrics.unpaidCount,
            sub: `${currencySymbol} ${metrics.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-600',
            icon: DollarSign
          },
          {
            id: 'OVERDUE',
            label: 'Overdue',
            count: metrics.overdueCount,
            sub: 'Past due balance',
            color: 'text-rose-600 dark:text-rose-400',
            bg: 'bg-rose-600',
            icon: AlertTriangle
          },
          {
            id: 'VAT',
            label: 'VAT Collected (5%)',
            count: `${currencySymbol} ${metrics.totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            sub: 'Statutory UAE VAT',
            color: 'text-purple-600 dark:text-purple-400',
            bg: 'bg-purple-600',
            icon: Percent,
            isVat: true
          }
        ].map(kpi => {
          const IconComp = kpi.icon;
          const isSelected = activeTab === kpi.id;
          return (
            <button
              key={kpi.id}
              type="button"
              onClick={() => {
                if (!kpi.isVat) setActiveTab(kpi.id);
              }}
              className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all duration-200 flex items-center justify-between gap-2 shadow-2xs hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                isSelected
                  ? 'bg-card border-blue-500/70 ring-1 ring-blue-500/30'
                  : 'bg-card border-border/80 hover:border-blue-500/50 hover:bg-muted/30'
              }`}
            >
              <div className="space-y-0.5 truncate">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
                  {kpi.label}
                </span>
                <div className={`text-base sm:text-lg font-black leading-tight ${kpi.color} truncate`}>
                  {kpi.count}
                </div>
                <span className="text-[9.5px] text-muted-foreground block truncate">
                  {kpi.sub}
                </span>
              </div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform ${
                isSelected ? `${kpi.bg} text-white shadow-2xs scale-105` : 'bg-muted text-muted-foreground'
              }`}>
                <IconComp size={15} />
              </div>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 3. SEGMENTED STATUS TABS                                                  */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] p-1.5 bg-muted/40 rounded-xl border border-border/60">
        {[
          { id: 'ALL', label: 'All Invoices', count: metrics.totalCount },
          { id: 'PAID', label: 'Paid in Full', count: metrics.paidCount },
          { id: 'PARTIAL', label: 'Partial', count: metrics.partialCount },
          { id: 'UNPAID', label: 'Unpaid / Sent', count: metrics.unpaidCount },
          { id: 'OVERDUE', label: 'Overdue', count: metrics.overdueCount },
          { id: 'DRAFT', label: 'Drafts', count: metrics.draftCount }
        ].map(tab => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 cursor-pointer hover:-translate-y-0.5 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card hover:shadow-2xs'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* DATE FILTER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 bg-card rounded-xl border border-border/80 shadow-2xs transition-all hover:border-blue-500/30">
        
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
            <Calendar size={12} className="text-blue-500" /> INVOICE DATE:
          </span>

          {[
            { id: 'ALL', label: 'All Time' },
            { id: 'TODAY', label: 'Today' },
            { id: 'YESTERDAY', label: 'Yesterday' },
            { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
            { id: 'THIS_MONTH', label: 'This Month' }
          ].map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleDatePreset(preset.id)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all duration-150 cursor-pointer hover:-translate-y-0.5 ${
                datePreset === preset.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground hover:shadow-2xs'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg border border-border/70">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => {
                setDateFrom(e.target.value);
                setDatePreset('CUSTOM');
              }}
              className="bg-transparent text-[11px] font-bold text-foreground focus:outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg border border-border/70">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => {
                setDateTo(e.target.value);
                setDatePreset('CUSTOM');
              }}
              className="bg-transparent text-[11px] font-bold text-foreground focus:outline-none cursor-pointer"
            />
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. REDESIGNED TABLE WITH HOVER ANIMATION & THREE-DOT (⋮) ACTION MENU      */}
      {/* ========================================================================= */}
      <div className="rounded-2xl bg-card border border-border/80 shadow-2xs overflow-hidden transition-all duration-200">
        
        {/* Table Header Bar */}
        <div className="p-3.5 sm:p-4 border-b border-border/80 bg-muted/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Receipt size={15} />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
              Tax Invoices Ledger
            </h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 uppercase tracking-wider">
              {filteredInvoices.length} Invoices
            </span>
          </div>

          <span className="text-[10px] font-bold text-muted-foreground">
            Currency: <strong className="text-foreground">{currencySymbol}</strong>
          </span>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <RefreshCw size={28} className="animate-spin text-blue-600" />
            <span className="text-xs font-bold">Loading tax invoices ledger...</span>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
              <Receipt size={24} />
            </div>
            <h4 className="text-sm font-black text-foreground">No Tax Invoices Found</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchTerm
                ? `No tax invoices match your search "${searchTerm}".`
                : 'No invoices have been recorded yet in this category.'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/sales/tax-invoices/new')}
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus size={14} /> Create Tax Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap text-xs">
              <thead className="text-[10px] font-black text-muted-foreground uppercase tracking-wider bg-muted/10 border-b border-border/80">
                <tr>
                  <th className="px-4 py-3.5">Invoice #</th>
                  <th className="px-3 py-3.5">Issue & Due Date</th>
                  <th className="px-3 py-3.5">Customer / Recipient</th>
                  <th className="px-3 py-3.5 text-right">Invoiced Total</th>
                  <th className="px-3 py-3.5 text-right">Balance Due</th>
                  <th className="px-3 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredInvoices.map((inv) => {
                  const grand = Number(inv.grandTotal) || 0;
                  const paid = Number(inv.amountPaid) || 0;
                  const balance = Number(inv.balanceDue !== undefined ? inv.balanceDue : (grand - paid)) || 0;
                  const tax = Number(inv.taxTotal) || 0;
                  const isSettled = balance <= 0;

                  return (
                    <tr
                      key={inv._id}
                      className="hover:bg-blue-500/[0.04] dark:hover:bg-blue-500/[0.07] transition-all duration-150 group cursor-pointer"
                      onClick={() => navigate(`/sales/tax-invoices/edit/${inv._id}`)}
                    >
                      {/* Invoice Number */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white group-hover:scale-105 transition-all">
                            <FileText size={14} />
                          </div>
                          <div>
                            <div className="font-black text-xs text-foreground group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                              <span>{inv.invoiceNumber}</span>
                              <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9.5px] font-bold text-muted-foreground uppercase">
                                {inv.sourceType || 'DIRECT'}
                              </span>
                              {inv.customerSnapshot?.taxRegistrationNumber && (
                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
                                  TRN Verified
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Issue & Due Date */}
                      <td className="px-3 py-3">
                        <div className="font-bold text-xs text-foreground flex items-center gap-1">
                          <Calendar size={12} className="text-muted-foreground" />
                          <span>{inv.issueDate ? format(new Date(inv.issueDate), 'MMM dd, yyyy') : '-'}</span>
                        </div>
                        {inv.dueDate && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock size={11} className="text-amber-500" />
                            <span>Due: {format(new Date(inv.dueDate), 'MMM dd, yyyy')}</span>
                          </div>
                        )}
                      </td>

                      {/* Customer / Recipient */}
                      <td className="px-3 py-3">
                        <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                          <User size={12} className="text-blue-500 shrink-0" />
                          <span className="truncate max-w-[200px]">{inv.customerSnapshot?.name || 'Walk-in Customer'}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[200px] mt-0.5">
                          {inv.customerSnapshot?.phone || inv.customerSnapshot?.email || '-'}
                        </div>
                      </td>

                      {/* Invoiced Total */}
                      <td className="px-3 py-3 text-right">
                        <div className="font-black text-xs text-foreground">
                          {currencySymbol} {grand.toFixed(2)}
                        </div>
                        <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          VAT: {currencySymbol} {tax.toFixed(2)}
                        </div>
                      </td>

                      {/* Balance Due */}
                      <td className="px-3 py-3 text-right">
                        {isSettled ? (
                          <div className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                            <Check size={13} strokeWidth={2.5} />
                            <span>Settled</span>
                          </div>
                        ) : (
                          <div>
                            <div className="font-black text-xs text-rose-600 dark:text-rose-400">
                              {currencySymbol} {balance.toFixed(2)}
                            </div>
                            {paid > 0 && (
                              <div className="text-[9.5px] text-muted-foreground mt-0.5">
                                Paid: {currencySymbol} {paid.toFixed(2)}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 text-center">
                        {getStatusBadge(inv)}
                      </td>

                      {/* Actions: Three-Dot (⋮) Menu Button */}
                      <td className="px-4 py-3 text-right">
                        <ActionMenu
                          invoice={inv}
                          onEdit={(id) => navigate(`/sales/tax-invoices/edit/${id}`)}
                          onPrint={(id) => window.open(`/sales/tax-invoices/print/${id}`, '_blank')}
                          onEmail={(row) => setEmailModal({ isOpen: true, invoice: row })}
                          onDelete={handleDelete}
                        />
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Total Bar */}
        {!loading && filteredInvoices.length > 0 && (
          <div className="p-3.5 bg-muted/20 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">
              Showing <strong className="text-foreground">{filteredInvoices.length}</strong> of{' '}
              <strong className="text-foreground">{invoices.length}</strong> invoices in statutory ledger
            </span>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                  Filtered Revenue
                </span>
                <span className="text-xs font-black text-foreground">
                  {currencySymbol} {filteredInvoices.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0).toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                  Filtered VAT
                </span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  {currencySymbol} {filteredInvoices.reduce((s, i) => s + (Number(i.taxTotal) || 0), 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Email Send Modal */}
      {emailModal.isOpen && emailModal.invoice && (
        <EmailSendModal
          isOpen={emailModal.isOpen}
          onClose={() => setEmailModal({ isOpen: false, invoice: null })}
          documentType="Tax Invoice"
          documentNumber={emailModal.invoice.invoiceNumber}
          recipientName={emailModal.invoice.customerSnapshot?.name}
          defaultEmail={emailModal.invoice.customerSnapshot?.email}
          sendEndpoint={`/api/v1/email/tax-invoice/${emailModal.invoice._id}`}
        />
      )}

    </div>
  );
};

export default TaxInvoices;

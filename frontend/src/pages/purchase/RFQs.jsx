import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Plus, Edit3, Eye, FileText, Activity, Zap, Server, ChevronLeft, ChevronRight, 
  Trash2, MoreVertical, Mail, Search, RefreshCw, Sparkles, Building2, MapPin, 
  Calendar, Layers, Clock, CheckCircle2, XCircle, RotateCcw, Copy, Check,
  Send, DollarSign, ExternalLink, User, ShoppingBag
} from 'lucide-react';
import { format } from 'date-fns';
import { FloatingMenu } from '../../components/common/FloatingMenu';
import { EmailSendModal } from '../../components/common/EmailSendModal';
import { useCurrency } from '../../contexts/CurrencyContext';

export default function RFQs() {
  const [rfqs, setRfqs] = useState([]);
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [emailModal, setEmailModal] = useState({ isOpen: false, rfq: null });
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [datePreset, setDatePreset] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);

  const navigate = useNavigate();
  const { formatCurrency, currencySymbol } = useCurrency();

  useEffect(() => {
    fetchRFQs();
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await axios.get('/api/v1/branches', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBranches(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRFQs = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/v1/rfqs', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRfqs(res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRFQs();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this RFQ?')) return;
    try {
      await axios.delete(`/api/v1/rfqs/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchRFQs();
    } catch (error) {
      alert('Failed to delete RFQ. It might be linked to other records.');
      console.error(error);
    }
  };

  // Quick Date Preset Handler (Exact match to PO & Ecom)
  const handleDatePreset = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    if (preset === 'ALL') {
      setDateFrom('');
      setDateTo('');
    } else if (preset === 'TODAY') {
      const dStr = formatDate(today);
      setDateFrom(dStr);
      setDateTo(dStr);
    } else if (preset === 'YESTERDAY') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const dStr = formatDate(y);
      setDateFrom(dStr);
      setDateTo(dStr);
    } else if (preset === 'LAST_7_DAYS') {
      const past = new Date(today);
      past.setDate(past.getDate() - 6);
      setDateFrom(formatDate(past));
      setDateTo(formatDate(today));
    } else if (preset === 'THIS_MONTH') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      setDateFrom(formatDate(first));
      setDateTo(formatDate(today));
    }
  };

  // 1. Date Filter
  const dateFilteredRFQs = useMemo(() => {
    if (!dateFrom && !dateTo) return rfqs;
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

    return rfqs.filter(rfq => {
      if (!rfq.createdAt) return false;
      const t = new Date(rfq.createdAt).getTime();
      if (fromTime && t < fromTime) return false;
      if (toTime && t > toTime) return false;
      return true;
    });
  }, [rfqs, dateFrom, dateTo]);

  // KPI Metrics calculation
  const totalCount = dateFilteredRFQs.length;
  const draftCount = dateFilteredRFQs.filter(r => (r.status || 'DRAFT') === 'DRAFT').length;
  const sentCount = dateFilteredRFQs.filter(r => r.status === 'SENT').length;
  const quotedCount = dateFilteredRFQs.filter(r => r.status === 'QUOTED').length;
  const confirmedCount = dateFilteredRFQs.filter(r => r.status === 'CONFIRMED').length;
  const cancelledCount = dateFilteredRFQs.filter(r => r.status === 'CANCELLED').length;

  // Filter by Tab, Branch, and Search query
  const filteredRFQs = useMemo(() => {
    return dateFilteredRFQs.filter(rfq => {
      // Status filter
      if (activeTab === 'DRAFT' && rfq.status !== 'DRAFT') return false;
      if (activeTab === 'SENT' && rfq.status !== 'SENT') return false;
      if (activeTab === 'QUOTED' && rfq.status !== 'QUOTED') return false;
      if (activeTab === 'CONFIRMED' && rfq.status !== 'CONFIRMED') return false;
      if (activeTab === 'CANCELLED' && rfq.status !== 'CANCELLED') return false;

      // Branch filter
      if (selectedBranch !== 'ALL') {
        const bId = rfq.branchId?._id || rfq.branchId;
        if (bId !== selectedBranch) return false;
      }

      // Search query filter
      const q = (search || '').trim().toLowerCase();
      if (!q) return true;

      const rfqNo = (rfq.rfqNumber || '').toLowerCase();
      const supName = (rfq.supplierId?.name || '').toLowerCase();
      const supPhone = (rfq.supplierId?.phone || '').toLowerCase();
      const brName = (rfq.branchId?.name || '').toLowerCase();
      const notes = (rfq.notes || '').toLowerCase();

      return rfqNo.includes(q) || supName.includes(q) || supPhone.includes(q) || brName.includes(q) || notes.includes(q);
    });
  }, [dateFilteredRFQs, activeTab, selectedBranch, search]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'CONFIRMED': return '#10b981'; // emerald
      case 'SENT': return '#3b82f6';      // blue
      case 'QUOTED': return '#8b5cf6';    // purple
      case 'CANCELLED': return '#e11d48'; // rose
      case 'DRAFT':
      default: return '#f59e0b';          // amber
    }
  };

  return (
    <div className="space-y-4 pb-8 max-w-[1440px] mx-auto text-foreground">
      
      {/* ========================================================================= */}
      {/* 1. SLIM & COMPACT HERO HEADER (Exact PO & E-Commerce Order Processing Style) */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-4 sm:p-5 text-white shadow-md border border-blue-900/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          
          {/* Left: Branding & Subtitle */}
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase tracking-wider">
              <Sparkles size={11} className="text-blue-400" />
              JTS Procurement & Supply Chain
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
              Requests for Quotation
            </h1>
            <p className="text-xs text-blue-100/75 max-w-xl leading-snug">
              Manage vendor quotation requests, track competitive bidding, compare prices, and deploy purchase orders.
            </p>
          </div>

          {/* Right: Search Input + New RFQ Button + Refresh */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <div className="relative w-full sm:w-64 md:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search RFQ #, supplier, phone, SKU..."
                className="w-full h-9 pl-9 pr-8 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs font-medium text-white placeholder-slate-400 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400/50"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate('/purchases/rfqs/new')}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>New RFQ</span>
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
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
      {/* 2. SIX KPI METRIC CARDS (Exact Match to PO & Ecom Order Processing)        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        {[
          { id: 'ALL', label: 'Total RFQs', count: totalCount, sub: 'All inquiries', color: 'text-foreground', bg: 'bg-blue-600', icon: Layers },
          { id: 'DRAFT', label: 'Drafts', count: draftCount, sub: 'Pending review', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-600', icon: Clock },
          { id: 'SENT', label: 'Sent to Vendor', count: sentCount, sub: 'Awaiting quotation', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-600', icon: Send },
          { id: 'QUOTED', label: 'Quoted', count: quotedCount, sub: 'Bids received', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-600', icon: DollarSign },
          { id: 'CONFIRMED', label: 'Confirmed / PO', count: confirmedCount, sub: 'Converted to PO', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-600', icon: CheckCircle2 },
          { id: 'CANCELLED', label: 'Cancelled', count: cancelledCount, sub: 'Void / rejected', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-600', icon: RotateCcw }
        ].map(kpi => {
          const IconComp = kpi.icon;
          const isSelected = activeTab === kpi.id;
          return (
            <button
              key={kpi.id}
              type="button"
              onClick={() => setActiveTab(kpi.id)}
              className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer shadow-2xs ${
                isSelected
                  ? 'bg-card border-blue-500/70 ring-1 ring-blue-500/30'
                  : 'bg-card border-border/80 hover:border-border hover:bg-muted/30'
              }`}
            >
              <div className="space-y-0.5 truncate">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
                  {kpi.label}
                </span>
                <div className={`text-lg font-black leading-tight ${kpi.color}`}>
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
      {/* 3. SEGMENTED TABS & BRANCH SELECTOR (Exact Match to PO & Ecom)             */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-1.5 bg-muted/50 rounded-xl border border-border/60">
        
        {/* Status Pills */}
        <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
          {[
            { id: 'ALL', label: 'All Orders', count: totalCount, icon: Layers },
            { id: 'DRAFT', label: 'Draft', count: draftCount, icon: Clock },
            { id: 'SENT', label: 'Sent', count: sentCount, icon: Send },
            { id: 'QUOTED', label: 'Quoted', count: quotedCount, icon: DollarSign },
            { id: 'CONFIRMED', label: 'Confirmed', count: confirmedCount, icon: CheckCircle2 },
            { id: 'CANCELLED', label: 'Cancelled', count: cancelledCount, icon: XCircle }
          ].map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-card text-foreground shadow-xs font-black border border-border/80'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
                }`}
              >
                <TabIcon size={13} className={isActive ? 'text-blue-600 dark:text-blue-400' : ''} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-muted text-muted-foreground">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Branch Filter Dropdown */}
        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
          <MapPin size={13} className="text-muted-foreground" />
          <select
            value={selectedBranch}
            onChange={e => setSelectedBranch(e.target.value)}
            className="h-8 px-2.5 bg-card border border-border/80 rounded-lg text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Branches / Locations</option>
            {branches.map(b => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. DATE RANGE PRESETS BAR (Exact Match to PO & Ecom)                       */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3 py-2 bg-card rounded-xl border border-border/80 shadow-2xs text-xs">
        
        {/* Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1 mr-1">
            <Calendar size={12} className="text-blue-600 dark:text-blue-400" />
            Order Date:
          </span>
          {[
            { id: 'ALL', label: 'All Time' },
            { id: 'TODAY', label: 'Today' },
            { id: 'YESTERDAY', label: 'Yesterday' },
            { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
            { id: 'THIS_MONTH', label: 'This Month' }
          ].map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleDatePreset(p.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                datePreset === p.id
                  ? 'bg-blue-600 text-white shadow-2xs font-black'
                  : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date Pickers */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg border border-border/70">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">From</span>
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={e => {
                setDateFrom(e.target.value);
                setDatePreset(e.target.value || dateTo ? 'CUSTOM' : 'ALL');
              }}
              className="bg-transparent text-[11px] font-bold text-foreground focus:outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg border border-border/70">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">To</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={e => {
                setDateTo(e.target.value);
                setDatePreset(dateFrom || e.target.value ? 'CUSTOM' : 'ALL');
              }}
              className="bg-transparent text-[11px] font-bold text-foreground focus:outline-none cursor-pointer"
            />
          </div>

          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => handleDatePreset('ALL')}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Reset Date Filter"
            >
              <X size={12} /> Reset
            </button>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 5. CLEAN CARD LIST (Exact 1:1 Match to PurchaseOrders.jsx & Ecom)          */}
      {/* ========================================================================= */}
      {isLoading ? (
        <div className="p-12 text-center bg-card rounded-xl border border-border/80 text-xs text-muted-foreground font-bold animate-pulse">
          Loading requests for quotation...
        </div>
      ) : filteredRFQs.length === 0 ? (
        <div className="p-10 text-center bg-card rounded-xl border border-border/80 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
            <ShoppingBag size={20} />
          </div>
          <div className="text-sm font-bold text-foreground">No quotation requests found</div>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {search
              ? `No records match "${search}". Try searching by RFQ number, supplier, phone, or branch.`
              : 'No RFQs found under the selected status or date range.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredRFQs.map((rfq, idx) => {
            const isMenuOpen = openMenuId === rfq._id;
            const statusColor = getStatusColor(rfq.status);
            const supplierName = rfq.supplierId?.name || 'Walk-in Supplier';
            const supplierPhone = rfq.supplierId?.phone;
            const branchName = rfq.branchId?.name || 'Main Warehouse';
            const rfqNumber = rfq.rfqNumber || `RFQ-${rfq._id.slice(-6).toUpperCase()}`;
            const rfqCurrency = rfq.currency || currencySymbol || 'AED';

            return (
              <div
                key={rfq._id}
                className="p-3 sm:p-3.5 rounded-xl bg-card border border-border/80 hover:border-blue-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer"
                onClick={() => navigate(`/purchases/rfqs/${rfq._id}`)}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  
                  {/* LEFT COLUMN: Sequence Badge, RFQ Number, Status, Date, Supplier & Destination, Items */}
                  <div className="flex-1 space-y-1.5 min-w-0">
                    
                    {/* Top Row: Index Badge, RFQ Number, Status, Date */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-black shrink-0">
                        {idx + 1}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/purchases/rfqs/${rfq._id}`);
                        }}
                        className="text-xs sm:text-sm font-black text-foreground hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        {rfqNumber}
                      </button>

                      {/* Status Badge */}
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white shadow-2xs"
                        style={{ backgroundColor: statusColor }}
                      >
                        {rfq.status}
                      </span>

                      <span className="text-[10.5px] text-muted-foreground flex items-center gap-1 font-bold">
                        <Calendar size={11} className="text-muted-foreground/70" />
                        {format(new Date(rfq.createdAt), 'MMM d, yyyy · h:mm a')}
                      </span>
                    </div>

                    {/* 2-Column Grid: Supplier (Left) & Destination (Right) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-0.5">
                      <div className="flex items-center gap-2 text-muted-foreground truncate">
                        <Building2 size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="font-bold text-foreground truncate">{supplierName}</span>
                        {supplierPhone && (
                          <span className="text-[11px] font-bold text-muted-foreground shrink-0">· {supplierPhone}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                        <MapPin size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-[11px] truncate">{branchName}</span>
                      </div>
                    </div>

                    {/* Sourcing Specification / Notes Strip */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground mr-1">
                        INQUIRY SPEC:
                      </span>
                      <span className="text-[10.5px] font-medium text-muted-foreground italic truncate max-w-xl">
                        {rfq.notes ? `"${rfq.notes}"` : 'Standard Vendor Quotation Requisition'}
                      </span>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Order Value + Three-Dot (⋮) Action Menu */}
                  <div 
                    className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/50"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="text-left lg:text-right space-y-0.5">
                      <div className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground">
                        ORDER VALUE
                      </div>
                      <div className="text-sm sm:text-base font-black text-foreground">
                        {rfqCurrency} {Number(rfq.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="flex items-center lg:justify-end gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-muted-foreground">
                          RFQ Sourcing · {rfq.status}
                        </span>
                      </div>
                    </div>

                    {/* THREE-DOT (⋮) ACTION MENU BUTTON & ANIMATED POPOVER (Exact PO & Ecom Style) */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setOpenMenuId(isMenuOpen ? null : rfq._id);
                        }}
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                          isMenuOpen
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-95'
                            : 'bg-muted/40 hover:bg-muted text-foreground border-border/80 hover:border-blue-500/40'
                        }`}
                        title="RFQ Actions"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {/* Animated Three-Dot Action Menu Popover (Exact Match to PurchaseOrders.jsx) */}
                      {isMenuOpen && (
                        <FloatingMenu width={256} onClose={() => setOpenMenuId(null)} className="rounded-2xl bg-card border border-border shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                          <div className="px-2.5 py-1 border-b border-border/60 flex items-center justify-between">
                            <span className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground">
                              Actions · {rfqNumber}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                              {rfq.status}
                            </span>
                          </div>

                          {/* 1. View Full Details */}
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              navigate(`/purchases/rfqs/${rfq._id}`);
                            }}
                            className="w-full text-left p-2 rounded-xl hover:bg-blue-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                              <Eye size={14} />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-bold text-foreground group-hover:text-blue-600">
                                View RFQ Details
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                Full breakdown & specifications
                              </div>
                            </div>
                          </button>

                          {/* 2. Dispatch via Email */}
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              setEmailModal({ isOpen: true, rfq });
                            }}
                            className="w-full text-left p-2 rounded-xl hover:bg-emerald-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                              <Mail size={14} />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-bold text-foreground group-hover:text-emerald-600">
                                Dispatch RFQ via Email
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                Send PDF inquiry directly to supplier
                              </div>
                            </div>
                          </button>

                          {/* 3. Edit Draft */}
                          {rfq.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                navigate(`/purchases/rfqs/edit/${rfq._id}`);
                              }}
                              className="w-full text-left p-2 rounded-xl hover:bg-amber-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                                <Edit3 size={14} />
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-bold text-foreground group-hover:text-amber-600">
                                  Edit RFQ Matrix
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  Modify parameters or quantities
                                </div>
                              </div>
                            </button>
                          )}

                          {/* 4. Delete */}
                          {(rfq.status === 'DRAFT' || rfq.status === 'CANCELLED') && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                handleDelete(rfq._id);
                              }}
                              className="w-full text-left p-2 rounded-xl hover:bg-rose-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 group-hover:bg-rose-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                                <Trash2 size={14} />
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-bold text-rose-600">
                                  Delete RFQ
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  Permanently remove inquiry
                                </div>
                              </div>
                            </button>
                          )}
                        </FloatingMenu>
                      )}
                    </div>

                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Email Modal */}
      {emailModal.isOpen && emailModal.rfq && (
        <EmailSendModal
          isOpen={emailModal.isOpen}
          onClose={() => setEmailModal({ isOpen: false, rfq: null })}
          documentType="Request for Quotation"
          documentNumber={emailModal.rfq.rfqNumber || `RFQ-${emailModal.rfq._id.slice(-6).toUpperCase()}`}
          recipientName={emailModal.rfq.supplierId?.name}
          defaultEmail={emailModal.rfq.supplierId?.email}
          sendEndpoint={`/api/v1/email/rfq/${emailModal.rfq._id}`}
        />
      )}

    </div>
  );
}

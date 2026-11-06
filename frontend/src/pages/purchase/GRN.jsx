import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Globe, Package, MapPin, Truck, ChevronRight, CheckCircle2,
  Clock, AlertTriangle, XCircle, RotateCcw, Search,
  ExternalLink, Mail, ShieldAlert, ShieldCheck, Building2, Eye,
  Printer, FileText, Camera, CreditCard, MoreVertical, Sparkles,
  RefreshCw, Layers, Sliders, X, User, Phone, Calendar, Hash, Check,
  DollarSign, Plus, Edit3, ArrowUpRight, Scale
} from 'lucide-react';
import { format } from 'date-fns';
import { FloatingMenu } from '../../components/common/FloatingMenu';
import { useCurrency } from '../../contexts/CurrencyContext';

const GRN = () => {
  const [grns, setGrns] = useState([]);
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [datePreset, setDatePreset] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Three-dot action dropdown state
  const [openMenuId, setOpenMenuId] = useState(null);

  const navigate = useNavigate();
  const { formatCurrency, currencySymbol } = useCurrency();

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [grnRes, branchRes] = await Promise.all([
        axios.get('/api/v1/grn', { headers }),
        axios.get('/api/v1/branches', { headers })
      ]);
      setGrns(grnRes.data || []);
      setBranches(branchRes.data || []);
    } catch (error) {
      console.error('Error fetching GRNs:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleDatePreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const toYMD = (d) => format(d, 'yyyy-MM-dd');

    if (preset === 'ALL') {
      setDateFrom('');
      setDateTo('');
    } else if (preset === 'TODAY') {
      const today = toYMD(now);
      setDateFrom(today);
      setDateTo(today);
    } else if (preset === 'YESTERDAY') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const str = toYMD(yest);
      setDateFrom(str);
      setDateTo(str);
    } else if (preset === 'LAST_7_DAYS') {
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      setDateFrom(toYMD(past));
      setDateTo(toYMD(now));
    } else if (preset === 'THIS_MONTH') {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(toYMD(firstOfMonth));
      setDateTo(toYMD(now));
    }
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = grns.length;
    const validated = grns.filter(g => g.status === 'VALIDATED').length;
    const draft = grns.filter(g => g.status === 'DRAFT').length;
    const confirmed = grns.filter(g => g.status === 'CONFIRMED').length;
    const pendingQc = grns.filter(g => g.status === 'DRAFT' || g.status === 'CONFIRMED').length;
    const cancelled = grns.filter(g => g.status === 'CANCELLED').length;
    const totalValue = grns.reduce((acc, g) => acc + (Number(g.totalLandedCost || g.totalPurchaseCost || 0)), 0);

    return { total, validated, draft, confirmed, pendingQc, cancelled, totalValue };
  }, [grns]);

  // Filtering
  const filteredGRNs = useMemo(() => {
    return grns.filter(grn => {
      // Tab filter
      if (activeTab === 'VALIDATED' && grn.status !== 'VALIDATED') return false;
      if (activeTab === 'DRAFT' && grn.status !== 'DRAFT') return false;
      if (activeTab === 'CONFIRMED' && grn.status !== 'CONFIRMED') return false;
      if (activeTab === 'PENDING' && grn.status !== 'DRAFT' && grn.status !== 'CONFIRMED') return false;
      if (activeTab === 'CANCELLED' && grn.status !== 'CANCELLED') return false;

      // Branch filter
      if (selectedBranch && grn.branchId?._id !== selectedBranch && grn.branchId !== selectedBranch) return false;

      // Date Range Filter
      if (dateFrom || dateTo) {
        const itemDateStr = format(new Date(grn.receiptDate || grn.createdAt), 'yyyy-MM-dd');
        if (dateFrom && itemDateStr < dateFrom) return false;
        if (dateTo && itemDateStr > dateTo) return false;
      }

      // Keyword Search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const grnNum = (grn.grnNumber || '').toLowerCase();
        const supplierName = (grn.supplierId?.name || grn.supplierSnapshot?.name || '').toLowerCase();
        const phone = (grn.supplierId?.phone || grn.supplierSnapshot?.phone || '').toLowerCase();
        const poRef = (grn.purchaseOrderId?.purchaseOrderNumber || '').toLowerCase();
        const challan = (grn.deliveryChallanNumber || '').toLowerCase();
        const vehicle = (grn.vehicleNumber || '').toLowerCase();
        const hasItem = (grn.items || []).some(it => 
          (it.itemName || '').toLowerCase().includes(q) ||
          (it.sku || '').toLowerCase().includes(q)
        );

        return grnNum.includes(q) || supplierName.includes(q) || phone.includes(q) || poRef.includes(q) || challan.includes(q) || vehicle.includes(q) || hasItem;
      }

      return true;
    });
  }, [grns, activeTab, selectedBranch, dateFrom, dateTo, search]);

  const handleQuickValidate = async (grnId) => {
    if (!window.confirm('Validate and post stock movements for this GRN?')) return;
    try {
      await axios.put(`/api/v1/grn/${grnId}/validate`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to validate GRN');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'VALIDATED': return '#10b981'; // emerald
      case 'CONFIRMED': return '#2563eb'; // blue
      case 'CANCELLED': return '#e11d48'; // rose
      case 'DRAFT':
      default: return '#f59e0b'; // amber
    }
  };

  return (
    <div className="space-y-4 pb-8 max-w-[1440px] mx-auto text-foreground">
      
      {/* ========================================================================= */}
      {/* 1. SLIM & COMPACT HERO HEADER (Exact Order Processing Style)              */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-4 sm:p-5 text-white shadow-md border border-blue-900/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          {/* Left: Badge, Title & Subtitle */}
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase tracking-wider">
              <Sparkles size={11} className="text-blue-400" />
              JTS Procurement & Receiving Hub
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
              Goods Receipt Notes
            </h1>
            <p className="text-xs text-blue-100/75 max-w-xl leading-snug">
              Fulfill incoming stock orders, update receipt statuses, allocate landed freight, and validate warehouse receiving.
            </p>
          </div>

          {/* Right: Compact Search Bar & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <div className="relative w-full sm:w-64 md:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search GRN #, supplier, phone, SKU..."
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
              onClick={() => navigate('/purchases/grn/new')}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>New Receipt</span>
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
      </div>

      {/* ========================================================================= */}
      {/* 2. 6 SUMMARY METRIC CARDS (Exact Match to Screenshot 2)                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        {[
          { id: 'ALL', label: 'Total Receipts', count: metrics.total, sub: 'All consignments', color: 'text-foreground', bg: 'bg-blue-600', icon: Layers },
          { id: 'VALIDATED', label: 'Validated', count: metrics.validated, sub: 'Stock added', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-600', icon: CheckCircle2 },
          { id: 'CONFIRMED', label: 'Confirmed', count: metrics.confirmed, sub: 'Ready to post', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-600', icon: Truck },
          { id: 'PENDING', label: 'Pending QC', count: metrics.pendingQc, sub: 'Needs verification', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-600', icon: Clock },
          { id: 'DRAFT', label: 'Drafts', count: metrics.draft, sub: 'Receiving stage', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-600', icon: Package },
          { id: 'CANCELLED', label: 'Cancelled', count: metrics.cancelled, sub: 'Rejected receipts', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-600', icon: RotateCcw }
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
      {/* 3. SLEEK SEGMENTED NAVIGATION TABS & WAREHOUSE FILTER                     */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 p-1.5 bg-muted/50 rounded-xl border border-border/60">
        <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
          {[
            { id: 'ALL', label: 'All Receipts', count: metrics.total, icon: Layers },
            { id: 'VALIDATED', label: 'Validated', count: metrics.validated, icon: CheckCircle2 },
            { id: 'CONFIRMED', label: 'Confirmed', count: metrics.confirmed, icon: Truck },
            { id: 'PENDING', label: 'Pending QC', count: metrics.pendingQc, icon: Clock },
            { id: 'DRAFT', label: 'Draft', count: metrics.draft, icon: Package },
            { id: 'CANCELLED', label: 'Cancelled', count: metrics.cancelled, icon: XCircle }
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

        {/* Right: Branch / Warehouse Dropdown */}
        <div className="flex items-center gap-2 px-2 py-1 lg:py-0 border-t lg:border-t-0 border-border/50 text-xs shrink-0">
          <div className="flex items-center gap-1.5 bg-card px-2.5 py-1 rounded-lg border border-border/70 text-xs">
            <Building2 size={13} className="text-muted-foreground" />
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-foreground focus:outline-none cursor-pointer"
            >
              <option value="">All Branches / Warehouses</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. DATE RANGE SELECTOR & TIME PRESETS                                     */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2 bg-card rounded-xl border border-border/80 shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1 mr-1.5 shrink-0">
            <Calendar size={12} /> RECEIPT DATE:
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

        {/* Right: Custom From & To Date Inputs */}
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
      {/* 5. CLEAN RECEIPT CARDS LIST (Exact Match to Screenshot 2)                 */}
      {/* ========================================================================= */}
      {isLoading ? (
        <div className="p-12 text-center bg-card rounded-xl border border-border/80 text-xs text-muted-foreground font-bold animate-pulse">
          Loading goods receipt notes...
        </div>
      ) : filteredGRNs.length === 0 ? (
        <div className="p-10 text-center bg-card rounded-xl border border-border/80 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
            <Package size={20} />
          </div>
          <div className="text-sm font-bold text-foreground">No receipts found</div>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {search
              ? `No receipts match "${search}". Try searching by GRN number, supplier name, phone, PO reference, or product SKU.`
              : 'No receipt records found under the selected status or date range.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredGRNs.map((grn, idx) => {
            const isMenuOpen = openMenuId === grn._id;
            const statusColor = getStatusColor(grn.status);
            const totalQty = (grn.items || []).reduce((acc, it) => acc + (Number(it.receivedQuantity || 0)), 0);
            const acceptedQty = (grn.items || []).reduce((acc, it) => acc + (Number(it.acceptedQuantity || 0)), 0);
            const supplierName = grn.supplierId?.name || grn.supplierSnapshot?.name || 'N/A';
            const supplierPhone = grn.supplierId?.phone || grn.supplierSnapshot?.phone;
            const branchName = grn.branchId?.name || 'Main Warehouse';
            const poNumber = grn.purchaseOrderId?.purchaseOrderNumber || (grn.purchaseOrderId?._id ? `PO-${grn.purchaseOrderId._id.slice(-6).toUpperCase()}` : null);

            return (
              <div
                key={grn._id}
                className="p-3 sm:p-3.5 rounded-xl bg-card border border-border/80 hover:border-blue-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer"
                onClick={() => navigate(`/purchases/grn/${grn._id}`)}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  
                  {/* LEFT COLUMN: Sequence Badge, GRN Number, Status, Date, Supplier & Destination, Items */}
                  <div className="flex-1 space-y-1.5 min-w-0">
                    
                    {/* Top Row: Index Badge, GRN Number, Status, Date */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-black shrink-0">
                        {idx + 1}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/purchases/grn/${grn._id}`);
                        }}
                        className="text-xs sm:text-sm font-black text-foreground hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        {grn.grnNumber}
                      </button>

                      {/* Status Badge */}
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white shadow-2xs"
                        style={{ backgroundColor: statusColor }}
                      >
                        {grn.status}
                      </span>

                      <span className="text-[10.5px] text-muted-foreground flex items-center gap-1">
                        <Calendar size={11} className="text-muted-foreground/70" />
                        {format(new Date(grn.receiptDate || grn.createdAt), 'MMM d, yyyy · h:mm a')}
                      </span>
                    </div>

                    {/* 2-Column Grid: Supplier (Left) & Destination / PO (Right) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-0.5">
                      <div className="flex items-center gap-2 text-muted-foreground truncate">
                        <User size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="font-bold text-foreground truncate">{supplierName}</span>
                        {supplierPhone && (
                          <span className="text-[11px] font-mono text-muted-foreground shrink-0">· {supplierPhone}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                        <MapPin size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-[11px] truncate">{branchName}</span>
                        {poNumber && (
                          <span className="ml-1 text-[10px] font-bold text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                            {poNumber}
                          </span>
                        )}
                        {grn.deliveryChallanNumber && (
                          <span className="ml-1 text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                            DC: {grn.deliveryChallanNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ordered Items Compact Capabilities Strip */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground mr-1">
                        ITEMS ({(grn.items || []).length}):
                      </span>
                      {(grn.items || []).slice(0, 3).map((item, iIdx) => (
                        <span
                          key={iIdx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/40 border border-border/60 text-[10.5px] font-bold text-foreground"
                        >
                          <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
                          {item.acceptedQuantity || item.receivedQuantity || 1}x {item.itemName || item.productId?.name || 'Product'}
                        </span>
                      ))}
                      {(grn.items || []).length > 3 && (
                        <span className="text-[10px] text-muted-foreground font-bold">
                          +{(grn.items || []).length - 3} more
                        </span>
                      )}
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
                        {formatCurrency(grn.totalLandedCost || grn.totalPurchaseCost || 0)}
                      </div>
                      <div className="flex items-center lg:justify-end gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {acceptedQty}/{totalQty} Rec · {grn.status}
                        </span>
                        {grn.totalAdditionalCost > 0 && (
                          <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            +{formatCurrency(grn.totalAdditionalCost)} Landed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* THREE-DOT (⋮) ACTION MENU BUTTON & ANIMATED POPOVER */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setOpenMenuId(isMenuOpen ? null : grn._id);
                        }}
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                          isMenuOpen
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-95'
                            : 'bg-muted/40 hover:bg-muted text-foreground border-border/80 hover:border-blue-500/40'
                        }`}
                        title="Receipt Actions"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {/* Animated Three-Dot Action Menu Popover (Exact Order Processing Style) */}
                      {isMenuOpen && (
                        <FloatingMenu width={256} onClose={() => setOpenMenuId(null)} className="rounded-2xl bg-card border border-border shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                          <div className="px-2.5 py-1 border-b border-border/60 flex items-center justify-between">
                            <span className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground">
                              Actions · {grn.grnNumber}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                              {grn.status}
                            </span>
                          </div>

                          {/* 1. View Full Page */}
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              navigate(`/purchases/grn/${grn._id}`);
                            }}
                            className="w-full text-left p-2 rounded-xl hover:bg-blue-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                              <Eye size={14} />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-bold text-foreground group-hover:text-blue-600">
                                View Receipt Details
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                Full dossier, items & landed cost
                              </div>
                            </div>
                          </button>

                          {/* 2. Direct Print Receipt (A4) */}
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              window.open(`/purchases/grn/${grn._id}/print`, '_blank');
                            }}
                            className="w-full text-left p-2 rounded-xl hover:bg-blue-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                              <FileText size={14} />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-bold text-foreground group-hover:text-blue-600">
                                Print Tax Invoice (A4)
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                Official warehouse receipt invoice
                              </div>
                            </div>
                          </button>

                          {/* 3. Edit Draft */}
                          {grn.status === 'DRAFT' && hasPermission('EDIT_PURCHASES') && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                navigate(`/purchases/grn/edit/${grn._id}`);
                              }}
                              className="w-full text-left p-2 rounded-xl hover:bg-amber-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                                <Edit3 size={14} />
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-bold text-foreground group-hover:text-amber-600">
                                  Edit Draft Receipt
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  Update quantities & charges
                                </div>
                              </div>
                            </button>
                          )}

                          {/* 4. Validate & Update Stock */}
                          {grn.status === 'CONFIRMED' && hasPermission('EDIT_PURCHASES') && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                handleQuickValidate(grn._id);
                              }}
                              className="w-full text-left p-2 rounded-xl hover:bg-emerald-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                                <CheckCircle2 size={14} />
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-bold text-foreground group-hover:text-emerald-600">
                                  Validate & Update Stock
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  Post stock movements
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

    </div>
  );
};

export default GRN;

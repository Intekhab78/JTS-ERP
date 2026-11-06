import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import {
  Server, Package, Box, Building2, Search, RefreshCw, CheckCircle2,
  AlertTriangle, TrendingDown, Layers, ArrowUpRight, Eye, Copy, Check,
  X, ExternalLink, FileText, BarChart3, SlidersHorizontal, Sparkles,
  MapPin, ShieldCheck, DollarSign, History, ArrowDownRight, LayoutGrid,
  ListFilter, Table as TableIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { useCurrency } from '../../contexts/CurrencyContext';

/* ─── Keyframe Animations & Hover Effects (E-Commerce Order Processing Style) ─── */
const ANIMATION_STYLES = `
  @keyframes ecomFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ecomSlideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  @keyframes ecomModalBackdrop { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ecomModalPop {
    0% { opacity: 0; transform: scale(0.94) translateY(14px); }
    70% { opacity: 1; transform: scale(1.005) translateY(-2px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes ecomFloatIcon { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-3px); } }

  .ecom-fade-in { animation: ecomFadeIn 0.3s ease-out; }
  .ecom-slide-up { animation: ecomSlideUp 0.26s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
  .ecom-modal-backdrop { animation: ecomModalBackdrop 0.22s ease-out forwards; }
  .ecom-modal-pop { animation: ecomModalPop 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .ecom-float-icon { animation: ecomFloatIcon 2.4s ease-in-out infinite; }

  /* ─── Smooth Rotating Round Close Button Animation ─── */
  .btn-close-round {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 9999px !important;
    position: relative !important;
    cursor: pointer !important;
    transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), 
                background-color 0.22s ease, 
                border-color 0.22s ease, 
                box-shadow 0.22s ease, 
                color 0.2s ease !important;
  }
  .btn-close-round:hover {
    transform: rotate(180deg) scale(1.15) !important;
    background-color: rgba(239, 68, 68, 0.22) !important;
    color: #ef4444 !important;
    border-color: rgba(239, 68, 68, 0.5) !important;
    box-shadow: 0 0 16px rgba(239, 68, 68, 0.4) !important;
  }
  .btn-close-round:active {
    transform: rotate(270deg) scale(0.9) !important;
  }
  .btn-close-round-white:hover {
    transform: rotate(180deg) scale(1.15) !important;
    background-color: rgba(255, 255, 255, 0.25) !important;
    color: #ffffff !important;
    border-color: rgba(255, 255, 255, 0.6) !important;
    box-shadow: 0 0 18px rgba(255, 255, 255, 0.45) !important;
  }

  /* ─── Interactive KPI Card Hover Elevation & Icon Shift ─── */
  .kpi-card {
    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), 
                box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1), 
                border-color 0.2s ease !important;
  }
  .kpi-card:hover {
    transform: translateY(-3px) !important;
    box-shadow: 0 12px 24px -6px rgba(0, 0, 0, 0.1), 0 4px 8px -2px rgba(0, 0, 0, 0.05) !important;
    border-color: rgba(59, 130, 246, 0.5) !important;
  }
  .kpi-card:hover .kpi-icon-pill {
    transform: scale(1.18) rotate(6deg) !important;
  }

  /* ─── Table Row Hover Elevation & Transitions ─── */
  .inventory-row {
    transition: background-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease !important;
  }
  .inventory-row:hover {
    background-color: rgba(59, 130, 246, 0.045) !important;
    box-shadow: inset 3px 0 0 #2563eb !important;
  }
  .inventory-row:hover .row-name {
    color: #2563eb !important;
    transform: translateX(2px);
  }
  .inventory-row:hover .row-action-btn {
    transform: scale(1.16) !important;
    background-color: #2563eb !important;
    color: #ffffff !important;
    box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3) !important;
  }
  .inventory-row:hover .row-box-badge {
    transform: scale(1.05) translateY(-1px) !important;
    border-color: #60a5fa !important;
    box-shadow: 0 4px 8px rgba(37, 99, 235, 0.15) !important;
  }

  /* ─── Order Processing Style Inventory Card Hover ─── */
  .order-style-card {
    transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
  }
  .order-style-card:hover {
    transform: translateY(-3px) !important;
    box-shadow: 0 12px 28px -6px rgba(0, 0, 0, 0.09), 0 6px 12px -3px rgba(0, 0, 0, 0.04) !important;
    border-color: rgba(59, 130, 246, 0.55) !important;
  }
  .order-style-card:hover .card-product-name {
    color: #2563eb !important;
  }
  .order-style-card:hover .card-action-btn {
    transform: scale(1.08) !important;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25) !important;
  }
`;

/* ─── HelpStyleModal for Item Ledger / Movement History ─── */
const LedgerModal = ({ isOpen, onClose, item, branchName, movements, loadingMovements, formatCurrency }) => {
  if (!isOpen || !item) return null;

  const product = item.productId || {};
  const variant = item.variantId;
  const factor = Number(product.uomDetails?.purchaseConversionFactor) || 1;
  const purchaseUnit = product.uomDetails?.purchaseUnit || 'BOX';
  const baseUnit = product.uomDetails?.baseUnit || product.uom || 'Piece';
  const hasDualUom = factor > 1 && purchaseUnit !== baseUnit;

  const itemMovements = movements.filter(m => {
    const mProdId = m.productId?._id || m.productId;
    return mProdId?.toString() === product._id?.toString();
  });

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md z-[9999]"
      onClick={onClose}
    >
      <style>{ANIMATION_STYLES}</style>
      <div
        className="bg-slate-950 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-[0_25px_70px_-15px_rgba(0,0,0,0.65)] ecom-modal-pop border border-blue-900/40"
        onClick={e => e.stopPropagation()}
      >
        {/* MODAL HERO HEADER */}
        <div className="relative p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shrink-0">
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase tracking-wider">
                <Sparkles size={10} className="text-blue-400" />
                Physical Stock Dossier & Audit Ledger
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>{product.name || 'Stock Item'}</span>
              </h2>
              <p className="text-xs text-blue-100/75 leading-snug">
                SKU: <strong className="text-white font-bold">{variant?.sku || product.sku || 'N/A'}</strong> · Depot: <strong className="text-white">{branchName}</strong>
              </p>
            </div>

            {/* Circular Rotating Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 btn-close-round btn-close-round-white bg-white/10 border border-white/20 text-white/90 hover:text-white cursor-pointer shadow-xs shrink-0"
              title="Close modal"
            >
              <X size={16} />
            </button>
          </div>
          <div className="absolute right-0 top-0 w-64 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-5 bg-card text-foreground overflow-y-auto [scrollbar-width:thin] space-y-4 text-xs">
          {/* Top Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-muted/40 border border-border/70 space-y-0.5 hover:border-blue-400/50 transition-colors">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Physical Count</span>
              <span className="text-lg font-black text-foreground">{item.quantity} {baseUnit}</span>
            </div>

            {hasDualUom && (
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-0.5 hover:border-blue-400 transition-colors">
                <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block">Box Equivalency</span>
                <span className="text-sm font-black text-blue-700 dark:text-blue-300">
                  {item.quantity % factor === 0
                    ? `${item.quantity / factor} ${purchaseUnit}`
                    : `${Math.floor(item.quantity / factor)} ${purchaseUnit} + ${item.quantity % factor} pcs`
                  }
                </span>
                <span className="text-[9.5px] text-blue-500 block font-medium">1 {purchaseUnit} = {factor} {baseUnit}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-muted/40 border border-border/70 space-y-0.5 hover:border-blue-400/50 transition-colors">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Unit Cost</span>
              <span className="text-sm font-bold text-foreground">
                {formatCurrency(product.purchasePrice ?? product.costPrice ?? product.price ?? 0)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border/70 space-y-0.5 hover:border-emerald-400/50 transition-colors">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Valuation</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency((item.quantity || 0) * (product.purchasePrice ?? product.costPrice ?? product.price ?? 0))}
              </span>
            </div>
          </div>

          {/* Movement Ledger */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <History size={13} className="text-blue-500" /> Recent Inward & Outward Movements
              </h3>
              <span className="text-[10px] text-muted-foreground font-bold">Records: {itemMovements.length}</span>
            </div>

            {loadingMovements ? (
              <div className="py-8 text-center text-muted-foreground space-y-2">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-[11px] font-bold">Loading movement history...</p>
              </div>
            ) : itemMovements.length === 0 ? (
              <div className="py-8 text-center bg-muted/20 rounded-xl border border-border/60 space-y-1">
                <Package size={28} className="text-muted-foreground/40 mx-auto" />
                <p className="text-xs font-bold text-foreground">No recent transaction logs</p>
                <p className="text-[10px] text-muted-foreground">No stock ledger entries recorded for this branch yet.</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto [scrollbar-width:thin]">
                {itemMovements.map((mov, i) => {
                  const isPositive = mov.quantity > 0;
                  return (
                    <div
                      key={mov._id || i}
                      className="p-2.5 rounded-xl bg-background border border-border/70 flex items-center justify-between text-xs hover:border-blue-400/60 hover:shadow-2xs transition-all"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase tracking-wider ${
                            mov.type === 'GRN' 
                              ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30' 
                              : mov.type === 'DELIVERY'
                              ? 'bg-blue-500/15 text-blue-600 border border-blue-500/30'
                              : 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                          }`}>
                            {mov.type}
                          </span>
                          <span className="font-bold text-foreground text-[11px]">{mov.referenceId || 'N/A'}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground block">
                          {format(new Date(mov.createdAt), 'MMM d, yyyy · h:mm a')}
                        </span>
                      </div>

                      <div className="text-right">
                        <div className={`font-black text-sm ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {isPositive ? `+${mov.quantity}` : mov.quantity} {mov.baseUom || baseUnit}
                        </div>
                        {mov.documentQuantity && mov.documentUom && mov.documentUom !== mov.baseUom && (
                          <span className="text-[9.5px] font-bold text-muted-foreground block">
                            Doc: {mov.documentQuantity} {mov.documentUom}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ─── Main StockOverview Component ─── */
const StockOverview = () => {
  const { formatCurrency } = useCurrency();
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [stock, setStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'OPTIMAL' | 'WARNING' | 'DEFICIT' | 'MULTI_UOM'
  const [copiedSku, setCopiedSku] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  // Modal State
  const [selectedLedgerItem, setSelectedLedgerItem] = useState(null);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      fetchStock();
      fetchMovements();
    } else {
      setStock([]);
      setMovements([]);
    }
  }, [selectedBranch]);

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/branches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranches(res.data);
      if (res.data.length > 0) {
        setSelectedBranch(res.data[0]._id);
      }
    } catch (error) {
      console.error('Failed to load branches:', error);
    }
  };

  const fetchStock = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/v1/stock/${selectedBranch}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStock(res.data || []);
    } catch (error) {
      console.error('Failed to load stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    setLoadingMovements(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/v1/stock/movements/${selectedBranch}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMovements(res.data || []);
    } catch (error) {
      console.error('Failed to load movements:', error);
    } finally {
      setLoadingMovements(false);
    }
  };

  const handleCopySku = (sku) => {
    if (!sku) return;
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  // Filter stock based on search and tab
  const filteredStock = useMemo(() => {
    return stock.filter(s => {
      const p = s.productId || {};
      const v = s.variantId || {};
      const searchStr = searchQuery.toLowerCase().trim();

      const matchesSearch = !searchStr ||
        (p.name || '').toLowerCase().includes(searchStr) || 
        (p.sku || '').toLowerCase().includes(searchStr) ||
        (p.department || '').toLowerCase().includes(searchStr) ||
        (v.sku || '').toLowerCase().includes(searchStr) ||
        (v.title || '').toLowerCase().includes(searchStr);

      if (!matchesSearch) return false;

      const isDeficit = s.quantity <= 0;
      const minLevel = Number(p.minStockLevel) || 10;
      const isLow = s.quantity > 0 && s.quantity <= minLevel;
      const isOptimal = s.quantity > minLevel;
      const hasMultiUom = Number(p.uomDetails?.purchaseConversionFactor) > 1 && 
        p.uomDetails?.purchaseUnit !== (p.uomDetails?.baseUnit || p.uom);

      if (activeTab === 'OPTIMAL') return isOptimal;
      if (activeTab === 'WARNING') return isLow;
      if (activeTab === 'DEFICIT') return isDeficit;
      if (activeTab === 'MULTI_UOM') return hasMultiUom;

      return true;
    });
  }, [stock, searchQuery, activeTab]);

  // Derived metrics for summary cards
  const totalItems = stock.length;
  const lowStockItems = stock.filter(s => {
    const minLevel = Number(s.productId?.minStockLevel) || 10;
    return s.quantity > 0 && s.quantity <= minLevel;
  }).length;
  const outOfStockItems = stock.filter(s => s.quantity <= 0).length;
  const optimalItems = stock.filter(s => {
    const minLevel = Number(s.productId?.minStockLevel) || 10;
    return s.quantity > minLevel;
  }).length;
  const multiUomItems = stock.filter(s => {
    const p = s.productId || {};
    return Number(p.uomDetails?.purchaseConversionFactor) > 1 && 
      p.uomDetails?.purchaseUnit !== (p.uomDetails?.baseUnit || p.uom);
  }).length;

  const totalPhysicalUnits = stock.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
  const totalValuation = stock.reduce((sum, s) => {
    const p = s.productId || {};
    const price = Number(p.purchasePrice ?? p.costPrice ?? p.price ?? 0);
    return sum + (s.quantity * price);
  }, 0);

  const selectedBranchName = branches.find(b => b._id === selectedBranch)?.name || 'Branch Warehouse';

  return (
    <div className="space-y-4 pb-12 max-w-[1440px] mx-auto text-foreground ecom-fade-in">
      <style>{ANIMATION_STYLES}</style>

      {/* ========================================================================= */}
      {/* 1. SLIM & COMPACT HERO HEADER (E-Commerce Order Processing Style)          */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-4 sm:p-5 text-white shadow-md border border-blue-900/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          {/* Left: Badge, Title & Subtitle */}
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase tracking-wider">
              <Sparkles size={11} className="text-blue-400" />
              JTS Inventory & Warehouse Hub
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Live Inventory Command</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-2xs">
                ONLINE
              </span>
            </h1>
            <p className="text-xs text-blue-100/75 max-w-xl leading-snug">
              Physical inventory balances, dual-UOM box/piece conversions, min-stock alerts, and warehouse valuation in real time.
            </p>
          </div>

          {/* Right: Search Bar & Quick Action Refresh Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <div className="relative w-full sm:w-64 md:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search product, SKU, classification..."
                className="w-full pl-8 pr-8 py-2 rounded-xl bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/20 text-white placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 focus:scale-[1.01] backdrop-blur-md transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 btn-close-round text-slate-300 hover:text-white cursor-pointer"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => { fetchStock(); fetchMovements(); }}
              disabled={loading}
              className="group px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
              title="Refresh Inventory"
            >
              <RefreshCw size={13} className={`${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500 ease-out'}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Ambient subtle light */}
        <div className="absolute right-0 top-0 w-80 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ========================================================================= */}
      {/* 2. COMPACT KPI METRIC CARDS (Interactive Filter Cards With Hover Effects) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {[
          { id: 'ALL', label: 'Total SKUs', count: totalItems, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-600', icon: Layers, sub: `${totalPhysicalUnits} Total Units` },
          { id: 'OPTIMAL', label: 'Optimal Stock', count: optimalItems, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-600', icon: CheckCircle2, sub: 'Healthy levels' },
          { id: 'WARNING', label: 'Low Stock (Warning)', count: lowStockItems, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500', icon: TrendingDown, sub: 'Reorder needed' },
          { id: 'DEFICIT', label: 'Critical Deficit', count: outOfStockItems, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-600', icon: AlertTriangle, sub: 'Zero balance' },
          { id: 'MULTI_UOM', label: 'Dual-UOM Items', count: multiUomItems, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-600', icon: Box, sub: 'Box/Piece protocols' }
        ].map(kpi => {
          const IconComp = kpi.icon;
          const isSelected = activeTab === kpi.id;
          return (
            <button
              key={kpi.id}
              type="button"
              onClick={() => setActiveTab(kpi.id)}
              className={`ecom-slide-up text-left p-3 rounded-xl cursor-pointer flex items-center justify-between border kpi-card group ${
                isSelected
                  ? 'bg-card border-blue-500/70 shadow-sm ring-1 ring-blue-500/30'
                  : 'bg-card/80 hover:bg-card border-border/70 hover:border-blue-400/50'
              }`}
            >
              <div className="space-y-0.5 truncate">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
                  {kpi.label}
                </span>
                <div className={`text-lg font-black leading-tight ${kpi.color}`}>
                  {kpi.count}
                </div>
                <span className="text-[9.5px] text-muted-foreground block truncate font-medium">
                  {kpi.sub}
                </span>
              </div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 kpi-icon-pill transition-all duration-300 ${
                isSelected ? `${kpi.bg} text-white shadow-2xs scale-105` : 'bg-muted text-muted-foreground group-hover:bg-blue-500/10 group-hover:text-blue-600'
              }`}>
                <IconComp size={15} />
              </div>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 3. SLEEK SEGMENTED NAVIGATION TABS & BRANCH SELECTOR TOOLBAR              */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 p-1.5 bg-muted/50 rounded-xl border border-border/60">
        {/* Segmented Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {[
            { id: 'ALL', label: 'All SKUs', count: totalItems, icon: Layers },
            { id: 'OPTIMAL', label: 'Optimal', count: optimalItems, icon: CheckCircle2 },
            { id: 'WARNING', label: 'Low Stock', count: lowStockItems, icon: TrendingDown },
            { id: 'DEFICIT', label: 'Deficit', count: outOfStockItems, icon: AlertTriangle },
            { id: 'MULTI_UOM', label: 'Dual-UOM Items', count: multiUomItems, icon: Box, highlight: true }
          ].map(tab => {
            const TabIcon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 whitespace-nowrap cursor-pointer shrink-0 active:scale-95 ${
                  isSelected
                    ? 'bg-card text-foreground shadow-xs border border-border/80'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
                } ${tab.highlight && !isSelected ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30' : ''}`}
              >
                <TabIcon size={13} className={isSelected ? 'text-blue-600' : 'text-muted-foreground'} />
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  isSelected ? 'bg-blue-500/15 text-blue-600' : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: View Mode Toggle, Branch Selector & Warehouse Valuation Recap */}
        <div className="flex items-center gap-2 self-end lg:self-center shrink-0 flex-wrap">
          {/* Table / Cards View Mode Toggle (Order Processing Style) */}
          <div className="flex items-center gap-1 bg-card border border-border/80 p-0.5 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              title="Table Matrix View"
            >
              <TableIcon size={13} />
              <span className="hidden sm:inline text-[11px]">Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'cards'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              title="Order Processing Style Card View"
            >
              <LayoutGrid size={13} />
              <span className="hidden sm:inline text-[11px]">Cards</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-card border border-border/80 hover:border-blue-400/80 px-2.5 py-1 rounded-xl shadow-2xs transition-colors">
            <Building2 size={13} className="text-blue-600 shrink-0" />
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Depot:</span>
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="bg-transparent text-xs font-bold text-foreground outline-none cursor-pointer hover:text-blue-600 transition-colors"
            >
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-card border border-border/80 hover:border-emerald-400/80 text-[11px] font-bold text-foreground shadow-2xs transition-colors">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Depot Valuation:</span>
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(totalValuation)}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. INVENTORY DISPLAY: EITHER ORDER-STYLE CARDS OR TABLE MATRIX           */}
      {/* ========================================================================= */}
      {viewMode === 'cards' ? (
        /* ─── 4A. ORDER PROCESSING STYLE CARD VIEW ─── */
        <div className="space-y-2.5">
          {loading ? (
            <div className="p-12 text-center bg-card rounded-xl border border-border/80 text-xs text-muted-foreground font-bold animate-pulse space-y-2">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Fetching physical warehouse ledger...</p>
            </div>
          ) : filteredStock.length === 0 ? (
            <div className="p-10 text-center bg-card rounded-xl border border-border/80 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
                <Package size={20} />
              </div>
              <div className="text-sm font-bold text-foreground">0 Inventory Records Found</div>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                No products match the selected tab or search query in {selectedBranchName}.
              </p>
            </div>
          ) : (
            filteredStock.map((s, idx) => {
              const product = s.productId || {};
              const variant = s.variantId;
              const factor = Number(product.uomDetails?.purchaseConversionFactor) || 1;
              const purchaseUnit = product.uomDetails?.purchaseUnit || 'BOX';
              const baseUnit = product.uomDetails?.baseUnit || product.uom || 'Piece';
              const hasDualUom = factor > 1 && purchaseUnit !== baseUnit;

              const isDeficit = s.quantity <= 0;
              const minLevel = Number(product.minStockLevel) || 10;
              const isLow = s.quantity > 0 && s.quantity <= minLevel;

              const unitCost = Number(product.purchasePrice ?? product.costPrice ?? product.price ?? 0);
              const totalLineValuation = s.quantity * unitCost;

              return (
                <div
                  key={s._id}
                  style={{ animationDelay: `${idx * 25}ms` }}
                  className="order-style-card ecom-slide-up p-3.5 sm:p-4 rounded-xl bg-card border border-border/80 shadow-2xs hover:shadow-md cursor-default"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                    
                    {/* LEFT COLUMN: Number Badge + Title + SKU + Category + Conversion */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-5 h-5 rounded-md bg-muted text-muted-foreground font-black text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        
                        <h3 className="font-black text-foreground text-sm card-product-name transition-colors">
                          {product.name || 'UNKNOWN ITEM'}
                        </h3>

                        {/* System Status Pill (Matching Order Processing Solid Badges) */}
                        {isDeficit ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white bg-rose-600 shadow-2xs">
                            DEFICIT
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white bg-amber-500 shadow-2xs">
                            WARNING
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white bg-emerald-600 shadow-2xs">
                            OPTIMAL
                          </span>
                        )}

                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded-md bg-muted/60">
                          {product.department || 'STANDARD'}
                        </span>
                      </div>

                      {/* Meta Pills: SKU copy, Base UOM, Dual UOM Protocol, Unit Cost */}
                      <div className="flex items-center gap-2.5 text-xs text-muted-foreground flex-wrap">
                        <span className="text-[10.5px] font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                          ID: {variant?.sku || product.sku || 'N/A'}
                          <button
                            type="button"
                            onClick={() => handleCopySku(variant?.sku || product.sku)}
                            className="text-muted-foreground hover:text-blue-600 active:scale-90 transition-transform cursor-pointer"
                            title="Copy SKU"
                          >
                            {copiedSku === (variant?.sku || product.sku) ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                          </button>
                        </span>

                        <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                          Base: <span className="font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded">{baseUnit}</span>
                        </span>

                        {hasDualUom ? (
                          <span className="text-[10.5px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.2 rounded">
                            Protocol: 1 {purchaseUnit} = {factor} {baseUnit}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-muted-foreground">Standard 1:1 Protocol</span>
                        )}

                        <span className="text-[11px] text-muted-foreground">
                          Unit Cost: <strong className="text-foreground font-bold">{formatCurrency(unitCost)}</strong>/{baseUnit}
                        </span>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Physical Count + Dual-UOM Box Pill + Valuation + Audit Action */}
                    <div className="flex items-center gap-4 shrink-0 justify-between lg:justify-end">
                      <div className="text-left lg:text-right space-y-0.5">
                        <div className="font-black text-base text-foreground">
                          {s.quantity} <span className="text-xs uppercase font-bold text-muted-foreground">{baseUnit}</span>
                        </div>

                        {hasDualUom && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-black shadow-2xs whitespace-nowrap">
                            <span>📦</span>
                            <span>
                              {s.quantity % factor === 0
                                ? `${s.quantity / factor} ${purchaseUnit}`
                                : `${Math.floor(s.quantity / factor)} ${purchaseUnit} + ${s.quantity % factor} pcs`
                              }
                            </span>
                            <span className="text-blue-500/80 font-normal text-[9px]">
                              ({factor} pcs/{purchaseUnit.toLowerCase()})
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Valuation */}
                      <div className="text-right border-l border-border/60 pl-3.5 space-y-0.5 min-w-[100px]">
                        <span className="text-[9.5px] uppercase font-black tracking-wider text-muted-foreground block">Valuation</span>
                        <span className="font-black text-xs text-emerald-600 dark:text-emerald-400 block">
                          {formatCurrency(totalLineValuation)}
                        </span>
                      </div>

                      {/* Audit Action Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedLedgerItem(s)}
                        className="card-action-btn px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
                        title="Audit Stock Movements"
                      >
                        <Eye size={13} />
                        <span>Audit</span>
                      </button>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ─── 4B. PROFESSIONAL INVENTORY DATA MATRIX TABLE ─── */
        <div className="rounded-xl bg-card border border-border/80 shadow-2xs overflow-hidden space-y-0">
          
          {/* Table Top Header Strip */}
          <div className="p-3 sm:p-3.5 border-b border-border/70 flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Server size={14} className="text-blue-600" />
                Inventory Stock Matrix · {selectedBranchName} ({filteredStock.length})
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10.5px] font-black uppercase tracking-wider">
              <CheckCircle2 size={12} />
              Physical Count: {filteredStock.reduce((acc, s) => acc + (s.quantity || 0), 0)} Units
            </div>
          </div>

          {/* Detailed Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/70 bg-muted/50 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  <th className="py-2.5 px-3 text-center w-8">#</th>
                  <th className="py-2.5 px-3 min-w-[240px]">ITEM DESIGNATION & SKU</th>
                  <th className="py-2.5 px-3 min-w-[130px]">CLASSIFICATION</th>
                  <th className="py-2.5 px-3 min-w-[160px]">UOM & CONVERSION PROTOCOL</th>
                  <th className="py-2.5 px-3 text-center min-w-[110px]">SYSTEM STATUS</th>
                  <th className="py-2.5 px-3 text-right min-w-[160px]">PHYSICAL COUNT & DUAL-UOM</th>
                  <th className="py-2.5 px-3 text-right min-w-[120px]">EST. VALUATION</th>
                  <th className="py-2.5 px-3 text-center w-16">AUDIT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                          Fetching physical warehouse ledger...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Package size={40} className="text-muted-foreground/30" />
                        <p className="text-sm font-bold text-foreground">0 Inventory Records Found</p>
                        <p className="text-xs text-muted-foreground max-w-sm">
                          No products match the selected tab or search query in {selectedBranchName}.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStock.map((s, idx) => {
                    const product = s.productId || {};
                    const variant = s.variantId;
                    const factor = Number(product.uomDetails?.purchaseConversionFactor) || 1;
                    const purchaseUnit = product.uomDetails?.purchaseUnit || 'BOX';
                    const baseUnit = product.uomDetails?.baseUnit || product.uom || 'Piece';
                    const hasDualUom = factor > 1 && purchaseUnit !== baseUnit;

                    const isDeficit = s.quantity <= 0;
                    const minLevel = Number(product.minStockLevel) || 10;
                    const isLow = s.quantity > 0 && s.quantity <= minLevel;

                    const unitCost = Number(product.purchasePrice ?? product.costPrice ?? product.price ?? 0);
                    const totalLineValuation = s.quantity * unitCost;

                    return (
                      <tr
                        key={s._id}
                        className="inventory-row cursor-default border-b border-border/60 group"
                      >
                        {/* Index */}
                        <td className="py-3 px-3 text-center text-muted-foreground font-bold text-[11px]">
                          {idx + 1}
                        </td>

                        {/* Product Name & SKU */}
                        <td className="py-3 px-3">
                          <div className="space-y-0.5">
                            <p className="font-bold text-foreground text-xs leading-snug row-name transition-colors">
                              {product.name || 'UNKNOWN ITEM'}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10.5px] text-muted-foreground font-bold bg-muted/60 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                                ID: {variant?.sku || product.sku || 'N/A'}
                                <button
                                  type="button"
                                  onClick={() => handleCopySku(variant?.sku || product.sku)}
                                  className="text-muted-foreground hover:text-blue-600 active:scale-90 transition-transform cursor-pointer"
                                  title="Copy SKU"
                                >
                                  {copiedSku === (variant?.sku || product.sku) ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                                </button>
                              </span>

                              {variant && (
                                <span className="text-[9.5px] font-black text-blue-600 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-1.5 py-0.5 rounded">
                                  Variant: {variant.title || variant.sku}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Classification / Department */}
                        <td className="py-3 px-3">
                          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded-md bg-muted/60 inline-block group-hover:bg-muted transition-colors">
                            {product.department || 'STANDARD'}
                          </span>
                        </td>

                        {/* UOM Protocol & Conversion */}
                        <td className="py-3 px-3">
                          <div className="space-y-0.5">
                            <div className="text-[11px] font-bold text-foreground flex items-center gap-1">
                              <span>Base:</span>
                              <span className="font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded">
                                {baseUnit}
                              </span>
                            </div>
                            {hasDualUom ? (
                              <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                                <span>1 {purchaseUnit} =</span>
                                <strong className="font-black">{factor} {baseUnit}</strong>
                              </div>
                            ) : (
                              <span className="text-[9.5px] text-muted-foreground font-medium">Standard 1:1 Protocol</span>
                            )}
                          </div>
                        </td>

                        {/* System Status Pill (Matching Order Processing Solid Badges) */}
                        <td className="py-3 px-3 text-center">
                          {isDeficit ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white bg-rose-600 shadow-2xs">
                              DEFICIT
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white bg-amber-500 shadow-2xs">
                              WARNING
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white bg-emerald-600 shadow-2xs">
                              OPTIMAL
                            </span>
                          )}
                        </td>

                        {/* Physical Count & Prominent Dual UOM Badge */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex flex-col items-end space-y-0.5">
                            <div className="flex items-center justify-end gap-1">
                              <span className={`text-base font-black tracking-tight transition-transform ${isDeficit ? 'text-rose-600' : 'text-foreground'}`}>
                                {s.quantity}
                              </span>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                {baseUnit}
                              </span>
                            </div>

                            {/* Dual UOM Box Breakdown Pill */}
                            {hasDualUom && (
                              <div className="row-box-badge inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-black shadow-2xs whitespace-nowrap transition-all">
                                <span className="text-[10px]">📦</span>
                                <span>
                                  {s.quantity % factor === 0
                                    ? `${s.quantity / factor} ${purchaseUnit}`
                                    : `${Math.floor(s.quantity / factor)} ${purchaseUnit} + ${s.quantity % factor} pcs`
                                  }
                                </span>
                                <span className="text-blue-500/80 font-normal text-[9px]">
                                  ({factor} pcs/{purchaseUnit.toLowerCase()})
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Valuation */}
                        <td className="py-3 px-3 text-right">
                          <div className="space-y-0.5">
                            <span className="font-black text-xs text-foreground block">
                              {formatCurrency(totalLineValuation)}
                            </span>
                            <span className="text-[9.5px] font-bold text-muted-foreground block">
                              @{formatCurrency(unitCost)}/{baseUnit}
                            </span>
                          </div>
                        </td>

                        {/* Audit / Details Action */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedLedgerItem(s)}
                            className="p-1.5 rounded-lg text-blue-600 row-action-btn transition-all duration-200 cursor-pointer"
                            title="View Physical Stock Movement Ledger"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ITEM AUDIT LEDGER MODAL                                                */}
      {/* ========================================================================= */}
      <LedgerModal
        isOpen={Boolean(selectedLedgerItem)}
        onClose={() => setSelectedLedgerItem(null)}
        item={selectedLedgerItem}
        branchName={selectedBranchName}
        movements={movements}
        loadingMovements={loadingMovements}
        formatCurrency={formatCurrency}
      />
    </div>
  );
};

export default StockOverview;

import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { FloatingMenu } from '../../components/common/FloatingMenu';
import {
  Star, MessageSquare, CheckCircle2, Eye, EyeOff, Trash2,
  Search, RefreshCw, AlertCircle, Package, ArrowUpRight,
  Sparkles, MoreVertical, Calendar, User, X, Layers, ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';

/* ─── Keyframe Animations Style Block (Consistent across E-Commerce admin) ─── */
const ANIMATION_STYLES = `
  @keyframes ecomModalBackdrop { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ecomModalPop {
    0% { opacity: 0; transform: scale(0.94) translateY(14px); }
    70% { opacity: 1; transform: scale(1.005) translateY(-2px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes ecomSlideUpFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  @keyframes ecomFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ecomMenuIn { from { opacity: 0; transform: scale(0.96) translateY(-4px); } to { opacity: 1; transform: none; } }
  @keyframes ecomFloatIcon { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-3px); } }
  .ecom-fade-in { animation: ecomFadeIn 0.3s ease-out; }
  .ecom-menu-in { animation: ecomMenuIn 0.16s cubic-bezier(0.16, 1, 0.3, 1); }
  .ecom-modal-backdrop { animation: ecomModalBackdrop 0.22s ease-out forwards; }
  .ecom-modal-pop { animation: ecomModalPop 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .ecom-slide-up { animation: ecomSlideUpFade 0.26s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
  .ecom-float-icon { animation: ecomFloatIcon 2.4s ease-in-out infinite; }
`;

/* Help-Center Aesthetic Modal Wrapper (Zero white border bleed around dark header) */
const HelpStyleModal = ({ isOpen, onClose, badge, title, subtitle, maxWidth = 'max-w-xl', children }) => {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md ecom-modal-backdrop"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <style>{ANIMATION_STYLES}</style>
      <div
        className={`bg-slate-950 rounded-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden shadow-[0_25px_70px_-15px_rgba(0,0,0,0.65)] ecom-modal-pop`}
        onClick={e => e.stopPropagation()}
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 px-6 py-4 text-white shrink-0">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="min-w-0">
              {badge && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-300 text-[10px] font-bold tracking-wider uppercase mb-1.5">
                  <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />
                  <span>{badge}</span>
                </div>
              )}
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-snug truncate">
                {title}
              </h2>
              {subtitle && (
                <p className="text-slate-300 text-xs mt-0.5 leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 hover:rotate-90 text-slate-300 hover:text-white transition-all duration-200 shrink-0 cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col flex-1 min-h-0 bg-card text-foreground rounded-b-2xl overflow-hidden">
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const EcomReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [productStats, setProductStats] = useState([]);
  const [summary, setSummary] = useState({
    totalReviews: 0,
    avgStoreRating: '0.0',
    approvedCount: 0,
    pendingCount: 0,
    productsWithReviews: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PRODUCTS'); // 'PRODUCTS' or 'REVIEWS'
  const [selectedProductId, setSelectedProductId] = useState('ALL');
  const [selectedRating, setSelectedRating] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Date filter state
  const [datePreset, setDatePreset] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Three-dot menu & modal state
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedReviewModal, setSelectedReviewModal] = useState(null);
  const menuContainerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [selectedProductId, selectedRating, selectedStatus]);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (selectedProductId && selectedProductId !== 'ALL') params.productId = selectedProductId;
      if (selectedRating && selectedRating !== 'ALL') params.rating = selectedRating;
      if (selectedStatus && selectedStatus !== 'ALL') params.status = selectedStatus;

      const { data } = await axios.get('/api/v1/ecommerce-admin/reviews', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      setReviews(data.reviews || []);
      setProductStats(data.productStats || []);
      setSummary(data.summary || {
        totalReviews: 0,
        avgStoreRating: '0.0',
        approvedCount: 0,
        pendingCount: 0,
        productsWithReviews: 0
      });
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setIsLoading(false);
    }
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
      yest.setDate(now.getDate() - 1);
      const yStr = toYMD(yest);
      setDateFrom(yStr);
      setDateTo(yStr);
    } else if (preset === 'LAST_7_DAYS') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 6);
      setDateFrom(toYMD(weekAgo));
      setDateTo(toYMD(now));
    } else if (preset === 'THIS_MONTH') {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(toYMD(firstOfMonth));
      setDateTo(toYMD(now));
    }
  };

  const handleToggleStatus = async (review) => {
    setOpenMenuId(null);
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      const nextStatus = !review.isApproved;
      await axios.put(`/api/v1/ecommerce-admin/reviews/${review._id}/status`, {
        isApproved: nextStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setReviews(prev => prev.map(r => r._id === review._id ? { ...r, isApproved: nextStatus } : r));
      if (selectedReviewModal && selectedReviewModal._id === review._id) {
        setSelectedReviewModal(prev => ({ ...prev, isApproved: nextStatus }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update review status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteReview = async (id) => {
    setOpenMenuId(null);
    if (!window.confirm('Are you sure you want to permanently delete this customer review?')) return;
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/ecommerce-admin/reviews/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setReviews(prev => prev.filter(r => r._id !== id));
      if (selectedReviewModal && selectedReviewModal._id === id) {
        setSelectedReviewModal(null);
      }
      fetchReviews();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete review.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFilterByProduct = (prodId, ratingFilter = 'ALL') => {
    setOpenMenuId(null);
    setSelectedProductId(prodId);
    setSelectedRating(ratingFilter);
    setActiveTab('REVIEWS');
  };

  // Filtered Product Stats (instant client-side search)
  const filteredProductStats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return productStats;
    return productStats.filter(prod =>
      (prod.name || '').toLowerCase().includes(q) ||
      (prod.sku || '').toLowerCase().includes(q) ||
      (prod.brand || '').toLowerCase().includes(q) ||
      (prod.productId || '').toLowerCase().includes(q)
    );
  }, [productStats, searchQuery]);

  // Filtered Reviews (instant client-side search + date range)
  const filteredReviews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

    return reviews.filter(r => {
      if (fromTime || toTime) {
        if (!r.createdAt) return false;
        const t = new Date(r.createdAt).getTime();
        if (fromTime && t < fromTime) return false;
        if (toTime && t > toTime) return false;
      }

      if (!q) return true;
      const customerName = (r.customerId?.name || `${r.customerId?.firstName || ''} ${r.customerId?.lastName || ''}`).toLowerCase();
      const customerEmail = (r.customerId?.email || '').toLowerCase();
      const prodName = (r.productId?.name || '').toLowerCase();
      const prodSku = (r.productId?.sku || '').toLowerCase();
      const comment = (r.comment || '').toLowerCase();

      return (
        customerName.includes(q) ||
        customerEmail.includes(q) ||
        prodName.includes(q) ||
        prodSku.includes(q) ||
        comment.includes(q)
      );
    });
  }, [reviews, searchQuery, dateFrom, dateTo]);

  return (
    <div className="space-y-4 pb-8 max-w-[1440px] mx-auto ecom-fade-in" ref={menuContainerRef}>
      <style>{ANIMATION_STYLES}</style>
      {/* ========================================================================= */}
      {/* 1. SLIM & COMPACT HERO HEADER (Help Center Aesthetic)                     */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-4 sm:p-5 text-white shadow-md border border-blue-900/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          {/* Left: Badge, Title & Subtitle */}
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase tracking-wider">
              <Sparkles size={11} className="text-blue-400" />
              JTS Storefront Sentiment & Moderation Hub
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
              Customer Ratings & Reviews
            </h1>
            <p className="text-xs text-blue-100/75 max-w-xl leading-snug">
              Track customer ratings per product, monitor verified buyer feedback, and manage storefront review visibility.
            </p>
          </div>

          {/* Right: Compact Search Bar & Refresh Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <div className="relative w-full sm:w-64 md:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search product, SKU, customer, review..."
                className="w-full pl-8 pr-7 py-2 rounded-xl bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/20 text-white placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 backdrop-blur-md transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold p-0.5 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={fetchReviews}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
              title="Refresh Ratings & Reviews"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              Refresh Data
            </button>
          </div>
        </div>

        <div className="absolute right-0 top-0 w-80 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ========================================================================= */}
      {/* 2. COMPACT KPI METRIC CARDS (Help Center Proportions)                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {[
          {
            onClick: () => { setActiveTab('REVIEWS'); setSelectedStatus('ALL'); },
            isActive: activeTab === 'REVIEWS' && selectedStatus === 'ALL',
            label: 'Total Reviews',
            value: summary.totalReviews,
            sub: 'Across all storefront products',
            icon: MessageSquare,
            valColor: 'text-blue-600 dark:text-blue-400',
            activeRing: 'border-blue-500/60 shadow-xs ring-1 ring-blue-500/30',
            iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
          },
          {
            onClick: () => setActiveTab('PRODUCTS'),
            isActive: false,
            label: 'Average Rating',
            value: summary.avgStoreRating,
            star: true,
            sub: 'Overall store sentiment score',
            icon: Star,
            valColor: 'text-amber-600 dark:text-amber-400',
            activeRing: '',
            iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          },
          {
            onClick: () => setActiveTab('PRODUCTS'),
            isActive: activeTab === 'PRODUCTS',
            label: 'Reviewed Products',
            value: summary.productsWithReviews,
            sub: 'Products with customer feedback',
            icon: Package,
            valColor: 'text-purple-600 dark:text-purple-400',
            activeRing: 'border-purple-500/60 shadow-xs ring-1 ring-purple-500/30',
            iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
          },
          {
            onClick: () => { setActiveTab('REVIEWS'); setSelectedStatus('APPROVED'); },
            isActive: activeTab === 'REVIEWS' && selectedStatus === 'APPROVED',
            label: 'Approved Reviews',
            value: summary.approvedCount,
            sub: 'Live on storefront catalog',
            icon: CheckCircle2,
            valColor: 'text-emerald-600 dark:text-emerald-400',
            activeRing: 'border-emerald-500/60 shadow-xs ring-1 ring-emerald-500/30',
            iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          }
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <button
              key={kpi.label}
              type="button"
              onClick={kpi.onClick}
              style={{ animationDelay: `${i * 40}ms` }}
              className={`ecom-slide-up group text-left p-3.5 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex items-center justify-between gap-2 ${
                kpi.isActive ? `bg-card ${kpi.activeRing}` : 'bg-card/80 hover:bg-card border-border/80 shadow-2xs'
              }`}
            >
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
                  {kpi.label}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-lg sm:text-xl font-black leading-tight ${kpi.valColor}`}>
                    {kpi.value}
                  </span>
                  {kpi.star && <Star size={15} className="fill-amber-400 text-amber-400" />}
                </div>
                <span className="text-[10px] text-muted-foreground block truncate">
                  {kpi.sub}
                </span>
              </div>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 ${kpi.iconBg}`}>
                <Icon size={17} className={kpi.star ? 'fill-amber-400' : ''} />
              </div>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 3. SLEEK SEGMENTED NAVIGATION TABS & MODERATION FILTERS                   */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 p-1.5 bg-muted/50 rounded-xl border border-border/60">
        {/* Segmented Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('PRODUCTS')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'PRODUCTS'
                ? 'bg-card text-foreground shadow-xs font-black border border-border/80'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
            }`}
          >
            <Package size={13} className={activeTab === 'PRODUCTS' ? 'text-blue-600 dark:text-blue-400' : ''} />
            <span>Product Ratings Summary</span>
            <span className="px-1.5 py-0.2 rounded-md bg-muted text-[10px] font-bold">
              {filteredProductStats.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('REVIEWS')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'REVIEWS'
                ? 'bg-card text-foreground shadow-xs font-black border border-border/80'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
            }`}
          >
            <MessageSquare size={13} className={activeTab === 'REVIEWS' ? 'text-blue-600 dark:text-blue-400' : ''} />
            <span>All Customer Reviews</span>
            <span className="px-1.5 py-0.2 rounded-md bg-muted text-[10px] font-bold">
              {filteredReviews.length}
            </span>
          </button>
        </div>

        {/* Right: Quick Star & Visibility Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap px-1">
          {selectedProductId !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedProductId('ALL')}
              className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Product Filtered</span>
              <X size={11} />
            </button>
          )}

          {/* Star Filter Pills */}
          <div className="flex items-center gap-1 bg-card px-1.5 py-1 rounded-lg border border-border/70">
            {[
              { id: 'ALL', label: 'All ★' },
              { id: '5', label: '5★' },
              { id: '4', label: '4★' },
              { id: '3', label: '3★' },
              { id: '2', label: '2★' },
              { id: '1', label: '1★' }
            ].map(st => (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  setSelectedRating(st.id);
                  setActiveTab('REVIEWS');
                }}
                className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-colors cursor-pointer ${
                  selectedRating === st.id
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Status Filter Select */}
          <select
            value={selectedStatus}
            onChange={e => {
              setSelectedStatus(e.target.value);
              setActiveTab('REVIEWS');
            }}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-border/80 bg-card text-foreground focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Visibility</option>
            <option value="APPROVED">Live (Approved)</option>
            <option value="PENDING">Hidden / Pending</option>
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3B. SLEEK DATE FILTER BAR (When viewing Reviews)                          */}
      {/* ========================================================================= */}
      {activeTab === 'REVIEWS' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3 py-2 bg-card rounded-xl border border-border/80 shadow-2xs text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1 mr-1">
              <Calendar size={12} className="text-blue-600 dark:text-blue-400" />
              Review Date:
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
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  datePreset === p.id
                    ? 'bg-blue-600 text-white shadow-2xs font-black'
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

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
                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <X size={12} /> Reset Date
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: PRODUCT RATINGS SUMMARY (Help Center Card Aesthetic + 3-Dot Menu)  */}
      {/* ========================================================================= */}
      {activeTab === 'PRODUCTS' && (
        <div className="space-y-2.5">
          {isLoading ? (
            <div className="p-12 text-center bg-card rounded-xl border border-border/80 text-xs text-muted-foreground font-bold animate-pulse">
              Loading product rating metrics...
            </div>
          ) : filteredProductStats.length === 0 ? (
            <div className="p-10 text-center bg-card rounded-xl border border-border/80 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
                <Star size={20} />
              </div>
              <div className="text-sm font-bold text-foreground">No Product Reviews Found</div>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {searchQuery
                  ? `No reviewed products match "${searchQuery}".`
                  : 'When customers rate products on the storefront, their ratings and sentiment breakdown will appear here.'}
              </p>
            </div>
          ) : (
            filteredProductStats.map((prod, idx) => {
              const menuKey = `prod-${prod.productId}`;
              const isMenuOpen = openMenuId === menuKey;

              return (
                <div
                  key={prod.productId}
                  style={{ animationDelay: `${idx * 30}ms` }}
                  className="ecom-slide-up p-3.5 sm:p-4 rounded-xl bg-card border border-border/80 hover:border-blue-500/40 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left: Number Badge + Thumbnail + Product Title & SKU */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-black shrink-0">
                      {idx + 1}
                    </span>

                    <div className="w-11 h-11 rounded-xl border border-border/80 bg-muted/40 overflow-hidden shrink-0 flex items-center justify-center">
                      {prod.uploadImage ? (
                        <img
                          src={prod.uploadImage}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <Package size={18} className="text-muted-foreground" />
                      )}
                    </div>

                    <div className="truncate space-y-0.5">
                      <button
                        type="button"
                        onClick={() => handleFilterByProduct(prod.productId)}
                        className="text-xs sm:text-sm font-black text-foreground hover:text-blue-600 transition-colors cursor-pointer truncate block text-left"
                      >
                        {prod.name}
                      </button>
                      <div className="flex items-center gap-2 text-[10.5px] text-muted-foreground flex-wrap">
                        <span>SKU: <strong className="font-mono text-foreground">{prod.sku}</strong></span>
                        <span>·</span>
                        <span>Brand: <strong className="text-foreground">{prod.brand || 'Enterprise'}</strong></span>
                        <span>·</span>
                        <span className="font-mono text-[10px]">ID: {prod.productId.slice(-6).toUpperCase()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Star Distribution Bar (Help Center Action Box Style) */}
                  <div className="w-full lg:w-80 p-2.5 rounded-xl bg-muted/30 border border-border/60 space-y-1.5 shrink-0">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="uppercase tracking-wider text-muted-foreground">Rating Distribution</span>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="text-emerald-600 dark:text-emerald-400 font-black">5★: {prod.ratings?.[5] || 0}</span>
                        <span>4★: {prod.ratings?.[4] || 0}</span>
                        <span>3★: {prod.ratings?.[3] || 0}</span>
                        <span className="text-rose-600 dark:text-rose-400">1★: {prod.ratings?.[1] || 0}</span>
                      </div>
                    </div>

                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${prod.reviewCount > 0 ? ((prod.ratings?.[5] || 0) / prod.reviewCount) * 100 : 0}%` }}
                        className="bg-emerald-500 h-full"
                        title={`5 Stars: ${prod.ratings?.[5] || 0}`}
                      />
                      <div
                        style={{ width: `${prod.reviewCount > 0 ? ((prod.ratings?.[4] || 0) / prod.reviewCount) * 100 : 0}%` }}
                        className="bg-blue-500 h-full"
                        title={`4 Stars: ${prod.ratings?.[4] || 0}`}
                      />
                      <div
                        style={{ width: `${prod.reviewCount > 0 ? ((prod.ratings?.[3] || 0) / prod.reviewCount) * 100 : 0}%` }}
                        className="bg-amber-400 h-full"
                        title={`3 Stars: ${prod.ratings?.[3] || 0}`}
                      />
                      <div
                        style={{ width: `${prod.reviewCount > 0 ? ((prod.ratings?.[2] || 0) / prod.reviewCount) * 100 : 0}%` }}
                        className="bg-orange-400 h-full"
                        title={`2 Stars: ${prod.ratings?.[2] || 0}`}
                      />
                      <div
                        style={{ width: `${prod.reviewCount > 0 ? ((prod.ratings?.[1] || 0) / prod.reviewCount) * 100 : 0}%` }}
                        className="bg-rose-500 h-full"
                        title={`1 Star: ${prod.ratings?.[1] || 0}`}
                      />
                    </div>
                  </div>

                  {/* Right: Average Rating Badge + Total Count + Three-Dot (⋮) Menu */}
                  <div className="flex items-center justify-between lg:justify-end gap-3.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground">
                          Total Reviews
                        </div>
                        <div className="text-sm font-black text-foreground">
                          {prod.reviewCount} {prod.reviewCount === 1 ? 'Review' : 'Reviews'}
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white rounded-xl font-black text-xs shadow-2xs">
                        <span>{prod.avgRating}</span>
                        <Star size={12} className="fill-white" />
                      </div>
                    </div>

                    {/* Three-Dot (⋮) Action Menu */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setOpenMenuId(isMenuOpen ? null : menuKey);
                        }}
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                          isMenuOpen
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-95'
                            : 'bg-muted/40 hover:bg-muted text-foreground border-border/80 hover:border-blue-500/40'
                        }`}
                        title="Product Review Actions"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {isMenuOpen && (
                        <FloatingMenu width={240} onClose={() => setOpenMenuId(null)} className="rounded-2xl bg-card border border-border shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                          <div className="px-2.5 py-1 border-b border-border/60 flex items-center justify-between">
                            <span className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground truncate">
                              {prod.sku}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                              {prod.avgRating} ★
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleFilterByProduct(prod.productId, 'ALL')}
                            className="w-full text-left p-2 rounded-xl hover:bg-blue-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                              <MessageSquare size={14} />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-bold text-foreground group-hover:text-blue-600">
                                View All {prod.reviewCount} Review(s)
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                Inspect buyer comments & ratings
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleFilterByProduct(prod.productId, '5')}
                            className="w-full text-left p-2 rounded-xl hover:bg-amber-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                              <Star size={14} />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-bold text-foreground group-hover:text-amber-600">
                                Filter 5-Star Reviews ({prod.ratings?.[5] || 0})
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                Top positive customer feedback
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleFilterByProduct(prod.productId, '1')}
                            className="w-full text-left p-2 rounded-xl hover:bg-rose-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 group-hover:bg-rose-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                              <AlertCircle size={14} />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-bold text-foreground group-hover:text-rose-600">
                                Filter 1-Star Reviews ({prod.ratings?.[1] || 0})
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                Inspect critical product issues
                              </div>
                            </div>
                          </button>
                        </FloatingMenu>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ALL CUSTOMER REVIEWS & MODERATION (Help Center Cards + 3-Dot Menu) */}
      {/* ========================================================================= */}
      {activeTab === 'REVIEWS' && (
        <div className="space-y-2.5">
          {isLoading ? (
            <div className="p-12 text-center bg-card rounded-xl border border-border/80 text-xs text-muted-foreground font-bold animate-pulse">
              Loading customer reviews...
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="p-10 text-center bg-card rounded-xl border border-border/80 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
                <MessageSquare size={20} />
              </div>
              <div className="text-sm font-bold text-foreground">No Customer Reviews Found</div>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                No customer reviews match your selected search, star rating, or date filter criteria.
              </p>
              {(searchQuery || selectedRating !== 'ALL' || selectedStatus !== 'ALL' || selectedProductId !== 'ALL' || dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedRating('ALL');
                    setSelectedStatus('ALL');
                    setSelectedProductId('ALL');
                    handleDatePreset('ALL');
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            filteredReviews.map((r, idx) => {
              const customerName =
                r.customerId?.name ||
                `${r.customerId?.firstName || ''} ${r.customerId?.lastName || ''}`.trim() ||
                'Verified Customer';
              const customerEmail = r.customerId?.email || 'Verified Buyer';
              const menuKey = `rev-${r._id}`;
              const isMenuOpen = openMenuId === menuKey;

              return (
                <div
                  key={r._id}
                  style={{ animationDelay: `${idx * 30}ms` }}
                  className="ecom-slide-up p-3.5 sm:p-4 rounded-xl bg-card border border-border/80 hover:border-blue-500/40 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5"
                >
                  {/* Left: Customer, Product & Written Review Comment */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-black shrink-0">
                        {idx + 1}
                      </span>

                      <button
                        type="button"
                        onClick={() => setSelectedReviewModal(r)}
                        className="text-xs sm:text-sm font-black text-foreground hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        {customerName}
                      </button>

                      <span className="text-[10.5px] text-muted-foreground">
                        ({customerEmail})
                      </span>

                      {/* Star Rating Pill */}
                      <div className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            size={11}
                            className={Number(r.rating || 5) >= s ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}
                          />
                        ))}
                        <span className="font-black text-amber-800 dark:text-amber-300 ml-1 text-[10.5px]">
                          {r.rating}.0
                        </span>
                      </div>

                      {r.createdAt && (
                        <span className="text-[10.5px] text-muted-foreground flex items-center gap-1">
                          <Calendar size={11} />
                          {format(new Date(r.createdAt), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>

                    {/* Product Tag */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 border border-border/60 text-[10.5px] font-bold text-foreground">
                        <Package size={11} className="text-blue-600 shrink-0" />
                        {r.productId?.name || 'Storefront Product'}
                        {r.productId?.sku && (
                          <span className="font-mono text-muted-foreground ml-1">· {r.productId.sku}</span>
                        )}
                      </span>
                    </div>

                    {/* Review Comment Box */}
                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60 text-xs text-foreground leading-relaxed">
                      {r.comment ? (
                        <span>"{r.comment}"</span>
                      ) : (
                        <span className="italic text-muted-foreground">No written review comment provided by customer.</span>
                      )}
                    </div>
                  </div>

                  {/* Right: Visibility Status + Three-Dot (⋮) Action Menu */}
                  <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/50">
                    <div className="text-left lg:text-right space-y-0.5">
                      <div className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground">
                        Storefront Status
                      </div>
                      {r.isApproved ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 size={11} /> Live on Store
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-muted text-muted-foreground border border-border">
                          <EyeOff size={11} /> Hidden
                        </span>
                      )}
                    </div>

                    {/* Three-Dot (⋮) Action Menu */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setOpenMenuId(isMenuOpen ? null : menuKey);
                        }}
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                          isMenuOpen
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-95'
                            : 'bg-muted/40 hover:bg-muted text-foreground border-border/80 hover:border-blue-500/40'
                        }`}
                        title="Review Moderation Actions"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {isMenuOpen && (
                        <FloatingMenu width={240} onClose={() => setOpenMenuId(null)} className="rounded-2xl bg-card border border-border shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                          <div className="px-2.5 py-1 border-b border-border/60 flex items-center justify-between">
                            <span className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground">
                              Review Moderation
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
                              {r.rating}.0 ★
                            </span>
                          </div>

                          {/* 1. Inspect Full Review Modal */}
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              setSelectedReviewModal(r);
                            }}
                            className="w-full text-left p-2 rounded-xl hover:bg-blue-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                              <Eye size={14} />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-bold text-foreground group-hover:text-blue-600">
                                View Full Review Details
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                Inspect buyer & product dossier
                              </div>
                            </div>
                          </button>

                          {/* 2. Toggle Visibility (Approve / Hide) */}
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleToggleStatus(r)}
                            className="w-full text-left p-2 rounded-xl hover:bg-emerald-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                              {r.isApproved ? <EyeOff size={14} /> : <CheckCircle2 size={14} />}
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-bold text-foreground group-hover:text-emerald-600">
                                {r.isApproved ? 'Hide Review from Store' : 'Approve & Publish Review'}
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                {r.isApproved ? 'Suppress from public product page' : 'Make visible to online shoppers'}
                              </div>
                            </div>
                          </button>

                          {/* 3. Filter Product Reviews */}
                          {r.productId?._id && (
                            <button
                              type="button"
                              onClick={() => handleFilterByProduct(r.productId._id)}
                              className="w-full text-left p-2 rounded-xl hover:bg-purple-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                                <Package size={14} />
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-bold text-foreground group-hover:text-purple-600">
                                  Filter Product Reviews
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  All reviews for {r.productId.name}
                                </div>
                              </div>
                            </button>
                          )}

                          <div className="border-t border-border/60 my-1" />

                          {/* 4. Delete Review Permanently */}
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleDeleteReview(r._id)}
                            className="w-full text-left p-2 rounded-xl hover:bg-rose-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 group-hover:bg-rose-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                              <Trash2 size={14} />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-bold text-rose-600">
                                Delete Review Permanently
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                Remove spam or abusive content
                              </div>
                            </div>
                          </button>
                        </FloatingMenu>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* REVIEW DOSSIER & MODERATION POPUP MODAL (Help Center Aesthetic)           */}
      {/* ========================================================================= */}
      <HelpStyleModal
        isOpen={Boolean(selectedReviewModal)}
        onClose={() => setSelectedReviewModal(null)}
        badge="STOREFRONT SENTIMENT · REVIEW DOSSIER"
        title={selectedReviewModal?.productId?.name || 'Customer Review Details'}
        subtitle={
          selectedReviewModal?.createdAt
            ? `Submitted on ${format(new Date(selectedReviewModal.createdAt), 'MMMM d, yyyy · h:mm a')}`
            : 'Verified Customer Review'
        }
      >
        {selectedReviewModal && (
          <div className="space-y-4 ecom-slide-up">
            {/* Inner Gradient Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white shadow-xs flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-1">
                <span className="text-[9.5px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                  {selectedReviewModal.isApproved ? 'LIVE ON STOREFRONT' : 'HIDDEN / PENDING MODERATION'}
                </span>
                <div className="flex items-center gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star
                      key={s}
                      size={16}
                      className={Number(selectedReviewModal.rating || 5) >= s ? 'fill-amber-300 text-amber-300' : 'text-white/30'}
                    />
                  ))}
                  <span className="text-base font-black ml-1">{selectedReviewModal.rating}.0 / 5.0</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleToggleStatus(selectedReviewModal)}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 active:scale-95 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer text-white"
                >
                  {selectedReviewModal.isApproved ? (
                    <>
                      <EyeOff size={13} /> Hide from Store
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={13} /> Approve & Publish
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleDeleteReview(selectedReviewModal._id)}
                  className="px-3 py-1.5 bg-rose-500/80 hover:bg-rose-600 active:scale-95 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer text-white"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>

            {/* 2-Column Buyer & Product Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <div className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <User size={11} className="text-blue-600" /> Reviewer Information
                </div>
                <div className="font-bold text-foreground text-xs">
                  {selectedReviewModal.customerId?.name ||
                    `${selectedReviewModal.customerId?.firstName || ''} ${selectedReviewModal.customerId?.lastName || ''}`.trim() ||
                    'Verified Customer'}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {selectedReviewModal.customerId?.email || 'Verified Purchase'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <div className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Package size={11} className="text-purple-600" /> Reviewed Product
                </div>
                <div className="font-bold text-foreground text-xs truncate">
                  {selectedReviewModal.productId?.name || 'Catalog Product'}
                </div>
                <div className="text-[11px] font-mono text-muted-foreground">
                  SKU: {selectedReviewModal.productId?.sku || 'N/A'}
                </div>
              </div>
            </div>

            {/* Written Review Feedback */}
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-1.5">
              <div className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground">
                Written Customer Feedback
              </div>
              <p className="text-xs text-foreground leading-relaxed">
                {selectedReviewModal.comment || 'No written comment was provided with this star rating.'}
              </p>
            </div>
          </div>
        )}
      </HelpStyleModal>
    </div>
  );
};

export default EcomReviews;

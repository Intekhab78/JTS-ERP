import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import {
  Tag, Plus, Edit2, Trash2, Mail, MailX, CheckCircle2,
  AlertCircle, ArrowUpDown, Info, Sparkles, RefreshCw,
  Search, X, Shield, Sliders, Layers, Send, Eye,
  Check, Clock, ShieldCheck, HelpCircle, FileText
} from 'lucide-react';

/* ─── Keyframe Animations & Hover Utility Styles ─── */
const ANIMATION_STYLES = `
  @keyframes ecomModalBackdrop { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ecomModalPop {
    0% { opacity: 0; transform: scale(0.94) translateY(14px); }
    70% { opacity: 1; transform: scale(1.005) translateY(-2px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes ecomSlideUpFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  @keyframes ecomFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ecomPulseSubtle { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
  .ecom-fade-in { animation: ecomFadeIn 0.3s ease-out; }
  .ecom-modal-backdrop { animation: ecomModalBackdrop 0.22s ease-out forwards; }
  .ecom-modal-pop { animation: ecomModalPop 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .ecom-slide-up { animation: ecomSlideUpFade 0.26s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
`;

/* ─── Modern Color Presets for Badges ─── */
const COLOR_PRESETS = [
  { name: 'Sapphire Blue', hex: '#2563eb', bg: 'bg-blue-600' },
  { name: 'Emerald Green', hex: '#059669', bg: 'bg-emerald-600' },
  { name: 'Amber Orange', hex: '#d97706', bg: 'bg-amber-600' },
  { name: 'Royal Violet', hex: '#7c3aed', bg: 'bg-violet-600' },
  { name: 'Cyan Sky', hex: '#0284c7', bg: 'bg-sky-600' },
  { name: 'Teal Forest', hex: '#0d9488', bg: 'bg-teal-600' },
  { name: 'Fresh Green', hex: '#16a34a', bg: 'bg-green-600' },
  { name: 'Ruby Crimson', hex: '#dc2626', bg: 'bg-rose-600' },
  { name: 'Sunset Coral', hex: '#ea580c', bg: 'bg-orange-600' },
  { name: 'Indigo Night', hex: '#4f46e5', bg: 'bg-indigo-600' },
  { name: 'Fuchsia Pink', hex: '#c026d3', bg: 'bg-fuchsia-600' },
  { name: 'Slate Steel', hex: '#475569', bg: 'bg-slate-600' }
];

/* ─── Template Dynamic Variable Chips ─── */
const TEMPLATE_VARIABLES = [
  { tag: '{{orderId}}', desc: 'Order ID' },
  { tag: '{{customerName}}', desc: 'Customer Name' },
  { tag: '{{statusName}}', desc: 'Status Name' },
  { tag: '{{trackingNumber}}', desc: 'Tracking #' },
  { tag: '{{storeName}}', desc: 'Store Name' }
];

/* ─── Help-Center Aesthetic Modal Wrapper ─── */
  const StatusModal = ({ isOpen, onClose, title, subtitle, badge, children, footer, maxWidth = 'max-w-4xl' }) => {
    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
      <div
        className="fixed inset-0 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md ecom-modal-backdrop"
        style={{ zIndex: 9999 }}
        onClick={onClose}
      >
        <style>{ANIMATION_STYLES}</style>
        <div
          className={`bg-slate-950 rounded-2xl w-full ${maxWidth} max-h-[92vh] flex flex-col overflow-hidden shadow-[0_25px_70px_-15px_rgba(0,0,0,0.65)] ecom-modal-pop border border-white/10`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 px-6 py-4 text-white shrink-0 border-b border-white/10">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {badge && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-300 text-[10px] font-bold tracking-wider uppercase mb-1">
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

              {/* Body */}
              <div className="flex flex-col flex-1 min-h-0 bg-card text-foreground overflow-hidden">
                  <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-xs [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {children}
                  </div>
                  {footer && (
                    <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900 border-t border-border/80 flex items-center justify-between gap-3 shrink-0">
                      {footer}
                    </div>
                  )}
                </div>
              </div>
            </div>,
            document.body
            );
};

const EcomStatusMaster = () => {
  const [statuses, setStatuses] = useState([]);
            const [isLoading, setIsLoading] = useState(true);
            const [modalOpen, setModalOpen] = useState(false);
            const [editingId, setEditingId] = useState(null);
            const [togglingId, setTogglingId] = useState(null);
            const [searchQuery, setSearchQuery] = useState('');
            const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'CUSTOMER_EMAIL' | 'INTERNAL_ONLY'
            const [showNotificationHelp, setShowNotificationHelp] = useState(true);

            const [formData, setFormData] = useState({
              name: '',
            code: '',
            color: '#2563eb',
            order: 1,
            sendEmailToCustomer: false,
            emailSubject: 'Order #{{ orderId }} status update',
            emailTemplate: 'Your order status has been updated to {{ statusName }}.'
  });

            const authUser = JSON.parse(localStorage.getItem('user') || '{ }');
            const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
              fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
              setIsLoading(true);
            try {
      const token = localStorage.getItem('token');
            const {data} = await axios.get('/api/v1/ecommerce-admin/statuses', {
              headers: {Authorization: `Bearer ${token}` }
      });
            setStatuses(data || []);
    } catch (error) {
              console.error('Failed to fetch ecom statuses:', error);
    } finally {
              setIsLoading(false);
    }
  };

  const handleOpenCreate = () => {
              setEditingId(null);
            setFormData({
              name: '',
            code: '',
            color: '#2563eb',
            order: statuses.length + 1,
            sendEmailToCustomer: true,
            emailSubject: 'Order #{{ orderId }} status update',
            emailTemplate: 'Your order status has been updated to {{ statusName }}.'
    });
            setModalOpen(true);
  };

  const handleOpenEdit = (status) => {
              setEditingId(status._id);
            setFormData({
              name: status.name || '',
            code: status.code || '',
            color: status.color || '#2563eb',
            order: status.order !== undefined ? status.order : 1,
            sendEmailToCustomer: Boolean(status.sendEmailToCustomer),
            emailSubject: status.emailSubject || 'Order #{{ orderId }} status update',
            emailTemplate: status.emailTemplate || 'Your order status has been updated to {{ statusName }}.'
    });
            setModalOpen(true);
  };

  const handleSubmit = async (e) => {
              e.preventDefault();
            try {
      const token = localStorage.getItem('token');
            const headers = {Authorization: `Bearer ${token}` };

            if (editingId) {
              await axios.put(`/api/v1/ecommerce-admin/statuses/${editingId}`, formData, { headers });
      } else {
              await axios.post('/api/v1/ecommerce-admin/statuses', formData, { headers });
      }

            setModalOpen(false);
            fetchStatuses();
    } catch (error) {
              alert(error.response?.data?.message || 'Failed to save order status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this custom order status?')) return;

            try {
      const token = localStorage.getItem('token');
            await axios.delete(`/api/v1/ecommerce-admin/statuses/${id}`, {
              headers: {Authorization: `Bearer ${token}` }
      });
            fetchStatuses();
    } catch (error) {
              alert(error.response?.data?.message || 'Failed to delete status');
    }
  };

  // Quick toggle email option directly from row
  const handleToggleEmail = async (status) => {
              setTogglingId(status._id);
            try {
      const token = localStorage.getItem('token');
            await axios.put(`/api/v1/ecommerce-admin/statuses/${status._id}`, {
              sendEmailToCustomer: !status.sendEmailToCustomer
      }, {
              headers: {Authorization: `Bearer ${token}` }
      });
      setStatuses(prev => prev.map(s => s._id === status._id ? {...s, sendEmailToCustomer: !s.sendEmailToCustomer } : s));
    } catch (error) {
              alert(error.response?.data?.message || 'Failed to toggle email option');
    } finally {
              setTogglingId(null);
    }
  };

  // Insert template variable into input
  const insertVariable = (field, tag) => {
              setFormData(prev => ({
                ...prev,
                [field]: prev[field] ? `${prev[field]} ${tag}` : tag
              }));
  };

  // KPI Metrics Calculations
  const sortedStatuses = useMemo(() => {
    return [...statuses].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  }, [statuses]);

  const customerNotifiedCount = useMemo(() => {
    return statuses.filter(s => s.sendEmailToCustomer).length;
  }, [statuses]);

  const internalOnlyCount = useMemo(() => {
    return statuses.filter(s => !s.sendEmailToCustomer).length;
  }, [statuses]);

  // Filtered & Searched List
  const filteredStatuses = useMemo(() => {
    return sortedStatuses.filter(s => {
      // Tab filter
      if (activeFilter === 'CUSTOMER_EMAIL' && !s.sendEmailToCustomer) return false;
            if (activeFilter === 'INTERNAL_ONLY' && s.sendEmailToCustomer) return false;

            // Search query
            if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
            const nameMatch = (s.name || '').toLowerCase().includes(query);
            const codeMatch = (s.code || '').toLowerCase().includes(query);
            const subjectMatch = (s.emailSubject || '').toLowerCase().includes(query);
            return nameMatch || codeMatch || subjectMatch;
      }
            return true;
    });
  }, [sortedStatuses, activeFilter, searchQuery]);

            return (
            <div className="space-y-5 p-4 sm:p-6 max-w-[1600px] mx-auto ecom-fade-in">
              <style>{ANIMATION_STYLES}</style>

              {/* ========================================================================= */}
              {/* 1. SLIM HELP-CENTER STYLE HERO HEADER                                     */}
              {/* ========================================================================= */}
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white px-6 py-5 shadow-lg border border-white/10">
                <div className="absolute -top-16 -right-16 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="max-w-xl">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-300 text-[10px] font-bold tracking-wider uppercase mb-2">
                      <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />
                      <span>JTS Storefront • Order Lifecycle & Fulfillment Hub</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
                      E-Commerce Status Master
                    </h1>
                    <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                      Configure order progression stages, colored storefront badges, and automated customer email triggers.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                    {/* Search Input */}
                    <div className="relative flex-1 sm:w-64">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search stage, code, template..."
                        className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/15 transition-all"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                          title="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <button
                      type="button"
                      onClick={handleOpenCreate}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white font-bold text-xs shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Order Status</span>
                    </button>

                    <button
                      type="button"
                      onClick={fetchStatuses}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer shrink-0"
                      title="Refresh Statuses"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* 2. COMPACT KPI METRIC CARDS                                               */}
              {/* ========================================================================= */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    id: 'ALL',
                    label: 'Total Lifecycle Stages',
                    value: statuses.length,
                    sub: 'Configured workflow checkpoints',
                    icon: Tag,
                    isActive: activeFilter === 'ALL',
                    onClick: () => setActiveFilter('ALL'),
                    activeRing: 'ring-blue-500 border-blue-500/50 bg-blue-500/5',
                    iconBg: 'bg-blue-600 text-white',
                    valColor: 'text-blue-600 dark:text-blue-400'
                  },
                  {
                    id: 'CUSTOMER_EMAIL',
                    label: 'Customer Notified',
                    value: customerNotifiedCount,
                    sub: 'Automated email dispatch active',
                    icon: CheckCircle2,
                    isActive: activeFilter === 'CUSTOMER_EMAIL',
                    onClick: () => setActiveFilter('CUSTOMER_EMAIL'),
                    activeRing: 'ring-emerald-500 border-emerald-500/50 bg-emerald-500/5',
                    iconBg: 'bg-emerald-600 text-white',
                    valColor: 'text-emerald-600 dark:text-emerald-400'
                  },
                  {
                    id: 'INTERNAL_ONLY',
                    label: 'Internal Fulfillment',
                    value: internalOnlyCount,
                    sub: 'Silent warehouse processing',
                    icon: Clock,
                    isActive: activeFilter === 'INTERNAL_ONLY',
                    onClick: () => setActiveFilter('INTERNAL_ONLY'),
                    activeRing: 'ring-amber-500 border-amber-500/50 bg-amber-500/5',
                    iconBg: 'bg-amber-600 text-white',
                    valColor: 'text-amber-600 dark:text-amber-400'
                  },
                  {
                    id: 'NOTIFICATION_RATE',
                    label: 'Customer Transparency',
                    value: `${statuses.length ? Math.round((customerNotifiedCount / statuses.length) * 100) : 0}%`,
                    sub: 'External customer communication rate',
                    icon: Send,
                    isActive: false,
                    onClick: () => { },
                    activeRing: '',
                    iconBg: 'bg-indigo-600 text-white',
                    valColor: 'text-indigo-600 dark:text-indigo-400'
                  }
                ].map(card => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.id}
                      onClick={card.onClick}
                      className={`p-4 rounded-xl border bg-card transition-all duration-200 cursor-pointer select-none hover:-translate-y-0.5 hover:shadow-md ${card.isActive
                          ? `${card.activeRing} ring-1 shadow-sm`
                          : 'border-border/80 hover:border-border'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          {card.label}
                        </span>
                        <div className={`w-7 h-7 rounded-lg ${card.iconBg} flex items-center justify-center shadow-xs`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className={`text-xl sm:text-2xl font-black ${card.valColor}`}>
                        {card.value}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {card.sub}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* ========================================================================= */}
              {/* 3. EXPLANATORY BANNER (Collapsible & Modernized)                          */}
              {/* ========================================================================= */}
              {showNotificationHelp && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200/80 dark:border-blue-900/40 flex items-start justify-between gap-3 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-600/15 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Info className="w-4 h-4" />
                    </div>
                    <div className="text-xs text-foreground space-y-1">
                      <strong className="font-extrabold text-blue-900 dark:text-blue-200 text-sm block">
                        Automated Customer Email Notification Logic
                      </strong>
                      <p className="text-muted-foreground leading-relaxed">
                        When a status has <strong>"Customer Email" enabled</strong>, the system triggers an automatic email to the customer the moment an order transitions into this stage.
                      </p>
                      <p className="text-muted-foreground leading-relaxed">
                        For <strong>Internal Warehouse Steps</strong> (e.g., bin picking, inventory reserve, packing audit), <strong>leave the email toggle off</strong> so internal operations remain completely invisible to the shopper.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNotificationHelp(false)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                    title="Dismiss notice"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ========================================================================= */}
              {/* 4. FILTER PILLS & STATUS COUNT                                           */}
              {/* ========================================================================= */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-muted/30 border border-border/80">
                  {[
                    { id: 'ALL', label: 'All Lifecycle Stages', count: statuses.length },
                    { id: 'CUSTOMER_EMAIL', label: 'Customer Notified', count: customerNotifiedCount },
                    { id: 'INTERNAL_ONLY', label: 'Internal Warehouse', count: internalOnlyCount },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 cursor-pointer flex items-center gap-2 ${activeFilter === tab.id
                          ? 'bg-background text-foreground shadow-xs border border-border/90'
                          : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                        }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${activeFilter === tab.id
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'bg-muted text-muted-foreground'
                        }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                  <span>Showing</span>
                  <span className="font-bold text-foreground">{filteredStatuses.length}</span>
                  <span>of {statuses.length} stages</span>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* 5. STATUSES MASTER TABLE                                                  */}
              {/* ========================================================================= */}
              <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
                {isLoading ? (
                  <div className="p-16 text-center space-y-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                    <p className="text-xs font-bold text-muted-foreground">Loading lifecycle statuses...</p>
                  </div>
                ) : filteredStatuses.length === 0 ? (
                  <div className="p-16 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
                      <Tag className="w-6 h-6" />
                    </div>
                    <h3 className="font-extrabold text-sm text-foreground">No Order Statuses Found</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      {searchQuery ? `No stages matched "${searchQuery}". Clear your search query or reset filter.` : 'Create your first custom order stage to streamline fulfillment progression.'}
                    </p>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => { setSearchQuery(''); setActiveFilter('ALL'); }}
                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        Reset Search Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border text-muted-foreground uppercase font-extrabold text-[10px] tracking-wider">
                          <th className="p-3.5 w-16 text-center">Seq</th>
                          <th className="p-3.5">Status Name & Code</th>
                          <th className="p-3.5">Badge Preview</th>
                          <th className="p-3.5 text-center">Customer Email</th>
                          <th className="p-3.5">Email Subject Template</th>
                          <th className="p-3.5 text-right pr-5">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {filteredStatuses.map((status, index) => {
                          const isToggling = togglingId === status._id;
                          const isEmailActive = Boolean(status.sendEmailToCustomer);

                          return (
                            <tr
                              key={status._id}
                              className="hover:bg-muted/25 transition-colors group"
                            >
                              {/* Sequence Order */}
                              <td className="p-3.5 text-center">
                                <div className="w-7 h-7 rounded-lg bg-muted/60 border border-border/80 flex items-center justify-center font-black text-xs text-muted-foreground mx-auto group-hover:bg-blue-500/10 group-hover:text-blue-600 group-hover:border-blue-500/30 transition-all">
                                  {status.order !== undefined ? status.order : index + 1}
                                </div>
                              </td>

                              {/* Name & Code */}
                              <td className="p-3.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-sm text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {status.name}
                                  </span>
                                  {status.isSystem && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                      System
                                    </span>
                                  )}
                                </div>
                                <div className="font-mono text-[10px] font-semibold text-muted-foreground tracking-wide mt-0.5">
                                  {status.code}
                                </div>
                              </td>

                              {/* Badge Preview */}
                              <td className="p-3.5">
                                <span
                                  className="px-3 py-1 rounded-full text-xs font-black uppercase text-white shadow-xs inline-flex items-center gap-1.5 tracking-wider transition-transform group-hover:scale-105"
                                  style={{
                                    backgroundColor: status.color || '#2563eb',
                                    boxShadow: `0 2px 8px -1px ${status.color ? status.color + '40' : 'rgba(37, 99, 235, 0.25)'}`
                                  }}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
                                  <span>{status.name}</span>
                                </span>
                              </td>

                              {/* Customer Email Quick Toggle */}
                              <td className="p-3.5 text-center">
                                <button
                                  type="button"
                                  disabled={isToggling}
                                  onClick={() => handleToggleEmail(status)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold transition-all duration-200 shadow-2xs cursor-pointer disabled:opacity-50 select-none hover:-translate-y-0.5 ${isEmailActive
                                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                                    }`}
                                  title="Click to toggle automated email notification"
                                >
                                  {isToggling ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : isEmailActive ? (
                                    <>
                                      <Mail size={12} className="text-emerald-600 dark:text-emerald-400" />
                                      <span>Yes (Emails Customer)</span>
                                    </>
                                  ) : (
                                    <>
                                      <MailX size={12} className="text-amber-600 dark:text-amber-400" />
                                      <span>No (Internal Only)</span>
                                    </>
                                  )}
                                </button>
                              </td>

                              {/* Email Subject Template */}
                              <td className="p-3.5 max-w-sm">
                                {isEmailActive ? (
                                  <div className="font-semibold text-foreground text-xs truncate" title={status.emailSubject}>
                                    {status.emailSubject || 'Order #{{orderId}} status update'}
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5 text-muted-foreground/75 text-[11px] italic">
                                    <Clock size={11} />
                                    <span>Email suppressed (internal step)</span>
                                  </div>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="p-3.5 text-right pr-5">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(status)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                                    title="Edit stage settings"
                                  >
                                    <Edit2 size={14} />
                                  </button>

                                  {!status.isSystem && (
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(status._id)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                      title="Delete stage"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ========================================================================= */}
              {/* 6. CREATE / EDIT STAGE MODAL (Help-Center Design Language)               */}
              {/* ========================================================================= */}
              <StatusModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                badge="Order Lifecycle Architecture"
                title={editingId ? 'Edit Order Lifecycle Stage' : 'Create New Lifecycle Stage'}
                subtitle="Configure stage identifiers, badge styling, and automated customer communication triggers."
                maxWidth="max-w-4xl"
                footer={
                  <>
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{editingId ? 'Save Changes' : 'Create Lifecycle Stage'}</span>
                    </button>
                  </>
                }
              >
                <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {/* ── LEFT COLUMN: Stage Identity & Visual Styling ── */}
                          <div className="space-y-3.5">
                            {/* Live Preview Box */}
                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-border flex items-center justify-between gap-3 shadow-2xs">
                              <div>
                                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block">
                                    Live Badge Preview
                                  </span>
                                  <p className="text-[11px] text-muted-foreground">
                                    Storefront & customer tracking view
                                  </p>
                              </div>
                              <span
                                className="px-3.5 py-1 rounded-full text-xs font-black uppercase text-white shadow-sm inline-flex items-center gap-1.5 tracking-wider transition-all"
                                style={{
                                  backgroundColor: formData.color || '#2563eb',
                                  boxShadow: `0 3px 12px -1px ${formData.color ? formData.color + '60' : 'rgba(37,99,235,0.35)'}`
                                }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-pulse" />
                                <span>{formData.name || 'STAGE NAME'}</span>
                              </span>
                            </div>

                            {/* Name & Code */}
                            <div>
                              <label className="block text-xs font-extrabold text-foreground mb-1.5">
                                Stage Display Name <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Processing, In Transit, Delivered"
                                value={formData.name}
                                onChange={e => {
                                  const val = e.target.value;
                                  setFormData({
                                    ...formData,
                                    name: val,
                                    code: editingId ? formData.code : val.toUpperCase().replace(/\s+/g, '_')
                                  });
                                }}
                                className="w-full h-9.5 px-3.5 rounded-xl border border-border bg-background text-foreground text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-border/90 transition-all"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-extrabold text-foreground mb-1.5">
                                Internal Identifier Code <span className="text-rose-500">*</span>
                              </label>
                <input
                                type="text"
                                required
                                placeholder="e.g. PROCESSING_STAGE"
                                value={formData.code}
                                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                                className="w-full h-9.5 px-3.5 rounded-xl border border-border bg-background text-foreground text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-border/90 transition-all uppercase"
                              />
                            </div>

                            {/* Sequence Order & Badge Color */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-extrabold text-foreground mb-1.5">
                                  Sequence Order
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={formData.order}
                                  onChange={e => setFormData({ ...formData, order: Number(e.target.value) })}
                                  className="w-full h-9.5 px-3.5 rounded-xl border border-border bg-background text-foreground text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-border/90 transition-all"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-extrabold text-foreground mb-1.5">
                                  Badge Theme Color
                                </label>
                                <div className="relative flex items-center gap-2">
                                  <div
                                    className="w-9.5 h-9.5 rounded-xl border border-border/80 shadow-2xs shrink-0 cursor-pointer overflow-hidden relative flex items-center justify-center hover:scale-105 transition-transform"
                                    style={{ backgroundColor: formData.color || '#2563eb' }}
                                  >
                                    <input
                                      type="color"
                                      value={formData.color}
                                      onChange={e => setFormData({ ...formData, color: e.target.value })}
                                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                      title="Pick custom color"
                                    />
                                  </div>
                                  <input
                                    type="text"
                                    value={formData.color}
                                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                                    className="w-full h-9.5 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-border/90 transition-all uppercase"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Color Presets */}
                            <div>
                                <span className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider block mb-1.5">
                                  Quick Color Presets
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {
                                      COLOR_PRESETS.map(preset => (
                                        <button
                                          key={preset.hex}
                                          type="button"
                                          onClick={() => setFormData({ ...formData, color: preset.hex })}
                                          className={`w-6 h-6 rounded-full transition-all duration-200 cursor-pointer border flex items-center justify-center ${formData.color?.toLowerCase() === preset.hex.toLowerCase()
                                              ? 'ring-2 ring-blue-500 scale-110 border-white shadow-xs'
                                              : 'border-border/80 hover:scale-110'
                                            }`}
                                          style={{ backgroundColor: preset.hex }}
                                          title={preset.name}
                                        >
                                          {formData.color?.toLowerCase() === preset.hex.toLowerCase() && (
                                            <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" />
                                          )}
                                        </button>
                                      ))
                                    }
                </div>
                            </div>
                          </div>

                        {/* ── RIGHT COLUMN: Email Notification Automation ── */}
                        <div className="space-y-3.5 flex flex-col justify-start">
                          {/* Automated Customer Email Toggle Card */}
                          <div
                            onClick={() => setFormData({ ...formData, sendEmailToCustomer: !formData.sendEmailToCustomer })}
                            className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none ${formData.sendEmailToCustomer
                                ? 'bg-blue-500/[0.08] border-blue-500/40 shadow-2xs'
                                : 'bg-muted/30 border-border/70 hover:border-border'
                              }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0 ${formData.sendEmailToCustomer ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'
                                  }`}>
                                  <Mail size={15} />
                                </div>
                                <div>
                                  <h4 className="font-extrabold text-xs text-foreground">
                                    Customer Email Notification
                                  </h4>
                                  <p className="text-[11px] text-muted-foreground">
                                    {formData.sendEmailToCustomer ? 'Triggers email when order moves here' : 'Email suppressed (internal only)'}
                                  </p>
                                </div>
                              </div>

                              {/* iOS Style Toggle Switch */}
                              <div className={`relative inline-flex h-5.5 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out cursor-pointer ${formData.sendEmailToCustomer ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                                }`}>
                                <span className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${formData.sendEmailToCustomer ? 'translate-x-4.5' : 'translate-x-0'
                                  }`} />
                              </div>
                            </div>
                          </div>

                          {/* Conditional Email Subject & Body Message */}
                          {formData.sendEmailToCustomer ? (
                            <div className="space-y-3 pt-1 ecom-slide-up">
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="text-xs font-extrabold text-foreground">
                                    Email Subject Line Template
                                  </label>
                                  <span className="text-[10px] text-muted-foreground">Dynamic tokens allowed</span>
                                </div>
                                <input
                                  type="text"
                                  placeholder="e.g. Your Order #{{orderId}} is In Transit!"
                                  value={formData.emailSubject}
                                  onChange={e => setFormData({ ...formData, emailSubject: e.target.value })}
                                  className="w-full h-9.5 px-3.5 rounded-xl border border-border bg-background text-foreground text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-border/90 transition-all"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-extrabold text-foreground mb-1.5">
                                  Email Body Content Summary
                                </label>
                                <textarea
                                  rows={2}
                                  placeholder="e.g. Great news! Your order has transitioned to {{statusName}} and is on schedule."
                                  value={formData.emailTemplate}
                                  onChange={e => setFormData({ ...formData, emailTemplate: e.target.value })}
                                  className="w-full p-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-border/90 transition-all resize-none"
                                />
                              </div>

                              {/* Dynamic Variables Chips */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">
                                    Dynamic Tokens
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">Click token to insert into subject</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {TEMPLATE_VARIABLES.map(v => (
                                    <button
                                      key={v.tag}
                                      type="button"
                                      onClick={() => insertVariable('emailSubject', v.tag)}
                                      className="px-2 py-0.8 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/20 text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                                      title={`Insert ${v.desc}`}
                                    >
                                      <span>{v.tag}</span>
                                      <span className="text-[9px] text-muted-foreground opacity-75">({v.desc})</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* When toggle is off: Helpful Internal Stage card */
                            <div className="p-4 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs space-y-2 ecom-slide-up">
                              <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-300">
                                <ShieldCheck size={16} />
                                <span>Silent Internal Fulfillment Stage</span>
                              </div>
                              <p className="text-muted-foreground text-[11px] leading-relaxed">
                                Customer notifications are <strong>suppressed</strong> for this stage. This is optimal for warehouse bin picking, quality inspection, or dispatch staging.
                              </p>
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, sendEmailToCustomer: true })}
                                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1 mt-1"
                              >
                                <span>Click to turn on customer email notification</span>
                                <span>→</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </form>
                  </StatusModal>
                </div>
                );
};

                export default EcomStatusMaster;

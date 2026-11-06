import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { 
  Truck, Plus, Edit2, Trash2, ExternalLink, Globe, Phone, 
  Mail, CheckCircle2, AlertCircle, Copy, Check, Search, X, 
  Sparkles, RefreshCw, Star, Compass, ShieldCheck, ArrowRight,
  Info, FileText, Send, Layers, HelpCircle
} from 'lucide-react';

/* ─── Keyframe Animations & Hover Utility Styles ─── */
const ANIMATION_STYLES = `
  @keyframes ecomModalBackdrop { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ecomModalPop {
    0% { opacity: 0; transform: scale(0.93) translateY(16px); }
    70% { opacity: 1; transform: scale(1.01) translateY(-2px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes ecomSlideUpFade { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
  @keyframes ecomFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ecomPulseGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.45); }
    50% { box-shadow: 0 0 0 8px rgba(37, 99, 235, 0); }
  }
  @keyframes ecomShimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .ecom-fade-in { animation: ecomFadeIn 0.3s ease-out; }
  .ecom-modal-backdrop { animation: ecomModalBackdrop 0.22s ease-out forwards; }
  .ecom-modal-pop { animation: ecomModalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .ecom-slide-up { animation: ecomSlideUpFade 0.26s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
  .ecom-pulse-glow { animation: ecomPulseGlow 2.5s infinite; }
  .ecom-btn-hover {
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .ecom-btn-hover:hover {
    transform: translateY(-1.5px);
  }
  .ecom-btn-hover:active {
    transform: scale(0.96);
  }
`;

/* ─── Popular Courier Presets ─── */
const POPULAR_CARRIER_PRESETS = [
  {
    name: 'Blue Dart Express',
    code: 'BLUEDART',
    url: 'https://www.bluedart.com/tracking?pin={{trackingNumber}}',
    phone: '1860 233 1234',
    website: 'https://www.bluedart.com',
    color: '#00529b'
  },
  {
    name: 'Delhivery',
    code: 'DELHIVERY',
    url: 'https://www.delhivery.com/track/package/{{trackingNumber}}',
    phone: '0124 671 9500',
    website: 'https://www.delhivery.com',
    color: '#e53935'
  },
  {
    name: 'DTDC Express',
    code: 'DTDC',
    url: 'https://www.dtdc.in/tracking/shipment-tracking.asp?strTrackingNo={{trackingNumber}}',
    phone: '080 2536 5032',
    website: 'https://www.dtdc.in',
    color: '#d32f2f'
  },
  {
    name: 'FedEx Express',
    code: 'FEDEX',
    url: 'https://www.fedex.com/fedextrack/?trknbr={{trackingNumber}}',
    phone: '1800 209 6161',
    website: 'https://www.fedex.com',
    color: '#4d148c'
  },
  {
    name: 'DHL Express',
    code: 'DHL',
    url: 'https://www.dhl.com/en/express/tracking.html?AWB={{trackingNumber}}',
    phone: '1800 111 345',
    website: 'https://www.dhl.com',
    color: '#d40511'
  },
  {
    name: 'Shadowfax',
    code: 'SHADOWFAX',
    url: 'https://tracker.shadowfax.in/#/track?orderId={{trackingNumber}}',
    phone: '080 6817 2518',
    website: 'https://www.shadowfax.in',
    color: '#ff9800'
  },
  {
    name: 'Xpressbees',
    code: 'XPRESSBEES',
    url: 'https://www.xpressbees.com/shipment/tracking?awbNo={{trackingNumber}}',
    phone: '020 4911 1900',
    website: 'https://www.xpressbees.com',
    color: '#f57c00'
  },
  {
    name: 'India Post Speed Post',
    code: 'INDIAPOST',
    url: 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?consNo={{trackingNumber}}',
    phone: '1800 266 6868',
    website: 'https://www.indiapost.gov.in',
    color: '#c62828'
  },
  {
    name: 'Aramex',
    code: 'ARAMEX',
    url: 'https://www.aramex.com/track/results?mode=0&ShipmentNumber={{trackingNumber}}',
    phone: '022 6480 3300',
    website: 'https://www.aramex.com',
    color: '#d8232a'
  }
];

/* ─── Sample AWB Presets for Quick Testing ─── */
const SAMPLE_AWB_PRESETS = [
  '1234567890',
  'AWB-987654321',
  'TRACK-889900',
  'BD-77112233'
];

/* ─── Modern Portal Modal Component ─── */
const LogisticsModal = ({ isOpen, onClose, title, subtitle, badge, children, footer, maxWidth = 'max-w-4xl' }) => {
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

const EcomLogisticsMapping = () => {
  const [carriers, setCarriers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [testAwb, setTestAwb] = useState('1234567890');
  const [copiedId, setCopiedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'DEFAULT' | 'ACTIVE'
  const [settingDefaultId, setSettingDefaultId] = useState(null);

  const [formData, setFormData] = useState({
    carrierName: '',
    carrierCode: '',
    trackingUrlTemplate: '',
    contactPhone: '',
    contactEmail: '',
    websiteUrl: '',
    notes: '',
    isDefault: false,
    isActive: true
  });

  useEffect(() => {
    fetchCarriers();
  }, []);

  const fetchCarriers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/api/v1/ecommerce-admin/logistics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCarriers(data || []);
    } catch (error) {
      console.error('Failed to fetch logistics partners:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreate = (prefill = null) => {
    setEditingId(null);
    if (prefill) {
      setFormData({
        carrierName: prefill.name || '',
        carrierCode: prefill.code || '',
        trackingUrlTemplate: prefill.url || '',
        contactPhone: prefill.phone || '',
        contactEmail: '',
        websiteUrl: prefill.website || '',
        notes: '',
        isDefault: carriers.length === 0,
        isActive: true
      });
    } else {
      setFormData({
        carrierName: '',
        carrierCode: '',
        trackingUrlTemplate: '',
        contactPhone: '',
        contactEmail: '',
        websiteUrl: '',
        notes: '',
        isDefault: carriers.length === 0,
        isActive: true
      });
    }
    setModalOpen(true);
  };

  const handleOpenEdit = (carrier) => {
    setEditingId(carrier._id);
    setFormData({
      carrierName: carrier.carrierName || '',
      carrierCode: carrier.carrierCode || '',
      trackingUrlTemplate: carrier.trackingUrlTemplate || '',
      contactPhone: carrier.contactPhone || '',
      contactEmail: carrier.contactEmail || '',
      websiteUrl: carrier.websiteUrl || '',
      notes: carrier.notes || '',
      isDefault: Boolean(carrier.isDefault),
      isActive: carrier.isActive !== false
    });
    setModalOpen(true);
  };

  const applyPreset = (preset) => {
    setFormData(prev => ({
      ...prev,
      carrierName: preset.name,
      carrierCode: preset.code,
      trackingUrlTemplate: preset.url,
      contactPhone: preset.phone,
      websiteUrl: preset.website
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.trackingUrlTemplate.includes('{{trackingNumber}}')) {
      alert('The tracking URL template must contain the dynamic placeholder {{trackingNumber}}');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (editingId) {
        await axios.put(`/api/v1/ecommerce-admin/logistics/${editingId}`, formData, { headers });
      } else {
        await axios.post('/api/v1/ecommerce-admin/logistics', formData, { headers });
      }

      setModalOpen(false);
      fetchCarriers();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save carrier partner');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name || 'this carrier'}"?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/ecommerce-admin/logistics/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCarriers();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete carrier partner');
    }
  };

  const handleSetDefault = async (carrier) => {
    if (carrier.isDefault) return;
    setSettingDefaultId(carrier._id);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/v1/ecommerce-admin/logistics/${carrier._id}`, {
        ...carrier,
        isDefault: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCarriers();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update default carrier partner');
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleToggleActive = async (carrier) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/v1/ecommerce-admin/logistics/${carrier._id}`, {
        ...carrier,
        isActive: !carrier.isActive
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCarriers();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to toggle carrier status');
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // KPI Metrics
  const defaultCarrier = useMemo(() => {
    return carriers.find(c => c.isDefault) || null;
  }, [carriers]);

  const activeCarriersCount = useMemo(() => {
    return carriers.filter(c => c.isActive !== false).length;
  }, [carriers]);

  // Filtered Carriers
  const filteredCarriers = useMemo(() => {
    return carriers.filter(c => {
      // Tab filter
      if (activeFilter === 'DEFAULT' && !c.isDefault) return false;
      if (activeFilter === 'ACTIVE' && c.isActive === false) return false;

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = (c.carrierName || '').toLowerCase().includes(query);
        const codeMatch = (c.carrierCode || '').toLowerCase().includes(query);
        const urlMatch = (c.trackingUrlTemplate || '').toLowerCase().includes(query);
        const phoneMatch = (c.contactPhone || '').toLowerCase().includes(query);
        const websiteMatch = (c.websiteUrl || '').toLowerCase().includes(query);
        return nameMatch || codeMatch || urlMatch || phoneMatch || websiteMatch;
      }
      return true;
    });
  }, [carriers, activeFilter, searchQuery]);

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-[1600px] mx-auto ecom-fade-in">
      <style>{ANIMATION_STYLES}</style>

      {/* ========================================================================= */}
      {/* 1. SLIM OBSIDIAN HERO HEADER                                              */}
      {/* ========================================================================= */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white px-6 py-5 shadow-lg border border-white/10">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-300 text-[10px] font-bold tracking-wider uppercase mb-2">
              <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />
              <span>JTS Storefront • Logistics & Fulfillment Integration</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
              Logistics & Courier Mapping
            </h1>
            <p className="text-slate-300 text-xs mt-1 leading-relaxed">
              Map courier partners, define dynamic tracking URL templates, and automate real-time order tracking notifications.
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
                placeholder="Search carrier, code, URL..."
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
              onClick={() => handleOpenCreate()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white font-bold text-xs shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Carrier Partner</span>
            </button>

            <button
              type="button"
              onClick={fetchCarriers}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer shrink-0"
              title="Refresh Carriers"
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
            label: 'Total Carriers',
            value: carriers.length,
            sub: 'Configured courier integrations',
            icon: Truck,
            isActive: activeFilter === 'ALL',
            onClick: () => setActiveFilter('ALL'),
            activeRing: 'ring-blue-500 border-blue-500/50 bg-blue-500/5',
            iconBg: 'bg-blue-600 text-white',
            valColor: 'text-blue-600 dark:text-blue-400'
          },
          {
            id: 'DEFAULT',
            label: 'Default Partner',
            value: defaultCarrier ? defaultCarrier.carrierName : 'Not Set',
            sub: defaultCarrier ? `Default Code: ${defaultCarrier.carrierCode}` : 'Select a primary carrier below',
            icon: Star,
            isActive: activeFilter === 'DEFAULT',
            onClick: () => setActiveFilter('DEFAULT'),
            activeRing: 'ring-amber-500 border-amber-500/50 bg-amber-500/5',
            iconBg: 'bg-amber-600 text-white',
            valColor: 'text-amber-600 dark:text-amber-400 text-lg truncate'
          },
          {
            id: 'ACTIVE',
            label: 'Active Dispatches',
            value: activeCarriersCount,
            sub: 'Ready for AWB assignment',
            icon: CheckCircle2,
            isActive: activeFilter === 'ACTIVE',
            onClick: () => setActiveFilter('ACTIVE'),
            activeRing: 'ring-emerald-500 border-emerald-500/50 bg-emerald-500/5',
            iconBg: 'bg-emerald-600 text-white',
            valColor: 'text-emerald-600 dark:text-emerald-400'
          },
          {
            id: 'COVERAGE',
            label: 'Dynamic Tracking',
            value: `${carriers.length ? Math.round((carriers.filter(c => c.trackingUrlTemplate?.includes('{{trackingNumber}}')).length / carriers.length) * 100) : 100}%`,
            sub: 'Template placeholder compliance',
            icon: Compass,
            isActive: false,
            onClick: () => {},
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
              className={`p-4 rounded-xl border bg-card transition-all duration-200 cursor-pointer select-none hover:-translate-y-0.5 hover:shadow-md ${
                card.isActive
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
      {/* 3. INTERACTIVE TRACKING WORKBENCH & PRESET BAR                             */}
      {/* ========================================================================= */}
      <div className="bg-card rounded-2xl border border-border p-4.5 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="space-y-1 max-w-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-foreground">
                Interactive Tracking Link Simulator
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter any sample Waybill / AWB to preview exactly how tracking URLs will be resolved in customer notifications and admin tracking views.
            </p>
          </div>

          {/* Normal Standard Input Box + Presets */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="awb-test-input" className="text-xs font-bold text-foreground shrink-0">
                Sample AWB:
              </label>
              <div className="relative w-56 sm:w-64 shrink-0">
                <input
                  id="awb-test-input"
                  type="text"
                  value={testAwb}
                  onChange={e => setTestAwb(e.target.value)}
                  placeholder="e.g. 1234567890"
                  className="w-full h-10 px-3.5 pr-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm font-bold placeholder:text-muted-foreground/60 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 shadow-2xs transition-all duration-200"
                />
                {testAwb && (
                  <button
                    type="button"
                    onClick={() => setTestAwb('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Clear tracking number"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick AWB Preset Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-muted-foreground mr-0.5">Try:</span>
              {SAMPLE_AWB_PRESETS.map(sample => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setTestAwb(sample)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all duration-200 cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${
                    testAwb === sample
                      ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-500'
                      : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/80'
                  }`}
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Courier Preset Bar */}
        <div className="pt-3 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
            <span>Instant Carrier Presets:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {POPULAR_CARRIER_PRESETS.map(preset => (
              <button
                key={preset.code}
                type="button"
                onClick={() => handleOpenCreate(preset)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-muted/40 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 border border-border/80 hover:border-blue-500/30 transition-all duration-200 cursor-pointer hover:scale-105 hover:-translate-y-0.5 active:scale-95 shadow-2xs"
                title={`Quickly load ${preset.name}`}
              >
                <span className="w-2 h-2 rounded-full shadow-2xs" style={{ backgroundColor: preset.color || '#2563eb' }} />
                <span>{preset.name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">({preset.code})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. FILTER PILLS & STATUS COUNT                                           */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-muted/30 border border-border/80">
          {[
            { id: 'ALL', label: 'All Courier Partners', count: carriers.length },
            { id: 'DEFAULT', label: 'Default Primary', count: defaultCarrier ? 1 : 0 },
            { id: 'ACTIVE', label: 'Active Partners', count: activeCarriersCount },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                activeFilter === tab.id
                  ? 'bg-background text-foreground shadow-xs border border-border/90'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                activeFilter === tab.id
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
          <span className="font-bold text-foreground">{filteredCarriers.length}</span>
          <span>of {carriers.length} courier partners</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. CARRIER PARTNERS MASTER TABLE                                          */}
      {/* ========================================================================= */}
      <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
            <p className="text-xs font-bold text-muted-foreground">Loading courier integrations...</p>
          </div>
        ) : filteredCarriers.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-sm text-foreground">No Courier Partners Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery ? `No partners matched "${searchQuery}". Clear your search or reset filter.` : 'Add your first third-party courier partner to automate live tracking links.'}
            </p>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setActiveFilter('ALL'); }}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Reset Search Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenCreate(POPULAR_CARRIER_PRESETS[0])}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Load Blue Dart Preset</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground uppercase font-extrabold text-[10px] tracking-wider">
                  <th className="p-3.5">Carrier Partner</th>
                  <th className="p-3.5">Tracking URL Template</th>
                  <th className="p-3.5">Live Resolved Link (Preview)</th>
                  <th className="p-3.5">Customer Support & Website</th>
                  <th className="p-3.5 text-center">Default Partner</th>
                  <th className="p-3.5 text-right pr-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredCarriers.map(c => {
                  const sampleUrl = (c.trackingUrlTemplate || '').replace(/\{\{trackingNumber\}\}/g, testAwb || '1234567890');
                  const isCopiedTemplate = copiedId === `tpl-${c._id}`;
                  const isCopiedSample = copiedId === `smp-${c._id}`;
                  const isSettingDefault = settingDefaultId === c._id;

                  return (
                    <tr
                      key={c._id}
                      className="hover:bg-muted/25 transition-colors group"
                    >
                      {/* Carrier Name & Code */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                            c.isDefault 
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400' 
                              : 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400 group-hover:scale-105'
                          }`}>
                            <Truck size={17} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-sm text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {c.carrierName}
                              </span>
                              {c.isDefault && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                  <Star size={9} className="fill-amber-500 text-amber-500" />
                                  <span>Default</span>
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[10px] font-bold text-muted-foreground tracking-wide mt-0.5">
                              {c.carrierCode}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Tracking URL Template */}
                      <td className="p-3.5 max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <div 
                            className="font-mono text-[11px] text-muted-foreground truncate bg-muted/60 px-2.5 py-1 rounded-lg border border-border/80 max-w-[260px]"
                            title={c.trackingUrlTemplate}
                          >
                            {c.trackingUrlTemplate}
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(c.trackingUrlTemplate, `tpl-${c._id}`)}
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
                            title="Copy URL Template"
                          >
                            {isCopiedTemplate ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      {/* Live Resolved Link */}
                      <td className="p-3.5 max-w-sm">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={sampleUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold hover:underline truncate max-w-[260px] text-xs"
                            title={sampleUrl}
                          >
                            <ExternalLink size={12} className="shrink-0" />
                            <span className="truncate">{sampleUrl}</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(sampleUrl, `smp-${c._id}`)}
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
                            title="Copy Resolved URL"
                          >
                            {isCopiedSample ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      {/* Support Phone & Website */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          {c.contactPhone ? (
                            <a 
                              href={`tel:${c.contactPhone}`}
                              className="flex items-center gap-1.5 text-xs text-foreground hover:text-blue-600 transition-colors"
                              title="Call support"
                            >
                              <Phone size={11} className="text-blue-500 shrink-0" />
                              <span className="font-semibold">{c.contactPhone}</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground/60 text-[11px] italic">No phone listed</span>
                          )}

                          {c.websiteUrl && (
                            <a
                              href={c.websiteUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-blue-600 hover:underline transition-colors truncate max-w-[180px]"
                              title={c.websiteUrl}
                            >
                              <Globe size={11} className="text-blue-500 shrink-0" />
                              <span className="truncate">{c.websiteUrl.replace(/^https?:\/\//, '')}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Default Partner Status */}
                      <td className="p-3.5 text-center">
                        {c.isDefault ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-2xs">
                            <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                            <span>Primary Default</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isSettingDefault}
                            onClick={() => handleSetDefault(c)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border transition-all cursor-pointer disabled:opacity-50"
                            title="Click to set as primary default courier"
                          >
                            {isSettingDefault ? 'Setting...' : 'Make Default'}
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right pr-5">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={sampleUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                            title="Test tracking link in new tab"
                          >
                            <ExternalLink size={14} />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                            title="Edit carrier settings"
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(c._id, c.carrierName)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete carrier"
                          >
                            <Trash2 size={14} />
                          </button>
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
      {/* 6. CREATE / EDIT CARRIER MODAL (Obsidian 2-Column Responsive Layout)       */}
      {/* ========================================================================= */}
      <LogisticsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        badge="Logistics Architecture"
        title={editingId ? 'Edit Logistics Carrier Partner' : 'Add New Courier Partner'}
        subtitle="Configure third-party carrier mapping, tracking URL placeholders, and customer dispatch options."
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
              <span>{editingId ? 'Save Carrier Changes' : 'Register Carrier Partner'}</span>
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Quick Preset Selector */}
          {!editingId && (
            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                  Quick Load Popular Carrier Template
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground">Click any preset to autofill</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {POPULAR_CARRIER_PRESETS.map(preset => (
                  <button
                    key={preset.code}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 hover:border-blue-500/40 transition-all duration-200 cursor-pointer shadow-2xs hover:scale-105 hover:-translate-y-0.5 active:scale-95"
                  >
                    <span className="w-2 h-2 rounded-full shadow-2xs" style={{ backgroundColor: preset.color || '#2563eb' }} />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* ── LEFT COLUMN: Carrier Identity & URL ── */}
            <div className="space-y-4">
              {/* Carrier Name */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-foreground mb-1.5">
                  Carrier Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative group">
                  <Truck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 w-4.5 h-4.5 pointer-events-none transition-colors" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Blue Dart Express, Delhivery"
                    value={formData.carrierName}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        carrierName: val,
                        carrierCode: editingId ? formData.carrierCode : val.toUpperCase().replace(/\s+/g, '_')
                      });
                    }}
                    className="w-full h-11 sm:h-12 pl-11 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-background text-foreground text-sm font-semibold placeholder:text-muted-foreground/60 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 shadow-2xs transition-all duration-200"
                  />
                </div>
              </div>

              {/* Carrier Code */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-foreground mb-1.5">
                  Carrier Identifier Code <span className="text-rose-500">*</span>
                </label>
                <div className="relative group">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm font-black text-muted-foreground group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 pointer-events-none transition-colors">
                    #
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BLUEDART, FEDEX"
                    value={formData.carrierCode}
                    onChange={e => setFormData({ ...formData, carrierCode: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                    className="w-full h-11 sm:h-12 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-background text-foreground text-sm font-mono font-bold placeholder:text-muted-foreground/60 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 shadow-2xs transition-all duration-200 uppercase"
                  />
                </div>
              </div>

              {/* Tracking URL Template */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                    Tracking URL Template <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!formData.trackingUrlTemplate.includes('{{trackingNumber}}')) {
                        setFormData({
                          ...formData,
                          trackingUrlTemplate: `${formData.trackingUrlTemplate}{{trackingNumber}}`
                        });
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-mono text-[11px] font-bold transition-all duration-200 cursor-pointer flex items-center gap-1 active:scale-95 shadow-2xs"
                  >
                    <span>+ Insert &#123;&#123;trackingNumber&#125;&#125;</span>
                  </button>
                </div>
                <div className="relative group">
                  <ExternalLink className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 w-4 h-4 pointer-events-none transition-colors" />
                  <input
                    type="text"
                    required
                    placeholder="https://example.com/track?awb={{trackingNumber}}"
                    value={formData.trackingUrlTemplate}
                    onChange={e => setFormData({ ...formData, trackingUrlTemplate: e.target.value })}
                    className="w-full h-11 sm:h-12 pl-11 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-background text-foreground text-xs sm:text-sm font-mono font-semibold placeholder:text-muted-foreground/60 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 shadow-2xs transition-all duration-200"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <span>Must include token</span>
                  <code className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900/50">&#123;&#123;trackingNumber&#125;&#125;</code>
                  <span>for dynamic AWB injection.</span>
                </p>
              </div>

              {/* Dynamic Live Preview Box */}
              {formData.trackingUrlTemplate && (
                <div className="p-3.5 rounded-xl bg-blue-500/[0.07] border border-blue-500/25 space-y-1.5 ecom-slide-up shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-300 tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-blue-500 animate-pulse" />
                      Dynamic Live URL Preview
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">AWB: {testAwb || '1234567890'}</span>
                  </div>
                  <p className="font-mono text-xs text-foreground font-semibold truncate bg-background/90 p-2.5 rounded-lg border border-blue-200 dark:border-blue-900/50">
                    {formData.trackingUrlTemplate.replace(/\{\{trackingNumber\}\}/g, testAwb || '1234567890')}
                  </p>
                </div>
              )}
            </div>

            {/* ── RIGHT COLUMN: Contact Info & Dispatch Options ── */}
            <div className="space-y-4">
              {/* Customer Phone */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-foreground mb-1.5">
                  Customer Support Toll-Free / Phone
                </label>
                <div className="relative group">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 w-4 h-4 pointer-events-none transition-colors" />
                  <input
                    type="text"
                    placeholder="e.g. 1800 233 1234"
                    value={formData.contactPhone}
                    onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full h-11 sm:h-12 pl-11 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-background text-foreground text-sm font-semibold placeholder:text-muted-foreground/60 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 shadow-2xs transition-all duration-200"
                  />
                </div>
              </div>

              {/* Official Website */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-foreground mb-1.5">
                  Official Tracking Portal / Website URL
                </label>
                <div className="relative group">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 w-4 h-4 pointer-events-none transition-colors" />
                  <input
                    type="text"
                    placeholder="e.g. https://www.bluedart.com"
                    value={formData.websiteUrl}
                    onChange={e => setFormData({ ...formData, websiteUrl: e.target.value })}
                    className="w-full h-11 sm:h-12 pl-11 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-background text-foreground text-sm font-semibold placeholder:text-muted-foreground/60 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 shadow-2xs transition-all duration-200"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-foreground mb-1.5">
                  Internal Dispatch Notes / Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Used primarily for express North-East air shipments; pickup scheduled at 4 PM daily."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-background text-foreground text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 shadow-2xs transition-all duration-200 resize-none"
                />
              </div>

              {/* Default Partner Toggle Card */}
              <div
                onClick={() => setFormData({ ...formData, isDefault: !formData.isDefault })}
                className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none hover:-translate-y-0.5 ${
                  formData.isDefault
                    ? 'bg-amber-500/[0.08] border-amber-500/40 shadow-xs'
                    : 'bg-muted/30 border-border/70 hover:border-border'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                      formData.isDefault ? 'bg-amber-500 text-white shadow-xs' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Star size={17} className={formData.isDefault ? 'fill-white' : ''} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-foreground">
                        Primary Default Courier Partner
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Auto-assigned to new e-commerce fulfillment orders
                      </p>
                    </div>
                  </div>

                  {/* iOS Style Toggle Switch */}
                  <div className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out cursor-pointer ${
                    formData.isDefault ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}>
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      formData.isDefault ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </LogisticsModal>
    </div>
  );
};

export default EcomLogisticsMapping;

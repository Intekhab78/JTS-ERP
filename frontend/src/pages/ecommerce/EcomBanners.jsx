import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { FloatingMenu } from '../../components/common/FloatingMenu';
import {
  Image as ImageIcon, Plus, Edit2, Trash2, CheckCircle2, Clock,
  ArrowUpRight, Sparkles, Upload, Link as LinkIcon, Info, X, Save,
  Eye, EyeOff, ExternalLink, FileCheck, MoreVertical, Search,
  RefreshCw, Layers, LayoutGrid
} from 'lucide-react';

/* ─── Keyframe Animations Style Block (shared look with Product Media page) ─── */
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

/* Help-Center Aesthetic Modal Wrapper (identical to Product Media modal) */
const HelpStyleModal = ({ isOpen, onClose, badge, title, subtitle, maxWidth = 'max-w-2xl', children, footer }) => {
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
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col flex-1 min-h-0 bg-card text-foreground rounded-b-2xl overflow-hidden">
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full">
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

export const EcomBanners = () => {
  const [banners, setBanners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [previewBanner, setPreviewBanner] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filters & Navigation
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'DRAFT'
  const [selectedPlacement, setSelectedPlacement] = useState('ALL');
  const [showCarouselPreview, setShowCarouselPreview] = useState(true);

  // Three-dot menu state
  const [openMenuId, setOpenMenuId] = useState(null);
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

  // Image upload state inside modal
  const [imageUploadMode, setImageUploadMode] = useState('upload'); // 'upload' | 'url'
  const [imageFileName, setImageFileName] = useState('');
  const [imageFileSize, setImageFileSize] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    badge: '',
    hoverText: '',
    imageUrl: '',
    buttonText: 'Shop Now',
    linkUrl: '/catalog',
    placement: 'HERO_CAROUSEL',
    gradient: 'from-slate-950 via-blue-950 to-slate-900',
    order: 1,
    isActive: true
  });

  // Preset destination links for easy setup
  const QUICK_LINKS = [
    { label: 'All Catalog Products', path: '/catalog' },
    { label: 'Laptops & Computers', path: '/catalog?category=Computers' },
    { label: 'Smartphones & Mobiles', path: '/catalog?category=Smartphones' },
    { label: 'Workstations & Desktops', path: '/catalog?category=Workstations' },
    { label: 'Peripherals & Accessories', path: '/catalog?category=Accessories' },
    { label: 'Flash Sale & Limited Deals', path: '/catalog?filter=deals' },
    { label: 'New Arrivals', path: '/catalog?sort=newest' },
  ];

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/api/v1/ecommerce-admin/banners', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBanners(data || []);
    } catch (err) {
      console.error('Failed to fetch banners:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (banner = null) => {
    setOpenMenuId(null);
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        title: banner.title || '',
        subtitle: banner.subtitle || '',
        badge: banner.badge || '',
        hoverText: banner.hoverText || '',
        imageUrl: banner.imageUrl || '',
        buttonText: banner.buttonText || 'Shop Now',
        linkUrl: banner.linkUrl || '/catalog',
        placement: banner.placement || 'HERO_CAROUSEL',
        gradient: banner.gradient || 'from-slate-950 via-blue-950 to-slate-900',
        order: banner.order !== undefined ? banner.order : 1,
        isActive: banner.isActive !== false
      });
      setImageFileName((banner.imageUrl || '').startsWith('data:') ? 'Uploaded Image' : (banner.imageUrl || '').split('/').pop() || '');
      setImageFileSize('');
      setImageUploadMode((banner.imageUrl || '').startsWith('data:') ? 'upload' : 'url');
    } else {
      setEditingBanner(null);
      setFormData({
        title: '',
        subtitle: '',
        badge: '',
        hoverText: '',
        imageUrl: '',
        buttonText: 'Shop Now',
        linkUrl: '/catalog',
        placement: 'HERO_CAROUSEL',
        gradient: 'from-slate-950 via-blue-950 to-slate-900',
        order: banners.length + 1,
        isActive: true
      });
      setImageFileName('');
      setImageFileSize('');
      setImageUploadMode('upload');
    }
    setIsModalOpen(true);
  };

  // Image File Processing & Client Compression
  const handleProcessImageFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, JPEG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const maxWidth = 1600;
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setFormData(prev => ({ ...prev, imageUrl: compressedDataUrl }));
        setImageFileName(file.name);
        setImageFileSize(`${(file.size / 1024).toFixed(1)} KB`);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.imageUrl) {
      alert('Banner Title and Banner Image are required!');
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (editingBanner) {
        await axios.put(`/api/v1/ecommerce-admin/banners/${editingBanner._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/v1/ecommerce-admin/banners', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setIsModalOpen(false);
      fetchBanners();
    } catch (err) {
      console.error('Save banner error:', err);
      alert(err.response?.data?.message || 'Failed to save banner');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setOpenMenuId(null);
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/ecommerce-admin/banners/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (previewBanner && previewBanner._id === id) setPreviewBanner(null);
      fetchBanners();
    } catch (err) {
      console.error('Delete banner error:', err);
    }
  };

  const handleToggleStatus = async (banner) => {
    setOpenMenuId(null);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/v1/ecommerce-admin/banners/${banner._id}`, { isActive: !banner.isActive }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (previewBanner && previewBanner._id === banner._id) {
        setPreviewBanner(prev => ({ ...prev, isActive: !banner.isActive }));
      }
      fetchBanners();
    } catch (err) {
      console.error('Toggle banner error:', err);
    }
  };

  // KPIs
  const totalCount = banners.length;
  const activeCount = banners.filter(b => b.isActive).length;
  const draftCount = banners.filter(b => !b.isActive).length;
  const heroCarouselCount = banners.filter(b => (b.placement || 'HERO_CAROUSEL') === 'HERO_CAROUSEL').length;

  // Filtered banners
  const filteredBanners = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return banners.filter(b => {
      if (activeTab === 'ACTIVE' && !b.isActive) return false;
      if (activeTab === 'DRAFT' && b.isActive) return false;
      if (selectedPlacement !== 'ALL' && (b.placement || 'HERO_CAROUSEL') !== selectedPlacement) return false;

      if (!q) return true;
      return (
        (b.title || '').toLowerCase().includes(q) ||
        (b.subtitle || '').toLowerCase().includes(q) ||
        (b.badge || '').toLowerCase().includes(q) ||
        (b.hoverText || '').toLowerCase().includes(q) ||
        (b.buttonText || '').toLowerCase().includes(q) ||
        (b.linkUrl || '').toLowerCase().includes(q)
      );
    });
  }, [banners, activeTab, selectedPlacement, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5 pb-8 ecom-fade-in" ref={menuContainerRef}>
      <style>{ANIMATION_STYLES}</style>
      {/* ========================================================================= */}
      {/* 1. SLIM HELP-CENTER STYLE HERO HEADER (matches Product Media page)        */}
      {/* ========================================================================= */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white px-6 py-5 shadow-lg border border-white/10">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-300 text-[10px] font-bold tracking-wider uppercase mb-2">
              <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />
              <span>JTS Storefront • Promotions & Merchandising Hub</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
              Storefront Banners & Hero Carousel
            </h1>
            <p className="text-slate-300 text-xs mt-1 leading-relaxed">
              Configure dynamic storefront hero banners, promotional tiles, flash sale spotlights, and target catalog routes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search title, badge, link..."
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

            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white font-bold text-xs shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Banner</span>
            </button>

            <button
              type="button"
              onClick={fetchBanners}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer shrink-0"
              title="Refresh Banners"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. COMPACT KPI METRIC CARDS (Help Center Proportions)                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            id: 'ALL', label: 'Total Banners', value: totalCount, sub: 'Configured promotional assets', icon: ImageIcon,
            isActive: activeTab === 'ALL' && selectedPlacement === 'ALL',
            onClick: () => { setActiveTab('ALL'); setSelectedPlacement('ALL'); },
            activeRing: 'ring-blue-500 border-blue-500/50 bg-blue-500/5', iconBg: 'bg-blue-600 text-white', valColor: 'text-blue-600 dark:text-blue-400'
          },
          {
            id: 'ACTIVE', label: 'Active on Storefront', value: activeCount, sub: 'Live & visible to customers', icon: CheckCircle2,
            isActive: activeTab === 'ACTIVE',
            onClick: () => setActiveTab('ACTIVE'),
            activeRing: 'ring-emerald-500 border-emerald-500/50 bg-emerald-500/5', iconBg: 'bg-emerald-600 text-white', valColor: 'text-emerald-600 dark:text-emerald-400'
          },
          {
            id: 'DRAFT', label: 'Draft / Paused', value: draftCount, sub: 'Hidden from public storefront', icon: Clock,
            isActive: activeTab === 'DRAFT',
            onClick: () => setActiveTab('DRAFT'),
            activeRing: 'ring-amber-500 border-amber-500/50 bg-amber-500/5', iconBg: 'bg-amber-500 text-white', valColor: 'text-amber-600 dark:text-amber-400'
          },
          {
            id: 'HERO', label: 'Hero Carousel Slots', value: heroCarouselCount, sub: 'Top homepage rotating slides', icon: LayoutGrid,
            isActive: selectedPlacement === 'HERO_CAROUSEL',
            onClick: () => setSelectedPlacement(selectedPlacement === 'HERO_CAROUSEL' ? 'ALL' : 'HERO_CAROUSEL'),
            activeRing: 'ring-purple-500 border-purple-500/50 bg-purple-500/5', iconBg: 'bg-purple-600 text-white', valColor: 'text-purple-600 dark:text-purple-400'
          }
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <button
              key={kpi.id}
              type="button"
              onClick={kpi.onClick}
              style={{ animationDelay: `${i * 40}ms` }}
              className={`ecom-slide-up group text-left bg-card hover:bg-muted/40 rounded-xl p-3.5 border transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex items-center justify-between gap-2 ${
                kpi.isActive ? `ring-2 ${kpi.activeRing} shadow-sm` : 'border-border/80 hover:border-blue-500/30 shadow-2xs'
              }`}
            >
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">{kpi.label}</p>
                <p className={`text-xl font-black mt-0.5 leading-none ${kpi.valColor}`}>{kpi.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1 truncate">{kpi.sub}</p>
              </div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 ${kpi.isActive ? kpi.iconBg : 'bg-muted text-muted-foreground'}`}>
                <Icon className="w-4 h-4" />
              </div>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 3. LIVE STOREFRONT CAROUSEL PREVIEW (Help Center Module Banner Style)     */}
      {/* ========================================================================= */}
      {showCarouselPreview && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white shadow-xs space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[9.5px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-md text-white flex items-center gap-1">
                <Sparkles size={10} /> Live Storefront Carousel Preview
              </span>
              <span className="text-[11px] text-white/80 hidden sm:inline">
                Shows how active banners render to storefront shoppers
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowCarouselPreview(false)}
              className="px-2.5 py-1 bg-white/15 hover:bg-white/25 rounded-lg text-[10.5px] font-bold text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <EyeOff size={11} /> Hide Preview
            </button>
          </div>

          {banners.filter(b => b.isActive).length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-950/30 border border-white/15 text-center text-xs text-white/80">
              No active banners on storefront yet. Create or activate a banner below to preview it here.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {banners.filter(b => b.isActive).slice(0, 3).map(b => (
                <div
                  key={b._id}
                  onClick={() => setPreviewBanner(b)}
                  className="group relative rounded-xl overflow-hidden bg-slate-950/80 border border-white/20 hover:border-white/50 p-4 flex flex-col justify-between min-h-[168px] transition-all duration-200 cursor-pointer shadow-sm"
                >
                  {b.imageUrl && (
                    <div className="absolute inset-0 opacity-35 group-hover:opacity-50 transition-opacity">
                      <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

                  <div className="relative z-10 space-y-1">
                    {b.badge && (
                      <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-blue-500/80 text-white">
                        {b.badge}
                      </span>
                    )}
                    <h4 className="font-black text-white text-xs sm:text-sm line-clamp-1">{b.title}</h4>
                    <p className="text-[11px] text-slate-200/90 line-clamp-2 leading-snug">{b.subtitle || '—'}</p>
                  </div>

                  {b.hoverText && (
                    <div className="relative z-10 mt-2 p-2 rounded-lg bg-white/10 backdrop-blur-xs border border-white/15 text-[10px] text-blue-100 line-clamp-2">
                      💡 {b.hoverText}
                    </div>
                  )}

                  <div className="relative z-10 pt-2 mt-2 border-t border-white/15 flex items-center justify-between">
                    <span className="text-[10px] text-white/75 font-mono font-bold">Slot #{b.order}</span>
                    <span className="text-[11px] font-bold text-blue-300 group-hover:text-white flex items-center gap-1">
                      {b.buttonText} <ArrowUpRight size={12} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SLEEK SEGMENTED NAVIGATION TABS & PLACEMENT FILTER BAR                 */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 p-1.5 bg-muted/50 rounded-xl border border-border/60">
        {/* Segmented Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {[
            { id: 'ALL', label: 'All Banners', count: totalCount, icon: Layers },
            { id: 'ACTIVE', label: 'Active on Store', count: activeCount, icon: CheckCircle2 },
            { id: 'DRAFT', label: 'Draft / Paused', count: draftCount, icon: Clock }
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
                <span className="px-1.5 py-0.2 rounded-md bg-muted text-[10px] font-bold">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Placement Filter Pills & Preview Toggle */}
        <div className="flex items-center gap-1.5 flex-wrap px-1">
          {!showCarouselPreview && (
            <button
              type="button"
              onClick={() => setShowCarouselPreview(true)}
              className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Eye size={12} /> Show Live Preview
            </button>
          )}

          <div className="flex items-center gap-1 bg-card px-1.5 py-1 rounded-lg border border-border/70">
            {[
              { id: 'ALL', label: 'All Slots' },
              { id: 'HERO_CAROUSEL', label: 'Hero Carousel' },
              { id: 'DEAL_BANNER', label: 'Deal Banner' },
              { id: 'PROMO_TILE', label: 'Promo Tile' },
              { id: 'FOOTER_BANNER', label: 'Footer' }
            ].map(pl => (
              <button
                key={pl.id}
                type="button"
                onClick={() => setSelectedPlacement(pl.id)}
                className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-colors cursor-pointer ${
                  selectedPlacement === pl.id
                    ? 'bg-blue-600 text-white font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {pl.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. BANNER CARDS LISTING (Help Center Card Style + Three-Dot Action Menu)  */}
      {/* ========================================================================= */}
      {isLoading ? (
        <div className="p-12 text-center bg-card rounded-xl border border-border/80 text-xs text-muted-foreground font-bold animate-pulse">
          Loading storefront banners...
        </div>
      ) : filteredBanners.length === 0 ? (
        <div className="p-10 text-center bg-card rounded-xl border border-border/80 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
            <ImageIcon size={20} />
          </div>
          <div className="text-sm font-bold text-foreground">No Banners Found</div>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {searchQuery || activeTab !== 'ALL' || selectedPlacement !== 'ALL'
              ? 'No storefront banners match your selected search or filter criteria.'
              : 'No storefront banners created yet. Click "Create Banner" above to add your first promotional slide.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredBanners.map((banner, idx) => {
            const isMenuOpen = openMenuId === banner._id;

            return (
              <div
                key={banner._id}
                style={{ animationDelay: `${idx * 30}ms` }}
                className="ecom-slide-up p-3.5 sm:p-4 rounded-xl bg-card border border-border/80 hover:border-blue-500/40 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left: Sequence Badge + Image Thumbnail + Title, Badge & Subtitle */}
                <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                  <span className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10.5px] font-black shrink-0 mt-1 sm:mt-0">
                    #{banner.order || idx + 1}
                  </span>

                  <div
                    onClick={() => setPreviewBanner(banner)}
                    className="w-24 h-14 rounded-xl overflow-hidden border border-border/80 bg-slate-900 shrink-0 shadow-2xs cursor-pointer group relative"
                    title="Click to preview banner"
                  >
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setPreviewBanner(banner)}
                        className="text-xs sm:text-sm font-black text-foreground hover:text-blue-600 transition-colors cursor-pointer truncate"
                      >
                        {banner.title}
                      </button>

                      {banner.badge && (
                        <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {banner.badge}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {banner.subtitle || 'No subtitle description configured.'}
                    </p>

                    {banner.hoverText && (
                      <div className="text-[10.5px] text-blue-600 dark:text-blue-400 font-medium truncate">
                        💡 Hover Tooltip: "{banner.hoverText}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Middle: Target Route & Placement Box (Help Center Action Definition Style) */}
                <div className="w-full lg:w-72 p-2.5 rounded-xl bg-muted/30 border border-border/60 space-y-1 shrink-0 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-[11px] flex items-center gap-1">
                      <ArrowUpRight size={12} className="text-blue-600" />
                      CTA: {banner.buttonText || 'Shop Now'}
                    </span>
                    <span className="text-[9.5px] font-black uppercase px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                      {(banner.placement || 'HERO_CAROUSEL').replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-[10.5px] text-muted-foreground font-mono flex items-center gap-1 truncate">
                    <LinkIcon size={10} className="text-blue-500 shrink-0" />
                    <span className="truncate">{banner.linkUrl}</span>
                  </div>
                </div>

                {/* Right: Status Pill + Three-Dot (⋮) Action Menu */}
                <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/50">
                  <div className="text-left lg:text-right space-y-0.5">
                    <div className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground">
                      Visibility
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(banner)}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-black transition-all cursor-pointer ${
                        banner.isActive
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                          : 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                      }`}
                      title="Click to toggle Active / Draft"
                    >
                      {banner.isActive ? (
                        <>
                          <CheckCircle2 size={11} /> Active
                        </>
                      ) : (
                        <>
                          <Clock size={11} /> Draft
                        </>
                      )}
                    </button>
                  </div>

                  {/* Three-Dot (⋮) Action Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setOpenMenuId(isMenuOpen ? null : banner._id);
                      }}
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                        isMenuOpen
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-95'
                          : 'bg-muted/40 hover:bg-muted text-foreground border-border/80 hover:border-blue-500/40'
                      }`}
                      title="Banner Actions"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {isMenuOpen && (
                      <FloatingMenu width={240} onClose={() => setOpenMenuId(null)} className="rounded-2xl bg-card border border-border shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-2.5 py-1 border-b border-border/60 flex items-center justify-between">
                          <span className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground">
                            Banner Slot #{banner.order}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                            {banner.isActive ? 'ACTIVE' : 'DRAFT'}
                          </span>
                        </div>

                        {/* 1. Preview Banner */}
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            setPreviewBanner(banner);
                          }}
                          className="w-full text-left p-2 rounded-xl hover:bg-blue-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                            <Eye size={14} />
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-bold text-foreground group-hover:text-blue-600">
                              Preview Banner Slide
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              Inspect full artwork & copy
                            </div>
                          </div>
                        </button>

                        {/* 2. Edit Banner */}
                        <button
                          type="button"
                          onClick={() => handleOpenModal(banner)}
                          className="w-full text-left p-2 rounded-xl hover:bg-indigo-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                            <Edit2 size={14} />
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-bold text-foreground group-hover:text-indigo-600">
                              Edit Banner Details
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              Modify title, image or target URL
                            </div>
                          </div>
                        </button>

                        {/* 3. Toggle Active / Draft Status */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(banner)}
                          className="w-full text-left p-2 rounded-xl hover:bg-emerald-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                            {banner.isActive ? <EyeOff size={14} /> : <CheckCircle2 size={14} />}
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-bold text-foreground group-hover:text-emerald-600">
                              {banner.isActive ? 'Move to Draft (Pause)' : 'Activate on Storefront'}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {banner.isActive ? 'Hide from public carousel' : 'Publish to live storefront'}
                            </div>
                          </div>
                        </button>

                        <div className="border-t border-border/60 my-1" />

                        {/* 4. Delete Banner */}
                        <button
                          type="button"
                          onClick={() => handleDelete(banner._id)}
                          className="w-full text-left p-2 rounded-xl hover:bg-rose-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 group-hover:bg-rose-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                            <Trash2 size={14} />
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-bold text-rose-600">
                              Delete Banner
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              Remove promotional asset
                            </div>
                          </div>
                        </button>
                      </FloatingMenu>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: BANNER PREVIEW DOSSIER MODAL (Help Center Aesthetic)             */}
      {/* ========================================================================= */}
      <HelpStyleModal
        isOpen={Boolean(previewBanner)}
        onClose={() => setPreviewBanner(null)}
        badge={`STOREFRONT BANNER PREVIEW · SLOT #${previewBanner?.order || 1}`}
        title={previewBanner?.title || 'Banner Preview'}
        subtitle={`Placement: ${(previewBanner?.placement || 'HERO_CAROUSEL').replace('_', ' ')} · Target Route: ${previewBanner?.linkUrl || '/catalog'}`}
      >
        {previewBanner && (
          <div className="space-y-4 ecom-slide-up">
            {/* Live Visual Banner Render */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-border/80 min-h-[220px] p-5 flex flex-col justify-between text-white shadow-md">
              {previewBanner.imageUrl && (
                <img
                  src={previewBanner.imageUrl}
                  alt={previewBanner.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-45"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

              <div className="relative z-10 flex items-center justify-between gap-2">
                {previewBanner.badge ? (
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white">
                    {previewBanner.badge}
                  </span>
                ) : <span />}
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  previewBanner.isActive ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-slate-950'
                }`}>
                  {previewBanner.isActive ? 'ACTIVE ON STORE' : 'DRAFT'}
                </span>
              </div>

              <div className="relative z-10 space-y-2 pt-6">
                <h3 className="text-base sm:text-lg font-black text-white">{previewBanner.title}</h3>
                <p className="text-xs text-slate-200 leading-relaxed max-w-xl">{previewBanner.subtitle}</p>
                {previewBanner.hoverText && (
                  <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 text-[11px] text-blue-100">
                    💡 {previewBanner.hoverText}
                  </div>
                )}
                <div className="pt-2 flex items-center justify-between border-t border-white/15">
                  <span className="text-[11px] font-mono text-slate-300">{previewBanner.linkUrl}</span>
                  <span className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-black text-xs inline-flex items-center gap-1">
                    {previewBanner.buttonText} <ArrowUpRight size={13} />
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleToggleStatus(previewBanner)}
                className="px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs cursor-pointer"
              >
                {previewBanner.isActive ? 'Pause (Move to Draft)' : 'Activate Banner'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const b = previewBanner;
                  setPreviewBanner(null);
                  handleOpenModal(b);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 size={13} /> Edit Banner
              </button>
            </div>
          </div>
        )}
      </HelpStyleModal>

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE / EDIT BANNER MODAL (Help Center Aesthetic)               */}
      {/* ========================================================================= */}
      <HelpStyleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        badge="STOREFRONT VISUAL MERCHANDISING"
        title={editingBanner ? `Edit Banner: ${editingBanner.title}` : 'Create New Storefront Banner'}
        subtitle="Configure promotional copy, upload high-resolution media artwork, and link a target storefront catalog route."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-4 ecom-slide-up">
          {/* SECTION 1: BANNER COPY & DETAILS */}
          <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-3 transition-all duration-200 hover:border-blue-500/40">
            <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <Sparkles size={12} /> 1. Banner Copy & Promotional Headlines
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10.5px] font-bold text-foreground block mb-1">
                  Banner Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Next-Gen Laptops & Pro Workstations"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground font-bold text-xs focus:border-blue-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10.5px] font-bold text-foreground block mb-1">
                  Promotional Badge
                </label>
                <input
                  type="text"
                  value={formData.badge}
                  onChange={e => setFormData({ ...formData, badge: e.target.value })}
                  placeholder="e.g. FESTIVE TECH SPECTACULAR · UP TO 45% OFF"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground font-bold text-xs focus:border-blue-600 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10.5px] font-bold text-foreground block mb-1">
                Subtitle / Description
              </label>
              <textarea
                rows={2}
                value={formData.subtitle}
                onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="e.g. Apple MacBook Pro M3, HP Core i5 and enterprise desktops with instant live stock availability."
                className="w-full p-2.5 rounded-xl border border-border bg-card text-foreground text-xs focus:border-blue-600 outline-none resize-none"
              />
            </div>

            <div>
              <label className="text-[10.5px] font-bold text-foreground block mb-1">
                Interactive Hover Tooltip / Micro-Copy
              </label>
              <input
                type="text"
                value={formData.hoverText}
                onChange={e => setFormData({ ...formData, hoverText: e.target.value })}
                placeholder="e.g. Limited Time Offer: Get additional warranty and free express shipping."
                className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs focus:border-blue-600 outline-none"
              />
            </div>
          </div>

          {/* SECTION 2: BANNER IMAGE (FILE UPLOAD OR URL) */}
          <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-3 transition-all duration-200 hover:border-blue-500/40">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <ImageIcon size={12} /> 2. Banner Artwork / Media Asset <span className="text-rose-500">*</span>
              </span>

              <div className="flex items-center gap-1 bg-card p-0.5 rounded-lg border border-border/80">
                <button
                  type="button"
                  onClick={() => setImageUploadMode('upload')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    imageUploadMode === 'upload'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setImageUploadMode('url')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    imageUploadMode === 'url'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Image URL
                </button>
              </div>
            </div>

            {imageUploadMode === 'upload' ? (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={e => e.target.files && handleProcessImageFile(e.target.files[0])}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                />
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-blue-600 bg-blue-500/10'
                      : 'border-border hover:border-blue-500/60 bg-card/60 hover:bg-card'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center space-y-1.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                      <Upload size={18} />
                    </div>
                    <span className="font-bold text-foreground text-xs">
                      Click to browse image file or drag & drop here
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Supports JPG, PNG, WEBP (Recommended 16:9 or 21:9 widescreen)
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs font-mono focus:border-blue-600 outline-none"
                />
              </div>
            )}

            {formData.imageUrl && (
              <div className="p-2.5 rounded-xl border border-border bg-card flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-16 h-10 rounded-lg overflow-hidden border border-border bg-slate-900 shrink-0">
                    <img src={formData.imageUrl} alt="Selected banner" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <FileCheck size={13} className="text-emerald-600 shrink-0" />
                      <span className="font-bold text-foreground text-xs truncate">
                        {imageFileName || 'Banner artwork attached'}
                      </span>
                    </div>
                    {imageFileSize && (
                      <span className="text-[10px] text-muted-foreground font-mono block">
                        Size: {imageFileSize} · Ready for storefront
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, imageUrl: '' });
                    setImageFileName('');
                    setImageFileSize('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:underline px-2 py-1 cursor-pointer shrink-0"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* SECTION 3: CALL-TO-ACTION & TARGET LINK URL */}
          <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-3 transition-all duration-200 hover:border-blue-500/40">
            <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <LinkIcon size={12} /> 3. Call-to-Action & Target Storefront Route
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10.5px] font-bold text-foreground block mb-1">
                  Button Label
                </label>
                <input
                  type="text"
                  value={formData.buttonText}
                  onChange={e => setFormData({ ...formData, buttonText: e.target.value })}
                  placeholder="e.g. Shop Tech Deals"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground font-bold text-xs focus:border-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="text-[10.5px] font-bold text-foreground block mb-1">
                  Quick Preset Storefront Route
                </label>
                <select
                  onChange={e => {
                    if (e.target.value) setFormData({ ...formData, linkUrl: e.target.value });
                  }}
                  defaultValue=""
                  className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground font-bold text-xs focus:border-blue-600 outline-none cursor-pointer"
                >
                  <option value="" disabled>-- Pick Pre-defined Store Route --</option>
                  {QUICK_LINKS.map(link => (
                    <option key={link.path} value={link.path}>
                      {link.label} ({link.path})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10.5px] font-bold text-foreground block mb-1">
                Target Link URL (Destination Path) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.linkUrl}
                onChange={e => setFormData({ ...formData, linkUrl: e.target.value })}
                placeholder="/catalog?category=Computers"
                className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground font-mono text-xs focus:border-blue-600 outline-none"
                required
              />
            </div>
          </div>

          {/* SECTION 4: PLACEMENT & SEQUENCE */}
          <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div>
              <label className="text-[10.5px] font-bold text-foreground block mb-1">
                Placement Slot
              </label>
              <select
                value={formData.placement}
                onChange={e => setFormData({ ...formData, placement: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground font-bold text-xs focus:border-blue-600 outline-none cursor-pointer"
              >
                <option value="HERO_CAROUSEL">Hero Carousel (Top)</option>
                <option value="DEAL_BANNER">Flash Deal Banner</option>
                <option value="PROMO_TILE">Promo Feature Grid</option>
                <option value="FOOTER_BANNER">Footer Banner</option>
              </select>
            </div>

            <div>
              <label className="text-[10.5px] font-bold text-foreground block mb-1">
                Display Order (Slot #)
              </label>
              <input
                type="number"
                min="1"
                value={formData.order}
                onChange={e => setFormData({ ...formData, order: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground font-mono font-bold text-xs focus:border-blue-600 outline-none"
                required
              />
            </div>

            <div className="pt-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
                />
                <span className="font-bold text-xs text-foreground">
                  Active on Storefront
                </span>
              </label>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border/80">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer transition-all disabled:opacity-50"
            >
              <Save size={13} />
              <span>{isSaving ? 'Saving...' : 'Save Banner'}</span>
            </button>
          </div>
        </form>
      </HelpStyleModal>
    </div>
  );
};

export default EcomBanners;

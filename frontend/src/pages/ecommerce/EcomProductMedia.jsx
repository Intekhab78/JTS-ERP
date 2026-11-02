import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
  ShoppingBag, Search, Plus, Trash2, Edit3, Image, CheckCircle2,
  ExternalLink, Save, X, Sparkles, Layers, Tag, Eye, RefreshCw,
  UploadCloud, Palette, Check, ArrowLeft, ArrowRight, Settings,
  Sliders, Filter, Star, RotateCcw, MoreVertical, Package,
  ShieldCheck, EyeOff, Grid, ListFilter, Box, Building2
} from 'lucide-react';
import { getFileUrl } from '../../config/api';

/* ─── Keyframe Animations Style Block ─── */
const ANIMATION_STYLES = `
  @keyframes ecomModalBackdrop {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes ecomModalPop {
    0% { opacity: 0; transform: scale(0.94) translateY(14px); }
    70% { opacity: 1; transform: scale(1.005) translateY(-2px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes ecomSlideUpFade {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: none; }
  }
  @keyframes ecomFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes ecomMenuIn {
    from { opacity: 0; transform: scale(0.96) translateY(-4px); }
    to { opacity: 1; transform: none; }
  }
  .ecom-fade-in {
    animation: ecomFadeIn 0.3s ease-out;
  }
  .ecom-menu-in {
    animation: ecomMenuIn 0.16s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes ecomFloatIcon {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-3px); }
  }
  .ecom-modal-backdrop {
    animation: ecomModalBackdrop 0.22s ease-out forwards;
  }
  .ecom-modal-pop {
    animation: ecomModalPop 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .ecom-slide-up {
    animation: ecomSlideUpFade 0.26s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }
  .ecom-float-icon {
    animation: ecomFloatIcon 2.4s ease-in-out infinite;
  }
`;

/* ─── Shared Help-Center Style Modal Wrapper (Borderless Dark Header + Solid Light Footer) ─── */
const HelpStyleModal = ({
  isOpen,
  onClose,
  badge,
  title,
  subtitle,
  maxWidth = 'max-w-4xl',
  children,
  footer
}) => {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md ecom-modal-backdrop"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        className={`bg-slate-950 rounded-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden shadow-[0_25px_70px_-15px_rgba(0,0,0,0.65)] ecom-modal-pop`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Slim Help Center Gradient Header */}
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
              <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-snug truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-slate-300 text-xs mt-0.5 leading-relaxed truncate">
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

        {/* Solid Card Wrapper for Body + Footer so dark outer bg never bleeds through */}
        <div className="flex flex-col flex-1 min-h-0 bg-card text-foreground rounded-b-2xl overflow-hidden">
          {/* Modal Body with Sleek Custom Scrollbar */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full">
            {children}
          </div>

          {/* Solid Clean Footer */}
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

export const EcomProductMedia = () => {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PUBLISHED' | 'HIDDEN' | 'VARIANT_MAPPED' | 'MISSING_PHOTOS'
  const [stockFilter, setStockFilter] = useState('ALL'); // 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK'
  const [openMenuId, setOpenMenuId] = useState(null);
  const [previewProduct, setPreviewProduct] = useState(null);
  const [modalSectionTab, setModalSectionTab] = useState('ALL'); // 'ALL' | 'MEDIA' | 'HIERARCHY' | 'CONTENT' | 'POLICY'

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [mediaItems, setMediaItems] = useState([]);
  const [activeGalleryTab, setActiveGalleryTab] = useState('ALL');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [specifications, setSpecifications] = useState([]);
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecVal, setNewSpecVal] = useState('');
  const [isPublishedToEcommerce, setIsPublishedToEcommerce] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [isTrending, setIsTrending] = useState(false);
  const [isDealOfTheDay, setIsDealOfTheDay] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(false);
  const [ecommerceBadge, setEcommerceBadge] = useState('');
  const [returnPolicyType, setReturnPolicyType] = useState('RETURN_AND_EXCHANGE');
  const [returnWindowDays, setReturnWindowDays] = useState(7);
  const [nonReturnableReason, setNonReturnableReason] = useState('');

  // Per-Image Assignment Modal State
  const [assigningItemIndex, setAssigningItemIndex] = useState(null);
  const [assignTargetScope, setAssignTargetScope] = useState('GENERAL'); // 'GENERAL' | 'COLOR' | 'VARIANT'
  const [assignColor, setAssignColor] = useState('');
  const [assignSize, setAssignSize] = useState('');
  const [assignVariantId, setAssignVariantId] = useState('');
  const [assignIsMain, setAssignIsMain] = useState(false);

  // Batch Color Upload & Multi-Image Selection States
  const [uploadTargetColor, setUploadTargetColor] = useState('GENERAL');
  const [selectedMediaIds, setSelectedMediaIds] = useState(new Set());
  const [bulkAssignTargetColor, setBulkAssignTargetColor] = useState('');

  // Master Hierarchy States
  const [colorMasters, setColorMasters] = useState([]);
  const [sizeMasters, setSizeMasters] = useState([]);
  const [productVariants, setProductVariants] = useState([]);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);

  // File Upload State
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  // Close Three-Dot dropdown on outside click, scroll, resize or Escape
  const menuRef = useRef(null);
  const [menuPos, setMenuPos] = useState(null); // { top, left, openUp }

  useEffect(() => {
    if (!openMenuId) return undefined;

    const handleMouseDown = (e) => {
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      if (e.target.closest && e.target.closest('[data-menu-trigger="true"]')) return;
      setOpenMenuId(null);
    };
    const handleClose = () => setOpenMenuId(null);
    const handleKey = (e) => { if (e.key === 'Escape') setOpenMenuId(null); };

    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
      document.removeEventListener('keydown', handleKey);
    };
  }, [openMenuId]);

  const MENU_WIDTH = 232;
  const MENU_HEIGHT = 225;

  const handleToggleMenu = (e, product) => {
    e.stopPropagation();
    if (openMenuId === product._id) {
      setOpenMenuId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < MENU_HEIGHT + 12 && rect.top > MENU_HEIGHT + 12;
    const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
    const top = openUp ? undefined : rect.bottom + 6;
    const bottom = openUp ? window.innerHeight - rect.top + 6 : undefined;
    setMenuPos({ top, bottom, left, openUp });
    setOpenMenuId(product._id);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    const activeWorkspace = localStorage.getItem('active_workspace_id');
    const headers = { Authorization: `Bearer ${token}` };
    if (activeWorkspace && activeWorkspace !== 'ALL' && activeWorkspace !== 'null' && activeWorkspace !== 'undefined') {
      headers['x-tenant-id'] = activeWorkspace;
    }
    return headers;
  };

  const fetchMasters = async () => {
    try {
      const headers = getAuthHeaders();
      const [colRes, szRes] = await Promise.all([
        axios.get('/api/v1/hierarchy/colors', { headers }).catch(() => ({ data: [] })),
        axios.get('/api/v1/hierarchy/sizes', { headers }).catch(() => ({ data: [] }))
      ]);
      setColorMasters(Array.isArray(colRes.data) ? colRes.data.filter(c => c.isActive !== false) : []);
      setSizeMasters(Array.isArray(szRes.data) ? szRes.data.filter(s => s.isActive !== false) : []);
    } catch (e) {
      console.error('Failed to load Color and Size masters:', e);
    }
  };

  useEffect(() => {
    fetchMasters();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [search]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      queryParams.set('limit', '100');

      const { data } = await axios.get(`/api/v1/ecommerce-admin/products?${queryParams.toString()}`, {
        headers: getAuthHeaders()
      });
      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch products for media:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickTogglePublish = async (product) => {
    try {
      const nextStatus = product.isPublishedToEcommerce === false ? true : false;
      await axios.put(
        `/api/v1/ecommerce-admin/products/${product._id}`,
        { isPublishedToEcommerce: nextStatus },
        { headers: getAuthHeaders() }
      );
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update storefront visibility');
    }
  };

  const handleOpenEdit = async (p, initialSection = 'ALL') => {
    setEditingProduct(p);
    setModalSectionTab(initialSection);
    setSelectedColor(p.color || '');
    setSelectedSize(p.size || '');
    setLongDescription(p.longDescription || '');
    setSpecifications(Array.isArray(p.specifications) ? [...p.specifications] : []);
    setIsPublishedToEcommerce(p.isPublishedToEcommerce !== false);
    setIsFeatured(!!p.isFeatured);
    setIsBestSeller(!!p.isBestSeller);
    setIsTrending(!!p.isTrending);
    setIsDealOfTheDay(!!p.isDealOfTheDay);
    setIsNewArrival(!!p.isNewArrival);
    setEcommerceBadge(p.ecommerceBadge || '');
    setReturnPolicyType(p.returnPolicyType || 'RETURN_AND_EXCHANGE');
    setReturnWindowDays(p.returnWindowDays || 7);
    setNonReturnableReason(p.nonReturnableReason || '');
    setUploadTargetColor('GENERAL');
    setSelectedMediaIds(new Set());
    setBulkAssignTargetColor('');
    setNewSpecKey('');
    setNewSpecVal('');
    setActiveGalleryTab('ALL');
    setAssigningItemIndex(null);

    // Build initial media items list from product record
    const items = [];
    const seenUrls = new Set();

    // 1. Color galleries
    if (Array.isArray(p.colorGalleries)) {
      p.colorGalleries.forEach(cg => {
        const cName = cg.colorName || '';
        const cId = cg.colorId || '';
        if (cg.uploadImage) {
          items.push({
            id: `cg_${cName}_${cg.uploadImage}`,
            url: cg.uploadImage,
            scope: 'COLOR',
            colorName: cName,
            colorId: cId,
            sizeName: '',
            variantId: '',
            isMain: true,
            order: items.length
          });
          seenUrls.add(`COLOR_${cName}_${cg.uploadImage}`);
        }
        (cg.images || []).forEach(img => {
          const key = `COLOR_${cName}_${img}`;
          if (img && !seenUrls.has(key)) {
            items.push({
              id: `cg_${cName}_${img}`,
              url: img,
              scope: 'COLOR',
              colorName: cName,
              colorId: cId,
              sizeName: '',
              variantId: '',
              isMain: img === cg.uploadImage,
              order: items.length
            });
            seenUrls.add(key);
          }
        });
      });
    }

    // 2. General images
    if (p.uploadImage) {
      const key = `GENERAL__${p.uploadImage}`;
      if (!seenUrls.has(key)) {
        items.push({
          id: `gen_${p.uploadImage}`,
          url: p.uploadImage,
          scope: 'GENERAL',
          colorName: '',
          colorId: '',
          sizeName: '',
          variantId: '',
          isMain: true,
          order: items.length
        });
        seenUrls.add(key);
      }
    }
    (p.images || []).forEach(img => {
      const key = `GENERAL__${img}`;
      if (img && !seenUrls.has(key)) {
        items.push({
          id: `gen_${img}`,
          url: img,
          scope: 'GENERAL',
          colorName: '',
          colorId: '',
          sizeName: '',
          variantId: '',
          isMain: img === p.uploadImage,
          order: items.length
        });
        seenUrls.add(key);
      }
    });

    setMediaItems(items);
    setIsModalOpen(true);

    // Fetch product variants for exact variant mapping
    setIsLoadingVariants(true);
    try {
      const { data: vList } = await axios.get(`/api/v1/inventory/products/${p._id}/variants`, {
        headers: getAuthHeaders()
      });
      const variants = Array.isArray(vList) ? vList : [];
      setProductVariants(variants);

      // Merge any exact variant images saved on variants
      const updatedItems = [...items];
      variants.forEach(v => {
        const vAttrs = v.attributes || {};
        const vColor = vAttrs.Color || vAttrs.color || '';
        const vSize = vAttrs.Size || vAttrs.size || '';

        if (v.uploadImage) {
          const key = `VARIANT_${v._id}_${v.uploadImage}`;
          if (!seenUrls.has(key)) {
            updatedItems.push({
              id: `var_${v._id}_${v.uploadImage}`,
              url: v.uploadImage,
              scope: 'VARIANT',
              colorName: vColor,
              sizeName: vSize,
              variantId: v._id,
              isMain: true,
              order: updatedItems.length
            });
            seenUrls.add(key);
          }
        }
        (v.images || []).forEach(img => {
          const key = `VARIANT_${v._id}_${img}`;
          if (img && !seenUrls.has(key)) {
            updatedItems.push({
              id: `var_${v._id}_${img}`,
              url: img,
              scope: 'VARIANT',
              colorName: vColor,
              sizeName: vSize,
              variantId: v._id,
              isMain: img === v.uploadImage,
              order: updatedItems.length
            });
            seenUrls.add(key);
          }
        });
      });
      setMediaItems(updatedItems);
    } catch (err) {
      console.warn('Could not fetch variants for product media:', err);
    } finally {
      setIsLoadingVariants(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0 || !editingProduct) return;

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      files.forEach(f => {
        formData.append('images', f);
      });

      const token = localStorage.getItem('token');
      const activeWorkspace = localStorage.getItem('active_workspace_id');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
        ...(activeWorkspace && activeWorkspace !== 'ALL' && activeWorkspace !== 'null' ? { 'x-tenant-id': activeWorkspace } : {})
      };

      const res = await axios.post(`/api/v1/ecommerce-admin/products/${editingProduct._id}/images`, formData, { headers });

      if (res.data?.images) {
        const uploadedUrls = res.data.images;
        const targetColor = uploadTargetColor && uploadTargetColor !== 'GENERAL' ? uploadTargetColor.trim() : '';
        const isColorUpload = Boolean(targetColor);
        const matchedColorMaster = isColorUpload ? colorMasters.find(c => c.name?.toLowerCase() === targetColor.toLowerCase()) : null;

        setMediaItems(prev => {
          const newItems = [...prev];
          const hasExistingMain = isColorUpload
            ? newItems.some(i => i.scope === 'COLOR' && i.colorName?.toLowerCase() === targetColor.toLowerCase() && i.isMain)
            : newItems.some(i => i.scope === 'GENERAL' && i.isMain);

          uploadedUrls.forEach((url, idx) => {
            if (!newItems.some(item => item.url === url)) {
              newItems.push({
                id: `upload_${Date.now()}_${idx}`,
                url,
                scope: isColorUpload ? 'COLOR' : 'GENERAL',
                colorName: isColorUpload ? targetColor : '',
                colorId: matchedColorMaster?._id || '',
                sizeName: '',
                variantId: '',
                isMain: !hasExistingMain && idx === 0,
                order: newItems.length
              });
            }
          });
          return newItems;
        });

        if (isColorUpload) {
          setActiveGalleryTab(targetColor);
        } else {
          setActiveGalleryTab('GENERAL');
        }
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      alert(err.response?.data?.message || 'Failed to upload image file(s). Please try again.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleToggleSelectMedia = (id) => {
    setSelectedMediaIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllFiltered = (filteredItems) => {
    if (selectedMediaIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedMediaIds(new Set());
    } else {
      const ids = new Set(filteredItems.map((item, idx) => item.id || `idx_${idx}_${item.url}`));
      setSelectedMediaIds(ids);
    }
  };

  const handleApplyBulkAssign = () => {
    if (!bulkAssignTargetColor) {
      alert('Please choose a color or general product to assign the selected images.');
      return;
    }
    if (selectedMediaIds.size === 0) {
      alert('Please select at least one image using the checkboxes.');
      return;
    }

    const isGeneral = bulkAssignTargetColor === 'GENERAL';
    const matched = !isGeneral ? colorMasters.find(c => c.name?.toLowerCase() === bulkAssignTargetColor.toLowerCase()) : null;

    setMediaItems(prev => prev.map((item, idx) => {
      const id = item.id || `idx_${idx}_${item.url}`;
      if (selectedMediaIds.has(id)) {
        return {
          ...item,
          scope: isGeneral ? 'GENERAL' : 'COLOR',
          colorName: isGeneral ? '' : bulkAssignTargetColor,
          colorId: isGeneral ? '' : (matched?._id || '')
        };
      }
      return item;
    }));

    setSelectedMediaIds(new Set());
    if (!isGeneral) {
      setActiveGalleryTab(bulkAssignTargetColor);
    }
  };

  const handleBulkDelete = () => {
    if (selectedMediaIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedMediaIds.size} selected image(s)?`)) return;

    setMediaItems(prev => prev.filter((item, idx) => {
      const id = item.id || `idx_${idx}_${item.url}`;
      return !selectedMediaIds.has(id);
    }));
    setSelectedMediaIds(new Set());
  };

  const handleRemoveImage = (indexToRemove) => {
    setMediaItems(prev => prev.filter((_, i) => i !== indexToRemove));
    if (assigningItemIndex === indexToRemove) {
      setAssigningItemIndex(null);
    }
  };

  const handleSetMain = (index) => {
    setMediaItems(prev => {
      const target = prev[index];
      if (!target) return prev;

      return prev.map((item, idx) => {
        if (target.scope === 'GENERAL' && item.scope === 'GENERAL') {
          return { ...item, isMain: idx === index };
        }
        if (target.scope === 'COLOR' && item.scope === 'COLOR' && item.colorName?.toLowerCase() === target.colorName?.toLowerCase()) {
          return { ...item, isMain: idx === index };
        }
        if (target.scope === 'VARIANT' && item.scope === 'VARIANT' && item.variantId === target.variantId) {
          return { ...item, isMain: idx === index };
        }
        return item;
      });
    });
  };

  const handleOpenAssignModal = (index) => {
    const item = mediaItems[index];
    if (!item) return;

    setAssigningItemIndex(index);
    setAssignTargetScope(item.scope || 'GENERAL');
    setAssignColor(item.colorName || selectedColor || '');
    setAssignSize(item.sizeName || selectedSize || '');
    setAssignVariantId(item.variantId || '');
    setAssignIsMain(!!item.isMain);
  };

  const handleApplyAssignment = () => {
    if (assigningItemIndex === null) return;

    setMediaItems(prev => {
      const updated = [...prev];
      const cur = updated[assigningItemIndex];
      if (!cur) return prev;

      let colorId = '';
      if (assignColor) {
        const foundColor = colorMasters.find(c => c.name?.toLowerCase() === assignColor.toLowerCase());
        colorId = foundColor?._id || '';
      }

      let sizeName = assignSize;
      let colorName = assignColor;
      let variantId = assignVariantId;

      if (assignTargetScope === 'VARIANT' && assignVariantId) {
        const foundVariant = productVariants.find(v => String(v._id) === String(assignVariantId));
        if (foundVariant) {
          const attrs = foundVariant.attributes || {};
          colorName = attrs.Color || attrs.color || colorName;
          sizeName = attrs.Size || attrs.size || sizeName;
        }
      }

      updated[assigningItemIndex] = {
        ...cur,
        scope: assignTargetScope,
        colorName: assignTargetScope === 'GENERAL' ? '' : colorName,
        colorId: assignTargetScope === 'GENERAL' ? '' : colorId,
        sizeName: assignTargetScope === 'VARIANT' ? sizeName : '',
        variantId: assignTargetScope === 'VARIANT' ? variantId : '',
        isMain: assignIsMain
      };

      if (assignIsMain) {
        return updated.map((item, idx) => {
          if (idx === assigningItemIndex) return item;
          if (assignTargetScope === 'GENERAL' && item.scope === 'GENERAL') {
            return { ...item, isMain: false };
          }
          if (assignTargetScope === 'COLOR' && item.scope === 'COLOR' && item.colorName?.toLowerCase() === colorName.toLowerCase()) {
            return { ...item, isMain: false };
          }
          if (assignTargetScope === 'VARIANT' && item.scope === 'VARIANT' && item.variantId === variantId) {
            return { ...item, isMain: false };
          }
          return item;
        });
      }

      return updated;
    });

    setAssigningItemIndex(null);
  };

  const handleMoveImage = (fromIndex, direction) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= mediaItems.length) return;

    setMediaItems(prev => {
      const copy = [...prev];
      const temp = copy[fromIndex];
      copy[fromIndex] = copy[toIndex];
      copy[toIndex] = temp;
      return copy;
    });
  };

  const handleAddSpec = () => {
    if (!newSpecKey.trim() || !newSpecVal.trim()) return;
    setSpecifications([...specifications, { key: newSpecKey.trim(), value: newSpecVal.trim() }]);
    setNewSpecKey('');
    setNewSpecVal('');
  };

  const handleRemoveSpec = (index) => {
    setSpecifications(specifications.filter((_, i) => i !== index));
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editingProduct) return;
    setIsSaving(true);

    try {
      // 1. General Images
      const generalItems = mediaItems.filter(i => i.scope === 'GENERAL');
      const generalMainItem = generalItems.find(i => i.isMain) || generalItems[0];
      let uploadImage = generalMainItem ? generalMainItem.url : '';
      let images = generalItems.map(i => i.url);

      // 2. Color Galleries
      const colorMap = new Map();
      mediaItems.filter(i => i.scope === 'COLOR' && i.colorName).forEach(item => {
        const cName = item.colorName.trim();
        if (!colorMap.has(cName)) {
          const matched = colorMasters.find(cm => cm.name?.toLowerCase() === cName.toLowerCase());
          colorMap.set(cName, {
            colorId: item.colorId || matched?._id || undefined,
            colorName: cName,
            colorCode: matched?.code || '',
            uploadImage: item.isMain ? item.url : null,
            images: [item.url]
          });
        } else {
          const existing = colorMap.get(cName);
          if (item.isMain || !existing.uploadImage) {
            existing.uploadImage = item.url;
          }
          if (!existing.images.includes(item.url)) {
            existing.images.push(item.url);
          }
        }
      });
      const colorGalleries = Array.from(colorMap.values());

      if (!uploadImage && colorGalleries.length > 0) {
        uploadImage = colorGalleries[0].uploadImage || colorGalleries[0].images?.[0] || '';
        if (images.length === 0 && uploadImage) {
          images = [uploadImage];
        }
      }

      // 3. Variant Specific Images
      const variantMap = new Map();
      mediaItems.filter(i => i.scope === 'VARIANT' && i.variantId).forEach(item => {
        const vId = item.variantId;
        if (!variantMap.has(vId)) {
          variantMap.set(vId, {
            _id: vId,
            uploadImage: item.isMain ? item.url : null,
            images: [item.url]
          });
        } else {
          const vEntry = variantMap.get(vId);
          if (item.isMain || !vEntry.uploadImage) {
            vEntry.uploadImage = item.url;
          }
          if (!vEntry.images.includes(item.url)) {
            vEntry.images.push(item.url);
          }
        }
      });
      const variants = Array.from(variantMap.values());

      await axios.put(`/api/v1/ecommerce-admin/products/${editingProduct._id}`, {
        uploadImage,
        images,
        colorGalleries,
        variants,
        color: selectedColor,
        size: selectedSize,
        longDescription,
        specifications,
        isPublishedToEcommerce,
        isFeatured,
        isBestSeller,
        isTrending,
        isDealOfTheDay,
        isNewArrival,
        ecommerceBadge,
        isReturnable: returnPolicyType === 'RETURN_AND_EXCHANGE',
        isExchangeable: returnPolicyType !== 'NON_RETURNABLE',
        returnPolicyType,
        returnWindowDays,
        nonReturnableReason
      }, {
        headers: getAuthHeaders()
      });

      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      console.error('Update product media error:', err);
      alert(err.response?.data?.message || 'Failed to update product details');
    } finally {
      setIsSaving(false);
    }
  };

  // Derive unique colors across all media items
  const mediaColors = Array.from(new Set(
    mediaItems.filter(i => i.scope === 'COLOR' && i.colorName).map(i => i.colorName)
  ));

  // Derive all active target colors for this product
  const availableTargetColors = Array.from(new Set([
    ...productVariants.map(v => v.attributes?.Color || v.attributes?.color).filter(Boolean),
    ...(editingProduct?.colorGalleries || []).map(cg => cg.colorName).filter(Boolean),
    ...mediaColors,
    ...colorMasters.map(c => c.name).filter(Boolean)
  ]));

  // Filter media items according to the active tab
  const filteredMediaItems = mediaItems.filter(item => {
    if (activeGalleryTab === 'ALL') return true;
    if (activeGalleryTab === 'GENERAL') return item.scope === 'GENERAL';
    if (activeGalleryTab === 'VARIANTS') return item.scope === 'VARIANT';
    return item.scope === 'COLOR' && item.colorName?.toLowerCase() === activeGalleryTab.toLowerCase();
  });

  // Compute KPI counts & filtered products
  const publishedCount = useMemo(
    () => products.filter(p => p.isPublishedToEcommerce !== false).length,
    [products]
  );
  const hiddenCount = useMemo(
    () => products.filter(p => p.isPublishedToEcommerce === false).length,
    [products]
  );
  const variantMappedCount = useMemo(
    () => products.filter(p => p.hasVariants || (Array.isArray(p.colorGalleries) && p.colorGalleries.length > 0)).length,
    [products]
  );
  const inStockCount = useMemo(
    () => products.filter(p => (p.totalStock ?? 0) > 0).length,
    [products]
  );
  const missingPhotosCount = useMemo(
    () => products.filter(p => !p.uploadImage && (!Array.isArray(p.images) || p.images.length === 0) && (!Array.isArray(p.colorGalleries) || p.colorGalleries.length === 0)).length,
    [products]
  );

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const isPub = p.isPublishedToEcommerce !== false;
      const hasVarOrColor = p.hasVariants || (Array.isArray(p.colorGalleries) && p.colorGalleries.length > 0);
      const hasPhotos = Boolean(p.uploadImage) || (Array.isArray(p.images) && p.images.length > 0) || (Array.isArray(p.colorGalleries) && p.colorGalleries.length > 0);
      const stock = p.totalStock ?? 0;

      if (statusFilter === 'PUBLISHED' && !isPub) return false;
      if (statusFilter === 'HIDDEN' && isPub) return false;
      if (statusFilter === 'VARIANT_MAPPED' && !hasVarOrColor) return false;
      if (statusFilter === 'MISSING_PHOTOS' && hasPhotos) return false;

      if (stockFilter === 'IN_STOCK' && stock <= 0) return false;
      if (stockFilter === 'OUT_OF_STOCK' && stock > 0) return false;

      return true;
    });
  }, [products, statusFilter, stockFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5 ecom-fade-in">
      <style>{ANIMATION_STYLES}</style>

      {/* ─── 1. SLIM HELP-CENTER STYLE HERO HEADER ─── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white px-6 py-5 shadow-lg border border-white/10">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-300 text-[10px] font-bold tracking-wider uppercase mb-2">
              <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />
              <span>JTS E-Commerce • Product Media & Catalog Master</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
              Product E-Commerce Master & Media Gallery
            </h1>
            <p className="text-slate-300 text-xs mt-1 leading-relaxed">
              Manage multi-image galleries, per-color & per-variant photo mappings, technical specifications, merchandising badges, and return policies.
            </p>
          </div>

          {/* Search & Refresh Actions */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search title, SKU, barcode, brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/15 transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={fetchProducts}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer shrink-0"
              title="Refresh Catalog"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 2. COMPACT INTERACTIVE KPI STRIP ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            id: 'ALL',
            label: 'Total Catalog Products',
            value: products.length,
            sub: 'Synced inventory items',
            icon: ShoppingBag,
            activeRing: 'ring-blue-500 border-blue-500/50 bg-blue-500/5',
            iconBg: 'bg-blue-600 text-white',
            valColor: 'text-blue-600 dark:text-blue-400'
          },
          {
            id: 'PUBLISHED',
            label: 'Published on Store',
            value: publishedCount,
            sub: `${hiddenCount} hidden from web`,
            icon: CheckCircle2,
            activeRing: 'ring-emerald-500 border-emerald-500/50 bg-emerald-500/5',
            iconBg: 'bg-emerald-600 text-white',
            valColor: 'text-emerald-600 dark:text-emerald-400'
          },
          {
            id: 'VARIANT_MAPPED',
            label: 'Color & Variant Mapped',
            value: variantMappedCount,
            sub: 'Multi-gallery / matrix active',
            icon: Palette,
            activeRing: 'ring-purple-500 border-purple-500/50 bg-purple-500/5',
            iconBg: 'bg-purple-600 text-white',
            valColor: 'text-purple-600 dark:text-purple-400'
          },
          {
            id: 'MISSING_PHOTOS',
            label: 'Missing Media Photos',
            value: missingPhotosCount,
            sub: `${inStockCount} products in stock`,
            icon: Image,
            activeRing: 'ring-amber-500 border-amber-500/50 bg-amber-500/5',
            iconBg: 'bg-amber-500 text-white',
            valColor: 'text-amber-600 dark:text-amber-400'
          }
        ].map((kpi) => {
          const Icon = kpi.icon;
          const isActive = statusFilter === kpi.id;
          return (
            <button
              key={kpi.id}
              type="button"
              onClick={() => setStatusFilter(kpi.id)}
              className={`group text-left bg-card hover:bg-muted/40 rounded-xl p-3.5 border transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex items-center justify-between gap-2 ${
                isActive
                  ? `ring-2 ${kpi.activeRing} shadow-sm`
                  : 'border-border/80 hover:border-blue-500/30 shadow-2xs'
              }`}
            >
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                  {kpi.label}
                </p>
                <p className={`text-xl font-black mt-0.5 leading-none ${kpi.valColor}`}>
                  {kpi.value}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 truncate">{kpi.sub}</p>
              </div>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? kpi.iconBg : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </button>
          );
        })}
      </div>

      {/* ─── 3. SEGMENTED FILTER TABS & STOCK PILLS ─── */}
      <div className="bg-card rounded-2xl border border-border/80 p-2.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Status / Gallery Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {[
            { id: 'ALL', label: 'All Products', count: products.length, icon: Layers },
            { id: 'PUBLISHED', label: 'Published', count: publishedCount, icon: CheckCircle2 },
            { id: 'HIDDEN', label: 'Hidden / Draft', count: hiddenCount, icon: EyeOff },
            { id: 'VARIANT_MAPPED', label: 'Color & Variants', count: variantMappedCount, icon: Palette },
            { id: 'MISSING_PHOTOS', label: 'Needs Photos', count: missingPhotosCount, icon: Image }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-xs scale-[1.01]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                    active ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Stock Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden border-t md:border-t-0 pt-2 md:pt-0 border-border/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mr-1 shrink-0">
            <Filter className="w-3 h-3 text-blue-500" /> Stock:
          </span>
          {[
            { id: 'ALL', label: 'All Stock' },
            { id: 'IN_STOCK', label: `In Stock (${inStockCount})` },
            { id: 'OUT_OF_STOCK', label: `Out of Stock (${products.length - inStockCount})` }
          ].map((st) => {
            const active = stockFilter === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setStockFilter(st.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-2xs'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {st.label}
              </button>
            );
          })}

          {(statusFilter !== 'ALL' || stockFilter !== 'ALL' || search) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setStockFilter('ALL');
                setSearch('');
              }}
              className="px-2 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ─── 4. PRODUCT MEDIA CARDS LIST ─── */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-card rounded-2xl border border-border/80 p-12 text-center shadow-2xs">
            <RefreshCw className="w-7 h-7 text-blue-600 animate-spin mx-auto mb-2.5" />
            <p className="text-sm font-bold text-foreground">Loading Product Catalog & Media Galleries...</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Syncing product images, color galleries, and variant combinations.
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border/80 p-12 text-center shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No Matching Products Found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              No catalog products match your current filter or search criteria. Try resetting filters or searching by another SKU.
            </p>
          </div>
        ) : (
          filteredProducts.map((p, index) => {
            const numGalleries = Array.isArray(p.colorGalleries) ? p.colorGalleries.length : 0;
            const generalSet = new Set([
              ...(p.uploadImage ? [p.uploadImage] : []),
              ...(Array.isArray(p.images) ? p.images.filter(Boolean) : [])
            ]);
            const numGeneralImages = generalSet.size;
            const totalColorPhotos = Array.isArray(p.colorGalleries)
              ? p.colorGalleries.reduce((acc, cg) => acc + (Array.isArray(cg.images) ? cg.images.length : (cg.uploadImage ? 1 : 0)), 0)
              : 0;
            const totalPhotoCount = numGeneralImages + totalColorPhotos;
            const isPub = p.isPublishedToEcommerce !== false;
            const stock = p.totalStock ?? 0;
            const isMenuOpen = openMenuId === p._id;

            // Collect active merchandising badges
            const activeBadges = [];
            if (p.ecommerceBadge) activeBadges.push({ label: p.ecommerceBadge, cls: 'bg-rose-500/10 text-rose-600 border-rose-500/25' });
            if (p.isFeatured) activeBadges.push({ label: 'Featured', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/25' });
            if (p.isBestSeller) activeBadges.push({ label: 'Best Seller', cls: 'bg-purple-500/10 text-purple-600 border-purple-500/25' });
            if (p.isTrending) activeBadges.push({ label: 'Trending', cls: 'bg-blue-500/10 text-blue-600 border-blue-500/25' });
            if (p.isDealOfTheDay) activeBadges.push({ label: 'Deal of Day', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25' });
            if (p.isNewArrival) activeBadges.push({ label: 'New Arrival', cls: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/25' });

            const primaryThumb = p.uploadImage || p.images?.[0] || p.colorGalleries?.[0]?.uploadImage || p.colorGalleries?.[0]?.images?.[0] || '';

            return (
              <div
                key={p._id}
                style={{ animationDelay: `${Math.min(index * 35, 250)}ms` }}
                className="ecom-slide-up group bg-card hover:bg-muted/20 rounded-2xl border border-border/80 hover:border-blue-500/40 p-4 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Index + Thumbnail + Product Identity */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Index Number */}
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-black text-xs flex items-center justify-center shrink-0 mt-1">
                      {index + 1}
                    </div>

                    {/* Product Thumbnail */}
                    <div
                      onClick={() => handleOpenEdit(p, 'ALL')}
                      className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted border border-border/80 shrink-0 cursor-pointer group/thumb flex items-center justify-center"
                      title="Click to manage product photos"
                    >
                      {primaryThumb ? (
                        <img
                          src={getFileUrl(primaryThumb)}
                          alt={p.name}
                          className="w-full h-full object-contain p-1 group-hover/thumb:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = 'https://placehold.co/100x100?text=No+Img';
                          }}
                        />
                      ) : (
                        <Image className="w-6 h-6 text-muted-foreground/60" />
                      )}
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                        <Edit3 className="w-4 h-4 text-white" />
                      </div>
                      {totalPhotoCount > 0 && (
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-slate-900/80 text-white text-[9px] font-bold">
                          {totalPhotoCount}
                        </span>
                      )}
                    </div>

                    {/* Product Title, SKU, Brand & Badges */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          onClick={() => handleOpenEdit(p, 'ALL')}
                          className="text-sm font-extrabold text-foreground truncate cursor-pointer hover:text-blue-600 transition-colors"
                        >
                          {p.name}
                        </h3>

                        {p.brand && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20 text-[10px] font-bold">
                            {p.brand}
                          </span>
                        )}

                        {activeBadges.map((b, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wider ${b.cls}`}
                          >
                            {b.label}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 mt-1.5 text-[11px] text-muted-foreground">
                        <span className="font-mono font-bold text-foreground/80 bg-muted px-2 py-0.5 rounded-md border border-border/60">
                          SKU: {p.sku}
                        </span>

                        {(p.color || p.size) && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                            <Palette className="w-3 h-3 text-purple-500" />
                            {[p.color, p.size].filter(Boolean).join(' • ')}
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <RotateCcw className="w-3 h-3 text-blue-500" />
                          {p.returnPolicyType === 'NON_RETURNABLE'
                            ? 'Non-Returnable'
                            : p.returnPolicyType === 'EXCHANGE_ONLY'
                              ? `Exchange Only (${p.returnWindowDays || 7}d)`
                              : `Return & Exchange (${p.returnWindowDays || 7}d)`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Media & Variant Gallery Status Box */}
                  <div className="lg:w-72 bg-muted/30 rounded-xl p-2.5 border border-border/60 flex flex-col justify-center gap-1.5 shrink-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                        <Image className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        {numGeneralImages} General {numGeneralImages === 1 ? 'Image' : 'Images'}
                      </span>

                      {numGalleries > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/25 text-[10px] font-extrabold">
                          {numGalleries} Color {numGalleries === 1 ? 'Gallery' : 'Galleries'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">No color gallery</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      {p.hasVariants ? (
                        <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Variant Matrix Active
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Standard Single Item</span>
                      )}

                      {Array.isArray(p.specifications) && p.specifications.length > 0 && (
                        <span className="text-muted-foreground font-semibold">
                          {p.specifications.length} Specs
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Commercial Scope, Stock, Status & Three-Dot Action Menu */}
                  <div className="flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/60 shrink-0">
                    {/* Commercial Scope */}
                    <div className="text-left lg:text-right min-w-[110px]">
                      <p className="text-[11px] font-bold text-foreground truncate flex items-center lg:justify-end gap-1">
                        <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span>{p.company || 'Enterprise Global'}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {p.department || 'General Catalog'}
                      </p>
                    </div>

                    {/* Stock Pill */}
                    <div className="text-right min-w-[75px]">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border ${
                          stock > 0
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                            : 'bg-slate-500/10 text-muted-foreground border-border'
                        }`}
                      >
                        <Box className="w-3 h-3" />
                        {stock} {stock === 1 ? 'unit' : 'units'}
                      </span>
                    </div>

                    {/* Quick Storefront Publish Toggle */}
                    <button
                      type="button"
                      onClick={() => handleQuickTogglePublish(p)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                        isPub
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-slate-500/10 text-muted-foreground border-border hover:bg-muted'
                      }`}
                      title="Click to toggle storefront visibility"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isPub ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      {isPub ? 'Published' : 'Hidden'}
                    </button>

                    {/* Three-Dot Action Menu Trigger (menu renders in a portal so it never hides behind other cards) */}
                    <button
                      type="button"
                      data-menu-trigger="true"
                      onClick={(e) => handleToggleMenu(e, p)}
                      className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                        isMenuOpen
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-105'
                          : 'bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border/80'
                      }`}
                      title="Product Actions"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ─── THREE-DOT ACTION MENU (PORTAL — always on top & fully clickable) ─── */}
      {openMenuId && menuPos && typeof document !== 'undefined' && (() => {
        const menuProduct = products.find(x => x._id === openMenuId);
        if (!menuProduct) return null;
        const menuIsPub = menuProduct.isPublishedToEcommerce !== false;
        const runAction = (fn) => {
          setOpenMenuId(null);
          fn();
        };
        return createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: menuPos.top, bottom: menuPos.bottom, left: menuPos.left, width: MENU_WIDTH, zIndex: 9990 }}
            className={`rounded-2xl bg-card text-foreground border border-border shadow-[0_18px_45px_-12px_rgba(15,23,42,0.35)] py-1.5 ecom-menu-in ${
              menuPos.openUp ? 'origin-bottom-right' : 'origin-top-right'
            }`}
          >
            <div className="px-3.5 py-1.5 border-b border-border/60 mb-1">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground truncate">
                Product • {menuProduct.sku}
              </p>
            </div>

            <button
              type="button"
              onClick={() => runAction(() => handleOpenEdit(menuProduct, 'ALL'))}
              className="w-full px-3.5 py-2 text-left text-xs font-bold text-foreground hover:bg-blue-500/10 hover:text-blue-600 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-500" />
              <span>Manage Media & Catalog</span>
            </button>

            <button
              type="button"
              onClick={() => runAction(() => handleOpenEdit(menuProduct, 'MEDIA'))}
              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-purple-500/10 hover:text-purple-600 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5 text-purple-500" />
              <span>Upload / Map Color Photos</span>
            </button>

            <button
              type="button"
              onClick={() => runAction(() => setPreviewProduct(menuProduct))}
              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-indigo-500/10 hover:text-indigo-600 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-500" />
              <span>Preview Product Dossier</span>
            </button>

            <div className="my-1 border-t border-border/60" />

            <button
              type="button"
              onClick={() => runAction(() => handleQuickTogglePublish(menuProduct))}
              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-emerald-500/10 hover:text-emerald-600 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              {menuIsPub ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-amber-500" />
                  <span>Hide from Storefront</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Publish to Storefront</span>
                </>
              )}
            </button>
          </div>,
          document.body
        );
      })()}

      {/* ─── 5. QUICK PRODUCT DOSSIER PREVIEW MODAL ─── */}
      <HelpStyleModal
        isOpen={Boolean(previewProduct)}
        onClose={() => setPreviewProduct(null)}
        badge="Storefront Product Dossier"
        title={previewProduct?.name || 'Product Preview'}
        subtitle={`SKU: ${previewProduct?.sku || 'N/A'} • ${previewProduct?.company || 'Enterprise Global'} (${previewProduct?.department || 'General'})`}
        maxWidth="max-w-3xl"
      >
        {previewProduct && (
          <div className="space-y-5 ecom-slide-up">
            {/* Top Status & Quick Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3.5 rounded-xl border border-border/80">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                    previewProduct.isPublishedToEcommerce !== false
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                      : 'bg-slate-500/10 text-muted-foreground border-border'
                  }`}
                >
                  {previewProduct.isPublishedToEcommerce !== false ? 'Published on Web' : 'Hidden from Web'}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20 text-xs font-bold">
                  Stock: {previewProduct.totalStock ?? 0} units
                </span>
                {previewProduct.brand && (
                  <span className="px-2.5 py-1 rounded-lg bg-muted text-foreground text-xs font-bold border border-border">
                    Brand: {previewProduct.brand}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  const target = previewProduct;
                  setPreviewProduct(null);
                  handleOpenEdit(target, 'ALL');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Manage Media & Catalog</span>
              </button>
            </div>

            {/* General Product Images */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-2.5">
                General Product Gallery
              </h4>
              {(!previewProduct.uploadImage && (!previewProduct.images || previewProduct.images.length === 0)) ? (
                <p className="text-xs text-muted-foreground italic bg-muted/30 p-4 rounded-xl border border-border/60">
                  No general product images uploaded yet.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                  {Array.from(new Set([previewProduct.uploadImage, ...(previewProduct.images || [])].filter(Boolean))).map((img, i) => (
                    <div key={i} className="aspect-square rounded-xl border border-border/80 bg-muted/20 p-1.5 flex items-center justify-center overflow-hidden hover:border-blue-500/50 transition-all">
                      <img src={getFileUrl(img)} alt="preview" className="w-full h-full object-contain" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Color Galleries */}
            {Array.isArray(previewProduct.colorGalleries) && previewProduct.colorGalleries.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Color Galleries ({previewProduct.colorGalleries.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {previewProduct.colorGalleries.map((cg, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400">
                          {cg.colorName}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {(cg.images || []).length} photo(s)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {(cg.images || [cg.uploadImage]).filter(Boolean).map((img, i) => (
                          <img
                            key={i}
                            src={getFileUrl(img)}
                            alt={cg.colorName}
                            className="w-12 h-12 rounded-lg border border-border bg-white object-contain p-0.5 shrink-0"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description & Technical Specs */}
            {previewProduct.longDescription && (
              <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Long Description
                </p>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">
                  {previewProduct.longDescription}
                </p>
              </div>
            )}

            {Array.isArray(previewProduct.specifications) && previewProduct.specifications.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Technical Specifications ({previewProduct.specifications.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {previewProduct.specifications.map((s, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-muted/30 border border-border/60 text-xs flex justify-between gap-2">
                      <span className="font-bold text-muted-foreground">{s.key}</span>
                      <span className="font-semibold text-foreground">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </HelpStyleModal>

      {/* ─── 6. EDIT PRODUCT MEDIA & CATALOG MODAL (HELP-CENTER STYLE) ─── */}
      <HelpStyleModal
        isOpen={isModalOpen && Boolean(editingProduct)}
        onClose={() => setIsModalOpen(false)}
        badge="E-Commerce Catalog & Media Studio"
        title={editingProduct ? `Media & Variant Mapping: ${editingProduct.name}` : 'Manage Product Media'}
        subtitle={
          editingProduct
            ? `SKU: ${editingProduct.sku} ${
                editingProduct.hasVariants ? `• Variant Matrix Enabled (${productVariants.length} Active Combinations)` : ''
              }`
            : ''
        }
        maxWidth="max-w-4xl"
        footer={
          <>
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                {mediaItems.length} {mediaItems.length === 1 ? 'Photo' : 'Photos'}
              </span>
              <span>•</span>
              <span>{mediaColors.length} Color {mediaColors.length === 1 ? 'Gallery' : 'Galleries'}</span>
              <span>•</span>
              <span>{specifications.length} {specifications.length === 1 ? 'Spec' : 'Specs'}</span>
            </div>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-extrabold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Catalog & Media...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Media Catalog & Variant Mapping</span>
                </>
              )}
            </button>
          </>
        }
      >
        {editingProduct && (
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            {/* 5-Column Segmented Navigation Bar (Never Cuts Off!) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1.5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-border/80">
              {[
                { id: 'ALL', label: 'All Sections', icon: Layers },
                { id: 'MEDIA', label: `Photos (${mediaItems.length})`, icon: Image },
                { id: 'HIERARCHY', label: 'Color & Size', icon: Palette },
                { id: 'CONTENT', label: `Specs (${specifications.length})`, icon: Sliders },
                { id: 'POLICY', label: 'Badges & Policy', icon: RotateCcw }
              ].map((sec) => {
                const Icon = sec.icon;
                const active = modalSectionTab === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setModalSectionTab(sec.id)}
                    className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                      active
                        ? 'bg-blue-600 text-white shadow-sm scale-[1.01]'
                        : 'text-muted-foreground hover:text-foreground hover:bg-card/70'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{sec.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ─── SECTION 1: MEDIA CATALOG & VARIANT IMAGE MAPPING ─── */}
            {(modalSectionTab === 'ALL' || modalSectionTab === 'MEDIA') && (
              <div key="sec-media" className="ecom-slide-up space-y-3.5 p-4 bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl border border-border/80">
                {/* Compact Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-foreground flex items-center gap-2">
                      <Image size={15} className="text-blue-600" /> Media Catalog & Variant Image Mapping ({mediaItems.length} {mediaItems.length === 1 ? 'photo' : 'photos'})
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Upload general or color-specific galleries, reorder photos, or click any photo to map it to a color or exact variant.
                    </p>
                  </div>
                </div>

                {/* Combined Slim Upload Target + Dropzone Bar (Keeps Thumbnails Visible Above the Fold!) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
                  {/* Left 7 Cols: Upload Target Selector & Quick Color Pills */}
                  <div className="lg:col-span-7 p-3.5 bg-card rounded-xl border border-border/80 flex flex-col justify-between gap-2.5 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground shrink-0">
                        1. Upload Target:
                      </span>
                      <select
                        value={uploadTargetColor}
                        onChange={(e) => {
                          const val = e.target.value;
                          setUploadTargetColor(val);
                          if (val && val !== 'GENERAL') {
                            setActiveGalleryTab(val);
                          } else {
                            setActiveGalleryTab('ALL');
                          }
                        }}
                        className="h-8 px-3 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-border text-blue-600 dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer flex-1 sm:max-w-[260px]"
                      >
                        <option value="GENERAL">General Product Photos (Default)</option>
                        {availableTargetColors.map(cName => (
                          <option key={cName} value={cName}>
                            {cName} (Color Gallery)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Neat Quick-Pick Color Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                        Quick Pick:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadTargetColor('GENERAL');
                          setActiveGalleryTab('ALL');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all duration-150 cursor-pointer ${
                          uploadTargetColor === 'GENERAL' || !uploadTargetColor
                            ? 'bg-slate-900 text-white dark:bg-blue-600 shadow-2xs scale-105'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        General
                      </button>
                      {availableTargetColors.map(cName => {
                        const isTarget = uploadTargetColor.toLowerCase() === cName.toLowerCase();
                        return (
                          <button
                            key={cName}
                            type="button"
                            onClick={() => {
                              setUploadTargetColor(cName);
                              setActiveGalleryTab(cName);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all duration-150 cursor-pointer ${
                              isTarget
                                ? 'bg-purple-600 text-white shadow-2xs ring-2 ring-purple-400/40 scale-105'
                                : 'bg-purple-500/10 text-purple-600 dark:text-purple-300 hover:bg-purple-500/20'
                            }`}
                          >
                            {cName}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right 5 Cols: Compact Interactive Upload Dropzone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`lg:col-span-5 border-2 border-dashed rounded-xl px-4 py-3 flex items-center gap-3.5 transition-all duration-200 cursor-pointer group ${
                      uploadTargetColor && uploadTargetColor !== 'GENERAL'
                        ? 'border-purple-400/90 hover:border-purple-600 bg-purple-500/5 hover:bg-purple-500/10'
                        : 'border-blue-400/90 hover:border-blue-600 bg-blue-500/5 hover:bg-blue-500/10'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/*"
                      className="hidden"
                    />
                    <div
                      className={`w-10 h-10 rounded-xl text-white flex items-center justify-center shrink-0 shadow-md ecom-float-icon group-hover:scale-110 transition-transform ${
                        uploadTargetColor && uploadTargetColor !== 'GENERAL'
                          ? 'bg-purple-600 shadow-purple-500/25'
                          : 'bg-blue-600 shadow-blue-500/25'
                      }`}
                    >
                      {isUploadingImage ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <UploadCloud size={18} />
                      )}
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="font-extrabold text-xs text-foreground leading-snug truncate">
                        {isUploadingImage
                          ? `Uploading to ${uploadTargetColor !== 'GENERAL' ? uploadTargetColor : 'General'}...`
                          : uploadTargetColor && uploadTargetColor !== 'GENERAL'
                            ? `Upload "${uploadTargetColor}" Photos`
                            : 'Upload Photos from PC'}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                        Click to browse multiple JPG, PNG, WebP files
                      </p>
                    </div>
                  </div>
                </div>

                {/* Combined Gallery Filter Tabs + Bulk Selection Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-card rounded-xl border border-border/80">
                  {/* Left: Gallery Filtering Tabs */}
                  <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <button
                      type="button"
                      onClick={() => setActiveGalleryTab('ALL')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                        activeGalleryTab === 'ALL'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      All Images ({mediaItems.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveGalleryTab('GENERAL')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                        activeGalleryTab === 'GENERAL'
                          ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      General ({mediaItems.filter(i => i.scope === 'GENERAL').length})
                    </button>
                    {mediaColors.map(cName => {
                      const count = mediaItems.filter(i => i.scope === 'COLOR' && i.colorName?.toLowerCase() === cName.toLowerCase()).length;
                      return (
                        <button
                          key={cName}
                          type="button"
                          onClick={() => setActiveGalleryTab(cName)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                            activeGalleryTab.toLowerCase() === cName.toLowerCase()
                              ? 'bg-purple-600 text-white shadow-2xs'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`}
                        >
                          <span>{cName}</span>
                          <span className="opacity-75 text-[10px]">({count})</span>
                        </button>
                      );
                    })}
                    {mediaItems.some(i => i.scope === 'VARIANT') && (
                      <button
                        type="button"
                        onClick={() => setActiveGalleryTab('VARIANTS')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                          activeGalleryTab === 'VARIANTS'
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        Variants ({mediaItems.filter(i => i.scope === 'VARIANT').length})
                      </button>
                    )}
                  </div>

                  {/* Right: Checkbox Select All / Bulk Move */}
                  <div className="flex items-center gap-2 flex-wrap border-t sm:border-t-0 pt-2 sm:pt-0 border-border/60">
                    <button
                      type="button"
                      onClick={() => handleSelectAllFiltered(filteredMediaItems)}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
                    >
                      {selectedMediaIds.size === filteredMediaItems.length && filteredMediaItems.length > 0
                        ? 'Deselect All'
                        : `Select All (${filteredMediaItems.length})`}
                    </button>

                    {selectedMediaIds.size > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap animate-in fade-in duration-150">
                        <span className="bg-blue-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full">
                          {selectedMediaIds.size}
                        </span>
                        <select
                          value={bulkAssignTargetColor}
                          onChange={(e) => setBulkAssignTargetColor(e.target.value)}
                          className="h-7 px-2 text-[11px] font-bold rounded-lg bg-muted/60 border border-border text-foreground"
                        >
                          <option value="">Move to...</option>
                          <option value="GENERAL">General Gallery</option>
                          {availableTargetColors.map(c => (
                            <option key={c} value={c}>{c} Gallery</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleApplyBulkAssign}
                          className="h-7 text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white px-2.5 rounded-lg cursor-pointer"
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={handleBulkDelete}
                          className="h-7 text-[11px] font-bold bg-rose-600 hover:bg-rose-500 text-white px-2 rounded-lg cursor-pointer"
                          title="Delete selected images"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Current Image Thumbnails Grid */}
                {filteredMediaItems.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-8 text-center bg-card rounded-xl border border-border/60">
                    No images in this gallery view yet. Upload photos above to populate this gallery.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {filteredMediaItems.map((item, idx) => {
                      const actualIndex = mediaItems.findIndex(orig => orig === item || (orig.url === item.url && orig.id === item.id));
                      const itemKey = item.id || `idx_${actualIndex}_${item.url}`;
                      const isSelected = selectedMediaIds.has(itemKey);

                      let badgeText = 'General';
                      let badgeColorClass = 'bg-slate-700 text-white';
                      if (item.scope === 'COLOR') {
                        badgeText = `${item.colorName || 'Color'}`;
                        badgeColorClass = item.isMain ? 'bg-purple-700 text-white font-black' : 'bg-purple-600 text-white';
                      } else if (item.scope === 'VARIANT') {
                        badgeText = `${item.colorName || 'Var'}/${item.sizeName || ''}`;
                        badgeColorClass = item.isMain ? 'bg-amber-700 text-white font-black' : 'bg-amber-600 text-white';
                      } else if (item.scope === 'MAIN' || item.isMain) {
                        badgeText = 'General Main';
                        badgeColorClass = 'bg-blue-600 text-white font-black';
                      }

                      return (
                        <div
                          key={itemKey}
                          style={{ animationDelay: `${Math.min(idx * 30, 200)}ms` }}
                          className={`ecom-slide-up relative group rounded-2xl overflow-hidden border-2 p-1.5 bg-card aspect-square flex flex-col items-center justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                            isSelected
                              ? 'border-blue-600 shadow-md ring-2 ring-blue-500/30 bg-blue-500/5'
                              : item.isMain
                                ? 'border-blue-500/80 shadow-sm'
                                : 'border-border/80 hover:border-blue-500/40'
                          }`}
                        >
                          {/* Selection Checkbox */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-1.5 right-1.5 z-20"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectMedia(itemKey)}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer shadow-sm accent-blue-600"
                              title="Select image for bulk actions"
                            />
                          </div>

                          {/* Image Thumbnail */}
                          <div
                            onClick={() => handleOpenAssignModal(actualIndex)}
                            className="w-full h-full flex items-center justify-center overflow-hidden rounded-xl cursor-pointer p-2 pb-7"
                            title="Click to assign color or variant"
                          >
                            <img
                              src={getFileUrl(item.url)}
                              alt="gallery"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = 'https://placehold.co/100x100?text=Error';
                              }}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>

                          {/* Distinct Badge on Thumbnail */}
                          <span
                            className={`absolute top-1.5 left-1.5 text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-md shadow-xs max-w-[68%] truncate z-10 ${badgeColorClass}`}
                            title={badgeText}
                          >
                            {item.isMain && '★ '}
                            {badgeText}
                          </span>

                          {/* Reordering Controls */}
                          <div className="absolute top-7 right-1.5 flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            {actualIndex > 0 && (
                              <button
                                type="button"
                                onClick={() => handleMoveImage(actualIndex, -1)}
                                className="p-1 rounded bg-slate-900/80 text-white hover:bg-slate-900 text-[10px] cursor-pointer"
                                title="Move Earlier"
                              >
                                <ArrowLeft size={10} />
                              </button>
                            )}
                            {actualIndex < mediaItems.length - 1 && (
                              <button
                                type="button"
                                onClick={() => handleMoveImage(actualIndex, 1)}
                                className="p-1 rounded bg-slate-900/80 text-white hover:bg-slate-900 text-[10px] cursor-pointer"
                                title="Move Later"
                              >
                                <ArrowRight size={10} />
                              </button>
                            )}
                          </div>

                          {/* Bottom Action Bar */}
                          <div className="absolute inset-x-1 bottom-1 bg-slate-950/90 backdrop-blur-xs rounded-xl p-1 flex items-center justify-between gap-1 shadow-lg z-10">
                            <button
                              type="button"
                              onClick={() => handleOpenAssignModal(actualIndex)}
                              className="px-2 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-500 text-[9px] font-bold flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                              title="Assign to Color or Variant"
                            >
                              <Edit3 size={10} /> Assign
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSetMain(actualIndex)}
                              className={`px-1.5 py-1 rounded-md text-[9px] font-bold cursor-pointer transition-colors ${
                                item.isMain
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                              }`}
                              title="Set as Main for this gallery"
                            >
                              {item.isMain ? '★ Main' : 'Main'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveImage(actualIndex)}
                              className="p-1 rounded-md bg-rose-600/90 text-white hover:bg-rose-600 cursor-pointer transition-colors"
                              title="Remove Photo"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* INDIVIDUAL IMAGE ASSIGNMENT PANEL */}
                {assigningItemIndex !== null && mediaItems[assigningItemIndex] && (
                  <div className="p-4 bg-card rounded-2xl border-2 border-blue-500/60 space-y-4 ecom-modal-pop shadow-md">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-foreground flex items-center gap-2">
                        <Sliders size={15} className="text-blue-600" /> Configure Image Association
                      </h4>
                      <button
                        type="button"
                        onClick={() => setAssigningItemIndex(null)}
                        className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X size={15} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl border border-border overflow-hidden bg-white shrink-0 p-1">
                          <img
                            src={getFileUrl(mediaItems[assigningItemIndex].url)}
                            alt="selected"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="text-[11px] min-w-0">
                          <p className="font-bold text-foreground truncate">{editingProduct.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">SKU: {editingProduct.sku}</p>
                        </div>
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[11px] font-bold text-foreground block">
                          Assign Image To:
                        </label>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {[
                            { id: 'GENERAL', label: 'General Product Gallery', activeCls: 'border-blue-600 bg-blue-500/10 text-blue-600' },
                            { id: 'COLOR', label: 'Color Gallery', activeCls: 'border-purple-600 bg-purple-500/10 text-purple-600' },
                            { id: 'VARIANT', label: 'Exact Product Variant', activeCls: 'border-amber-600 bg-amber-500/10 text-amber-600' }
                          ].map(sc => (
                            <button
                              key={sc.id}
                              type="button"
                              onClick={() => setAssignTargetScope(sc.id)}
                              className={`px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
                                assignTargetScope === sc.id
                                  ? sc.activeCls
                                  : 'border-border text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {sc.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {assignTargetScope === 'COLOR' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="text-[11px] font-bold text-foreground block mb-1">
                            Associate with Color (from Color Master)
                          </label>
                          <select
                            value={assignColor}
                            onChange={(e) => setAssignColor(e.target.value)}
                            className="w-full h-9 px-3 text-xs font-bold rounded-xl border border-border bg-muted/40 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="">-- Select Color --</option>
                            {colorMasters.map(c => (
                              <option key={c._id || c.name} value={c.name}>
                                {c.name} {c.code ? `(${c.code})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center pt-4">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
                            <input
                              type="checkbox"
                              checked={assignIsMain}
                              onChange={(e) => setAssignIsMain(e.target.checked)}
                              className="rounded text-purple-600 focus:ring-purple-500"
                            />
                            Set as Primary / Main Image for this Color
                          </label>
                        </div>
                      </div>
                    )}

                    {assignTargetScope === 'VARIANT' && (
                      <div className="space-y-3 pt-1">
                        <div>
                          <label className="text-[11px] font-bold text-foreground block mb-1">
                            Select Exact Product Variant ({productVariants.length} configured)
                          </label>
                          {productVariants.length === 0 ? (
                            <p className="text-xs text-amber-600 italic">
                              No active variants generated for this product. Use Color Gallery or enable Variant Matrix.
                            </p>
                          ) : (
                            <select
                              value={assignVariantId}
                              onChange={(e) => setAssignVariantId(e.target.value)}
                              className="w-full h-9 px-3 text-xs font-bold rounded-xl border border-border bg-muted/40 text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                            >
                              <option value="">-- Choose Exact Variant --</option>
                              {productVariants.map(v => {
                                const attrs = v.attributes || {};
                                const attrDesc = Object.entries(attrs).map(([k, val]) => `${k}: ${val}`).join(' • ');
                                return (
                                  <option key={v._id} value={v._id}>
                                    {v.sku} ({attrDesc || 'Variant'})
                                  </option>
                                );
                              })}
                            </select>
                          )}
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
                          <input
                            type="checkbox"
                            checked={assignIsMain}
                            onChange={(e) => setAssignIsMain(e.target.checked)}
                            className="rounded text-amber-600 focus:ring-amber-500"
                          />
                          Set as Primary / Main Image for this Variant
                        </label>
                      </div>
                    )}

                    {assignTargetScope === 'GENERAL' && (
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground pt-1">
                        <input
                          type="checkbox"
                          checked={assignIsMain}
                          onChange={(e) => setAssignIsMain(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        Set as Primary / Main Image for General Parent Product
                      </label>
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t border-border">
                      <button
                        type="button"
                        onClick={() => setAssigningItemIndex(null)}
                        className="px-3 py-1.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyAssignment}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                      >
                        <Check size={14} /> Apply Assignment
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── SECTION 2: DEFAULT COLOR & SIZE MASTER HIERARCHY ─── */}
            {(modalSectionTab === 'ALL' || modalSectionTab === 'HIERARCHY') && (
              <div key="sec-hierarchy" className="ecom-slide-up space-y-4 p-4 bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl border border-border/80">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Palette size={15} className="text-purple-600" /> Default Color & Size Master Hierarchy
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      Color Master: {colorMasters.length} active
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20">
                      Size Master: {sizeMasters.length} active
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Product Default Color
                    </label>
                    <select
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Select Color from Color Master --</option>
                      {colorMasters.map(c => (
                        <option key={c._id || c.name} value={c.name}>
                          {c.name} {c.code ? `(${c.code})` : ''}
                        </option>
                      ))}
                      {selectedColor && !colorMasters.some(c => c.name.toLowerCase() === selectedColor.toLowerCase()) && (
                        <option value={selectedColor}>Current: {selectedColor}</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Product Default Size
                    </label>
                    <select
                      value={selectedSize}
                      onChange={(e) => setSelectedSize(e.target.value)}
                      className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Select Size from Size Master --</option>
                      {sizeMasters.map(s => (
                        <option key={s._id || s.name} value={s.name}>
                          {s.name} {s.code ? `(${s.code})` : ''}
                        </option>
                      ))}
                      {selectedSize && !sizeMasters.some(s => s.name.toLowerCase() === selectedSize.toLowerCase()) && (
                        <option value={selectedSize}>Current: {selectedSize}</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ─── SECTION 3: LONG DESCRIPTION & TECHNICAL SPECIFICATIONS ─── */}
            {(modalSectionTab === 'ALL' || modalSectionTab === 'CONTENT') && (
              <div key="sec-content" className="ecom-slide-up space-y-4 p-4 bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl border border-border/80">
                <div>
                  <label className="font-extrabold text-xs uppercase tracking-wider text-foreground block mb-2">
                    Full Long Description / Technical Overview
                  </label>
                  <textarea
                    rows={4}
                    value={longDescription}
                    onChange={(e) => setLongDescription(e.target.value)}
                    placeholder="Comprehensive technical details, features, and manufacturer description for storefront visitors..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-3 pt-2 border-t border-border/60">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Layers size={15} className="text-purple-600" /> Technical Specifications ({specifications.length})
                  </h4>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Specification Key (e.g. Material, Processor, RAM)"
                      value={newSpecKey}
                      onChange={(e) => setNewSpecKey(e.target.value)}
                      className="flex-1 h-9 px-3 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. 100% Cotton, Apple M3 Max, 16GB)"
                      value={newSpecVal}
                      onChange={(e) => setNewSpecVal(e.target.value)}
                      className="flex-1 h-9 px-3 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddSpec}
                      className="inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shrink-0 cursor-pointer"
                    >
                      <Plus size={14} /> Add Spec
                    </button>
                  </div>

                  {specifications.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {specifications.map((spec, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/80 text-xs"
                        >
                          <div className="truncate pr-2">
                            <span className="font-bold text-foreground">{spec.key}: </span>
                            <span className="text-muted-foreground">{spec.value}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSpec(i)}
                            className="p-1 text-muted-foreground hover:text-rose-500 cursor-pointer shrink-0"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── SECTION 4: MERCHANDISING BADGES & RETURN POLICY ─── */}
            {(modalSectionTab === 'ALL' || modalSectionTab === 'POLICY') && (
              <div key="sec-policy" className="ecom-slide-up space-y-4">
                {/* Promotional Merchandising Badges */}
                <div className="space-y-3.5 p-4 bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl border border-border/80">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Sparkles size={15} className="text-amber-500" /> Storefront Merchandising Badges
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                      { label: 'Published to Web', val: isPublishedToEcommerce, set: setIsPublishedToEcommerce },
                      { label: 'Featured Product', val: isFeatured, set: setIsFeatured },
                      { label: 'Best Seller', val: isBestSeller, set: setIsBestSeller },
                      { label: 'Trending Now', val: isTrending, set: setIsTrending },
                      { label: 'Deal of the Day', val: isDealOfTheDay, set: setIsDealOfTheDay },
                      { label: 'New Arrival', val: isNewArrival, set: setIsNewArrival }
                    ].map((chk, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          chk.val
                            ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300 font-bold'
                            : 'bg-card border-border/80 text-foreground hover:bg-muted/40'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={chk.val}
                          onChange={(e) => chk.set(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500 accent-blue-600"
                        />
                        <span className="text-xs">{chk.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="pt-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Custom Storefront Highlight Badge (Optional)
                    </label>
                    <input
                      type="text"
                      value={ecommerceBadge}
                      onChange={(e) => setEcommerceBadge(e.target.value)}
                      placeholder="e.g. FLASH SALE - 20% OFF, LIMITED EDITION"
                      className="w-full h-9 px-3 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Return & Exchange Policy Card */}
                <div className="space-y-3.5 p-4 bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl border border-border/80">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-foreground flex items-center gap-2">
                      <RotateCcw size={15} className="text-purple-600" /> Return & Exchange Policy
                    </h4>
                    <span className="text-[11px] text-muted-foreground font-semibold">Storefront Eligibility</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <label
                      className={`p-3 rounded-xl border text-xs cursor-pointer flex flex-col gap-1 transition-all ${
                        returnPolicyType === 'RETURN_AND_EXCHANGE'
                          ? 'border-purple-600 bg-purple-500/10 font-bold text-purple-700 dark:text-purple-300'
                          : 'border-border bg-card hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="returnPolicyType"
                          checked={returnPolicyType === 'RETURN_AND_EXCHANGE'}
                          onChange={() => setReturnPolicyType('RETURN_AND_EXCHANGE')}
                        />
                        <span>Return & Exchange</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-normal ml-5">
                        Customer can exchange size/color or request full money refund.
                      </p>
                    </label>

                    <label
                      className={`p-3 rounded-xl border text-xs cursor-pointer flex flex-col gap-1 transition-all ${
                        returnPolicyType === 'EXCHANGE_ONLY'
                          ? 'border-amber-600 bg-amber-500/10 font-bold text-amber-700 dark:text-amber-300'
                          : 'border-border bg-card hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="returnPolicyType"
                          checked={returnPolicyType === 'EXCHANGE_ONLY'}
                          onChange={() => setReturnPolicyType('EXCHANGE_ONLY')}
                        />
                        <span>Exchange / Swap Only</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-normal ml-5">
                        Replacement provided for defects or sizes. No cash refunds.
                      </p>
                    </label>

                    <label
                      className={`p-3 rounded-xl border text-xs cursor-pointer flex flex-col gap-1 transition-all ${
                        returnPolicyType === 'NON_RETURNABLE'
                          ? 'border-rose-600 bg-rose-500/10 font-bold text-rose-700 dark:text-rose-300'
                          : 'border-border bg-card hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="returnPolicyType"
                          checked={returnPolicyType === 'NON_RETURNABLE'}
                          onChange={() => setReturnPolicyType('NON_RETURNABLE')}
                        />
                        <span>Non-Returnable</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-normal ml-5">
                        Strictly non-returnable. No return, exchange or refund allowed.
                      </p>
                    </label>
                  </div>

                  {returnPolicyType !== 'NON_RETURNABLE' ? (
                    <div className="w-full sm:w-56 pt-1">
                      <label className="text-[11px] font-bold text-foreground block mb-1">
                        Return Window (Days)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={returnWindowDays}
                        onChange={e => setReturnWindowDays(Number(e.target.value))}
                        className="w-full h-9 px-3 text-xs bg-card border border-border rounded-xl text-foreground"
                      />
                    </div>
                  ) : (
                    <div className="pt-1">
                      <label className="text-[11px] font-bold text-rose-600 block mb-1">
                        Non-Returnable Reason (Displayed to Customer)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Hygiene & Personal Care item / Final Clearance Sale"
                        value={nonReturnableReason}
                        onChange={e => setNonReturnableReason(e.target.value)}
                        className="w-full h-9 px-3 text-xs bg-card border border-rose-500/40 rounded-xl text-foreground"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        )}
      </HelpStyleModal>
    </div>
  );
};

export default EcomProductMedia;

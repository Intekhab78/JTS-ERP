import { FloatingMenu } from '../../components/common/FloatingMenu';
import { createPortal } from 'react-dom';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Settings, Building2, Shield, Layers, Save, CheckCircle2, 
  HelpCircle, AlertTriangle, ArrowUpDown, Calculator, RotateCcw,
  Sliders, Globe, LayoutGrid, CheckSquare, Square, ChevronRight,
  ChevronDown, Search, Plus, Trash2, Edit2, MoveUp, MoveDown,
  ShoppingBag, Sparkles, Flame, Eye, RefreshCw, Image as ImageIcon,
  ExternalLink, Link as LinkIcon, Palette, Layout, ShieldCheck, Tag, X,
  MapPin, Check, QrCode, CreditCard, Camera, PenTool, Mail, Phone, DollarSign,
  Package, MoreVertical, SlidersHorizontal, CheckCircle
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/common/FormField';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { CURRENCIES as CURRENCY_LIST, CURRENCY_SYMBOLS as CURRENCY_SYMBOLS_MAP } from '../../config/currencies';

const QUICK_LINKS = [
  { label: 'All Catalog Products', path: '/catalog' },
  { label: 'Laptops & Computers', path: '/catalog?category=Computers' },
  { label: 'Smartphones & Mobiles', path: '/catalog?category=Smartphones' },
  { label: 'Workstations & Desktops', path: '/catalog?category=Workstations' },
  { label: 'Peripherals & Accessories', path: '/catalog?category=Computer%20Accessories' },
  { label: 'Flash Sale & Limited Deals', path: '/catalog?filter=deals' },
  { label: 'New Arrivals', path: '/catalog?sort=newest' },
  { label: 'Top Best Sellers', path: '/catalog?sort=popularity' }
];

const BANNER_GRADIENTS = [
  { id: 'dark', label: 'Deep Obsidian', value: 'from-slate-950 via-slate-900 to-slate-950', border: 'border-slate-800' },
  { id: 'sapphire', label: 'Midnight Sapphire', value: 'from-slate-950 via-blue-950 to-slate-900', border: 'border-blue-900/50' },
  { id: 'purple', label: 'Royal Violet', value: 'from-slate-950 via-purple-950 to-slate-900', border: 'border-purple-900/50' },
  { id: 'emerald', label: 'Emerald Tech', value: 'from-slate-950 via-emerald-950 to-slate-900', border: 'border-emerald-900/50' },
  { id: 'amber', label: 'Sunset Amber', value: 'from-slate-950 via-amber-950 to-slate-900', border: 'border-amber-900/50' },
  { id: 'rose', label: 'Crimson Rose', value: 'from-slate-950 via-rose-950 to-slate-900', border: 'border-rose-900/50' }
];

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
  @keyframes ecomMenuIn { from { opacity: 0; transform: scale(0.96) translateY(-4px); } to { opacity: 1; transform: none; } }
  @keyframes ecomFloatIcon { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-3px); } }
  .ecom-fade-in { animation: ecomFadeIn 0.3s ease-out; }
  .ecom-menu-in { animation: ecomMenuIn 0.16s cubic-bezier(0.16, 1, 0.3, 1); }
  .ecom-modal-backdrop { animation: ecomModalBackdrop 0.22s ease-out forwards; }
  .ecom-modal-pop { animation: ecomModalPop 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .ecom-slide-up { animation: ecomSlideUpFade 0.26s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
  .ecom-float-icon { animation: ecomFloatIcon 2.4s ease-in-out infinite; }
`;

const EcomSettings = () => {
  const [activeTab, setActiveTab] = useState('company_mapping'); // 'company_mapping' | 'catalog_mapping' | 'home_blocks' | 'inventory_rules' | 'policies'
  
  // Safe default initialization to prevent controlled/uncontrolled input warnings
  const [settings, setSettings] = useState({
    storeName: '',
    storeEmail: '',
    supportPhone: '',
    currency: 'INR',
    currencySymbol: '₹',
    shippingCharge: 0,
    freeShippingThreshold: 0,
    requireEmailOtp: true,
    requireDeliveryPod: true,
    enableRiderPhotoPod: true,
    enableRiderSignaturePod: true,
    enableRiderCodUpi: true,
    enableRiderCodCard: true,
    allowOrderCancellation: true,
    allowReturns: true,
    returnWindowDays: 7,
    mappedGroupCompanyId: '',
    mappedCompanies: [],
    mappedBranches: [],
    mappedDepartments: [],
    mappedCategories: [],
    mappedFamilies: [],
    mappedSubFamilies: [],
    includedLocations: []
  });

  const [companyHierarchy, setCompanyHierarchy] = useState({ groupCompany: null, companies: [], branches: [] });
  const [catalogHierarchy, setCatalogHierarchy] = useState({ departments: [], sections: [], families: [], subFamilies: [], totalProducts: 0 });
  const [homeBlocks, setHomeBlocks] = useState([]);
  const [availableBanners, setAvailableBanners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Dynamic list of currencies: includes companyHierarchy currencies + full ERP list
  const availableCurrencies = React.useMemo(() => {
    const list = [...CURRENCY_LIST];
    const existingCodes = new Set(list.map(c => c.code));

    // Dynamically add group company currency if configured
    if (companyHierarchy?.groupCompany?.currency && !existingCodes.has(companyHierarchy.groupCompany.currency)) {
      list.unshift({
        code: companyHierarchy.groupCompany.currency,
        symbol: CURRENCY_SYMBOLS_MAP[companyHierarchy.groupCompany.currency] || companyHierarchy.groupCompany.currency,
        name: `${companyHierarchy.groupCompany.currency} (Group Base)`
      });
      existingCodes.add(companyHierarchy.groupCompany.currency);
    }
    // Dynamically add legal company base currencies
    companyHierarchy?.companies?.forEach(c => {
      if (c.baseCurrency && !existingCodes.has(c.baseCurrency)) {
        list.unshift({
          code: c.baseCurrency,
          symbol: CURRENCY_SYMBOLS_MAP[c.baseCurrency] || c.baseCurrency,
          name: `${c.baseCurrency} (${c.name || 'Company'})`
        });
        existingCodes.add(c.baseCurrency);
      }
    });
    // Ensure current store setting currency is in the list
    if (settings.currency && !existingCodes.has(settings.currency)) {
      list.unshift({
        code: settings.currency,
        symbol: settings.currencySymbol || CURRENCY_SYMBOLS_MAP[settings.currency] || settings.currency,
        name: settings.currency
      });
    }
    return list;
  }, [companyHierarchy, settings.currency, settings.currencySymbol]);

  // Search & Filter state for catalog hierarchy
  const [catalogSearch, setCatalogSearch] = useState('');
  const [expandedDepts, setExpandedDepts] = useState({});

  // Block Modal / Form State
  const [editingBlock, setEditingBlock] = useState(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockCategoryTab, setBlockCategoryTab] = useState('banner'); // 'product' | 'banner'
  const [blockForm, setBlockForm] = useState({
    title: '',
    subtitle: '',
    blockType: 'SINGLE_BANNER',
    filterType: 'all',
    filterValue: '',
    itemLimit: 8,
    order: 0,
    isActive: true,
    customConfig: {
      bannerImageUrl: '',
      bannerLink: '/catalog',
      buttonText: 'Shop Now',
      bannerHeight: 'medium',
      bgGradient: 'dark',
      bannerBadge: '',
      badgeText: '',
      countdownHours: 8,
      viewAllLink: '/catalog',
      promoCardsMode: 'auto',
      promoCards: [
        { tag: 'COMPUTERS', title: 'Laptops & Pro Workstations', subtitle: '4 verified items available in stock', linkUrl: '/catalog?category=Computers', palette: 'blue', imageUrl: '' },
        { tag: 'COMPUTER ACCESSORIES', title: 'Peripherals & Accessories', subtitle: '1 verified items available in stock', linkUrl: '/catalog?category=Computer%20Accessories', palette: 'indigo', imageUrl: '' },
        { tag: 'SMARTPHONES', title: 'Mobile & Connected Tech', subtitle: 'Flagship 5G devices & smart accessories', linkUrl: '/catalog?search=phone', palette: 'purple', imageUrl: '' }
      ],
      multiBanners: [
        { title: 'Mega Tech Deals', subtitle: 'Up to 50% Off Top Laptops', badge: '50% OFF', imageUrl: '', linkUrl: '/catalog?category=Computers', buttonText: 'Shop Now', bgGradient: 'sapphire' },
        { title: 'Flagship Mobiles', subtitle: 'Experience 5G speed & cameras', badge: 'NEW', imageUrl: '', linkUrl: '/catalog?category=Smartphones', buttonText: 'Explore', bgGradient: 'purple' }
      ]
    }
  });

  // Simulation test state
  const [simStocks, setSimStocks] = useState({
    loc1: 25,
    loc2: 35,
    loc3: 40
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [settingsRes, compRes, catRes, blocksRes, bannersRes] = await Promise.all([
        axios.get('/api/v1/ecommerce-admin/settings', { headers }),
        axios.get('/api/v1/ecommerce-admin/company-hierarchy', { headers }),
        axios.get('/api/v1/ecommerce-admin/catalog-hierarchy', { headers }),
        axios.get('/api/v1/ecommerce-admin/home-blocks', { headers }),
        axios.get('/api/v1/ecommerce-admin/banners', { headers }).catch(() => ({ data: [] }))
      ]);

      setAvailableBanners(bannersRes.data || []);

      const s = settingsRes.data?.settings || settingsRes.data || {};
      const branches = settingsRes.data?.availableBranches || compRes.data?.branches || [];

      // Merge locations
      const mergedLocations = branches.map((branch, index) => {
        const existing = (s.includedLocations || []).find(
          l => (l.branchId?._id || l.branchId)?.toString() === branch._id?.toString()
        );

        if (existing) {
          return {
            branchId: branch._id,
            branchName: branch.name,
            safetyStockType: existing.safetyStockType || 'FIXED',
            safetyStockValue: existing.safetyStockValue !== undefined ? existing.safetyStockValue : 10,
            pickPriority: existing.pickPriority || index + 1,
            isActive: existing.isActive !== false
          };
        }

        return {
          branchId: branch._id,
          branchName: branch.name,
          safetyStockType: 'FIXED',
          safetyStockValue: 10,
          pickPriority: index + 1,
          isActive: false
        };
      });

      setSettings({
        currency: s.currency || 'INR',
        currencySymbol: s.currencySymbol || '₹',
        shippingCharge: Number(s.shippingCharge ?? 0),
        freeShippingThreshold: Number(s.freeShippingThreshold ?? 0),
        storeName: s.storeName || 'JTS E-Commerce Store',
        storeEmail: s.storeEmail || 'orders@jtsecommerce.com',
        supportPhone: s.supportPhone || '+971 4 000 0000',
        requireEmailOtp: s.requireEmailOtp !== false,
        requireDeliveryPod: s.requireDeliveryPod !== false,
        enableRiderPhotoPod: s.enableRiderPhotoPod !== false,
        enableRiderSignaturePod: s.enableRiderSignaturePod !== false,
        enableRiderCodUpi: s.enableRiderCodUpi !== false,
        enableRiderCodCard: s.enableRiderCodCard !== false,
        allowOrderCancellation: s.allowOrderCancellation !== false,
        allowReturns: s.allowReturns !== false,
        returnWindowDays: s.returnWindowDays || 7,
        mappedGroupCompanyId: s.mappedGroupCompanyId || compRes.data?.groupCompany?._id || '',
        mappedCompanies: s.mappedCompanies || (compRes.data?.companies || []).map(c => c._id),
        mappedBranches: s.mappedBranches || (compRes.data?.branches || []).map(b => b._id),
        mappedDepartments: s.mappedDepartments || [],
        mappedCategories: s.mappedCategories || [],
        mappedFamilies: s.mappedFamilies || [],
        mappedSubFamilies: s.mappedSubFamilies || [],
        includedLocations: mergedLocations
      });

      setCompanyHierarchy(compRes.data || { groupCompany: null, companies: [], branches: [] });
      setCatalogHierarchy(catRes.data || { departments: [], sections: [], families: [], subFamilies: [], totalProducts: 0 });
      setHomeBlocks(blocksRes.data || []);
      
      // Expand first department by default
      if (catRes.data?.departments?.length > 0) {
        setExpandedDepts({ [catRes.data.departments[0]._id]: true });
      }

    } catch (error) {
      console.error('Failed to load settings data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...settings,
        shippingCharge: settings.shippingCharge === '' ? 0 : Number(settings.shippingCharge || 0),
        freeShippingThreshold: settings.freeShippingThreshold === '' ? 0 : Number(settings.freeShippingThreshold || 0),
        returnWindowDays: settings.returnWindowDays === '' ? 7 : Number(settings.returnWindowDays || 7),
        includedLocations: (settings.includedLocations || []).map(loc => ({
          ...loc,
          safetyStockValue: Number(loc.safetyStockValue || 0)
        }))
      };
      await axios.put('/api/v1/ecommerce-admin/settings', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(prev => ({
        ...prev,
        shippingCharge: payload.shippingCharge,
        freeShippingThreshold: payload.freeShippingThreshold,
        returnWindowDays: payload.returnWindowDays
      }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save e-commerce settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLocationChange = (index, field, value) => {
    const updated = [...(settings.includedLocations || [])];
    updated[index] = { ...updated[index], [field]: value };
    setSettings({ ...settings, includedLocations: updated });
  };

  // Toggle Company selection
  const toggleCompanyMapping = (companyId) => {
    const current = settings.mappedCompanies || [];
    const exists = current.includes(companyId);
    let updatedCompanies;
    let updatedBranches = [...(settings.mappedBranches || [])];
    let updatedLocations = [...(settings.includedLocations || [])];

    // Find all branches under this company
    const companyBranchIds = (companyHierarchy.branches || [])
      .filter(b => b.legalCompanyId?.toString() === companyId?.toString() || b.companyId?.toString() === companyId?.toString())
      .map(b => b._id.toString());

    if (exists) {
      // Exclude company and all its branches
      updatedCompanies = current.filter(id => id !== companyId);
      updatedBranches = updatedBranches.filter(id => !companyBranchIds.includes(id.toString()));
      updatedLocations = updatedLocations.map(loc => {
        const bId = (loc.branchId?._id || loc.branchId)?.toString();
        if (companyBranchIds.includes(bId)) {
          return { ...loc, isActive: false };
        }
        return loc;
      });
    } else {
      // Include company
      updatedCompanies = [...current, companyId];
    }

    setSettings({
      ...settings,
      mappedCompanies: updatedCompanies,
      mappedBranches: updatedBranches,
      includedLocations: updatedLocations
    });
  };

  // Toggle Branch selection
  const toggleBranchMapping = (branchId) => {
    const current = settings.mappedBranches || [];
    const exists = current.includes(branchId);
    let updatedBranches;
    if (exists) {
      updatedBranches = current.filter(id => id !== branchId);
    } else {
      updatedBranches = [...current, branchId];
    }

    // Also update includedLocations isActive
    const updatedLocations = (settings.includedLocations || []).map(loc => {
      if ((loc.branchId?._id || loc.branchId)?.toString() === branchId?.toString()) {
        return { ...loc, isActive: !exists };
      }
      return loc;
    });

    setSettings({ ...settings, mappedBranches: updatedBranches, includedLocations: updatedLocations });
  };

  // Catalog Hierarchy toggles
  const toggleHierarchyItem = (type, id) => {
    const key = type === 'department' ? 'mappedDepartments'
      : type === 'section' ? 'mappedCategories'
      : type === 'family' ? 'mappedFamilies'
      : 'mappedSubFamilies';

    const idStr = String(id?._id || id);
    const current = (settings[key] || []).map(i => String(i?._id || i));
    const exists = current.includes(idStr);
    const updated = exists ? current.filter(i => i !== idStr) : [...current, idStr];
    setSettings({ ...settings, [key]: updated });
  };

  const handleSelectAllHierarchy = (selectAll = true) => {
    if (selectAll) {
      setSettings({
        ...settings,
        mappedDepartments: (catalogHierarchy.departments || []).map(d => String(d._id)),
        mappedCategories: (catalogHierarchy.sections || []).map(s => String(s._id)),
        mappedFamilies: (catalogHierarchy.families || []).map(f => String(f._id)),
        mappedSubFamilies: (catalogHierarchy.subFamilies || []).map(sf => String(sf._id))
      });
    } else {
      setSettings({
        ...settings,
        mappedDepartments: [],
        mappedCategories: [],
        mappedFamilies: [],
        mappedSubFamilies: []
      });
    }
  };

  // Home Blocks CRUD
  const openBlockModal = (block = null) => {
    if (block) {
      setEditingBlock(block);
      const isBannerType = ['SINGLE_BANNER', 'MULTI_BANNER', 'HERO_BANNER', 'TRUST_STRIP'].includes(block.blockType);
      setBlockCategoryTab(isBannerType ? 'banner' : 'product');
      setBlockForm({
        title: block.title || '',
        subtitle: block.subtitle || '',
        blockType: block.blockType || 'SINGLE_BANNER',
        filterType: block.filterType || 'all',
        filterValue: block.filterValue || '',
        itemLimit: block.itemLimit || 8,
        order: block.order || 0,
        isActive: block.isActive !== false,
        customConfig: {
          bannerImageUrl: block.customConfig?.bannerImageUrl || '',
          bannerLink: block.customConfig?.bannerLink || '/catalog',
          buttonText: block.customConfig?.buttonText || 'Shop Now',
          bannerHeight: block.customConfig?.bannerHeight || 'medium',
          bgGradient: block.customConfig?.bgGradient || 'dark',
          bannerBadge: block.customConfig?.bannerBadge || '',
          badgeText: block.customConfig?.badgeText || '',
          countdownHours: block.customConfig?.countdownHours || 8,
          viewAllLink: block.customConfig?.viewAllLink || '/catalog',
          promoCardsMode: block.customConfig?.promoCardsMode || 'auto',
          promoCards: block.customConfig?.promoCards && block.customConfig.promoCards.length > 0
            ? block.customConfig.promoCards
            : [
                { tag: 'COMPUTERS', title: 'Laptops & Pro Workstations', subtitle: '4 verified items available in stock', linkUrl: '/catalog?category=Computers', palette: 'blue', imageUrl: '' },
                { tag: 'COMPUTER ACCESSORIES', title: 'Peripherals & Accessories', subtitle: '1 verified items available in stock', linkUrl: '/catalog?category=Computer%20Accessories', palette: 'indigo', imageUrl: '' },
                { tag: 'SMARTPHONES', title: 'Mobile & Connected Tech', subtitle: 'Flagship 5G devices & smart accessories', linkUrl: '/catalog?search=phone', palette: 'purple', imageUrl: '' }
              ],
          multiBanners: block.customConfig?.multiBanners && block.customConfig.multiBanners.length > 0
            ? block.customConfig.multiBanners
            : [
                { title: 'Mega Tech Deals', subtitle: 'Up to 50% Off Top Laptops', badge: '50% OFF', imageUrl: '', linkUrl: '/catalog?category=Computers', buttonText: 'Shop Now', bgGradient: 'sapphire' },
                { title: 'Flagship Mobiles', subtitle: 'Experience 5G speed & cameras', badge: 'NEW', imageUrl: '', linkUrl: '/catalog?category=Smartphones', buttonText: 'Explore', bgGradient: 'purple' }
              ]
        }
      });
    } else {
      setEditingBlock(null);
      setBlockCategoryTab('banner');
      setBlockForm({
        title: '',
        subtitle: '',
        blockType: 'SINGLE_BANNER',
        filterType: 'all',
        filterValue: '',
        itemLimit: 8,
        order: homeBlocks.length,
        isActive: true,
        customConfig: {
          bannerImageUrl: '',
          bannerLink: '/catalog',
          buttonText: 'Shop Now',
          bannerHeight: 'medium',
          bgGradient: 'dark',
          bannerBadge: '',
          badgeText: '',
          countdownHours: 8,
          viewAllLink: '/catalog',
          promoCardsMode: 'auto',
          promoCards: [
            { tag: 'COMPUTERS', title: 'Laptops & Pro Workstations', subtitle: '4 verified items available in stock', linkUrl: '/catalog?category=Computers', palette: 'blue', imageUrl: '' },
            { tag: 'COMPUTER ACCESSORIES', title: 'Peripherals & Accessories', subtitle: '1 verified items available in stock', linkUrl: '/catalog?category=Computer%20Accessories', palette: 'indigo', imageUrl: '' },
            { tag: 'SMARTPHONES', title: 'Mobile & Connected Tech', subtitle: 'Flagship 5G devices & smart accessories', linkUrl: '/catalog?search=phone', palette: 'purple', imageUrl: '' }
          ],
          multiBanners: [
            { title: 'Mega Tech Deals', subtitle: 'Up to 50% Off Top Laptops', badge: '50% OFF', imageUrl: '', linkUrl: '/catalog?category=Computers', buttonText: 'Shop Now', bgGradient: 'sapphire' },
            { title: 'Flagship Mobiles', subtitle: 'Experience 5G speed & cameras', badge: 'NEW', imageUrl: '', linkUrl: '/catalog?category=Smartphones', buttonText: 'Explore', bgGradient: 'purple' }
          ]
        }
      });
    }
    setShowBlockModal(true);
  };

  const handleSaveBlock = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      if (editingBlock) {
        const { data } = await axios.put(`/api/v1/ecommerce-admin/home-blocks/${editingBlock._id}`, blockForm, { headers });
        setHomeBlocks(homeBlocks.map(b => b._id === editingBlock._id ? data : b));
      } else {
        const { data } = await axios.post('/api/v1/ecommerce-admin/home-blocks', blockForm, { headers });
        setHomeBlocks([...homeBlocks, data]);
      }
      setShowBlockModal(false);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save home block');
    }
  };

  const handleDeleteBlock = async (id) => {
    if (!window.confirm('Are you sure you want to delete this home block?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/ecommerce-admin/home-blocks/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHomeBlocks(homeBlocks.filter(b => b._id !== id));
    } catch (error) {
      alert('Failed to delete block');
    }
  };

  const handleToggleBlockActive = async (block) => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.put(`/api/v1/ecommerce-admin/home-blocks/${block._id}`, { isActive: !block.isActive }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHomeBlocks(homeBlocks.map(b => b._id === block._id ? data : b));
    } catch (error) {
      alert('Failed to toggle block status');
    }
  };

  const handleMoveBlock = async (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= homeBlocks.length) return;

    const newBlocks = [...homeBlocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIdx];
    newBlocks[targetIdx] = temp;

    // Update order numbers
    newBlocks.forEach((b, i) => { b.order = i; });
    setHomeBlocks(newBlocks);

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await Promise.all([
        axios.put(`/api/v1/ecommerce-admin/home-blocks/${newBlocks[index]._id}`, { order: index }, { headers }),
        axios.put(`/api/v1/ecommerce-admin/home-blocks/${newBlocks[targetIdx]._id}`, { order: targetIdx }, { headers })
      ]);
    } catch (error) {
      console.error('Failed to update block orders', error);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-muted-foreground font-medium animate-pulse">Loading settings & hierarchy mappings...</div>;
  }

  // Active locations count
  const activeLocs = (settings?.includedLocations || []).filter(l => l.isActive);

  // Filter departments by search
  const filteredDepartments = catalogHierarchy.departments.filter(d => 
    d.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    (d.code && d.code.toLowerCase().includes(catalogSearch.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5 pb-8 ecom-fade-in">
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
              <span>JTS E-Commerce • Architecture & Storefront Configuration</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
              E-Commerce Settings & Mapping Control
            </h1>
            <p className="text-slate-300 text-xs mt-1 leading-relaxed">
              Control Group Company, legal entities, branches, category hierarchy, multi-location stock buffers, and dynamic homepage sections.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button 
              type="button"
              onClick={loadAllData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs backdrop-blur-md border border-white/15 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:scale-102 active:scale-95"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh Data</span>
            </button>

            <button 
              type="button"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={13} className="animate-spin" /> Saving Changes...
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 size={14} className="text-emerald-300" /> Saved Successfully!
                </>
              ) : (
                <>
                  <Save size={14} /> Save All Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MODERN INTERACTIVE KPI CARDS STRIP                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            id: 'company_mapping',
            label: 'MAPPED BRANCHES',
            value: `${settings.mappedBranches?.length || 0}`,
            subtext: `of ${companyHierarchy.branches?.length || 0} active branches`,
            icon: Building2,
            color: 'blue'
          },
          {
            id: 'catalog_mapping',
            label: 'CATALOG TIERS',
            value: `${catalogHierarchy.departments?.length || 0} Depts`,
            subtext: `${catalogHierarchy.totalProducts || 0} total products`,
            icon: Layers,
            color: 'indigo'
          },
          {
            id: 'home_blocks',
            label: 'HOMEPAGE BLOCKS',
            value: `${homeBlocks.length}`,
            subtext: `${homeBlocks.filter(b => b.isActive).length} active sections`,
            icon: LayoutGrid,
            color: 'purple'
          },
          {
            id: 'inventory_rules',
            label: 'STOCK BUFFERS',
            value: `${activeLocs.length} Active`,
            subtext: 'Default buffer: 10 units',
            icon: Sliders,
            color: 'emerald'
          },
          {
            id: 'policies',
            label: 'STORE POLICIES',
            value: settings.enableRiderCodUpi || settings.enableRiderCodCard ? 'COD + Online' : 'Prepaid Only',
            subtext: `POD: ${settings.enableRiderPhotoPod ? 'Photo' : ''}${settings.enableRiderPhotoPod && settings.enableRiderSignaturePod ? ' & ' : ''}${settings.enableRiderSignaturePod ? 'Sign' : ''}${!settings.enableRiderPhotoPod && !settings.enableRiderSignaturePod ? 'OTP Only' : ''}`,
            icon: Globe,
            color: 'amber'
          }
        ].map((kpi) => {
          const Icon = kpi.icon;
          const isActive = activeTab === kpi.id;
          return (
            <button
              key={kpi.id}
              type="button"
              onClick={() => setActiveTab(kpi.id)}
              className={`group p-3.5 rounded-2xl border text-left transition-all duration-300 ease-out cursor-pointer hover:-translate-y-1 hover:shadow-lg ${
                isActive
                  ? 'bg-card border-blue-500 shadow-md ring-2 ring-blue-500/20'
                  : 'bg-card/75 hover:bg-card border-border/80 hover:border-blue-400/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">{kpi.label}</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-300 ease-out group-hover:scale-115 group-hover:rotate-6 ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'bg-muted text-muted-foreground group-hover:bg-blue-500/10 group-hover:text-blue-600'
                }`}>
                  <Icon size={14} />
                </div>
              </div>
              <div className="text-lg font-black text-foreground tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{kpi.value}</div>
              <div className="text-[10px] text-muted-foreground truncate font-medium mt-0.5">{kpi.subtext}</div>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 3. SLEEK SEGMENTED TABS NAVIGATION                                        */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/40 border border-border/80 overflow-x-auto [scrollbar-width:none]">
        {[
          { id: 'company_mapping', label: '1. Company & Branches', icon: Building2, count: `${settings.mappedBranches?.length || 0} Branches` },
          { id: 'catalog_mapping', label: '2. Catalog Hierarchy', icon: Layers, count: '4 Tiers' },
          { id: 'home_blocks', label: '3. Homepage Sections', icon: LayoutGrid, count: `${homeBlocks.length} Blocks` },
          { id: 'inventory_rules', label: '4. Stock & Buffer Rules', icon: Sliders },
          { id: 'policies', label: '5. Policies & Shipping', icon: Globe }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all duration-200 whitespace-nowrap cursor-pointer shrink-0 hover:-translate-y-0.5 ${
                isActive
                  ? 'bg-card text-foreground shadow-xs border border-border/80'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/80 hover:shadow-2xs'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'transition-colors'} />
              <span>{tab.label}</span>
              {tab.count && (
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
                  isActive ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: COMPANY & BRANCH MAPPING                                           */}
      {/* ========================================================================= */}
      {activeTab === 'company_mapping' && (
        <div className="space-y-6 ecom-slide-up">
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border/60">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-2xs transition-transform duration-300 hover:scale-110">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-foreground text-base tracking-tight flex items-center gap-2">
                    Storefront Multi-Company & Branch Mapping
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Select which legal corporate entities and physical branches contribute live inventory, fulfill web orders, and brand the e-commerce storefront.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 font-bold text-xs transition-transform duration-200 hover:scale-105">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  {settings.mappedBranches?.length || 0} of {companyHierarchy.branches?.length || 0} Branches Selected
                </span>
              </div>
            </div>

            {/* Primary Group Company Card */}
            {companyHierarchy.groupCompany && (
              <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-purple-500/10 p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-blue-500/35">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm transition-transform duration-300 hover:scale-110 hover:rotate-3">
                      GC
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-600/15 text-blue-600 dark:text-blue-400 border border-blue-600/20">
                          Primary Group Root
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Group Root Active
                        </span>
                      </div>
                      <h4 className="text-base font-black text-foreground mt-1">
                        {companyHierarchy.groupCompany.name}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span>Currency: <strong className="text-foreground">{companyHierarchy.groupCompany.currency || 'INR'}</strong></span>
                        <span>•</span>
                        <span>Email: <strong className="text-foreground">{companyHierarchy.groupCompany.email || 'N/A'}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Legal Companies & Branches Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  Legal Entities & Associated Branches
                </h4>
                <span className="text-xs text-muted-foreground">
                  Check corporate entities or individual branch fulfillment checkboxes below
                </span>
              </div>

              {companyHierarchy.companies?.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-2xl bg-muted/10">
                  No legal companies configured. Defaulting to group branches.
                </div>
              ) : (
                companyHierarchy.companies.map((comp) => {
                  const isCompanySelected = (settings.mappedCompanies || []).includes(comp._id);
                  const companyBranches = companyHierarchy.branches.filter(
                    b => b.legalCompanyId?.toString() === comp._id?.toString() || b.companyId?.toString() === comp._id?.toString()
                  );

                  return (
                    <div key={comp._id} className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs transition-all hover:border-border hover:shadow-sm duration-300">
                      <div className="p-4 bg-muted/30 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <label className="flex items-center gap-3.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={!!isCompanySelected}
                            onChange={() => toggleCompanyMapping(comp._id)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-transform duration-150 hover:scale-110"
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-sm text-foreground hover:text-blue-600 transition-colors">{comp.name}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                                Code: {comp.code || 'N/A'}
                              </span>
                            </div>
                            <span className="text-[11px] text-muted-foreground block mt-0.5">
                              Reg: {comp.registrationNumber || 'N/A'} • {companyBranches.length} Physical Branches
                            </span>
                          </div>
                        </label>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all duration-200 hover:scale-105 ${
                            isCompanySelected
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-muted text-muted-foreground border border-border'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isCompanySelected ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                            {isCompanySelected ? 'Mapped to Storefront' : 'Excluded'}
                          </span>
                        </div>
                      </div>

                      {/* Branches under this company */}
                      <div className="p-4 bg-muted/5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {companyBranches.map((branch) => {
                          const isBranchSelected = (settings.mappedBranches || []).includes(branch._id);

                          return (
                            <label
                              key={branch._id}
                              className={`group p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all duration-300 ease-out select-none hover:-translate-y-1 hover:shadow-md ${
                                isBranchSelected
                                  ? 'bg-blue-50/70 dark:bg-blue-950/25 border-blue-400/70 dark:border-blue-700/60 shadow-2xs hover:border-blue-500'
                                  : 'bg-card border-border/60 opacity-75 hover:opacity-100 hover:border-blue-400/60 hover:bg-blue-50/10'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={!!isBranchSelected}
                                onChange={() => toggleBranchMapping(branch._id)}
                                className="h-4 w-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-transform duration-150 hover:scale-110"
                              />
                              <div className="text-xs flex-1 min-w-0">
                                <strong className="text-foreground font-bold block truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{branch.name}</strong>
                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                                  <MapPin size={11} className="shrink-0 text-muted-foreground/70" />
                                  <span className="truncate">
                                    {branch.address?.city || branch.address?.street || branch.city || (typeof branch.address === 'string' ? branch.address : 'Standard Location')}
                                  </span>
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md transition-colors ${
                                    isBranchSelected 
                                      ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/20' 
                                      : 'bg-muted text-muted-foreground border border-border group-hover:bg-muted/80'
                                  }`}>
                                    {isBranchSelected ? 'Fulfillment Enabled' : 'Disabled'}
                                  </span>
                                  {isBranchSelected && (
                                    <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 transition-transform duration-200 group-hover:scale-125" />
                                  )}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CATALOG HIERARCHY MAPPING (4 TIERS)                                */}
      {/* ========================================================================= */}
      {activeTab === 'catalog_mapping' && (
        <div className="space-y-6 ecom-slide-up">
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border/60">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-2xs transition-transform duration-300 hover:scale-110">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-foreground text-base tracking-tight flex items-center gap-2">
                    Storefront Catalog Hierarchy Mapping
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Choose which Departments, Sections (Categories), Families, and Sub-Families appear in the storefront navigation & sidebar filters.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => handleSelectAllHierarchy(true)} className="text-xs font-bold rounded-xl gap-1.5 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-xs">
                  <CheckSquare size={13} className="text-blue-600" /> Select All
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleSelectAllHierarchy(false)} className="text-xs font-bold rounded-xl gap-1.5 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-xs">
                  <Square size={13} className="text-muted-foreground" /> Clear All
                </Button>
              </div>
            </div>

            {/* Search and Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
              <div className="relative md:col-span-3">
                <Search size={15} className="absolute left-3.5 top-3 text-muted-foreground" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Search departments, sections, codes, or keywords..."
                  className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-border/90 transition-all duration-200"
                />
              </div>
              <div className="flex items-center justify-between md:justify-end gap-3 px-3 py-2 rounded-xl bg-muted/30 border border-border/70 text-xs font-bold transition-all hover:bg-muted/50">
                <span className="text-muted-foreground">Total Live Products:</span>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-700 dark:text-blue-300 font-extrabold transition-transform duration-200 hover:scale-105">
                  {catalogHierarchy.totalProducts || 0}
                </span>
              </div>
            </div>

            {/* 4-Tier Tree View */}
            <div className="space-y-4">
              {filteredDepartments.map((dept) => {
                const deptIdStr = String(dept._id);
                const isDeptChecked = (settings.mappedDepartments || []).some(id => String(id?._id || id) === deptIdStr || id === dept.name);
                const isExpanded = !!expandedDepts[dept._id];

                // Find Sections / Categories belonging to this department
                const deptSections = (catalogHierarchy.sections || []).filter(s => {
                  const sDeptId = String(s.departmentId?._id || s.departmentId || '');
                  return sDeptId === deptIdStr || 
                    (s.department && s.department.toLowerCase() === dept.name?.toLowerCase()) ||
                    s.name?.toLowerCase() === dept.name?.toLowerCase();
                });

                return (
                  <div key={dept._id} className="border border-border/80 rounded-2xl bg-card overflow-hidden shadow-xs transition-all hover:border-blue-400/40 hover:shadow-sm duration-300">
                    {/* TIER 1: DEPARTMENT */}
                    <div className="p-4 bg-muted/30 border-b border-border/70 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setExpandedDepts({ ...expandedDepts, [dept._id]: !isExpanded })}
                          className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-all duration-200 cursor-pointer hover:scale-110 active:scale-90"
                        >
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>

                        <input
                          type="checkbox"
                          checked={!!isDeptChecked}
                          onChange={() => toggleHierarchyItem('department', dept._id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-transform duration-150 hover:scale-110"
                        />

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-foreground hover:text-blue-600 transition-colors">
                              {dept.name}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                              Tier 1: Department
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground block mt-0.5">Code: {dept.code || 'N/A'} • {deptSections.length} Sections</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 px-3 py-1 rounded-full transition-transform duration-200 hover:scale-105">
                          {dept.productCount || 0} products
                        </span>
                      </div>
                    </div>

                    {/* TIER 2, 3, 4 ACCORDION BODY */}
                    {isExpanded && (
                      <div className="p-4 pl-8 sm:pl-12 space-y-3 bg-muted/5 border-t border-border/40">
                        {deptSections.length === 0 ? (
                          <div className="text-xs text-muted-foreground italic py-2">
                            No sub-sections mapped under this department. All products will show directly under {dept.name}.
                          </div>
                        ) : (
                          deptSections.map((sec) => {
                            const secIdStr = String(sec._id);
                            const isSecChecked = (settings.mappedCategories || []).some(id => String(id?._id || id) === secIdStr || id === sec.name);

                            // Find Families under this Section
                            const secFamilies = (catalogHierarchy.families || []).filter(f => {
                              const fCatId = String(f.categoryId?._id || f.categoryId || '');
                              return fCatId === secIdStr || (f.category && f.category.toLowerCase() === sec.name?.toLowerCase());
                            });

                            return (
                              <div key={sec._id} className="border border-border/80 border-l-4 border-l-blue-500 rounded-xl p-3.5 bg-card/90 space-y-3 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs hover:border-blue-400/60">
                                {/* TIER 2: SECTION / CATEGORY */}
                                <div className="flex items-center justify-between">
                                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={!!isSecChecked}
                                      onChange={() => toggleHierarchyItem('section', sec._id)}
                                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-transform duration-150 hover:scale-110"
                                    />
                                    <span className="font-bold text-xs text-foreground flex items-center gap-2 hover:text-blue-600 transition-colors">
                                      {sec.name}
                                      <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
                                        Tier 2: Category
                                      </span>
                                    </span>
                                  </label>
                                  <span className="text-[11px] font-semibold text-muted-foreground">
                                    {sec.productCount || 0} items
                                  </span>
                                </div>

                                {/* TIER 3: FAMILIES */}
                                {secFamilies.length > 0 && (
                                  <div className="pl-6 border-l-2 border-border/60 space-y-2 pt-1">
                                    {secFamilies.map((fam) => {
                                      const famIdStr = String(fam._id);
                                      const isFamChecked = (settings.mappedFamilies || []).some(id => String(id?._id || id) === famIdStr || id === fam.name);
                                      const famSubFamilies = (catalogHierarchy.subFamilies || []).filter(sf => {
                                        const sfFamId = String(sf.familyId?._id || sf.familyId || '');
                                        return sfFamId === famIdStr;
                                      });

                                      return (
                                        <div key={fam._id} className="space-y-1.5">
                                          <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                                              <input
                                                type="checkbox"
                                                checked={!!isFamChecked}
                                                onChange={() => toggleHierarchyItem('family', fam._id)}
                                                className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-transform duration-150 hover:scale-110"
                                              />
                                              <span className="font-semibold text-foreground/90 hover:text-blue-600 transition-colors">{fam.name}</span>
                                              <span className="text-[10px] text-muted-foreground">(Tier 3: Family)</span>
                                            </label>
                                            <span className="text-[10px] text-muted-foreground">{fam.productCount || 0} items</span>
                                          </div>

                                          {/* TIER 4: SUB-FAMILIES */}
                                          {famSubFamilies.length > 0 && (
                                            <div className="pl-5 flex flex-wrap gap-2 pt-1">
                                              {famSubFamilies.map((subFam) => {
                                                const subFamIdStr = String(subFam._id);
                                                const isSubFamChecked = (settings.mappedSubFamilies || []).some(id => String(id?._id || id) === subFamIdStr || id === subFam.name);
                                                return (
                                                  <label
                                                    key={subFam._id}
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] border cursor-pointer select-none transition-all duration-150 hover:scale-105 active:scale-95 ${
                                                      isSubFamChecked
                                                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200 shadow-2xs'
                                                        : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                                                    }`}
                                                  >
                                                    <input
                                                      type="checkbox"
                                                      checked={!!isSubFamChecked}
                                                      onChange={() => toggleHierarchyItem('subFamily', subFam._id)}
                                                      className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                    />
                                                    <span>{subFam.name}</span>
                                                    <span className="text-[9px] opacity-70">({subFam.productCount || 0})</span>
                                                  </label>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HOMEPAGE ITEM BLOCKS & BANNER BUILDER                              */}
      {/* ========================================================================= */}
      {activeTab === 'home_blocks' && (
        <div className="space-y-6 ecom-slide-up">
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-border/60">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 shadow-2xs transition-transform duration-300 hover:scale-110">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-foreground text-base tracking-tight flex items-center gap-2">
                    Homepage Layout & Section Builder
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Design your storefront homepage freely: add custom promotional banners, hero sliders, multi-banner grids, and product carousels.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Link
                  to="/ecommerce/banners"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted text-xs font-bold transition-all duration-200 shadow-2xs hover:-translate-y-0.5 hover:shadow-md hover:border-purple-400 hover:text-purple-600 active:scale-95"
                >
                  <ImageIcon size={14} className="text-purple-600 transition-transform duration-200 hover:rotate-6" />
                  Banner Media Library
                </Link>

                <Button
                  variant="primary"
                  onClick={() => openBlockModal()}
                  className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-sm rounded-xl px-4 py-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:scale-102 active:scale-95"
                >
                  <Plus size={15} /> Add New Section / Banner
                </Button>
              </div>
            </div>

            {/* Blocks List */}
            <div className="space-y-3">
              {homeBlocks.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground border border-dashed rounded-2xl space-y-3 bg-muted/5">
                  <LayoutGrid size={36} className="mx-auto text-muted-foreground/40" />
                  <p className="font-bold text-sm text-foreground">No homepage sections configured yet.</p>
                  <p className="text-xs">Click "Add New Section / Banner" to create your first banner or product block!</p>
                </div>
              ) : (
                homeBlocks.map((block, idx) => {
                  const isSingleBanner = block.blockType === 'SINGLE_BANNER';
                  const isMultiBanner = block.blockType === 'MULTI_BANNER';
                  const isHeroBanner = block.blockType === 'HERO_BANNER';
                  const isTrustStrip = block.blockType === 'TRUST_STRIP';
                  const bannerImg = block.customConfig?.bannerImageUrl;

                  return (
                    <div
                      key={block._id}
                      className={`group p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:border-blue-500/40 dark:hover:border-blue-400/40 ${
                        block.isActive 
                          ? 'bg-card border-border/80 shadow-xs hover:bg-card/95' 
                          : 'bg-muted/20 border-border/50 opacity-60 hover:opacity-90'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveBlock(idx, -1)}
                            className="p-1 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 rounded-md text-muted-foreground disabled:opacity-25 cursor-pointer transition-all duration-200 hover:scale-120 active:scale-90"
                            title="Move Up"
                          >
                            <MoveUp size={13} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === homeBlocks.length - 1}
                            onClick={() => handleMoveBlock(idx, 1)}
                            className="p-1 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 rounded-md text-muted-foreground disabled:opacity-25 cursor-pointer transition-all duration-200 hover:scale-120 active:scale-90"
                            title="Move Down"
                          >
                            <MoveDown size={13} />
                          </button>
                        </div>

                        {/* Order & Thumbnail */}
                        <div className="relative shrink-0">
                          {isSingleBanner && bannerImg ? (
                            <div className="w-14 h-11 rounded-xl border border-border overflow-hidden bg-slate-900 shadow-2xs transition-transform duration-300 group-hover:scale-105 group-hover:shadow-md">
                              <img src={bannerImg} alt={block.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                              <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-purple-600 text-white font-black text-[10px] flex items-center justify-center shadow-xs">
                                {idx + 1}
                              </div>
                            </div>
                          ) : (
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xs ${
                              isSingleBanner ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
                              isMultiBanner ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' :
                              isHeroBanner ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                              isTrustStrip ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                              'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            }`}>
                              #{idx + 1}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-foreground text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                              {block.title || 'Untitled Section'}
                            </h4>
                            
                            {isSingleBanner && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 flex items-center gap-1 transition-transform duration-200 group-hover:scale-105">
                                <ImageIcon size={10} /> Single Banner
                              </span>
                            )}
                            {isMultiBanner && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 flex items-center gap-1 transition-transform duration-200 group-hover:scale-105">
                                <Layout size={10} /> Multi-Banner Grid
                              </span>
                            )}
                            {isHeroBanner && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 flex items-center gap-1 transition-transform duration-200 group-hover:scale-105">
                                <Sparkles size={10} /> Hero Slider
                              </span>
                            )}
                            {isTrustStrip && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 flex items-center gap-1 transition-transform duration-200 group-hover:scale-105">
                                <ShieldCheck size={10} /> Trust Strip
                              </span>
                            )}
                            {!isSingleBanner && !isMultiBanner && !isHeroBanner && !isTrustStrip && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 flex items-center gap-1 transition-transform duration-200 group-hover:scale-105">
                                <ShoppingBag size={10} /> Product Carousel
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 group-hover:text-muted-foreground/90 transition-colors">
                            {block.subtitle || (isSingleBanner ? `Links to ${block.customConfig?.bannerLink || '/catalog'}` : `Displays up to ${block.itemLimit || 8} items`)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                        {/* Active toggle button */}
                        <button
                          type="button"
                          onClick={() => handleToggleBlockActive(block)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 hover:shadow-xs ${
                            block.isActive
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${block.isActive ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                          {block.isActive ? 'Active' : 'Disabled'}
                        </button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openBlockModal(block)}
                          className="text-xs font-bold rounded-xl gap-1.5 transition-all duration-200 hover:scale-105 hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-md active:scale-95 group/btn"
                        >
                          <Edit2 size={12} className="transition-transform duration-200 group-hover/btn:rotate-12" /> Edit
                        </Button>

                        {/* Three-Dot Menu with FloatingMenu portal */}
                        <FloatingMenu
                          trigger={
                            <button
                              type="button"
                              className="p-1.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 cursor-pointer hover:scale-110 hover:border-border/90 hover:shadow-xs"
                              title="Actions"
                            >
                              <MoreVertical size={14} />
                            </button>
                          }
                        >
                          {({ close }) => (
                            <div className="py-1 min-w-[140px] text-xs font-medium">
                              <button
                                type="button"
                                onClick={() => { close(); openBlockModal(block); }}
                                className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-muted transition-colors text-foreground hover:text-blue-600"
                              >
                                <Edit2 size={13} /> Edit Section
                              </button>
                              <button
                                type="button"
                                onClick={() => { close(); handleToggleBlockActive(block); }}
                                className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-muted transition-colors text-foreground"
                              >
                                <Eye size={13} /> {block.isActive ? 'Disable' : 'Enable'}
                              </button>
                              <div className="border-t border-border my-1" />
                              <button
                                type="button"
                                onClick={() => { close(); handleDeleteBlock(block._id); }}
                                className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                              >
                                <Trash2 size={13} /> Delete Block
                              </button>
                            </div>
                          )}
                        </FloatingMenu>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Block Create / Edit Modal */}
          {showBlockModal && typeof document !== 'undefined' && createPortal(
            <div
              className="fixed inset-0 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md ecom-modal-backdrop"
              style={{ zIndex: 9999 }}
              onClick={() => setShowBlockModal(false)}
            >
              <div
                className="bg-slate-950 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-[0_25px_70px_-15px_rgba(0,0,0,0.65)] ecom-modal-pop"
                onClick={e => e.stopPropagation()}
              >
                {/* Slim Help Center Gradient Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 px-6 py-4 text-white shrink-0">
                  <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-300 text-[10px] font-bold tracking-wider uppercase mb-1.5">
                        <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />
                        <span>STOREFRONT HOMEPAGE ARCHITECTURE</span>
                      </div>
                      <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-snug">
                        {editingBlock ? 'Edit Homepage Section / Banner' : 'Create Homepage Section / Banner'}
                      </h2>
                      <p className="text-slate-300 text-xs mt-0.5 leading-relaxed">
                        Configure how this section renders product carousels, category spotlights, or visual banners.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowBlockModal(false)}
                      className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 hover:rotate-90 hover:scale-110 text-slate-300 hover:text-white transition-all duration-200 shrink-0 cursor-pointer"
                      title="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col flex-1 min-h-0 bg-card text-foreground rounded-b-2xl overflow-hidden">
                  {/* Modal Category Switcher */}
                  <div className="px-6 pt-4 border-b border-border flex gap-4 bg-muted/10 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setBlockCategoryTab('banner');
                        if (!['SINGLE_BANNER', 'MULTI_BANNER', 'HERO_BANNER', 'TRUST_STRIP'].includes(blockForm.blockType)) {
                          setBlockForm({ ...blockForm, blockType: 'SINGLE_BANNER' });
                        }
                      }}
                      className={`pb-3 text-xs font-black flex items-center gap-2 border-b-2 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 ${
                        blockCategoryTab === 'banner'
                          ? 'border-purple-600 text-purple-600'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <ImageIcon size={15} />
                      Promotional Banners & Custom Layout
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBlockCategoryTab('product');
                        if (['SINGLE_BANNER', 'MULTI_BANNER', 'HERO_BANNER', 'TRUST_STRIP'].includes(blockForm.blockType)) {
                          setBlockForm({ ...blockForm, blockType: 'BEST_SELLERS' });
                        }
                      }}
                      className={`pb-3 text-xs font-black flex items-center gap-2 border-b-2 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 ${
                        blockCategoryTab === 'product'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <LayoutGrid size={15} />
                      Product Showcase Sections
                    </button>
                  </div>

                  <form onSubmit={handleSaveBlock} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs [scrollbar-width:thin]">
                    {/* CATEGORY: BANNERS & LAYOUT */}
                    {blockCategoryTab === 'banner' ? (
                      <div className="space-y-4">
                        <FormField label="Select Banner / Layout Type" required>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {[
                              { type: 'SINGLE_BANNER', label: 'Single Banner', desc: 'Full-width promo banner with CTA', icon: ImageIcon, color: 'purple' },
                              { type: 'MULTI_BANNER', label: 'Multi-Banner Grid', desc: '2 or 3 promotional cards side-by-side', icon: Layout, color: 'indigo' },
                              { type: 'HERO_BANNER', label: 'Hero Carousel', desc: 'Homepage rotating hero banner', icon: Sparkles, color: 'amber' },
                              { type: 'TRUST_STRIP', label: 'Trust & Badges', desc: 'Secure checkout, fast shipping strip', icon: ShieldCheck, color: 'emerald' }
                            ].map((opt) => {
                              const OptIcon = opt.icon;
                              const isSelected = blockForm.blockType === opt.type;
                              return (
                                <button
                                  key={opt.type}
                                  type="button"
                                  onClick={() => setBlockForm({ ...blockForm, blockType: opt.type })}
                                  className={`group p-3.5 rounded-xl border text-left transition-all duration-300 ease-out cursor-pointer flex flex-col justify-between hover:-translate-y-1 hover:shadow-md ${
                                    isSelected
                                      ? 'border-purple-600 bg-purple-500/10 ring-2 ring-purple-600/20 shadow-xs'
                                      : 'border-border bg-card hover:border-purple-400/80 hover:bg-purple-50/20 dark:hover:bg-purple-950/20'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <OptIcon size={16} className={`transition-transform duration-300 group-hover:scale-120 group-hover:rotate-6 ${isSelected ? 'text-purple-600' : 'text-muted-foreground group-hover:text-purple-600'}`} />
                                      {isSelected && <CheckCircle2 size={13} className="text-purple-600 transition-transform duration-200 group-hover:scale-115" />}
                                    </div>
                                    <span className="font-extrabold text-xs block text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{opt.label}</span>
                                    <span className="text-[10px] text-muted-foreground block mt-0.5 leading-snug">{opt.desc}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </FormField>

                        {/* SINGLE BANNER FIELDS */}
                        {blockForm.blockType === 'SINGLE_BANNER' && (
                          <div className="space-y-3.5 p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 transition-all hover:border-purple-500/35">
                            <h4 className="font-black text-xs text-purple-700 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                              <ImageIcon size={13} /> Single Promotional Banner Configuration
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <FormField label="Banner Main Headline" required>
                                <Input
                                  value={blockForm.title || ''}
                                  onChange={e => setBlockForm({ ...blockForm, title: e.target.value })}
                                  placeholder="e.g. Next-Gen Laptops and Pro Workstations"
                                  className="transition-all duration-200 hover:border-border/90 focus:ring-2 focus:ring-purple-500/20"
                                  required
                                />
                              </FormField>

                              <FormField label="Badge Pill Text (Optional)">
                                <Input
                                  value={blockForm.customConfig?.bannerBadge || ''}
                                  onChange={e => setBlockForm({
                                    ...blockForm,
                                    customConfig: { ...blockForm.customConfig, bannerBadge: e.target.value }
                                  })}
                                  placeholder="e.g. FESTIVE TECH SPECTACULAR"
                                  className="transition-all duration-200 hover:border-border/90 focus:ring-2 focus:ring-purple-500/20"
                                />
                              </FormField>
                            </div>

                            <FormField label="Sub-Headline / Description">
                              <Input
                                value={blockForm.subtitle || ''}
                                onChange={e => setBlockForm({ ...blockForm, subtitle: e.target.value })}
                                placeholder="e.g. Apple MacBook Pro M3, HP Core i5 and enterprise desktops with instant live stock."
                                className="transition-all duration-200 hover:border-border/90 focus:ring-2 focus:ring-purple-500/20"
                              />
                            </FormField>

                            <FormField label="Banner Background Image URL">
                              <Input
                                value={blockForm.customConfig?.bannerImageUrl || ''}
                                onChange={e => setBlockForm({
                                  ...blockForm,
                                  customConfig: { ...blockForm.customConfig, bannerImageUrl: e.target.value }
                                })}
                                placeholder="https://images.unsplash.com/... or paste relative path"
                                className="transition-all duration-200 hover:border-border/90 focus:ring-2 focus:ring-purple-500/20"
                              />
                            </FormField>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <FormField label="Call to Action Button Text">
                                <Input
                                  value={blockForm.customConfig?.buttonText || 'Shop Now'}
                                  onChange={e => setBlockForm({
                                    ...blockForm,
                                    customConfig: { ...blockForm.customConfig, buttonText: e.target.value }
                                  })}
                                  placeholder="e.g. Shop Tech Deals"
                                  className="transition-all duration-200 hover:border-border/90 focus:ring-2 focus:ring-purple-500/20"
                                />
                              </FormField>

                              <FormField label="Target Link URL">
                                <Input
                                  value={blockForm.customConfig?.bannerLink || '/catalog'}
                                  onChange={e => setBlockForm({
                                    ...blockForm,
                                    customConfig: { ...blockForm.customConfig, bannerLink: e.target.value }
                                  })}
                                  placeholder="e.g. /catalog?category=Computers"
                                  className="transition-all duration-200 hover:border-border/90 focus:ring-2 focus:ring-purple-500/20"
                                />
                              </FormField>
                            </div>
                          </div>
                        )}

                        {/* HERO BANNER */}
                        {blockForm.blockType === 'HERO_BANNER' && (
                          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3 transition-all hover:border-amber-500/35">
                            <h4 className="font-black text-xs text-amber-700 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles size={13} /> Hero Rotating Slider
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              This block pulls slides directly from your Storefront Banners management studio.
                            </p>
                            <FormField label="Section Reference Label">
                              <Input
                                value={blockForm.title || 'Top Hero Carousel'}
                                onChange={e => setBlockForm({ ...blockForm, title: e.target.value })}
                                className="transition-all duration-200 hover:border-border/90 focus:ring-2 focus:ring-amber-500/20"
                              />
                            </FormField>
                          </div>
                        )}

                        {/* TRUST STRIP */}
                        {blockForm.blockType === 'TRUST_STRIP' && (
                          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-3 transition-all hover:border-emerald-500/35">
                            <h4 className="font-black text-xs text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                              <ShieldCheck size={13} /> Store Trust & Guarantees Strip
                            </h4>
                            <FormField label="Section Reference Label">
                              <Input
                                value={blockForm.title || 'Trust and Service Strip'}
                                onChange={e => setBlockForm({ ...blockForm, title: e.target.value })}
                                className="transition-all duration-200 hover:border-border/90 focus:ring-2 focus:ring-emerald-500/20"
                              />
                            </FormField>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* CATEGORY: PRODUCT SHOWCASE */
                      <div className="space-y-4">
                        <FormField label="Product Block Category" required>
                          <select
                            value={blockForm.blockType}
                            onChange={e => setBlockForm({ ...blockForm, blockType: e.target.value })}
                            className="w-full h-10 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-border/90 transition-all duration-200"
                          >
                            <option value="BEST_SELLERS">Best Sellers / Top Trending Carousel</option>
                            <option value="DEAL_OF_THE_DAY">Deal of the Day (Live Countdown Timer)</option>
                            <option value="PROMO_TILES">Product Promotion Tiles Grid</option>
                            <option value="CATEGORY_CAROUSEL">Category / Family Spotlight Carousel</option>
                            <option value="NEW_ARRIVALS">New Arrivals Carousel</option>
                          </select>
                        </FormField>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FormField label="Block Title" required>
                            <Input
                              value={blockForm.title || ''}
                              onChange={e => setBlockForm({ ...blockForm, title: e.target.value })}
                              placeholder="e.g. Best Sellers, Deal of the Day"
                              className="transition-all duration-200 hover:border-border/90 focus:ring-2 focus:ring-blue-500/20"
                              required
                            />
                          </FormField>

                          <FormField label="Subtitle (Optional)">
                            <Input
                              value={blockForm.subtitle || ''}
                              onChange={e => setBlockForm({ ...blockForm, subtitle: e.target.value })}
                              placeholder="e.g. Hand-picked products with the highest ratings"
                              className="transition-all duration-200 hover:border-border/90 focus:ring-2 focus:ring-blue-500/20"
                            />
                          </FormField>
                        </div>

                        <FormField label="Items to Display (Limit)">
                          <Input
                            type="number"
                            min="2"
                            max="24"
                            value={blockForm.itemLimit ?? 8}
                            onChange={e => setBlockForm({ ...blockForm, itemLimit: Number(e.target.value) })}
                            className="transition-all duration-200 hover:border-border/90 focus:ring-2 focus:ring-blue-500/20"
                          />
                        </FormField>
                      </div>
                    )}

                    {/* Active toggle */}
                    <div className="p-3 bg-muted/20 rounded-xl border border-border flex items-center justify-between transition-all duration-200 hover:bg-muted/30">
                      <label htmlFor="blockActiveCheck" className="cursor-pointer text-xs font-bold text-foreground">
                        Enable this block on storefront homepage
                      </label>
                      <input
                        type="checkbox"
                        id="blockActiveCheck"
                        checked={!!blockForm.isActive}
                        onChange={e => setBlockForm({ ...blockForm, isActive: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-transform duration-150 hover:scale-110"
                      />
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                      <Button type="button" variant="outline" onClick={() => setShowBlockModal(false)} className="text-xs font-bold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95">
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md hover:brightness-110 active:scale-95">
                        {editingBlock ? 'Update Section' : 'Create Section'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MULTI-LOCATION STOCK & BUFFER RULES                                */}
      {/* ========================================================================= */}
      {activeTab === 'inventory_rules' && (
        <div className="space-y-6 ecom-slide-up">
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border/60">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-2xs transition-transform duration-300 hover:scale-110">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-foreground text-base tracking-tight flex items-center gap-2">
                    Multi-Location Inventory & Safety Buffer Rules
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Configure which retail outlets and warehouses contribute to web stock, buffer deductions, and picking priorities.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs transition-transform duration-200 hover:scale-105">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {activeLocs.length} of {settings.includedLocations?.length || 0} Locations Active
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border/80">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-muted-foreground uppercase font-bold text-[11px] tracking-wider">
                    <th className="p-4 w-14 text-center">Include</th>
                    <th className="p-4">Location / Branch Name</th>
                    <th className="p-4">Safety Stock Mode</th>
                    <th className="p-4 w-40">Safety Stock Buffer</th>
                    <th className="p-4 w-32 text-center">Pick Priority</th>
                    <th className="p-4">Effective Stock Logic</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(settings.includedLocations || []).map((loc, idx) => {
                    return (
                      <tr key={idx} className={`transition-colors duration-200 ${loc.isActive ? 'hover:bg-blue-50/40 dark:hover:bg-blue-950/20' : 'bg-muted/10 opacity-60 hover:opacity-80'}`}>
                        {/* Active Checkbox */}
                        <td className="p-4 text-center">
                          <input 
                            type="checkbox"
                            checked={!!loc.isActive}
                            onChange={e => handleLocationChange(idx, 'isActive', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-transform duration-150 hover:scale-110"
                          />
                        </td>

                        {/* Location Name */}
                        <td className="p-4">
                          <strong className="text-foreground text-sm block">{loc.branchName}</strong>
                          <span className="text-[11px] text-muted-foreground">Branch ID: {String(loc.branchId?._id || loc.branchId || '')}</span>
                        </td>

                        {/* Safety Stock Type */}
                        <td className="p-4">
                          <select
                            disabled={!loc.isActive}
                            value={loc.safetyStockType}
                            onChange={e => handleLocationChange(idx, 'safetyStockType', e.target.value)}
                            className="w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-border/90 transition-all"
                          >
                            <option value="FIXED">Fixed Units (Qty)</option>
                            <option value="PERCENTAGE">Percentage (%)</option>
                          </select>
                        </td>

                        {/* Safety Stock Value */}
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="number"
                              min="0"
                              placeholder="0"
                              disabled={!loc.isActive}
                              value={loc.safetyStockValue ?? ''}
                              onFocus={e => e.target.select()}
                              onChange={e => handleLocationChange(idx, 'safetyStockValue', e.target.value)}
                              className="w-24 bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-border/90 transition-all"
                            />
                            <span className="font-semibold text-muted-foreground text-xs">
                              {loc.safetyStockType === 'PERCENTAGE' ? '%' : 'units'}
                            </span>
                          </div>
                        </td>

                        {/* Priority */}
                        <td className="p-4 text-center">
                          <input 
                            type="number"
                            min="1"
                            disabled={!loc.isActive}
                            value={loc.pickPriority ?? 1}
                            onChange={e => handleLocationChange(idx, 'pickPriority', Number(e.target.value))}
                            className="w-16 text-center bg-background border border-border rounded-xl px-2 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-border/90 transition-all"
                          />
                        </td>

                        {/* Effective Stock Logic Preview */}
                        <td className="p-4 text-xs text-muted-foreground">
                          {loc.isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-[11px] font-medium text-foreground transition-all duration-200 hover:bg-muted/80">
                              Available = Physical Stock - {loc.safetyStockType === 'PERCENTAGE' ? `${loc.safetyStockValue}%` : `${loc.safetyStockValue} units`}
                              <span className="text-blue-600 font-bold">(Priority {loc.pickPriority})</span>
                            </span>
                          ) : (
                            <span className="italic text-muted-foreground">Excluded from storefront</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Interactive Stock Formula Simulator */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 border border-blue-500/20 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Calculator className="text-blue-600 h-5 w-5 transition-transform duration-300 hover:rotate-12 hover:scale-110" />
                <h3 className="font-extrabold text-foreground text-base">Live Multi-Location Stock Allocation Demonstration</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Example scenario: Outlets 1 & 2 (retail) + Warehouse 1. Adjust physical stocks below to see real-time available stock calculated for online shoppers.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                {/* Location 1 */}
                <div className="p-4 bg-card rounded-xl border border-border space-y-2 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md hover:border-blue-400/50">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-foreground">Retail Outlet 1</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 px-2 py-0.5 rounded font-black">Priority 1</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Physical Stock:</span>
                    <input 
                      type="number" 
                      value={simStocks.loc1 ?? 0} 
                      onChange={e => setSimStocks({ ...simStocks, loc1: Number(e.target.value) })}
                      className="w-16 text-right font-bold text-xs bg-muted px-2 py-1 rounded-lg border border-border hover:border-border/90 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Safety Buffer:</span>
                    <span className="text-red-500 font-bold">- 10</span>
                  </div>
                  <div className="pt-2 border-t border-border flex justify-between text-xs font-black text-blue-600">
                    <span>Available for Web:</span>
                    <span>{Math.max(0, (simStocks.loc1 ?? 0) - 10)}</span>
                  </div>
                </div>

                {/* Location 2 */}
                <div className="p-4 bg-card rounded-xl border border-border space-y-2 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md hover:border-blue-400/50">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-foreground">Retail Outlet 2</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 px-2 py-0.5 rounded font-black">Priority 2</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Physical Stock:</span>
                    <input 
                      type="number" 
                      value={simStocks.loc2 ?? 0} 
                      onChange={e => setSimStocks({ ...simStocks, loc2: Number(e.target.value) })}
                      className="w-16 text-right font-bold text-xs bg-muted px-2 py-1 rounded-lg border border-border hover:border-border/90 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Safety Buffer:</span>
                    <span className="text-red-500 font-bold">- 10</span>
                  </div>
                  <div className="pt-2 border-t border-border flex justify-between text-xs font-black text-blue-600">
                    <span>Available for Web:</span>
                    <span>{Math.max(0, (simStocks.loc2 ?? 0) - 10)}</span>
                  </div>
                </div>

                {/* Location 3 */}
                <div className="p-4 bg-card rounded-xl border border-border space-y-2 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md hover:border-blue-400/50">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-foreground">Central Warehouse</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 px-2 py-0.5 rounded font-black">Priority 3</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Physical Stock:</span>
                    <input 
                      type="number" 
                      value={simStocks.loc3 ?? 0} 
                      onChange={e => setSimStocks({ ...simStocks, loc3: Number(e.target.value) })}
                      className="w-16 text-right font-bold text-xs bg-muted px-2 py-1 rounded-lg border border-border hover:border-border/90 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Safety Buffer:</span>
                    <span className="text-red-500 font-bold">- 10</span>
                  </div>
                  <div className="pt-2 border-t border-border flex justify-between text-xs font-black text-blue-600">
                    <span>Available for Web:</span>
                    <span>{Math.max(0, (simStocks.loc3 ?? 0) - 10)}</span>
                  </div>
                </div>

                {/* Total Net Result */}
                <div className="p-5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-md text-center space-y-1 transition-all duration-300 hover:scale-103 hover:shadow-xl hover:brightness-105">
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-100">Total Web Available</span>
                  <div className="text-4xl font-black">
                    {Math.max(0, (simStocks.loc1 ?? 0) - 10) + Math.max(0, (simStocks.loc2 ?? 0) - 10) + Math.max(0, (simStocks.loc3 ?? 0) - 10)}
                  </div>
                  <p className="text-[10px] text-blue-200">
                    Physical {(simStocks.loc1 ?? 0) + (simStocks.loc2 ?? 0) + (simStocks.loc3 ?? 0)} - Safety 30
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: POLICIES, SHIPPING & RIDER POD CHECKPOINTS (Polished CSS & UX)      */}
      {/* ========================================================================= */}
      {activeTab === 'policies' && (
        <div className="space-y-6 ecom-slide-up">
          <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-7 shadow-xs space-y-7">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border/70">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-2xs transition-transform duration-300 hover:scale-110">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-foreground text-base tracking-tight flex items-center gap-2">
                    Storefront Policies & Delivery Checkpoints
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Set store contact channels, currency, shipping rates, and configure digital doorstep verification & payment options.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 1: Storefront Identity & Support Contacts */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-foreground">Storefront Identity & Customer Support</h4>
                  <p className="text-[11px] text-muted-foreground">Public storefront branding and buyer contact channels.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Storefront Name" required>
                  <div className="relative">
                    <Input 
                      value={settings.storeName || ''}
                      onChange={e => setSettings({ ...settings, storeName: e.target.value })}
                      placeholder="e.g. JTS Store"
                      className="rounded-xl transition-all duration-200 hover:border-border/90 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </FormField>

                <FormField label="Customer Support Email" required>
                  <div className="relative">
                    <Input 
                      value={settings.storeEmail || ''}
                      onChange={e => setSettings({ ...settings, storeEmail: e.target.value })}
                      placeholder="support@jtsecommerce.com"
                      className="rounded-xl transition-all duration-200 hover:border-border/90 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </FormField>

                <FormField label="Customer Support Phone">
                  <div className="relative">
                    <Input 
                      value={settings.supportPhone || ''}
                      onChange={e => setSettings({ ...settings, supportPhone: e.target.value })}
                      placeholder="+971 4 000 0000"
                      className="rounded-xl transition-all duration-200 hover:border-border/90 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </FormField>
              </div>
            </div>

            {/* Section 2: Currency & Shipping Pricing */}
            <div className="space-y-4 pt-6 border-t border-border/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-foreground">Currency & Shipping Pricing</h4>
                  <p className="text-[11px] text-muted-foreground">Select store currency, baseline shipping rates, and free delivery thresholds.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Default Store Currency" required>
                  <select
                    value={settings.currency || 'INR'}
                    onChange={e => {
                      const code = e.target.value;
                      const sym = CURRENCY_SYMBOLS_MAP[code] || code;
                      setSettings({ ...settings, currency: code, currencySymbol: sym });
                    }}
                    className="w-full h-10 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-border/90 transition-all duration-200 cursor-pointer"
                  >
                    {availableCurrencies.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.name} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Standard Delivery Charge">
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs font-extrabold text-muted-foreground select-none pointer-events-none">
                      {settings.currencySymbol || '₹'}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={settings.shippingCharge ?? ''}
                      onFocus={e => e.target.select()}
                      onChange={e => setSettings({ ...settings, shippingCharge: e.target.value })}
                      className="w-full h-10 pl-8 pr-3 rounded-xl border border-border bg-background text-foreground text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-border/90 transition-all"
                    />
                  </div>
                </FormField>

                <FormField label="Free Delivery Above (0 = Disabled)">
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs font-extrabold text-muted-foreground select-none pointer-events-none">
                      {settings.currencySymbol || '₹'}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={settings.freeShippingThreshold ?? ''}
                      onFocus={e => e.target.select()}
                      onChange={e => setSettings({ ...settings, freeShippingThreshold: e.target.value })}
                      className="w-full h-10 pl-8 pr-3 rounded-xl border border-border bg-background text-foreground text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-border/90 transition-all"
                    />
                  </div>
                </FormField>
              </div>
            </div>

            {/* Section 3: Customer Account & Order Lifecycle Policies */}
            <div className="space-y-4 pt-6 border-t border-border/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-foreground">Customer Account & Order Lifecycle Policies</h4>
                  <p className="text-[11px] text-muted-foreground">Manage registration security, self-service cancellation, and return eligibility.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Policy 1: Require Email OTP */}
                <div 
                  onClick={() => setSettings({ ...settings, requireEmailOtp: !settings.requireEmailOtp })}
                  className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between hover:-translate-y-1 hover:shadow-md select-none min-h-[178px] ${
                    settings.requireEmailOtp !== false
                      ? 'bg-blue-500/[0.04] border-blue-500/40 shadow-sm'
                      : 'bg-muted/15 border-border/70 opacity-75 hover:opacity-100 hover:border-border'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          settings.requireEmailOtp !== false ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' : 'bg-muted text-muted-foreground'
                        }`}>
                          <Mail size={15} />
                        </div>
                        <span className="font-extrabold text-xs text-foreground leading-snug">Require Email OTP Verification</span>
                      </div>

                      {/* Smooth iOS-style Toggle Switch */}
                      <div className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        settings.requireEmailOtp !== false ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}>
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          settings.requireEmailOtp !== false ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Shoppers must confirm a 6-digit OTP sent to their email during registration before their account is activated.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Registration Policy</span>
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                      settings.requireEmailOtp !== false ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${settings.requireEmailOtp !== false ? 'bg-blue-600 animate-pulse' : 'bg-muted-foreground'}`} />
                      {settings.requireEmailOtp !== false ? 'Required' : 'Disabled'}
                    </span>
                  </div>
                </div>

                {/* Policy 2: Allow Order Cancellation */}
                <div 
                  onClick={() => setSettings({ ...settings, allowOrderCancellation: !settings.allowOrderCancellation })}
                  className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between hover:-translate-y-1 hover:shadow-md select-none min-h-[178px] ${
                    settings.allowOrderCancellation !== false
                      ? 'bg-amber-500/[0.04] border-amber-500/40 shadow-sm'
                      : 'bg-muted/15 border-border/70 opacity-75 hover:opacity-100 hover:border-border'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          settings.allowOrderCancellation !== false ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-muted text-muted-foreground'
                        }`}>
                          <RotateCcw size={15} />
                        </div>
                        <span className="font-extrabold text-xs text-foreground leading-snug">Allow Order Cancellation</span>
                      </div>

                      {/* Smooth iOS-style Toggle Switch */}
                      <div className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        settings.allowOrderCancellation !== false ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}>
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          settings.allowOrderCancellation !== false ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Enables customers to cancel orders from their order tracker while in Booked or Pending status.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cancellation Policy</span>
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                      settings.allowOrderCancellation !== false ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${settings.allowOrderCancellation !== false ? 'bg-amber-500 animate-pulse' : 'bg-muted-foreground'}`} />
                      {settings.allowOrderCancellation !== false ? 'Allowed' : 'Disabled'}
                    </span>
                  </div>
                </div>

                {/* Policy 3: Allow Returns & Return Window Stepper */}
                <div 
                  className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between hover:-translate-y-1 hover:shadow-md min-h-[178px] ${
                    settings.allowReturns !== false
                      ? 'bg-purple-500/[0.04] border-purple-500/40 shadow-sm'
                      : 'bg-muted/15 border-border/70 opacity-75 hover:opacity-100 hover:border-border'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          settings.allowReturns !== false ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400' : 'bg-muted text-muted-foreground'
                        }`}>
                          <Package size={15} />
                        </div>
                        <span className="font-extrabold text-xs text-foreground leading-snug">Allow Returns & Exchanges</span>
                      </div>

                      {/* Smooth iOS-style Toggle Switch */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings.allowReturns !== false}
                        onClick={() => setSettings({ ...settings, allowReturns: !settings.allowReturns })}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          settings.allowReturns !== false ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          settings.allowReturns !== false ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Accept customer return and replacement requests within the configured return eligibility window.
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Return Window</span>
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        disabled={settings.allowReturns === false || (Number(settings.returnWindowDays || 7) <= 1)}
                        onClick={() => setSettings({ ...settings, returnWindowDays: Math.max(1, Number(settings.returnWindowDays || 7) - 1) })}
                        className="w-7 h-7 rounded-lg bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center text-xs font-black disabled:opacity-30 cursor-pointer transition-all active:scale-95"
                      >
                        -
                      </button>
                      <div className="flex items-center px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-extrabold min-w-[62px] justify-center">
                        {settings.returnWindowDays || 7} days
                      </div>
                      <button
                        type="button"
                        disabled={settings.allowReturns === false || (Number(settings.returnWindowDays || 7) >= 30)}
                        onClick={() => setSettings({ ...settings, returnWindowDays: Math.min(30, Number(settings.returnWindowDays || 7) + 1) })}
                        className="w-7 h-7 rounded-lg bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center text-xs font-black disabled:opacity-30 cursor-pointer transition-all active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Rider Doorstep Verification Checkpoints */}
            <div className="space-y-4 pt-6 border-t border-border/70">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-foreground">
                    Rider Doorstep Verification Checkpoints (Photo POD & Customer Signature)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select which Proof of Delivery options appear on the delivery boy's rider app verification screen.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Photo POD Card */}
                <div
                  onClick={async () => {
                    const checked = !(settings.enableRiderPhotoPod !== false);
                    const sigOn = settings.enableRiderSignaturePod !== false;
                    const updated = {
                      ...settings,
                      enableRiderPhotoPod: checked,
                      requireDeliveryPod: checked || sigOn
                    };
                    setSettings(updated);
                    try {
                      const token = localStorage.getItem('token');
                      await axios.put('/api/v1/ecommerce-admin/settings', {
                        enableRiderPhotoPod: checked,
                        enableRiderSignaturePod: sigOn,
                        requireDeliveryPod: checked || sigOn
                      }, { headers: { Authorization: `Bearer ${token}` } });
                    } catch (err) {
                      console.error('Failed to auto-save photo POD setting:', err);
                    }
                  }}
                  className={`group p-5 rounded-2xl border transition-all duration-300 ease-out cursor-pointer hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between select-none ${
                    settings.enableRiderPhotoPod !== false
                      ? 'bg-gradient-to-br from-blue-500/[0.07] to-cyan-500/[0.02] border-blue-400/80 dark:border-blue-700 shadow-xs'
                      : 'bg-muted/15 border-border/70 opacity-75 hover:opacity-100 hover:border-border'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                          settings.enableRiderPhotoPod !== false
                            ? 'bg-blue-600 text-white shadow-xs group-hover:scale-110 group-hover:rotate-6'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          <Camera size={16} />
                        </div>
                        <div>
                          <h5 className="font-extrabold text-sm text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            Doorstep Delivery Photo Proof (Photo POD)
                          </h5>
                          <span className="text-[11px] text-muted-foreground block">Camera snapshot of parcel handover</span>
                        </div>
                      </div>

                      {/* Smooth Switch */}
                      <div className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        settings.enableRiderPhotoPod !== false ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}>
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          settings.enableRiderPhotoPod !== false ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground leading-relaxed pl-12 mt-1">
                      When active, riders see the <strong>Take Photo Proof</strong> option to photograph package handover or doorstep drop-off as digital proof.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between pl-12">
                    <span className="text-[11px] font-semibold text-muted-foreground">Rider Mobile Screen</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      settings.enableRiderPhotoPod !== false
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${settings.enableRiderPhotoPod !== false ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
                      {settings.enableRiderPhotoPod !== false ? 'ON (Visible to Rider)' : 'OFF (Hidden)'}
                    </span>
                  </div>
                </div>

                {/* Signature POD Card */}
                <div
                  onClick={async () => {
                    const checked = !(settings.enableRiderSignaturePod !== false);
                    const photoOn = settings.enableRiderPhotoPod !== false;
                    const updated = {
                      ...settings,
                      enableRiderSignaturePod: checked,
                      requireDeliveryPod: photoOn || checked
                    };
                    setSettings(updated);
                    try {
                      const token = localStorage.getItem('token');
                      await axios.put('/api/v1/ecommerce-admin/settings', {
                        enableRiderPhotoPod: photoOn,
                        enableRiderSignaturePod: checked,
                        requireDeliveryPod: photoOn || checked
                      }, { headers: { Authorization: `Bearer ${token}` } });
                    } catch (err) {
                      console.error('Failed to auto-save signature POD setting:', err);
                    }
                  }}
                  className={`group p-5 rounded-2xl border transition-all duration-300 ease-out cursor-pointer hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between select-none ${
                    settings.enableRiderSignaturePod !== false
                      ? 'bg-gradient-to-br from-purple-500/[0.07] to-indigo-500/[0.02] border-purple-400/80 dark:border-purple-700 shadow-xs'
                      : 'bg-muted/15 border-border/70 opacity-75 hover:opacity-100 hover:border-border'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                          settings.enableRiderSignaturePod !== false
                            ? 'bg-purple-600 text-white shadow-xs group-hover:scale-110 group-hover:rotate-6'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          <PenTool size={16} />
                        </div>
                        <div>
                          <h5 className="font-extrabold text-sm text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            Customer E-Signature (Signature POD)
                          </h5>
                          <span className="text-[11px] text-muted-foreground block">Touchscreen customer signature pad</span>
                        </div>
                      </div>

                      {/* Smooth Switch */}
                      <div className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        settings.enableRiderSignaturePod !== false ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}>
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          settings.enableRiderSignaturePod !== false ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground leading-relaxed pl-12 mt-1">
                      When active, riders see the <strong>Customer E-Signature</strong> touch pad to collect touchscreen customer signature directly on their device screen upon delivery.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between pl-12">
                    <span className="text-[11px] font-semibold text-muted-foreground">Rider Mobile Screen</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      settings.enableRiderSignaturePod !== false
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${settings.enableRiderSignaturePod !== false ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
                      {settings.enableRiderSignaturePod !== false ? 'ON (Visible to Rider)' : 'OFF (Hidden)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Rider Pay-on-Delivery (COD) Digital Checkpoints */}
            <div className="space-y-4 pt-6 border-t border-border/70">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-foreground">
                    Rider Doorstep Pay-on-Delivery (COD) Digital Payment Checkpoints
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Control whether the delivery boy gets Dynamic UPI QR and Card M-POS Machine options alongside Cash.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* UPI QR Card */}
                <div
                  onClick={async () => {
                    const checked = !(settings.enableRiderCodUpi !== false);
                    const updated = { ...settings, enableRiderCodUpi: checked };
                    setSettings(updated);
                    try {
                      const token = localStorage.getItem('token');
                      await axios.put('/api/v1/ecommerce-admin/settings', {
                        enableRiderCodUpi: checked
                      }, { headers: { Authorization: `Bearer ${token}` } });
                    } catch (err) {
                      console.error('Failed to auto-save COD UPI setting:', err);
                    }
                  }}
                  className={`group p-5 rounded-2xl border transition-all duration-300 ease-out cursor-pointer hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between select-none ${
                    settings.enableRiderCodUpi !== false
                      ? 'bg-gradient-to-br from-emerald-500/[0.07] to-teal-500/[0.02] border-emerald-400/80 dark:border-emerald-700 shadow-xs'
                      : 'bg-muted/15 border-border/70 opacity-75 hover:opacity-100 hover:border-border'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                          settings.enableRiderCodUpi !== false
                            ? 'bg-emerald-600 text-white shadow-xs group-hover:scale-110 group-hover:rotate-6'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          <QrCode size={16} />
                        </div>
                        <div>
                          <h5 className="font-extrabold text-sm text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            Doorstep Dynamic UPI QR Code (COD)
                          </h5>
                          <span className="text-[11px] text-muted-foreground block">GPay, PhonePe, Paytm instant scan</span>
                        </div>
                      </div>

                      {/* Smooth Switch */}
                      <div className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        settings.enableRiderCodUpi !== false ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}>
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          settings.enableRiderCodUpi !== false ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground leading-relaxed pl-12 mt-1">
                      When checked (ON), riders get a <strong>Dynamic UPI QR</strong> tab on COD orders so customers can scan & pay via UPI apps at doorstep.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between pl-12">
                    <span className="text-[11px] font-semibold text-muted-foreground">Rider Mobile Screen</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      settings.enableRiderCodUpi !== false
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${settings.enableRiderCodUpi !== false ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
                      {settings.enableRiderCodUpi !== false ? 'ON (Visible to Rider)' : 'OFF (Hidden)'}
                    </span>
                  </div>
                </div>

                {/* Card POS Card */}
                <div
                  onClick={async () => {
                    const checked = !(settings.enableRiderCodCard !== false);
                    const updated = { ...settings, enableRiderCodCard: checked };
                    setSettings(updated);
                    try {
                      const token = localStorage.getItem('token');
                      await axios.put('/api/v1/ecommerce-admin/settings', {
                        enableRiderCodCard: checked
                      }, { headers: { Authorization: `Bearer ${token}` } });
                    } catch (err) {
                      console.error('Failed to auto-save COD Card setting:', err);
                    }
                  }}
                  className={`group p-5 rounded-2xl border transition-all duration-300 ease-out cursor-pointer hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between select-none ${
                    settings.enableRiderCodCard !== false
                      ? 'bg-gradient-to-br from-indigo-500/[0.07] to-purple-500/[0.02] border-indigo-400/80 dark:border-indigo-700 shadow-xs'
                      : 'bg-muted/15 border-border/70 opacity-75 hover:opacity-100 hover:border-border'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                          settings.enableRiderCodCard !== false
                            ? 'bg-indigo-600 text-white shadow-xs group-hover:scale-110 group-hover:rotate-6'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          <CreditCard size={16} />
                        </div>
                        <div>
                          <h5 className="font-extrabold text-sm text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            Doorstep Card M-POS Machine (COD)
                          </h5>
                          <span className="text-[11px] text-muted-foreground block">Handheld swipe/tap POS machine</span>
                        </div>
                      </div>

                      {/* Smooth Switch */}
                      <div className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        settings.enableRiderCodCard !== false ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}>
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          settings.enableRiderCodCard !== false ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground leading-relaxed pl-12 mt-1">
                      When checked (ON), riders get the <strong>Card (M-POS)</strong> tab to swipe or tap customer debit/credit cards at doorstep.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between pl-12">
                    <span className="text-[11px] font-semibold text-muted-foreground">Rider Mobile Screen</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      settings.enableRiderCodCard !== false 
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${settings.enableRiderCodCard !== false ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
                      {settings.enableRiderCodCard !== false ? 'ON (Visible to Rider)' : 'OFF (Hidden)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EcomSettings;

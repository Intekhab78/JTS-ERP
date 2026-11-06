import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Package, MapPin, Truck, ChevronRight, CheckCircle2,
  Clock, AlertTriangle, XCircle, RotateCcw, Search,
  ExternalLink, Mail, ShieldAlert, ShieldCheck, Building2, Eye,
  Printer, FileText, CreditCard, MoreVertical, Sparkles,
  RefreshCw, Layers, Sliders, X, User, Phone, Calendar, Hash, Check,
  DollarSign, Plus, Edit3, Trash2, ShoppingBag, Store, Receipt
} from 'lucide-react';
import { format } from 'date-fns';
import { FloatingMenu } from '../../components/common/FloatingMenu';
import { useCurrency } from '../../contexts/CurrencyContext';
import { EmailSendModal } from '../../components/common/EmailSendModal';

const PurchaseOrders = () => {
  const [pos, setPos] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [companySettings, setCompanySettings] = useState({});
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

  // Modal states
  const [isCreating, setIsCreating] = useState(false);
  const [editingPOId, setEditingPOId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [variantsMap, setVariantsMap] = useState({});
  const [items, setItems] = useState([{ productId: '', variantId: '', variantSku: '', quantity: 1, unitCost: '', uom: 'Piece' }]);
  const [emailModal, setEmailModal] = useState({ isOpen: false, po: null });

  const navigate = useNavigate();
  const { formatCurrency, currencySymbol } = useCurrency();

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchData();
    fetchSuppliers();
    fetchBranches();
    fetchProducts();
    fetchUoms();
    fetchCompanySettings();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const res = await axios.get('/api/v1/purchases', { headers });
      setPos(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch (error) {
      console.error('Error fetching POs:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const fetchSuppliers = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const res = await axios.get('/api/v1/suppliers', { headers });
      setSuppliers(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBranches = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const res = await axios.get('/api/v1/branches', { headers });
      setBranches(Array.isArray(res.data) ? res.data : (res.data?.branches || []));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const res = await axios.get('/api/v1/inventory/products', { headers });
      setProducts(Array.isArray(res.data) ? res.data : (res.data?.products || []));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUoms = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const res = await axios.get('/api/v1/inventory/uoms', { headers });
      const list = Array.isArray(res.data) ? res.data : (res.data?.uoms || []);
      setUoms(list.filter(u => u.isActive !== false));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCompanySettings = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const res = await axios.get('/api/v1/company', { headers });
      setCompanySettings(res.data?.settings || {});
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVariantsForProduct = async (productId) => {
    if (!productId || variantsMap[productId]) return;
    try {
      const res = await axios.get(`/api/v1/inventory/products/${productId}/variants`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const list = res.data?.variants || (Array.isArray(res.data) ? res.data : []);
      setVariantsMap(prev => ({ ...prev, [productId]: list }));
    } catch (error) {
      console.error('Failed to fetch variants:', error);
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

  // Metrics calculation matching GRN 6-cards format
  const metrics = useMemo(() => {
    const total = pos.length;
    const confirmed = pos.filter(p => p.status === 'CONFIRMED').length;
    const partial = pos.filter(p => p.status === 'PARTIALLY_RECEIVED').length;
    const received = pos.filter(p => p.status === 'RECEIVED').length;
    const draft = pos.filter(p => p.status === 'DRAFT').length;
    const cancelled = pos.filter(p => p.status === 'CANCELLED').length;
    const totalValue = pos.reduce((acc, p) => acc + (Number(p.totalAmount || 0)), 0);

    return { total, confirmed, partial, received, draft, cancelled, totalValue };
  }, [pos]);

  // Filtering
  const filteredPOs = useMemo(() => {
    return pos.filter(po => {
      // Tab filter
      if (activeTab === 'CONFIRMED' && po.status !== 'CONFIRMED') return false;
      if (activeTab === 'PARTIAL' && po.status !== 'PARTIALLY_RECEIVED') return false;
      if (activeTab === 'RECEIVED' && po.status !== 'RECEIVED') return false;
      if (activeTab === 'DRAFT' && po.status !== 'DRAFT') return false;
      if (activeTab === 'CANCELLED' && po.status !== 'CANCELLED') return false;

      // Branch filter
      if (selectedBranch && po.branchId?._id !== selectedBranch && po.branchId !== selectedBranch) return false;

      // Date Range Filter
      if (dateFrom || dateTo) {
        const itemDateStr = format(new Date(po.createdAt), 'yyyy-MM-dd');
        if (dateFrom && itemDateStr < dateFrom) return false;
        if (dateTo && itemDateStr > dateTo) return false;
      }

      // Keyword Search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const poNum = (po.purchaseOrderNumber || '').toLowerCase();
        const supplierName = (po.supplierId?.name || '').toLowerCase();
        const phone = (po.supplierId?.phone || '').toLowerCase();
        const branchName = (po.branchId?.name || '').toLowerCase();
        const hasItem = (po.items || []).some(it => 
          (it.productName || it.productId?.name || '').toLowerCase().includes(q) ||
          (it.sku || it.productId?.sku || '').toLowerCase().includes(q)
        );

        return poNum.includes(q) || supplierName.includes(q) || phone.includes(q) || branchName.includes(q) || hasItem;
      }

      return true;
    });
  }, [pos, activeTab, selectedBranch, dateFrom, dateTo, search]);

  const handleEditPO = async (poId) => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const res = await axios.get(`/api/v1/purchases/${poId}`, { headers });
      const poData = res.data;
      setSupplierId(poData.supplierId?._id || poData.supplierId || '');
      setBranchId(poData.branchId?._id || poData.branchId || '');
      setExpectedDate(poData.expectedDate ? new Date(poData.expectedDate).toISOString().split('T')[0] : '');
      if (poData.items && poData.items.length > 0) {
        setItems(poData.items.map(i => {
          const pId = i.productId?._id || i.productId;
          if (pId) fetchVariantsForProduct(pId);
          return {
            productId: pId,
            variantId: i.variantId?._id || i.variantId || '',
            variantSku: i.variantSku || i.variantId?.sku || '',
            quantity: i.quantity || 1,
            unitCost: i.unitCost || '',
            uom: i.uom || 'Piece'
          };
        }));
      } else {
        setItems([{ productId: '', variantId: '', variantSku: '', quantity: 1, unitCost: '', uom: 'Piece' }]);
      }
      setEditingPOId(poId);
      setIsCreating(true);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to fetch PO details');
    }
  };

  const handleDeletePO = async (poId) => {
    if (!window.confirm('Are you sure you want to delete this draft purchase order?')) return;
    try {
      await axios.delete(`/api/v1/purchases/${poId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete PO');
    }
  };

  const handleConfirmPO = async (poId) => {
    if (!window.confirm('Are you sure you want to confirm this purchase order?')) return;
    try {
      await axios.post(`/api/v1/purchases/${poId}/confirm`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to confirm PO');
    }
  };

  const handleCancelPO = async (poId) => {
    if (!window.confirm('Are you sure you want to cancel this purchase order?')) return;
    try {
      await axios.post(`/api/v1/purchases/${poId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to cancel PO');
    }
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    if (!supplierId) {
      alert('Please select a supplier');
      return;
    }
    if (!branchId) {
      alert('Please select a destination branch');
      return;
    }
    const validItems = items.filter(i => i.productId && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      alert('Please add at least one item with valid quantity');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        supplierId,
        branchId,
        expectedDate: expectedDate || undefined,
        items: validItems
      };
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

      if (editingPOId) {
        await axios.put(`/api/v1/purchases/${editingPOId}`, payload, { headers });
      } else {
        await axios.post('/api/v1/purchases', payload, { headers });
      }

      closeModal();
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save PO');
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsCreating(false);
    setEditingPOId(null);
    setSupplierId('');
    setBranchId('');
    setExpectedDate('');
    setItems([{ productId: '', variantId: '', variantSku: '', quantity: 1, unitCost: '', uom: 'Piece' }]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    if (field === 'productId') {
      newItems[index].productId = value;
      newItems[index].variantId = '';
      newItems[index].variantSku = '';
      const prod = products.find(p => p._id === value);
      if (prod) {
        newItems[index].uom = prod.uomDetails?.purchaseUnit || prod.uom || prod.unitOfMeasure || 'Piece';
        newItems[index].unitCost = prod.costPrice || prod.purchasePrice || '';
        fetchVariantsForProduct(value);
      }
    } else if (field === 'variantId') {
      const selectedVariant = variantsMap[newItems[index].productId]?.find(v => v._id === value);
      newItems[index].variantId = value;
      newItems[index].variantSku = selectedVariant ? selectedVariant.sku : '';
      if (selectedVariant && selectedVariant.purchasePrice) {
        newItems[index].unitCost = selectedVariant.purchasePrice;
      }
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  const addItemRow = () => setItems([...items, { productId: '', variantId: '', variantSku: '', quantity: 1, unitCost: '', uom: 'Piece' }]);
  const removeItemRow = (index) => setItems(items.filter((_, i) => i !== index));

  const handlePopulateAllVariants = (productId, currentIndex) => {
    const vars = variantsMap[productId] || [];
    if (vars.length === 0) return;

    const prod = products.find(p => p._id === productId);
    const uom = prod?.uomDetails?.purchaseUnit || prod?.uom || prod?.unitOfMeasure || 'Piece';
    const baseCost = prod?.costPrice || prod?.purchasePrice || '';

    const newRows = vars.map(v => ({
      productId,
      variantId: v._id,
      variantSku: v.sku,
      quantity: 1,
      unitCost: v.purchasePrice || v.costPrice || baseCost,
      uom
    }));

    const updated = [...items];
    updated.splice(currentIndex, 1, ...newRows);
    setItems(updated);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'RECEIVED': return '#10b981'; // emerald
      case 'CONFIRMED': return '#2563eb'; // blue
      case 'PARTIALLY_RECEIVED': return '#8b5cf6'; // purple
      case 'CANCELLED': return '#e11d48'; // rose
      case 'DRAFT':
      default: return '#f59e0b'; // amber
    }
  };

  const calculatedOrderTotal = useMemo(() => {
    return items.reduce((sum, it) => sum + ((Number(it.quantity) || 0) * (Number(it.unitCost) || 0)), 0);
  }, [items]);

  return (
    <div className="space-y-4 pb-8 max-w-[1440px] mx-auto text-foreground">
      
      {/* ========================================================================= */}
      {/* 1. SLIM & COMPACT HERO HEADER (Exact GRN / Order Processing Style)        */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-4 sm:p-5 text-white shadow-md border border-blue-900/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          {/* Left: Badge, Title & Subtitle */}
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase tracking-wider">
              <Sparkles size={11} className="text-blue-400" />
              JTS Procurement & Supply Chain
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
              Purchase Orders
            </h1>
            <p className="text-xs text-blue-100/75 max-w-xl leading-snug">
              Manage procurement orders, track supplier stock fulfillment, update purchase statuses, and allocate warehouse delivery.
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
                placeholder="Search PO #, supplier, phone, SKU..."
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
              onClick={() => {
                setEditingPOId(null);
                setItems([{ productId: '', variantId: '', variantSku: '', quantity: 1, unitCost: '', uom: 'Piece' }]);
                setIsCreating(true);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>New PO</span>
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
      {/* 2. 6 SUMMARY METRIC CARDS (Exact Match to GRN & Ecom Order Processing)    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        {[
          { id: 'ALL', label: 'Total Orders', count: metrics.total, sub: 'All purchase orders', color: 'text-foreground', bg: 'bg-blue-600', icon: Layers },
          { id: 'CONFIRMED', label: 'Confirmed', count: metrics.confirmed, sub: 'Ready to fulfill', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-600', icon: Truck },
          { id: 'PARTIAL', label: 'Partial GRN', count: metrics.partial, sub: 'Partially received', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-600', icon: Clock },
          { id: 'RECEIVED', label: 'Received', count: metrics.received, sub: 'Full stock intake', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-600', icon: CheckCircle2 },
          { id: 'DRAFT', label: 'Drafts', count: metrics.draft, sub: 'Pending review', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-600', icon: Package },
          { id: 'CANCELLED', label: 'Cancelled', count: metrics.cancelled, sub: 'Rejected orders', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-600', icon: RotateCcw }
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
      {/* 3. SLEEK SEGMENTED NAVIGATION TABS & BRANCH FILTER                        */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 p-1.5 bg-muted/50 rounded-xl border border-border/60">
        <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
          {[
            { id: 'ALL', label: 'All Orders', count: metrics.total, icon: Layers },
            { id: 'CONFIRMED', label: 'Confirmed', count: metrics.confirmed, icon: Truck },
            { id: 'PARTIAL', label: 'Partial GRN', count: metrics.partial, icon: Clock },
            { id: 'RECEIVED', label: 'Received', count: metrics.received, icon: CheckCircle2 },
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
            <Calendar size={12} /> ORDER DATE:
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
      {/* 5. CLEAN PURCHASE ORDER CARDS LIST (Exact Match to GRN & Ecom Order Processing) */}
      {/* ========================================================================= */}
      {isLoading ? (
        <div className="p-12 text-center bg-card rounded-xl border border-border/80 text-xs text-muted-foreground font-bold animate-pulse">
          Loading purchase orders...
        </div>
      ) : filteredPOs.length === 0 ? (
        <div className="p-10 text-center bg-card rounded-xl border border-border/80 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
            <ShoppingBag size={20} />
          </div>
          <div className="text-sm font-bold text-foreground">No purchase orders found</div>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {search
              ? `No orders match "${search}". Try searching by PO number, supplier, phone, or product SKU.`
              : 'No purchase orders found under the selected status or date range.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredPOs.map((po, idx) => {
            const isMenuOpen = openMenuId === po._id;
            const statusColor = getStatusColor(po.status);
            const supplierName = po.supplierId?.name || 'Walk-in Supplier';
            const supplierPhone = po.supplierId?.phone;
            const branchName = po.branchId?.name || 'Main Warehouse';

            return (
              <div
                key={po._id}
                className="p-3 sm:p-3.5 rounded-xl bg-card border border-border/80 hover:border-blue-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer"
                onClick={() => navigate(`/purchases/${po._id}`)}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  
                  {/* LEFT COLUMN: Sequence Badge, PO Number, Status, Date, Supplier & Destination, Items */}
                  <div className="flex-1 space-y-1.5 min-w-0">
                    
                    {/* Top Row: Index Badge, PO Number, Status, Date */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-black shrink-0">
                        {idx + 1}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/purchases/${po._id}`);
                        }}
                        className="text-xs sm:text-sm font-black text-foreground hover:text-blue-600 transition-colors cursor-pointer font-mono"
                      >
                        {po.purchaseOrderNumber}
                      </button>

                      {/* Status Badge */}
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white shadow-2xs"
                        style={{ backgroundColor: statusColor }}
                      >
                        {po.status === 'PARTIALLY_RECEIVED' ? 'PARTIAL GRN' : po.status}
                      </span>

                      <span className="text-[10.5px] text-muted-foreground flex items-center gap-1 font-mono">
                        <Calendar size={11} className="text-muted-foreground/70" />
                        {format(new Date(po.createdAt), 'MMM d, yyyy · h:mm a')}
                      </span>
                    </div>

                    {/* 2-Column Grid: Supplier (Left) & Destination (Right) */}
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
                      </div>
                    </div>

                    {/* Ordered Items Compact Strip */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground mr-1">
                        ITEMS ({(po.items || []).length}):
                      </span>
                      {(po.items || []).slice(0, 3).map((item, iIdx) => (
                        <span
                          key={iIdx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/40 border border-border/60 text-[10.5px] font-bold text-foreground"
                        >
                          <CheckCircle2 size={10} className="text-blue-500 shrink-0" />
                          {item.quantity}x {item.productName || item.productId?.name || 'Product'}
                        </span>
                      ))}
                      {(po.items || []).length > 3 && (
                        <span className="text-[10px] text-muted-foreground font-bold">
                          +{(po.items || []).length - 3} more
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
                      <div className="text-sm sm:text-base font-black text-foreground font-mono">
                        {currencySymbol} {Number(po.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="flex items-center lg:justify-end gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {po.items?.length || 0} line items · {po.status}
                        </span>
                      </div>
                    </div>

                    {/* THREE-DOT (⋮) ACTION MENU BUTTON & ANIMATED POPOVER */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setOpenMenuId(isMenuOpen ? null : po._id);
                        }}
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                          isMenuOpen
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-95'
                            : 'bg-muted/40 hover:bg-muted text-foreground border-border/80 hover:border-blue-500/40'
                        }`}
                        title="Order Actions"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {/* Animated Three-Dot Action Menu Popover (Exact Order Processing Style) */}
                      {isMenuOpen && (
                        <FloatingMenu width={256} onClose={() => setOpenMenuId(null)} className="rounded-2xl bg-card border border-border shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                          <div className="px-2.5 py-1 border-b border-border/60 flex items-center justify-between">
                            <span className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground">
                              Actions · {po.purchaseOrderNumber}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                              {po.status}
                            </span>
                          </div>

                          {/* 1. View Full Details */}
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              navigate(`/purchases/${po._id}`);
                            }}
                            className="w-full text-left p-2 rounded-xl hover:bg-blue-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                              <Eye size={14} />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-bold text-foreground group-hover:text-blue-600">
                                View Order Details
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                Full breakdown & delivery milestones
                              </div>
                            </div>
                          </button>

                          {/* 2. Dispatch via Email */}
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              setEmailModal({ isOpen: true, po });
                            }}
                            className="w-full text-left p-2 rounded-xl hover:bg-emerald-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                              <Mail size={14} />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-bold text-foreground group-hover:text-emerald-600">
                                Dispatch PO via Email
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                Send PDF order directly to supplier
                              </div>
                            </div>
                          </button>

                          {/* 3. Edit Draft */}
                          {po.status === 'DRAFT' && hasPermission('CREATE_PURCHASES') && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleEditPO(po._id);
                                }}
                                className="w-full text-left p-2 rounded-xl hover:bg-amber-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                              >
                                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                                  <Edit3 size={14} />
                                </div>
                                <div className="truncate">
                                  <div className="text-xs font-bold text-foreground group-hover:text-amber-600">
                                    Edit Draft Order
                                  </div>
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    Update lines, UOM, or quantities
                                  </div>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleConfirmPO(po._id);
                                }}
                                className="w-full text-left p-2 rounded-xl hover:bg-blue-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                              >
                                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                                  <CheckCircle2 size={14} />
                                </div>
                                <div className="truncate">
                                  <div className="text-xs font-bold text-foreground group-hover:text-blue-600">
                                    Confirm Purchase Order
                                  </div>
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    Release order for goods receiving
                                  </div>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleDeletePO(po._id);
                                }}
                                className="w-full text-left p-2 rounded-xl hover:bg-rose-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                              >
                                <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 group-hover:bg-rose-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                                  <Trash2 size={14} />
                                </div>
                                <div className="truncate">
                                  <div className="text-xs font-bold text-rose-600">
                                    Delete PO
                                  </div>
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    Permanently remove draft order
                                  </div>
                                </div>
                              </button>
                            </>
                          )}

                          {/* 4. Receive Goods if Confirmed */}
                          {(po.status === 'CONFIRMED' || po.status === 'PARTIALLY_RECEIVED') && hasPermission('CREATE_PURCHASES') && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  navigate('/purchases/grn/new');
                                }}
                                className="w-full text-left p-2 rounded-xl hover:bg-indigo-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                              >
                                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                                  <Truck size={14} />
                                </div>
                                <div className="truncate">
                                  <div className="text-xs font-bold text-foreground group-hover:text-indigo-600">
                                    Create Goods Receipt (GRN)
                                  </div>
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    Receive inbound items into warehouse
                                  </div>
                                </div>
                              </button>

                              {po.status === 'CONFIRMED' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleCancelPO(po._id);
                                  }}
                                  className="w-full text-left p-2 rounded-xl hover:bg-rose-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                                >
                                  <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 group-hover:bg-rose-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                                    <XCircle size={14} />
                                  </div>
                                  <div className="truncate">
                                    <div className="text-xs font-bold text-rose-600">
                                      Cancel Order
                                    </div>
                                    <div className="text-[10px] text-muted-foreground truncate">
                                      Mark order as cancelled
                                    </div>
                                  </div>
                                </button>
                              )}
                            </>
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

      {/* ========================================================================= */}
      {/* 6. CREATE / EDIT PO MODAL                                                 */}
      {/* ========================================================================= */}
      {isCreating && (
        <div
          className="fixed inset-0 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md z-50 animate-in fade-in duration-200"
          onClick={closeModal}
        >
          <div
            className="bg-card text-foreground rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-border animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between shrink-0">
              <div className="space-y-0.5">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase tracking-wider">
                  <Sparkles size={11} className="text-blue-400" />
                  {editingPOId ? 'Edit Procurement Record' : 'New Procurement Order'}
                </div>
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {editingPOId ? 'Edit Purchase Order' : 'Create Purchase Order'}
                </h3>
                <p className="text-xs text-blue-100/75 font-medium">
                  Specify supplier, destination branch, order items and UOM specifications.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-transform duration-300 hover:rotate-180 hover:scale-110 cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreatePO} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Supplier <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={supplierId}
                    onChange={e => setSupplierId(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map(s => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Deliver To Branch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={branchId}
                    onChange={e => setBranchId(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">-- Select Branch --</option>
                    {branches.map(b => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Expected Date
                  </label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={e => setExpectedDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-2.5 pt-2 border-t border-border/80">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-muted-foreground">
                    ORDER ITEMS ({items.length})
                  </span>
                  <span className="text-[10px] text-muted-foreground">Auto-populates purchase unit</span>
                </div>

                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={index} className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
                      <div className="flex flex-col lg:flex-row gap-2.5 items-start lg:items-center">
                        <div className="flex-1 w-full">
                          <label className="text-[9.5px] font-bold uppercase text-muted-foreground block mb-0.5">Product</label>
                          <select
                            required
                            value={item.productId}
                            onChange={e => updateItem(index, 'productId', e.target.value)}
                            className="w-full h-8 px-2.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground"
                          >
                            <option value="">-- Choose Product --</option>
                            {products.map(p => (
                              <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                            ))}
                          </select>
                        </div>

                        {item.productId && variantsMap[item.productId]?.length > 0 && (
                          <div className="w-full lg:w-48">
                            <label className="text-[9.5px] font-bold uppercase text-muted-foreground block mb-0.5">Variant</label>
                            <select
                              value={item.variantId || ''}
                              onChange={e => updateItem(index, 'variantId', e.target.value)}
                              className="w-full h-8 px-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground"
                            >
                              <option value="">-- Base --</option>
                              {variantsMap[item.productId].map(v => (
                                <option key={v._id} value={v._id}>{v.title || v.sku}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="w-20 shrink-0">
                          <label className="text-[9.5px] font-bold uppercase text-muted-foreground block mb-0.5">Qty</label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.quantity}
                            onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                            className="w-full h-8 px-2 rounded-lg border border-border bg-card text-xs font-mono font-bold text-center"
                          />
                        </div>

                        <div className="w-28 shrink-0">
                          <label className="text-[9.5px] font-bold uppercase text-muted-foreground block mb-0.5">UOM (Master)</label>
                          <select
                            value={item.uom}
                            onChange={e => updateItem(index, 'uom', e.target.value)}
                            className="w-full h-8 px-2 rounded-lg border border-border bg-card text-xs font-bold text-foreground"
                          >
                            {item.uom && !uoms.some(u => u.name === item.uom || u.code === item.uom) && (
                              <option value={item.uom}>{item.uom}</option>
                            )}
                            {uoms.map(u => (
                              <option key={u._id || u.code} value={u.name || u.code}>
                                {u.name} {u.code && u.code !== u.name ? `(${u.code})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-24 shrink-0">
                          <label className="text-[9.5px] font-bold uppercase text-muted-foreground block mb-0.5">Unit Cost</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={item.unitCost}
                            onChange={e => updateItem(index, 'unitCost', e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full h-8 px-2 rounded-lg border border-border bg-card text-xs font-mono font-bold text-right"
                          />
                        </div>

                        <div className="shrink-0 pt-3 lg:pt-0">
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-500/10 border border-border hover:border-rose-500/30 transition-colors"
                            title="Delete line"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addItemRow}
                  className="w-full py-2 rounded-xl border border-dashed border-border hover:border-blue-500 hover:bg-blue-500/5 text-blue-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Line Item</span>
                </button>
              </div>

              {/* Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Estimated Total:</span>
                  <span className="font-mono font-black text-base text-foreground">
                    {currencySymbol} {calculatedOrderTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {submitting && <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                    <span>{editingPOId ? 'Update PO' : 'Save PO'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. EMAIL SEND MODAL                                                       */}
      {/* ========================================================================= */}
      {emailModal.isOpen && emailModal.po && (
        <EmailSendModal
          isOpen={emailModal.isOpen}
          onClose={() => setEmailModal({ isOpen: false, po: null })}
          documentType="Purchase Order"
          documentNumber={emailModal.po.purchaseOrderNumber || `PO-${emailModal.po._id?.slice(-6).toUpperCase()}`}
          recipientName={emailModal.po.supplierId?.name}
          defaultEmail={emailModal.po.supplierId?.email}
          sendEndpoint={`/api/v1/email/purchase-order/${emailModal.po._id}`}
        />
      )}
    </div>
  );
};

export default PurchaseOrders;

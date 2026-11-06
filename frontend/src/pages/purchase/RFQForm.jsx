import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Plus, Trash2, ArrowLeft, Save, FileText, Settings, Zap, CreditCard, 
  Building2, Sparkles, Package, Calendar, Banknote, Clock,
  CheckCircle2, AlertCircle, X, ChevronRight, Layers, DollarSign,
  MapPin, Hash
} from 'lucide-react';
import { useCurrency } from '../../contexts/CurrencyContext';

export default function RFQForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatCurrency, currencySymbol } = useCurrency();
  const isEditing = !!id;

  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [variantsMap, setVariantsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rfqStatus, setRfqStatus] = useState('DRAFT');
  
  const [formData, setFormData] = useState({
    supplierId: '',
    branchId: '',
    expectedDate: '',
    currency: 'AED',
    paymentTerms: '',
    notes: '',
    items: [
      { productId: '', variantId: '', variantSku: '', description: '', quantity: 1, uom: 'Piece', unitCost: 0, subTotal: 0 }
    ]
  });

  const availableProducts = useMemo(() => {
    return products || [];
  }, [products]);

  useEffect(() => {
    fetchFormData();
    if (isEditing) fetchRFQ();
  }, [id]);

  const fetchVariantsForProduct = async (productId) => {
    if (!productId || variantsMap[productId]) return;
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const res = await axios.get(`/api/v1/inventory/products/${productId}/variants`, { headers });
      const list = res.data?.variants || (Array.isArray(res.data) ? res.data : []);
      setVariantsMap(prev => ({ ...prev, [productId]: list }));
    } catch (error) {
      console.error('Error fetching variants:', error);
    }
  };

  const fetchFormData = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [supRes, brRes, prodRes] = await Promise.all([
        axios.get('/api/v1/suppliers', { headers }),
        axios.get('/api/v1/branches', { headers }),
        axios.get('/api/v1/inventory/products', { headers })
      ]);
      setSuppliers(supRes.data?.data || supRes.data || []);
      setBranches(brRes.data || []);
      const loadedProducts = prodRes.data || [];
      setProducts(loadedProducts);
      (loadedProducts || []).forEach(p => {
        if (p.hasVariants) {
          fetchVariantsForProduct(p._id);
        }
      });
    } catch (error) {
      console.error(error);
      alert('Failed to load form data');
    }
  };

  const fetchRFQ = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/v1/rfqs/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const { rfq, items } = res.data;
      setRfqStatus(rfq.status);
      
      if (rfq.status !== 'DRAFT') {
        alert('Only DRAFT RFQs can be edited. Redirecting to view mode.');
        navigate(`/purchases/rfqs/${id}`);
        return;
      }

      setFormData({
        supplierId: rfq.supplierId?._id || rfq.supplierId,
        branchId: rfq.branchId?._id || rfq.branchId,
        expectedDate: rfq.expectedDate ? new Date(rfq.expectedDate).toISOString().split('T')[0] : '',
        currency: rfq.currency || 'AED',
        paymentTerms: rfq.paymentTerms || '',
        notes: rfq.notes || '',
        items: (items || []).map(i => {
          const prodId = i.productId?._id || i.productId;
          if (prodId) fetchVariantsForProduct(prodId);
          return {
            productId: prodId,
            variantId: i.variantId?._id || i.variantId || '',
            variantSku: i.variantSku || i.variantId?.sku || '',
            description: i.description || '',
            quantity: i.quantity || 1,
            uom: i.uom || 'Piece',
            unitCost: i.unitCost || 0,
            subTotal: i.subTotal || 0
          };
        })
      });
    } catch (error) {
      console.error(error);
      alert('Failed to fetch RFQ details');
      navigate('/purchases/rfqs');
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index, field, value) => {
    if (rfqStatus !== 'DRAFT') return;
    const newItems = [...formData.items];
    const item = { ...newItems[index] };

    if (field === 'productId') {
      item.productId = value;
      item.variantId = '';
      item.variantSku = '';
      const product = products.find(p => p._id === value);
      if (product) {
        item.description = product.description || product.name;
        item.uom = product.unitOfMeasure || product.uom || 'Piece';
        item.unitCost = Number(product.costPrice) || Number(product.purchasePrice) || 0;
        fetchVariantsForProduct(value);
      } else {
        item.description = '';
        item.uom = 'Piece';
        item.unitCost = 0;
      }
    } else if (field === 'variantId') {
      item.variantId = value;
      const selectedVariant = variantsMap[item.productId]?.find(v => v._id === value);
      item.variantSku = selectedVariant ? selectedVariant.sku : '';
      if (selectedVariant && (selectedVariant.costPrice || selectedVariant.purchasePrice)) {
        item.unitCost = Number(selectedVariant.costPrice) || Number(selectedVariant.purchasePrice) || item.unitCost;
      }
    } else if (field === 'quantity') {
      item.quantity = value === '' ? '' : Number(value);
    } else if (field === 'unitCost') {
      item.unitCost = value === '' ? '' : Number(value);
    } else {
      item[field] = value;
    }

    const qty = Number(item.quantity) || 0;
    const cost = Number(item.unitCost) || 0;
    item.subTotal = Number((qty * cost).toFixed(2));

    newItems[index] = item;
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    if (rfqStatus !== 'DRAFT') return;
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { productId: '', variantId: '', variantSku: '', description: '', quantity: 1, uom: 'Piece', unitCost: 0, subTotal: 0 }
      ]
    });
  };

  const removeItem = (index) => {
    if (rfqStatus !== 'DRAFT') return;
    if (formData.items.length === 1) {
      setFormData({
        ...formData,
        items: [{ productId: '', variantId: '', variantSku: '', description: '', quantity: 1, uom: 'Piece', unitCost: 0, subTotal: 0 }]
      });
      return;
    }
    const newItems = formData.items.filter((_, idx) => idx !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handlePopulateAllVariants = (productId, currentIndex) => {
    if (rfqStatus !== 'DRAFT') return;
    const vars = variantsMap[productId] || [];
    if (vars.length === 0) return;

    const prod = availableProducts.find(p => p._id === productId);
    const uom = prod?.unitOfMeasure || prod?.uom || 'Piece';
    const cost = Number(prod?.costPrice) || Number(prod?.purchasePrice) || 0;

    const newRows = vars.map(v => {
      const attrStr = Object.entries(v.attributes || {}).map(([k, val]) => `${k}: ${val}`).join(', ');
      const unitCost = v.costPrice != null ? Number(v.costPrice) : (v.purchasePrice != null ? Number(v.purchasePrice) : cost);
      return {
        productId,
        variantId: v._id,
        variantSku: v.sku,
        description: (prod?.name ? `${prod.name} - ` : '') + (attrStr || v.sku || ''),
        quantity: 1,
        uom,
        unitCost,
        subTotal: Number((unitCost * 1).toFixed(2))
      };
    });

    const updated = [...formData.items];
    updated.splice(currentIndex, 1, ...newRows);
    setFormData({ ...formData, items: updated });
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (rfqStatus !== 'DRAFT' || submitting) return;
    
    if (formData.items.length === 0) {
      return alert('Please add at least one item');
    }
    
    // Validation
    const invalidItems = formData.items.some(i => !i.productId || Number(i.quantity) <= 0 || Number(i.unitCost) < 0);
    if (invalidItems) {
      return alert('All items must have a selected product, quantity > 0, and unit price >= 0');
    }

    setSubmitting(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      if (isEditing) {
        await axios.put(`/api/v1/rfqs/${id}`, formData, { headers });
        alert('RFQ updated successfully');
        navigate(`/purchases/rfqs/${id}`);
      } else {
        await axios.post('/api/v1/rfqs', formData, { headers });
        navigate('/purchases/rfqs');
      }
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Failed to save RFQ');
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = formData.items.reduce((sum, item) => sum + (Number(item.subTotal) || 0), 0);
  const totalQuantity = formData.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 space-y-3">
        <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Fetching RFQ Parameters...</h2>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12 max-w-[1440px] mx-auto text-foreground">
      
      {/* ========================================================================= */}
      {/* 1. HERO HEADER WITH BACK BUTTON & PRIMARY ACTIONS (ONLY HERE - NO DUPLICATE) */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-4 sm:p-5 text-white shadow-md border border-blue-900/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          
          {/* Left: Back Button + Title */}
          <div className="flex items-start gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/purchases/rfqs')}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md shrink-0 mt-0.5"
              title="Back to RFQs List"
            >
              <ArrowLeft size={16} />
            </button>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase tracking-wider">
                  <Sparkles size={11} className="text-blue-400" />
                  Procurement Sourcing · RFQ Matrix
                </span>

                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-2xs">
                  STATUS: {rfqStatus}
                </span>
              </div>

              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white truncate">
                {isEditing ? 'Edit Request for Quotation' : 'New Request for Quotation'}
              </h1>

              <p className="text-xs text-blue-100/75 leading-snug">
                Procurement Command &bull; Vendor Bidding, Price Inquiry & Sourcing Matrix
              </p>
            </div>
          </div>

          {/* Right: Only One Set of Primary Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <button
              type="button"
              onClick={() => navigate('/purchases/rfqs')}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md"
            >
              Abort
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || rfqStatus !== 'DRAFT'}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-black rounded-xl shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all duration-200 cursor-pointer disabled:opacity-50 hover:shadow-lg"
            >
              <Save size={14} />
              {submitting ? 'Deploying...' : isEditing ? 'Update RFQ' : 'Deploy RFQ'}
            </button>
          </div>

        </div>

        {/* Ambient subtle light */}
        <div className="absolute right-0 top-0 w-80 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* ========================================================================= */}
        {/* 2. PRIMARY PARAMETERS CARD (E-Commerce Order Processing Card Style)        */}
        {/* ========================================================================= */}
        <div className="rounded-2xl bg-card border border-border/80 p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/70">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Settings size={15} />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                Primary Parameters
              </h3>
            </div>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-muted text-muted-foreground uppercase tracking-wider">
              Sourcing Configuration
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            
            {/* Supplier / Vendor */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Building2 size={12} className="text-blue-500" />
                Supplier / Vendor <span className="text-rose-500">*</span>
              </label>
              <select
                required
                disabled={rfqStatus !== 'DRAFT'}
                value={formData.supplierId}
                onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                className="w-full h-10 px-3.5 bg-background border border-border/80 rounded-xl text-xs sm:text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-400 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <option value="">-- SELECT TARGET SUPPLIER --</option>
                {suppliers.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.name} {s.phone ? `(${s.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Receiving Branch */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <MapPin size={12} className="text-emerald-500" />
                Receiving Branch <span className="text-rose-500">*</span>
              </label>
              <select
                required
                disabled={rfqStatus !== 'DRAFT'}
                value={formData.branchId}
                onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                className="w-full h-10 px-3.5 bg-background border border-border/80 rounded-xl text-xs sm:text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-400 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <option value="">-- SELECT TARGET BRANCH --</option>
                {branches.map(b => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Expected Delivery Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Calendar size={12} className="text-amber-500" />
                Expected Delivery Date
              </label>
              <input
                type="date"
                disabled={rfqStatus !== 'DRAFT'}
                value={formData.expectedDate}
                onChange={e => setFormData({ ...formData, expectedDate: e.target.value })}
                className="w-full h-10 px-3 bg-background border border-border/80 rounded-xl text-xs sm:text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-400 transition-all shadow-2xs disabled:opacity-50"
              />
            </div>

            {/* Payment Terms */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <CreditCard size={12} className="text-indigo-500" />
                Payment Terms
              </label>
              <input
                type="text"
                placeholder="e.g. NET 30, COD"
                disabled={rfqStatus !== 'DRAFT'}
                value={formData.paymentTerms}
                onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                className="w-full h-10 px-3 bg-background border border-border/80 rounded-xl text-xs sm:text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-400 transition-all shadow-2xs uppercase disabled:opacity-50"
              />
            </div>

            {/* Currency */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <DollarSign size={12} className="text-blue-500" />
                Currency
              </label>
              <select
                disabled={rfqStatus !== 'DRAFT'}
                value={formData.currency}
                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                className="w-full h-10 px-3 bg-background border border-border/80 rounded-xl text-xs sm:text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-400 transition-all cursor-pointer shadow-2xs disabled:opacity-50 font-bold"
              >
                <option value="AED">AED (UAE Dirham)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="SAR">SAR (Saudi Riyal)</option>
                <option value="INR">INR (Indian Rupee)</option>
              </select>
            </div>

            {/* Matrix Scope Pill */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Layers size={12} className="text-purple-500" />
                Matrix Scope
              </label>
              <div className="h-10 px-3 bg-muted/40 border border-border/80 rounded-xl flex items-center justify-between text-xs font-bold text-foreground">
                <span>{formData.items.length} Product Lines</span>
                <span className="text-blue-600 font-bold">{totalQuantity} Total Units</span>
              </div>
            </div>

            {/* Internal Notes */}
            <div className="space-y-1.5 md:col-span-2 lg:col-span-4">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                Internal Notes & Terms
              </label>
              <textarea
                rows={2}
                disabled={rfqStatus !== 'DRAFT'}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border/80 rounded-xl text-xs sm:text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-400 transition-all shadow-2xs resize-none disabled:opacity-50"
                placeholder="Specify any strict conditions, SLAs, delivery instructions or vendor bidding remarks..."
              />
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. REQUISITION MATRIX CARD (PRODUCTS TABLE)                              */}
        {/* ========================================================================= */}
        <div className="rounded-2xl bg-card border border-border/80 shadow-2xs overflow-hidden">
          
          {/* Card Header Bar */}
          <div className="p-3.5 sm:p-4 border-b border-border/80 bg-muted/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Zap size={15} />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                Requisition Matrix
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 uppercase tracking-wider">
                {formData.items.length} Lines Included
              </span>
            </div>

            {rfqStatus === 'DRAFT' && (
              <button
                type="button"
                onClick={addItem}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer hover:shadow-md"
              >
                <Plus size={14} /> Add Matrix Row
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap text-xs">
              <thead className="text-[10px] font-black text-muted-foreground uppercase tracking-wider bg-muted/10 border-b border-border/80">
                <tr>
                  <th className="px-4 py-3 min-w-[240px]">Product / Designation *</th>
                  <th className="px-3 py-3 min-w-[190px]">Variant / Spec</th>
                  <th className="px-3 py-3 min-w-[180px]">Description</th>
                  <th className="px-3 py-3 w-28 text-center">Quantity *</th>
                  <th className="px-3 py-3 w-24 text-center">UOM</th>
                  <th className="px-3 py-3 w-36 text-right">Unit Price *</th>
                  <th className="px-4 py-3 w-36 text-right">Subtotal</th>
                  <th className="px-3 py-3 w-16 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {formData.items.map((item, idx) => {
                  const prod = products.find(p => p._id === item.productId);
                  const hasVars = prod?.hasVariants || (variantsMap[item.productId]?.length > 0);

                  return (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      
                      {/* Product Selector */}
                      <td className="px-4 py-2.5">
                        <select
                          required
                          disabled={rfqStatus !== 'DRAFT'}
                          value={item.productId || ''}
                          onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                          className="w-full h-9 px-2.5 bg-background border border-border/80 rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-blue-400 transition-colors cursor-pointer"
                        >
                          <option value="">-- SELECT PRODUCT --</option>
                          {availableProducts.map(p => (
                            <option key={p._id} value={p._id}>
                              {p.name} {p.sku ? `[${p.sku}]` : ''}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Variant / Spec */}
                      <td className="px-3 py-2.5">
                        {!item.productId ? (
                          <span className="text-[11px] text-muted-foreground italic px-1">Select product first</span>
                        ) : variantsMap[item.productId]?.length > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Variant</span>
                              {rfqStatus === 'DRAFT' && (
                                <button
                                  type="button"
                                  onClick={() => handlePopulateAllVariants(item.productId, idx)}
                                  className="text-[9px] font-black uppercase text-blue-600 hover:text-blue-700 bg-blue-500/10 hover:bg-blue-500/20 px-1.5 py-0.5 rounded-md border border-blue-500/20 transition-colors cursor-pointer"
                                  title="Add rows for all variants of this product"
                                >
                                  ⚡ All Variants
                                </button>
                              )}
                            </div>
                            <select
                              disabled={rfqStatus !== 'DRAFT'}
                              value={item.variantId || ''}
                              onChange={e => handleItemChange(idx, 'variantId', e.target.value)}
                              className="w-full h-8 px-2 bg-background border border-border/80 rounded-lg text-[11px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-blue-400 transition-colors cursor-pointer"
                            >
                              <option value="">-- BASE PRODUCT --</option>
                              {variantsMap[item.productId].map(v => {
                                const attrStr = Object.entries(v.attributes || {}).map(([k, val]) => `${k}: ${val}`).join(', ');
                                const label = v.title ? `${v.title} (${v.sku})` : (attrStr ? `${attrStr} (${v.sku})` : v.sku);
                                return <option key={v._id} value={v._id}>{label}</option>;
                              })}
                            </select>
                          </div>
                        ) : hasVars ? (
                          <div className="flex items-center gap-1.5 px-2 text-[11px] text-blue-600 font-medium">
                            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                            <span>Loading variants...</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground px-1">No variants</span>
                        )}
                      </td>

                      {/* Description */}
                      <td className="px-3 py-2.5">
                        <input
                          type="text"
                          disabled={rfqStatus !== 'DRAFT'}
                          value={item.description || ''}
                          onChange={e => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full h-9 px-2.5 bg-background border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                          placeholder="Specification / description..."
                        />
                      </td>

                      {/* Quantity */}
                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="number"
                          min="1"
                          disabled={rfqStatus !== 'DRAFT'}
                          required
                          value={item.quantity}
                          onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-20 h-9 px-2 bg-background border border-border/80 rounded-xl text-xs font-black text-center text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors mx-auto block"
                        />
                      </td>

                      {/* UOM */}
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-block px-2 py-1 rounded-md bg-muted text-[11px] font-black text-muted-foreground uppercase">
                          {item.uom || 'Piece'}
                        </span>
                      </td>

                      {/* Unit Price */}
                      <td className="px-3 py-2.5 text-right">
                        <div className="relative inline-block w-28">
                          <span className="absolute left-2.5 top-2.5 text-muted-foreground text-[10px] font-bold">
                            {formData.currency}
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={rfqStatus !== 'DRAFT'}
                            required
                            value={item.unitCost}
                            onChange={e => handleItemChange(idx, 'unitCost', e.target.value)}
                            className="w-full h-9 pl-9 pr-2 bg-background border border-border/80 rounded-xl text-xs font-black text-right text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                          />
                        </div>
                      </td>

                      {/* Subtotal */}
                      <td className="px-4 py-2.5 text-right font-black text-foreground text-xs">
                        {formData.currency} {Number(item.subTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2.5 text-center">
                        {rfqStatus === 'DRAFT' && (
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Remove row"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>

                    </tr>
                  );
                })}

                {formData.items.length === 0 && (
                  <tr>
                    <td colSpan="8" className="p-10 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Package size={30} className="text-muted-foreground/40 mb-1" />
                        <span className="text-xs font-bold uppercase tracking-wider">Matrix is empty</span>
                        <button
                          type="button"
                          onClick={addItem}
                          className="text-xs text-blue-600 font-bold hover:underline"
                        >
                          + Add First Product Row
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ========================================================================= */}
          {/* BOTTOM SUMMARY FOOTER (CLEAN TOTAL DISPLAY - NO DUPLICATE BUTTONS)         */}
          {/* ========================================================================= */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-blue-900/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 text-blue-300 flex items-center justify-center shrink-0">
                <Banknote size={18} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-200/70 block">
                  Estimated Sourcing Commitment
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  {formData.items.length} Product Line{formData.items.length !== 1 ? 's' : ''} &bull; {totalQuantity} Total Units
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <span className="text-[10px] font-bold text-blue-300 uppercase block">
                  Total Valuation ({formData.currency})
                </span>
                <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {formData.currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

        </div>

      </form>
    </div>
  );
}

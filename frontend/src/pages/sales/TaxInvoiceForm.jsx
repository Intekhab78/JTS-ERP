import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCurrency } from '../../contexts/CurrencyContext';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Save, X, Plus, Trash2, ArrowLeft, Printer, Mail, 
  Package, Calendar, Building2, Sparkles, Clock, ShieldCheck, 
  Zap, Percent, Truck, FileText, CheckCircle2, ChevronDown, Check, Search, User, CreditCard 
} from 'lucide-react';
import { EmailSendModal } from '../../components/common/EmailSendModal';

/**
 * Searchable Combobox: The input field itself is the search box!
 * Uses createPortal so the dropdown is NEVER clipped by tables or overflow containers.
 */
function SearchableCombobox({
  value,
  onChange,
  options, // [{ id, label, subLabel, badge }]
  placeholder = "Search and select...",
  disabled = false,
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, openUp: false });

  const selectedOption = options.find(o => String(o.id) === String(value));
  const displayValue = isOpen ? searchTerm : (selectedOption ? selectedOption.label : "");

  const updateCoords = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const menuHeight = 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight && rect.top > spaceBelow;

    setCoords({
      top: openUp ? Math.max(8, rect.top - menuHeight - 6) : rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 320) - 8)),
      width: Math.max(rect.width, 300),
      openUp
    });
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      const handleScroll = () => updateCoords();
      const handleResize = () => updateCoords();
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const filteredOptions = options.filter(o => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const l = (o.label || "").toLowerCase();
    const sub = (o.subLabel || "").toLowerCase();
    const b = (o.badge || "").toLowerCase();
    return l.includes(q) || sub.includes(q) || b.includes(q);
  });

  const handleSelect = (id) => {
    onChange(id);
    setSearchTerm("");
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setSearchTerm("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* THE INPUT ITSELF IS THE SEARCH INPUT & DROPDOWN TRIGGER */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />

        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={displayValue}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={(e) => {
            setSearchTerm(selectedOption ? selectedOption.label : "");
            setIsOpen(true);
            setTimeout(() => e.target.select(), 10);
          }}
          placeholder={placeholder}
          className={`w-full h-11 pl-10 pr-14 bg-card border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-muted-foreground/60 ${
            isOpen ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-sm' : 'hover:border-blue-400'
          } ${disabled ? 'opacity-60 cursor-not-allowed bg-muted/20' : 'cursor-text'}`}
        />

        {/* Right Buttons: Clear X + Chevron Dropdown */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground">
          {selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:text-rose-500 rounded-md hover:bg-muted/60 transition-colors cursor-pointer"
              title="Clear selection"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                if (isOpen) {
                  setIsOpen(false);
                  setSearchTerm("");
                } else {
                  setSearchTerm("");
                  setIsOpen(true);
                  inputRef.current?.focus();
                }
              }
            }}
            className="p-1 hover:text-foreground rounded-md transition-colors cursor-pointer"
          >
            <ChevronDown size={15} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* PORTAL DROPDOWN: Never cut off by tables, no secondary search box */}
      {isOpen && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 9999
          }}
          className="max-h-64 overflow-y-auto bg-card border border-border rounded-xl shadow-2xl p-1.5 divide-y divide-border/40 animate-in fade-in zoom-in-95 duration-150"
        >
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No results found for <span className="font-bold text-foreground">"{searchTerm}"</span>
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = String(opt.id) === String(value);
              return (
                <div
                  key={opt.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(opt.id);
                  }}
                  className={`p-2.5 rounded-lg flex items-center justify-between gap-2 text-sm cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300 font-bold' 
                      : 'hover:bg-muted/60 text-foreground'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-xs sm:text-sm truncate">{opt.label}</span>
                      {opt.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border shrink-0">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    {opt.subLabel && (
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {opt.subLabel}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <Check size={16} className="text-blue-600 shrink-0 ml-1" />
                  )}
                </div>
              );
            })
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

const TaxInvoiceForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  const [loading, setLoading] = useState(false);
  const [rawInvoice, setRawInvoice] = useState(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const { formatCurrency, currencySymbol } = useCurrency();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [variantsMap, setVariantsMap] = useState({});
  
  const [formData, setFormData] = useState({
    customerId: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'AED',
    shippingCharges: 0,
    otherCharges: 0,
    paymentTerms: '',
    deliveryTerms: '',
    notes: '',
    termsAndConditions: '',
    internalNotes: '',
    items: [],
    status: 'DRAFT',
    sourceType: 'MANUAL',
    invoiceNumber: ''
  });

  useEffect(() => {
    fetchDependencies();
    if (isEditing) {
      fetchTaxInvoice();
    }
  }, [id]);

  const fetchDependencies = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [customersRes, productsRes, taxesRes] = await Promise.all([
        axios.get('/api/v1/crm/customers', { headers }),
        axios.get('/api/v1/inventory/products', { headers }),
        axios.get('/api/v1/taxes', { headers })
      ]);
      setCustomers(customersRes.data || []);
      setProducts((productsRes.data || []).filter(p => p.isActive !== false));
      setTaxes((taxesRes.data || []).filter(t => t.isActive));
    } catch (error) {
      console.error('Failed to fetch dependencies', error);
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

  const fetchTaxInvoice = async () => {
    try {
      const res = await axios.get(`/api/v1/tax-invoices/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const pf = res.data;
      setRawInvoice(pf);
      const loadedItems = (pf.items || []).map(i => ({
        ...i,
        productId: i.productId?._id || i.productId,
        variantId: i.variantId?._id || i.variantId || '',
        variantSku: i.variantSku || i.variantId?.sku || '',
        attributes: i.attributes || i.variantId?.attributes || {}
      }));

      setFormData({
        customerId: pf.customerId?._id || pf.customerId,
        issueDate: pf.issueDate ? pf.issueDate.split('T')[0] : '',
        dueDate: pf.dueDate ? pf.dueDate.split('T')[0] : '',
        currency: pf.currency || 'AED',
        shippingCharges: pf.shippingCharges || 0,
        otherCharges: pf.otherCharges || 0,
        paymentTerms: pf.paymentTerms || '',
        deliveryTerms: pf.deliveryTerms || '',
        notes: pf.notes || '',
        termsAndConditions: pf.termsAndConditions || '',
        internalNotes: pf.internalNotes || '',
        items: loadedItems,
        status: pf.status || 'DRAFT',
        sourceType: pf.sourceType || 'MANUAL',
        invoiceNumber: pf.invoiceNumber || '',
        billingType: pf.billingType || 'ADVANCE',
        paymentRequestPercentage: pf.paymentRequestPercentage || 100,
        paymentRequestAmount: pf.paymentRequestAmount || (pf.grandTotal || 0)
      });

      loadedItems.forEach(i => {
        if (i.productId) fetchVariantsForProduct(i.productId);
      });
    } catch (error) {
      console.error('Failed to fetch Tax invoice', error);
      alert('Failed to load details');
    }
  };

  /**
   * Helper to accurately determine the tax rate for a product:
   * 1. Product's explicit taxRate if positive
   * 2. Product's tax1 reference if linked to Tax master
   * 3. Tenant's standard active VAT (5% in UAE or first active tax)
   */
  const resolveProductTaxRate = (product, availableTaxes = taxes) => {
    if (!product) return 5;

    // 1. Check explicit positive taxRate on product
    if (product.taxRate !== null && product.taxRate !== undefined && Number(product.taxRate) > 0) {
      return Number(product.taxRate);
    }

    // 2. Check linked tax1 reference (ObjectId or populated object)
    if (product.tax1) {
      if (typeof product.tax1 === 'object' && product.tax1.rate !== undefined) {
        return Number(product.tax1.rate) || 0;
      }
      const taxId = String(product.tax1);
      const matchedTax = availableTaxes.find(t => String(t._id) === taxId);
      if (matchedTax) {
        return Number(matchedTax.rate) || 0;
      }
    }

    // 3. Fallback to default tenant VAT (VAT 5% in UAE) or first active tax
    const vat5 = availableTaxes.find(t => Number(t.rate) === 5);
    if (vat5) return Number(vat5.rate);
    if (availableTaxes.length > 0 && availableTaxes[0].rate !== undefined) {
      return Number(availableTaxes[0].rate);
    }

    return 5; // Default standard VAT
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    const item = newItems[index];

    if (field === 'productId') {
      const product = products.find(p => p._id === value);
      if (product) {
        item.productId = product._id;
        item.variantId = '';
        item.variantSku = '';
        item.attributes = {};
        item.itemName = product.name;
        item.sku = product.sku;
        item.unitPrice = Number(product.salesPrice ?? product.price ?? 0);
        item.taxRate = resolveProductTaxRate(product, taxes);
        item.quantity = 1;
        item.discount = 0;
        fetchVariantsForProduct(product._id);
      } else {
        item.productId = '';
        item.variantId = '';
        item.variantSku = '';
        item.attributes = {};
        item.itemName = '';
        item.sku = '';
        item.unitPrice = 0;
        item.taxRate = 5;
        item.quantity = 1;
        item.discount = 0;
      }
    } else if (field === 'variantId') {
      item.variantId = value;
      const productVars = variantsMap[item.productId] || [];
      const selectedVar = productVars.find(v => v._id === value);
      if (selectedVar) {
        item.variantSku = selectedVar.sku || '';
        item.attributes = selectedVar.attributes || {};
        if (selectedVar.salesPrice !== undefined && selectedVar.salesPrice !== null && selectedVar.salesPrice !== '') {
          item.unitPrice = Number(selectedVar.salesPrice) || 0;
        }
      } else {
        item.variantSku = '';
        item.attributes = {};
        const prod = products.find(p => p._id === item.productId);
        if (prod) item.unitPrice = Number(prod.salesPrice ?? prod.price ?? 0);
      }
    } else {
      item[field] = (field === 'taxRate' || field === 'quantity' || field === 'unitPrice' || field === 'discount')
        ? (value === '' ? '' : Number(value))
        : value;
    }

    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const disc = Number(item.discount) || 0;
    const taxR = Number(item.taxRate) || 0;
    
    const taxable = Math.max(0, (qty * price) - disc);
    item.taxAmount = (taxable * taxR) / 100;
    item.lineTotal = taxable + item.taxAmount;

    setFormData({ ...formData, items: newItems });
  };

  const handlePopulateAllVariants = (productId, currentIndex) => {
    const vars = variantsMap[productId] || [];
    if (vars.length === 0) return;

    const prod = products.find(p => p._id === productId);
    const basePrice = Number(prod?.salesPrice ?? prod?.price ?? 0);
    const taxRate = resolveProductTaxRate(prod, taxes);

    const newRows = vars.map(v => {
      const unitPrice = (v.salesPrice !== undefined && v.salesPrice !== null && v.salesPrice !== '')
        ? Number(v.salesPrice)
        : basePrice;
      const taxable = unitPrice;
      const taxAmount = (taxable * taxRate) / 100;
      return {
        productId,
        variantId: v._id,
        variantSku: v.sku || '',
        attributes: v.attributes || {},
        itemName: prod?.name || '',
        sku: v.sku || prod?.sku || '',
        quantity: 1,
        unitPrice,
        discount: 0,
        taxRate,
        taxAmount,
        lineTotal: taxable + taxAmount
      };
    });

    const updated = [...formData.items];
    updated.splice(currentIndex, 1, ...newRows);
    setFormData(prev => ({ ...prev, items: updated }));
  };

  const addItem = () => {
    const defaultTaxRate = (taxes.find(t => Number(t.rate) === 5)?.rate) ?? (taxes[0]?.rate ?? 5);
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          productId: '',
          variantId: '',
          variantSku: '',
          attributes: {},
          itemName: '',
          sku: '',
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          taxRate: Number(defaultTaxRate),
          taxAmount: 0,
          lineTotal: 0
        }
      ]
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0);
  };

  const calculateDiscountTotal = () => {
    return formData.items.reduce((sum, item) => sum + (Number(item.discount) || 0), 0);
  };

  const calculateTaxTotal = () => {
    return formData.items.reduce((sum, item) => sum + (Number(item.taxAmount) || 0), 0);
  };

  const calculateGrandTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscountTotal();
    const tax = calculateTaxTotal();
    const shipping = Number(formData.shippingCharges) || 0;
    const other = Number(formData.otherCharges) || 0;
    return subtotal - discount + tax + shipping + other;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const validItems = formData.items.filter(i => i.productId);
      if (validItems.length === 0) {
        alert('Please select at least one product item for the invoice.');
        setLoading(false);
        return;
      }

      const subtotal = validItems.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0);
      const discountTotal = validItems.reduce((sum, item) => sum + (Number(item.discount) || 0), 0);
      const taxTotal = validItems.reduce((sum, item) => sum + (Number(item.taxAmount) || 0), 0);
      const grandTotal = calculateGrandTotal();

      const selectedCustomer = customers.find(c => c._id === formData.customerId);
      const customerSnapshot = selectedCustomer ? {
        name: selectedCustomer.name || 'Customer',
        email: selectedCustomer.email || '',
        phone: selectedCustomer.phone || '',
        billingAddress: typeof selectedCustomer.billingAddress === 'string'
          ? selectedCustomer.billingAddress
          : (selectedCustomer.billingAddress?.street || selectedCustomer.billingAddress?.city || ''),
        taxRegistrationNumber: selectedCustomer.taxRegistrationNumber || ''
      } : undefined;

      const payload = {
        ...formData,
        items: validItems,
        customerSnapshot,
        branchId: formData.branchId || authUser.branchId || authUser.branches?.[0]?._id || authUser.branches?.[0] || undefined,
        subtotal,
        discountTotal,
        taxTotal,
        grandTotal,
        balanceDue: grandTotal
      };
      
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      if (isEditing) {
        await axios.put(`/api/v1/tax-invoices/${id}`, payload, { headers });
      } else {
        await axios.post('/api/v1/tax-invoices', payload, { headers });
      }
      navigate('/sales/tax-invoices');
    } catch (error) {
      console.error('Save failed', error);
      alert(error.response?.data?.message || 'Failed to save Tax Invoice');
    } finally {
      setLoading(false);
    }
  };

  const isReadOnly = (isEditing && formData.status && !['DRAFT', 'PENDING_APPROVAL'].includes(formData.status)) || 
                     (isEditing && !hasPermission('EDIT_TAX_INVOICE')) || 
                     (!isEditing && !hasPermission('CREATE_TAX_INVOICE'));

  const selectedCustomer = customers.find(c => c._id === formData.customerId);
  const totalUnits = formData.items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  const effectiveGrandTotal = calculateGrandTotal();
  const effectiveTaxTotal = calculateTaxTotal();

  // Prepare searchable options for Customers
  const customerComboboxOptions = customers.map(c => ({
    id: c._id,
    label: c.name,
    badge: c.taxRegistrationNumber ? `TRN: ${c.taxRegistrationNumber}` : null,
    subLabel: [c.phone, c.email].filter(Boolean).join(' · ')
  }));

  // Prepare searchable options for Products (ONLY PRODUCT NAME, NO PRICE!)
  const productComboboxOptions = products.map(p => ({
    id: p._id,
    label: p.name,
    badge: p.sku
  }));

  return (
    <div className="space-y-4 pb-12 max-w-[1440px] mx-auto text-foreground">
      
      {/* ========================================================================= */}
      {/* 1. HERO HEADER WITH BACK BUTTON & SOURCING ACTIONS                        */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-4 sm:p-5 text-white shadow-md border border-blue-900/40 no-print">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          
          {/* Left: Back Button + Title & Subtitle */}
          <div className="flex items-start gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/sales/tax-invoices')}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md shrink-0 mt-0.5"
              title="Back to Tax Invoices"
            >
              <ArrowLeft size={16} />
            </button>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase tracking-wider">
                  <Sparkles size={11} className="text-blue-400" />
                  Fiscal Sales · {isEditing ? `Tax Invoice ${formData.invoiceNumber || ''}` : 'Direct Tax Invoice Generation'}
                </span>

                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-2xs">
                  {formData.status || 'DRAFT'}
                </span>

                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/10 text-slate-300 border border-white/10">
                  Source: {formData.sourceType || 'MANUAL'}
                </span>
              </div>

              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2 truncate">
                <span>{selectedCustomer?.name ? `${selectedCustomer.name}` : (isEditing ? formData.invoiceNumber : 'New Tax Invoice')}</span>
                {selectedCustomer?.taxRegistrationNumber && (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-400/30">
                    TRN: {selectedCustomer.taxRegistrationNumber}
                  </span>
                )}
              </h1>

              <p className="text-xs text-blue-100/75 leading-snug">
                Issue Date: <strong className="text-white">{formData.issueDate || 'Today'}</strong> · Due Date: <strong className="text-white">{formData.dueDate}</strong>
                {formData.paymentTerms && <> · Terms: <strong className="text-white">{formData.paymentTerms}</strong></>}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
            {isEditing && (
              <>
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all duration-200 cursor-pointer hover:shadow-md"
                >
                  <Mail size={14} /> Send Email
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/sales/tax-invoices/print/${id}`)}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all duration-200 cursor-pointer hover:shadow-md"
                >
                  <Printer size={14} /> Print (A4)
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => navigate('/sales/tax-invoices')}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all duration-200 cursor-pointer"
            >
              <X size={14} /> Cancel
            </button>

            {!isReadOnly && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-black rounded-xl shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                <Save size={14} /> {loading ? 'Saving Invoice...' : isEditing ? 'Update Tax Invoice' : 'Create Tax Invoice'}
              </button>
            )}
          </div>

        </div>

        {/* Ambient subtle light */}
        <div className="absolute right-0 top-0 w-80 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ========================================================================= */}
      {/* 2. FOUR KPI SUMMARY CARDS (With Hover Elevation)                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        
        {/* Total Grand Value */}
        <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-2xs hover:border-blue-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
              Total Invoice Amount
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <Zap size={14} />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-foreground">
            {currencySymbol} {effectiveGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[9.5px] text-muted-foreground block truncate mt-0.5">
            Subtotal: {currencySymbol} {calculateSubtotal().toFixed(2)}
          </span>
        </div>

        {/* Line Items & Units */}
        <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-2xs hover:border-indigo-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
              Invoiced Units
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
              <Package size={14} />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-foreground">
            {totalUnits} <span className="text-xs font-normal text-muted-foreground">Units</span>
          </div>
          <span className="text-[9.5px] text-muted-foreground block truncate mt-0.5">
            {formData.items.filter(i => i.productId).length} distinct product lines
          </span>
        </div>

        {/* VAT / Tax Total */}
        <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-2xs hover:border-emerald-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
              Tax / VAT Amount
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Percent size={14} />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-emerald-600">
            {currencySymbol} {effectiveTaxTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[9.5px] text-muted-foreground block truncate mt-0.5">
            Standard UAE VAT applied
          </span>
        </div>

        {/* Due Date & Settlement */}
        <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-2xs hover:border-amber-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
              Payment Due
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Calendar size={14} />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-foreground truncate">
            {formData.dueDate}
          </div>
          <span className="text-[9.5px] text-muted-foreground block truncate mt-0.5">
            Terms: {formData.paymentTerms || 'Net 30'}
          </span>
        </div>

      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset disabled={isReadOnly} className="space-y-4">
          
          {/* ========================================================================= */}
          {/* 3. PRIMARY PARAMETERS: FULL-WIDTH SEARCHABLE CUSTOMER & FISCAL DATES      */}
          {/* ========================================================================= */}
          <div className="rounded-2xl bg-card border border-border/80 p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/70">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Building2 size={15} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Invoice Recipient & Parameters
                </h3>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-muted text-muted-foreground uppercase tracking-wider">
                Fiscal Entity
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
              {/* Customer Selector with normal width */}
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <User size={13} className="text-blue-500" /> Customer / Recipient Entity <span className="text-rose-500">*</span>
                  </span>
                  {selectedCustomer?.taxRegistrationNumber && (
                    <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      TRN: {selectedCustomer.taxRegistrationNumber}
                    </span>
                  )}
                </label>

                <SearchableCombobox
                  value={formData.customerId}
                  onChange={val => setFormData({ ...formData, customerId: val })}
                  options={customerComboboxOptions}
                  placeholder="Select customer..."
                  disabled={isReadOnly}
                  className="w-full"
                />

                {selectedCustomer && (
                  <div className="mt-1 text-[11px] text-muted-foreground truncate">
                    {selectedCustomer.phone && <span>{selectedCustomer.phone}</span>}
                    {selectedCustomer.email && <span> · {selectedCustomer.email}</span>}
                  </div>
                )}
              </div>

              {/* Issue Date */}
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Calendar size={13} className="text-amber-500" /> Issue Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.issueDate}
                  onChange={e => setFormData({ ...formData, issueDate: e.target.value })}
                  className="w-full h-11 px-3 text-xs font-bold rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Clock size={13} className="text-purple-500" /> Payment Due Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.dueDate}
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full h-11 px-3 text-xs font-bold rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Payment Terms */}
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <CreditCard size={13} className="text-indigo-500" /> Payment Terms
                </label>
                <input
                  type="text"
                  value={formData.paymentTerms}
                  onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                  placeholder="e.g. Net 30, Due On Receipt"
                  className="w-full h-11 px-3 text-xs font-bold rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. LINE ITEMS MATRIX TABLE (WITH SEARCHABLE PRODUCTS & TAX CALCULATION)  */}
          {/* ========================================================================= */}
          <div className="rounded-2xl bg-card border border-border/80 shadow-2xs overflow-hidden">
            
            {/* Table Header Bar */}
            <div className="p-3.5 sm:p-4 border-b border-border/80 bg-muted/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Package size={15} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Invoice Line Items & Taxation
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 uppercase tracking-wider">
                  {formData.items.length} Lines Included
                </span>
              </div>

              {!isReadOnly && formData.sourceType !== 'QUOTE' && (
                <button
                  type="button"
                  onClick={addItem}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus size={14} /> Add Item Row
                </button>
              )}
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap text-xs">
                <thead className="text-[10px] font-black text-muted-foreground uppercase tracking-wider bg-muted/10 border-b border-border/80">
                  <tr>
                    <th className="px-4 py-3 min-w-[360px]">Product / Designation</th>
                    <th className="px-3 py-3 w-24 text-center">Qty</th>
                    <th className="px-3 py-3 w-32 text-right">Unit Price ({currencySymbol})</th>
                    <th className="px-3 py-3 w-28 text-right">Discount</th>
                    <th className="px-3 py-3 w-36 text-center">Tax % (VAT)</th>
                    <th className="px-3 py-3 w-32 text-right">Tax Amount</th>
                    <th className="px-4 py-3 w-32 text-right">Line Total</th>
                    <th className="px-3 py-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {formData.items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        No invoice items added. Click <strong className="text-blue-600 cursor-pointer" onClick={addItem}>Add Item Row</strong> to begin adding taxable products.
                      </td>
                    </tr>
                  ) : (
                    formData.items.map((item, index) => {
                      return (
                        <tr key={index} className="hover:bg-muted/30 transition-colors">
                          
                          {/* Searchable Product Selection */}
                          <td className="px-4 py-3">
                            <SearchableCombobox
                              value={item.productId}
                              onChange={val => handleItemChange(index, 'productId', val)}
                              options={productComboboxOptions}
                              placeholder="Search product by name, SKU, barcode..."
                              searchPlaceholder="Type product name, SKU, or barcode..."
                              disabled={formData.sourceType === 'QUOTE' || isReadOnly}
                              className="w-full"
                            />

                            {/* Variant Badge from quote */}
                            {formData.sourceType === 'QUOTE' && item.variantSku && (
                              <div className="mt-1 flex items-center gap-1">
                                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-200">
                                  Variant: {item.variantSku}
                                </span>
                                {item.attributes && Object.keys(item.attributes).length > 0 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    ({Object.entries(item.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')})
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Manual Variant Picker */}
                            {formData.sourceType !== 'QUOTE' && variantsMap[item.productId]?.length > 0 && (
                              <div className="flex items-center gap-1.5 pt-1.5">
                                <div className="flex-1">
                                  <select
                                    value={item.variantId || ''}
                                    onChange={(e) => handleItemChange(index, 'variantId', e.target.value)}
                                    disabled={isReadOnly}
                                    className="w-full h-11 text-xs font-bold bg-card border border-border rounded-xl px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                                  >
                                    <option value="">-- Base Product --</option>
                                    {variantsMap[item.productId].map(v => {
                                      const attrStr = Object.entries(v.attributes || {}).map(([k, val]) => `${k}: ${val}`).join(', ');
                                      const label = v.title ? `${v.title} (${v.sku})` : (attrStr ? `${attrStr} (${v.sku})` : v.sku);
                                      return <option key={v._id} value={v._id}>{label}</option>;
                                    })}
                                  </select>
                                </div>
                                {!isReadOnly && (
                                  <button
                                    type="button"
                                    onClick={() => handlePopulateAllVariants(item.productId, index)}
                                    className="h-11 text-[9.5px] font-black uppercase text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 px-3 rounded-xl border border-blue-200 dark:border-blue-800 transition-colors whitespace-nowrap cursor-pointer shadow-xs flex items-center justify-center"
                                    title="Populate rows for all variants of this product"
                                  >
                                    ⚡ All Variants
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Quantity */}
                          <td className="px-3 py-3 text-center">
                            <input
                              type="number"
                              min="1"
                              required
                              disabled={formData.sourceType === 'QUOTE'}
                              value={item.quantity}
                              onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                              className="w-24 h-11 px-3 text-xs font-bold text-center rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                          </td>

                          {/* Unit Price */}
                          <td className="px-3 py-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              disabled={formData.sourceType === 'QUOTE'}
                              value={item.unitPrice}
                              onChange={e => handleItemChange(index, 'unitPrice', e.target.value)}
                              className="w-28 h-11 px-3 text-xs font-bold text-right rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                          </td>

                          {/* Discount */}
                          <td className="px-3 py-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              disabled={formData.sourceType === 'QUOTE'}
                              value={item.discount}
                              onChange={e => handleItemChange(index, 'discount', e.target.value)}
                              className="w-24 h-11 px-3 text-xs font-bold text-right rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                          </td>

                          {/* Tax % (VAT) Selector */}
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <select
                                value={item.taxRate}
                                onChange={e => handleItemChange(index, 'taxRate', e.target.value)}
                                disabled={formData.sourceType === 'QUOTE'}
                                className="h-11 px-3 text-xs font-bold text-center rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                              >
                                <option value="0">0% (Zero)</option>
                                <option value="5">5% (VAT Standard)</option>
                                {taxes.filter(t => t.rate !== 0 && t.rate !== 5).map(t => (
                                  <option key={t._id} value={t.rate}>
                                    {t.rate}% ({t.name})
                                  </option>
                                ))}
                                {!([0, 5, ...taxes.map(t => Number(t.rate))].includes(Number(item.taxRate))) && (
                                  <option value={item.taxRate}>{item.taxRate}% (Custom)</option>
                                )}
                              </select>
                            </div>
                          </td>

                          {/* Calculated Tax Amount */}
                          <td className="px-3 py-3 text-right font-black text-xs text-emerald-600 dark:text-emerald-400">
                            {currencySymbol} {(Number(item.taxAmount) || 0).toFixed(2)}
                          </td>

                          {/* Line Total */}
                          <td className="px-4 py-3 text-right font-black text-xs text-foreground">
                            {currencySymbol} {(Number(item.lineTotal) || 0).toFixed(2)}
                          </td>

                          {/* Remove Action */}
                          <td className="px-3 py-3 text-center">
                            {!isReadOnly && formData.sourceType !== 'QUOTE' && (
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                title="Remove line item"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Valuation Strip */}
            <div className="p-3.5 bg-muted/20 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">
                Showing <strong className="text-foreground">{formData.items.length}</strong> items in fiscal invoice matrix
              </span>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                    Total Tax / VAT
                  </span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {currencySymbol} {effectiveTaxTotal.toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                    Commitment Grand Total
                  </span>
                  <span className="text-base font-black text-foreground">
                    {currencySymbol} {effectiveGrandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* 5. ADDITIONAL INFORMATION & FINANCIAL VALUATION SUMMARY                   */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
            
            {/* Left: Notes & Conditions */}
            <div className="lg:col-span-2 rounded-2xl bg-card border border-border/80 p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/70">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <FileText size={15} />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                    Additional Invoice Protocols & Notes
                  </h3>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-muted text-muted-foreground uppercase tracking-wider">
                  Terms & Conditions
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                    <Truck size={12} className="text-amber-500" /> Delivery Terms
                  </label>
                  <input
                    type="text"
                    value={formData.deliveryTerms}
                    onChange={e => setFormData({ ...formData, deliveryTerms: e.target.value })}
                    placeholder="e.g. FOB, Ex-Works, CIF Dubai"
                    className="w-full h-11 px-3.5 bg-card border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                    <ShieldCheck size={12} className="text-purple-500" /> Internal Notes (Private)
                  </label>
                  <input
                    type="text"
                    value={formData.internalNotes}
                    onChange={e => setFormData({ ...formData, internalNotes: e.target.value })}
                    placeholder="Optional internal ledger notes..."
                    className="w-full h-11 px-3.5 bg-card border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <FileText size={12} className="text-blue-500" /> Notes for Customer (Printed on Invoice)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Payment bank details, delivery remarks, customer instructions..."
                  className="w-full p-3 bg-card border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none transition-all placeholder:font-normal placeholder:text-muted-foreground/60"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <FileText size={12} className="text-emerald-500" /> Terms and Conditions
                </label>
                <textarea
                  value={formData.termsAndConditions}
                  onChange={e => setFormData({ ...formData, termsAndConditions: e.target.value })}
                  placeholder="Standard sales warranties, returns, and jurisdiction policies..."
                  className="w-full p-3 bg-card border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none transition-all placeholder:font-normal placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            {/* Right: Financial Summary Protocol (Dark Indigo Card) */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-4 sm:p-5 shadow-md border border-indigo-950 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white/10 text-blue-300 flex items-center justify-center">
                      <Zap size={15} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">
                      Invoice Valuation Summary
                    </h3>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white/10 text-blue-300 uppercase tracking-wider border border-white/10">
                    {currencySymbol} Currency
                  </span>
                </div>

                <div className="space-y-3 pt-1 text-xs">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Taxable Subtotal</span>
                    <span className="font-bold text-white">
                      {currencySymbol} {calculateSubtotal().toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-300">
                    <span>Line Discounts</span>
                    <span className="font-bold text-rose-400">
                      -{currencySymbol} {calculateDiscountTotal().toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                    <span className="font-bold flex items-center gap-1.5">
                      <Percent size={13} className="text-emerald-400" /> Total VAT (5%)
                    </span>
                    <span className="font-black text-sm text-emerald-400">
                      +{currencySymbol} {effectiveTaxTotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                    <div>
                      <label className="text-[9.5px] uppercase font-bold text-blue-200/60 block mb-1 flex items-center gap-1">
                        <Truck size={11} className="text-blue-300" /> Shipping Charges
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.shippingCharges}
                        onChange={e => setFormData({ ...formData, shippingCharges: e.target.value })}
                        className="w-full h-10 px-3 bg-white/10 border border-white/20 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[9.5px] uppercase font-bold text-blue-200/60 block mb-1 flex items-center gap-1">
                        <Zap size={11} className="text-amber-300" /> Other Charges
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.otherCharges}
                        onChange={e => setFormData({ ...formData, otherCharges: e.target.value })}
                        className="w-full h-10 px-3 bg-white/10 border border-white/20 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-white/10">
                <span className="text-[10px] uppercase tracking-wider font-bold text-blue-200/70 block mb-0.5">
                  Grand Total Payable
                </span>
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {currencySymbol} {effectiveGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

            </div>

          </div>

        </fieldset>
      </form>

      {isEmailModalOpen && rawInvoice && (
        <EmailSendModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          documentType="Tax Invoice"
          documentNumber={rawInvoice.invoiceNumber}
          recipientName={rawInvoice.customerSnapshot?.name || customers.find(c => c._id === formData.customerId)?.name}
          defaultEmail={rawInvoice.customerSnapshot?.email || customers.find(c => c._id === formData.customerId)?.email}
          sendEndpoint={`/api/v1/email/tax-invoice/${id}`}
        />
      )}

    </div>
  );
};

export default TaxInvoiceForm;

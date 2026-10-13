import React, { useState, useEffect } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, Plus, Trash2, ArrowLeft, RefreshCw, FileText, History, Info, CheckCircle2, Printer, Zap, Mail } from 'lucide-react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { QuickAddProductModal } from './QuickAddProductModal';
import { QuickAddCustomerModal } from './QuickAddCustomerModal';
import { EmailSendModal } from '../../components/common/EmailSendModal';

const getRevisionDiffSummary = (currentRev, previousRev, currencySymbol) => {
  if (!previousRev) return ["Initial quotation created."];

  const changes = [];

  if (currentRev.grandTotal !== previousRev.grandTotal) {
    const diff = (currentRev.grandTotal || 0) - (previousRev.grandTotal || 0);
    changes.push(`Total ${diff > 0 ? 'increased' : 'decreased'} by ${currencySymbol}${Math.abs(diff).toFixed(2)}`);
  }

  const currItems = currentRev.items || [];
  const prevItems = previousRev.items || [];

  const currMap = {};
  currItems.forEach(i => currMap[i.productId] = i);
  const prevMap = {};
  prevItems.forEach(i => prevMap[i.productId] = i);

  const itemChanges = [];

  for (const item of currItems) {
    const prevItem = prevMap[item.productId];
    if (!prevItem) {
      itemChanges.push(`Added: ${item.itemName || 'Product'}`);
    } else {
      const details = [];
      if (item.quantity !== prevItem.quantity) {
        details.push(`Qty ${prevItem.quantity}→${item.quantity}`);
      }
      if (item.unitPrice !== prevItem.unitPrice) {
        details.push(`Price ${currencySymbol}${prevItem.unitPrice}→${currencySymbol}${item.unitPrice}`);
      }
      if (item.discount !== prevItem.discount) {
        details.push(`Discount ${currencySymbol}${prevItem.discount}→${currencySymbol}${item.discount}`);
      }
      if (details.length > 0) {
        itemChanges.push(`Updated: ${item.itemName || 'Product'} (${details.join(', ')})`);
      }
    }
  }

  for (const item of prevItems) {
    if (!currMap[item.productId]) {
      itemChanges.push(`Removed: ${item.itemName || 'Product'}`);
    }
  }

  if (itemChanges.length > 0) {
    if (itemChanges.length <= 5) {
      changes.push(...itemChanges);
    } else {
      changes.push(`${itemChanges.length} line items modified`);
    }
  }

  if (currentRev.status !== previousRev.status) {
    changes.push(`Status changed to ${currentRev.status}`);
  }

  if (changes.length === 0) {
    return ["Minor details or terms updated."];
  }

  return changes;
};

const QuoteForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { formatCurrency, currencySymbol } = useCurrency();
  const [branches, setBranches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [revisions, setRevisions] = useState([]);
  const [originalItemsString, setOriginalItemsString] = useState('');
  const [showReviseModal, setShowReviseModal] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [printTitle, setPrintTitle] = useState('QUOTATION');
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerModalInitialName, setCustomerModalInitialName] = useState('');

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productModalInitialName, setProductModalInitialName] = useState('');
  const [activeProductIndex, setActiveProductIndex] = useState(null);

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: '40px',
      borderRadius: '0.375rem',
      border: state.isFocused ? '2px solid #2563eb' : '2px solid #e2e8f0',
      backgroundColor: '#f8fafc', // bg-slate-50
      boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)', // shadow-sm
      transition: 'all 0.2s ease',
      fontFamily: 'inherit',
      fontWeight: '700', // font-bold
      fontSize: '0.875rem', // text-sm
      color: '#0f172a', // text-slate-900
      '&:hover': {
        borderColor: state.isFocused ? '#2563eb' : '#60a5fa' // hover:border-blue-400
      }
    }),
    valueContainer: (base) => ({ ...base, padding: '0 12px' }),
    singleValue: (base) => ({ ...base, fontFamily: 'inherit', fontWeight: '700', fontSize: '0.875rem', color: '#0f172a' }),
    input: (base) => ({ ...base, fontFamily: 'inherit', fontWeight: '700', fontSize: '0.875rem', color: '#0f172a' }),
    placeholder: (base) => ({ ...base, fontFamily: 'inherit', fontWeight: '400', fontSize: '0.875rem', color: '#94a3b8' }),
    option: (base, state) => ({
      ...base,
      fontFamily: 'inherit',
      fontSize: '0.875rem',
      fontWeight: state.isSelected ? '700' : '500',
      color: state.isSelected ? '#ffffff' : '#0f172a',
      backgroundColor: state.isSelected ? '#2563eb' : state.isFocused ? '#eff6ff' : '#ffffff',
      cursor: 'pointer',
      '&:active': { backgroundColor: '#1d4ed8' }
    }),
    menu: (base) => ({
      ...base,
      fontFamily: 'inherit',
      borderRadius: '0.5rem',
      overflow: 'hidden',
      border: '1px solid #e2e8f0',
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      zIndex: 9999
    })
  };

  const selectStylesSmall = {
    control: (base, state) => ({
      ...base,
      minHeight: '40px',
      borderRadius: '0.375rem',
      border: state.isFocused ? '2px solid #2563eb' : '2px solid #e2e8f0',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      transition: 'all 0.2s ease',
      fontFamily: 'inherit',
      fontWeight: '700',
      fontSize: '0.875rem',
      color: '#0f172a',
      '&:hover': {
        borderColor: state.isFocused ? '#2563eb' : '#60a5fa'
      }
    }),
    valueContainer: (base) => ({ ...base, padding: '0 8px' }),
    singleValue: (base) => ({ ...base, fontFamily: 'inherit', fontWeight: '700', fontSize: '0.875rem', color: '#0f172a' }),
    input: (base) => ({ ...base, fontFamily: 'inherit', fontWeight: '700', fontSize: '0.875rem', color: '#0f172a' }),
    placeholder: (base) => ({ ...base, fontFamily: 'inherit', fontWeight: '400', fontSize: '0.875rem', color: '#94a3b8' }),
    option: (base, state) => ({
      ...base,
      fontFamily: 'inherit',
      fontSize: '0.875rem',
      fontWeight: state.isSelected ? '700' : '500',
      color: state.isSelected ? '#ffffff' : '#0f172a',
      backgroundColor: state.isSelected ? '#2563eb' : state.isFocused ? '#eff6ff' : '#ffffff',
      cursor: 'pointer',
      '&:active': { backgroundColor: '#1d4ed8' }
    }),
    menu: (base) => ({
      ...base,
      fontFamily: 'inherit',
      borderRadius: '0.5rem',
      overflow: 'hidden',
      border: '1px solid #e2e8f0',
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      zIndex: 9999
    })
  };

  const [formData, setFormData] = useState({
    branchId: '',
    customerId: '',
    quoteDate: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'USD',
    shippingCharges: 0,
    otherCharges: 0,
    paymentTerms: '',
    deliveryTerms: '',
    notes: '',
    termsAndConditions: '',
    internalNotes: '',
    items: [],
    status: 'DRAFT',
    convertedToOrderId: null,
    quoteNumber: '',
    revisionNumber: 1,
    isCurrentRevision: true,
  });

  useEffect(() => {
    const loadData = async () => {
      setInitialLoading(true);
      await fetchDependencies();
      if (isEditing) {
        await Promise.all([fetchQuote(), fetchRevisions()]);
      }
      setInitialLoading(false);
    };
    loadData();
  }, [id]);

  const fetchDependencies = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [branchesRes, customersRes, productsRes] = await Promise.all([
        axios.get('/api/v1/branches', { headers }),
        axios.get('/api/v1/crm/customers', { headers }),
        axios.get('/api/v1/inventory/products', { headers })
      ]);
      setBranches(branchesRes.data);
      setCustomers(customersRes.data);
      setProducts(productsRes.data.filter(p => p.isActive !== false));

      if (!isEditing && branchesRes.data.length > 0) {
        setFormData(prev => ({ ...prev, branchId: branchesRes.data[0]._id }));
      }
    } catch (error) {
      console.error('Failed to fetch dependencies', error);
    }
  };

  const fetchQuote = async () => {
    try {
      const res = await axios.get(`/api/v1/quotes/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const q = res.data;
      setFormData({
        branchId: q.branchId?._id || q.branchId,
        customerId: q.customerId?._id || q.customerId,
        quoteDate: q.quoteDate ? q.quoteDate.split('T')[0] : '',
        validUntil: q.validUntil ? q.validUntil.split('T')[0] : '',
        currency: q.currency,
        shippingCharges: q.shippingCharges,
        otherCharges: q.otherCharges,
        paymentTerms: q.paymentTerms || '',
        deliveryTerms: q.deliveryTerms || '',
        notes: q.notes || '',
        termsAndConditions: q.termsAndConditions || '',
        internalNotes: q.internalNotes || '',
        items: q.items || [],
        status: q.status || 'DRAFT',
        convertedToOrderId: q.convertedToOrderId || null,
        quoteNumber: q.quoteNumber || '',
        revisionNumber: q.revisionNumber || 1,
        isCurrentRevision: q.isCurrentRevision !== false
      });

      setOriginalItemsString(JSON.stringify((q.items || []).map(i => ({
        productId: typeof i.productId === 'object' ? i.productId._id : i.productId,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        discount: Number(i.discount),
        taxRate: Number(i.taxRate)
      }))));
    } catch (error) {
      console.error('Failed to fetch quote', error);
    }
  };

  const fetchRevisions = async () => {
    try {
      const res = await axios.get(`/api/v1/quotes/${id}/revisions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRevisions(res.data);
    } catch (error) {
      console.error('Failed to fetch revisions', error);
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    const item = newItems[index];

    if (field === 'productId') {
      const product = products.find(p => p._id === value);
      if (product) {
        item.productId = product._id;
        item.unitPrice = product.salesPrice || 0;
        item.taxRate = product.taxRate || 0;
        item.quantity = 1;
        item.discount = 0;
      }
    } else {
      item[field] = Number(value) || value;
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

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0, taxAmount: 0, lineTotal: 0 }]
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const calculateGrandTotal = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0);
    const discount = formData.items.reduce((sum, item) => sum + (Number(item.discount) || 0), 0);
    const tax = formData.items.reduce((sum, item) => sum + (Number(item.taxAmount) || 0), 0);
    const shipping = Number(formData.shippingCharges) || 0;
    const other = Number(formData.otherCharges) || 0;

    return subtotal - discount + tax + shipping + other;
  };

  const handleSubmit = async (e, bypassReviseCheck = false) => {
    if (e) e.preventDefault();

    if (isEditing && formData.status !== 'DRAFT' && formData.isCurrentRevision && !bypassReviseCheck && hasPermission('REVISE_QUOTATION')) {
      const currentItemsString = JSON.stringify(formData.items.map(i => ({
        productId: typeof i.productId === 'object' ? i.productId._id : i.productId,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        discount: Number(i.discount),
        taxRate: Number(i.taxRate)
      })));

      if (currentItemsString !== originalItemsString) {
        setShowReviseModal(true);
        return;
      }
    }

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      if (isEditing) {
        await axios.put(`/api/v1/quotes/${id}`, formData, { headers });
        fetchQuote();
      } else {
        const res = await axios.post('/api/v1/quotes', formData, { headers });
        navigate(`/sales/quotes/edit/${res.data._id}`);
      }
    } catch (error) {
      console.error('Save failed', error);
      alert(error.response?.data?.message || 'Failed to save quote');
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!window.confirm('Are you sure you want to convert this quote to a Sales Order?')) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      await axios.post(`/api/v1/quotes/${id}/convert`, {}, { headers });
      fetchQuote();
    } catch (error) {
      console.error('Conversion failed', error);
      alert(error.response?.data?.message || 'Failed to convert quote');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateProForma = async () => {
    if (!window.confirm('Are you sure you want to generate a Pro-Forma Invoice from this quote?')) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const res = await axios.post(`/api/v1/proforma/generate/quote/${id}`, {}, { headers });
      navigate(`/sales/proforma/edit/${res.data._id}`);
    } catch (error) {
      console.error('Generation failed', error);
      alert(error.response?.data?.message || 'Failed to generate Pro-Forma Invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleReviseAndSave = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      // Create a new revision
      const res = await axios.post(`/api/v1/quotes/${id}/revise`, {}, { headers });
      const newQuoteId = res.data._id;

      // Save current form data into the new revision
      await axios.put(`/api/v1/quotes/${newQuoteId}`, formData, { headers });

      setShowReviseModal(false);
      navigate(`/sales/quotes/edit/${newQuoteId}`);
      window.location.reload();
    } catch (error) {
      console.error('Revision failed', error);
      alert(error.response?.data?.message || 'Failed to create revision');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!window.confirm(`Are you sure you want to mark this quote as ${newStatus}?`)) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      await axios.patch(`/api/v1/quotes/${id}/status`, { status: newStatus }, { headers });
      fetchQuote();
    } catch (error) {
      console.error('Status update failed', error);
      alert(error.response?.data?.message || 'Failed to update quote status');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = (inputValue) => {
    setCustomerModalInitialName(inputValue);
    setCustomerModalOpen(true);
  };

  const onCustomerCreated = (newCustomer) => {
    setCustomers(prev => [...prev, newCustomer]);
    setFormData(prev => ({ ...prev, customerId: newCustomer._id }));
  };

  const handleCreateProduct = (inputValue, index) => {
    setActiveProductIndex(index);
    setProductModalInitialName(inputValue);
    setProductModalOpen(true);
  };

  const onProductCreated = (newProduct) => {
    setProducts(prev => [...prev, newProduct]);
    if (activeProductIndex !== null) {
      handleItemChange(activeProductIndex, 'productId', newProduct._id);
    }
  };

  const isReadOnly = (isEditing && formData.status === 'CONVERTED') ||
    (isEditing && !hasPermission('EDIT_QUOTATIONS')) ||
    (!isEditing && !hasPermission('CREATE_QUOTATIONS'));

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8fafc]">
        <div className="animate-spin rounded-none h-12 w-12 border-4 border-slate-200 border-t-blue-600 mb-4"></div>
        <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Fetching Database...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 max-w-[1400px] mx-auto pb-10 bg-[#f8fafc] min-h-screen print:bg-white print:p-0">
      
      {/* Screen View */}
      <div className="flex flex-col print:hidden">
        
        {/* Aggressive Tech Header */}
        <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => navigate('/sales/quotes')}
                  className="p-2 bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 group"
                >
                  <ArrowLeft className="h-5 w-5 text-slate-400 group-hover:text-white" />
                </button>
                <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                  <FileText size={18} className="text-white" />
                </div>
                <h1 className="text-3xl font-black tracking-tight text-white uppercase">
                  {isEditing ? formData.quoteNumber : 'New Quotation'}
                </h1>
                
                <div className="ml-4 flex items-center gap-3 bg-[#111827] border border-slate-800 p-2 rounded-lg shadow-inner hidden sm:flex">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">System Online</span>
                </div>
              </div>
              
              {isEditing ? (
                <div className="flex items-center gap-3 mt-2 pl-14">
                  <p className="text-slate-400 text-sm font-medium tracking-wide">
                    REVISION {formData.revisionNumber} {formData.isCurrentRevision ? '(ACTIVE)' : '(ARCHIVED)'}
                  </p>
                  <Badge
                    variant={formData.status === 'ACCEPTED' ? 'success' : formData.status === 'CONVERTED' ? 'purple' : 'default'}
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${formData.status === 'CONVERTED' ? 'bg-indigo-600 text-white' : ''}`}
                  >
                    {formData.status}
                  </Badge>
                </div>
              ) : (
                <p className="text-slate-400 text-sm font-medium tracking-wide pl-14">
                  CREATE NEW COMMERCIAL OFFER
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto mt-4 lg:mt-0">
              {isEditing && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEmailModalOpen(true)}
                    leftIcon={<Mail className="w-4 h-4" />}
                    className="whitespace-nowrap transition-colors bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30"
                  >
                    Email
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setPrintTitle('QUOTATION'); setTimeout(() => window.print(), 100); }}
                    leftIcon={<Printer className="w-4 h-4" />}
                    className="whitespace-nowrap transition-colors bg-white/10 text-white border-white/20 hover:bg-white/20"
                  >
                    Print
                  </Button>
                </>
              )}

              {isEditing && !formData.isCurrentRevision && (
                <Badge variant="error" className="mr-2 whitespace-nowrap">Archived Record</Badge>
              )}

              {isEditing && revisions.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowHistoryPanel(!showHistoryPanel)}
                  leftIcon={<History className="w-4 h-4" />}
                  className={`whitespace-nowrap transition-colors ${showHistoryPanel ? 'bg-blue-500 text-white border-blue-500' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}
                >
                  History
                </Button>
              )}

              {formData.status === 'CONVERTED' && formData.convertedToOrderId && (
                <Button type="button" variant="outline" onClick={() => navigate(`/sales/orders/${formData.convertedToOrderId}`)} leftIcon={<FileText className="w-4 h-4" />} className="whitespace-nowrap bg-white/10 text-white border-white/20 hover:bg-white/20">
                  View Order
                </Button>
              )}

              {formData.status === 'CONVERTED' && hasPermission('EDIT_QUOTATIONS') && (
                <Button type="button" onClick={handleGenerateProForma} isLoading={loading} className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg transition-all whitespace-nowrap border-0" leftIcon={<FileText className="w-4 h-4" />}>
                  Generate Pro-Forma
                </Button>
              )}

              {formData.status === 'ACCEPTED' && hasPermission('EDIT_QUOTATIONS') && (
                <Button type="button" onClick={handleConvert} isLoading={loading} className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg transition-all whitespace-nowrap border-0" leftIcon={<RefreshCw className="w-4 h-4" />}>
                  Convert to Order
                </Button>
              )}

              {isEditing && ['DRAFT', 'SENT', 'VIEWED'].includes(formData.status) && hasPermission('APPROVE_QUOTATION') && (
                <Button type="button" onClick={() => handleStatusUpdate('ACCEPTED')} isLoading={loading} className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg whitespace-nowrap border-0" leftIcon={<CheckCircle2 className="w-4 h-4" />}>
                  Accept
                </Button>
              )}

              {!isReadOnly && (
                <Button type="submit" onClick={handleSubmit} isLoading={loading} leftIcon={<Save className="w-4 h-4" />} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg whitespace-nowrap border-0">
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="pt-2">
          <div className="space-y-8 relative">
            <div className="flex gap-8 relative">
              <div className={`flex-1 min-w-0 transition-all duration-300 ${showHistoryPanel ? 'lg:pr-96' : ''}`}>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <fieldset disabled={isReadOnly} className="space-y-6">

                    {/* Core Details Section */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <FileText size={14} className="text-blue-500" /> Commercial Details
                        </h2>
                      </div>
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <div className="col-span-1 md:col-span-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Client / Customer *</label>
                            <CreatableSelect
                              isClearable
                              required
                              isDisabled={isReadOnly}
                              styles={selectStyles}
                              menuPortalTarget={document.body}
                              menuPosition="fixed"
                              components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
                              formatCreateLabel={(inputValue) => `Create new customer "${inputValue}"`}
                              value={customers.find(c => c._id === formData.customerId) ? { value: formData.customerId, label: customers.find(c => c._id === formData.customerId).name } : null}
                              options={customers.map(c => ({ value: c._id, label: c.name }))}
                              onChange={(option) => setFormData({ ...formData, customerId: option ? option.value : '' })}
                              onCreateOption={handleCreateCustomer}
                              placeholder="Search or add a customer..."
                              noOptionsMessage={() => "Type to search..."}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Issue Date *</label>
                            <input
                              type="date"
                              required
                              value={formData.quoteDate}
                              onChange={e => setFormData({ ...formData, quoteDate: e.target.value })}
                              className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors uppercase outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Valid Until *</label>
                            <input
                              type="date"
                              required
                              value={formData.validUntil}
                              onChange={e => setFormData({ ...formData, validUntil: e.target.value })}
                              className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors uppercase outline-none"
                            />
                          </div>
                          <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Assigned Branch *</label>
                            <div className="w-full md:w-1/2">
                              <Select
                                isDisabled={isReadOnly}
                                styles={selectStyles}
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                                value={branches.find(b => b._id === formData.branchId) ? { value: formData.branchId, label: branches.find(b => b._id === formData.branchId).name } : null}
                                options={branches.map(b => ({ value: b._id, label: b.name }))}
                                onChange={(option) => setFormData({ ...formData, branchId: option ? option.value : '' })}
                                placeholder="-- SELECT BRANCH --"
                                components={{ IndicatorSeparator: () => null }}
                              />
                            </div>
                          </div>
                      </div>
                    </div>

                    {/* Line Items Section */}
                    <div className="bg-white shadow-sm border border-slate-200 overflow-hidden rounded-xl">
                      <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <Zap size={16} className="text-blue-500" /> Products & Services Matrix
                        </h2>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-500 font-mono px-2 py-1 bg-white border border-slate-200 rounded">ROWS: {formData.items.length}</span>
                          {!isReadOnly && (
                            <Button type="button" onClick={addItem} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 h-8 text-[10px] uppercase font-bold tracking-widest flex items-center">
                              <Plus size={14} className="mr-1" /> Add Line
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="overflow-x-auto p-0">
                        <div className="min-w-[900px] p-6 pb-2">
                            <div className="grid grid-cols-12 gap-4 px-2 pb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b-2 border-slate-100">
                              <div className="col-span-4">Item / Description</div>
                              <div className="col-span-1">Quantity</div>
                              <div className="col-span-2">Rate</div>
                              <div className="col-span-2">Discount</div>
                              <div className="col-span-1 text-center">Tax (%)</div>
                              <div className="col-span-1 text-right">Amount</div>
                              <div className="col-span-1 text-center"></div>
                            </div>
                            
                            <div className="space-y-3 mt-3">
                              {formData.items.map((item, index) => (
                                <div key={index} className="grid grid-cols-12 gap-4 items-center bg-slate-50 p-2 rounded-lg border border-slate-200 group">
                                  <div className="col-span-4">
                                    <CreatableSelect
                                      isClearable
                                      required
                                      isDisabled={isReadOnly}
                                      styles={selectStylesSmall}
                                      menuPortalTarget={document.body}
                                      menuPosition="fixed"
                                      components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
                                      formatCreateLabel={(inputValue) => `Quick add "${inputValue}"`}
                                      value={products.find(p => p._id === item.productId) ? { value: item.productId, label: `${products.find(p => p._id === item.productId).name} - ${products.find(p => p._id === item.productId).sku}` } : null}
                                      options={products.map(p => ({ value: p._id, label: `${p.name} - ${p.sku}` }))}
                                      onChange={(option) => handleItemChange(index, 'productId', option ? option.value : '')}
                                      onCreateOption={(val) => handleCreateProduct(val, index)}
                                      placeholder="Search..."
                                      noOptionsMessage={() => "Type to search or create..."}
                                    />
                                  </div>
                                  <div className="col-span-1">
                                    <input
                                      type="number"
                                      min="1"
                                      required
                                      value={item.quantity}
                                      onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                      className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm outline-none focus:border-blue-600 focus:ring-0 transition-colors"
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">{currencySymbol}</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        required
                                        value={item.unitPrice}
                                        onChange={e => handleItemChange(index, 'unitPrice', e.target.value)}
                                        className="flex h-10 w-full pl-12 pr-3 rounded-md border-2 border-slate-200 bg-white py-2 text-sm font-bold text-slate-900 shadow-sm outline-none focus:border-blue-600 focus:ring-0 transition-colors"
                                      />
                                    </div>
                                  </div>
                                  <div className="col-span-2">
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">{currencySymbol}</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.discount}
                                        onChange={e => handleItemChange(index, 'discount', e.target.value)}
                                        className="flex h-10 w-full pl-12 pr-3 rounded-md border-2 border-slate-200 bg-white py-2 text-sm font-bold text-slate-900 shadow-sm outline-none focus:border-blue-600 focus:ring-0 transition-colors"
                                      />
                                    </div>
                                  </div>
                                  <div className="col-span-1">
                                    <div className="relative">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.taxRate}
                                        onChange={e => handleItemChange(index, 'taxRate', e.target.value)}
                                        className="flex h-10 w-full px-2 pr-6 rounded-md border-2 border-slate-200 bg-white py-2 text-sm font-bold text-slate-900 shadow-sm text-right outline-none focus:border-blue-600 focus:ring-0 transition-colors"
                                      />
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">%</span>
                                    </div>
                                  </div>
                                  <div className="col-span-1 text-right font-black text-slate-800 text-base">
                                    {currencySymbol}{(Number(item.lineTotal) || 0).toFixed(2)}
                                  </div>
                                  <div className="col-span-1 text-center">
                                    {!isReadOnly && (
                                      <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                      >
                                        <Trash2 className="h-5 w-5 mx-auto" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          {formData.items.length === 0 && (
                            <div className="py-12 flex flex-col items-center justify-center text-center">
                              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                                <Plus className="h-8 w-8 text-slate-300" />
                              </div>
                              <h4 className="text-sm font-medium text-slate-900">No items added</h4>
                              <p className="text-sm text-slate-500 mt-1">Add products or services to this quotation.</p>
                              {!isReadOnly && (
                                <Button type="button" variant="outline" size="sm" onClick={addItem} className="mt-4 rounded-full">
                                  Add First Item
                                </Button>
                              )}
                            </div>
                          )}
                      </div>
                    </div>

                    {/* Totals & Notes Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      <div className="col-span-1 lg:col-span-7">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                              <FileText size={14} className="text-blue-500" /> Terms & Conditions
                            </h2>
                          </div>
                          <div className="p-6 space-y-5">
                          <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Public Notes (Visible on PDF)</label>
                              <textarea
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Thank you for your business..."
                                className="w-full px-3 py-2 rounded-md border-2 border-slate-200 bg-slate-50 focus:border-blue-600 focus:ring-0 hover:border-blue-400 text-sm font-bold text-slate-900 shadow-sm h-28 resize-none transition-all outline-none"
                              />
                          </div>
                          <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Terms and Conditions</label>
                              <textarea
                                value={formData.termsAndConditions}
                                onChange={e => setFormData({ ...formData, termsAndConditions: e.target.value })}
                                placeholder="1. Validity of quote is 30 days..."
                                className="w-full px-3 py-2 rounded-md border-2 border-slate-200 bg-slate-50 focus:border-blue-600 focus:ring-0 hover:border-blue-400 text-sm font-bold text-slate-900 shadow-sm h-28 resize-none transition-all outline-none"
                              />
                          </div>
                          <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1 flex items-center gap-2">
                                Internal Notes
                                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Private</span>
                              </label>
                              <textarea
                                value={formData.internalNotes}
                                onChange={e => setFormData({ ...formData, internalNotes: e.target.value })}
                                placeholder="Internal pricing logic..."
                                className="w-full px-3 py-2 rounded-md border-2 border-amber-200 bg-amber-50/50 focus:border-amber-600 focus:ring-0 hover:border-amber-400 text-sm font-bold text-amber-900 shadow-sm h-20 resize-none transition-all outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-1 lg:col-span-5">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
                          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                              <Zap size={14} className="text-blue-500" /> Calculation
                            </h2>
                          </div>
                          
                          {/* Decorative element */}
                          <div className="absolute top-10 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-60"></div>
                          
                          <div className="p-6 space-y-4 relative z-10">
                            <div className="flex justify-between items-center pb-4 border-b border-slate-200/60">
                              <span className="text-slate-500 font-medium">Subtotal</span>
                              <span className="font-semibold text-slate-800 text-lg">
                                {currencySymbol}{formData.items.reduce((sum, i) => sum + ((Number(i.quantity) || 0) * (Number(i.unitPrice) || 0)), 0).toFixed(2)}
                              </span>
                            </div>

                            {formData.items.reduce((sum, i) => sum + (Number(i.discount) || 0), 0) > 0 && (
                              <div className="flex justify-between items-center pb-4 border-b border-slate-200/60">
                                <span className="text-slate-500 font-medium">Discount</span>
                                <span className="font-semibold text-emerald-600 text-lg">
                                  -{currencySymbol}{formData.items.reduce((sum, i) => sum + (Number(i.discount) || 0), 0).toFixed(2)}
                                </span>
                              </div>
                            )}

                            <div className="flex justify-between items-center pb-4 border-b border-slate-200/60">
                              <span className="text-slate-500 font-medium">Tax Applied</span>
                              <span className="font-semibold text-slate-800 text-lg">
                                {currencySymbol}{formData.items.reduce((sum, i) => sum + (Number(i.taxAmount) || 0), 0).toFixed(2)}
                              </span>
                            </div>

                            <div className="py-2 space-y-4">
                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Shipping Charges</label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{currencySymbol}</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.shippingCharges}
                                    onChange={e => setFormData({ ...formData, shippingCharges: e.target.value })}
                                    className="flex h-10 w-full pl-10 rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors uppercase outline-none"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Other Charges</label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{currencySymbol}</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.otherCharges}
                                    onChange={e => setFormData({ ...formData, otherCharges: e.target.value })}
                                    className="flex h-10 w-full pl-10 rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors uppercase outline-none"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col pt-6 mt-2 border-t border-slate-200">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Amount</span>
                              <span className="text-2xl font-black text-slate-900 tracking-tight">
                                {currencySymbol}{calculateGrandTotal().toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </fieldset>
                </form>
              </div>

              {/* Slide-over History Panel */}
              {isEditing && showHistoryPanel && (
                <div className="absolute right-0 top-0 bottom-0 w-full lg:w-96 bg-white border-l border-slate-200 shadow-2xl rounded-l-2xl z-20 transition-transform duration-300 transform translate-x-0">
                  <div className="p-6 sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto hide-scrollbar">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2 text-slate-800">
                        <History className="h-5 w-5" />
                        <h3 className="text-lg font-bold">Revision History</h3>
                      </div>
                      <button onClick={() => setShowHistoryPanel(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    {revisions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Info className="h-10 w-10 text-slate-300 mb-3" />
                        <p className="text-sm font-medium text-slate-600">No revisions yet.</p>
                        <p className="text-xs text-slate-400 mt-1">This is the first version of the quote.</p>
                      </div>
                    ) : (
                      <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                        {revisions.map((rev, idx) => (
                          <div key={rev._id} className="relative flex items-center gap-4 group is-active">
                            {/* Timeline marker */}
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shrink-0 shadow-sm z-10 ${rev.isCurrentRevision ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                              <span className="text-xs font-bold">v{rev.revisionNumber}</span>
                            </div>

                            <div className={`flex-1 min-w-0 p-4 rounded-xl shadow-sm border transition-all ${rev.isCurrentRevision ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-500/20' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                  {new Date(rev.revisedAt || rev.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                                <Badge variant={rev.status === 'ACCEPTED' ? 'success' : rev.status === 'CONVERTED' ? 'purple' : 'default'} className="text-[9px] px-1.5 py-0">
                                  {rev.status}
                                </Badge>
                              </div>
                              <div className="text-lg font-bold text-slate-800 mb-2">
                                {currencySymbol}{rev.grandTotal?.toFixed(2)}
                              </div>
                              <div className="text-xs text-slate-600 mb-3 bg-white p-3 rounded-lg border border-slate-100 shadow-sm leading-relaxed space-y-1.5">
                                {getRevisionDiffSummary(rev, revisions[idx + 1], currencySymbol).map((change, i) => (
                                  <div key={i} className="flex items-start gap-1.5">
                                    <div className="mt-1.5 w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                                    <span className="flex-1">{change}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                {rev.isCurrentRevision ? (
                                  <span className="text-xs font-semibold text-blue-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Active Version</span>
                                ) : rev._id === id ? (
                                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">Currently Viewing</span>
                                ) : <div />}

                                {rev._id !== id && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigate(`/sales/quotes/edit/${rev._id}`);
                                      window.location.reload();
                                    }}
                                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors ml-auto"
                                  >
                                    View {rev.isCurrentRevision ? 'Active' : 'Revision'} &rarr;
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print View */}
      <div className="hidden print:block p-8 bg-white max-w-4xl mx-auto text-slate-900">
        <div className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 mb-2">{printTitle}</h1>
            <p className="text-slate-500 font-medium text-lg">#{formData.quoteNumber || 'Draft'}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-slate-800">{branches.find(b => b._id === formData.branchId)?.name || 'Branch'}</h2>
            <p className="text-slate-500 text-sm mt-1">
              {(() => {
                const addr = branches.find(b => b._id === formData.branchId)?.address;
                if (!addr) return '';
                if (typeof addr === 'string') return addr;
                const parts = [addr.street, addr.city, addr.state, addr.country, addr.zipCode].filter(Boolean);
                return parts.length > 0 ? parts.join(', ') : '';
              })()}
            </p>
          </div>
        </div>

        <div className="flex justify-between items-start mb-12 border-b border-slate-200 pb-8">
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Quote To</p>
            <p className="text-xl font-bold text-slate-800">{customers.find(c => c._id === formData.customerId)?.name || 'N/A'}</p>
            <p className="text-slate-600 mt-1">{customers.find(c => c._id === formData.customerId)?.email || ''}</p>
            <p className="text-slate-600">{customers.find(c => c._id === formData.customerId)?.phone || ''}</p>
          </div>
          <div className="text-right">
            <div className="mb-4">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Issue Date</p>
              <p className="font-medium text-slate-800 text-lg">{formData.quoteDate ? new Date(formData.quoteDate).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Valid Until</p>
              <p className="font-medium text-slate-800 text-lg">{formData.validUntil ? new Date(formData.validUntil).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
        </div>

        <table className="w-full mb-8 text-sm">
          <thead>
            <tr className="border-b-2 border-slate-800">
              <th className="py-3 text-left font-bold text-slate-800 uppercase tracking-wider text-xs">Item Description</th>
              <th className="py-3 text-center font-bold text-slate-800 uppercase tracking-wider text-xs">Qty</th>
              <th className="py-3 text-right font-bold text-slate-800 uppercase tracking-wider text-xs">Rate</th>
              <th className="py-3 text-right font-bold text-slate-800 uppercase tracking-wider text-xs">Discount</th>
              <th className="py-3 text-right font-bold text-slate-800 uppercase tracking-wider text-xs">Tax</th>
              <th className="py-3 text-right font-bold text-slate-800 uppercase tracking-wider text-xs">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {formData.items.map((item, idx) => {
              const prod = products.find(p => p._id === item.productId);
              return (
                <tr key={idx}>
                  <td className="py-4 text-slate-800 font-medium text-base">{prod?.name || item.productId || 'Unknown Item'}</td>
                  <td className="py-4 text-center text-slate-600 text-base">{item.quantity}</td>
                  <td className="py-4 text-right text-slate-600 text-base">{currencySymbol}{Number(item.unitPrice || 0).toFixed(2)}</td>
                  <td className="py-4 text-right text-slate-600 text-base">{currencySymbol}{Number(item.discount || 0).toFixed(2)}</td>
                  <td className="py-4 text-right text-slate-600 text-base">{item.taxRate}%</td>
                  <td className="py-4 text-right font-bold text-slate-800 text-base">{currencySymbol}{Number(item.lineTotal || 0).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex justify-end border-t border-slate-200 pt-8 mb-12">
          <div className="w-72 space-y-3">
            <div className="flex justify-between text-slate-600 text-base">
              <span>Subtotal</span>
              <span>{currencySymbol}{formData.items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0).toFixed(2)}</span>
            </div>
            {formData.items.some(i => i.discount > 0) && (
              <div className="flex justify-between text-slate-600 text-base">
                <span>Total Discount</span>
                <span>-{currencySymbol}{formData.items.reduce((sum, item) => sum + (Number(item.discount) || 0), 0).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600 text-base">
              <span>Tax Amount</span>
              <span>{currencySymbol}{formData.items.reduce((sum, item) => sum + (Number(item.taxAmount) || 0), 0).toFixed(2)}</span>
            </div>
            {Number(formData.shippingCharges) > 0 && (
              <div className="flex justify-between text-slate-600 text-base">
                <span>Shipping Charges</span>
                <span>{currencySymbol}{Number(formData.shippingCharges).toFixed(2)}</span>
              </div>
            )}
            {Number(formData.otherCharges) > 0 && (
              <div className="flex justify-between text-slate-600 text-base">
                <span>Other Charges</span>
                <span>{currencySymbol}{Number(formData.otherCharges).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold text-slate-800 pt-4 border-t-2 border-slate-800 mt-2">
              <span>Grand Total</span>
              <span>{currencySymbol}{calculateGrandTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 text-sm mt-16">
          {formData.termsAndConditions && (
            <div>
              <p className="font-bold text-slate-800 mb-3 uppercase tracking-wider text-xs">Terms & Conditions</p>
              <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{formData.termsAndConditions}</p>
            </div>
          )}
          {formData.notes && (
            <div>
              <p className="font-bold text-slate-800 mb-3 uppercase tracking-wider text-xs">Notes</p>
              <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{formData.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Revise Modal */}
      {showReviseModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <History className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Revise Quotation</h3>
              </div>
              <button onClick={() => setShowReviseModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-slate-600 text-sm leading-relaxed mb-8">
                You have made changes to the <b>Products & Services</b>.
                <br /><br />
                Would you like to save this as a new Revision <b>(v{formData.revisionNumber + 1})</b> to keep a history of the original offer, or simply update the current version?
              </p>

              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowReviseModal(false)} className="border-slate-200 hover:bg-slate-50">
                  Cancel
                </Button>
                <Button type="button" variant="outline" onClick={(e) => { setShowReviseModal(false); handleSubmit(e, true); }} className="border-slate-200 hover:bg-slate-50 text-slate-700">
                  Update Only
                </Button>
                <Button type="button" onClick={handleReviseAndSave} isLoading={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-sm">
                  Save as New Revision
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Product Quick Add Modal */}
      <QuickAddProductModal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        onSuccess={onProductCreated}
        initialName={productModalInitialName}
      />

      {/* Customer Quick Add Modal */}
      <QuickAddCustomerModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSuccess={onCustomerCreated}
        initialName={customerModalInitialName}
      />

      {emailModalOpen && id && (
        <EmailSendModal
          isOpen={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          documentType="Quotation"
          documentNumber={formData.quoteNumber}
          recipientName={customers.find(c => c._id === formData.customerId)?.name}
          defaultEmail={customers.find(c => c._id === formData.customerId)?.email}
          sendEndpoint={`/api/v1/email/quote/${id}`}
        />
      )}
    </div>
  );
};

export default QuoteForm;

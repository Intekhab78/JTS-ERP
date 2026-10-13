import React, { useState, useEffect } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, Plus, Trash2, ArrowLeft, Printer, FileText, CheckCircle2, AlertCircle, RefreshCw, Box, Zap, Server, Activity, Terminal, Mail } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { EmailSendModal } from '../../components/common/EmailSendModal';
import Select from 'react-select';

const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: '#f8fafc',
    border: '2px solid',
    borderColor: state.isFocused ? '#2563eb' : '#e2e8f0',
    boxShadow: 'none',
    minHeight: '40px',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: '700',
    color: '#0f172a',
    cursor: state.isDisabled ? 'not-allowed' : 'pointer',
    '&:hover': {
      borderColor: state.isFocused ? '#2563eb' : '#94a3b8'
    }
  }),
  option: (provided, state) => ({
    ...provided,
    fontSize: '0.875rem',
    fontWeight: '700',
    backgroundColor: state.isSelected ? '#2563eb' : state.isFocused ? '#eff6ff' : 'white',
    color: state.isSelected ? 'white' : '#0f172a',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: '#1d4ed8',
    }
  }),
  menu: (provided) => ({
    ...provided,
    borderRadius: '0.375rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    zIndex: 9999,
    border: '2px solid #e2e8f0'
  }),
  menuPortal: base => ({ ...base, zIndex: 9999 }),
  placeholder: (provided) => ({
    ...provided,
    color: '#94a3b8',
    fontWeight: '600'
  })
};

const ProFormaForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [rawPf, setRawPf] = useState(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const { formatCurrency, currencySymbol } = useCurrency();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [formData, setFormData] = useState({
    customerId: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
    sourceType: 'MANUAL',
    pfNumber: ''
  });

  useEffect(() => {
    const loadData = async () => {
      setInitialLoading(true);
      await fetchDependencies();
      if (isEditing) {
        await fetchProForma();
      }
      setInitialLoading(false);
    };
    loadData();
  }, [id]);

  const fetchDependencies = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [customersRes, productsRes] = await Promise.all([
        axios.get('/api/v1/crm/customers', { headers }),
        axios.get('/api/v1/inventory/products', { headers })
      ]);
      setCustomers(customersRes.data);
      setProducts(productsRes.data.filter(p => p.isActive !== false));
    } catch (error) {
      console.error('Failed to fetch dependencies', error);
    }
  };

  const fetchProForma = async () => {
    try {
      const res = await axios.get(`/api/v1/proforma/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const pf = res.data;
      setRawPf(pf);
      setFormData({
        customerId: pf.customerId?._id || pf.customerId,
        issueDate: pf.issueDate ? pf.issueDate.split('T')[0] : '',
        dueDate: pf.dueDate ? pf.dueDate.split('T')[0] : '',
        currency: pf.currency || 'USD',
        shippingCharges: pf.shippingCharges || 0,
        otherCharges: pf.otherCharges || 0,
        paymentTerms: pf.paymentTerms || '',
        deliveryTerms: pf.deliveryTerms || '',
        notes: pf.notes || '',
        termsAndConditions: pf.termsAndConditions || '',
        internalNotes: pf.internalNotes || '',
        items: pf.items || [],
        status: pf.status || 'DRAFT',
        sourceType: pf.sourceType || 'MANUAL',
        pfNumber: pf.pfNumber || '',
        billingType: pf.billingType || 'ADVANCE',
        paymentRequestPercentage: pf.paymentRequestPercentage || 100,
        paymentRequestAmount: pf.paymentRequestAmount || (pf.grandTotal || 0)
      });
    } catch (error) {
      console.error('Failed to fetch Pro-Forma invoice', error);
      alert('Failed to load details');
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    const item = newItems[index];

    if (field === 'productId') {
      const product = products.find(p => p._id === value);
      if (product) {
        item.productId = product._id;
        item.itemName = product.name;
        item.sku = product.sku;
        item.unitPrice = product.salesPrice || 0;
        item.taxRate = product.taxRate || 0;
        item.quantity = 1;
        item.discount = 0;
      } else {
        item.productId = '';
        item.itemName = '';
        item.sku = '';
        item.unitPrice = 0;
        item.taxRate = 0;
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
      items: [...formData.items, { productId: '', itemName: '', sku: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0, taxAmount: 0, lineTotal: 0 }]
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

  const handlePercentageChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      setFormData({ ...formData, paymentRequestPercentage: '', paymentRequestAmount: '' });
      return;
    }
    let percentage = Number(val);
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;
    
    const gt = calculateGrandTotal();
    const amount = gt > 0 ? Number((gt * (percentage / 100)).toFixed(2)) : 0;
    
    setFormData({ ...formData, paymentRequestPercentage: percentage.toString(), paymentRequestAmount: amount });
  };

  const handleAmountChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      setFormData({ ...formData, paymentRequestAmount: '', paymentRequestPercentage: '' });
      return;
    }
    let amount = Number(val);
    const gt = calculateGrandTotal();
    if (amount < 0) amount = 0;
    if (gt > 0 && amount > gt) amount = gt;
    const percentage = gt > 0 ? Number(((amount / gt) * 100).toFixed(2)) : 100;
    setFormData({ ...formData, paymentRequestAmount: amount.toString(), paymentRequestPercentage: percentage });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      if (isEditing) {
        await axios.put(`/api/v1/proforma/${id}`, formData, { headers });
      } else {
        await axios.post('/api/v1/proforma', formData, { headers });
      }
      navigate('/sales/proforma');
    } catch (error) {
      console.error('Save failed', error);
      alert(error.response?.data?.message || 'Failed to save Pro-Forma Invoice');
    } finally {
      setLoading(false);
    }
  };

  const isReadOnly = (isEditing && formData.status && formData.status !== 'DRAFT') || 
                     (isEditing && !hasPermission('EDIT_PROFORMA')) || 
                     (!isEditing && !hasPermission('CREATE_PROFORMA'));

  const activeCustomerOption = customers.find(c => c._id === formData.customerId)
    ? { value: formData.customerId, label: customers.find(c => c._id === formData.customerId).name }
    : null;
    
  const productOptions = products.map(p => ({ value: p._id, label: `${p.name} - ${p.sku}` }));

  const billingTypeOptions = [
    { value: 'ADVANCE', label: 'ADVANCE' },
    { value: 'PROGRESSIVE', label: 'PROGRESSIVE' },
    { value: 'BALANCE', label: 'BALANCE' }
  ];

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-none h-12 w-12 border-4 border-slate-200 border-t-blue-600"></div>
        <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Fetching Database...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 max-w-[1400px] mx-auto pb-10 bg-[#f8fafc] min-h-screen">
      
      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={() => navigate('/sales/proforma')} 
              className="p-2 bg-slate-800/50 border border-slate-700 rounded hover:bg-blue-600 transition-colors"
            >
              <ArrowLeft size={20} className="text-white" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                  <Terminal size={18} className="text-white" />
                </div>
                <h1 className="text-3xl font-black tracking-tight text-white uppercase">
                  {isEditing ? `PRO-FORMA EDIT: ${formData.pfNumber || ''}` : 'NEW PRO-FORMA INVOICE'}
                </h1>
                {isEditing && formData.status && (
                  <Badge variant={formData.status === 'ACCEPTED' || formData.status === 'CONVERTED' ? 'success' : 'default'} className="uppercase font-bold tracking-wider text-[10px]">
                    {formData.status}
                  </Badge>
                )}
              </div>
              <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl">
                {isEditing ? 'MODIFY SECURE INVOICE RECORD' : 'INITIALIZE NEW PRO-FORMA INVOICE PROTOCOL'}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
            {isEditing && (
              <button 
                type="button" 
                onClick={() => setIsEmailModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest rounded transition-colors shadow-sm"
              >
                <Mail size={14} /> Email Document
              </button>
            )}
            {isEditing && hasPermission('PRINT_PROFORMA') && (
              <button 
                type="button" 
                onClick={() => navigate(`/sales/proforma/print/${id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-widest rounded transition-colors border border-slate-700"
              >
                <Printer size={14} /> Print Document
              </button>
            )}
            {!isReadOnly && (
              <button 
                type="button" 
                onClick={handleSubmit} 
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-widest rounded transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Save size={14} />
                )}
                Commit Record
              </button>
            )}
            <div className="flex items-center gap-3 bg-[#111827] border border-slate-800 p-2 rounded-lg shadow-inner ml-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">System Online</span>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset disabled={isReadOnly} className="space-y-6">
          
          {/* Main Parameters Panel */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-2">
              <Server size={16} className="text-blue-500" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Initialization Parameters</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Target Customer *</label>
                <Select
                  options={customers.map(c => ({ value: c._id, label: c.name }))}
                  value={activeCustomerOption}
                  onChange={option => setFormData({ ...formData, customerId: option ? option.value : '' })}
                  styles={customSelectStyles}
                  placeholder="Select Customer..."
                  isDisabled={isReadOnly}
                  isClearable
                  menuPortalTarget={document.body}
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Issue Date *</label>
                <input
                  type="date"
                  required
                  value={formData.issueDate}
                  onChange={e => setFormData({ ...formData, issueDate: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-50 border-2 border-slate-200 rounded-md focus:border-blue-600 focus:ring-0 text-sm font-bold text-slate-900 transition-colors uppercase cursor-pointer outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Validity Deadline *</label>
                <input
                  type="date"
                  required
                  value={formData.dueDate}
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-50 border-2 border-slate-200 rounded-md focus:border-blue-600 focus:ring-0 text-sm font-bold text-slate-900 transition-colors uppercase cursor-pointer outline-none disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {/* Items Matrix */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Activity size={16} className="text-emerald-500" /> Payload Matrix
              </h2>
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-500 font-mono px-2 py-1 bg-slate-200 rounded">ROWS: {formData.items.length}</span>
                {!isReadOnly && formData.sourceType !== 'QUOTE' && (
                  <button 
                    type="button" 
                    onClick={addItem}
                    className="flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white border border-emerald-200 hover:border-emerald-500 transition-colors rounded text-xs font-bold uppercase tracking-widest"
                  >
                    <Plus size={14} /> Append Row
                  </button>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border-b-2 border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Item Designation *</th>
                    <th className="px-3 py-4 w-24 text-center">Qty</th>
                    <th className="px-3 py-4 w-32 text-right">Unit Val</th>
                    <th className="px-3 py-4 w-32 text-right">Discount</th>
                    <th className="px-3 py-4 w-24 text-center">Tax %</th>
                    <th className="px-6 py-4 w-32 text-right">Net Value</th>
                    <th className="px-4 py-4 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formData.items.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-3">
                        <Select
                          options={productOptions}
                          value={productOptions.find(p => p.value === item.productId) || null}
                          onChange={option => handleItemChange(index, 'productId', option ? option.value : '')}
                          styles={{
                            ...customSelectStyles,
                            control: (base, state) => ({ ...customSelectStyles.control(base, state), minHeight: '36px' })
                          }}
                          placeholder="Select Product..."
                          isDisabled={isReadOnly || formData.sourceType === 'QUOTE'}
                          isClearable
                          menuPortalTarget={document.body}
                        />
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="number"
                          min="1"
                          required
                          disabled={formData.sourceType === 'QUOTE'}
                          value={item.quantity}
                          onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full h-9 px-2 text-center bg-white border-2 border-slate-200 rounded focus:border-blue-600 focus:ring-0 text-sm font-mono font-bold text-slate-900 outline-none disabled:opacity-60"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          disabled={formData.sourceType === 'QUOTE'}
                          value={item.unitPrice}
                          onChange={e => handleItemChange(index, 'unitPrice', e.target.value)}
                          className="w-full h-9 px-2 text-right bg-white border-2 border-slate-200 rounded focus:border-blue-600 focus:ring-0 text-sm font-mono font-bold text-slate-900 outline-none disabled:opacity-60"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={formData.sourceType === 'QUOTE'}
                          value={item.discount}
                          onChange={e => handleItemChange(index, 'discount', e.target.value)}
                          className="w-full h-9 px-2 text-right bg-white border-2 border-slate-200 rounded focus:border-blue-600 focus:ring-0 text-sm font-mono font-bold text-rose-600 outline-none disabled:opacity-60"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={formData.sourceType === 'QUOTE'}
                          value={item.taxRate}
                          onChange={e => handleItemChange(index, 'taxRate', e.target.value)}
                          className="w-full h-9 px-2 text-center bg-white border-2 border-slate-200 rounded focus:border-blue-600 focus:ring-0 text-sm font-mono font-bold text-slate-900 outline-none disabled:opacity-60"
                        />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className="text-base font-black font-mono tracking-tighter text-slate-900">
                          {currencySymbol}{(Number(item.lineTotal) || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!isReadOnly && formData.sourceType !== 'QUOTE' && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-rose-500 rounded transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {formData.items.length === 0 && (
                <div className="py-16 text-center border-t border-slate-100">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <Box size={48} className="text-slate-200 mb-2" />
                    <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">0 Payloads Added</p>
                    <p className="text-xs text-slate-400 font-mono">Execute "Append Row" to initialize items.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Meta Data */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 space-y-5">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest border-b-2 border-slate-100 pb-3 mb-4">Metadata & Instructions</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Payment Terms</label>
                    <input
                      type="text"
                      value={formData.paymentTerms}
                      onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                      placeholder="e.g. NET 30"
                      className="w-full h-10 px-3 bg-slate-50 border-2 border-slate-200 rounded-md focus:border-blue-600 focus:ring-0 text-sm font-bold text-slate-900 transition-colors uppercase outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Delivery Terms</label>
                    <input
                      type="text"
                      value={formData.deliveryTerms}
                      onChange={e => setFormData({ ...formData, deliveryTerms: e.target.value })}
                      placeholder="e.g. FOB"
                      className="w-full h-10 px-3 bg-slate-50 border-2 border-slate-200 rounded-md focus:border-blue-600 focus:ring-0 text-sm font-bold text-slate-900 transition-colors uppercase outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Client Protocol (Notes)</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-md focus:border-blue-600 focus:ring-0 text-sm font-mono text-slate-700 min-h-[80px] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">T&C Directives</label>
                  <textarea
                    value={formData.termsAndConditions}
                    onChange={e => setFormData({ ...formData, termsAndConditions: e.target.value })}
                    className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-md focus:border-blue-600 focus:ring-0 text-sm font-mono text-slate-700 min-h-[80px] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1 block">Internal System Logs (Hidden)</label>
                  <textarea
                    value={formData.internalNotes}
                    onChange={e => setFormData({ ...formData, internalNotes: e.target.value })}
                    className="w-full p-3 bg-amber-50/30 border-2 border-amber-200 rounded-md focus:border-amber-500 focus:ring-0 text-sm font-mono text-slate-700 min-h-[80px] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest border-b-2 border-slate-100 pb-3 mb-6">Financial Matrix</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Base Value</span>
                    <span className="font-mono font-bold text-slate-800 text-base">
                      {currencySymbol}{formData.items.reduce((sum, i) => sum + ((Number(i.quantity) || 0) * (Number(i.unitPrice) || 0)), 0).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Deficit (Discount)</span>
                    <span className="font-mono font-bold text-rose-600 text-base">
                      -{currencySymbol}{formData.items.reduce((sum, i) => sum + (Number(i.discount) || 0), 0).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center pb-4 border-b-2 border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Taxation</span>
                    <span className="font-mono font-bold text-slate-800 text-base">
                      {currencySymbol}{formData.items.reduce((sum, i) => sum + (Number(i.taxAmount) || 0), 0).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="pt-2 space-y-4 pb-6 border-b-2 border-slate-100">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest w-24">Freight</span>
                      <div className="relative w-32">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.shippingCharges}
                          onChange={e => setFormData({ ...formData, shippingCharges: e.target.value })}
                          className="w-full h-9 px-2 text-right bg-slate-50 border-2 border-slate-200 rounded focus:border-blue-600 focus:ring-0 text-sm font-mono font-bold text-slate-900 outline-none"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest w-24">Misc</span>
                      <div className="relative w-32">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.otherCharges}
                          onChange={e => setFormData({ ...formData, otherCharges: e.target.value })}
                          className="w-full h-9 px-2 text-right bg-slate-50 border-2 border-slate-200 rounded focus:border-blue-600 focus:ring-0 text-sm font-mono font-bold text-slate-900 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-start bg-slate-800 p-4 rounded-lg text-white shadow-inner">
                    <div>
                      <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Gross Output</span>
                      <span className="inline-block px-1.5 py-0.5 bg-slate-700 rounded text-[10px] font-mono">{formData.currency}</span>
                    </div>
                    <span className="text-4xl font-black font-mono tracking-tighter text-white">
                      {currencySymbol}{calculateGrandTotal().toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Billing Request Module */}
                {formData.sourceType === 'QUOTE' && (
                  <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-300">
                    <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Zap size={14} /> Execution Protocol (Billing)
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Mode</label>
                        <Select
                          options={billingTypeOptions}
                          value={billingTypeOptions.find(o => o.value === formData.billingType)}
                          onChange={option => setFormData({ ...formData, billingType: option ? option.value : 'ADVANCE' })}
                          isDisabled={isReadOnly}
                          menuPortalTarget={document.body}
                          styles={{
                            ...customSelectStyles,
                            control: (base, state) => ({ ...customSelectStyles.control(base, state), minHeight: '36px' })
                          }}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Split (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={formData.paymentRequestPercentage !== undefined ? formData.paymentRequestPercentage : ''}
                            onChange={handlePercentageChange}
                            disabled={isReadOnly}
                            className="w-full h-10 px-3 bg-slate-50 border-2 border-slate-200 rounded-md focus:border-blue-600 text-sm font-mono font-bold text-slate-900 outline-none"
                          />
                        </div>
                        
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Req. Vol</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.paymentRequestAmount !== undefined ? formData.paymentRequestAmount : ''}
                            onChange={handleAmountChange}
                            disabled={isReadOnly}
                            className="w-full h-10 px-3 text-right bg-slate-50 border-2 border-slate-200 rounded-md focus:border-blue-600 text-sm font-mono font-bold text-slate-900 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
        </fieldset>
      </form>

      {isEmailModalOpen && rawPf && (
        <EmailSendModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          documentType="Pro-Forma Invoice"
          documentNumber={rawPf.pfNumber}
          recipientName={rawPf.customerId?.name || customers.find(c => c._id === formData.customerId)?.name}
          defaultEmail={rawPf.customerId?.email || customers.find(c => c._id === formData.customerId)?.email}
          sendEndpoint={`/api/v1/email/proforma/${id}`}
        />
      )}
    </div>
  );
};

export default ProFormaForm;

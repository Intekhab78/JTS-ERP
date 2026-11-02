import React, { useState, useEffect } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, Plus, Trash2, ArrowLeft, RefreshCw, Printer, Mail } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmailSendModal } from '../../components/common/EmailSendModal';

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
  const [variantsMap, setVariantsMap] = useState({});
  
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
        currency: pf.currency || 'USD',
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
        item.unitPrice = product.salesPrice || 0;
        item.taxRate = product.taxRate || 0;
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
        item.taxRate = 0;
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
        if (prod) item.unitPrice = prod.salesPrice || 0;
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

  const handlePopulateAllVariants = (productId, currentIndex) => {
    const vars = variantsMap[productId] || [];
    if (vars.length === 0) return;

    const prod = products.find(p => p._id === productId);
    const basePrice = prod?.salesPrice || 0;
    const taxRate = prod?.taxRate || 0;

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
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', variantId: '', variantSku: '', attributes: {}, itemName: '', sku: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0, taxAmount: 0, lineTotal: 0 }]
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

  const isReadOnly = (isEditing && formData.status && formData.status !== 'DRAFT') || 
                     (isEditing && !hasPermission('EDIT_TAX_INVOICE')) || 
                     (!isEditing && !hasPermission('CREATE_TAX_INVOICE'));

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/sales/tax-invoices')} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              {isEditing ? `Tax Invoice ${formData.invoiceNumber || ''}` : 'New Tax Invoice'}
            </h1>
            {isEditing && formData.status && (
              <Badge variant={formData.status === 'ACCEPTED' ? 'success' : formData.status === 'CONVERTED' ? 'success' : 'default'}>
                {formData.status}
              </Badge>
            )}
            {isEditing && (
              <Badge className="bg-slate-100 text-slate-600">
                Source: {formData.sourceType}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          {isEditing && hasPermission('VIEW_TAX_INVOICE') && (
            <>
              <Button type="button" variant="outline" onClick={() => setIsEmailModalOpen(true)} leftIcon={<Mail className="w-4 h-4" />}>
                Email
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(`/sales/tax-invoices/print/${id}`)} leftIcon={<Printer className="w-4 h-4" />}>
                Print
              </Button>
            </>
          )}
          {!isReadOnly && (
            <>
              <Button type="button" variant="outline" onClick={() => navigate('/sales/tax-invoices')} leftIcon={<X className="w-4 h-4" />}>
                Cancel
              </Button>
              <Button type="submit" onClick={handleSubmit} isLoading={loading} leftIcon={<Save className="w-4 h-4" />}>
                Save Invoice
              </Button>
            </>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset disabled={isReadOnly} className="space-y-6">
          <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Invoice Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Customer *</label>
              <select
                required
                value={formData.customerId}
                onChange={e => setFormData({ ...formData, customerId: e.target.value })}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">Select Customer</option>
                {customers.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Issue Date *</label>
              <input
                type="date"
                required
                value={formData.issueDate}
                onChange={e => setFormData({ ...formData, issueDate: e.target.value })}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Due Date *</label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Line Items</h3>
            {!isReadOnly && formData.sourceType !== 'QUOTE' && (
              <Button type="button" variant="outline" size="sm" onClick={addItem} leftIcon={<Plus className="w-4 h-4" />}>
                Add Item
              </Button>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="pb-3 pl-2">Product *</th>
                  <th className="pb-3 w-24">Qty</th>
                  <th className="pb-3 w-32">Unit Price</th>
                  <th className="pb-3 w-32">Discount</th>
                  <th className="pb-3 w-24">Tax %</th>
                  <th className="pb-3 w-32 text-right">Line Total</th>
                  <th className="pb-3 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formData.items.map((item, index) => (
                  <tr key={index}>
                    <td className="py-3 pr-2 min-w-[280px]">
                      <select
                        required
                        disabled={formData.sourceType === 'QUOTE'}
                        value={item.productId}
                        onChange={e => handleItemChange(index, 'productId', e.target.value)}
                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded text-sm disabled:opacity-60 disabled:cursor-not-allowed font-medium text-slate-800"
                      >
                        <option value="">Select Product...</option>
                        {products.map(p => (
                          <option key={p._id} value={p._id}>{p.name} - {p.sku}</option>
                        ))}
                      </select>
                      {/* Show variant badge if from quote */}
                      {formData.sourceType === 'QUOTE' && item.variantSku && (
                        <div className="mt-1 flex items-center gap-1">
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                            Variant: {item.variantSku}
                          </span>
                          {item.attributes && Object.keys(item.attributes).length > 0 && (
                            <span className="text-[10px] text-slate-500">
                              ({Object.entries(item.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')})
                            </span>
                          )}
                        </div>
                      )}
                      {/* If manual and product has variants */}
                      {formData.sourceType !== 'QUOTE' && variantsMap[item.productId]?.length > 0 && (
                        <div className="flex items-center gap-1.5 pt-1.5">
                          <div className="flex-1">
                            <select
                              value={item.variantId || ''}
                              onChange={(e) => handleItemChange(index, 'variantId', e.target.value)}
                              disabled={isReadOnly}
                              className="w-full text-xs font-semibold bg-white border border-slate-200 rounded px-2 py-1 focus:border-blue-600 focus:outline-none"
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
                              className="text-[9px] font-black uppercase text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200 transition-colors whitespace-nowrap cursor-pointer shadow-xs"
                              title="Populate rows for all variants of this product"
                            >
                              ⚡ All Variants
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-2">
                      <input
                        type="number"
                        min="1"
                        required
                        disabled={formData.sourceType === 'QUOTE'}
                        value={item.quantity}
                        onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="py-3 pr-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        disabled={formData.sourceType === 'QUOTE'}
                        value={item.unitPrice}
                        onChange={e => handleItemChange(index, 'unitPrice', e.target.value)}
                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="py-3 pr-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={formData.sourceType === 'QUOTE'}
                        value={item.discount}
                        onChange={e => handleItemChange(index, 'discount', e.target.value)}
                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="py-3 pr-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={formData.sourceType === 'QUOTE'}
                        value={item.taxRate}
                        onChange={e => handleItemChange(index, 'taxRate', e.target.value)}
                        className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="py-3 pr-2 text-right font-medium text-slate-700">
                      {currencySymbol}{(Number(item.lineTotal) || 0).toFixed(2)}
                    </td>
                    <td className="py-3 text-center">
                      {!isReadOnly && formData.sourceType !== 'QUOTE' && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {formData.items.length === 0 && (
              <div className="py-8 text-center text-slate-500 text-sm bg-slate-50 rounded-b-lg border border-t-0 border-slate-200">
                No items added yet. Click "Add Item" to begin.
              </div>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">Additional Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Terms</label>
                <input
                  type="text"
                  value={formData.paymentTerms}
                  onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                  placeholder="e.g. Net 30"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Delivery Terms</label>
                <input
                  type="text"
                  value={formData.deliveryTerms}
                  onChange={e => setFormData({ ...formData, deliveryTerms: e.target.value })}
                  placeholder="e.g. FOB"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Notes for Customer</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm h-20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Terms and Conditions</label>
              <textarea
                value={formData.termsAndConditions}
                onChange={e => setFormData({ ...formData, termsAndConditions: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm h-20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Internal Notes (Hidden)</label>
              <textarea
                value={formData.internalNotes}
                onChange={e => setFormData({ ...formData, internalNotes: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm h-20"
              />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Invoice Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-semibold text-slate-800">
                  {currencySymbol}{formData.items.reduce((sum, i) => sum + ((Number(i.quantity) || 0) * (Number(i.unitPrice) || 0)), 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <span className="text-slate-600">Discount</span>
                <span className="font-semibold text-red-600">
                  -{currencySymbol}{formData.items.reduce((sum, i) => sum + (Number(i.discount) || 0), 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <span className="text-slate-600">Tax</span>
                <span className="font-semibold text-slate-800">
                  {currencySymbol}{formData.items.reduce((sum, i) => sum + (Number(i.taxAmount) || 0), 0).toFixed(2)}
                </span>
              </div>
              
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Shipping Charges</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.shippingCharges}
                    onChange={e => setFormData({ ...formData, shippingCharges: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Other Charges</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.otherCharges}
                    onChange={e => setFormData({ ...formData, otherCharges: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <span className="text-lg font-bold text-slate-800">Grand Total</span>
                <span className="text-2xl font-black text-slate-400">
                  {currencySymbol}{calculateGrandTotal().toFixed(2)}
                </span>
              </div>



            </div>
          </Card>
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

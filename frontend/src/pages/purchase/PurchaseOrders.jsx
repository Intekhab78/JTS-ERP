import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Store, ChevronDown, Receipt, Plus, Monitor, Banknote, TrendingUp, CreditCard, ShieldCheck, CheckCircle, Search, Calendar, Filter, Check, AlertTriangle, MoreVertical, Printer, Download, ShoppingBag, BarChart2, PieChart, Truck, Trash2, Edit, FileText, Eye, XCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SearchInput } from '../../components/ui/SearchInput';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { FormField } from '../../components/common/FormField';

const POActionsMenu = ({ po, navigate, hasPermission, onEdit, onDelete, onConfirm, onCancel }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative block text-right w-full">
      <Button 
        variant="ghost" 
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 w-10 p-0 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <MoreVertical size={20} />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-xl bg-background border border-border ring-1 ring-black/5 z-20 overflow-hidden transform origin-top-right transition-all duration-200">
            <div className="py-1">
              <button
                className="flex items-center w-full px-4 py-2 text-sm text-left font-medium text-foreground hover:bg-muted/50 transition-colors"
                onClick={() => { setIsOpen(false); navigate(`/purchases/${po._id}`); }}
              >
                <Eye size={16} className="mr-2.5 text-muted-foreground" /> View Details
              </button>

              {po.status === 'DRAFT' && hasPermission('CREATE_PURCHASES') && (
                <>
                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-left font-medium text-foreground hover:bg-muted/50 transition-colors"
                    onClick={() => { setIsOpen(false); onEdit(po._id); }}
                  >
                    <Edit size={16} className="mr-2.5 text-muted-foreground" /> Edit
                  </button>
                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-left font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                    onClick={() => { setIsOpen(false); onConfirm(po._id); }}
                  >
                    <CheckCircle size={16} className="mr-2.5 text-blue-600 opacity-80" /> Confirm Order
                  </button>
                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-left font-medium text-error hover:bg-error/10 transition-colors"
                    onClick={() => { setIsOpen(false); onCancel(po._id); }}
                  >
                    <XCircle size={16} className="mr-2.5 opacity-80" /> Cancel
                  </button>
                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-left font-medium text-error hover:bg-error/10 transition-colors"
                    onClick={() => { setIsOpen(false); onDelete(po._id); }}
                  >
                    <Trash2 size={16} className="mr-2.5 opacity-80" /> Delete
                  </button>
                </>
              )}

              {(po.status === 'CONFIRMED' || po.status === 'PARTIALLY_RECEIVED') && hasPermission('CREATE_PURCHASES') && (
                <>
                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-left font-medium text-primary hover:bg-primary/5 transition-colors"
                    onClick={() => { setIsOpen(false); navigate('/purchases/grn/new'); }}
                  >
                    <Plus size={16} className="mr-2.5 opacity-80" /> Create Receipt
                  </button>
                  {po.status === 'CONFIRMED' && (
                    <button
                      className="flex items-center w-full px-4 py-2 text-sm text-left font-medium text-error hover:bg-error/10 transition-colors"
                      onClick={() => { setIsOpen(false); onCancel(po._id); }}
                    >
                      <XCircle size={16} className="mr-2.5 opacity-80" /> Cancel
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const PurchaseOrders = () => {
  const [pos, setPos] = useState([]);
  const navigate = useNavigate();
  const { currencySymbol } = useCurrency();
  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [companySettings, setCompanySettings] = useState({});
  
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');
  
  // New PO Form State
  const [supplierId, setSupplierId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [items, setItems] = useState([{ productId: '', quantity: 1, unitCost: '', uom: 'PCS' }]);

  const [editingPOId, setEditingPOId] = useState(null);

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchPOs();
    fetchSuppliers();
    fetchBranches();
    fetchProducts();
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    try {
      const res = await axios.get('/api/v1/company', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setCompanySettings(res.data?.settings || {});
    } catch (error) {
      console.error('Failed to fetch company settings', error);
    }
  };

  const fetchPOs = async () => {
    try {
      const res = await axios.get('/api/v1/purchases', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPos(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get('/api/v1/suppliers', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSuppliers(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await axios.get('/api/v1/branches', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBranches(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/v1/inventory/products', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setProducts(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditPO = async (poId) => {
    try {
      const res = await axios.get(`/api/v1/purchases/${poId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const poData = res.data;
      setSupplierId(poData.supplierId?._id || poData.supplierId);
      setBranchId(poData.branchId?._id || poData.branchId);
      setExpectedDate(poData.expectedDate ? new Date(poData.expectedDate).toISOString().split('T')[0] : '');
      if (poData.items && poData.items.length > 0) {
        setItems(poData.items.map(i => ({ productId: i.productId?._id || i.productId, quantity: i.quantity, unitCost: i.unitCost, uom: i.uom || 'PCS' })));
      } else {
        setItems([{ productId: '', quantity: 1, unitCost: '', uom: 'PCS' }]);
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
      fetchPOs();
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
      fetchPOs();
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
      fetchPOs();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to cancel PO');
    }
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        supplierId,
        branchId,
        expectedDate: expectedDate || undefined,
        items: items.filter(i => i.productId)
      };
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

      if (editingPOId) {
        await axios.put(`/api/v1/purchases/${editingPOId}`, payload, { headers });
      } else {
        await axios.post('/api/v1/purchases', payload, { headers });
      }

      closeModal();
      fetchPOs();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save PO');
    }
  };

  const closeModal = () => {
    setIsCreating(false);
    setEditingPOId(null);
    setSupplierId('');
    setBranchId('');
    setExpectedDate('');
    setItems([{ productId: '', quantity: 1, unitCost: '', uom: 'PCS' }]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItemRow = () => setItems([...items, { productId: '', quantity: 1, unitCost: '', uom: 'PCS' }]);
  const removeItemRow = (index) => setItems(items.filter((_, i) => i !== index));

  const filteredPOs = pos.filter(po => 
    po.purchaseOrderNumber?.toLowerCase().includes(search.toLowerCase()) || 
    po.supplierId?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getSupplierTradeLicenseError = () => {
    if (!companySettings.ENABLE_TRADE_LICENSE_EXPIRY_CHECK) return null;
    if (!supplierId) return null;
    
    const supplier = suppliers.find(s => s._id === supplierId);
    if (!supplier) return null;

    const expiryDate = supplier.legalDetails?.tradeLicenseExpiryDate;
    if (!expiryDate) {
      return "This supplier cannot be used for a new Purchase Order because the Trade License expiry date is missing.";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate);
    exp.setHours(0, 0, 0, 0);

    if (exp < today) {
      return `This supplier cannot be used for a new Purchase Order because the Trade License expired on ${exp.toLocaleDateString()}.`;
    }

    return null;
  };

  const tradeLicenseError = getSupplierTradeLicenseError();

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RECEIVED':
        return <Badge variant="success">RECEIVED</Badge>;
      case 'PARTIALLY_RECEIVED':
        return <Badge variant="info">PARTIALLY RECEIVED</Badge>;
      case 'CONFIRMED':
        return <Badge variant="primary">CONFIRMED</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">CANCELLED</Badge>;
      case 'DRAFT':
      default:
        return <Badge variant="secondary">DRAFT</Badge>;
    }
  };

  return (
    <div className="flex-1 w-full bg-slate-50 px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6 max-w-[1720px] mx-auto font-sans text-[14px] text-slate-900 antialiased">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-indigo-600 tracking-wider uppercase">Purchases</span>
            <span className="text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Procurement & Supplier Orders</span>
          </div>
          <h1 className="font-sans text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Purchase Orders</h1>
          <p className="text-xs sm:text-sm text-slate-500">Manage incoming stock and supplier purchases.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button className="inline-flex items-center gap-2 px-3.5 py-2 bg-white text-slate-900 hover:bg-slate-50 border border-slate-200/80 rounded-lg shadow-sm text-xs sm:text-sm font-semibold transition-all" type="button">
            <Download size={18} className="text-slate-500" />
            <span>Export POs</span>
          </button>
          <button className="inline-flex items-center gap-2 px-3.5 py-2 bg-white text-slate-900 hover:bg-slate-50 border border-slate-200/80 rounded-lg shadow-sm text-xs sm:text-sm font-semibold transition-all" type="button">
            <Printer size={18} className="text-slate-500" />
            <span className="hidden sm:inline">Print Batch</span>
            <span className="sm:hidden">Print Receipts</span>
          </button>
          <button onClick={() => setIsCreating(true)} className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 text-white hover:opacity-95 rounded-lg shadow-[0_4px_14px_0_rgba(79,70,229,0.35)] text-xs sm:text-sm font-semibold transition-all" type="button">
            <CheckCircle size={18} className="text-emerald-600" />
            <span>New PO</span>
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white ml-0.5">
              <Check size={13} />
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Active POs</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="font-sans text-2xl sm:text-3xl font-bold text-slate-900">{pos.length}</span>
                <span className="text-xs text-slate-500 font-medium">Orders</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-indigo-600 shrink-0">
              <ShoppingBag size={22} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Average PO Value</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-sans text-2xl sm:text-3xl font-bold text-slate-900">AED 0.00</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-blue-600 shrink-0">
              <BarChart2 size={22} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Status Split</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-base sm:text-lg font-bold text-slate-900">100% Draft</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-indigo-600 shrink-0">
              <PieChart size={22} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pending Deliveries</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="font-sans text-2xl sm:text-3xl font-bold text-red-600">0</span>
                <span className="text-xs font-semibold text-red-600">Pending</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600 shrink-0">
              <Truck size={22} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200/80 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2.5 sm:gap-3">
          <div className="sm:col-span-2 lg:flex-1 lg:min-w-[240px]">
            <div className="relative flex items-center">
              <Search size={18} className="absolute left-3 text-slate-400" />
              <input 
                className="w-full h-10 pl-9 pr-3 bg-slate-50 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 border-none focus:ring-2 focus:ring-indigo-600/30 focus:bg-white transition-all" 
                placeholder="Search PO Number, Supplier..." 
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="w-full overflow-x-auto custom-scroll">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-bold border-b border-slate-200">
                <th className="py-3 px-4" scope="col">PO Number</th>
                <th className="py-3 px-3" scope="col">Date & Time</th>
                <th className="py-3 px-3" scope="col">Supplier</th>
                <th className="py-3 px-3" scope="col">Destination</th>
                <th className="py-3 px-3" scope="col">Items Summary</th>
                <th className="py-3 px-3 text-right" scope="col">Total Amount</th>
                <th className="py-3 px-3 text-center" scope="col">Approval</th>
                <th className="py-3 px-4 text-right" scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredPOs.map(po => (
                <tr key={po._id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-indigo-600 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Receipt size={16} className="text-slate-400" />
                      <span>{po.purchaseOrderNumber}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">{new Date(po.createdAt).toLocaleDateString()}</span>
                      <span className="text-[11px] text-slate-500">{new Date(po.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <Store size={15} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 whitespace-nowrap">{po.supplierId?.name || 'Walk-in'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">{po.branchId?.name || 'Branch'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 max-w-xs">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900 truncate">{po.items?.length || 0} items</span>
                      <span className="text-[11px] text-slate-500 truncate">
                        {po.items?.map(i => i.productName).join(', ')}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-slate-900 text-sm">AED {po.totalAmount?.toFixed(2)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    {getStatusBadge(po.status)}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <POActionsMenu 
                      po={po} 
                      navigate={navigate} 
                      hasPermission={hasPermission} 
                      onEdit={handleEditPO}
                      onDelete={handleDeletePO}
                      onConfirm={handleConfirmPO}
                      onCancel={handleCancelPO}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isCreating}
        onClose={closeModal}
        title={editingPOId ? "Edit Purchase Order (Draft)" : "Create Purchase Order"}
        size="xl"
      >
        <form onSubmit={handleCreatePO} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Supplier">
              <Select 
                required 
                value={supplierId} 
                onChange={e => setSupplierId(e.target.value)}
              >
                <option value="">Select Supplier</option>
                {suppliers
                  .filter(s => s.status === 'ACTIVE' || s._id === supplierId)
                  .map(s => <option key={s._id} value={s._id}>{s.name} {s.status === 'INACTIVE' ? '(Inactive)' : ''}</option>)}
              </Select>
            </FormField>
            
            {tradeLicenseError && (
              <div className="md:col-span-3 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex gap-3 items-start">
                <AlertCircle className="shrink-0 mt-0.5 text-red-600" size={18} />
                <div>
                  <h4 className="font-bold text-sm">⚠ Trade License Expired or Missing</h4>
                  <p className="text-sm mt-1">{tradeLicenseError}</p>
                </div>
              </div>
            )}
            
            <FormField label="Deliver To Branch">
              <Select 
                required 
                value={branchId} 
                onChange={e => setBranchId(e.target.value)}
              >
                <option value="">Select Branch</option>
                {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </Select>
            </FormField>

            <FormField label="Expected Date">
              <Input 
                type="date"
                value={expectedDate}
                onChange={e => setExpectedDate(e.target.value)}
              />
            </FormField>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl border border-border">
            <h3 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wider">Order Items</h3>
            {items.map((item, index) => (
              <div key={index} className="flex flex-wrap md:flex-nowrap gap-4 mb-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <FormField label="Product">
                    <Select 
                      required 
                      value={item.productId} 
                      onChange={e => updateItem(index, 'productId', e.target.value)}
                    >
                      <option value="">Select Product</option>
                      {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </Select>
                  </FormField>
                </div>
                <div className="w-24 shrink-0">
                  <FormField label="Qty">
                    <Input 
                      type="number" 
                      min="1" 
                      required 
                      value={item.quantity} 
                      onChange={e => updateItem(index, 'quantity', Number(e.target.value))} 
                    />
                  </FormField>
                </div>
                <div className="w-24 shrink-0">
                  <FormField label="UOM">
                    <Input 
                      value={item.uom} 
                      onChange={e => updateItem(index, 'uom', e.target.value)} 
                    />
                  </FormField>
                </div>
                <div className="w-32 shrink-0">
                  <FormField label="Unit Cost">
                    <Input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      required 
                      value={item.unitCost} 
                      onChange={e => updateItem(index, 'unitCost', e.target.value === '' ? '' : Number(e.target.value))} 
                    />
                  </FormField>
                </div>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => removeItemRow(index)} 
                  className="h-10 px-3 text-error hover:bg-error/10 hover:text-error border-error/50 shrink-0"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
            <Button 
              type="button" 
              variant="outline" 
              onClick={addItemRow} 
              className="mt-2 text-blue-600 border-blue-200 hover:bg-blue-50"
              leftIcon={<Plus size={16} />}
            >
              Add Item
            </Button>
          </div>
          
          <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button type="submit" disabled={!!tradeLicenseError}>Save PO</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PurchaseOrders;

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Store, ChevronDown, Receipt, Plus, Monitor, Banknote, TrendingUp, CreditCard, ShieldCheck, CheckCircle, Search, Calendar, Filter, Check, AlertTriangle, MoreVertical, Printer, Download, ShoppingBag, BarChart2, PieChart, Truck, Trash2, Edit, FileText, Eye, XCircle, AlertCircle, Mail } from 'lucide-react';
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
import { EmailSendModal } from '../../components/common/EmailSendModal';

const POActionsMenu = ({ po, navigate, hasPermission, onEdit, onDelete, onConfirm, onCancel, onSendEmail }) => {
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

              <button
                className="flex items-center w-full px-4 py-2 text-sm text-left font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
                onClick={() => { setIsOpen(false); onSendEmail && onSendEmail(po); }}
              >
                <Mail size={16} className="mr-2.5 text-emerald-600" /> Send Email
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
  
  // New States for Loading and Pagination
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  // New PO Form State
  const [supplierId, setSupplierId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [items, setItems] = useState([{ productId: '', quantity: 1, unitCost: '', uom: 'PCS' }]);

  const [editingPOId, setEditingPOId] = useState(null);
  const [emailModal, setEmailModal] = useState({ isOpen: false, po: null });

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
    setLoading(true);
    try {
      const res = await axios.get('/api/v1/purchases', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPos(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
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

  const filteredPOs = useMemo(() => {
    return pos.filter(po => {
      const matchSearch = (po.purchaseOrderNumber?.toLowerCase() || '').includes(search.toLowerCase()) ||
                          (po.supplierId?.name?.toLowerCase() || '').includes(search.toLowerCase());
      return matchSearch;
    });
  }, [pos, search]);

  const totalPages = Math.ceil(filteredPOs.length / limit);
  const paginatedPOs = filteredPOs.slice((page - 1) * limit, page * limit);

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
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[1400px] mx-auto space-y-6 pb-10 bg-[#f8fafc] min-h-screen">
      
      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl no-print">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                <ShoppingBag size={18} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">Purchase Orders</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl">
              PROCUREMENT COMMAND • SUPPLIER STOCK REPLENISHMENT
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-3 bg-[#111827] border border-slate-800 p-2 rounded-lg shadow-inner">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">System Online</span>
            </div>
            <button 
              onClick={() => setIsCreating(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-bold text-sm tracking-wider uppercase transition-colors shadow-lg border border-blue-400 flex items-center gap-2"
            >
              <Plus size={16} strokeWidth={3} /> New PO
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg transition-all">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Active POs</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white font-mono tracking-tighter">{pos.length}</span>
                <span className="text-xs text-slate-500 font-medium">Orders</span>
              </div>
            </div>
            <div className="p-2.5 bg-slate-800/50 text-slate-300 rounded-lg group-hover:bg-slate-700 transition-colors">
              <ShoppingBag size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-slate-800"><div className="h-full bg-slate-400 w-full"></div></div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-emerald-400 transition-all">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Average PO Value</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-800 font-mono tracking-tighter">AED 0.00</span>
              </div>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <BarChart2 size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-emerald-100"><div className="h-full bg-emerald-500 w-[75%]"></div></div>
        </div>

        <div className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-amber-400 transition-all">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-1">Status Split</p>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black text-slate-800 font-mono tracking-tighter">100% Draft</span>
              </div>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <PieChart size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-amber-100"><div className="h-full bg-amber-500 w-[50%]"></div></div>
        </div>

        <div className="bg-white border border-rose-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-rose-400 transition-all bg-gradient-to-br from-white to-rose-50/30">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-rose-600 uppercase tracking-widest mb-1">Pending Deliveries</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-rose-700 font-mono tracking-tighter">0</span>
                <span className="text-xs font-semibold text-rose-600">Pending</span>
              </div>
            </div>
            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-lg group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <Truck size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-rose-100"><div className="h-full bg-rose-600 w-full"></div></div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:max-w-2xl">
          <div className="relative w-full sm:flex-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Filter Database</label>
            <div className="relative flex items-center">
              <Search size={18} className="absolute left-3 text-slate-400" />
              <input 
                className="w-full h-10 pl-9 pr-3 rounded-md border-2 border-slate-200 bg-slate-50 shadow-sm font-mono text-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-0 transition-colors uppercase" 
                placeholder="SCAN BY PO NUMBER OR SUPPLIER..." 
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-xl flex flex-col pb-4">
        <div className="w-full overflow-x-auto custom-scroll min-h-[400px]">
          <table className="w-full text-left border-collapse min-w-[850px] font-mono">
            <thead>
              <tr className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-widest border-b-2 border-slate-200">
                <th className="py-4 px-4 font-black" scope="col">PO Number</th>
                <th className="py-4 px-3 font-black" scope="col">Date & Time</th>
                <th className="py-4 px-3 font-black" scope="col">Supplier</th>
                <th className="py-4 px-3 font-black" scope="col">Destination</th>
                <th className="py-4 px-3 font-black" scope="col">Items Summary</th>
                <th className="py-4 px-3 font-black text-right" scope="col">Total Amount</th>
                <th className="py-4 px-3 font-black text-center" scope="col">Approval</th>
                <th className="py-4 px-4 font-black text-right" scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="animate-spin rounded-none h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
                      <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Fetching Database...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedPOs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <ShoppingBag size={48} className="text-slate-200 mb-2" />
                      <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">0 Records Found</p>
                      <p className="text-xs text-slate-400 font-mono">No purchase orders match current parameters.</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedPOs.map(po => (
                <tr key={po._id} className="hover:bg-slate-50 transition-colors group">
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
                      onSendEmail={(po) => setEmailModal({ isOpen: true, po })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {!loading && filteredPOs.length > 0 && (
          <div className="px-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Showing {(page - 1) * limit + 1}-{Math.min(page * limit, filteredPOs.length)} of {filteredPOs.length} items
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-50 transition-colors"
              >
                &lt;
              </button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-8 h-8 rounded text-xs font-bold transition-colors ${page === i + 1 ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-50 transition-colors"
              >
                &gt;
              </button>
            </div>
          </div>
        )}
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

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Plus, Trash2, ArrowLeft, Building, Zap, Save, Archive } from 'lucide-react';

export default function ConsignmentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    supplierId: '',
    defaultBranchId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: '',
    items: []
  });

  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLookups();
    if (isEdit) fetchConsignment();
  }, [id]);

  const fetchLookups = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [suppRes, branchRes, prodRes] = await Promise.all([
        axios.get('/api/v1/suppliers', { headers }),
        axios.get('/api/v1/branches', { headers }),
        axios.get('/api/v1/inventory/products', { headers })
      ]);
      setSuppliers(suppRes.data);
      setBranches(branchRes.data);
      setProducts(prodRes.data);
    } catch (error) {
      console.error('Failed to load lookups', error);
    }
  };

  const fetchConsignment = async () => {
    try {
      const res = await axios.get(`/api/v1/consignments/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const c = res.data.data;
      setFormData({
        supplierId: c.supplierId._id,
        defaultBranchId: c.defaultBranchId?._id || '',
        startDate: c.startDate ? new Date(c.startDate).toISOString().split('T')[0] : '',
        endDate: c.endDate ? new Date(c.endDate).toISOString().split('T')[0] : '',
        notes: c.notes || '',
        items: c.items.map(i => ({ ...i, productId: i.productId._id }))
      });
    } catch (error) {
      alert('Failed to load consignment');
      navigate('/purchases/consignments');
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', agreedQuantity: 0, unitPrice: 0 }]
    });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplierId) return alert('Supplier is required');
    if (formData.items.length === 0) return alert('At least one item is required');

    setLoading(true);
    try {
      const url = isEdit ? `/api/v1/consignments/${id}` : `/api/v1/consignments`;
      const method = isEdit ? 'put' : 'post';
      
      const res = await axios[method](url, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      navigate(`/purchases/consignments/${res.data.data._id}`);
    } catch (error) {
      alert(error.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="animate-in fade-in zoom-in-95 duration-500 max-w-[1400px] mx-auto space-y-6 pb-10 bg-[#f8fafc] min-h-screen">
      
      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => navigate('/purchases/consignments')} className="mr-2 text-slate-400 hover:text-white transition-colors">
                <ArrowLeft size={24} strokeWidth={3} />
              </button>
              <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                <Archive size={18} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">{isEdit ? 'Edit Agreement' : 'New Consignment Agreement'}</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl uppercase tracking-widest ml-14">
              ESTABLISH RULES FOR SUPPLIER-OWNED INVENTORY
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button 
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-md font-bold text-sm tracking-wider uppercase transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400 flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={16} strokeWidth={3} /> {isEdit ? 'Save Changes' : 'Create Agreement'}
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 px-2 sm:px-0">
        
        {/* Core Configuration */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Building size={14} className="text-blue-500" /> Header Information
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Supplier Identity *</label>
              <select 
                required 
                value={formData.supplierId} 
                onChange={e => setFormData({...formData, supplierId: e.target.value})} 
                className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none"
              >
                <option value="">-- SELECT SUPPLIER --</option>
                {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Default Branch</label>
              <select 
                value={formData.defaultBranchId} 
                onChange={e => setFormData({...formData, defaultBranchId: e.target.value})} 
                className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none"
              >
                <option value="">-- SELECT BRANCH --</option>
                {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Start Date *</label>
               <input 
                 type="date" 
                 required 
                 value={formData.startDate} 
                 onChange={e => setFormData({...formData, startDate: e.target.value})} 
                 className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors uppercase outline-none" 
               />
            </div>
            
            <div className="space-y-1">
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">End Date (Optional)</label>
               <input 
                 type="date" 
                 value={formData.endDate} 
                 onChange={e => setFormData({...formData, endDate: e.target.value})} 
                 className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors uppercase outline-none" 
               />
            </div>

            <div className="space-y-1 md:col-span-2">
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Notes / Terms</label>
               <textarea 
                 rows="3"
                 value={formData.notes} 
                 onChange={e => setFormData({...formData, notes: e.target.value})} 
                 className="flex w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors outline-none" 
               />
            </div>
            
          </div>
        </div>

        {/* Billable Items Matrix */}
        <div className="bg-white shadow-sm border border-slate-200 overflow-hidden rounded-xl">
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Zap size={16} className="text-blue-500" /> Agreed Items Matrix
            </h2>
            <button 
              type="button" 
              onClick={addItem} 
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-md font-bold text-[10px] tracking-widest uppercase transition-colors flex items-center gap-1"
            >
              <Plus size={14} strokeWidth={3} /> Add Product
            </button>
          </div>
          
          <div className="overflow-x-auto p-6">
            {formData.items.length === 0 ? (
               <div className="flex flex-col items-center justify-center text-slate-400 py-12">
                 <Archive size={48} className="mb-4 opacity-20" />
                 <p className="text-sm font-bold uppercase tracking-widest text-center max-w-md">No items added. Click "Add Product" to define consignment terms.</p>
               </div>
            ) : (
               <div className="space-y-4">
                 <div className="grid grid-cols-12 gap-4 px-2 pb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b-2 border-slate-100">
                   <div className="col-span-6">Product *</div>
                   <div className="col-span-2 text-right">Agreed Max Qty *</div>
                   <div className="col-span-3 text-right">Agreed Unit Price *</div>
                   <div className="col-span-1 text-center">Action</div>
                 </div>

                 {formData.items.map((item, index) => (
                   <div key={index} className="grid grid-cols-12 gap-4 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                     <div className="col-span-6">
                       <select 
                         value={item.productId} 
                         onChange={(e) => updateItem(index, 'productId', e.target.value)}
                         required
                         className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none"
                       >
                         <option value="">-- SELECT PRODUCT --</option>
                         {products.map(p => (
                           <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                         ))}
                       </select>
                     </div>
                     <div className="col-span-2">
                       <input 
                         type="number" 
                         min="0"
                         required
                         value={item.agreedQuantity} 
                         onChange={(e) => updateItem(index, 'agreedQuantity', Number(e.target.value))}
                         className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-white px-3 py-2 text-sm font-bold font-mono text-slate-900 shadow-sm focus:border-blue-600 focus:ring-0 transition-colors text-right outline-none" 
                       />
                     </div>
                     <div className="col-span-3">
                       <input 
                         type="number" 
                         min="0"
                         step="0.01"
                         required
                         value={item.unitPrice} 
                         onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                         className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-white px-3 py-2 text-sm font-bold font-mono text-slate-900 shadow-sm focus:border-blue-600 focus:ring-0 transition-colors text-right outline-none" 
                       />
                     </div>
                     <div className="col-span-1 flex justify-center">
                       <button
                         type="button"
                         onClick={() => removeItem(index)}
                         className="h-8 w-8 inline-flex items-center justify-center rounded bg-white border-2 border-slate-200 text-rose-400 hover:text-rose-600 hover:border-rose-200 transition-colors shadow-sm"
                       >
                         <Trash2 size={14} strokeWidth={3} />
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </div>
        </div>
        
      </form>
    </main>
  );
}

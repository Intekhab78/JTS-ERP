import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Save, Building, Package, Layers, X, Plus } from 'lucide-react';

const StockTransferForm = () => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    sourceBranchId: '',
    destinationBranchId: '',
    items: [{ productId: '', quantity: 1 }]
  });

  useEffect(() => {
    fetchBranches();
    fetchProducts();
  }, []);

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/branches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranches(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/inventory/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/v1/stock/transfers', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/inventory/transfers');
    } catch (error) {
      alert(error.response?.data?.message || 'Error creating transfer');
    } finally {
      setLoading(false);
    }
  };

  const addRow = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', quantity: 1 }]
    });
  };

  const removeRow = (index) => {
    if (formData.items.length === 1) return;
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 max-w-[1400px] mx-auto space-y-6 pb-10 bg-[#f8fafc] min-h-screen">
      
      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => navigate('/inventory/transfers')} className="mr-2 text-slate-400 hover:text-white transition-colors">
                <ArrowLeft size={24} strokeWidth={3} />
              </button>
              <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                <Layers size={18} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">New Stock Transfer</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl uppercase tracking-widest ml-14">
              CREATE A DRAFT TRANSFER BETWEEN BRANCHES
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/inventory/transfers')}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-md shadow-sm text-xs font-bold text-slate-300 uppercase tracking-widest hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="transferForm"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-md font-bold text-xs tracking-widest uppercase transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400 flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={16} /> {loading ? 'Saving...' : 'Create Draft'}
            </button>
          </div>
        </div>
      </div>

      <form id="transferForm" onSubmit={handleSubmit} className="px-2 sm:px-0 space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Building size={14} className="text-blue-500" /> SOURCE BRANCH
              </h2>
            </div>
            <div className="p-6">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Origin</label>
              <select 
                required
                className="flex h-12 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none uppercase"
                value={formData.sourceBranchId}
                onChange={e => setFormData({...formData, sourceBranchId: e.target.value})}
              >
                <option value="">-- SELECT SOURCE BRANCH --</option>
                {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Building size={14} className="text-rose-500" /> DESTINATION BRANCH
              </h2>
            </div>
            <div className="p-6">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Target</label>
              <select 
                required
                className="flex h-12 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-rose-400 focus:border-rose-600 focus:ring-0 transition-colors cursor-pointer outline-none uppercase"
                value={formData.destinationBranchId}
                onChange={e => setFormData({...formData, destinationBranchId: e.target.value})}
              >
                <option value="">-- SELECT DESTINATION BRANCH --</option>
                {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Package size={14} className="text-blue-500" /> TRANSFER ITEMS
            </h2>
            <button 
              type="button"
              onClick={addRow}
              className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded transition-colors flex items-center gap-1 border border-blue-200"
            >
              <Plus size={12} strokeWidth={3} /> Add Product
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            {formData.items.map((item, index) => (
              <div key={index} className="flex gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Product</label>
                  <select 
                    required
                    className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none uppercase"
                    value={item.productId}
                    onChange={e => {
                      const newItems = [...formData.items];
                      newItems[index].productId = e.target.value;
                      setFormData({...formData, items: newItems});
                    }}
                  >
                    <option value="">-- SELECT PRODUCT --</option>
                    {products.map(p => <option key={p._id} value={p._id}>{p.name} (SKU: {p.sku})</option>)}
                  </select>
                </div>
                <div className="w-32 space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Transfer Qty</label>
                  <input 
                    type="number" 
                    required min="1"
                    className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-white px-3 py-2 text-sm font-black font-mono text-slate-900 shadow-sm focus:border-blue-600 focus:ring-0 outline-none text-right"
                    value={item.quantity}
                    onChange={e => {
                      const newItems = [...formData.items];
                      newItems[index].quantity = Number(e.target.value);
                      setFormData({...formData, items: newItems});
                    }}
                  />
                </div>
                <div className="pb-1">
                  <button 
                    type="button" 
                    onClick={() => removeRow(index)}
                    disabled={formData.items.length === 1}
                    className="h-10 w-10 flex items-center justify-center bg-white border-2 border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors shadow-sm rounded-md disabled:opacity-50"
                  >
                    <X size={16} strokeWidth={3} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </form>
    </div>
  );
};

export default StockTransferForm;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Wrench, Plus, Search, Trash2, Package } from 'lucide-react';

const BOM = () => {
  const [boms, setBoms] = useState([]);
  const [products, setProducts] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');
  
  const [formData, setFormData] = useState({ 
    finishedProductId: '',
    components: [{ productId: '', quantity: 1 }]
  });

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchBOMs();
    fetchProducts();
  }, []);

  const fetchBOMs = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/manufacturing/bom', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBoms(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/inventory/products', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setProducts(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const addComponent = () => {
    setFormData({
      ...formData,
      components: [...formData.components, { productId: '', quantity: 1 }]
    });
  };

  const removeComponent = (index) => {
    const newComps = [...formData.components];
    newComps.splice(index, 1);
    setFormData({ ...formData, components: newComps });
  };

  const updateComponent = (index, field, value) => {
    const newComps = [...formData.components];
    newComps[index][field] = value;
    setFormData({ ...formData, components: newComps });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/v1/manufacturing/bom', formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setIsCreating(false);
      setFormData({ finishedProductId: '', components: [{ productId: '', quantity: 1 }] });
      fetchBOMs();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create BOM');
    }
  };

  const filteredBoms = boms.filter(b => 
    b.finishedProductId?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-[slideIn_0.3s_ease-out]">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2"><Wrench className="text-blue-600" /> Bill of Materials</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Define recipes and component lists for manufactured products.</p>
        </div>
        {!isCreating && hasPermission('CREATE_MANUFACTURING') && (
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus size={18} /> New BOM
          </button>
        )}
      </div>

      {isCreating && (
        <div className="bg-white p-8 mb-8 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Create Bill of Materials</h2>
          <form onSubmit={handleCreate}>
            <div className="mb-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
              <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-1.5 block">Finished Product (What are we building?)</label>
              <select required className="w-full md:w-1/2 bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-800 focus:outline-none focus:border-blue-500 text-sm font-bold shadow-sm" value={formData.finishedProductId} onChange={e => setFormData({...formData, finishedProductId: e.target.value})}>
                <option value="">Select a Product</option>
                {products.map(p => <option key={p._id} value={p._id}>{p.sku} - {p.name}</option>)}
              </select>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-end mb-4">
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest block">Components (Raw Materials Needed)</label>
                <button type="button" onClick={addComponent} className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">+ Add Component</button>
              </div>
              
              <div className="space-y-3">
                {formData.components.map((comp, idx) => (
                  <div key={idx} className="flex gap-4 items-center">
                    <select required className="flex-1 bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-slate-800 focus:outline-none focus:border-blue-500 text-sm font-medium" value={comp.productId} onChange={e => updateComponent(idx, 'productId', e.target.value)}>
                      <option value="">Select Raw Material</option>
                      {products.map(p => <option key={p._id} value={p._id}>{p.sku} - {p.name}</option>)}
                    </select>
                    <div className="w-48 relative">
                      <input type="number" step="0.001" min="0.001" required placeholder="Qty" className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-slate-800 focus:outline-none focus:border-blue-500 text-sm font-medium" value={comp.quantity} onChange={e => updateComponent(idx, 'quantity', e.target.value)} />
                    </div>
                    {formData.components.length > 1 && (
                      <button type="button" onClick={() => removeComponent(idx)} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200">Cancel</button>
              <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">Save Recipe</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex gap-4 bg-slate-50/50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search BOM by finished product name..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-slate-800 focus:outline-none focus:border-blue-500 text-sm font-medium shadow-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50">
          {filteredBoms.map(bom => (
            <div key={bom._id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Package size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-lg line-clamp-1">{bom.finishedProductId?.name}</h3>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">SKU: {bom.finishedProductId?.sku}</div>
                  </div>
                </div>
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-extrabold px-2 py-1 rounded uppercase tracking-wider">Active</span>
              </div>
              
              <div className="p-5">
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Required Components (For 1 Unit)</div>
                <div className="space-y-2">
                  {bom.components.map((comp, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <div className="font-medium text-slate-700 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                        {comp.productId?.name}
                      </div>
                      <div className="font-bold text-slate-900">
                        {comp.quantity} <span className="text-slate-400 font-medium text-xs">{comp.productId?.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {filteredBoms.length === 0 && !isCreating && (
            <div className="col-span-full text-center py-12">
              <p className="text-slate-500 font-bold text-lg">No Bills of Materials found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BOM;

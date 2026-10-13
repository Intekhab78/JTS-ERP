import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Wrench, Plus, Search, Trash2, Package, Server, Play, CheckCircle, Zap, XCircle } from 'lucide-react';
import { SearchInput } from '../../components/ui/SearchInput';

const BOM = () => {
  const [boms, setBoms] = useState([]);
  const [products, setProducts] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');
  
  const [formData, setFormData] = useState({ 
    finishedProductId: '',
    components: [{ productId: '', quantity: 1 }]
  });
  const [loading, setLoading] = useState(true);

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [bomRes, prodRes] = await Promise.all([
        axios.get('/api/v1/manufacturing/bom', { headers }),
        axios.get('/api/v1/inventory/products', { headers })
      ]);
      setBoms(bomRes.data);
      setProducts(prodRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBOMs = async () => {
    try {
      const res = await axios.get('/api/v1/manufacturing/bom', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBoms(res.data);
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
      await axios.post('/api/v1/manufacturing/bom', formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setIsCreating(false);
      setFormData({ finishedProductId: '', components: [{ productId: '', quantity: 1 }] });
      fetchBOMs();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create BOM');
    }
  };

  const filteredBoms = useMemo(() => {
    return boms.filter(b => 
      b.finishedProductId?.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.finishedProductId?.sku?.toLowerCase().includes(search.toLowerCase())
    );
  }, [boms, search]);

  const kpis = {
    total: boms.length,
    active: boms.length // Since we don't have isActive on BOM yet in the frontend model, default to all active
  };

  return (
    <>
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 max-w-[1720px] mx-auto pb-10 bg-[#f8fafc] min-h-screen">
      
      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                <Wrench size={18} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">Bill of Materials</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-widest ml-14">
              MANUFACTURING • RECIPES & COMPONENTS
            </p>
          </div>
          
          <div className="flex items-center gap-4">
             {!isCreating && hasPermission('CREATE_MANUFACTURING') && (
               <button 
                 onClick={() => setIsCreating(true)}
                 className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-md font-bold text-sm tracking-wider uppercase transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400 flex items-center gap-2"
               >
                 <Plus size={16} strokeWidth={3} /> New Recipe
               </button>
             )}
          </div>
        </div>
      </div>

      {/* Control Panel (Sharp & High Contrast) */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <div className="relative flex-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Search Recipes</label>
            <SearchInput 
               placeholder="SEARCH BY PRODUCT OR SKU..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="h-10 rounded-md border-2 border-slate-200 bg-slate-50 shadow-sm font-mono text-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-0 transition-colors uppercase w-full max-w-2xl"
            />
          </div>
        </div>
      </div>

      {/* Aggressive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-slate-300 transition-all">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Recipes</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{kpis.total}</h3>
            </div>
            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-slate-800 group-hover:text-white transition-colors">
              <Play size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-slate-200"><div className="h-full bg-slate-800 w-full"></div></div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-emerald-400 transition-all">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Active BOMs</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{kpis.active}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <CheckCircle size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-emerald-100"><div className="h-full bg-emerald-500 w-[100%]"></div></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-16 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-none h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
              <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Fetching BOMs...</p>
            </div>
          </div>
        ) : filteredBoms.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col items-center justify-center space-y-3">
              <Server size={48} className="text-slate-200 mb-2" />
              <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">0 Recipes Found</p>
              <p className="text-xs text-slate-400 font-mono">No bills of materials match current parameters.</p>
            </div>
          </div>
        ) : (
          filteredBoms.map(bom => (
            <div key={bom._id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md hover:border-blue-300 transition-all flex flex-col">
              <div className="p-5 border-b-2 border-slate-100 bg-[#f8fafc] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200 shadow-sm">
                    <Package size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-base line-clamp-1 uppercase tracking-tight">{bom.finishedProductId?.name}</h3>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 bg-slate-200 px-2 py-0.5 rounded inline-block">SKU: {bom.finishedProductId?.sku}</div>
                  </div>
                </div>
              </div>
              
              <div className="p-5 flex-1 bg-white">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={14} className="text-emerald-500" />
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Required Components (For 1 Unit)</div>
                </div>
                
                <div className="space-y-3">
                  {bom.components.map((comp, i) => (
                    <div key={i} className="flex justify-between items-center text-sm py-2 border-b border-slate-50 last:border-0">
                      <div className="font-bold text-slate-700 flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-none bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.6)]"></span>
                        <span className="uppercase tracking-tight text-xs">{comp.productId?.name}</span>
                      </div>
                      <div className="font-black text-slate-900 font-mono bg-slate-100 px-2 py-1 rounded shadow-sm border border-slate-200">
                        {comp.quantity} <span className="text-slate-400 font-bold text-[10px] uppercase">{comp.productId?.uom?.name || 'UNIT'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
    
    {/* Modal Popup for Creating BOM (Moved outside animated container to fix fixed positioning) */}
    {isCreating && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
           <div className="bg-[#0a0f1c] p-5 border-l-4 border-blue-500 flex justify-between items-center relative overflow-hidden shrink-0">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
             <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 relative z-10">
               <Server size={16} className="text-blue-500" />
               NEW BILL OF MATERIALS
             </h2>
             <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-white transition-colors relative z-10">
               <XCircle size={20} />
             </button>
           </div>
           
           <div className="p-6 overflow-y-auto">
             <form onSubmit={handleCreate}>
               <div className="mb-6 bg-slate-50 p-6 rounded-xl border-2 border-slate-100 shadow-sm">
                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Finished Product <span className="text-rose-500">*</span></label>
                 <select 
                   required 
                   className="flex h-12 w-full rounded-md border-2 border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none uppercase"
                   value={formData.finishedProductId} 
                   onChange={e => setFormData({...formData, finishedProductId: e.target.value})}
                 >
                   <option value="">-- SELECT PRODUCT --</option>
                   {products.map(p => <option key={p._id} value={p._id}>{p.sku} - {p.name}</option>)}
                 </select>
               </div>

               <div className="mb-6">
                 <div className="flex justify-between items-end mb-4 border-b-2 border-slate-100 pb-2">
                   <label className="text-[12px] font-black text-slate-700 uppercase tracking-widest block flex items-center gap-2"><Zap size={16} className="text-blue-500" /> Required Components</label>
                   <button 
                     type="button" 
                     onClick={addComponent} 
                     className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 uppercase tracking-widest"
                   >
                     <Plus size={14} strokeWidth={3} /> Add Component
                   </button>
                 </div>
                 
                 <div className="space-y-4">
                   {formData.components.map((comp, idx) => (
                     <div key={idx} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm group hover:border-blue-300 transition-colors">
                       <div className="w-full sm:flex-1">
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block sm:hidden">Raw Material</label>
                         <select 
                           required 
                           className="flex h-12 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none uppercase"
                           value={comp.productId} 
                           onChange={e => updateComponent(idx, 'productId', e.target.value)}
                         >
                           <option value="">-- SELECT RAW MATERIAL --</option>
                           {products.map(p => <option key={p._id} value={p._id}>{p.sku} - {p.name}</option>)}
                         </select>
                       </div>
                       <div className="w-full sm:w-48 relative">
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block sm:hidden">Quantity</label>
                         <div className="relative">
                           <input 
                             type="number" 
                             step="0.001" 
                             min="0.001" 
                             required 
                             placeholder="QTY" 
                             className="flex h-12 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 font-mono shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors outline-none placeholder:text-slate-400 uppercase"
                             value={comp.quantity} 
                             onChange={e => updateComponent(idx, 'quantity', e.target.value)} 
                           />
                           <div className="absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">QTY</span>
                           </div>
                         </div>
                       </div>
                       {formData.components.length > 1 && (
                         <button 
                           type="button" 
                           onClick={() => removeComponent(idx)} 
                           className="h-12 w-12 flex items-center justify-center shrink-0 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-colors border border-rose-200 sm:mt-0 mt-2 self-end sm:self-auto"
                           title="Remove Component"
                         >
                           <Trash2 size={16} strokeWidth={2.5} />
                         </button>
                       )}
                     </div>
                   ))}
                 </div>
               </div>

               <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                 <button type="button" onClick={() => setIsCreating(false)} className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-colors">
                   Cancel
                 </button>
                 <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-md text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400 hover:bg-blue-500 transition-colors flex items-center gap-2">
                   <CheckCircle size={16} strokeWidth={3} /> Save Recipe
                 </button>
               </div>
             </form>
           </div>
        </div>
      </div>
    )}
    </>
  );
};

export default BOM;

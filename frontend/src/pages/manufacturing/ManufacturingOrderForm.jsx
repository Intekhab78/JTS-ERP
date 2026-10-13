import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Factory, ArrowLeft, Save, Server, Settings } from 'lucide-react';

const ManufacturingOrderForm = () => {
  const navigate = useNavigate();
  const [boms, setBoms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({ 
    bomId: '',
    branchId: '',
    quantityToProduce: 1
  });

  useEffect(() => {
    fetchBOMs();
    fetchBranches();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const res = await axios.post('/api/v1/manufacturing/orders', formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      navigate(`/manufacturing/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create Manufacturing Order');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[1720px] mx-auto pb-10 bg-[#f8fafc] min-h-screen">
      
      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl mt-4 sm:mx-4 lg:mx-8">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
         <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
         
         <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
           <div className="flex items-start gap-4">
             <button onClick={() => navigate('/manufacturing')} className="p-2.5 bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 mt-1">
               <ArrowLeft size={20} className="text-slate-300" />
             </button>
             <div>
               <div className="flex items-center gap-3 mb-2">
                 <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                   <Server size={18} className="text-white" />
                 </div>
                 <h1 className="text-3xl font-black tracking-tight text-white uppercase">New Manufacturing Order</h1>
               </div>
               <p className="text-slate-400 text-sm font-medium uppercase tracking-widest max-w-xl">
                 PLAN A NEW PRODUCTION RUN
               </p>
             </div>
           </div>
         </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 mt-6 sm:mx-4 lg:mx-8">
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-sm font-bold text-rose-700 uppercase tracking-widest text-center shadow-sm">
            {error}
          </div>
        )}

        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden group hover:border-blue-300 transition-colors">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Settings size={18} className="text-blue-500" />
            <h3 className="font-black text-slate-700 tracking-widest uppercase text-xs">Primary Parameters</h3>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Bill of Materials (Recipe) <span className="text-rose-500">*</span></label>
              <select 
                required 
                className="flex h-12 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none uppercase"
                value={formData.bomId} 
                onChange={e => setFormData({...formData, bomId: e.target.value})}
              >
                <option value="">-- CHOOSE RECIPE --</option>
                {boms.map(b => <option key={b._id} value={b._id}>{b.finishedProductId?.name} (BOM)</option>)}
              </select>
            </div>
            
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Production Facility (Branch) <span className="text-rose-500">*</span></label>
              <select 
                required 
                className="flex h-12 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none uppercase"
                value={formData.branchId} 
                onChange={e => setFormData({...formData, branchId: e.target.value})}
              >
                <option value="">-- CHOOSE BRANCH --</option>
                {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Quantity to Produce <span className="text-rose-500">*</span></label>
              <div className="relative">
                <input 
                  type="number" 
                  min="1" 
                  required 
                  className="flex h-12 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-xl font-black text-slate-900 font-mono shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors outline-none placeholder:text-slate-400 uppercase"
                  value={formData.quantityToProduce} 
                  onChange={e => setFormData({...formData, quantityToProduce: Number(e.target.value)})} 
                />
                <div className="absolute top-1/2 -translate-y-1/2 right-4 pointer-events-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">UNITS</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-6">
          <button 
            type="button" 
            onClick={() => navigate('/manufacturing')} 
            className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg text-xs uppercase tracking-widest hover:bg-slate-50 shadow-sm transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg text-xs uppercase tracking-widest hover:bg-blue-500 transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400 disabled:opacity-50 disabled:shadow-none"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Creating...
              </>
            ) : (
              <>
                <Save size={16} strokeWidth={3} />
                Save as Draft
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ManufacturingOrderForm;

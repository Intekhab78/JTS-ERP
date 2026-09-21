import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Factory, ArrowLeft, Save } from 'lucide-react';

const ManufacturingOrderForm = () => {
  const navigate = useNavigate();
  const [boms, setBoms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
      const res = await axios.get('http://localhost:5000/api/v1/manufacturing/bom', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBoms(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/branches', {
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
    try {
      const res = await axios.post('http://localhost:5000/api/v1/manufacturing/orders', formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      navigate(`/manufacturing/${res.data._id}`);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create Manufacturing Order');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-[slideIn_0.3s_ease-out] max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/manufacturing')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">New Manufacturing Order</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Plan a new production run</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-6">
              <div>
                <label className="text-xs font-extrabold text-slate-600 uppercase tracking-widest mb-2 block">Bill of Materials *</label>
                <select 
                  required 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 focus:outline-none focus:border-blue-500 font-bold"
                  value={formData.bomId} 
                  onChange={e => setFormData({...formData, bomId: e.target.value})}
                >
                  <option value="">Choose Recipe...</option>
                  {boms.map(b => <option key={b._id} value={b._id}>{b.finishedProductId?.name} (BOM)</option>)}
                </select>
              </div>
              
              <div>
                <label className="text-xs font-extrabold text-slate-600 uppercase tracking-widest mb-2 block">Quantity to Produce *</label>
                <input 
                  type="number" 
                  min="1" 
                  required 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 focus:outline-none focus:border-blue-500 font-bold text-lg"
                  value={formData.quantityToProduce} 
                  onChange={e => setFormData({...formData, quantityToProduce: Number(e.target.value)})} 
                />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-xs font-extrabold text-slate-600 uppercase tracking-widest mb-2 block">Production Facility *</label>
                <select 
                  required 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 focus:outline-none focus:border-blue-500 font-bold"
                  value={formData.branchId} 
                  onChange={e => setFormData({...formData, branchId: e.target.value})}
                >
                  <option value="">Choose Branch...</option>
                  {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button 
              type="button" 
              onClick={() => navigate('/manufacturing')} 
              className="px-8 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Save size={18} />
              {isSubmitting ? 'Creating...' : 'Save as Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManufacturingOrderForm;

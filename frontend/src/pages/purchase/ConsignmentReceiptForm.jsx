import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Check, Package, Play, Zap, Save, Building } from 'lucide-react';

export default function ConsignmentReceiptForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialConsignmentId = location.state?.consignmentId || '';

  const [formData, setFormData] = useState({
    consignmentId: initialConsignmentId,
    branchId: '',
    notes: '',
    items: []
  });

  const [consignments, setConsignments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLookups();
  }, []);

  useEffect(() => {
    if (formData.consignmentId) {
      loadConsignmentItems(formData.consignmentId);
    }
  }, [formData.consignmentId]);

  const fetchLookups = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [consRes, branchRes] = await Promise.all([
        axios.get('/api/v1/consignments?limit=100', { headers }),
        axios.get('/api/v1/branches', { headers })
      ]);
      setConsignments(consRes.data.data.filter(c => c.status === 'ACTIVE'));
      setBranches(branchRes.data);
    } catch (error) {
      console.error('Failed to load lookups', error);
    }
  };

  const loadConsignmentItems = async (consignmentId) => {
    try {
      const res = await axios.get(`/api/v1/consignments/${consignmentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const c = res.data.data;
      if (c.defaultBranchId) {
        setFormData(prev => ({ ...prev, branchId: c.defaultBranchId._id }));
      }
      
      const defaultItems = c.items.map(item => ({
        productId: item.productId._id,
        productName: item.productId.name,
        sku: item.productId.sku,
        receivedQuantity: 0,
        acceptedQuantity: 0,
        rejectedQuantity: 0,
        baseQuantity: 0,
        unitPrice: item.unitPrice
      }));
      setFormData(prev => ({ ...prev, items: defaultItems }));
    } catch (error) {
      console.error('Failed to load consignment details', error);
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    if (field === 'receivedQuantity' || field === 'rejectedQuantity') {
      const rec = Number(newItems[index].receivedQuantity) || 0;
      const rej = Number(newItems[index].rejectedQuantity) || 0;
      newItems[index].acceptedQuantity = Math.max(0, rec - rej);
      newItems[index].baseQuantity = newItems[index].acceptedQuantity; // Assuming conversionFactor = 1 for now
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.consignmentId) return alert('Consignment Agreement is required');
    if (!formData.branchId) return alert('Receiving Branch is required');
    
    const validItems = formData.items.filter(i => i.receivedQuantity > 0);
    if (validItems.length === 0) return alert('At least one item must have a received quantity > 0');

    setLoading(true);
    try {
      const payload = { ...formData, items: validItems };
      const res = await axios.post(`/api/v1/consignment-receipts`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      navigate(`/purchases/consignments/receipts/${res.data.data._id}`);
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
              <button onClick={() => navigate('/purchases/consignments/receipts')} className="mr-2 text-slate-400 hover:text-white transition-colors">
                <ArrowLeft size={24} strokeWidth={3} />
              </button>
              <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                <Play size={18} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">New Consignment Receipt</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl uppercase tracking-widest ml-14">
              RECEIVE SUPPLIER-OWNED INVENTORY INTO THE WAREHOUSE
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button 
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-md font-bold text-sm tracking-wider uppercase transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400 flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={16} strokeWidth={3} /> Create Receipt
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
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Consignment Agreement *</label>
              <select 
                required 
                value={formData.consignmentId} 
                onChange={e => setFormData({...formData, consignmentId: e.target.value})} 
                className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none"
              >
                <option value="">-- SELECT AGREEMENT --</option>
                {consignments.map(c => <option key={c._id} value={c._id}>{c.consignmentNumber} - {c.supplierId?.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Receiving Branch *</label>
              <select 
                required
                value={formData.branchId} 
                onChange={e => setFormData({...formData, branchId: e.target.value})} 
                className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none"
              >
                <option value="">-- SELECT BRANCH --</option>
                {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Notes</label>
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
        {formData.items.length > 0 && (
          <div className="bg-white shadow-sm border border-slate-200 overflow-hidden rounded-xl">
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Zap size={16} className="text-blue-500" /> Receiving Items Matrix
              </h2>
            </div>
            
            <div className="overflow-x-auto p-6">
               <div className="space-y-4">
                 <div className="grid grid-cols-12 gap-4 px-2 pb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b-2 border-slate-100">
                   <div className="col-span-5">Product</div>
                   <div className="col-span-2 text-right">Received Qty</div>
                   <div className="col-span-2 text-right text-rose-500">Rejected Qty</div>
                   <div className="col-span-3 text-right text-emerald-600">Accepted Qty</div>
                 </div>

                 {formData.items.map((item, index) => (
                   <div key={index} className="grid grid-cols-12 gap-4 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                     <div className="col-span-5">
                       <div className="font-bold text-slate-900 text-sm tracking-tight">{item.productName}</div>
                       <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">SKU: {item.sku}</div>
                     </div>
                     <div className="col-span-2">
                       <input 
                         type="number" 
                         min="0"
                         value={item.receivedQuantity || ''} 
                         onChange={(e) => updateItem(index, 'receivedQuantity', Number(e.target.value))}
                         className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-white px-3 py-2 text-sm font-bold font-mono text-slate-900 shadow-sm focus:border-blue-600 focus:ring-0 transition-colors text-right outline-none" 
                       />
                     </div>
                     <div className="col-span-2">
                       <input 
                         type="number" 
                         min="0"
                         max={item.receivedQuantity}
                         value={item.rejectedQuantity || ''} 
                         onChange={(e) => updateItem(index, 'rejectedQuantity', Number(e.target.value))}
                         className="flex h-10 w-full rounded-md border-2 border-rose-200 bg-white px-3 py-2 text-sm font-bold font-mono text-rose-600 shadow-sm focus:border-rose-500 focus:ring-0 transition-colors text-right outline-none" 
                       />
                     </div>
                     <div className="col-span-3">
                       <div className="flex h-10 w-full items-center justify-end rounded-md border-2 border-emerald-100 bg-emerald-50 px-3 text-sm font-bold font-mono text-emerald-700 shadow-inner outline-none">
                         {item.acceptedQuantity}
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        )}
        
      </form>
    </main>
  );
}

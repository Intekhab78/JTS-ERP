import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, ArrowLeft, Save, FileText, Zap, Receipt } from 'lucide-react';

export default function VendorBillForm() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [pos, setPos] = useState([]);
  
  const [formData, setFormData] = useState({
    supplierId: '',
    branchId: '',
    purchaseOrderId: '',
    grnIds: [],
    billDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    items: [],
    currency: 'AED',
    subtotal: 0,
    grandTotal: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
        const [supRes, brRes, poRes] = await Promise.all([
          axios.get('/api/v1/suppliers', { headers }),
          axios.get('/api/v1/branches', { headers }),
          axios.get('/api/v1/purchases', { headers })
        ]);
        setSuppliers(supRes.data);
        setBranches(brRes.data);
        setPos(poRes.data.filter(po => po.status === 'CONFIRMED' || po.status === 'PARTIALLY_RECEIVED' || po.status === 'RECEIVED'));
      } catch (error) {
        alert('Failed to load form data');
      }
    };
    fetchData();
  }, []);

  const handlePoChange = async (poId) => {
    setFormData(prev => ({ ...prev, purchaseOrderId: poId }));
    if (!poId) return;

    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      // Fetch PO details to get the item prices
      const poRes = await axios.get(`/api/v1/purchases/${poId}`, { headers });
      const poItems = poRes.data.items || [];

      // Auto-fetch related GRNs for this PO to find billable items
      const { data: grns } = await axios.get('/api/v1/grn', { headers });
      const validGrns = grns.filter(g => g.purchaseOrderId?._id === poId && g.status === 'VALIDATED');
      
      const billableItems = [];
      let initialSubtotal = 0;

      validGrns.forEach(grn => {
        grn.items.forEach(item => {
          if (item.acceptedQuantity > 0) {
            const productId = item.productId._id || item.productId;
            // Find corresponding PO item to get the price
            const poItem = poItems.find(p => (p.productId?._id || p.productId) === productId);
            const unitPrice = poItem ? (poItem.unitCost || 0) : 0;
            const subTotal = item.acceptedQuantity * unitPrice;
            
            initialSubtotal += subTotal;

            billableItems.push({
              productId,
              description: item.itemName || 'Item',
              quantity: item.acceptedQuantity,
              uom: item.uom || 'PCS',
              unitPrice,
              taxAmount: 0,
              subTotal
            });
          }
        });
      });

      setFormData(prev => ({ 
        ...prev, 
        grnIds: validGrns.map(g => g._id),
        items: billableItems,
        subtotal: initialSubtotal,
        grandTotal: initialSubtotal
      }));
      // Optional: alert(`Loaded ${billableItems.length} billable items from GRNs`);
    } catch (error) {
      alert('Failed to load related GRNs');
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = field === 'quantity' || field === 'unitPrice' ? Number(value) : value;
    newItems[index].subTotal = newItems[index].quantity * newItems[index].unitPrice;
    
    const subtotal = newItems.reduce((sum, item) => sum + item.subTotal, 0);
    setFormData(prev => ({ ...prev, items: newItems, subtotal, grandTotal: subtotal }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      await axios.post('/api/v1/vendor-bills', formData, { headers });
      navigate('/purchases/bills');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create Vendor Bill');
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
              <button onClick={() => navigate('/purchases/bills')} className="mr-2 text-slate-400 hover:text-white transition-colors">
                <ArrowLeft size={24} strokeWidth={3} />
              </button>
              <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                <FileText size={18} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">Initialize Vendor Bill</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl uppercase tracking-widest ml-14">
              NEW FINANCIAL OBLIGATION • ACCOUNTS PAYABLE
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button 
              type="button"
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-md font-bold text-sm tracking-wider uppercase transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400 flex items-center gap-2"
            >
              <Save size={16} strokeWidth={3} /> Save Bill
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 px-2 sm:px-0">
        
        {/* Core Configuration */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Receipt size={14} className="text-blue-500" /> Bill Configuration
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Branch Target</label>
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

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Supplier Identity</label>
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
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Linked Purchase Order</label>
              <select 
                value={formData.purchaseOrderId} 
                onChange={e => handlePoChange(e.target.value)} 
                className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none"
              >
                <option value="">-- SELECT PO (OPTIONAL) --</option>
                {pos.map(p => <option key={p._id} value={p._id}>{p.purchaseOrderNumber}</option>)}
              </select>
            </div>

            <div className="space-y-1">
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Due Date Deadline</label>
               <input 
                 type="date" 
                 required 
                 value={formData.dueDate} 
                 onChange={e => setFormData({...formData, dueDate: e.target.value})} 
                 className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors uppercase outline-none" 
               />
            </div>
            
          </div>
        </div>

        {/* Billable Items Matrix */}
        <div className="bg-white shadow-sm border border-slate-200 overflow-hidden rounded-xl">
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Zap size={16} className="text-blue-500" /> Billable Line Items
            </h2>
            <span className="text-xs font-bold text-slate-500 font-mono px-2 py-1 bg-white border border-slate-200 rounded">ROWS: {formData.items.length}</span>
          </div>
          
          <div className="overflow-x-auto p-6">
            {formData.items.length === 0 ? (
               <div className="flex flex-col items-center justify-center text-slate-400 py-12">
                 <FileText size={48} className="mb-4 opacity-20" />
                 <p className="text-sm font-bold uppercase tracking-widest">Select a PO to auto-populate from validated GRNs.</p>
               </div>
            ) : (
               <div className="space-y-4">
                 <div className="grid grid-cols-12 gap-4 px-2 pb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b-2 border-slate-100">
                   <div className="col-span-5">Product Description</div>
                   <div className="col-span-2 text-right">Qty (Billed)</div>
                   <div className="col-span-2 text-right">Unit Price</div>
                   <div className="col-span-3 text-right">Subtotal</div>
                 </div>

                 {formData.items.map((item, idx) => (
                   <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                     <div className="col-span-5">
                       <input 
                         type="text" 
                         value={item.description} 
                         disabled 
                         className="flex h-10 w-full rounded-md border-2 border-transparent bg-transparent px-3 py-2 text-sm font-bold text-slate-900 outline-none" 
                       />
                     </div>
                     <div className="col-span-2">
                       <input 
                         type="number" 
                         max={item.quantity} 
                         value={item.quantity} 
                         onChange={e => handleItemChange(idx, 'quantity', e.target.value)} 
                         className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-white px-3 py-2 text-sm font-bold font-mono text-slate-900 shadow-sm focus:border-blue-600 focus:ring-0 transition-colors text-right outline-none" 
                       />
                     </div>
                     <div className="col-span-2">
                       <input 
                         type="number" 
                         value={item.unitPrice} 
                         onChange={e => handleItemChange(idx, 'unitPrice', e.target.value)} 
                         className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-white px-3 py-2 text-sm font-bold font-mono text-slate-900 shadow-sm focus:border-blue-600 focus:ring-0 transition-colors text-right outline-none" 
                       />
                     </div>
                     <div className="col-span-3 text-right pr-4">
                       <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mb-0.5">{formData.currency || 'AED'}</div>
                       <div className="font-mono font-bold text-slate-900">{item.subTotal.toFixed(2)}</div>
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </div>
          
          {formData.items.length > 0 && (
            <div className="bg-slate-900 px-6 py-5 flex justify-end items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Grand Total Computation</p>
                <div className="flex items-baseline gap-2">
                   <span className="text-xl font-bold text-blue-400">{formData.currency || 'AED'}</span>
                   <span className="text-4xl font-black tracking-tight text-white">{formData.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
      </form>
    </main>
  );
}

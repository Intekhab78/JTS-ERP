import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Plus, Trash2, ArrowLeft, Save, FileText, Settings, Zap } from 'lucide-react';

export default function RFQForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [formData, setFormData] = useState({
    supplierId: '',
    branchId: '',
    expectedDate: '',
    currency: 'AED',
    paymentTerms: '',
    notes: '',
    items: []
  });

  const [loading, setLoading] = useState(false);
  const [rfqStatus, setRfqStatus] = useState('DRAFT');

  useEffect(() => {
    fetchFormData();
    if (isEditing) fetchRFQ();
  }, [id]);

  const fetchFormData = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [supRes, brRes, prodRes] = await Promise.all([
        axios.get('/api/v1/suppliers', { headers }),
        axios.get('/api/v1/branches', { headers }),
        axios.get('/api/v1/inventory/products', { headers })
      ]);
      setSuppliers(supRes.data.data || supRes.data);
      setBranches(brRes.data);
      setProducts(prodRes.data);
    } catch (error) {
      console.error(error);
      alert('Failed to load form data');
    }
  };

  const fetchRFQ = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/v1/rfqs/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const { rfq, items } = res.data;
      setRfqStatus(rfq.status);
      
      if (rfq.status !== 'DRAFT') {
        alert('Only DRAFT RFQs can be edited. Redirecting to view mode.');
        navigate(`/purchases/rfqs/${id}`);
        return;
      }

      setFormData({
        supplierId: rfq.supplierId?._id || rfq.supplierId,
        branchId: rfq.branchId?._id || rfq.branchId,
        expectedDate: rfq.expectedDate ? new Date(rfq.expectedDate).toISOString().split('T')[0] : '',
        currency: rfq.currency || 'AED',
        paymentTerms: rfq.paymentTerms || '',
        notes: rfq.notes || '',
        items: items.map(i => ({
          productId: i.productId?._id || i.productId,
          description: i.description || '',
          quantity: i.quantity,
          uom: i.uom,
          unitCost: i.unitCost,
          subTotal: i.subTotal
        }))
      });
    } catch (error) {
      console.error(error);
      alert('Failed to fetch RFQ details');
      navigate('/purchases/rfqs');
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index, field, value) => {
    if (rfqStatus !== 'DRAFT') return;
    const newItems = [...formData.items];
    const item = newItems[index];

    if (field === 'productId') {
      const product = products.find(p => p._id === value);
      if (product) {
        item.description = product.description || product.name;
        item.uom = product.unitOfMeasure || product.uom || 'PCS';
        item.unitCost = product.costPrice || product.purchasePrice || 0;
      }
    }

    if (field === 'quantity' || field === 'unitCost') {
      item[field] = value === '' ? '' : Number(value).toString() === 'NaN' ? '' : Number(value);
    } else {
      item[field] = value;
    }

    item.subTotal = (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);

    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    if (rfqStatus !== 'DRAFT') return;
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', description: '', quantity: 1, uom: 'PCS', unitCost: 0, subTotal: 0 }]
    });
  };

  const removeItem = (index) => {
    if (rfqStatus !== 'DRAFT') return;
    const newItems = formData.items.filter((_, idx) => idx !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rfqStatus !== 'DRAFT') return;
    
    if (formData.items.length === 0) {
      return alert('Please add at least one item');
    }
    
    // Validation
    const invalidItems = formData.items.some(i => !i.productId || i.quantity <= 0 || i.unitCost < 0);
    if (invalidItems) {
      return alert('All items must have a valid product, quantity > 0, and unit cost >= 0');
    }

    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      if (isEditing) {
        await axios.put(`/api/v1/rfqs/${id}`, formData, { headers });
        alert('RFQ updated successfully');
        navigate(`/purchases/rfqs/${id}`);
      } else {
        await axios.post('/api/v1/rfqs', formData, { headers });
        navigate('/purchases/rfqs');
      }
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Failed to save RFQ');
    }
  };

  const totalAmount = formData.items.reduce((sum, item) => sum + (item.subTotal || 0), 0);

  if (loading) return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[1720px] mx-auto min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center py-40">
      <div className="animate-spin rounded-none h-12 w-12 border-4 border-slate-200 border-t-blue-600 mb-4"></div>
      <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Fetching RFQ Parameters...</p>
    </div>
  );

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[1720px] mx-auto pb-10 bg-[#f8fafc] min-h-screen">
      
      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl mt-4 sm:mx-4 lg:mx-8">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-start gap-4">
            <button onClick={() => navigate('/purchases/rfqs')} className="p-2.5 bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 mt-1">
              <ArrowLeft size={20} className="text-slate-300" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                  <FileText size={18} className="text-white" />
                </div>
                <h1 className="text-3xl font-black tracking-tight text-white uppercase">{isEditing ? 'Edit Request for Quotation' : 'New Request for Quotation'}</h1>
              </div>
              <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl">
                PROCUREMENT COMMAND • VENDOR BIDDING & SOURCING
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-[#111827] border border-slate-800 p-2.5 rounded-lg shadow-inner">
            <div className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">STATUS: {rfqStatus}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 mt-6">
        
        {/* Core Configuration Card */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden group hover:border-blue-300 transition-colors sm:mx-4 lg:mx-8">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Settings size={18} className="text-blue-500" />
            <h3 className="font-black text-slate-700 tracking-widest uppercase text-xs">Primary Parameters</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Supplier / Vendor *</label>
              <select required disabled={rfqStatus !== 'DRAFT'} value={formData.supplierId} onChange={e => setFormData({...formData, supplierId: e.target.value})} className="flex h-11 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors outline-none disabled:opacity-50">
                <option value="">-- SELECT TARGET SUPPLIER --</option>
                {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Receiving Branch *</label>
              <select required disabled={rfqStatus !== 'DRAFT'} value={formData.branchId} onChange={e => setFormData({...formData, branchId: e.target.value})} className="flex h-11 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors outline-none disabled:opacity-50">
                <option value="">-- SELECT TARGET BRANCH --</option>
                {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Expected Delivery Date</label>
              <input type="date" disabled={rfqStatus !== 'DRAFT'} value={formData.expectedDate} onChange={e => setFormData({...formData, expectedDate: e.target.value})} className="flex h-11 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors outline-none disabled:opacity-50 font-mono" />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Payment Terms</label>
              <input type="text" disabled={rfqStatus !== 'DRAFT'} placeholder="E.G. NET 30" value={formData.paymentTerms} onChange={e => setFormData({...formData, paymentTerms: e.target.value})} className="flex h-11 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors outline-none disabled:opacity-50 uppercase" />
            </div>
            
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Internal Notes & Terms</label>
              <textarea rows={3} disabled={rfqStatus !== 'DRAFT'} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="flex w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors outline-none disabled:opacity-50" placeholder="Specify any strict conditions, SLAs, or internal operational notes..."></textarea>
            </div>
          </div>
        </div>

        {/* Matrix Card */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden group hover:border-blue-300 transition-colors sm:mx-4 lg:mx-8">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-blue-500" />
              <h3 className="font-black text-slate-700 tracking-widest uppercase text-xs">Requisition Matrix</h3>
            </div>
            {rfqStatus === 'DRAFT' && (
              <button type="button" onClick={addItem} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-800 transition-colors shadow-sm">
                <Plus size={14} strokeWidth={3} /> Add Matrix Row
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border-b-2 border-slate-100">
                <tr>
                  <th className="px-6 py-4 min-w-[250px]">Product / Designation *</th>
                  <th className="px-6 py-4 min-w-[200px]">Description</th>
                  <th className="px-6 py-4 w-28">Quantity *</th>
                  <th className="px-6 py-4 w-24">UOM</th>
                  <th className="px-6 py-4 w-36">Unit Price *</th>
                  <th className="px-6 py-4 w-36">Subtotal</th>
                  <th className="px-6 py-4 w-16 text-center">CMD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {formData.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 group/row">
                    <td className="p-2 pl-4">
                      <select required disabled={rfqStatus !== 'DRAFT'} value={item.productId} onChange={e => handleItemChange(idx, 'productId', e.target.value)} className="w-full h-10 px-2 border-2 border-slate-200 bg-white rounded text-sm font-bold text-slate-800 focus:border-blue-500 outline-none disabled:opacity-50 hover:border-slate-300">
                        <option value="">-- ITEM --</option>
                        {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <input type="text" disabled={rfqStatus !== 'DRAFT'} value={item.description} onChange={e => handleItemChange(idx, 'description', e.target.value)} className="w-full h-10 px-2 border-2 border-slate-200 bg-white rounded text-sm text-slate-700 focus:border-blue-500 outline-none disabled:opacity-50 hover:border-slate-300" placeholder="Variant/Specs" />
                    </td>
                    <td className="p-2">
                      <input type="number" min="1" disabled={rfqStatus !== 'DRAFT'} required value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} className="w-full h-10 px-2 border-2 border-slate-200 bg-white rounded text-sm font-bold font-mono text-slate-800 focus:border-blue-500 outline-none disabled:opacity-50 hover:border-slate-300" />
                    </td>
                    <td className="p-2">
                      <input type="text" disabled={rfqStatus !== 'DRAFT'} value={item.uom} onChange={e => handleItemChange(idx, 'uom', e.target.value)} className="w-full h-10 px-2 border-2 border-slate-200 bg-slate-100 rounded text-xs font-bold text-slate-500 uppercase focus:border-blue-500 outline-none disabled:opacity-50" readOnly title="Unit of Measure (Auto-filled)" />
                    </td>
                    <td className="p-2 relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">{formData.currency}</span>
                      <input type="number" min="0" step="0.01" disabled={rfqStatus !== 'DRAFT'} required value={item.unitCost} onChange={e => handleItemChange(idx, 'unitCost', e.target.value)} className="w-full h-10 pl-10 pr-2 border-2 border-slate-200 bg-white rounded text-sm font-bold font-mono text-slate-800 focus:border-blue-500 outline-none disabled:opacity-50 hover:border-slate-300" />
                    </td>
                    <td className="p-2 px-6 font-bold text-slate-800 font-mono text-right bg-slate-50/50">
                      {formData.currency} {item.subTotal.toFixed(2)}
                    </td>
                    <td className="p-2 text-center">
                      {rfqStatus === 'DRAFT' && (
                        <button type="button" onClick={() => removeItem(idx)} className="text-slate-400 hover:text-white hover:bg-rose-500 p-2 rounded transition-colors" title="Remove Line">
                          <Trash2 size={16} strokeWidth={2.5} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {formData.items.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 bg-slate-50 m-2 rounded-lg">
                       <div className="flex flex-col items-center justify-center gap-2">
                         <Zap size={32} className="text-slate-300 mb-2" />
                         <p className="text-xs font-bold tracking-widest uppercase">Matrix Empty</p>
                         <p className="text-xs font-medium">Inject product rows using the Add button above.</p>
                       </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="bg-slate-800 text-white p-5 flex justify-end">
            <div className="w-full max-w-sm">
              <div className="flex justify-between items-center text-lg">
                <span className="text-xs font-black tracking-widest uppercase text-slate-400">Estimated Commitment</span>
                <span className="text-2xl font-black font-mono tracking-tighter text-emerald-400">
                  <span className="text-sm text-emerald-500 mr-1">{formData.currency}</span>
                  {totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="flex justify-end gap-3 sm:mx-4 lg:mx-8 pt-4">
          <button 
            type="button" 
            onClick={() => navigate('/purchases/rfqs')}
            className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded hover:bg-slate-100 transition-colors"
          >
            {rfqStatus === 'DRAFT' ? 'Abort' : 'Back'}
          </button>
          {rfqStatus === 'DRAFT' && (
            <button 
              type="submit" 
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-blue-500 shadow-md transition-colors disabled:opacity-50"
            >
              <Save size={16} /> {isEditing ? 'Commit Overrides' : 'Deploy RFQ'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

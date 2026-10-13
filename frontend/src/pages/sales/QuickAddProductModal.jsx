import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Loader2, Package, CheckCircle2, XCircle } from 'lucide-react';

export const QuickAddProductModal = ({ isOpen, onClose, onSuccess, initialName }) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [taxes, setTaxes] = useState([]);
  
  const [formData, setFormData] = useState({
    name: initialName || '',
    sku: '',
    barcode: '',
    type: 'STANDARD',
    brand: '',
    purchasePrice: 0,
    price: 0,
    taxRate: 0,
    uom: 'PCS',
    categoryId: '',
    isActive: true
  });

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({ 
        ...prev, 
        name: initialName || '', 
        sku: '', 
        barcode: '',
        type: 'STANDARD',
        brand: '',
        purchasePrice: 0,
        price: 0,
        taxRate: 0,
        uom: 'PCS',
        categoryId: '',
        isActive: true
      }));
      fetchCategories();
      fetchTaxes();
    }
  }, [isOpen, initialName]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/v1/inventory/categories', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setCategories(res.data);
      if (res.data.length > 0 && !formData.categoryId) {
        setFormData(prev => ({ ...prev, categoryId: res.data[0]._id }));
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchTaxes = async () => {
    try {
      const res = await axios.get('/api/v1/taxes', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setTaxes(res.data.filter(t => t.isActive));
    } catch (error) {
      console.error('Failed to fetch taxes:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.sku || !formData.categoryId) {
      alert("Please fill all required fields");
      return;
    }
    
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const res = await axios.post('/api/v1/inventory/products', formData, { headers });
      onSuccess(res.data);
      onClose();
    } catch (error) {
      console.error('Failed to create product:', error);
      alert(error.response?.data?.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputClasses = "flex h-12 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors outline-none placeholder:text-slate-400 uppercase";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        
        <div className="bg-[#0a0f1c] p-5 border-l-4 border-blue-500 flex justify-between items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
          <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 relative z-10">
            <Package size={16} className="text-blue-500" /> NEW PRODUCT
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors relative z-10"
          >
            <XCircle size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Product Name <span className="text-rose-500">*</span></label>
                  <input 
                    required
                    autoFocus
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. STEEL PIPE"
                    className={inputClasses}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">SKU (Stock Keeping Unit) <span className="text-rose-500">*</span></label>
                <input 
                  required
                  value={formData.sku}
                  onChange={e => setFormData({...formData, sku: e.target.value})}
                  placeholder="e.g. SP-001"
                  className={inputClasses + " font-mono"}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Barcode</label>
                <input 
                  value={formData.barcode}
                  onChange={e => setFormData({...formData, barcode: e.target.value})}
                  placeholder="e.g. 123456789012"
                  className={inputClasses + " font-mono"}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Item Type</label>
                <select 
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  className={inputClasses + " cursor-pointer"}
                >
                  <option value="STANDARD">PRODUCT</option>
                  <option value="SERVICE">SERVICE</option>
                  <option value="RAW_MATERIAL">RAW MATERIAL</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Brand</label>
                <input 
                  value={formData.brand}
                  onChange={e => setFormData({...formData, brand: e.target.value})}
                  placeholder="e.g. SAMSUNG"
                  className={inputClasses}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Purchase Price ($)</label>
                <input 
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.purchasePrice}
                  onChange={e => setFormData({...formData, purchasePrice: e.target.value})}
                  className={inputClasses + " font-mono"}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Sales Price ($) <span className="text-rose-500">*</span></label>
                <input 
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  className={inputClasses + " font-mono"}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Tax Rate (%)</label>
                <select 
                  value={formData.taxRate}
                  onChange={e => setFormData({...formData, taxRate: e.target.value})}
                  className={inputClasses + " cursor-pointer"}
                >
                  <option value="">0% (NO TAX)</option>
                  {taxes.map(tax => (
                    <option key={tax._id} value={tax.rate}>
                      {tax.name} ({tax.rate}%)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">UOM (Unit)</label>
                <input 
                  value={formData.uom}
                  onChange={e => setFormData({...formData, uom: e.target.value})}
                  placeholder="e.g. PCS, KG, LTR"
                  className={inputClasses}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Category <span className="text-rose-500">*</span></label>
                <select 
                  required
                  value={formData.categoryId}
                  onChange={e => setFormData({...formData, categoryId: e.target.value})}
                  className={inputClasses + " cursor-pointer"}
                >
                  <option value="">-- SELECT CATEGORY --</option>
                  {categories.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-3 pt-2">
                  <div className="relative flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      id="isActiveProduct" 
                      checked={formData.isActive}
                      onChange={e => setFormData({...formData, isActive: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </div>
                  <label htmlFor="isActiveProduct" className="text-[10px] font-bold text-slate-700 uppercase tracking-widest cursor-pointer">
                    {formData.isActive ? 'Status: Active' : 'Status: Inactive'}
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-white justify-end shrink-0">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="px-5 py-2 bg-blue-600 text-white rounded text-xs font-bold uppercase tracking-widest shadow-md hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 size={14} strokeWidth={3} /> SAVE PRODUCT</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

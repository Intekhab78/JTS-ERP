import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { X, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FormField } from '../../components/common/FormField';
import { Select } from '../../components/ui/Select';

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
      const res = await axios.get('http://localhost:5000/api/v1/inventory/categories', {
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
      const res = await axios.get('http://localhost:5000/api/v1/taxes', {
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
      const res = await axios.post('http://localhost:5000/api/v1/inventory/products', formData, { headers });
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

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xl font-bold text-slate-800">Add New Product</h3>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 rounded-full transition-colors shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <FormField label="Product Name *">
                  <Input 
                    required
                    autoFocus
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Steel Pipe"
                    className="h-[42px] rounded-xl bg-slate-50 focus:bg-white"
                  />
                </FormField>
              </div>
              
              <FormField label="SKU (Stock Keeping Unit) *">
                <Input 
                  required
                  value={formData.sku}
                  onChange={e => setFormData({...formData, sku: e.target.value})}
                  placeholder="e.g. SP-001"
                  className="h-[42px] rounded-xl bg-slate-50 focus:bg-white"
                />
              </FormField>

              <FormField label="Barcode">
                <Input 
                  value={formData.barcode}
                  onChange={e => setFormData({...formData, barcode: e.target.value})}
                  placeholder="e.g. 123456789012"
                  className="h-[42px] rounded-xl bg-slate-50 focus:bg-white"
                />
              </FormField>

              <FormField label="Item Type">
                <Select 
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  className="h-[42px] rounded-xl bg-slate-50 focus:bg-white"
                >
                  <option value="STANDARD">Product</option>
                  <option value="SERVICE">Service</option>
                  <option value="RAW_MATERIAL">Raw Material</option>
                </Select>
              </FormField>

              <FormField label="Brand">
                <Input 
                  value={formData.brand}
                  onChange={e => setFormData({...formData, brand: e.target.value})}
                  placeholder="e.g. Samsung"
                  className="h-[42px] rounded-xl bg-slate-50 focus:bg-white"
                />
              </FormField>

              <FormField label="Purchase Price ($)">
                <Input 
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.purchasePrice}
                  onChange={e => setFormData({...formData, purchasePrice: e.target.value})}
                  className="h-[42px] rounded-xl bg-slate-50 focus:bg-white"
                />
              </FormField>

              <FormField label="Sales Price ($) *">
                <Input 
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  className="h-[42px] rounded-xl bg-slate-50 focus:bg-white"
                />
              </FormField>

              <FormField label="Tax Rate (%)">
                <Select 
                  value={formData.taxRate}
                  onChange={e => setFormData({...formData, taxRate: e.target.value})}
                  className="h-[42px] rounded-xl bg-slate-50 focus:bg-white"
                >
                  <option value="">0% (No Tax)</option>
                  {taxes.map(tax => (
                    <option key={tax._id} value={tax.rate}>
                      {tax.name} ({tax.rate}%)
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="UOM (Unit)">
                <Input 
                  value={formData.uom}
                  onChange={e => setFormData({...formData, uom: e.target.value})}
                  placeholder="e.g. PCS, KG, LTR"
                  className="h-[42px] rounded-xl bg-slate-50 focus:bg-white"
                />
              </FormField>

              <FormField label="Category *">
                <Select 
                  required
                  value={formData.categoryId}
                  onChange={e => setFormData({...formData, categoryId: e.target.value})}
                  className="h-[42px] rounded-xl bg-slate-50 focus:bg-white"
                >
                  <option value="">Select Category...</option>
                  {categories.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </Select>
              </FormField>

              <div className="md:col-span-2 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      checked={formData.isActive}
                      onChange={e => setFormData({...formData, isActive: e.target.checked})}
                      className="peer sr-only"
                    />
                    <div className="w-5 h-5 border-2 border-slate-300 rounded transition-colors peer-checked:border-indigo-600 peer-checked:bg-indigo-600 group-hover:border-indigo-500"></div>
                    <svg className="absolute w-3.5 h-3.5 text-white scale-0 transition-transform peer-checked:scale-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-slate-700 select-none group-hover:text-slate-900 transition-colors">Active Product</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 justify-end shrink-0">
            <Button type="button" variant="outline" onClick={onClose} className="border-slate-200 hover:bg-slate-50 rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[120px] rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm">
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Add Product'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

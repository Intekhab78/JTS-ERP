import React, { useState } from 'react';
import { X, Save, UserPlus } from 'lucide-react';
import axios from 'axios';

const NewCustomerModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    type: 'Standard',
    taxNumber: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert("Name and Phone are required.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await axios.post('http://localhost:5000/api/v1/crm/customers', formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      onSuccess(res.data);
      onClose();
    } catch (error) {
      console.error('Failed to create customer', error);
      alert('Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-full">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Add New Customer</h2>
              <p className="text-xs text-slate-500 font-medium">Quick client account creation</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 flex items-center justify-center transition-colors">
            <X size={18} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 overflow-y-auto">
          <form id="new-customer-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer Full Name *</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Tariq Mansoor" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-slate-800 transition-all placeholder:text-slate-400"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mobile / Phone Number *</label>
              <input 
                type="text" 
                required
                placeholder="+971 50 123 4567" 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-slate-800 transition-all placeholder:text-slate-400"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer Type</label>
                <select 
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-slate-800 transition-all appearance-none bg-white"
                >
                  <option value="Standard">Standard</option>
                  <option value="VIP">VIP (5% Discount)</option>
                  <option value="Wholesale">Wholesale</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tax / TRN (Optional)</label>
                <input 
                  type="text" 
                  placeholder="10034..." 
                  value={formData.taxNumber}
                  onChange={e => setFormData({...formData, taxNumber: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-slate-800 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
              <input 
                type="email" 
                placeholder="customer@example.com" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-slate-800 transition-all placeholder:text-slate-400"
              />
            </div>
          </form>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2.5 rounded-lg text-slate-600 font-bold text-sm border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="new-customer-form"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-lg bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-70 flex items-center gap-2"
          >
            {isSubmitting ? 'Saving...' : 'Save & Select Customer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewCustomerModal;

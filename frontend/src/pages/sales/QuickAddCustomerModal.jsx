import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { X, Loader2, Users, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const QuickAddCustomerModal = ({ isOpen, onClose, onSuccess, initialName }) => {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: initialName || '',
    email: '',
    phone: '',
    customerType: 'Person',
    companyName: '',
    jobPosition: '',
    website: '',
    taxId: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: ''
    },
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({ 
        ...prev, 
        name: initialName || '', 
        email: '', 
        phone: '', 
        customerType: 'Person', 
        companyName: '',
        jobPosition: '',
        website: '',
        taxId: '',
        address: { street: '', city: '', state: '', zip: '', country: '' },
        notes: ''
      }));
    }
  }, [isOpen, initialName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      alert('Please provide at least a customer name');
      return;
    }
    
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const res = await axios.post('/api/v1/crm/customers', formData, { headers });
      onSuccess(res.data);
      onClose();
    } catch (error) {
      console.error('Failed to create customer:', error);
      alert(error.response?.data?.message || 'Failed to create customer');
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
            <Users size={16} className="text-blue-500" /> NEW CUSTOMER
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
                <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Customer Type *</label>
                  <select 
                    value={formData.customerType}
                    onChange={e => setFormData({...formData, customerType: e.target.value})}
                    className={inputClasses + " cursor-pointer"}
                  >
                    <option value="Person">INDIVIDUAL PERSON</option>
                    <option value="Company">BUSINESS / COMPANY</option>
                  </select>
                </div>
              </div>

              {formData.customerType === 'Person' ? (
                <>
                  <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Full Name *</label>
                    <input 
                      required
                      autoFocus
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. JOHN DOE"
                      className={inputClasses}
                    />
                  </div>
                  <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Company Name (Optional)</label>
                    <input 
                      value={formData.companyName}
                      onChange={e => setFormData({...formData, companyName: e.target.value})}
                      placeholder="e.g. ACME CORP"
                      className={inputClasses}
                    />
                  </div>
                  <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Job Title</label>
                    <input 
                      value={formData.jobPosition}
                      onChange={e => setFormData({...formData, jobPosition: e.target.value})}
                      placeholder="e.g. CEO"
                      className={inputClasses}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Company Name *</label>
                    <input 
                      required
                      autoFocus
                      value={formData.companyName}
                      onChange={e => setFormData({...formData, companyName: e.target.value})}
                      placeholder="e.g. ACME CORP"
                      className={inputClasses}
                    />
                  </div>
                  <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Primary Contact Name *</label>
                    <input 
                      required
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. JANE DOE"
                      className={inputClasses}
                    />
                  </div>
                  <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Tax ID</label>
                    <input 
                      value={formData.taxId}
                      onChange={e => setFormData({...formData, taxId: e.target.value})}
                      placeholder="e.g. TAX-12345"
                      className={inputClasses}
                    />
                  </div>
                  <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Website</label>
                    <input 
                      type="url"
                      value={formData.website}
                      onChange={e => setFormData({...formData, website: e.target.value})}
                      placeholder="e.g. HTTPS://EXAMPLE.COM"
                      className={inputClasses}
                    />
                  </div>
                </>
              )}
              
              <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Email Address</label>
                <input 
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="e.g. JOHN@EXAMPLE.COM"
                  className={inputClasses}
                />
              </div>
              
              <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Phone Number</label>
                <input 
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  placeholder="e.g. +1 234 567 8900"
                  className={inputClasses}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Address Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Street Address</label>
                    <input 
                      value={formData.address.street}
                      onChange={e => setFormData({...formData, address: {...formData.address, street: e.target.value}})}
                      placeholder="e.g. 123 MAIN ST"
                      className={inputClasses}
                    />
                  </div>
                </div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">City</label>
                  <input 
                    value={formData.address.city}
                    onChange={e => setFormData({...formData, address: {...formData.address, city: e.target.value}})}
                    placeholder="e.g. NEW YORK"
                    className={inputClasses}
                  />
                </div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">State / Province</label>
                  <input 
                    value={formData.address.state}
                    onChange={e => setFormData({...formData, address: {...formData.address, state: e.target.value}})}
                    placeholder="e.g. NY"
                    className={inputClasses}
                  />
                </div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Zip / Postal Code</label>
                  <input 
                    value={formData.address.zip}
                    onChange={e => setFormData({...formData, address: {...formData.address, zip: e.target.value}})}
                    placeholder="e.g. 10001"
                    className={inputClasses}
                  />
                </div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Country</label>
                  <input 
                    value={formData.address.country}
                    onChange={e => setFormData({...formData, address: {...formData.address, country: e.target.value}})}
                    placeholder="e.g. USA"
                    className={inputClasses}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Notes</label>
                <textarea 
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  placeholder="ANY ADDITIONAL NOTES OR INSTRUCTIONS..."
                  className="flex w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors outline-none min-h-[100px] resize-none"
                />
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
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 size={14} strokeWidth={3} /> SAVE CUSTOMER</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

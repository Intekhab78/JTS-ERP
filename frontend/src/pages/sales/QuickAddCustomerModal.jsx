import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { X, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FormField } from '../../components/common/FormField';
import { Select } from '../../components/ui/Select';

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
      alert("Please provide at least a customer name");
      return;
    }
    
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const res = await axios.post('http://localhost:5000/api/v1/crm/customers', formData, { headers });
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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xl font-bold text-slate-800">Add New Customer</h3>
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
                <FormField label="Customer Type">
                  <Select 
                    value={formData.customerType}
                    onChange={e => setFormData({...formData, customerType: e.target.value})}
                    className="h-[42px] rounded-xl bg-slate-50 focus:bg-white"
                  >
                    <option value="Person">Individual Person</option>
                    <option value="Company">Business / Company</option>
                  </Select>
                </FormField>
              </div>

              {formData.customerType === 'Person' ? (
                <>
                  <FormField label="Full Name *">
                    <Input 
                      required
                      autoFocus
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. John Doe"
                      className="h-[42px] rounded-xl bg-slate-50 focus:bg-white"
                    />
                  </FormField>
                  <FormField label="Company Name (Optional)">
                    <Input 
                      value={formData.companyName}
                      onChange={e => setFormData({...formData, companyName: e.target.value})}
                      placeholder="e.g. Acme Corp"
                      className="h-[42px] rounded-xl bg-slate-50 focus:bg-white"
                    />
                  </FormField>
                  <FormField label="Job Title">
                    <Input 
                      value={formData.jobPosition}
                      onChange={e => setFormData({...formData, jobPosition: e.target.value})}
                      placeholder="e.g. CEO"
                      className="h-[42px] rounded-xl bg-slate-50 focus:bg-white"
                    />
                  </FormField>
                </>
              ) : (
                <>
                  <FormField label="Company Name *">
                    <Input 
                      required
                      autoFocus
                      value={formData.companyName}
                      onChange={e => setFormData({...formData, companyName: e.target.value})}
                      placeholder="e.g. Acme Corp"
                      className="h-[42px] rounded-xl bg-slate-50 focus:bg-white"
                    />
                  </FormField>
                  <FormField label="Primary Contact Name *">
                    <Input 
                      required
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. Jane Doe"
                      className="h-[42px] rounded-xl bg-slate-50 focus:bg-white"
                    />
                  </FormField>
                  <FormField label="Tax ID">
                    <Input 
                      value={formData.taxId}
                      onChange={e => setFormData({...formData, taxId: e.target.value})}
                      placeholder="e.g. TAX-12345"
                      className="h-[42px] rounded-xl bg-slate-50 focus:bg-white"
                    />
                  </FormField>
                  <FormField label="Website">
                    <Input 
                      type="url"
                      value={formData.website}
                      onChange={e => setFormData({...formData, website: e.target.value})}
                      placeholder="e.g. https://example.com"
                      className="h-[42px] rounded-xl bg-slate-50 focus:bg-white"
                    />
                  </FormField>
                </>
              )}
              
              <FormField label="Email Address">
                <Input 
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="e.g. john@example.com"
                  className="h-[42px] rounded-xl bg-slate-50 focus:bg-white"
                />
              </FormField>
              
              <FormField label="Phone Number">
                <Input 
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  placeholder="e.g. +1 234 567 8900"
                  className="h-[42px] rounded-xl bg-slate-50 focus:bg-white"
                />
              </FormField>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-sm font-semibold text-slate-700 mb-4">Address Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <FormField label="Street Address">
                    <Input 
                      value={formData.address.street}
                      onChange={e => setFormData({...formData, address: {...formData.address, street: e.target.value}})}
                      placeholder="e.g. 123 Main St"
                      className="h-[42px] rounded-xl bg-slate-50 focus:bg-white"
                    />
                  </FormField>
                </div>
                <FormField label="City">
                  <Input 
                    value={formData.address.city}
                    onChange={e => setFormData({...formData, address: {...formData.address, city: e.target.value}})}
                    placeholder="e.g. New York"
                    className="h-[42px] rounded-xl bg-slate-50 focus:bg-white"
                  />
                </FormField>
                <FormField label="State / Province">
                  <Input 
                    value={formData.address.state}
                    onChange={e => setFormData({...formData, address: {...formData.address, state: e.target.value}})}
                    placeholder="e.g. NY"
                    className="h-[42px] rounded-xl bg-slate-50 focus:bg-white"
                  />
                </FormField>
                <FormField label="Zip / Postal Code">
                  <Input 
                    value={formData.address.zip}
                    onChange={e => setFormData({...formData, address: {...formData.address, zip: e.target.value}})}
                    placeholder="e.g. 10001"
                    className="h-[42px] rounded-xl bg-slate-50 focus:bg-white"
                  />
                </FormField>
                <FormField label="Country">
                  <Input 
                    value={formData.address.country}
                    onChange={e => setFormData({...formData, address: {...formData.address, country: e.target.value}})}
                    placeholder="e.g. USA"
                    className="h-[42px] rounded-xl bg-slate-50 focus:bg-white"
                  />
                </FormField>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <FormField label="Notes">
                <textarea 
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  placeholder="Any additional notes or instructions..."
                  className="w-full rounded-xl bg-slate-50 focus:bg-white border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 p-3 min-h-[100px] text-sm"
                />
              </FormField>
            </div>
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 justify-end shrink-0">
            <Button type="button" variant="outline" onClick={onClose} className="border-slate-200 hover:bg-slate-50 rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[120px] rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm">
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Add Customer'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, ArrowLeft, Building2, User, Camera, Tag, Users } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { FormField } from '../../components/common/FormField';

const CustomerForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('notes');
  const [tagsInput, setTagsInput] = useState('');

  const [formData, setFormData] = useState({
    customerType: 'Person',
    name: '',
    companyName: '',
    jobPosition: '',
    email: '',
    phone: '',
    taxId: '',
    website: '',
    tags: [],
    customerGroup: 'RETAIL',
    notes: '',
    address: {
      street: '',
      street2: '',
      city: '',
      state: '',
      zip: '',
      country: ''
    }
  });

  useEffect(() => {
    if (isEditing) {
      fetchCustomer();
    }
  }, [id]);

  const fetchCustomer = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/v1/crm/customers/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = res.data;
      setFormData({
        customerType: data.customerType || 'Person',
        name: data.name || '',
        companyName: data.companyName || '',
        jobPosition: data.jobPosition || '',
        email: data.email || '',
        phone: data.phone || '',
        taxId: data.taxId || '',
        website: data.website || '',
        tags: data.tags || [],
        customerGroup: data.customerGroup || 'RETAIL',
        notes: data.notes || '',
        address: data.address || {
          street: '', street2: '', city: '', state: '', zip: '', country: ''
        }
      });
      setTagsInput((data.tags || []).join(', '));
    } catch (error) {
      console.error('Failed to fetch customer', error);
      alert('Failed to load customer details');
    }
  };

  const handleAddressChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }));
  };

  const handleTagsChange = (e) => {
    setTagsInput(e.target.value);
    const tagsArray = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, tags: tagsArray }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      if (isEditing) {
        await axios.put(`http://localhost:5000/api/v1/crm/customers/${id}`, formData, { headers });
      } else {
        await axios.post('http://localhost:5000/api/v1/crm/customers', formData, { headers });
      }
      navigate('/customers');
    } catch (error) {
      console.error('Save failed', error);
      alert(error.response?.data?.message || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-12 animate-in fade-in zoom-in-95 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/customers')} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              {isEditing ? formData.name : 'New Customer'}
            </h1>
          </div>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/customers')} leftIcon={<X className="w-4 h-4" />}>
            Discard
          </Button>
          <Button type="submit" onClick={handleSubmit} isLoading={loading} leftIcon={<Save className="w-4 h-4" />}>
            Save
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="p-6">

          {/* Main Top Section */}
          <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
            {/* Avatar Placeholder */}
            <div className="w-24 h-24 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 shadow-inner relative group overflow-hidden">
              {formData.customerType === 'Company' ? (
                <Building2 className="w-10 h-10 text-slate-400 group-hover:scale-110 transition-transform" />
              ) : (
                <User className="w-10 h-10 text-slate-400 group-hover:scale-110 transition-transform" />
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="flex-1 space-y-6 w-full">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer group relative">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="radio"
                      name="customerType"
                      value="Person"
                      checked={formData.customerType === 'Person'}
                      onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                      className="absolute opacity-0 w-full h-full cursor-pointer z-10"
                    />
                    <div className={`w-4 h-4 rounded-full border transition-colors ${formData.customerType === 'Person' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}></div>
                    <div className={`absolute w-1.5 h-1.5 rounded-full bg-white transition-opacity ${formData.customerType === 'Person' ? 'opacity-100' : 'opacity-0'}`}></div>
                  </div>
                  <span className={`text-sm font-medium transition-colors ${formData.customerType === 'Person' ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'}`}>Individual</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group relative">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="radio"
                      name="customerType"
                      value="Company"
                      checked={formData.customerType === 'Company'}
                      onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                      className="absolute opacity-0 w-full h-full cursor-pointer z-10"
                    />
                    <div className={`w-4 h-4 rounded-full border transition-colors ${formData.customerType === 'Company' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}></div>
                    <div className={`absolute w-1.5 h-1.5 rounded-full bg-white transition-opacity ${formData.customerType === 'Company' ? 'opacity-100' : 'opacity-0'}`}></div>
                  </div>
                  <span className={`text-sm font-medium transition-colors ${formData.customerType === 'Company' ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'}`}>Company</span>
                </label>
              </div>

              <div className="space-y-4">
                <Input
                  required
                  placeholder={formData.customerType === 'Company' ? "e.g. Lumber Inc" : "e.g. Brandon Freeman"}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-2xl font-bold text-slate-800 placeholder:text-slate-300 border-slate-200 focus:ring-blue-500 h-14"
                />

                {formData.customerType === 'Person' && (
                  <Input
                    placeholder="Company Name..."
                    value={formData.companyName}
                    onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full text-md border-slate-200"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-8">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Details</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-4">
                <FormField label="Address">
                  <div className="space-y-2">
                    <Input
                      placeholder="Street..."
                      value={formData.address?.street}
                      onChange={e => handleAddressChange('street', e.target.value)}
                    />
                    <Input
                      placeholder="Street 2..."
                      value={formData.address?.street2}
                      onChange={e => handleAddressChange('street2', e.target.value)}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="City"
                        className="col-span-1"
                        value={formData.address?.city}
                        onChange={e => handleAddressChange('city', e.target.value)}
                      />
                      <Input
                        placeholder="State"
                        className="col-span-1"
                        value={formData.address?.state}
                        onChange={e => handleAddressChange('state', e.target.value)}
                      />
                      <Input
                        placeholder="ZIP"
                        className="col-span-1"
                        value={formData.address?.zip}
                        onChange={e => handleAddressChange('zip', e.target.value)}
                      />
                    </div>
                    <Input
                      placeholder="Country"
                      value={formData.address?.country}
                      onChange={e => handleAddressChange('country', e.target.value)}
                    />
                  </div>
                </FormField>

                <FormField label="Tax ID">
                  <Input
                    placeholder="e.g. BE0477472701"
                    value={formData.taxId}
                    onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                  />
                </FormField>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {formData.customerType === 'Person' && (
                  <FormField label="Job Position">
                    <Input
                      placeholder="e.g. Sales Director"
                      value={formData.jobPosition}
                      onChange={e => setFormData({ ...formData, jobPosition: e.target.value })}
                    />
                  </FormField>
                )}

                <FormField label="Phone">
                  <Input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </FormField>

                <FormField label="Email">
                  <Input
                    type="email"
                    placeholder="e.g. contact@company.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </FormField>

                <FormField label="Website">
                  <Input
                    type="url"
                    placeholder="e.g. https://www.jts.com"
                    value={formData.website}
                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                  />
                </FormField>

                <FormField label="Tags">
                  <div className="relative">
                    <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <Input
                      placeholder="e.g. B2B, VIP, Consulting..."
                      className="pl-9"
                      value={tagsInput}
                      onChange={handleTagsChange}
                    />
                  </div>
                </FormField>

                <FormField label="Customer Group">
                  <Select
                    value={formData.customerGroup}
                    onChange={e => setFormData({ ...formData, customerGroup: e.target.value })}
                  >
                    <option value="RETAIL">Retail (Standard)</option>
                    <option value="WHOLESALE">Wholesale</option>
                    <option value="VIP">VIP</option>
                  </Select>
                </FormField>
              </div>
            </div>
          </div>
        </Card>

        <Card className="mt-6">
          {/* Bottom Tabs */}
          <div>
            <div className="flex px-6 space-x-2 border-b border-slate-200 overflow-x-auto">
              {['contacts', 'sales_purchase', 'invoicing', 'notes'].map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                >
                  {tab === 'contacts' && 'Contacts & Addresses'}
                  {tab === 'sales_purchase' && 'Sales & Purchase'}
                  {tab === 'invoicing' && 'Invoicing'}
                  {tab === 'notes' && 'Internal Notes'}
                </button>
              ))}
            </div>

            <div className="p-6 min-h-[200px]">
              {activeTab === 'notes' && (
                <textarea
                  placeholder="Add internal notes about this customer..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm placeholder:text-slate-400 resize-y"
                />
              )}

              {activeTab === 'contacts' && (
                <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                  <Users className="w-12 h-12 text-slate-300 mb-3" />
                  <p>Contacts feature coming soon</p>
                </div>
              )}

              {activeTab === 'sales_purchase' && (
                <div className="text-sm text-slate-600 max-w-xl space-y-4">
                  <p className="font-medium text-slate-800">Sales Configuration</p>
                  <div className="grid grid-cols-2 gap-4 border-l-2 border-slate-200 pl-4">
                    <div>
                      <span className="block text-xs text-slate-400 uppercase font-bold mb-1">Salesperson</span>
                      <span>Not Assigned</span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-400 uppercase font-bold mb-1">Payment Terms</span>
                      <span>30 Days (Default)</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'invoicing' && (
                <div className="text-sm text-slate-600 max-w-xl space-y-4">
                  <p className="font-medium text-slate-800">Accounting</p>
                  <div className="grid grid-cols-2 gap-4 border-l-2 border-slate-200 pl-4">
                    <div>
                      <span className="block text-xs text-slate-400 uppercase font-bold mb-1">Bank Account</span>
                      <span>Not configured</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
};

export default CustomerForm;

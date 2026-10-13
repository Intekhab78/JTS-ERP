import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Building, Pencil, Trash2, Globe } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardContent } from '../../components/common/Card';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/common/Modal';
import { FormField } from '../../components/common/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { COUNTRIES } from '../../config/countries';

const LegalCompanyManagement = () => {
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const initialFormState = {
    name: '', legalName: '', code: '', taxId: '', registrationNumber: '',
    baseCurrency: 'USD',
    address: { street: '', addressLine2: '', city: '', state: '', zipCode: '', country: '' }
  };
  const [formData, setFormData] = useState(initialFormState);

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/legal-company', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompanies(res.data);
    } catch (error) {
      console.error('Failed to fetch companies', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (selectedCompany) {
        await axios.put(`/api/v1/legal-company/${selectedCompany._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/v1/legal-company', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setIsModalOpen(false);
      setIsEditModalOpen(false);
      setFormData(initialFormState);
      setSelectedCompany(null);
      fetchCompanies();
    } catch (error) {
      console.error('Failed to save company', error);
      alert(error.response?.data?.message || 'Failed to save company');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this company? All associated branches must be deleted or reassigned first.')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/legal-company/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCompanies();
    } catch (error) {
      console.error('Failed to delete company', error);
      alert(error.response?.data?.message || 'Failed to delete company');
    }
  };

  const openEditModal = (company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name || '',
      legalName: company.legalName || '',
      code: company.code || '',
      taxId: company.taxId || '',
      registrationNumber: company.registrationNumber || '',
      baseCurrency: company.baseCurrency || 'USD',
      address: {
        street: company.address?.street || '',
        addressLine2: company.address?.addressLine2 || '',
        city: company.address?.city || '',
        state: company.address?.state || '',
        zipCode: company.address?.zipCode || '',
        country: company.address?.country || ''
      },
      isActive: company.isActive
    });
    setIsEditModalOpen(true);
  };

  const columns = [
    { 
      accessorKey: 'name', 
      header: 'Company Name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Building size={20} />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.name}</span>
            {row.code && <span className="text-xs text-muted-foreground">Code: {row.code}</span>}
          </div>
        </div>
      )
    },
    { accessorKey: 'legalName', header: 'Legal Registered Name', cell: (row) => <span className="text-muted-foreground">{row.legalName || '-'}</span> },
    { accessorKey: 'taxId', header: 'Tax ID', cell: (row) => <span className="text-muted-foreground">{row.taxId || '-'}</span> },
    { accessorKey: 'baseCurrency', header: 'Base Currency' },
    { 
      accessorKey: 'isActive', 
      header: 'Status',
      cell: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      id: 'actions',
      header: '',
      cell: (row) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEditModal(row)} className="h-8 w-8 p-0">
            <Pencil size={16} className="text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row._id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50">
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  const modalForm = (
    <form id="company-form" onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium border-b pb-2">Company Information</h3>
        <FormField label="Display Name" required>
          <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. JTS Technologies" />
        </FormField>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Legal Name">
            <Input value={formData.legalName} onChange={e => setFormData({...formData, legalName: e.target.value})} placeholder="e.g. JTS Technologies LLC" />
          </FormField>
          <FormField label="Company Code">
            <Input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="e.g. JTS-TECH" />
          </FormField>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Tax ID / VAT Number">
            <Input value={formData.taxId} onChange={e => setFormData({...formData, taxId: e.target.value})} />
          </FormField>
          <FormField label="Registration Number">
            <Input value={formData.registrationNumber} onChange={e => setFormData({...formData, registrationNumber: e.target.value})} />
          </FormField>
        </div>
        
        <FormField label="Base Currency" required>
          <Select required value={formData.baseCurrency} onChange={e => setFormData({...formData, baseCurrency: e.target.value})}>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="AED">AED</option>
            <option value="INR">INR (₹)</option>
          </Select>
        </FormField>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium border-b pb-2">Registered Address</h3>
        <FormField label="Street Address">
          <Input value={formData.address.street} onChange={e => setFormData({...formData, address: {...formData.address, street: e.target.value}})} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="City">
            <Input value={formData.address.city} onChange={e => setFormData({...formData, address: {...formData.address, city: e.target.value}})} />
          </FormField>
          <FormField label="State / Province">
            <Input value={formData.address.state} onChange={e => setFormData({...formData, address: {...formData.address, state: e.target.value}})} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Zip Code">
            <Input value={formData.address.zipCode} onChange={e => setFormData({...formData, address: {...formData.address, zipCode: e.target.value}})} />
          </FormField>
          <FormField label="Country">
            <Select value={formData.address.country} onChange={e => setFormData({...formData, address: {...formData.address, country: e.target.value}})}>
              <option value="">Select country...</option>
              {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </Select>
          </FormField>
        </div>
      </div>
      
      {selectedCompany && (
        <FormField label="Status">
          <Select value={formData.isActive ? 'true' : 'false'} onChange={e => setFormData({...formData, isActive: e.target.value === 'true'})}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </FormField>
      )}
    </form>
  );

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 max-w-[1720px] mx-auto pb-10 bg-[#f8fafc] min-h-screen">
      
      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl mt-4 sm:mx-4 lg:mx-8 mb-6">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">Companies</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl">
              GROUP STRUCTURE • ENTITIES & SUBSIDIARIES
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-3 bg-[#111827] border border-slate-800 p-2 rounded-lg shadow-inner">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">System Online</span>
            </div>
            <button 
              onClick={() => { setFormData(initialFormState); setSelectedCompany(null); setIsModalOpen(true); }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-bold text-sm tracking-wider uppercase transition-colors shadow-lg border border-blue-400 flex items-center gap-2"
            >
              <Plus size={16} strokeWidth={3} /> Add Company
            </button>
          </div>
        </div>
      </div>
      <div className="px-4 sm:px-6 lg:px-8 space-y-6">

      <Card>
        <CardContent className="p-0">
          <DataTable 
            data={companies}
            columns={columns}
            isLoading={isLoading}
            searchPlaceholder="Search companies..."
            searchKey="name"
            emptyMessage="No companies found. Add one to start organizing your group structure."
            emptyIcon={<Globe className="h-12 w-12 text-muted-foreground opacity-50" />}
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen || isEditModalOpen}
        onClose={() => { setIsModalOpen(false); setIsEditModalOpen(false); }}
        title={selectedCompany ? "Edit Company" : "Add New Company"}
        size="2xl"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }}>Cancel</Button>
            <Button type="submit" form="company-form" isLoading={isSaving}>Save Company</Button>
          </>
        }
      >
        {modalForm}
      </Modal>
      </div>
    </div>
  );
};

export default LegalCompanyManagement;

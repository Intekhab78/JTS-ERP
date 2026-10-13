import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Building2, Globe, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardContent } from '../../components/common/Card';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/common/Modal';
import { FormField } from '../../components/common/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { format } from 'date-fns';

const TenantManagement = () => {
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  const initialFormState = {
    name: '', legalName: '', taxId: '', registrationNumber: '', industry: '', companyType: '',
    contact: { email: '', phone: '' },
    address: { street: '', addressLine2: '', city: '', state: '', zipCode: '', country: '' },
    currency: 'USD'
  };
  const [formData, setFormData] = useState(initialFormState);

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/company/all', {
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

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/v1/company', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsModalOpen(false);
      setFormData(initialFormState);
      fetchCompanies();
    } catch (error) {
      console.error('Failed to create company', error);
      alert(error.response?.data?.message || 'Failed to create company');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/v1/company/${selectedCompany._id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsEditModalOpen(false);
      setFormData(initialFormState);
      setSelectedCompany(null);
      fetchCompanies();
    } catch (error) {
      console.error('Failed to update company', error);
      alert(error.response?.data?.message || 'Failed to update company');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== `DELETE ${selectedCompany?.name}`) {
      alert("Please type the exact confirmation phrase to delete.");
      return;
    }
    
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/company/${selectedCompany._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsDeleteModalOpen(false);
      setSelectedCompany(null);
      setDeleteConfirmText('');
      fetchCompanies();
    } catch (error) {
      console.error('Failed to delete company', error);
      alert(error.response?.data?.message || 'Failed to delete company');
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditModal = (company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name || '',
      legalName: company.legalName || '',
      taxId: company.taxId || '',
      registrationNumber: company.registrationNumber || '',
      industry: company.industry || '',
      companyType: company.companyType || '',
      contact: {
        email: company.contact?.email || '',
        phone: company.contact?.phone || ''
      },
      address: {
        street: company.address?.street || '',
        addressLine2: company.address?.addressLine2 || '',
        city: company.address?.city || '',
        state: company.address?.state || '',
        zipCode: company.address?.zipCode || '',
        country: company.address?.country || ''
      },
      currency: company.currency || 'USD',
      isActive: company.isActive
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (company) => {
    setSelectedCompany(company);
    setDeleteConfirmText('');
    setIsDeleteModalOpen(true);
  };

  const columns = [
    { 
      accessorKey: 'name', 
      header: 'Company Name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Building2 size={20} />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.name}</span>
            {row.legalName && <span className="text-xs text-muted-foreground">{row.legalName}</span>}
          </div>
        </div>
      )
    },
    { accessorKey: 'industry', header: 'Industry', cell: (row) => <span className="text-muted-foreground">{row.industry || '-'}</span> },
    { accessorKey: 'contact.email', header: 'Email', cell: (row) => <span className="text-muted-foreground">{row.contact?.email || '-'}</span> },
    { accessorKey: 'address.country', header: 'Country', cell: (row) => <span className="text-muted-foreground">{row.address?.country || '-'}</span> },
    { accessorKey: 'taxId', header: 'Tax ID', cell: (row) => <span className="text-muted-foreground">{row.taxId || '-'}</span> },
    { accessorKey: 'currency', header: 'Currency' },
    { 
      accessorKey: 'isActive', 
      header: 'Status',
      cell: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
    { 
      accessorKey: 'createdAt', 
      header: 'Created',
      cell: (row) => <span className="text-muted-foreground">{format(new Date(row.createdAt), 'MMM d, yyyy')}</span>
    },
    {
      id: 'actions',
      header: '',
      cell: (row) => (
        <div className="flex items-center justify-end gap-2">
          {hasPermission('UPDATE_COMPANY') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditModal(row)}
              className="h-8 w-8 p-0"
              title="Edit Company"
            >
              <Pencil size={16} className="text-muted-foreground" />
            </Button>
          )}
          {hasPermission('DELETE_COMPANY') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDeleteModal(row)}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
              title="Delete Company"
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 max-w-[1720px] mx-auto pb-10 bg-[#f8fafc] min-h-screen">
      
      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl mt-4 sm:mx-4 lg:mx-8 mb-6">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">Tenant Management</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl">
              SYSTEM ADMIN • ENTERPRISE TENANTS & PROVISIONING
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-3 bg-[#111827] border border-slate-800 p-2 rounded-lg shadow-inner">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">System Online</span>
            </div>
            {hasPermission('CREATE_COMPANY') && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-bold text-sm tracking-wider uppercase transition-colors shadow-lg border border-blue-400 flex items-center gap-2"
              >
                <Plus size={16} strokeWidth={3} /> New Company
              </button>
            )}
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
            emptyMessage="No companies found. Create one to get started."
            emptyIcon={<Globe className="h-12 w-12 text-muted-foreground opacity-50" />}
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Provision New Company"
        size="3xl"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-company-form" isLoading={isCreating}>
              Create Company
            </Button>
          </>
        }
      >
        <form id="create-company-form" onSubmit={handleCreate} className="space-y-8 pr-2">
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Basic Information</h3>
            <FormField label="Company Name" required>
              <Input 
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Acme Corp"
              />
            </FormField>
            
            <FormField label="Legal Company Name">
              <Input 
                value={formData.legalName}
                onChange={e => setFormData({...formData, legalName: e.target.value})}
                placeholder="e.g. Acme Corporation LLC"
              />
            </FormField>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Tax ID / VAT / EIN">
                <Input 
                  value={formData.taxId}
                  onChange={e => setFormData({...formData, taxId: e.target.value})}
                  placeholder="Optional"
                />
              </FormField>
              <FormField label="Registration Number">
                <Input 
                  value={formData.registrationNumber}
                  onChange={e => setFormData({...formData, registrationNumber: e.target.value})}
                  placeholder="Optional"
                />
              </FormField>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Industry">
                <Input 
                  value={formData.industry}
                  onChange={e => setFormData({...formData, industry: e.target.value})}
                  placeholder="e.g. Manufacturing"
                />
              </FormField>
              <FormField label="Company Type">
                <Input 
                  value={formData.companyType}
                  onChange={e => setFormData({...formData, companyType: e.target.value})}
                  placeholder="e.g. LLC, Corp"
                />
              </FormField>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Contact Information</h3>
            <FormField label="Company Email">
              <Input 
                type="email"
                value={formData.contact.email}
                onChange={e => setFormData({...formData, contact: {...formData.contact, email: e.target.value}})}
                placeholder="hello@acmecorp.com"
              />
            </FormField>
            <FormField label="Phone Number">
              <Input 
                value={formData.contact.phone}
                onChange={e => setFormData({...formData, contact: {...formData.contact, phone: e.target.value}})}
                placeholder="+1 (555) 000-0000"
              />
            </FormField>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Address</h3>
            <FormField label="Address Line 1">
              <Input 
                value={formData.address.street}
                onChange={e => setFormData({...formData, address: {...formData.address, street: e.target.value}})}
                placeholder="123 Main St"
              />
            </FormField>
            <FormField label="Address Line 2">
              <Input 
                value={formData.address.addressLine2}
                onChange={e => setFormData({...formData, address: {...formData.address, addressLine2: e.target.value}})}
                placeholder="Suite 100"
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="City">
                <Input 
                  value={formData.address.city}
                  onChange={e => setFormData({...formData, address: {...formData.address, city: e.target.value}})}
                />
              </FormField>
              <FormField label="State / Province">
                <Input 
                  value={formData.address.state}
                  onChange={e => setFormData({...formData, address: {...formData.address, state: e.target.value}})}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Postal / ZIP Code">
                <Input 
                  value={formData.address.zipCode}
                  onChange={e => setFormData({...formData, address: {...formData.address, zipCode: e.target.value}})}
                />
              </FormField>
              <FormField label="Country" required>
                <Input 
                  required
                  value={formData.address.country}
                  onChange={e => setFormData({...formData, address: {...formData.address, country: e.target.value}})}
                />
              </FormField>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">ERP Settings</h3>
            <FormField label="Default Currency" required>
              <Select
                required
                value={formData.currency}
                onChange={e => setFormData({...formData, currency: e.target.value})}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </Select>
            </FormField>
          </div>
        </form>
      </Modal>

      {/* Edit Company Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedCompany(null);
          setFormData(initialFormState);
        }}
        title="Edit Company"
        size="3xl"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-company-form" isLoading={isCreating}>
              Save Changes
            </Button>
          </>
        }
      >
        <form id="edit-company-form" onSubmit={handleUpdate} className="space-y-8 pr-2">
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Basic Information</h3>
            <FormField label="Company Name" required>
              <Input 
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </FormField>
            
            <FormField label="Legal Company Name">
              <Input 
                value={formData.legalName}
                onChange={e => setFormData({...formData, legalName: e.target.value})}
              />
            </FormField>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Tax ID / VAT / EIN">
                <Input 
                  value={formData.taxId}
                  onChange={e => setFormData({...formData, taxId: e.target.value})}
                />
              </FormField>
              <FormField label="Registration Number">
                <Input 
                  value={formData.registrationNumber}
                  onChange={e => setFormData({...formData, registrationNumber: e.target.value})}
                />
              </FormField>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Industry">
                <Input 
                  value={formData.industry}
                  onChange={e => setFormData({...formData, industry: e.target.value})}
                />
              </FormField>
              <FormField label="Company Type">
                <Input 
                  value={formData.companyType}
                  onChange={e => setFormData({...formData, companyType: e.target.value})}
                />
              </FormField>
            </div>
            <FormField label="Status">
              <Select
                value={formData.isActive ? 'true' : 'false'}
                onChange={e => setFormData({...formData, isActive: e.target.value === 'true'})}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
            </FormField>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Contact Information</h3>
            <FormField label="Company Email">
              <Input 
                type="email"
                value={formData.contact.email}
                onChange={e => setFormData({...formData, contact: {...formData.contact, email: e.target.value}})}
              />
            </FormField>
            <FormField label="Phone Number">
              <Input 
                value={formData.contact.phone}
                onChange={e => setFormData({...formData, contact: {...formData.contact, phone: e.target.value}})}
              />
            </FormField>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Address</h3>
            <FormField label="Address Line 1">
              <Input 
                value={formData.address.street}
                onChange={e => setFormData({...formData, address: {...formData.address, street: e.target.value}})}
              />
            </FormField>
            <FormField label="Address Line 2">
              <Input 
                value={formData.address.addressLine2}
                onChange={e => setFormData({...formData, address: {...formData.address, addressLine2: e.target.value}})}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="City">
                <Input 
                  value={formData.address.city}
                  onChange={e => setFormData({...formData, address: {...formData.address, city: e.target.value}})}
                />
              </FormField>
              <FormField label="State / Province">
                <Input 
                  value={formData.address.state}
                  onChange={e => setFormData({...formData, address: {...formData.address, state: e.target.value}})}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Postal / ZIP Code">
                <Input 
                  value={formData.address.zipCode}
                  onChange={e => setFormData({...formData, address: {...formData.address, zipCode: e.target.value}})}
                />
              </FormField>
              <FormField label="Country" required>
                <Input 
                  required
                  value={formData.address.country}
                  onChange={e => setFormData({...formData, address: {...formData.address, country: e.target.value}})}
                />
              </FormField>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">ERP Settings</h3>
            <FormField label="Default Currency" required>
              <Select
                required
                value={formData.currency}
                onChange={e => setFormData({...formData, currency: e.target.value})}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </Select>
            </FormField>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteConfirmText('');
        }}
        title="Delete Company"
        size="lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button 
              type="button" 
              className="bg-red-600 hover:bg-red-700 text-white" 
              onClick={handleDelete} 
              isLoading={isDeleting}
              disabled={deleteConfirmText !== `DELETE ${selectedCompany?.name}`}
            >
              Permanently Delete
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm text-foreground">
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg flex gap-3 border border-red-200 dark:border-red-800/30">
            <AlertTriangle className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">WARNING: THIS ACTION IS IRREVERSIBLE.</p>
              <p>
                Deleting this company will permanently erase <strong>all data</strong> associated with this workspace. 
                This includes all users, branches, POS sales, accounting journals, products, and more. 
                Over 70 data collections will be cascade-deleted.
              </p>
            </div>
          </div>
          
          <p>
            To confirm deletion, please type <strong className="font-mono bg-muted px-1.5 py-0.5 rounded">DELETE {selectedCompany?.name}</strong> exactly as shown below:
          </p>
          
          <Input 
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={`DELETE ${selectedCompany?.name}`}
            className="font-mono text-center"
            autoComplete="off"
            disabled={isDeleting}
          />
        </div>
      </Modal>
      </div>
    </div>
  );
};

export default TenantManagement;

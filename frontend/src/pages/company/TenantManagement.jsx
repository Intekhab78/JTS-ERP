import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Building2, Globe } from 'lucide-react';
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
  const [isCreating, setIsCreating] = useState(false);
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
      const res = await axios.get('http://localhost:5000/api/v1/company/all', {
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
      await axios.post('http://localhost:5000/api/v1/company', formData, {
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
    }
  ];

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          title="Tenant Management"
          description="Manage enterprise tenants and provision new companies on the platform."
        />
        {hasPermission('CREATE_COMPANY') && (
          <Button 
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus size={18} />}
            className="shrink-0"
          >
            New Company
          </Button>
        )}
      </div>

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
    </div>
  );
};

export default TenantManagement;

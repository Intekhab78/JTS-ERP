import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, MapPin, Store, Edit, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardContent } from '../../components/common/Card';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/common/Modal';
import { FormField } from '../../components/common/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { format } from 'date-fns';

const BranchManagement = () => {
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const initialFormState = {
    name: '', 
    type: 'Store',
    address: { street: '', city: '', state: '', zipCode: '', country: '' }
  };
  const [formData, setFormData] = useState(initialFormState);
  const [editingBranchId, setEditingBranchId] = useState(null);

  const fetchBranches = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/v1/branches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranches(res.data);
    } catch (error) {
      console.error('Failed to fetch branches', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleEditClick = (branch) => {
    setEditingBranchId(branch._id);
    setFormData({
      name: branch.name,
      type: branch.type || 'Store',
      address: {
        street: branch.address?.street || '',
        city: branch.address?.city || '',
        state: branch.address?.state || '',
        zipCode: branch.address?.zipCode || '',
        country: branch.address?.country || ''
      }
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (branch) => {
    if (window.confirm(`Are you sure you want to delete branch "${branch.name}"?`)) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/v1/branches/${branch._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchBranches();
      } catch (error) {
        console.error('Failed to delete branch', error);
        alert(error.response?.data?.message || 'Failed to delete branch');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const token = localStorage.getItem('token');
      if (editingBranchId) {
        await axios.put(`http://localhost:5000/api/v1/branches/${editingBranchId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('http://localhost:5000/api/v1/branches', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setIsModalOpen(false);
      setEditingBranchId(null);
      setFormData(initialFormState);
      fetchBranches();
    } catch (error) {
      console.error('Failed to save branch', error);
      alert(error.response?.data?.message || 'Failed to save branch');
    } finally {
      setIsCreating(false);
    }
  };

  const columns = [
    { 
      accessorKey: 'name', 
      header: 'Branch Name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Store size={20} />
          </div>
          <span className="font-medium text-foreground">{row.name}</span>
        </div>
      )
    },
    { accessorKey: 'type', header: 'Type' },
    { 
      accessorKey: 'address.city', 
      header: 'Location',
      cell: (row) => (
        <div className="flex flex-col">
          <span className="text-foreground">{row.address?.city || '-'}</span>
          <span className="text-xs text-muted-foreground">{row.address?.country || ''}</span>
        </div>
      )
    },
    { 
      accessorKey: 'managerId', 
      header: 'Manager',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.managerId ? `${row.managerId.firstName} ${row.managerId.lastName}` : 'Unassigned'}
        </span>
      )
    },
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
      accessorKey: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleEditClick(row)}>
            <Edit className="h-4 w-4 text-amber-500" />
          </Button>
          <Button variant="ghost" size="icon" className="hover:bg-red-50 dark:hover:bg-red-950/50" onClick={() => handleDeleteClick(row)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          title="Branch Management"
          description="Manage and create new physical or digital branch locations for your enterprise."
        />
        <Button 
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus size={18} />}
          className="shrink-0"
        >
          New Branch
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable 
            data={branches}
            columns={columns}
            isLoading={isLoading}
            searchPlaceholder="Search branches..."
            searchKey="name"
            emptyMessage="No branches found. Create one to get started."
            emptyIcon={<MapPin className="h-12 w-12 text-muted-foreground opacity-50" />}
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBranchId(null);
          setFormData(initialFormState);
        }}
        title={editingBranchId ? "Edit Branch" : "Add New Branch"}
        size="2xl"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => {
              setIsModalOpen(false);
              setEditingBranchId(null);
              setFormData(initialFormState);
            }}>
              Cancel
            </Button>
            <Button type="submit" form="branch-form" isLoading={isCreating}>
              {editingBranchId ? "Save Changes" : "Create Branch"}
            </Button>
          </>
        }
      >
        <form id="branch-form" onSubmit={handleSubmit} className="space-y-6 pr-2">
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Basic Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Branch Name" required>
                <Input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Downtown Store"
                />
              </FormField>
              
              <FormField label="Branch Type" required>
                <Select
                  required
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                >
                  <option value="Store">Store</option>
                  <option value="Warehouse">Warehouse</option>
                  <option value="Office">Office</option>
                </Select>
              </FormField>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Address</h3>
            <FormField label="Street Address">
              <Input 
                value={formData.address.street}
                onChange={e => setFormData({...formData, address: {...formData.address, street: e.target.value}})}
                placeholder="123 Main St"
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
              <FormField label="Country">
                <Input 
                  value={formData.address.country}
                  onChange={e => setFormData({...formData, address: {...formData.address, country: e.target.value}})}
                />
              </FormField>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BranchManagement;

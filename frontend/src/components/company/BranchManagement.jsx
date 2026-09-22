import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { FormField } from '../../components/common/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

const BranchManagement = () => {
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'Store', address: { street: '', city: '', state: '', country: '', zipCode: '' }});
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState(null);

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/branches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranches(res.data);
    } catch (error) {
      console.error('Failed to fetch branches', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/v1/branches', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchBranches();
      setIsModalOpen(false);
      setFormData({ name: '', type: 'Store', address: { street: '', city: '', state: '', country: '', zipCode: '' }});
    } catch (error) {
      console.error('Failed to create branch', error);
      alert('Failed to create branch');
    }
  };

  const promptDelete = (id) => {
    setBranchToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!branchToDelete) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/branches/${branchToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeleteConfirmOpen(false);
      setBranchToDelete(null);
      fetchBranches();
    } catch (error) {
      console.error('Failed to delete branch', error);
      alert('Failed to delete branch');
      setDeleteConfirmOpen(false);
      setBranchToDelete(null);
    }
  };

  const columns = [
    {
      header: 'Location Name',
      accessorKey: 'name',
      cell: (row) => <span className="font-bold text-foreground">{row.name}</span>
    },
    {
      header: 'Type',
      accessorKey: 'type',
      cell: (row) => (
        <Badge variant="secondary" className="uppercase tracking-wider text-[10px]">
          {row.type}
        </Badge>
      )
    },
    {
      header: 'Address',
      accessorKey: 'address',
      cell: (row) => {
        const addr = row.address;
        if (!addr || !addr.street) return <span className="text-muted-foreground">-</span>;
        return (
          <span className="text-sm text-muted-foreground">
            {addr.street}, {addr.city}, {addr.state} {addr.zipCode}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      accessorKey: 'actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex justify-end">
          {hasPermission('DELETE_BRANCHES') && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => {
                e.stopPropagation();
                promptDelete(row._id);
              }} 
              className="text-error hover:text-error hover:bg-error/10"
              aria-label="Delete branch"
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <MapPin size={20} className="text-primary"/> Branches & Locations
        </h2>
        {hasPermission('CREATE_BRANCHES') && (
          <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus size={16} />} size="sm">
            Add Location
          </Button>
        )}
      </div>

      <DataTable 
        columns={columns} 
        data={branches} 
        isLoading={isLoading}
        emptyTitle="No locations added yet."
        emptyDescription="Click 'Add Location' to create your first branch."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Location"
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Location Name" required>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </FormField>
              <FormField label="Location Type">
                <Select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option value="Store">Retail Store</option>
                  <option value="Warehouse">Warehouse</option>
                  <option value="Office">Office</option>
                </Select>
              </FormField>
            </div>
            
            <FormField label="Street Address">
              <Input value={formData.address.street} onChange={e => setFormData({...formData, address: {...formData.address, street: e.target.value}})} />
            </FormField>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="City">
                <Input value={formData.address.city} onChange={e => setFormData({...formData, address: {...formData.address, city: e.target.value}})} />
              </FormField>
              <FormField label="State / Province">
                <Input value={formData.address.state} onChange={e => setFormData({...formData, address: {...formData.address, state: e.target.value}})} />
              </FormField>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Zip Code">
                <Input value={formData.address.zipCode} onChange={e => setFormData({...formData, address: {...formData.address, zipCode: e.target.value}})} />
              </FormField>
              <FormField label="Country">
                <Input value={formData.address.country} onChange={e => setFormData({...formData, address: {...formData.address, country: e.target.value}})} />
              </FormField>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Add Location</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Location"
        description="Are you sure you want to delete this branch? This action cannot be undone."
        confirmText="Delete Branch"
      />
    </div>
  );
};

export default BranchManagement;

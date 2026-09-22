import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { FormField } from '../../components/common/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';

export default function UomMaster() {
  const [uoms, setUoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', isActive: true });
  const [editingId, setEditingId] = useState(null);

  const fetchUoms = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/inventory/uoms?includeInactive=true', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUoms(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch UOMs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUoms();
  }, []);

  const handleOpenModal = (uom = null) => {
    setError('');
    if (uom) {
      setEditingId(uom._id);
      setFormData({ name: uom.name, code: uom.code, isActive: uom.isActive });
    } else {
      setEditingId(null);
      setFormData({ name: '', code: '', isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      if (editingId) {
        await axios.put(`/api/v1/inventory/uoms/${editingId}`, formData, { headers });
      } else {
        await axios.post('/api/v1/inventory/uoms', formData, { headers });
      }
      setIsModalOpen(false);
      fetchUoms();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save UOM');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this UOM?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/inventory/uoms/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUoms();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete UOM');
    }
  };

  const columns = [
    { header: 'UOM Name', accessorKey: 'name' },
    { header: 'Code', accessorKey: 'code' },
    { 
      header: 'Status', 
      cell: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleOpenModal(row)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-800" onClick={() => handleDelete(row._id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="UOM Master" 
        description="Manage Units of Measure"
        actions={
          <Button onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Add UOM
          </Button>
        }
      />

      <Card className="p-6">
        <DataTable 
          data={uoms}
          columns={columns}
          loading={loading}
          searchable
          searchField="name"
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit UOM' : 'Create UOM'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          
          <FormField label="UOM Name" required>
            <Input 
              required 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              placeholder="e.g. Dozen"
            />
          </FormField>
          
          <FormField label="UOM Code" required>
            <Input 
              required 
              value={formData.code} 
              onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} 
              placeholder="e.g. DZN"
            />
          </FormField>

          <FormField label="Status">
            <Select 
              value={formData.isActive.toString()} 
              onChange={e => setFormData({...formData, isActive: e.target.value === 'true'})}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </FormField>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingId ? 'Update UOM' : 'Save UOM'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

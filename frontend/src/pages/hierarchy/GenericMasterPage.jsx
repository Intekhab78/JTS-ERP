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
import { Alert } from '../../components/ui/Alert';

export default function GenericMasterPage({ title, endpoint }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', isActive: true });
  const [editingId, setEditingId] = useState(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/v1/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(res.data);
    } catch (err) {
      console.error(err);
      setError(`Failed to fetch ${title}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [endpoint]);

  const handleOpenModal = (item = null) => {
    setError('');
    if (item) {
      setEditingId(item._id);
      setFormData({ name: item.name, code: item.code || '', isActive: item.isActive !== false });
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
        await axios.put(`/api/v1/${endpoint}/${editingId}`, formData, { headers });
      } else {
        await axios.post(`/api/v1/${endpoint}`, formData, { headers });
      }
      setIsModalOpen(false);
      fetchItems();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to save ${title}`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete this ${title}?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/${endpoint}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to delete ${title}`);
    }
  };

  const columns = [
    { header: 'Name', accessorKey: 'name' },
    { header: 'Code', accessorKey: 'code' },
    { 
      header: 'Status', 
      cell: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {row.isActive !== false ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleOpenModal(row)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(row._id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title={title} 
        actions={
          <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
            <Plus size={16} /> Add {title}
          </Button>
        }
      />

      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <DataTable 
          columns={columns} 
          data={items} 
          loading={loading}
          searchable
          searchField="name"
        />
      </Card>

      {isModalOpen && (
        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title={editingId ? `Edit ${title}` : `New ${title}`}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert variant="destructive">{error}</Alert>}
            
            <FormField label="Name" required>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                required 
                autoFocus
              />
            </FormField>

            <FormField label="Code">
              <Input 
                value={formData.code} 
                onChange={e => setFormData({...formData, code: e.target.value})} 
                className="uppercase"
              />
            </FormField>

            <div className="flex items-center gap-2 mt-4">
              <input 
                type="checkbox" 
                id="isActive" 
                checked={formData.isActive}
                onChange={e => setFormData({...formData, isActive: e.target.checked})}
                className="rounded border-gray-300"
              />
              <label htmlFor="isActive" className="text-sm font-medium">Active</label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save {title}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

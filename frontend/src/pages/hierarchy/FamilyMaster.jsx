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

export default function FamilyMaster() {
  const [families, setFamilies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ departmentId: '', categoryId: '', name: '', code: '', isActive: true });
  const [editingId, setEditingId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [famRes, catRes, depRes] = await Promise.all([
        axios.get('http://localhost:5000/api/v1/hierarchy/families', { headers }),
        axios.get('http://localhost:5000/api/v1/inventory/categories', { headers }),
        axios.get('http://localhost:5000/api/v1/hierarchy/departments', { headers })
      ]);
      
      setFamilies(famRes.data);
      setCategories(catRes.data);
      setDepartments(depRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (item = null) => {
    setError('');
    if (item) {
      setEditingId(item._id);
      
      // Find the department for the item's category
      let deptId = '';
      if (item.categoryId) {
        const cat = categories.find(c => c._id === (item.categoryId._id || item.categoryId));
        if (cat && cat.itemDepartmentId) {
          deptId = cat.itemDepartmentId._id || cat.itemDepartmentId;
        }
      }
      
      setFormData({ 
        departmentId: deptId,
        categoryId: item.categoryId?._id || item.categoryId || '', 
        name: item.name, 
        code: item.code || '', 
        isActive: item.isActive !== false 
      });
    } else {
      setEditingId(null);
      setFormData({ departmentId: '', categoryId: '', name: '', code: '', isActive: true });
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
        await axios.put(`http://localhost:5000/api/v1/hierarchy/families/${editingId}`, formData, { headers });
      } else {
        await axios.post('http://localhost:5000/api/v1/hierarchy/families', formData, { headers });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save Family');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Family?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/v1/hierarchy/families/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete Family');
    }
  };

  const columns = [
    { header: 'Family Name', accessorKey: 'name' },
    { header: 'Code', accessorKey: 'code' },
    { 
      header: 'Category', 
      cell: (row) => {
        if (!row.categoryId) return '-';
        const cat = categories.find(c => c._id === (row.categoryId._id || row.categoryId));
        return cat ? cat.name : '-';
      }
    },
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
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-blue-600" onClick={() => handleOpenModal(row)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-600" onClick={() => handleDelete(row._id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title="Family Master"
        actions={
          <Button onClick={() => handleOpenModal()} leftIcon={<Plus className="h-4 w-4" />}>
            Add Family
          </Button>
        }
      />

      <Card>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground font-medium">Loading families...</div>
        ) : (
          <DataTable data={families} columns={columns} searchPlaceholder="Search families..." />
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Family' : 'Add Family'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="destructive">{error}</Alert>}
          
          <FormField label="Department" required>
            <Select
              value={formData.departmentId}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value, categoryId: '' })}
              required
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept._id} value={dept._id}>{dept.name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Category" required>
            <Select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              required
              disabled={!formData.departmentId}
            >
              <option value="">Select Category</option>
              {categories
                .filter(cat => cat.itemDepartmentId === formData.departmentId || cat.itemDepartmentId?._id === formData.departmentId)
                .map(cat => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Family Name" required>
            <Input 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              placeholder="e.g. Laptops"
              required 
            />
          </FormField>

          <FormField label="Family Code">
            <Input 
              value={formData.code} 
              onChange={(e) => setFormData({ ...formData, code: e.target.value })} 
              placeholder="e.g. LAP"
            />
          </FormField>

          <FormField label="Status">
            <div className="flex items-center gap-2 mt-2">
              <input 
                type="checkbox" 
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
              />
              <label htmlFor="isActive" className="text-sm font-medium">Active</label>
            </div>
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingId ? 'Update' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

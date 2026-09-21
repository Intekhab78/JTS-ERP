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

export default function SubFamilyMaster() {
  const [subFamilies, setSubFamilies] = useState([]);
  const [families, setFamilies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ departmentId: '', categoryId: '', familyId: '', name: '', code: '', isActive: true });
  const [editingId, setEditingId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [sfRes, fRes, cRes, dRes] = await Promise.all([
        axios.get('http://localhost:5000/api/v1/hierarchy/subfamilies', { headers }),
        axios.get('http://localhost:5000/api/v1/hierarchy/families', { headers }),
        axios.get('http://localhost:5000/api/v1/inventory/categories', { headers }),
        axios.get('http://localhost:5000/api/v1/hierarchy/departments', { headers })
      ]);
      
      setSubFamilies(sfRes.data);
      setFamilies(fRes.data);
      setCategories(cRes.data);
      setDepartments(dRes.data);
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
      
      let deptId = '';
      let catId = '';
      if (item.familyId) {
        const fam = families.find(f => f._id === (item.familyId._id || item.familyId));
        if (fam && fam.categoryId) {
          catId = fam.categoryId._id || fam.categoryId;
          const cat = categories.find(c => c._id === catId);
          if (cat && cat.itemDepartmentId) {
            deptId = cat.itemDepartmentId._id || cat.itemDepartmentId;
          }
        }
      }
      
      setFormData({ 
        departmentId: deptId,
        categoryId: catId,
        familyId: item.familyId?._id || item.familyId || '', 
        name: item.name, 
        code: item.code || '', 
        isActive: item.isActive !== false 
      });
    } else {
      setEditingId(null);
      setFormData({ departmentId: '', categoryId: '', familyId: '', name: '', code: '', isActive: true });
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
        await axios.put(`http://localhost:5000/api/v1/hierarchy/subfamilies/${editingId}`, formData, { headers });
      } else {
        await axios.post('http://localhost:5000/api/v1/hierarchy/subfamilies', formData, { headers });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save Sub Family');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Sub Family?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/v1/hierarchy/subfamilies/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete Sub Family');
    }
  };

  const columns = [
    { header: 'Sub Family Name', accessorKey: 'name' },
    { header: 'Code', accessorKey: 'code' },
    { 
      header: 'Parent Family', 
      cell: (row) => row.familyId?.name || '-'
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
        title="Sub Family Master" 
        actions={
          <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
            <Plus size={16} /> Add Sub Family
          </Button>
        }
      />

      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <DataTable 
          columns={columns} 
          data={subFamilies} 
          loading={loading}
          searchable
          searchField="name"
        />
      </Card>

      {isModalOpen && (
        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title={editingId ? 'Edit Sub Family' : 'New Sub Family'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert variant="destructive">{error}</Alert>}
            
            <FormField label="Department" required>
              <Select
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value, categoryId: '', familyId: '' })}
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
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value, familyId: '' })}
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

            <FormField label="Parent Family" required>
              <Select
                value={formData.familyId}
                onChange={(e) => setFormData({ ...formData, familyId: e.target.value })}
                required
                disabled={!formData.categoryId}
              >
                <option value="">Select Family</option>
                {families
                  .filter(f => f.categoryId === formData.categoryId || f.categoryId?._id === formData.categoryId)
                  .map(fam => (
                  <option key={fam._id} value={fam._id}>{fam.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Sub Family Name" required>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                required 
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
              <Button type="submit">Save Sub Family</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

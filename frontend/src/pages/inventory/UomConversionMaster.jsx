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

export default function UomConversionMaster() {
  const [conversions, setConversions] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ fromUom: '', toUom: '', conversionFactor: '', isActive: true });
  const [editingId, setEditingId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [convRes, uomRes] = await Promise.all([
        axios.get('/api/v1/inventory/uom-conversions?includeInactive=true', { headers }),
        axios.get('/api/v1/inventory/uoms', { headers })
      ]);
      
      setConversions(convRes.data);
      setUoms(uomRes.data);
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

  const handleOpenModal = (conversion = null) => {
    setError('');
    if (conversion) {
      setEditingId(conversion._id);
      setFormData({ 
        fromUom: conversion.fromUom, 
        toUom: conversion.toUom, 
        conversionFactor: conversion.conversionFactor,
        isActive: conversion.isActive 
      });
    } else {
      setEditingId(null);
      setFormData({ fromUom: '', toUom: '', conversionFactor: '', isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.fromUom === formData.toUom && Number(formData.conversionFactor) !== 1) {
      setError('Conversion factor must be 1 if From UOM and To UOM are the same.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      if (editingId) {
        await axios.put(`/api/v1/inventory/uom-conversions/${editingId}`, formData, { headers });
      } else {
        await axios.post('/api/v1/inventory/uom-conversions', formData, { headers });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save Conversion');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this conversion?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/inventory/uom-conversions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete conversion');
    }
  };

  const columns = [
    { header: 'From UOM', accessorKey: 'fromUom' },
    { header: 'Conversion Factor', accessorKey: 'conversionFactor' },
    { header: 'To UOM', accessorKey: 'toUom' },
    { 
      header: 'Preview',
      cell: (row) => <span className="font-mono text-sm text-gray-700 bg-gray-50 px-2 py-1 rounded border">1 {row.fromUom} = {row.conversionFactor} {row.toUom}</span>
    },
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
        title="UOM Conversion Master" 
        description="Manage Unit Conversions globally"
        actions={
          <Button onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Conversion
          </Button>
        }
      />

      <Card className="p-6">
        <DataTable 
          data={conversions}
          columns={columns}
          loading={loading}
          searchable
          searchField="fromUom"
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Conversion' : 'Create Conversion'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          
          <div className="grid grid-cols-2 gap-4">
            <FormField label="From UOM" required>
              <Select 
                required 
                value={formData.fromUom} 
                onChange={e => setFormData({...formData, fromUom: e.target.value})}
              >
                <option value="">Select UOM...</option>
                {uoms.map(u => <option key={u._id} value={u.name}>{u.name} ({u.code})</option>)}
              </Select>
            </FormField>

            <FormField label="To UOM" required>
              <Select 
                required 
                value={formData.toUom} 
                onChange={e => setFormData({...formData, toUom: e.target.value})}
              >
                <option value="">Select UOM...</option>
                {uoms.map(u => <option key={u._id} value={u.name}>{u.name} ({u.code})</option>)}
              </Select>
            </FormField>
          </div>

          <FormField label="Conversion Factor" required>
            <Input 
              type="number"
              step="any"
              min="0.0000000001"
              required 
              value={formData.conversionFactor} 
              onChange={e => setFormData({...formData, conversionFactor: e.target.value})} 
              placeholder="e.g. 12"
            />
            <p className="text-xs text-gray-500 mt-1">1 {formData.fromUom || '[From]'} = {formData.conversionFactor || '[Factor]'} {formData.toUom || '[To]'}</p>
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
              {editingId ? 'Update Conversion' : 'Save Conversion'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable as Table } from '../../components/common/DataTable';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { FormField } from '../../components/common/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PageSkeleton } from '../../components/common/PageSkeleton';

const TaxMaster = () => {
  const [taxes, setTaxes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTax, setEditingTax] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    rate: '',
    type: 'Percentage',
    isActive: true
  });

  useEffect(() => {
    fetchTaxes();
  }, []);

  const fetchTaxes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/taxes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTaxes(res.data);
    } catch (error) {
      console.error('Failed to fetch taxes', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (editingTax) {
        await axios.put(`/api/v1/taxes/${editingTax._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/v1/taxes', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setIsModalOpen(false);
      fetchTaxes();
    } catch (error) {
      console.error('Failed to save tax', error);
      alert('Error saving tax record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to disable this tax?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/taxes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTaxes();
    } catch (error) {
      console.error('Failed to delete tax', error);
      alert('Error deleting tax record');
    }
  };

  const columns = [
    { header: 'Tax Name', accessorKey: 'name' },
    { 
      header: 'Rate', 
      cell: (tax) => (
        <span className="font-semibold">
          {tax.rate}{tax.type === 'Percentage' ? '%' : ''}
        </span>
      )
    },
    { header: 'Type', accessorKey: 'type' },
    {
      header: 'Status',
      cell: (tax) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${tax.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {tax.isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      header: 'Actions',
      cell: (tax) => (
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setEditingTax(tax);
              setFormData({
                name: tax.name,
                rate: tax.rate,
                type: tax.type,
                isActive: tax.isActive
              });
              setIsModalOpen(true);
            }}
            className="p-1 text-gray-500 hover:text-primary transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => handleDelete(tax._id)}
            className="p-1 text-gray-500 hover:text-red-500 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 max-w-[1720px] mx-auto pb-10 bg-[#f8fafc] min-h-screen">
      
      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl mt-4 sm:mx-4 lg:mx-8 mb-6">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">Tax Master</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl">
              FINANCIAL COMPLIANCE • TAX RATES & GROUPS
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-3 bg-[#111827] border border-slate-800 p-2 rounded-lg shadow-inner">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">System Online</span>
            </div>
            <button 
              onClick={() => {
                setEditingTax(null);
                setFormData({ name: '', rate: '', type: 'Percentage', isActive: true });
                setIsModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-bold text-sm tracking-wider uppercase transition-colors shadow-lg border border-blue-400 flex items-center gap-2"
            >
              <Plus size={16} strokeWidth={3} /> New Tax
            </button>
          </div>
        </div>
      </div>
      <div className="px-4 sm:px-6 lg:px-8 space-y-6">

      <Card>
        <CardContent className="p-0">
          <Table columns={columns} data={taxes} />
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTax ? 'Edit Tax Rate' : 'Create Tax Rate'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormField label="Tax Name" required>
            <Input 
              required
              placeholder="e.g., Standard VAT 5%"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </FormField>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Rate" required>
              <Input 
                type="number"
                step="0.01"
                required
                placeholder="e.g., 5"
                value={formData.rate}
                onChange={e => setFormData({...formData, rate: e.target.value})}
              />
            </FormField>
            
            <FormField label="Type" required>
              <Select
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
              >
                <option value="Percentage">Percentage (%)</option>
                <option value="Fixed">Fixed Amount</option>
              </Select>
            </FormField>
          </div>
          
          {editingTax && (
            <FormField label="Status">
              <label className="flex items-center gap-2 cursor-pointer mt-2">
                <input 
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  className="rounded text-primary focus:ring-primary w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </FormField>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>Save Tax</Button>
          </div>
        </form>
      </Modal>
      </div>
    </div>
  );
};

export default TaxMaster;

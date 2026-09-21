import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Plus, Trash2, ArrowLeft, Building } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import FormField from '../../components/common/FormField';
import { Card } from '../../components/common/Card';

export default function ConsignmentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    supplierId: '',
    defaultBranchId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: '',
    items: []
  });

  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLookups();
    if (isEdit) fetchConsignment();
  }, [id]);

  const fetchLookups = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [suppRes, branchRes, prodRes] = await Promise.all([
        axios.get('http://localhost:5000/api/v1/suppliers', { headers }),
        axios.get('http://localhost:5000/api/v1/branches', { headers }),
        axios.get('http://localhost:5000/api/v1/inventory/products', { headers })
      ]);
      setSuppliers(suppRes.data);
      setBranches(branchRes.data);
      setProducts(prodRes.data);
    } catch (error) {
      console.error('Failed to load lookups', error);
    }
  };

  const fetchConsignment = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/v1/consignments/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const c = res.data.data;
      setFormData({
        supplierId: c.supplierId._id,
        defaultBranchId: c.defaultBranchId?._id || '',
        startDate: c.startDate ? new Date(c.startDate).toISOString().split('T')[0] : '',
        endDate: c.endDate ? new Date(c.endDate).toISOString().split('T')[0] : '',
        notes: c.notes || '',
        items: c.items.map(i => ({ ...i, productId: i.productId._id }))
      });
    } catch (error) {
      alert('Failed to load consignment');
      navigate('/purchases/consignments');
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', agreedQuantity: 0, unitPrice: 0 }]
    });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplierId) return alert('Supplier is required');
    if (formData.items.length === 0) return alert('At least one item is required');

    setLoading(true);
    try {
      const url = isEdit ? `http://localhost:5000/api/v1/consignments/${id}` : `http://localhost:5000/api/v1/consignments`;
      const method = isEdit ? 'put' : 'post';
      
      const res = await axios[method](url, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      navigate(`/purchases/consignments/${res.data.data._id}`);
    } catch (error) {
      alert(error.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate('/purchases/consignments')} className="p-2">
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{isEdit ? 'Edit Consignment Agreement' : 'New Consignment Agreement'}</h1>
          <p className="text-slate-600">Establish the rules for supplier-owned inventory.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Building size={18} /> Header Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Supplier *" required>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.supplierId}
                onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                required
              >
                <option value="">Select a supplier...</option>
                {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </FormField>

            <FormField label="Default Branch">
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.defaultBranchId}
                onChange={e => setFormData({ ...formData, defaultBranchId: e.target.value })}
              >
                <option value="">Select branch...</option>
                {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </FormField>

            <FormField label="Start Date *" required>
              <input
                type="date"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </FormField>

            <FormField label="End Date (Optional)">
              <input
                type="date"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.endDate}
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
              />
            </FormField>
          </div>
          <div className="mt-4">
            <FormField label="Notes / Terms">
              <textarea
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="2"
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </FormField>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Agreed Items</h3>
            <Button type="button" variant="outline" onClick={addItem} leftIcon={<Plus size={16} />}>
              Add Product
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-slate-500 text-sm">
                  <th className="p-3 w-1/2">Product *</th>
                  <th className="p-3 w-1/4">Agreed Max Qty *</th>
                  <th className="p-3 w-1/4">Agreed Unit Price *</th>
                  <th className="p-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {formData.items.map((item, index) => (
                  <tr key={index} className="border-b border-slate-100">
                    <td className="p-3">
                      <select
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        value={item.productId}
                        onChange={(e) => updateItem(index, 'productId', e.target.value)}
                        required
                      >
                        <option value="">Select product...</option>
                        {products.map(p => (
                          <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        min="0"
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 text-right"
                        value={item.agreedQuantity}
                        onChange={(e) => updateItem(index, 'agreedQuantity', Number(e.target.value))}
                        required
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 text-right"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                        required
                      />
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {formData.items.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-6 text-center text-slate-500 italic">
                      No items added. Click "Add Product" to define consignment terms.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={() => navigate('/purchases/consignments')}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            {isEdit ? 'Save Changes' : 'Create Agreement'}
          </Button>
        </div>
      </form>
    </div>
  );
}

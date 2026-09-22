import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Check, Package } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import FormField from '../../components/common/FormField';
import { Card } from '../../components/common/Card';

export default function ConsignmentReceiptForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialConsignmentId = location.state?.consignmentId || '';

  const [formData, setFormData] = useState({
    consignmentId: initialConsignmentId,
    branchId: '',
    notes: '',
    items: []
  });

  const [consignments, setConsignments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLookups();
  }, []);

  useEffect(() => {
    if (formData.consignmentId) {
      loadConsignmentItems(formData.consignmentId);
    }
  }, [formData.consignmentId]);

  const fetchLookups = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [consRes, branchRes] = await Promise.all([
        axios.get('/api/v1/consignments?limit=100', { headers }),
        axios.get('/api/v1/branches', { headers })
      ]);
      setConsignments(consRes.data.data.filter(c => c.status === 'ACTIVE'));
      setBranches(branchRes.data);
    } catch (error) {
      console.error('Failed to load lookups', error);
    }
  };

  const loadConsignmentItems = async (consignmentId) => {
    try {
      const res = await axios.get(`/api/v1/consignments/${consignmentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const c = res.data.data;
      if (c.defaultBranchId) {
        setFormData(prev => ({ ...prev, branchId: c.defaultBranchId._id }));
      }
      
      const defaultItems = c.items.map(item => ({
        productId: item.productId._id,
        productName: item.productId.name,
        sku: item.productId.sku,
        receivedQuantity: 0,
        acceptedQuantity: 0,
        rejectedQuantity: 0,
        baseQuantity: 0,
        unitPrice: item.unitPrice
      }));
      setFormData(prev => ({ ...prev, items: defaultItems }));
    } catch (error) {
      console.error('Failed to load consignment details', error);
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    if (field === 'receivedQuantity' || field === 'rejectedQuantity') {
      const rec = Number(newItems[index].receivedQuantity) || 0;
      const rej = Number(newItems[index].rejectedQuantity) || 0;
      newItems[index].acceptedQuantity = Math.max(0, rec - rej);
      newItems[index].baseQuantity = newItems[index].acceptedQuantity; // Assuming conversionFactor = 1 for now
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.consignmentId) return alert('Consignment Agreement is required');
    if (!formData.branchId) return alert('Receiving Branch is required');
    
    const validItems = formData.items.filter(i => i.receivedQuantity > 0);
    if (validItems.length === 0) return alert('At least one item must have a received quantity > 0');

    setLoading(true);
    try {
      const payload = { ...formData, items: validItems };
      const res = await axios.post(`/api/v1/consignment-receipts`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      navigate(`/purchases/consignments/receipts/${res.data.data._id}`);
    } catch (error) {
      alert(error.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate('/purchases/consignments/receipts')} className="p-2">
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">New Consignment Receipt</h1>
          <p className="text-slate-600">Receive supplier-owned inventory into the warehouse.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Consignment Agreement *" required>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.consignmentId}
                onChange={e => setFormData({ ...formData, consignmentId: e.target.value })}
                required
              >
                <option value="">Select agreement...</option>
                {consignments.map(c => <option key={c._id} value={c._id}>{c.consignmentNumber} - {c.supplierId?.name}</option>)}
              </select>
            </FormField>

            <FormField label="Receiving Branch *" required>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.branchId}
                onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                required
              >
                <option value="">Select branch...</option>
                {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </FormField>
          </div>
          <div className="mt-4">
            <FormField label="Notes">
              <textarea
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="2"
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </FormField>
          </div>
        </Card>

        {formData.items.length > 0 && (
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Package size={18} className="text-blue-600" /> Receiving Items
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4 font-medium">Product</th>
                    <th className="p-4 font-medium text-right">Received Qty</th>
                    <th className="p-4 font-medium text-right">Rejected Qty</th>
                    <th className="p-4 font-medium text-right text-green-600">Accepted Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {formData.items.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/50">
                      <td className="p-4">
                        <div className="font-medium text-slate-900">{item.productName}</div>
                        <div className="text-xs text-slate-500">SKU: {item.sku}</div>
                      </td>
                      <td className="p-4">
                        <input
                          type="number"
                          min="0"
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 text-right"
                          value={item.receivedQuantity || ''}
                          onChange={(e) => updateItem(index, 'receivedQuantity', Number(e.target.value))}
                        />
                      </td>
                      <td className="p-4">
                        <input
                          type="number"
                          min="0"
                          max={item.receivedQuantity}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-red-500 text-right"
                          value={item.rejectedQuantity || ''}
                          onChange={(e) => updateItem(index, 'rejectedQuantity', Number(e.target.value))}
                        />
                      </td>
                      <td className="p-4 text-right font-bold text-green-600">
                        {item.acceptedQuantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={() => navigate('/purchases/consignments/receipts')}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            Create Receipt
          </Button>
        </div>
      </form>
    </div>
  );
}

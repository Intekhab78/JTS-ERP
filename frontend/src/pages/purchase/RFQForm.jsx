import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';

export default function RFQForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [formData, setFormData] = useState({
    supplierId: '',
    branchId: '',
    expectedDate: '',
    currency: 'AED',
    paymentTerms: '',
    notes: '',
    items: []
  });

  const [loading, setLoading] = useState(false);

  const [rfqStatus, setRfqStatus] = useState('DRAFT');

  useEffect(() => {
    fetchFormData();
    if (isEditing) fetchRFQ();
  }, [id]);

  const fetchFormData = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [supRes, brRes, prodRes] = await Promise.all([
        axios.get('/api/v1/suppliers', { headers }),
        axios.get('/api/v1/branches', { headers }),
        axios.get('/api/v1/inventory/products', { headers })
      ]);
      setSuppliers(supRes.data);
      setBranches(brRes.data);
      setProducts(prodRes.data);
    } catch (error) {
      console.error(error);
      alert('Failed to load form data');
    }
  };

  const fetchRFQ = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/v1/rfqs/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const { rfq, items } = res.data;
      setRfqStatus(rfq.status);
      
      if (rfq.status !== 'DRAFT') {
        alert('Only DRAFT RFQs can be edited. Redirecting to view mode.');
        navigate(`/purchases/rfqs/${id}`);
        return;
      }

      setFormData({
        supplierId: rfq.supplierId?._id || rfq.supplierId,
        branchId: rfq.branchId?._id || rfq.branchId,
        expectedDate: rfq.expectedDate ? new Date(rfq.expectedDate).toISOString().split('T')[0] : '',
        currency: rfq.currency || 'AED',
        paymentTerms: rfq.paymentTerms || '',
        notes: rfq.notes || '',
        items: items.map(i => ({
          productId: i.productId?._id || i.productId,
          description: i.description || '',
          quantity: i.quantity,
          uom: i.uom,
          unitCost: i.unitCost,
          subTotal: i.subTotal
        }))
      });
    } catch (error) {
      console.error(error);
      alert('Failed to fetch RFQ details');
      navigate('/purchases/rfqs');
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index, field, value) => {
    if (rfqStatus !== 'DRAFT') return;
    const newItems = [...formData.items];
    const item = newItems[index];

    if (field === 'productId') {
      const product = products.find(p => p._id === value);
      if (product) {
        item.description = product.description || product.name;
        item.uom = product.unitOfMeasure || 'PCS';
        item.unitCost = product.costPrice || 0;
      }
    }

    if (field === 'quantity' || field === 'unitCost') {
      // Remove leading zeros by converting to string then Number, unless it's empty
      item[field] = value === '' ? '' : Number(value).toString() === 'NaN' ? '' : Number(value);
    } else {
      item[field] = value;
    }

    item.subTotal = (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);

    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    if (rfqStatus !== 'DRAFT') return;
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', description: '', quantity: 1, uom: 'PCS', unitCost: 0, subTotal: 0 }]
    });
  };

  const removeItem = (index) => {
    if (rfqStatus !== 'DRAFT') return;
    const newItems = formData.items.filter((_, idx) => idx !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rfqStatus !== 'DRAFT') return;
    
    if (formData.items.length === 0) {
      return alert('Please add at least one item');
    }
    
    // Validation
    const invalidItems = formData.items.some(i => !i.productId || i.quantity <= 0 || i.unitCost < 0);
    if (invalidItems) {
      return alert('All items must have a valid product, quantity > 0, and unit cost >= 0');
    }

    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      if (isEditing) {
        await axios.put(`/api/v1/rfqs/${id}`, formData, { headers });
        alert('RFQ updated successfully');
        navigate(`/purchases/rfqs/${id}`);
      } else {
        await axios.post('/api/v1/rfqs', formData, { headers });
        navigate('/purchases/rfqs');
      }
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Failed to save RFQ');
    }
  };

  const totalAmount = formData.items.reduce((sum, item) => sum + (item.subTotal || 0), 0);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/purchases/rfqs')} className="text-muted-foreground p-2">
          <ArrowLeft size={20} />
        </Button>
        <PageHeader 
          title={isEditing ? 'Edit Request for Quotation' : 'New Request for Quotation'}
          description="Create a new RFQ to send to your supplier."
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Supplier *</label>
              <select required disabled={rfqStatus !== 'DRAFT'} value={formData.supplierId} onChange={e => setFormData({...formData, supplierId: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100">
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Branch *</label>
              <select required disabled={rfqStatus !== 'DRAFT'} value={formData.branchId} onChange={e => setFormData({...formData, branchId: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100">
                <option value="">Select Branch</option>
                {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery Date</label>
              <input type="date" disabled={rfqStatus !== 'DRAFT'} value={formData.expectedDate} onChange={e => setFormData({...formData, expectedDate: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
              <input type="text" disabled={rfqStatus !== 'DRAFT'} placeholder="e.g. Net 30" value={formData.paymentTerms} onChange={e => setFormData({...formData, paymentTerms: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100" />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea rows={2} disabled={rfqStatus !== 'DRAFT'} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100" placeholder="Internal notes or terms..."></textarea>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800">Order Lines</h3>
            {rfqStatus === 'DRAFT' && (
              <Button type="button" variant="outline" size="sm" onClick={addItem} leftIcon={<Plus size={16} />}>
                Add Product
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                  <th className="p-3 font-medium min-w-[200px]">Product *</th>
                  <th className="p-3 font-medium">Description</th>
                  <th className="p-3 font-medium w-24">Quantity *</th>
                  <th className="p-3 font-medium w-24">UOM</th>
                  <th className="p-3 font-medium w-32">Unit Price *</th>
                  <th className="p-3 font-medium w-32">Subtotal</th>
                  <th className="p-3 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {formData.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2">
                      <select required disabled={rfqStatus !== 'DRAFT'} value={item.productId} onChange={e => handleItemChange(idx, 'productId', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100">
                        <option value="">Select Product</option>
                        {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <input type="text" disabled={rfqStatus !== 'DRAFT'} value={item.description} onChange={e => handleItemChange(idx, 'description', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100" />
                    </td>
                    <td className="p-2">
                      <input type="number" min="1" disabled={rfqStatus !== 'DRAFT'} required value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100" />
                    </td>
                    <td className="p-2">
                      <input type="text" disabled={rfqStatus !== 'DRAFT'} value={item.uom} onChange={e => handleItemChange(idx, 'uom', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100" />
                    </td>
                    <td className="p-2">
                      <input type="number" min="0" step="0.01" disabled={rfqStatus !== 'DRAFT'} required value={item.unitCost} onChange={e => handleItemChange(idx, 'unitCost', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100" />
                    </td>
                    <td className="p-2 font-medium text-slate-700">
                      {formData.currency} {item.subTotal.toFixed(2)}
                    </td>
                    <td className="p-2 text-center">
                      {rfqStatus === 'DRAFT' && (
                        <button type="button" onClick={() => removeItem(idx)} className="text-slate-400 hover:text-red-500 p-1">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {formData.items.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-4 text-center text-slate-500 italic">No items added yet. Click "Add Product" to begin.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-end mt-6 pt-4 border-t border-slate-200">
            <div className="w-64 space-y-3">
              <div className="flex justify-between items-center text-lg font-bold text-slate-800">
                <span>Total:</span>
                <span>{formData.currency} {totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Card>
        
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/purchases/rfqs')}>
            {rfqStatus === 'DRAFT' ? 'Cancel' : 'Back'}
          </Button>
          {rfqStatus === 'DRAFT' && (
            <Button type="submit" leftIcon={<Save size={16} />}>
              {isEditing ? 'Save Changes' : 'Create RFQ'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

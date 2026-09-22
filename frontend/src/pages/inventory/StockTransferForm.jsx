import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';

const StockTransferForm = () => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    sourceBranchId: '',
    destinationBranchId: '',
    items: [{ productId: '', quantity: 1 }]
  });

  useEffect(() => {
    fetchBranches();
    fetchProducts();
  }, []);

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/branches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranches(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/inventory/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/v1/stock/transfers', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/inventory/transfers');
    } catch (error) {
      alert(error.response?.data?.message || 'Error creating transfer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title="New Stock Transfer"
        description="Create a draft transfer between branches."
        onBack={() => navigate('/inventory/transfers')}
      />

      <form onSubmit={handleSubmit}>
        <Card className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Source Branch</label>
              <select 
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={formData.sourceBranchId}
                onChange={e => setFormData({...formData, sourceBranchId: e.target.value})}
              >
                <option value="">Select Branch</option>
                {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Destination Branch</label>
              <select 
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={formData.destinationBranchId}
                onChange={e => setFormData({...formData, destinationBranchId: e.target.value})}
              >
                <option value="">Select Branch</option>
                {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Items</h3>
            {formData.items.map((item, index) => (
              <div key={index} className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Product</label>
                  <select 
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={item.productId}
                    onChange={e => {
                      const newItems = [...formData.items];
                      newItems[index].productId = e.target.value;
                      setFormData({...formData, items: newItems});
                    }}
                  >
                    <option value="">Select Product</option>
                    {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="w-32 space-y-2">
                  <label className="text-sm font-medium">Quantity</label>
                  <input 
                    type="number" 
                    required min="1"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={item.quantity}
                    onChange={e => {
                      const newItems = [...formData.items];
                      newItems[index].quantity = Number(e.target.value);
                      setFormData({...formData, items: newItems});
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-4 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/inventory/transfers')}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              Create Draft Transfer
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
};

export default StockTransferForm;

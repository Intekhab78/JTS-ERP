import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';

const StockMovements = () => {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      fetchMovements();
    } else {
      setMovements([]);
    }
  }, [selectedBranch]);

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/v1/branches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranches(res.data);
      if (res.data.length > 0) {
        setSelectedBranch(res.data[0]._id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/v1/stock/movements/${selectedBranch}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMovements(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type) => {
    if (['GRN', 'TRANSFER_IN', 'MANUFACTURING_PRODUCTION'].includes(type)) return 'text-green-600 bg-green-50';
    if (['DELIVERY', 'TRANSFER_OUT', 'MANUFACTURING_CONSUMPTION'].includes(type)) return 'text-red-600 bg-red-50';
    return 'text-blue-600 bg-blue-50';
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title="Stock Movements"
        description="Inventory Ledger of all physical stock changes."
      />

      <Card>
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4 items-center w-full sm:max-w-md">
            <select 
              value={selectedBranch} 
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="">Select Branch</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Reference</th>
                <th className="px-6 py-3 font-medium">Product</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium text-right">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-muted-foreground">Loading movements...</td></tr>
              ) : movements.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-muted-foreground">No stock movements found.</td></tr>
              ) : (
                movements.map(m => (
                  <tr key={m._id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">{new Date(m.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 font-medium">{m.referenceId}</td>
                    <td className="px-6 py-4">{m.productId?.name || 'Unknown Product'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getTypeColor(m.type)}`}>
                        {m.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-medium ${m.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default StockMovements;

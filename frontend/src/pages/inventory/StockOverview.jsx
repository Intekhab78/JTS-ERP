import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';

const StockOverview = () => {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      fetchStock();
    } else {
      setStock([]);
    }
  }, [selectedBranch]);

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/branches', {
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

  const fetchStock = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/v1/stock/${selectedBranch}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStock(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title="Stock Overview"
        description="View current physical stock levels by branch."
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
            <SearchInput placeholder="Search product..." />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-6 py-3 font-medium">Product</th>
                <th className="px-6 py-3 font-medium text-right">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="2" className="px-6 py-8 text-center text-muted-foreground">Loading stock...</td></tr>
              ) : stock.length === 0 ? (
                <tr><td colSpan="2" className="px-6 py-8 text-center text-muted-foreground">No stock available in this branch.</td></tr>
              ) : (
                stock.map(s => (
                  <tr key={s._id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{s.productId?.name || 'Unknown Product'}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.quantity <= 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {s.quantity}
                      </span>
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

export default StockOverview;

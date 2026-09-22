import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Plus, CheckCircle } from 'lucide-react';

const StockAdjustments = () => {
  const navigate = useNavigate();
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAdjustments();
  }, []);

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/stock/adjustments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdjustments(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const validateAdjustment = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/v1/stock/adjustments/${id}/validate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAdjustments();
    } catch (error) {
      alert(error.response?.data?.message || 'Error validating adjustment');
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title="Stock Adjustments"
        description="Manage physical inventory counts and adjustments."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/inventory/adjustments/new')}>
            New Adjustment
          </Button>
        }
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-6 py-3 font-medium">Reference</th>
                <th className="px-6 py-3 font-medium">Branch</th>
                <th className="px-6 py-3 font-medium">Reason</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-muted-foreground">Loading adjustments...</td></tr>
              ) : adjustments.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-muted-foreground">No adjustments found.</td></tr>
              ) : (
                adjustments.map(a => (
                  <tr key={a._id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{a.referenceNumber}</td>
                    <td className="px-6 py-4">{a.branchId?.name}</td>
                    <td className="px-6 py-4">{a.reason}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${a.status === 'VALIDATED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {a.status === 'DRAFT' && (
                        <Button size="sm" onClick={() => validateAdjustment(a._id)} leftIcon={<CheckCircle className="h-4 w-4" />}>
                          Validate
                        </Button>
                      )}
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

export default StockAdjustments;

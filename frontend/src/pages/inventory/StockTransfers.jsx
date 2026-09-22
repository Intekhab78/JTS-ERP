import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Plus, CheckCircle } from 'lucide-react';

const StockTransfers = () => {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/stock/transfers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransfers(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const validateTransfer = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/v1/stock/transfers/${id}/validate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTransfers();
    } catch (error) {
      alert(error.response?.data?.message || 'Error validating transfer');
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title="Stock Transfers"
        description="Manage inter-branch inventory transfers."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/inventory/transfers/new')}>
            New Transfer
          </Button>
        }
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-6 py-3 font-medium">Reference</th>
                <th className="px-6 py-3 font-medium">Source</th>
                <th className="px-6 py-3 font-medium">Destination</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-muted-foreground">Loading transfers...</td></tr>
              ) : transfers.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-muted-foreground">No transfers found.</td></tr>
              ) : (
                transfers.map(t => (
                  <tr key={t._id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{t.referenceNumber}</td>
                    <td className="px-6 py-4">{t.sourceBranchId?.name}</td>
                    <td className="px-6 py-4">{t.destinationBranchId?.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${t.status === 'VALIDATED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {t.status === 'DRAFT' && (
                        <Button size="sm" onClick={() => validateTransfer(t._id)} leftIcon={<CheckCircle className="h-4 w-4" />}>
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

export default StockTransfers;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Edit, Eye } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export default function SalesReturns() {
  const [returns, setReturns] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const res = await axios.get('/api/v1/sales/returns', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setReturns(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT': return <Badge variant="secondary">DRAFT</Badge>;
      case 'CONFIRMED': return <Badge className="bg-indigo-100 text-indigo-800">CONFIRMED</Badge>;
      case 'VALIDATED': return <Badge variant="success">VALIDATED</Badge>;
      case 'CANCELLED': return <Badge variant="destructive">CANCELLED</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sales Returns</h1>
          <p className="text-slate-600">Manage goods returned by customers.</p>
        </div>
        <Button onClick={() => navigate('/sales/returns/new')} leftIcon={<Plus size={18} />}>
          New Return
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Return Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Delivery Note</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {returns.map(sr => (
              <tr key={sr._id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                  {sr.returnNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {sr.customerId?.name || 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {sr.deliveryNoteId?.deliveryNoteNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {new Date(sr.returnDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {getStatusBadge(sr.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  {sr.status === 'DRAFT' ? (
                    <button 
                      onClick={() => navigate(`/sales/returns/edit/${sr._id}`)}
                      className="text-slate-400 hover:text-blue-600 p-1.5"
                    >
                      <Edit size={16} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => navigate(`/sales/returns/${sr._id}`)}
                      className="text-slate-400 hover:text-indigo-600 p-1.5"
                    >
                      <Eye size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {returns.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-sm">
            No sales returns found.
          </div>
        )}
      </div>
    </div>
  );
}

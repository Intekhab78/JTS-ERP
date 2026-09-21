import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Edit, Eye } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export default function RFQs() {
  const [rfqs, setRfqs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRFQs();
  }, []);

  const fetchRFQs = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/rfqs', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRfqs(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT': return <Badge variant="secondary">DRAFT</Badge>;
      case 'SENT': return <Badge variant="info">SENT</Badge>;
      case 'QUOTED': return <Badge className="bg-purple-100 text-purple-800">QUOTED</Badge>;
      case 'CONFIRMED': return <Badge variant="success">CONFIRMED</Badge>;
      case 'CANCELLED': return <Badge variant="destructive">CANCELLED</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Requests for Quotation (RFQ)</h1>
          <p className="text-slate-600">Manage vendor quotation requests.</p>
        </div>
        <Button onClick={() => navigate('/purchases/rfqs/new')} leftIcon={<Plus size={18} />}>
          New RFQ
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">RFQ Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Supplier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Branch</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rfqs.map(rfq => (
              <tr key={rfq._id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                  {rfq.rfqNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {rfq.supplierId?.name || 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {rfq.branchId?.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {rfq.currency} {rfq.totalAmount?.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {getStatusBadge(rfq.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  {rfq.status === 'DRAFT' ? (
                    <button 
                      onClick={() => navigate(`/purchases/rfqs/edit/${rfq._id}`)}
                      className="text-slate-400 hover:text-blue-600 p-1.5"
                    >
                      <Edit size={16} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => navigate(`/purchases/rfqs/${rfq._id}`)}
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
      </div>
    </div>
  );
}

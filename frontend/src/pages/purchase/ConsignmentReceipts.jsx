import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Search, Eye } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export default function ConsignmentReceipts() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const navigate = useNavigate();

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchReceipts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, page]);

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/v1/consignment-receipts?page=${page}&limit=20&search=${search}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setReceipts(res.data.data || []);
      setPagination(res.data.pagination || { total: 0, pages: 1 });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Consignment Receipts</h1>
          <p className="text-slate-600">Receive supplier-owned inventory into your physical warehouse.</p>
        </div>
        <Button onClick={() => navigate('/purchases/consignments/receipts/new')} leftIcon={<Plus size={18} />}>
          New Receipt
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by Receipt No..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Receipt No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Agreement</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Supplier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {loading ? (
              <tr><td colSpan="6" className="px-6 py-4 text-center text-slate-500">Loading...</td></tr>
            ) : receipts.length === 0 ? (
              <tr><td colSpan="6" className="px-6 py-4 text-center text-slate-500">No receipts found.</td></tr>
            ) : (
              receipts.map(r => (
                <tr key={r._id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button onClick={() => navigate(`/purchases/consignments/receipts/${r._id}`)} className="text-blue-600 hover:underline font-medium">
                      {r.receiptNumber}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {r.consignmentId?.consignmentNumber || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {r.supplierId?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {r.branchId?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(r.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => navigate(`/purchases/consignments/receipts/${r._id}`)} className="text-slate-600 hover:text-blue-900 p-1">
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Showing page {page} of {pagination.pages} ({pagination.total} total)
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages || loading}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, MapPin, Package, RefreshCw, LogOut } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function ConsignmentStock() {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'consume' or 'return'
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionQuantity, setActionQuantity] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchStock();
  }, [page]);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/v1/consignment-stock?page=${page}&limit=20`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStock(res.data.data);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (item, type) => {
    setSelectedItem(item);
    setModalType(type);
    setActionQuantity('');
    setActionReason('');
    setShowModal(true);
  };

  const handleAction = async (e) => {
    e.preventDefault();
    if (!actionQuantity || actionQuantity <= 0) return alert('Quantity must be greater than 0');
    if (actionQuantity > selectedItem.availableQuantity) return alert('Cannot exceed available quantity');

    setActionLoading(true);
    try {
      const endpoint = modalType === 'consume' ? 'consume' : 'return';
      await axios.post(`/api/v1/consignment-stock/stock/${selectedItem._id}/${endpoint}`, {
        quantity: Number(actionQuantity),
        reason: actionReason
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setShowModal(false);
      fetchStock();
    } catch (error) {
      alert(error.response?.data?.message || `Failed to ${modalType}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Consignment Stock</h1>
          <p className="text-slate-600">Monitor and manage supplier-owned inventory physically present in your branches.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Supplier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider text-blue-600">Received</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider text-green-600">Consumed</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider text-orange-600">Returned</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-900 uppercase tracking-wider">Available</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {loading ? (
              <tr><td colSpan="8" className="px-6 py-4 text-center text-slate-500">Loading...</td></tr>
            ) : stock.length === 0 ? (
              <tr><td colSpan="8" className="px-6 py-4 text-center text-slate-500">No stock found.</td></tr>
            ) : (
              stock.map(s => (
                <tr key={s._id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900 flex items-center gap-2">
                      <Package size={16} className="text-slate-400"/> {s.productId?.name}
                    </div>
                    <div className="text-xs text-slate-500 ml-6">SKU: {s.productId?.sku}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    <div className="font-medium">{s.supplierId?.name}</div>
                    <div className="text-xs text-slate-500">{s.consignmentId?.consignmentNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <MapPin size={14} className="text-slate-400"/> {s.branchId?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-blue-600">{s.receivedQuantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">{s.consumedQuantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-orange-600">{s.returnedQuantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-base font-bold text-slate-900">{s.availableQuantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openModal(s, 'consume')} disabled={s.availableQuantity <= 0}>
                        Consume
                      </Button>
                      <Button size="sm" variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => openModal(s, 'return')} disabled={s.availableQuantity <= 0}>
                        Return
                      </Button>
                    </div>
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

      {/* Action Modal */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${modalType === 'consume' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                {modalType === 'consume' ? <RefreshCw size={20} /> : <LogOut size={20} />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 capitalize">{modalType} Consignment Stock</h3>
                <p className="text-sm text-slate-500">Record a change in supplier inventory.</p>
              </div>
            </div>
            
            <form onSubmit={handleAction} className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg space-y-2 border border-slate-100">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Product:</span>
                  <span className="font-medium text-slate-900">{selectedItem.productId?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Branch:</span>
                  <span className="font-medium text-slate-900">{selectedItem.branchId?.name}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-slate-200 mt-2">
                  <span className="font-bold text-slate-700">Available Qty:</span>
                  <span className="font-bold text-blue-600 text-lg">{selectedItem.availableQuantity}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Quantity to {modalType} *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={selectedItem.availableQuantity}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={actionQuantity}
                  onChange={(e) => setActionQuantity(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reason / Notes *
                </label>
                <textarea
                  required
                  rows="2"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={`E.g., ${modalType === 'consume' ? 'Sold to retail customer' : 'Returned due to expiration'}`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={actionLoading} className={modalType === 'consume' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}>
                  Confirm {modalType}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CheckCircle, Package } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export default function SalesReturnDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [returnDoc, setReturnDoc] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/v1/sales/returns/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setReturnDoc(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const updateStatus = async (newStatus) => {
    if (!window.confirm(`Are you sure you want to mark this as ${newStatus}?`)) return;
    try {
      await axios.patch(`http://localhost:5000/api/v1/sales/returns/${id}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating status');
    }
  };

  const validateReturn = async () => {
    if (!window.confirm('Validate Return? This will increase stock and create a stock movement. This action cannot be undone.')) return;
    try {
      await axios.post(`http://localhost:5000/api/v1/sales/returns/${id}/validate`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchData();
      alert('Sales Return validated successfully.');
    } catch (error) {
      alert(error.response?.data?.message || 'Error validating return');
    }
  };

  if (!returnDoc) return <div className="p-6">Loading...</div>;

  const steps = ['DRAFT', 'CONFIRMED', 'VALIDATED'];
  const currentIndex = steps.indexOf(returnDoc.status) >= 0 ? steps.indexOf(returnDoc.status) : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/sales/returns')} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full border shadow-sm">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{returnDoc.returnNumber}</h1>
            <p className="text-slate-500 text-sm">Created on {new Date(returnDoc.returnDate).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex gap-3">
          {returnDoc.status === 'DRAFT' && (
            <Button onClick={() => updateStatus('CONFIRMED')}>Confirm Return</Button>
          )}
          {returnDoc.status === 'CONFIRMED' && (
            <Button variant="success" onClick={validateReturn} leftIcon={<CheckCircle size={18}/>}>
              Validate & Return to Stock
            </Button>
          )}
          {returnDoc.status === 'VALIDATED' && (
            <Badge variant="success" className="text-base px-4 py-1.5"><CheckCircle size={16} className="mr-2 inline"/> Stock Returned</Badge>
          )}
          {(returnDoc.status === 'DRAFT' || returnDoc.status === 'CONFIRMED') && (
            <Button variant="destructive" onClick={() => updateStatus('CANCELLED')}>Cancel</Button>
          )}
        </div>
      </div>

      {/* Odoo-style Pipeline */}
      {returnDoc.status !== 'CANCELLED' && (
        <div className="bg-white p-4 rounded-xl border shadow-sm mb-6 flex justify-between items-center">
          {steps.map((step, idx) => (
            <div key={step} className="flex-1 flex items-center">
              <div className={`flex flex-col items-center flex-1 ${idx <= currentIndex ? 'text-indigo-600 font-medium' : 'text-slate-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-2 ${idx <= currentIndex ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200'}`}>
                  {idx < currentIndex ? <CheckCircle size={16} /> : idx + 1}
                </div>
                <span className="text-sm uppercase tracking-wide">{step}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`h-1 flex-1 mx-4 rounded ${idx < currentIndex ? 'bg-indigo-600' : 'bg-slate-100'}`} />
              )}
            </div>
          ))}
        </div>
      )}

      {returnDoc.status === 'CANCELLED' && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 mb-6 text-center font-medium">
          This Sales Return has been cancelled.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 uppercase mb-4">Customer & Document Info</h2>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-3">
              <span className="text-slate-500">Customer:</span>
              <span className="col-span-2 font-medium">{returnDoc.customerId?.name}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-slate-500">Delivery Note:</span>
              <span className="col-span-2 text-indigo-600 cursor-pointer" onClick={() => navigate(`/sales/delivery-notes/${returnDoc.deliveryNoteId?._id}`)}>
                {returnDoc.deliveryNoteId?.deliveryNoteNumber}
              </span>
            </div>
            {returnDoc.salesOrderId && (
              <div className="grid grid-cols-3">
                <span className="text-slate-500">Sales Order:</span>
                <span className="col-span-2">{returnDoc.salesOrderId?.orderNumber}</span>
              </div>
            )}
            <div className="grid grid-cols-3">
              <span className="text-slate-500">Branch:</span>
              <span className="col-span-2">{returnDoc.branchId?.name}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 uppercase mb-4">Validation Status</h2>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-3">
              <span className="text-slate-500">Created By:</span>
              <span className="col-span-2">{returnDoc.createdBy?.name || 'System'}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-slate-500">Stock Updated:</span>
              <span className="col-span-2">
                {returnDoc.stockAdded ? (
                  <span className="text-green-600 flex items-center gap-1"><CheckCircle size={14}/> Yes</span>
                ) : (
                  <span className="text-slate-400">No</span>
                )}
              </span>
            </div>
            {returnDoc.notes && (
              <div className="grid grid-cols-3">
                <span className="text-slate-500">Notes:</span>
                <span className="col-span-2">{returnDoc.notes}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-slate-50 flex items-center gap-2">
          <Package size={18} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700 uppercase">Returned Items</h2>
        </div>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">SKU</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Return Qty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {returnDoc.items.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">{item.itemName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.sku}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-slate-800">{item.returnQuantity} {item.uom}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

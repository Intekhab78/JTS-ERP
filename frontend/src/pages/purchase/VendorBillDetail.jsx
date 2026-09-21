import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FileText, ArrowLeft, CreditCard, Printer } from 'lucide-react';
import VendorPaymentModal from './VendorPaymentModal';
import { useReactToPrint } from 'react-to-print';

const VendorBillDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: bill ? `VendorBill_${bill.billNumber}` : 'Vendor_Bill',
  });

  const fetchBill = async () => {
    try {
      const { data } = await axios.get(`http://localhost:5000/api/v1/vendor-bills/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBill(data);
    } catch (error) {
      alert('Failed to fetch Vendor Bill details');
      navigate('/purchases/bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBill();
  }, [id]);

  const handlePost = async () => {
    if (!window.confirm('Are you sure you want to post this bill? It cannot be edited afterwards.')) return;
    try {
      await axios.post(`http://localhost:5000/api/v1/vendor-bills/${id}/post`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Bill posted successfully');
      fetchBill();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to post bill');
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this bill?')) return;
    try {
      await axios.post(`http://localhost:5000/api/v1/vendor-bills/${id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Bill cancelled');
      fetchBill();
    } catch (error) {
      alert('Failed to cancel bill');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!bill) return null;

  const getStatusBadge = (status) => {
    const colors = {
      DRAFT: 'bg-gray-100 text-gray-800',
      POSTED: 'bg-blue-100 text-blue-800',
      PARTIALLY_PAID: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${colors[status] || colors.DRAFT}`}>
        {status}
      </span>
    );
  };

  return (
    <div ref={componentRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6 no-print">
        <div className="flex items-center">
          <button onClick={() => navigate('/purchases/bills')} className="mr-4 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="w-8 h-8 mr-2 text-gray-400" />
            {bill.billNumber}
          </h1>
          <div className="ml-4">
            {getStatusBadge(bill.status)}
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print / PDF
          </button>
          {bill.status === 'DRAFT' && (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePost}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Post Bill
              </button>
            </>
          )}
          {(bill.status === 'POSTED' || bill.status === 'PARTIALLY_PAID') && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Register Payment
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 flex justify-between">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Vendor Info</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">{bill.supplierId?.name}</p>
          </div>
          <div className="text-right">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Dates</h3>
            <p className="mt-1 text-sm text-gray-500">Bill Date: {new Date(bill.billDate).toLocaleDateString()}</p>
            <p className="text-sm text-gray-500">Due Date: {new Date(bill.dueDate).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Related Purchase Order</dt>
              <dd className="mt-1 text-sm text-indigo-600">
                {bill.purchaseOrderId ? (
                  <Link to={`/purchases/${bill.purchaseOrderId._id}`}>{bill.purchaseOrderId.purchaseOrderNumber}</Link>
                ) : '-'}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Related GRNs</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {bill.grnIds?.map(grn => grn.grnNumber).join(', ') || '-'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tax</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bill.items.map((item, idx) => (
              <tr key={idx}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.description || 'Product'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.quantity} {item.uom}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{bill.currency} {item.unitPrice.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{bill.currency} {item.taxAmount.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{bill.currency} {item.subTotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="bg-gray-50 px-6 py-5 flex justify-end">
          <dl className="space-y-3 text-sm text-gray-600 w-64">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="text-gray-900">{bill.currency} {bill.subtotal.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Tax</dt>
              <dd className="text-gray-900">{bill.currency} {bill.taxTotal.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-3 border-gray-200">
              <dt className="text-gray-900">Total</dt>
              <dd className="text-gray-900">{bill.currency} {bill.grandTotal.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between text-green-600">
              <dt>Amount Paid</dt>
              <dd>- {bill.currency} {bill.amountPaid.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between font-bold text-red-600 border-t pt-3 border-gray-200">
              <dt>Balance Due</dt>
              <dd>{bill.currency} {bill.balanceDue.toFixed(2)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <VendorPaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        bill={bill}
        onPaymentSuccess={fetchBill}
      />
    </div>
  );
};

export default VendorBillDetail;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, FileText } from 'lucide-react';
import VendorPaymentModal from './VendorPaymentModal';

const VendorBills = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const fetchBills = async () => {
    try {
      const { data } = await axios.get('/api/v1/vendor-bills', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBills(data);
    } catch (error) {
      alert('Failed to fetch vendor bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const handlePost = async (id) => {
    if (!window.confirm('Are you sure you want to post this bill? It cannot be edited afterwards.')) return;
    try {
      await axios.post(`/api/v1/vendor-bills/${id}/post`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Bill posted successfully');
      fetchBills();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to post bill');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      DRAFT: 'bg-gray-100 text-gray-800',
      POSTED: 'bg-blue-100 text-blue-800',
      PARTIALLY_PAID: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status] || colors.DRAFT}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Vendor Bills</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all vendor bills and purchase invoices in your account.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            to="/purchases/bills/new"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Bill
          </Link>
        </div>
      </div>
      
      <div className="flex flex-col mt-8">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Bill Number</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Supplier</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">PO Ref</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
                    <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Total</th>
                    <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Due</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr><td colSpan="8" className="py-4 text-center text-gray-500">Loading...</td></tr>
                  ) : bills.length === 0 ? (
                    <tr><td colSpan="8" className="py-4 text-center text-gray-500">No Vendor Bills found</td></tr>
                  ) : (
                    Array.isArray(bills) && bills.map((bill) => (
                      <tr key={bill._id}>
                        <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          <Link to={`/purchases/bills/${bill._id}`} className="text-indigo-600 hover:text-indigo-900 flex items-center">
                            <FileText className="w-4 h-4 mr-1" />
                            {bill.billNumber}
                          </Link>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">{bill.supplierId?.name}</td>
                        <td className="px-3 py-4 text-sm text-gray-500">{bill.purchaseOrderId?.purchaseOrderNumber || '-'}</td>
                        <td className="px-3 py-4 text-sm text-gray-500">{new Date(bill.billDate).toLocaleDateString()}</td>
                        <td className="px-3 py-4 text-sm font-medium text-right text-gray-900">{bill.currency} {bill.grandTotal.toFixed(2)}</td>
                        <td className="px-3 py-4 text-sm font-medium text-right text-red-600">{bill.currency} {bill.balanceDue.toFixed(2)}</td>
                        <td className="px-3 py-4 text-sm text-gray-500">{getStatusBadge(bill.status)}</td>
                        <td className="py-4 pl-3 pr-4 text-sm font-medium text-right sm:pr-6">
                          <div className="flex justify-end space-x-2">
                            {bill.status === 'DRAFT' && (
                              <button onClick={() => handlePost(bill._id)} className="text-blue-600 hover:text-blue-900">Post</button>
                            )}
                            {(bill.status === 'POSTED' || bill.status === 'PARTIALLY_PAID') && (
                              <button 
                                onClick={() => { setSelectedBill(bill); setIsPaymentModalOpen(true); }}
                                className="text-green-600 hover:text-green-900"
                              >
                                Pay
                              </button>
                            )}
                            <Link to={`/purchases/bills/${bill._id}`} className="text-indigo-600 hover:text-indigo-900">View</Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <VendorPaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        bill={selectedBill}
        onPaymentSuccess={fetchBills}
      />
    </div>
  );
};

export default VendorBills;

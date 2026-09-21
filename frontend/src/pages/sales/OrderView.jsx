import React, { useState, useEffect } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, Loader2, Printer, MapPin, Building, CreditCard } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { format } from 'date-fns';

const OrderView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const { formatCurrency, currencySymbol } = useCurrency();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/v1/sales/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setData(res.data);
      } catch (error) {
        console.error('Failed to fetch order', error);
        alert(error.response?.data?.message || 'Failed to load sales order');
        navigate('/sales');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!data || !data.order) return null;

  const { order, items } = data;

  const derivedStatus = (() => {
    if (order.source === 'POS' || order.status === 'COMPLETED') return 'COMPLETED';
    if (order.status === 'CANCELLED') return 'CANCELLED';
    if (order.status === 'DRAFT') return 'DRAFT';
    if (order.status === 'CONFIRMED') {
      if (order.deliveryStatus === 'PENDING') return 'CONFIRMED';
      if (order.deliveryStatus === 'PARTIAL') return 'PARTIALLY DELIVERED';
      if (order.deliveryStatus === 'DELIVERED') return 'DELIVERED';
    }
    return order.status;
  })();

  const getStatusBadge = (statusStr) => {
    switch (statusStr) {
      case 'COMPLETED':
      case 'DELIVERED':
        return <Badge variant="success" className="px-3 py-1">{statusStr}</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive" className="px-3 py-1">{statusStr}</Badge>;
      case 'DRAFT':
        return <Badge variant="secondary" className="px-3 py-1">{statusStr}</Badge>;
      case 'CONFIRMED':
        return <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1">{statusStr}</Badge>;
      case 'PARTIALLY DELIVERED':
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1">{statusStr}</Badge>;
      default:
        return <Badge variant="warning" className="px-3 py-1">{statusStr}</Badge>;
    }
  };

  const handleConfirmOrder = async () => {
    if (!window.confirm('Are you sure you want to confirm this Sales Order?')) return;
    try {
      await axios.patch(`http://localhost:5000/api/v1/sales/${order._id}/confirm`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      window.location.reload();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to confirm order');
    }
  };

  return (
    <div className="flex flex-col min-h-screen animate-in fade-in zoom-in-95 duration-300 print:bg-white print:animate-none">
      {/* Dynamic Header */}
      <div className="sticky top-0 z-[60] bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 py-4 md:px-8 transition-all duration-300 print:static print:border-b-2 print:border-slate-800 print:px-0 print:py-4 print:mb-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/sales')} 
              className="print:hidden p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:shadow-sm transition-all duration-200 group"
            >
              <ArrowLeft className="h-5 w-5 text-slate-500 group-hover:text-slate-800" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 print:text-black">
                  <FileText className="h-6 w-6 text-indigo-600 print:text-black" />
                  Order #{order._id.slice(-6).toUpperCase()}
                </h1>
                <div className="print:hidden">
                  {getStatusBadge(derivedStatus)}
                </div>
              </div>
              <p className="text-sm text-slate-500 font-medium mt-1 print:text-black">
                Date: {format(new Date(order.createdAt), 'MMMM d, yyyy h:mm a')}
              </p>
            </div>
          </div>
          
          <div className="print:hidden flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            {order.status === 'DRAFT' && (
              <Button 
                type="button" 
                variant="default"
                onClick={handleConfirmOrder}
                className="whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Confirm Order
              </Button>
            )}

            {(derivedStatus === 'CONFIRMED' || derivedStatus === 'PARTIALLY DELIVERED') && (
              <Button 
                type="button" 
                variant="default"
                onClick={() => navigate(`/sales/delivery-notes/new?soId=${order._id}`)}
                className="whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Create Delivery Note
              </Button>
            )}

            {derivedStatus === 'DELIVERED' && (
              <Button 
                type="button" 
                variant="default"
                onClick={async () => {
                  try {
                    const res = await axios.post(`http://localhost:5000/api/v1/tax-invoices/generate/order/${order._id}`, {}, {
                      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });
                    navigate(`/sales/tax-invoices/${res.data._id}`);
                  } catch (error) {
                    alert(error.response?.data?.message || 'Failed to generate tax invoice');
                  }
                }}
                leftIcon={<FileText className="w-4 h-4" />} 
                className="whitespace-nowrap"
              >
                Create Tax Invoice
              </Button>
            )}

            <Button 
              type="button" 
              variant="outline"
              onClick={() => window.print()}
              leftIcon={<Printer className="w-4 h-4" />} 
              className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm whitespace-nowrap"
            >
              Print
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 pt-8 flex-1 bg-slate-50 print:bg-white print:p-0">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Top Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-8 print:mb-8">
            <Card className="p-6 border-0 shadow-sm ring-1 ring-slate-200 print:p-0 print:ring-0 print:shadow-none print:bg-transparent">
              <div className="flex items-center gap-3 mb-4 print:mb-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg print:hidden">
                  <Building className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 print:text-black print:text-sm print:uppercase print:tracking-wider print:border-b print:border-slate-300 print:w-full print:pb-1">Branch Details</h3>
              </div>
              <p className="text-sm font-semibold text-slate-900 print:text-black print:text-base">{order.branchId?.name}</p>
              <p className="text-sm text-slate-500 mt-1 print:text-black">Processed by: {order.userId?.firstName} {order.userId?.lastName}</p>
            </Card>

            <Card className="p-6 border-0 shadow-sm ring-1 ring-slate-200 print:p-0 print:ring-0 print:shadow-none print:bg-transparent">
              <div className="flex items-center gap-3 mb-4 print:mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg print:hidden">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 print:text-black print:text-sm print:uppercase print:tracking-wider print:border-b print:border-slate-300 print:w-full print:pb-1">Customer Info</h3>
              </div>
              <p className="text-sm font-semibold text-slate-900 print:text-black print:text-base">{order.customerName}</p>
              {order.customerId && (
                <div className="text-sm text-slate-500 mt-1 print:text-black">
                  {order.customerId.email && <p>{order.customerId.email}</p>}
                  {order.customerId.phone && <p>{order.customerId.phone}</p>}
                </div>
              )}
            </Card>

            <Card className="p-6 border-0 shadow-sm ring-1 ring-slate-200 bg-gradient-to-br from-indigo-600 to-blue-700 text-white print:bg-none print:p-0 print:ring-0 print:shadow-none print:bg-transparent print:text-black">
              <div className="flex items-center gap-3 mb-4 print:mb-2">
                <div className="p-2 bg-white/20 text-white rounded-lg print:hidden">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-indigo-50 print:text-black print:text-sm print:uppercase print:tracking-wider print:border-b print:border-slate-300 print:w-full print:pb-1">Payment Info</h3>
              </div>
              <p className="text-sm font-medium text-indigo-100 print:text-black print:hidden">Method</p>
              <p className="text-lg font-bold text-white mb-1 tracking-wide print:text-black print:text-base print:mb-0">{order.paymentMethod.replace('_', ' ')}</p>
              <p className="text-sm font-medium text-indigo-100 print:text-black print:hidden">Source</p>
              <p className="text-sm font-bold text-white print:text-black">{order.source}</p>
            </Card>
          </div>

          {/* Order Items Table */}
          <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200 print:ring-0 print:shadow-none print:rounded-none">
            <div className="px-6 py-4 border-b border-slate-100 bg-white print:hidden">
              <h3 className="text-lg font-bold text-slate-800">Order Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse print:border-t-2 print:border-b-2 print:border-slate-800">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 print:bg-transparent print:border-slate-800">
                    <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider print:text-black print:px-2">Item</th>
                    <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider print:text-black print:px-2">SKU</th>
                    <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right print:text-black print:px-2">Quantity</th>
                    <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right print:text-black print:px-2">Unit Price</th>
                    <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right print:text-black print:px-2">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/50 transition-colors print:border-b print:border-slate-200">
                      <td className="py-4 px-6 text-sm font-semibold text-slate-800 print:text-black print:px-2">{item.productId?.name}</td>
                      <td className="py-4 px-6 text-sm text-slate-500 font-mono print:text-black print:px-2">{item.productId?.sku}</td>
                      <td className="py-4 px-6 text-sm font-medium text-slate-700 text-right print:text-black print:px-2">{item.quantity} {item.productId?.uom}</td>
                      <td className="py-4 px-6 text-sm font-medium text-slate-700 text-right print:text-black print:px-2">{currencySymbol}{item.unitPrice.toFixed(2)}</td>
                      <td className="py-4 px-6 text-sm font-bold text-slate-900 text-right print:text-black print:px-2">{currencySymbol}{item.subTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="bg-slate-50/50 p-6 border-t border-slate-100 flex flex-col md:flex-row justify-end gap-6 md:gap-12 print:bg-transparent print:p-2 print:border-none">
              <div className="w-full md:w-64 space-y-3">
                <div className="flex justify-between text-sm font-medium text-slate-600 print:text-black">
                  <span>Subtotal</span>
                  <span>{currencySymbol}{(order.totalAmount + (order.discountAmount || 0) - (order.taxAmount || 0)).toFixed(2)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-sm font-medium text-emerald-600 print:text-black">
                    <span>Discount</span>
                    <span>-${order.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {order.taxAmount > 0 && (
                  <div className="flex justify-between text-sm font-medium text-slate-600 print:text-black">
                    <span>Tax</span>
                    <span>{currencySymbol}{order.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-3 mt-3 border-t border-slate-200 flex justify-between items-center print:border-slate-800 print:border-t-2">
                  <span className="text-base font-bold text-slate-800 print:text-black uppercase tracking-wider">Grand Total</span>
                  <span className="text-2xl font-black text-indigo-600 print:text-black">{currencySymbol}{order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrderView;

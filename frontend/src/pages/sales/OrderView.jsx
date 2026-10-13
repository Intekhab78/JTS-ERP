import React, { useState, useEffect } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, Printer, MapPin, Building, CreditCard, Banknote, Calendar, CheckCircle, Package } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
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
        const res = await axios.get(`/api/v1/sales/${id}`, {
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
      <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[1720px] mx-auto min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center py-40">
        <div className="animate-spin rounded-none h-12 w-12 border-4 border-slate-200 border-t-blue-600 mb-4"></div>
        <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Fetching Core Assets...</p>
      </div>
    );
  }

  if (!data || !data.order) return <div className="p-8 text-center text-red-500 font-bold uppercase tracking-widest">Sales Order not found</div>;

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

  const handleConfirmOrder = async () => {
    if (!window.confirm('Are you sure you want to confirm this Sales Order?')) return;
    try {
      await axios.patch(`/api/v1/sales/${order._id}/confirm`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      window.location.reload();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to confirm order');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const soSymbol = currencySymbol;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[1400px] mx-auto space-y-6 pb-10 bg-[#f8fafc] min-h-screen">
      
      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl no-print mt-4 sm:mx-4 lg:mx-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-start gap-4">
            <button onClick={() => navigate('/sales')} className="p-2.5 bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 mt-1">
              <ArrowLeft size={20} className="text-slate-300" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                  <FileText size={18} className="text-white" />
                </div>
                <h1 className="text-3xl font-black tracking-tight text-white uppercase">{order._id.slice(-6).toUpperCase()}</h1>
              </div>
              <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl uppercase tracking-widest">
                Sales Order Details • {order.customerName}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-[#111827] border border-slate-800 p-2.5 rounded-lg shadow-inner">
            <span className={`inline-flex items-center px-3 py-1.5 rounded text-xs font-black uppercase tracking-widest shadow-sm border-none text-white ${derivedStatus === 'CONFIRMED' ? 'bg-indigo-500' : derivedStatus === 'COMPLETED' ? 'bg-green-600' : derivedStatus === 'CANCELLED' ? 'bg-rose-500' : derivedStatus === 'PARTIALLY DELIVERED' ? 'bg-blue-600' : 'bg-slate-600'}`}>
              STATUS: {derivedStatus}
            </span>
            
            <button onClick={handlePrint} className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
              <Printer size={14} /> Print
            </button>

            {order.status === 'DRAFT' && (
              <button onClick={handleConfirmOrder} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
                <CheckCircle size={14} /> Confirm Order
              </button>
            )}

            {(derivedStatus === 'CONFIRMED' || derivedStatus === 'PARTIALLY DELIVERED') && (
               <button onClick={() => navigate(`/sales/delivery-notes/new?soId=${order._id}`)} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
                 <Package size={14} /> Create Delivery Note
               </button>
            )}

            {derivedStatus === 'DELIVERED' && (
              <button 
                onClick={async () => {
                  try {
                    const res = await axios.post(`/api/v1/tax-invoices/generate/order/${order._id}`, {}, {
                      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });
                    navigate(`/sales/tax-invoices/${res.data._id}`);
                  } catch (error) {
                    alert(error.response?.data?.message || 'Failed to generate tax invoice');
                  }
                }}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
              >
                <FileText size={14} /> Create Invoice
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden md:col-span-2 flex flex-col print:border-none print:shadow-none">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2 print:bg-transparent">
            <Building size={18} className="text-blue-500" />
            <h3 className="font-black text-slate-700 tracking-widest uppercase text-xs">Customer Profile</h3>
          </div>
          <div className="p-6">
            <div className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-4">{order.customerName}</div>
            <div className="space-y-2">
              {order.customerId?.email && <div className="text-slate-500 font-medium text-sm"><span className="text-slate-400 w-20 inline-block uppercase text-xs font-bold">Email:</span> {order.customerId.email}</div>}
              {order.customerId?.phone && <div className="text-slate-500 font-medium text-sm"><span className="text-slate-400 w-20 inline-block uppercase text-xs font-bold">Phone:</span> {order.customerId.phone}</div>}
              {!order.customerId && (
                <div className="text-slate-500 font-medium text-sm italic">Walk-in Customer</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-6 border-t border-slate-100 bg-slate-50/50 print:bg-transparent mt-auto">
            <div>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <MapPin size={12} className="text-blue-400" /> Branch
              </h3>
              <div className="font-bold text-slate-800 uppercase tracking-wide text-sm">{order.branchId?.name}</div>
            </div>
            <div>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Calendar size={12} className="text-green-400" /> Order Date
              </h3>
              <div className="font-bold text-slate-800 font-mono text-sm">{format(new Date(order.createdAt), 'dd MMM yyyy h:mm a')}</div>
            </div>
            <div>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <CreditCard size={12} className="text-orange-400" /> Payment
              </h3>
              <div className="font-bold text-slate-800 font-mono text-sm uppercase">
                {order.status === 'PENDING' || order.status === 'DRAFT' || order.status === 'CONFIRMED' ? (
                  <span className="text-rose-500">UNPAID</span>
                ) : (
                  order.paymentMethod.replace('_', ' ')
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 md:col-span-1 bg-slate-900 text-white rounded-xl shadow-lg border-0 flex flex-col justify-between print:text-black print:bg-transparent print:border print:border-slate-300">
           <div>
             <div className="flex justify-between items-start mb-6">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-3 print:text-black">
                  <div className="p-2 bg-white/10 rounded-lg text-slate-300 print:hidden"><Banknote size={16} /></div> FINANCIAL SUMMARY
                </h3>
             </div>
             
             <div className="space-y-1">
                <div className="text-xs text-slate-400 tracking-wider uppercase font-semibold mb-2 print:text-slate-500">Total Amount</div>
                <div className="flex items-baseline gap-2">
                   <span className="text-xl font-bold text-blue-400">{soSymbol}</span>
                   <span className="text-4xl font-bold tracking-tight text-white print:text-black">{order.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
             </div>
           </div>

           <div className="mt-8 space-y-6">
              <div className="pt-4 border-t border-slate-800 print:border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs text-slate-400 print:text-slate-500">Subtotal</div>
                  <div className="text-sm font-semibold">{soSymbol} {(order.subTotal || 0).toFixed(2)}</div>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs text-slate-400 print:text-slate-500">Tax ({order.taxRate}%)</div>
                  <div className="text-sm font-semibold">{soSymbol} {(order.taxAmount || 0).toFixed(2)}</div>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-xs text-slate-400 print:text-slate-500">Discount</div>
                    <div className="text-sm font-semibold text-emerald-400">-{soSymbol} {order.discountAmount.toFixed(2)}</div>
                  </div>
                )}
              </div>
           </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden print:border-none print:shadow-none print:mx-0">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2 print:bg-transparent">
          <Package size={18} className="text-blue-500" />
          <h3 className="font-black text-slate-700 tracking-widest uppercase text-xs">Order Lines</h3>
          <span className="text-[10px] font-bold text-slate-500 font-mono px-2 py-1 bg-slate-200 rounded ml-2">
             {items?.length || 0} ITEMS INCLUDED
          </span>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap min-w-[800px]">
            <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border-b-2 border-slate-100 print:bg-transparent print:border-slate-300">
              <tr>
                <th className="px-6 py-4">Item</th>
                <th className="px-6 py-4 text-center">SKU</th>
                <th className="px-6 py-4 text-center">Quantity</th>
                <th className="px-6 py-4 text-center">Unit Price</th>
                <th className="px-6 py-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{item.productName || item.productId?.name}</div>
                  </td>
                  <td className="px-6 py-4 text-center text-slate-600 font-mono text-xs">
                    {item.productId?.sku || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-bold text-slate-800">{item.quantity}</span>
                  </td>
                  <td className="px-6 py-4 text-center text-slate-600">
                    <div className="text-[10px] text-slate-400">{soSymbol}</div>
                    <div className="font-mono">{item.unitPrice.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-bold text-slate-800 font-mono">
                      {soSymbol} {item.totalPrice.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrderView;

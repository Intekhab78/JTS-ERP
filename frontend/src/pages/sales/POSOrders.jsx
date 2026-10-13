import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, Calendar, Filter, Eye, Receipt, TrendingUp, ShoppingBag, Server, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useCurrency } from '../../contexts/CurrencyContext';

import POSOrderDetailsModal from '../../components/sales/POSOrderDetailsModal';

const POSOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currencySymbol } = useCurrency();
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get('/api/v1/pos/orders', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setOrders(res.data);
      } catch (error) {
        console.error('Failed to fetch orders', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [selectedOrder]); // Re-fetch when modal closes

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = 
        order.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
      
      let matchesDate = true;
      if (dateRange.start || dateRange.end) {
        const orderDate = new Date(order.createdAt);
        orderDate.setHours(0, 0, 0, 0);
        
        if (dateRange.start) {
          const startDate = new Date(dateRange.start);
          startDate.setHours(0, 0, 0, 0);
          if (orderDate < startDate) matchesDate = false;
        }
        if (dateRange.end) {
          const endDate = new Date(dateRange.end);
          endDate.setHours(0, 0, 0, 0);
          if (orderDate > endDate) matchesDate = false;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, searchTerm, statusFilter, dateRange]);

  // Summary Metrics
  const totalOrders = filteredOrders.length;
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.status !== 'CANCELLED' ? order.totalAmount : 0), 0);
  const totalCancelled = filteredOrders.filter(o => o.status === 'CANCELLED').length;

  if (loading && orders.length === 0) {
    return (
      <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[1720px] mx-auto min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center py-40">
        <div className="animate-spin rounded-none h-12 w-12 border-4 border-slate-200 border-t-blue-600 mb-4"></div>
        <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Fetching Core Assets...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[1720px] mx-auto pb-10 bg-[#f8fafc] min-h-screen">
      
      {/* Hide the main POS page content during printing */}
      <div className="space-y-6 print:hidden">
        {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl mt-4 sm:mx-4 lg:mx-8">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                <Receipt size={18} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">POS Orders</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl">
              POINT OF SALE TRANSACTIONS & RECEIPTS
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-3 bg-[#111827] border border-slate-800 p-2 rounded-lg shadow-inner">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">System Online</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col xl:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-center w-full xl:max-w-5xl">
            <div className="relative w-full sm:flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Search Receipts</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="SCAN RECEIPT OR CUSTOMER..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 shadow-sm font-mono text-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-0 transition-colors uppercase"
                />
              </div>
            </div>

            <div className="relative w-full sm:w-48 shrink-0">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Status</label>
              <select
                className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none uppercase"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="ALL">ALL STATUSES</option>
                <option value="PAID">PAID</option>
                <option value="PENDING">PENDING</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Aggressive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-slate-300 transition-all">
            <div className="p-5 flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Orders</p>
                <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{totalOrders}</h3>
              </div>
              <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-slate-800 group-hover:text-white transition-colors">
                <Receipt size={22} strokeWidth={2.5} />
              </div>
            </div>
            <div className="h-1.5 w-full bg-slate-200"><div className="h-full bg-slate-800 w-full"></div></div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-emerald-400 transition-all">
            <div className="p-5 flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Revenue</p>
                <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{currencySymbol}{totalRevenue.toFixed(2)}</h3>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <TrendingUp size={22} strokeWidth={2.5} />
              </div>
            </div>
            <div className="h-1.5 w-full bg-emerald-100"><div className="h-full bg-emerald-500 w-[80%]"></div></div>
          </div>

          <div className="bg-white border border-rose-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-rose-400 transition-all">
            <div className="p-5 flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-rose-600 uppercase tracking-widest mb-1">Cancelled</p>
                <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{totalCancelled}</h3>
              </div>
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-rose-500 group-hover:text-white transition-colors">
                <XCircle size={22} strokeWidth={2.5} />
              </div>
            </div>
            <div className="h-1.5 w-full bg-rose-100"><div className="h-full bg-rose-500 w-[10%]"></div></div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Server size={16} className="text-blue-500" /> POS Matrix
            </h2>
            <span className="text-xs font-bold text-slate-500 font-mono px-2 py-1 bg-slate-200 rounded">RECORDS: {filteredOrders.length}</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap min-w-[800px]">
              <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border-b-2 border-slate-100">
                <tr>
                  <th className="px-6 py-4">Receipt</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Branch</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Total</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map(order => (
                    <tr key={order._id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 font-mono font-medium text-blue-600">{order.receiptNumber}</td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{format(new Date(order.createdAt), 'MMM d, yyyy HH:mm')}</td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold uppercase tracking-wider">{order.branchId?.name || 'STORE'}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">{order.customerName}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-sm border
                          ${order.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                            order.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                            'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-extrabold text-slate-800 font-mono">
                        {currencySymbol}{order.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center justify-center p-2 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-600 rounded-lg transition-colors shadow-sm border border-slate-200 group-hover:border-blue-300"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest">
                      No orders found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div>

      {/* Details Modal (Contains its own print styling and thermal receipt) */}
      {selectedOrder && (
        <POSOrderDetailsModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
        />
      )}
    </div>
  );
};

export default POSOrders;

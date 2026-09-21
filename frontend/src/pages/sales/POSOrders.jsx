import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, Calendar, Filter, Eye, Receipt, TrendingUp, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import POSOrderDetailsModal from '../../components/sales/POSOrderDetailsModal';

const POSOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/v1/pos/orders', {
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
  }, []);

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

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto space-y-6 print:hidden">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">POS Orders</h1>
          <p className="text-slate-500 text-sm mt-1">Manage and view point of sale transactions.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-blue-50/50 border-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Orders</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalOrders}</h3>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                <Receipt size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-emerald-50/50 border-emerald-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600">Total Revenue</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">${totalRevenue.toFixed(2)}</h3>
              </div>
              <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600">
                <TrendingUp size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="border-b bg-slate-50 p-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search receipt or customer..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 text-sm bg-white border rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                <Calendar size={16} className="text-slate-400" />
                <input
                  type="date"
                  className="bg-transparent border-none focus:outline-none text-slate-600 w-32"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                />
                <span className="text-slate-300">-</span>
                <input
                  type="date"
                  className="bg-transparent border-none focus:outline-none text-slate-600 w-32"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                />
              </div>

              <div className="relative border rounded-lg bg-white">
                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  className="pl-9 pr-4 py-2 w-full appearance-none bg-transparent focus:outline-none text-sm text-slate-600"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Status</option>
                  <option value="PAID">Paid</option>
                  <option value="PENDING">Pending</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-white text-sm border-b text-slate-500">
                  <th className="p-4 font-semibold">Receipt</th>
                  <th className="p-4 font-semibold">Date</th>
                  <th className="p-4 font-semibold">Branch</th>
                  <th className="p-4 font-semibold">Customer</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Total</th>
                  <th className="p-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map(order => (
                    <tr key={order._id} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors text-sm">
                      <td className="p-4 font-medium text-blue-600">{order.receiptNumber}</td>
                      <td className="p-4 text-slate-600">{format(new Date(order.createdAt), 'MMM d, yyyy HH:mm')}</td>
                      <td className="p-4 text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <ShoppingBag size={14} className="text-slate-400" />
                          {order.branchId?.name}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600">{order.customerName}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
                          ${order.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 
                            order.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700' : 
                            'bg-amber-100 text-amber-700'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-4 text-right font-semibold text-slate-800">${order.totalAmount.toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center justify-center p-2 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-600 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-500">
                      No orders found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
    {/* Details Modal */}
    {selectedOrder && (
      <POSOrderDetailsModal 
        order={selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
      />
    )}
  </>
  );
};

export default POSOrders;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Factory, Plus, Search, Eye, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const ManufacturingOrders = () => {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  
  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/manufacturing/orders', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setOrders(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'DRAFT': return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1 rounded text-[10px] font-bold uppercase">Draft</span>;
      case 'CONFIRMED': return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1"><AlertCircle size={10}/> Confirmed</span>;
      case 'READY': return <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1"><CheckCircle size={10}/> Ready</span>;
      case 'IN_PROGRESS': return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 animate-pulse"><Clock size={10}/> In Progress</span>;
      case 'DONE': return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1"><CheckCircle size={10}/> Done</span>;
      case 'CANCELLED': return <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded text-[10px] font-bold uppercase">Cancelled</span>;
      default: return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-[10px] font-bold uppercase">{status}</span>;
    }
  };

  const filteredOrders = orders.filter(o => 
    o.bomId?.finishedProductId?.name.toLowerCase().includes(search.toLowerCase()) ||
    o.orderNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-[slideIn_0.3s_ease-out]">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2"><Factory className="text-blue-600" /> Manufacturing Orders</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Execute production runs and automatically adjust inventory.</p>
        </div>
        {hasPermission('CREATE_MANUFACTURING') && (
          <Link 
            to="/manufacturing/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus size={18} /> New MO
          </Link>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex gap-4 bg-slate-50/50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search manufacturing orders..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-slate-800 focus:outline-none focus:border-blue-500 text-sm font-medium shadow-sm"
            />
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <th className="p-4 font-bold text-xs text-slate-500 uppercase tracking-wider">Order ID</th>
              <th className="p-4 font-bold text-xs text-slate-500 uppercase tracking-wider">Finished Product</th>
              <th className="p-4 font-bold text-xs text-slate-500 uppercase tracking-wider text-center">To Produce</th>
              <th className="p-4 font-bold text-xs text-slate-500 uppercase tracking-wider text-center">Produced</th>
              <th className="p-4 font-bold text-xs text-slate-500 uppercase tracking-wider">Facility</th>
              <th className="p-4 font-bold text-xs text-slate-500 uppercase tracking-wider">Status</th>
              <th className="p-4 font-bold text-xs text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
              <tr key={order._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td className="p-4">
                  <div className="font-extrabold text-blue-600">{order.orderNumber}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{format(new Date(order.createdAt), 'MMM d, yyyy')}</div>
                </td>
                <td className="p-4">
                  <div className="font-bold text-slate-800">{order.bomId?.finishedProductId?.name}</div>
                  <div className="text-xs font-medium text-slate-500 mt-0.5">SKU: {order.bomId?.finishedProductId?.sku}</div>
                </td>
                <td className="p-4 text-center">
                  <div className="inline-block bg-slate-100 px-3 py-1 rounded-lg font-black text-slate-700">
                    {order.quantityToProduce}
                  </div>
                </td>
                <td className="p-4 text-center">
                  <div className={`inline-block px-3 py-1 rounded-lg font-black ${order.producedQuantity >= order.quantityToProduce ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                    {order.producedQuantity}
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-bold text-slate-600">{order.branchId?.name}</div>
                </td>
                <td className="p-4">
                  {getStatusBadge(order.status)}
                </td>
                <td className="p-4 text-right">
                  <Link to={`/manufacturing/${order._id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm">
                    <Eye size={14} /> View
                  </Link>
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan="7" className="p-12 text-center text-slate-500 font-medium text-sm">No manufacturing orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManufacturingOrders;

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Factory, Plus, Search, Eye, CheckCircle, Clock, AlertCircle, Server, Play, Zap, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { SearchInput } from '../../components/ui/SearchInput';

const ManufacturingOrders = () => {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  
  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/v1/manufacturing/orders', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setOrders(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'DRAFT': return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest shadow-sm">Draft</span>;
      case 'CONFIRMED': return <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1 w-fit"><AlertCircle size={10} strokeWidth={3} /> Confirmed</span>;
      case 'READY': return <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1 w-fit"><CheckCircle size={10} strokeWidth={3} /> Ready</span>;
      case 'IN_PROGRESS': return <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1 w-fit animate-pulse"><Clock size={10} strokeWidth={3} /> In Progress</span>;
      case 'DONE': return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1 w-fit"><CheckCircle size={10} strokeWidth={3} /> Done</span>;
      case 'CANCELLED': return <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest shadow-sm w-fit flex items-center gap-1"><XCircle size={10} strokeWidth={3} /> Cancelled</span>;
      default: return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest shadow-sm">{status}</span>;
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      let match = true;
      if (search) {
        const sq = search.toLowerCase();
        const pMatch = o.bomId?.finishedProductId?.name?.toLowerCase().includes(sq);
        const sMatch = o.bomId?.finishedProductId?.sku?.toLowerCase().includes(sq);
        const oMatch = o.orderNumber?.toLowerCase().includes(sq);
        if (!pMatch && !sMatch && !oMatch) match = false;
      }
      if (statusFilter && o.status !== statusFilter) {
        match = false;
      }
      return match;
    });
  }, [orders, search, statusFilter]);

  const kpis = {
    total: filteredOrders.length,
    inProgress: filteredOrders.filter(o => o.status === 'IN_PROGRESS').length,
    done: filteredOrders.filter(o => o.status === 'DONE').length
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 max-w-[1720px] mx-auto pb-10 bg-[#f8fafc] min-h-screen">
      
      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                <Factory size={18} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">Manufacturing Orders</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-widest ml-14">
              MANUFACTURING • EXECUTE PRODUCTION RUNS
            </p>
          </div>
          
          <div className="flex items-center gap-4">
             {hasPermission('CREATE_MANUFACTURING') && (
               <Link 
                 to="/manufacturing/new"
                 className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-md font-bold text-sm tracking-wider uppercase transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400 flex items-center gap-2"
               >
                 <Plus size={16} strokeWidth={3} /> New MO
               </Link>
             )}
          </div>
        </div>
      </div>

      {/* Control Panel (Sharp & High Contrast) */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:max-w-2xl">
          <div className="relative flex-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Search Orders</label>
            <SearchInput 
               placeholder="ORDER #, PRODUCT OR SKU..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="h-10 rounded-md border-2 border-slate-200 bg-slate-50 shadow-sm font-mono text-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-0 transition-colors uppercase w-full"
            />
          </div>
          <div className="relative w-full sm:w-48">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Status Filter</label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none uppercase"
            >
              <option value="">-- ALL STATUSES --</option>
              <option value="DRAFT">DRAFT</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="READY">READY</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="DONE">DONE</option>
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
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{kpis.total}</h3>
            </div>
            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-slate-800 group-hover:text-white transition-colors">
              <Play size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-slate-200"><div className="h-full bg-slate-800 w-full"></div></div>
        </div>

        <div className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-amber-400 transition-all">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-1">In Progress</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{kpis.inProgress}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Clock size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-amber-100"><div className="h-full bg-amber-500 w-[60%]"></div></div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-emerald-400 transition-all">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Done</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{kpis.done}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <CheckCircle size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-emerald-100"><div className="h-full bg-emerald-500 w-[85%]"></div></div>
        </div>
      </div>

      {/* Pro Data Table */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Zap size={16} className="text-blue-500" /> MO Matrix
          </h2>
          <span className="text-xs font-bold text-slate-500 font-mono px-2 py-1 bg-slate-200 rounded">RECORDS: {filteredOrders.length}</span>
        </div>
        
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border-b-2 border-slate-100">
              <tr>
                <th className="px-6 py-4">Order ID & Date</th>
                <th className="px-6 py-4">Finished Product</th>
                <th className="px-6 py-4 text-center">To Produce</th>
                <th className="px-6 py-4 text-center">Produced</th>
                <th className="px-6 py-4">Facility</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="animate-spin rounded-none h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
                      <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Fetching Database...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Server size={48} className="text-slate-200 mb-2" />
                      <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">0 Records Found</p>
                      <p className="text-xs text-slate-400 font-mono">No manufacturing orders match current parameters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const isDone = order.producedQuantity >= order.quantityToProduce;
                  return (
                    <tr key={order._id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-black text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded inline-block shadow-sm tracking-tight border border-blue-100">{order.orderNumber}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{format(new Date(order.createdAt), 'MMM d, yyyy')}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-sm tracking-tight uppercase line-clamp-1">{order.bomId?.finishedProductId?.name}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 bg-slate-200 px-2 py-0.5 rounded inline-block">SKU: {order.bomId?.finishedProductId?.sku}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-block bg-slate-100 px-3 py-1 rounded shadow-sm border border-slate-200 font-black text-slate-800 font-mono text-sm">
                          {order.quantityToProduce}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className={`inline-block px-3 py-1 rounded shadow-sm border font-black font-mono text-sm ${isDone ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                          {order.producedQuantity}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-700 text-xs uppercase tracking-tight">{order.branchId?.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          to={`/manufacturing/${order._id}`} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-widest rounded-md hover:bg-blue-600 hover:text-white transition-colors shadow-sm"
                        >
                          <Eye size={14} strokeWidth={2.5} /> View
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManufacturingOrders;

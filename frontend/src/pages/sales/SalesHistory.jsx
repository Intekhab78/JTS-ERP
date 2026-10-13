import React, { useState, useEffect } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import axios from 'axios';
import { Receipt, Filter, Eye, Truck, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { DataTable } from '../../components/common/DataTable';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

const SalesHistory = () => {
  const [orders, setOrders] = useState([]);
  const { formatCurrency, currencySymbol } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get('/api/v1/sales', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setOrders(res.data);
    } catch (error) {
      console.error('Failed to fetch sales history', error);
    } finally {
      setLoading(false);
    }
  };

  const getDerivedStatus = (row) => {
    if (row.source === 'POS' || row.status === 'COMPLETED') return 'COMPLETED';
    if (row.status === 'CANCELLED') return 'CANCELLED';
    if (row.status === 'DRAFT') return 'DRAFT';
    if (row.status === 'CONFIRMED') {
      if (row.deliveryStatus === 'PENDING') return 'CONFIRMED';
      if (row.deliveryStatus === 'PARTIAL') return 'PARTIALLY DELIVERED';
      if (row.deliveryStatus === 'DELIVERED') return 'DELIVERED';
    }
    return row.status;
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o._id.toLowerCase().includes(search.toLowerCase()) || 
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.branchId?.name.toLowerCase().includes(search.toLowerCase());
    
    const derivedStatus = getDerivedStatus(o);
    const matchesStatus = statusFilter ? derivedStatus === statusFilter : true;
    
    return matchesSearch && matchesStatus;
  });

  const kpis = {
    total: filteredOrders.length,
    completed: filteredOrders.filter(o => getDerivedStatus(o) === 'COMPLETED').length,
    pending: filteredOrders.filter(o => ['DRAFT', 'CONFIRMED', 'PARTIALLY DELIVERED'].includes(getDerivedStatus(o))).length
  };

  const getStatusBadge = (statusStr) => {
    switch (statusStr) {
      case 'COMPLETED':
      case 'DELIVERED':
        return <Badge variant="success">{statusStr}</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">{statusStr}</Badge>;
      case 'DRAFT':
        return <Badge variant="secondary">{statusStr}</Badge>;
      case 'CONFIRMED':
        return <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white">{statusStr}</Badge>;
      case 'PARTIALLY DELIVERED':
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">{statusStr}</Badge>;
      default:
        return <Badge variant="warning">{statusStr}</Badge>;
    }
  };

  const columns = [
    {
      header: 'Order ID',
      accessorKey: '_id',
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-mono font-medium text-blue-600">#{row._id.slice(-6).toUpperCase()}</span>
          {row.quoteId && (
            <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap mt-0.5 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded w-fit">
              REF: {row.quoteId.quoteNumber}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Date',
      accessorKey: 'createdAt',
      cell: (row) => <span className="text-slate-600 font-medium">{format(new Date(row.createdAt), 'MMM d, yyyy h:mm a')}</span>
    },
    {
      header: 'Branch',
      accessorKey: 'branchId',
      cell: (row) => <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold uppercase tracking-wider">{row.branchId?.name}</span>
    },
    {
      header: 'Customer',
      accessorKey: 'customerName',
      cell: (row) => <span className="font-bold text-slate-800">{row.customerName}</span>
    },
    {
      header: 'Payment',
      accessorKey: 'paymentMethod',
      cell: (row) => row.status === 'PENDING' || row.status === 'DRAFT' || row.status === 'CONFIRMED' ? (
        <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest px-2 py-1 bg-slate-50 border border-slate-200 rounded">UNPAID</span>
      ) : (
        <span className="text-emerald-700 font-bold text-[10px] uppercase tracking-widest px-2 py-1 bg-emerald-50 border border-emerald-200 rounded">{row.paymentMethod.replace('_', ' ')}</span>
      )
    },
    {
      header: 'Total',
      accessorKey: 'totalAmount',
      className: 'text-right',
      cell: (row) => <span className="font-extrabold text-slate-800">{currencySymbol}{row.totalAmount.toFixed(2)}</span>
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (row) => getStatusBadge(getDerivedStatus(row))
    },
    {
      header: 'Actions',
      id: 'actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex justify-end gap-2">
          {['CONFIRMED', 'PARTIALLY DELIVERED'].includes(getDerivedStatus(row)) && (
            <button 
              onClick={() => navigate(`/sales/delivery-notes/new?soId=${row._id}`)}
              className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-200"
              title="Create Delivery Note"
            >
              <Truck className="h-4 w-4" />
            </button>
          )}
          <button 
            onClick={() => navigate(`/sales/orders/${row._id}`)}
            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200"
            title="View Order"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 max-w-[1720px] mx-auto pb-10 bg-[#f8fafc] min-h-screen">
      
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
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">Sales Ledger</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl">
              VIEW ALL HISTORICAL TRANSACTIONS ACROSS YOUR ENTERPRISE BRANCHES.
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
        {/* Filter Bar */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col xl:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-center w-full xl:max-w-4xl">
            <div className="relative w-full sm:flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Search Records</label>
              <SearchInput 
                placeholder="SCAN BY ORDER ID, CUSTOMER, OR BRANCH..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-10 rounded-md border-2 border-slate-200 bg-slate-50 shadow-sm font-mono text-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-0 transition-colors uppercase w-full"
              />
            </div>
            
            <div className="relative w-full sm:w-48 shrink-0">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Status</label>
              <select
                className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none uppercase"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="">ALL STATUSES</option>
                <option value="DRAFT">DRAFT</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="PARTIALLY DELIVERED">PARTIALLY DELIVERED</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="COMPLETED">COMPLETED</option>
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
                <Receipt size={22} strokeWidth={2.5} />
              </div>
            </div>
            <div className="h-1.5 w-full bg-slate-200"><div className="h-full bg-slate-800 w-full"></div></div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-emerald-400 transition-all">
            <div className="p-5 flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Completed</p>
                <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{kpis.completed}</h3>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <CheckCircle2 size={22} strokeWidth={2.5} />
              </div>
            </div>
            <div className="h-1.5 w-full bg-emerald-100"><div className="h-full bg-emerald-500 w-[70%]"></div></div>
          </div>

          <div className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-amber-400 transition-all">
            <div className="p-5 flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-1">Pending / Draft</p>
                <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{kpis.pending}</h3>
              </div>
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <Clock size={22} strokeWidth={2.5} />
              </div>
            </div>
            <div className="h-1.5 w-full bg-amber-100"><div className="h-full bg-amber-500 w-[30%]"></div></div>
          </div>
        </div>

        {/* Sales Matrix Table */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden font-mono">
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Receipt size={16} className="text-blue-500" /> Sales Matrix
            </h2>
            <span className="text-xs font-bold text-slate-500 font-mono px-2 py-1 bg-slate-200 rounded">RECORDS: {filteredOrders.length}</span>
          </div>
          <DataTable 
            columns={columns}
            data={filteredOrders}
            isLoading={loading}
            emptyTitle="NO SALES RECORDS FOUND"
            emptyDescription="THERE ARE NO SALES TRANSACTIONS MATCHING YOUR SEARCH CRITERIA."
          />
        </div>
      </div>
    </div>
  );
};

export default SalesHistory;

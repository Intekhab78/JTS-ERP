import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { FileText, Plus, Eye, ShoppingBag, BarChart2, PieChart, Truck, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SearchInput } from '../../components/ui/SearchInput';
import { useNavigate } from 'react-router-dom';

const GRN = () => {
  const [grns, setGrns] = useState([]);
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const navigate = useNavigate();

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchGRNs();
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await axios.get('/api/v1/branches', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBranches(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchGRNs = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/v1/grn', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setGrns(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGRNs = useMemo(() => {
    return grns.filter(grn => {
      const matchSearch = grn.grnNumber.toLowerCase().includes(search.toLowerCase()) ||
                          (grn.supplierId?.name || '').toLowerCase().includes(search.toLowerCase());
      const matchBranch = selectedBranch ? grn.branchId?._id === selectedBranch : true;
      const matchDate = dateFilter ? format(new Date(grn.receiptDate), 'yyyy-MM-dd') === dateFilter : true;
      return matchSearch && matchBranch && matchDate;
    });
  }, [grns, search, selectedBranch, dateFilter]);

  const totalPages = Math.ceil(filteredGRNs.length / limit);
  const paginatedGRNs = filteredGRNs.slice((page - 1) * limit, page * limit);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'VALIDATED':
        return <Badge variant="success">VALIDATED</Badge>;
      case 'CONFIRMED':
        return <Badge variant="info">CONFIRMED</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">CANCELLED</Badge>;
      case 'DRAFT':
      default:
        return <Badge variant="warning">DRAFT</Badge>;
    }
  };

  const columns = useMemo(() => [
    {
      header: 'GRN Number',
      accessorKey: 'grnNumber',
      cell: (grn) => <span className="font-bold text-blue-600">{grn.grnNumber}</span>
    },
    {
      header: 'Date',
      accessorKey: 'receiptDate',
      cell: (grn) => <span className="text-muted-foreground">{format(new Date(grn.receiptDate), 'MMM d, yyyy')}</span>
    },
    {
      header: 'Supplier',
      accessorKey: 'supplierId.name',
      cell: (grn) => <span className="font-bold text-foreground">{grn.supplierId?.name || 'N/A'}</span>
    },
    {
      header: 'Destination',
      accessorKey: 'branchId.name',
      cell: (grn) => <span className="font-bold text-muted-foreground">{grn.branchId?.name || 'N/A'}</span>
    },
    {
      header: 'PO Ref',
      accessorKey: 'purchaseOrderId',
      cell: (grn) => <span className="text-muted-foreground">{grn.purchaseOrderId ? `PO-${grn.purchaseOrderId._id.slice(-6).toUpperCase()}` : '-'}</span>
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (grn) => getStatusBadge(grn.status)
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: (grn) => (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(`/purchases/grn/${grn._id}`)}
            className="text-blue-600 hover:bg-blue-50"
            title="View Details"
          >
            <Eye size={16} />
          </Button>
        </div>
      )
    }
  ], [navigate]);

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[1400px] mx-auto space-y-6 pb-10 bg-[#f8fafc] min-h-screen">
      
      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl no-print">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                <FileText size={18} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">Goods Receipt Notes</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl">
              INCOMING STOCK • WAREHOUSE RECEIVING & VALIDATION
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-3 bg-[#111827] border border-slate-800 p-2 rounded-lg shadow-inner">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">System Online</span>
            </div>
            {hasPermission('CREATE_PURCHASES') && (
              <button 
                onClick={() => navigate('/purchases/grn/new')}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-bold text-sm tracking-wider uppercase transition-colors shadow-lg border border-blue-400 flex items-center gap-2"
              >
                <Plus size={16} strokeWidth={3} /> New Receipt
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg transition-all">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total GRNs</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white font-mono tracking-tighter">{grns.length}</span>
                <span className="text-xs text-slate-500 font-medium">Receipts</span>
              </div>
            </div>
            <div className="p-2.5 bg-slate-800/50 text-slate-300 rounded-lg group-hover:bg-slate-700 transition-colors">
              <FileText size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-slate-800"><div className="h-full bg-slate-400 w-full"></div></div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-emerald-400 transition-all">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Validated</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-800 font-mono tracking-tighter">
                  {grns.filter(g => g.status === 'VALIDATED').length}
                </span>
              </div>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <ShoppingBag size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-emerald-100"><div className="h-full bg-emerald-500 w-[75%]"></div></div>
        </div>

        <div className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-amber-400 transition-all">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-1">Draft / Confirmed</p>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black text-slate-800 font-mono tracking-tighter">
                  {grns.filter(g => g.status === 'DRAFT' || g.status === 'CONFIRMED').length}
                </span>
              </div>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <PieChart size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-amber-100"><div className="h-full bg-amber-500 w-[50%]"></div></div>
        </div>

        <div className="bg-white border border-rose-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-rose-400 transition-all bg-gradient-to-br from-white to-rose-50/30">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-rose-600 uppercase tracking-widest mb-1">Cancelled</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-rose-700 font-mono tracking-tighter">
                  {grns.filter(g => g.status === 'CANCELLED').length}
                </span>
              </div>
            </div>
            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-lg group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <Truck size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-rose-100"><div className="h-full bg-rose-600 w-full"></div></div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-center w-full">
          
          {/* Search Input */}
          <div className="relative w-full sm:w-1/3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Filter Database</label>
            <SearchInput
              placeholder="SCAN BY GRN NUMBER OR SUPPLIER..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-10 rounded-md border-2 border-slate-200 bg-slate-50 shadow-sm font-mono text-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-0 transition-colors uppercase w-full"
            />
          </div>

          {/* Branch Filter */}
          <div className="relative w-full sm:w-1/4">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Branch / Location</label>
            <div className="relative">
              <Filter size={16} className="absolute left-3 top-3 text-slate-400" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-md border-2 border-slate-200 bg-slate-50 shadow-sm font-bold text-sm text-slate-700 focus:border-blue-600 focus:ring-0 transition-colors appearance-none"
              >
                <option value="">ALL BRANCHES</option>
                {branches.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Filter */}
          <div className="relative w-full sm:w-1/4">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Receipt Date</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-md border-2 border-slate-200 bg-slate-50 shadow-sm font-bold text-sm text-slate-700 focus:border-blue-600 focus:ring-0 transition-colors"
            />
          </div>

        </div>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-xl flex flex-col pb-4">
        <div className="w-full overflow-x-auto custom-scroll min-h-[400px]">
          <table className="w-full text-left border-collapse min-w-[850px] font-mono">
            <thead>
              <tr className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-widest border-b-2 border-slate-200">
                <th className="py-4 px-4 font-black" scope="col">GRN Number</th>
                <th className="py-4 px-3 font-black" scope="col">Date</th>
                <th className="py-4 px-3 font-black" scope="col">Supplier</th>
                <th className="py-4 px-3 font-black" scope="col">Destination</th>
                <th className="py-4 px-3 font-black" scope="col">PO Ref</th>
                <th className="py-4 px-3 font-black text-center" scope="col">Status</th>
                <th className="py-4 px-4 font-black text-right" scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="animate-spin rounded-none h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
                      <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Fetching Database...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedGRNs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <FileText size={48} className="text-slate-200 mb-2" />
                      <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">0 Records Found</p>
                      <p className="text-xs text-slate-400 font-mono">No goods receipt notes match current parameters.</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedGRNs.map(grn => (
                <tr key={grn._id} className="hover:bg-slate-50 transition-colors group">
                  <td className="py-3 px-4 font-mono font-bold text-indigo-600 whitespace-nowrap">
                    {grn.grnNumber}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-700">
                    {format(new Date(grn.receiptDate), 'MMM d, yyyy')}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900">{grn.supplierId?.name || 'N/A'}</span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="font-bold text-slate-600">{grn.branchId?.name || 'N/A'}</span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {grn.purchaseOrderId ? `PO-${grn.purchaseOrderId._id.slice(-6).toUpperCase()}` : '-'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    {getStatusBadge(grn.status)}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/purchases/grn/${grn._id}`)}
                      className="text-blue-600 hover:bg-blue-50 p-2"
                      title="View Details"
                    >
                      <Eye size={18} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {!loading && filteredGRNs.length > 0 && (
          <div className="px-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Showing {(page - 1) * limit + 1}-{Math.min(page * limit, filteredGRNs.length)} of {filteredGRNs.length} items
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-50 transition-colors font-black"
              >
                &lt;
              </button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-8 h-8 rounded text-xs font-bold transition-colors ${page === i + 1 ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-50 transition-colors font-black"
              >
                &gt;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GRN;
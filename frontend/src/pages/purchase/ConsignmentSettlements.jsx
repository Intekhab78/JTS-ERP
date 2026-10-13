import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Eye, Play, Zap, FileText } from 'lucide-react';
import { useCurrency } from '../../contexts/CurrencyContext';
import { SearchInput } from '../../components/ui/SearchInput';

export default function ConsignmentSettlements() {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchSettlements();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, page, statusFilter]);

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/v1/consignment-settlements?page=${page}&limit=20&search=${searchTerm}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      let data = res.data.data || [];
      if (statusFilter) {
        data = data.filter(s => s.status === statusFilter);
      }
      setSettlements(data);
      setPagination(res.data.pagination || { total: data.length, pages: 1 });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT': return <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-slate-200 text-slate-700">DRAFT</span>;
      case 'VALIDATED': return <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700">VALIDATED</span>;
      case 'CANCELLED': return <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-rose-100 text-rose-700">CANCELLED</span>;
      default: return <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  const kpis = {
    total: settlements.length,
    validated: settlements.filter(s => s.status === 'VALIDATED').length,
    drafts: settlements.filter(s => s.status === 'DRAFT').length
  };

  return (
    <main className="animate-in fade-in zoom-in-95 duration-500 space-y-6 max-w-[1400px] mx-auto pb-10 bg-[#f8fafc] min-h-screen">
      
      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                <FileText size={18} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">Consignment Settlements</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl uppercase tracking-widest ml-14">
              PREPARE CONSUMED SUPPLIER INVENTORY FOR INVOICING AND PAYMENT
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button 
              onClick={() => navigate('/purchases/consignments/settlements/new')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-md font-bold text-sm tracking-wider uppercase transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400 flex items-center gap-2"
            >
              <Plus size={16} strokeWidth={3} /> New Settlement
            </button>
          </div>
        </div>
      </div>

      {/* Control Panel (Sharp & High Contrast) */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:max-w-2xl">
          <div className="relative w-full sm:w-64">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Status Filter</label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none"
            >
              <option value="">-- ALL STATUSES --</option>
              <option value="DRAFT">DRAFT</option>
              <option value="VALIDATED">VALIDATED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
          <div className="relative w-full sm:flex-1">
             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Search Settlements</label>
             <SearchInput 
               placeholder="SCAN BY ID..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="h-10 rounded-md border-2 border-slate-200 bg-slate-50 shadow-sm font-mono text-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-0 transition-colors uppercase w-full"
             />
          </div>
        </div>
      </div>

      {/* Aggressive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-slate-300 transition-all">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Settlements</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{kpis.total}</h3>
            </div>
            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-slate-800 group-hover:text-white transition-colors">
              <Play size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-slate-200"><div className="h-full bg-slate-800 w-full"></div></div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-emerald-400 transition-all">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Validated</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{kpis.validated}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Zap size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-emerald-100"><div className="h-full bg-emerald-500 w-[80%]"></div></div>
        </div>

        <div className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-amber-400 transition-all">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-1">Drafts</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{kpis.drafts}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <FileText size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-amber-100"><div className="h-full bg-amber-500 w-[30%]"></div></div>
        </div>
      </div>

      {/* Pro Data Table */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Zap size={16} className="text-blue-500" /> Settlement Matrix
          </h2>
          <span className="text-xs font-bold text-slate-500 font-mono px-2 py-1 bg-slate-200 rounded">ROWS: {settlements.length}</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border-b-2 border-slate-100">
              <tr>
                <th className="px-6 py-4">Settlement No</th>
                <th className="px-6 py-4">Agreement</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Total Amount</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="animate-spin rounded-none h-10 w-10 border-4 border-slate-200 border-t-blue-500"></div>
                      <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Loading...</p>
                    </div>
                  </td>
                </tr>
              ) : settlements.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <FileText size={48} className="mb-4 opacity-20" />
                      <p className="text-sm font-bold uppercase tracking-widest">No settlements found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                settlements.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => navigate(`/purchases/consignments/settlements/${s._id}`)}
                        className="font-bold text-slate-900 text-sm tracking-tight hover:text-blue-600 transition-colors flex items-center"
                      >
                        {s.settlementNumber}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-mono font-bold text-slate-700 text-sm tracking-tight bg-slate-100 inline-block px-2 py-1 rounded">
                        {s.consignmentId?.consignmentNumber || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 text-sm tracking-tight">{s.supplierId?.name || 'Unknown'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-600 text-sm tracking-tight">{new Date(s.settlementDate).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-mono font-black text-blue-700 text-sm tracking-tight bg-blue-50 px-2 py-1 rounded inline-block">
                        {formatCurrency(s.totalAmount)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(s.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button 
                         onClick={() => navigate(`/purchases/consignments/settlements/${s._id}`)}
                         className="h-8 w-8 inline-flex items-center justify-center rounded bg-white border-2 border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm"
                       >
                         <Eye size={14} strokeWidth={3} />
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination Controls */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
           <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
             Showing Page {page} of {pagination.pages}
           </div>
           <div className="flex gap-2">
             <button 
               onClick={() => setPage(p => Math.max(1, p - 1))} 
               disabled={page === 1 || loading}
               className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-bold uppercase tracking-widest text-slate-600 disabled:opacity-50 hover:bg-slate-50"
             >
               Prev
             </button>
             <button 
               onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} 
               disabled={page === pagination.pages || loading}
               className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-bold uppercase tracking-widest text-slate-600 disabled:opacity-50 hover:bg-slate-50"
             >
               Next
             </button>
           </div>
        </div>
      </div>
      
    </main>
  );
}

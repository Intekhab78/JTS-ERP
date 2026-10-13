import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, RotateCcw, Eye, ShieldCheck, Clock, FileText, CheckCircle, AlertCircle, XCircle, TrendingDown, AlertTriangle, Zap, Package } from 'lucide-react';
import { SearchInput } from '../../components/ui/SearchInput';
import { useCurrency } from '../../contexts/CurrencyContext';

export default function VendorReturns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const res = await axios.get('/api/v1/vendor-returns', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setReturns(res.data.data ? res.data.data : res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT': return <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-slate-200 text-slate-700">DRAFT</span>;
      case 'CONFIRMED': return <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700">CONFIRMED</span>;
      case 'VALIDATED': return <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700">VALIDATED</span>;
      case 'CANCELLED': return <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-rose-100 text-rose-700">CANCELLED</span>;
      default: return <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  const filteredReturns = returns.filter(vr => {
    const matchesSearch = vr.vendorReturnNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || vr.supplierId?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || vr.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const kpis = {
    total: returns.length,
    validated: returns.filter(r => r.status === 'VALIDATED').length,
    pending: returns.filter(r => ['DRAFT', 'CONFIRMED'].includes(r.status)).length,
    cancelled: returns.filter(r => r.status === 'CANCELLED').length
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
                <RotateCcw size={18} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">Live Return Command</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl uppercase tracking-widest">
              RETURN MANAGEMENT • DEBIT NOTES & LOGISTICS
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-3 bg-[#111827] border border-slate-800 p-2.5 rounded-lg shadow-inner">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">System Online</span>
            </div>
            <button 
              onClick={() => navigate('/purchases/returns/new')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-md font-bold text-sm tracking-wider uppercase transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400 flex items-center gap-2"
            >
              <Plus size={16} strokeWidth={3} /> New Return
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
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="VALIDATED">VALIDATED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
          <div className="relative w-full sm:flex-1">
             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Filter Database</label>
             <SearchInput 
               placeholder="SCAN BY SUPPLIER OR RETURN #..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="h-10 rounded-md border-2 border-slate-200 bg-slate-50 shadow-sm font-mono text-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-0 transition-colors uppercase"
             />
          </div>
        </div>
      </div>

      {/* Aggressive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-slate-300 transition-all">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Returns</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{kpis.total}</h3>
            </div>
            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-slate-800 group-hover:text-white transition-colors">
              <FileText size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-slate-200"><div className="h-full bg-slate-800 w-full"></div></div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-emerald-400 transition-all relative">
          <div className="absolute top-0 right-0 p-2"><div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div></div>
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Validated</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{kpis.validated}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <CheckCircle size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-emerald-100"><div className="h-full bg-emerald-500 w-[75%]"></div></div>
        </div>

        <div className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-amber-400 transition-all">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-1">Pending Actions</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{kpis.pending}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Clock size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-amber-100"><div className="h-full bg-amber-500 w-[50%]"></div></div>
        </div>

        <div className="bg-white border border-rose-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-rose-400 transition-all bg-gradient-to-br from-white to-rose-50/30">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-rose-600 uppercase tracking-widest mb-1">Cancelled</p>
              <h3 className="text-3xl font-black text-rose-700 font-mono tracking-tighter">{kpis.cancelled}</h3>
            </div>
            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-lg group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <XCircle size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-rose-100"><div className="h-full bg-rose-600 w-full"></div></div>
        </div>

      </div>

      {/* Pro Data Table */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Zap size={16} className="text-blue-500" /> Return Matrix
          </h2>
          <span className="text-xs font-bold text-slate-500 font-mono px-2 py-1 bg-slate-200 rounded">ROWS: {filteredReturns.length}</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border-b-2 border-slate-100">
              <tr>
                <th className="px-6 py-4">Return Number</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Context</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Date</th>
                <th className="px-6 py-4">Status</th>
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
              ) : filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <FileText size={48} className="mb-4 opacity-20" />
                      <p className="text-sm font-bold uppercase tracking-widest">No returns found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReturns.map((vr) => (
                  <tr key={vr._id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => navigate(`/purchases/returns/${vr._id}`)}
                        className="font-bold text-slate-900 text-sm tracking-tight hover:text-blue-600 transition-colors"
                      >
                        {vr.vendorReturnNumber || `VR-${vr._id.slice(-6).toUpperCase()}`}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 text-sm tracking-tight">{vr.supplierId?.name || 'Unknown'}</p>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5 font-mono bg-slate-100 inline-block px-1.5 py-0.5 rounded uppercase">{vr.returnType ? vr.returnType.replace('_', ' ') : 'SINGLE GRN'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 inline-block px-1.5 py-0.5 rounded">PO: {vr.returnType === 'SUPPLIER_CONSOLIDATED' ? 'MULTIPLE' : (vr.purchaseOrderId?.purchaseOrderNumber || '-')}</div>
                      <div className="mt-1 font-mono text-[11px] font-bold text-slate-600 bg-slate-100 inline-block px-1.5 py-0.5 rounded">GRN: {vr.returnType === 'SINGLE_GRN' ? (vr.grnId?.grnNumber || '-') : 'MULTIPLE'}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mb-0.5">AED</div>
                      <div className="font-mono font-bold text-slate-900 text-sm">{vr.totalReturnAmount ? vr.totalReturnAmount.toFixed(2) : '0.00'}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="font-mono font-bold text-slate-700 text-xs bg-slate-100 inline-block px-2 py-1 rounded">{new Date(vr.returnDate).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(vr.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button 
                         onClick={() => navigate(`/purchases/returns/${vr._id}`)}
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
      </div>
    </main>
  );
}

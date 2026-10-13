import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, CheckCircle, Zap, Server, ChevronLeft, ChevronRight, Activity, Play, FileText, ArrowRightLeft } from 'lucide-react';
import { SearchInput } from '../../components/ui/SearchInput';

const StockAdjustments = () => {
  const navigate = useNavigate();
  const [adjustments, setAdjustments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchBranches();
    fetchAdjustments();
  }, []);

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/branches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranches(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/stock/adjustments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdjustments(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const validateAdjustment = async (id) => {
    if (!window.confirm('Validate this adjustment? This will permanently modify stock levels.')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/v1/stock/adjustments/${id}/validate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAdjustments();
    } catch (error) {
      alert(error.response?.data?.message || 'Error validating adjustment');
    }
  };

  const getStatusStyle = (status) => {
    switch(status) {
      case 'VALIDATED': return 'text-emerald-700 bg-emerald-100 border border-emerald-200';
      case 'CANCELLED': return 'text-rose-700 bg-rose-100 border border-rose-200';
      default: return 'text-amber-700 bg-amber-100 border border-amber-200';
    }
  };

  // Derived filtered data
  const filteredAdjustments = adjustments.filter(a => {
    let match = true;
    if (dateFilter) {
      const aDate = new Date(a.createdAt).toISOString().split('T')[0];
      if (aDate !== dateFilter) match = false;
    }
    if (branchFilter && a.branchId?._id !== branchFilter) match = false;
    if (searchQuery) {
      const sq = searchQuery.toLowerCase();
      if (!a.referenceNumber?.toLowerCase().includes(sq) && !a.reason?.toLowerCase().includes(sq)) {
        match = false;
      }
    }
    return match;
  });

  const kpis = {
    total: filteredAdjustments.length,
    validated: filteredAdjustments.filter(a => a.status === 'VALIDATED').length,
    drafts: filteredAdjustments.filter(a => a.status === 'DRAFT').length,
  };

  const totalPages = Math.ceil(filteredAdjustments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredAdjustments.slice(startIndex, endIndex);

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 max-w-[1400px] mx-auto pb-10 bg-[#f8fafc] min-h-screen">
      
      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                <Activity size={18} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">Stock Adjustments</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl uppercase tracking-widest ml-14">
              MANAGE PHYSICAL INVENTORY COUNTS & DISCREPANCIES
            </p>
          </div>
          
          <div className="flex items-center gap-4">
             <button 
               onClick={() => navigate('/inventory/adjustments/new')}
               className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-md font-bold text-sm tracking-wider uppercase transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400 flex items-center gap-2"
             >
               <Plus size={16} strokeWidth={3} /> New Adjustment
             </button>
          </div>
        </div>
      </div>

      {/* Control Panel (Sharp & High Contrast) */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full sm:max-w-4xl">
          <div className="relative">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Scan / Search Reference</label>
            <SearchInput 
               placeholder="SCAN BARCODE..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="h-10 rounded-md border-2 border-slate-200 bg-slate-50 shadow-sm font-mono text-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-0 transition-colors uppercase w-full"
            />
          </div>
          <div className="relative">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Date Filter</label>
            <input 
               type="date"
               value={dateFilter}
               onChange={(e) => setDateFilter(e.target.value)}
               className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors outline-none"
             />
          </div>
          <div className="relative">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Branch Filter</label>
            <select 
              value={branchFilter} 
              onChange={(e) => setBranchFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none uppercase"
            >
              <option value="">-- ALL BRANCHES --</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Aggressive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-slate-300 transition-all">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Logs</p>
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
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Validated Adjustments</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{kpis.validated}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Zap size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-emerald-100"><div className="h-full bg-emerald-500 w-[70%]"></div></div>
        </div>

        <div className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-amber-400 transition-all">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-1">Pending Drafts</p>
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
            <Zap size={16} className="text-blue-500" /> Adjustments Matrix
          </h2>
          <span className="text-xs font-bold text-slate-500 font-mono px-2 py-1 bg-slate-200 rounded">RECORDS: {filteredAdjustments.length}</span>
        </div>
        
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border-b-2 border-slate-100">
              <tr>
                <th className="px-6 py-4">Reference & Date</th>
                <th className="px-6 py-4">Branch</th>
                <th className="px-6 py-4">Reason</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="animate-spin rounded-none h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
                      <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Fetching Database...</p>
                    </div>
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Server size={48} className="text-slate-200 mb-2" />
                      <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">0 Records Found</p>
                      <p className="text-xs text-slate-400 font-mono">No adjustments match current parameters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map(a => {
                  return (
                    <tr key={a._id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-sm tracking-tight font-mono">{a.referenceNumber || 'N/A'}</div>
                        <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest mt-1">
                          {new Date(a.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{a.branchId?.name || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{a.reason || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest ${getStatusStyle(a.status)}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {a.status === 'DRAFT' && (
                          <button 
                            onClick={() => validateAdjustment(a._id)} 
                            className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-colors shadow-sm"
                          >
                            <CheckCircle size={12} strokeWidth={3} /> Validate
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && totalPages > 0 && (
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 flex items-center justify-between">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Showing <span className="text-slate-800">{startIndex + 1}</span> to <span className="text-slate-800">{Math.min(endIndex, filteredAdjustments.length)}</span> of <span className="text-slate-800">{filteredAdjustments.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="text-[10px] font-bold text-slate-700 font-mono px-2 uppercase tracking-widest">
                PAGE {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default StockAdjustments;

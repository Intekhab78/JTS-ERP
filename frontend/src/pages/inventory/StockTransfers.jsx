import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { Plus, CheckCircle, ArrowRightLeft, FileText, Zap, Play } from 'lucide-react';

const StockTransfers = () => {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [destFilter, setDestFilter] = useState('');

  useEffect(() => {
    fetchTransfers();
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/branches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranches(res.data);
    } catch (error) {
      console.error('Failed to fetch branches');
    }
  };

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/stock/transfers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransfers(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const validateTransfer = async (id) => {
    if (!window.confirm('Validate this transfer? It will move stock immediately.')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/v1/stock/transfers/${id}/validate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTransfers();
    } catch (error) {
      alert(error.response?.data?.message || 'Error validating transfer');
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
  const filteredTransfers = transfers.filter(t => {
    let match = true;
    if (dateFilter) {
      const tDate = new Date(t.createdAt).toISOString().split('T')[0];
      if (tDate !== dateFilter) match = false;
    }
    if (sourceFilter && t.sourceBranchId?._id !== sourceFilter) match = false;
    if (destFilter && t.destinationBranchId?._id !== destFilter) match = false;
    if (searchQuery) {
      const sq = searchQuery.toLowerCase();
      if (!t.referenceNumber?.toLowerCase().includes(sq)) {
        match = false;
      }
    }
    return match;
  });

  const kpis = {
    total: filteredTransfers.length,
    validated: filteredTransfers.filter(t => t.status === 'VALIDATED').length,
    drafts: filteredTransfers.filter(t => t.status === 'DRAFT').length,
  };

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
                <ArrowRightLeft size={18} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">Stock Transfers</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl uppercase tracking-widest ml-14">
              INTER-BRANCH LOGISTICS • MONITOR INVENTORY TRANSIT
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button 
              onClick={() => navigate('/inventory/transfers/new')} 
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-md font-bold text-sm tracking-wider uppercase transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400 flex items-center gap-2"
            >
              <Plus size={16} strokeWidth={3} /> New Transfer
            </button>
          </div>
        </div>
      </div>

      {/* Control Panel (Sharp & High Contrast) */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 w-full">
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
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Source Branch</label>
            <select 
              value={sourceFilter} 
              onChange={(e) => setSourceFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none uppercase"
            >
              <option value="">-- ALL --</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Destination Branch</label>
            <select 
              value={destFilter} 
              onChange={(e) => setDestFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none uppercase"
            >
              <option value="">-- ALL --</option>
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
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Validated Transit</p>
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

      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Zap size={16} className="text-blue-500" /> Transfer Matrix
          </h2>
          <span className="text-xs font-bold text-slate-500 font-mono px-2 py-1 bg-slate-200 rounded">ROWS: {filteredTransfers.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left font-mono">
            <thead className="text-[10px] font-black text-slate-500 uppercase bg-white border-b-2 border-slate-100 tracking-widest">
              <tr>
                <th className="px-6 py-4">Reference & Date</th>
                <th className="px-6 py-4">Source</th>
                <th className="px-6 py-4">Destination</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="animate-spin rounded-none h-10 w-10 border-4 border-slate-200 border-t-blue-500"></div>
                      <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Loading logistics...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <FileText size={48} className="mb-4 opacity-20" />
                      <p className="text-sm font-bold uppercase tracking-widest">No active transfers.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransfers.map(t => (
                  <tr key={t._id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                       <div className="font-bold text-slate-900 text-sm">{t.referenceNumber}</div>
                       <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest mt-1">
                         {new Date(t.createdAt).toLocaleDateString()}
                       </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700 text-sm uppercase tracking-tight font-sans">
                      {t.sourceBranchId?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700 text-sm uppercase tracking-tight font-sans">
                      {t.destinationBranchId?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest ${getStatusStyle(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {t.status === 'DRAFT' && (
                        <button 
                          onClick={() => validateTransfer(t._id)}
                          className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-500 hover:text-white rounded text-[10px] font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle size={12} strokeWidth={3} /> Validate
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StockTransfers;

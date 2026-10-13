import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Play, Zap, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';

const StockMovements = () => {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      fetchMovements();
    } else {
      setMovements([]);
    }
  }, [selectedBranch]);

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/branches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranches(res.data);
      if (res.data.length > 0) {
        setSelectedBranch(res.data[0]._id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/v1/stock/movements/${selectedBranch}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMovements(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type) => {
    if (['GRN', 'TRANSFER_IN', 'MANUFACTURING_PRODUCTION'].includes(type)) return 'text-emerald-700 bg-emerald-100 border border-emerald-200';
    if (['DELIVERY', 'TRANSFER_OUT', 'MANUFACTURING_CONSUMPTION', 'CONSIGNMENT_CONSUMPTION'].includes(type)) return 'text-rose-700 bg-rose-100 border border-rose-200';
    return 'text-blue-700 bg-blue-100 border border-blue-200';
  };

  // Derived filtered data
  const filteredMovements = movements.filter(m => {
    let match = true;
    if (dateFilter) {
      const mDate = new Date(m.createdAt).toISOString().split('T')[0];
      if (mDate !== dateFilter) match = false;
    }
    if (searchQuery) {
      const sq = searchQuery.toLowerCase();
      if (!m.referenceId?.toLowerCase().includes(sq) && !m.productId?.name?.toLowerCase().includes(sq)) {
        match = false;
      }
    }
    return match;
  });

  // KPI Calculations
  const totalMovements = filteredMovements.length;
  const stockIn = filteredMovements.filter(m => m.quantity > 0).reduce((acc, m) => acc + m.quantity, 0);
  const stockOut = filteredMovements.filter(m => m.quantity < 0).reduce((acc, m) => acc + Math.abs(m.quantity), 0);

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
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">Stock Movements</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-widest ml-14">
              INVENTORY LEDGER • TRACK ALL PHYSICAL STOCK CHANGES
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-[#111827] border border-slate-800 p-2 rounded-lg shadow-inner">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">System Online</span>
          </div>
        </div>
      </div>

      {/* Control Panel (Sharp & High Contrast) */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:max-w-4xl">
          <div className="relative w-full sm:w-64">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Target Branch</label>
            <select 
              value={selectedBranch} 
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none uppercase"
            >
              {branches.length === 0 && <option value="">-- NO BRANCHES --</option>}
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="relative w-full sm:w-48">
             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Date Filter</label>
             <input 
               type="date"
               value={dateFilter}
               onChange={(e) => setDateFilter(e.target.value)}
               className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors outline-none"
             />
          </div>
          <div className="relative w-full sm:flex-1">
             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Search Reference or Product</label>
             <SearchInput 
               placeholder="SCAN OR TYPE SEARCH..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
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
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Logs</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{totalMovements}</h3>
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
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Stock In</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{stockIn}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <ArrowDownToLine size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-emerald-100"><div className="h-full bg-emerald-500 w-[70%]"></div></div>
        </div>

        <div className="bg-white border border-rose-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-rose-400 transition-all">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-rose-600 uppercase tracking-widest mb-1">Total Stock Out</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{stockOut}</h3>
            </div>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-rose-500 group-hover:text-white transition-colors">
              <ArrowUpFromLine size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-rose-100"><div className="h-full bg-rose-500 w-[45%]"></div></div>
        </div>
      </div>

      {/* Pro Data Table */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Zap size={16} className="text-blue-500" /> Ledger Matrix
          </h2>
          <span className="text-xs font-bold text-slate-500 font-mono px-2 py-1 bg-slate-200 rounded">ROWS: {filteredMovements.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] font-black text-slate-500 uppercase bg-white border-b-2 border-slate-100 tracking-widest">
              <tr>
                <th className="px-6 py-4">Date / Time</th>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4 text-center">Type</th>
                <th className="px-6 py-4 text-right">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="animate-spin rounded-none h-10 w-10 border-4 border-slate-200 border-t-blue-500"></div>
                      <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Syncing Ledger...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Activity size={48} className="mb-4 opacity-20" />
                      <p className="text-sm font-bold uppercase tracking-widest">No stock movements found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMovements.map(m => (
                  <tr key={m._id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                       <div className="font-mono font-bold text-slate-900 text-sm">{new Date(m.createdAt).toLocaleDateString()}</div>
                       <div className="font-mono text-[10px] text-slate-400 uppercase">{new Date(m.createdAt).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="font-bold text-slate-800 text-sm bg-slate-100 px-2 py-1 rounded inline-block tracking-tight">
                         {m.referenceId}
                       </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700 text-sm uppercase tracking-tight">
                       {m.productId?.name || 'Unknown Product'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest ${getTypeColor(m.type)}`}>
                        {m.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-mono font-black text-lg px-3 py-1 rounded bg-slate-50 shadow-sm ${m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.quantity > 0 ? '+' : ''}{m.quantity}
                      </span>
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

export default StockMovements;

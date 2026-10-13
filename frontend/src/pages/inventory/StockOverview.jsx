import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { SearchInput } from '../../components/ui/SearchInput';
import { Box, AlertTriangle, CheckCircle, Package, Zap, TrendingDown, Server, ArrowRight } from 'lucide-react';

const StockOverview = () => {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      fetchStock();
    } else {
      setStock([]);
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

  const fetchStock = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/v1/stock/${selectedBranch}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStock(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Filter stock based on search
  const filteredStock = useMemo(() => {
    return stock.filter(s => {
      const p = s.productId || {};
      const searchStr = searchQuery.toLowerCase();
      return (p.name || '').toLowerCase().includes(searchStr) || 
             (p.sku || '').toLowerCase().includes(searchStr);
    });
  }, [stock, searchQuery]);

  // Derived metrics for summary cards
  const totalItems = filteredStock.length;
  const inStockItems = filteredStock.filter(s => s.quantity > 0).length;
  const lowStockItems = filteredStock.filter(s => s.quantity > 0 && s.quantity <= 10).length;
  const outOfStockItems = filteredStock.filter(s => s.quantity <= 0).length;

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
                <Server size={18} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">Live Inventory Command</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl">
              REAL-TIME TERMINAL • MONITORING PHYSICAL STOCK METRICS
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
        <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:max-w-2xl">
          <div className="relative w-full sm:w-64">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Target Branch</label>
            <select 
              value={selectedBranch} 
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none"
            >
              <option value="">-- SELECT TARGET --</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="relative w-full sm:flex-1">
             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Filter Database</label>
             <SearchInput 
               placeholder="SCAN BY PRODUCT OR SKU..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
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
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total SKUs</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{totalItems}</h3>
            </div>
            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-slate-800 group-hover:text-white transition-colors">
              <Package size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-slate-200"><div className="h-full bg-slate-800 w-full"></div></div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-emerald-400 transition-all relative">
          <div className="absolute top-0 right-0 p-2"><div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div></div>
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Active Stock</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{inStockItems - lowStockItems}</h3>
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
              <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-1">Warning: Low</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{lowStockItems}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <TrendingDown size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-amber-100"><div className="h-full bg-amber-500 w-[30%]"></div></div>
        </div>

        <div className="bg-white border border-rose-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-rose-400 transition-all bg-gradient-to-br from-white to-rose-50/30">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-rose-600 uppercase tracking-widest mb-1">Critical: Empty</p>
              <h3 className="text-3xl font-black text-rose-700 font-mono tracking-tighter">{outOfStockItems}</h3>
            </div>
            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-lg group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <AlertTriangle size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-rose-100"><div className="h-full bg-rose-600 w-full"></div></div>
        </div>

      </div>

      {/* Pro Data Table */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Zap size={16} className="text-blue-500" /> Inventory Matrix
          </h2>
          <span className="text-xs font-bold text-slate-500 font-mono px-2 py-1 bg-slate-200 rounded">ROWS: {filteredStock.length}</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border-b-2 border-slate-100">
              <tr>
                <th className="px-6 py-4">Item Designation</th>
                <th className="px-6 py-4">Classification</th>
                <th className="px-6 py-4">System Status</th>
                <th className="px-6 py-4 text-right">Physical Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="animate-spin rounded-none h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
                      <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Fetching Database...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredStock.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Server size={48} className="text-slate-200 mb-2" />
                      <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">0 Records Found</p>
                      <p className="text-xs text-slate-400 font-mono">No entities match current parameters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStock.map(s => {
                  const product = s.productId || {};
                  const isOutOfStock = s.quantity <= 0;
                  const isLowStock = s.quantity > 0 && s.quantity <= 10;
                  
                  return (
                    <tr key={s._id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${isOutOfStock ? 'bg-rose-500' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm tracking-tight">{product.name || 'UNKNOWN_ITEM'}</p>
                            <p className="text-[11px] font-bold text-slate-400 mt-0.5 font-mono bg-slate-100 inline-block px-1.5 py-0.5 rounded">ID: {product.sku || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                           {product.department || 'STANDARD'}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {isOutOfStock ? (
                           <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-black bg-rose-600 text-white uppercase tracking-widest shadow-sm">
                             DEFICIT
                           </span>
                        ) : isLowStock ? (
                           <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-black bg-amber-500 text-white uppercase tracking-widest shadow-sm">
                             WARNING
                           </span>
                        ) : (
                           <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-black bg-emerald-500 text-white uppercase tracking-widest shadow-sm">
                             OPTIMAL
                           </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`text-xl font-black font-mono tracking-tighter ${isOutOfStock ? 'text-rose-600' : 'text-slate-900'}`}>
                            {s.quantity}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{product.uom || 'PCS'}</span>
                        </div>
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

export default StockOverview;

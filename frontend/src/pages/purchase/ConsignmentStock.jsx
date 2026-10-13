import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PackageSearch, MapPin, RefreshCw, LogOut, Package, Zap, Filter } from 'lucide-react';
import { SearchInput } from '../../components/ui/SearchInput';

export default function ConsignmentStock() {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [branches, setBranches] = useState([]);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'consume' or 'return'
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionQuantity, setActionQuantity] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchLookups();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchStock();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [page, searchTerm, branchFilter, dateFilter]);

  const fetchLookups = async () => {
    try {
      const res = await axios.get('/api/v1/branches', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBranches(res.data);
    } catch (error) {
      console.error('Failed to load branches', error);
    }
  };

  const fetchStock = async () => {
    setLoading(true);
    try {
      // Assuming backend supports these query params, if not they will be ignored
      const queryParams = new URLSearchParams({
        page,
        limit: 20,
        search: searchTerm,
        branchId: branchFilter,
        date: dateFilter
      });
      
      const res = await axios.get(`/api/v1/consignment-stock?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      let data = res.data.data || [];
      
      // Fallback local filtering if backend doesn't support it fully
      if (branchFilter) {
        data = data.filter(s => s.branchId?._id === branchFilter);
      }
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        data = data.filter(s => 
          s.productId?.name?.toLowerCase().includes(lowerSearch) || 
          s.productId?.sku?.toLowerCase().includes(lowerSearch) ||
          s.supplierId?.name?.toLowerCase().includes(lowerSearch)
        );
      }
      
      setStock(data);
      setPagination(res.data.pagination || { total: data.length, pages: 1 });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (item, type) => {
    setSelectedItem(item);
    setModalType(type);
    setActionQuantity('');
    setActionReason('');
    setShowModal(true);
  };

  const handleAction = async (e) => {
    e.preventDefault();
    if (!actionQuantity || actionQuantity <= 0) return alert('Quantity must be greater than 0');
    if (actionQuantity > selectedItem.availableQuantity) return alert('Cannot exceed available quantity');

    setActionLoading(true);
    try {
      const endpoint = modalType === 'consume' ? 'consume' : 'return';
      await axios.post(`/api/v1/consignment-stock/stock/${selectedItem._id}/${endpoint}`, {
        quantity: Number(actionQuantity),
        reason: actionReason
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setShowModal(false);
      fetchStock();
    } catch (error) {
      alert(error.response?.data?.message || `Failed to ${modalType}`);
    } finally {
      setActionLoading(false);
    }
  };

  const kpis = {
    totalItems: stock.length,
    totalAvailable: stock.reduce((sum, item) => sum + (item.availableQuantity || 0), 0),
    totalConsumed: stock.reduce((sum, item) => sum + (item.consumedQuantity || 0), 0),
    totalReturned: stock.reduce((sum, item) => sum + (item.returnedQuantity || 0), 0),
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
                <PackageSearch size={18} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">Consignment Stock</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl uppercase tracking-widest ml-14">
              MONITOR AND MANAGE SUPPLIER-OWNED INVENTORY PHYSICALLY PRESENT
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-3 bg-[#111827] border border-slate-800 p-2.5 rounded-lg shadow-inner">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Live Sync</span>
            </div>
            <button 
              onClick={fetchStock}
              disabled={loading}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2.5 rounded-md font-bold text-sm tracking-wider uppercase transition-colors flex items-center gap-2"
            >
              <RefreshCw size={16} className={loading ? "animate-spin text-blue-400" : "text-blue-400"} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Control Panel (Sharp & High Contrast) */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          <div className="relative">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Scan / Search</label>
            <SearchInput 
              placeholder="PRODUCT, SKU, OR SUPPLIER..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 rounded-md border-2 border-slate-200 bg-slate-50 shadow-sm font-mono text-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-0 transition-colors uppercase w-full"
            />
          </div>
          <div className="relative">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Branch Filter</label>
            <select 
              value={branchFilter} 
              onChange={(e) => setBranchFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none"
            >
              <option value="">-- ALL BRANCHES --</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Date Filter</label>
            <input 
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors uppercase outline-none"
            />
          </div>
        </div>
      </div>

      {/* Aggressive KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Stock Lines</p>
            <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tighter">{kpis.totalItems}</h3>
          </div>
          <div className="h-1 w-full bg-slate-200"></div>
        </div>
        
        <div className="bg-white border border-blue-200 rounded-xl overflow-hidden shadow-sm relative">
          <div className="absolute top-0 right-0 p-2"><div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div></div>
          <div className="p-4">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Total Available</p>
            <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tighter">{kpis.totalAvailable}</h3>
          </div>
          <div className="h-1 w-full bg-blue-500"></div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Consumed</p>
            <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tighter">{kpis.totalConsumed}</h3>
          </div>
          <div className="h-1 w-full bg-emerald-500"></div>
        </div>

        <div className="bg-white border border-orange-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4">
            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1">Total Returned</p>
            <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tighter">{kpis.totalReturned}</h3>
          </div>
          <div className="h-1 w-full bg-orange-500"></div>
        </div>
      </div>

      {/* Pro Data Table */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Zap size={16} className="text-blue-500" /> Consignment Inventory Matrix
          </h2>
          <span className="text-xs font-bold text-slate-500 font-mono px-2 py-1 bg-slate-200 rounded">ROWS: {stock.length}</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border-b-2 border-slate-100">
              <tr>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4 text-right">Received</th>
                <th className="px-6 py-4 text-right text-emerald-600">Consumed</th>
                <th className="px-6 py-4 text-right text-orange-600">Returned</th>
                <th className="px-6 py-4 text-right text-blue-600">Available</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="animate-spin rounded-none h-10 w-10 border-4 border-slate-200 border-t-blue-500"></div>
                      <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Loading Database...</p>
                    </div>
                  </td>
                </tr>
              ) : stock.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Package size={48} className="mb-4 opacity-20" />
                      <p className="text-sm font-bold uppercase tracking-widest">No stock found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                stock.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Package size={14} className="text-slate-400"/> {s.productId?.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 mt-1 uppercase ml-6">SKU: {s.productId?.sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-bold text-slate-800 text-sm">{s.supplierId?.name}</p>
                      <p className="text-[10px] font-mono font-bold text-slate-500 uppercase">{s.consignmentId?.consignmentNumber}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      <div className="flex items-center gap-1 font-bold text-[11px] tracking-widest uppercase bg-slate-100 px-2 py-1 rounded inline-flex">
                        <MapPin size={12} className="text-slate-400"/> {s.branchId?.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-slate-700 text-right bg-slate-50/50">{s.receivedQuantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-emerald-600 text-right bg-emerald-50/50">{s.consumedQuantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-orange-600 text-right bg-orange-50/50">{s.returnedQuantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-black text-blue-700 text-right bg-blue-50/50 text-base">{s.availableQuantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                       <div className="flex justify-end gap-2">
                         <button 
                           onClick={() => openModal(s, 'consume')} 
                           disabled={s.availableQuantity <= 0}
                           className="bg-white border-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded font-bold text-[10px] tracking-widest uppercase transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                           Consume
                         </button>
                         <button 
                           onClick={() => openModal(s, 'return')} 
                           disabled={s.availableQuantity <= 0}
                           className="bg-white border-2 border-orange-200 text-orange-600 hover:bg-orange-50 px-3 py-1.5 rounded font-bold text-[10px] tracking-widest uppercase transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                           Return
                         </button>
                       </div>
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

      {/* Action Modal (Command Center Styled) */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border-2 border-slate-300 w-full max-w-md animate-in zoom-in-95 duration-200 overflow-hidden">
            
            <div className={`p-6 border-b-4 flex items-center gap-3 ${modalType === 'consume' ? 'border-emerald-500 bg-emerald-50' : 'border-orange-500 bg-orange-50'}`}>
              <div className={`h-10 w-10 flex items-center justify-center rounded text-white shadow-inner ${modalType === 'consume' ? 'bg-emerald-500' : 'bg-orange-500'}`}>
                {modalType === 'consume' ? <RefreshCw size={20} /> : <LogOut size={20} />}
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight text-slate-900 uppercase">{modalType} STOCK</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Record a change in supplier inventory</p>
              </div>
            </div>
            
            <form onSubmit={handleAction} className="p-6 space-y-5 bg-white">
              
              <div className="bg-slate-50 p-4 rounded-lg space-y-3 border-2 border-slate-100">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Product Context</p>
                  <p className="font-bold text-sm text-slate-900">{selectedItem.productId?.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Location</p>
                    <p className="font-bold text-sm text-slate-900">{selectedItem.branchId?.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Available Qty</p>
                    <p className="font-mono font-black text-blue-600 text-lg">{selectedItem.availableQuantity}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                  Action Quantity *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={selectedItem.availableQuantity}
                  required
                  className={`flex h-12 w-full rounded-md border-2 bg-slate-50 px-3 py-2 text-xl font-black font-mono shadow-sm focus:ring-0 transition-colors text-right outline-none ${modalType === 'consume' ? 'border-emerald-200 focus:border-emerald-500 text-emerald-700' : 'border-orange-200 focus:border-orange-500 text-orange-700'}`}
                  value={actionQuantity}
                  onChange={(e) => setActionQuantity(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                  Reason / Tracking Notes *
                </label>
                <textarea
                  required
                  rows="2"
                  className="flex w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm focus:border-blue-600 focus:ring-0 transition-colors outline-none"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={`E.g., ${modalType === 'consume' ? 'Consumed into daily manufacturing run' : 'Returned due to expiration'}`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-md font-bold text-xs tracking-widest uppercase transition-colors"
                >
                  Abort
                </button>
                <button 
                  type="submit" 
                  disabled={actionLoading} 
                  className={`text-white px-4 py-2 rounded-md font-bold text-xs tracking-widest uppercase transition-colors shadow-sm disabled:opacity-50 ${modalType === 'consume' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-orange-600 hover:bg-orange-500'}`}
                >
                  Confirm {modalType}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

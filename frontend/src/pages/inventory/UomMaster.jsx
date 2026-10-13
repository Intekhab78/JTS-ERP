import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Server, Play, CheckCircle, XCircle, Zap, ChevronLeft, ChevronRight, Scale } from 'lucide-react';
import { SearchInput } from '../../components/ui/SearchInput';

export default function UomMaster() {
  const [uoms, setUoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', isActive: true });
  const [editingId, setEditingId] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchUoms = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/inventory/uoms?includeInactive=true', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUoms(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch UOMs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUoms();
  }, []);

  const handleOpenModal = (uom = null) => {
    setError('');
    if (uom) {
      setEditingId(uom._id);
      setFormData({ name: uom.name, code: uom.code, isActive: uom.isActive });
    } else {
      setEditingId(null);
      setFormData({ name: '', code: '', isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      if (editingId) {
        await axios.put(`/api/v1/inventory/uoms/${editingId}`, formData, { headers });
      } else {
        await axios.post('/api/v1/inventory/uoms', formData, { headers });
      }
      setIsModalOpen(false);
      fetchUoms();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save UOM');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('WARNING: Are you sure you want to delete this UOM? This action cannot be undone.')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/inventory/uoms/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUoms();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete UOM');
    }
  };

  const filteredItems = useMemo(() => {
    return uoms.filter(item => {
      let match = true;
      if (searchQuery) {
        const sq = searchQuery.toLowerCase();
        const nMatch = item.name?.toLowerCase().includes(sq);
        const cMatch = item.code?.toLowerCase().includes(sq);
        if (!nMatch && !cMatch) match = false;
      }
      if (statusFilter) {
        if (statusFilter === 'active' && item.isActive === false) match = false;
        if (statusFilter === 'inactive' && item.isActive !== false) match = false;
      }
      return match;
    });
  }, [uoms, searchQuery, statusFilter]);

  const kpis = {
    total: filteredItems.length,
    active: filteredItems.filter(i => i.isActive !== false).length,
    inactive: filteredItems.filter(i => i.isActive === false).length,
  };

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredItems.slice(startIndex, endIndex);

  return (
    <>
      <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 max-w-[1400px] mx-auto pb-10 bg-[#f8fafc] min-h-screen">
        
        {/* Aggressive Tech Header */}
        <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                  <Scale size={18} className="text-white" />
                </div>
                <h1 className="text-3xl font-black tracking-tight text-white uppercase">UOM Master</h1>
              </div>
              <p className="text-slate-400 text-sm font-medium uppercase tracking-widest ml-14">
                MASTER DATA MANAGEMENT • MANAGE UNITS OF MEASURE
              </p>
            </div>
            
            <div className="flex items-center gap-4">
               <button 
                 onClick={() => handleOpenModal()}
                 className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-md font-bold text-sm tracking-wider uppercase transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400 flex items-center gap-2"
               >
                 <Plus size={16} strokeWidth={3} /> New UOM
               </button>
            </div>
          </div>
        </div>

        {/* Control Panel (Sharp & High Contrast) */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:max-w-2xl">
            <div className="relative flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Search UOM</label>
              <SearchInput 
                 placeholder="NAME OR CODE..." 
                 value={searchQuery}
                 onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}}
                 className="h-10 rounded-md border-2 border-slate-200 bg-slate-50 shadow-sm font-mono text-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-0 transition-colors uppercase w-full"
              />
            </div>
            <div className="relative w-full sm:w-48">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Status Filter</label>
              <select 
                value={statusFilter} 
                onChange={(e) => {setStatusFilter(e.target.value); setCurrentPage(1);}}
                className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none uppercase"
              >
                <option value="">-- ALL --</option>
                <option value="active">ACTIVE</option>
                <option value="inactive">INACTIVE</option>
              </select>
            </div>
          </div>
        </div>

        {/* Aggressive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-slate-300 transition-all">
            <div className="p-5 flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Records</p>
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
                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Active</p>
                <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{kpis.active}</h3>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <CheckCircle size={22} strokeWidth={2.5} />
              </div>
            </div>
            <div className="h-1.5 w-full bg-emerald-100"><div className="h-full bg-emerald-500 w-[70%]"></div></div>
          </div>

          <div className="bg-white border border-rose-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-rose-400 transition-all">
            <div className="p-5 flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-rose-600 uppercase tracking-widest mb-1">Inactive</p>
                <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{kpis.inactive}</h3>
              </div>
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-rose-500 group-hover:text-white transition-colors">
                <XCircle size={22} strokeWidth={2.5} />
              </div>
            </div>
            <div className="h-1.5 w-full bg-rose-100"><div className="h-full bg-rose-500 w-[30%]"></div></div>
          </div>
        </div>

        {/* Pro Data Table */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Zap size={16} className="text-blue-500" /> UOM Matrix
            </h2>
            <span className="text-xs font-bold text-slate-500 font-mono px-2 py-1 bg-slate-200 rounded">RECORDS: {filteredItems.length}</span>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border-b-2 border-slate-100">
                <tr>
                  <th className="px-6 py-4">UOM Name</th>
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="animate-spin rounded-none h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
                        <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Fetching Database...</p>
                      </div>
                    </td>
                  </tr>
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Server size={48} className="text-slate-200 mb-2" />
                        <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">0 Records Found</p>
                        <p className="text-xs text-slate-400 font-mono">No UOMs match current parameters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentItems.map(item => {
                    const isActive = item.isActive !== false;
                    return (
                      <tr key={item._id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-900 text-sm tracking-tight">{item.name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded tracking-tight">{item.code || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest shadow-sm ${isActive ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'}`}>
                            {isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleOpenModal(item)} 
                              className="inline-flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-600 hover:text-white transition-colors"
                              title="Edit"
                            >
                              <Edit size={14} strokeWidth={2.5} />
                            </button>
                            <button 
                              onClick={() => handleDelete(item._id)} 
                              className="inline-flex items-center justify-center w-8 h-8 bg-rose-50 text-rose-600 border border-rose-200 rounded hover:bg-rose-600 hover:text-white transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} strokeWidth={2.5} />
                            </button>
                          </div>
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
                Showing <span className="text-slate-800">{startIndex + 1}</span> to <span className="text-slate-800">{Math.min(endIndex, filteredItems.length)}</span> of <span className="text-slate-800">{filteredItems.length}</span>
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

      {/* Modal Redesign */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="bg-[#0a0f1c] p-5 border-l-4 border-blue-500 flex justify-between items-center relative overflow-hidden">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
               <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 relative z-10">
                 <Server size={16} className="text-blue-500" />
                 {editingId ? 'EDIT UOM' : 'NEW UOM'}
               </h2>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors relative z-10">
                 <XCircle size={20} />
               </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs font-bold text-rose-700 uppercase tracking-widest text-center">
                  {error}
                </div>
              )}
              
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">UOM Name <span className="text-rose-500">*</span></label>
                <input 
                  type="text"
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  required 
                  autoFocus
                  placeholder="ENTER UOM NAME (e.g. Dozen)"
                  className="flex h-12 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors outline-none placeholder:text-slate-400 uppercase"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Code <span className="text-rose-500">*</span></label>
                <input 
                  type="text"
                  value={formData.code} 
                  onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} 
                  required
                  placeholder="ENTER CODE (e.g. DZN)"
                  className="flex h-12 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 font-mono shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors outline-none placeholder:text-slate-400 uppercase"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <div className="relative flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    id="isActive" 
                    checked={formData.isActive}
                    onChange={e => setFormData({...formData, isActive: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </div>
                <label htmlFor="isActive" className="text-[10px] font-bold text-slate-700 uppercase tracking-widest cursor-pointer">
                  {formData.isActive ? 'Status: Active' : 'Status: Inactive'}
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded text-xs font-bold uppercase tracking-widest shadow-md hover:bg-blue-500 transition-colors flex items-center gap-2">
                  <CheckCircle size={14} strokeWidth={3} /> {editingId ? 'Update' : 'Save'} UOM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

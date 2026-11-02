import React, { useState, useEffect, useMemo } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import axios from 'axios';
import { FileCheck, Plus, Filter, Edit, Trash2, Printer, Download, Upload, Terminal, Server, FileText, CheckCircle, Clock, Calendar, ChevronLeft, ChevronRight, Mail } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { SearchInput } from '../../components/ui/SearchInput';
import { EmailSendModal } from '../../components/common/EmailSendModal';

const ProForma = () => {
  const [invoices, setInvoices] = useState([]);
  const { formatCurrency, currencySymbol } = useCurrency();
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [emailModal, setEmailModal] = useState({ isOpen: false, proforma: null });
  
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  const navigate = useNavigate();

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await axios.get('/api/v1/proforma', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setInvoices(res.data);
    } catch (error) {
      console.error('Failed to fetch pro-forma invoices', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    let result = invoices.filter(pf => {
      const matchesSearch = (pf.pfNumber || '').toLowerCase().includes(search.toLowerCase()) || 
                            (pf.customerSnapshot?.name || '').toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || pf.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    if (startDate || endDate) {
      result = result.filter(pf => {
        const pfDate = new Date(pf.issueDate);
        if (startDate && pfDate < startOfDay(new Date(startDate))) return false;
        if (endDate && pfDate > endOfDay(new Date(endDate))) return false;
        return true;
      });
    }

    return result;
  }, [invoices, search, statusFilter, startDate, endDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, startDate, endDate]);

  const totalPages = Math.ceil(filteredInvoices.length / pageSize);
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this Pro-Forma Invoice?')) {
      try {
        await axios.delete(`/api/v1/proforma/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        fetchInvoices();
      } catch (error) {
        console.error('Error deleting pro-forma invoice', error);
        alert('Failed to delete Pro-Forma invoice');
      }
    }
  };

  const totalPFs = invoices.length;
  const draftPFs = invoices.filter(pf => pf.status === 'DRAFT').length;
  const sentPFs = invoices.filter(pf => ['SENT', 'VIEWED'].includes(pf.status)).length;
  const acceptedPFs = invoices.filter(pf => ['ACCEPTED', 'CONVERTED'].includes(pf.status)).length;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-4 sm:space-y-6 w-full max-w-[1400px] mx-auto pb-10 bg-[#f8fafc] min-h-screen px-2 sm:px-4 lg:px-6 pt-2 sm:pt-4">
      
      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-4 sm:p-6 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 space-y-3 sm:space-y-4">
          {/* Top Row: Title & Status Badge */}
          <div className="flex flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded shadow-inner flex-shrink-0">
                <Terminal size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl lg:text-2xl font-black tracking-tight text-white uppercase font-mono truncate">
                  Pro-Forma Registry
                </h1>
              </div>
            </div>

            {/* Status Pill on mobile */}
            <div className="flex sm:hidden items-center gap-1.5 bg-[#111827] border border-slate-800 px-2.5 py-1 rounded-md flex-shrink-0">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                ONLINE
              </span>
            </div>

            {/* Status Pill on Desktop */}
            <div className="hidden sm:flex items-center gap-2 bg-[#111827] border border-slate-800 px-3 py-1.5 rounded-lg shadow-inner flex-shrink-0">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                SYSTEM ONLINE
              </span>
            </div>
          </div>

          {/* Bottom Row / Actions Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 pt-2.5 border-t border-slate-800/80">
            <p className="text-slate-400 text-xs font-medium tracking-wide hidden sm:block truncate">
              COMMERCIAL DOCUMENT TERMINAL • PRELIMINARY INVOICE PROTOCOLS
            </p>
            
            <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto sm:justify-end">
              <button className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors border border-slate-700 hover:text-white shadow-sm">
                <Upload size={13} /> Import
              </button>
              <button className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors border border-slate-700 hover:text-white shadow-sm">
                <Download size={13} /> Export
              </button>
              {hasPermission('CREATE_PROFORMA') && (
                <button 
                  onClick={() => navigate('/sales/proforma/new')} 
                  className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] whitespace-nowrap"
                >
                  <Plus size={14} /> Initialize Document
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel (Sharp & High Contrast, Fully Responsive Grid) */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-3.5 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 items-end">
          {/* Search Box */}
          <div className="sm:col-span-2 lg:col-span-5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Filter Registry</label>
            <SearchInput 
              placeholder="SCAN BY ID OR CLIENT NAME..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-md border-2 border-slate-200 bg-slate-50 shadow-sm font-mono text-xs sm:text-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-0 transition-colors uppercase w-full"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-1 lg:col-span-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Status Filter</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-10 w-full pl-9 rounded-md border-2 border-slate-200 bg-slate-50 pr-3 py-2 text-xs sm:text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none uppercase"
              >
                <option value="ALL">ALL PROTOCOLS</option>
                <option value="DRAFT">DRAFT</option>
                <option value="SENT">SENT</option>
                <option value="VIEWED">VIEWED</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="CONVERTED">CONVERTED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          {/* Date Range: Date After & Date Before */}
          <div className="sm:col-span-1 lg:col-span-4 grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block truncate">Date After</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex h-10 w-full pl-8 rounded-md border-2 border-slate-200 bg-slate-50 pr-1.5 py-2 text-xs font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none uppercase"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block truncate">Date Before</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex h-10 w-full pl-8 rounded-md border-2 border-slate-200 bg-slate-50 pr-1.5 py-2 text-xs font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none uppercase"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Aggressive KPI Cards (2 Columns on Mobile, 4 on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-blue-400 transition-all">
          <div className="p-3.5 sm:p-5 flex justify-between items-start">
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Logs</p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-800 font-mono tracking-tighter">{totalPFs}</h3>
            </div>
            <div className="p-2 sm:p-2.5 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Server size={18} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-slate-200"><div className="h-full bg-blue-600 w-full"></div></div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-amber-400 transition-all">
          <div className="p-3.5 sm:p-5 flex justify-between items-start">
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Drafts</p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-800 font-mono tracking-tighter">{draftPFs}</h3>
            </div>
            <div className="p-2 sm:p-2.5 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <FileText size={18} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-slate-200"><div className="h-full bg-amber-500 w-[50%]"></div></div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-indigo-400 transition-all">
          <div className="p-3.5 sm:p-5 flex justify-between items-start">
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Sent / Viewed</p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-800 font-mono tracking-tighter">{sentPFs}</h3>
            </div>
            <div className="p-2 sm:p-2.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Clock size={18} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-slate-200"><div className="h-full bg-indigo-600 w-[30%]"></div></div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-emerald-400 transition-all relative bg-gradient-to-br from-white to-emerald-50/30">
          <div className="absolute top-0 right-0 p-1.5 sm:p-2"><div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 animate-pulse"></div></div>
          <div className="p-3.5 sm:p-5 flex justify-between items-start">
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Accepted</p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-800 font-mono tracking-tighter">{acceptedPFs}</h3>
            </div>
            <div className="p-2 sm:p-2.5 bg-emerald-100 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle size={18} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-emerald-100"><div className="h-full bg-emerald-600 w-[70%]"></div></div>
        </div>
      </div>

      {/* Pro Data Table */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col">
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-5 py-3 flex justify-between items-center">
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <FileText size={16} className="text-blue-500" /> Protocol Index
          </h2>
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 font-mono px-2 py-0.5 sm:py-1 bg-slate-200 rounded tracking-widest">MATCHES: {filteredInvoices.length}</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left whitespace-nowrap min-w-[650px]">
            <thead className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border-b-2 border-slate-100">
              <tr>
                <th className="px-4 sm:px-6 py-3.5">Protocol ID</th>
                <th className="px-4 sm:px-6 py-3.5">Generation Date</th>
                <th className="px-4 sm:px-6 py-3.5">Client Target</th>
                <th className="px-4 sm:px-6 py-3.5">Origin</th>
                <th className="px-4 sm:px-6 py-3.5 text-right">Gross Value</th>
                <th className="px-4 sm:px-6 py-3.5 text-center">Status</th>
                <th className="px-4 sm:px-6 py-3.5 text-right">Execute</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="animate-spin rounded-none h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
                      <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Fetching Database...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedInvoices.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Server size={48} className="text-slate-200 mb-2" />
                      <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">0 Records Found</p>
                      <p className="text-xs text-slate-400 font-mono">No entities match current parameters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map(row => {
                  
                  let statusColor = 'bg-slate-500';
                  if (['ACCEPTED', 'CONVERTED'].includes(row.status)) statusColor = 'bg-emerald-500';
                  if (['REJECTED', 'CANCELLED', 'EXPIRED'].includes(row.status)) statusColor = 'bg-rose-500';
                  if (['SENT', 'VIEWED'].includes(row.status)) statusColor = 'bg-indigo-500';
                  if (row.status === 'DRAFT') statusColor = 'bg-amber-500';

                  return (
                    <tr key={row._id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 sm:px-6 py-3">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                          <div className={`h-2 w-2 rounded-full ${statusColor}`}></div>
                          <span className="font-bold text-blue-600 font-mono tracking-tight">{row.pfNumber}</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                          {format(new Date(row.issueDate), 'dd MMM yyyy')}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3">
                        <span className="font-bold text-slate-800">{row.customerSnapshot?.name}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-3">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-600 uppercase tracking-widest">
                          {row.sourceType === 'MANUAL' ? 'MANUAL' : row.sourceType}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-right">
                        <span className="text-sm sm:text-base font-black font-mono tracking-tighter text-slate-800">
                          {currencySymbol}{row.grandTotal.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-[9px] font-black text-white uppercase tracking-widest shadow-sm ${statusColor}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-right">
                        <div className="flex justify-end gap-1 opacity-90 sm:opacity-60 group-hover:opacity-100 transition-opacity">
                          {hasPermission('PRINT_PROFORMA') && (
                            <button 
                              onClick={() => navigate(`/sales/proforma/print/${row._id}`)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                              title="Print Protocol"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => setEmailModal({ isOpen: true, proforma: row })}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-emerald-600 rounded transition-colors"
                            title="Send Pro-Forma by Email"
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                          {row.status === 'DRAFT' && hasPermission('EDIT_PROFORMA') ? (
                            <button 
                              onClick={() => navigate(`/sales/proforma/edit/${row._id}`)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-blue-600 rounded transition-colors"
                              title="Modify Protocol"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          ) : (
                            <button 
                              onClick={() => navigate(`/sales/proforma/edit/${row._id}`)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-emerald-600 rounded transition-colors"
                              title="View Protocol"
                            >
                              <FileCheck className="h-4 w-4" />
                            </button>
                          )}
                          {hasPermission('DELETE_PROFORMA') && (
                            <button 
                              onClick={() => handleDelete(row._id)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-rose-600 rounded transition-colors"
                              title="Terminate Protocol"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Console */}
        {!loading && filteredInvoices.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-5 py-3 flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              PAGE {currentPage} OF {totalPages || 1}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 bg-white border-2 border-slate-200 rounded text-slate-600 hover:border-blue-600 hover:text-blue-600 disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:text-slate-600 transition-colors"
              >
                <ChevronLeft size={16} strokeWidth={3} />
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 bg-white border-2 border-slate-200 rounded text-slate-600 hover:border-blue-600 hover:text-blue-600 disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:text-slate-600 transition-colors"
              >
                <ChevronRight size={16} strokeWidth={3} />
              </button>
            </div>
          </div>
        )}
      </div>

      {emailModal.isOpen && emailModal.proforma && (
        <EmailSendModal
          isOpen={emailModal.isOpen}
          onClose={() => setEmailModal({ isOpen: false, proforma: null })}
          documentType="Pro-Forma Invoice"
          documentNumber={emailModal.proforma.pfNumber || emailModal.proforma.proFormaNumber}
          recipientName={emailModal.proforma.customerSnapshot?.name || emailModal.proforma.customerId?.name}
          defaultEmail={emailModal.proforma.customerSnapshot?.email || emailModal.proforma.customerId?.email}
          sendEndpoint={`/api/v1/email/proforma/${emailModal.proforma._id}`}
        />
      )}
    </div>
  );
};

export default ProForma;
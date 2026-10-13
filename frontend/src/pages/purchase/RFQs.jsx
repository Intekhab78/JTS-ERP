import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Edit, Eye, FileText, Activity, Zap, Server, ChevronLeft, ChevronRight, Trash2, MoreVertical, Mail } from 'lucide-react';
import { EmailSendModal } from '../../components/common/EmailSendModal';

export default function RFQs() {
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emailModal, setEmailModal] = useState({ isOpen: false, rfq: null });
  const navigate = useNavigate();

  const [openDropdownId, setOpenDropdownId] = useState(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchRFQs();
  }, []);

  const fetchRFQs = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/v1/rfqs', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRfqs(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this RFQ?')) return;
    try {
      await axios.delete(`/api/v1/rfqs/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchRFQs(); // Refresh list
    } catch (error) {
      alert('Failed to delete RFQ. It might be linked to other records.');
      console.error(error);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'DRAFT': return 'bg-amber-500 text-white'; // Brighter color for Draft
      case 'SENT': return 'bg-blue-500 text-white';
      case 'QUOTED': return 'bg-purple-500 text-white';
      case 'CONFIRMED': return 'bg-emerald-500 text-white';
      case 'CANCELLED': return 'bg-rose-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  // Pagination Logic
  const totalPages = Math.ceil(rfqs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = rfqs.slice(startIndex, endIndex);

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[1400px] mx-auto pb-10 bg-[#f8fafc] min-h-screen">
      
      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl mt-4 sm:mx-4 lg:mx-8 mb-6">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                <Activity size={18} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">Requests for Quotation</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl">
              MANAGE VENDOR QUOTATION REQUESTS & BIDDING PROCESS
            </p>
          </div>
          
          <div className="flex items-center gap-4">
             <button 
               onClick={() => navigate('/purchases/rfqs/new')}
               className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-blue-500 shadow-md transition-colors"
             >
               <Plus size={16} /> New RFQ
             </button>
          </div>
        </div>
      </div>

      {/* RFQ Matrix */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl sm:mx-4 lg:mx-8">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center rounded-t-xl">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Zap size={16} className="text-blue-500" /> RFQ Matrix
          </h2>
          <span className="text-xs font-bold text-slate-500 font-mono px-2 py-1 bg-slate-200 rounded">RECORDS: {rfqs.length}</span>
        </div>
        
        <div className="w-full">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border-b-2 border-slate-100">
              <tr>
                <th className="px-6 py-4">RFQ Number</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Branch</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="animate-spin rounded-none h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
                      <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Fetching Database...</p>
                    </div>
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Server size={48} className="text-slate-200 mb-2" />
                      <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">0 Records Found</p>
                      <p className="text-xs text-slate-400 font-mono">No RFQs match current parameters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map(rfq => (
                  <tr key={rfq._id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-sm tracking-tight">
                        <FileText size={14} className="text-blue-500 opacity-50" />
                        {rfq.rfqNumber || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        {rfq.supplierId?.name || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                        {rfq.branchId?.name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-800 font-mono">
                        {rfq.currency} {(rfq.totalAmount || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-black text-white uppercase tracking-widest shadow-sm mx-auto ${getStatusStyle(rfq.status)}`}>
                        {rfq.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block text-left">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === rfq._id ? null : rfq._id); }}
                          className="p-1.5 text-slate-800 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors border border-slate-200 shadow-sm"
                        >
                          <MoreVertical size={16} />
                        </button>
                        
                        {openDropdownId === rfq._id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); }}></div>
                            <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-slate-200 z-50 overflow-hidden py-1">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); navigate(`/purchases/rfqs/${rfq._id}`); }} 
                              className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors uppercase tracking-widest text-left"
                            >
                              <Eye size={14} /> View
                            </button>
                            
                            <button 
                              onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); setEmailModal({ isOpen: true, rfq }); }} 
                              className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-emerald-600 transition-colors uppercase tracking-widest text-left"
                            >
                              <Mail size={14} /> Send Email
                            </button>
                            
                            {rfq.status === 'DRAFT' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); navigate(`/purchases/rfqs/edit/${rfq._id}`); }} 
                                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors uppercase tracking-widest text-left"
                              >
                                <Edit size={14} /> Edit
                              </button>
                            )}

                            <button 
                              onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); handleDelete(rfq._id); }} 
                              className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-rose-600 transition-colors uppercase tracking-widest text-left"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && totalPages > 0 && (
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Showing <span className="text-slate-800">{startIndex + 1}</span> to <span className="text-slate-800">{Math.min(endIndex, rfqs.length)}</span> of <span className="text-slate-800">{rfqs.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="text-xs font-bold text-slate-700 font-mono px-2">
                PAGE {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {emailModal.isOpen && emailModal.rfq && (
        <EmailSendModal
          isOpen={emailModal.isOpen}
          onClose={() => setEmailModal({ isOpen: false, rfq: null })}
          documentType="Request for Quotation"
          documentNumber={emailModal.rfq.rfqNumber}
          recipientName={emailModal.rfq.supplierId?.name}
          defaultEmail={emailModal.rfq.supplierId?.email}
          sendEndpoint={`/api/v1/email/rfq/${emailModal.rfq._id}`}
        />
      )}
    </div>
  );
}

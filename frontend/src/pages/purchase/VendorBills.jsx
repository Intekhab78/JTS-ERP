import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Eye, FileText, CheckCircle, Clock, Zap, Banknote, ShieldAlert } from 'lucide-react';
import { SearchInput } from '../../components/ui/SearchInput';
import VendorPaymentModal from './VendorPaymentModal';

export default function VendorBills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchBills = async () => {
    try {
      const { data } = await axios.get('/api/v1/vendor-bills', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBills(data);
    } catch (error) {
      console.error('Failed to fetch vendor bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const handlePost = async (id, e) => {
    e.stopPropagation(); // prevent navigation if row is clicked
    if (!window.confirm('Are you sure you want to post this bill? It cannot be edited afterwards.')) return;
    try {
      await axios.post(`/api/v1/vendor-bills/${id}/post`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchBills();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to post bill');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT': return <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-slate-200 text-slate-700">DRAFT</span>;
      case 'POSTED': return <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700">POSTED</span>;
      case 'PARTIALLY_PAID': return <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700">PART. PAID</span>;
      case 'PAID': return <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700">PAID</span>;
      case 'CANCELLED': return <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-rose-100 text-rose-700">CANCELLED</span>;
      default: return <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  const filteredBills = Array.isArray(bills) ? bills.filter(bill => {
    const searchString = searchTerm.toLowerCase();
    const matchesSearch = 
      bill.billNumber?.toLowerCase().includes(searchString) || 
      bill.supplierId?.name?.toLowerCase().includes(searchString) ||
      bill.purchaseOrderId?.purchaseOrderNumber?.toLowerCase().includes(searchString);
    const matchesStatus = statusFilter === '' || bill.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) : [];

  const kpis = {
    total: filteredBills.length,
    unpaidValue: filteredBills.reduce((acc, curr) => acc + (curr.balanceDue || 0), 0),
    posted: filteredBills.filter(b => ['POSTED', 'PARTIALLY_PAID'].includes(b.status)).length,
    paid: filteredBills.filter(b => b.status === 'PAID').length
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
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">Vendor Bills Command</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl uppercase tracking-widest">
              FINANCIAL OBLIGATIONS • ACCOUNTS PAYABLE MATRIX
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-3 bg-[#111827] border border-slate-800 p-2.5 rounded-lg shadow-inner">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">System Online</span>
            </div>
            <button 
              onClick={() => navigate('/purchases/bills/new')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-md font-bold text-sm tracking-wider uppercase transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400 flex items-center gap-2"
            >
              <Plus size={16} strokeWidth={3} /> New Bill
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
              <option value="POSTED">POSTED</option>
              <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
              <option value="PAID">PAID</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
          <div className="relative w-full sm:flex-1">
             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Filter Database</label>
             <SearchInput 
               placeholder="SCAN BY SUPPLIER, BILL # OR PO..." 
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
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Bills</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{kpis.total}</h3>
            </div>
            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-slate-800 group-hover:text-white transition-colors">
              <FileText size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-slate-200"><div className="h-full bg-slate-800 w-full"></div></div>
        </div>

        <div className="bg-white border border-rose-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-rose-400 transition-all relative">
          <div className="absolute top-0 right-0 p-2"><div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></div></div>
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-rose-600 uppercase tracking-widest mb-1">Unpaid Value</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{kpis.unpaidValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
            </div>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-rose-500 group-hover:text-white transition-colors">
              <ShieldAlert size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-rose-100"><div className="h-full bg-rose-500 w-[80%]"></div></div>
        </div>

        <div className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-amber-400 transition-all">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-1">Pending Payment</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{kpis.posted}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Clock size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-amber-100"><div className="h-full bg-amber-500 w-[50%]"></div></div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-emerald-400 transition-all">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Settled Bills</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{kpis.paid}</h3>
            </div>
            <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-emerald-100"><div className="h-full bg-emerald-600 w-full"></div></div>
        </div>

      </div>

      {/* Pro Data Table */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Zap size={16} className="text-blue-500" /> Accounts Payable Matrix
          </h2>
          <span className="text-xs font-bold text-slate-500 font-mono px-2 py-1 bg-slate-200 rounded">ROWS: {filteredBills.length}</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border-b-2 border-slate-100">
              <tr>
                <th className="px-6 py-4">Bill Number</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-right">Due</th>
                <th className="px-6 py-4 text-center">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="animate-spin rounded-none h-10 w-10 border-4 border-slate-200 border-t-blue-500"></div>
                      <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Loading...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredBills.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <FileText size={48} className="mb-4 opacity-20" />
                      <p className="text-sm font-bold uppercase tracking-widest">No bills found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => (
                  <tr key={bill._id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => navigate(`/purchases/bills/${bill._id}`)}
                        className="font-bold text-slate-900 text-sm tracking-tight hover:text-blue-600 transition-colors flex items-center"
                      >
                        {bill.billNumber}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 text-sm tracking-tight">{bill.supplierId?.name || 'Unknown'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 inline-block px-1.5 py-0.5 rounded">PO: {bill.purchaseOrderId?.purchaseOrderNumber || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mb-0.5">{bill.currency || 'AED'}</div>
                      <div className="font-mono font-bold text-slate-900 text-sm">{(bill.grandTotal || 0).toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-mono font-bold text-rose-600 text-sm">{(bill.balanceDue || 0).toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="font-mono font-bold text-slate-700 text-xs bg-slate-100 inline-block px-2 py-1 rounded">{new Date(bill.billDate).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(bill.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex items-center justify-end gap-2">
                         {bill.status === 'DRAFT' && (
                           <button 
                             onClick={(e) => handlePost(bill._id, e)} 
                             className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest border border-blue-200 hover:border-blue-400 bg-blue-50 px-2 py-1 rounded"
                           >
                             Post
                           </button>
                         )}
                         {(bill.status === 'POSTED' || bill.status === 'PARTIALLY_PAID') && (
                           <button 
                             onClick={(e) => { e.stopPropagation(); setSelectedBill(bill); setIsPaymentModalOpen(true); }}
                             className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 uppercase tracking-widest border border-emerald-200 hover:border-emerald-400 bg-emerald-50 px-2 py-1 rounded flex items-center gap-1"
                           >
                             <Banknote size={12} /> Pay
                           </button>
                         )}
                         <button 
                           onClick={() => navigate(`/purchases/bills/${bill._id}`)}
                           className="h-7 w-7 inline-flex items-center justify-center rounded bg-white border-2 border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm"
                         >
                           <Eye size={12} strokeWidth={3} />
                         </button>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <VendorPaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        bill={selectedBill}
        onPaymentSuccess={fetchBills}
      />
    </main>
  );
}

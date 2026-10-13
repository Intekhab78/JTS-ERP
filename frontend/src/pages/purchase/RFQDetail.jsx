import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, FileText, Package, Truck, Calendar, MapPin, Building, CreditCard, Banknote, Send, CheckCircle, Printer, Zap, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { EmailSendModal } from '../../components/common/EmailSendModal';

export default function RFQDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rfq, setRfq] = useState(null);
  const [items, setItems] = useState([]);
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const componentRef = useRef(null);

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    fetchRFQ();
  }, [id]);

  const fetchRFQ = async () => {
    try {
      const res = await axios.get(`/api/v1/rfqs/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRfq(res.data.rfq);
      setItems(res.data.items || []);
      setPurchaseOrder(res.data.purchaseOrder);
    } catch (error) {
      console.error('Failed to fetch RFQ', error);
      alert('Failed to load RFQ');
      navigate('/purchases/rfqs');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status) => {
    try {
      await axios.patch(`/api/v1/rfqs/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchRFQ();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update status');
    }
  };

  const convertToPO = async () => {
    if (!window.confirm('Convert this RFQ to a Purchase Order?')) return;
    try {
      const res = await axios.post(`/api/v1/rfqs/${id}/convert`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Converted to Purchase Order successfully');
      navigate(`/purchases/${res.data._id}`);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to convert RFQ');
    }
  };

  if (loading) return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[1720px] mx-auto min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center py-40">
      <div className="animate-spin rounded-none h-12 w-12 border-4 border-slate-200 border-t-blue-600 mb-4"></div>
      <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Fetching Core Assets...</p>
    </div>
  );

  if (!rfq) return <div className="p-8 text-center text-red-500 font-bold uppercase tracking-widest">RFQ not found</div>;

  const getStatusStyle = (status) => {
    switch (status) {
      case 'DRAFT': return 'bg-amber-500 text-white';
      case 'SENT': return 'bg-blue-500 text-white';
      case 'QUOTED': return 'bg-purple-500 text-white';
      case 'CONFIRMED': return 'bg-emerald-500 text-white';
      case 'CANCELLED': return 'bg-rose-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[1400px] mx-auto space-y-6 pb-10 bg-[#f8fafc] min-h-screen">
      
      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl no-print">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-start gap-4">
            <button onClick={() => navigate('/purchases/rfqs')} className="p-2.5 bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 mt-1">
              <ArrowLeft size={20} className="text-slate-300" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                  <FileText size={18} className="text-white" />
                </div>
                <h1 className="text-3xl font-black tracking-tight text-white uppercase">{rfq.rfqNumber}</h1>
              </div>
              <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl">
                REQUEST FOR QUOTATION DETAILS • {rfq.supplierId?.name || 'VENDOR BIDDING'}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-[#111827] border border-slate-800 p-2.5 rounded-lg shadow-inner">
            <span className={`inline-flex items-center px-3 py-1.5 rounded text-xs font-black uppercase tracking-widest shadow-sm ${getStatusStyle(rfq.status)}`}>
              STATUS: {rfq.status}
            </span>
            
            <button onClick={handlePrint} className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
              <Printer size={14} /> Print
            </button>

            <button onClick={() => setIsEmailModalOpen(true)} className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
              <Mail size={14} /> Send Email
            </button>

            {rfq.status === 'DRAFT' && (
              <button onClick={() => updateStatus('SENT')} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
                <Send size={14} /> Send RFQ
              </button>
            )}
            
            {rfq.status === 'SENT' && (
              <button onClick={() => updateStatus('QUOTED')} className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
                <CheckCircle size={14} /> Mark as Quoted
              </button>
            )}

            {rfq.status === 'QUOTED' && (
              <button onClick={convertToPO} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
                <Package size={14} /> Convert to PO
              </button>
            )}

            {['DRAFT', 'SENT', 'QUOTED'].includes(rfq.status) && (
               <button onClick={() => updateStatus('CANCELLED')} className="px-4 py-1.5 bg-rose-600/20 text-rose-500 hover:bg-rose-600 hover:text-white border border-rose-500/30 rounded text-xs font-bold uppercase tracking-widest transition-colors">
                  Cancel
               </button>
            )}
          </div>
        </div>
      </div>

      <div ref={componentRef} className="print:m-0 print:p-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:mx-0">
          
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden md:col-span-2 flex flex-col print:border-none print:shadow-none">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2 print:bg-transparent">
              <Building size={18} className="text-blue-500" />
              <h3 className="font-black text-slate-700 tracking-widest uppercase text-xs">Supplier Profile</h3>
            </div>
            <div className="p-6">
              <div className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-4">{rfq.supplierId?.name}</div>
              <div className="space-y-2">
                {rfq.supplierId?.email && <div className="text-slate-500 font-medium text-sm"><span className="text-slate-400 w-20 inline-block uppercase text-xs font-bold">Email:</span> {rfq.supplierId.email}</div>}
                {rfq.supplierId?.phone && <div className="text-slate-500 font-medium text-sm"><span className="text-slate-400 w-20 inline-block uppercase text-xs font-bold">Phone:</span> {rfq.supplierId.phone}</div>}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-6 border-t border-slate-100 bg-slate-50/50 print:bg-transparent">
              <div>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <MapPin size={12} /> Deliver To
                </h3>
                <div className="font-bold text-slate-800 uppercase tracking-wide text-sm">{rfq.branchId?.name}</div>
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Calendar size={12} /> Request Date
                </h3>
                <div className="font-bold text-slate-800 font-mono text-sm">{format(new Date(rfq.createdAt), 'dd MMM yyyy')}</div>
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Truck size={12} /> Expected Delivery
                </h3>
                <div className="font-bold text-slate-800 font-mono text-sm">
                  {rfq.expectedDate ? format(new Date(rfq.expectedDate), 'dd MMM yyyy') : 'NOT SPECIFIED'}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 md:col-span-1 bg-slate-900 text-white rounded-xl shadow-lg border-0 flex flex-col justify-between print:border print:border-slate-300 print:shadow-none" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <div>
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-3 print:text-black">
                  <div className="p-2 bg-white/10 rounded-lg text-slate-300 print:text-black"><Banknote size={16} /></div> FINANCIAL PROTOCOL
                </h3>
                <span className="px-2 py-1 bg-white/10 text-slate-300 rounded text-xs print:text-black">AED Currency</span>
              </div>
              
              <div className="space-y-1">
                <div className="text-xs text-slate-400 tracking-wider uppercase font-semibold mb-2 print:text-black">Total Estimate</div>
                <div className="flex items-baseline gap-2">
                   <span className="text-xl font-bold text-blue-400">{rfq.currency}</span>
                   <span className="text-4xl font-bold tracking-tight text-white print:text-black">{rfq.totalAmount?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <div className="text-xs text-slate-400 mb-1 print:text-black">Payment Terms</div>
                    <div className="text-sm font-semibold text-emerald-400 flex items-center gap-1 print:text-emerald-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> {rfq.paymentTerms || 'N/A'}
                    </div>
                 </div>
              </div>
            </div>

            {purchaseOrder && (
              <div className="mt-8 pt-6 border-t border-slate-700 print:hidden">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Linked Assets</h3>
                <Link to={`/purchases/${purchaseOrder._id}`} className="group flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-blue-500 transition-colors">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Purchase Order</div>
                    <div className="text-sm font-black text-white group-hover:text-blue-400 transition-colors">{purchaseOrder.purchaseOrderNumber}</div>
                  </div>
                  <span className="px-2 py-1 bg-slate-800 text-[10px] font-black text-slate-300 rounded uppercase">{purchaseOrder.status}</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden mt-6 print:border-none print:shadow-none print:mx-0">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between print:bg-transparent">
            <h3 className="font-black text-slate-700 tracking-widest uppercase text-xs flex items-center gap-2">
              <Zap size={16} className="text-blue-500" /> Requisition Matrix
            </h3>
          </div>
          
          <div className="w-full">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border-b-2 border-slate-100 print:bg-transparent print:border-slate-300">
                <tr>
                  <th className="px-6 py-4">Product / Designation</th>
                  <th className="px-6 py-4 text-center">UOM</th>
                  <th className="px-6 py-4 text-right">Unit Price</th>
                  <th className="px-6 py-4 text-right">Quantity</th>
                  <th className="px-6 py-4 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm print:divide-slate-200">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 uppercase text-sm tracking-wide">{item.productId?.name}</div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5">{item.productId?.sku}</div>
                      {item.description && <div className="text-xs text-slate-500 mt-1.5 font-medium">{item.description}</div>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold uppercase">{item.uom || 'PCS'}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600 font-mono font-medium">
                      {rfq.currency} {item.unitCost?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-800 font-mono text-base">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-800 font-mono">
                      {rfq.currency} {item.subTotal?.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-slate-800 p-6 flex justify-end print:bg-transparent print:text-black">
            <div className="w-80 space-y-3">
               <div className="flex justify-between items-center pb-3 border-b border-slate-700 print:border-slate-300">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-slate-600">Subtotal Matrix</span>
                  <span className="text-sm font-bold text-slate-300 font-mono print:text-black">
                    {rfq.currency} {rfq.totalAmount?.toFixed(2)}
                  </span>
               </div>
               <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-slate-600">Total Commitment</span>
                  <span className="text-2xl font-black text-emerald-400 font-mono tracking-tighter print:text-black">
                    <span className="text-sm text-emerald-500 mr-1 print:text-slate-600">{rfq.currency}</span>
                    {rfq.totalAmount?.toFixed(2)}
                  </span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {isEmailModalOpen && rfq && (
        <EmailSendModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          documentType="Request for Quotation"
          documentNumber={rfq.rfqNumber}
          recipientName={rfq.supplierId?.name}
          defaultEmail={rfq.supplierId?.email}
          sendEndpoint={`/api/v1/email/rfq/${rfq._id}`}
        />
      )}
    </div>
  );
}

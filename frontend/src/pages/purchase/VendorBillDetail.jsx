import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FileText, ArrowLeft, CreditCard, Printer, ShieldCheck, CheckCircle, AlertCircle, Banknote, Zap } from 'lucide-react';
import VendorPaymentModal from './VendorPaymentModal';
import { useReactToPrint } from 'react-to-print';

const VendorBillDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: bill ? `VendorBill_${bill.billNumber}` : 'Vendor_Bill',
  });

  const fetchBill = async () => {
    try {
      const { data } = await axios.get(`/api/v1/vendor-bills/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBill(data);
    } catch (error) {
      alert('Failed to fetch Vendor Bill details');
      navigate('/purchases/bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBill();
  }, [id]);

  const handlePost = async () => {
    if (!window.confirm('Are you sure you want to post this bill? It cannot be edited afterwards.')) return;
    try {
      await axios.post(`/api/v1/vendor-bills/${id}/post`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchBill();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to post bill');
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this bill?')) return;
    try {
      await axios.post(`/api/v1/vendor-bills/${id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchBill();
    } catch (error) {
      alert('Failed to cancel bill');
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8fafc] space-y-4">
      <div className="animate-spin rounded-none h-10 w-10 border-4 border-slate-200 border-t-blue-500"></div>
      <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Loading...</p>
    </div>
  );
  if (!bill) return null;

  return (
    <div ref={componentRef} className="animate-in fade-in zoom-in-95 duration-500 max-w-[1400px] mx-auto space-y-6 pb-10 bg-[#f8fafc] min-h-screen">
      
      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl no-print">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => navigate('/purchases/bills')} className="mr-2 text-slate-400 hover:text-white transition-colors">
                <ArrowLeft size={24} strokeWidth={3} />
              </button>
              <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                <FileText size={18} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">{bill.billNumber}</h1>
              <div className="ml-4">
                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                  bill.status === 'POSTED' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' :
                  bill.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' :
                  bill.status === 'PARTIALLY_PAID' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' :
                  bill.status === 'CANCELLED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50' :
                  'bg-slate-500/20 text-slate-400 border border-slate-500/50'
                }`}>
                  {bill.status}
                </span>
              </div>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl uppercase tracking-widest ml-14">
              VENDOR BILL • ACCOUNTS PAYABLE DETAIL
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-md shadow-sm text-xs font-bold text-slate-300 uppercase tracking-widest hover:bg-slate-700 transition-colors flex items-center"
            >
              <Printer size={14} className="mr-2" />
              Print
            </button>
            {bill.status === 'DRAFT' && (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-md shadow-sm text-xs font-bold text-rose-400 uppercase tracking-widest hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePost}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-bold text-xs tracking-widest uppercase transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400"
                >
                  Post Bill
                </button>
              </>
            )}
            {(bill.status === 'POSTED' || bill.status === 'PARTIALLY_PAID') && (
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md font-bold text-xs tracking-widest uppercase transition-colors shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-400 flex items-center gap-2"
              >
                <CreditCard size={16} /> Register Payment
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2 sm:px-0">
        
        {/* Vendor Profile */}
        <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileText size={14} className="text-blue-500" /> BILLING CONTEXT
            </h2>
          </div>
          <div className="p-6">
            <div className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-4">{bill.supplierId?.name}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Related Purchase Order</p>
                <p className="font-mono font-bold text-blue-600 text-sm">
                  {bill.purchaseOrderId ? (
                    <Link to={`/purchases/${bill.purchaseOrderId._id}`}>{bill.purchaseOrderId.purchaseOrderNumber}</Link>
                  ) : '-'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Related GRNs</p>
                <p className="font-mono font-bold text-slate-800 text-sm">
                  {bill.grnIds?.map(grn => grn.grnNumber).join(', ') || '-'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Bill Date</p>
                <p className="font-mono font-bold text-slate-800 text-sm">
                  {new Date(bill.billDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Due Date</p>
                <p className="font-mono font-bold text-rose-600 text-sm">
                  {new Date(bill.dueDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="p-6 md:col-span-1 bg-slate-900 text-white rounded-xl shadow-lg border-0 flex flex-col justify-between" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
           <div>
             <div className="flex justify-between items-start mb-6">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg text-slate-300"><Banknote size={16} /></div> FINANCIAL SUMMARY
                </h3>
                <span className="bg-white/10 text-slate-300 rounded text-[10px] font-bold tracking-widest uppercase px-2 py-1">{bill.currency || 'AED'}</span>
             </div>
             
             <div className="space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Balance Due</div>
                <div className="flex items-baseline gap-2">
                   <span className="text-xl font-bold text-blue-400">{bill.currency || 'AED'}</span>
                   <span className="text-4xl font-black tracking-tight text-white">{(bill.balanceDue || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
             </div>
           </div>

           <div className="mt-8 pt-6 border-t border-slate-800">
             <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2">Grand Total Overview</div>
             <div className="text-lg font-mono tracking-tight font-bold text-slate-300">
               {bill.currency || 'AED'} {(bill.grandTotal || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
             </div>
           </div>
        </div>

      </div>

      <div className="bg-white shadow-sm border border-slate-200 overflow-hidden rounded-xl mx-2 sm:mx-0">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Zap size={16} className="text-blue-500" /> Line Items
          </h2>
          <span className="text-xs font-bold text-slate-500 font-mono px-2 py-1 bg-white border border-slate-200 rounded">ROWS: {bill.items?.length || 0}</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm divide-y divide-slate-200 text-left whitespace-nowrap">
            <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border-b-2 border-slate-100">
              <tr>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4 text-right">Qty</th>
                <th className="px-6 py-4 text-right">Unit Price</th>
                <th className="px-6 py-4 text-right">Tax</th>
                <th className="px-6 py-4 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {bill.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">{item.description || 'Product'}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-700 text-right">{item.quantity} {item.uom}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-700 text-right">{bill.currency} {item.unitPrice.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-700 text-right">{bill.currency} {item.taxAmount.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-slate-900 text-right">{bill.currency} {item.subTotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="bg-slate-50 px-6 py-5 flex justify-end border-t border-slate-200">
          <dl className="space-y-3 text-sm text-slate-600 w-64">
            <div className="flex justify-between font-mono">
              <dt className="text-xs font-bold text-slate-500 uppercase tracking-widest">Subtotal</dt>
              <dd className="text-slate-900 font-bold">{bill.currency} {bill.subtotal.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between font-mono">
              <dt className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tax</dt>
              <dd className="text-slate-900 font-bold">{bill.currency} {bill.taxTotal.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-3 border-slate-200 font-mono">
              <dt className="text-xs font-black text-slate-800 uppercase tracking-widest">Total</dt>
              <dd className="text-slate-900">{bill.currency} {bill.grandTotal.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between text-emerald-600 font-mono">
              <dt className="text-xs font-bold uppercase tracking-widest">Amount Paid</dt>
              <dd className="font-bold">- {bill.currency} {bill.amountPaid.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between font-bold text-rose-600 border-t pt-3 border-slate-200 font-mono text-lg">
              <dt className="text-xs font-black uppercase tracking-widest mt-1">Balance Due</dt>
              <dd>{bill.currency} {bill.balanceDue.toFixed(2)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <VendorPaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        bill={bill}
        onPaymentSuccess={fetchBill}
      />
    </div>
  );
};

export default VendorBillDetail;

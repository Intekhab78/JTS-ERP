import React, { useState } from 'react';
import { X, Printer, Ban, Loader2, Receipt } from 'lucide-react';
import axios from 'axios';
import ManagerApprovalModal from '../auth/ManagerApprovalModal';
import { useCurrency } from '../../contexts/CurrencyContext';

const POSOrderDetailsModal = ({ order, onClose }) => {
  const { formatCurrency } = useCurrency();
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [fullOrder, setFullOrder] = useState(null);
  const [payments, setPayments] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    if (order && order._id) {
      setLoading(true);
      axios.get(`/api/v1/pos/orders/${order._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).then(res => {
        setFullOrder(res.data.order);
        setPayments(res.data.payments || []);
        setReturns(res.data.returns || []);
        setLoading(false);
      }).catch(err => {
        console.error("Failed to load order details", err);
        setLoading(false);
      });
    }
  }, [order]);

  if (!order) return null;

  const displayOrder = fullOrder || order;

  const date = new Date(displayOrder.createdAt);
  const totalItemsCount = displayOrder.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const totalLinesCount = displayOrder.items?.length || 0;
  
  // Fallbacks if data is missing
  const amountPaid = displayOrder.amountPaid || displayOrder.totalAmount;
  const changeDue = amountPaid - displayOrder.totalAmount;

  const handlePrint = () => {
    window.print();
  };

  const handleVoidClick = () => {
    setIsVoidModalOpen(true);
  };

  const submitVoid = async (overrideToken = null) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (voidReason.trim().length < 5) {
      setErrorMsg('Void reason must be at least 5 characters');
      return;
    }
    
    setIsVoiding(true);
    try {
      const payload = { reason: voidReason };
      if (overrideToken) {
        payload.overrideToken = overrideToken;
      }

      await axios.post(`/api/v1/pos/orders/${displayOrder._id}/void`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setSuccessMsg('Order voided successfully.');
      setTimeout(() => {
        setIsVoidModalOpen(false);
        setIsManagerModalOpen(false);
        onClose(); // Parent can refresh data
      }, 1500);
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.requiresOverride) {
        setIsManagerModalOpen(true);
      } else {
        setErrorMsg(error.response?.data?.message || 'Failed to void order');
      }
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 print:hidden">
        {/* Main Details Modal (Screen Only) */}
        <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200 border border-slate-200">
          
          {/* Header */}
          <div className="bg-[#0a0f1c] p-5 border-l-4 border-blue-500 relative overflow-hidden shrink-0">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
             <div className="relative z-10 flex justify-between items-center">
               <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                 <Receipt size={16} className="text-blue-500" /> TRANSACTION DETAILS
               </h2>
               <div className="flex items-center gap-3">
                 <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-sm
                    ${displayOrder.status === 'PAID' ? 'bg-emerald-500 text-white' : 
                      displayOrder.status === 'CANCELLED' ? 'bg-rose-500 text-white' : 
                      'bg-amber-500 text-white'}`}>
                    {displayOrder.status}
                  </span>
                 <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                   <X size={20} />
                 </button>
               </div>
             </div>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50 space-y-6">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Receipt Number</p>
                <p className="font-mono font-bold text-slate-900 text-sm">{displayOrder.receiptNumber}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Date & Time</p>
                <p className="font-mono font-bold text-slate-900 text-sm">{date.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Branch</p>
                <p className="font-bold text-slate-900 text-sm uppercase">{displayOrder.branchId?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Register</p>
                <p className="font-bold text-slate-900 text-sm uppercase">{displayOrder.registerId?.name || displayOrder.registerId?.code || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Cashier</p>
                <p className="font-bold text-slate-900 text-sm uppercase">{displayOrder.createdBy?.firstName} {displayOrder.createdBy?.lastName}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Customer</p>
                <p className="font-bold text-slate-900 text-sm uppercase">{displayOrder.customerName}</p>
              </div>
            </div>

            {/* Matrix Items View (for screen) */}
            <div className="pt-4 border-t border-slate-200">
              <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-3">Order Items</h3>
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Item</th>
                      <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Qty</th>
                      <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayOrder.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-xs font-bold text-slate-800 uppercase">{item.productName}</td>
                        <td className="px-4 py-2 text-xs font-bold text-slate-600 text-center">{item.quantity}</td>
                        <td className="px-4 py-2 text-xs font-bold text-slate-800 text-right font-mono">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td colSpan="2" className="px-4 py-2 text-xs font-black text-slate-700 uppercase text-right">Total Amount</td>
                      <td className="px-4 py-2 text-sm font-black text-slate-900 text-right font-mono">{formatCurrency(displayOrder.totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {returns.length > 0 && (
              <div className="pt-4 border-t border-slate-200">
                <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-3">Past Returns</h3>
                <div className="space-y-3">
                  {returns.map(ret => (
                    <div key={ret._id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-bold text-slate-500 font-mono">{new Date(ret.createdAt).toLocaleString()}</span>
                        <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-1 rounded">REFUND: {formatCurrency(ret.refundAmount || 0)}</span>
                      </div>
                      <div className="text-sm space-y-1">
                        {ret.returnItems.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-slate-700 font-medium text-xs uppercase">
                            <span>{item.quantity}x {item.productId?.name || 'Item'}</span>
                          </div>
                        ))}
                      </div>
                      {ret.reason && <p className="text-[10px] font-bold text-slate-400 mt-3 pt-2 border-t border-slate-100 uppercase tracking-wider">REASON: {ret.reason}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 bg-white border-t border-slate-200 p-5 shrink-0">
            {displayOrder.status !== 'VOIDED' && displayOrder.status !== 'CANCELLED' && (
              <button 
                onClick={handleVoidClick} 
                className="flex-1 py-2.5 px-4 bg-rose-50 text-rose-700 rounded text-xs font-black uppercase tracking-widest hover:bg-rose-100 flex justify-center items-center gap-2 transition-colors border border-rose-200"
              >
                <Ban size={16}/> Void Order
              </button>
            )}
            <button 
              onClick={handlePrint} 
              className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded text-xs font-black uppercase tracking-widest hover:bg-blue-500 flex justify-center items-center gap-2 transition-colors shadow-md border border-blue-700"
            >
              <Printer size={16}/> Print Thermal Receipt
            </button>
          </div>
        </div>
      </div>

      {/* Hidden Thermal Receipt (Print Only) */}
      <div className="hidden print:block font-mono text-sm text-black w-[300px] mx-auto bg-white p-4">
        <div className="text-center mb-6">
          <h2 className="font-bold text-lg mb-1">{displayOrder.branchId?.name?.toUpperCase() || 'STORE'}</h2>
          <p className="text-[10px] text-gray-500">TRN: 1234567890</p>
          <p className="text-[10px] text-gray-500">Tel: +971 50 123 4567</p>
          <div className="border-t border-dashed border-gray-400 my-3"></div>
          <p className="font-bold uppercase tracking-widest text-[11px]">TAX INVOICE</p>
          <div className="border-t border-dashed border-gray-400 my-3"></div>
        </div>

        <div className="text-[11px] mb-4 space-y-1 uppercase font-semibold">
          <div className="flex justify-between">
            <span>RECEIPT:</span>
            <span className="font-bold">{displayOrder.receiptNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>DATE:</span>
            <span>{date.toLocaleDateString()} {date.toLocaleTimeString()}</span>
          </div>
          <div className="flex justify-between">
            <span>CASHIER:</span>
            <span>{displayOrder.createdBy?.firstName}</span>
          </div>
          <div className="flex justify-between">
            <span>CUSTOMER:</span>
            <span>{displayOrder.customerName}</span>
          </div>
        </div>

        <div className="border-t-2 border-black my-3"></div>

        <div className="mb-4">
          <div className="flex justify-between font-bold text-[11px] mb-2 uppercase">
            <span className="w-8">QTY</span>
            <span className="flex-1">ITEM</span>
            <span className="text-right">TOTAL</span>
          </div>
          
          {displayOrder.items?.map((item, idx) => (
            <div key={idx} className="mb-2 text-[11px] font-semibold">
              <div className="flex justify-between">
                <span className="w-8 font-bold">{item.quantity}</span>
                <span className="flex-1 truncate pr-2 uppercase">{item.productName}</span>
                <span className="text-right">{formatCurrency(item.total)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 ml-8">
                <span>@ {formatCurrency(item.total / item.quantity)}</span>
                {item.discount > 0 && <span>(Disc: {formatCurrency(item.discount)})</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-gray-400 my-3"></div>

        <div className="space-y-1 text-[11px] uppercase font-semibold">
          <div className="flex justify-between">
            <span>SUBTOTAL (EXCL. TAX):</span>
            <span>{formatCurrency(displayOrder.totalAmount - (displayOrder.taxAmount || 0))}</span>
          </div>
          {(displayOrder.taxAmount > 0) && (
            <div className="flex justify-between">
              <span>VAT / TAX:</span>
              <span>{formatCurrency(displayOrder.taxAmount)}</span>
            </div>
          )}
          {(displayOrder.discountAmount > 0) && (
            <div className="flex justify-between">
              <span>DISCOUNT:</span>
              <span>-{formatCurrency(displayOrder.discountAmount)}</span>
            </div>
          )}
        </div>

        <div className="border-t-2 border-double border-gray-400 my-3"></div>

        <div className="flex justify-between items-center font-bold text-sm uppercase mb-3">
          <span>TOTAL AMOUNT:</span>
          <span className="text-base">{formatCurrency(displayOrder.totalAmount)}</span>
        </div>

        <div className="border-t-2 border-double border-gray-400 my-3"></div>

        <div className="space-y-1 text-[11px] uppercase mb-4 mt-3 font-semibold">
          <div className="flex justify-between">
            <span>PAYMENT METHOD:</span>
            <span className="font-bold">{displayOrder.paymentMethod || 'CASH'} TENDERED</span>
          </div>
          <div className="flex justify-between">
            <span>{displayOrder.paymentMethod === 'CASH' ? 'CASH RECEIVED:' : 'AMOUNT CHARGED:'}</span>
            <span>{formatCurrency(amountPaid)}</span>
          </div>
          {displayOrder.paymentMethod === 'CASH' && (
            <div className="flex justify-between">
              <span>CHANGE DUE:</span>
              <span>{formatCurrency(changeDue)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-500 mt-2 pt-2 border-t border-dashed border-gray-300">
            <span>TOTAL ITEMS COUNT:</span>
            <span>{totalItemsCount} PCS ({totalLinesCount} LINES)</span>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-[10px] tracking-widest uppercase mb-6">*{displayOrder.receiptNumber}-TRX*</p>
          <p className="font-bold text-[11px] mb-2 uppercase">THANK YOU FOR SHOPPING WITH US!</p>
          <p className="text-[9px] mb-1 font-semibold">Goods exchangeable within 14 days with original receipt.</p>
          <p className="text-[9px] mb-2 font-semibold">System generated thermal slip. No signature required.</p>
          <p className="text-[8px] text-gray-500 mt-6 font-semibold">Powered by JTS ERP POS v4.2 Cloud Bridge</p>
          <p className="text-[9px] text-gray-500 mt-1 font-semibold">[ESC/POS FULL CUT]</p>
        </div>
      </div>

      {/* Void Reason Modal */}
      {isVoidModalOpen && !isManagerModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl relative border border-slate-200 animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 bg-[#0a0f1c] p-4 border-l-4 border-rose-500 flex justify-between items-center">
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Void Order</h3>
              <button onClick={() => setIsVoidModalOpen(false)} className="text-slate-400 hover:text-white"><X size={18}/></button>
            </div>
            
            <div className="mt-12">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4">Please provide a reason for voiding order <strong className="text-slate-900 font-mono bg-slate-100 px-1 rounded">{displayOrder.receiptNumber}</strong>.</p>
              
              {errorMsg && <div className="mb-4 p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded text-xs font-bold uppercase tracking-widest text-center">{errorMsg}</div>}
              {successMsg && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-bold uppercase tracking-widest text-center">{successMsg}</div>}
              
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="E.G., CUSTOMER CHANGED MIND"
                className="w-full h-24 p-3 border-2 border-slate-200 rounded-md bg-slate-50 focus:border-rose-500 outline-none text-sm mb-6 resize-none font-bold uppercase text-slate-800 placeholder:text-slate-400 shadow-sm"
              />
              
              <div className="flex gap-3">
                <button onClick={() => setIsVoidModalOpen(false)} className="flex-1 py-2.5 rounded border-2 border-slate-200 bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-100 transition-colors">Cancel</button>
                <button 
                  onClick={() => submitVoid(null)} 
                  disabled={isVoiding || voidReason.trim().length < 5}
                  className="flex-1 py-2.5 rounded bg-rose-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-rose-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                >
                  {isVoiding ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Void'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manager Approval Modal */}
      {isManagerModalOpen && (
        <ManagerApprovalModal
          isOpen={isManagerModalOpen}
          onClose={() => setIsManagerModalOpen(false)}
          requestedAction="VOID_POS_ORDER"
          contextData={{
            orderId: displayOrder._id,
            branchId: displayOrder.branchId?._id || displayOrder.branchId,
            reason: voidReason
          }}
          onApproved={(token) => submitVoid(token)}
        />
      )}
    </>
  );
};

export default POSOrderDetailsModal;

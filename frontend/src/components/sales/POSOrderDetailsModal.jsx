import React, { useState } from 'react';
import { X, Printer, Ban, Loader2 } from 'lucide-react';
import axios from 'axios';
import ManagerApprovalModal from '../auth/ManagerApprovalModal';

const POSOrderDetailsModal = ({ order, onClose }) => {
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
      axios.get(`http://localhost:5000/api/v1/pos/orders/${order._id}`, {
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

      await axios.post(`http://localhost:5000/api/v1/pos/orders/${displayOrder._id}/void`, payload, {
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      {/* Container */}
      <div className="bg-slate-100 w-full max-w-4xl rounded-2xl shadow-xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
        
        {/* Left pane: Details & History */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 hidden md:block">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-bold text-slate-800">Transaction Details</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider
              ${displayOrder.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 
                displayOrder.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700' : 
                'bg-amber-100 text-amber-700'}`}>
              {displayOrder.status}
            </span>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Receipt Number</p>
                <p className="font-medium text-slate-900">{displayOrder.receiptNumber}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Date & Time</p>
                <p className="font-medium text-slate-900">{date.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Branch</p>
                <p className="font-medium text-slate-900">{displayOrder.branchId?.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Register</p>
                <p className="font-medium text-slate-900">{displayOrder.registerId?.name || displayOrder.registerId?.code || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Cashier</p>
                <p className="font-medium text-slate-900">{displayOrder.createdBy?.firstName} {displayOrder.createdBy?.lastName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Customer</p>
                <p className="font-medium text-slate-900">{displayOrder.customerName}</p>
              </div>
            </div>

            {returns.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 pb-2 border-b">Past Returns</h3>
                <div className="space-y-3">
                  {returns.map(ret => (
                    <div key={ret._id} className="bg-white p-3 rounded-lg border shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium text-slate-500">{new Date(ret.createdAt).toLocaleString()}</span>
                        <span className="text-xs font-bold text-red-600">Refund: ${ret.refundAmount?.toFixed(2)}</span>
                      </div>
                      <div className="text-sm">
                        {ret.returnItems.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-slate-600">
                            <span>{item.quantity}x {item.productId?.name || 'Item'}</span>
                          </div>
                        ))}
                      </div>
                      {ret.reason && <p className="text-xs text-slate-500 mt-2 italic">Reason: {ret.reason}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right pane: Receipt layout */}
        <div className="w-full md:w-[380px] bg-white border-l p-6 md:p-8 flex flex-col h-full overflow-y-auto">
          
          <div className="receipt-content flex-1 max-w-[300px] mx-auto w-full font-mono text-sm text-slate-800">
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="font-bold text-lg mb-1">{displayOrder.branchId?.name?.toUpperCase() || 'STORE'}</h2>
              <p className="text-[10px] text-slate-500">TRN: 1234567890</p>
              <p className="text-[10px] text-slate-500">Tel: +971 50 123 4567</p>
              <div className="border-t border-dashed border-slate-300 my-3"></div>
              <p className="font-bold">TAX INVOICE</p>
              <div className="border-t border-dashed border-slate-300 my-3"></div>
            </div>

            {/* Meta */}
            <div className="text-[11px] mb-4 space-y-1">
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

            <div className="border-t-2 border-slate-800 my-3"></div>

            {/* Items */}
            <div className="mb-4">
              <div className="flex justify-between font-bold text-[11px] mb-2">
                <span className="w-8">QTY</span>
                <span className="flex-1">ITEM</span>
                <span className="text-right">TOTAL</span>
              </div>
              
              {displayOrder.items?.map((item, idx) => (
                <div key={idx} className="mb-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="w-8 font-bold">{item.quantity}</span>
                    <span className="flex-1 truncate pr-2">{item.productName}</span>
                    <span className="text-right">${item.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 ml-8">
                    <span>@ ${(item.total / item.quantity).toFixed(2)}</span>
                    {item.discount > 0 && <span>(Disc: ${item.discount.toFixed(2)})</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-slate-300 my-3"></div>

            {/* Totals */}
            <div className="space-y-1 text-[11px] uppercase">
              <div className="flex justify-between">
                <span>SUBTOTAL (EXCL. TAX):</span>
                <span>${(displayOrder.totalAmount - (displayOrder.taxAmount || 0)).toFixed(2)}</span>
              </div>
              {(displayOrder.taxAmount > 0) && (
                <div className="flex justify-between">
                  <span>VAT / TAX:</span>
                  <span>${displayOrder.taxAmount.toFixed(2)}</span>
                </div>
              )}
              {(displayOrder.discountAmount > 0) && (
                <div className="flex justify-between">
                  <span>DISCOUNT:</span>
                  <span>-${displayOrder.discountAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="border-t-2 border-double border-slate-300 my-3"></div>

            <div className="flex justify-between items-center font-bold text-sm uppercase mb-3">
              <span>TOTAL AMOUNT:</span>
              <span className="text-base">${displayOrder.totalAmount.toFixed(2)}</span>
            </div>

            <div className="border-t-2 border-double border-slate-300 my-3"></div>

            {/* Payment details */}
            <div className="space-y-1 text-[11px] uppercase mb-4 mt-3">
              <div className="flex justify-between">
                <span>PAYMENT METHOD:</span>
                <span className="font-bold text-emerald-600">{displayOrder.paymentMethod || 'CASH'} TENDERED</span>
              </div>
              <div className="flex justify-between">
                <span>{displayOrder.paymentMethod === 'CASH' ? 'CASH RECEIVED:' : 'AMOUNT CHARGED:'}</span>
                <span>${amountPaid.toFixed(2)}</span>
              </div>
              {displayOrder.paymentMethod === 'CASH' && (
                <div className="flex justify-between">
                  <span>CHANGE DUE:</span>
                  <span>${changeDue.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500 mt-2 pt-2 border-t border-dashed border-slate-200">
                <span>TOTAL ITEMS COUNT:</span>
                <span>{totalItemsCount} PCS ({totalLinesCount} LINES)</span>
              </div>
            </div>

            {/* Barcode & Footer */}
            <div className="text-center mt-6">
              <p className="text-[10px] tracking-widest uppercase mb-6">*{displayOrder.receiptNumber}-TRX*</p>
              
              <p className="font-bold text-[11px] mb-2 uppercase">THANK YOU FOR SHOPPING WITH US!</p>
              <p className="text-[9px] mb-1">Goods exchangeable within 14 days with original receipt.</p>
              <p className="text-[9px] mb-2">System generated thermal slip. No signature required.</p>
              
              <p className="text-[8px] text-slate-400 mt-6">Powered by JTS ERP POS v4.2 Cloud Bridge</p>
              <p className="text-[9px] text-slate-400 mt-1">[ESC/POS FULL CUT]</p>
            </div>

          </div>
          
          <div className="mt-8 flex gap-3 print:hidden sticky bottom-0 bg-[#fffdf9] pt-2">
            {displayOrder.status !== 'VOIDED' && displayOrder.status !== 'CANCELLED' && (
              <button 
                onClick={handleVoidClick} 
                className="flex-1 py-2 px-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg hover:bg-rose-100 flex justify-center items-center gap-2 font-medium text-sm transition-colors !font-sans"
              >
                <Ban size={16}/> Void
              </button>
            )}
            <button 
              onClick={onClose} 
              className="flex-1 py-2 px-4 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm transition-colors !font-sans"
            >
              Close
            </button>
            <button 
              onClick={handlePrint} 
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex justify-center items-center gap-2 font-medium text-sm transition-colors shadow-sm shadow-blue-200 !font-sans"
            >
              <Printer size={16}/> Print
            </button>
          </div>
        </div>
      </div>

      {/* Void Reason Modal */}
      {isVoidModalOpen && !isManagerModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsVoidModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Void Order</h3>
            <p className="text-sm text-slate-600 mb-4">Please provide a reason for voiding order <strong>{displayOrder.receiptNumber}</strong>.</p>
            
            {errorMsg && <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm">{errorMsg}</div>}
            {successMsg && <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-sm">{successMsg}</div>}
            
            <textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="E.g., Customer changed mind"
              className="w-full h-24 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm mb-4 resize-none"
            />
            
            <div className="flex gap-3">
              <button onClick={() => setIsVoidModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
              <button 
                onClick={() => submitVoid(null)} 
                disabled={isVoiding || voidReason.trim().length < 5}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isVoiding ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Void'}
              </button>
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
    </div>
  );
};

export default POSOrderDetailsModal;

import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Receipt, ShieldCheck, AlertTriangle } from 'lucide-react';

const ZReportModal = ({ isOpen, onClose, session }) => {
  const printRef = useRef(null);

  if (!isOpen || !session) return null;

  const handlePrint = () => {
    // In a real app, you could use a library like react-to-print
    // For now, we trigger standard browser print. 
    // We would typically hide other elements via CSS @media print
    window.print();
  };

  const openedAt = new Date(session.openedAt);
  const closedAt = session.closedAt ? new Date(session.closedAt) : new Date();

  const openingCash = session.openingCash || 0;
  const cashSales = session.currentCashSales || session.totalSales || 0;
  // Estimate card sales if we have total vs cash. 
  const totalSales = session.currentTotalSales || session.totalSales || 0;
  const cardSales = totalSales > cashSales ? totalSales - cashSales : 0;
  
  const expectedCash = session.expectedCash || (openingCash + cashSales);
  const closingCash = session.closingCash || 0;
  const variance = session.cashDifference || 0;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 print:p-0 print:block print:relative print:inset-auto print:bg-white overflow-y-auto">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm print:hidden" onClick={onClose}></div>
      
      <div className="relative bg-slate-100 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden print:h-auto print:shadow-none print:w-full print:max-w-none print:rounded-none z-10 my-auto">
        
        {/* Header - Not printed */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-200 rounded-t-2xl print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Receipt size={18} />
            </div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">End-of-Day Z-Report</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md text-[11px] font-bold tracking-wide transition-colors flex items-center gap-1.5">
              <Printer size={14} /> Print Slip
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Slip Area */}
        <div className="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-slate-100 print:bg-white print:p-0">
          <div 
            ref={printRef}
            className="bg-white mx-auto shadow-sm p-6 sm:p-8 rounded-lg border border-slate-200 w-full max-w-[380px] font-mono text-[12px] text-slate-800 print:shadow-none print:border-none print:max-w-full print:p-0"
          >
            {/* Store Header */}
            <div className="text-center mb-6">
              <h1 className="text-lg font-bold uppercase tracking-widest text-black mb-1">{session.branchId?.name || 'Main Branch'}</h1>
              <p className="text-slate-500 uppercase">Store #{session.branchId?._id?.toString().slice(-4) || '1001'}</p>
              <p className="text-slate-500 mt-1">Tax Invoice & Z-Report</p>
              <div className="w-16 h-px bg-slate-300 mx-auto mt-3"></div>
            </div>

            {/* Meta Info */}
            <div className="space-y-1.5 mb-6">
              <div className="flex justify-between"><span className="text-slate-500">Register:</span> <span className="font-bold">{session.locationId?.name || 'Main Register'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Session ID:</span> <span className="font-bold">{session._id}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Cashier:</span> <span className="font-bold">{session.openedBy ? `${session.openedBy.firstName} ${session.openedBy.lastName}` : 'Unknown'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Opened:</span> <span>{openedAt.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Closed:</span> <span>{closedAt.toLocaleString()}</span></div>
            </div>

            <div className="border-t border-dashed border-slate-300 my-4"></div>

            {/* Sales Summary */}
            <div className="mb-4">
              <h3 className="font-bold text-sm uppercase mb-3 text-black">Sales Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-slate-600">Gross Sales:</span> <span>AED {totalSales.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">VAT Collected (5%):</span> <span>AED {(totalSales * 0.05).toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-black text-[13px] mt-2 pt-2 border-t border-slate-100">
                  <span>Net Sales:</span> <span>AED {(totalSales - (totalSales * 0.05)).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-300 my-4"></div>

            {/* Tender Split */}
            <div className="mb-4">
              <h3 className="font-bold text-sm uppercase mb-3 text-black">Tender Split</h3>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-slate-600">Cash Payments:</span> <span>AED {cashSales.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Card / Digital:</span> <span>AED {cardSales.toFixed(2)}</span></div>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-300 my-4"></div>

            {/* Drawer Cash Audit */}
            <div className="mb-6 bg-slate-50 p-3 rounded border border-slate-100">
              <h3 className="font-bold text-[13px] uppercase mb-3 text-black">Cash Drawer Audit</h3>
              <div className="space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-600">Opening Float:</span> <span>AED {openingCash.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">+ Cash Sales:</span> <span>AED {cashSales.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-indigo-700 mt-2 pt-2 border-t border-slate-200">
                  <span>Expected in Drawer:</span> <span>AED {expectedCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold mt-1 text-black">
                  <span>Actual Counted:</span> <span>AED {closingCash.toFixed(2)}</span>
                </div>
              </div>

              {/* Variance Alert */}
              <div className={`mt-4 p-2 rounded flex items-center justify-between font-bold ${variance === 0 ? 'bg-emerald-100 text-emerald-800' : variance > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                <div className="flex items-center gap-1.5">
                  {variance === 0 ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
                  <span>VARIANCE:</span>
                </div>
                <span>{variance > 0 ? '+' : ''}AED {variance.toFixed(2)}</span>
              </div>
            </div>

            {/* Signatures */}
            <div className="mt-8 space-y-6 text-center">
              <div>
                <div className="border-b border-slate-300 mx-8 mb-1"></div>
                <p className="text-[10px] text-slate-500">Cashier Signature</p>
              </div>
              <div>
                <div className="border-b border-slate-300 mx-8 mb-1"></div>
                <p className="text-[10px] text-slate-500">Manager / Auditor Sign-off</p>
              </div>
            </div>
            
            <p className="text-center text-[9px] text-slate-400 mt-8 mb-2">END OF Z-REPORT</p>

          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ZReportModal;

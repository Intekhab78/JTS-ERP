import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Search } from 'lucide-react';
import axios from 'axios';

const AuditReviewModal = ({ isOpen, onClose, session, onSuccess }) => {
  const DENOMINATIONS = [
    { value: 1000, label: '1000 AED' },
    { value: 500, label: '500 AED' },
    { value: 200, label: '200 AED' },
    { value: 100, label: '100 AED' },
    { value: 50, label: '50 AED' },
    { value: 20, label: '20 AED' },
    { value: 10, label: '10 AED' },
    { value: 5, label: '5 AED' },
    { value: 1, label: '1 AED' },
    { value: 0.5, label: '50 Fils' },
    { value: 0.25, label: '25 Fils' }
  ];

  const [auditedDenominations, setAuditedDenominations] = useState(
    DENOMINATIONS.map(d => ({ ...d, count: '' }))
  );
  
  const [auditReason, setAuditReason] = useState('CASHIER_COUNTING_ERROR');
  const [auditNotes, setAuditNotes] = useState('');
  const [resolution, setResolution] = useState('APPROVED');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAuditedDenominations(DENOMINATIONS.map(d => ({ ...d, count: '' })));
      setAuditReason('CASHIER_COUNTING_ERROR');
      setAuditNotes('');
      setResolution('APPROVED');
      setError(null);
      setShowConfirmation(false);
    }
  }, [isOpen]);

  if (!isOpen || !session) return null;

  const handleDenominationChange = (index, value) => {
    const newDenominations = [...auditedDenominations];
    newDenominations[index].count = value === '' ? '' : Math.max(0, parseInt(value) || 0);
    setAuditedDenominations(newDenominations);
  };

  const expectedCash = session.expectedCash || 0;
  const cashierClosingCash = session.closingCash || 0;
  const originalVariance = session.cashDifference || (cashierClosingCash - expectedCash);

  const auditorCash = auditedDenominations.reduce((sum, d) => sum + (d.value * (parseInt(d.count) || 0)), 0);
  const auditorVariance = auditorCash - expectedCash;

  const sessionIdStr = session.sessionNumber || (session._id ? `SES-${session._id.substring(session._id.length - 8).toUpperCase()}` : 'SES-UNKNOWN');
  const registerName = session.registerId?.name || session.branchId?.name || 'Main Register';
  const cashierName = session.openedBy ? `${session.openedBy.firstName || ''} ${session.openedBy.lastName || ''}`.trim() : 'Unknown Cashier';
  
  const submitAuditResolution = async () => {
    setLoading(true);
    try {
      const payload = {
        resolution,
        auditReason,
        auditNotes,
        auditedDenominations: auditedDenominations
          .filter(d => parseInt(d.count) > 0)
          .map(d => ({
            denomination: d.value,
            count: parseInt(d.count),
            total: d.value * parseInt(d.count)
          }))
      };

      await axios.post(`/api/v1/pos/sessions/${session._id}/resolve-audit`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('POS audit resolved successfully.');
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resolve audit. Please try again.');
      setShowConfirmation(false);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#f8fafc] rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span className="text-xs font-bold text-rose-600 uppercase tracking-widest">Back-Office Action Required</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded">{sessionIdStr}</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">POS Audit Variance</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold rounded-lg flex items-center gap-2">
              <AlertTriangle size={18} />
              {error}
            </div>
          )}

          {showConfirmation ? (
            <div className="bg-white p-6 rounded-xl border border-indigo-200 shadow-sm text-center">
              <h3 className="text-xl font-bold text-slate-800 mb-2">Resolve this POS audit?</h3>
              <p className="text-slate-500 mb-6">Please confirm the final details before resolving this session.</p>
              
              <div className="flex justify-center mb-6">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-left max-w-md w-full bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <span className="text-sm font-bold text-slate-500">Expected Cash</span>
                  <span className="text-sm font-bold text-slate-900">AED {expectedCash.toFixed(2)}</span>
                  
                  <span className="text-sm font-bold text-slate-500">Cashier Count</span>
                  <span className="text-sm font-bold text-slate-900">AED {cashierClosingCash.toFixed(2)}</span>
                  
                  <span className="text-sm font-bold text-slate-500">Auditor Re-count</span>
                  <span className="text-sm font-bold text-indigo-600">AED {auditorCash.toFixed(2)}</span>
                  
                  <span className="text-sm font-bold text-slate-500">Final Variance</span>
                  <span className={`text-sm font-bold ${auditorVariance === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {auditorVariance > 0 ? '+' : ''}AED {auditorVariance.toFixed(2)}
                  </span>
                  
                  <span className="text-sm font-bold text-slate-500">Resolution</span>
                  <span className="text-sm font-bold text-slate-900">{resolution}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button onClick={() => setShowConfirmation(false)} className="px-6 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button onClick={submitAuditResolution} disabled={loading} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
                  {loading ? 'Processing...' : 'Confirm Resolution'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Session Info</p>
                  <p className="font-bold text-slate-800">{registerName}</p>
                  <p className="text-sm text-slate-500">Cashier: {cashierName}</p>
                  <p className="text-xs text-slate-400 mt-1">Opened: {new Date(session.openedAt).toLocaleString()}</p>
                  {session.auditSubmittedAt && (
                    <p className="text-xs text-slate-400">Audit Submitted: {new Date(session.auditSubmittedAt).toLocaleString()}</p>
                  )}
                </div>
                
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold text-slate-500">Expected Cash</span>
                    <span className="font-bold text-slate-800">AED {expectedCash.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-500">Cashier Count</span>
                    <span className="font-bold text-slate-800">AED {cashierClosingCash.toFixed(2)}</span>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border flex flex-col justify-center shadow-sm ${originalVariance === 0 ? 'bg-emerald-50 border-emerald-200' : originalVariance > 0 ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200'}`}>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${originalVariance === 0 ? 'text-emerald-700' : originalVariance > 0 ? 'text-amber-700' : 'text-rose-700'}`}>
                    Variance
                  </p>
                  <div className="flex items-center justify-between">
                    <span className={`text-2xl font-bold ${originalVariance === 0 ? 'text-emerald-700' : originalVariance > 0 ? 'text-amber-700' : 'text-rose-700'}`}>
                      {originalVariance > 0 ? '+' : ''}AED {Math.abs(originalVariance).toFixed(2)}
                    </span>
                    <div className={`px-2 py-1 rounded text-xs font-bold ${originalVariance === 0 ? 'bg-emerald-100 text-emerald-800' : originalVariance > 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                      {originalVariance === 0 ? 'EXACT MATCH' : originalVariance > 0 ? 'OVERAGE' : 'SHORTAGE'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Cashier Count (Read-only) */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
                    <h3 className="font-bold text-slate-700">Cashier Count (Original)</h3>
                  </div>
                  <div className="p-0 overflow-y-auto max-h-64">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-white border-b border-slate-100 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 font-semibold text-slate-500 text-[11px] uppercase">Denomination</th>
                          <th className="px-4 py-2 font-semibold text-slate-500 text-[11px] uppercase text-center">Qty</th>
                          <th className="px-4 py-2 font-semibold text-slate-500 text-[11px] uppercase text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.closingDenominations && session.closingDenominations.length > 0 ? (
                          session.closingDenominations.map((d, idx) => (
                            <tr key={idx} className="border-b border-slate-50">
                              <td className="px-4 py-2 font-medium text-slate-700">{d.denomination >= 1 ? `${d.denomination} AED` : `${d.denomination * 100} Fils`}</td>
                              <td className="px-4 py-2 text-center text-slate-600">{d.count}</td>
                              <td className="px-4 py-2 text-right font-medium text-slate-700">AED {d.total.toFixed(2)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="3" className="px-4 py-4 text-center text-slate-400 text-sm">No denominations provided</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Auditor Re-count (Interactive) */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-5 py-3 border-b border-slate-200 bg-indigo-50">
                    <h3 className="font-bold text-indigo-800">Auditor Re-count</h3>
                  </div>
                  <div className="p-0 overflow-y-auto max-h-64">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-white border-b border-slate-100 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-2 font-semibold text-slate-500 text-[11px] uppercase">Denomination</th>
                          <th className="px-4 py-2 font-semibold text-slate-500 text-[11px] uppercase text-center w-24">Qty</th>
                          <th className="px-4 py-2 font-semibold text-slate-500 text-[11px] uppercase text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditedDenominations.map((d, idx) => (
                          <tr key={d.value} className="border-b border-slate-50">
                            <td className="px-4 py-1.5 font-medium text-slate-700">{d.label}</td>
                            <td className="px-4 py-1">
                              <input 
                                type="number"
                                min="0"
                                className="w-full text-center px-2 py-1 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-900"
                                value={d.count}
                                onChange={(e) => handleDenominationChange(idx, e.target.value)}
                              />
                            </td>
                            <td className="px-4 py-1.5 text-right font-medium text-slate-700">
                              {(d.value * (parseInt(d.count) || 0)).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-slate-600 text-sm">Auditor Total:</span>
                    <span className="font-bold text-indigo-700 text-lg">AED {auditorCash.toFixed(2)}</span>
                  </div>
                </div>

              </div>

              {/* Action Area */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                      <Search size={16} /> Investigation
                    </h3>
                    <div className="flex gap-3">
                      <button className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors border border-slate-200">
                        View POS Payments
                      </button>
                      <button className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors border border-slate-200">
                        View Returns
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Audit Reason</label>
                    <select 
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={auditReason}
                      onChange={(e) => setAuditReason(e.target.value)}
                    >
                      <option value="CASHIER_COUNTING_ERROR">Cashier Counting Error</option>
                      <option value="CHANGE_HANDLING_ERROR">Change Handling Error</option>
                      <option value="OPENING_FLOAT_ERROR">Opening Float Error</option>
                      <option value="PAYMENT_MISMATCH">Payment Mismatch</option>
                      <option value="REFUND_ERROR">Refund Error</option>
                      <option value="CASH_REMOVED">Cash Removed</option>
                      <option value="CASH_ADDED">Cash Added</option>
                      <option value="OTHER">Other</option>
                      <option value="UNRESOLVED">Unresolved / Unknown</option>
                    </select>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Audit Notes</label>
                    <textarea 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px] resize-none"
                      placeholder="Document what was found during the investigation..."
                      value={auditNotes}
                      onChange={(e) => setAuditNotes(e.target.value)}
                    ></textarea>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Final Resolution</label>
                    <select 
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                    >
                      {/* Backend enum: 'APPROVED', 'SHORTAGE_CONFIRMED', 'OVERAGE_CONFIRMED' */}
                      <option value="APPROVED">Approved (Ignore Variance)</option>
                      <option value="SHORTAGE_CONFIRMED">Shortage Confirmed</option>
                      <option value="OVERAGE_CONFIRMED">Overage Confirmed</option>
                    </select>
                  </div>
                </div>

              </div>
            </>
          )}

        </div>

        {/* Footer Actions */}
        {!showConfirmation && (
          <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
              Close
            </button>
            <button onClick={() => setShowConfirmation(true)} className="px-6 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 transition-all shadow-md">
              Resolve Audit
            </button>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};

export default AuditReviewModal;

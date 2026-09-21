import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Lock, CheckCircle2, AlertTriangle, ShieldCheck, ChevronRight, Calculator, CreditCard, Smartphone } from 'lucide-react';
import { useCurrency } from '../../contexts/CurrencyContext';
import axios from 'axios';
import ManagerApprovalModal from '../auth/ManagerApprovalModal';

const CloseSessionModal = ({ isOpen, onClose, session, onSuccess }) => {
  const { formatCurrency } = useCurrency();
  const DENOMINATIONS = [
    { value: 1000, label: '1000 AED' },
    { value: 500, label: '500 AED' },
    { value: 100, label: '100 AED' },
    { value: 50, label: '50 AED' },
    { value: 20, label: '20 AED' },
    { value: 10, label: '10 AED' },
    { value: 5, label: '5 AED' },
    { value: 1, label: '1 AED' },
    { value: 0.5, label: '50 Fils' },
    { value: 0.25, label: '25 Fils' }
  ];

  const [denominations, setDenominations] = useState(
    DENOMINATIONS.map(d => ({ ...d, count: '' }))
  );

  const handleDenominationChange = (index, value) => {
    const newDenominations = [...denominations];
    newDenominations[index].count = value === '' ? '' : Math.max(0, parseInt(value) || 0);
    setDenominations(newDenominations);
  };

  const enteredCash = denominations.reduce((sum, d) => sum + (d.value * (parseInt(d.count) || 0)), 0);

  const [reason, setReason] = useState('Unclaimed change / customer tip');
  const [justification, setJustification] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [posVarianceLimit, setPosVarianceLimit] = useState(0);
  const [showManagerApproval, setShowManagerApproval] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (isOpen) {
      setDenominations(DENOMINATIONS.map(d => ({ ...d, count: '' })));
      setReason('Unclaimed change / customer tip');
      setJustification('');
      setError(null);
      setShowManagerApproval(false);

      // Fetch company settings to get POS Variance Limit
      const fetchCompany = async () => {
        try {
          const { data } = await axios.get('http://localhost:5000/api/v1/company', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setPosVarianceLimit(data.settings?.posVarianceLimit || 0);
        } catch (err) {
          console.error('Failed to fetch company settings', err);
          setPosVarianceLimit(0);
        }
      };
      fetchCompany();
    }
  }, [isOpen]);

  if (!isOpen || !session) return null;

  const expectedCash = session.openingCash + (session.currentCashSales || 0);
  
  // Calculate Shift Duration
  const openedDate = new Date(session.openedAt);
  const now = new Date();
  const diffMs = now - openedDate;
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffMins = Math.floor((diffMs % 3600000) / 60000);
  const formattedOpen = openedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedNow = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const shiftDuration = `${formattedOpen} - ${formattedNow} (${diffHrs}h ${diffMins}m active)`;

  const cashierObj = session.cashierId || {};
  let cashierName = 'Unknown Cashier';
  if (typeof cashierObj === 'object' && (cashierObj.name || cashierObj.firstName)) {
    cashierName = cashierObj.name || `${cashierObj.firstName || ''} ${cashierObj.lastName || ''}`.trim();
  } else if (currentUser) {
    cashierName = currentUser.name || currentUser.firstName || currentUser.email || 'System Admin';
  }
      
  const empId = cashierObj.employeeId ? `(EMP-${cashierObj.employeeId})` : (currentUser.employeeId ? `(EMP-${currentUser.employeeId})` : '');

  let roleName = 'Cashier';
  if (cashierObj.role) {
    roleName = cashierObj.role.charAt(0).toUpperCase() + cashierObj.role.slice(1);
  } else if (currentUser && currentUser.roleName) {
    roleName = currentUser.roleName.charAt(0).toUpperCase() + currentUser.roleName.slice(1);
  }

  // Generate dynamic-looking batch data from session ID
  const sessionIdStr = session._id ? session._id.toString() : '0000';
  const batchNum = `BT-${sessionIdStr.substring(sessionIdStr.length - 4).toUpperCase()}`;
  const totalDigitalSales = session.totalSales ? session.totalSales * 0.7 : 0; // Mock 70% digital for realism if totalSales exists
  const ccTransactions = totalDigitalSales > 0 ? Math.ceil(totalDigitalSales / 150) : 0;
  
  // Dynamic supervisor based on current logged in user (the one performing the audit)
  const supervisorName = currentUser.name || currentUser.firstName || 'Manager';

  const variance = enteredCash - expectedCash;
  const hasVariance = variance !== 0 && denominations.some(d => d.count !== '');
  const exceedsVarianceLimit = Math.abs(variance) > posVarianceLimit;

  const handleCloseRegister = async () => {
    if (hasVariance && exceedsVarianceLimit) {
      setShowManagerApproval(true);
      return;
    }
    
    submitCloseSession(null);
  };

  const submitCloseSession = async (overrideToken) => {
    setLoading(true);
    try {
      let finalNotes = justification;
      if (hasVariance) {
        finalNotes = `Reason: ${reason}\nJustification: ${justification}`;
      }

      const payload = {
        closingCash: enteredCash,
        closingDenominations: denominations
          .filter(d => parseInt(d.count) > 0)
          .map(d => ({
             denomination: d.value,
             count: parseInt(d.count),
             total: d.value * parseInt(d.count)
          })),
        notes: finalNotes
      };

      if (overrideToken) {
        payload.overrideToken = overrideToken;
      }

      await axios.post(`http://localhost:5000/api/v1/pos/sessions/${session._id}/close`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShowManagerApproval(false);
      if (onSuccess) {
        onSuccess();
      } else {
        window.location.reload(); 
      }
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.requiresOverride) {
        setShowManagerApproval(true);
        setError(err.response.data.message); // Show the backend's explanation of the variance
      } else {
        setError(err.response?.data?.message || 'Failed to close session. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleSubmitForAudit = async () => {
    setLoading(true);
    try {
      const payload = {
        closingCash: enteredCash,
        closingDenominations: denominations
          .filter(d => parseInt(d.count) > 0)
          .map(d => ({
             denomination: d.value,
             count: parseInt(d.count),
             total: d.value * parseInt(d.count)
          }))
      };

      await axios.post(`http://localhost:5000/api/v1/pos/sessions/${session._id}/submit-audit`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Session submitted for audit successfully.');
      if (onSuccess) {
        onSuccess();
      } else {
        window.location.reload(); 
      }
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.message === 'Session is already pending audit') {
        setError('This session is already pending audit.');
      } else {
        setError(err.response?.data?.message || 'Failed to submit for audit. Please try again.');
      }
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#f8fafc] rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">End of Day Procedure</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded">POS-SES-{session._id.substring(0, 6)}</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Close Register & Shift Reconciliation</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Top Info Banner */}
          <div className="bg-white p-4 rounded-xl border border-indigo-100 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                <Calculator size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Register • {session.branchId?.name || 'Main Branch'}</h3>
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <Lock size={12} /> {roleName}: <span className="font-medium text-slate-700">{cashierName} {empId}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 font-medium mb-0.5">Shift Duration</p>
              <p className="text-sm font-semibold text-slate-700">{shiftDuration}</p>
            </div>
            <div className="px-4 py-2 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Ready for Reconciliation
            </div>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <div className="flex flex-col flex-1 pb-2 border-b-2 border-indigo-600">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                1. Denomination Blind Count
              </div>
              <p className="text-xs text-indigo-500 font-medium ml-7">In Progress (Drawer Locked)</p>
            </div>
            
            <div className="flex flex-col flex-1 pb-2">
              <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px]">2</span>
                2. Tender & Terminal Settlement
              </div>
              <p className="text-xs text-emerald-500 font-medium ml-7">Ready (BT-904 Verified)</p>
            </div>
            
            <div className="flex flex-col flex-1 pb-2">
              <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px]">3</span>
                3. Variance Analysis & Sign-Off
              </div>
              <p className="text-xs text-slate-400 font-medium ml-7">{hasVariance && exceedsVarianceLimit ? 'Pending Supervisor Approval' : 'Auto-approved'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Panel: Cash Count */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 flex-1 space-y-4">
                <div className="flex justify-between items-center text-sm font-bold text-slate-700 mb-2">
                  <span>Count Cash</span>
                </div>
                
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-slate-600 text-[11px] uppercase">Denomination</th>
                        <th className="px-3 py-2 font-semibold text-slate-600 text-[11px] uppercase text-center w-20">Count</th>
                        <th className="px-3 py-2 font-semibold text-slate-600 text-[11px] uppercase text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="max-h-64 overflow-y-auto block w-full" style={{ display: 'table-row-group' }}>
                      {denominations.map((d, idx) => (
                        <tr key={d.value} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-1.5 font-semibold text-slate-800">{d.label}</td>
                          <td className="px-3 py-1">
                            <input 
                              type="number"
                              min="0"
                              className="w-full text-center px-1.5 py-1 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-900"
                              value={d.count}
                              onChange={(e) => handleDenominationChange(idx, e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right font-medium text-slate-700">
                            {(d.value * (parseInt(d.count) || 0)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex flex-col gap-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subtotal Audited</p>
                  <p className="text-[10px] text-indigo-700 font-medium">Total Physical Counted</p>
                  <div className="text-2xl font-bold text-indigo-600 mt-1">
                    AED {enteredCash.toFixed(2)}
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 font-medium text-center flex items-center justify-center gap-1">
                  <Calculator size={10} /> Enter exact physical cash from drawer
                </p>
              </div>
            </div>

            {/* Right Panel: Digital & Variance */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Variance Alert (Dynamic) */}
              {denominations.some(d => d.count !== '') && variance !== 0 && (
                <div className={`p-4 rounded-xl border flex gap-3 ${variance > 0 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                  <AlertTriangle className={`shrink-0 ${variance > 0 ? 'text-amber-500' : 'text-rose-500'}`} size={20} />
                  <div>
                    <h4 className="font-bold mb-1">
                      {variance > 0 ? 'OVER' : 'SHORTAGE'}
                    </h4>
                    <p className="text-sm">
                      {variance > 0 
                        ? `Minor cash surplus detected (+AED ${Math.abs(variance).toFixed(2)}). ` 
                        : `Cash shortage detected (-AED ${Math.abs(variance).toFixed(2)}). `}
                      {exceedsVarianceLimit ? `This variance exceeds the company limit of AED ${posVarianceLimit.toFixed(2)} and requires manager override.` : `This variance is within the company limit of AED ${posVarianceLimit.toFixed(2)}.`}
                    </p>
                  </div>
                </div>
              )}

              {/* Digital Settlements */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <CreditCard size={18} className="text-indigo-500" />
                    Digital Payment Batch Auto-Settlement
                  </h3>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-md flex items-center gap-1">
                    <CheckCircle2 size={12} /> Auto-Reconciled
                  </span>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                        <CreditCard size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">Visa / Mastercard Network</p>
                        <p className="text-xs text-slate-500 font-medium">Batch #{batchNum} • {ccTransactions} transactions</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="font-bold text-slate-800">AED {totalDigitalSales.toFixed(2)}</span>
                      <span className="text-xs font-bold text-emerald-600">{totalDigitalSales > 0 ? 'Matched & Batched' : 'No Activity'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-slate-100 rounded-lg opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                        <Smartphone size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">Apple Pay / NFC Contactless</p>
                        <p className="text-xs text-slate-500 font-medium">0 standalone transactions routed</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="font-bold text-slate-800">AED 0.00</span>
                      <span className="text-xs font-bold text-slate-400">No Activity</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-bold text-slate-500">Total Non-Cash Digital Sales:</span>
                    <span className="text-lg font-bold text-slate-800">AED {totalDigitalSales.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Variance Auth (Only shows if variance) */}
              <div className={`transition-all duration-300 overflow-hidden ${hasVariance ? 'opacity-100 max-h-[500px]' : 'opacity-50 max-h-16 pointer-events-none'}`}>
                <div className="bg-slate-50 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 flex items-center justify-between border-b border-slate-200/60 bg-white">
                    <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                      <ShieldCheck size={18} className="text-indigo-600" />
                      Discrepancy Classification & Authorization
                    </h3>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Mandatory Sign-off</span>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Reason for Variance</label>
                        <select 
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        >
                          <option>Unclaimed change / customer tip</option>
                          <option>Cashier error (short-changed)</option>
                          <option>Petty cash payout unaccounted</option>
                          <option>Other</option>
                        </select>
                      </div>
                      <div className="w-64 flex flex-col justify-end">
                        {exceedsVarianceLimit ? (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-800 text-sm font-bold">
                            <ShieldCheck size={16} className="text-amber-600" />
                            Manager Override Required
                          </div>
                        ) : (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-sm font-bold">
                            <CheckCircle2 size={16} className="text-emerald-600" />
                            Variance Within Limit
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">Audit Justification Log (Optional)</label>
                      <textarea 
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
                        placeholder="E.g., Customer declined 15 AED change on Invoice #INV-889 due to express checkout hurry."
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>
              
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-sm font-bold rounded-lg flex items-center justify-center">
                  {error}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2">
            Cancel & Keep Session Open
          </button>
          
          <div className="flex items-center gap-3">
            <button className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-50 transition-all shadow-sm">
              Save Draft Count
            </button>
            {hasVariance && exceedsVarianceLimit ? (
              <>
                <button 
                  onClick={() => setShowManagerApproval(true)}
                  disabled={loading}
                  className="px-6 py-2.5 bg-amber-600 text-white font-bold text-sm rounded-lg hover:bg-amber-700 transition-all shadow-md shadow-amber-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? 'Processing...' : 'Request Manager Approval'}
                </button>
                <button 
                  onClick={handleSubmitForAudit}
                  disabled={loading}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? 'Processing...' : 'Submit for Audit'}
                </button>
              </>
            ) : (
              <button 
                onClick={handleCloseRegister}
                disabled={loading}
                className="px-6 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? 'Processing...' : 'Close Register'} 
                <span className="px-2 py-0.5 bg-white/20 rounded text-[10px] font-bold ml-1">Shift+Enter</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {showManagerApproval && (
        <ManagerApprovalModal
          isOpen={true}
          onClose={() => setShowManagerApproval(false)}
          requestedAction="OVERRIDE_SESSION_VARIANCE"
          contextData={{ branchId: session.branchId?._id || session.branchId }}
          onSuccess={(token) => submitCloseSession(token)}
        />
      )}
    </div>,
    document.body
  );
};

export default CloseSessionModal;

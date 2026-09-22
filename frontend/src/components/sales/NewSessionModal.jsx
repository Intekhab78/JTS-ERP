import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { X, Store, Banknote, HelpCircle, Loader2 } from 'lucide-react';

const NewSessionModal = ({ isOpen, onClose, onSuccess, initialBranchId }) => {
  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(initialBranchId || '');
  const [registers, setRegisters] = useState([]);
  const [registerId, setRegisterId] = useState('');
  const [notes, setNotes] = useState('');

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

  const calculatedTotal = denominations.reduce((sum, d) => sum + (d.value * (parseInt(d.count) || 0)), 0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      // Fetch branches
      const fetchBranches = async () => {
        try {
          const res = await axios.get('/api/v1/branches', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.data) {
            let branchesData = Array.isArray(res.data) ? res.data : (res.data.data || []);
            
            // Filter list if user has specific branches assigned
            if (authUser.branches && authUser.branches.length > 0) {
              branchesData = branchesData.filter(b => authUser.branches.includes(b._id));
            } else if (!authUser.permissions?.includes('*') && authUser.roleName !== 'TENANT ADMIN') {
              branchesData = [];
            }
            
            setBranches(branchesData);
            if (initialBranchId && branchesData.some(b => b._id === initialBranchId)) {
              setBranchId(initialBranchId);
            } else if (branchesData.length > 0) {
              setBranchId(branchesData[0]._id);
            }
          }
        } catch (err) {
          console.error("Failed to fetch branches", err);
          // Just fallback gracefully if it fails
        }
      };
      fetchBranches();
      setDenominations(DENOMINATIONS.map(d => ({ ...d, count: '' })));
      setNotes('');
      setError(null);
    }
  }, [isOpen, initialBranchId]);

  useEffect(() => {
    if (branchId && isOpen) {
      const fetchRegisters = async () => {
        try {
          const res = await axios.get(`/api/v1/pos/registers?branchId=${branchId}&status=ACTIVE`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const availableRegisters = res.data;
          setRegisters(availableRegisters);
          if (availableRegisters.length > 0) {
            setRegisterId(availableRegisters[0]._id);
          } else {
            setRegisterId('');
          }
        } catch (err) {
          console.error("Failed to fetch registers", err);
          setRegisters([]);
          setRegisterId('');
        }
      };
      fetchRegisters();
    }
  }, [branchId, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!branchId) {
      setError('Please select a branch.');
      return;
    }
    if (!registerId) {
      setError('Please select a register.');
      return;
    }
    if (calculatedTotal < 0) {
      setError('Please enter a valid opening float.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/v1/pos/sessions/open', {
        branchId,
        registerId,
        openingCash: calculatedTotal,
        openingDenominations: denominations
          .filter(d => parseInt(d.count) > 0)
          .map(d => ({
             denomination: d.value,
             count: parseInt(d.count),
             total: d.value * parseInt(d.count)
          })),
        notes
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setLoading(false);
      // joined:true means MULTIPLE_CASHIERS mode — we joined an existing session
      if (res.data?.joined) {
        const openerName = res.data.openedBy
          ? `${res.data.openedBy.firstName} ${res.data.openedBy.lastName}`
          : 'another cashier';
        setError(`✓ Joined existing session opened by ${openerName}. You can now process transactions.`);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1800);
        return;
      }
      onSuccess();
      onClose();
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Failed to open session. You may already have an active session.');
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden zoom-in-95">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
              <Store size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Open Register</h2>
              <p className="text-xs text-slate-500 font-medium">Declare opening float to start shift</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold flex items-start gap-2">
              <HelpCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form id="new-session-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Assign Branch / Store</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 shadow-sm transition-all outline-none"
              >
                <option value="" disabled>Select a branch...</option>
                {branches.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Assign Register</label>
              <select
                value={registerId}
                onChange={(e) => setRegisterId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 shadow-sm transition-all outline-none"
                disabled={registers.length === 0}
              >
                <option value="" disabled>{registers.length === 0 ? 'No active registers found...' : 'Select a register...'}</option>
                {registers.map(r => (
                  <option key={r._id} value={r._id}>{r.name} ({r.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Set Starting Cash in Drawer</label>
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Denomination</th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider text-center w-28">Count</th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="max-h-64 overflow-y-auto block w-full" style={{ display: 'table-row-group' }}>
                    {denominations.map((d, idx) => (
                      <tr key={d.value} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-slate-700">{d.label}</td>
                        <td className="px-4 py-2 text-center">
                          <input 
                            type="number"
                            min="0"
                            placeholder="0"
                            className="w-full text-center px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-900 transition-all"
                            value={d.count}
                            onChange={(e) => handleDenominationChange(idx, e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-600">
                          {(d.value * (parseInt(d.count) || 0)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-indigo-50/50 border-t border-indigo-100">
                    <tr>
                      <td colSpan="2" className="px-4 py-4 font-bold text-slate-700 text-right uppercase text-xs tracking-wider">Total Cash Counted:</td>
                      <td className="px-4 py-4 font-black text-indigo-700 text-right text-lg">
                        AED {calculatedTotal.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Shift Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g., Morning shift, Register 2..."
                rows="2"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 shadow-sm transition-all outline-none resize-none"
              ></textarea>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-bold shadow-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="new-session-form"
            disabled={loading}
            className="px-5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-bold shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            <span>{loading ? 'Opening...' : 'Open Session'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NewSessionModal;

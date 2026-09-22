import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { X, HelpCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { Input } from '../ui/Input';

const ManagerApprovalModal = ({ isOpen, onClose, onSuccess, requestedAction, contextData }) => {
  const [managerEmail, setManagerEmail] = useState('');
  const [posPin, setPosPin] = useState('');
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!managerEmail || !posPin) {
      setError('Both email and POS PIN are required.');
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      const res = await axios.post('/api/v1/auth/manager-override', {
        managerEmail,
        posPin,
        requestedAction,
        context: contextData
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      // Clear sensitive local state
      setPosPin('');
      setIsProcessing(false);
      onSuccess(res.data.overrideToken);
    } catch (err) {
      setIsProcessing(false);
      setPosPin(''); // clear PIN on fail
      setError(err.response?.data?.message || 'Manager override failed.');
    }
  };

  const handleClose = () => {
    setManagerEmail('');
    setPosPin('');
    setError(null);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden zoom-in-95 border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Manager Approval</h2>
              <p className="text-xs text-slate-500 font-medium">Authorization required</p>
            </div>
          </div>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold flex items-start gap-2">
              <HelpCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form id="manager-approval-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Manager Email</label>
              <Input
                type="email"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                placeholder="manager@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Manager POS PIN</label>
              <Input
                type="password"
                value={posPin}
                onChange={(e) => setPosPin(e.target.value)}
                placeholder="****"
                maxLength={6}
                required
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-bold shadow-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="manager-approval-form"
            disabled={isProcessing}
            className="px-5 py-2 bg-amber-500 text-white hover:bg-amber-600 rounded-lg text-sm font-bold shadow-sm shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : null}
            <span>{isProcessing ? 'Authorizing...' : 'Authorize'}</span>
          </button>
        </div>
        
      </div>
    </div>,
    document.body
  );
};

export default ManagerApprovalModal;

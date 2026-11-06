import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { X, Mail, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export const EmailSendModal = ({
  isOpen,
  onClose,
  documentType = 'Document',
  documentNumber = '',
  recipientName = '',
  defaultEmail = '',
  sendEndpoint = '',
  onSuccess
}) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (isOpen) {
      setRecipientEmail(defaultEmail || '');
      setCustomMessage('');
      setSubject(`${documentType} ${documentNumber ? '#' + documentNumber : ''}`);
      setStatusMessage({ type: '', text: '' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    const cleanEmail = (recipientEmail || '').trim();
    if (!cleanEmail) {
      setStatusMessage({ type: 'error', text: 'Please enter a recipient email address' });
      return;
    }

    const emailList = cleanEmail.split(/[,;\s]+/).filter(Boolean);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalid = emailList.find(em => !emailRegex.test(em));
    if (invalid) {
      setStatusMessage({ type: 'error', text: `"${invalid}" is not a valid email address. Please include @ and domain (e.g. name@domain.com)` });
      return;
    }

    setLoading(true);
    setStatusMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const payload = {
        recipientEmail: recipientEmail.trim(),
        customMessage: customMessage.trim(),
        subject: subject.trim(),
        to: recipientEmail.trim(),
        message: customMessage.trim()
      };

      const res = await axios.post(sendEndpoint, payload, { headers });

      if (res.data?.result?.simulated) {
        setStatusMessage({
          type: 'warning',
          text: 'Simulation Mode: The backend server currently has no SMTP credentials configured in .env. The email was logged in server terminal but not delivered to your inbox.'
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: `Email dispatched successfully to ${recipientEmail.trim()}!`
        });

        if (onSuccess) onSuccess();

        setTimeout(() => {
          onClose();
        }, 2200);
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message || 'Failed to send email';
      setStatusMessage({ type: 'error', text: errMsg });
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden transform animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
              <Mail className="h-6 w-6 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Send {documentType} via Email</h3>
              <p className="text-xs text-indigo-200 font-medium">
                {documentNumber ? `Ref: ${documentNumber}` : 'Direct notification dispatch'}
                {recipientName ? ` • ${recipientName}` : ''}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-transform duration-300 hover:rotate-180 hover:scale-110"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSend} noValidate className="p-6 space-y-4">
          {statusMessage.text && (
            <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : statusMessage.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : statusMessage.type === 'warning' ? (
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Recipient Email Address <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-medium">No character limit</span>
            </div>
            <div className="relative">
              <input
                type="text"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck="false"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="e.g. recipient@example.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Enter any recipient email address (e.g., name@company.com). Multiple emails can be separated by commas.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              Email Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              Personalized Note / Instructions (Optional)
            </label>
            <textarea
              rows={3}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="e.g. Please find the attached document. Kindly review and confirm payment receipt."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
            />
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Enterprise branded responsive email</span>
            <span className="font-semibold text-indigo-600">PDF & Details included</span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Email
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default EmailSendModal;

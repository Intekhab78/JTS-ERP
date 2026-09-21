import React, { useState } from 'react';
import { X, Tag } from 'lucide-react';

const DiscountModal = ({ isOpen, onClose, onApply, currentDiscount }) => {
  const [discountValue, setDiscountValue] = useState(currentDiscount || '');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onApply(Number(discountValue) || 0);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Tag size={16} />
            </div>
            <h2 className="text-sm font-bold text-slate-800">Apply Discount</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6">
          <form id="discount-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Discount Amount ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  autoFocus
                  placeholder="0.00" 
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-base font-bold text-slate-800 transition-all placeholder:text-slate-300"
                />
              </div>
            </div>
          </form>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 rounded-lg text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="discount-form"
            className="px-5 py-2 rounded-lg bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98]"
          >
            Apply Discount
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiscountModal;

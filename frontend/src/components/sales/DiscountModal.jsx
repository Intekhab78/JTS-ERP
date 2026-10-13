import React, { useState } from 'react';
import { X, Tag, Search, Loader2, ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCurrency } from '../../contexts/CurrencyContext';

const DiscountModal = ({ isOpen, onClose, onApplyCoupon, onRemoveCoupon, evaluationResult, currentDiscountCode, isLoading }) => {
  const [couponInput, setCouponInput] = useState('');
  const [showRejected, setShowRejected] = useState(false);
  const { formatCurrency } = useCurrency();

  if (!isOpen) return null;

  const handleApply = (e) => {
    e.preventDefault();
    if (couponInput.trim()) {
      onApplyCoupon(couponInput.trim().toUpperCase());
      setCouponInput('');
    }
  };

  const appliedCount = evaluationResult?.appliedPromotions?.length || 0;
  const rejectedCount = evaluationResult?.rejectedPromotions?.length || 0;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Tag size={16} />
            </div>
            <h2 className="text-sm font-bold text-slate-800">Promotions & Discounts</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Coupon Input */}
          <form onSubmit={handleApply} className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Coupon / Promo Code</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="e.g. DIWALI10" 
                value={couponInput}
                onChange={e => setCouponInput(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 font-bold"
              />
              <button
                type="submit"
                disabled={isLoading || !couponInput.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Apply Coupon'}
              </button>
            </div>
            {currentDiscountCode && (
               <div className="flex justify-between items-center bg-slate-100 p-2 rounded text-sm mt-2">
                 <span className="font-bold text-slate-700">Requested Code: {currentDiscountCode}</span>
                 <button type="button" onClick={onRemoveCoupon} className="text-red-500 text-xs font-bold hover:underline">Remove</button>
               </div>
            )}
          </form>

          {/* Applied Promotions */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
               Applied Promotions <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px]">{appliedCount}</span>
            </h3>
            
            {isLoading ? (
               <div className="py-8 text-center text-slate-400"><Loader2 className="animate-spin mx-auto mb-2" size={24}/> Evaluating...</div>
            ) : appliedCount === 0 ? (
               <div className="p-4 border border-dashed border-slate-200 rounded-lg text-center text-slate-500 text-sm">
                 No promotions applied to current cart.
               </div>
            ) : (
               <div className="space-y-3">
                 {evaluationResult.appliedPromotions.map((promo, idx) => (
                    <div key={idx} className="p-3 border border-emerald-200 bg-emerald-50 rounded-lg flex justify-between items-start">
                       <div>
                         <div className="flex items-center gap-1.5 mb-1">
                           <CheckCircle2 size={14} className="text-emerald-500"/>
                           <p className="font-bold text-emerald-900 text-sm">{promo.promotionName}</p>
                         </div>
                         {promo.promotionCode && <p className="text-xs text-emerald-700 mb-1">Code: {promo.promotionCode}</p>}
                         <p className="text-[11px] text-emerald-600 uppercase tracking-wide">
                            {promo.discountType === 'BUY_X_GET_Y' ? 'Buy X → Get Y Free/Discount' : promo.discountType.replace('_', ' ')}
                         </p>
                       </div>
                       <div className="text-right">
                         <p className="font-bold text-emerald-700">-{formatCurrency(promo.discountAmount)}</p>
                         {promo.snapshot?.priority > 0 && <p className="text-[10px] text-emerald-600 mt-1">Priority: {promo.snapshot.priority}</p>}
                       </div>
                    </div>
                 ))}
                 <div className="flex justify-between items-center pt-2 px-1 border-t border-slate-100">
                    <span className="font-bold text-slate-600 text-sm">Total Promotion Discount</span>
                    <span className="font-bold text-emerald-600">-{formatCurrency(evaluationResult.totalDiscountAmount)}</span>
                 </div>
               </div>
            )}
          </div>

          {/* Rejected Promotions */}
          {rejectedCount > 0 && (
             <div className="space-y-2 pt-4 border-t border-slate-100">
               <button 
                 type="button" 
                 onClick={() => setShowRejected(!showRejected)}
                 className="flex items-center justify-between w-full text-left"
               >
                 <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    Other Promotions <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-[10px]">{rejectedCount}</span>
                 </h3>
                 {showRejected ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
               </button>
               
               {showRejected && (
                  <div className="space-y-2 mt-3">
                    {evaluationResult.rejectedPromotions.map((promo, idx) => (
                       <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                          <div className="flex items-center gap-1.5 mb-1">
                            <AlertCircle size={14} className="text-slate-400"/>
                            <p className="font-bold text-slate-700 text-sm">{promo.name}</p>
                          </div>
                          {promo.code && <p className="text-xs text-slate-500 mb-1">Code: {promo.code}</p>}
                          <div className="text-xs text-rose-600 bg-rose-50 inline-block px-2 py-1 rounded">
                             {promo.reason}
                          </div>
                       </div>
                    ))}
                  </div>
               )}
             </div>
          )}

        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end bg-white shrink-0">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-6 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiscountModal;

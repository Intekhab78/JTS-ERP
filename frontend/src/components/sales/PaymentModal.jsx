import React, { useState } from 'react';
import { X, CreditCard, Banknote, Wifi, Cpu, Layers, Wallet } from 'lucide-react';
import { useCurrency } from '../../contexts/CurrencyContext';

const PaymentModal = ({ isOpen, onClose, total, orderNumber, onComplete }) => {
  const { formatCurrency, currencySymbol } = useCurrency();
  const [activeTab, setActiveTab] = useState('cash');
  const [cashTendered, setCashTendered] = useState(total.toString());
  const [splitCash, setSplitCash] = useState((total / 2).toFixed(2));
  const [splitCard, setSplitCard] = useState((total / 2).toFixed(2));
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSimulateCard = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onComplete({ method: 'card', amount: total });
    }, 1500);
  };

  const handleCashTender = () => {
    const tendered = parseFloat(cashTendered) || 0;
    if (tendered < total) {
      alert("Tendered amount cannot be less than total.");
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onComplete({ method: 'cash', amount: total, tendered, change: tendered - total });
    }, 500);
  };

  const handleSplitPayment = () => {
    const cash = parseFloat(splitCash) || 0;
    const card = parseFloat(splitCard) || 0;
    if (Math.abs((cash + card) - total) > 0.01) {
      alert("Split amounts must equal the total.");
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onComplete({ 
        method: 'split', 
        payments: [
          { method: 'CASH', amount: cash, cashTendered: cash },
          { method: 'CARD', amount: card, cashTendered: card }
        ]
      });
    }, 1500);
  };

  const changeDue = Math.max(0, (parseFloat(cashTendered) || 0) - total);

  // Generate dynamic, realistic presets based on the order total
  const fastPresets = (() => {
    const exact = total;
    const p1 = Math.ceil(total / 10) * 10;
    const p2 = Math.ceil(total / 50) * 50;
    const p3 = Math.ceil(total / 100) * 100;
    const list = [
      { label: 'Exact', value: exact },
      { label: `${currencySymbol} ${p1 > exact ? p1 : p1 + 10}`, value: p1 > exact ? p1 : p1 + 10 },
      { label: `${currencySymbol} ${p2 > exact ? p2 : p2 + 50}`, value: p2 > exact ? p2 : p2 + 50 },
      { label: `${currencySymbol} ${p3 > exact ? p3 : p3 + 100}`, value: p3 > exact ? p3 : p3 + 100 }
    ];
    // Deduplicate presets by value
    const seen = new Set();
    return list.filter(item => {
      if (seen.has(item.value)) return false;
      seen.add(item.value);
      return true;
    });
  })();

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between bg-white relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Banknote size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Process Payment</h2>
              <p className="text-xs text-slate-500 font-medium">Order {orderNumber} &bull; Amount: <span className="font-bold text-[#1e3a8a]">{formatCurrency(total)}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center transition-colors">
            <X size={18} />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('cash')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 font-bold text-sm transition-colors ${activeTab === 'cash' ? 'text-[#1e3a8a] border-b-2 border-[#1e3a8a]' : 'text-slate-500 hover:bg-slate-50 border-b-2 border-transparent'}`}
          >
            <Banknote size={18} /> Cash
          </button>
          <button 
            onClick={() => setActiveTab('card')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 font-bold text-sm transition-colors ${activeTab === 'card' ? 'text-[#1e3a8a] border-b-2 border-[#1e3a8a]' : 'text-slate-500 hover:bg-slate-50 border-b-2 border-transparent'}`}
          >
            <CreditCard size={18} /> Card
          </button>
          <button 
            onClick={() => setActiveTab('split')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 font-bold text-sm transition-colors ${activeTab === 'split' ? 'text-[#1e3a8a] border-b-2 border-[#1e3a8a]' : 'text-slate-500 hover:bg-slate-50 border-b-2 border-transparent'}`}
          >
            <Wallet size={18} /> Split
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 bg-slate-50/50">
          {activeTab === 'card' ? (
            <div className="space-y-4">
              <div className="bg-[#111827] rounded-xl p-5 shadow-inner border border-slate-800 text-white relative overflow-hidden">
                <div className="flex justify-between items-center text-xs font-medium text-slate-400 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    PAX A920 Terminal
                  </div>
                  <div>WiFi 5G &bull; Online</div>
                </div>
                
                <div className="text-center space-y-2 mb-8">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Amount Due</div>
                  <div className="text-4xl font-black text-white">{formatCurrency(total)}</div>
                  <div className="flex justify-center items-center gap-2 text-emerald-400 text-sm font-bold mt-2">
                    <Wifi size={16} /> Tap, Insert chip, or Swipe card
                  </div>
                </div>
                
                <div className="flex justify-between items-center border-t border-slate-700/50 pt-4 text-[10px] font-medium text-slate-400">
                  <div className="flex items-center gap-1.5"><Wifi size={12}/> Contactless</div>
                  <div className="flex items-center gap-1.5"><Cpu size={12}/> EMV Chip</div>
                  <div className="flex items-center gap-1.5"><Layers size={12}/> Magnetic</div>
                </div>
              </div>
              
              <button 
                onClick={handleSimulateCard}
                disabled={isProcessing}
                className="w-full py-3.5 rounded-xl bg-[#0f34ac] hover:bg-[#0c2a8f] text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.99] disabled:opacity-70"
              >
                <Wifi size={20} /> {isProcessing ? 'Processing...' : 'Simulate Card Tap / Swipe'}
              </button>
              <p className="text-center text-[10px] font-medium text-slate-400">Sends payload directly to bank switch port :8081</p>
            </div>
          ) : activeTab === 'cash' ? (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cash Tendered ({currencySymbol})</label>
                  <span className="text-xs font-bold text-slate-400">Exact Due: <span className="text-slate-700">{formatCurrency(total)}</span></span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm select-none">{currencySymbol}</span>
                  <input 
                    type="number"
                    value={cashTendered}
                    onChange={e => setCashTendered(e.target.value)}
                    autoFocus
                    className="w-full pl-14 pr-4 py-3 text-xl font-bold rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fast Amount Presets</label>
                <div className="grid grid-cols-4 gap-2">
                  {fastPresets.map((preset, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => setCashTendered(preset.value.toString())} 
                      className="py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 transition-colors truncate px-1"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="bg-emerald-50 rounded-xl p-4 flex items-center justify-between border border-emerald-100">
                <div>
                  <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Change Due</div>
                  <div className="text-2xl font-black text-emerald-700">{formatCurrency(changeDue)}</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-200/50 flex items-center justify-center text-emerald-600">
                  <Banknote size={20} />
                </div>
              </div>
              
              <button 
                onClick={handleCashTender}
                disabled={isProcessing || (parseFloat(cashTendered) || 0) < total}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.99] disabled:opacity-70 disabled:active:scale-100"
              >
                <Wallet size={20} /> {isProcessing ? 'Processing...' : 'Tender Cash & Open Drawer'}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-100 p-3 rounded-lg">
                  <span className="font-bold text-sm text-slate-600">Total Required</span>
                  <span className="font-black text-lg text-slate-800">{formatCurrency(total)}</span>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600">Cash Amount ({currencySymbol})</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs select-none">{currencySymbol}</span>
                    <input type="number" value={splitCash} onChange={e => {
                      const val = e.target.value;
                      setSplitCash(val);
                      const num = parseFloat(val) || 0;
                      if (num <= total) setSplitCard((total - num).toFixed(2));
                    }} className="w-full pl-14 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-800 font-bold focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600">Card Amount ({currencySymbol})</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs select-none">{currencySymbol}</span>
                    <input type="number" value={splitCard} onChange={e => {
                      const val = e.target.value;
                      setSplitCard(val);
                      const num = parseFloat(val) || 0;
                      if (num <= total) setSplitCash((total - num).toFixed(2));
                    }} className="w-full pl-14 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-800 font-bold focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]" />
                  </div>
                </div>

                <div className={`text-xs font-bold text-right ${(parseFloat(splitCash)||0) + (parseFloat(splitCard)||0) !== total ? 'text-red-500' : 'text-emerald-500'}`}>
                  Total Split: {formatCurrency((parseFloat(splitCash)||0) + (parseFloat(splitCard)||0))}
                </div>
              </div>

              <button 
                onClick={handleSplitPayment}
                disabled={isProcessing || Math.abs(((parseFloat(splitCash)||0) + (parseFloat(splitCard)||0)) - total) > 0.01}
                className="w-full py-3.5 rounded-xl bg-[#0f4c5c] hover:bg-[#0c3e4b] text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.99] disabled:opacity-70 disabled:active:scale-100"
              >
                <Wallet size={20} /> {isProcessing ? 'Processing...' : 'Process Split Payment'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;

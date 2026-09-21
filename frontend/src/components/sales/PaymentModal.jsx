import React, { useState } from 'react';
import { X, CreditCard, Banknote, Wifi, Cpu, Layers, DollarSign, Wallet } from 'lucide-react';

const PaymentModal = ({ isOpen, onClose, total, orderNumber, onComplete }) => {
  const [activeTab, setActiveTab] = useState('card');
  const [cashTendered, setCashTendered] = useState(total.toString());
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

  const changeDue = Math.max(0, (parseFloat(cashTendered) || 0) - total);

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
              <p className="text-xs text-slate-500 font-medium">Order {orderNumber} &bull; Amount: <span className="font-bold text-[#1e3a8a]">${total.toFixed(2)}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center transition-colors">
            <X size={18} />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('card')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 font-bold text-sm transition-colors ${activeTab === 'card' ? 'text-[#1e3a8a] border-b-2 border-[#1e3a8a]' : 'text-slate-500 hover:bg-slate-50 border-b-2 border-transparent'}`}
          >
            <CreditCard size={18} /> Card Payment (EFT-POS)
          </button>
          <button 
            onClick={() => setActiveTab('cash')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 font-bold text-sm transition-colors ${activeTab === 'cash' ? 'text-[#1e3a8a] border-b-2 border-[#1e3a8a]' : 'text-slate-500 hover:bg-slate-50 border-b-2 border-transparent'}`}
          >
            <Banknote size={18} /> Cash Tender
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
                  <div className="text-4xl font-black text-white">${total.toFixed(2)}</div>
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
          ) : (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cash Tendered ($)</label>
                  <span className="text-xs font-bold text-slate-400">Exact Due: <span className="text-slate-700">${total.toFixed(2)}</span></span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">$</span>
                  <input 
                    type="number"
                    value={cashTendered}
                    onChange={e => setCashTendered(e.target.value)}
                    autoFocus
                    className="w-full pl-9 pr-4 py-3 text-xl font-bold rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fast Amount Presets</label>
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => setCashTendered(total.toString())} className="py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-sm text-slate-700 transition-colors">Exact</button>
                  <button onClick={() => setCashTendered('50')} className="py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-sm text-slate-700 transition-colors">$50</button>
                  <button onClick={() => setCashTendered('100')} className="py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-sm text-slate-700 transition-colors">$100</button>
                  <button onClick={() => setCashTendered('250')} className="py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-sm text-slate-700 transition-colors">$250</button>
                </div>
              </div>
              
              <div className="bg-emerald-50 rounded-xl p-4 flex items-center justify-between border border-emerald-100">
                <div>
                  <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Change Due</div>
                  <div className="text-2xl font-black text-emerald-700">${changeDue.toFixed(2)}</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-200/50 flex items-center justify-center text-emerald-600">
                  <DollarSign size={20} />
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
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;

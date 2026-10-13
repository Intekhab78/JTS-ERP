import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Building, Calendar, CheckCircle, Ban, MapPin, Printer, FileText, Zap } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { useCurrency } from '../../contexts/CurrencyContext';

export default function ConsignmentSettlementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [settlement, setSettlement] = useState(null);
  const [loading, setLoading] = useState(true);
  const { formatCurrency } = useCurrency();

  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: settlement ? `ConsignmentSettlement_${settlement.settlementNumber}` : 'Consignment_Settlement',
  });

  useEffect(() => {
    fetchSettlement();
  }, [id]);

  const fetchSettlement = async () => {
    try {
      const res = await axios.get(`/api/v1/consignment-settlements/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSettlement(res.data.data);
    } catch (error) {
      alert('Failed to load settlement');
      navigate('/purchases/consignments/settlements');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    let msg = `Are you sure you want to ${action} this settlement?`;
    if (action === 'validate') msg += ' This will permanently finalize the settlement and create an invoice draft. This cannot be undone.';
    if (!window.confirm(msg)) return;
    
    try {
      await axios.post(`/api/v1/consignment-settlements/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (action === 'validate') alert('Settlement has been successfully validated.');
      fetchSettlement();
    } catch (error) {
      alert(error.response?.data?.message || `Failed to ${action}`);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8fafc] space-y-4">
      <div className="animate-spin rounded-none h-10 w-10 border-4 border-slate-200 border-t-blue-500"></div>
      <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Loading...</p>
    </div>
  );
  if (!settlement) return <div className="p-8 text-center text-red-500 font-bold uppercase tracking-widest">Not found</div>;

  return (
    <div ref={componentRef} className="animate-in fade-in zoom-in-95 duration-500 max-w-[1400px] mx-auto space-y-6 pb-10 bg-[#f8fafc] min-h-screen">
      
      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl no-print">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => navigate('/purchases/consignments/settlements')} className="mr-2 text-slate-400 hover:text-white transition-colors">
                <ArrowLeft size={24} strokeWidth={3} />
              </button>
              <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                <FileText size={18} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">{settlement.settlementNumber}</h1>
              <div className="ml-4">
                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                  settlement.status === 'VALIDATED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' :
                  settlement.status === 'CANCELLED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50' :
                  'bg-slate-500/20 text-slate-400 border border-slate-500/50'
                }`}>
                  {settlement.status}
                </span>
              </div>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl uppercase tracking-widest ml-14">
              CONSIGNMENT SETTLEMENT DETAILS
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-md shadow-sm text-xs font-bold text-slate-300 uppercase tracking-widest hover:bg-slate-700 transition-colors flex items-center"
            >
              <Printer size={14} className="mr-2" /> Print / PDF
            </button>
            
            {settlement.status === 'DRAFT' && (
              <>
                <button
                  onClick={() => handleAction('cancel')}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-md shadow-sm text-xs font-bold text-rose-400 uppercase tracking-widest hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction('validate')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md font-bold text-xs tracking-widest uppercase transition-colors shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-400 flex items-center gap-2"
                >
                  <CheckCircle size={16} /> Validate Settlement
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-2 sm:px-0 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Building size={14} className="text-blue-500" /> SETTLEMENT INFORMATION
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Supplier</p>
                <div className="text-xl font-black text-slate-800 uppercase tracking-tight">{settlement.supplierId?.name || 'Unknown'}</div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Calendar size={12} /> Settlement Date
                </p>
                <p className="font-mono font-bold text-slate-900 text-sm">
                  {new Date(settlement.settlementDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            {settlement.notes && (
              <div className="pt-6 mt-6 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Notes</p>
                <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap">{settlement.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-1 bg-blue-50/50 rounded-xl border-2 border-blue-100 shadow-sm overflow-hidden">
          <div className="bg-blue-100/50 border-b border-blue-100 px-6 py-4">
            <h2 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
              <Zap size={14} className="text-blue-600" /> TOTALS & ORIGIN
            </h2>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1 block">Agreement Origin</p>
              <button 
                onClick={() => navigate(`/purchases/consignments/${settlement.consignmentId?._id}`)}
                className="text-sm font-bold text-blue-700 hover:text-blue-900 transition-colors uppercase"
              >
                {settlement.consignmentId?.consignmentNumber || 'N/A'}
              </button>
            </div>
            <div className="pt-5 border-t border-blue-100">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1 block">Total Amount</p>
              <p className="text-3xl font-black text-blue-700 font-mono tracking-tighter">
                {formatCurrency(settlement.totalAmount)}
              </p>
            </div>
            <div className="pt-5 border-t border-blue-100">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1 block">Created By</p>
              <p className="text-sm font-bold text-blue-900">{settlement.createdBy?.name || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-2 sm:px-0">
        <div className="bg-white shadow-sm border border-slate-200 overflow-hidden rounded-xl">
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Zap size={16} className="text-blue-500" /> Settled Items Matrix
            </h2>
            <span className="text-xs font-bold text-slate-500 font-mono px-2 py-1 bg-white border border-slate-200 rounded">ROWS: {settlement.items?.length || 0}</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-slate-200 text-left whitespace-nowrap">
              <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border-b-2 border-slate-100">
                <tr>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4 text-right">Settled Qty</th>
                  <th className="px-6 py-4 text-right">Unit Price</th>
                  <th className="px-6 py-4 text-right text-blue-600">Line Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {settlement.items?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{item.productId?.name}</div>
                      <div className="text-[10px] font-mono text-slate-500 mt-1 uppercase">SKU: {item.productId?.sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-slate-700 text-right bg-slate-50/50">{item.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-slate-700 text-right bg-slate-50/50">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-blue-600 text-right bg-blue-50/50">{formatCurrency(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}

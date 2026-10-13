import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Building, Calendar, CheckCircle, Ban, Play, FileText, ClipboardList, PackageSearch, Undo2, HandCoins, Edit, Check, Archive, Printer, Zap } from 'lucide-react';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useReactToPrint } from 'react-to-print';

export default function ConsignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [consignment, setConsignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: consignment ? `Consignment_${consignment.consignmentNumber}` : 'Consignment',
  });

  useEffect(() => {
    fetchConsignment();
  }, [id]);

  const fetchConsignment = async () => {
    try {
      const res = await axios.get(`/api/v1/consignments/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setConsignment(res.data.data);
    } catch (error) {
      alert('Failed to load consignment');
      navigate('/purchases/consignments');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    if (!window.confirm(`Are you sure you want to ${action} this consignment?`)) return;
    try {
      await axios.post(`/api/v1/consignments/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchConsignment();
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
  if (!consignment) return <div className="p-8 text-center text-red-500 font-bold uppercase tracking-widest">Not found</div>;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <FileText size={14} /> },
    { id: 'products', label: 'Products Matrix', icon: <ClipboardList size={14} /> },
    { id: 'stock', label: 'Consignment Stock', icon: <PackageSearch size={14} /> },
    { id: 'receipts', label: 'Receipts', icon: <Play size={14} /> },
    { id: 'returns', label: 'Returns', icon: <Undo2 size={14} /> },
    { id: 'settlements', label: 'Settlements', icon: <HandCoins size={14} /> },
  ];

  return (
    <div ref={componentRef} className="animate-in fade-in zoom-in-95 duration-500 max-w-[1400px] mx-auto space-y-6 pb-10 bg-[#f8fafc] min-h-screen">
      
      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl no-print">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => navigate('/purchases/consignments')} className="mr-2 text-slate-400 hover:text-white transition-colors">
                <ArrowLeft size={24} strokeWidth={3} />
              </button>
              <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                <Archive size={18} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">{consignment.consignmentNumber}</h1>
              <div className="ml-4">
                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                  consignment.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' :
                  consignment.status === 'CONFIRMED' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' :
                  consignment.status === 'CANCELLED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50' :
                  consignment.status === 'CLOSED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' :
                  'bg-slate-500/20 text-slate-400 border border-slate-500/50'
                }`}>
                  {consignment.status}
                </span>
              </div>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl uppercase tracking-widest ml-14">
              CONSIGNMENT AGREEMENT TERMINAL
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-md shadow-sm text-xs font-bold text-slate-300 uppercase tracking-widest hover:bg-slate-700 transition-colors flex items-center"
            >
              <Printer size={14} className="mr-2" /> Print
            </button>
            
            {consignment.status === 'DRAFT' && (
              <>
                <button
                  onClick={() => handleAction('cancel')}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-md shadow-sm text-xs font-bold text-rose-400 uppercase tracking-widest hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => navigate(`/purchases/consignments/edit/${consignment._id}`)}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-md shadow-sm text-xs font-bold text-blue-400 uppercase tracking-widest hover:bg-slate-700 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleAction('confirm')}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-bold text-xs tracking-widest uppercase transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400"
                >
                  Confirm
                </button>
              </>
            )}

            {consignment.status === 'CONFIRMED' && (
              <>
                <button
                  onClick={() => handleAction('cancel')}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-md shadow-sm text-xs font-bold text-rose-400 uppercase tracking-widest hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction('activate')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md font-bold text-xs tracking-widest uppercase transition-colors shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-400 flex items-center gap-2"
                >
                  <Play size={16} /> Activate
                </button>
              </>
            )}

            {consignment.status === 'ACTIVE' && (
              <>
                <button 
                  onClick={() => navigate('/purchases/consignments/receipts/new', { state: { consignmentId: consignment._id } })} 
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-md shadow-sm text-xs font-bold text-blue-400 uppercase tracking-widest hover:bg-slate-700 transition-colors"
                >
                  New Receipt
                </button>
                <button 
                  onClick={() => navigate('/purchases/consignments/returns/new', { state: { consignmentId: consignment._id } })} 
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-md shadow-sm text-xs font-bold text-orange-400 uppercase tracking-widest hover:bg-slate-700 transition-colors"
                >
                  New Return
                </button>
                <button 
                  onClick={() => handleAction('close')} 
                  className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-md font-bold text-xs tracking-widest uppercase transition-colors shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-amber-400 flex items-center gap-2"
                >
                  <CheckCircle size={16} /> Close
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 border-b-2 border-slate-200 overflow-x-auto no-print px-2 sm:px-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-b-2 border-blue-600 text-blue-600 bg-white -mb-0.5' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-b-2 border-transparent -mb-0.5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="px-2 sm:px-0">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Building size={14} className="text-blue-500" /> SUPPLIER INFORMATION
                </h2>
              </div>
              <div className="p-6">
                <div className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-4">{consignment.supplierId?.name}</div>
                {consignment.supplierId?.email && <div className="text-sm font-bold text-slate-500 mb-6">{consignment.supplierId.email}</div>}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Start Date</p>
                    <p className="font-mono font-bold text-slate-900 text-sm">
                      {new Date(consignment.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">End Date</p>
                    <p className="font-mono font-bold text-blue-600 text-sm">
                      {consignment.endDate ? new Date(consignment.endDate).toLocaleDateString() : 'Ongoing'}
                    </p>
                  </div>
                </div>

                {consignment.notes && (
                  <div className="pt-6 mt-6 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Notes & Terms</p>
                    <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap">{consignment.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Zap size={14} className="text-blue-500" /> AGREEMENT WORKFLOW
                </h2>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Created By</p>
                  <p className="text-sm font-bold text-slate-800">{consignment.createdBy?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Confirmed By</p>
                  <p className="text-sm font-bold text-slate-800">{consignment.confirmedBy?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Activated By</p>
                  <p className="text-sm font-bold text-slate-800">{consignment.activatedBy?.name || '-'}</p>
                </div>
                <div className="pt-5 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Default Branch</p>
                  <p className="text-sm font-bold text-slate-800">{consignment.defaultBranchId?.name || 'Any'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="bg-white shadow-sm border border-slate-200 overflow-hidden rounded-xl">
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Zap size={16} className="text-blue-500" /> Products Matrix
              </h2>
              <span className="text-xs font-bold text-slate-500 font-mono px-2 py-1 bg-white border border-slate-200 rounded">ROWS: {consignment.items?.length || 0}</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm divide-y divide-slate-200 text-left whitespace-nowrap">
                <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border-b-2 border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4 text-right">Agreed Qty</th>
                    <th className="px-6 py-4 text-right">Unit Price</th>
                    <th className="px-6 py-4 text-right text-blue-600">Received</th>
                    <th className="px-6 py-4 text-right text-emerald-600">Consumed</th>
                    <th className="px-6 py-4 text-right text-orange-600">Returned</th>
                    <th className="px-6 py-4 text-right text-purple-600">Settled</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {consignment.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{item.productId?.name}</div>
                        <div className="text-[10px] font-mono text-slate-500 mt-1 uppercase">SKU: {item.productId?.sku}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-700 text-right">{item.agreedQuantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-700 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-blue-600 text-right bg-blue-50/50">{item.receivedQuantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-emerald-600 text-right bg-emerald-50/50">{item.consumedQuantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-orange-600 text-right bg-orange-50/50">{item.returnedQuantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-purple-600 text-right bg-purple-50/50">{item.settledQuantity || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {['stock', 'receipts', 'returns', 'settlements'].includes(activeTab) && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-12 flex flex-col items-center justify-center text-center">
            {activeTab === 'stock' && <PackageSearch size={48} className="text-slate-200 mb-4" />}
            {activeTab === 'receipts' && <Play size={48} className="text-slate-200 mb-4" />}
            {activeTab === 'returns' && <Undo2 size={48} className="text-slate-200 mb-4" />}
            {activeTab === 'settlements' && <HandCoins size={48} className="text-slate-200 mb-4" />}
            
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest mb-2">
              {activeTab === 'stock' && 'Consignment Stock'}
              {activeTab === 'receipts' && 'Receipts'}
              {activeTab === 'returns' && 'Returns'}
              {activeTab === 'settlements' && 'Settlements'}
            </h3>
            <p className="text-sm font-bold text-slate-500 mb-6 uppercase tracking-widest">
              {activeTab === 'stock' && 'Track inventory levels for this agreement.'}
              {activeTab === 'receipts' && 'Manage physical receipts of supplier stock.'}
              {activeTab === 'returns' && 'Manage physical returns back to the supplier.'}
              {activeTab === 'settlements' && 'Settle consumed consignment inventory.'}
            </p>
            
            <button 
              onClick={() => {
                if (activeTab === 'stock') navigate(`/purchases/consignment-stock?consignmentId=${consignment._id}`);
                if (activeTab === 'receipts') navigate(`/purchases/consignments/receipts?consignmentId=${consignment._id}`);
                if (activeTab === 'returns') navigate(`/purchases/consignments/returns?consignmentId=${consignment._id}`);
                if (activeTab === 'settlements') navigate(`/purchases/consignments/settlements?consignmentId=${consignment._id}`);
              }}
              className="bg-white border-2 border-slate-200 hover:border-blue-500 hover:text-blue-600 text-slate-600 px-6 py-2.5 rounded-md font-bold text-xs tracking-widest uppercase transition-colors shadow-sm"
            >
              View Detailed Ledger
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

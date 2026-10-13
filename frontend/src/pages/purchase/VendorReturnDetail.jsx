import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, FileText, Package, Calendar, MapPin, Building, CheckCircle, RotateCcw, Printer, Banknote, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useReactToPrint } from 'react-to-print';

export default function VendorReturnDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [vr, setVr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: vr ? `VendorReturn_${vr.vendorReturnNumber}` : 'Vendor_Return',
  });

  useEffect(() => {
    fetchVendorReturn();
  }, [id]);

  const fetchVendorReturn = async () => {
    try {
      const res = await axios.get(`/api/v1/vendor-returns/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setVr(res.data);
    } catch (error) {
      console.error('Failed to fetch Vendor Return', error);
      alert('Failed to load Vendor Return');
      navigate('/purchases/returns');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status) => {
    try {
      if (status === 'CONFIRMED') {
        await axios.post(`/api/v1/vendor-returns/${id}/confirm`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.patch(`/api/v1/vendor-returns/${id}/status`, { status }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      fetchVendorReturn();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update status');
    }
  };

  const validateReturn = async () => {
    if (!window.confirm('Validate this Vendor Return? This will permanently decrease inventory and cannot be undone.')) return;
    try {
      await axios.post(`/api/v1/vendor-returns/${id}/validate`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Vendor Return validated successfully. Inventory has been updated.');
      fetchVendorReturn();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to validate Vendor Return');
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8fafc] space-y-4">
      <div className="animate-spin rounded-none h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
      <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Fetching Database...</p>
    </div>
  );
  if (!vr) return <div className="p-8 text-center text-red-500">Vendor Return not found</div>;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT': return <Badge variant="secondary" className="text-sm px-3 py-1">DRAFT</Badge>;
      case 'CONFIRMED': return <Badge className="bg-indigo-100 text-indigo-800 text-sm px-3 py-1">CONFIRMED</Badge>;
      case 'VALIDATED': return <Badge variant="success" className="text-sm px-3 py-1">VALIDATED</Badge>;
      case 'CANCELLED': return <Badge variant="destructive" className="text-sm px-3 py-1">CANCELLED</Badge>;
      default: return <Badge variant="secondary" className="text-sm px-3 py-1">{status}</Badge>;
    }
  };

  const paginatedItems = vr?.items?.slice((page - 1) * itemsPerPage, page * itemsPerPage) || [];
  const totalPages = Math.ceil((vr?.items?.length || 0) / itemsPerPage);

  return (
    <div ref={componentRef} className="animate-in fade-in zoom-in-95 duration-500 max-w-[1400px] mx-auto space-y-6 pb-10 bg-[#f8fafc] min-h-screen">
      
      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl no-print">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-start gap-4">
            <button onClick={() => navigate('/purchases/returns')} className="p-2.5 bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 mt-1">
              <ArrowLeft size={20} className="text-slate-300" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 bg-orange-600 flex items-center justify-center rounded">
                  <RotateCcw size={18} className="text-white" />
                </div>
                <h1 className="text-3xl font-black tracking-tight text-white uppercase">{vr.vendorReturnNumber || `VR-${vr._id.slice(-6).toUpperCase()}`}</h1>
              </div>
              <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl uppercase tracking-widest">
                Vendor Return Details • {vr.supplierId?.name || 'SUPPLIER'}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-[#111827] border border-slate-800 p-2.5 rounded-lg shadow-inner">
            <span className={`inline-flex items-center px-3 py-1.5 rounded text-xs font-black uppercase tracking-widest shadow-sm border-none text-white ${vr.status === 'CONFIRMED' ? 'bg-indigo-500' : vr.status === 'VALIDATED' ? 'bg-green-600' : vr.status === 'CANCELLED' ? 'bg-rose-500' : 'bg-slate-600'}`}>
              STATUS: {vr.status}
            </span>
            
            <button onClick={handlePrint} className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
              <Printer size={14} /> Print
            </button>

            {vr.status === 'DRAFT' && (
              <button onClick={() => updateStatus('CONFIRMED')} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
                <CheckCircle size={14} /> Confirm Return
              </button>
            )}

            {vr.status === 'CONFIRMED' && (
               <button onClick={validateReturn} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
                 <Package size={14} /> Validate Return
               </button>
            )}

            {['DRAFT', 'CONFIRMED'].includes(vr.status) && (
              <button onClick={() => updateStatus('CANCELLED')} className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Counts for Consolidated Return */}
      {vr.returnType === 'SUPPLIER_CONSOLIDATED' && (
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white text-center border border-slate-200 shadow-sm rounded-xl">
               <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Purchase Orders</div>
               <div className="text-2xl font-black text-slate-800">{new Set(vr.items.map(i => i.purchaseOrderId)).size}</div>
            </div>
            <div className="p-4 bg-white text-center border border-slate-200 shadow-sm rounded-xl">
               <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Source GRNs</div>
               <div className="text-2xl font-black text-slate-800">{new Set(vr.items.flatMap(i => i.sourceGRNIds || [])).size}</div>
            </div>
            <div className="p-4 bg-white text-center border border-slate-200 shadow-sm rounded-xl">
               <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Products</div>
               <div className="text-2xl font-black text-slate-800">{new Set(vr.items.map(i => i.productId?._id || i.productId)).size}</div>
            </div>
            <div className="p-4 bg-white text-center border border-slate-200 shadow-sm rounded-xl">
               <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Total Return Qty</div>
               <div className="text-2xl font-black text-slate-800">{vr.items.reduce((acc, curr) => acc + curr.returnQuantity, 0)}</div>
            </div>
         </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden md:col-span-2 flex flex-col print:border-none print:shadow-none">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2 print:bg-transparent">
            <Building size={18} className="text-blue-500" />
            <h3 className="font-black text-slate-700 tracking-widest uppercase text-xs">Supplier Profile</h3>
          </div>
          <div className="p-6">
            <div className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-4">{vr.supplierId?.name}</div>
            <div className="space-y-4">
              {vr.supplierId?.email && <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Email</p><p className="font-bold text-slate-800 text-sm">{vr.supplierId.email}</p></div>}
              {vr.supplierId?.phone && <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Phone</p><p className="font-bold text-slate-800 text-sm">{vr.supplierId.phone}</p></div>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 border-t border-slate-100 bg-slate-50/50 print:bg-transparent">
            <div>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Calendar size={12} className="text-green-400" /> Return Date
              </h3>
              <div className="font-bold text-slate-800 font-mono text-sm">{format(new Date(vr.returnDate), 'dd MMM yyyy')}</div>
            </div>
            <div>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <FileText size={12} className="text-blue-400" /> Return Type
              </h3>
              <div className="font-bold text-slate-800 font-mono text-sm">
                {vr.returnType ? vr.returnType.replace('_', ' ') : 'SINGLE GRN'}
              </div>
            </div>
          </div>
          {vr.notes && (
            <div className="p-6 border-t border-slate-100 print:bg-transparent">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <FileText size={12} className="text-amber-400" /> Notes
              </h3>
              <p className="font-medium text-slate-700 text-sm">{vr.notes}</p>
            </div>
          )}
        </div>

        <div className="p-6 md:col-span-1 bg-slate-900 text-white rounded-xl shadow-lg border-0 flex flex-col justify-between" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
           <div>
             <div className="flex justify-between items-start mb-6">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg text-slate-300"><Banknote size={16} /></div> FINANCIAL SUMMARY
                </h3>
                <span className="bg-white/10 text-slate-300 rounded text-[10px] font-bold tracking-widest uppercase px-2 py-1">AED Currency</span>
             </div>
             
             <div className="space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Total Amount</div>
                <div className="flex items-baseline gap-2">
                   <span className="text-xl font-bold text-blue-400">AED</span>
                   <span className="text-4xl font-black tracking-tight text-white">{(vr.totalReturnAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
             </div>
           </div>

           <div className="mt-8 pt-6 border-t border-slate-800">
             <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2">Status Overview</div>
             <div className="text-sm font-bold tracking-widest uppercase flex items-center gap-2">
               {vr.status === 'VALIDATED' ? <CheckCircle size={16} className="text-green-400"/> : <AlertCircle size={16} className="text-yellow-400"/>}
               <span className={vr.status === 'VALIDATED' ? 'text-green-400' : 'text-yellow-400'}>{vr.status}</span>
             </div>
             {vr.validatedBy && (
               <div className="mt-3 text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                 Validated by <span className="font-bold text-slate-300">{vr.validatedBy.name}</span><br />
                 on {format(new Date(vr.validatedAt), 'MMM d, yyyy')}
               </div>
             )}
           </div>
        </div>
      </div>

      <div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden print:border-none print:shadow-none print:mx-0">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:bg-transparent">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-blue-500" />
              <h3 className="font-black text-slate-700 tracking-widest uppercase text-xs">Returned Items</h3>
            </div>
            <div className="text-xs font-bold text-slate-500 font-mono px-2 py-1 bg-white border border-slate-200 rounded">
              {vr.items.length} ITEMS INCLUDED
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-white text-[10px] text-slate-500 uppercase tracking-widest border-b-2 border-slate-100">
                  <th className="px-6 py-4 font-black">Product</th>
                  {vr.returnType === 'SUPPLIER_CONSOLIDATED' && <th className="px-6 py-4 font-black">Source PO</th>}
                  {vr.returnType !== 'SINGLE_GRN' && <th className="px-6 py-4 font-black">Source GRNs</th>}
                  <th className="px-6 py-4 font-black">Location</th>
                  <th className="px-6 py-4 font-black text-center">Return Qty</th>
                  <th className="px-6 py-4 font-black text-right">Unit Cost</th>
                  <th className="px-6 py-4 font-black text-right">Total Amount</th>
                  <th className="px-6 py-4 font-black">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedItems.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{item.itemName || 'Unknown'}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">SKU: {item.sku || 'N/A'}</div>
                    </td>
                    {vr.returnType === 'SUPPLIER_CONSOLIDATED' && (
                      <td className="px-6 py-4">
                         <span className="text-xs text-slate-600 font-mono font-medium">{item.purchaseOrderId || '-'}</span>
                      </td>
                    )}
                    {vr.returnType !== 'SINGLE_GRN' && (
                      <td className="px-6 py-4">
                         <div className="flex flex-col gap-1">
                            {item.sourceGRNIds?.map(gId => (
                               <span key={gId} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">{gId}</span>
                            )) || '-'}
                         </div>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin size={14} className="text-slate-400" />
                        <span className="font-medium text-xs">{item.branchId?.name || vr.branchId?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center bg-slate-100 px-3 py-1 rounded font-bold text-slate-800">
                        {item.returnQuantity} <span className="text-[10px] text-slate-500 ml-1">{item.uom || 'PCS'}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-xs text-slate-400 font-medium mb-0.5">AED</div>
                      <div className="font-mono font-medium">{item.unitCost?.toFixed(2) || '0.00'}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-xs text-slate-400 font-medium mb-0.5">AED</div>
                      <div className="font-mono font-bold text-slate-900">{(item.returnAmount || (item.returnQuantity * (item.unitCost || 0))).toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-600 font-medium">{item.reason || item.returnReason || '-'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
             <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-100 bg-white">
                <span className="text-sm text-slate-500 mb-4 sm:mb-0">
                   Showing <span className="font-bold text-slate-700">{(page - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-slate-700">{Math.min(page * itemsPerPage, vr.items.length)}</span> of <span className="font-bold text-slate-700">{vr.items.length}</span> items
                </span>
                <div className="flex gap-2">
                   <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                   >
                      Previous
                   </Button>
                   <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                   >
                      Next
                   </Button>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

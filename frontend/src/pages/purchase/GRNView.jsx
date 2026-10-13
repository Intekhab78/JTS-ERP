import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Printer, Edit, History, AlertCircle } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';

const GRNView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [grn, setGrn] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: grn ? `GRN_${grn.grnNumber}` : 'Goods_Receipt_Note',
  });

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchGRN();
  }, [id]);

  const fetchGRN = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/v1/grn/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setGrn(res.data);
    } catch (error) {
      console.error(error);
      alert('Failed to load GRN');
      navigate('/purchases/grn');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    if (!window.confirm(`Are you sure you want to ${action} this GRN?`)) return;
    try {
      await axios.put(`/api/v1/grn/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchGRN(); // reload
    } catch (error) {
      alert(error.response?.data?.message || `Failed to ${action} GRN`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8fafc]">
        <div className="animate-spin rounded-none h-12 w-12 border-4 border-slate-200 border-t-blue-600 mb-4"></div>
        <h2 className="text-sm font-black tracking-widest text-slate-400 uppercase">Fetching Core Assets...</h2>
      </div>
    );
  }
  if (!grn) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'VALIDATED': return <Badge variant="success" className="text-sm px-3 py-1">VALIDATED</Badge>;
      case 'CONFIRMED': return <Badge variant="info" className="text-sm px-3 py-1">CONFIRMED</Badge>;
      case 'CANCELLED': return <Badge variant="destructive" className="text-sm px-3 py-1">CANCELLED</Badge>;
      default: return <Badge variant="warning" className="text-sm px-3 py-1">DRAFT</Badge>;
    }
  };

  return (
    <div ref={componentRef} className="animate-in fade-in zoom-in-95 duration-500 max-w-[1400px] mx-auto space-y-6 pb-10 bg-[#f8fafc] min-h-screen">
      
      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl no-print">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => navigate('/purchases/grn')} className="text-slate-400 hover:text-white hover:bg-white/10 p-2 -ml-2 rounded-lg transition-colors">
                <ArrowLeft size={20} />
              </button>
              <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                <CheckCircle size={18} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">{grn.grnNumber}</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl pl-12">
              GOODS RECEIPT NOTE • TERMINAL VIEW
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-3 bg-[#111827] border border-slate-800 p-2 rounded-lg shadow-inner">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">System Online</span>
            </div>
            <div className="bg-[#111827] border border-slate-800 p-1.5 rounded-lg">
              {getStatusBadge(grn.status)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-200 items-center no-print">
        <Button onClick={handlePrint} variant="outline" className="mr-auto font-bold uppercase tracking-wider text-xs h-9">
          <Printer size={16} className="mr-2" /> Print / PDF
        </Button>
        {grn.status === 'DRAFT' && hasPermission('EDIT_PURCHASES') && (
          <>
            <Button onClick={() => navigate(`/purchases/grn/edit/${grn._id}`)} variant="outline" className="font-bold uppercase tracking-wider text-xs h-9" leftIcon={<Edit size={16} />}>
              Edit
            </Button>
            <Button onClick={() => handleAction('confirm')} variant="default" className="bg-blue-600 hover:bg-blue-700 font-bold uppercase tracking-wider text-xs h-9" leftIcon={<CheckCircle size={16} />}>
              Confirm
            </Button>
          </>
        )}

        {grn.status === 'CONFIRMED' && hasPermission('EDIT_PURCHASES') && (
          <>
            <Button onClick={() => handleAction('validate')} variant="default" className="bg-green-600 hover:bg-green-700 font-bold uppercase tracking-wider text-xs h-9" leftIcon={<CheckCircle size={16} />}>
              Validate & Update Stock
            </Button>
            <Button onClick={() => handleAction('cancel')} variant="outline" className="text-error border-error/50 hover:bg-error/10 font-bold uppercase tracking-wider text-xs h-9" leftIcon={<XCircle size={16} />}>
              Cancel
            </Button>
          </>
        )}

        {grn.status === 'VALIDATED' && (
          <>
            <Button variant="outline" className="font-bold uppercase tracking-wider text-xs h-9" leftIcon={<Printer size={16} />}>
              Print Receipt
            </Button>
            <Button variant="outline" className="font-bold uppercase tracking-wider text-xs h-9" leftIcon={<History size={16} />} title="Stock Movement reference">
              View Stock Moves
            </Button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col print:border-none print:shadow-none">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2 print:bg-transparent">
            <CheckCircle size={18} className="text-blue-500" />
            <h3 className="font-black text-slate-700 tracking-widest uppercase text-xs">Receipt Details</h3>
          </div>
          <div className="p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Receipt Date</dt>
                <dd className="text-sm font-black text-slate-800">{format(new Date(grn.receiptDate), 'MMM d, yyyy')}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Supplier</dt>
                <dd className="text-sm font-black text-slate-800">{grn.supplierId?.name || grn.supplierSnapshot?.name || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Branch / Warehouse</dt>
                <dd className="text-sm font-black text-slate-800">{grn.branchId?.name || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Purchase Order</dt>
                <dd className="text-sm font-black text-slate-800 bg-slate-100 inline-block px-2 py-0.5 rounded font-mono">
                  {grn.purchaseOrderId ? `PO-${grn.purchaseOrderId._id.slice(-6).toUpperCase()}` : 'N/A'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col print:border-none print:shadow-none">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2 print:bg-transparent">
            <CheckCircle size={18} className="text-blue-500" />
            <h3 className="font-black text-slate-700 tracking-widest uppercase text-xs">Logistics & Tracking</h3>
          </div>
          <div className="p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Delivery Challan No.</dt>
                <dd className="text-sm font-black text-slate-800">{grn.deliveryChallanNumber || '-'}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Vehicle Number</dt>
                <dd className="text-sm font-black text-slate-800">{grn.vehicleNumber || '-'}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Created By</dt>
                <dd className="text-sm font-black text-slate-800">{grn.createdBy?.name || '-'}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Validated By</dt>
                <dd className="text-sm font-black text-slate-800">
                  {grn.validatedBy ? grn.validatedBy.name : '-'} 
                  {grn.validatedAt && <span className="block text-xs font-medium text-slate-400 mt-1">{format(new Date(grn.validatedAt), 'MMM d, yyyy HH:mm')}</span>}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col print:border-none print:shadow-none print:mx-0">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:bg-transparent">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-blue-500" />
            <h3 className="font-black text-slate-700 tracking-widest uppercase text-xs">Received Items</h3>
          </div>
        </div>
        <div className="w-full">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border-b-2 border-slate-100 print:bg-transparent print:border-slate-300">
              <tr>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4 text-center">Ordered</th>
                <th className="px-6 py-4 text-center">Received</th>
                <th className="px-6 py-4 text-center text-emerald-600">Accepted</th>
                <th className="px-6 py-4 text-center text-rose-500">Rejected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {grn.items && grn.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{item.itemName}</div>
                    <div className="text-[10px] font-bold text-slate-400 mt-0.5 font-mono bg-slate-100 inline-block px-1.5 py-0.5 rounded">{item.sku}</div>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-slate-800">{item.orderedQuantity}</td>
                  <td className="px-6 py-4 text-center font-bold text-slate-800">{item.receivedQuantity}</td>
                  <td className="px-6 py-4 text-center font-bold text-emerald-600 bg-emerald-50/50">{item.acceptedQuantity}</td>
                  <td className="px-6 py-4 text-center font-bold text-rose-500 bg-rose-50/50">{item.rejectedQuantity}</td>
                </tr>
              ))}
              {(!grn.items || grn.items.length === 0) && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400 font-bold uppercase tracking-wider text-xs">
                    No items in this receipt.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {grn.notes && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col p-6 print:border-none print:shadow-none print:mx-0">
          <h3 className="font-black text-slate-700 tracking-widest uppercase text-[10px] mb-3 flex items-center gap-2">
            <AlertCircle size={14} className="text-slate-400" /> Notes
          </h3>
          <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap">{grn.notes}</p>
        </div>
      )}
    </div>
  );
};

export default GRNView;

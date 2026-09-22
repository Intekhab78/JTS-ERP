import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Building, Calendar, CheckCircle, Ban, MapPin, Check, Printer } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useReactToPrint } from 'react-to-print';

export default function ConsignmentReceiptDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: receipt ? `ConsignmentReceipt_${receipt.receiptNumber}` : 'Consignment_Receipt',
  });

  useEffect(() => {
    fetchReceipt();
  }, [id]);

  const fetchReceipt = async () => {
    try {
      const res = await axios.get(`/api/v1/consignment-receipts/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setReceipt(res.data.data);
    } catch (error) {
      alert('Failed to load receipt');
      navigate('/purchases/consignments/receipts');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    let msg = `Are you sure you want to ${action} this receipt?`;
    if (action === 'validate') msg += ' This will permanently increase physical stock and cannot be undone.';
    if (!window.confirm(msg)) return;
    
    try {
      await axios.post(`/api/v1/consignment-receipts/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (action === 'validate') alert('Stock has been successfully updated.');
      fetchReceipt();
    } catch (error) {
      alert(error.response?.data?.message || `Failed to ${action}`);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!receipt) return <div className="p-8 text-center text-red-500">Not found</div>;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT': return <Badge variant="secondary">DRAFT</Badge>;
      case 'CONFIRMED': return <Badge className="bg-indigo-100 text-indigo-800">CONFIRMED</Badge>;
      case 'VALIDATED': return <Badge variant="success">VALIDATED</Badge>;
      case 'CANCELLED': return <Badge variant="destructive">CANCELLED</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div ref={componentRef} className="animate-in fade-in zoom-in-95 duration-300 max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between no-print mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/purchases/consignments/receipts')} className="p-2">
            <ArrowLeft size={20} />
          </Button>
          <PageHeader 
            title={receipt.receiptNumber}
            description="Consignment Receipt Details"
          />
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(receipt.status)}
          
          <Button onClick={handlePrint} variant="outline" className="ml-4">
            <Printer size={16} className="mr-2" /> Print / PDF
          </Button>

          {receipt.status === 'DRAFT' && (
            <>
              <Button onClick={() => handleAction('confirm')} variant="outline" leftIcon={<Check size={16} />}>
                Confirm Receipt
              </Button>
              <Button variant="destructive" onClick={() => handleAction('cancel')} leftIcon={<Ban size={16} />}>Cancel</Button>
            </>
          )}

          {receipt.status === 'CONFIRMED' && (
            <>
              <Button onClick={() => handleAction('validate')} className="bg-blue-600 hover:bg-blue-700" leftIcon={<CheckCircle size={16} />}>
                Validate & Receive Stock
              </Button>
              <Button variant="destructive" onClick={() => handleAction('cancel')} leftIcon={<Ban size={16} />}>Cancel</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Building size={16} /> Supplier Information
              </h3>
              <div className="text-lg font-bold text-slate-900">{receipt.supplierId?.name}</div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <MapPin size={16} /> Receiving Branch
              </h3>
              <div className="text-lg font-bold text-slate-900">{receipt.branchId?.name}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Calendar size={16} /> Receipt Date
              </h3>
              <div className="font-medium text-slate-800">{new Date(receipt.receiptDate).toLocaleDateString()}</div>
            </div>
          </div>
          
          {receipt.notes && (
             <div className="pt-6 border-t border-slate-200">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Notes</h3>
                <p className="text-slate-700">{receipt.notes}</p>
             </div>
          )}
        </Card>

        <Card className="p-6 bg-slate-50">
           <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Receipt Status</h3>
           <div className="space-y-4">
             <div className="flex justify-between pb-3 border-b border-slate-200">
               <span className="text-slate-500">Agreement</span>
               <span className="font-medium text-blue-600 hover:underline cursor-pointer" onClick={() => navigate(`/purchases/consignments/${receipt.consignmentId._id}`)}>
                 {receipt.consignmentId?.consignmentNumber}
               </span>
             </div>
             <div className="flex justify-between pb-3 border-b border-slate-200">
               <span className="text-slate-500">Created By</span>
               <span className="font-medium text-slate-800">{receipt.createdBy?.name || '-'}</span>
             </div>
             <div className="flex justify-between">
               <span className="text-slate-500">Validated By</span>
               <span className="font-medium text-slate-800">{receipt.validatedBy?.name || '-'}</span>
             </div>
           </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-slate-800">Received Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="p-4 font-medium">Product</th>
                <th className="p-4 font-medium text-right">Received Qty</th>
                <th className="p-4 font-medium text-right text-red-600">Rejected Qty</th>
                <th className="p-4 font-medium text-right text-green-600">Accepted Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {receipt.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="p-4">
                    <div className="font-medium text-slate-900">{item.productId?.name}</div>
                    <div className="text-xs text-slate-500">SKU: {item.productId?.sku}</div>
                  </td>
                  <td className="p-4 text-right font-medium text-slate-700">{item.receivedQuantity}</td>
                  <td className="p-4 text-right font-medium text-red-600">{item.rejectedQuantity}</td>
                  <td className="p-4 text-right font-bold text-green-600">{item.acceptedQuantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

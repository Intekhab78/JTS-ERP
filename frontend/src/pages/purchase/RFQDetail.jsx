import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, FileText, Package, Truck, Calendar, MapPin, Building, CreditCard, Banknote, Send, CheckCircle, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useReactToPrint } from 'react-to-print';

export default function RFQDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rfq, setRfq] = useState(null);
  const [items, setItems] = useState([]);
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: rfq ? `RFQ_${rfq.rfqNumber}` : 'Request_For_Quotation',
  });

  useEffect(() => {
    fetchRFQ();
  }, [id]);

  const fetchRFQ = async () => {
    try {
      const res = await axios.get(`/api/v1/rfqs/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRfq(res.data.rfq);
      setItems(res.data.items || []);
      setPurchaseOrder(res.data.purchaseOrder);
    } catch (error) {
      console.error('Failed to fetch RFQ', error);
      alert('Failed to load RFQ');
      navigate('/purchases/rfqs');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status) => {
    try {
      await axios.patch(`/api/v1/rfqs/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchRFQ();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update status');
    }
  };

  const convertToPO = async () => {
    if (!window.confirm('Convert this RFQ to a Purchase Order?')) return;
    try {
      const res = await axios.post(`/api/v1/rfqs/${id}/convert`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Converted to Purchase Order successfully');
      navigate(`/purchases/${res.data._id}`);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to convert RFQ');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!rfq) return <div className="p-8 text-center text-red-500">RFQ not found</div>;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT': return <Badge variant="secondary" className="text-sm px-3 py-1">DRAFT</Badge>;
      case 'SENT': return <Badge variant="info" className="text-sm px-3 py-1">SENT</Badge>;
      case 'QUOTED': return <Badge className="bg-purple-100 text-purple-800 text-sm px-3 py-1">QUOTED</Badge>;
      case 'CONFIRMED': return <Badge variant="success" className="text-sm px-3 py-1">CONFIRMED</Badge>;
      case 'CANCELLED': return <Badge variant="destructive" className="text-sm px-3 py-1">CANCELLED</Badge>;
      default: return <Badge variant="secondary" className="text-sm px-3 py-1">{status}</Badge>;
    }
  };

  return (
    <div ref={componentRef} className="animate-in fade-in zoom-in-95 duration-300 max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between no-print mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/purchases/rfqs')} className="text-muted-foreground p-2">
            <ArrowLeft size={20} />
          </Button>
          <PageHeader 
            title={rfq.rfqNumber}
            description="Request for Quotation Details"
            icon={<FileText className="text-blue-600 h-8 w-8" />}
          />
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(rfq.status)}
          
          <Button onClick={handlePrint} variant="outline" className="ml-4">
            <Printer size={16} className="mr-2" /> Print / PDF
          </Button>

          {rfq.status === 'DRAFT' && (
            <Button onClick={() => updateStatus('SENT')} className="ml-2" leftIcon={<Send size={16} />}>
              Send RFQ
            </Button>
          )}
          
          {rfq.status === 'SENT' && (
            <Button onClick={() => updateStatus('QUOTED')} className="ml-4" variant="outline">
              Mark as Quoted
            </Button>
          )}

          {rfq.status === 'QUOTED' && (
            <Button onClick={convertToPO} className="ml-4" leftIcon={<CheckCircle size={16} />}>
              Confirm / Convert to PO
            </Button>
          )}

          {['DRAFT', 'SENT', 'QUOTED'].includes(rfq.status) && (
             <Button variant="destructive" onClick={() => updateStatus('CANCELLED')} className="ml-2">
                Cancel
             </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-2 flex flex-col gap-6">
          <div>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building size={16} /> Supplier Information
            </h3>
            <div className="text-lg font-bold text-foreground">{rfq.supplierId?.name}</div>
            {rfq.supplierId?.email && <div className="text-muted-foreground">{rfq.supplierId.email}</div>}
            {rfq.supplierId?.phone && <div className="text-muted-foreground">{rfq.supplierId.phone}</div>}
          </div>

          <div className="grid grid-cols-2 gap-6 pt-6 border-t border-border">
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                <MapPin size={16} /> Deliver To
              </h3>
              <div className="font-medium text-foreground">{rfq.branchId?.name}</div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                <Calendar size={16} /> Request Date
              </h3>
              <div className="font-medium text-foreground">{format(new Date(rfq.createdAt), 'MMMM d, yyyy')}</div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                <Truck size={16} /> Expected Delivery
              </h3>
              <div className="font-medium text-foreground">
                {rfq.expectedDate ? format(new Date(rfq.expectedDate), 'MMMM d, yyyy') : 'Not specified'}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
           <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Banknote size={16} /> Financials & Details
            </h3>
            
            <div className="space-y-4">
               <div className="flex justify-between items-center pb-3 border-b border-border/50">
                  <span className="text-muted-foreground flex items-center gap-2"><CreditCard size={14} /> Terms</span>
                  <span className="font-medium">{rfq.paymentTerms || 'Not specified'}</span>
               </div>
               <div className="flex justify-between items-center pb-3 border-b border-border/50">
                  <span className="text-muted-foreground">Currency</span>
                  <span className="font-bold">{rfq.currency || 'AED'}</span>
               </div>
               <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-bold text-foreground">Total Estimate</span>
                  <span className="text-2xl font-black text-blue-600">{rfq.currency} {rfq.totalAmount?.toFixed(2)}</span>
               </div>
            </div>

            {purchaseOrder && (
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Related Documents</h3>
                <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md">
                  <div className="text-xs text-slate-500 mb-1">Purchase Order</div>
                  <Link to={`/purchases/${purchaseOrder._id}`} className="text-indigo-600 font-medium hover:underline flex justify-between items-center">
                    {purchaseOrder.purchaseOrderNumber}
                    <Badge variant="outline">{purchaseOrder.status}</Badge>
                  </Link>
                </div>
              </div>
            )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Package size={18} className="text-blue-600" /> Order Lines
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/10 text-muted-foreground text-sm border-b border-border">
                <th className="p-4 font-medium">Product</th>
                <th className="p-4 font-medium text-center">UOM</th>
                <th className="p-4 font-medium text-right">Unit Price</th>
                <th className="p-4 font-medium text-right">Quantity</th>
                <th className="p-4 font-medium text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-muted/5">
                  <td className="p-4">
                    <div className="font-medium text-foreground">{item.productId?.name}</div>
                    <div className="text-xs text-muted-foreground">{item.productId?.sku}</div>
                    {item.description && <div className="text-xs text-muted-foreground mt-1 italic">{item.description}</div>}
                  </td>
                  <td className="p-4 text-center">{item.uom || 'PCS'}</td>
                  <td className="p-4 text-right text-muted-foreground">{rfq.currency} {item.unitCost?.toFixed(2)}</td>
                  <td className="p-4 text-right font-medium">{item.quantity}</td>
                  <td className="p-4 text-right font-bold text-foreground">{rfq.currency} {item.subTotal?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="bg-muted/10 p-6 flex justify-end border-t border-border">
          <div className="w-72 space-y-3">
             <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{rfq.currency} {rfq.totalAmount?.toFixed(2)}</span>
             </div>
             <div className="flex justify-between items-center pt-3 border-t border-border text-lg font-bold text-foreground">
                <span>Total</span>
                <span>{rfq.currency} {rfq.totalAmount?.toFixed(2)}</span>
             </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

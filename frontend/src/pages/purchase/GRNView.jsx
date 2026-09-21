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
      const res = await axios.get(`http://localhost:5000/api/v1/grn/${id}`, {
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
      await axios.put(`http://localhost:5000/api/v1/grn/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchGRN(); // reload
    } catch (error) {
      alert(error.response?.data?.message || `Failed to ${action} GRN`);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading GRN...</div>;
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
    <div ref={componentRef} className="animate-in fade-in zoom-in-95 duration-300 space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-2 no-print">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/purchases/grn')} className="text-muted-foreground p-2">
            <ArrowLeft size={20} />
          </Button>
          <PageHeader 
            title={`Goods Receipt: ${grn.grnNumber}`}
            description="View details and process the goods receipt."
          />
        </div>
        <div>{getStatusBadge(grn.status)}</div>
      </div>

      <div className="flex flex-wrap gap-3 bg-muted/20 p-4 rounded-xl border border-border items-center no-print">
        <Button onClick={handlePrint} variant="outline" className="mr-auto">
          <Printer size={16} className="mr-2" /> Print / PDF
        </Button>
        {grn.status === 'DRAFT' && hasPermission('EDIT_PURCHASES') && (
          <>
            <Button onClick={() => navigate(`/purchases/grn/edit/${grn._id}`)} variant="outline" leftIcon={<Edit size={16} />}>
              Edit
            </Button>
            <Button onClick={() => handleAction('confirm')} variant="default" className="bg-blue-600 hover:bg-blue-700" leftIcon={<CheckCircle size={16} />}>
              Confirm
            </Button>
          </>
        )}

        {grn.status === 'CONFIRMED' && hasPermission('EDIT_PURCHASES') && (
          <>
            <Button onClick={() => handleAction('validate')} variant="default" className="bg-green-600 hover:bg-green-700" leftIcon={<CheckCircle size={16} />}>
              Validate & Update Stock
            </Button>
            <Button onClick={() => handleAction('cancel')} variant="outline" className="text-error border-error/50 hover:bg-error/10" leftIcon={<XCircle size={16} />}>
              Cancel
            </Button>
          </>
        )}

        {grn.status === 'VALIDATED' && (
          <>
            <Button variant="outline" leftIcon={<Printer size={16} />}>
              Print Receipt
            </Button>
            <Button variant="outline" leftIcon={<History size={16} />} title="Stock Movement reference">
              View Stock Moves
            </Button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-2">Receipt Details</h3>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Receipt Date</dt>
              <dd className="mt-1 text-sm font-semibold">{format(new Date(grn.receiptDate), 'MMM d, yyyy')}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Supplier</dt>
              <dd className="mt-1 text-sm font-semibold">{grn.supplierId?.name || grn.supplierSnapshot?.name || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Branch / Warehouse</dt>
              <dd className="mt-1 text-sm font-semibold">{grn.branchId?.name || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Purchase Order</dt>
              <dd className="mt-1 text-sm font-semibold">
                {grn.purchaseOrderId ? `PO-${grn.purchaseOrderId._id.slice(-6).toUpperCase()}` : 'N/A'}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-2">Logistics & Tracking</h3>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Delivery Challan No.</dt>
              <dd className="mt-1 text-sm font-semibold">{grn.deliveryChallanNumber || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Vehicle Number</dt>
              <dd className="mt-1 text-sm font-semibold">{grn.vehicleNumber || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Created By</dt>
              <dd className="mt-1 text-sm font-semibold">{grn.createdBy?.name || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Validated By</dt>
              <dd className="mt-1 text-sm font-semibold">
                {grn.validatedBy ? grn.validatedBy.name : '-'} 
                {grn.validatedAt && <span className="block text-xs text-muted-foreground">{format(new Date(grn.validatedAt), 'MMM d, yyyy HH:mm')}</span>}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 bg-muted/30 border-b border-border">
          <h3 className="font-bold text-lg">Received Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-6 py-3 font-medium">Product</th>
                <th className="px-6 py-3 font-medium">Ordered</th>
                <th className="px-6 py-3 font-medium">Received</th>
                <th className="px-6 py-3 font-medium text-green-600">Accepted</th>
                <th className="px-6 py-3 font-medium text-red-500">Rejected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {grn.items && grn.items.map((item, idx) => (
                <tr key={idx} className="bg-card hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{item.itemName}</div>
                    <div className="text-xs text-muted-foreground">{item.sku}</div>
                  </td>
                  <td className="px-6 py-4">{item.orderedQuantity}</td>
                  <td className="px-6 py-4 font-semibold">{item.receivedQuantity}</td>
                  <td className="px-6 py-4 font-semibold text-green-600">{item.acceptedQuantity}</td>
                  <td className="px-6 py-4 font-semibold text-red-500">{item.rejectedQuantity}</td>
                </tr>
              ))}
              {(!grn.items || grn.items.length === 0) && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-muted-foreground">
                    No items in this receipt.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {grn.notes && (
        <Card className="p-6">
          <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
            <AlertCircle size={16} /> Notes
          </h3>
          <p className="text-sm whitespace-pre-wrap">{grn.notes}</p>
        </Card>
      )}
    </div>
  );
};

export default GRNView;

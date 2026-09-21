import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, FileText, Package, Calendar, MapPin, Building, CheckCircle, RotateCcw, Printer } from 'lucide-react';
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
      const res = await axios.get(`http://localhost:5000/api/v1/vendor-returns/${id}`, {
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
        await axios.post(`http://localhost:5000/api/v1/vendor-returns/${id}/confirm`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.patch(`http://localhost:5000/api/v1/vendor-returns/${id}/status`, { status }, {
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
      await axios.post(`http://localhost:5000/api/v1/vendor-returns/${id}/validate`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Vendor Return validated successfully. Inventory has been updated.');
      fetchVendorReturn();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to validate Vendor Return');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
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

  return (
    <div ref={componentRef} className="animate-in fade-in zoom-in-95 duration-300 max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between no-print mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/purchases/returns')} className="text-muted-foreground p-2">
            <ArrowLeft size={20} />
          </Button>
          <PageHeader
            title={vr.vendorReturnNumber}
            description="Vendor Return Details"
            icon={<RotateCcw className="text-orange-600 h-8 w-8" />}
          />
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(vr.status)}

          <Button onClick={handlePrint} variant="outline" className="ml-4">
            <Printer size={16} className="mr-2" /> Print / PDF
          </Button>

          {vr.status === 'DRAFT' && (
            <Button onClick={() => updateStatus('CONFIRMED')} className="ml-2" variant="outline">
              Confirm Return
            </Button>
          )}

          {vr.status === 'CONFIRMED' && (
            <Button onClick={validateReturn} className="ml-4 bg-blue-600 hover:bg-blue-700" leftIcon={<CheckCircle size={16} />}>
              Validate Return
            </Button>
          )}

          {['DRAFT', 'CONFIRMED'].includes(vr.status) && (
            <Button variant="destructive" onClick={() => updateStatus('CANCELLED')} className="ml-2">
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Summary Counts for Consolidated Return */}
      {vr.returnType === 'SUPPLIER_CONSOLIDATED' && (
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-white text-center border-slate-200 shadow-sm">
               <div className="text-slate-500 text-xs font-bold uppercase mb-1">Purchase Orders</div>
               <div className="text-2xl font-bold text-slate-800">{new Set(vr.items.map(i => i.purchaseOrderId)).size}</div>
            </Card>
            <Card className="p-4 bg-white text-center border-slate-200 shadow-sm">
               <div className="text-slate-500 text-xs font-bold uppercase mb-1">Source GRNs</div>
               <div className="text-2xl font-bold text-slate-800">{new Set(vr.items.flatMap(i => i.sourceGRNIds || [])).size}</div>
            </Card>
            <Card className="p-4 bg-white text-center border-slate-200 shadow-sm">
               <div className="text-slate-500 text-xs font-bold uppercase mb-1">Products</div>
               <div className="text-2xl font-bold text-slate-800">{new Set(vr.items.map(i => i.productId?._id || i.productId)).size}</div>
            </Card>
            <Card className="p-4 bg-white text-center border-slate-200 shadow-sm">
               <div className="text-slate-500 text-xs font-bold uppercase mb-1">Total Return Qty</div>
               <div className="text-2xl font-bold text-slate-800">{vr.items.reduce((acc, curr) => acc + curr.returnQuantity, 0)}</div>
            </Card>
         </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-2 flex flex-col gap-6">
          <div>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building size={16} /> Supplier Information
            </h3>
            <div className="text-lg font-bold text-foreground">{vr.supplierId?.name}</div>
            {vr.supplierId?.email && <div className="text-muted-foreground">{vr.supplierId.email}</div>}
            {vr.supplierId?.phone && <div className="text-muted-foreground">{vr.supplierId.phone}</div>}
          </div>

          <div className="grid grid-cols-2 gap-6 pt-6 border-t border-border">
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                <Calendar size={16} /> Return Date
              </h3>
              <div className="font-medium text-foreground">{format(new Date(vr.returnDate), 'MMMM d, yyyy')}</div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                Total Amount
              </h3>
              <div className="font-medium text-foreground">{formatCurrency(vr.totalReturnAmount || 0)}</div>
            </div>
          </div>

          {vr.notes && (
            <div className="pt-6 border-t border-border">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Notes</h3>
              <p className="text-foreground">{vr.notes}</p>
            </div>
          )}
        </Card>

        <Card className="p-6 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <FileText size={16} /> Related Documents
          </h3>

          <div className="space-y-4">
            <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md shadow-sm">
              <div className="text-xs text-slate-500 mb-1">Return Type</div>
              <div className="font-medium text-slate-800">{vr.returnType ? vr.returnType.replace('_', ' ') : 'SINGLE GRN'}</div>
            </div>

            {vr.returnType !== 'SUPPLIER_CONSOLIDATED' && vr.purchaseOrderId && (
              <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md shadow-sm">
                <div className="text-xs text-slate-500 mb-1">Source Purchase Order</div>
                <Link to={`/purchases/${vr.purchaseOrderId._id}`} className="text-blue-600 font-medium hover:underline flex justify-between items-center">
                  {vr.purchaseOrderId.purchaseOrderNumber}
                </Link>
              </div>
            )}

            {vr.grnId ? (
              <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md shadow-sm">
                <div className="text-xs text-slate-500 mb-1">Source GRN</div>
                <Link to={`/purchases/grn/${vr.grnId._id}`} className="text-blue-600 font-medium hover:underline flex justify-between items-center">
                  {vr.grnId.grnNumber}
                </Link>
              </div>
            ) : (
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-md">
                <div className="text-xs text-blue-800 font-medium text-center">Multi-GRN Consolidated Return</div>
              </div>
            )}
          </div>

          {vr.validatedBy && (
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
              <div className="text-sm text-slate-500">
                Validated by <span className="font-medium text-slate-800 dark:text-slate-200">{vr.validatedBy.name}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                on {format(new Date(vr.validatedAt), 'MMM d, yyyy HH:mm')}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Package size={18} className="text-blue-600" /> Returned Items
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="p-4 font-medium">Product</th>
                {vr.returnType === 'SUPPLIER_CONSOLIDATED' && <th className="p-4 font-medium">Source PO</th>}
                {vr.returnType !== 'SINGLE_GRN' && <th className="p-4 font-medium">Source GRNs</th>}
                <th className="p-4 font-medium">Location</th>
                <th className="p-4 font-medium text-center">Return Qty</th>
                <th className="p-4 font-medium text-right">Unit Cost</th>
                <th className="p-4 font-medium text-right">Total Amount</th>
                <th className="p-4 font-medium text-right">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {vr.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="p-4">
                    <div className="font-medium text-slate-900">{item.itemName}</div>
                    <div className="text-xs text-slate-500">SKU: {item.sku || 'N/A'}</div>
                  </td>
                  {vr.returnType === 'SUPPLIER_CONSOLIDATED' && (
                     <td className="p-4 text-xs font-mono text-slate-600">
                        {item.purchaseOrderId ? <Link to={`/purchases/${item.purchaseOrderId}`} className="text-blue-600 hover:underline">PO Link</Link> : 'N/A'}
                     </td>
                  )}
                  {vr.returnType !== 'SINGLE_GRN' && (
                     <td className="p-4 text-xs text-slate-600">
                        {item.sourceGRNIds ? `${item.sourceGRNIds.length} GRNs` : 'N/A'}
                     </td>
                  )}
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <MapPin size={14} className="text-slate-400" />
                      {item.branchId?.name || vr.branchId?.name || 'N/A'}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="font-bold text-slate-900">{item.returnQuantity}</span> <span className="text-xs text-slate-500">{item.uom || 'PCS'}</span>
                  </td>
                  <td className="p-4 text-right text-slate-600">
                    {formatCurrency(item.unitCost || 0)}
                  </td>
                  <td className="p-4 text-right font-medium text-slate-900">
                    {formatCurrency(item.returnAmount || (item.returnQuantity * (item.unitCost || 0)))}
                  </td>
                  <td className="p-4 text-right text-slate-500 italic">{item.reason || '-'}</td>
                </tr>
              ))}
            </tbody>
            {vr.totalReturnAmount > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan="4" className="p-4 text-right font-bold text-slate-700">Total Return Value:</td>
                  <td className="p-4 text-right font-bold text-slate-900">{formatCurrency(vr.totalReturnAmount)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
}

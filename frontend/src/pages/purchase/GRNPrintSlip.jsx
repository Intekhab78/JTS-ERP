import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Printer, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useCurrency } from '../../contexts/CurrencyContext';

export const GRNPrintSlip = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatCurrency, currencySymbol } = useCurrency();
  const [grn, setGrn] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGRN = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/v1/grn/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setGrn(res.data);
      } catch (err) {
        console.error('Failed to load GRN for print:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGRN();
  }, [id]);

  useEffect(() => {
    if (grn && !loading) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [grn, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xs font-bold text-slate-500">
        Loading Goods Receipt Note Slip...
      </div>
    );
  }

  if (!grn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-bold text-red-600 mb-2">GRN not found</p>
        <button onClick={() => navigate(-1)} className="text-xs text-blue-600 underline">Go Back</button>
      </div>
    );
  }

  const items = grn.items || [];
  const totalPurchaseCost = Number(grn.totalPurchaseCost) || items.reduce((acc, it) => acc + (Number(it.purchaseAmount) || (Number(it.acceptedQuantity || 0) * Number(it.purchaseUnitPrice || 0))), 0);
  const totalAdditionalCost = Number(grn.totalAdditionalCost) || (grn.additionalCosts || []).reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
  const totalLandedCost = Number(grn.totalLandedCost) || (totalPurchaseCost + totalAdditionalCost);

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0 print:m-0 font-sans text-slate-800">
      {/* Top action bar (hidden during print) */}
      <div className="max-w-4xl mx-auto mb-4 flex items-center justify-between no-print px-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-xs hover:bg-slate-50 cursor-pointer"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 cursor-pointer"
          >
            <Printer size={14} /> Print Document (A4)
          </button>
        </div>
      </div>

      {/* A4 Tax Receipt Page Container */}
      <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white p-8 md:p-10 text-slate-800 shadow-md print:shadow-none print:p-6 print:m-0 box-border text-xs">
        
        {/* HEADER: COMPANY INFO & INVOICE TITLE */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-5">
          <div>
            <div className="text-xl font-black text-slate-900 uppercase tracking-tight">JTS ENTERPRISE ERP</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
              {grn.branchId?.name || 'Dubai Central Warehouse'}
            </div>
            <div className="text-[11px] text-slate-600 mt-1 max-w-xs leading-relaxed">
              Receiving & Logistics Verification Center<br />
              Email: receiving@jtsmiddleeast.com | Tel: +971 4 000 0000
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">GOODS RECEIPT NOTE</h1>
            <div className="text-xs font-mono font-bold text-blue-600 mt-1">{grn.grnNumber}</div>
            <div className="text-[11px] font-mono text-slate-600">
              PO Ref: {grn.purchaseOrderId?.purchaseOrderNumber || (grn.purchaseOrderId ? `PO-${grn.purchaseOrderId._id.slice(-6).toUpperCase()}` : 'Direct Consignment')}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Receipt Date: {format(new Date(grn.receiptDate || grn.createdAt), 'dd MMMM yyyy · hh:mm a')}
            </div>
            <div className="text-[11px] font-black uppercase text-slate-800 mt-0.5">
              Status: <span className="font-mono text-blue-700">{grn.status}</span>
            </div>
          </div>
        </div>

        {/* SUPPLIER & DISPATCH METADATA */}
        <div className="grid grid-cols-2 gap-6 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-5">
          <div className="space-y-1">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500 block">Supplier / Vendor</span>
            <div className="font-bold text-slate-900 text-sm">{grn.supplierId?.name || grn.supplierSnapshot?.name || 'N/A'}</div>
            {(grn.supplierId?.phone || grn.supplierSnapshot?.phone) && (
              <div className="text-slate-600 font-mono">Tel: {grn.supplierId?.phone || grn.supplierSnapshot?.phone}</div>
            )}
            {(grn.supplierId?.email || grn.supplierSnapshot?.email) && (
              <div className="text-slate-600">Email: {grn.supplierId?.email || grn.supplierSnapshot?.email}</div>
            )}
            {(grn.supplierId?.taxNumber || grn.supplierId?.gstin) && (
              <div className="text-slate-600 font-mono font-semibold">Tax/TRN: {grn.supplierId?.taxNumber || grn.supplierId?.gstin}</div>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500 block">Carrier & Warehouse Depot</span>
            <div className="font-bold text-slate-900 text-sm">{grn.branchId?.name || 'Main Warehouse'}</div>
            <div>Delivery Challan: <strong className="font-mono">{grn.deliveryChallanNumber || 'N/A'}</strong></div>
            <div>Vehicle Number: <strong className="font-mono">{grn.vehicleNumber || 'N/A'}</strong></div>
            <div>Allocation: <strong className="text-blue-700">{grn.allocationMethod || 'By Purchase Value'}</strong></div>
          </div>
        </div>

        {/* LINE ITEMS TABLE */}
        <div className="mb-5">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-100 text-[10px] font-black uppercase text-slate-700">
                <th className="py-2 px-2.5 w-8 text-center">#</th>
                <th className="py-2 px-2.5">Product Description</th>
                <th className="py-2 px-2 text-center">UOM</th>
                <th className="py-2 px-2 text-right">Price</th>
                <th className="py-2 px-2 text-center">Ord</th>
                <th className="py-2 px-2 text-center">Rec</th>
                <th className="py-2 px-2 text-center text-emerald-700 font-bold">Acc</th>
                <th className="py-2 px-2 text-center text-rose-700">Rej</th>
                <th className="py-2 px-2 text-right">Purchase Amt</th>
                <th className="py-2 px-2.5 text-right font-black">Landed Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((it, idx) => {
                const price = Number(it.purchaseUnitPrice) || 0;
                const accepted = Number(it.acceptedQuantity) || 0;
                const linePurchase = Number(it.purchaseAmount) || (accepted * price);
                const totalLanded = Number(it.totalLandedCost) || (linePurchase + (Number(it.allocatedAdditionalCost) || 0));

                return (
                  <tr key={idx}>
                    <td className="py-2 px-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2 px-2.5">
                      <div className="font-bold text-slate-900">{it.itemName || it.productId?.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        SKU: {it.sku || it.productId?.sku}
                        {it.variantSku && ` · Variant: ${it.variantSku}`}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center font-mono">{it.uom || 'PCS'}</td>
                    <td className="py-2 px-2 text-right font-mono">{formatCurrency(price)}</td>
                    <td className="py-2 px-2 text-center font-mono">{it.orderedQuantity}</td>
                    <td className="py-2 px-2 text-center font-mono">{it.receivedQuantity}</td>
                    <td className="py-2 px-2 text-center font-mono font-bold text-emerald-700">{it.acceptedQuantity}</td>
                    <td className="py-2 px-2 text-center font-mono text-rose-700">{it.rejectedQuantity || 0}</td>
                    <td className="py-2 px-2 text-right font-mono">{formatCurrency(linePurchase)}</td>
                    <td className="py-2 px-2.5 text-right font-mono font-black">{formatCurrency(totalLanded)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-900 font-black text-xs">
                <td colSpan={4} className="py-2.5 px-2.5 uppercase text-slate-700">Totals:</td>
                <td className="py-2.5 px-2 text-center">{items.reduce((s, i) => s + (Number(i.orderedQuantity) || 0), 0)}</td>
                <td className="py-2.5 px-2 text-center">{items.reduce((s, i) => s + (Number(i.receivedQuantity) || 0), 0)}</td>
                <td className="py-2.5 px-2 text-center text-emerald-700">{items.reduce((s, i) => s + (Number(i.acceptedQuantity) || 0), 0)}</td>
                <td className="py-2.5 px-2 text-center text-rose-700">{items.reduce((s, i) => s + (Number(i.rejectedQuantity) || 0), 0)}</td>
                <td className="py-2.5 px-2 text-right font-mono">{formatCurrency(totalPurchaseCost)}</td>
                <td className="py-2.5 px-2.5 text-right font-mono text-sm">{formatCurrency(totalLandedCost)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* FINANCIAL SUMMARY RECAP */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-600">Base Purchase Value:</span>
              <span className="font-bold text-slate-800">{formatCurrency(totalPurchaseCost)}</span>
            </div>
            <div className="flex justify-between text-blue-700">
              <span>+ Landed Expenses:</span>
              <span className="font-bold">+{formatCurrency(totalAdditionalCost)}</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-slate-300 font-black text-slate-900 text-sm">
              <span>Grand Total:</span>
              <span>{formatCurrency(totalLandedCost)}</span>
            </div>
          </div>
        </div>

        {/* NOTES */}
        {grn.notes && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs mb-8">
            <span className="font-bold text-slate-700 block uppercase text-[10px]">Notes / Carrier Remarks:</span>
            <p className="text-slate-600 mt-0.5">{grn.notes}</p>
          </div>
        )}

        {/* FORMAL SIGNATURE BLOCKS */}
        <div className="grid grid-cols-3 gap-8 pt-10 border-t border-slate-300 text-center text-xs">
          <div>
            <div className="border-b border-slate-400 pb-10 mb-1"></div>
            <div className="font-bold text-slate-800">Storekeeper Signature</div>
            <div className="text-[10px] text-slate-500">Received & Checked</div>
          </div>
          <div>
            <div className="border-b border-slate-400 pb-10 mb-1"></div>
            <div className="font-bold text-slate-800">QC Inspector Signature</div>
            <div className="text-[10px] text-slate-500">Quality Verified</div>
          </div>
          <div>
            <div className="border-b border-slate-400 pb-10 mb-1"></div>
            <div className="font-bold text-slate-800">Warehouse Manager</div>
            <div className="text-[10px] text-slate-500">Final Authorization</div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default GRNPrintSlip;

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Printer, ArrowLeft, Building2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export const WebOrderInvoicePrint = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/v1/ecommerce-admin/orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const orderObj = res.data.order ? { ...res.data.order, items: res.data.items || [] } : res.data;
        setOrder(orderObj);
      } catch (err) {
        console.error('Failed to load order for invoice:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xs font-bold text-slate-500">
        Loading Tax Invoice...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-bold text-red-600 mb-2">Order not found</p>
        <button onClick={() => navigate(-1)} className="text-xs text-blue-600 underline">Go Back</button>
      </div>
    );
  }

  const currency = order.currency || 'AED';
  const orderNumber = `WEB-${order._id.slice(-6).toUpperCase()}`;
  const invoiceNumber = `INV-${order._id.slice(-6).toUpperCase()}`;
  const subtotal = Number(order.subtotalAmount ?? order.subTotal ?? (order.totalAmount - (order.taxAmount || 0) - (order.shippingAmount || 0)));
  const tax = Number(order.taxAmount || 0);
  const shipping = Number(order.shippingAmount || 0);
  const total = Number(order.totalAmount || 0);

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0 print:m-0">
      {/* Top action bar (hidden during print) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between no-print px-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-xs hover:bg-slate-50 cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Orders
        </button>
        <div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 px-5 py-2 rounded-lg shadow-sm hover:bg-blue-700 cursor-pointer"
          >
            <Printer size={14} /> Print Tax Invoice (A4)
          </button>
        </div>
      </div>

      {/* A4 Tax Invoice Page Container */}
      <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white p-10 md:p-12 text-slate-800 font-sans shadow-lg print:shadow-none print:p-8 print:m-0 box-border">
        
        {/* HEADER: COMPANY INFO & INVOICE TITLE */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
          <div>
            <div className="text-2xl font-black text-slate-900 uppercase tracking-tight">JTS GROUP</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">
              {order.branchId?.name || 'Dubai Central Branch'}
            </div>
            <div className="text-xs text-slate-600 mt-1 max-w-xs leading-relaxed">
              Fulfillment Center • United Arab Emirates<br />
              Email: orders@jtsstore.com | Helpline: +971 4 000 0000
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">TAX INVOICE</h1>
            <div className="text-xs font-mono font-bold text-slate-500 mt-1">Invoice No: {invoiceNumber}</div>
            <div className="text-xs font-mono text-slate-500">Order Ref: {orderNumber}</div>
            <div className="text-xs text-slate-500 mt-0.5">Date: {format(new Date(order.createdAt), 'dd MMMM yyyy')}</div>
          </div>
        </div>

        {/* BILL TO / SHIP TO & PAYMENT INFO */}
        <div className="grid grid-cols-2 gap-8 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-6">
          <div>
            <div className="font-black text-slate-500 uppercase tracking-wider text-[10px] mb-1">
              BILLED & DELIVERED TO:
            </div>
            <div className="font-bold text-slate-900 text-sm">{order.customerName}</div>
            <div className="text-slate-600 mt-1 leading-relaxed">{order.shippingAddress}</div>
            <div className="text-slate-600 mt-1">Phone: <strong className="text-slate-800">{order.customerPhone || 'N/A'}</strong></div>
            <div className="text-slate-600">Email: {order.customerEmail || 'N/A'}</div>
          </div>

          <div className="space-y-1.5 border-l border-slate-200 pl-6">
            <div className="font-black text-slate-500 uppercase tracking-wider text-[10px] mb-1">
              PAYMENT & DISPATCH SUMMARY:
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Mode:</span>
              <strong className="font-mono uppercase">{order.paymentMethod || 'COD'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Status:</span>
              <strong className="uppercase text-emerald-700">{order.paymentStatus || 'UNPAID'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Carrier / Courier:</span>
              <strong className="text-slate-800">{order.carrierId?.carrierName || order.carrier || 'Standard Courier'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tracking / AWB:</span>
              <strong className="font-mono text-blue-700">{order.trackingNumber || 'Pending'}</strong>
            </div>
          </div>
        </div>

        {/* LINE ITEMS TABLE */}
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-700 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Item & Description</th>
                <th className="py-3 px-4 text-center">SKU</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-right">Total ({currency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(order.items || []).map((item, idx) => {
                const itemUnit = Number(item.unitPrice || 0);
                const itemTotal = Number(item.subTotal || item.totalPrice || (item.quantity * itemUnit));
                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.productId?.name || item.name || 'Product'}</div>
                      {item.variantSku && (
                        <div className="text-[11px] text-blue-600 font-medium mt-0.5">
                          Variant: {item.variantSku}
                          {item.selectedAttributes && Object.keys(item.selectedAttributes).length > 0 && (
                            <span className="text-slate-500 ml-1">
                              ({Object.entries(item.selectedAttributes).map(([k, v]) => `${k}: ${v}`).join(', ')})
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                      {item.variantSku || item.productId?.sku || item.sku || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">{item.quantity}</td>
                    <td className="py-3.5 px-4 text-right font-mono">{itemUnit.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right font-bold font-mono text-slate-900">{itemTotal.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* TOTALS & BREAKDOWN */}
        <div className="flex justify-end mb-8">
          <div className="w-72 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
              <span>Items Subtotal:</span>
              <span className="font-mono font-bold text-slate-900">{currency} {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
              <span>Shipping Fee:</span>
              <span className="font-mono font-bold text-slate-900">
                {shipping > 0 ? `${currency} ${shipping.toFixed(2)}` : 'FREE'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
              <span>Tax (VAT / GST):</span>
              <span className="font-mono font-bold text-slate-900">{currency} {tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm font-black text-slate-900">
              <span>Grand Total:</span>
              <span className="font-mono text-base">{currency} {total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* TERMS & SIGNATURE */}
        <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-[11px] text-slate-500">
          <div>
            <div className="font-bold text-slate-700 uppercase mb-1">Terms & Conditions:</div>
            <p className="leading-relaxed">
              1. Goods once sold can be returned within 7 days in original condition.<br />
              2. For any warranty or support inquiries, quote the Order Reference number.<br />
              3. This is a computer-generated tax invoice and requires no physical signature.
            </p>
          </div>
          <div className="text-right flex flex-col justify-end">
            <div className="font-black text-slate-800 uppercase text-xs">For JTS GROUP</div>
            <div className="text-[10px] text-slate-400 mt-8">Authorized Signatory / Warehouse Dispatch Bay</div>
          </div>
        </div>

      </div>

      {/* Embedded print styles for A4 sheet */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            background: white !important;
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default WebOrderInvoicePrint;

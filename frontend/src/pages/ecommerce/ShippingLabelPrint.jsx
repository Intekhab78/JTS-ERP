import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Printer, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

// Helper to draw realistic high-contrast barcode lines as SVG
const BarcodeSVG = ({ value = 'AWB123456789' }) => {
  // Generate consistent deterministic bar widths from string characters
  const bars = [];
  let currentPos = 10;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    const w1 = (code % 3) + 1.5;
    const s1 = ((code >> 1) % 2) + 1.2;
    const w2 = ((code >> 2) % 3) + 1.2;
    const s2 = ((code >> 3) % 2) + 1.5;
    bars.push({ x: currentPos, width: w1 });
    currentPos += w1 + s1;
    bars.push({ x: currentPos, width: w2 });
    currentPos += w2 + s2;
  }
  const totalWidth = currentPos + 10;

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${totalWidth} 50`}
        className="w-full h-14"
        preserveAspectRatio="none"
      >
        {bars.map((bar, idx) => (
          <rect
            key={idx}
            x={bar.x}
            y="0"
            width={bar.width}
            height="50"
            fill="#000"
          />
        ))}
      </svg>
      <div className="font-mono text-xs font-bold tracking-widest text-black mt-0.5">
        *{value.toUpperCase()}*
      </div>
    </div>
  );
};

export const ShippingLabelPrint = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/v1/ecommerce-admin/orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const orderObj = res.data.order ? { ...res.data.order, items: res.data.items || [] } : res.data;
        setOrder(orderObj);
      } catch (err) {
        console.error('Failed to load order for shipping label:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xs font-bold text-slate-500">
        Loading Shipping Label...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-bold text-red-600 mb-2">Order not found</p>
        <button onClick={() => navigate(-1)} className="text-xs text-blue-600 underline">
          Go Back
        </button>
      </div>
    );
  }

  const currency = order.currency || 'AED';
  const orderRef = `WEB-${order._id.slice(-6).toUpperCase()}`;
  const awb = order.trackingNumber || `AWB-${order._id.slice(-8).toUpperCase()}`;
  const carrierName = order.carrier || (order.carrierId?.carrierName) || 'STANDARD COURIER';
  const isCOD = (order.paymentMethod || '').toUpperCase().includes('COD') || (order.paymentStatus || '').toUpperCase() === 'UNPAID';
  const totalAmount = Number(order.totalAmount || 0);

  return (
    <div className="min-h-screen bg-slate-200 py-6 print:bg-white print:py-0 print:m-0 flex flex-col items-center">
      {/* Top action bar (hidden during print) */}
      <div className="w-[100mm] max-w-full mb-4 flex items-center justify-between no-print px-2">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded border border-slate-300 shadow-xs hover:bg-slate-50 cursor-pointer"
        >
          <ArrowLeft size={13} /> Back
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(`/ecommerce/orders/${order._id}/invoice`, '_blank')}
            className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded border border-blue-200 hover:bg-blue-100 cursor-pointer"
          >
            A4 Invoice
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-black px-4 py-1.5 rounded shadow hover:bg-neutral-800 cursor-pointer"
          >
            <Printer size={13} /> Print Label (4x6)
          </button>
        </div>
      </div>

      {/* 4x6 INCH / 100x150MM THERMAL LABEL CONTAINER */}
      <div className="w-[100mm] h-[150mm] bg-white text-black font-sans border-2 border-black p-3.5 flex flex-col justify-between box-border shadow-md print:shadow-none print:border-2 print:border-black print:m-0 print:w-[100mm] print:h-[150mm]">
        
        {/* ROW 1: CARRIER & ROUTING HEADER */}
        <div className="border-b-2 border-black pb-2 flex justify-between items-center">
          <div>
            <div className="text-xl font-black uppercase tracking-tight leading-none">
              {order.deliveryType === 'IN_HOUSE' ? (order.carrier || 'JTS IN-HOUSE FLEET') : carrierName}
            </div>
            <div className="text-[10px] font-bold tracking-wider uppercase mt-0.5">
              {order.deliveryType === 'IN_HOUSE'
                ? `RIDER: ${order.driverName || 'SELF'} ${order.driverPhone ? `· TEL: ${order.driverPhone}` : ''}`
                : 'EXPRESS SURFACE & AIR'}
            </div>
          </div>
          <div className="text-right border-l-2 border-black pl-3">
            <div className="text-[10px] font-bold text-neutral-600">
              {order.deliveryType === 'IN_HOUSE' ? 'VEHICLE' : 'HUB / DEST'}
            </div>
            <div className="text-lg font-black leading-none">
              {order.deliveryType === 'IN_HOUSE' ? (order.vehicleNumber || 'VAN-01') : 'DXB-C'}
            </div>
          </div>
        </div>

        {/* ROW 2: PRIMARY BARCODE (AWB / TRACKING) */}
        <div className="border-b-2 border-black py-2 text-center">
          <BarcodeSVG value={awb} />
        </div>

        {/* ROW 3: COD / PREPAID BADGE BANNER */}
        <div className="border-b-2 border-black py-1.5 px-2 text-center bg-black text-white print:bg-black print:text-white">
          {isCOD ? (
            <div className="flex items-center justify-between">
              <span className="text-sm font-black tracking-wider uppercase">CASH ON DELIVERY (COD)</span>
              <span className="text-base font-black tracking-tight bg-white text-black px-2 py-0.5 rounded print:bg-white print:text-black">
                {currency} {totalAmount.toFixed(2)}
              </span>
            </div>
          ) : (
            <div className="text-sm font-black tracking-wider uppercase">
              PREPAID - DO NOT COLLECT CASH
            </div>
          )}
        </div>

        {/* ROW 4: SHIP TO (CUSTOMER DETAILS) - BIG AND CLEAR */}
        <div className="border-b-2 border-black py-2.5 flex-1 flex flex-col justify-center">
          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-600">
            DELIVER TO:
          </div>
          <div className="text-base font-black uppercase tracking-tight mt-0.5">
            {order.customerName}
          </div>
          <div className="text-xs font-semibold mt-1 leading-snug line-clamp-3">
            {order.shippingAddress}
          </div>
          <div className="text-xs font-black mt-1.5 flex items-center gap-1">
            <span>TEL:</span>
            <span className="font-mono text-sm tracking-wide">{order.customerPhone || 'N/A'}</span>
          </div>
        </div>

        {/* ROW 5: ORDER & ITEM SUMMARY */}
        <div className="border-b-2 border-black py-1.5 text-[10px] flex justify-between items-center">
          <div>
            <span className="font-bold">Order Ref:</span> <span className="font-mono font-bold">{orderRef}</span>
            <div className="text-neutral-700">Date: {format(new Date(order.createdAt), 'dd/MM/yyyy')}</div>
          </div>
          <div className="text-center font-bold text-[9px] uppercase px-1 border-x border-neutral-300">
            {order.deliveryType === 'IN_HOUSE' ? (
              <span className="text-black">OTP Handover Required</span>
            ) : (
              <span>STANDARD CARRIER</span>
            )}
          </div>
          <div className="text-right">
            <span className="font-bold">Items:</span> {(order.items || []).length} SKU(s)
            <div className="text-neutral-700 font-bold">Weight: ~0.50 KG</div>
          </div>
        </div>

        {/* ROW 6: RETURN TO / DISPATCH WAREHOUSE */}
        <div className="pt-1.5 text-[9px] leading-tight flex justify-between items-end">
          <div>
            <div className="font-black uppercase">RETURN IF UNDELIVERED TO:</div>
            <div className="font-bold">JTS GROUP FULFILLMENT CENTER</div>
            <div className="text-neutral-700">Dubai Logistics City, Dubai, UAE</div>
            <div className="text-neutral-700">Support: orders@jtsstore.com | +971 4 000 0000</div>
          </div>
          <div className="text-right font-mono text-[9px] font-bold">
            STANDARD 4x6"
          </div>
        </div>

      </div>

      {/* Embedded print styles for 4x6" Thermal Roll */}
      <style>{`
        @media print {
          @page {
            size: 100mm 150mm;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            width: 100mm;
            height: 150mm;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ShippingLabelPrint;

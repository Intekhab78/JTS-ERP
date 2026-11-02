import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Camera, CheckCircle2, Phone, MapPin, Package, ShieldCheck,
  AlertCircle, ArrowLeft, RefreshCw, Upload, Truck, Sparkles, X, Check,
  PenTool, RotateCcw, Maximize2, Image as ImageIcon, QrCode, CreditCard, Banknote
} from 'lucide-react';

export const RiderDeliveryVerify = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Delivery Form State
  const [otp, setOtp] = useState('');
  const [photoProof, setPhotoProof] = useState('');
  const [riderName, setRiderName] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeliveredSuccess, setIsDeliveredSuccess] = useState(false);
  const [deliveredDetails, setDeliveredDetails] = useState(null);

  // Proof Selection: 'photo' | 'signature' | 'both'
  const [proofMode, setProofMode] = useState('photo');

  // Customer Touch / Finger E-Signature State
  const [hasSigned, setHasSigned] = useState(false);
  const [customerSignature, setCustomerSignature] = useState('');

  // Full Screen Signature Modal State
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const fullCanvasRef = useRef(null);
  const [fullIsDrawing, setFullIsDrawing] = useState(false);
  const [fullHasSigned, setFullHasSigned] = useState(false);

  // Hidden File Input Refs
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Return Pickup specifics if this order is a return
  const [returnOtp, setReturnOtp] = useState('');
  const [isReturnPickupSuccess, setIsReturnPickupSuccess] = useState(false);

  // Doorstep Cancellation / Customer Refusal (RTO) State
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('Customer Refused Delivery at Doorstep');
  const [cancelNotes, setCancelNotes] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancelledSuccess, setIsCancelledSuccess] = useState(false);

  // Pay-on-Delivery (COD) Collection State: '' (not chosen yet) | 'UPI_QR' | 'CARD_POS' | 'CASH'
  const [codTab, setCodTab] = useState('');
  const [codCollectedMethod, setCodCollectedMethod] = useState('NONE');
  const [codTxnId, setCodTxnId] = useState('');
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [cardLast4, setCardLast4] = useState('4242');

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await axios.get(`/api/v1/ecommerce/rider/order/${id}`);
      const ord = res.data.order;
      setOrder(ord);
      if (ord.driverName) setRiderName(ord.driverName);
      if (ord.enablePhotoPod === false && ord.enableSignaturePod !== false) {
        setProofMode('signature');
      } else if (ord.enableSignaturePod === false && ord.enablePhotoPod !== false) {
        setProofMode('photo');
      }
      if (ord.codCollectionMethod && ord.codCollectionMethod !== 'NONE') {
        setCodCollectedMethod(ord.codCollectionMethod);
        setCodTab(ord.codCollectionMethod);
        setCodTxnId(ord.codTransactionId || '');
      } else {
        setCodTab('');
      }
      if (ord.isDelivered) {
        setIsDeliveredSuccess(true);
        setDeliveredDetails({
          deliveredAt: ord.deliveredAt,
          deliveredByRider: ord.deliveredByRider,
          deliveryProofPhoto: ord.deliveryProofPhoto,
          customerSignature: ord.customerSignature,
          codCollectionMethod: ord.codCollectionMethod,
          codTransactionId: ord.codTransactionId
        });
      } else if ((ord.status || '').toUpperCase() === 'CANCELLED') {
        setIsCancelledSuccess(true);
      }
    } catch (err) {
      console.error('Error loading rider order:', err);
      setErrorMsg(err.response?.data?.message || 'Unable to load delivery details.');
    } finally {
      setLoading(false);
    }
  };

  // Direct camera / gallery capture handler
  const handleCameraCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoProof(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Full-Screen Signature Canvas Lifecycle
  useEffect(() => {
    if (isSignatureModalOpen && fullCanvasRef.current) {
      const timer = setTimeout(() => {
        const canvas = fullCanvasRef.current;
        if (!canvas) return;
        const container = canvas.parentElement;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const dpr = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#0f172a';

        if (customerSignature) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, rect.width, rect.height);
            setFullHasSigned(true);
          };
          img.src = customerSignature;
        } else {
          setFullHasSigned(false);
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isSignatureModalOpen]);

  const getFullCoordinates = (e) => {
    const canvas = fullCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startFullDrawing = (e) => {
    e.preventDefault();
    const canvas = fullCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getFullCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setFullIsDrawing(true);
  };

  const drawFull = (e) => {
    if (!fullIsDrawing) return;
    e.preventDefault();
    const canvas = fullCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getFullCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setFullHasSigned(true);
  };

  const stopFullDrawing = () => {
    if (!fullIsDrawing) return;
    setFullIsDrawing(false);
  };

  const clearFullSignature = () => {
    const canvas = fullCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFullHasSigned(false);
  };

  const saveFullSignature = () => {
    const canvas = fullCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setCustomerSignature(dataUrl);
    setHasSigned(true);
    setIsSignatureModalOpen(false);
  };

  const clearMainSignature = () => {
    setCustomerSignature('');
    setHasSigned(false);
  };

  const isPhotoEnabled = order ? order.enablePhotoPod !== false : true;
  const isSignatureEnabled = order ? order.enableSignaturePod !== false : true;
  const isPodEnabled = isPhotoEnabled || isSignatureEnabled;

  const effectiveProofMode = !isPodEnabled
    ? 'none'
    : (isPhotoEnabled && !isSignatureEnabled)
      ? 'photo'
      : (!isPhotoEnabled && isSignatureEnabled)
        ? 'signature'
        : proofMode;

  // Helper validation for submit button
  const isProofValid = (() => {
    if (effectiveProofMode === 'none') return true;
    if (effectiveProofMode === 'photo') return !!photoProof;
    if (effectiveProofMode === 'signature') return !!customerSignature;
    if (effectiveProofMode === 'both') return !!photoProof && !!customerSignature;
    return !!photoProof || !!customerSignature;
  })();

  const isReturnOrExchange =
    (order?.returnStatus && order.returnStatus !== 'NONE') ||
    ['RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURNED', 'REFUNDED', 'EXCHANGE_REQUESTED', 'EXCHANGE_APPROVED', 'EXCHANGE_SHIPPED', 'EXCHANGED'].includes(order?.status);
  const isExchangeWithExtraCharge =
    isReturnOrExchange &&
    order?.returnType === 'EXCHANGE' &&
    Number(order?.exchangePriceDifference || 0) > 0;
  const requiresPaymentCollection = isReturnOrExchange
    ? isExchangeWithExtraCharge
    : Boolean(order?.isCOD);
  const payableAmount = isExchangeWithExtraCharge
    ? Number(order?.exchangePriceDifference || 0)
    : Number(order?.totalAmount || 0);

  const isCodPaymentReady = !requiresPaymentCollection || (codCollectedMethod && codCollectedMethod !== 'NONE');

  // Simulate / Confirm Doorstep COD Payment (Dummy UPI QR / Dummy Card POS / Cash)
  const handleSimulateCodPayment = async (method) => {
    setIsSimulatingPayment(true);
    try {
      // Brief realistic delay for UPI / Card POS simulation
      if (method === 'UPI_QR' || method === 'CARD_POS') {
        await new Promise(resolve => setTimeout(resolve, 1100));
      }
      const res = await axios.post(`/api/v1/ecommerce/rider/collect-cod/${id}`, {
        collectionMethod: method,
        cardLast4: cardLast4 || '4242',
        riderName: riderName.trim() || order?.driverName || 'In-House Rider'
      });
      setCodCollectedMethod(res.data.codCollectionMethod || method);
      setCodTxnId(res.data.codTransactionId || '');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to process dummy payment collection.');
    } finally {
      setIsSimulatingPayment(false);
    }
  };

  // Submit Forward Delivery with Photo Proof + Signature + OTP
  const handleDeliverySubmit = async (e) => {
    e.preventDefault();
    if (requiresPaymentCollection && (!codCollectedMethod || codCollectedMethod === 'NONE')) {
      alert('Please collect the required payment amount via Dynamic UPI QR, Card (POS), or Cash first!');
      return;
    }
    if (!otp.trim()) {
      alert('Please enter the 4-digit Customer Delivery OTP.');
      return;
    }

    if (effectiveProofMode !== 'none') {
      if (effectiveProofMode === 'photo' && !photoProof) {
        alert('Proof of Delivery (POD) photo is required! Please click or upload a photo of the package.');
        return;
      }

      if (effectiveProofMode === 'signature' && !customerSignature) {
        alert('Customer signature is required! Please tap to sign in full screen.');
        return;
      }

      if (effectiveProofMode === 'both') {
        if (!photoProof) {
          alert('Proof of Delivery (POD) photo is required!');
          return;
        }
        if (!customerSignature) {
          alert('Customer signature is required! Please tap to sign in full screen.');
          return;
        }
      }

      if (!photoProof && !customerSignature) {
        alert('Please provide either a Photo Proof (POD) or Customer Signature before confirming.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await axios.post(`/api/v1/ecommerce/rider/deliver/${id}`, {
        otp: otp.trim(),
        photoProof: photoProof || '',
        customerSignature: customerSignature || '',
        riderName: riderName.trim() || order?.driverName || 'In-House Rider',
        notes: deliveryNotes,
        codCollectionMethod: codCollectedMethod,
        codTransactionId: codTxnId
      });

      setIsDeliveredSuccess(true);
      setDeliveredDetails({
        deliveredAt: res.data.deliveredAt,
        deliveredByRider: res.data.deliveredByRider,
        deliveryProofPhoto: photoProof,
        customerSignature: customerSignature || '',
        codCollectionMethod: codCollectedMethod,
        codTransactionId: codTxnId
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to confirm delivery. Please check the OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Rider Doorstep Cancellation / Customer Refusal (RTO)
  const handleDoorstepCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this order and mark it for Return to Warehouse (RTO)?')) {
      return;
    }
    setIsCancelling(true);
    try {
      await axios.post(`/api/v1/ecommerce/rider/cancel/${id}`, {
        reason: cancelReason,
        notes: cancelNotes,
        riderName: riderName.trim() || order?.driverName || 'In-House Rider'
      });
      setIsCancelledSuccess(true);
      setShowCancelForm(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-bold text-slate-600">Connecting to JTS Dispatch Server...</p>
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white rounded-3xl p-6 shadow-xl max-w-sm w-full space-y-4">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-base font-black text-slate-900">Delivery Record Error</h2>
          <p className="text-xs text-slate-500">{errorMsg || 'Order record not found.'}</p>
          <button
            onClick={() => navigate('/rider')}
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
          >
            Go to Rider Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center py-0 sm:py-6 text-slate-900">
      <div className="w-full max-w-md bg-white shadow-2xl sm:rounded-3xl min-h-screen sm:min-h-0 flex flex-col overflow-hidden">

        {/* MOBILE APP HEADER */}
        <div className="bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/rider')}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-black text-sm"
              title="Back to Assigned Runs"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="text-xs font-black tracking-wide uppercase flex items-center gap-1.5">
                <span>JTS Express Rider</span>
                <span className="text-[10px] bg-blue-500/30 text-blue-300 px-1.5 py-0.2 rounded font-mono">
                  {order.orderRef}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Doorstep POD & Handover System</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/rider')}
            className="text-[11px] font-bold text-slate-300 hover:text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700"
          >
            Portal
          </button>
        </div>

        {/* ALREADY CANCELLED / RTO SCREEN */}
        {isCancelledSuccess ? (
          <div className="p-6 flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center shadow-lg">
              <X size={48} />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                ORDER CANCELLED (RTO)
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2">
                Delivery Cancelled at Doorstep
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Order <strong className="font-mono text-slate-800">{order.orderRef}</strong> has been marked as CANCELLED and stock has been restored to the warehouse. Please return the parcel to the hub.
              </p>
            </div>

            <button
              onClick={() => navigate('/rider')}
              className="w-full py-3 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              Back to Assigned Orders
            </button>
          </div>
        ) : isDeliveredSuccess ? (
          <div className="p-6 flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <CheckCircle2 size={48} />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                VERIFIED & DELIVERED
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2">
                Package Successfully Handed Over!
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Order <strong className="font-mono text-slate-800">{order.orderRef}</strong> has been marked as DELIVERED in the ERP.
              </p>
            </div>

            {/* Proof of Delivery Photo Preview */}
            {(deliveredDetails?.deliveryProofPhoto || order.deliveryProofPhoto) && (
              <div className="w-full bg-slate-50 p-3 rounded-2xl border border-slate-200 text-left space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Camera size={12} className="text-blue-600" /> Proof of Delivery (POD) Photo:
                </span>
                <div className="w-full h-40 rounded-xl overflow-hidden border border-slate-300 bg-black flex items-center justify-center">
                  <img
                    src={deliveredDetails?.deliveryProofPhoto || order.deliveryProofPhoto}
                    alt="Proof of Delivery"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Customer Signature Preview */}
            {(deliveredDetails?.customerSignature || order.customerSignature) && (
              <div className="w-full bg-slate-50 p-3 rounded-2xl border border-slate-200 text-left space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <PenTool size={12} className="text-purple-600" /> Customer E-Signature:
                </span>
                <div className="w-full h-20 rounded-xl overflow-hidden border border-slate-300 bg-white flex items-center justify-center p-2">
                  <img
                    src={deliveredDetails?.customerSignature || order.customerSignature}
                    alt="Customer Signature"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
            )}

            <div className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1 text-left">
              <div className="flex justify-between">
                <span className="text-slate-400">Delivered At:</span>
                <span className="font-bold">{deliveredDetails?.deliveredAt ? new Date(deliveredDetails.deliveredAt).toLocaleTimeString() : 'Just now'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Rider:</span>
                <span className="font-bold">{deliveredDetails?.deliveredByRider || riderName || 'In-House Fleet'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment:</span>
                <span className="font-bold text-emerald-600">
                  {requiresPaymentCollection
                    ? (deliveredDetails?.codCollectionMethod || codCollectedMethod) === 'UPI_QR'
                      ? `Paid via UPI QR (${deliveredDetails?.codTransactionId || codTxnId})`
                      : (deliveredDetails?.codCollectionMethod || codCollectedMethod) === 'CARD_POS'
                        ? `Paid via Card POS (${deliveredDetails?.codTransactionId || codTxnId})`
                        : `Cash Collected (${deliveredDetails?.codTransactionId || codTxnId || 'Cash'})`
                    : isReturnOrExchange
                      ? (order.returnType === 'EXCHANGE' ? 'Exchange Swap (No Payment Due)' : 'Return Pickup (No Payment Due)')
                      : 'Prepaid (Verified)'}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate('/rider')}
              className="w-full py-3 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              Back to Assigned Orders
            </button>
          </div>
        ) : (
          /* ACTIVE DELIVERY FORM — PROFESSIONAL STEP-BY-STEP LOGISTICS FLOW */
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">

            {/* TOP SUMMARY: CUSTOMER & PACKAGE DETAILS */}
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {isReturnOrExchange
                      ? (order.returnType === 'EXCHANGE' ? 'Exchange Swap Customer' : 'Pickup From Customer')
                      : 'Deliver To'}
                  </span>
                  <h4 className="text-sm font-black text-slate-900 leading-tight">{order.customerName}</h4>
                </div>
                {order.customerPhone && (
                  <a
                    href={`tel:${order.customerPhone}`}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 text-xs shadow-sm shrink-0"
                  >
                    <Phone size={13} /> Call
                  </a>
                )}
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-200/80">
                <p className="text-xs text-slate-700 leading-snug">
                  {order.shippingAddress}
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.shippingAddress || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                >
                  <MapPin size={12} /> Open in Google Maps
                </a>
              </div>

              <div className="pt-2.5 border-t border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Package Items ({(order.items || []).length})
                  </span>
                  {requiresPaymentCollection ? (
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${isCodPaymentReady
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}>
                      {isCodPaymentReady
                        ? `${isExchangeWithExtraCharge ? 'DIFF PAID' : 'COD PAID'} · ${order.currency} ${payableAmount.toFixed(2)}`
                        : `${isExchangeWithExtraCharge ? 'EXCHANGE DIFF DUE' : 'COD DUE'} · ${order.currency} ${payableAmount.toFixed(2)}`}
                    </span>
                  ) : isReturnOrExchange ? (
                    <span className="text-[10px] font-black uppercase bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-300">
                      {order.returnType === 'EXCHANGE' ? 'EXCHANGE SWAP · NO PAYMENT DUE' : 'RETURN PICKUP · NO PAYMENT DUE'}
                    </span>
                  ) : (
                    <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                      PREPAID · {order.currency} {Number(order.totalAmount || 0).toFixed(2)}
                    </span>
                  )}
                </div>
                {(order.items || []).map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 bg-white p-2 rounded-xl border border-slate-200/80">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {it.image ? (
                        <img src={it.image} alt="item" className="w-full h-full object-cover" />
                      ) : (
                        <Package size={14} className="text-slate-400" />
                      )}
                    </div>
                    <div className="truncate flex-1">
                      <div className="font-bold text-slate-900 truncate">{it.name}</div>
                      <div className="text-[10px] text-slate-500">Qty: {it.quantity} {it.sku ? `· SKU: ${it.sku}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PROFESSIONAL STEP PROGRESS TRACKER BAR */}
            <div className="bg-slate-900 text-white rounded-2xl p-3 flex items-center justify-between gap-2 shadow-sm">
              {requiresPaymentCollection && (
                <>
                  <div className="flex items-center gap-1.5 flex-1">
                    <div className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${isCodPaymentReady ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-slate-950'
                      }`}>
                      {isCodPaymentReady ? <Check size={12} /> : '1'}
                    </div>
                    <div className="truncate">
                      <div className="text-[10px] font-black uppercase tracking-wide leading-tight">Payment</div>
                      <div className="text-[9px] text-slate-400 truncate">
                        {isCodPaymentReady ? 'Collected' : 'Select Mode'}
                      </div>
                    </div>
                  </div>
                  <div className="w-4 h-[1px] bg-slate-700 shrink-0" />
                </>
              )}

              {isPodEnabled && (
                <>
                  <div className="flex items-center gap-1.5 flex-1">
                    <div className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${isProofValid ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'
                      }`}>
                      {isProofValid ? <Check size={12} /> : (requiresPaymentCollection ? '2' : '1')}
                    </div>
                    <div className="truncate">
                      <div className="text-[10px] font-black uppercase tracking-wide leading-tight">Proof (POD)</div>
                      <div className="text-[9px] text-slate-400 truncate">
                        {isProofValid ? 'Captured' : 'Photo / Sign'}
                      </div>
                    </div>
                  </div>
                  <div className="w-4 h-[1px] bg-slate-700 shrink-0" />
                </>
              )}

              <div className="flex items-center gap-1.5 flex-1">
                <div className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${otp.length >= 4 ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
                  }`}>
                  {otp.length >= 4 ? <Check size={12} /> : (requiresPaymentCollection && isPodEnabled ? '3' : (requiresPaymentCollection || isPodEnabled ? '2' : '1'))}
                </div>
                <div className="truncate">
                  <div className="text-[10px] font-black uppercase tracking-wide leading-tight">
                    {isReturnOrExchange ? 'Pickup OTP' : 'Handover'}
                  </div>
                  <div className="text-[9px] text-slate-400 truncate">4-Digit OTP</div>
                </div>
              </div>
            </div>

            {/* ===================================================================== */}
            {/* STEP 1: PAY ON DELIVERY (COD) — STEP-BY-STEP PAYMENT COLLECTION       */}
            {/* ===================================================================== */}
            {requiresPaymentCollection ? (
              <div className={`rounded-2xl border p-4 space-y-3 transition-all ${isCodPaymentReady
                  ? 'border-emerald-300 bg-emerald-50/50'
                  : 'border-slate-200 bg-white shadow-sm'
                }`}>
                {/* Step 1 Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${isCodPaymentReady ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950'
                      }`}>
                      {isCodPaymentReady ? <Check size={12} /> : '1'}
                    </span>
                    <div>
                      <span className="text-[11px] font-black uppercase text-slate-900 tracking-wide block">
                        Step 1: {isExchangeWithExtraCharge ? 'Collect Exchange Price Difference' : 'Collect Pay-on-Delivery'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {isCodPaymentReady
                          ? 'Payment verified and recorded'
                          : codTab
                            ? 'Complete selected payment below'
                            : 'Choose how the customer wants to pay'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold uppercase text-slate-400 block">Amount Due</span>
                    <span className="text-sm font-black text-slate-900">
                      {order.currency} {payableAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* STATE C: COD PAYMENT ALREADY COLLECTED */}
                {isCodPaymentReady ? (
                  <div className="p-3 bg-emerald-600 text-white rounded-xl space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs flex items-center gap-1.5">
                        <CheckCircle2 size={15} />
                        {codCollectedMethod === 'UPI_QR'
                          ? 'Paid via Dynamic UPI QR'
                          : codCollectedMethod === 'CARD_POS'
                            ? 'Paid via Card (M-POS)'
                            : 'Paid via Physical Cash'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCodCollectedMethod('NONE');
                          setCodTxnId('');
                          setCodTab('');
                        }}
                        className="text-[10px] font-bold bg-white/20 hover:bg-white/30 text-white px-2.5 py-0.5 rounded-lg cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                    <div className="text-[11px] font-mono bg-emerald-700/70 px-2.5 py-1 rounded flex items-center justify-between">
                      <span>
                        {codCollectedMethod === 'UPI_QR'
                          ? 'UTR:'
                          : codCollectedMethod === 'CARD_POS'
                            ? 'POS RRN:'
                            : 'Receipt:'}{' '}
                        <strong>{codTxnId}</strong>
                      </span>
                      <span className="font-bold">{order.currency} {payableAmount.toFixed(2)}</span>
                    </div>
                  </div>
                ) : !codTab ? (
                  /* STATE A: CHOOSE PAYMENT METHOD (NO QR OR CARD SHOWN UNTIL SELECTED) */
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Select Customer Payment Option:
                    </span>

                    {/* Option 1: Dynamic UPI QR (Shown if enabled in EcomSettings) */}
                    {order.enableCodUpi !== false && (
                      <button
                        type="button"
                        onClick={() => setCodTab('UPI_QR')}
                        className="w-full p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 bg-slate-50/60 flex items-center justify-between gap-3 transition-all cursor-pointer text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                            <QrCode size={18} />
                          </div>
                          <div>
                            <div className="font-black text-xs text-slate-900">UPI QR Code (Scan & Pay)</div>
                            <div className="text-[10px] text-slate-500">Generate dynamic QR for GPay, PhonePe, Paytm</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white px-2.5 py-1 rounded-lg border border-blue-200 transition-colors shrink-0">
                          Select &rarr;
                        </span>
                      </button>
                    )}

                    {/* Option 2: Card on Delivery M-POS (Shown if enabled in EcomSettings) */}
                    {order.enableCodCard !== false && (
                      <button
                        type="button"
                        onClick={() => setCodTab('CARD_POS')}
                        className="w-full p-3 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/40 bg-slate-50/60 flex items-center justify-between gap-3 transition-all cursor-pointer text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                            <CreditCard size={18} />
                          </div>
                          <div>
                            <div className="font-black text-xs text-slate-900">Card on Delivery (M-POS)</div>
                            <div className="text-[10px] text-slate-500">Swipe or Tap Credit / Debit Card on POS machine</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-purple-600 bg-purple-50 group-hover:bg-purple-600 group-hover:text-white px-2.5 py-1 rounded-lg border border-purple-200 transition-colors shrink-0">
                          Select &rarr;
                        </span>
                      </button>
                    )}

                    {/* Option 3: Physical Cash */}
                    <button
                      type="button"
                      onClick={() => setCodTab('CASH')}
                      className="w-full p-3 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/40 bg-slate-50/60 flex items-center justify-between gap-3 transition-all cursor-pointer text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 group-hover:bg-amber-500 group-hover:text-slate-950 flex items-center justify-center transition-colors shrink-0">
                          <Banknote size={18} />
                        </div>
                        <div>
                          <div className="font-black text-xs text-slate-900">Cash on Delivery</div>
                          <div className="text-[10px] text-slate-500">Collect physical currency notes ({order.currency} {payableAmount.toFixed(2)})</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 group-hover:bg-amber-500 group-hover:text-slate-950 px-2.5 py-1 rounded-lg border border-amber-300 transition-colors shrink-0">
                        Select &rarr;
                      </span>
                    </button>
                  </div>
                ) : (
                  /* STATE B: SELECTED PAYMENT METHOD EXECUTION SCREEN */
                  <div className="space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between bg-slate-100 px-3 py-1.5 rounded-xl">
                      <span className="text-[10px] font-black uppercase text-slate-700">
                        Selected: {codTab === 'UPI_QR' ? 'Dynamic UPI QR' : codTab === 'CARD_POS' ? 'Card (M-POS)' : 'Cash Collection'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCodTab('')}
                        className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        &larr; Change Payment Option
                      </button>
                    </div>

                    {/* VIEW 1: DYNAMIC UPI QR CODE (Shown ONLY when UPI_QR is chosen) */}
                    {codTab === 'UPI_QR' && (
                      <div className="bg-slate-50 rounded-xl p-3.5 border border-blue-200 text-center space-y-3">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 border-b border-slate-200 pb-2">
                          <span>MERCHANT: JTS LOGISTICS</span>
                          <span className="text-blue-600 font-mono">LOCKED: {order.currency} {payableAmount.toFixed(2)}</span>
                        </div>

                        <div className="w-40 h-40 mx-auto bg-white p-2.5 rounded-2xl border-2 border-blue-500 shadow-xs flex items-center justify-center">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                              `upi://pay?pa=jtslogistics@icici&pn=JTS%20Store&tr=${order.orderRef}&am=${payableAmount.toFixed(2)}&cu=INR`
                            )}`}
                            alt="Dynamic UPI QR"
                            className="w-full h-full object-contain"
                          />
                        </div>

                        <div className="text-[10px] text-slate-500">
                          Ask customer to scan with <strong>GPay, PhonePe, Paytm</strong> ({order.orderRef})
                        </div>

                        <button
                          type="button"
                          disabled={isSimulatingPayment}
                          onClick={() => handleSimulateCodPayment('UPI_QR')}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {isSimulatingPayment ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />
                              <span>Verifying UPI Payment...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={14} />
                              <span>Verify / Simulate UPI Payment ({order.currency} {payableAmount.toFixed(2)})</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* VIEW 2: CARD ON DELIVERY M-POS (Shown ONLY when CARD_POS is chosen) */}
                    {codTab === 'CARD_POS' && (
                      <div className="bg-slate-50 rounded-xl p-3.5 border border-purple-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-purple-900 flex items-center gap-1.5">
                            <CreditCard size={14} className="text-purple-600" />
                            M-POS Card Terminal
                          </span>
                          <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold">
                            Terminal Ready
                          </span>
                        </div>

                        <p className="text-[10px] text-slate-600 leading-snug">
                          Swipe, insert, or tap customer Debit/Credit Card on M-POS machine for <strong>{order.currency} {payableAmount.toFixed(2)}</strong>.
                        </p>

                        <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="text-[11px] font-bold text-slate-700">Card Last 4 Digits (Optional):</span>
                          <input
                            type="text"
                            maxLength={4}
                            value={cardLast4}
                            onChange={e => setCardLast4(e.target.value.replace(/\D/g, ''))}
                            placeholder="4242"
                            className="w-20 px-2 py-1 text-center font-mono font-bold text-xs border border-slate-300 rounded-lg"
                          />
                        </div>

                        <button
                          type="button"
                          disabled={isSimulatingPayment}
                          onClick={() => handleSimulateCodPayment('CARD_POS')}
                          className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {isSimulatingPayment ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />
                              <span>Authorizing Card on POS...</span>
                            </>
                          ) : (
                            <>
                              <CreditCard size={14} />
                              <span>Authorize / Simulate Card Swipe ({order.currency} {payableAmount.toFixed(2)})</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* VIEW 3: CASH COLLECTION (Shown ONLY when CASH is chosen) */}
                    {codTab === 'CASH' && (
                      <div className="bg-slate-50 rounded-xl p-3.5 border border-amber-300 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-amber-950 flex items-center gap-1.5">
                            <Banknote size={14} className="text-amber-600" />
                            Collect Physical Cash
                          </span>
                          <span className="text-xs font-black text-amber-900">
                            {order.currency} {payableAmount.toFixed(2)}
                          </span>
                        </div>

                        <p className="text-[10px] text-slate-600 leading-snug">
                          Count the cash notes carefully before confirming. This amount will be added to your <strong>Rider Cash Float</strong> for evening hub deposit.
                        </p>

                        <button
                          type="button"
                          disabled={isSimulatingPayment}
                          onClick={() => handleSimulateCodPayment('CASH')}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Banknote size={14} />
                          <span>Confirm {order.currency} {payableAmount.toFixed(2)} Cash Received</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {/* ===================================================================== */}
            {/* STEP 2: PROOF OF DELIVERY (POD: PHOTO / SIGNATURE)                    */}
            {/* ===================================================================== */}
            {isPodEnabled && (
              <div className={`rounded-2xl border p-4 space-y-3 transition-all ${isProofValid ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-white shadow-sm'
                }`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${isProofValid ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                      }`}>
                      {isProofValid ? <Check size={12} /> : (requiresPaymentCollection ? '2' : '1')}
                    </span>
                    <div>
                      <span className="text-[11px] font-black uppercase text-slate-900 tracking-wide block">
                        Step {requiresPaymentCollection ? '2' : '1'}: {isReturnOrExchange ? 'Proof of Return / Swap (POD)' : 'Proof of Delivery (POD)'} <span className="text-rose-600">*</span>
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {isPhotoEnabled && isSignatureEnabled ? 'Capture Photo or Customer E-Signature' : isPhotoEnabled ? 'Doorstep Photo required' : 'Customer E-Signature required'}
                      </span>
                    </div>
                  </div>
                  {isProofValid && (
                    <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      Captured
                    </span>
                  )}
                </div>

                {/* Mode Toggle Tabs */}
                {isPhotoEnabled && isSignatureEnabled && (
                  <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setProofMode('photo')}
                      className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${proofMode === 'photo'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                    >
                      <Camera size={14} />
                      <span>Photo POD</span>
                      {photoProof && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                    </button>

                    <button
                      type="button"
                      onClick={() => setProofMode('signature')}
                      className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${proofMode === 'signature'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                    >
                      <PenTool size={14} />
                      <span>Signature</span>
                      {customerSignature && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                    </button>

                    <button
                      type="button"
                      onClick={() => setProofMode('both')}
                      className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${proofMode === 'both'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                      title="Capture Both Photo and Signature"
                    >
                      <Sparkles size={13} />
                      <span>Both</span>
                    </button>
                  </div>
                )}

                {/* Hidden File Inputs for Camera vs Gallery */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleCameraCapture}
                  className="hidden"
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCameraCapture}
                  className="hidden"
                />

                {/* A. PHOTO PROOF SECTION */}
                {isPhotoEnabled && (proofMode === 'photo' || proofMode === 'both' || !isSignatureEnabled) && (
                  <div className="bg-blue-50/60 rounded-2xl p-4 border border-blue-200 space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-blue-900 tracking-wide flex items-center gap-1.5">
                        <Camera size={14} className="text-blue-600" />
                        Doorstep Photo Proof (POD)
                        <span className="text-rose-600">*</span>
                      </span>
                      {photoProof && (
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check size={11} /> Photo Ready
                        </span>
                      )}
                    </div>

                    {photoProof ? (
                      /* Captured Image Preview with Replace / Remove */
                      <div className="relative rounded-xl overflow-hidden border-2 border-blue-400 shadow-sm bg-black">
                        <img src={photoProof} alt="Captured POD" className="w-full h-48 object-cover" />
                        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                          📍 Doorstep POD · {new Date().toLocaleTimeString()}
                        </div>
                        <div className="absolute top-2 right-2 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-lg text-[10px] font-bold shadow flex items-center gap-1 cursor-pointer"
                          >
                            <Camera size={12} /> Retake
                          </button>
                          <button
                            type="button"
                            onClick={() => setPhotoProof('')}
                            className="bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-lg shadow cursor-pointer"
                            title="Remove Photo"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Two Clear Options: Snap Camera OR Upload from Gallery */
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-white rounded-xl p-3.5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all shadow-xs active:scale-98 group"
                        >
                          <div className="w-10 h-10 rounded-full bg-blue-100 group-hover:bg-blue-200 text-blue-600 flex items-center justify-center transition-colors">
                            <Camera size={20} />
                          </div>
                          <div className="text-center">
                            <span className="text-xs font-black text-blue-700 block">Take Photo</span>
                            <span className="text-[10px] text-slate-500">Snap with camera</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => galleryInputRef.current?.click()}
                          className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-white rounded-xl p-3.5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all shadow-xs active:scale-98 group"
                        >
                          <div className="w-10 h-10 rounded-full bg-indigo-100 group-hover:bg-indigo-200 text-indigo-600 flex items-center justify-center transition-colors">
                            <Upload size={20} />
                          </div>
                          <div className="text-center">
                            <span className="text-xs font-black text-indigo-700 block">Upload File</span>
                            <span className="text-[10px] text-slate-500">Pick from gallery</span>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* B. CUSTOMER SIGNATURE SECTION WITH FULL-SCREEN MODE */}
                {isSignatureEnabled && (proofMode === 'signature' || proofMode === 'both' || !isPhotoEnabled) && (
                  <div className="bg-purple-50/60 rounded-2xl p-4 border border-purple-200 space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-purple-900 tracking-wide flex items-center gap-1.5">
                        <PenTool size={14} className="text-purple-600" />
                        Customer E-Signature
                        <span className="text-rose-600">*</span>
                      </span>
                      {customerSignature && (
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check size={11} /> Signed
                        </span>
                      )}
                    </div>

                    {customerSignature ? (
                      /* Captured Signature Preview with Re-sign / Clear */
                      <div className="relative bg-white rounded-xl border-2 border-purple-300 p-2 shadow-xs space-y-2">
                        <div className="w-full h-32 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200">
                          <img src={customerSignature} alt="Customer Signature" className="max-h-full max-w-full object-contain" />
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] font-bold text-slate-500">Customer Verified Signature</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setIsSignatureModalOpen(true)}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Maximize2 size={11} /> Re-Sign (Full Screen)
                            </button>
                            <button
                              type="button"
                              onClick={clearMainSignature}
                              className="text-[10px] text-rose-600 hover:text-rose-700 font-bold px-2 py-1 rounded-lg hover:bg-rose-50 flex items-center gap-0.5 cursor-pointer"
                            >
                              <RotateCcw size={11} /> Clear
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Tap to Open Full Screen Signature Pad */
                      <div
                        onClick={() => setIsSignatureModalOpen(true)}
                        className="border-2 border-dashed border-purple-300 hover:border-purple-500 bg-white rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99] transition-all group"
                      >
                        <div className="w-12 h-12 rounded-full bg-purple-100 group-hover:bg-purple-200 text-purple-700 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                          <PenTool size={22} />
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-black text-purple-900 block flex items-center justify-center gap-1.5">
                            <Maximize2 size={14} className="text-purple-600" />
                            Tap to Sign in Full Screen
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Opens full-width screen for easy finger signature
                          </span>
                        </div>
                        <span className="text-[9px] font-extrabold text-purple-700 bg-purple-100/70 border border-purple-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Full Screen Canvas
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ===================================================================== */}
            {/* STEP 3: CUSTOMER DELIVERY OTP INPUT & HANDOVER                        */}
            {/* ===================================================================== */}
            <div className={`rounded-2xl border p-4 space-y-3 transition-all ${otp.length >= 4 ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-white shadow-sm'
              }`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${otp.length >= 4 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'
                    }`}>
                    {otp.length >= 4 ? <Check size={12} /> : (requiresPaymentCollection && isPodEnabled ? '3' : (requiresPaymentCollection || isPodEnabled ? '2' : '1'))}
                  </span>
                  <div>
                    <span className="text-[11px] font-black uppercase text-slate-900 tracking-wide block">
                      Step {requiresPaymentCollection && isPodEnabled ? '3' : (requiresPaymentCollection || isPodEnabled ? '2' : '1')}: {isReturnOrExchange ? 'Enter Customer Pickup / Swap OTP' : 'Enter Customer Delivery OTP'} <span className="text-rose-600">*</span>
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Ask customer for the 4-digit OTP from their order screen
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400">4 Digits</span>
              </div>

              <div className="space-y-1.5">
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • •"
                  className="w-full text-center tracking-[0.5em] font-mono text-2xl font-black px-4 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-blue-600 focus:bg-white rounded-xl outline-none transition-all"
                />
              </div>

              {/* Optional Rider Notes */}
              <div className="pt-1">
                <input
                  type="text"
                  placeholder="Rider notes (optional — e.g. Left with security, ring bell)"
                  value={deliveryNotes}
                  onChange={e => setDeliveryNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {/* FINAL ACTION: CONFIRM & DELIVER BUTTON */}
            <div className="pt-1 space-y-3">
              {requiresPaymentCollection && !isCodPaymentReady && (
                <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-[11px] font-bold text-amber-900 text-center">
                  Complete Step 1 (Payment Collection) above to unlock confirmation.
                </div>
              )}
              <button
                type="button"
                onClick={handleDeliverySubmit}
                disabled={isSubmitting || !isProofValid || !otp || !isCodPaymentReady}
                className={`w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${isProofValid && otp && isCodPaymentReady
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    Verifying & Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    {isReturnOrExchange
                      ? (order.returnType === 'EXCHANGE' ? 'Confirm Exchange Swap' : 'Confirm Return Pickup')
                      : 'Confirm & Deliver Package'}
                  </>
                )}
              </button>

              {/* 7. RIDER DOORSTEP CANCELLATION / CUSTOMER REFUSED (RTO) */}
              {!showCancelForm ? (
                <button
                  type="button"
                  onClick={() => setShowCancelForm(true)}
                  className="w-full py-2.5 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-700 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <AlertCircle size={13} />
                  Customer Refused / Cancel Delivery at Doorstep (RTO)
                </button>
              ) : (
                <div className="p-3.5 rounded-2xl border border-rose-300 bg-rose-50/80 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-rose-900 uppercase text-[11px] flex items-center gap-1">
                      <AlertCircle size={13} className="text-rose-600" />
                      Cancel Order at Doorstep (RTO)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCancelForm(false)}
                      className="text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-rose-800 block mb-1">Select Cancellation / Refusal Reason</label>
                    <select
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-rose-300 rounded-xl text-xs font-semibold text-slate-900"
                    >
                      <option value="Customer Refused Delivery at Doorstep">Customer Refused Delivery at Doorstep</option>
                      <option value="Customer Refused to Pay COD Cash">Customer Refused to Pay COD Cash</option>
                      <option value="Customer Unreachable / Phone Switched Off">Customer Unreachable / Phone Switched Off</option>
                      <option value="Wrong or Incomplete Address">Wrong or Incomplete Address</option>
                      <option value="Customer Cancelled Order on Arrival">Customer Cancelled Order on Arrival</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    placeholder="Additional remarks (optional)..."
                    value={cancelNotes}
                    onChange={e => setCancelNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg text-xs text-slate-800"
                  />

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCancelForm(false)}
                      className="flex-1 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={handleDoorstepCancel}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs shadow cursor-pointer"
                    >
                      {isCancelling ? 'Cancelling...' : 'Confirm Cancel (RTO)'}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* FULL SCREEN SIGNATURE MODAL */}
        {isSignatureModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col select-none touch-none animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-600/30 border border-purple-500/40 text-purple-300 flex items-center justify-center">
                  <PenTool size={16} />
                </div>
                <div>
                  <div className="text-xs font-black text-white tracking-wide uppercase flex items-center gap-1.5">
                    <span>Customer E-Signature</span>
                    <span className="text-[10px] bg-slate-800 text-purple-300 px-1.5 py-0.2 rounded font-mono">
                      {order?.orderRef}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Ask customer to sign with finger inside the canvas
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearFullSignature}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                  title="Clear Canvas"
                >
                  <RotateCcw size={13} />
                  <span>Clear</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSignatureModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Canvas Drawing Area */}
            <div className="flex-1 p-3 sm:p-4 flex flex-col justify-center items-center bg-slate-900/80 overflow-hidden relative">
              <div className="w-full h-full max-w-4xl bg-white rounded-2xl shadow-2xl relative overflow-hidden flex flex-col border-2 border-purple-500/40">
                <canvas
                  ref={fullCanvasRef}
                  onMouseDown={startFullDrawing}
                  onMouseMove={drawFull}
                  onMouseUp={stopFullDrawing}
                  onTouchStart={startFullDrawing}
                  onTouchMove={drawFull}
                  onTouchEnd={stopFullDrawing}
                  className="w-full h-full touch-none cursor-crosshair bg-white block"
                  style={{ touchAction: 'none' }}
                />

                {/* Signature Guideline Line */}
                <div className="absolute bottom-12 inset-x-8 border-b-2 border-dashed border-slate-300 pointer-events-none flex justify-between items-center text-[11px] font-bold text-slate-400 uppercase tracking-widest pt-1">
                  <span>✕ Customer Signature</span>
                  <span>Sign Above This Line</span>
                </div>

                {!fullHasSigned && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-300 text-sm sm:text-base font-bold italic">
                    ✍️ Draw signature here with finger
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-slate-900 border-t border-slate-800 p-3 sm:p-4 flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsSignatureModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all text-center cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!fullHasSigned}
                onClick={saveFullSignature}
                className={`flex-2 py-3 px-6 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${fullHasSigned
                    ? 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer active:scale-98 shadow-purple-600/30'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
              >
                <Check size={16} />
                <span>Confirm Signature</span>
              </button>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-400 shrink-0">
          JTS Logistics Delivery Portal · Secure Verification
        </div>

      </div>
    </div>
  );
};

export default RiderDeliveryVerify;

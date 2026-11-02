import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Truck, Package, CheckCircle2, Clock, MapPin,
  ExternalLink, Search, AlertCircle, ArrowRight, ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';

const BASE_MILESTONES = [
  { code: 'ORDER_PLACED', label: 'Order Placed', desc: 'Order booked and inventory reserved' },
  { code: 'INTERNAL_PROCESSING', label: 'Processing', desc: 'Picking stock at fulfillment location' },
  { code: 'PACKED', label: 'Packed & Staged', desc: 'Securely packaged for handover' },
  { code: 'SHIPPED', label: 'Dispatched', desc: 'In transit with logistics courier' },
  { code: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Courier out for doorstep delivery' },
  { code: 'DELIVERED', label: 'Delivered', desc: 'Package delivered successfully' }
];

export const TrackOrderPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryToken = searchParams.get('token') || '';
  const queryOrderId = searchParams.get('orderId') || '';
  const isSuccess = searchParams.get('success') === '1';

  const [inputOrderId, setInputOrderId] = useState(queryOrderId);
  const [inputEmail, setInputEmail] = useState('');
  const { formatCurrency } = useStoreSettings();
  const { isAuthenticated, customer } = useCustomerAuth();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showManualSearch, setShowManualSearch] = useState(false);

  useEffect(() => {
    if (queryToken) {
      fetchTrackingByToken(queryToken);
    } else if (queryOrderId) {
      setInputOrderId(queryOrderId);
    }
  }, [queryToken, queryOrderId]);

  const fetchTrackingByToken = async (token) => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await axios.get(`/api/v1/ecommerce/orders/track/${encodeURIComponent(token)}`);
      setOrder(data.order);
      setItems(data.items || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Tracking link is invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrackingByDetails = async (id, email) => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await axios.post('/api/v1/ecommerce/orders/track', { orderId: id, email });
      setOrder(data.order);
      setItems(data.items || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Order not found. Check the order ID and email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!inputOrderId.trim() || !inputEmail.trim()) return;
    setSearchParams({ orderId: inputOrderId.trim() });
    fetchTrackingByDetails(inputOrderId.trim(), inputEmail.trim());
  };

  // Determine current active step index
  const getCurrentStepIndex = () => {
    if (!order) return 0;
    const code = order.ecomStatusCode || order.status;
    if (code === 'DELIVERED') return 5;
    if (code === 'OUT_FOR_DELIVERY') return 4;
    if (code === 'SHIPPED') return 3;
    if (code === 'PACKED') return 2;
    if (code === 'INTERNAL_PROCESSING' || code === 'CONFIRMED') return 1;
    return 0; // ORDER_PLACED or PENDING
  };

  const currentStep = getCurrentStepIndex();
  const isCancelled = (order?.ecomStatusCode || order?.status) === 'CANCELLED';

  return (
    <div className="w-[96%] mx-auto py-6 sm:py-8 space-y-6 sm:space-y-8">

      {/* Success banner if redirected from checkout */}
      {isSuccess && (
        <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 rounded-3xl text-emerald-900 dark:text-emerald-300 flex items-start gap-4 shadow-sm animate-fade-in">
          <CheckCircle2 size={28} className="shrink-0 text-emerald-600 mt-1" />
          <div className="space-y-1">
            <h3 className="text-lg font-black">Order Booked Successfully!</h3>
            <p className="text-xs text-emerald-800 dark:text-emerald-400">
              An order confirmation email with your direct tracking link has been sent to your email address. You can also bookmark this tracking page.
            </p>
            {searchParams.get('payment') === 'SIMULATED' && (
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Demo payment simulated. No money was collected.</p>
            )}
          </div>
        </div>
      )}

      {/* When order is already loaded: Clean header with quick links */}
      {order && !isLoading && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Live Order Tracking</h1>
            <p className="text-xs text-slate-500">Live fulfillment and delivery updates</p>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <Link
                to="/account/orders"
                className="px-3.5 py-2 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-blue-200 dark:border-blue-800"
              >
                <Package size={14} /> My Orders
              </Link>
            )}
            <button
              type="button"
              onClick={() => setShowManualSearch(prev => !prev)}
              className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Search size={13} /> {showManualSearch ? 'Hide Search' : 'Track Another Order'}
            </button>
          </div>
        </div>
      )}

      {/* Manual Search Form: shown when no order loaded OR explicitly requested */}
      {(!order || showManualSearch) && !isLoading && (
        <div className="text-center space-y-3 bg-slate-50/80 dark:bg-slate-800/40 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {order ? 'Track Another Order' : 'Live Order Tracking'}
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Use the secure link from your order email, or enter the full order ID and checkout email.
          </p>

          <form onSubmit={handleSearch} className="max-w-md mx-auto flex flex-col sm:flex-row gap-2 pt-2">
            <input
              type="text"
              required
              placeholder="Full order ID"
              value={inputOrderId}
              onChange={e => setInputOrderId(e.target.value)}
              className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email"
              required
              placeholder="Checkout email"
              value={inputEmail}
              onChange={e => setInputEmail(e.target.value)}
              className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Search size={14} /> Track
            </button>
          </form>

          {isAuthenticated && !order && (
            <p className="text-xs text-slate-500 pt-1">
              Signed in as <strong className="text-slate-800 dark:text-slate-200">{customer?.firstName || customer?.name || 'Customer'}</strong>?{' '}
              <Link to="/account/orders" className="text-blue-600 font-bold hover:underline">
                View all your orders in My Orders
              </Link>
            </p>
          )}
        </div>
      )}

      {isLoading && (
        <div className="p-16 text-center text-slate-500 font-medium animate-pulse">Loading tracking details...</div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-xs flex items-center justify-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {order && !isLoading && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden space-y-8 p-6 sm:p-8 animate-fade-in">

          {/* Order Header Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-blue-600">WEB-{order._id.slice(-6).toUpperCase()}</span>
                <span
                  className="px-3 py-0.5 rounded-full text-xs font-black uppercase text-white shadow-xs"
                  style={{ backgroundColor: order.ecomStatusId?.color || '#3b82f6' }}
                >
                  {order.ecomStatusId?.name || order.ecomStatusCode || order.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Booked on {format(new Date(order.createdAt), 'PPP p')}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block">Total Amount</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(order.totalAmount)}</div>
              <span className="text-[11px] text-slate-500 font-semibold">{order.paymentMethod} · {order.paymentStatus}</span>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          {!isCancelled ? (
            <div className="py-4">
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 relative">
                {BASE_MILESTONES.map((m, idx) => {
                  const isPassed = idx <= currentStep;
                  const isCurrent = idx === currentStep;

                  return (
                    <div key={m.code} className="flex flex-col items-center text-center space-y-2 relative z-10">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black transition-all ${isCurrent
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/60 shadow-lg'
                          : isPassed
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}>
                        {isPassed ? <CheckCircle2 size={16} /> : idx + 1}
                      </div>

                      <div className="space-y-0.5">
                        <strong className={`text-xs block ${isCurrent ? 'text-blue-600 font-black' : isPassed ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                          {m.label}
                        </strong>
                        <span className="text-[10px] text-slate-400 line-clamp-2">{m.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-xs text-center font-bold">
              This order has been cancelled: {order.cancellationReason || 'Cancelled upon customer request.'}
            </div>
          )}

          {/* Logistics & Carrier Box */}
          <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <Truck size={16} className="text-blue-600" />
                <span>Courier Partner: {order.carrier || 'Pending Assignment'}</span>
              </div>
              <div className="text-slate-500">
                AWB / Tracking Number: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{order.trackingNumber || 'Awaiting courier dispatch'}</span>
              </div>
            </div>

            {order.trackingUrl && (
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all"
              >
                Track Live on Courier Partner <ExternalLink size={13} />
              </a>
            )}
          </div>

          {/* Doorstep Delivery Handover OTP Banner */}
          {order.deliveryOtp && !order.deliveredAt && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
              <div className="space-y-0.5 text-xs text-center sm:text-left">
                <div className="font-black text-blue-900 dark:text-blue-200 flex items-center justify-center sm:justify-start gap-1.5">
                  <ShieldCheck size={16} className="text-blue-600" />
                  Doorstep Delivery Handover OTP
                </div>
                <p className="text-[11px] text-blue-700 dark:text-blue-300">
                  Share this 4-digit code with the rider when they arrive at your doorstep:
                </p>
              </div>
              <div className="px-5 py-2 bg-white dark:bg-slate-900 border-2 border-blue-400 rounded-xl font-mono text-xl font-black tracking-widest text-blue-600 shadow-sm shrink-0">
                {order.deliveryOtp}
              </div>
            </div>
          )}

          {/* Proof of Delivery (POD) Photo Banner */}
          {order.deliveryProofPhoto && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3 text-xs animate-fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <div>
                  <strong className="text-emerald-900 dark:text-emerald-200 block">Delivered with Verified Proof (POD)</strong>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300">Package handed over at doorstep by rider</span>
                </div>
              </div>
              <a
                href={order.deliveryProofPhoto}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-emerald-300 text-emerald-700 dark:text-emerald-300 rounded-lg font-bold shadow-2xs hover:bg-emerald-50 text-[11px] shrink-0"
              >
                View Photo Proof
              </a>
            </div>
          )}

          {/* Shipping Address & Ordered Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-xs">
            {/* Delivery address */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <MapPin size={13} className="text-blue-600" /> Delivery Address
              </span>
              <div className="font-bold text-slate-900 dark:text-white">{order.customerName}</div>
              <p className="text-slate-500 leading-relaxed">{order.shippingAddress || 'Address details are available in the secure tracking link sent by email.'}</p>
              <div className="text-slate-500">Email: {order.customerEmail}</div>
            </div>

            {/* Line items */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <Package size={13} className="text-blue-600" /> Order Items ({items.length})
              </span>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-40 overflow-y-auto pr-1">
                {items.map(item => (
                  <div key={item._id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{item.productId?.name || item.name}</div>
                      <div className="text-[11px] text-slate-400">Qty: {item.quantity}</div>
                    </div>
                    <span className="font-black text-slate-900 dark:text-white">{formatCurrency(item.subTotal)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

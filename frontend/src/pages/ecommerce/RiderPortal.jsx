import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Truck, Package, Phone, MapPin, CheckCircle2, 
  Clock, Search, Camera, ShieldCheck, ChevronRight,
  ChevronDown, ChevronUp, LogOut, RefreshCw, AlertCircle, 
  ArrowRight, Navigation, Banknote, Layers
} from 'lucide-react';

export const RiderPortal = () => {
  const navigate = useNavigate();

  // Rider identification
  const [driverName, setDriverName] = useState(() => localStorage.getItem('rider_driver_name') || '');
  const [driverPhone, setDriverPhone] = useState(() => localStorage.getItem('rider_driver_phone') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(localStorage.getItem('rider_driver_name') || localStorage.getItem('rider_driver_phone')));

  // Orders Data
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING' | 'RETURNS' | 'COMPLETED'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrders, setExpandedOrders] = useState({});

  useEffect(() => {
    if (isLoggedIn) {
      fetchAssignedOrders();
    }
  }, [isLoggedIn, driverPhone, driverName]);

  const fetchAssignedOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/v1/ecommerce/rider/assigned-orders', {
        params: {
          phone: driverPhone || undefined,
          driverName: driverName || undefined
        }
      });
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error('Failed to load rider orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!driverName.trim() && !driverPhone.trim()) {
      alert('Please enter your Driver Name or Mobile Number to view assigned deliveries.');
      return;
    }
    localStorage.setItem('rider_driver_name', driverName.trim());
    localStorage.setItem('rider_driver_phone', driverPhone.trim());
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('rider_driver_name');
    localStorage.removeItem('rider_driver_phone');
    setDriverName('');
    setDriverPhone('');
    setIsLoggedIn(false);
    setOrders([]);
  };

  const toggleExpandOrder = (orderId) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // Filter orders by tab & search
  const isReturnOrExchangeOrder = (o) =>
    (o.returnStatus && !['NONE', 'REJECTED', 'COMPLETED'].includes(o.returnStatus)) ||
    String(o.status || '').toUpperCase().includes('RETURN') ||
    String(o.status || '').toUpperCase().includes('EXCHANGE');

  const returnPickups = orders.filter(o => isReturnOrExchangeOrder(o));
  const pendingDeliveries = orders.filter(o => !o.isDelivered && !o.deliveredAt && !isReturnOrExchangeOrder(o));
  const completedToday = orders.filter(o => (o.isDelivered || o.deliveredAt) && !isReturnOrExchangeOrder(o));

  // COD Cash & Digital Reconciliation Calculations
  const pendingCodTotal = pendingDeliveries
    .filter(o => o.isCOD && (!o.codCollectionMethod || o.codCollectionMethod === 'NONE'))
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  const collectedCashInHand = orders
    .filter(o => o.codCollectionMethod === 'CASH' && o.codSettlementStatus !== 'SETTLED_TO_HUB')
    .reduce((sum, o) => sum + Number(o.codCollectedAmount || o.totalAmount || 0), 0);

  const settledCashAtHub = orders
    .filter(o => o.codCollectionMethod === 'CASH' && o.codSettlementStatus === 'SETTLED_TO_HUB')
    .reduce((sum, o) => sum + Number(o.codCollectedAmount || o.totalAmount || 0), 0);

  const collectedDigitalTotal = orders
    .filter(o => o.codCollectionMethod === 'UPI_QR' || o.codCollectionMethod === 'CARD_POS')
    .reduce((sum, o) => sum + Number(o.codCollectedAmount || o.totalAmount || 0), 0);

  let currentList = [];
  if (activeTab === 'PENDING') currentList = pendingDeliveries;
  else if (activeTab === 'RETURNS') currentList = returnPickups;
  else if (activeTab === 'COMPLETED') currentList = completedToday;

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    currentList = currentList.filter(o => 
      o.orderRef?.toLowerCase().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.customerPhone?.toLowerCase().includes(q) ||
      o.shippingAddress?.toLowerCase().includes(q)
    );
  }

  // LOGIN SCREEN (Simple, mobile-friendly restricted rider login)
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 text-white">
        <div className="w-full max-w-sm bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-700 space-y-5">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
              <Truck size={32} className="text-white" />
            </div>
            <h2 className="text-lg font-black tracking-wide uppercase">JTS Rider Dispatch</h2>
            <p className="text-xs text-slate-400">Doorstep Delivery & Photo POD Portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Driver / Rider Name
              </label>
              <input
                type="text"
                placeholder="e.g. Mohan Kumar or Van-01"
                value={driverName}
                onChange={e => setDriverName(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Mobile Number
              </label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={driverPhone}
                onChange={e => setDriverPhone(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 text-xs transition-all cursor-pointer mt-2"
            >
              Sign In to Assigned Runs
            </button>
          </form>

          <p className="text-[10px] text-slate-500 text-center leading-relaxed">
            Restricted Delivery Portal. Only assigned runs and doorstep OTP verification features are accessible.
          </p>
        </div>
      </div>
    );
  }

  // LOGGED IN RIDER PORTAL SCREEN
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex justify-center py-0 sm:py-6">
      <div className="w-full max-w-md bg-white shadow-2xl sm:rounded-3xl min-h-screen sm:min-h-0 flex flex-col overflow-hidden">
        
        {/* HEADER BAR */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black">
              <Truck size={18} />
            </div>
            <div>
              <div className="text-xs font-black tracking-wide flex items-center gap-1.5">
                <span>{driverName || driverPhone || 'Rider Fleet'}</span>
              </div>
              <p className="text-[10px] text-slate-400">
                {driverPhone ? `Tel: ${driverPhone}` : 'Assigned In-House Runs'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAssignedOrders}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              title="Refresh Runs"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-slate-800 cursor-pointer"
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* METRICS SUMMARY CARDS */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-3 gap-2 text-center shrink-0">
          <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Pending Stops</span>
            <span className="text-base font-black text-blue-600">{pendingDeliveries.length}</span>
          </div>
          <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Returns</span>
            <span className="text-base font-black text-purple-600">{returnPickups.length}</span>
          </div>
          <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Delivered</span>
            <span className="text-base font-black text-emerald-600">{completedToday.length}</span>
          </div>
        </div>

        {/* COD CASH & DIGITAL RECONCILIATION TRACKER */}
        <div className="mx-3 mt-2.5 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2 text-xs shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-900 flex items-center justify-center font-black">
                <Banknote size={16} />
              </div>
              <div>
                <div className="text-[10px] uppercase font-black text-amber-800 tracking-wider">COD Hub Reconciliation</div>
                <div className="text-xs font-black text-amber-950">
                  Pending COD: ₹{pendingCodTotal.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-amber-800 font-bold block">Cash in Hand (Hub Deposit)</span>
              <span className="text-xs font-black text-amber-950">
                ₹{collectedCashInHand.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-[11px]">
            <span className="font-bold text-emerald-800">Digital (UPI / Card):</span>
            <span className="font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
              ₹{collectedDigitalTotal.toLocaleString('en-IN')} (Bank)
            </span>
          </div>

          {settledCashAtHub > 0 && (
            <div className="pt-1 flex items-center justify-between text-[11px]">
              <span className="font-bold text-blue-800">Cash Handed Over to Hub:</span>
              <span className="font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md border border-blue-300">
                ₹{settledCashAtHub.toLocaleString('en-IN')} (Settled ✓)
              </span>
            </div>
          )}
        </div>

        {/* SEARCH BAR */}
        <div className="p-3 bg-white border-b border-slate-200 shrink-0 mt-1">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by order ref, customer, phone, address..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex border-b border-slate-200 bg-white shrink-0 text-xs font-bold">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'PENDING'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Deliveries ({pendingDeliveries.length})
          </button>
          <button
            onClick={() => setActiveTab('RETURNS')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'RETURNS'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Pickups ({returnPickups.length})
          </button>
          <button
            onClick={() => setActiveTab('COMPLETED')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'COMPLETED'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Delivered ({completedToday.length})
          </button>
        </div>

        {/* ORDER LIST CONTAINER */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
              Loading deliveries run sheet...
            </div>
          ) : currentList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Package size={36} className="mx-auto text-slate-300" />
              <p className="text-xs font-bold">No orders found in this section</p>
            </div>
          ) : (
            currentList.map((order, index) => (
              <div
                key={order._id}
                className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs hover:border-blue-400 transition-all space-y-3"
              >
                {/* Order Top Line with Stop Numbering */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {activeTab === 'PENDING' && (
                      <span className="text-[10px] font-black uppercase bg-blue-600 text-white px-2 py-0.5 rounded-md shadow-2xs">
                        STOP #{index + 1}
                      </span>
                    )}

                    <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                      {order.orderRef}
                    </span>

                    {isReturnOrExchangeOrder(order) ? (
                      order.returnType === 'EXCHANGE' ? (
                        Number(order.exchangePriceDifference || 0) > 0 ? (
                          <span className="text-[10px] font-black uppercase bg-purple-100 text-purple-900 px-2 py-0.5 rounded border border-purple-300">
                            EXCHANGE · COLLECT DIFF: {order.currency} {order.exchangePriceDifference}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase bg-purple-100 text-purple-900 px-2 py-0.5 rounded border border-purple-300">
                            EXCHANGE PICKUP (NO CASH DUE)
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] font-black uppercase bg-rose-100 text-rose-900 px-2 py-0.5 rounded border border-rose-300">
                          RETURN PICKUP (NO CASH DUE)
                        </span>
                      )
                    ) : order.isCOD ? (
                      order.codCollectionMethod && order.codCollectionMethod !== 'NONE' ? (
                        <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded border border-emerald-300">
                          COD PAID ({order.codCollectionMethod.replace('_', ' ')}): {order.currency} {order.totalAmount}
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                          COD DUE: {order.currency} {order.totalAmount}
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded border border-emerald-300">
                        PREPAID
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-400 font-medium">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Customer Info & Direct Call */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 flex-1">
                    <h4 className="text-xs font-black text-slate-900">{order.customerName}</h4>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      {order.shippingAddress}
                    </p>
                  </div>
                  {order.customerPhone && (
                    <a
                      href={`tel:${order.customerPhone}`}
                      className="p-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl shrink-0 shadow-sm flex items-center justify-center cursor-pointer"
                      title="Call Customer Directly"
                    >
                      <Phone size={14} />
                    </a>
                  )}
                </div>

                {/* Turn-by-Turn GPS Google Maps Navigation */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.shippingAddress || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 font-bold flex items-center gap-1.5 hover:underline bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
                  >
                    <Navigation size={12} className="text-blue-600 fill-blue-600" />
                    <span>Navigate (Google Maps)</span>
                  </a>

                  {order.isDelivered ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 size={13} /> Delivered
                    </span>
                  ) : (
                    <span className="text-slate-500 font-medium text-[10px] flex items-center gap-1">
                      <ShieldCheck size={12} className="text-blue-600" />
                      4-Digit OTP Required
                    </span>
                  )}
                </div>

                {/* Expandable Parcel Products & Contents */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleExpandOrder(order._id)}
                    className="w-full px-3 py-2 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Package size={13} className="text-blue-600" />
                      <span>Parcel Contents ({order.items?.length || 1} {order.items?.length === 1 ? 'item' : 'items'})</span>
                    </span>
                    <span className="text-[11px] text-blue-600 flex items-center gap-1">
                      {expandedOrders[order._id] ? (
                        <><span>Hide Details</span><ChevronUp size={13} /></>
                      ) : (
                        <><span>View Products</span><ChevronDown size={13} /></>
                      )}
                    </span>
                  </button>

                  {expandedOrders[order._id] && (
                    <div className="p-2.5 pt-0 border-t border-slate-200 space-y-2 bg-white">
                      {(order.items || []).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 pt-2 border-b border-slate-100 last:border-b-0 pb-2">
                          {/* Product Image */}
                          <div className="w-11 h-11 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package size={16} className="text-slate-400" />
                            )}
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0 text-xs">
                            <div className="font-bold text-slate-800 truncate">{item.name}</div>
                            {item.sku && <div className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</div>}
                            {item.attributes && Object.keys(item.attributes).length > 0 && (
                              <div className="text-[10px] text-purple-700 font-medium">
                                {Object.entries(item.attributes).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                              </div>
                            )}
                            <div className="text-[11px] text-slate-600 font-semibold mt-0.5">
                              Qty: <span className="font-black text-slate-900">{item.quantity}</span> × {order.currency} {item.price}
                            </div>
                          </div>

                          {/* Subtotal */}
                          <div className="text-right text-xs font-black text-slate-900 shrink-0">
                            {order.currency} {item.subTotal || ((item.price || 0) * (item.quantity || 1))}
                          </div>
                        </div>
                      ))}

                      {/* Return Pickup vs COD vs Prepaid Handover Instruction */}
                      <div className={`p-2 rounded-lg text-[11px] font-bold ${
                        isReturnOrExchangeOrder(order)
                          ? 'bg-purple-50 text-purple-900 border border-purple-200'
                          : order.isCOD 
                            ? 'bg-amber-50 text-amber-900 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      }`}>
                        {isReturnOrExchangeOrder(order) ? (
                          <span>🔄 Reverse Pickup / Swap: <strong>Do NOT collect original COD amount</strong>. Verify 6-digit Pickup OTP with customer.</span>
                        ) : order.isCOD ? (
                          <span>⚠️ Collect <strong>{order.currency} {order.totalAmount}</strong> from customer before asking for OTP.</span>
                        ) : (
                          <span>✅ Prepaid Online: <strong>Collect ₹0</strong>. Directly enter OTP and handover parcel.</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Primary Action Button */}
                {!order.isDelivered ? (
                  <button
                    onClick={() => navigate(`/rider/verify/${order._id}`)}
                    className={`w-full py-2.5 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      isReturnOrExchangeOrder(order)
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isReturnOrExchangeOrder(order) ? (
                      <>
                        <ShieldCheck size={14} />
                        <span>Verify {order.returnType === 'EXCHANGE' ? 'Exchange Swap' : 'Return Pickup'} OTP</span>
                      </>
                    ) : order.requireDeliveryPod === false ? (
                      <>
                        <ShieldCheck size={14} />
                        <span>Enter OTP & Confirm Delivery</span>
                      </>
                    ) : (
                      <>
                        <Camera size={14} />
                        <span>Enter OTP & Take Photo (POD)</span>
                      </>
                    )}
                    <ArrowRight size={13} />
                  </button>
                ) : (
                  <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Delivered At: {new Date(order.deliveredAt).toLocaleTimeString()}</span>
                    {order.deliveryProofPhoto && (
                      <span className="text-emerald-700 font-bold">📸 Photo Recorded</span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* BOTTOM QUICK FOOTER */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-500 shrink-0">
          JTS In-House Rider Delivery Portal · Live Route Run Sheet
        </div>

      </div>
    </div>
  );
};

export default RiderPortal;

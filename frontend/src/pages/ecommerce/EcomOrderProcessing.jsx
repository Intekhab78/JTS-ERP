import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { FloatingMenu } from '../../components/common/FloatingMenu';
import {
  Globe, Package, MapPin, Truck, ChevronRight, CheckCircle2,
  Clock, AlertTriangle, XCircle, RotateCcw, Search,
  ExternalLink, Mail, ShieldAlert, ShieldCheck, Building2, Eye,
  Printer, FileText, Camera, CreditCard, MoreVertical, Sparkles,
  RefreshCw, Layers, Sliders, X, User, Phone, Calendar, Hash, Check
} from 'lucide-react';
import { format } from 'date-fns';
import { FormField } from '../../components/common/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

const formatOrderCurrency = (amount, currency = 'INR') => {
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : undefined, {
      style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(Number(amount || 0));
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
};

const ALLOWED_STATUS_TRANSITIONS = {
  ORDER_PLACED: ['CONFIRMED', 'INTERNAL_PROCESSING', 'PACKED', 'CANCELLED'],
  PENDING: ['CONFIRMED', 'INTERNAL_PROCESSING', 'PACKED', 'CANCELLED'],
  CONFIRMED: ['INTERNAL_PROCESSING', 'PACKED', 'SHIPPED', 'CANCELLED'],
  INTERNAL_PROCESSING: ['PACKED', 'SHIPPED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['RETURN_REQUESTED', 'EXCHANGE_REQUESTED'],
  CANCELLED: [],
  RETURN_REQUESTED: ['RETURN_APPROVED', 'RETURN_REJECTED'],
  RETURN_APPROVED: ['RETURNED'],
  RETURNED: ['REFUNDED'],
  EXCHANGE_REQUESTED: ['EXCHANGE_APPROVED', 'EXCHANGE_REJECTED'],
  EXCHANGE_APPROVED: ['EXCHANGE_DISPATCHED', 'DELIVERED'],
  EXCHANGE_DISPATCHED: ['DELIVERED'],
  REFUNDED: []
};

/* Help-Center Aesthetic Modal Wrapper (Zero white border bleed around dark header) */

/* ─── Keyframe Animations Style Block (Consistent across E-Commerce admin) ─── */
const ANIMATION_STYLES = `
  @keyframes ecomModalBackdrop { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ecomModalPop {
    0% { opacity: 0; transform: scale(0.94) translateY(14px); }
    70% { opacity: 1; transform: scale(1.005) translateY(-2px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes ecomSlideUpFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  @keyframes ecomFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ecomMenuIn { from { opacity: 0; transform: scale(0.96) translateY(-4px); } to { opacity: 1; transform: none; } }
  @keyframes ecomFloatIcon { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-3px); } }
  .ecom-fade-in { animation: ecomFadeIn 0.3s ease-out; }
  .ecom-menu-in { animation: ecomMenuIn 0.16s cubic-bezier(0.16, 1, 0.3, 1); }
  .ecom-modal-backdrop { animation: ecomModalBackdrop 0.22s ease-out forwards; }
  .ecom-modal-pop { animation: ecomModalPop 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .ecom-slide-up { animation: ecomSlideUpFade 0.26s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
  .ecom-float-icon { animation: ecomFloatIcon 2.4s ease-in-out infinite; }
`;

const HelpStyleModal = ({ isOpen, onClose, badge, title, subtitle, headerActions, maxWidth = 'max-w-2xl', children }) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md ecom-modal-backdrop"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <style>{ANIMATION_STYLES}</style>
      <div
        className={`bg-slate-950 rounded-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden shadow-[0_25px_70px_-15px_rgba(0,0,0,0.65)] ecom-modal-pop`}
        onClick={e => e.stopPropagation()}
      >
        {/* MODAL HERO HEADER (Help Center Style) */}
        <div className="relative p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shrink-0">
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="space-y-1">
              {badge && (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase tracking-wider">
                  <Sparkles size={10} className="text-blue-400" />
                  {badge}
                </div>
              )}
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-blue-100/75 leading-snug max-w-xl">
                  {subtitle}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {headerActions}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white/80 hover:text-white transition-all cursor-pointer"
                title="Close modal"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="absolute right-0 top-0 w-64 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* MODAL BODY WITH HIDDEN/SLEEK SCROLLBAR */}
        <div className="p-4 sm:p-5 bg-card text-foreground overflow-y-auto [scrollbar-width:thin] space-y-4 text-xs">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

const EcomOrderProcessing = () => {
  const [orders, setOrders] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [riderPodSettings, setRiderPodSettings] = useState({
    requireDeliveryPod: true,
    enableRiderPhotoPod: true,
    enableRiderSignaturePod: true
  });
  const [savingPodSetting, setSavingPodSetting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [datePreset, setDatePreset] = useState('ALL'); // 'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'CUSTOM'
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleDatePreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const toYMD = (d) => format(d, 'yyyy-MM-dd');

    if (preset === 'ALL') {
      setDateFrom('');
      setDateTo('');
    } else if (preset === 'TODAY') {
      const today = toYMD(now);
      setDateFrom(today);
      setDateTo(today);
    } else if (preset === 'YESTERDAY') {
      const yest = new Date(now);
      yest.setDate(now.getDate() - 1);
      const yStr = toYMD(yest);
      setDateFrom(yStr);
      setDateTo(yStr);
    } else if (preset === 'LAST_7_DAYS') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 6);
      setDateFrom(toYMD(weekAgo));
      setDateTo(toYMD(now));
    } else if (preset === 'THIS_MONTH') {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(toYMD(firstOfMonth));
      setDateTo(toYMD(now));
    }
  };

  // Three-dot action dropdown state
  const [openMenuOrderId, setOpenMenuOrderId] = useState(null);
  const menuContainerRef = useRef(null);

  // Close 3-dot dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target)) {
        setOpenMenuOrderId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modals state
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [bulkRiderModalOpen, setBulkRiderModalOpen] = useState(false);
  const [bulkRiderForm, setBulkRiderForm] = useState({
    driverName: '',
    driverPhone: '',
    vehicleNumber: '',
    carrierName: 'JTS In-House Fleet',
    updateToShipped: true,
    note: ''
  });
  const [bulkLoading, setBulkLoading] = useState(false);
  const [revealedOtps, setRevealedOtps] = useState({});
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [logisticsModalOpen, setLogisticsModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);

  // Form states
  const [statusForm, setStatusForm] = useState({
    statusId: '',
    note: '',
    customSendEmail: null
  });

  const [logisticsForm, setLogisticsForm] = useState({
    deliveryType: 'THIRD_PARTY',
    carrierId: '',
    carrierName: '',
    trackingNumber: '',
    driverName: '',
    driverPhone: '',
    vehicleNumber: '',
    updateToShipped: true,
    note: ''
  });

  const [returnForm, setReturnForm] = useState({
    action: 'APPROVE',
    note: '',
    restockBranchId: '',
    refundAmount: '',
    refundTransactionId: '',
    refundMode: 'WALLET_CREDIT',
    deliveryType: 'IN_HOUSE',
    riderName: '',
    riderPhone: '',
    vehicleNumber: '',
    carrierName: '',
    trackingNumber: '',
    pickupOtpEntered: '',
    handoverProof: '',
    inspectionResult: 'PASSED_SELLABLE',
    inspectionNotes: '',
    exchangeDeliveryType: 'IN_HOUSE',
    exchangeRiderName: '',
    exchangeRiderPhone: '',
    exchangeVehicleNumber: '',
    exchangeCarrierName: '',
    exchangeTrackingNumber: ''
  });

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [ordersRes, statusesRes, carriersRes, branchesRes, settingsRes] = await Promise.all([
        axios.get('/api/v1/ecommerce-admin/orders', { headers }),
        axios.get('/api/v1/ecommerce-admin/statuses', { headers }),
        axios.get('/api/v1/ecommerce-admin/logistics', { headers }),
        axios.get('/api/v1/branches', { headers }).catch(() => ({ data: [] })),
        axios.get('/api/v1/ecommerce-admin/settings', { headers }).catch(() => ({ data: {} }))
      ]);

      setOrders(ordersRes.data || []);
      setStatuses(statusesRes.data || []);
      setCarriers(carriersRes.data || []);
      setBranches(branchesRes.data || []);
      const s = settingsRes.data?.settings || settingsRes.data || {};
      setRiderPodSettings({
        requireDeliveryPod: s.requireDeliveryPod !== false,
        enableRiderPhotoPod: s.enableRiderPhotoPod !== false,
        enableRiderSignaturePod: s.enableRiderSignaturePod !== false
      });
    } catch (error) {
      console.error('Failed to load e-commerce orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Date-filtered base orders (so KPIs & tabs reflect the selected date range)
  const dateFilteredOrders = React.useMemo(() => {
    if (!dateFrom && !dateTo) return orders;
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

    return orders.filter(order => {
      if (!order.createdAt) return false;
      const orderTime = new Date(order.createdAt).getTime();
      if (fromTime && orderTime < fromTime) return false;
      if (toTime && orderTime > toTime) return false;
      return true;
    });
  }, [orders, dateFrom, dateTo]);

  // KPIs calculation (computed over dateFilteredOrders)
  const totalOrders = dateFilteredOrders.length;
  const pendingOrders = dateFilteredOrders.filter(o => ['ORDER_PLACED', 'PENDING', 'CONFIRMED'].includes(o.ecomStatusCode || o.status)).length;
  const processingOrders = dateFilteredOrders.filter(o => ['INTERNAL_PROCESSING', 'PACKED'].includes(o.ecomStatusCode || o.status)).length;
  const inTransitOrders = dateFilteredOrders.filter(o => ['SHIPPED', 'OUT_FOR_DELIVERY'].includes(o.ecomStatusCode || o.status)).length;
  const deliveredOrders = dateFilteredOrders.filter(o => (o.ecomStatusCode || o.status) === 'DELIVERED').length;
  const returnOrders = dateFilteredOrders.filter(o => o.returnStatus === 'REQUESTED' || (o.ecomStatusCode || o.status || '').includes('RETURN') || (o.ecomStatusCode || o.status || '').includes('EXCHANGE') || o.returnType === 'EXCHANGE').length;

  // Filter orders by tab & search
  const filteredOrders = dateFilteredOrders.filter(order => {
    const status = order.ecomStatusCode || order.status;
    let matchesTab = true;

    if (activeTab === 'BOOKED') matchesTab = ['ORDER_PLACED', 'PENDING', 'CONFIRMED'].includes(status);
    else if (activeTab === 'PROCESSING') matchesTab = ['INTERNAL_PROCESSING', 'PACKED'].includes(status);
    else if (activeTab === 'TRANSIT') matchesTab = ['SHIPPED', 'OUT_FOR_DELIVERY'].includes(status);
    else if (activeTab === 'DELIVERED') matchesTab = status === 'DELIVERED';
    else if (activeTab === 'CANCELLED') matchesTab = status === 'CANCELLED';
    else if (activeTab === 'RETURNS') matchesTab = order.returnStatus === 'REQUESTED' || status.includes('RETURN') || status.includes('EXCHANGE') || order.returnType === 'EXCHANGE';
    else if (activeTab === 'COD_SETTLEMENT') {
      const isCodOrder = (order.paymentMethod || '').toUpperCase().includes('COD') || (order.codCollectionMethod && order.codCollectionMethod !== 'NONE');
      matchesTab = status !== 'CANCELLED' && isCodOrder && (order.deliveryType === 'IN_HOUSE' || Boolean(order.driverName || order.deliveredByRider));
    }

    const q = (search || '').trim().toLowerCase();
    if (!q) return matchesTab;

    const formattedWebId = `web-${(order._id || '').slice(-6)}`.toLowerCase();
    const shortWebId = (order._id || '').slice(-6).toLowerCase();
    const rawOrderNo = (order.orderNumber || '').toLowerCase();
    const orderId = (order._id || '').toLowerCase();
    const matchesOrderNumber = formattedWebId.includes(q) || shortWebId.includes(q) || rawOrderNo.includes(q) || orderId.includes(q);

    const matchesCustomerName = (order.customerName || '').toLowerCase().includes(q) ||
      (order.shippingAddressObj?.fullName || '').toLowerCase().includes(q) ||
      (order.shippingAddressObj?.name || '').toLowerCase().includes(q) ||
      (typeof order.shippingAddress === 'string' && order.shippingAddress.toLowerCase().includes(q));

    const matchesEmail = (order.customerEmail || '').toLowerCase().includes(q) ||
      (order.shippingAddressObj?.email || '').toLowerCase().includes(q);

    const digitsOnlyQ = q.replace(/\D/g, '');
    const cleanCustomerPhone = (order.customerPhone || '').replace(/\D/g, '');
    const cleanShippingPhone = (order.shippingAddressObj?.phone || '').replace(/\D/g, '');
    const matchesPhone = (order.customerPhone || '').toLowerCase().includes(q) ||
      (order.shippingAddressObj?.phone || '').toLowerCase().includes(q) ||
      (digitsOnlyQ.length >= 3 && (cleanCustomerPhone.includes(digitsOnlyQ) || cleanShippingPhone.includes(digitsOnlyQ)));

    const matchesItem = (order.items || []).some(item => {
      const pName = (item.productId?.name || item.name || '').toLowerCase();
      const pSku = (item.productId?.sku || item.sku || '').toLowerCase();
      return pName.includes(q) || pSku.includes(q);
    });

    const matchesLogistics = (order.trackingNumber || '').toLowerCase().includes(q) ||
      (order.carrierName || order.carrier || '').toLowerCase().includes(q) ||
      (order.driverName || '').toLowerCase().includes(q) ||
      (order.driverPhone || '').includes(q) ||
      (order.vehicleNumber || '').toLowerCase().includes(q);

    const matchesSearch = matchesOrderNumber || matchesCustomerName || matchesEmail || matchesPhone || matchesItem || matchesLogistics;

    return matchesTab && matchesSearch;
  });

  // Open Status Change Modal
  const openStatusModal = (order) => {
    setOpenMenuOrderId(null);
    const currentCode = (order.ecomStatusCode || order.status || '').toUpperCase();
    if (currentCode === 'CANCELLED') {
      alert('This order is CANCELLED. Cancelled orders are in a terminal state and cannot be modified or delivered.');
      return;
    }
    if (currentCode === 'DELIVERED') {
      alert('This order is already DELIVERED. It cannot be reverted back to pending, processing, or transit.');
      return;
    }

    setSelectedOrder(order);
    const allowedCodes = ALLOWED_STATUS_TRANSITIONS[currentCode] || [];
    const validStatuses = statuses.filter(s => allowedCodes.includes(s.code?.toUpperCase()));
    setStatusForm({
      statusId: validStatuses[0]?._id || '',
      note: '',
      customSendEmail: validStatuses[0] ? validStatuses[0].sendEmailToCustomer : false
    });
    setStatusModalOpen(true);
  };

  const handleStatusChangeSubmit = async (e) => {
    e.preventDefault();
    if (!statusForm.statusId) return;

    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/v1/ecommerce-admin/orders/${selectedOrder._id}/status`, {
        statusId: statusForm.statusId,
        note: statusForm.note,
        customSendEmail: statusForm.customSendEmail
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStatusModalOpen(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update order status');
    }
  };

  // Extract distinct known in-house riders from existing orders for 1-click reassignment
  const knownRiders = React.useMemo(() => {
    const map = new Map();
    orders.forEach(o => {
      const name = (o.driverName || '').trim();
      const phone = (o.driverPhone || '').trim();
      if (name || phone) {
        const key = `${name.toLowerCase()}|${phone}`;
        if (!map.has(key)) {
          map.set(key, {
            driverName: name,
            driverPhone: phone,
            vehicleNumber: (o.vehicleNumber || '').trim()
          });
        }
      }
    });
    return Array.from(map.values());
  }, [orders]);

  // Rider-wise COD Cash & Digital Reconciliation Summary for Hub Manager / Admin
  const riderCodSummary = React.useMemo(() => {
    const map = new Map();

    orders.forEach(o => {
      const status = (o.ecomStatusCode || o.status || '').toUpperCase();
      if (status === 'CANCELLED') return;

      const isCOD = (o.paymentMethod || '').toUpperCase().includes('COD') ||
        (o.codCollectionMethod && o.codCollectionMethod !== 'NONE');
      if (!isCOD) return;

      const rName = (o.driverName || o.deliveredByRider || '').trim();
      const rPhone = (o.driverPhone || '').trim();
      if (!rName && !rPhone && o.deliveryType !== 'IN_HOUSE') return;

      const key = `${(rName || 'Unassigned Rider').toLowerCase()}|${rPhone}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          riderName: rName || 'Unassigned In-House Order',
          riderPhone: rPhone,
          vehicleNumber: o.vehicleNumber || '',
          inTransitAmount: 0,
          inTransitOrders: [],
          digitalAmount: 0,
          digitalOrders: [],
          cashInHandAmount: 0,
          cashInHandOrders: [],
          settledAtHubAmount: 0,
          settledAtHubOrders: []
        });
      }

      const entry = map.get(key);
      const amt = Number(o.codCollectedAmount || o.totalAmount || 0);
      const method = o.codCollectionMethod || 'NONE';
      const settlement = o.codSettlementStatus || 'NOT_APPLICABLE';
      const isReturnOrExchange = (o.returnStatus && o.returnStatus !== 'NONE') || status.includes('RETURN') || status.includes('EXCHANGE');
      const wasDelivered = status === 'DELIVERED' || Boolean(o.deliveredAt) || isReturnOrExchange;

      if (settlement === 'SETTLED_TO_HUB') {
        entry.settledAtHubAmount += amt;
        entry.settledAtHubOrders.push(o);
      } else if (method === 'UPI_QR' || method === 'CARD_POS' || settlement === 'SETTLED_DIGITAL') {
        entry.digitalAmount += amt;
        entry.digitalOrders.push(o);
      } else if (method === 'CASH' || (wasDelivered && !isReturnOrExchange)) {
        entry.cashInHandAmount += amt;
        entry.cashInHandOrders.push(o);
      } else if (!wasDelivered) {
        entry.inTransitAmount += amt;
        entry.inTransitOrders.push(o);
      }
    });

    return Array.from(map.values());
  }, [orders]);

  const totalCashPendingFromRiders = riderCodSummary.reduce((sum, r) => sum + r.cashInHandAmount, 0);
  const totalCashSettledAtHub = riderCodSummary.reduce((sum, r) => sum + r.settledAtHubAmount, 0);
  const totalDigitalSettled = riderCodSummary.reduce((sum, r) => sum + r.digitalAmount, 0);
  const totalInTransitCod = riderCodSummary.reduce((sum, r) => sum + r.inTransitAmount, 0);

  const handleSettleRiderCash = async (orderIdsToSettle, riderLabel = 'Rider') => {
    setOpenMenuOrderId(null);
    if (!orderIdsToSettle || orderIdsToSettle.length === 0) return;
    if (!window.confirm(`Confirm that physical COD cash for ${orderIdsToSettle.length} order(s) has been received at the Hub from ${riderLabel}?`)) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put('/api/v1/ecommerce-admin/orders/settle-rider-cash', {
        orderIds: orderIdsToSettle,
        note: `Cash received at Hub from ${riderLabel}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message || 'Cash settled at Hub successfully!');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to settle rider COD cash.');
    }
  };

  // Open Logistics / Rider Assignment or Reassignment Modal
  const openLogisticsModal = (order, forceInHouse = false) => {
    setOpenMenuOrderId(null);
    const currentCode = (order.ecomStatusCode || order.status || '').toUpperCase();
    if (currentCode === 'CANCELLED') {
      alert('Cannot assign logistics or ship a CANCELLED order.');
      return;
    }
    if (currentCode === 'DELIVERED') {
      alert('Order is already DELIVERED. Logistics cannot be re-assigned.');
      return;
    }

    setSelectedOrder(order);
    const isSelf = forceInHouse || order.deliveryType === 'IN_HOUSE' || Boolean(order.driverName);
    setLogisticsForm({
      deliveryType: isSelf ? 'IN_HOUSE' : 'THIRD_PARTY',
      carrierId: order.carrierId?._id || carriers[0]?._id || '',
      carrierName: order.carrier || (isSelf ? 'JTS In-House Fleet' : ''),
      trackingNumber: order.trackingNumber || '',
      driverName: order.driverName || '',
      driverPhone: order.driverPhone || '',
      vehicleNumber: order.vehicleNumber || '',
      updateToShipped: (order.ecomStatusCode || order.status) !== 'SHIPPED',
      note: isSelf
        ? (order.driverName ? `Reassigned to company rider.` : 'Dispatched with company rider.')
        : 'Shipment dispatched with courier partner.'
    });
    setLogisticsModalOpen(true);
  };

  const handleLogisticsSubmit = async (e) => {
    e.preventDefault();
    if (logisticsForm.deliveryType === 'THIRD_PARTY') {
      if (!logisticsForm.carrierId || !logisticsForm.trackingNumber) {
        alert('Please select a courier partner and enter tracking number (AWB).');
        return;
      }
    } else {
      if (!logisticsForm.driverName || !logisticsForm.driverPhone) {
        alert('Please provide Driver/Rider name and contact phone number for in-house delivery.');
        return;
      }
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/v1/ecommerce-admin/orders/${selectedOrder._id}/logistics`, logisticsForm, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setLogisticsModalOpen(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to assign logistics');
    }
  };

  const handleSelectAll = () => {
    const activeAssignable = filteredOrders
      .filter(o => {
        const code = (o.ecomStatusCode || o.status || '').toUpperCase();
        return !['CANCELLED', 'DELIVERED', 'RETURNED', 'REFUNDED'].includes(code);
      })
      .map(o => o._id);

    if (activeAssignable.length > 0 && selectedOrderIds.length === activeAssignable.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(activeAssignable);
    }
  };

  const handleBulkAssignRider = async (e) => {
    e.preventDefault();
    if (selectedOrderIds.length === 0) {
      alert('Please select at least one order to assign.');
      return;
    }
    if (!bulkRiderForm.driverName.trim() && !bulkRiderForm.driverPhone.trim()) {
      alert('Please enter Rider Name or Mobile Number.');
      return;
    }

    setBulkLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put('/api/v1/ecommerce-admin/orders/bulk-assign-rider', {
        orderIds: selectedOrderIds,
        ...bulkRiderForm
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message || `Successfully assigned ${selectedOrderIds.length} orders to Rider.`);
      setSelectedOrderIds([]);
      setBulkRiderModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to bulk assign rider.');
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleRevealOtp = (orderId) => {
    setRevealedOtps(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const handleResendReturnOtp = async (orderId) => {
    if (!orderId) return;
    setIsResendingOtp(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`/api/v1/ecommerce-admin/orders/${orderId}/resend-return-otp`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message || 'Verification OTP sent to customer email successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resend OTP email.');
    } finally {
      setIsResendingOtp(false);
    }
  };

  // Open Return & Exchange Processing Modal
  const openReturnModal = (order) => {
    setOpenMenuOrderId(null);
    setSelectedOrder(order);
    const isEx = order.returnType === 'EXCHANGE' || (order.ecomStatusCode || '').includes('EXCHANGE');

    const existingRider = order.returnRiderName || order.driverName || '';
    const existingPhone = order.returnRiderPhone || order.driverPhone || '';
    const existingVehicle = order.returnVehicleNumber || order.vehicleNumber || '';

    let defaultAction = 'APPROVE_AND_ASSIGN';
    if (order.returnStatus === 'APPROVED') defaultAction = 'ASSIGN_PICKUP';
    else if (order.returnStatus === 'PICKUP_ASSIGNED') defaultAction = 'CONFIRM_PICKUP';
    else if (order.returnStatus === 'PICKED_UP') defaultAction = isEx ? 'INSPECT_WAREHOUSE' : 'PROCESS_REFUND';
    else if (order.returnStatus === 'INSPECTED') defaultAction = isEx ? 'COMPLETE_EXCHANGE' : 'PROCESS_REFUND';

    const orderShipping = Number(order.shippingAmount || 0);
    const orderSubtotal = Number(order.subtotalAmount || (order.totalAmount - orderShipping));
    const itemRefund = order.returnItem?.price
      ? (Number(order.returnItem.price) * Number(order.returnItem.quantity || 1))
      : null;
    const defaultRefund = order.refundAmount != null && order.refundAmount !== ''
      ? order.refundAmount
      : (itemRefund || orderSubtotal || order.totalAmount || '');

    setReturnForm({
      action: defaultAction,
      note: '',
      restockBranchId: order.restockBranchId || order.branchId?._id || order.branchId || branches[0]?._id || '',
      refundAmount: defaultRefund,
      refundTransactionId: order.refundTransactionId || `RFND-${Date.now().toString().slice(-6)}`,
      refundMode: order.refundMode || 'WALLET_CREDIT',
      deliveryType: order.returnDeliveryType || order.deliveryType || 'IN_HOUSE',
      riderName: existingRider,
      riderPhone: existingPhone,
      vehicleNumber: existingVehicle,
      carrierName: order.returnCarrierName || order.carrier || carriers[0]?.carrierName || 'BlueDart Express',
      trackingNumber: order.returnTrackingNumber || `AWB-REV-${Date.now().toString().slice(-6)}`,
      pickupOtpEntered: '',
      handoverProof: '',
      inspectionResult: order.inspectionResult || 'PASSED_SELLABLE',
      inspectionNotes: order.inspectionNotes || 'All items and original tags verified intact.',
      exchangeDeliveryType: 'IN_HOUSE',
      exchangeRiderName: existingRider,
      exchangeRiderPhone: existingPhone,
      exchangeVehicleNumber: existingVehicle,
      exchangeCarrierName: order.exchangeCarrierName || 'Express Courier',
      exchangeTrackingNumber: order.exchangeTrackingNumber || `AWB-EXC-${Date.now().toString().slice(-6)}`
    });
    setReturnModalOpen(true);
  };

  const handleReturnActionSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/v1/ecommerce-admin/orders/${selectedOrder._id}/return-action`, returnForm, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setReturnModalOpen(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to process return');
    }
  };

  const selectedOrderCurrentCode = (selectedOrder?.ecomStatusCode || selectedOrder?.status || '').toUpperCase();
  const allowedTargetCodes = ALLOWED_STATUS_TRANSITIONS[selectedOrderCurrentCode] || [];
  const availableStatuses = statuses.filter(s => allowedTargetCodes.includes(s.code?.toUpperCase()));
  const selectedStatusDoc = statuses.find(s => s._id === statusForm.statusId);

  const dispatchableCount = filteredOrders.filter(
    o => !['CANCELLED', 'DELIVERED', 'RETURNED', 'REFUNDED'].includes((o.ecomStatusCode || o.status || '').toUpperCase())
  ).length;

  return (
    <div className="space-y-4 pb-8 max-w-[1440px] mx-auto ecom-fade-in" ref={menuContainerRef}>
      {/* ========================================================================= */}
      {/* 1. SLIM & COMPACT HERO HEADER (Help Center Aesthetic)                     */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-4 sm:p-5 text-white shadow-md border border-blue-900/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          {/* Left: Badge, Title & Subtitle */}
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase tracking-wider">
              <Sparkles size={11} className="text-blue-400" />
              JTS E-Commerce & Omnichannel Hub
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
              E-Commerce Order Processing
            </h1>
            <p className="text-xs text-blue-100/75 max-w-xl leading-snug">
              Fulfill online orders, update statuses with automated email notifications, assign in-house riders or 3PL couriers, and settle COD cash.
            </p>
          </div>

          {/* Right: Compact Search Bar & Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <div className="relative w-full sm:w-64 md:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search order #, customer, phone, SKU..."
                className="w-full pl-8 pr-7 py-2 rounded-xl bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/20 text-white placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 backdrop-blur-md transition-all shadow-inner"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold p-0.5 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => window.open('/rider', '_blank')}
                className="flex-1 sm:flex-initial px-3 py-2 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                title="Open In-House Rider Delivery Portal"
              >
                <Truck size={14} />
                Rider Portal
              </button>

              <button
                type="button"
                onClick={fetchData}
                className="flex-1 sm:flex-initial px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                title="Refresh Orders"
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Ambient subtle light */}
        <div className="absolute right-0 top-0 w-80 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ========================================================================= */}
      {/* 2. COMPACT KPI METRIC CARDS (Interactive Filter Cards)                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          { id: 'ALL', label: 'Total Orders', count: totalOrders, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-600', icon: Layers, sub: 'All channels' },
          { id: 'BOOKED', label: 'Booked / Pending', count: pendingOrders, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500', icon: Clock, sub: 'Awaiting pack' },
          { id: 'PROCESSING', label: 'In Processing', count: processingOrders, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-600', icon: Package, sub: 'Warehouse stage' },
          { id: 'TRANSIT', label: 'In Transit', count: inTransitOrders, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500', icon: Truck, sub: 'Out with rider/3PL' },
          { id: 'DELIVERED', label: 'Delivered', count: deliveredOrders, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-600', icon: CheckCircle2, sub: 'Completed POD' },
          { id: 'RETURNS', label: 'Returns / Swap', count: returnOrders, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-600', icon: RotateCcw, sub: 'Reverse logistics' }
        ].map(kpi => {
          const IconComp = kpi.icon;
          const isSelected = activeTab === kpi.id;
          return (
            <button
              key={kpi.id}
              type="button"
              onClick={() => setActiveTab(kpi.id)}
              className={`ecom-slide-up text-left p-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex items-center justify-between border ${
                isSelected
                  ? 'bg-card border-blue-500/60 shadow-xs ring-1 ring-blue-500/30'
                  : 'bg-card/70 hover:bg-card border-border/70 hover:border-border'
              }`}
            >
              <div className="space-y-0.5 truncate">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
                  {kpi.label}
                </span>
                <div className={`text-lg font-black leading-tight ${kpi.color}`}>
                  {kpi.count}
                </div>
                <span className="text-[9.5px] text-muted-foreground block truncate">
                  {kpi.sub}
                </span>
              </div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform ${
                isSelected ? `${kpi.bg} text-white shadow-2xs scale-105` : 'bg-muted text-muted-foreground'
              }`}>
                <IconComp size={15} />
              </div>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 3. SLEEK SEGMENTED NAVIGATION TABS & BATCH TOOLBAR (Help Center Style)    */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 p-1.5 bg-muted/50 rounded-xl border border-border/60">
        {/* Segmented Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {[
            { id: 'ALL', label: 'All Orders', count: totalOrders, icon: Layers },
            { id: 'BOOKED', label: 'Booked', count: pendingOrders, icon: Clock },
            { id: 'PROCESSING', label: 'Processing', count: processingOrders, icon: Package },
            { id: 'TRANSIT', label: 'In Transit', count: inTransitOrders, icon: Truck },
            { id: 'DELIVERED', label: 'Delivered', count: deliveredOrders, icon: CheckCircle2 },
            { id: 'COD_SETTLEMENT', label: 'Rider COD Settlement', count: `₹${totalCashPendingFromRiders.toLocaleString('en-IN')} Due`, icon: CreditCard, highlight: true },
            { id: 'RETURNS', label: 'Returns & Swap', count: returnOrders, icon: RotateCcw },
            { id: 'CANCELLED', label: 'Cancelled', icon: XCircle }
          ].map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-card text-foreground shadow-xs font-black border border-border/80'
                    : tab.highlight
                      ? 'text-amber-800 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
                }`}
              >
                <TabIcon size={13} className={isActive ? 'text-blue-600 dark:text-blue-400' : tab.highlight ? 'text-amber-600' : ''} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                    tab.highlight
                      ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Batch Dispatch Selection Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-2 px-2 py-1 lg:py-0 border-t lg:border-t-0 border-border/50 text-xs shrink-0">
          <label className="flex items-center gap-1.5 cursor-pointer font-bold select-none text-muted-foreground hover:text-foreground transition-colors">
            <input
              type="checkbox"
              checked={
                dispatchableCount > 0 &&
                filteredOrders
                  .filter(o => !['CANCELLED', 'DELIVERED', 'RETURNED', 'REFUNDED'].includes((o.ecomStatusCode || o.status || '').toUpperCase()))
                  .every(o => selectedOrderIds.includes(o._id))
              }
              onChange={handleSelectAll}
              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-border cursor-pointer"
            />
            <span className="text-[11px]">
              Select Dispatchable ({dispatchableCount})
            </span>
          </label>

          {selectedOrderIds.length > 0 && (
            <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => setBulkRiderModalOpen(true)}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[11px] font-black rounded-lg shadow-xs flex items-center gap-1 cursor-pointer transition-all"
              >
                <Truck size={12} />
                Assign {selectedOrderIds.length} to Rider
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrderIds([])}
                className="px-2 py-1 bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] font-bold rounded-lg border border-border cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3B. SLEEK DATE RANGE FILTER BAR (Quick Presets + Custom Date Pickers)     */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3 py-2 bg-card rounded-xl border border-border/80 shadow-2xs text-xs">
        {/* Left: Quick Date Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1 mr-1">
            <Calendar size={12} className="text-blue-600 dark:text-blue-400" />
            Order Date:
          </span>
          {[
            { id: 'ALL', label: 'All Time' },
            { id: 'TODAY', label: 'Today' },
            { id: 'YESTERDAY', label: 'Yesterday' },
            { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
            { id: 'THIS_MONTH', label: 'This Month' }
          ].map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleDatePreset(p.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                datePreset === p.id
                  ? 'bg-blue-600 text-white shadow-2xs font-black'
                  : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Right: Custom From & To Date Inputs */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg border border-border/70">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">From</span>
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={e => {
                setDateFrom(e.target.value);
                setDatePreset(e.target.value || dateTo ? 'CUSTOM' : 'ALL');
              }}
              className="bg-transparent text-[11px] font-bold text-foreground focus:outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg border border-border/70">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">To</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={e => {
                setDateTo(e.target.value);
                setDatePreset(dateFrom || e.target.value ? 'CUSTOM' : 'ALL');
              }}
              className="bg-transparent text-[11px] font-bold text-foreground focus:outline-none cursor-pointer"
            />
          </div>

          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => handleDatePreset('ALL')}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Reset Date Filter"
            >
              <X size={12} /> Reset Date
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. RIDER COD CASH HANDOVER & HUB SETTLEMENT TRACKER (Help Center Banner)  */}
      {/* ========================================================================= */}
      {activeTab === 'COD_SETTLEMENT' && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Compact Module Banner (Matches Help Center Sales & POS Banner) */}
          <div className="p-4 sm:p-4.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white shadow-xs space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[9.5px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-md text-white">
                FINANCE & LOGISTICS · RIDER COD RECONCILIATION
              </span>
              <span className="text-[10.5px] font-bold bg-white/15 px-2.5 py-0.5 rounded-md text-white">
                {riderCodSummary.length} Active Rider Fleet Account(s)
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white">
              Rider-Wise COD Cash Handover & Hub Settlement Tracker
            </h2>
            <p className="text-xs text-white/90 leading-relaxed max-w-3xl">
              Monitor pay-on-delivery collections across your in-house fleet, verify instant UPI QR and Card M-POS bank settlements, and mark physical cash as received at the Hub.
            </p>
          </div>

          {/* 4 COD Reconciliation Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-2xs space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                1. In-Transit COD (Customer Due)
              </span>
              <div className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400">
                ₹{totalInTransitCod.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-muted-foreground block">Orders out for doorstep delivery</span>
            </div>

            <div className="p-3.5 rounded-xl bg-card border border-emerald-500/30 shadow-2xs space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                2. Digital Collected (UPI / Card)
              </span>
              <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                ₹{totalDigitalSettled.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-muted-foreground block">Settled directly to Company Bank</span>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/50 shadow-2xs space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 block">
                3. Cash with Riders (Pending Deposit)
              </span>
              <div className="text-base sm:text-lg font-black text-amber-700 dark:text-amber-300">
                ₹{totalCashPendingFromRiders.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-muted-foreground block">Physical cash to collect at Hub</span>
            </div>

            <div className="p-3.5 rounded-xl bg-card border border-blue-500/30 shadow-2xs space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                4. Settled at Hub (Cash Received)
              </span>
              <div className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400">
                ₹{totalCashSettledAtHub.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-muted-foreground block">Verified by Hub Manager</span>
            </div>
          </div>

          {/* Rider-Wise Breakdown Table */}
          {riderCodSummary.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground bg-card rounded-xl border border-border/80">
              No In-House Rider COD orders found.
            </div>
          ) : (
            <div className="overflow-x-auto bg-card rounded-xl border border-border/80 shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/80 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    <th className="py-2.5 px-3.5">Rider / Delivery Executive</th>
                    <th className="py-2.5 px-3.5">Customer Due (In-Transit)</th>
                    <th className="py-2.5 px-3.5">UPI / Card (Direct to Bank)</th>
                    <th className="py-2.5 px-3.5">Cash with Rider (Pending Deposit)</th>
                    <th className="py-2.5 px-3.5">Settled at Hub (Received)</th>
                    <th className="py-2.5 px-3.5 text-right">Hub Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {riderCodSummary.map(r => (
                    <tr key={r.key} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-foreground">{r.riderName}</div>
                        <div className="text-[10.5px] text-muted-foreground font-mono">
                          {r.riderPhone || 'No Phone'} {r.vehicleNumber ? `· ${r.vehicleNumber}` : ''}
                        </div>
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="font-bold text-blue-600 dark:text-blue-400">₹{r.inTransitAmount.toLocaleString('en-IN')}</div>
                        <div className="text-[10px] text-muted-foreground">{r.inTransitOrders.length} pending order(s)</div>
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">₹{r.digitalAmount.toLocaleString('en-IN')}</div>
                        <div className="text-[10px] text-muted-foreground">{r.digitalOrders.length} UPI/Card order(s)</div>
                      </td>

                      <td className="py-3 px-3.5">
                        <div className={`font-black text-xs ${r.cashInHandAmount > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}>
                          ₹{r.cashInHandAmount.toLocaleString('en-IN')}
                        </div>
                        {r.cashInHandOrders.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {r.cashInHandOrders.map(ord => (
                              <span
                                key={ord._id}
                                className="text-[9.5px] font-mono font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30"
                              >
                                WEB-{ord._id.slice(-6).toUpperCase()} (₹{ord.totalAmount})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">No cash pending</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="font-bold text-blue-600 dark:text-blue-400">₹{r.settledAtHubAmount.toLocaleString('en-IN')}</div>
                        <div className="text-[10px] text-muted-foreground">{r.settledAtHubOrders.length} settled order(s)</div>
                      </td>

                      <td className="py-3 px-3.5 text-right">
                        {r.cashInHandOrders.length > 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleSettleRiderCash(
                                r.cashInHandOrders.map(o => o._id),
                                `${r.riderName} (${r.riderPhone || 'Rider'})`
                              )
                            }
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-[11px] rounded-lg cursor-pointer shadow-2xs transition-all"
                          >
                            Collect ₹{r.cashInHandAmount.toLocaleString('en-IN')} Cash
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                            <CheckCircle2 size={11} /> All Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ORDERS LISTING (Help Center Card Style + Three-Dot Action Dropdown)    */}
      {/* ========================================================================= */}
      {isLoading ? (
        <div className="p-12 text-center bg-card rounded-xl border border-border/80 text-xs text-muted-foreground font-bold animate-pulse">
          Loading e-commerce orders...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-10 text-center bg-card rounded-xl border border-border/80 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
            <Package size={20} />
          </div>
          <div className="text-sm font-bold text-foreground">No orders found</div>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {search
              ? `No orders match "${search}". Try searching by order ref (e.g. WEB-97C5F0), customer name, phone, or SKU.`
              : (dateFrom || dateTo)
                ? `No orders placed within the selected date range (${dateFrom || 'Start'} to ${dateTo || 'Now'}).`
                : 'No e-commerce orders match the selected filter tab.'}
          </p>
          {(search || dateFrom || dateTo) && (
            <div className="flex items-center justify-center gap-2 pt-1">
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Clear Search
                </button>
              )}
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => handleDatePreset('ALL')}
                  className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-bold rounded-lg cursor-pointer"
                >
                  Reset Date Filter
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredOrders.map((order, idx) => {
            const currentStatusCode = (order.ecomStatusCode || order.status || '').toUpperCase();
            const isCancelled = currentStatusCode === 'CANCELLED';
            const isDelivered = currentStatusCode === 'DELIVERED';
            const isTerminal = ['CANCELLED', 'DELIVERED', 'RETURNED', 'REFUNDED'].includes(currentStatusCode);
            const isSelected = selectedOrderIds.includes(order._id);
            const currentStatus = order.ecomStatusId || statuses.find(s => s.code === currentStatusCode) || {};
            const badgeColor = currentStatus.color || (isCancelled ? '#dc2626' : isDelivered ? '#16a34a' : '#2563eb');
            const isExchangeRequested = order.returnType === 'EXCHANGE' || currentStatusCode.includes('EXCHANGE');
            const isReturnRequested = order.returnStatus === 'REQUESTED' || currentStatusCode.includes('RETURN') || isExchangeRequested;
            const isInHouse = order.deliveryType === 'IN_HOUSE' || (!order.carrier && (order.driverName || order.returnRiderName)) || order.returnDeliveryType === 'IN_HOUSE';
            const isMenuOpen = openMenuOrderId === order._id;
            const isCodCashInHand =
              !isCancelled &&
              ((order.paymentMethod || '').toUpperCase().includes('COD') || (order.codCollectionMethod && order.codCollectionMethod !== 'NONE')) &&
              order.codSettlementStatus !== 'SETTLED_TO_HUB' &&
              order.codCollectionMethod !== 'UPI_QR' &&
              order.codCollectionMethod !== 'CARD_POS' &&
              (order.codCollectionMethod === 'CASH' || (isDelivered && !isReturnRequested));

            return (
              <div
                key={order._id}
                style={{ animationDelay: `${idx * 30}ms` }}
                className={`ecom-slide-up p-3.5 sm:p-4 rounded-xl bg-card border transition-all duration-200 shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${
                  isSelected
                    ? 'border-blue-500/60 ring-1 ring-blue-500/30 bg-blue-500/[0.02]'
                    : 'border-border/80 hover:border-blue-500/40'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                  
                  {/* LEFT COLUMN: Order Header, Customer & Line Items (Help Center Submodule Style) */}
                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Top Row: Checkbox + Number Badge + Order ID + Status Pill + Date */}
                    <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isTerminal}
                          onChange={e => {
                            e.stopPropagation();
                            if (e.target.checked) {
                              setSelectedOrderIds(prev => [...prev, order._id]);
                            } else {
                              setSelectedOrderIds(prev => prev.filter(id => id !== order._id));
                            }
                          }}
                          className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-border cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title={isTerminal ? `Cannot reassign ${currentStatusCode} order` : 'Select parcel for bulk rider assignment'}
                        />

                        <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-black shrink-0">
                          {idx + 1}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrder(order);
                            setDetailModalOpen(true);
                          }}
                          className="text-xs sm:text-sm font-black text-foreground hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          WEB-{order._id.slice(-6).toUpperCase()}
                        </button>
                      </div>

                      {/* Unified Status Badge */}
                      {isExchangeRequested ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-500/15 border border-purple-500/30 flex items-center gap-1">
                          <RotateCcw size={10} />
                          {order.returnStatus === 'COMPLETED' ? 'Exchange Completed' :
                           order.returnStatus === 'PICKED_UP' ? 'Swap Picked Up (QC)' :
                           order.returnStatus === 'PICKUP_ASSIGNED' ? 'Exchange: Out for Swap' :
                           order.returnStatus === 'APPROVED' ? 'Exchange: Approved' : 'Exchange Requested'}
                        </span>
                      ) : isReturnRequested ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 bg-rose-500/15 border border-rose-500/30 flex items-center gap-1">
                          <RotateCcw size={10} />
                          {order.returnStatus === 'COMPLETED' || order.status === 'REFUNDED' ? 'Return & Refunded' :
                           order.returnStatus === 'PICKED_UP' ? 'Picked Up (QC)' :
                           order.returnStatus === 'PICKUP_ASSIGNED' ? 'Return: Out for Pickup' :
                           order.returnStatus === 'APPROVED' ? 'Return: Approved' : 'Return Requested'}
                        </span>
                      ) : (
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white shadow-2xs"
                          style={{ backgroundColor: badgeColor }}
                        >
                          {currentStatus.name || order.ecomStatusCode || order.status}
                        </span>
                      )}

                      <span className="text-[10.5px] text-muted-foreground flex items-center gap-1">
                        <Calendar size={11} className="text-muted-foreground/70" />
                        {format(new Date(order.createdAt), 'MMM d, yyyy · h:mm a')}
                      </span>
                    </div>

                    {/* Customer & Address Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground truncate">
                        <User size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="font-bold text-foreground truncate">{order.customerName}</span>
                        {order.customerPhone && (
                          <span className="text-[11px] font-mono text-muted-foreground shrink-0">· {order.customerPhone}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                        <MapPin size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-[11px] truncate">{order.shippingAddress || 'Store Pickup'}</span>
                      </div>
                    </div>

                    {/* Ordered Items Compact Capabilities Strip */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground mr-1">
                        Items ({(order.items || []).length}):
                      </span>
                      {(order.items || []).map((item, iIdx) => (
                        <span
                          key={iIdx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/40 border border-border/60 text-[10.5px] font-bold text-foreground"
                        >
                          <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
                          {item.quantity}x {item.productId?.name || item.name || 'Product'}
                        </span>
                      ))}
                    </div>

                    {/* Return / Exchange Notice Strip (if active) */}
                    {isReturnRequested && (
                      <div className="p-2 rounded-lg bg-purple-500/5 border border-purple-500/20 flex items-center justify-between flex-wrap gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 text-foreground">
                          <RotateCcw size={12} className="text-purple-600 shrink-0" />
                          <span className="font-bold">
                            {isExchangeRequested
                              ? `Replacement: ${order.exchangeItemDetails || 'Alternate Variant'}`
                              : `Refund Request: ₹${order.refundAmount || (order.subtotalAmount || (order.totalAmount - (order.shippingAmount || 0)))} (${order.refundMode || 'Original'})`}
                          </span>
                          {order.returnReason && (
                            <span className="text-muted-foreground italic truncate max-w-xs">
                              — "{order.returnReason}"
                            </span>
                          )}
                        </div>
                        <span className="text-[9.5px] font-black uppercase px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300">
                          Stage: {order.returnStatus || 'REQUESTED'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* MIDDLE COLUMN: Compact Logistics & POD Box (Help Center Action Definition Card Style) */}
                  <div className="w-full lg:w-72 p-2.5 rounded-xl bg-muted/30 border border-border/60 space-y-1.5 shrink-0 text-xs">
                    {isInHouse ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-black text-foreground flex items-center gap-1.5">
                            {isExchangeRequested ? (
                              <>
                                <RotateCcw size={12} className="text-purple-600" /> Doorstep Swap
                              </>
                            ) : isReturnRequested ? (
                              <>
                                <RotateCcw size={12} className="text-rose-600" /> Return Pickup
                              </>
                            ) : isDelivered ? (
                              <>
                                <CheckCircle2 size={12} className="text-emerald-600" /> In-House Delivered
                              </>
                            ) : (
                              <>
                                <Building2 size={12} className="text-blue-600" /> In-House Fleet
                              </>
                            )}
                          </span>
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            Self Rider
                          </span>
                        </div>

                        {(order.returnRiderName || order.exchangeRiderName || order.driverName) ? (
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                            <div className="truncate">
                              <span className="font-bold text-foreground">
                                {order.returnRiderName || order.exchangeRiderName || order.driverName}
                              </span>
                              {(order.returnRiderPhone || order.exchangeRiderPhone || order.driverPhone) && (
                                <span className="font-mono text-[10px] ml-1">
                                  ({order.returnRiderPhone || order.exchangeRiderPhone || order.driverPhone})
                                </span>
                              )}
                            </div>
                            {(order.returnVehicleNumber || order.exchangeVehicleNumber || order.vehicleNumber) && (
                              <span className="font-mono text-[10px] bg-card px-1.5 py-0.2 rounded border border-border/60 shrink-0">
                                {order.returnVehicleNumber || order.exchangeVehicleNumber || order.vehicleNumber}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10.5px] text-amber-600 dark:text-amber-400 font-bold">
                            No Rider Assigned Yet
                          </div>
                        )}

                        {/* Compact OTP or POD Verification Pill with Photo & Signature Thumbnail */}
                        {(order.deliveryProofPhoto || order.customerSignature) ? (
                          <div className="pt-1.5 border-t border-border/50 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 size={11} /> Doorstep POD Uploaded
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setDetailModalOpen(true);
                                }}
                                className="text-[10px] font-black text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                              >
                                <Eye size={10} /> View POD
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              {order.deliveryProofPhoto && (
                                <a
                                  href={order.deliveryProofPhoto}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-9 h-9 rounded-lg border border-emerald-500/40 overflow-hidden bg-slate-900 shrink-0 group relative shadow-2xs"
                                  title="Click to open full POD photo"
                                >
                                  <img
                                    src={order.deliveryProofPhoto}
                                    alt="POD Photo"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                </a>
                              )}

                              {order.customerSignature && (
                                <a
                                  href={order.customerSignature}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="h-9 px-2 rounded-lg border border-border bg-white flex items-center justify-center shrink-0 shadow-2xs"
                                  title="Click to view customer signature"
                                >
                                  <img
                                    src={order.customerSignature}
                                    alt="Customer Signature"
                                    className="max-h-7 max-w-[68px] object-contain"
                                  />
                                </a>
                              )}

                              <div className="text-[10px] text-muted-foreground leading-tight truncate">
                                <div className="font-bold text-foreground truncate">
                                  {order.deliveryProofPhoto && order.customerSignature
                                    ? 'Photo + Sign'
                                    : order.deliveryProofPhoto
                                      ? 'Photo Proof'
                                      : 'E-Signature'}
                                </div>
                                <div>
                                  {order.deliveredAt ? format(new Date(order.deliveredAt), 'h:mm a') : 'Verified'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (isReturnRequested && order.returnPickupOtp && order.returnStatus !== 'PICKED_UP' && order.returnStatus !== 'COMPLETED') ? (
                          <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[10px]">
                            <span className="font-bold text-amber-700 dark:text-amber-400">
                              {isExchangeRequested ? 'Swap OTP:' : 'Pickup OTP:'}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleRevealOtp(order._id)}
                              className="font-mono font-black text-foreground hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                            >
                              {revealedOtps[order._id] ? order.returnPickupOtp : '••••••'}
                              <Eye size={10} />
                            </button>
                          </div>
                        ) : (order.deliveryOtp && !isDelivered) ? (
                          <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[10px]">
                            <span className="font-bold text-blue-600 dark:text-blue-400">Delivery OTP:</span>
                            <button
                              type="button"
                              onClick={() => toggleRevealOtp(order._id)}
                              className="font-mono font-black text-foreground hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                            >
                              {revealedOtps[order._id] ? order.deliveryOtp : '••••'}
                              <Eye size={10} />
                            </button>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-black text-foreground flex items-center gap-1.5">
                            <Truck size={12} className="text-blue-600" /> 3PL Courier Partner
                          </span>
                          <span className="text-[9.5px] font-bold text-muted-foreground">
                            {order.carrier || 'Unassigned'}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-muted-foreground">
                          AWB: <strong className="font-mono text-foreground">{order.trackingNumber || 'Pending'}</strong>
                        </div>
                      </>
                    )}
                  </div>

                  {/* RIGHT COLUMN: Order Value + Three-Dot (⋮) Action Menu */}
                  <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/50">
                    <div className="text-left lg:text-right space-y-0.5">
                      <div className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground">
                        Order Value
                      </div>
                      <div className="text-sm sm:text-base font-black text-foreground">
                        {formatOrderCurrency(order.totalAmount, order.currency)}
                      </div>
                      <div className="flex items-center lg:justify-end gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {order.paymentMethod || 'COD'} · {order.paymentStatus || 'UNPAID'}
                        </span>
                        {order.codSettlementStatus === 'SETTLED_TO_HUB' && (
                          <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            Hub Settled
                          </span>
                        )}
                        {isCodCashInHand && (
                          <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            Cash with Rider
                          </span>
                        )}
                      </div>
                    </div>

                    {/* THREE-DOT (⋮) ACTION MENU BUTTON & ANIMATED POPOVER */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setOpenMenuOrderId(isMenuOpen ? null : order._id);
                        }}
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                          isMenuOpen
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-95'
                            : 'bg-muted/40 hover:bg-muted text-foreground border-border/80 hover:border-blue-500/40'
                        }`}
                        title="Order Actions"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {/* Animated Three-Dot Action Menu Popover */}
                      {isMenuOpen && (
                        <FloatingMenu width={256} onClose={() => setOpenMenuOrderId(null)} className="rounded-2xl bg-card border border-border shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                          <div className="px-2.5 py-1 border-b border-border/60 flex items-center justify-between">
                            <span className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground">
                              Actions · WEB-{order._id.slice(-6).toUpperCase()}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                              {currentStatusCode}
                            </span>
                          </div>

                          {/* 1. View Order Dossier */}
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuOrderId(null);
                              setSelectedOrder(order);
                              setDetailModalOpen(true);
                            }}
                            className="w-full text-left p-2 rounded-xl hover:bg-blue-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                              <Eye size={14} />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-bold text-foreground group-hover:text-blue-600">
                                View Order Details
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                Full dossier, items & timeline
                              </div>
                            </div>
                          </button>

                          {/* 2. Manage Return / Exchange (if active) */}
                          {(isExchangeRequested || isReturnRequested) && (
                            <button
                              type="button"
                              onClick={() => openReturnModal(order)}
                              className="w-full text-left p-2 rounded-xl hover:bg-purple-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                                <RotateCcw size={14} />
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-bold text-foreground group-hover:text-purple-600">
                                  {isExchangeRequested ? 'Manage Exchange Swap' : 'Manage Return & Refund'}
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  Approve, assign pickup, QC & refund
                                </div>
                              </div>
                            </button>
                          )}

                          {/* 3. Assign / Reassign Rider or Logistics (if not terminal) */}
                          {!isTerminal && (
                            <button
                              type="button"
                              onClick={() => openLogisticsModal(order, Boolean(order.driverName || order.deliveryType === 'IN_HOUSE'))}
                              className="w-full text-left p-2 rounded-xl hover:bg-indigo-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                                <Truck size={14} />
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-bold text-foreground group-hover:text-indigo-600">
                                  {order.driverName ? 'Reassign Rider / Fleet' : 'Assign Rider / 3PL Courier'}
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  {order.driverName ? `Current: ${order.driverName}` : 'Dispatch with Rider or AWB'}
                                </div>
                              </div>
                            </button>
                          )}

                          {/* 4. Change Order Status (if not terminal) */}
                          {!isTerminal && (
                            <button
                              type="button"
                              onClick={() => openStatusModal(order)}
                              className="w-full text-left p-2 rounded-xl hover:bg-emerald-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                                <Sliders size={14} />
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-bold text-foreground group-hover:text-emerald-600">
                                  Change Order Status
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  Update milestone & email alert
                                </div>
                              </div>
                            </button>
                          )}

                          {/* 5. Collect Rider COD Cash at Hub (if cash in hand) */}
                          {isCodCashInHand && (
                            <button
                              type="button"
                              onClick={() => handleSettleRiderCash([order._id], order.driverName || order.deliveredByRider || 'Rider')}
                              className="w-full text-left p-2 rounded-xl hover:bg-amber-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 group-hover:bg-amber-500 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                                <CreditCard size={14} />
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-bold text-amber-700 dark:text-amber-300">
                                  Collect Rider COD Cash
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  Mark {formatOrderCurrency(order.totalAmount, order.currency)} received at Hub
                                </div>
                              </div>
                            </button>
                          )}

                          <div className="border-t border-border/60 my-1" />

                          {/* 6. Print Tax Invoice (A4) */}
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuOrderId(null);
                              window.open(`/ecommerce/orders/${order._id}/invoice`, '_blank');
                            }}
                            className="w-full text-left p-2 rounded-xl hover:bg-blue-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-lg bg-muted text-muted-foreground group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                              <FileText size={14} />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-bold text-foreground group-hover:text-blue-600">
                                Print Tax Invoice (A4)
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                Official customer tax invoice
                              </div>
                            </div>
                          </button>

                          {/* 7. Print Box Label (4x6) */}
                          {!isCancelled && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuOrderId(null);
                                window.open(`/ecommerce/orders/${order._id}/shipping-label`, '_blank');
                              }}
                              className="w-full text-left p-2 rounded-xl hover:bg-purple-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded-lg bg-muted text-muted-foreground group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                                <Package size={14} />
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-bold text-foreground group-hover:text-purple-600">
                                  Print Box Label (4x6)
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  Carton thermal sticker & QR
                                </div>
                              </div>
                            </button>
                          )}

                          {/* 8. Open Rider Verification Screen */}
                          {isInHouse && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuOrderId(null);
                                window.open(`/rider/verify/${order._id}`, '_blank');
                              }}
                              className="w-full text-left p-2 rounded-xl hover:bg-emerald-500/10 transition-colors flex items-center gap-2.5 group cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded-lg bg-muted text-muted-foreground group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                                <Camera size={14} />
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-bold text-foreground group-hover:text-emerald-600">
                                  Open Rider POD Screen
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  Doorstep OTP, UPI QR & photo proof
                                </div>
                              </div>
                            </button>
                          )}
                        </FloatingMenu>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: REDESIGNED ORDER DETAILS POPUP (Help Center Aesthetic)           */}
      {/* ========================================================================= */}
      <HelpStyleModal
        isOpen={detailModalOpen && Boolean(selectedOrder)}
        onClose={() => setDetailModalOpen(false)}
        badge="E-COMMERCE FULFILLMENT · ORDER DOSSIER"
        title={selectedOrder ? `Order Details: WEB-${selectedOrder._id.slice(-6).toUpperCase()}` : 'Order Details'}
        subtitle={
          selectedOrder
            ? `Placed on ${format(new Date(selectedOrder.createdAt), 'MMMM d, yyyy · h:mm a')} by ${selectedOrder.customerName}`
            : ''
        }
        maxWidth="max-w-2xl"
      >
        {selectedOrder && (
          <div className="space-y-4 ecom-slide-up">
            {/* 1. COMPACT MODULE BANNER (Matches Help Center Sales & POS Banner) */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white shadow-xs space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[9.5px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-md text-white">
                  {selectedOrder.deliveryType === 'IN_HOUSE' ? 'IN-HOUSE RIDER FLEET' : 'STANDARD FULFILLMENT'} · {selectedOrder.ecomStatusCode || selectedOrder.status}
                </span>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => window.open(`/ecommerce/orders/${selectedOrder._id}/invoice`, '_blank')}
                    className="px-2.5 py-1 bg-white/20 hover:bg-white/30 active:scale-95 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer text-white shadow-2xs"
                  >
                    <FileText size={12} /> Print Tax Invoice (A4)
                  </button>

                  {selectedOrder.status !== 'CANCELLED' && (
                    <button
                      type="button"
                      onClick={() => window.open(`/ecommerce/orders/${selectedOrder._id}/shipping-label`, '_blank')}
                      className="px-2.5 py-1 bg-white/15 hover:bg-white/25 active:scale-95 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer text-white shadow-2xs"
                    >
                      <Package size={12} /> Print Box Label (4x6)
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-baseline justify-between flex-wrap gap-2 pt-0.5">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    {selectedOrder.customerName}
                  </h3>
                  <p className="text-[11px] text-white/85">
                    {selectedOrder.deliveryType === 'IN_HOUSE'
                      ? `Assigned to In-House Driver: ${selectedOrder.driverName || 'Pending'} (${selectedOrder.driverPhone || 'No Phone'})`
                      : `Carrier: ${selectedOrder.carrier || 'Pending Assignment'} · AWB: ${selectedOrder.trackingNumber || 'N/A'}`}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[9.5px] uppercase font-black tracking-wider text-white/75 block">
                    Total Order Value
                  </span>
                  <span className="text-base sm:text-lg font-black text-white">
                    {formatOrderCurrency(selectedOrder.totalAmount, selectedOrder.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. CUSTOMER, PAYMENT & SHIPPING BREAKDOWN (Help Center Action Grid Style) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Customer Profile */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <div className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <User size={11} className="text-blue-600" /> Customer Information
                </div>
                <div className="font-bold text-foreground text-xs">
                  {selectedOrder.customerName}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {selectedOrder.customerEmail || 'No email provided'}
                </div>
                {selectedOrder.customerPhone && (
                  <div className="text-[11px] font-mono text-muted-foreground">
                    Tel: {selectedOrder.customerPhone}
                  </div>
                )}
              </div>

              {/* Payment & Settlement Summary */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <div className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <CreditCard size={11} className="text-emerald-600" /> Payment & Settlement
                </div>
                <div className="font-bold text-foreground text-xs flex items-center justify-between">
                  <span>{selectedOrder.paymentMethod || 'COD'}</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase">
                    {selectedOrder.paymentStatus || 'UNPAID'}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Amount: <strong className="text-foreground">{formatOrderCurrency(selectedOrder.totalAmount, selectedOrder.currency)}</strong>
                </div>
                {selectedOrder.codCollectionMethod && selectedOrder.codCollectionMethod !== 'NONE' && (
                  <div className="text-[10.5px] text-blue-600 dark:text-blue-400 font-bold">
                    Collected via: {selectedOrder.codCollectionMethod.replace('_', ' ')}
                  </div>
                )}
              </div>

              {/* Shipping Destination */}
              <div className="sm:col-span-2 p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <MapPin size={11} className="text-blue-600" /> Shipping Destination
                  </span>
                  {selectedOrder.shippingAddress && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrder.shippingAddress)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10.5px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      Open in Maps <ExternalLink size={10} />
                    </a>
                  )}
                </div>
                <div className="text-xs text-foreground font-medium leading-relaxed">
                  {selectedOrder.shippingAddress || 'Store Pickup'}
                </div>
              </div>
            </div>

            {/* 2B. DOORSTEP PROOF OF DELIVERY (POD PHOTO & CUSTOMER SIGNATURE) */}
            {(selectedOrder.deliveryProofPhoto || selectedOrder.customerSignature || selectedOrder.deliveredAt) && (
              <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/30 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <Camera size={13} className="text-emerald-600" />
                    Doorstep Proof of Delivery (POD) & Handover Evidence
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-md">
                    {selectedOrder.deliveredAt
                      ? `Delivered: ${format(new Date(selectedOrder.deliveredAt), 'MMM d, yyyy · h:mm a')}`
                      : 'Verified at Doorstep'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Uploaded Delivery Photo */}
                  {selectedOrder.deliveryProofPhoto ? (
                    <div className="p-2.5 rounded-xl bg-card border border-border/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-muted-foreground">
                          1. Uploaded Package / Doorstep Photo
                        </span>
                        <a
                          href={selectedOrder.deliveryProofPhoto}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          Full Image <ExternalLink size={10} />
                        </a>
                      </div>
                      <a
                        href={selectedOrder.deliveryProofPhoto}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full h-36 rounded-lg overflow-hidden bg-slate-950 border border-border/60"
                      >
                        <img
                          src={selectedOrder.deliveryProofPhoto}
                          alt="Doorstep Proof of Delivery"
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </a>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-card border border-border/60 flex items-center justify-center text-muted-foreground text-[11px]">
                      No Photo POD uploaded for this order.
                    </div>
                  )}

                  {/* Uploaded Customer E-Signature */}
                  {selectedOrder.customerSignature ? (
                    <div className="p-2.5 rounded-xl bg-card border border-border/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-muted-foreground">
                          2. Customer E-Signature
                        </span>
                        <a
                          href={selectedOrder.customerSignature}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          Open Signature <ExternalLink size={10} />
                        </a>
                      </div>
                      <div className="w-full h-36 rounded-lg bg-white border border-border/60 flex items-center justify-center p-2">
                        <img
                          src={selectedOrder.customerSignature}
                          alt="Customer E-Signature"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-card border border-border/60 flex flex-col justify-center space-y-1 text-[11px]">
                      <div className="font-bold text-foreground">Handover Metadata</div>
                      <div className="text-muted-foreground">
                        Delivered By: <strong className="text-foreground">{selectedOrder.deliveredByRider || selectedOrder.driverName || 'Rider'}</strong>
                      </div>
                      {selectedOrder.deliveryNotes && (
                        <div className="text-muted-foreground italic">
                          Note: "{selectedOrder.deliveryNotes}"
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {(selectedOrder.deliveredByRider || selectedOrder.deliveryNotes) && selectedOrder.customerSignature && (
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-[10.5px] text-muted-foreground border-t border-emerald-500/20">
                    <span>
                      Verified By Rider: <strong className="text-foreground">{selectedOrder.deliveredByRider || selectedOrder.driverName || 'In-House Rider'}</strong>
                    </span>
                    {selectedOrder.deliveryNotes && (
                      <span className="italic">Rider Note: "{selectedOrder.deliveryNotes}"</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. MULTI-LOCATION STOCK PICKING ALLOCATION */}
            {selectedOrder.fulfillmentLocations && selectedOrder.fulfillmentLocations.length > 0 && (
              <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-1.5">
                <div className="text-[9.5px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <Building2 size={12} /> Multi-Location Stock Picking Allocation
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {selectedOrder.fulfillmentLocations.map((fl, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-card border border-border/60 flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">{fl.branchName || 'Warehouse / Outlet'}</span>
                      <span className="text-[10.5px] font-black text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                        {fl.quantity} unit(s) picked
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. ORDERED ITEMS (Help Center Submodule Feature List Style) */}
            <div className="space-y-1.5">
              <div className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground">
                Ordered Items ({(selectedOrder.items || []).length})
              </div>
              <div className="space-y-1.5">
                {(selectedOrder.items || []).map((item, idx) => {
                  const unitPrice = Number(item.unitPrice || item.price || 0);
                  const lineTotal = Number(item.subTotal || unitPrice * Number(item.quantity || 1));
                  return (
                    <div
                      key={idx}
                      className="p-2.5 sm:p-3 rounded-xl bg-card border border-border/80 shadow-2xs flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-black shrink-0">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <div className="font-bold text-foreground text-xs truncate">
                            {item.productId?.name || item.name || 'Product'}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            SKU: <span className="font-mono">{item.productId?.sku || item.sku || 'N/A'}</span> · Qty: <strong>{item.quantity}</strong> × {formatOrderCurrency(unitPrice, selectedOrder.currency)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-blue-600 dark:text-blue-400 text-xs">
                          {formatOrderCurrency(lineTotal, selectedOrder.currency)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. ORDER STATUS HISTORY TIMELINE (Help Center SOP Step Style) */}
            <div className="space-y-2 pt-1 border-t border-border/60">
              <div className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground">
                Order Status & Audit Timeline ({(selectedOrder.statusHistory || []).length})
              </div>
              <div className="space-y-1.5">
                {(selectedOrder.statusHistory || []).map((sh, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-muted/30 border border-border/60 flex items-start justify-between gap-2"
                  >
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-foreground text-[11px]">{sh.status}</span>
                          {sh.emailSent && (
                            <span className="text-[9.5px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded font-bold flex items-center gap-1">
                              <Mail size={9} /> Email Dispatched
                            </span>
                          )}
                        </div>
                        {sh.note && (
                          <div className="text-[10.5px] text-muted-foreground leading-snug">
                            {sh.note}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-muted-foreground shrink-0">
                      <div>{format(new Date(sh.changedAt), 'MMM d, yyyy · h:mm a')}</div>
                      <div className="font-semibold">by {sh.changedBy || 'System'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </HelpStyleModal>

      {/* ========================================================================= */}
      {/* MODAL 2: STATUS CHANGE MODAL (Help Center Aesthetic)                      */}
      {/* ========================================================================= */}
      <HelpStyleModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        badge="WORKFLOW MILESTONE TRANSITION"
        title={`Update Status: WEB-${selectedOrder?._id.slice(-6).toUpperCase()}`}
        subtitle="Transition this order to the next allowed operational stage and optionally dispatch an automated customer email."
        maxWidth="max-w-lg"
      >
        {availableStatuses.length === 0 ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-black text-sm">
                <ShieldAlert size={18} className="text-rose-600 shrink-0" />
                <span>Order is in Terminal State ({selectedOrderCurrentCode})</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {selectedOrderCurrentCode === 'CANCELLED'
                  ? 'This order has been cancelled and locked. It cannot be modified, dispatched, or marked as delivered.'
                  : 'This order has reached the final DELIVERED state and cannot be rolled back to pending or in-transit states.'}
              </p>
            </div>
            <div className="flex justify-end pt-3 border-t border-border/80">
              <button
                type="button"
                onClick={() => setStatusModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-muted text-foreground text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleStatusChangeSubmit} className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border/80 text-xs">
              <span className="text-muted-foreground font-bold uppercase text-[10px] tracking-wider">Current Stage</span>
              <span className="font-black uppercase px-2.5 py-0.5 rounded-md bg-blue-500/15 text-blue-700 dark:text-blue-300 text-[11px]">
                {selectedOrder?.ecomStatusId?.name || selectedOrderCurrentCode}
              </span>
            </div>

            <FormField label="Select Allowed Next Status" required>
              <Select
                value={statusForm.statusId}
                onChange={e => {
                  const sId = e.target.value;
                  const matched = statuses.find(s => s._id === sId);
                  setStatusForm({
                    ...statusForm,
                    statusId: sId,
                    customSendEmail: matched ? matched.sendEmailToCustomer : false
                  });
                }}
              >
                <option value="" disabled>-- Select Valid Next Status --</option>
                {availableStatuses.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.name} {s.sendEmailToCustomer ? '(Sends Email)' : '(Internal - No Email)'}
                  </option>
                ))}
              </Select>
            </FormField>

            {selectedStatusDoc && (
              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                statusForm.customSendEmail
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
              }`}>
                <Mail size={15} className="shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">
                    {statusForm.customSendEmail
                      ? 'Customer Email Notification Enabled'
                      : 'Internal Status: Customer Email Suppressed'}
                  </div>
                  <div className="mt-0.5 text-[11px] opacity-90">
                    {statusForm.customSendEmail
                      ? `An automated email update will be dispatched to ${selectedOrder?.customerEmail} upon saving.`
                      : 'No email will be sent to the customer for this internal workflow milestone.'}
                  </div>
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-xl border border-border/60 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(statusForm.customSendEmail)}
                onChange={e => setStatusForm({ ...statusForm, customSendEmail: e.target.checked })}
                className="h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-bold text-foreground">
                Send status notification email to customer
              </span>
            </label>

            <FormField label="Internal Notes / Processing Remarks">
              <Input
                placeholder="e.g., Assigned to warehouse picker, staged at Bay 4..."
                value={statusForm.note}
                onChange={e => setStatusForm({ ...statusForm, note: e.target.value })}
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/80">
              <button
                type="button"
                onClick={() => setStatusModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black shadow-xs cursor-pointer transition-all"
              >
                Update Order Status
              </button>
            </div>
          </form>
        )}
      </HelpStyleModal>

      {/* ========================================================================= */}
      {/* MODAL 3: HYBRID LOGISTICS & RIDER ASSIGNMENT MODAL (Help Center Style)    */}
      {/* ========================================================================= */}
      <HelpStyleModal
        isOpen={logisticsModalOpen}
        onClose={() => setLogisticsModalOpen(false)}
        badge="FLEET & COURIER DISPATCH"
        title={`Fulfill & Dispatch Order: WEB-${selectedOrder?._id.slice(-6).toUpperCase()}`}
        subtitle="Assign or reassign an In-House Delivery Executive or link a Third-Party Courier Waybill (AWB)."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleLogisticsSubmit} className="space-y-4">
          {/* Delivery Mode Toggle Tabs */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider">
              Step 1: Choose Fulfillment Mode
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setLogisticsForm({ ...logisticsForm, deliveryType: 'IN_HOUSE' })}
                className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                  logisticsForm.deliveryType === 'IN_HOUSE'
                    ? 'bg-blue-500/10 border-blue-500 shadow-2xs ring-1 ring-blue-500/20'
                    : 'bg-muted/30 hover:bg-muted/60 border-border/80'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  logisticsForm.deliveryType === 'IN_HOUSE' ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  <Building2 size={15} />
                </div>
                <div className="truncate">
                  <div className="text-xs font-black text-foreground">In-House Rider Fleet</div>
                  <div className="text-[10px] text-muted-foreground truncate">Doorstep OTP, POD & COD QR</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLogisticsForm({ ...logisticsForm, deliveryType: 'THIRD_PARTY' })}
                className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                  logisticsForm.deliveryType === 'THIRD_PARTY'
                    ? 'bg-blue-500/10 border-blue-500 shadow-2xs ring-1 ring-blue-500/20'
                    : 'bg-muted/30 hover:bg-muted/60 border-border/80'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  logisticsForm.deliveryType === 'THIRD_PARTY' ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  <Truck size={15} />
                </div>
                <div className="truncate">
                  <div className="text-xs font-black text-foreground">3PL Courier Partner</div>
                  <div className="text-[10px] text-muted-foreground truncate">BlueDart, Delhivery, DHL AWB</div>
                </div>
              </button>
            </div>
          </div>

          {logisticsForm.deliveryType === 'THIRD_PARTY' ? (
            <div className="space-y-3 p-3.5 rounded-xl bg-muted/30 border border-border/60">
              <FormField label="Courier Partner / Carrier" required>
                <Select
                  value={logisticsForm.carrierId}
                  onChange={e => setLogisticsForm({ ...logisticsForm, carrierId: e.target.value })}
                >
                  <option value="" disabled>-- Select Courier Partner --</option>
                  {carriers.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.carrierName} ({c.carrierCode})
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Tracking Number / Waybill (AWB)" required>
                <Input
                  placeholder="e.g., BD123456789IN, 9876543210..."
                  value={logisticsForm.trackingNumber}
                  onChange={e => setLogisticsForm({ ...logisticsForm, trackingNumber: e.target.value })}
                />
              </FormField>
            </div>
          ) : (
            <div className="space-y-3 p-3.5 rounded-xl bg-muted/30 border border-border/60">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="text-[10.5px] font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Truck size={13} className="text-blue-600" />
                  {selectedOrder?.driverName ? 'Reassign In-House Delivery Rider' : 'Assign In-House Delivery Rider'}
                </span>
                {selectedOrder?.driverName && (
                  <span className="text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                    Current: {selectedOrder.driverName} ({selectedOrder.driverPhone || 'N/A'})
                  </span>
                )}
              </div>

              {/* 1-Click Quick-Pick Existing Riders */}
              {knownRiders.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Quick-Select Existing Rider (1-Click):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {knownRiders.map((r, idx) => {
                      const isCurrentInput =
                        logisticsForm.driverName === r.driverName &&
                        logisticsForm.driverPhone === r.driverPhone;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            setLogisticsForm({
                              ...logisticsForm,
                              driverName: r.driverName,
                              driverPhone: r.driverPhone,
                              vehicleNumber: r.vehicleNumber || logisticsForm.vehicleNumber
                            })
                          }
                          className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            isCurrentInput
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-card hover:bg-blue-500/10 text-foreground border-border/80'
                          }`}
                        >
                          <Truck size={11} />
                          <span>{r.driverName}</span>
                          {r.driverPhone && <span className="opacity-75 font-mono">({r.driverPhone})</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Driver / Rider Name" required>
                  <Input
                    placeholder="e.g., Rahul Sharma"
                    value={logisticsForm.driverName}
                    onChange={e => setLogisticsForm({ ...logisticsForm, driverName: e.target.value })}
                  />
                </FormField>
                <FormField label="Driver Contact Phone" required>
                  <Input
                    placeholder="e.g., 9876543210"
                    value={logisticsForm.driverPhone}
                    onChange={e => setLogisticsForm({ ...logisticsForm, driverPhone: e.target.value })}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Vehicle / Van No.">
                  <Input
                    placeholder="e.g., VAN-101 or Bike 02"
                    value={logisticsForm.vehicleNumber}
                    onChange={e => setLogisticsForm({ ...logisticsForm, vehicleNumber: e.target.value })}
                  />
                </FormField>
                <FormField label="Fleet Label Name">
                  <Input
                    placeholder="e.g., JTS Express (Self Fleet)"
                    value={logisticsForm.carrierName || 'JTS Express (Self Fleet)'}
                    onChange={e => setLogisticsForm({ ...logisticsForm, carrierName: e.target.value })}
                  />
                </FormField>
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-xl border border-border/60 cursor-pointer">
            <input
              type="checkbox"
              checked={logisticsForm.updateToShipped}
              onChange={e => setLogisticsForm({ ...logisticsForm, updateToShipped: e.target.checked })}
              className="h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-foreground">
              Automatically advance order status to "Dispatched / In Transit" and notify customer
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t border-border/80">
            <button
              type="button"
              onClick={() => setLogisticsModalOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black shadow-xs cursor-pointer transition-all"
            >
              Save Logistics Details
            </button>
          </div>
        </form>
      </HelpStyleModal>

      {/* ========================================================================= */}
      {/* MODAL 4: RETURN & EXCHANGE LIFECYCLE MODAL (Help Center Aesthetic)        */}
      {/* ========================================================================= */}
      <HelpStyleModal
        isOpen={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        badge="REVERSE LOGISTICS & RESOLUTION SOP"
        title={`Reverse Logistics: WEB-${selectedOrder?._id.slice(-6).toUpperCase()}`}
        subtitle="Approve customer return or exchange requests, dispatch riders for doorstep pickup/swap, inspect items, and issue refunds."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleReturnActionSubmit} className="space-y-4 text-xs">
          {/* Request Summary Banner */}
          <div className={`p-3.5 rounded-xl border space-y-2 ${
            selectedOrder?.returnType === 'EXCHANGE'
              ? 'bg-purple-500/5 border-purple-500/30'
              : 'bg-rose-500/5 border-rose-500/30'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="font-black text-foreground flex items-center gap-1.5 text-xs">
                <RotateCcw size={14} className={selectedOrder?.returnType === 'EXCHANGE' ? 'text-purple-600' : 'text-rose-600'} />
                {selectedOrder?.returnType === 'EXCHANGE' ? 'Product Exchange (Doorstep Swap) Request' : 'Customer Return & Refund Request'}
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-muted text-foreground">
                Status: {selectedOrder?.returnStatus || 'REQUESTED'}
              </span>
            </div>

            {selectedOrder?.returnPickupOtp && (
              <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/30 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-[10.5px] font-black text-amber-800 dark:text-amber-300 uppercase flex items-center gap-1">
                    <ShieldAlert size={13} className="text-amber-600" />
                    Customer Handover OTP
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Customer shares this code with Rider at doorstep.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="font-mono text-xs font-black text-amber-700 dark:text-amber-300 bg-card px-2.5 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1.5">
                    <span>{revealedOtps[selectedOrder._id] ? selectedOrder.returnPickupOtp : '••••••'}</span>
                    <button
                      type="button"
                      onClick={() => toggleRevealOtp(selectedOrder._id)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Eye size={13} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResendReturnOtp(selectedOrder._id)}
                    disabled={isResendingOtp || !selectedOrder.customerEmail}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10.5px] rounded-lg cursor-pointer disabled:opacity-50"
                  >
                    {isResendingOtp ? 'Sending...' : 'Resend OTP'}
                  </button>
                </div>
              </div>
            )}

            <div className="text-[11px] text-muted-foreground">
              Reason: <strong className="text-foreground">{selectedOrder?.exchangeReason || selectedOrder?.returnReason || 'Not specified'}</strong>
            </div>
          </div>

          <FormField label="Select Lifecycle Workflow Action" required>
            <Select
              value={returnForm.action}
              onChange={e => setReturnForm({ ...returnForm, action: e.target.value })}
            >
              {selectedOrder?.returnType === 'EXCHANGE' ? (
                <>
                  <option value="APPROVE_AND_ASSIGN">1. Approve & Send Rider for Doorstep Swap</option>
                  <option value="CONFIRM_PICKUP">2. Confirm Doorstep Handover & Verify Customer OTP</option>
                  <option value="INSPECT_WAREHOUSE">3. Warehouse Quality Inspection & Restock Old Item</option>
                  <option value="COMPLETE_EXCHANGE">4. Complete Exchange (Doorstep Swap Closed)</option>
                  <option value="REJECT">Reject Exchange Request</option>
                </>
              ) : (
                <>
                  <option value="APPROVE_AND_ASSIGN">1. Approve & Send Rider for Pickup (Generates OTP)</option>
                  <option value="CONFIRM_PICKUP">2. Confirm Doorstep Handover & Verify Customer OTP</option>
                  <option value="INSPECT_WAREHOUSE">3. Warehouse Quality Inspection (Condition & Restock)</option>
                  <option value="PROCESS_REFUND">4. Quality Check Passed & Issue Refund</option>
                  <option value="REJECT">Reject Return Request</option>
                </>
              )}
            </Select>
          </FormField>

          {(returnForm.action === 'APPROVE_AND_ASSIGN' || returnForm.action === 'ASSIGN_PICKUP' || returnForm.action === 'APPROVE') && (
            <div className="p-3.5 bg-muted/30 rounded-xl border border-border/60 space-y-3">
              <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <Truck size={14} className="text-blue-600" />
                {selectedOrder?.returnType === 'EXCHANGE' ? 'Doorstep Swap Fleet Assignment' : 'Reverse Pickup Fleet Assignment'}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <FormField label="Rider Name" required>
                  <Input
                    placeholder="e.g. Rahul"
                    value={returnForm.riderName}
                    onChange={e => setReturnForm({ ...returnForm, riderName: e.target.value })}
                  />
                </FormField>
                <FormField label="Rider Phone" required>
                  <Input
                    placeholder="e.g. 9876543210"
                    value={returnForm.riderPhone}
                    onChange={e => setReturnForm({ ...returnForm, riderPhone: e.target.value })}
                  />
                </FormField>
                <FormField label="Vehicle Number">
                  <Input
                    placeholder="e.g. DL-01-AB-1234"
                    value={returnForm.vehicleNumber}
                    onChange={e => setReturnForm({ ...returnForm, vehicleNumber: e.target.value })}
                  />
                </FormField>
              </div>
            </div>
          )}

          {returnForm.action === 'CONFIRM_PICKUP' && (
            <div className="p-3.5 bg-muted/30 rounded-xl border border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <FormField label="Customer Pickup OTP" required>
                <Input
                  placeholder="Enter OTP given by customer"
                  value={returnForm.pickupOtpEntered}
                  onChange={e => setReturnForm({ ...returnForm, pickupOtpEntered: e.target.value })}
                />
              </FormField>
              <FormField label="Handover Proof / Package Seal #">
                <Input
                  placeholder="e.g. Seal #9821"
                  value={returnForm.handoverProof}
                  onChange={e => setReturnForm({ ...returnForm, handoverProof: e.target.value })}
                />
              </FormField>
            </div>
          )}

          {returnForm.action === 'INSPECT_WAREHOUSE' && (
            <div className="p-3.5 bg-muted/30 rounded-xl border border-border/60 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <FormField label="QC Inspection Result" required>
                  <Select
                    value={returnForm.inspectionResult}
                    onChange={e => setReturnForm({ ...returnForm, inspectionResult: e.target.value })}
                  >
                    <option value="PASSED_SELLABLE">PASSED (Unused/Sellable - Auto Restock)</option>
                    <option value="FAILED_DAMAGED">FAILED (Damaged / Scrap)</option>
                  </Select>
                </FormField>
                <FormField label="Warehouse Branch to Restock" required>
                  <Select
                    value={returnForm.restockBranchId}
                    onChange={e => setReturnForm({ ...returnForm, restockBranchId: e.target.value })}
                  >
                    {branches.length > 0 ? (
                      branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)
                    ) : (
                      <option value={selectedOrder?.branchId?._id || selectedOrder?.branchId}>Primary Branch</option>
                    )}
                  </Select>
                </FormField>
              </div>
              <FormField label="Inspection Verification Notes">
                <Input
                  value={returnForm.inspectionNotes}
                  onChange={e => setReturnForm({ ...returnForm, inspectionNotes: e.target.value })}
                />
              </FormField>
            </div>
          )}

          {returnForm.action === 'PROCESS_REFUND' && (
            <div className="p-3.5 bg-muted/30 rounded-xl border border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <FormField label="Refund Amount (₹)" required>
                <Input
                  type="number"
                  value={returnForm.refundAmount}
                  onChange={e => setReturnForm({ ...returnForm, refundAmount: e.target.value })}
                />
              </FormField>
              <FormField label="Refund Channel" required>
                <Select
                  value={returnForm.refundMode}
                  onChange={e => setReturnForm({ ...returnForm, refundMode: e.target.value })}
                >
                  <option value="WALLET_CREDIT">Store Credit / Wallet</option>
                  <option value="UPI">UPI Transfer</option>
                  <option value="BANK_ACCOUNT">Bank Account (NEFT/IMPS)</option>
                  <option value="ORIGINAL_PAYMENT">Original Source</option>
                </Select>
              </FormField>
              <FormField label="Transaction Ref ID" required>
                <Input
                  value={returnForm.refundTransactionId}
                  onChange={e => setReturnForm({ ...returnForm, refundTransactionId: e.target.value })}
                />
              </FormField>
            </div>
          )}

          <FormField label="Audit Trail Note / Remarks">
            <Input
              placeholder="e.g. Approved and dispatched rider for doorstep swap."
              value={returnForm.note}
              onChange={e => setReturnForm({ ...returnForm, note: e.target.value })}
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-3 border-t border-border/80">
            <button
              type="button"
              onClick={() => setReturnModalOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black shadow-xs cursor-pointer transition-all"
            >
              Confirm & Execute Step
            </button>
          </div>
        </form>
      </HelpStyleModal>

      {/* ========================================================================= */}
      {/* MODAL 5: BULK ASSIGN MULTIPLE PARCELS TO RIDER (Help Center Aesthetic)    */}
      {/* ========================================================================= */}
      <HelpStyleModal
        isOpen={bulkRiderModalOpen}
        onClose={() => setBulkRiderModalOpen(false)}
        badge="BATCH ROUTE RUN-SHEET"
        title={`Bulk Assign ${selectedOrderIds.length} Parcels to In-House Rider`}
        subtitle="Bundle multiple selected orders onto a single delivery executive's mobile route sheet."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleBulkAssignRider} className="space-y-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1.5">
              Selected Parcels ({selectedOrderIds.length})
            </span>
            <div className="max-h-24 overflow-y-auto custom-scrollbar p-2 bg-muted/30 rounded-xl border border-border/60 flex flex-wrap gap-1.5">
              {selectedOrderIds.map(id => {
                const ord = orders.find(o => o._id === id);
                return (
                  <span key={id} className="bg-card px-2 py-0.5 rounded-md border border-border/80 font-mono font-bold text-[10.5px] text-foreground">
                    WEB-{id.slice(-6).toUpperCase()} {ord?.customerName ? `(${ord.customerName})` : ''}
                  </span>
                );
              })}
            </div>
          </div>

          {knownRiders.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Quick-Select Existing Rider (1-Click):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {knownRiders.map((r, idx) => {
                  const isCurrentInput =
                    bulkRiderForm.driverName === r.driverName &&
                    bulkRiderForm.driverPhone === r.driverPhone;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setBulkRiderForm({
                          ...bulkRiderForm,
                          driverName: r.driverName,
                          driverPhone: r.driverPhone,
                          vehicleNumber: r.vehicleNumber || bulkRiderForm.vehicleNumber
                        })
                      }
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        isCurrentInput
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-card hover:bg-blue-500/10 text-foreground border-border/80'
                      }`}
                    >
                      <Truck size={11} />
                      <span>{r.driverName}</span>
                      {r.driverPhone && <span className="opacity-75 font-mono">({r.driverPhone})</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Rider / Driver Name" required>
              <Input
                placeholder="e.g. Rahul"
                value={bulkRiderForm.driverName}
                onChange={e => setBulkRiderForm({ ...bulkRiderForm, driverName: e.target.value })}
              />
            </FormField>
            <FormField label="Rider Mobile Phone" required>
              <Input
                type="tel"
                placeholder="e.g. 9876543210"
                value={bulkRiderForm.driverPhone}
                onChange={e => setBulkRiderForm({ ...bulkRiderForm, driverPhone: e.target.value })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Vehicle / Bike Number">
              <Input
                placeholder="e.g. DL-01-AB-1234"
                value={bulkRiderForm.vehicleNumber}
                onChange={e => setBulkRiderForm({ ...bulkRiderForm, vehicleNumber: e.target.value })}
              />
            </FormField>
            <FormField label="Fleet Name / Label">
              <Input
                placeholder="e.g. JTS In-House Fleet"
                value={bulkRiderForm.carrierName}
                onChange={e => setBulkRiderForm({ ...bulkRiderForm, carrierName: e.target.value })}
              />
            </FormField>
          </div>

          <label className="flex items-center justify-between p-2.5 bg-muted/30 rounded-xl border border-border/60 cursor-pointer">
            <div>
              <div className="font-bold text-foreground text-xs">Update Status to 'In Transit / Shipped'</div>
              <div className="text-[10.5px] text-muted-foreground">Sets all selected parcels as Dispatched with Rider</div>
            </div>
            <input
              type="checkbox"
              checked={bulkRiderForm.updateToShipped}
              onChange={e => setBulkRiderForm({ ...bulkRiderForm, updateToShipped: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-border cursor-pointer"
            />
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t border-border/80">
            <button
              type="button"
              onClick={() => setBulkRiderModalOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={bulkLoading}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black shadow-xs cursor-pointer transition-all"
            >
              {bulkLoading ? 'Assigning...' : `Confirm & Assign ${selectedOrderIds.length} Parcels`}
            </button>
          </div>
        </form>
      </HelpStyleModal>
    </div>
  );
};

export default EcomOrderProcessing;

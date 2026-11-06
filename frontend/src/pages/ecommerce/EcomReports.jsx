import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { 
  BarChart2, Download, Printer, Calendar, DollarSign, TrendingUp, 
  ShoppingBag, Users, Truck, FileSpreadsheet, FileText, CheckCircle2, 
  Clock, ArrowUpRight, Search, X, Filter, Sparkles, RefreshCw, 
  Layers, ChevronDown, CreditCard, AlertCircle, Eye, ArrowUpDown,
  Package, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { useCurrency } from '../../contexts/CurrencyContext';

/* ─── Keyframe Animations & Print Styles ─── */
const ANIMATION_AND_PRINT_STYLES = `
  @keyframes ecomFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @keyframes ecomGlowPulse { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.3; } }
  .ecom-fade-in { animation: ecomFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
  .ecom-glow-pulse { animation: ecomGlowPulse 4s ease-in-out infinite; }

  @media print {
    body * { visibility: hidden !important; }
    #printable-report-area, #printable-report-area * { visibility: visible !important; }
    #printable-report-area {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      background: white !important;
      color: black !important;
      padding: 20px !important;
    }
    .no-print { display: none !important; }
  }
`;

const EcomReports = () => {
  const { currency = 'INR', formatPrice } = useCurrency() || {};
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [dateRange, setDateRange] = useState('ALL'); // 'TODAY' | '7DAYS' | 'THIS_MONTH' | '30DAYS' | 'ALL' | 'CUSTOM'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Active Report Tab: 'ORDERS' | 'PRODUCTS' | 'CUSTOMERS' | 'LOGISTICS'
  const [activeReportTab, setActiveReportTab] = useState('ORDERS');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  // Currency Formatter fallback
  const formatMoney = (amount) => {
    if (typeof formatPrice === 'function') {
      return formatPrice(amount);
    }
    try {
      return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
        style: 'currency',
        currency: currency || 'INR',
        maximumFractionDigits: 2
      }).format(Number(amount || 0));
    } catch {
      return `${currency} ${Number(amount || 0).toFixed(2)}`;
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Close export menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/api/v1/ecommerce-admin/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch orders for reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Filter Orders by Date Range
  const dateFilteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter(order => {
      if (!order.createdAt) return true;
      const orderDate = new Date(order.createdAt);

      if (dateRange === 'TODAY') {
        return orderDate.toDateString() === now.toDateString();
      }
      if (dateRange === '7DAYS') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return orderDate >= sevenDaysAgo;
      }
      if (dateRange === 'THIS_MONTH') {
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      }
      if (dateRange === '30DAYS') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return orderDate >= thirtyDaysAgo;
      }
      if (dateRange === 'CUSTOM') {
        if (customStart && orderDate < new Date(customStart)) return false;
        if (customEnd) {
          const end = new Date(customEnd);
          end.setHours(23, 59, 59, 999);
          if (orderDate > end) return false;
        }
      }
      return true;
    });
  }, [orders, dateRange, customStart, customEnd]);

  // 2. Filter Orders by Status, Payment, Search Query
  const filteredOrders = useMemo(() => {
    return dateFilteredOrders.filter(order => {
      // Status Filter
      if (statusFilter !== 'ALL') {
        const orderStatus = (order.ecomStatusCode || order.status || '').toUpperCase();
        if (statusFilter === 'DELIVERED' && !orderStatus.includes('DELIVER')) return false;
        if (statusFilter === 'PROCESSING' && !orderStatus.includes('PROCESS')) return false;
        if (statusFilter === 'SHIPPED' && !orderStatus.includes('SHIP') && !orderStatus.includes('TRANSIT')) return false;
        if (statusFilter === 'CANCELLED' && !orderStatus.includes('CANCEL')) return false;
        if (statusFilter === 'RETURNED' && !orderStatus.includes('RETURN') && order.returnStatus !== 'RETURNED') return false;
      }

      // Payment Filter
      if (paymentFilter !== 'ALL') {
        const method = (order.paymentMethod || '').toUpperCase();
        if (paymentFilter === 'COD' && !method.includes('COD') && !method.includes('CASH')) return false;
        if (paymentFilter === 'ONLINE' && (method.includes('COD') || method.includes('CASH'))) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const num = (order.orderNumber || order._id || '').toLowerCase();
        const name = (order.customerName || order.shippingAddressObj?.fullName || '').toLowerCase();
        const phone = (order.customerPhone || order.shippingAddressObj?.phone || '').toLowerCase();
        const email = (order.customerEmail || '').toLowerCase();
        const hasItem = Array.isArray(order.items) && order.items.some(it => 
          (it.name || it.productId?.name || '').toLowerCase().includes(query)
        );
        return num.includes(query) || name.includes(query) || phone.includes(query) || email.includes(query) || hasItem;
      }

      return true;
    });
  }, [dateFilteredOrders, statusFilter, paymentFilter, searchQuery]);

  // Overall Aggregate KPIs
  const kpis = useMemo(() => {
    let totalRevenue = 0;
    let totalItems = 0;
    let deliveredCount = 0;
    let codCount = 0;
    let onlineCount = 0;
    let returnedCount = 0;

    filteredOrders.forEach(o => {
      const amt = Number(o.totalAmount || o.total || 0);
      totalRevenue += amt;

      const itemsList = Array.isArray(o.items) ? o.items : [];
      totalItems += itemsList.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);

      const status = (o.ecomStatusCode || o.status || '').toUpperCase();
      if (status.includes('DELIVER')) deliveredCount++;
      if (status.includes('RETURN') || o.returnStatus === 'RETURNED') returnedCount++;

      const method = (o.paymentMethod || '').toUpperCase();
      if (method.includes('COD') || method.includes('CASH')) {
        codCount++;
      } else {
        onlineCount++;
      }
    });

    const totalOrdersCount = filteredOrders.length;
    const aov = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;
    const deliveryRate = totalOrdersCount > 0 ? Math.round((deliveredCount / totalOrdersCount) * 100) : 0;

    return {
      totalRevenue,
      totalOrdersCount,
      totalItems,
      aov,
      deliveredCount,
      deliveryRate,
      codCount,
      onlineCount,
      returnedCount
    };
  }, [filteredOrders]);

  // Product-Level Report Aggregation
  const productReportData = useMemo(() => {
    const productMap = {};

    filteredOrders.forEach(order => {
      const items = Array.isArray(order.items) ? order.items : [];
      items.forEach(it => {
        const prodId = it.productId?._id || it.productId || it.name || 'Unknown Product';
        const prodName = it.name || it.productId?.name || 'Unnamed Product';
        const prodSku = it.sku || it.productId?.sku || '-';
        const qty = Number(it.quantity || 1);
        const price = Number(it.unitPrice || it.price || 0);
        const lineTotal = Number(it.total || it.totalPrice || (qty * price));

        if (!productMap[prodId]) {
          productMap[prodId] = {
            id: prodId,
            name: prodName,
            sku: prodSku,
            unitsSold: 0,
            revenue: 0,
            orderAppearances: 0
          };
        }

        productMap[prodId].unitsSold += qty;
        productMap[prodId].revenue += lineTotal;
        productMap[prodId].orderAppearances += 1;
      });
    });

    return Object.values(productMap).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  // Customer-Level Report Aggregation
  const customerReportData = useMemo(() => {
    const customerMap = {};

    filteredOrders.forEach(order => {
      const phone = order.customerPhone || order.shippingAddressObj?.phone || 'No Phone';
      const name = order.customerName || order.shippingAddressObj?.fullName || 'Guest Customer';
      const email = order.customerEmail || '-';
      const city = order.shippingAddressObj?.city || order.shippingAddressObj?.state || '-';
      const amt = Number(order.totalAmount || order.total || 0);
      const key = phone !== 'No Phone' ? phone : (email !== '-' ? email : name);

      if (!customerMap[key]) {
        customerMap[key] = {
          name,
          phone,
          email,
          city,
          orderCount: 0,
          totalSpent: 0,
          lastOrderDate: order.createdAt
        };
      }

      customerMap[key].orderCount += 1;
      customerMap[key].totalSpent += amt;
      if (new Date(order.createdAt) > new Date(customerMap[key].lastOrderDate)) {
        customerMap[key].lastOrderDate = order.createdAt;
      }
    });

    return Object.values(customerMap).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [filteredOrders]);

  // Logistics & Carrier Report Aggregation
  const logisticsReportData = useMemo(() => {
    const carrierMap = {};

    filteredOrders.forEach(order => {
      const carrierName = order.carrierId?.carrierName || order.driverName || 'Self / Standard Fulfillment';
      const status = (order.ecomStatusCode || order.status || '').toUpperCase();
      const amt = Number(order.totalAmount || order.total || 0);

      if (!carrierMap[carrierName]) {
        carrierMap[carrierName] = {
          name: carrierName,
          shipmentCount: 0,
          deliveredCount: 0,
          inTransitCount: 0,
          returnedCount: 0,
          totalValue: 0
        };
      }

      carrierMap[carrierName].shipmentCount += 1;
      carrierMap[carrierName].totalValue += amt;

      if (status.includes('DELIVER')) carrierMap[carrierName].deliveredCount += 1;
      else if (status.includes('SHIP') || status.includes('TRANSIT')) carrierMap[carrierName].inTransitCount += 1;
      else if (status.includes('RETURN') || order.returnStatus === 'RETURNED') carrierMap[carrierName].returnedCount += 1;
    });

    return Object.values(carrierMap).sort((a, b) => b.shipmentCount - a.shipmentCount);
  }, [filteredOrders]);

  // =========================================================================
  // EXPORT HANDLERS (CSV, Print, JSON)
  // =========================================================================

  // Helper to trigger browser download
  const triggerDownload = (content, filename, mimeType = 'text/csv;charset=utf-8;') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export CSV
  const handleExportCSV = () => {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm');
    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel compatibility

    if (activeReportTab === 'ORDERS') {
      const headers = ['Order Number', 'Date', 'Customer Name', 'Customer Phone', 'Customer Email', 'City', 'Status', 'Payment Method', 'Payment Status', 'Carrier', 'Tracking AWB', 'Items Count', 'Total Amount'];
      const rows = filteredOrders.map(o => [
        `"${o.orderNumber || o._id || ''}"`,
        `"${o.createdAt ? format(new Date(o.createdAt), 'yyyy-MM-dd HH:mm') : ''}"`,
        `"${o.customerName || o.shippingAddressObj?.fullName || ''}"`,
        `"${o.customerPhone || o.shippingAddressObj?.phone || ''}"`,
        `"${o.customerEmail || ''}"`,
        `"${o.shippingAddressObj?.city || ''}"`,
        `"${o.ecomStatusCode || o.status || ''}"`,
        `"${o.paymentMethod || 'COD'}"`,
        `"${o.paymentStatus || 'Pending'}"`,
        `"${o.carrierId?.carrierName || o.driverName || 'Standard'}"`,
        `"${o.trackingNumber || ''}"`,
        Array.isArray(o.items) ? o.items.length : 0,
        Number(o.totalAmount || o.total || 0).toFixed(2)
      ]);
      csvContent += [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      triggerDownload(csvContent, `ecom_sales_orders_report_${timestamp}.csv`);
    } 
    else if (activeReportTab === 'PRODUCTS') {
      const headers = ['Product Name', 'SKU', 'Units Sold', 'Orders Count', 'Gross Revenue'];
      const rows = productReportData.map(p => [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.sku}"`,
        p.unitsSold,
        p.orderAppearances,
        p.revenue.toFixed(2)
      ]);
      csvContent += [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      triggerDownload(csvContent, `ecom_product_sales_report_${timestamp}.csv`);
    }
    else if (activeReportTab === 'CUSTOMERS') {
      const headers = ['Customer Name', 'Phone', 'Email', 'City', 'Total Orders', 'Total Spent', 'Last Order Date'];
      const rows = customerReportData.map(c => [
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.phone}"`,
        `"${c.email}"`,
        `"${c.city}"`,
        c.orderCount,
        c.totalSpent.toFixed(2),
        `"${c.lastOrderDate ? format(new Date(c.lastOrderDate), 'yyyy-MM-dd') : ''}"`
      ]);
      csvContent += [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      triggerDownload(csvContent, `ecom_customers_report_${timestamp}.csv`);
    }
    else if (activeReportTab === 'LOGISTICS') {
      const headers = ['Carrier Partner', 'Total Shipments', 'Delivered', 'In Transit', 'Returned', 'Total Parcel Value'];
      const rows = logisticsReportData.map(l => [
        `"${l.name.replace(/"/g, '""')}"`,
        l.shipmentCount,
        l.deliveredCount,
        l.inTransitCount,
        l.returnedCount,
        l.totalValue.toFixed(2)
      ]);
      csvContent += [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      triggerDownload(csvContent, `ecom_logistics_report_${timestamp}.csv`);
    }

    setShowExportMenu(false);
  };

  // Export JSON
  const handleExportJSON = () => {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm');
    let dataToExport = filteredOrders;
    if (activeReportTab === 'PRODUCTS') dataToExport = productReportData;
    if (activeReportTab === 'CUSTOMERS') dataToExport = customerReportData;
    if (activeReportTab === 'LOGISTICS') dataToExport = logisticsReportData;

    const jsonStr = JSON.stringify(dataToExport, null, 2);
    triggerDownload(jsonStr, `ecom_report_${activeReportTab.toLowerCase()}_${timestamp}.json`, 'application/json');
    setShowExportMenu(false);
  };

  // Print Handler
  const handlePrint = () => {
    setShowExportMenu(false);
    window.print();
  };

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-[1600px] mx-auto ecom-fade-in">
      <style>{ANIMATION_AND_PRINT_STYLES}</style>

      {/* ========================================================================= */}
      {/* 1. SLIM OBSIDIAN HERO HEADER                                              */}
      {/* ========================================================================= */}
      <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white px-6 py-5 shadow-xl border border-white/10 no-print z-30">
        {/* Ambient Blur Bubbles strictly contained in an inner clipped layer */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl ecom-glow-pulse" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl ecom-glow-pulse" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-300 text-[10px] font-bold tracking-wider uppercase mb-2 shadow-xs transition-all duration-300 hover:bg-blue-500/25 cursor-default">
              <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />
              <span>JTS Storefront • Business Intelligence & Financial Reporting</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
              E-Commerce Reports & Analytics
            </h1>
            <p className="text-slate-300 text-xs mt-1 leading-relaxed">
              Analyze web sales revenue, customer purchasing trends, top products, and courier fulfillment metrics with instant export.
            </p>
          </div>

          {/* Action Buttons: Export & Refresh */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Export Dropdown Menu */}
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md hover:shadow-blue-500/30 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
                <span>Export Report</span>
                <ChevronDown className={`w-3.5 h-3.5 opacity-80 transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2.5 w-64 rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-white/15 text-white shadow-[0_20px_50px_rgba(0,0,0,0.65)] p-2 z-50 ecom-fade-in space-y-1">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-white/10 hover:translate-x-1 transition-all duration-200 text-left cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500/25 transition-all">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-bold group-hover:text-emerald-300 transition-colors">Download CSV / Excel</div>
                      <div className="text-[10px] text-slate-400 font-normal">Standard spreadsheet format</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-white/10 hover:translate-x-1 transition-all duration-200 text-left cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center group-hover:scale-110 group-hover:bg-sky-500/25 transition-all">
                      <Printer className="w-4 h-4 text-sky-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-bold group-hover:text-sky-300 transition-colors">Print / Save as PDF</div>
                      <div className="text-[10px] text-slate-400 font-normal">Formatted printable report</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-white/10 hover:translate-x-1 transition-all duration-200 text-left cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-500/25 transition-all">
                      <FileText className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-bold group-hover:text-amber-300 transition-colors">Download JSON</div>
                      <div className="text-[10px] text-slate-400 font-normal">Structured raw developer data</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={fetchOrders}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 hover:-translate-y-0.5 active:scale-95 text-white font-bold text-xs shadow-xs transition-all duration-200 cursor-pointer group"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. COMPACT KPI METRIC CARDS                                               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 no-print">
        {[
          {
            label: 'Total Gross Revenue',
            value: formatMoney(kpis.totalRevenue),
            sub: `${kpis.totalOrdersCount} processed orders`,
            icon: DollarSign,
            iconBg: 'bg-emerald-600 text-white',
            valColor: 'text-emerald-600 dark:text-emerald-400',
            borderHover: 'hover:border-emerald-500/40 hover:shadow-emerald-500/10'
          },
          {
            label: 'Average Order Value (AOV)',
            value: formatMoney(kpis.aov),
            sub: `${kpis.totalItems} total items purchased`,
            icon: TrendingUp,
            iconBg: 'bg-blue-600 text-white',
            valColor: 'text-blue-600 dark:text-blue-400',
            borderHover: 'hover:border-blue-500/40 hover:shadow-blue-500/10'
          },
          {
            label: 'Delivered Orders Rate',
            value: `${kpis.deliveryRate}%`,
            sub: `${kpis.deliveredCount} successfully delivered`,
            icon: CheckCircle2,
            iconBg: 'bg-indigo-600 text-white',
            valColor: 'text-indigo-600 dark:text-indigo-400',
            borderHover: 'hover:border-indigo-500/40 hover:shadow-indigo-500/10'
          },
          {
            label: 'COD vs Prepaid Ratio',
            value: `${kpis.codCount} COD / ${kpis.onlineCount} Online`,
            sub: kpis.returnedCount > 0 ? `${kpis.returnedCount} returns requested` : '0 return claims',
            icon: CreditCard,
            iconBg: 'bg-amber-600 text-white',
            valColor: 'text-amber-600 dark:text-amber-400 text-base sm:text-lg truncate',
            borderHover: 'hover:border-amber-500/40 hover:shadow-amber-500/10'
          }
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-xl border border-border/80 bg-card shadow-xs hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 select-none group cursor-pointer ${card.borderHover}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
                  {card.label}
                </span>
                <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center shadow-xs group-hover:scale-115 group-hover:rotate-6 transition-all duration-300`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className={`text-xl sm:text-2xl font-black ${card.valColor} group-hover:scale-[1.02] origin-left transition-transform duration-200`}>
                {card.value}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate group-hover:text-foreground/80 transition-colors">
                {card.sub}
              </p>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 3. DATE RANGE & DIMENSION FILTER BAR                                      */}
      {/* ========================================================================= */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-xs hover:border-border/90 hover:shadow-sm transition-all duration-200 space-y-3.5 no-print">
        {/* Date Presets Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Timeframe:
            </span>
            {[
              { id: 'ALL', label: 'All Time' },
              { id: 'TODAY', label: 'Today' },
              { id: '7DAYS', label: 'Last 7 Days' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: '30DAYS', label: 'Last 30 Days' },
              { id: 'CUSTOM', label: 'Custom Range' },
            ].map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDateRange(preset.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer ${
                  dateRange === preset.id
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 scale-[1.02]'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted hover:border hover:border-border'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Quick Clear Filters */}
          {(dateRange !== 'ALL' || statusFilter !== 'ALL' || paymentFilter !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setDateRange('ALL');
                setStatusFilter('ALL');
                setPaymentFilter('ALL');
                setSearchQuery('');
                setCustomStart('');
                setCustomEnd('');
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/15"
            >
              <X className="w-3.5 h-3.5 hover:rotate-90 transition-transform duration-200" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>

        {/* Custom Date Pickers (Shown if CUSTOM selected) */}
        {dateRange === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/60 ecom-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">From:</span>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold hover:border-blue-500/50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold hover:border-blue-500/50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>
        )}

        {/* Secondary Dimension Filters: Status, Payment, Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60">
          {/* Search Box */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-hover:text-blue-500 transition-colors w-3.5 h-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search order #, customer, item..."
              className="w-full h-10 pl-9 pr-7 rounded-xl border border-border bg-background text-foreground text-xs font-semibold placeholder:text-muted-foreground/60 hover:border-blue-500/50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground hover:scale-110 active:scale-90 transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Fulfillment Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-bold hover:border-blue-500/50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
          >
            <option value="ALL">All Order Statuses</option>
            <option value="DELIVERED">Delivered Only</option>
            <option value="PROCESSING">In Processing</option>
            <option value="SHIPPED">Dispatched / In Transit</option>
            <option value="RETURNED">Returned / Return Claims</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Payment Method Filter */}
          <select
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-bold hover:border-blue-500/50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
          >
            <option value="ALL">All Payment Methods</option>
            <option value="COD">Cash on Delivery (COD)</option>
            <option value="ONLINE">Prepaid / Online Payment</option>
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. REPORT NAVIGATION TABS                                                 */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 no-print">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/80">
          {[
            { id: 'ORDERS', label: 'Sales & Orders Ledger', count: filteredOrders.length, icon: ShoppingBag },
            { id: 'PRODUCTS', label: 'Product Performance', count: productReportData.length, icon: Package },
            { id: 'CUSTOMERS', label: 'Customer Insights', count: customerReportData.length, icon: Users },
            { id: 'LOGISTICS', label: 'Courier & Logistics', count: logisticsReportData.length, icon: Truck },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeReportTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveReportTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer group ${
                  isActive
                    ? 'bg-background text-foreground shadow-xs border border-border/90'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                }`}
              >
                <Icon size={14} className={`transition-transform duration-200 group-hover:scale-115 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'opacity-70 group-hover:opacity-100 group-hover:text-blue-500'}`} />
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black transition-all duration-200 group-hover:scale-110 ${
                  isActive ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
          <span>Active View:</span>
          <span className="font-bold text-foreground">
            {activeReportTab === 'ORDERS' && 'Orders Ledger'}
            {activeReportTab === 'PRODUCTS' && 'Top Performing Products'}
            {activeReportTab === 'CUSTOMERS' && 'Customer Spending Breakdown'}
            {activeReportTab === 'LOGISTICS' && 'Carrier Delivery Analysis'}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. PRINTABLE REPORT AREA & TABLES                                         */}
      {/* ========================================================================= */}
      <div id="printable-report-area" className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
        {/* Printable Header (Visible when printed) */}
        <div className="hidden print:block p-6 border-b border-border">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black">E-Commerce Business Report</h1>
              <p className="text-sm text-gray-500 mt-1">Generated on {format(new Date(), 'dd MMMM yyyy, hh:mm a')}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold uppercase text-gray-400">Total Revenue</span>
              <p className="text-xl font-black">{formatMoney(kpis.totalRevenue)}</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
            <p className="text-xs font-bold text-muted-foreground">Calculating e-commerce metrics...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* ── TAB 1: ORDERS LEDGER REPORT ── */}
            {activeReportTab === 'ORDERS' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-muted-foreground uppercase font-extrabold text-[10px] tracking-wider">
                    <th className="p-3.5">Order #</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Payment</th>
                    <th className="p-3.5">Courier & Tracking</th>
                    <th className="p-3.5 text-right pr-5">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-muted-foreground">
                        No orders match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(order => {
                      const itemsCount = Array.isArray(order.items) ? order.items.length : 0;
                      return (
                        <tr key={order._id} className="hover:bg-blue-500/[0.04] dark:hover:bg-blue-500/[0.08] transition-colors duration-150 group cursor-default">
                          <td className="p-3.5">
                            <span className="font-mono font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {order.orderNumber || order._id.slice(-8).toUpperCase()}
                            </span>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {itemsCount} item{itemsCount !== 1 ? 's' : ''}
                            </div>
                          </td>
                          <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                            {order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy, h:mm a') : '-'}
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                              {order.customerName || order.shippingAddressObj?.fullName || 'Guest Customer'}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {order.customerPhone || order.shippingAddressObj?.phone || '-'}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span 
                              className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase text-white shadow-2xs inline-block group-hover:scale-105 transition-transform duration-200"
                              style={{ backgroundColor: order.ecomStatusId?.color || '#2563eb' }}
                            >
                              {order.ecomStatusCode || order.status || 'NEW'}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-foreground">
                              {order.paymentMethod || 'COD'}
                            </div>
                            <div className={`text-[10px] font-semibold ${
                              order.paymentStatus === 'Paid' ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                              {order.paymentStatus || 'Pending'}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-foreground">
                              {order.carrierId?.carrierName || order.driverName || 'Standard Delivery'}
                            </div>
                            {order.trackingNumber && (
                              <div className="font-mono text-[10px] text-muted-foreground">
                                AWB: {order.trackingNumber}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-right pr-5 font-black text-sm text-foreground group-hover:scale-105 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all origin-right">
                            {formatMoney(order.totalAmount || order.total || 0)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* ── TAB 2: PRODUCT PERFORMANCE REPORT ── */}
            {activeReportTab === 'PRODUCTS' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-muted-foreground uppercase font-extrabold text-[10px] tracking-wider">
                    <th className="p-3.5 w-12 text-center">Rank</th>
                    <th className="p-3.5">Product Name & SKU</th>
                    <th className="p-3.5 text-center">Units Sold</th>
                    <th className="p-3.5 text-center">Order Appearances</th>
                    <th className="p-3.5 text-right pr-5">Total Revenue Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {productReportData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-muted-foreground">
                        No product sales recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    productReportData.map((prod, index) => (
                      <tr key={prod.id} className="hover:bg-blue-500/[0.04] dark:hover:bg-blue-500/[0.08] transition-colors duration-150 group cursor-default">
                        <td className="p-3.5 text-center">
                          <span className={`w-6 h-6 rounded-lg inline-flex items-center justify-center font-black text-xs group-hover:scale-115 transition-transform duration-200 ${
                            index === 0 ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30 shadow-xs' :
                            index === 1 ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300' :
                            index === 2 ? 'bg-orange-500/15 text-orange-600' : 'text-muted-foreground'
                          }`}>
                            #{index + 1}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-black text-sm text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{prod.name}</div>
                          <div className="font-mono text-[10px] text-muted-foreground mt-0.5">SKU: {prod.sku}</div>
                        </td>
                        <td className="p-3.5 text-center font-black text-sm text-foreground group-hover:scale-105 transition-transform">
                          {prod.unitsSold}
                        </td>
                        <td className="p-3.5 text-center text-muted-foreground">
                          In {prod.orderAppearances} orders
                        </td>
                        <td className="p-3.5 text-right pr-5 font-black text-sm text-emerald-600 dark:text-emerald-400 group-hover:scale-105 group-hover:text-emerald-500 transition-all origin-right">
                          {formatMoney(prod.revenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* ── TAB 3: CUSTOMER SPENDING REPORT ── */}
            {activeReportTab === 'CUSTOMERS' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-muted-foreground uppercase font-extrabold text-[10px] tracking-wider">
                    <th className="p-3.5">Customer Name</th>
                    <th className="p-3.5">Phone Number</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Location / City</th>
                    <th className="p-3.5 text-center">Orders Placed</th>
                    <th className="p-3.5 text-right pr-5">Lifetime Value (Total Spent)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {customerReportData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-muted-foreground">
                        No customer transactions found for this period.
                      </td>
                    </tr>
                  ) : (
                    customerReportData.map((cust, idx) => (
                      <tr key={idx} className="hover:bg-blue-500/[0.04] dark:hover:bg-blue-500/[0.08] transition-colors duration-150 group cursor-default">
                        <td className="p-3.5 font-black text-sm text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {cust.name}
                        </td>
                        <td className="p-3.5 font-mono text-muted-foreground">
                          {cust.phone}
                        </td>
                        <td className="p-3.5 text-muted-foreground">
                          {cust.email}
                        </td>
                        <td className="p-3.5 text-muted-foreground">
                          {cust.city}
                        </td>
                        <td className="p-3.5 text-center font-bold text-foreground">
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-black group-hover:scale-110 group-hover:bg-blue-500/20 inline-block transition-all">
                            {cust.orderCount}
                          </span>
                        </td>
                        <td className="p-3.5 text-right pr-5 font-black text-sm text-emerald-600 dark:text-emerald-400 group-hover:scale-105 group-hover:text-emerald-500 transition-all origin-right">
                          {formatMoney(cust.totalSpent)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* ── TAB 4: LOGISTICS & COURIER REPORT ── */}
            {activeReportTab === 'LOGISTICS' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-muted-foreground uppercase font-extrabold text-[10px] tracking-wider">
                    <th className="p-3.5">Carrier Partner</th>
                    <th className="p-3.5 text-center">Total Shipments</th>
                    <th className="p-3.5 text-center">Delivered</th>
                    <th className="p-3.5 text-center">In Transit</th>
                    <th className="p-3.5 text-center">Returns</th>
                    <th className="p-3.5 text-right pr-5">Dispatched Parcel Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {logisticsReportData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-muted-foreground">
                        No carrier dispatches recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    logisticsReportData.map((log, idx) => (
                      <tr key={idx} className="hover:bg-blue-500/[0.04] dark:hover:bg-blue-500/[0.08] transition-colors duration-150 group cursor-default">
                        <td className="p-3.5 font-black text-sm text-foreground flex items-center gap-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          <Truck size={16} className="text-blue-500 group-hover:scale-110 group-hover:translate-x-0.5 transition-transform" />
                          <span>{log.name}</span>
                        </td>
                        <td className="p-3.5 text-center font-black text-sm text-foreground group-hover:scale-105 transition-transform">
                          {log.shipmentCount}
                        </td>
                        <td className="p-3.5 text-center font-bold text-emerald-600">
                          {log.deliveredCount}
                        </td>
                        <td className="p-3.5 text-center font-bold text-blue-600">
                          {log.inTransitCount}
                        </td>
                        <td className="p-3.5 text-center font-bold text-rose-600">
                          {log.returnedCount}
                        </td>
                        <td className="p-3.5 text-right pr-5 font-black text-sm text-foreground group-hover:scale-105 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all origin-right">
                          {formatMoney(log.totalValue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Footer Summary Bar */}
        <div className="p-4 bg-muted/30 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground font-semibold no-print">
          <div>
            Showing <strong className="text-foreground">{filteredOrders.length}</strong> filtered web orders
          </div>
          <div className="flex items-center gap-2">
            <span>Period Sales Total:</span>
            <strong className="text-base text-foreground font-black">{formatMoney(kpis.totalRevenue)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EcomReports;

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, FileText, Package, Truck, Calendar, MapPin, Building2, 
  Banknote, Send, CheckCircle2, Printer, Zap, Mail, Copy, Check, 
  Search, X, Sparkles, Clock, AlertCircle, ExternalLink, ShieldCheck 
} from 'lucide-react';
import { format } from 'date-fns';
import { EmailSendModal } from '../../components/common/EmailSendModal';

export default function RFQDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rfq, setRfq] = useState(null);
  const [items, setItems] = useState([]);
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedField, setCopiedField] = useState(null);

  const componentRef = useRef(null);

  const handlePrint = () => {
    window.print();
  };

  const copyToClipboard = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  useEffect(() => {
    fetchRFQ();
  }, [id]);

  const fetchRFQ = async () => {
    try {
      const res = await axios.get(`/api/v1/rfqs/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRfq(res.data.rfq);
      setItems(res.data.items || []);
      setPurchaseOrder(res.data.purchaseOrder);
    } catch (error) {
      console.error('Failed to fetch RFQ', error);
      alert('Failed to load RFQ');
      navigate('/purchases/rfqs');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status) => {
    setActionLoading(true);
    try {
      await axios.patch(`/api/v1/rfqs/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      await fetchRFQ();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const convertToPO = async () => {
    if (!window.confirm('Convert this RFQ into an active Purchase Order?')) return;
    setActionLoading(true);
    try {
      const res = await axios.post(`/api/v1/rfqs/${id}/convert`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Converted to Purchase Order successfully');
      navigate(`/purchases/${res.data._id}`);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to convert RFQ');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 space-y-3">
        <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Loading quotation dossier...</h2>
      </div>
    );
  }

  if (!rfq) {
    return (
      <div className="p-8 text-center text-rose-500 font-bold uppercase tracking-widest">
        Request for Quotation not found
      </div>
    );
  }

  const rfqNumber = rfq.rfqNumber || `RFQ-${rfq._id.slice(-6).toUpperCase()}`;
  const supplierName = rfq.supplierId?.name || 'Unknown Supplier';
  const supplierEmail = rfq.supplierId?.email;
  const supplierPhone = rfq.supplierId?.phone;
  const branchName = rfq.branchId?.name || 'Head Office / Central Hub';
  const currencySymbol = rfq.currency || 'AED';

  // Metrics
  const totalItemsCount = items.length;
  const totalUnits = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `${currencySymbol} ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT': return '#f59e0b';
      case 'SENT': return '#3b82f6';
      case 'QUOTED': return '#8b5cf6';
      case 'CONFIRMED': return '#10b981';
      case 'CANCELLED': return '#f43f5e';
      default: return '#64748b';
    }
  };

  const filteredItems = items.filter(it => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = it.productId?.name?.toLowerCase() || '';
    const sku = it.productId?.sku?.toLowerCase() || '';
    const vSku = it.variantSku?.toLowerCase() || '';
    const desc = it.description?.toLowerCase() || '';
    return name.includes(q) || sku.includes(q) || vSku.includes(q) || desc.includes(q);
  });

  return (
    <div ref={componentRef} className="space-y-4 pb-12 max-w-[1440px] mx-auto text-foreground">
      
      {/* ========================================================================= */}
      {/* 1. HERO HEADER WITH LEFT ARROW BACK & SOURCING ACTIONS                    */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-4 sm:p-5 text-white shadow-md border border-blue-900/40 no-print">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          
          {/* Left: Back Arrow + Dossier Details */}
          <div className="flex items-start gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/purchases/rfqs')}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md shrink-0 mt-0.5"
              title="Back to RFQ Register"
            >
              <ArrowLeft size={16} />
            </button>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase tracking-wider">
                  <Sparkles size={11} className="text-blue-400" />
                  Procurement Sourcing · RFQ Dossier · {rfqNumber}
                </span>

                <span
                  className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white shadow-2xs"
                  style={{ backgroundColor: getStatusColor(rfq.status) }}
                >
                  {rfq.status}
                </span>
              </div>

              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2 truncate">
                <span>{supplierName}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(rfqNumber, 'rfqNumber')}
                  className="p-1 rounded-md hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Copy RFQ Number"
                >
                  {copiedField === 'rfqNumber' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
              </h1>

              <p className="text-xs text-blue-100/75 leading-snug">
                Inquiry Date: <strong className="text-white">{format(new Date(rfq.createdAt), 'MMMM d, yyyy')}</strong> · Receiving Branch: <strong className="text-white">{branchName}</strong>
                {rfq.expectedDate && <> · Expected Delivery: <strong className="text-white">{format(new Date(rfq.expectedDate), 'MMMM d, yyyy')}</strong></>}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all duration-200 cursor-pointer hover:shadow-md"
            >
              <Printer size={14} /> Print (A4)
            </button>

            <button
              type="button"
              onClick={() => setIsEmailModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all duration-200 cursor-pointer hover:shadow-md"
            >
              <Mail size={14} /> Send Email
            </button>

            {rfq.status === 'DRAFT' && (
              <button
                type="button"
                onClick={() => updateStatus('SENT')}
                disabled={actionLoading}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-black rounded-xl shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                <Send size={14} /> Dispatch RFQ
              </button>
            )}

            {rfq.status === 'SENT' && (
              <button
                type="button"
                onClick={() => updateStatus('QUOTED')}
                disabled={actionLoading}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-xs font-black rounded-xl shadow-md shadow-purple-600/30 flex items-center gap-1.5 transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={14} /> Mark as Quoted
              </button>
            )}

            {rfq.status === 'QUOTED' && (
              <button
                type="button"
                onClick={convertToPO}
                disabled={actionLoading}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                <Package size={14} /> Convert to PO
              </button>
            )}

            {['DRAFT', 'SENT', 'QUOTED'].includes(rfq.status) && (
              <button
                type="button"
                onClick={() => updateStatus('CANCELLED')}
                disabled={actionLoading}
                className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-100 border border-rose-500/30 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                Cancel RFQ
              </button>
            )}
          </div>

        </div>

        {/* Ambient subtle light */}
        <div className="absolute right-0 top-0 w-80 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ========================================================================= */}
      {/* 2. FOUR KPI SUMMARY CARDS (With Smooth Hover Elevation)                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        
        {/* Total Estimated Valuation */}
        <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-2xs hover:border-blue-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
              Estimated Commitment
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <Banknote size={14} />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-foreground">
            {formatCurrency(rfq.totalAmount)}
          </div>
          <span className="text-[9.5px] text-muted-foreground block truncate mt-0.5">
            Terms: {rfq.paymentTerms || 'Immediate'}
          </span>
        </div>

        {/* Requisition Products */}
        <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-2xs hover:border-indigo-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
              Requested Products
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
              <Package size={14} />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-foreground">
            {totalUnits} <span className="text-xs font-normal text-muted-foreground">Units</span>
          </div>
          <span className="text-[9.5px] text-muted-foreground block truncate mt-0.5">
            {totalItemsCount} distinct product lines
          </span>
        </div>

        {/* Sourcing Milestone */}
        <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-2xs hover:border-amber-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
              Sourcing Status
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Clock size={14} />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(rfq.status) }}></span>
            <span>{rfq.status}</span>
          </div>
          <span className="text-[9.5px] text-muted-foreground block truncate mt-0.5">
            {rfq.status === 'DRAFT' && 'Inquiry ready to dispatch'}
            {rfq.status === 'SENT' && 'Awaiting vendor pricing quote'}
            {rfq.status === 'QUOTED' && 'Quote received · eligible for PO'}
            {rfq.status === 'CONFIRMED' && 'Active PO generated'}
            {rfq.status === 'CANCELLED' && 'Inquiry voided'}
          </span>
        </div>

        {/* Expected Timeline */}
        <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-2xs hover:border-emerald-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
              Expected Delivery
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Truck size={14} />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-foreground truncate">
            {rfq.expectedDate ? format(new Date(rfq.expectedDate), 'dd MMM yyyy') : 'Immediate'}
          </div>
          <span className="text-[9.5px] text-muted-foreground block truncate mt-0.5">
            Target Destination: {branchName}
          </span>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. SUPPLIER PROFILE & FINANCIAL PROTOCOL                                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        
        {/* Left: Supplier Profile Card */}
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border/80 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/70">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Building2 size={15} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Supplier Profile & Logistics
                </h3>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-muted text-muted-foreground uppercase tracking-wider">
                Vendor Dossier
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                  {supplierName}
                </h2>
                <div className="flex items-center gap-4 mt-1.5 flex-wrap text-xs text-muted-foreground">
                  {supplierEmail && (
                    <span className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                      <Mail size={13} className="text-blue-500" />
                      {supplierEmail}
                    </span>
                  )}
                  {supplierPhone && (
                    <span className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                      <ShieldCheck size={13} className="text-emerald-500" />
                      {supplierPhone}
                    </span>
                  )}
                </div>
              </div>

              {rfq.notes && (
                <div className="p-2.5 rounded-xl bg-muted/20 border border-border/60 text-xs text-muted-foreground">
                  <span className="font-bold text-foreground block mb-0.5">Internal Notes & Terms:</span>
                  <p className="line-clamp-2">{rfq.notes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3.5 mt-3.5 border-t border-border/70">
            <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60">
              <span className="text-[9.5px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <MapPin size={12} className="text-blue-500" /> Deliver To
              </span>
              <p className="text-xs font-black text-foreground truncate">{branchName}</p>
            </div>

            <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60">
              <span className="text-[9.5px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Calendar size={12} className="text-emerald-500" /> Request Date
              </span>
              <p className="text-xs font-black text-foreground">
                {format(new Date(rfq.createdAt), 'dd MMM yyyy')}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60">
              <span className="text-[9.5px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Truck size={12} className="text-amber-500" /> Expected Delivery
              </span>
              <p className="text-xs font-black text-foreground">
                {rfq.expectedDate ? format(new Date(rfq.expectedDate), 'dd MMM yyyy') : 'NOT SPECIFIED'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Financial Protocol Card */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-4 sm:p-5 shadow-md border border-indigo-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white/10 text-blue-300 flex items-center justify-center">
                  <Banknote size={15} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Financial Protocol
                </h3>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white/10 text-blue-300 uppercase tracking-wider border border-white/10">
                {currencySymbol} Currency
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-blue-200/70">
                Total Estimated Valuation
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {formatCurrency(rfq.totalAmount)}
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 mt-4 border-t border-white/10">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[9.5px] uppercase font-bold text-blue-200/60 block mb-0.5">Payment Terms</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {rfq.paymentTerms || 'Immediate'}
                </span>
              </div>
              <div>
                <span className="text-[9.5px] uppercase font-bold text-blue-200/60 block mb-0.5">Milestone</span>
                <span className="font-bold text-blue-300 flex items-center gap-1.5">
                  <Zap size={12} />
                  {rfq.status}
                </span>
              </div>
            </div>

            {/* Linked Purchase Order (if converted) */}
            {purchaseOrder && (
              <div className="pt-3 border-t border-white/10 print:hidden">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-200/60 block mb-1.5">
                  Linked Downstream Order
                </span>
                <Link
                  to={`/purchases/${purchaseOrder._id}`}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 transition-all group cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] text-blue-200 font-bold uppercase">Purchase Order</p>
                    <p className="text-xs font-black text-white group-hover:text-blue-300 transition-colors truncate">
                      {purchaseOrder.purchaseOrderNumber || `PO-${purchaseOrder._id.slice(-6).toUpperCase()}`}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase flex items-center gap-1">
                    {purchaseOrder.status}
                    <ExternalLink size={10} />
                  </span>
                </Link>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. REQUISITION MATRIX (PRODUCT LINES TABLE)                                */}
      {/* ========================================================================= */}
      <div className="rounded-2xl bg-card border border-border/80 shadow-2xs overflow-hidden">
        
        {/* Table Header Bar */}
        <div className="p-3.5 sm:p-4 border-b border-border/80 bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Zap size={15} />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
              Requisition Matrix
            </h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 uppercase tracking-wider">
              {items.length} Lines Included
            </span>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search product, SKU..." 
              className="w-full pl-9 pr-8 py-1.5 bg-background border border-border/80 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                type="button"
                className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground" 
                onClick={() => setSearchQuery('')}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap text-xs">
            <thead className="text-[10px] font-black text-muted-foreground uppercase tracking-wider bg-muted/10 border-b border-border/80">
              <tr>
                <th className="px-4 py-3">Product Designation</th>
                <th className="px-3 py-3 text-center">UOM</th>
                <th className="px-3 py-3 text-right">Unit Price</th>
                <th className="px-3 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No requisition lines found matching search.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={item._id || idx} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-foreground text-xs">{item.productId?.name || 'Unnamed Product'}</div>
                      {item.variantId ? (
                        <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                          Variant: {item.variantSku || item.variantId?.sku}
                          {item.variantId?.attributes && (
                            <span className="text-muted-foreground font-normal ml-1">
                              ({Object.entries(item.variantId.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')})
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] font-bold text-muted-foreground mt-0.5">
                          SKU: {item.productId?.sku || 'N/A'}
                        </div>
                      )}
                      {item.description && (
                        <div className="text-[10px] text-muted-foreground mt-0.5 italic">
                          {item.description}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span className="px-2 py-0.5 bg-muted rounded-md text-[10px] font-bold uppercase text-foreground">
                        {item.uom || 'PIECE'}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-right font-bold text-foreground">
                      {currencySymbol} {Number(item.unitCost || 0).toFixed(2)}
                    </td>

                    <td className="px-3 py-3 text-right font-black text-sm text-foreground">
                      {item.quantity}
                    </td>

                    <td className="px-4 py-3 text-right font-black text-xs text-foreground">
                      {currencySymbol} {Number(item.subTotal || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Bottom Valuation Bar */}
        <div className="p-4 bg-muted/20 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-muted-foreground text-[11px]">
            Showing <strong className="text-foreground">{filteredItems.length}</strong> of <strong className="text-foreground">{items.length}</strong> items in quotation matrix
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                Total Commitment ({currencySymbol})
              </span>
              <span className="text-base sm:text-lg font-black text-foreground">
                {formatCurrency(rfq.totalAmount)}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Email Modal */}
      {isEmailModalOpen && rfq && (
        <EmailSendModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          documentType="Request for Quotation"
          documentNumber={rfqNumber}
          recipientName={supplierName}
          defaultEmail={supplierEmail}
          sendEndpoint={`/api/v1/email/rfq/${rfq._id}`}
        />
      )}

    </div>
  );
}

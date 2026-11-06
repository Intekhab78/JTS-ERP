import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, XCircle, Printer, Edit, Building2, 
  Truck, User, Calendar, Hash, DollarSign, Package, ShieldCheck, 
  Clock, FileText, ExternalLink, Copy, Check, Scale, MapPin,
  Sparkles, Layers, RotateCcw, AlertCircle, Info, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { useCurrency } from '../../contexts/CurrencyContext';

const GRNView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatCurrency, currencySymbol } = useCurrency();

  const [grn, setGrn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchGRN();
  }, [id]);

  const fetchGRN = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/v1/grn/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setGrn(res.data);
    } catch (error) {
      console.error('Failed to load GRN:', error);
      alert('Failed to load GRN details');
      navigate('/purchases/grn');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    const confirmMsg = action === 'validate' 
      ? 'Are you sure you want to VALIDATE this GRN? This will permanently update inventory stock balances.'
      : action === 'confirm'
      ? 'Confirm this GRN for inspection and validation?'
      : 'Are you sure you want to CANCEL this GRN?';

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      await axios.put(`/api/v1/grn/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      await fetchGRN();
    } catch (error) {
      alert(error.response?.data?.message || `Failed to ${action} GRN`);
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 space-y-3">
        <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Loading receipt dossier...</h2>
      </div>
    );
  }

  if (!grn) return null;

  // Compute metrics & values
  const items = grn.items || [];
  const totalOrdered = items.reduce((acc, it) => acc + (Number(it.orderedQuantity) || 0), 0);
  const totalReceived = items.reduce((acc, it) => acc + (Number(it.receivedQuantity) || 0), 0);
  const totalAccepted = items.reduce((acc, it) => acc + (Number(it.acceptedQuantity) || 0), 0);
  const totalRejected = items.reduce((acc, it) => acc + (Number(it.rejectedQuantity) || 0), 0);

  const totalPurchaseCost = Number(grn.totalPurchaseCost) || items.reduce((acc, it) => acc + (Number(it.purchaseAmount) || (Number(it.acceptedQuantity || 0) * Number(it.purchaseUnitPrice || 0))), 0);
  const totalAdditionalCost = Number(grn.totalAdditionalCost) || (grn.additionalCosts || []).reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
  const totalLandedCost = Number(grn.totalLandedCost) || (totalPurchaseCost + totalAdditionalCost);
  const acceptRate = totalReceived > 0 ? Math.round((totalAccepted / totalReceived) * 100) : 100;
  const avgLandedUnitCost = totalAccepted > 0 ? (totalLandedCost / totalAccepted) : 0;

  const supplierName = grn.supplierId?.name || grn.supplierSnapshot?.name || 'N/A';
  const supplierPhone = grn.supplierId?.phone || grn.supplierSnapshot?.phone;
  const supplierEmail = grn.supplierId?.email || grn.supplierSnapshot?.email;
  const branchName = grn.branchId?.name || 'Main Warehouse';
  const poNumber = grn.purchaseOrderId?.purchaseOrderNumber || (grn.purchaseOrderId?._id ? `PO-${grn.purchaseOrderId._id.slice(-6).toUpperCase()}` : null);

  const getStatusColor = (status) => {
    switch (status) {
      case 'VALIDATED': return '#10b981';
      case 'CONFIRMED': return '#2563eb';
      case 'CANCELLED': return '#e11d48';
      case 'DRAFT':
      default: return '#f59e0b';
    }
  };

  return (
    <div className="space-y-4 pb-12 max-w-[1440px] mx-auto text-foreground">
      
      {/* ========================================================================= */}
      {/* 1. HERO HEADER WITH LEFT-ALIGNED ARROW BACK BUTTON & RIGHT ACTIONS       */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-4 sm:p-5 text-white shadow-md border border-blue-900/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          
          {/* Left: Arrow-Only Back Button + Title & Subtitle */}
          <div className="flex items-start gap-3 min-w-0">
            {/* ONLY ARROW ICON BACK BUTTON (LEFT-ALIGNED) */}
            <button
              type="button"
              onClick={() => navigate('/purchases/grn')}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md shrink-0 mt-0.5"
              title="Back to Receipts List"
            >
              <ArrowLeft size={16} />
            </button>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase tracking-wider">
                  <Sparkles size={11} className="text-blue-400" />
                  Receipt Dossier · {grn.grnNumber}
                </span>

                <span
                  className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white shadow-2xs"
                  style={{ backgroundColor: getStatusColor(grn.status) }}
                >
                  {grn.status}
                </span>
              </div>

              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2 truncate">
                <span>{supplierName}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(grn.grnNumber, 'grnNumber')}
                  className="p-1 rounded-md hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Copy GRN Number"
                >
                  {copiedField === 'grnNumber' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
              </h1>

              <p className="text-xs text-blue-100/75 leading-snug">
                Received on <strong className="text-white">{format(new Date(grn.receiptDate || grn.createdAt), 'MMMM d, yyyy · h:mm a')}</strong> · Destination: <strong className="text-white">{branchName}</strong>
                {poNumber && <> · Linked PO: <strong className="text-white">{poNumber}</strong></>}
              </p>
            </div>
          </div>

          {/* Right: Only Print & Contextual Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
            <button
              type="button"
              onClick={() => window.open(`/purchases/grn/${grn._id}/print`, '_blank')}
              className="px-3.5 py-2 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all duration-200 cursor-pointer hover:shadow-md"
            >
              <Printer size={14} /> Print Tax Invoice (A4)
            </button>

            {grn.status === 'DRAFT' && hasPermission('EDIT_PURCHASES') && (
              <>
                <button
                  type="button"
                  onClick={() => navigate(`/purchases/grn/edit/${grn._id}`)}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 transition-all duration-200 cursor-pointer hover:shadow-md"
                >
                  <Edit size={14} /> Edit Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('confirm')}
                  disabled={actionLoading}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 transition-all duration-200 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 size={14} /> Confirm
                </button>
              </>
            )}

            {grn.status === 'CONFIRMED' && hasPermission('EDIT_PURCHASES') && (
              <button
                type="button"
                onClick={() => handleAction('validate')}
                disabled={actionLoading}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all duration-200 cursor-pointer hover:shadow-lg disabled:opacity-50"
              >
                <CheckCircle2 size={14} /> Validate & Update Stock
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
        
        {/* Total Landed Cost */}
        <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-2xs hover:border-blue-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
              Total Landed Cost
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <DollarSign size={14} />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-foreground">
            {formatCurrency(totalLandedCost)}
          </div>
          <span className="text-[9.5px] text-muted-foreground block truncate mt-0.5">
            Method: {grn.allocationMethod || 'By Quantity'}
          </span>
        </div>

        {/* Units Accepted */}
        <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-2xs hover:border-emerald-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
              Accepted Units
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
            {totalAccepted} <span className="text-xs font-normal text-muted-foreground">/ {totalReceived} rec.</span>
          </div>
          <div className="w-full bg-muted h-1 rounded-full overflow-hidden mt-1.5">
            <div 
              className={`h-full ${acceptRate === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${acceptRate}%` }}
            />
          </div>
        </div>

        {/* Purchase Value */}
        <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-2xs hover:border-indigo-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
              Purchase Base
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
              <Package size={14} />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-foreground">
            {formatCurrency(totalPurchaseCost)}
          </div>
          <span className="text-[9.5px] text-muted-foreground block truncate mt-0.5">
            Direct supplier cost
          </span>
        </div>

        {/* Landed Expenses */}
        <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-2xs hover:border-purple-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
              Landed Expenses
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-500 group-hover:text-white transition-colors">
              <Scale size={14} />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-purple-600 dark:text-purple-400">
            +{formatCurrency(totalAdditionalCost)}
          </div>
          <span className="text-[9.5px] text-muted-foreground block truncate mt-0.5">
            Freight, customs & labor
          </span>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. TWO DOSSIER CARDS: COMPLETE SUPPLIER & COMPLETE LOGISTICS TRACKING     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        
        {/* Card 1: Complete Supplier Information */}
        <div className="p-4 rounded-xl bg-card border border-border/80 shadow-2xs hover:border-blue-500/50 hover:shadow-md transition-all duration-200 group space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User size={13} className="text-blue-600 group-hover:scale-110 transition-transform" />
              Supplier Information
            </span>
            <span className="text-[10px] font-bold text-muted-foreground">
              ID: {grn.supplierId?._id?.slice(-6).toUpperCase() || 'N/A'}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="font-bold text-foreground text-sm flex items-center justify-between">
              <span>{supplierName}</span>
              {grn.supplierId?.contactPerson && (
                <span className="text-[11px] font-normal text-muted-foreground">
                  Attn: {grn.supplierId.contactPerson}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-muted-foreground">
              <span>Phone Contact:</span>
              <span className="font-semibold text-foreground font-mono">{supplierPhone || 'N/A'}</span>
            </div>

            <div className="flex items-center justify-between text-muted-foreground">
              <span>Email:</span>
              <span className="font-semibold text-foreground truncate max-w-xs">{supplierEmail || 'N/A'}</span>
            </div>

            {(grn.supplierId?.taxNumber || grn.supplierId?.gstin) && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Tax TRN / GSTIN:</span>
                <span className="font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded text-[11px] font-mono">
                  {grn.supplierId.taxNumber || grn.supplierId.gstin}
                </span>
              </div>
            )}

            {grn.supplierId?.address && (
              <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                <span>Vendor Address:</span>
                <span className="text-foreground truncate max-w-xs">
                  {typeof grn.supplierId.address === 'string' 
                    ? grn.supplierId.address 
                    : `${grn.supplierId.address.city || ''}, ${grn.supplierId.address.country || ''}`.trim() || 'On Record'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Complete Logistics & Consignment Tracking Details */}
        <div className="p-4 rounded-xl bg-card border border-border/80 shadow-2xs hover:border-blue-500/50 hover:shadow-md transition-all duration-200 group space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Truck size={13} className="text-blue-600 group-hover:scale-110 transition-transform" />
              Logistics & Consignment Tracking
            </span>
            <span 
              className="px-2 py-0.2 rounded text-[9.5px] font-black uppercase tracking-wider text-white shadow-2xs"
              style={{ backgroundColor: getStatusColor(grn.status) }}
            >
              {grn.status}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Challan & Vehicle */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Delivery Challan</span>
                <span className="font-bold text-foreground font-mono text-xs">
                  {grn.deliveryChallanNumber || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Vehicle / Truck</span>
                <span className="font-bold text-foreground font-mono text-xs">
                  {grn.vehicleNumber || 'N/A'}
                </span>
              </div>
            </div>

            {/* Warehouse & Linked PO */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Target Stock Depot</span>
                <span className="font-bold text-foreground flex items-center gap-1">
                  <MapPin size={11} className="text-emerald-600 shrink-0" />
                  {branchName}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Linked Purchase Order</span>
                {grn.purchaseOrderId ? (
                  <Link
                    to={`/purchases/${grn.purchaseOrderId._id || grn.purchaseOrderId}`}
                    className="font-bold text-blue-600 hover:underline flex items-center gap-1 font-mono text-xs"
                  >
                    <Hash size={11} /> {poNumber}
                    <ExternalLink size={10} />
                  </Link>
                ) : (
                  <span className="font-medium text-muted-foreground italic text-xs">Direct Receiving (No PO)</span>
                )}
              </div>
            </div>

            {/* Landed Method & Audit */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50 text-[11px]">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Cost Allocation Method</span>
                <span className="font-bold text-indigo-600 bg-indigo-500/10 px-1.5 py-0.5 rounded text-[10.5px]">
                  {grn.allocationMethod || 'By Purchase Value'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Receiving Inspector</span>
                <span className="font-medium text-foreground">
                  {grn.createdBy?.name || 'Authorized Staff'}
                </span>
              </div>
            </div>

            {/* Quality Validation Status */}
            <div className="pt-1 border-t border-border/50 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground font-medium">Quality Validation:</span>
              {grn.validatedBy ? (
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Verified by {grn.validatedBy.name}
                  {grn.validatedAt && <> on {format(new Date(grn.validatedAt), 'MMM d')}</>}
                </span>
              ) : (
                <span className="font-bold text-amber-600 flex items-center gap-1">
                  <Clock size={12} /> Awaiting Quality Validation
                </span>
              )}
            </div>

            {/* Consignment Remarks (if present) */}
            {(grn.notes || grn.internalNotes) && (
              <div className="p-2 bg-muted/40 rounded-lg text-[11px] space-y-0.5">
                {grn.notes && (
                  <div>
                    <span className="font-bold text-foreground">Remarks:</span> {grn.notes}
                  </div>
                )}
                {grn.internalNotes && (
                  <div className="text-amber-700 dark:text-amber-300">
                    <span className="font-bold">Internal QC Note:</span> {grn.internalNotes}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. RECEIVED PRODUCTS & COMPREHENSIVE LANDED COST BREAKDOWN TABLE          */}
      {/* ========================================================================= */}
      <div className="rounded-xl bg-card border border-border/80 shadow-2xs overflow-hidden space-y-0">
        
        {/* Table Top Header Strip */}
        <div className="p-3 sm:p-3.5 border-b border-border/70 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-foreground">
              Received Products & Landed Cost Breakdown ({items.length})
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold">
              · Allocation: <strong>{grn.allocationMethod || 'By Purchase Value'}</strong>
            </span>
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10.5px] font-black uppercase tracking-wider">
            <CheckCircle2 size={12} />
            Accepted: {totalAccepted} Units
          </div>
        </div>

        {/* Complete Landed Cost Detailed Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 text-[9.5px] font-black uppercase tracking-wider text-muted-foreground">
                <th className="py-2.5 px-3 text-center w-8">#</th>
                <th className="py-2.5 px-3 min-w-[220px]">PRODUCT & SKU</th>
                <th className="py-2.5 px-3 text-right">UNIT PRICE</th>
                <th className="py-2.5 px-2.5 text-center">ORD.</th>
                <th className="py-2.5 px-2.5 text-center">REC.</th>
                <th className="py-2.5 px-2.5 text-center font-bold text-emerald-600">ACC.</th>
                <th className="py-2.5 px-2.5 text-center text-rose-600">REJ.</th>
                <th className="py-2.5 px-3 text-right font-bold text-foreground">BASE AMOUNT</th>
                <th className="py-2.5 px-3 text-right font-bold text-blue-600">ALLOCATED EXPENSE</th>
                <th className="py-2.5 px-3.5 text-right font-black text-foreground">TOTAL LANDED</th>
                <th className="py-2.5 px-3.5 text-right font-black text-emerald-600">LANDED / UNIT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {items.map((it, idx) => {
                const unitPrice = Number(it.purchaseUnitPrice || 0);
                const ordered = Number(it.orderedQuantity || 0);
                const received = Number(it.receivedQuantity || 0);
                const accepted = Number(it.acceptedQuantity || 0);
                const rejected = Number(it.rejectedQuantity || 0);

                const basePurchaseAmount = Number(it.purchaseAmount) || (accepted * unitPrice);
                const allocatedExpense = Number(it.allocatedAdditionalCost || 0);
                const lineTotalLanded = Number(it.totalLandedCost) || (basePurchaseAmount + allocatedExpense);
                const lineLandedUnitCost = accepted > 0 ? (lineTotalLanded / accepted) : (Number(it.landedUnitCost) || unitPrice);

                return (
                  <tr 
                    key={idx} 
                    className="hover:bg-muted/40 transition-colors duration-150 cursor-default"
                  >
                    {/* Index */}
                    <td className="py-3 px-3 text-center text-muted-foreground font-mono text-[11px]">
                      {idx + 1}
                    </td>

                    {/* Product Name & SKU */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-foreground text-xs leading-snug">
                        {it.itemName || it.productId?.name || 'Product'}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono bg-muted/60 px-1 rounded">SKU: {it.sku || it.productId?.sku || 'N/A'}</span>
                        {it.uom && <span className="text-[9.5px] uppercase font-bold text-slate-500">· {it.uom}</span>}
                      </div>
                    </td>

                    {/* Base Unit Price */}
                    <td className="py-3 px-3 text-right text-xs font-semibold text-foreground">
                      {formatCurrency(unitPrice)}
                    </td>

                    {/* Ordered */}
                    <td className="py-3 px-2.5 text-center text-xs text-muted-foreground">
                      {ordered}
                    </td>

                    {/* Received */}
                    <td className="py-3 px-2.5 text-center text-xs text-foreground font-semibold">
                      {received}
                    </td>

                    {/* Accepted Pill */}
                    <td className="py-3 px-2.5 text-center">
                      <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                        {accepted}
                      </span>
                    </td>

                    {/* Rejected */}
                    <td className="py-3 px-2.5 text-center font-bold text-xs text-rose-500">
                      {rejected}
                    </td>

                    {/* Base Purchase Amount */}
                    <td className="py-3 px-3 text-right font-bold text-xs text-foreground">
                      {formatCurrency(basePurchaseAmount)}
                    </td>

                    {/* Allocated Landed Expense */}
                    <td className="py-3 px-3 text-right">
                      {allocatedExpense > 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs">
                          +{formatCurrency(allocatedExpense)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">—</span>
                      )}
                    </td>

                    {/* Total Landed Cost */}
                    <td className="py-3 px-3.5 text-right font-black text-xs text-foreground">
                      {formatCurrency(lineTotalLanded)}
                    </td>

                    {/* Landed Unit Cost */}
                    <td className="py-3 px-3.5 text-right">
                      <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-black text-xs">
                        {formatCurrency(lineLandedUnitCost)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── ADDITIONAL LANDED EXPENSES BREAKDOWN SUBSECTION ── */}
        {grn.additionalCosts && grn.additionalCosts.length > 0 && (
          <div className="p-3.5 bg-muted/20 border-t border-border/70 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
              <span className="flex items-center gap-1.5 uppercase text-[10px] font-black tracking-wider text-foreground">
                <Scale size={12} className="text-blue-600" />
                Additional Landed Cost Items ({grn.additionalCosts.length})
              </span>
              <span className="text-[10.5px]">
                Capitalized into stock balances via <strong>{grn.allocationMethod || 'By Purchase Value'}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {grn.additionalCosts.map((cost, cIdx) => (
                <div key={cIdx} className="p-2.5 rounded-lg bg-card border border-border/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-foreground block">{cost.costType}</span>
                    <span className="text-[10px] text-muted-foreground">{cost.description || 'Logistics & handling'}</span>
                  </div>
                  <div className="text-right font-black text-blue-600">
                    +{formatCurrency(cost.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── COMPREHENSIVE FINANCIAL SUMMARY BAR ── */}
        <div className="p-4 bg-muted/30 border-t border-border/70 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-6 flex-wrap text-xs">
            <div>
              <span className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground block">
                PURCHASE BASE INVOICE
              </span>
              <span className="font-black text-sm text-foreground">
                {formatCurrency(totalPurchaseCost)}
              </span>
            </div>

            <div className="text-muted-foreground text-lg font-light hidden sm:block">+</div>

            <div>
              <span className="text-[9.5px] font-black uppercase tracking-wider text-blue-600 block">
                + ALLOCATED LANDED CHARGES
              </span>
              <span className="font-black text-sm text-blue-600">
                {formatCurrency(totalAdditionalCost)}
              </span>
            </div>

            <div className="text-muted-foreground text-lg font-light hidden sm:block">=</div>

            <div>
              <span className="text-[9.5px] font-black uppercase tracking-wider text-emerald-600 block">
                AVERAGE LANDED UNIT COST
              </span>
              <span className="font-black text-sm text-emerald-600">
                {formatCurrency(avgLandedUnitCost)} / unit
              </span>
            </div>
          </div>

          <div className="text-left md:text-right pt-2 md:pt-0 border-t md:border-t-0 border-border/60 w-full md:w-auto">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground block">
              GRAND TOTAL LANDED COST
            </span>
            <span className="font-black text-base sm:text-lg text-foreground">
              {formatCurrency(totalLandedCost)}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};

export default GRNView;

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, FileText, Package, Truck, Calendar, MapPin, Building2, 
  CreditCard, Banknote, Trash2, Edit, Search, ChevronLeft, ChevronRight, 
  X, Clock, Printer, Mail, Phone, AlertCircle, Box, Home, XCircle, 
  CheckCircle2, Copy, Check, Sparkles, ExternalLink, RefreshCw, Send,
  Layers, ShieldAlert, ShieldCheck, ChevronDown, CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import { EmailSendModal } from '../../components/common/EmailSendModal';
import { useCurrency } from '../../contexts/CurrencyContext';

const PurchaseOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatCurrency, currencySymbol } = useCurrency();

  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  // Main Schedules Table State
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [debouncedScheduleSearch, setDebouncedScheduleSearch] = useState('');
  const [schedulePage, setSchedulePage] = useState(1);
  const [scheduleLimit, setScheduleLimit] = useState(20);
  const [schedulePagination, setSchedulePagination] = useState(null);
  const [mainPaginatedItems, setMainPaginatedItems] = useState([]);
  const [mainPaginatedSchedules, setMainPaginatedSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);

  // Bulk Schedule Modal State
  const [bulkSearch, setBulkSearch] = useState('');
  const [debouncedBulkSearch, setDebouncedBulkSearch] = useState('');
  const [bulkPage, setBulkPage] = useState(1);
  const [bulkLimit, setBulkLimit] = useState(20);
  const [bulkPagination, setBulkPagination] = useState(null);
  const [bulkPaginatedItems, setBulkPaginatedItems] = useState([]);
  const [loadingBulkSchedules, setLoadingBulkSchedules] = useState(false);
  
  // Global Bulk Selections
  const [globalBulkState, setGlobalBulkState] = useState({});
  
  // Schedule Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  
  // Cancel Schedule Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelScheduleId, setCancelScheduleId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  
  // Bulk Schedule State
  const [isBulkScheduleModalOpen, setIsBulkScheduleModalOpen] = useState(false);
  const [bulkScheduleError, setBulkScheduleError] = useState('');
  
  // Equal Distribution Mode State
  const [bulkMode, setBulkMode] = useState('MANUAL'); // 'MANUAL' | 'EQUAL'
  const [equalBranchType, setEqualBranchType] = useState('Store');
  const [equalSelectedBranchIds, setEqualSelectedBranchIds] = useState([]);
  const [equalExpectedDate, setEqualExpectedDate] = useState('');
  const [equalBranchSearch, setEqualBranchSearch] = useState('');
  const [equalPreview, setEqualPreview] = useState(null);
  const [loadingEqualPreview, setLoadingEqualPreview] = useState(false);
  const [submittingEqual, setSubmittingEqual] = useState(false);
  
  const [branches, setBranches] = useState([]);
  const [scheduleData, setScheduleData] = useState({
    purchaseOrderItemId: '',
    productId: '',
    scheduledQuantity: '',
    expectedDate: '',
    destinationType: 'Store',
    branchId: '',
    notes: ''
  });

  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: po ? `PO_${po.purchaseOrderNumber || po._id.slice(-6).toUpperCase()}` : 'Purchase_Order',
  });

  useEffect(() => {
    fetchPO();
    fetchBranches();
  }, [id]);

  useEffect(() => {
    const fetchEqualPreview = async () => {
      if (!isBulkScheduleModalOpen || bulkMode !== 'EQUAL' || equalSelectedBranchIds.length === 0) {
        setEqualPreview(null);
        return;
      }
      setLoadingEqualPreview(true);
      try {
        const res = await axios.post(`/api/v1/purchases/${id}/schedules/equal-distribution/preview`, {
          branchIds: equalSelectedBranchIds,
          destinationType: equalBranchType
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setEqualPreview(res.data.data);
      } catch (err) {
        console.error(err);
        setEqualPreview(null);
      } finally {
        setLoadingEqualPreview(false);
      }
    };

    fetchEqualPreview();
  }, [equalSelectedBranchIds, equalBranchType, bulkMode, isBulkScheduleModalOpen, id]);

  useEffect(() => {
    const timer = setTimeout(() => {
       setDebouncedScheduleSearch(scheduleSearch);
       setSchedulePage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [scheduleSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
       setDebouncedBulkSearch(bulkSearch);
       setBulkPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [bulkSearch]);

  useEffect(() => {
    fetchMainSchedules();
  }, [id, schedulePage, scheduleLimit, debouncedScheduleSearch]);

  useEffect(() => {
    if (isBulkScheduleModalOpen) {
      fetchBulkSchedules();
    }
  }, [id, bulkPage, bulkLimit, debouncedBulkSearch, isBulkScheduleModalOpen]);

  const fetchMainSchedules = async () => {
    setLoadingSchedules(true);
    try {
      const res = await axios.get(`/api/v1/purchases/${id}/schedules`, {
        params: { page: schedulePage, limit: scheduleLimit, search: debouncedScheduleSearch },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMainPaginatedItems(res.data.data.items || []);
      setMainPaginatedSchedules(res.data.data.schedules || []);
      setSchedulePagination(res.data.pagination);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const fetchBulkSchedules = async () => {
    setLoadingBulkSchedules(true);
    try {
      const res = await axios.get(`/api/v1/purchases/${id}/schedules`, {
        params: { page: bulkPage, limit: bulkLimit, search: debouncedBulkSearch },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const items = res.data.data.items || [];
      
      setGlobalBulkState(prev => {
         const newState = { ...prev };
         items.forEach(item => {
            if (!newState[item._id]) {
               newState[item._id] = {
                  selected: false,
                  splits: [{ id: Date.now() + Math.random(), scheduledQuantity: '', expectedDate: '', destinationType: 'Store', branchId: '', notes: '' }]
               };
            }
         });
         return newState;
      });
      
      setBulkPaginatedItems(items);
      setBulkPagination(res.data.pagination);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingBulkSchedules(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await axios.get('/api/v1/branches', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBranches(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchPO = async () => {
    try {
      const res = await axios.get(`/api/v1/purchases/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPo(res.data);
    } catch (error) {
      console.error('Failed to fetch PO', error);
      alert('Failed to load Purchase Order');
      navigate('/purchases');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleConfirm = async () => {
    if (!window.confirm('Are you sure you want to confirm this purchase order?')) return;
    setActionLoading(true);
    try {
      await axios.post(`/api/v1/purchases/${id}/confirm`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      await fetchPO();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to confirm PO');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitSchedule = async (e) => {
    e.preventDefault();
    try {
      if (editingScheduleId) {
        await axios.put(`/api/v1/purchases/${id}/schedules/${editingScheduleId}`, scheduleData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post(`/api/v1/purchases/${id}/schedules`, scheduleData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      setIsScheduleModalOpen(false);
      setEditingScheduleId(null);
      setScheduleData({ purchaseOrderItemId: '', productId: '', scheduledQuantity: '', expectedDate: '', destinationType: 'Store', branchId: '', notes: '' });
      fetchPO();
      fetchMainSchedules();
    } catch (error) {
      alert(error.response?.data?.message || `Failed to ${editingScheduleId ? 'update' : 'add'} schedule`);
    }
  };

  const openEditModal = (schedule) => {
    setEditingScheduleId(schedule._id);
    setScheduleData({
      purchaseOrderItemId: schedule.purchaseOrderItemId,
      productId: schedule.productId?._id,
      scheduledQuantity: schedule.scheduledQuantity,
      expectedDate: schedule.expectedDate ? format(new Date(schedule.expectedDate), 'yyyy-MM-dd') : '',
      destinationType: schedule.destinationType || 'Store',
      branchId: schedule.branchId?._id || '',
      notes: schedule.notes || ''
    });
    setIsScheduleModalOpen(true);
  };

  const openBulkScheduleModal = () => {
    setBulkSearch('');
    setDebouncedBulkSearch('');
    setBulkPage(1);
    setBulkScheduleError('');
    setBulkMode('MANUAL');
    setEqualSelectedBranchIds([]);
    setEqualExpectedDate('');
    setEqualPreview(null);
    setIsBulkScheduleModalOpen(true);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setBulkScheduleError('');
    
    let hasError = false;
    let errorMessage = '';
    const payloadSchedules = [];

    Object.keys(globalBulkState).forEach(itemId => {
       const state = globalBulkState[itemId];
       if (!state.selected) return;
       
       const poItem = po.items.find(i => i._id === itemId);
       if (!poItem) return;

       const remaining = poItem.quantity - (poItem.scheduledQuantity || 0);
       let sumSplits = 0;
       
       state.splits.forEach(split => {
          const qty = Number(split.scheduledQuantity);
          if (!isNaN(qty) && qty > 0) {
             sumSplits += qty;
             payloadSchedules.push({
                purchaseOrderItemId: poItem._id,
                productId: poItem.productId?._id,
                scheduledQuantity: qty,
                expectedDate: split.expectedDate,
                destinationType: split.destinationType,
                branchId: split.branchId,
                notes: split.notes
             });
          }
       });

       if (sumSplits > remaining) {
          hasError = true;
          errorMessage = `Total scheduled quantity for ${poItem.productId?.name} exceeds remaining quantity by ${sumSplits - remaining}.`;
       }
    });

    if (hasError) {
       setBulkScheduleError(errorMessage);
       return;
    }

    if (payloadSchedules.length === 0) {
       setBulkScheduleError('Please enter a scheduled quantity for at least one selected item.');
       return;
    }

    try {
      await axios.post(`/api/v1/purchases/${id}/schedules/bulk`, { schedules: payloadSchedules }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setIsBulkScheduleModalOpen(false);
      setGlobalBulkState({});
      fetchPO();
      fetchMainSchedules();
    } catch (error) {
      setBulkScheduleError(error.response?.data?.message || 'Failed to create bulk schedules');
    }
  };

  const handleEqualSubmit = async (e) => {
    e.preventDefault();
    if (submittingEqual) return;
    setBulkScheduleError('');

    if (!equalExpectedDate) {
      setBulkScheduleError('Please select an Expected Delivery Date.');
      return;
    }
    if (equalSelectedBranchIds.length === 0) {
      setBulkScheduleError('Please select at least one destination store/branch.');
      return;
    }

    setSubmittingEqual(true);
    try {
      await axios.post(`/api/v1/purchases/${id}/schedules/equal-distribution`, {
        branchIds: equalSelectedBranchIds,
        destinationType: equalBranchType,
        expectedDate: equalExpectedDate
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setIsBulkScheduleModalOpen(false);
      setEqualSelectedBranchIds([]);
      setEqualExpectedDate('');
      setEqualPreview(null);
      fetchPO();
      fetchMainSchedules();
    } catch (error) {
      setBulkScheduleError(error.response?.data?.message || 'Failed to generate equal distribution schedules');
    } finally {
      setSubmittingEqual(false);
    }
  };

  const handleScheduleAllRemaining = () => {
    setGlobalBulkState(prev => {
       const newState = { ...prev };
       Object.keys(newState).forEach(itemId => {
          if (!newState[itemId].selected) return;
          const poItem = po.items.find(i => i._id === itemId);
          if (!poItem) return;
          const remaining = poItem.quantity - (poItem.scheduledQuantity || 0);
          newState[itemId].splits = [{ id: Date.now() + Math.random(), scheduledQuantity: remaining, expectedDate: '', destinationType: 'Store', branchId: '', notes: '' }];
       });
       return newState;
    });
  };
  
  const handleClearAllBulk = () => {
    setGlobalBulkState(prev => {
       const newState = { ...prev };
       Object.keys(newState).forEach(itemId => {
          newState[itemId].splits = [{ id: Date.now() + Math.random(), scheduledQuantity: '', expectedDate: '', destinationType: 'Store', branchId: '', notes: '' }];
       });
       return newState;
    });
  };

  const addDeliverySplit = (itemId) => {
     setGlobalBulkState(prev => {
        const newState = { ...prev };
        newState[itemId].splits.push({
           id: Date.now() + Math.random(),
           scheduledQuantity: '', expectedDate: '', destinationType: 'Store', branchId: '', notes: ''
        });
        return newState;
     });
  };

  const removeDeliverySplit = (itemId, splitId) => {
     setGlobalBulkState(prev => {
        const newState = { ...prev };
        newState[itemId].splits = newState[itemId].splits.filter(s => s.id !== splitId);
        if (newState[itemId].splits.length === 0) {
           newState[itemId].splits.push({ id: Date.now() + Math.random(), scheduledQuantity: '', expectedDate: '', destinationType: 'Store', branchId: '', notes: '' });
        }
        return newState;
     });
  };

  const updateDeliverySplit = (itemId, splitId, field, value) => {
     setGlobalBulkState(prev => {
        const newState = { ...prev };
        const splitIndex = newState[itemId].splits.findIndex(s => s.id === splitId);
        if (splitIndex > -1) {
           newState[itemId].splits[splitIndex][field] = value;
        }
        return newState;
     });
  };

  const toggleItemSelection = (itemId) => {
     setGlobalBulkState(prev => {
        const newState = { ...prev };
        newState[itemId].selected = !newState[itemId].selected;
        return newState;
     });
  };

  const toggleSelectAllPage = (selectAll) => {
     setGlobalBulkState(prev => {
        const newState = { ...prev };
        bulkPaginatedItems.forEach(item => {
           if (newState[item._id]) {
              newState[item._id].selected = selectAll;
           }
        });
        return newState;
     });
  };

  const openCancelModal = (scheduleId) => {
    setCancelScheduleId(scheduleId);
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  const closeCancelModal = () => {
    setIsCancelModalOpen(false);
    setCancelScheduleId(null);
    setCancelReason('');
  };

  const handleCancelScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) return;
    try {
      await axios.post(`/api/v1/purchases/${id}/schedules/${cancelScheduleId}/cancel`, 
        { cancelReason },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      closeCancelModal();
      fetchPO();
      fetchMainSchedules();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to cancel schedule');
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await axios.delete(`/api/v1/purchases/${id}/schedules/${scheduleId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchPO();
      fetchMainSchedules();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete schedule');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'RECEIVED': return '#10b981';
      case 'PARTIALLY_RECEIVED': return '#2563eb';
      case 'CONFIRMED': return '#3b82f6';
      case 'CANCELLED': return '#e11d48';
      case 'DRAFT':
      default: return '#f59e0b';
    }
  };

  const renderPagination = (pagination, setPage) => {
    if (!pagination) return null;
    const { page, totalPages, total, limit } = pagination;
    const startItem = (page - 1) * limit + 1;
    const endItem = Math.min(page * limit, total);
    
    let pages = [];
    if (totalPages <= 7) {
       for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
       if (page <= 4) {
          pages = [1, 2, 3, 4, 5, '...', totalPages];
       } else if (page >= totalPages - 3) {
          pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
       } else {
          pages = [1, '...', page - 1, page, page + 1, '...', totalPages];
       }
    }

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between py-3 px-4 border-t border-border/80 bg-card/60 gap-3 text-xs">
         <div className="text-muted-foreground font-medium">
            Showing <span className="font-bold text-foreground">{total === 0 ? 0 : startItem}-{endItem}</span> of <span className="font-bold text-foreground">{total}</span> items
         </div>
         <div className="flex items-center gap-1.5">
            <button 
              type="button" 
              onClick={() => setPage(p => p - 1)} 
              disabled={page === 1} 
              className="h-7 w-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/80 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            {pages.map((p, i) => (
               <button 
                 type="button" 
                 key={i} 
                 className={`h-7 min-w-7 px-1.5 rounded-lg text-xs font-bold transition-all ${p === '...' ? 'border-none pointer-events-none text-muted-foreground' : p === page ? 'bg-blue-600 text-white shadow-xs' : 'border border-border text-foreground hover:bg-muted/60'}`} 
                 onClick={() => p !== '...' && setPage(p)}
               >
                  {p}
               </button>
            ))}
            <button 
              type="button" 
              onClick={() => setPage(p => p + 1)} 
              disabled={page === totalPages} 
              className="h-7 w-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/80 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
         </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 space-y-3">
        <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Loading purchase order dossier...</h2>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="p-8 text-center text-rose-500 font-bold uppercase tracking-widest">
        Purchase Order not found
      </div>
    );
  }

  const poNumber = po.purchaseOrderNumber || `PO-${po._id.slice(-6).toUpperCase()}`;
  const supplierName = po.supplierId?.name || 'Unknown Supplier';
  const supplierEmail = po.supplierId?.email;
  const supplierPhone = po.supplierId?.phone;
  const branchName = po.branchId?.name || 'Head Office / Central Hub';

  // Compute metrics
  const totalItemsCount = po.items?.length || 0;
  const totalOrderedQty = po.items?.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0) || 0;
  const totalScheduledQty = po.items?.reduce((acc, it) => acc + (Number(it.scheduledQuantity) || 0), 0) || 0;
  const totalReceivedQty = po.items?.reduce((acc, it) => acc + (Number(it.receivedQuantity) || 0), 0) || 0;
  
  const schedulePercentage = totalOrderedQty > 0 ? Math.round((totalScheduledQty / totalOrderedQty) * 100) : 0;
  const fulfillmentPercentage = totalOrderedQty > 0 ? Math.round((totalReceivedQty / totalOrderedQty) * 100) : 0;

  return (
    <div ref={componentRef} className="space-y-4 pb-12 max-w-[1440px] mx-auto text-foreground">
      
      {/* ========================================================================= */}
      {/* 1. HERO HEADER WITH LEFT-ALIGNED ARROW BACK BUTTON & RIGHT ACTIONS       */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-4 sm:p-5 text-white shadow-md border border-blue-900/40 no-print">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          
          {/* Left: Arrow-Only Back Button + Title & Subtitle */}
          <div className="flex items-start gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/purchases')}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md shrink-0 mt-0.5"
              title="Back to Purchase Orders"
            >
              <ArrowLeft size={16} />
            </button>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase tracking-wider">
                  <Sparkles size={11} className="text-blue-400" />
                  Procurement Dossier · {poNumber}
                </span>

                <span
                  className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white shadow-2xs"
                  style={{ backgroundColor: getStatusColor(po.status) }}
                >
                  {po.status}
                </span>
              </div>

              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2 truncate">
                <span>{supplierName}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(poNumber, 'poNumber')}
                  className="p-1 rounded-md hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Copy PO Number"
                >
                  {copiedField === 'poNumber' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
              </h1>

              <p className="text-xs text-blue-100/75 leading-snug">
                Created on <strong className="text-white">{format(new Date(po.createdAt), 'MMMM d, yyyy')}</strong> · Deliver To: <strong className="text-white">{branchName}</strong>
                {po.expectedDate && <> · Expected Delivery: <strong className="text-white">{format(new Date(po.expectedDate), 'MMMM d, yyyy')}</strong></>}
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

            {po.status === 'DRAFT' && (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={actionLoading}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-black rounded-xl shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={14} /> Confirm Order
              </button>
            )}

            {(po.status === 'CONFIRMED' || po.status === 'PARTIALLY_RECEIVED') && (
              <button
                type="button"
                onClick={() => navigate(`/purchases/grn/new?poId=${po._id}`)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all duration-200 cursor-pointer"
              >
                <Package size={14} /> Create Receipt (GRN)
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
        
        {/* Total Amount */}
        <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-2xs hover:border-blue-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
              Total Order Value
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <Banknote size={14} />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-foreground">
            {formatCurrency(po.totalAmount)}
          </div>
          <span className="text-[9.5px] text-muted-foreground block truncate mt-0.5">
            Terms: {po.paymentTerms || 'Immediate'}
          </span>
        </div>

        {/* Ordered Items & Units */}
        <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-2xs hover:border-indigo-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
              Ordered Products
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
              <Package size={14} />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-foreground">
            {totalOrderedQty} <span className="text-xs font-normal text-muted-foreground">Units</span>
          </div>
          <span className="text-[9.5px] text-muted-foreground block truncate mt-0.5">
            {totalItemsCount} distinct product lines
          </span>
        </div>

        {/* Scheduled Distribution */}
        <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-2xs hover:border-amber-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
              Scheduled Allocation
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Calendar size={14} />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-foreground">
            {totalScheduledQty} <span className="text-xs font-normal text-muted-foreground">/ {totalOrderedQty} ({schedulePercentage}%)</span>
          </div>
          <span className="text-[9.5px] text-muted-foreground block truncate mt-0.5">
            {totalOrderedQty - totalScheduledQty} units remaining to schedule
          </span>
        </div>

        {/* Fulfillment Status */}
        <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-2xs hover:border-emerald-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
              Fulfillment Intake
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-foreground">
            {totalReceivedQty} <span className="text-xs font-normal text-muted-foreground">/ {totalOrderedQty} ({fulfillmentPercentage}%)</span>
          </div>
          <span className="text-[9.5px] text-muted-foreground block truncate mt-0.5">
            {totalOrderedQty - totalReceivedQty} units awaiting intake
          </span>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. SUPPLIER PROFILE & FINANCIAL SUMMARY                                    */}
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
                      <Phone size={13} className="text-emerald-500" />
                      {supplierPhone}
                    </span>
                  )}
                </div>
              </div>
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
                <Calendar size={12} className="text-emerald-500" /> Order Date
              </span>
              <p className="text-xs font-black text-foreground font-mono">
                {format(new Date(po.createdAt), 'dd MMM yyyy')}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60">
              <span className="text-[9.5px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Truck size={12} className="text-amber-500" /> Expected Delivery
              </span>
              <p className="text-xs font-black text-foreground font-mono">
                {po.expectedDate ? format(new Date(po.expectedDate), 'dd MMM yyyy') : 'NOT SPECIFIED'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Financial Summary Card */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-4 sm:p-5 shadow-md border border-indigo-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white/10 text-blue-300 flex items-center justify-center">
                  <Banknote size={15} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Financial Summary
                </h3>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white/10 text-blue-300 uppercase tracking-wider border border-white/10">
                {currencySymbol} Currency
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-blue-200/70">
                Total Committed Value
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {formatCurrency(po.totalAmount)}
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 mt-4 border-t border-white/10">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[9.5px] uppercase font-bold text-blue-200/60 block mb-0.5">Payment Terms</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {po.paymentTerms || 'Immediate'}
                </span>
              </div>
              <div>
                <span className="text-[9.5px] uppercase font-bold text-blue-200/60 block mb-0.5">Intake Status</span>
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <AlertCircle size={12} />
                  {fulfillmentPercentage}% Intake
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-blue-100/70 font-semibold uppercase tracking-wider">Fulfillment Pipeline</span>
                <span className="text-blue-300 font-bold">{totalScheduledQty} / {totalOrderedQty} Scheduled</span>
              </div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-blue-500 rounded-l-full transition-all duration-300" 
                  style={{ width: `${Math.min(schedulePercentage, 100)}%` }} 
                />
                <div 
                  className="h-full bg-amber-400 rounded-r-full transition-all duration-300" 
                  style={{ width: `${Math.max(0, 100 - schedulePercentage)}%` }} 
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. ORDER LINES (PRODUCTS TABLE)                                            */}
      {/* ========================================================================= */}
      <div className="rounded-2xl bg-card border border-border/80 shadow-2xs overflow-hidden">
        
        {/* Table Header Bar */}
        <div className="p-3.5 sm:p-4 border-b border-border/80 bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Package size={15} />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
              Order Lines
            </h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 uppercase tracking-wider">
              {schedulePagination?.totalItems || totalItemsCount} Included
            </span>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search products, SKU..." 
              className="w-full pl-9 pr-8 py-1.5 bg-background border border-border/80 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              value={scheduleSearch}
              onChange={e => setScheduleSearch(e.target.value)}
            />
            {scheduleSearch && (
              <button 
                type="button"
                className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground" 
                onClick={() => setScheduleSearch('')}
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
                <th className="px-3 py-3 text-center">Ordered</th>
                <th className="px-3 py-3 text-center">Scheduled</th>
                <th className="px-3 py-3 text-center">Received</th>
                <th className="px-3 py-3 text-center">Rem. Schedule</th>
                <th className="px-3 py-3 text-center">Rem. Receive</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loadingSchedules ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading order lines...</span>
                    </div>
                  </td>
                </tr>
              ) : mainPaginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No order lines found matching search.
                  </td>
                </tr>
              ) : (
                mainPaginatedItems.map((item, idx) => {
                  const remToSchedule = item.quantity - (item.scheduledQuantity || 0);
                  const remToReceive = (item.scheduledQuantity || 0) - (item.receivedQuantity || 0);
                  return (
                    <tr key={item._id || idx} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-foreground text-xs">{item.productId?.name}</div>
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
                          <div className="text-[10px] text-muted-foreground mt-0.5">SKU: {item.productId?.sku}</div>
                        )}
                        {item.description && <div className="text-[10px] text-muted-foreground italic mt-0.5">{item.description}</div>}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-muted-foreground">{item.uom || 'Piece'}</td>
                      <td className="px-3 py-3 text-right font-medium text-foreground">
                        {formatCurrency(item.unitCost)}
                      </td>
                      <td className="px-3 py-3 text-center font-black text-foreground">{item.quantity}</td>
                      <td className="px-3 py-3 text-center">
                        {item.scheduledQuantity > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 font-bold text-[11px]">
                            {item.scheduledQuantity}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {item.receivedQuantity > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-bold text-[11px]">
                            {item.receivedQuantity}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {remToSchedule > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-bold text-[11px]">
                            {remToSchedule}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {remToReceive > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 font-bold text-[11px]">
                            {remToReceive}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-foreground">
                        {formatCurrency(item.subTotal)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {renderPagination(schedulePagination, setSchedulePage)}
      </div>

      {/* ========================================================================= */}
      {/* 5. DELIVERY SCHEDULES & RELATED GRNS                                       */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        
        {/* Linked GRNs Card */}
        {po.grns && po.grns.length > 0 && (
          <div className="rounded-2xl bg-card border border-border/80 shadow-2xs overflow-hidden">
            <div className="p-3.5 sm:p-4 border-b border-border/80 bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Box size={15} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Related Goods Receipts (GRNs)
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 uppercase tracking-wider">
                  {po.grns.length} Recorded
                </span>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 space-y-2.5">
              {po.grns.map(grn => (
                <div 
                  key={grn._id} 
                  className="p-3 rounded-xl border border-border/70 hover:border-blue-500/50 bg-card hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText size={18} />
                    </div>
                    <div>
                      <div className="font-black text-xs text-foreground">{grn.grnNumber}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Received: {format(new Date(grn.receiptDate || grn.createdAt), 'MMM d, yyyy · h:mm a')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span 
                      className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white"
                      style={{ backgroundColor: getStatusColor(grn.status) }}
                    >
                      {grn.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(`/purchases/grn/${grn._id}`)}
                      className="px-3 py-1.5 rounded-lg border border-border/80 text-foreground hover:bg-muted text-xs font-bold transition-colors cursor-pointer"
                    >
                      View Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PO Notes */}
        {po.notes && (
          <div className="rounded-2xl bg-card border border-border/80 p-4 shadow-2xs">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
              Purchase Order Instructions & Notes
            </h4>
            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{po.notes}</p>
          </div>
        )}

        {/* Delivery Schedules Section */}
        <div className="rounded-2xl bg-card border border-border/80 shadow-2xs overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-pink-600 flex items-center justify-center">
                <Calendar size={15} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Delivery Schedules
                </h3>
                <span className="text-[10px] text-muted-foreground">
                  {schedulePagination?.totalItems || mainPaginatedSchedules.length} shipments planned
                </span>
              </div>
            </div>

            {(po.status === 'DRAFT' || po.status === 'CONFIRMED') && (
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={openBulkScheduleModal}
                  className="px-3 py-1.5 rounded-xl border border-border/80 text-foreground hover:bg-muted text-xs font-bold transition-all cursor-pointer"
                >
                  Bulk Schedule
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingScheduleId(null);
                    setScheduleData({ purchaseOrderItemId: '', productId: '', scheduledQuantity: '', expectedDate: '', destinationType: 'Store', branchId: '', notes: '' });
                    setIsScheduleModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  + Add Delivery Schedule
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap text-xs">
              <thead className="text-[10px] font-black text-muted-foreground uppercase tracking-wider bg-muted/10 border-b border-border/80">
                <tr>
                  <th className="px-4 py-3">Scheduled Product</th>
                  <th className="px-3 py-3 text-center">Scheduled</th>
                  <th className="px-3 py-3 text-center">Received</th>
                  <th className="px-3 py-3 text-center">Remaining</th>
                  <th className="px-3 py-3">Destination Branch</th>
                  <th className="px-3 py-3">Expected Date</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loadingSchedules ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      Loading delivery schedules...
                    </td>
                  </tr>
                ) : mainPaginatedSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No delivery schedules recorded for this purchase order.
                    </td>
                  </tr>
                ) : (
                  mainPaginatedSchedules.map(schedule => {
                    const remaining = schedule.scheduledQuantity - (schedule.receivedQuantity || 0);
                    return (
                      <tr key={schedule._id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-foreground text-xs">
                            {schedule.scheduledQuantity} {schedule.productId?.uom || 'Piece'} &bull; {schedule.productId?.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">SKU: {schedule.productId?.sku}</div>
                        </td>
                        <td className="px-3 py-3 text-center font-black text-foreground">{schedule.scheduledQuantity}</td>
                        <td className="px-3 py-3 text-center font-bold text-muted-foreground">{schedule.receivedQuantity || 0}</td>
                        <td className="px-3 py-3 text-center">
                          {remaining > 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-bold text-[11px]">
                              {remaining}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <Home size={13} className="text-blue-500" />
                            <div>
                              <div className="font-bold text-foreground text-xs">{schedule.branchId?.name}</div>
                              <div className="text-[10px] text-muted-foreground">{schedule.destinationType}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 font-mono font-medium text-foreground">
                          {schedule.expectedDate ? format(new Date(schedule.expectedDate), 'MMM d, yyyy') : '-'}
                        </td>
                        <td className="px-3 py-3">
                          <span 
                            className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white"
                            style={{ backgroundColor: getStatusColor(schedule.status) }}
                          >
                            {schedule.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {(po.status === 'DRAFT' || po.status === 'CONFIRMED') && schedule.receivedQuantity === 0 && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditModal(schedule)}
                                className="p-1 rounded-lg hover:bg-muted text-blue-600 transition-colors cursor-pointer"
                                title="Edit Schedule"
                              >
                                <Edit size={14} />
                              </button>
                              {schedule.status !== 'CANCELLED' && (
                                <button
                                  type="button"
                                  onClick={() => openCancelModal(schedule._id)}
                                  className="p-1 rounded-lg hover:bg-muted text-rose-500 transition-colors cursor-pointer"
                                  title="Cancel Schedule"
                                >
                                  <XCircle size={14} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteSchedule(schedule._id)}
                                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-rose-600 transition-colors cursor-pointer"
                                title="Delete Schedule"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {renderPagination(schedulePagination, setSchedulePage)}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 6. MODALS                                                                 */}
      {/* ========================================================================= */}
      
      {/* Single Schedule Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl p-6 text-foreground animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
              <h3 className="text-base font-black uppercase tracking-tight">
                {editingScheduleId ? 'Edit Delivery Schedule' : 'Add Delivery Schedule'}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsScheduleModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitSchedule} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">
                  Product Line
                </label>
                <select 
                  required 
                  disabled={!!editingScheduleId}
                  value={scheduleData.purchaseOrderItemId}
                  onChange={e => {
                    const item = po.items.find(i => i._id === e.target.value);
                    setScheduleData({...scheduleData, purchaseOrderItemId: e.target.value, productId: item?.productId?._id});
                  }}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select Product from PO</option>
                  {po.items.map(item => {
                    const available = item.quantity - (item.scheduledQuantity || 0);
                    return (
                      <option key={item._id} value={item._id} disabled={available <= 0 && !editingScheduleId}>
                        {item.productId?.name} (Available: {available})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">
                    Quantity
                  </label>
                  <input 
                    type="number" min="1" required 
                    value={scheduleData.scheduledQuantity}
                    onChange={e => setScheduleData({...scheduleData, scheduledQuantity: e.target.value})}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">
                    Expected Delivery Date
                  </label>
                  <input 
                    type="date" required 
                    value={scheduleData.expectedDate}
                    onChange={e => setScheduleData({...scheduleData, expectedDate: e.target.value})}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">
                    Destination Type
                  </label>
                  <select 
                    value={scheduleData.destinationType}
                    onChange={e => setScheduleData({...scheduleData, destinationType: e.target.value})}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Store">Store</option>
                    <option value="Warehouse">Warehouse</option>
                    <option value="Branch">Branch</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">
                    Destination Branch
                  </label>
                  <select 
                    required 
                    value={scheduleData.branchId}
                    onChange={e => setScheduleData({...scheduleData, branchId: e.target.value})}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select Destination</option>
                    {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">
                  Notes / Instructions
                </label>
                <input 
                  value={scheduleData.notes}
                  placeholder="Optional delivery instructions..."
                  onChange={e => setScheduleData({...scheduleData, notes: e.target.value})}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  {editingScheduleId ? 'Update Schedule' : 'Add Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Schedule Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 text-foreground animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-black mb-3 text-rose-500 flex items-center gap-2">
              <AlertCircle size={18} />
              Cancel Delivery Schedule
            </h3>
            <form onSubmit={handleCancelScheduleSubmit} className="space-y-4 text-xs">
              <p className="text-muted-foreground">
                Are you sure you want to cancel this delivery schedule? Please provide a reason for the record.
              </p>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">
                  Reason for Cancellation *
                </label>
                <textarea 
                  required
                  rows="3"
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 placeholder:text-muted-foreground"
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="e.g. Supplier delay, inventory change, branch modification..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button 
                  type="button" 
                  onClick={closeCancelModal}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-bold transition-colors"
                >
                  Keep Schedule
                </button>
                <button 
                  type="submit" 
                  disabled={!cancelReason.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  Confirm Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Schedule Modal */}
      {isBulkScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-6xl p-5 sm:p-6 text-foreground animate-in fade-in zoom-in-95 duration-200 m-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-border">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight">Bulk Schedule Delivery</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Distribute order fulfillment across multiple items and branch locations</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border">
                  <button
                    type="button"
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${bulkMode === 'MANUAL' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setBulkMode('MANUAL')}
                  >
                    Manual Item Split
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${bulkMode === 'EQUAL' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setBulkMode('EQUAL')}
                  >
                    Equal Store Distribution
                  </button>
                </div>
                {bulkMode === 'MANUAL' && (
                  <div className="flex gap-1.5">
                    <button 
                      type="button"
                      onClick={handleScheduleAllRemaining}
                      className="px-2.5 py-1.5 rounded-lg border border-border text-xs font-bold hover:bg-muted text-foreground transition-colors"
                    >
                      Schedule All
                    </button>
                    <button 
                      type="button"
                      onClick={handleClearAllBulk}
                      className="px-2.5 py-1.5 rounded-lg border border-border text-xs font-bold hover:bg-muted text-muted-foreground transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>

            {bulkScheduleError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-500 p-3 rounded-xl mb-4 text-xs font-bold">
                {bulkScheduleError}
              </div>
            )}

            {bulkMode === 'MANUAL' ? (
              <form onSubmit={handleBulkSubmit}>
                <div className="mb-4 flex flex-col md:flex-row items-center justify-between gap-4 bg-muted/20 p-3 rounded-xl border border-border">
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input 
                      type="text" 
                      placeholder="Search products, SKU..." 
                      className="w-full pl-8 pr-8 py-1.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={bulkSearch}
                      onChange={e => setBulkSearch(e.target.value)}
                    />
                    {bulkSearch && (
                      <button type="button" className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground" onClick={() => setBulkSearch('')}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {renderPagination(bulkPagination, setBulkPage)}
                </div>

                <div className="overflow-x-auto max-h-[55vh] space-y-4 pr-1">
                  <div className="flex items-center gap-2 px-1">
                    <input 
                      type="checkbox" 
                      checked={bulkPaginatedItems.length > 0 && bulkPaginatedItems.every(i => globalBulkState[i._id]?.selected)}
                      onChange={e => toggleSelectAllPage(e.target.checked)}
                      className="w-4 h-4 cursor-pointer rounded"
                    />
                    <span className="font-black text-xs">Select all items on this page</span>
                  </div>

                  {loadingBulkSchedules && (
                    <div className="text-center p-6 text-muted-foreground text-xs">Loading items...</div>
                  )}

                  {!loadingBulkSchedules && bulkPaginatedItems.map(poItem => {
                    const state = globalBulkState[poItem._id];
                    if (!state) return null;
                    
                    const sumSplits = state.splits.reduce((acc, curr) => acc + (Number(curr.scheduledQuantity) || 0), 0);
                    const orderedQuantity = poItem.quantity;
                    const alreadyScheduledQuantity = poItem.scheduledQuantity || 0;
                    const remainingToSchedule = orderedQuantity - alreadyScheduledQuantity - sumSplits;
                    const hasError = remainingToSchedule < 0;

                    return (
                      <div 
                        key={poItem._id} 
                        className={`border rounded-2xl overflow-hidden transition-all ${!state.selected ? 'opacity-50 grayscale bg-muted/10' : 'bg-card border-border'} ${hasError ? 'border-rose-500 shadow-[0_0_0_1px_rgba(244,63,94,1)]' : ''}`}
                      >
                        <div className="p-3.5 bg-muted/20 border-b border-border flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <input 
                              type="checkbox" 
                              checked={state.selected}
                              onChange={() => toggleItemSelection(poItem._id)}
                              className="w-4 h-4 mt-1 cursor-pointer rounded"
                            />
                            <div>
                              <div className="font-black text-foreground text-xs">{poItem.productId?.name}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">SKU: {poItem.productId?.sku}</div>
                            </div>
                          </div>

                          <div className="flex gap-4 text-xs">
                            <div className="text-center">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block">Ordered</span>
                              <span className="font-black text-foreground">{orderedQuantity}</span>
                            </div>
                            <div className="text-center">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block">Already Sch.</span>
                              <span className="font-black text-blue-600">{alreadyScheduledQuantity}</span>
                            </div>
                            <div className="text-center">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block">New Sch.</span>
                              <span className={`font-black ${hasError ? 'text-rose-500' : 'text-emerald-500'}`}>{sumSplits}</span>
                            </div>
                            <div className="text-center">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block">Remaining</span>
                              <span className={`font-black ${remainingToSchedule < 0 ? 'text-rose-500' : remainingToSchedule > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                {remainingToSchedule}
                              </span>
                            </div>
                          </div>
                        </div>

                        {state.selected && (
                          <div className="p-3.5 bg-card space-y-2">
                            {state.splits.map((split, splitIndex) => (
                              <div key={split.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs">
                                <div className="sm:col-span-2">
                                  <input 
                                    type="number" min="0" placeholder="Qty"
                                    value={split.scheduledQuantity}
                                    onChange={e => updateDeliverySplit(poItem._id, split.id, 'scheduledQuantity', e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs"
                                  />
                                </div>
                                <div className="sm:col-span-3">
                                  <input 
                                    type="date"
                                    required={Number(split.scheduledQuantity) > 0}
                                    value={split.expectedDate}
                                    onChange={e => updateDeliverySplit(poItem._id, split.id, 'expectedDate', e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <select 
                                    value={split.destinationType}
                                    onChange={e => updateDeliverySplit(poItem._id, split.id, 'destinationType', e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs"
                                  >
                                    <option value="Store">Store</option>
                                    <option value="Warehouse">Warehouse</option>
                                    <option value="Branch">Branch</option>
                                  </select>
                                </div>
                                <div className="sm:col-span-2">
                                  <select 
                                    value={split.branchId}
                                    required={Number(split.scheduledQuantity) > 0}
                                    onChange={e => updateDeliverySplit(poItem._id, split.id, 'branchId', e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs"
                                  >
                                    <option value="">Select Dest</option>
                                    {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                                  </select>
                                </div>
                                <div className="sm:col-span-2">
                                  <input 
                                    value={split.notes}
                                    placeholder="Notes..."
                                    onChange={e => updateDeliverySplit(poItem._id, split.id, 'notes', e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs"
                                  />
                                </div>
                                <div className="sm:col-span-1 text-right">
                                  <button 
                                    type="button" 
                                    onClick={() => removeDeliverySplit(poItem._id, split.id)}
                                    className="p-1 rounded-lg text-muted-foreground hover:text-rose-500 transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}

                            <button 
                              type="button" 
                              onClick={() => addDeliverySplit(poItem._id)}
                              className="text-xs text-blue-600 font-bold hover:underline inline-flex items-center gap-1 mt-1"
                            >
                              + Add Split
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsBulkScheduleModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    Save All Schedules
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleEqualSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-muted/20 p-3.5 rounded-xl border border-border">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">
                      Destination Type
                    </label>
                    <select 
                      value={equalBranchType} 
                      onChange={e => {
                        setEqualBranchType(e.target.value);
                        setEqualSelectedBranchIds([]);
                      }}
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Store">Store (Retail Locations)</option>
                      <option value="Branch">Branch (Office Locations)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">
                      Expected Delivery Date *
                    </label>
                    <input 
                      type="date" 
                      required 
                      value={equalExpectedDate} 
                      onChange={e => setEqualExpectedDate(e.target.value)} 
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-7 border border-border rounded-2xl p-4 bg-card">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-border">
                      <h4 className="font-black text-xs uppercase tracking-tight flex items-center gap-1.5">
                        <Building2 size={14} className="text-blue-500" />
                        Select Stores ({equalSelectedBranchIds.length} / {branches.filter(b => b.type === (equalBranchType === 'Branch' ? 'Office' : 'Store')).length})
                      </h4>
                      <div className="flex gap-2 text-xs">
                        <button 
                          type="button" 
                          className="text-blue-600 font-bold hover:underline"
                          onClick={() => {
                            const matching = branches.filter(b => b.type === (equalBranchType === 'Branch' ? 'Office' : 'Store'));
                            setEqualSelectedBranchIds(matching.map(b => b._id));
                          }}
                        >
                          Select All
                        </button>
                        <span className="text-muted-foreground">|</span>
                        <button 
                          type="button" 
                          className="text-muted-foreground font-bold hover:underline"
                          onClick={() => setEqualSelectedBranchIds([])}
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
                      {branches
                        .filter(b => b.type === (equalBranchType === 'Branch' ? 'Office' : 'Store'))
                        .map(branch => {
                          const isChecked = equalSelectedBranchIds.includes(branch._id);
                          return (
                            <label 
                              key={branch._id} 
                              className={`flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition-colors ${isChecked ? 'bg-blue-500/10 border border-blue-500/30 font-bold' : 'hover:bg-muted/30 border border-transparent'}`}
                            >
                              <div className="flex items-center gap-2">
                                <input 
                                  type="checkbox" 
                                  checked={isChecked}
                                  onChange={() => {
                                    setEqualSelectedBranchIds(prev => 
                                      prev.includes(branch._id) ? prev.filter(id => id !== branch._id) : [...prev, branch._id]
                                    );
                                  }}
                                  className="w-4 h-4 cursor-pointer rounded"
                                />
                                <span>{branch.name}</span>
                              </div>
                              {branch.code && <span className="text-[10px] text-muted-foreground font-mono">{branch.code}</span>}
                            </label>
                          );
                        })}
                    </div>
                  </div>

                  <div className="lg:col-span-5 border border-border rounded-2xl p-4 bg-muted/20 flex flex-col justify-between">
                    <div>
                      <h4 className="font-black text-xs uppercase tracking-tight mb-3 flex items-center gap-1.5 pb-2 border-b border-border">
                        <Package size={14} className="text-indigo-500" />
                        Distribution Summary
                      </h4>

                      {loadingEqualPreview ? (
                        <div className="text-center py-8 text-muted-foreground">Calculating preview...</div>
                      ) : equalPreview ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 rounded-xl bg-card border border-border">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block">Items with Qty</span>
                              <span className="font-black text-sm text-foreground">{equalPreview.poItemsWithRemainingQuantity} lines</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-card border border-border">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block">Selected Stores</span>
                              <span className="font-black text-sm text-foreground">{equalPreview.selectedStores}</span>
                            </div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs">
                            <div className="font-black text-blue-600 mb-1">Equal Distribution Rule</div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              Each product line's remaining quantity is distributed equally across {equalPreview.selectedStores} stores.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">Select stores to preview distribution</div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
                      <button 
                        type="button" 
                        onClick={() => setIsBulkScheduleModalOpen(false)}
                        className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-bold transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        disabled={submittingEqual || equalSelectedBranchIds.length === 0 || !equalExpectedDate}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                      >
                        {submittingEqual ? 'Applying...' : 'Apply Equal Distribution'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Email Modal */}
      {isEmailModalOpen && po && (
        <EmailSendModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          documentType="Purchase Order"
          documentNumber={poNumber}
          recipientName={po.supplierId?.name}
          defaultEmail={po.supplierId?.email}
          sendEndpoint={`/api/v1/email/purchase-order/${po._id}`}
        />
      )}

    </div>
  );
};

export default PurchaseOrderDetail;

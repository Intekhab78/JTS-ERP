import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, FileText, Package, Truck, Calendar, MapPin, Building, CreditCard, Banknote, Trash2, Edit, Search, ChevronLeft, ChevronRight, X, Clock, Printer, Mail, Phone, AlertCircle, Box, Home, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useReactToPrint } from 'react-to-print';

const PurchaseOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPo] = useState(null);
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

  const [loading, setLoading] = useState(true);
  
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
  const { currencySymbol } = useCurrency();
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
        const res = await axios.post(`http://localhost:5000/api/v1/purchases/${id}/schedules/equal-distribution/preview`, {
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
      const res = await axios.get(`http://localhost:5000/api/v1/purchases/${id}/schedules`, {
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
      const res = await axios.get(`http://localhost:5000/api/v1/purchases/${id}/schedules`, {
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
      const res = await axios.get('http://localhost:5000/api/v1/branches', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBranches(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchPO = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/v1/purchases/${id}`, {
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

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!po) return <div className="p-8 text-center text-error">Purchase Order not found</div>;

  const getStatusBadge = (status) => {
    const baseClass = "text-xs px-3 py-1.5 rounded-full font-bold tracking-wider shadow-sm border";
    switch (status) {
      case 'RECEIVED':
        return <Badge variant="success" className={`${baseClass} border-green-200 dark:border-green-800`}>RECEIVED</Badge>;
      case 'PARTIALLY_RECEIVED':
        return <Badge variant="info" className={`${baseClass} border-blue-200 dark:border-blue-800`}>PARTIALLY RECEIVED</Badge>;
      case 'CONFIRMED':
        return <Badge variant="primary" className={`${baseClass} border-indigo-200 dark:border-indigo-800`}>CONFIRMED</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive" className={`${baseClass} border-red-200 dark:border-red-800`}>CANCELLED</Badge>;
      case 'DRAFT':
      default:
        return <Badge variant="secondary" className={`${baseClass} border-slate-200 dark:border-slate-800`}>DRAFT</Badge>;
    }
  };

  const handleConfirm = async () => {
    if (!window.confirm('Are you sure you want to confirm this purchase order?')) return;
    try {
      await axios.post(`http://localhost:5000/api/v1/purchases/${id}/confirm`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchPO();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to confirm PO');
    }
  };

  const handleSubmitSchedule = async (e) => {
    e.preventDefault();
    try {
      if (editingScheduleId) {
        await axios.put(`http://localhost:5000/api/v1/purchases/${id}/schedules/${editingScheduleId}`, scheduleData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post(`http://localhost:5000/api/v1/purchases/${id}/schedules`, scheduleData, {
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
      await axios.post(`http://localhost:5000/api/v1/purchases/${id}/schedules/bulk`, { schedules: payloadSchedules }, {
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
      await axios.post(`http://localhost:5000/api/v1/purchases/${id}/schedules/equal-distribution`, {
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
      await axios.post(`http://localhost:5000/api/v1/purchases/${id}/schedules/${cancelScheduleId}/cancel`, 
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
      await axios.delete(`http://localhost:5000/api/v1/purchases/${id}/schedules/${scheduleId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchPO();
      fetchMainSchedules();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete schedule');
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
      <div className="flex flex-col md:flex-row items-center justify-between py-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 gap-4">
         <div className="text-sm text-slate-500">
            Showing <span className="font-medium text-slate-900 dark:text-white">{total === 0 ? 0 : startItem}-{endItem}</span> of <span className="font-medium text-slate-900 dark:text-white">{total}</span> items
         </div>
         <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1} className="h-8 w-8 p-0 border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 shrink-0 rounded-md"><ChevronLeft size={16} /></Button>
            {pages.map((p, i) => (
               <Button 
                 type="button" 
                 key={i} 
                 variant={p === page ? 'default' : 'outline'} 
                 size="sm" 
                 className={`h-8 rounded-md shrink-0 transition-colors ${p === '...' ? 'w-8 border-none pointer-events-none bg-transparent' : p === page ? 'min-w-8 bg-blue-600 hover:bg-blue-700 text-white border-blue-600' : 'min-w-8 border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`} 
                 onClick={() => p !== '...' && setPage(p)}
               >
                  {p}
               </Button>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="h-8 w-8 p-0 border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 shrink-0 rounded-md"><ChevronRight size={16} /></Button>
         </div>
      </div>
    );
  };

  const poSymbol = po.currency === 'AED' ? 'AED' : currencySymbol;

  return (
    <div ref={componentRef} className="animate-in fade-in zoom-in-95 duration-300 max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2 no-print">
          <Button variant="outline" size="sm" onClick={() => navigate('/purchases')} className="h-8 w-8 p-0 mr-2 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 shrink-0 rounded-md transition-colors bg-white shadow-sm">
            <ChevronLeft size={16} />
          </Button>
          <span className="hover:text-blue-600 cursor-pointer">Purchases</span>
          <span>/</span>
          <span className="hover:text-blue-600 cursor-pointer">Orders</span>
          <span>/</span>
          <span className="font-semibold text-blue-600">{po.purchaseOrderNumber || `PO-${po._id.slice(-6).toUpperCase()}`}</span>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{po.purchaseOrderNumber || `PO-${po._id.slice(-6).toUpperCase()}`}</h1>
              {po.status === 'CONFIRMED' ? (
                <Badge className="text-xs px-3 py-1.5 rounded-full font-bold tracking-wider shadow-sm border bg-green-50 text-green-700 border-green-200 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> CONFIRMED
                </Badge>
              ) : (
                getStatusBadge(po.status)
              )}
            </div>
            <p className="text-slate-500 text-sm mt-1 no-print">Purchase Order Details</p>
          </div>
          <div className="flex items-center gap-3 no-print">
            <Button variant="outline" onClick={() => handlePrint()} className="text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hidden md:flex">
              <Printer size={16} className="mr-2 text-slate-400" /> Print / Export
            </Button>
            {po.status === 'DRAFT' && (
              <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                Confirm Order
              </Button>
            )}
            {(po.status === 'CONFIRMED' || po.status === 'PARTIALLY_RECEIVED') && (
               <Button onClick={() => navigate(`/purchases/grn/new?poId=${po._id}`)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                 <Package size={16} className="mr-2" /> Create Receipt (GRN)
               </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-2 flex flex-col gap-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
          <div className="flex justify-between items-start">
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400"><Building size={16} /></div> SUPPLIER INFORMATION
             </h3>
             <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 border-0">Dubai</Badge>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{po.supplierId?.name}</div>
            <div className="flex flex-col md:flex-row gap-4 text-sm text-slate-500 dark:text-slate-400">
              {po.supplierId?.email && <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400" /> {po.supplierId.email}</div>}
              {po.supplierId?.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {po.supplierId.phone}</div>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <MapPin size={14} className="text-blue-400" /> DELIVER TO
              </div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">{po.branchId?.name}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Calendar size={14} className="text-green-400" /> ORDER DATE
              </div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">{format(new Date(po.createdAt), 'MMMM d, yyyy')}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Truck size={14} className="text-orange-400" /> EXPECTED DELIVERY
              </div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {po.expectedDate ? format(new Date(po.expectedDate), 'MMMM d, yyyy') : 'Not specified'}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 md:col-span-1 bg-slate-900 text-white rounded-xl shadow-lg border-0 flex flex-col justify-between" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
           <div>
             <div className="flex justify-between items-start mb-6">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg text-slate-300"><Banknote size={16} /></div> FINANCIAL SUMMARY
                </h3>
                <Badge variant="secondary" className="bg-white/10 text-slate-300 border-0 hover:bg-white/20 text-xs px-2 py-1">AED Currency</Badge>
             </div>
             
             <div className="space-y-1">
                <div className="text-xs text-slate-400 tracking-wider uppercase font-semibold mb-2">Total Amount</div>
                <div className="flex items-baseline gap-2">
                   <span className="text-xl font-bold text-blue-400">{poSymbol}</span>
                   <span className="text-4xl font-bold tracking-tight text-white">{po.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
             </div>
           </div>

           <div className="mt-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <div className="text-xs text-slate-400 mb-1">Payment Terms</div>
                    <div className="text-sm font-semibold text-green-400 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-400"></div> {po.paymentTerms || 'Immediate'}</div>
                 </div>
                 <div>
                    <div className="text-xs text-slate-400 mb-1">Fulfillment Status</div>
                    <div className="text-sm font-semibold text-yellow-400 flex items-center gap-1"><AlertCircle size={14} /> 0% Received</div>
                 </div>
              </div>
              
              <div className="space-y-2">
                 <div className="flex justify-between items-end">
                    <span className="text-xs text-slate-300 font-medium">Fulfillment Pipeline</span>
                    <span className="text-xs text-blue-400 font-bold">80 / 100 Scheduled</span>
                 </div>
                 <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden flex">
                    <div className="h-full bg-blue-500 rounded-l-full" style={{ width: '80%' }}></div>
                    <div className="h-full bg-orange-400 rounded-r-full" style={{ width: '20%' }}></div>
                 </div>
              </div>
           </div>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-xl shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><Package size={16} className="text-blue-600 dark:text-blue-400" /></div> 
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Order Lines</h3>
            <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-0 hover:bg-blue-100 font-medium">
               {schedulePagination?.totalItems || po.items?.length || 0} item{ (schedulePagination?.totalItems || po.items?.length || 0) !== 1 ? 's' : '' } included
            </Badge>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              type="text" 
              placeholder="Search products, SKU..." 
              className="pl-10 pr-8 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-md focus-visible:ring-1 focus-visible:ring-blue-500 shadow-none text-sm h-9"
              value={scheduleSearch}
              onChange={e => setScheduleSearch(e.target.value)}
            />
            {scheduleSearch && (
              <button className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" onClick={() => setScheduleSearch('')}>
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="p-4">Product</th>
                <th className="p-4 text-center">UOM</th>
                <th className="p-4 text-center">Unit Price</th>
                <th className="p-4 text-center">Ordered</th>
                <th className="p-4 text-center">Scheduled</th>
                <th className="p-4 text-center">Received</th>
                <th className="p-4 text-center">Rem. to Schedule</th>
                <th className="p-4 text-center">Rem. to Receive</th>
                <th className="p-4 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {loadingSchedules ? <tr><td colSpan={9} className="p-8 text-center text-slate-400 animate-pulse">Loading order lines...</td></tr> : mainPaginatedItems.map((item, idx) => {
                const remToSchedule = item.quantity - (item.scheduledQuantity || 0);
                const remToReceive = (item.scheduledQuantity || 0) - (item.receivedQuantity || 0);
                return (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white">{item.productId?.name}</div>
                      <div className="text-xs text-slate-400">SKU: {item.productId?.sku}</div>
                      {item.description && <div className="text-xs text-slate-400 mt-1 italic">{item.description}</div>}
                    </td>
                    <td className="p-4 text-center text-slate-600 dark:text-slate-300">{item.uom || 'PCS'}</td>
                    <td className="p-4 text-center text-slate-600 dark:text-slate-300">
                      <div className="text-xs text-slate-400">{poSymbol}</div>
                      <div>{item.unitCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                    </td>
                    <td className="p-4 text-center font-bold text-slate-800 dark:text-slate-200">{item.quantity}</td>
                    <td className="p-4 text-center">
                       {item.scheduledQuantity > 0 ? (
                          <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-sm font-bold text-xs">{item.scheduledQuantity}</span>
                       ) : (
                          <span className="text-slate-400">0</span>
                       )}
                    </td>
                    <td className="p-4 text-center text-slate-400">
                      {item.receivedQuantity > 0 ? (
                         <span className="font-bold text-slate-600 dark:text-slate-300">{item.receivedQuantity}</span>
                      ) : (
                         <span>0</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {remToSchedule > 0 ? (
                         <span className="bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-sm font-bold text-xs">{remToSchedule}</span>
                      ) : (
                         <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {remToReceive > 0 ? (
                         <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-sm font-bold text-xs">{remToReceive}</span>
                      ) : (
                         <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                       <div className="font-bold text-slate-900 dark:text-white">
                         <div className="text-xs text-slate-400 text-right">{poSymbol}</div>
                         {item.subTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {renderPagination(schedulePagination, setSchedulePage)}
      </Card>

      <div className="flex flex-col gap-6">
          {po.grns && po.grns.length > 0 && (
            <Card className="overflow-hidden rounded-xl shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
                  <div className="p-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg"><Box size={16} className="text-green-600 dark:text-green-400" /></div> 
                  RELATED GOODS RECEIPTS (GRNS)
                </h3>
                <div className="text-xs text-slate-500 pl-11">{po.grns.length} recorded receipt{po.grns.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="p-4 space-y-3 bg-white dark:bg-slate-950">
                {po.grns.map(grn => (
                  <div key={grn._id} className="px-4 py-3 flex items-center justify-between border border-slate-100 dark:border-slate-800 rounded-lg hover:shadow-sm transition-shadow bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
                        <FileText size={20} />
                      </div>
                      <div className="flex flex-col">
                        <div className="font-semibold text-slate-900 dark:text-white text-sm">{grn.grnNumber}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{format(new Date(grn.receiptDate), 'MMM d, yyyy')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                       {grn.status === 'VALIDATED' && <Badge variant="success">VALIDATED</Badge>}
                       {grn.status === 'DRAFT' && <Badge variant="secondary">DRAFT</Badge>}
                       {grn.status === 'CONFIRMED' && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">CONFIRMED</Badge>}
                       {grn.status === 'CANCELLED' && <Badge variant="destructive">CANCELLED</Badge>}
                       <Button variant="outline" size="sm" onClick={() => navigate(`/purchases/grn/${grn._id}`)} className="h-8 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300">
                         View
                       </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {po.notes && (
            <Card className="p-4 rounded-xl shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notes</h3>
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">{po.notes}</p>
            </Card>
          )}

          {/* DELIVERY SCHEDULES */}
          <Card className="overflow-hidden rounded-xl shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
                  <div className="p-1.5 bg-pink-50 dark:bg-pink-900/20 rounded-lg"><Calendar size={16} className="text-pink-600 dark:text-pink-400" /></div> 
                  Delivery Schedules
                </h3>
                <div className="text-xs text-slate-500 pl-11">{schedulePagination?.totalItems || mainPaginatedSchedules.length} shipment{schedulePagination?.totalItems !== 1 ? 's' : ''} planned</div>
              </div>
              {(po.status === 'DRAFT' || po.status === 'CONFIRMED') && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={openBulkScheduleModal} className="rounded-md border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                    Bulk Schedule
                  </Button>
                  <Button size="sm" onClick={() => {
                    setEditingScheduleId(null);
                    setScheduleData({ purchaseOrderItemId: '', productId: '', scheduledQuantity: '', expectedDate: '', destinationType: 'Store', branchId: '', notes: '' });
                    setIsScheduleModalOpen(true);
                  }} className="rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                    + Add Delivery Schedule
                  </Button>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4">Product</th>
                    <th className="p-4 text-center">Scheduled</th>
                    <th className="p-4 text-center">Received</th>
                    <th className="p-4 text-center">Remaining</th>
                    <th className="p-4 text-center">Destination</th>
                    <th className="p-4">Expected Date</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {loadingSchedules ? <tr><td colSpan={8} className="p-8 text-center text-muted-foreground animate-pulse">Loading schedules...</td></tr> : mainPaginatedSchedules.length === 0 ? (
                 <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">
                   <div className="flex flex-col items-center gap-2">
                     <Calendar size={32} className="text-slate-300 dark:text-slate-700" />
                     <span>No delivery schedules found for this PO.</span>
                   </div>
                 </td></tr>
              ) : (
                mainPaginatedSchedules.map(schedule => {
                  const remaining = schedule.scheduledQuantity - (schedule.receivedQuantity || 0);
                  return (
                    <tr key={schedule._id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white">{schedule.scheduledQuantity} {schedule.productId?.uom || 'PCS'} &bull; {schedule.productId?.name}</div>
                        <div className="text-xs text-slate-400">SKU: {schedule.productId?.sku}</div>
                      </td>
                      <td className="p-4 text-center font-bold text-slate-800 dark:text-slate-200">{schedule.scheduledQuantity}</td>
                      <td className="p-4 text-center text-slate-400">
                        {schedule.receivedQuantity > 0 ? (
                           <span className="font-bold text-slate-600 dark:text-slate-300">{schedule.receivedQuantity}</span>
                        ) : (
                           <span>0</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {remaining > 0 ? (
                           <span className="bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-sm font-bold text-xs">{remaining}</span>
                        ) : (
                           <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="p-4 text-center font-medium text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2">
                        <Home size={14} className="text-slate-400" />
                        <div className="text-left">
                          <div>{schedule.branchId?.name}</div>
                          <div className="text-xs text-slate-400 font-normal">{schedule.destinationType}</div>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">
                        {format(new Date(schedule.expectedDate), 'MMM d, yyyy')}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(schedule.status)}
                      </td>
                      <td className="p-4 text-right">
                         {(po.status === 'DRAFT' || po.status === 'CONFIRMED') && schedule.receivedQuantity === 0 && (
                            <div className="flex items-center justify-end gap-2">
                               <Button variant="ghost" size="sm" className="text-blue-600" onClick={() => openEditModal(schedule)}>
                                  <Edit size={16} />
                               </Button>
                               {schedule.status !== 'CANCELLED' && (
                                 <Button variant="ghost" size="sm" className="text-error" onClick={() => openCancelModal(schedule._id)} title="Cancel Delivery">
                                    <XCircle size={16} />
                                 </Button>
                               )}
                            </div>
                         )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {renderPagination(schedulePagination, setSchedulePage)}
      </Card>

      {/* Schedule Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-background rounded-lg shadow-xl w-full max-w-xl p-6">
              <h3 className="text-xl font-bold mb-4">{editingScheduleId ? 'Edit Delivery Schedule' : 'Add Delivery Schedule'}</h3>
              <form onSubmit={handleSubmitSchedule} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium mb-1">Product</label>
                    <Select 
                      required 
                      disabled={!!editingScheduleId}
                      value={scheduleData.purchaseOrderItemId}
                      onChange={e => {
                        const item = po.items.find(i => i._id === e.target.value);
                        setScheduleData({...scheduleData, purchaseOrderItemId: e.target.value, productId: item?.productId?._id});
                      }}
                    >
                       <option value="">Select Product from PO</option>
                       {po.items.map(item => {
                          const available = item.quantity - (item.scheduledQuantity || 0);
                          return (
                            <option key={item._id} value={item._id} disabled={available <= 0}>
                               {item.productId?.name} (Available: {available})
                            </option>
                          )
                       })}
                    </Select>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-medium mb-1">Quantity</label>
                       <Input 
                         type="number" min="1" required 
                         value={scheduleData.scheduledQuantity}
                         onChange={e => setScheduleData({...scheduleData, scheduledQuantity: e.target.value})}
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-medium mb-1">Expected Date</label>
                       <Input 
                         type="date" required 
                         value={scheduleData.expectedDate}
                         onChange={e => setScheduleData({...scheduleData, expectedDate: e.target.value})}
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-medium mb-1">Destination Type</label>
                       <Select 
                         value={scheduleData.destinationType}
                         onChange={e => setScheduleData({...scheduleData, destinationType: e.target.value})}
                       >
                          <option value="Store">Store</option>
                          <option value="Warehouse">Warehouse</option>
                          <option value="Branch">Branch</option>
                       </Select>
                    </div>
                    <div>
                       <label className="block text-sm font-medium mb-1">Destination</label>
                       <Select 
                         required 
                         value={scheduleData.branchId}
                         onChange={e => setScheduleData({...scheduleData, branchId: e.target.value})}
                       >
                          <option value="">Select Destination</option>
                          {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                       </Select>
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-medium mb-1">Notes</label>
                    <Input 
                      value={scheduleData.notes}
                      onChange={e => setScheduleData({...scheduleData, notes: e.target.value})}
                    />
                 </div>

                 <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button type="button" variant="outline" onClick={() => setIsScheduleModalOpen(false)}>Cancel</Button>
                    <Button type="submit">{editingScheduleId ? 'Update Schedule' : 'Add Schedule'}</Button>
                 </div>
               </form>
            </div>
        </div>
      )}

      {/* Cancel Schedule Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-background rounded-lg shadow-xl w-full max-w-md p-6">
              <h3 className="text-xl font-bold mb-4 text-error flex items-center gap-2">
                 <AlertCircle size={20} />
                 Cancel Delivery Schedule
              </h3>
              <form onSubmit={handleCancelScheduleSubmit} className="space-y-4">
                 <p className="text-sm text-slate-600 dark:text-slate-400">
                    Are you sure you want to cancel this delivery? Please provide a reason for cancellation.
                 </p>
                 <div>
                    <label className="block text-sm font-medium mb-1">Reason for Cancellation</label>
                    <textarea 
                      required
                      rows="3"
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      placeholder="e.g. Supplier delayed, Order changed, etc."
                    ></textarea>
                 </div>

                 <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                    <Button type="button" variant="outline" onClick={closeCancelModal}>Keep Schedule</Button>
                    <Button type="submit" variant="destructive" disabled={!cancelReason.trim()}>Confirm Cancel</Button>
                 </div>
               </form>
            </div>
        </div>
      )}

      {/* Bulk Schedule Modal */}
      {isBulkScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
            <div className="bg-background rounded-lg shadow-xl w-full max-w-7xl p-6 m-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-border">
                 <div>
                    <h3 className="text-xl font-bold">Bulk Schedule Delivery</h3>
                    <p className="text-sm text-muted-foreground">Distribute delivery across multiple items or stores</p>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="flex items-center bg-muted p-1 rounded-lg border border-border">
                       <button
                         type="button"
                         className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${bulkMode === 'MANUAL' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                         onClick={() => setBulkMode('MANUAL')}
                       >
                         Manual Item Split
                       </button>
                       <button
                         type="button"
                         className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${bulkMode === 'EQUAL' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                         onClick={() => setBulkMode('EQUAL')}
                       >
                         Equal Store Distribution
                       </button>
                    </div>
                    {bulkMode === 'MANUAL' && (
                       <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={handleScheduleAllRemaining}>Schedule All Remaining</Button>
                          <Button variant="outline" size="sm" onClick={handleClearAllBulk}>Clear All</Button>
                       </div>
                    )}
                 </div>
              </div>
              
              {bulkScheduleError && (
                 <div className="bg-error/10 text-error p-3 rounded mb-4 text-sm font-medium">
                    {bulkScheduleError}
                 </div>
              )}

              {bulkMode === 'MANUAL' ? (
                <form onSubmit={handleBulkSubmit}>
                   <div className="mb-4 flex flex-col md:flex-row items-center justify-between gap-4 bg-muted/10 p-3 rounded border border-border">
                      <div className="relative w-full md:w-80">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="text" 
                          placeholder="Search products, SKU..." 
                          className="pl-9 pr-8"
                          value={bulkSearch}
                          onChange={e => setBulkSearch(e.target.value)}
                        />
                        {bulkSearch && (
                          <button type="button" className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground" onClick={() => setBulkSearch('')}>
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {renderPagination(bulkPagination, setBulkPage)}
                   </div>
                   
                   <div className="overflow-x-auto max-h-[60vh] pb-8 space-y-6">
                      <div className="flex items-center gap-2 px-2 py-1">
                         <input 
                           type="checkbox" 
                           checked={bulkPaginatedItems.length > 0 && bulkPaginatedItems.every(i => globalBulkState[i._id]?.selected)}
                           onChange={e => toggleSelectAllPage(e.target.checked)}
                           className="w-4 h-4 cursor-pointer"
                         />
                         <span className="font-bold text-sm">Select all items on this page</span>
                      </div>

                      {loadingBulkSchedules && <div className="text-center p-4">Loading items...</div>}
                      {!loadingBulkSchedules && bulkPaginatedItems.length === 0 && <div className="text-center p-4">No items found.</div>}

                      {!loadingBulkSchedules && bulkPaginatedItems.map((poItem) => {
                         const state = globalBulkState[poItem._id];
                         if (!state) return null;
                         
                         const sumSplits = state.splits.reduce((acc, curr) => acc + (Number(curr.scheduledQuantity) || 0), 0);
                         const orderedQuantity = poItem.quantity;
                         const alreadyScheduledQuantity = poItem.scheduledQuantity || 0;
                         
                         const remainingToSchedule = orderedQuantity - alreadyScheduledQuantity - sumSplits;
                         const hasError = remainingToSchedule < 0;

                         return (
                           <div key={poItem._id} className={`border rounded-lg overflow-hidden transition-colors ${!state.selected ? 'opacity-50 grayscale bg-muted/20' : 'bg-card border-border'} ${hasError ? 'border-error shadow-[0_0_0_1px_rgba(239,68,68,1)]' : ''}`}>
                              <div className="p-4 bg-muted/10 border-b border-border flex items-start justify-between">
                                 <div className="flex items-start gap-3">
                                    <input 
                                      type="checkbox" 
                                      checked={state.selected}
                                      onChange={() => toggleItemSelection(poItem._id)}
                                      className="w-4 h-4 mt-1 cursor-pointer"
                                    />
                                    <div>
                                       <div className="font-bold text-foreground text-lg">{poItem.productId?.name}</div>
                                       <div className="text-sm text-muted-foreground">{poItem.productId?.sku}</div>
                                    </div>
                                 </div>
                                 <div className="flex gap-6 text-sm">
                                    <div className="text-center">
                                       <div className="text-muted-foreground uppercase text-xs font-bold tracking-wider">Ordered</div>
                                       <div className="font-medium text-lg">{orderedQuantity}</div>
                                    </div>
                                    <div className="text-center">
                                       <div className="text-muted-foreground uppercase text-xs font-bold tracking-wider">Already Sch.</div>
                                       <div className="font-medium text-lg text-blue-600">{alreadyScheduledQuantity}</div>
                                    </div>
                                    <div className="text-center">
                                       <div className="text-muted-foreground uppercase text-xs font-bold tracking-wider">New Sch.</div>
                                       <div className={`font-bold text-lg ${hasError ? 'text-error' : 'text-success'}`}>{sumSplits}</div>
                                    </div>
                                    <div className="text-center">
                                       <div className="text-muted-foreground uppercase text-xs font-bold tracking-wider">Total Sch.</div>
                                       <div className="font-medium text-lg">{alreadyScheduledQuantity + sumSplits}</div>
                                    </div>
                                    <div className="text-center">
                                       <div className="text-muted-foreground uppercase text-xs font-bold tracking-wider">Remaining</div>
                                       <div className={`font-bold text-lg ${remainingToSchedule < 0 ? 'text-error' : remainingToSchedule > 0 ? 'text-warning' : 'text-success'}`}>{remainingToSchedule}</div>
                                    </div>
                                 </div>
                              </div>
                              
                              {state.selected && (
                                 <div className="p-4 bg-card">
                                    {hasError && (
                                       <div className="text-sm text-error font-bold mb-3 flex items-center gap-1">
                                          Total scheduled quantity exceeds remaining quantity by {Math.abs(remainingToSchedule)}.
                                       </div>
                                    )}
                                    <table className="w-full text-left border-collapse">
                                      <thead>
                                        <tr className="text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
                                          <th className="pb-2 font-bold">Qty</th>
                                          <th className="pb-2 font-bold">Expected Date</th>
                                          <th className="pb-2 font-bold">Dest. Type</th>
                                          <th className="pb-2 font-bold">Destination</th>
                                          <th className="pb-2 font-bold">Notes</th>
                                          <th className="pb-2 font-bold w-10"></th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border text-sm">
                                        {state.splits.map((split, splitIndex) => (
                                           <tr key={split.id} className="hover:bg-muted/5 group">
                                              <td className="py-2 pr-2 w-32">
                                                 <Input 
                                                   type="number" min="0" 
                                                   value={split.scheduledQuantity}
                                                   onChange={e => updateDeliverySplit(poItem._id, split.id, 'scheduledQuantity', e.target.value)}
                                                   className={hasError ? 'border-error' : ''}
                                                 />
                                              </td>
                                              <td className="py-2 pr-2 w-48">
                                                 <Input 
                                                   type="date" 
                                                   required={Number(split.scheduledQuantity) > 0}
                                                   value={split.expectedDate}
                                                   onChange={e => updateDeliverySplit(poItem._id, split.id, 'expectedDate', e.target.value)}
                                                 />
                                              </td>
                                              <td className="py-2 pr-2 w-36">
                                                 <Select 
                                                   value={split.destinationType}
                                                   onChange={e => updateDeliverySplit(poItem._id, split.id, 'destinationType', e.target.value)}
                                                 >
                                                    <option value="Store">Store</option>
                                                    <option value="Warehouse">Warehouse</option>
                                                    <option value="Branch">Branch</option>
                                                 </Select>
                                              </td>
                                              <td className="py-2 pr-2 w-48">
                                                 <Select 
                                                   value={split.branchId}
                                                   required={Number(split.scheduledQuantity) > 0}
                                                   onChange={e => updateDeliverySplit(poItem._id, split.id, 'branchId', e.target.value)}
                                                 >
                                                    <option value="">Select Dest</option>
                                                    {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                                                 </Select>
                                              </td>
                                              <td className="py-2 pr-2">
                                                 <Input 
                                                   value={split.notes}
                                                   placeholder="Optional notes..."
                                                   onChange={e => updateDeliverySplit(poItem._id, split.id, 'notes', e.target.value)}
                                                 />
                                              </td>
                                              <td className="py-2 text-right">
                                                 <Button 
                                                    type="button" 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="text-muted-foreground hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => removeDeliverySplit(poItem._id, split.id)}
                                                 >
                                                    <Trash2 size={16} />
                                                 </Button>
                                              </td>
                                           </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    <div className="mt-3">
                                       <Button 
                                         type="button" 
                                         variant="ghost" 
                                         size="sm" 
                                         className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                         onClick={() => addDeliverySplit(poItem._id)}
                                       >
                                          + Add Delivery
                                       </Button>
                                    </div>
                                 </div>
                              )}
                           </div>
                         );
                      })}
                      {Object.keys(globalBulkState).length === 0 && !loadingBulkSchedules && (
                        <div className="p-8 text-center text-muted-foreground border rounded-lg bg-muted/10">
                          All items have been fully scheduled.
                        </div>
                      )}
                   </div>

                   <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                      <Button type="button" variant="outline" onClick={() => setIsBulkScheduleModalOpen(false)}>Cancel</Button>
                      <Button 
                        type="submit" 
                        disabled={Object.values(globalBulkState).filter(s => s.selected).length === 0 || Object.entries(globalBulkState).some(([itemId, state]) => {
                          if (!state.selected) return false;
                          const poItem = po.items.find(i => i._id === itemId);
                          if (!poItem) return false;
                          const sumSplits = state.splits.reduce((acc, curr) => acc + (Number(curr.scheduledQuantity) || 0), 0);
                          return (poItem.quantity - (poItem.scheduledQuantity || 0) - sumSplits) < 0;
                        })}
                      >
                        Save Schedule
                      </Button>
                   </div>
                </form>
              ) : (
                <form onSubmit={handleEqualSubmit} className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/10 p-4 rounded-lg border border-border">
                      <div>
                         <label className="block text-sm font-semibold mb-1">Destination Type</label>
                         <Select 
                           value={equalBranchType} 
                           onChange={e => {
                             setEqualBranchType(e.target.value);
                             setEqualSelectedBranchIds([]);
                           }}
                         >
                            <option value="Store">Store (Retail Locations)</option>
                            <option value="Branch">Branch (Office Locations)</option>
                         </Select>
                      </div>
                      <div>
                         <label className="block text-sm font-semibold mb-1">Expected Delivery Date <span className="text-error">*</span></label>
                         <Input 
                           type="date" 
                           required 
                           value={equalExpectedDate} 
                           onChange={e => setEqualExpectedDate(e.target.value)} 
                         />
                      </div>
                   </div>

                   <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Left: Destination Stores Selection */}
                      <div className="lg:col-span-7 border border-border rounded-lg p-4 bg-card">
                         <div className="flex items-center justify-between gap-2 mb-3">
                            <h4 className="font-bold text-sm flex items-center gap-2">
                              <Building size={16} />
                              Select Destination Stores ({equalSelectedBranchIds.length} / {branches.filter(b => b.type === (equalBranchType === 'Branch' ? 'Office' : 'Store')).length})
                            </h4>
                            <div className="flex gap-2">
                               <button 
                                 type="button" 
                                 className="text-xs text-blue-600 hover:underline font-medium"
                                 onClick={() => {
                                   const matching = branches.filter(b => b.type === (equalBranchType === 'Branch' ? 'Office' : 'Store'));
                                   setEqualSelectedBranchIds(matching.map(b => b._id));
                                 }}
                               >
                                 Select All
                               </button>
                               <span className="text-muted-foreground text-xs">|</span>
                               <button 
                                 type="button" 
                                 className="text-xs text-muted-foreground hover:underline font-medium"
                                 onClick={() => setEqualSelectedBranchIds([])}
                               >
                                 Clear
                               </button>
                            </div>
                         </div>

                         <div className="relative mb-3">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="text" 
                              placeholder="Filter stores by name or code..." 
                              className="pl-9 pr-8 text-sm"
                              value={equalBranchSearch}
                              onChange={e => setEqualBranchSearch(e.target.value)}
                            />
                            {equalBranchSearch && (
                              <button type="button" className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground" onClick={() => setEqualBranchSearch('')}>
                                <X className="h-4 w-4" />
                              </button>
                            )}
                         </div>

                         <div className="max-h-[350px] overflow-y-auto space-y-1 pr-1 border rounded p-2 bg-muted/5">
                            {branches
                              .filter(b => b.type === (equalBranchType === 'Branch' ? 'Office' : 'Store'))
                              .filter(b => b.name.toLowerCase().includes(equalBranchSearch.toLowerCase()) || (b.code && b.code.toLowerCase().includes(equalBranchSearch.toLowerCase())))
                              .map(branch => {
                                const isChecked = equalSelectedBranchIds.includes(branch._id);
                                return (
                                  <label 
                                    key={branch._id} 
                                    className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors text-sm ${isChecked ? 'bg-primary/10 border border-primary/30 font-medium' : 'hover:bg-muted/20 border border-transparent'}`}
                                  >
                                     <div className="flex items-center gap-2.5">
                                        <input 
                                          type="checkbox" 
                                          checked={isChecked}
                                          onChange={() => {
                                            setEqualSelectedBranchIds(prev => 
                                              prev.includes(branch._id) ? prev.filter(id => id !== branch._id) : [...prev, branch._id]
                                            );
                                          }}
                                          className="w-4 h-4 cursor-pointer"
                                        />
                                        <span>{branch.name}</span>
                                     </div>
                                     {branch.code && <span className="text-xs text-muted-foreground font-mono">{branch.code}</span>}
                                  </label>
                                );
                              })}
                            {branches.filter(b => b.type === (equalBranchType === 'Branch' ? 'Office' : 'Store')).length === 0 && (
                              <div className="text-center py-6 text-sm text-muted-foreground">
                                No {equalBranchType.toLowerCase()} locations found.
                              </div>
                            )}
                         </div>
                      </div>

                      {/* Right: Live Calculation & Preview Summary Card */}
                      <div className="lg:col-span-5 flex flex-col">
                         <div className="border border-border rounded-lg p-5 bg-muted/10 h-full flex flex-col justify-between">
                            <div>
                               <h4 className="font-bold text-base mb-4 flex items-center gap-2 pb-2 border-b border-border">
                                  <Package size={18} />
                                  Equal Distribution Summary
                               </h4>

                               {loadingEqualPreview ? (
                                  <div className="text-center py-8 text-muted-foreground text-sm">
                                     Calculating equal distribution preview...
                                  </div>
                               ) : equalPreview ? (
                                  <div className="space-y-4">
                                     <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-background p-3 rounded-lg border border-border">
                                           <div className="text-xs text-muted-foreground font-medium uppercase">PO Items with Qty</div>
                                           <div className="text-xl font-bold text-foreground mt-0.5">{equalPreview.poItemsWithRemainingQuantity} <span className="text-xs text-muted-foreground font-normal">/ {equalPreview.totalPOItems} items</span></div>
                                        </div>
                                        <div className="bg-background p-3 rounded-lg border border-border">
                                           <div className="text-xs text-muted-foreground font-medium uppercase">Selected Stores</div>
                                           <div className="text-xl font-bold text-foreground mt-0.5">{equalPreview.selectedStores}</div>
                                        </div>
                                        <div className="bg-background p-3 rounded-lg border border-border">
                                           <div className="text-xs text-muted-foreground font-medium uppercase">Remaining PO Qty</div>
                                           <div className="text-xl font-bold text-blue-600 mt-0.5">{equalPreview.totalRemainingQuantity}</div>
                                        </div>
                                        <div className="bg-background p-3 rounded-lg border border-border">
                                           <div className="text-xs text-muted-foreground font-medium uppercase">Schedules to Create</div>
                                           <div className="text-xl font-bold text-success mt-0.5">{equalPreview.schedulesToCreate}</div>
                                        </div>
                                     </div>

                                     <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs space-y-1.5">
                                        <div className="font-semibold text-blue-700 dark:text-blue-400">Distribution Strategy:</div>
                                        <p className="text-muted-foreground leading-relaxed">
                                          Every PO item's remaining quantity will be split equally across the {equalPreview.selectedStores} selected store(s). Any rounding remainders will be assigned 1-by-1 to stores deterministically.
                                        </p>
                                     </div>
                                  </div>
                               ) : (
                                  <div className="text-center py-8 text-muted-foreground text-sm">
                                     Select stores on the left to view equal distribution preview.
                                  </div>
                               )}
                            </div>

                            <div className="pt-4 border-t border-border mt-6">
                               <p className="text-xs text-muted-foreground mb-3">
                                  Generating equal distribution recalculates live quantities safely inside a database transaction.
                               </p>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                      <Button type="button" variant="outline" onClick={() => setIsBulkScheduleModalOpen(false)}>Cancel</Button>
                      <Button 
                        type="submit" 
                        disabled={submittingEqual || equalSelectedBranchIds.length === 0 || !equalExpectedDate}
                      >
                        {submittingEqual 
                          ? 'Generating Schedules...' 
                          : equalPreview 
                            ? `Apply Equal Distribution (${equalPreview.schedulesToCreate} Schedules)` 
                            : 'Apply Equal Distribution'}
                      </Button>
                   </div>
                 </form>
              )}
            </div>
        </div>
      )}
    </div>
  </div>
  );
};

export default PurchaseOrderDetail;

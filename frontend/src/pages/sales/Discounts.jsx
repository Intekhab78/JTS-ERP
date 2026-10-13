import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Tag, Plus, Download, Zap, Banknote, Gift, Package, Calendar, Ticket, Wallet, PowerOff, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import DiscountForm from './DiscountForm';
import DiscountDetail from './DiscountDetail';

const DiscountIconMap = {
  'PERCENTAGE': <Tag size={20} className="text-blue-500" />,
  'FLASH_SALE': <Zap size={20} className="text-amber-500" />,
  'FIXED': <Banknote size={20} className="text-emerald-500" />,
  'BUY_X_GET_Y': <Gift size={20} className="text-purple-500" />,
  'BULK_PURCHASE': <Package size={20} className="text-orange-500" />,
  'LIFESTYLE': <Calendar size={20} className="text-rose-500" />,
  'TIERED_DISCOUNT': <Ticket size={20} className="text-indigo-500" />,
  'CASH_DEPOSIT': <Wallet size={20} className="text-cyan-500" />
};

const formatDiscountType = (type) => {
  const map = {
    'PERCENTAGE': 'PERCENTAGE DISCOUNT',
    'FIXED': 'CASH DISCOUNT',
    'BUY_X_GET_Y': 'BOGO (BUY 1 GET 1)',
    'BULK_PURCHASE': 'BULK PURCHASE',
    'TIERED_DISCOUNT': 'TICKET LEVEL (TIERED)'
  };
  return map[type] || type.replace(/_/g, ' ');
};

const Discounts = () => {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: '', discountId: null, discountData: null });
  const navigate = useNavigate();
  const location = useLocation();

  const isFormOpen = location.pathname.includes('/new') || location.pathname.includes('/edit');
  const isViewOpen = location.pathname.match(/\/sales\/discounts\/[a-f0-9]{24}$/);

  useEffect(() => {
    fetchDiscounts();
  }, [location.pathname]);

  const fetchDiscounts = async () => {
    try {
      const res = await axios.get('/api/v1/discounts', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDiscounts(res.data);
    } catch (error) {
      console.error('Failed to fetch discounts', error);
    } finally {
      setLoading(false);
    }
  };

  const openConfirmModal = (type, id, data, e) => {
    e.stopPropagation();
    setConfirmModal({ isOpen: true, type, discountId: id, discountData: data });
  };

  const handleConfirmAction = async () => {
    const { type, discountId, discountData } = confirmModal;
    setConfirmModal({ isOpen: false, type: '', discountId: null, discountData: null });
    
    try {
      if (type === 'DEACTIVATE') {
        await axios.delete(`/api/v1/discounts/${discountId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else if (type === 'ACTIVATE') {
        await axios.put(`/api/v1/discounts/${discountId}`, { ...discountData, isActive: true }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      fetchDiscounts();
    } catch (error) {
      alert(error.response?.data?.message || `Failed to ${type.toLowerCase()} discount`);
    }
  };

  const activeCount = discounts.filter(d => d.isActive).length;
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const roleRaw = user?.roleName || user?.roleId?.name || user?.role || (user?.tenantId ? 'Tenant Admin' : 'Superadmin');
  const displayRole = roleRaw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  return (
    <div className="relative min-h-screen bg-slate-50 p-6 font-sans">
      
      {/* Hero Banner Header */}
      <div className="bg-[#0f4c5c] rounded-[32px] p-8 md:p-12 mb-8 text-white relative overflow-hidden shadow-xl">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{displayRole} Promotions & Discounts</h1>
          </div>
          <p className="text-teal-100 text-lg opacity-90 max-w-2xl">
            Design high-converting campaigns across your stores.
          </p>
        </div>
        {/* Subtle decorative circles */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[600px] h-[600px] bg-teal-600/20 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Campaigns</span>
            <span className="text-4xl font-bold text-[#0f4c5c]">{activeCount}</span>
          </div>
          <div className="flex gap-4">
            <button className="flex items-center gap-2 px-6 py-3 bg-teal-50 text-teal-700 font-bold rounded-full hover:bg-teal-100 transition-colors border border-teal-200">
              <Download size={18} />
              Download Report
            </button>
            <button 
              onClick={() => navigate('/sales/discounts/new')} 
              className="flex items-center gap-2 px-6 py-3 bg-[#0f4c5c] text-white font-bold rounded-full hover:bg-[#0c3e4b] transition-colors shadow-lg shadow-teal-900/20"
            >
              <Plus size={18} />
              New Campaign
            </button>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-24">
          {discounts.map((discount) => (
            <div 
              key={discount._id} 
              onClick={() => navigate(`/sales/discounts/edit/${discount._id}`)}
              className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative group"
            >
              {/* Status Pill */}
              <div className={`absolute top-6 right-6 text-[10px] font-bold px-3 py-1 rounded-full tracking-wider ${
                discount.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
              }`}>
                {discount.isActive ? 'ACTIVE' : 'INACTIVE'}
              </div>

              <div className="mb-4 bg-slate-50 w-12 h-12 rounded-xl flex items-center justify-center shadow-sm">
                {DiscountIconMap[discount.discountType] || <Tag size={20} className="text-slate-500" />}
              </div>
              
              <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-1">{discount.name}</h3>
              <p className="text-xs font-black text-blue-500 tracking-wider mb-6">
                {formatDiscountType(discount.discountType)}
              </p>

              <div className="bg-slate-50/80 rounded-2xl p-4 mb-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Validity</p>
                <div className="text-sm font-semibold text-slate-700 flex flex-col gap-1">
                  <span>{discount.startDate ? format(new Date(discount.startDate), 'M/d/yyyy') : 'Anytime'} - {discount.endDate ? format(new Date(discount.endDate), 'M/d/yyyy') : 'Forever'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-auto">
                <span className="text-[10px] font-bold text-[#0f4c5c] bg-teal-50 px-3 py-1.5 rounded-full flex items-center gap-1">
                  {discount.branches?.length > 0 ? `${discount.branches.length} locations` : 'All locations'}
                </span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full flex items-center gap-1">
                  {discount.discountType === 'PERCENTAGE' ? `${discount.value}% OFF` : 
                   discount.discountType === 'FIXED' ? `₹${discount.value} OFF` : 'SPECIAL'}
                </span>
              </div>
              
              {/* Quick actions overlay on hover */}
              <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                 <button 
                   onClick={(e) => { e.stopPropagation(); navigate(`/sales/discounts/edit/${discount._id}`); }} 
                   className="p-2 bg-white rounded-full shadow text-blue-500 hover:bg-blue-50"
                   title="Edit"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                 </button>
                 {discount.isActive ? (
                    <button onClick={(e) => openConfirmModal('DEACTIVATE', discount._id, discount, e)} className="p-2 bg-white rounded-full shadow text-rose-500 hover:bg-rose-50" title="Deactivate"><PowerOff size={16}/></button>
                 ) : (
                    <button onClick={(e) => openConfirmModal('ACTIVATE', discount._id, discount, e)} className="p-2 bg-white rounded-full shadow text-emerald-500 hover:bg-emerald-50" title="Activate"><CheckCircle size={16}/></button>
                 )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Slide-over Drawer for Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
            onClick={() => navigate('/sales/discounts')}
          />
          {/* Drawer Content */}
          <div className="relative w-full max-w-2xl lg:max-w-3xl h-full bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
             <Routes>
                <Route path="new" element={<DiscountForm isDrawer onClose={() => navigate('/sales/discounts')} />} />
                <Route path="edit/:id" element={<DiscountForm isDrawer onClose={() => navigate('/sales/discounts')} />} />
             </Routes>
          </div>
        </div>
      )}

      {/* Detail View Modal / Drawer */}
      {isViewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => navigate('/sales/discounts')} />
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-y-auto animate-in zoom-in-95 duration-200">
             <Routes>
                <Route path=":id" element={<DiscountDetail isDrawer onClose={() => navigate('/sales/discounts')} />} />
             </Routes>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}></div>
          <div className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 ${confirmModal.type === 'DEACTIVATE' ? 'bg-rose-100 text-rose-500' : 'bg-emerald-100 text-emerald-500'}`}>
              {confirmModal.type === 'DEACTIVATE' ? <PowerOff size={32} /> : <CheckCircle size={32} />}
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {confirmModal.type === 'DEACTIVATE' ? 'Deactivate Promotion?' : 'Reactivate Promotion?'}
            </h2>
            
            <p className="text-slate-500 mb-8">
              {confirmModal.type === 'DEACTIVATE' 
                ? 'POS Orders already completed will remain unchanged. Are you sure you want to stop this promotion?' 
                : 'This promotion will be active and visible again for applicable POS Orders. Proceed?'}
            </p>
            
            <div className="flex gap-4 w-full">
              <button 
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmAction}
                className={`flex-1 px-6 py-3 text-white font-bold rounded-xl transition-colors ${
                  confirmModal.type === 'DEACTIVATE' 
                    ? 'bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/30' 
                    : 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30'
                }`}
              >
                Yes, {confirmModal.type === 'DEACTIVATE' ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Discounts;

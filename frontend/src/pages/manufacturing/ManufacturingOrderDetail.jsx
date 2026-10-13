import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CheckCircle, Package, Settings, Factory, AlertTriangle, Play, XCircle, FileText, Zap } from 'lucide-react';
import { format } from 'date-fns';

const ManufacturingOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [productionQty, setProductionQty] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const res = await axios.get(`/api/v1/manufacturing/orders/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setOrder(res.data);
      if (res.data) {
        setProductionQty(res.data.quantityToProduce - res.data.producedQuantity);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to load order');
      navigate('/manufacturing');
    }
  };

  const handleAction = async (actionPath, method = 'post', data = {}) => {
    if (actionPath.includes('cancel')) {
      if (!window.confirm('WARNING: Are you sure you want to cancel this order?')) return;
    }
    
    setActionLoading(true);
    try {
      await axios[method](`/api/v1/manufacturing/orders/${id}/${actionPath}`, data, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchOrder();
    } catch (error) {
      alert(error.response?.data?.message || `Failed to ${actionPath}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-none h-12 w-12 border-4 border-slate-200 border-t-blue-600 mb-4"></div>
        <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Fetching Order Data...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[1720px] mx-auto pb-10 min-h-screen bg-[#f8fafc]">
      
      <div className="mb-6">
        <button onClick={() => navigate('/manufacturing')} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm font-bold text-xs uppercase tracking-widest">
          <ArrowLeft size={16} strokeWidth={3} /> Back to Orders
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Aggressive Tech Header */}
        <div className="bg-[#0a0f1c] p-8 border-l-4 border-blue-500 relative overflow-hidden">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
           <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
           
           <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
             <div>
               <div className="flex items-center gap-3 mb-2">
                 <div className="h-10 w-10 bg-blue-600 flex items-center justify-center rounded">
                   <FileText size={20} className="text-white" />
                 </div>
                 <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase font-mono">{order.orderNumber}</h1>
               </div>
               <p className="text-slate-400 text-sm font-medium uppercase tracking-widest ml-14">
                 MANUFACTURING ORDER DETAILS
               </p>
             </div>

             {/* Status Pipeline indicator */}
             <div className="flex items-center flex-wrap gap-y-2">
               {['DRAFT', 'CONFIRMED', 'READY', 'IN_PROGRESS', 'DONE'].map((step, idx, arr) => {
                 const isCurrent = order.status === step;
                 const isPast = arr.indexOf(order.status) > arr.indexOf(step);
                 const isCancelled = order.status === 'CANCELLED';
                 
                 let style = "bg-slate-800 text-slate-500 border border-slate-700";
                 if (isCurrent) style = "bg-blue-600 text-white border border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.4)]";
                 else if (isPast) style = "bg-emerald-900/50 text-emerald-400 border border-emerald-800";
                 else if (isCancelled) style = "bg-rose-900/50 text-rose-400 border border-rose-800";

                 return (
                   <React.Fragment key={step}>
                     <div className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-sm tracking-widest transition-all duration-300 ${style}`}>
                       {step.replace('_', ' ')}
                     </div>
                     {idx < arr.length - 1 && <div className={`w-4 sm:w-8 h-[2px] mx-1 ${isPast ? 'bg-emerald-700' : 'bg-slate-800'}`}></div>}
                   </React.Fragment>
                 )
               })}
             </div>
           </div>
        </div>

        {/* Action Bar (Sharp) */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            {order.status === 'DRAFT' && hasPermission('EDIT_MANUFACTURING') && (
              <button 
                onClick={() => handleAction('confirm')}
                disabled={actionLoading}
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-md font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-50 shadow-md border border-blue-400"
              >
                Confirm Order
              </button>
            )}
            
            {order.status === 'CONFIRMED' && hasPermission('EDIT_MANUFACTURING') && (
              <button 
                onClick={() => handleAction('check-availability')}
                disabled={actionLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-md font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center gap-2 shadow-md border border-indigo-400"
              >
                <Package size={16} strokeWidth={2.5}/> Check Availability
              </button>
            )}

            {order.status === 'READY' && hasPermission('EDIT_MANUFACTURING') && (
              <button 
                onClick={() => handleAction('consume')}
                disabled={actionLoading}
                className="bg-amber-500 hover:bg-amber-400 text-white px-5 py-2.5 rounded-md font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center gap-2 shadow-md border border-amber-400"
              >
                <Settings size={16} strokeWidth={2.5} className="animate-spin-slow"/> Consume Materials
              </button>
            )}

            {order.status === 'IN_PROGRESS' && hasPermission('EDIT_MANUFACTURING') && (
              <div className="flex items-center gap-2 bg-white p-1.5 rounded-md border-2 border-slate-200 shadow-sm">
                <input 
                  type="number" 
                  min="1"
                  max={order.quantityToProduce - order.producedQuantity}
                  value={productionQty}
                  onChange={(e) => setProductionQty(Number(e.target.value))}
                  className="w-24 px-2 py-1 border-none focus:ring-0 text-sm font-black text-center font-mono outline-none"
                />
                <button 
                  onClick={() => handleAction('produce', 'post', { productionQuantity: productionQty })}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center gap-2 shadow-md"
                >
                  <Factory size={16} strokeWidth={2.5}/> Produce
                </button>
              </div>
            )}

            {(order.status === 'DRAFT' || order.status === 'CONFIRMED') && hasPermission('EDIT_MANUFACTURING') && (
              <button 
                onClick={() => handleAction('cancel')}
                disabled={actionLoading}
                className="bg-white border-2 border-rose-200 text-rose-600 hover:bg-rose-50 px-5 py-2.5 rounded-md font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>

        <div className="p-8 space-y-12">
          
          {/* Order Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Package size={14} className="text-blue-500"/> Finished Product</h3>
              <p className="font-bold text-slate-900 text-lg uppercase tracking-tight">{order.bomId?.finishedProductId?.name}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 bg-white px-2 py-1 rounded inline-block border border-slate-200 shadow-sm font-mono">SKU: {order.bomId?.finishedProductId?.sku}</p>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Factory size={14} className="text-blue-500"/> Facility (Branch)</h3>
              <p className="font-bold text-slate-900 text-lg uppercase tracking-tight">{order.branchId?.name}</p>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Play size={14} className="text-blue-500"/> Creation Date</h3>
              <p className="font-black text-slate-900 text-lg uppercase font-mono tracking-tight">{format(new Date(order.createdAt), 'MMM dd, yyyy')}</p>
              <p className="text-xs font-bold text-slate-500 mt-1">{format(new Date(order.createdAt), 'HH:mm:ss')}</p>
            </div>
          </div>

          {/* KPI Dashboard - Production Status */}
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Zap className="text-emerald-500" size={18} /> Production Output
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-5 flex justify-between items-start">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Target Quantity</p>
                    <h3 className="text-4xl font-black text-slate-800 font-mono tracking-tighter">{order.quantityToProduce}</h3>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-200"><div className="h-full bg-slate-800 w-full"></div></div>
              </div>

              <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-5 flex justify-between items-start">
                  <div>
                    <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Produced</p>
                    <h3 className="text-4xl font-black text-emerald-600 font-mono tracking-tighter">{order.producedQuantity}</h3>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-emerald-100"><div className="h-full bg-emerald-500" style={{width: `${(order.producedQuantity / order.quantityToProduce) * 100}%`}}></div></div>
              </div>

              <div className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-5 flex justify-between items-start">
                  <div>
                    <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-1">Remaining</p>
                    <h3 className="text-4xl font-black text-amber-500 font-mono tracking-tighter">{order.quantityToProduce - order.producedQuantity}</h3>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-amber-100"><div className="h-full bg-amber-500" style={{width: `${((order.quantityToProduce - order.producedQuantity) / order.quantityToProduce) * 100}%`}}></div></div>
              </div>
            </div>
          </div>

          {/* Component Matrix */}
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Settings className="text-blue-500" size={18} /> Component Matrix
            </h2>
            
            {order.rawMaterials && order.rawMaterials.length > 0 ? (
              <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-slate-50 border-b-2 border-slate-100">
                      <tr>
                        <th className="p-4 font-black text-[10px] text-slate-500 uppercase tracking-widest">Component Name</th>
                        <th className="p-4 font-black text-[10px] text-slate-500 uppercase tracking-widest text-center">Required</th>
                        <th className="p-4 font-black text-[10px] text-emerald-600 uppercase tracking-widest text-center">Consumed</th>
                        <th className="p-4 font-black text-[10px] text-amber-600 uppercase tracking-widest text-center">Remaining</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {order.rawMaterials.map((rm, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <span className="font-bold text-sm text-slate-800 uppercase tracking-tight">{rm.itemName}</span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="font-black text-slate-700 font-mono bg-slate-100 px-2 py-1 rounded border border-slate-200">
                              {rm.requiredQuantity} <span className="text-[10px] text-slate-400 ml-1">{rm.uom}</span>
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="font-black text-emerald-700 font-mono bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                              {rm.consumedQuantity} <span className="text-[10px] text-emerald-400 ml-1">{rm.uom}</span>
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="font-black text-amber-700 font-mono bg-amber-50 px-2 py-1 rounded border border-amber-200">
                              {rm.requiredQuantity - rm.consumedQuantity} <span className="text-[10px] text-amber-400 ml-1">{rm.uom}</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white border-2 border-dashed border-amber-200 p-8 rounded-xl flex flex-col items-center justify-center text-center">
                <AlertTriangle className="text-amber-500 mb-3" size={32} />
                <h4 className="text-sm font-black text-amber-700 uppercase tracking-widest mb-1">Awaiting Confirmation</h4>
                <p className="text-xs font-bold text-amber-600/70 max-w-md">The component matrix will be generated and locked once the order is confirmed.</p>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default ManufacturingOrderDetail;

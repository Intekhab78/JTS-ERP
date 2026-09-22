import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CheckCircle, Package, Settings, Factory, AlertTriangle, Play, XCircle } from 'lucide-react';
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
      if (!window.confirm('Are you sure you want to cancel this order?')) return;
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

  if (!order) return <div className="p-8 text-center text-slate-500 font-medium">Loading...</div>;

  return (
    <div className="animate-[slideIn_0.3s_ease-out] max-w-6xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/manufacturing')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">{order.orderNumber}</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Manufacturing Order Details</p>
        </div>
      </div>

      {/* Odoo-style Action Bar */}
      <div className="bg-white rounded-t-2xl border border-slate-200 border-b-0 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {order.status === 'DRAFT' && hasPermission('EDIT_MANUFACTURING') && (
            <button 
              onClick={() => handleAction('confirm')}
              disabled={actionLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
            >
              Confirm
            </button>
          )}
          
          {order.status === 'CONFIRMED' && hasPermission('EDIT_MANUFACTURING') && (
            <button 
              onClick={() => handleAction('check-availability')}
              disabled={actionLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Package size={16}/> Check Availability
            </button>
          )}

          {order.status === 'READY' && hasPermission('EDIT_MANUFACTURING') && (
            <button 
              onClick={() => handleAction('consume')}
              disabled={actionLoading}
              className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Settings size={16}/> Consume Materials
            </button>
          )}

          {order.status === 'IN_PROGRESS' && hasPermission('EDIT_MANUFACTURING') && (
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
              <input 
                type="number" 
                min="1"
                max={order.quantityToProduce - order.producedQuantity}
                value={productionQty}
                onChange={(e) => setProductionQty(Number(e.target.value))}
                className="w-20 px-2 py-1 border border-slate-300 rounded text-sm font-bold text-center"
              />
              <button 
                onClick={() => handleAction('produce', 'post', { productionQuantity: productionQty })}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-md font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Factory size={16}/> Produce
              </button>
            </div>
          )}

          {(order.status === 'DRAFT' || order.status === 'CONFIRMED') && hasPermission('EDIT_MANUFACTURING') && (
            <button 
              onClick={() => handleAction('cancel')}
              disabled={actionLoading}
              className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Status Pipeline indicator */}
        <div className="flex items-center">
          {['DRAFT', 'CONFIRMED', 'READY', 'IN_PROGRESS', 'DONE'].map((step, idx, arr) => (
            <div key={step} className="flex items-center">
              <div className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full ${
                order.status === step 
                  ? 'bg-blue-600 text-white' 
                  : arr.indexOf(order.status) > arr.indexOf(step) 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : order.status === 'CANCELLED' ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-500'
              }`}>
                {step.replace('_', ' ')}
              </div>
              {idx < arr.length - 1 && <div className={`w-4 h-0.5 ${arr.indexOf(order.status) > idx ? 'bg-emerald-200' : 'bg-slate-200'}`}></div>}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-8 rounded-b-2xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 mb-12">
          <div>
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Finished Product</h3>
            <p className="font-bold text-slate-800 text-lg">{order.bomId?.finishedProductId?.name}</p>
            <p className="text-sm font-medium text-slate-500">SKU: {order.bomId?.finishedProductId?.sku}</p>
          </div>
          <div>
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Facility (Branch)</h3>
            <p className="font-bold text-slate-800 text-lg">{order.branchId?.name}</p>
          </div>
          <div>
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Creation Date</h3>
            <p className="font-bold text-slate-800 text-lg">{format(new Date(order.createdAt), 'MMM dd, yyyy HH:mm')}</p>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Package className="text-blue-500" size={20} /> Finished Goods Production
          </h2>
          <div className="bg-slate-50 rounded-xl p-6 flex items-center justify-around border border-slate-100">
            <div className="text-center">
              <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">Planned</p>
              <p className="text-3xl font-black text-slate-800">{order.quantityToProduce}</p>
            </div>
            <div className="h-12 w-px bg-slate-200"></div>
            <div className="text-center">
              <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest mb-1">Produced</p>
              <p className="text-3xl font-black text-emerald-600">{order.producedQuantity}</p>
            </div>
            <div className="h-12 w-px bg-slate-200"></div>
            <div className="text-center">
              <p className="text-[10px] font-extrabold text-amber-500 uppercase tracking-widest mb-1">Remaining</p>
              <p className="text-3xl font-black text-amber-500">{order.quantityToProduce - order.producedQuantity}</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Settings className="text-blue-500" size={20} /> Raw Materials (Components)
          </h2>
          {order.rawMaterials && order.rawMaterials.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="p-4 font-extrabold text-[10px] text-slate-500 uppercase tracking-wider">Product</th>
                    <th className="p-4 font-extrabold text-[10px] text-slate-500 uppercase tracking-wider text-center">Required Qty</th>
                    <th className="p-4 font-extrabold text-[10px] text-emerald-600 uppercase tracking-wider text-center">Consumed</th>
                    <th className="p-4 font-extrabold text-[10px] text-amber-500 uppercase tracking-wider text-center">Remaining</th>
                    <th className="p-4 font-extrabold text-[10px] text-slate-500 uppercase tracking-wider text-right">UoM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.rawMaterials.map((rm, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-bold text-sm text-slate-800">{rm.itemName}</td>
                      <td className="p-4 font-black text-slate-700 text-center">{rm.requiredQuantity}</td>
                      <td className="p-4 font-black text-emerald-600 text-center">{rm.consumedQuantity}</td>
                      <td className="p-4 font-black text-amber-500 text-center">{rm.requiredQuantity - rm.consumedQuantity}</td>
                      <td className="p-4 font-bold text-xs text-slate-500 text-right">{rm.uom}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm font-medium border border-amber-200 flex items-start gap-3">
              <AlertTriangle className="shrink-0 mt-0.5 text-amber-500" size={18} />
              <p>Raw materials will be populated and locked here once the order is <b>CONFIRMED</b>.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManufacturingOrderDetail;

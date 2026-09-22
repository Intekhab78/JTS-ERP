import React, { useState, useEffect } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import axios from 'axios';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { Save, X, ArrowLeft, Printer, Truck, Search } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

const DeliveryNoteForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditing = !!id;

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  const [loading, setLoading] = useState(false);
  const { currencySymbol } = useCurrency();
  const [orders, setOrders] = useState([]);
  
  const [formData, setFormData] = useState({
    salesOrderId: '',
    customerId: '',
    deliveryDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    
    transporterName: '',
    vehicleNumber: '',
    driverName: '',
    driverPhone: '',
    trackingNumber: '',
    lrNumber: '',

    deliveryAddress: '',
    deliveryInstructions: '',

    receivedBy: '',
    receiverDesignation: '',
    receivedAt: '',
    receiverPhone: '',

    notes: '',
    internalNotes: '',
    
    items: [],
    status: 'DRAFT',
    deliveryNoteNumber: ''
  });

  const [customerInfo, setCustomerInfo] = useState(null);
  
  const [orderSearch, setOrderSearch] = useState('');
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowOrderDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOrders = orders.filter(o => {
    const searchLower = orderSearch.toLowerCase();
    return (
      o._id.toLowerCase().includes(searchLower) || 
      o.customerName.toLowerCase().includes(searchLower)
    );
  });

  const [searchParams] = useSearchParams();
  const soId = searchParams.get('soId');

  useEffect(() => {
    if (isEditing) {
      fetchDeliveryNote();
    } else {
      fetchSalesOrders();
    }
  }, [id]);

  const fetchSalesOrders = async () => {
    try {
      // Only fetch pending/paid orders that are not cancelled
      const res = await axios.get('/api/v1/sales', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const validOrders = res.data.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status));
      setOrders(validOrders);

      const targetOrderId = location.state?.orderId || soId;
      if (targetOrderId) {
        const orderToSelect = validOrders.find(o => o._id === targetOrderId);
        if (orderToSelect) {
          setFormData(prev => ({ ...prev, salesOrderId: orderToSelect._id }));
          setOrderSearch(`Order #${orderToSelect._id.slice(-6).toUpperCase()} - ${orderToSelect.customerName}`);
          loadOrderDetails(orderToSelect._id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch sales orders', error);
    }
  };

  const fetchDeliveryNote = async () => {
    try {
      const res = await axios.get(`/api/v1/delivery-notes/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const dn = res.data;
      setFormData({
        salesOrderId: dn.salesOrderId?._id || dn.salesOrderId,
        customerId: dn.customerId?._id || dn.customerId,
        deliveryDate: dn.deliveryDate ? dn.deliveryDate.split('T')[0] : '',
        expectedDeliveryDate: dn.expectedDeliveryDate ? dn.expectedDeliveryDate.split('T')[0] : '',
        
        transporterName: dn.transporterName || '',
        vehicleNumber: dn.vehicleNumber || '',
        driverName: dn.driverName || '',
        driverPhone: dn.driverPhone || '',
        trackingNumber: dn.trackingNumber || '',
        lrNumber: dn.lrNumber || '',

        deliveryAddress: dn.deliveryAddress || '',
        deliveryInstructions: dn.deliveryInstructions || '',

        receivedBy: dn.receivedBy || '',
        receiverDesignation: dn.receiverDesignation || '',
        receivedAt: dn.receivedAt ? dn.receivedAt.split('T')[0] : '',
        receiverPhone: dn.receiverPhone || '',

        notes: dn.notes || '',
        internalNotes: dn.internalNotes || '',
        
        items: dn.items || [],
        status: dn.status || 'DRAFT',
        deliveryNoteNumber: dn.deliveryNoteNumber || ''
      });
      setCustomerInfo(dn.customerSnapshot);
    } catch (error) {
      console.error('Failed to fetch Delivery Note', error);
      alert('Failed to load details');
    }
  };

  const loadOrderDetails = async (orderIdToLoad) => {
    const idToUse = orderIdToLoad || formData.salesOrderId;
    if (!idToUse) return;
    setLoading(true);
    try {
      const res = await axios.post(`/api/v1/delivery-notes/from-order/${idToUse}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = res.data;
      
      setFormData(prev => ({
        ...prev,
        customerId: data.customerId,
        items: data.items,
        deliveryAddress: data.deliveryAddress || ''
      }));
      setCustomerInfo(data.customerSnapshot);
    } catch (error) {
      console.error('Failed to load order', error);
      alert(error.response?.data?.message || 'Failed to load Sales Order details');
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index, value) => {
    const newItems = [...formData.items];
    const item = newItems[index];
    
    const maxAllowed = item.remainingQuantity;
    let qty = Number(value);
    
    // Prevent over-delivery in UI
    if (qty > maxAllowed) qty = maxAllowed;
    if (qty < 0) qty = 0;

    item.deliveryQuantity = qty;
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      if (isEditing) {
        await axios.put(`/api/v1/delivery-notes/${id}`, formData, { headers });
      } else {
        await axios.post('/api/v1/delivery-notes', formData, { headers });
      }
      navigate(location.state?.from || '/sales/delivery-notes');
    } catch (error) {
      console.error('Save failed', error);
      alert(error.response?.data?.message || 'Failed to save Delivery Note');
    } finally {
      setLoading(false);
    }
  };

  const isReadOnly = (isEditing && formData.status && formData.status !== 'DRAFT') || 
                     (isEditing && !hasPermission('EDIT_DELIVERY_NOTE')) || 
                     (!isEditing && !hasPermission('CREATE_DELIVERY_NOTE'));

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(location.state?.from || '/sales/delivery-notes')} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              {isEditing ? `Delivery Note ${formData.deliveryNoteNumber || ''}` : 'New Delivery Note'}
            </h1>
            {isEditing && formData.status && (
              <Badge variant={formData.status === 'DELIVERED' ? 'success' : 'default'}>
                {formData.status}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          {isEditing && hasPermission('PRINT_DELIVERY_NOTE') && (
            <Button type="button" variant="outline" onClick={() => navigate(`/sales/delivery-notes/print/${id}`)} leftIcon={<Printer className="w-4 h-4" />}>
              Print
            </Button>
          )}
          {!isReadOnly && (
            <>
              <Button type="button" variant="outline" onClick={() => navigate(location.state?.from || '/sales/delivery-notes')} leftIcon={<X className="w-4 h-4" />}>
                Cancel
              </Button>
              <Button type="submit" onClick={handleSubmit} isLoading={loading} leftIcon={<Save className="w-4 h-4" />}>
                Save Delivery Note
              </Button>
            </>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset disabled={isReadOnly} className="space-y-6">
          <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" /> Delivery Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {!isEditing && (
              <div className="col-span-full md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Sales Order *</label>
                <div className="flex gap-2 relative" ref={dropdownRef}>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search by ID or Customer..."
                      value={orderSearch}
                      onChange={e => {
                        setOrderSearch(e.target.value);
                        setShowOrderDropdown(true);
                        if (formData.salesOrderId) {
                          setFormData({ ...formData, salesOrderId: '' });
                        }
                      }}
                      onFocus={() => setShowOrderDropdown(true)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    {showOrderDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredOrders.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-slate-500">No orders found.</div>
                        ) : (
                          filteredOrders.map(o => (
                            <div 
                              key={o._id} 
                              className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-slate-700 border-b border-slate-100 last:border-0"
                              onClick={() => {
                                setFormData({ ...formData, salesOrderId: o._id });
                                setOrderSearch(`Order #${o._id.slice(-6).toUpperCase()} - ${o.customerName}`);
                                setShowOrderDropdown(false);
                                loadOrderDetails(o._id);
                              }}
                            >
                              <div className="font-medium text-slate-900">Order #{o._id.slice(-6).toUpperCase()}</div>
                              <div className="text-slate-500 text-xs">{o.customerName} - {currencySymbol}{o.totalAmount?.toFixed(2)}</div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sales Order</label>
                <div className="h-10 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-700">
                  {formData.salesOrderId ? `Order #${formData.salesOrderId.slice(-6).toUpperCase()}` : 'N/A'}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Delivery Date *</label>
              <input
                type="date"
                required
                value={formData.deliveryDate}
                onChange={e => setFormData({ ...formData, deliveryDate: e.target.value })}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Expected Delivery</label>
              <input
                type="date"
                value={formData.expectedDeliveryDate}
                onChange={e => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          {customerInfo && (
            <div className="mt-6 p-4 bg-blue-50/50 border border-blue-100 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Customer Details</span>
                <span className="font-bold text-slate-800">{customerInfo.name}</span>
                <div className="text-sm text-slate-600 mt-1">{customerInfo.email} {customerInfo.phone && `| ${customerInfo.phone}`}</div>
              </div>
              <div>
                <span className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Delivery Address</span>
                <div className="text-sm text-slate-700 whitespace-pre-wrap">{formData.deliveryAddress || 'No address provided'}</div>
              </div>
            </div>
          )}
        </Card>

        {formData.items.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Items to Deliver</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                    <th className="p-3">Product</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3 w-20 text-center">UOM</th>
                    <th className="p-3 w-24 text-center">Ordered</th>
                    <th className="p-3 w-24 text-center">Delivered</th>
                    <th className="p-3 w-24 text-center">Remaining</th>
                    <th className="p-3 w-32 bg-blue-50 text-blue-700 rounded-t-lg">Deliver Now</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formData.items.map((item, index) => (
                    <tr key={index} className={item.remainingQuantity === 0 ? 'bg-slate-50/50 opacity-60' : ''}>
                      <td className="p-3 font-medium text-slate-800">{item.itemName}</td>
                      <td className="p-3 text-slate-600 text-sm">{item.sku}</td>
                      <td className="p-3 text-center text-slate-600 text-sm">{item.uom}</td>
                      <td className="p-3 text-center font-semibold text-slate-700">{item.orderedQuantity}</td>
                      <td className="p-3 text-center text-emerald-600 font-semibold">{item.previouslyDeliveredQuantity}</td>
                      <td className="p-3 text-center text-red-500 font-bold">{item.remainingQuantity}</td>
                      <td className="p-3 bg-blue-50/30">
                        <input
                          type="number"
                          min="0"
                          max={item.remainingQuantity}
                          required
                          disabled={item.remainingQuantity === 0 || isReadOnly}
                          value={item.deliveryQuantity}
                          onChange={e => handleItemChange(index, e.target.value)}
                          className="w-full h-9 px-2 bg-white border border-blue-200 rounded text-sm text-center font-bold focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-2">Transport Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Transporter Name</label>
                <input type="text" value={formData.transporterName} onChange={e => setFormData({ ...formData, transporterName: e.target.value })} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Number</label>
                <input type="text" value={formData.vehicleNumber} onChange={e => setFormData({ ...formData, vehicleNumber: e.target.value })} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Driver Name</label>
                <input type="text" value={formData.driverName} onChange={e => setFormData({ ...formData, driverName: e.target.value })} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Driver Phone</label>
                <input type="text" value={formData.driverPhone} onChange={e => setFormData({ ...formData, driverPhone: e.target.value })} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tracking / LR Number</label>
                <input type="text" value={formData.trackingNumber} onChange={e => setFormData({ ...formData, trackingNumber: e.target.value })} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
            </div>
            
            <div className="pt-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Instructions</label>
              <textarea value={formData.deliveryInstructions} onChange={e => setFormData({ ...formData, deliveryInstructions: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm h-20" />
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-2">Proof of Delivery (POD)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Received By</label>
                <input type="text" value={formData.receivedBy} onChange={e => setFormData({ ...formData, receivedBy: e.target.value })} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Receiver Phone</label>
                <input type="text" value={formData.receiverPhone} onChange={e => setFormData({ ...formData, receiverPhone: e.target.value })} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Designation</label>
                <input type="text" value={formData.receiverDesignation} onChange={e => setFormData({ ...formData, receiverDesignation: e.target.value })} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Received Date</label>
                <input type="date" value={formData.receivedAt} onChange={e => setFormData({ ...formData, receivedAt: e.target.value })} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Internal Notes</label>
              <textarea value={formData.internalNotes} onChange={e => setFormData({ ...formData, internalNotes: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm h-20" />
            </div>
          </Card>
        </div>
        </fieldset>
      </form>
    </div>
  );
};

export default DeliveryNoteForm;

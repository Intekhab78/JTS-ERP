import React, { useState, useEffect } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import axios from 'axios';
import { Globe, Package, MapPin, CreditCard, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/common/EmptyState';

const WebOrders = () => {
  const [orders, setOrders] = useState([]);
  const { formatCurrency, currencySymbol } = useCurrency();
  const [search, setSearch] = useState('');

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get('/api/v1/ecommerce-admin/orders', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setOrders(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.put(`/api/v1/ecommerce-admin/orders/${id}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchOrders();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update status');
    }
  };

  const filteredOrders = orders.filter(order => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return true;

    const formattedWebId = `web-${(order._id || '').slice(-6)}`.toLowerCase();
    const shortWebId = (order._id || '').slice(-6).toLowerCase();
    const rawOrderNo = (order.orderNumber || '').toLowerCase();
    const orderId = (order._id || '').toLowerCase();
    const matchesOrderNumber = formattedWebId.includes(q) || shortWebId.includes(q) || rawOrderNo.includes(q) || orderId.includes(q);

    const matchesCustomerName = (order.customerName || '').toLowerCase().includes(q) ||
      (order.shippingAddressObj?.fullName || '').toLowerCase().includes(q) ||
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

    return matchesOrderNumber || matchesCustomerName || matchesEmail || matchesPhone || matchesItem;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CANCELLED':
        return <Badge variant="danger">CANCELLED</Badge>;
      case 'DELIVERED':
      case 'COMPLETED':
        return <Badge variant="success">{status}</Badge>;
      case 'SHIPPED':
        return <Badge variant="info">SHIPPED</Badge>;
      case 'PENDING':
      default:
        return <Badge variant="warning" className="animate-pulse">{status || 'PENDING'}</Badge>;
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title="Web Orders"
        description="Manage and fulfill orders placed from your external E-Commerce storefront."
        icon={<Globe className="text-blue-600 h-8 w-8" />}
      />

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border flex gap-4 bg-muted/30">
          <div className="flex-1">
            <div className="relative">
              <SearchInput 
                placeholder="Search by order #, customer, email, phone, item..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-bold px-1.5 py-0.5 rounded-full hover:bg-muted"
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          {filteredOrders.map(order => (
            <div key={order._id} className="p-6 hover:bg-muted/30 transition-colors flex flex-col lg:flex-row gap-6 border-b border-border last:border-b-0">
              
              {/* Order Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-black text-blue-600 text-lg">WEB-{order._id.slice(-6).toUpperCase()}</span>
                  {getStatusBadge(order.status)}
                </div>
                <div className="text-sm font-medium text-muted-foreground mb-4">{format(new Date(order.createdAt), 'MMMM d, yyyy h:mm a')}</div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <MapPin size={14} className="text-muted-foreground" />
                    </div>
                    <div>
                      <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Ship To</div>
                      <div className="text-sm font-bold text-foreground">{order.customerName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{order.shippingAddress || 'No address provided'}</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <CreditCard size={14} className="text-muted-foreground" />
                    </div>
                    <div>
                      <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Payment</div>
                      <div className="text-sm font-bold text-foreground">{order.paymentMethod}</div>
                      <div className="text-xs text-emerald-600 mt-0.5 font-bold">{currencySymbol}{order.totalAmount.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="w-full lg:w-48 flex flex-col justify-center gap-2 border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-6">
                <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest text-center mb-1">Update Fulfillment</div>
                {order.status === 'PENDING' && (
                  hasPermission('EDIT_ECOMMERCE') ? (
                    <Button 
                      onClick={() => updateStatus(order._id, 'SHIPPED')} 
                      variant="outline" 
                      className="w-full text-info-foreground border-info/50 hover:bg-info/10"
                      rightIcon={<ChevronRight size={14} />}
                    >
                      Mark Shipped
                    </Button>
                  ) : (
                    <span className="text-xs font-medium text-center text-slate-500">PENDING</span>
                  )
                )}
                {order.status === 'SHIPPED' && (
                  hasPermission('EDIT_ECOMMERCE') ? (
                    <Button 
                      onClick={() => updateStatus(order._id, 'COMPLETED')} 
                      variant="outline" 
                      className="w-full text-success border-success/50 hover:bg-success/10"
                      rightIcon={<ChevronRight size={14} />}
                    >
                      Mark Completed
                    </Button>
                  ) : (
                    <span className="text-xs font-medium text-center text-slate-500">SHIPPED</span>
                  )
                )}
                {order.status === 'CANCELLED' && (
                  <div className="w-full py-2 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-bold rounded-xl text-center border border-rose-200 dark:border-rose-900">
                    Order Cancelled
                  </div>
                )}
                {['COMPLETED', 'DELIVERED'].includes(order.status) && (
                  <div className="w-full py-2 bg-muted text-muted-foreground text-xs font-bold rounded-xl text-center border border-border">
                    Order Closed
                  </div>
                )}
              </div>

            </div>
          ))}
          {filteredOrders.length === 0 && (
            <div className="py-12">
              <EmptyState 
                icon={<Package size={48} className="text-muted-foreground" />}
                title="No web orders found"
                description="There are currently no ecommerce orders matching your search."
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default WebOrders;

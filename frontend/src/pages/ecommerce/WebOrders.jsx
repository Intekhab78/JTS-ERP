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
      alert('Failed to update status');
    }
  };

  const filteredOrders = orders.filter(o => 
    o.customerName?.toLowerCase().includes(search.toLowerCase()) || 
    o._id.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">COMPLETED</Badge>;
      case 'SHIPPED':
        return <Badge variant="info">SHIPPED</Badge>;
      case 'PENDING':
      default:
        return <Badge variant="warning" className="animate-pulse">PENDING</Badge>;
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
            <SearchInput 
              placeholder="Search by customer name or Order ID..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
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
                {order.status === 'COMPLETED' && (
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

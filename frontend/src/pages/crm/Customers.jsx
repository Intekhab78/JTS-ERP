import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Mail, Phone, MapPin } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/common/Modal';
import { FormField } from '../../components/common/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { SearchInput } from '../../components/ui/SearchInput';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/common/EmptyState';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // State removed

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const isGlobalAdmin = !authUser.tenantId || authUser.roleName === 'Global Superadmin';
  const isTenantAdmin = authUser.roleName === 'Tenant Admin';
  
  const hasPermission = (perm) => {
    if (isGlobalAdmin || isTenantAdmin) return true;
    if (userPermissions.includes('*')) return true;
    if (userPermissions.includes(perm)) return true;
    
    // Support legacy MANAGE_* permissions
    const [action, module] = perm.split('_');
    if (action !== 'VIEW' && userPermissions.includes(`MANAGE_${module}`)) return true;
    if (action === 'VIEW' && userPermissions.includes(`VIEW_${module}`)) return true;
    
    // Support legacy CRM vs CUSTOMERS
    if (module === 'CUSTOMERS' && action !== 'VIEW' && userPermissions.includes('MANAGE_CRM')) return true;
    if (module === 'CUSTOMERS' && action === 'VIEW' && userPermissions.includes('VIEW_CRM')) return true;
    
    return false;
  };
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await axios.get('/api/v1/crm/customers', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setCustomers(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };



  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone && c.phone.includes(search))
  );

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title="Customers Directory"
        description="Manage all your active buyers, attach them to sales, and track loyalty."
        icon={<Users className="text-blue-600 h-8 w-8" />}
        actions={
          hasPermission('CREATE_CUSTOMERS') && (
            <Button onClick={() => navigate('/customers/new')} leftIcon={<Plus className="h-4 w-4" />}>
              New Customer
            </Button>
          )
        }
      />

      <Card>
        <div className="p-4 border-b border-border">
          <div className="w-full sm:max-w-md">
            <SearchInput 
              placeholder="Search customers by name, email, or phone..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="p-6 bg-slate-50/50">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground font-medium">Loading customers...</div>
          ) : filteredCustomers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCustomers.map(customer => (
                <Card key={customer._id} onClick={() => navigate(`/customers/edit/${customer._id}`)} className="relative overflow-hidden group hover:border-blue-300 transition-colors cursor-pointer">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-lg line-clamp-1" title={customer.name}>{customer.name}</CardTitle>
                      <Badge variant={
                        customer.customerGroup === 'VIP' ? 'secondary' :
                        customer.customerGroup === 'WHOLESALE' ? 'warning' : 'outline'
                      }>
                        {customer.customerGroup}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3 text-sm font-medium text-muted-foreground pb-4">
                    {customer.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0"/> <span className="truncate" title={customer.email}>{customer.email}</span></div>}
                    {customer.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0"/> {customer.phone}</div>}
                    {(customer.address?.street || customer.address?.city) && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5"/> 
                        <span className="line-clamp-2 leading-tight" title={customer.address?.street}>
                          {[customer.address.street, customer.address.city, customer.address.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="pt-4 border-t border-border flex justify-between items-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Loyalty Points</span>
                    <span className="font-extrabold text-blue-600">{customer.loyaltyPoints}</span>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState 
              title="No customers found." 
              description={search ? "Try adjusting your search terms." : "Add your first customer to get started."} 
            />
          )}
        </div>
      </Card>


    </div>
  );
};

export default Customers;

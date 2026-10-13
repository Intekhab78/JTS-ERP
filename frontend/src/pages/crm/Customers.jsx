import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Mail, Phone, MapPin, Edit, Trash2 } from 'lucide-react';
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
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Delete dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      await axios.delete(`/api/v1/crm/customers/${customerToDelete._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setCustomers(prev => prev.filter(c => c._id !== customerToDelete._id));
      setDeleteConfirmOpen(false);
      setCustomerToDelete(null);
    } catch (error) {
      console.error('Delete customer error:', error);
      alert(error.response?.data?.message || 'Failed to delete customer');
    } finally {
      setIsDeleting(false);
    }
  };



  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone && c.phone.includes(search))
  );

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 max-w-[1720px] mx-auto pb-10 bg-[#f8fafc] min-h-screen">
      
      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl mt-4 sm:mx-4 lg:mx-8">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                <Users size={18} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">Customers Directory</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl">
              CLIENT DATABASE • SALES ACCOUNTS & CRM
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-3 bg-[#111827] border border-slate-800 p-2 rounded-lg shadow-inner">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">System Online</span>
            </div>
            {hasPermission('CREATE_CUSTOMERS') && (
              <button 
                onClick={() => navigate('/customers/new')}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-bold text-sm tracking-wider uppercase transition-colors shadow-lg border border-blue-400 flex items-center gap-2"
              >
                <Plus size={16} strokeWidth={3} /> New Customer
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:max-w-2xl">
            <div className="relative w-full sm:flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Filter Database</label>
              <SearchInput 
                placeholder="SCAN BY NAME, EMAIL, OR PHONE..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-10 rounded-md border-2 border-slate-200 bg-slate-50 shadow-sm font-mono text-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-0 transition-colors uppercase w-full"
              />
            </div>
          </div>
        </div>

        <div className="p-2 sm:p-0">
          {loading ? (
            <div className="text-center py-12 text-slate-500 font-mono text-sm uppercase tracking-widest">Loading database...</div>
          ) : filteredCustomers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCustomers.map(customer => (
                <div key={customer._id} className="bg-white rounded-xl shadow-sm hover:shadow-lg border border-slate-200 hover:border-slate-300 transition-all overflow-hidden flex flex-col relative group cursor-pointer" onClick={() => navigate(`/customers/edit/${customer._id}`)}>
                  {customer.customerType === 'B2B' && (
                    <div className="absolute top-0 right-0">
                      <div className="bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-bl-lg shadow-sm">
                        B2B CORPORATE
                      </div>
                    </div>
                  )}
                  {customer.customerType !== 'B2B' && (
                    <div className="absolute top-0 right-0">
                      <div className="bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-bl-lg shadow-sm">
                        B2C RETAIL
                      </div>
                    </div>
                  )}
                  
                  <div className="p-5 flex-1 mt-2">
                    <div className="flex items-center gap-3.5 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center shrink-0 shadow-sm text-slate-700 font-black text-lg">
                        {(customer.name || customer.companyName || 'C')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-lg leading-tight truncate">{customer.name || customer.companyName}</h3>
                        <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">{customer.customerGroup || 'Standard'}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mt-5">
                      {customer.email && (
                        <div className="flex items-center gap-2.5 text-slate-600 text-sm group-hover:text-slate-900 transition-colors">
                          <Mail size={16} className="text-slate-400 shrink-0" />
                          <span className="truncate font-medium">{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-2.5 text-slate-600 text-sm group-hover:text-slate-900 transition-colors">
                          <Phone size={16} className="text-slate-400 shrink-0" />
                          <span className="truncate font-mono">{customer.phone}</span>
                        </div>
                      )}
                      {(customer.address?.street || customer.address?.city) && (
                        <div className="flex items-center gap-2.5 text-slate-600 text-sm group-hover:text-slate-900 transition-colors">
                          <MapPin size={16} className="text-slate-400 shrink-0" />
                          <span className="truncate font-medium">
                            {[customer.address?.street, customer.address?.city, customer.address?.country].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 flex justify-between items-center group-hover:bg-blue-50/40 transition-colors">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Loyalty Points</span>
                      <span className="font-black text-blue-600 text-base">{customer.loyaltyPoints || 0}</span>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {hasPermission('EDIT_CUSTOMERS') && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customers/edit/${customer._id}`);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-600 text-slate-700 hover:text-white border border-slate-200 hover:border-blue-600 rounded-lg text-xs font-bold transition-all shadow-sm"
                          title="Edit Customer"
                        >
                          <Edit size={13} />
                          <span>Edit</span>
                        </button>
                      )}
                      {hasPermission('DELETE_CUSTOMERS') && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCustomerToDelete(customer);
                            setDeleteConfirmOpen(true);
                          }}
                          className="flex items-center justify-center p-1.5 bg-white hover:bg-rose-600 text-slate-400 hover:text-white border border-slate-200 hover:border-rose-600 rounded-lg text-xs font-bold transition-all shadow-sm"
                          title="Delete Customer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                <Users size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No customers found</h3>
              <p className="text-slate-500 mb-6 max-w-sm">We couldn't find any customers matching your search criteria. Try adjusting your filters.</p>
              {hasPermission('CREATE_CUSTOMERS') && (
                <button 
                  onClick={() => navigate('/customers/new')}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-bold text-sm tracking-wider uppercase transition-colors shadow-sm"
                >
                  <Plus size={16} className="mr-2 inline" /> Add First Customer
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setCustomerToDelete(null); }}
        onConfirm={handleDeleteCustomer}
        title={`Delete "${customerToDelete?.name || customerToDelete?.companyName || 'Customer'}"?`}
        description="Are you sure you want to permanently delete this customer? All CRM profile details for this client will be removed."
        confirmText="Delete Customer"
        isLoading={isDeleting}
        isDanger={true}
      />
    </div>
  );
};

export default Customers;

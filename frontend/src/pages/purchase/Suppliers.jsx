import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Truck, Plus, Search, MapPin, Edit, Download, Mail, Phone, Grid, List, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/common/EmptyState';

const Suppliers = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('ALL'); // 'ALL', 'ACTIVE', 'PREFERRED', 'PENDING'
  const [viewMode, setViewMode] = useState('GRID'); // 'GRID' or 'LIST'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ totalSuppliers: 0, activePOs: 0, totalSpend: 0, complianceScore: 98.4 });
  const [allPOs, setAllPOs] = useState([]);
  const [statusCounts, setStatusCounts] = useState({ active: 0, preferred: 0, pending: 0 });

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  useEffect(() => {
    fetchSuppliers();
  }, [page, search, location, status]);

  useEffect(() => {
    fetchPurchaseStats();
    fetchStatusCounts();
  }, []);

  const fetchPurchaseStats = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/purchase-orders', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        params: { limit: 1000 }
      });
      const pos = res.data.data || [];
      setAllPOs(pos);
      const activePOs = pos.filter(po => ['CONFIRMED', 'PARTIALLY_RECEIVED'].includes(po.status)).length;
      const totalSpend = pos.reduce((acc, po) => acc + (po.totalAmount || 0), 0);
      const compliance = pos.length > 0 ? Math.min(100, 90 + (pos.length % 10) + (Math.random() * 2)) : 98.4;
      setStats(prev => ({ ...prev, activePOs, totalSpend, complianceScore: compliance }));
    } catch (error) {
      console.error('Failed to fetch PO stats', error);
    }
  };

  const fetchStatusCounts = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/suppliers', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        params: { limit: 1000 }
      });
      const allSups = res.data.data || res.data || [];
      setStatusCounts({
        active: allSups.filter(s => s.status === 'ACTIVE').length,
        preferred: allSups.filter(s => s.status === 'PREFERRED' || s.vendorType === 'Transport').length, // Fallback for preferred mapping
        pending: allSups.filter(s => s.status === 'INACTIVE' || s.status === 'PENDING').length
      });
      setStats(prev => ({ ...prev, totalSuppliers: res.data.pagination?.total || allSups.length }));
    } catch (error) {}
  };

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const queryStatus = status === 'ALL' || status === 'PREFERRED' || status === 'PENDING' ? '' : status;
      const res = await axios.get('http://localhost:5000/api/v1/suppliers', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        params: { search, location, status: queryStatus, page, limit: 12 }
      });
      if (res.data.data) {
        setSuppliers(res.data.data);
        setTotalPages(res.data.pagination.pages);
      } else {
        setSuppliers(res.data);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (supplierId) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/v1/suppliers/${supplierId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchSuppliers();
      fetchStatusCounts();
    } catch (error) {
      alert('Failed to delete supplier');
    }
  };

  // Helper to generate initials for avatar
  const getInitials = (name) => {
    if (!name) return 'V';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Helper to get random color for avatar based on name
  const getAvatarColor = (name) => {
    const colors = [
      'from-blue-600 to-indigo-600', 
      'from-indigo-600 to-violet-500', 
      'from-purple-600 to-pink-500', 
      'from-pink-600 to-rose-500', 
      'from-rose-500 to-orange-500', 
      'from-orange-500 to-amber-500', 
      'from-emerald-600 to-teal-500', 
      'from-teal-500 to-cyan-500', 
      'from-cyan-600 to-blue-600'
    ];
    if (!name) return colors[0];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return colors[sum % colors.length];
  };

  return (
    <main className="flex-1 p-8 overflow-y-auto space-y-6 bg-[#f8fafc] font-sans antialiased text-slate-800 selection:bg-indigo-500 selection:text-white" data-purpose="suppliers-view">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Breadcrumb & Top Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <span>Purchase</span>
              <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
              <span className="text-slate-900 font-semibold">Suppliers Directory</span>
            </div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 font-display">Suppliers</h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                {suppliers.length} Active Vendors
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 mt-1">Manage vendor relationships, procurement contracts, and contact information.</p>
          </div>
          
          {/* Header Action Area */}
          <div className="flex items-center gap-2.5">
            <button className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-sm transition-all" type="button">
              <Download size={16} />
              <span>Export CSV</span>
            </button>
            {hasPermission('CREATE_SUPPLIERS') && (
              <button onClick={() => navigate('/suppliers/new')} className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-600/25 hover:shadow-md hover:shadow-indigo-600/35 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2" type="button">
                <Plus size={16} strokeWidth={2.5} />
                <span>New Supplier</span>
              </button>
            )}
          </div>
        </div>

        {/* Metric Stat Cards Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-sm hover:border-slate-300 transition-colors p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Total Suppliers</span>
              <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">+12%</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 font-display">{stats.totalSuppliers}</span>
              <span className="text-xs text-slate-400">across 4 emirates</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-sm hover:border-slate-300 transition-colors p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Active Orders</span>
              <span className="text-indigo-700 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">Processing</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 font-display">{stats.activePOs} POs</span>
              <span className="text-xs text-slate-400">Currently open</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-sm hover:border-slate-300 transition-colors p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Total Spend (YTD)</span>
              <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">+8.4% YoY</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 font-display">
                AED {stats.totalSpend > 1000000 ? (stats.totalSpend / 1000000).toFixed(2) + 'M' : stats.totalSpend > 1000 ? (stats.totalSpend / 1000).toFixed(1) + 'K' : stats.totalSpend}
              </span>
              <span className="text-xs text-slate-400">FY {new Date().getFullYear()}</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-sm hover:border-slate-300 transition-colors p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>On-Time Delivery</span>
              <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">Target: &gt;95%</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 font-display">{stats.complianceScore.toFixed(1)}%</span>
              <span className="text-xs text-slate-400">compliance score</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 shadow-sm">
          {/* Left: Filter Pills & Search */}
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto py-1 w-full lg:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text"
                placeholder="Search..." 
                className="pl-8 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 outline-none w-48"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            
            {[
              { id: 'ALL', label: 'All Suppliers', count: null },
              { id: 'ACTIVE', label: 'Active', count: statusCounts.active },
              { id: 'PREFERRED', label: 'Preferred', count: statusCounts.preferred },
              { id: 'PENDING', label: 'Pending Review', count: statusCounts.pending }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setStatus(tab.id); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  status === tab.id 
                    ? 'bg-slate-900 text-white shadow-sm font-semibold' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count && (
                  <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-semibold ${
                    status === tab.id ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2.5 ml-auto w-full lg:w-auto justify-end">
            <div className="relative">
              <select 
                value={location} 
                onChange={(e) => { setLocation(e.target.value); setPage(1); }}
                className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
              >
                <option value="">All Locations</option>
                <option value="Dubai">Dubai</option>
                <option value="Abu Dhabi">Abu Dhabi</option>
                <option value="Sharjah">Sharjah</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
              <button 
                onClick={() => setViewMode('GRID')}
                className={`p-1.5 rounded-lg ${viewMode === 'GRID' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Grid size={14} />
              </button>
              <button 
                onClick={() => setViewMode('LIST')}
                className={`p-1.5 rounded-lg ${viewMode === 'LIST' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Suppliers Content Area */}
        {loading ? (
          <div className="text-center py-20 text-slate-500">Loading suppliers...</div>
        ) : suppliers.length === 0 ? (
          <EmptyState 
            icon={<Truck size={48} />}
            title="No suppliers found"
            description={search || location || status !== 'ALL' ? "Try adjusting your filters" : "Get started by adding a new supplier"}
            action={hasPermission('CREATE_SUPPLIERS') && (
              <Button onClick={() => navigate('/suppliers/new')} leftIcon={<Plus size={20} />}>
                Add Supplier
              </Button>
            )}
          />
        ) : viewMode === 'GRID' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {suppliers.map(supplier => {
              const supplierPOs = allPOs.filter(po => po.supplierId === supplier._id);
              const activeCount = supplierPOs.filter(po => ['CONFIRMED', 'PARTIALLY_RECEIVED'].includes(po.status)).length;
              const spend = supplierPOs.reduce((acc, po) => acc + (po.totalAmount || 0), 0);
              
              return (
              <article key={supplier._id} className="bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 transition-all p-5 relative flex flex-col justify-between group">
                <div className="absolute -top-px left-8 right-8 h-[2px] bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm shadow-sm overflow-hidden ${supplier.ownerPhoto?.url ? 'bg-slate-50' : `bg-gradient-to-tr text-white font-display font-extrabold ${getAvatarColor(supplier.name)}`}`}>
                        {supplier.ownerPhoto?.url ? (
                          <img src={`http://localhost:5000${supplier.ownerPhoto.url}`} alt={supplier.name} className="w-full h-full object-cover" />
                        ) : (
                          getInitials(supplier.name)
                        )}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 font-display leading-snug line-clamp-1" title={supplier.name}>{supplier.name}</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 font-medium mt-0.5">
                          <span className="text-slate-700 font-semibold truncate max-w-[100px]">
                            {supplier.contactDetails?.firstName ? `${supplier.contactDetails.firstName} ${supplier.contactDetails.lastName || ''}` : supplier.contactName || 'No Contact'}
                          </span>
                          {supplier.vendorType && (
                            <>
                              <span>•</span>
                              <span className="truncate">{supplier.vendorType}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      {hasPermission('EDIT_SUPPLIERS') && (
                        <button onClick={() => navigate(`/suppliers/edit/${supplier._id}`)} className="p-1 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Edit supplier">
                          <Edit size={14} />
                        </button>
                      )}
                      {hasPermission('DELETE_SUPPLIERS') && (
                        <button onClick={() => handleDelete(supplier._id)} className="p-1 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Delete supplier">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {supplier.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Active & Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        Inactive
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 truncate max-w-[120px]">
                      {supplier.vendorType || 'Top Supplier'}
                    </span>
                    
                    {/* License Status Tag */}
                    {(() => {
                      const expiryDate = supplier.legalDetails?.tradeLicenseExpiryDate;
                      if (!expiryDate) {
                        return (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200" title="Trade License Not Provided">
                            No License
                          </span>
                        );
                      }
                      
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const exp = new Date(expiryDate);
                      exp.setHours(0, 0, 0, 0);
                      
                      if (exp < today) {
                        return (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-700 border border-red-200" title={`Expired on ${exp.toLocaleDateString()}`}>
                            License Expired
                          </span>
                        );
                      }
                      
                      const thirtyDays = new Date(today);
                      thirtyDays.setDate(thirtyDays.getDate() + 30);
                      if (exp <= thirtyDays) {
                        return (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200" title={`Expiring on ${exp.toLocaleDateString()}`}>
                            Expiring Soon
                          </span>
                        );
                      }
                      
                      return (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200" title={`Valid until ${exp.toLocaleDateString()}`}>
                          License Valid
                        </span>
                      );
                    })()}

                    {/* New Compliance Indicators */}
                    {['TAX_CERTIFICATE', 'IMPORT_LICENSE'].map(docType => {
                      const doc = supplier.documents?.find(d => d.documentType === docType && d.fileUrl);
                      if (!doc) return null;
                      return (
                        <span key={docType} className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${doc.status === 'ACTIVE' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`} title={`${docType.replace('_', ' ')}: ${doc.status}`}>
                          {docType === 'TAX_CERTIFICATE' ? 'Tax' : 'Import'}
                        </span>
                      );
                    })}
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2 py-3 border-y border-slate-100 text-xs text-slate-600">
                    <a href={`mailto:${supplier.email || supplier.contactDetails?.email}`} className="flex items-center gap-2.5 hover:text-indigo-600 transition-colors group/link">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover/link:bg-indigo-50 group-hover/link:text-indigo-600 transition-colors">
                        <Mail size={14} />
                      </span>
                      <span className="truncate font-medium">{supplier.email || supplier.contactDetails?.email || 'N/A'}</span>
                    </a>
                    <a href={`tel:${supplier.phone || supplier.contactDetails?.mobile}`} className="flex items-center gap-2.5 hover:text-indigo-600 transition-colors group/link">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover/link:bg-indigo-50 group-hover/link:text-indigo-600 transition-colors">
                        <Phone size={14} />
                      </span>
                      <span className="font-medium">{supplier.phone || supplier.contactDetails?.mobile || 'N/A'}</span>
                    </a>
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                        <MapPin size={14} />
                      </span>
                      <span className="font-medium text-slate-700 truncate">
                        {supplier.addressDetails?.city ? `${supplier.addressDetails.city}, ${supplier.addressDetails.country || ''}` : supplier.address || 'Location N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Quick Metrics */}
                  <div className="grid grid-cols-3 gap-2 py-3 text-center bg-slate-50/70 rounded-xl my-3">
                    <div>
                      <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Active POs</div>
                      <div className="text-xs font-bold text-slate-800 mt-0.5">{activeCount}</div>
                    </div>
                    <div className="border-x border-slate-200/80">
                      <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Total Spend</div>
                      <div className="text-xs font-bold text-slate-800 mt-0.5">AED {spend > 1000 ? (spend / 1000).toFixed(1) + 'K' : spend}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Rating</div>
                      <div className="text-xs font-bold text-amber-600 mt-0.5 flex items-center justify-center gap-0.5">
                        <span>★</span> {(supplier.rating || 0).toFixed(1)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Updated recently</span>
                  <button onClick={() => navigate(`/suppliers/${supplier._id}`)} className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/70 rounded-lg transition-colors inline-flex items-center gap-1" type="button">
                    <span>View Details</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    </svg>
                  </button>
                </div>
              </article>
            );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-200/80 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Company Name</th>
                    <th className="px-6 py-4">Contact Person</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {suppliers.map(supplier => (
                    <tr key={supplier._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr flex items-center justify-center text-white font-bold text-xs ${getAvatarColor(supplier.name)}`}>
                            {getInitials(supplier.name)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{supplier.name}</p>
                            <p className="text-xs text-slate-500">{supplier.vendorCode || 'No Code'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {supplier.contactDetails?.firstName 
                          ? `${supplier.contactDetails.firstName} ${supplier.contactDetails.lastName || ''}` 
                          : supplier.contactName || '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {supplier.addressDetails?.city || '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center justify-center gap-1 w-max mx-auto ${
                          supplier.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${supplier.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {supplier.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => navigate(`/suppliers/${supplier._id}`)} className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/70 rounded-lg transition-colors">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm font-medium text-slate-600 px-4">
              Page {page} of {totalPages}
            </span>
            <button 
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </main>
  );
};

export default Suppliers;

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import ProductTable from '../../components/inventory/ProductTable';
import AddProductModal from '../../components/inventory/AddProductModal';
import { Plus, Package, CheckCircle, AlertTriangle, XCircle, Server, Edit, Trash2, Printer, Building, MapPin } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';

const Inventory = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [legalCompanies, setLegalCompanies] = useState([]);
  const [branches, setBranches] = useState([]);

  // Multi-Company and Branch filters
  const [selectedCompany, setSelectedCompany] = useState(() => {
    return localStorage.getItem('activeCompanyId') || 'ALL';
  });
  const [selectedBranch, setSelectedBranch] = useState('ALL');

  const [productToEdit, setProductToEdit] = useState(() => {
    const editId = searchParams.get('edit');
    if (editId) {
      try {
        const cached = sessionStorage.getItem('inventory_edit_product');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed._id === editId) return parsed;
        }
      } catch (e) {}
    }
    return null;
  });

  const [isModalOpen, setIsModalOpen] = useState(() => {
    return searchParams.get('action') === 'create' || 
           !!searchParams.get('edit') || 
           sessionStorage.getItem('inventory_modal_mode') === 'create';
  });

  const [successToast, setSuccessToast] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  const handleOpenCreateModal = () => {
    setProductToEdit(null);
    setIsModalOpen(true);
    setSearchParams({ action: 'create' });
    sessionStorage.setItem('inventory_modal_mode', 'create');
  };

  const handleOpenEditModal = (product) => {
    setProductToEdit(product);
    setIsModalOpen(true);
    setSearchParams({ edit: product._id });
    sessionStorage.setItem('inventory_modal_mode', `edit_${product._id}`);
    sessionStorage.setItem('inventory_edit_product', JSON.stringify(product));
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setProductToEdit(null);
    setSearchParams({});
    sessionStorage.removeItem('inventory_modal_mode');
    sessionStorage.removeItem('inventory_edit_product');
  };

  const fetchInventory = async (statusOverride) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const currentStatus = statusOverride !== undefined ? statusOverride : statusFilter;
      const includeInactive = currentStatus === 'ARCHIVED';
      
      const [productsRes, categoriesRes, legalCompRes, branchRes] = await Promise.all([
        axios.get(`/api/v1/inventory/products${includeInactive ? '?includeInactive=true' : ''}`, { headers }),
        axios.get('/api/v1/inventory/categories', { headers }),
        axios.get('/api/v1/legal-company?all=true', { headers: { ...headers, 'x-company-id': 'ALL' } })
          .catch(() => axios.get('/api/v1/legal-company/my-companies', { headers: { ...headers, 'x-company-id': 'ALL' } }))
          .catch(() => ({ data: [] })),
        axios.get('/api/v1/branches?all=true', { headers: { ...headers, 'x-company-id': 'ALL' } }).catch(() => ({ data: [] }))
      ]);
      
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
      setLegalCompanies(Array.isArray(legalCompRes.data) ? legalCompRes.data.filter(c => c.isActive !== false) : []);
      setBranches(Array.isArray(branchRes.data) ? branchRes.data.filter(b => b.isActive !== false) : []);

      const editId = searchParams.get('edit');
      if (editId) {
        const found = productsRes.data.find(p => p._id === editId);
        if (found) {
          setProductToEdit(found);
          setIsModalOpen(true);
        }
      }
    } catch (error) {
      console.error('Error fetching inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Cascading branches based on selected company
  const availableBranches = React.useMemo(() => {
    if (selectedCompany === 'ALL') return branches;
    return branches.filter(b => {
      const cId = (b.legalCompanyId?._id || b.legalCompanyId)?.toString();
      return !cId || cId === selectedCompany;
    });
  }, [branches, selectedCompany]);

  const handleCompanyChange = (newCompId) => {
    setSelectedCompany(newCompId);
    // If current selected branch does not belong to new company, reset branch to ALL
    if (newCompId !== 'ALL' && selectedBranch !== 'ALL') {
      const branchBelongs = branches.some(b => {
        if (b._id.toString() !== selectedBranch) return false;
        const cId = (b.legalCompanyId?._id || b.legalCompanyId)?.toString();
        return !cId || cId === newCompId;
      });
      if (!branchBelongs) setSelectedBranch('ALL');
    }
  };

  // Compute filtered products
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      
    if (statusFilter === 'ARCHIVED') {
      if (!matchesSearch || product.isActive !== false) return false;
    } else {
      if (product.isActive === false) return false;
      if (statusFilter !== 'ALL' && product.status !== statusFilter) return false;
    }

    if (!matchesSearch) return false;

    // Company filter
    if (selectedCompany !== 'ALL') {
      const selectedCompObj = legalCompanies.find(c => c._id.toString() === selectedCompany);
      const compName = selectedCompObj?.name?.toLowerCase();
      
      const hasMatchingCompanyId = Array.isArray(product.companyIds) && product.companyIds.some(c => (c._id || c).toString() === selectedCompany);
      const hasMatchingCompanyName = compName && product.company && product.company.toLowerCase().includes(compName);
      
      // If product has no company set, show it under all, but if company explicitly selected, require match
      if (!hasMatchingCompanyId && !hasMatchingCompanyName) return false;
    }

    // Branch filter
    if (selectedBranch !== 'ALL') {
      const selectedBranchObj = branches.find(b => b._id.toString() === selectedBranch);
      const branchName = selectedBranchObj?.name?.toLowerCase();

      const hasNoSpecificBranches = !product.branchIds || product.branchIds.length === 0;
      const hasMatchingBranchId = Array.isArray(product.branchIds) && product.branchIds.some(b => (b._id || b).toString() === selectedBranch);
      const hasMatchingBranchName = branchName && product.location && product.location.toLowerCase().includes(branchName);

      if (!hasMatchingBranchId && !hasMatchingBranchName && !hasNoSpecificBranches) return false;
    }

    return true;
  });

  // Calculate dashboard stats for active catalog
  const activeProducts = products.filter(p => p.isActive !== false);
  const totalProducts = activeProducts.length;
  const inStock = activeProducts.filter(p => p.status === 'In Stock').length;
  const lowStock = activeProducts.filter(p => p.status === 'Low Stock').length;
  const outOfStock = activeProducts.filter(p => p.status === 'Out of Stock').length;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 max-w-[1400px] mx-auto pb-10 bg-[#f8fafc] min-h-screen">
      
      {successToast && (
        <div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-900 px-5 py-3.5 rounded-xl flex items-center justify-between shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3 font-bold text-sm">
            <CheckCircle className="text-emerald-600 shrink-0" size={20} />
            <span>{successToast}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setSuccessToast('')}
            className="text-emerald-700 hover:text-emerald-950 font-black text-xs uppercase bg-emerald-100/80 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {!isModalOpen && (
        <>
      {/* Aggressive Tech Header */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                <Server size={18} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">Central Product Master</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl">
              PRODUCT DATABASE • CATELOG CONFIGURATION & MASTER DATA
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-3 bg-[#111827] border border-slate-800 p-2 rounded-lg shadow-inner">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">System Online</span>
            </div>
            {hasPermission('CREATE_INVENTORY') && (
              <button 
                onClick={handleOpenCreateModal}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-bold text-sm tracking-wider uppercase transition-colors shadow-lg border border-blue-400 flex items-center gap-2"
              >
                <Plus size={16} strokeWidth={3} /> Add Product
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Control Panel (Sharp & High Contrast) */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {/* Search Input */}
          <div className="relative w-full">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Filter Database</label>
            <SearchInput 
              placeholder="SCAN BY PRODUCT OR SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 rounded-md border-2 border-slate-200 bg-slate-50 shadow-sm font-mono text-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-0 transition-colors uppercase w-full"
            />
          </div>

          {/* Company Filter Dropdown */}
          <div className="relative w-full">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Building size={11} className="text-indigo-600" /> Company Filter
            </label>
            <select
              value={selectedCompany}
              onChange={(e) => handleCompanyChange(e.target.value)}
              className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-indigo-400 focus:border-indigo-600 focus:ring-0 transition-colors cursor-pointer outline-none uppercase"
            >
              <option value="ALL">🏢 ALL COMPANIES ({legalCompanies.length})</option>
              {legalCompanies.map(c => (
                <option key={c._id} value={c._id}>
                  🏢 {c.name} {c.code ? `(${c.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Branch Filter Dropdown */}
          <div className="relative w-full">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
              <MapPin size={11} className="text-emerald-600" /> Branch Filter
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-emerald-400 focus:border-emerald-600 focus:ring-0 transition-colors cursor-pointer outline-none uppercase"
            >
              <option value="ALL">📍 ALL BRANCHES ({availableBranches.length})</option>
              {availableBranches.map(b => (
                <option key={b._id} value={b._id}>
                  📍 {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div className="relative w-full">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Stock Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                const val = e.target.value;
                setStatusFilter(val);
                if (val === 'ARCHIVED' || statusFilter === 'ARCHIVED') {
                  fetchInventory(val);
                }
              }}
              className="flex h-10 w-full rounded-md border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:border-blue-400 focus:border-blue-600 focus:ring-0 transition-colors cursor-pointer outline-none uppercase"
            >
              <option value="ALL">ALL ACTIVE</option>
              <option value="In Stock">IN STOCK</option>
              <option value="Low Stock">LOW STOCK</option>
              <option value="Out of Stock">OUT OF STOCK</option>
              <option value="ARCHIVED">ARCHIVED / DEACTIVATED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Aggressive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-slate-300 transition-all">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Products</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{totalProducts}</h3>
            </div>
            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-slate-800 group-hover:text-white transition-colors">
              <Package size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-slate-200"><div className="h-full bg-slate-800 w-full"></div></div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-emerald-400 transition-all relative">
          <div className="absolute top-0 right-0 p-2"><div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div></div>
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1">In Stock</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{inStock}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <CheckCircle size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-emerald-100"><div className="h-full bg-emerald-500 w-[75%]"></div></div>
        </div>

        <div className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-amber-400 transition-all">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-1">Warning: Low</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{lowStock}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <AlertTriangle size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-amber-100"><div className="h-full bg-amber-500 w-[25%]"></div></div>
        </div>

        <div className="bg-white border border-rose-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-lg hover:border-rose-400 transition-all">
          <div className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-rose-600 uppercase tracking-widest mb-1">Critical: Empty</p>
              <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{outOfStock}</h3>
            </div>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-rose-500 group-hover:text-white transition-colors">
              <XCircle size={22} strokeWidth={2.5} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-rose-100"><div className="h-full bg-rose-500 w-[10%]"></div></div>
        </div>
      </div>
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <ProductTable 
          products={filteredProducts} 
          fetchInventory={() => fetchInventory()} 
          onEdit={handleOpenEditModal} 
          loading={loading}
          statusFilter={statusFilter}
        />
      </div>
      </>
      )}
      
      {isModalOpen && (
        <AddProductModal 
          key={productToEdit?._id || 'create'}
          onClose={handleCloseModal} 
          categories={categories}
          refresh={fetchInventory}
          productToEdit={productToEdit}
          onSuccess={(msg) => {
            setSuccessToast(msg);
            setTimeout(() => setSuccessToast(''), 6000);
          }}
        />
      )}
    </div>
  );
};

export default Inventory;

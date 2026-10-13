import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Loader2, X, Zap, Tag, Banknote, Gift, Package, Calendar, Ticket, Wallet, MapPin } from 'lucide-react';
import Select from 'react-select';
import { Button } from '../../components/ui/Button';

const PROMOTION_TYPES = [
  { id: 'FLASH_SALE', label: 'Flash Sale', icon: Zap },
  { id: 'PERCENTAGE', label: 'Percentage Discount', icon: Tag },
  { id: 'FIXED', label: 'Cash Discount', icon: Banknote },
  { id: 'BUY_X_GET_Y', label: 'BOGO (Buy 1 Get 1)', icon: Gift },
  { id: 'BULK_PURCHASE', label: 'Bulk Purchase', icon: Package },
  { id: 'LIFESTYLE', label: 'Lifestyle Discount', icon: Calendar },
  { id: 'TIERED_DISCOUNT', label: 'Ticket Level (Tiered)', icon: Ticket },
  { id: 'CASH_DEPOSIT', label: 'Cash Deposit Voucher', icon: Wallet }
];

const DiscountForm = ({ isDrawer, onClose }) => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
    discountType: 'PERCENTAGE',
    value: 0,
    buyXQuantity: 1,
    getYQuantity: 1,
    getYDiscountType: 'FREE',
    getYDiscountValue: 100,
    buyXGetYMode: 'SAME_PRODUCT',
    tiers: [],
    applyTo: 'ORDER', // 'ORDER', 'CATEGORY', 'PRODUCT', 'MULTIPLE_PRODUCTS'
    applicableDepartments: [],
    applicableFamilies: [],
    applicableSubFamilies: [],
    applicableCategories: [],
    applicableProducts: [],
    excludedProducts: [],
    minOrderAmount: 0,
    isAutomatic: true,
    code: '',
    customerMode: 'ALL',
    branchMode: 'ALL',
    branches: [],
    usageLimitMode: 'UNLIMITED',
    usageLimit: 0,
    priority: 0,
    stackable: false,
    startDate: '',
    endDate: ''
  });

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [families, setFamilies] = useState([]);
  const [subFamilies, setSubFamilies] = useState([]);
  const [branches, setBranches] = useState([]);

  const selectedCompany = localStorage.getItem('active_company_id') || 'ALL';

  useEffect(() => {
    fetchOptions();
    if (isEdit) fetchDiscount();
  }, [id]);

  useEffect(() => {
    const fetchFilteredProducts = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
        let url = '/api/v1/inventory/products';
        if (formData.branchMode === 'SELECTED' && formData.branches.length > 0) {
          url += `?branchId=${formData.branches.join(',')}&inStockOnly=true`;
        }
        const res = await axios.get(url, config);
        setProducts(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchFilteredProducts();
  }, [formData.branches, formData.branchMode]);

  const fetchOptions = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      const [catRes, branchRes, deptRes, famRes, subFamRes] = await Promise.all([
        axios.get('/api/v1/inventory/categories', config),
        axios.get('/api/v1/branches', config),
        axios.get('/api/v1/hierarchy/departments', config),
        axios.get('/api/v1/hierarchy/families', config),
        axios.get('/api/v1/hierarchy/subfamilies', config)
      ]);
      setCategories(catRes.data || []);
      setBranches(branchRes.data || []);
      setDepartments(deptRes.data || []);
      setFamilies(famRes.data || []);
      setSubFamilies(subFamRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDiscount = async () => {
    try {
      const res = await axios.get(`/api/v1/discounts/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const d = res.data;
      setFormData({
        ...d,
        startDate: d.startDate ? new Date(d.startDate).toISOString().split('T')[0] : '',
        endDate: d.endDate ? new Date(d.endDate).toISOString().split('T')[0] : '',
        applyTo: d.applyTo || 'ORDER',
        applicableProducts: d.applicableProducts?.map(p => typeof p === 'object' ? p._id : p) || [],
        applicableCategories: d.applicableCategories?.map(c => typeof c === 'object' ? c._id : c) || [],
        applicableDepartments: d.applicableDepartments?.map(c => typeof c === 'object' ? c._id : c) || [],
        applicableFamilies: d.applicableFamilies?.map(c => typeof c === 'object' ? c._id : c) || [],
        applicableSubFamilies: d.applicableSubFamilies?.map(c => typeof c === 'object' ? c._id : c) || [],
        branchMode: (d.branches?.length > 0) ? 'SELECTED' : 'ALL',
        branches: d.branches?.map(x => typeof x === 'object' ? x._id : x) || [],
      });
    } catch (err) {
      alert('Failed to load discount');
      onClose ? onClose() : navigate('/sales/discounts');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
    }));
  };

  const handleMultiSelectChange = (selectedOptions, field) => {
    const values = selectedOptions ? selectedOptions.map(o => o.value) : [];
    setFormData(prev => ({ ...prev, [field]: values }));
    if (field === 'branches') {
       if (values.length > 0) {
           setFormData(prev => ({ ...prev, branchMode: 'SELECTED' }));
       } else {
           setFormData(prev => ({ ...prev, branchMode: 'ALL' }));
       }
    }
  };

  const setApplyToAndToggle = (applyToMode, field, selectedOptions) => {
    const values = selectedOptions ? selectedOptions.map(o => o.value) : [];
    setFormData(prev => ({ 
      ...prev, 
      applyTo: applyToMode, 
      applicableDepartments: [], 
      applicableCategories: [], 
      applicableFamilies: [], 
      applicableSubFamilies: [], 
      applicableProducts: [], 
      [field]: values 
    }));
  };

  const mapToSelectOptions = (arr) => arr.map(item => ({ value: item._id, label: item.name }));
  const getSelectValues = (ids, arr) => {
    if (!ids) return [];
    return ids.map(id => {
      const found = arr.find(item => item._id === id);
      return found ? { value: found._id, label: found.name } : { value: id, label: 'Unknown' };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return alert('Campaign Name is required');
    
    setLoading(true);
    try {
      const payload = { ...formData };
      if (!payload.startDate) delete payload.startDate;
      if (!payload.endDate) delete payload.endDate;
      if (!payload.code) {
        payload.code = payload.name.replace(/\s+/g, '_').toUpperCase() + '_' + Date.now().toString().slice(-4);
      }
      
      if (payload.branchMode === 'ALL' || payload.branches.length === 0) {
        payload.branches = [];
        payload.branchMode = 'ALL';
      }

      if (payload.applyTo === 'ORDER') {
        payload.applicableDepartments = []; payload.applicableFamilies = []; payload.applicableSubFamilies = []; payload.applicableCategories = []; payload.applicableProducts = [];
      } else if (payload.applyTo === 'DEPARTMENT') {
        payload.applicableCategories = []; payload.applicableFamilies = []; payload.applicableSubFamilies = []; payload.applicableProducts = [];
      } else if (payload.applyTo === 'CATEGORY') {
        payload.applicableDepartments = []; payload.applicableFamilies = []; payload.applicableSubFamilies = []; payload.applicableProducts = [];
      } else if (payload.applyTo === 'FAMILY') {
        payload.applicableDepartments = []; payload.applicableCategories = []; payload.applicableSubFamilies = []; payload.applicableProducts = [];
      } else if (payload.applyTo === 'SUBFAMILY') {
        payload.applicableDepartments = []; payload.applicableCategories = []; payload.applicableFamilies = []; payload.applicableProducts = [];
      } else if (payload.applyTo === 'MULTIPLE_PRODUCTS' || payload.applyTo === 'PRODUCT') {
        payload.applicableDepartments = []; payload.applicableCategories = []; payload.applicableFamilies = []; payload.applicableSubFamilies = [];
      }
      
      // Validation fail-safe
      if (payload.applyTo === 'DEPARTMENT' && payload.applicableDepartments.length === 0) payload.applyTo = 'ORDER';
      if (payload.applyTo === 'CATEGORY' && payload.applicableCategories.length === 0) payload.applyTo = 'ORDER';
      if (payload.applyTo === 'FAMILY' && payload.applicableFamilies.length === 0) payload.applyTo = 'ORDER';
      if (payload.applyTo === 'SUBFAMILY' && payload.applicableSubFamilies.length === 0) payload.applyTo = 'ORDER';
      if ((payload.applyTo === 'MULTIPLE_PRODUCTS' || payload.applyTo === 'PRODUCT') && payload.applicableProducts.length === 0) payload.applyTo = 'ORDER';

      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      if (isEdit) {
        await axios.put(`/api/v1/discounts/${id}`, payload, config);
      } else {
        await axios.post('/api/v1/discounts', payload, config);
      }
      
      onClose ? onClose() : navigate('/sales/discounts');
    } catch (error) {
      alert(error.response?.data?.message || 'Error saving promotion');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-teal-600" size={32} /></div>;
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 p-6 flex justify-between items-center shadow-sm">
        <h2 className="text-sm font-black tracking-widest text-[#0f4c5c] uppercase">
          CONFIGURE PROMOTION PARAMETERS
        </h2>
        <button onClick={onClose || (() => navigate('/sales/discounts'))} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors">
          <X size={20} />
        </button>
      </div>

      <form id="promoForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Campaign Name */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Campaign Name</label>
          <input 
            type="text" 
            name="name" 
            value={formData.name} 
            onChange={handleChange} 
            placeholder="e.g. Ramadan Special 2026"
            className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-teal-500 font-semibold text-slate-700" 
          />
        </div>

        {/* Promotion Type */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Promotion Type</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PROMOTION_TYPES.map(type => {
              const Icon = type.icon;
              const isActive = formData.discountType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, discountType: type.id }))}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                    isActive ? 'border-teal-500 bg-teal-50/50 text-teal-700 shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={24} className={`mb-2 ${isActive ? 'text-teal-500' : 'text-amber-500/70'}`} />
                  <span className="text-[10px] font-bold text-center leading-tight uppercase tracking-wider">{type.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Validity */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Valid From</label>
            <input 
              type="date" 
              name="startDate" 
              value={formData.startDate} 
              onChange={handleChange} 
              className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-teal-500 font-semibold text-slate-700" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Valid Until</label>
            <input 
              type="date" 
              name="endDate" 
              value={formData.endDate} 
              onChange={handleChange} 
              className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-teal-500 font-semibold text-slate-700" 
            />
          </div>
        </div>

        {/* Discount Mode & Value */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Discount Mode</label>
            <div className="relative">
              <select 
                name="discountType" 
                value={formData.discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE'} 
                onChange={(e) => setFormData(prev => ({ ...prev, discountType: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-teal-500 font-semibold text-slate-700 appearance-none"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Flat Amount (₹)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Value {formData.discountType === 'PERCENTAGE' ? '(%)' : '(₹)'}
            </label>
            <input 
              type="number" 
              name="value" 
              value={formData.value} 
              onChange={handleChange} 
              min="0"
              className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-teal-500 font-semibold text-slate-700" 
            />
          </div>
        </div>

        {/* Applicable Branches */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Applicable Branches</label>
          <div className="bg-slate-50 p-4 rounded-xl space-y-4">
             <div>
               <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Branches</label>
               <Select
                 isMulti
                 options={mapToSelectOptions(branches.filter(b => {
                   if (selectedCompany === 'ALL') return true;
                   const companyId = typeof b.legalCompanyId === 'object' ? b.legalCompanyId?._id : b.legalCompanyId;
                   const tenantId = typeof b.tenantId === 'object' ? b.tenantId?._id : b.tenantId;
                   return companyId === selectedCompany || tenantId === selectedCompany;
                 }))}
                 value={getSelectValues(formData.branches, branches)}
                 onChange={(opts) => handleMultiSelectChange(opts, 'branches')}
                 placeholder="Search and select branches..."
                 className="text-sm"
                 classNamePrefix="react-select"
               />
               <p className="text-[10px] text-slate-400 mt-1">Leave empty or clear selection to apply to all branches in this filter.</p>
             </div>
          </div>
        </div>

        {/* Target Items */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
            Target Items (Leave Empty For Entire Order)
          </label>
          
          <div className="space-y-4 bg-slate-50 p-6 rounded-2xl">
            {/* Departments */}
            <div>
              <span className="text-[10px] font-bold text-[#0f4c5c] uppercase tracking-widest mb-1 block">Departments</span>
              <Select
                isMulti
                options={mapToSelectOptions(departments)}
                value={getSelectValues(formData.applicableDepartments, departments)}
                onChange={(opts) => setApplyToAndToggle('DEPARTMENT', 'applicableDepartments', opts)}
                placeholder="Search and select departments..."
                className="text-sm"
                classNamePrefix="react-select"
              />
            </div>
            
            {/* Categories */}
            <div>
              <span className="text-[10px] font-bold text-[#0f4c5c] uppercase tracking-widest mb-1 block">Categories</span>
              <Select
                isMulti
                options={mapToSelectOptions(categories)}
                value={getSelectValues(formData.applicableCategories, categories)}
                onChange={(opts) => setApplyToAndToggle('CATEGORY', 'applicableCategories', opts)}
                placeholder="Search and select categories..."
                className="text-sm"
                classNamePrefix="react-select"
              />
            </div>
            
            {/* Families */}
            <div>
              <span className="text-[10px] font-bold text-[#0f4c5c] uppercase tracking-widest mb-1 block">Families</span>
              <Select
                isMulti
                options={mapToSelectOptions(families)}
                value={getSelectValues(formData.applicableFamilies, families)}
                onChange={(opts) => setApplyToAndToggle('FAMILY', 'applicableFamilies', opts)}
                placeholder="Search and select families..."
                className="text-sm"
                classNamePrefix="react-select"
              />
            </div>
            
            {/* SubFamilies */}
            <div>
              <span className="text-[10px] font-bold text-[#0f4c5c] uppercase tracking-widest mb-1 block">SubFamilies</span>
              <Select
                isMulti
                options={mapToSelectOptions(subFamilies)}
                value={getSelectValues(formData.applicableSubFamilies, subFamilies)}
                onChange={(opts) => setApplyToAndToggle('SUBFAMILY', 'applicableSubFamilies', opts)}
                placeholder="Search and select subfamilies..."
                className="text-sm"
                classNamePrefix="react-select"
              />
            </div>

            {/* Products */}
            <div>
              <span className="text-[10px] font-bold text-[#0f4c5c] uppercase tracking-widest mb-1 block">Specific Products</span>
              <Select
                isMulti
                options={mapToSelectOptions(products)}
                value={getSelectValues(formData.applicableProducts, products)}
                onChange={(opts) => setApplyToAndToggle('MULTIPLE_PRODUCTS', 'applicableProducts', opts)}
                placeholder="Search and select specific products..."
                className="text-sm"
                classNamePrefix="react-select"
              />
            </div>
          </div>
        </div>

      </form>

      {/* Footer sticky */}
      <div className="sticky bottom-0 bg-white border-t border-slate-100 p-6 flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
         <Button variant="secondary" onClick={onClose || (() => navigate('/sales/discounts'))} className="rounded-xl px-6 font-bold">
            Cancel
         </Button>
         <Button form="promoForm" type="submit" disabled={loading} className="rounded-xl px-8 bg-[#0f4c5c] hover:bg-[#0c3e4b] text-white font-bold gap-2">
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Save Campaign
         </Button>
      </div>
    </div>
  );
};

export default DiscountForm;

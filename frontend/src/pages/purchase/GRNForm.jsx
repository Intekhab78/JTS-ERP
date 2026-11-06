import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Building2, 
  Package, 
  Scale, 
  DollarSign, 
  AlertCircle, 
  ChevronRight, 
  Check, 
  Sparkles,
  Info,
  Calendar,
  Layers
} from 'lucide-react';
import { useCurrency } from '../../contexts/CurrencyContext';

const ALLOCATION_METHODS = [
  'By Purchase Value',
  'By Quantity',
  'By Weight',
  'Manual'
];

const COST_TYPES = [
  'Transportation',
  'Logistics',
  'Customs Duty',
  'Freight / Shipping',
  'Handling',
  'Handling Charges',
  'Insurance',
  'Port Clearance',
  'Storage / Demurrage',
  'Labor',
  'Packing',
  'Other'
];

const GRNForm = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const poIdFromUrl = searchParams.get('poId');
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const isEditing = Boolean(id);

  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Master Data
  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [pos, setPOs] = useState([]);
  const [products, setProducts] = useState([]);

  // PO Schedules cache
  const [poSchedules, setPoSchedules] = useState([]);
  const [poDetails, setPoDetails] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    supplierId: '',
    branchId: '',
    purchaseOrderId: '',
    deliveryChallanNumber: '',
    vehicleNumber: '',
    notes: '',
    internalNotes: '',
    items: [],
    additionalCosts: [],
    allocationMethod: 'By Purchase Value'
  });

  useEffect(() => {
    fetchInitialData();
    if (isEditing) {
      fetchGRN();
    }
  }, [id]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [suppRes, brRes, poRes, prodRes] = await Promise.all([
        axios.get('/api/v1/suppliers', { headers }),
        axios.get('/api/v1/branches', { headers }),
        axios.get('/api/v1/purchases', { headers }),
        axios.get('/api/v1/inventory/products', { headers })
      ]);
      setSuppliers(suppRes.data || []);
      setBranches(brRes.data || []);
      
      const loadedPos = Array.isArray(poRes.data) ? poRes.data : (poRes.data?.data || []);
      const loadedProducts = Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data?.data || []);
      setProducts(loadedProducts);

      let targetPO = null;
      if (poIdFromUrl) {
        try {
          const singlePoRes = await axios.get(`/api/v1/purchases/${poIdFromUrl}`, { headers });
          targetPO = singlePoRes.data;
        } catch (e) {
          console.error('Failed to load target PO from URL:', e);
        }
      }

      let allPOs = (loadedPos || []).filter(po => po.status === 'CONFIRMED' || po.status === 'PARTIALLY_RECEIVED');
      if (targetPO && !allPOs.some(p => p._id === targetPO._id)) {
        allPOs.unshift(targetPO);
      }
      setPOs(allPOs);

      if (targetPO && !isEditing) {
        loadPOIntoForm(targetPO, loadedProducts);
      }
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsForBranch = async (branchId) => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const url = branchId 
        ? `/api/v1/inventory/products?branchId=${branchId}` 
        : '/api/v1/inventory/products';
      const res = await axios.get(url, { headers });
      if (Array.isArray(res.data)) {
        setProducts(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch products for branch:', err);
    }
  };

  const fetchGRN = async () => {
    try {
      const res = await axios.get(`/api/v1/grn/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const g = res.data;
      if (g.status !== 'DRAFT') {
        alert('Only DRAFT GRNs can be edited.');
        navigate(`/purchases/grn/${id}`);
        return;
      }
      const bId = g.branchId?._id || g.branchId || '';
      if (bId) {
        fetchProductsForBranch(bId);
      }
      setFormData({
        supplierId: g.supplierId?._id || '',
        branchId: bId,
        purchaseOrderId: g.purchaseOrderId?._id || '',
        deliveryChallanNumber: g.deliveryChallanNumber || '',
        vehicleNumber: g.vehicleNumber || '',
        notes: g.notes || '',
        internalNotes: g.internalNotes || '',
        items: (g.items || []).map(it => ({
          ...it,
          remainingQuantity: it.orderedQuantity,
          purchaseUnitPrice: it.purchaseUnitPrice || 0
        })),
        additionalCosts: g.additionalCosts || [],
        allocationMethod: g.allocationMethod || 'By Purchase Value'
      });
    } catch (error) {
      console.error('Failed to fetch GRN:', error);
      alert('Failed to load GRN');
      navigate('/purchases/grn');
    }
  };

  const loadPOIntoForm = (selectedPO, productList = products) => {
    if (!selectedPO) return;
    setPoDetails(selectedPO);
    const poBranchId = selectedPO.branchId?._id || selectedPO.branchId || '';
    if (poBranchId) {
      fetchProductsForBranch(poBranchId);
    }

    const itemsFromPO = (selectedPO.items || []).map(item => {
      const productObj = item.productId || {};
      const pId = productObj._id || productObj;
      const productFromState = (productList || []).find(p => p._id === pId);
      const varObj = item.variantId || {};
      const varId = varObj._id || item.variantId || null;
      const varSku = item.variantSku || varObj.sku || '';
      const variantLabel = varSku ? ` [Variant: ${varSku}]` : '';

      const orderedQty = Number(item.quantity) || 1;
      const alreadyRecQty = Number(item.receivedQuantity) || 0;
      const remQty = Math.max(0, orderedQty - alreadyRecQty);
      const price = Number(item.unitCost) || Number(item.unitPrice) || 0;

      return {
        productId: pId,
        variantId: varId,
        variantSku: varSku,
        itemName: (productObj.name || (productFromState ? productFromState.name : 'Unknown')) + variantLabel,
        sku: varSku || productObj.sku || (productFromState ? (productFromState.sku || 'N/A') : 'UNK'),
        uom: item.uom || productObj.uom || 'Piece',
        orderedQuantity: orderedQty,
        alreadyReceivedQuantity: alreadyRecQty,
        remainingQuantity: remQty,
        receivedQuantity: remQty,
        acceptedQuantity: remQty,
        rejectedQuantity: 0,
        purchaseUnitPrice: price,
        conversionFactor: item.conversionFactor || 1,
        isFromPO: true
      };
    });

    setFormData(prev => ({
      ...prev,
      purchaseOrderId: selectedPO._id,
      supplierId: selectedPO.supplierId?._id || selectedPO.supplierId || '',
      branchId: poBranchId,
      items: itemsFromPO
    }));
  };

  const handlePOChange = async (poId) => {
    if (!poId) {
      setFormData(prev => ({ ...prev, purchaseOrderId: '', items: [] }));
      setPoDetails(null);
      setPoSchedules([]);
      return;
    }
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const res = await axios.get(`/api/v1/purchases/${poId}`, { headers });
      const selectedPO = res.data;
      if (selectedPO) {
        loadPOIntoForm(selectedPO, products);
      }
    } catch (error) {
      console.error('Failed to load PO details:', error);
    }
  };

  const handleBranchChange = (branchId) => {
    setFormData(prev => ({ ...prev, branchId }));
    if (branchId) {
      fetchProductsForBranch(branchId);
    }
  };

  // Branch-specific product filtering
  const filteredProducts = useMemo(() => {
    if (!formData.branchId) return products;
    const branchDoc = branches.find(b => b._id === formData.branchId);
    const branchName = branchDoc?.name?.toLowerCase().trim() || '';

    return products.filter(p => {
      // 1. Explicit branch assignment in branchIds array
      if (Array.isArray(p.branchIds) && p.branchIds.length > 0) {
        return p.branchIds.some(b => (b._id || b).toString() === formData.branchId.toString());
      }
      // 2. Location string matches branch name (e.g. Dubai)
      if (p.location && branchName && p.location.toLowerCase().includes(branchName)) {
        return true;
      }
      // 3. Products available to all branches (no restrictive branchIds)
      const hasNoSpecificBranches = !p.branchIds || p.branchIds.length === 0;
      return hasNoSpecificBranches;
    });
  }, [products, formData.branchId, branches]);

  // Product selection handler that automatically populates Unit Price
  const handleProductSelect = (index, productId) => {
    const prod = products.find(p => p._id === productId);
    setFormData(prev => {
      const items = [...prev.items];
      if (!prod) {
        items[index] = {
          ...items[index],
          productId: '',
          itemName: '',
          sku: '',
          purchaseUnitPrice: 0
        };
        return { ...prev, items };
      }

      // Automatically populate unit price from product purchasePrice, costPrice, landedCost, or price
      const autoPrice = Number(
        (prod.purchasePrice !== undefined && prod.purchasePrice !== null && prod.purchasePrice > 0)
          ? prod.purchasePrice
          : (prod.costPrice !== undefined && prod.costPrice !== null && prod.costPrice > 0)
            ? prod.costPrice
            : (prod.landedCost !== undefined && prod.landedCost !== null && prod.landedCost > 0)
              ? prod.landedCost
              : (prod.price !== undefined && prod.price !== null && prod.price > 0)
                ? prod.price
                : (prod.salesPrice !== undefined && prod.salesPrice !== null && prod.salesPrice > 0)
                  ? prod.salesPrice
                  : 0
      );

      const baseUnit = prod.uomDetails?.baseUnit || prod.uom || 'Piece';
      const purchaseUnit = prod.uomDetails?.purchaseUnit || baseUnit;
      const purchaseConversion = Number(prod.uomDetails?.purchaseConversionFactor) || 1;
      const defaultUom = purchaseUnit || baseUnit;
      const defaultFactor = defaultUom === purchaseUnit ? purchaseConversion : 1;

      items[index] = {
        ...items[index],
        productId: prod._id,
        itemName: prod.name,
        sku: prod.sku || 'N/A',
        uom: defaultUom,
        baseUom: baseUnit,
        purchaseUnit: purchaseUnit,
        purchaseConversionFactor: purchaseConversion,
        purchaseUnitPrice: autoPrice,
        conversionFactor: defaultFactor
      };
      return { ...prev, items };
    });
  };

  const handleItemUomChange = (index, newUom) => {
    setFormData(prev => {
      const items = [...prev.items];
      const it = items[index];
      const prod = products.find(p => p._id === it.productId);
      const baseUnit = prod?.uomDetails?.baseUnit || prod?.uom || 'Piece';
      const purchaseUnit = prod?.uomDetails?.purchaseUnit || baseUnit;
      const purchaseConversion = Number(prod?.uomDetails?.purchaseConversionFactor) || 1;

      let factor = 1;
      if (newUom === purchaseUnit) {
        factor = purchaseConversion;
      } else {
        factor = 1;
      }

      items[index] = {
        ...it,
        uom: newUom,
        conversionFactor: factor
      };
      return { ...prev, items };
    });
  };

  const addItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: '',
          variantId: null,
          variantSku: '',
          itemName: '',
          sku: '',
          uom: 'PCS',
          orderedQuantity: 1,
          alreadyReceivedQuantity: 0,
          remainingQuantity: 1,
          receivedQuantity: 1,
          acceptedQuantity: 1,
          rejectedQuantity: 0,
          purchaseUnitPrice: 0,
          conversionFactor: 1,
          isFromPO: false
        }
      ]
    }));
  };

  const removeItemRow = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => {
      const items = [...prev.items];
      const item = { ...items[index], [field]: value };

      if (field === 'orderedQuantity') {
        const ord = Math.max(0, Number(value) || 0);
        item.orderedQuantity = value === '' ? '' : ord;
        item.remainingQuantity = ord;
        if (!item.isFromPO || !prev.purchaseOrderId) {
          item.receivedQuantity = ord;
          item.acceptedQuantity = ord;
          item.rejectedQuantity = 0;
        }
      }

      if (field === 'receivedQuantity') {
        const rec = Math.max(0, Number(value) || 0);
        item.receivedQuantity = rec;
        item.acceptedQuantity = rec;
        item.rejectedQuantity = 0;
      }

      if (field === 'acceptedQuantity') {
        const acc = Math.max(0, Number(value) || 0);
        const rec = Number(item.receivedQuantity) || 0;
        if (acc > rec) {
          item.acceptedQuantity = rec;
          item.rejectedQuantity = 0;
        } else {
          item.acceptedQuantity = acc;
          item.rejectedQuantity = Math.max(0, rec - acc);
        }
      }

      items[index] = item;
      return { ...prev, items };
    });
  };

  const addCostRow = () => {
    setFormData(prev => ({
      ...prev,
      additionalCosts: [
        ...prev.additionalCosts,
        {
          costType: 'Transportation',
          description: '',
          amount: 0,
          currency: 'AED'
        }
      ]
    }));
  };

  const removeCostRow = (index) => {
    setFormData(prev => ({
      ...prev,
      additionalCosts: prev.additionalCosts.filter((_, i) => i !== index)
    }));
  };

  const updateCost = (index, field, value) => {
    setFormData(prev => {
      const costs = [...prev.additionalCosts];
      costs[index] = { ...costs[index], [field]: value };
      return { ...prev, additionalCosts: costs };
    });
  };

  // Live calculation of Landed Costs
  const liveTotals = useMemo(() => {
    const totalAdditionalCost = formData.additionalCosts.reduce(
      (sum, c) => sum + (Number(c.amount) || 0), 0
    );

    let totalPurchaseCost = 0;
    let totalAcceptedQty = 0;
    let totalWeight = 0;

    const itemsCalculated = formData.items.map(item => {
      const acceptedQty = Number(item.acceptedQuantity) || 0;
      const unitPrice = Number(item.purchaseUnitPrice) || 0;
      const purchaseAmount = acceptedQty * unitPrice;
      totalPurchaseCost += purchaseAmount;
      totalAcceptedQty += acceptedQty;

      const prod = products.find(p => p._id === item.productId);
      const weight = (prod?.weightDetails?.netWeight || 1) * acceptedQty;
      totalWeight += weight;

      return {
        ...item,
        purchaseAmount,
        weight,
        allocatedAdditionalCost: 0,
        totalLandedCost: purchaseAmount,
        landedUnitCost: unitPrice
      };
    });

    if (totalAdditionalCost > 0 && itemsCalculated.length > 0) {
      if (formData.allocationMethod === 'By Purchase Value' && totalPurchaseCost > 0) {
        itemsCalculated.forEach(it => {
          const ratio = it.purchaseAmount / totalPurchaseCost;
          it.allocatedAdditionalCost = Number((ratio * totalAdditionalCost).toFixed(2));
          it.totalLandedCost = Number((it.purchaseAmount + it.allocatedAdditionalCost).toFixed(2));
          it.landedUnitCost = it.acceptedQuantity > 0 
            ? Number((it.totalLandedCost / it.acceptedQuantity).toFixed(2)) 
            : 0;
        });
      } else if (formData.allocationMethod === 'By Quantity' && totalAcceptedQty > 0) {
        itemsCalculated.forEach(it => {
          const ratio = it.acceptedQuantity / totalAcceptedQty;
          it.allocatedAdditionalCost = Number((ratio * totalAdditionalCost).toFixed(2));
          it.totalLandedCost = Number((it.purchaseAmount + it.allocatedAdditionalCost).toFixed(2));
          it.landedUnitCost = it.acceptedQuantity > 0 
            ? Number((it.totalLandedCost / it.acceptedQuantity).toFixed(2)) 
            : 0;
        });
      } else if (formData.allocationMethod === 'By Weight' && totalWeight > 0) {
        itemsCalculated.forEach(it => {
          const ratio = it.weight / totalWeight;
          it.allocatedAdditionalCost = Number((ratio * totalAdditionalCost).toFixed(2));
          it.totalLandedCost = Number((it.purchaseAmount + it.allocatedAdditionalCost).toFixed(2));
          it.landedUnitCost = it.acceptedQuantity > 0 
            ? Number((it.totalLandedCost / it.acceptedQuantity).toFixed(2)) 
            : 0;
        });
      } else if (formData.allocationMethod === 'Manual') {
        itemsCalculated.forEach(it => {
          const manualAlloc = Number(it.manualAllocation) || 0;
          it.allocatedAdditionalCost = manualAlloc;
          it.totalLandedCost = Number((it.purchaseAmount + manualAlloc).toFixed(2));
          it.landedUnitCost = it.acceptedQuantity > 0 
            ? Number((it.totalLandedCost / it.acceptedQuantity).toFixed(2)) 
            : 0;
        });
      }
    }

    const calculatedTotalLandedCost = itemsCalculated.reduce((sum, it) => sum + it.totalLandedCost, 0);

    let manualValid = true;
    if (formData.allocationMethod === 'Manual') {
      const sumManual = itemsCalculated.reduce((sum, it) => sum + (Number(it.manualAllocation) || 0), 0);
      manualValid = Math.abs(sumManual - totalAdditionalCost) < 0.01;
    }

    return {
      totalPurchaseCost,
      totalAdditionalCost,
      totalLandedCost: calculatedTotalLandedCost || (totalPurchaseCost + totalAdditionalCost),
      items: itemsCalculated,
      manualValid
    };
  }, [formData, products]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!formData.supplierId) {
        setActiveTab('details');
        setSubmitting(false);
        return alert('Please select a Supplier / Vendor.');
      }
      if (!formData.branchId) {
        setActiveTab('details');
        setSubmitting(false);
        return alert('Please select a Destination Branch.');
      }
      if (formData.items.length === 0) {
        setActiveTab('items');
        setSubmitting(false);
        return alert('A Goods Receipt Note must have at least one line item.');
      }

      for (let item of formData.items) {
        if (!item.productId) {
          setActiveTab('items');
          setSubmitting(false);
          return alert('Please select a product for all items.');
        }
        
        if (item.receivedQuantity === '' || item.receivedQuantity === undefined || item.receivedQuantity === null) {
          setActiveTab('items');
          setSubmitting(false);
          return alert(`Please enter Received Quantity for: ${item.itemName || 'Item'}`);
        }
        
        if (item.acceptedQuantity === '' || item.acceptedQuantity === undefined || item.acceptedQuantity === null) {
          setActiveTab('items');
          setSubmitting(false);
          return alert(`Please enter Accepted Quantity for: ${item.itemName || 'Item'}`);
        }

        if (Number(item.acceptedQuantity) + Number(item.rejectedQuantity || 0) > Number(item.receivedQuantity)) {
          setActiveTab('items');
          setSubmitting(false);
          return alert(`Accepted + Rejected cannot exceed Received Quantity for ${item.itemName}`);
        }
      }

      if (formData.allocationMethod === 'Manual' && !liveTotals.manualValid) {
        setActiveTab('costs');
        setSubmitting(false);
        return alert('Manual allocation total must exactly equal Total Additional Cost.');
      }

      if (formData.allocationMethod === 'By Weight') {
        const hasMissingWeight = liveTotals.items.some(i => i.weight <= 0);
        if (hasMissingWeight && formData.additionalCosts.length > 0) {
          setActiveTab('costs');
          setSubmitting(false);
          return alert('Cannot allocate By Weight: One or more products are missing valid weight data in the Product Master.');
        }
      }

      const payload = {
        ...formData,
        supplierSnapshot: { name: suppliers.find(s => s._id === formData.supplierId)?.name || 'Unknown' }
      };

      if (!payload.purchaseOrderId) {
        delete payload.purchaseOrderId;
      }
      
      if (payload.allocationMethod === 'Manual') {
        payload.items = payload.items.map((item, index) => ({
          ...item,
          allocatedAdditionalCost: liveTotals.items[index]?.allocatedAdditionalCost || 0
        }));
      }

      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      if (isEditing) {
        await axios.put(`/api/v1/grn/${id}`, payload, { headers });
      } else {
        await axios.post('/api/v1/grn', payload, { headers });
      }
      
      navigate('/purchases/grn');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save GRN');
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = [
    { id: 'details', label: 'Receipt Dossier', step: '1', icon: <Building2 size={14} />, count: null },
    { id: 'items', label: 'Line Items', step: '2', icon: <Package size={14} />, count: formData.items.length },
    { id: 'costs', label: 'Landed Costs', step: '3', icon: <Scale size={14} />, count: formData.additionalCosts.length },
    { id: 'summary', label: 'Landed Summary', step: '4', icon: <DollarSign size={14} />, count: null }
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 text-foreground">
      
      {/* ========================================================================= */}
      {/* 1. TOP HERO BANNER (Matches GRN & Order Processing Aesthetic)              */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-4 sm:p-5 text-white shadow-md border border-blue-900/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          
          {/* Left: Left-Aligned Arrow Back Button + Title & Subtitle */}
          <div className="flex items-start gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/purchases/grn')}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:scale-105 shrink-0 mt-0.5"
              title="Back to Receipts List"
            >
              <ArrowLeft size={16} />
            </button>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-bold uppercase tracking-wider">
                  <Sparkles size={11} className="text-blue-400" />
                  Receiving Hub · {isEditing ? 'Draft Update' : 'New Consignment'}
                </span>
              </div>

              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                {isEditing ? 'Edit Draft GRN' : 'Create Goods Receipt Note'}
              </h1>

              <p className="text-xs text-blue-100/75 leading-snug">
                Receive goods against Purchase Orders or direct vendor consignments, allocate landed freight, and verify inventory.
              </p>
            </div>
          </div>

          {/* Right: Actions (Cancel & Create GRN Button) */}
          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            <button
              type="button"
              onClick={() => navigate('/purchases/grn')}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 hover:text-white border border-white/20 text-xs font-semibold transition-all duration-200 cursor-pointer hover:shadow-xs hover:-translate-y-0.5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-md shadow-blue-600/30 hover:shadow-lg hover:shadow-blue-600/40 hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
            >
              <Save size={15} />
              {submitting ? 'Saving GRN...' : isEditing ? 'Save Changes' : 'Create GRN (Draft)'}
            </button>
          </div>

        </div>

        {/* Ambient subtle light */}
        <div className="absolute right-0 top-0 w-80 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ========================================================================= */}
      {/* 2. SEGMENTED TABS NAVIGATION (Matches Order Processing Style)              */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1.5 p-1.5 bg-muted/60 rounded-2xl border border-border/70 overflow-x-auto [scrollbar-width:none]">
        {tabs.map(t => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer hover:-translate-y-0.5 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs hover:shadow-md font-bold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card hover:shadow-2xs font-medium'
              }`}
            >
              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold transition-colors ${
                isActive ? 'bg-white/20 text-white' : 'bg-muted-foreground/15 text-muted-foreground'
              }`}>
                {t.step}
              </span>
              {t.icon}
              <span>{t.label}</span>
              {t.count !== null && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold transition-colors ${
                  isActive ? 'bg-white/20 text-white' : 'bg-muted-foreground/15 text-muted-foreground'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 3. FORM CONTAINER                                                         */}
      {/* ========================================================================= */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* TAB 1: DETAILS */}
        {activeTab === 'details' && (
          <div className="bg-card rounded-2xl border border-border/70 p-5 sm:p-6 shadow-xs space-y-6 text-foreground hover:border-border transition-all duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm tracking-tight">Receipt General Information</h3>
                  <p className="text-xs text-muted-foreground">Specify purchase order reference, vendor credentials, and warehouse destination.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* PO Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80 block">
                  Purchase Order (Optional)
                </label>
                <select
                  value={formData.purchaseOrderId}
                  onChange={e => handlePOChange(e.target.value)}
                  className="w-full h-10 px-3.5 bg-background border border-border/80 rounded-xl text-xs sm:text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-400/80 transition-all cursor-pointer shadow-2xs"
                >
                  <option value="">No PO (Direct Receiving)</option>
                  {pos.map(po => (
                    <option key={po._id} value={po._id}>
                      {po.purchaseOrderNumber || `PO-${po._id.slice(-6).toUpperCase()}`} • {po.supplierId?.name || 'Vendor'}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-muted-foreground block">
                  Selecting a PO automatically imports ordered products, quantities, and prices.
                </span>
              </div>

              {/* Supplier */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80 block">
                  Supplier / Vendor <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  disabled={!!formData.purchaseOrderId}
                  value={formData.supplierId}
                  onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                  className="w-full h-10 px-3.5 bg-background border border-border/80 rounded-xl text-xs sm:text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-400/80 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s._id} value={s._id}>{s.name} ({s.phone || 'No Phone'})</option>
                  ))}
                </select>
              </div>

              {/* Branch / Warehouse */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80 block">
                  Destination Warehouse <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  disabled={!!formData.purchaseOrderId && poSchedules.length === 0}
                  value={formData.branchId}
                  onChange={e => handleBranchChange(e.target.value)}
                  className="w-full h-10 px-3.5 bg-background border border-border/80 rounded-xl text-xs sm:text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-400/80 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                >
                  <option value="">Select Destination Branch</option>
                  {branches.map(b => (
                    <option key={b._id} value={b._id}>{b.name}</option>
                  ))}
                </select>
                {poSchedules.length > 0 && (
                  <span className="text-[11px] text-blue-600 font-semibold block">
                    Choose branch to auto-populate scheduled deliveries
                  </span>
                )}
              </div>

              {/* Delivery Challan */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80 block">
                  Delivery Challan / DC Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. DC-98421"
                  value={formData.deliveryChallanNumber}
                  onChange={e => setFormData({ ...formData, deliveryChallanNumber: e.target.value })}
                  className="w-full h-10 px-3.5 bg-background border border-border/80 rounded-xl text-xs sm:text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-400/80 transition-all shadow-2xs"
                />
              </div>

              {/* Vehicle Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80 block">
                  Vehicle / Truck Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. DXB-45920"
                  value={formData.vehicleNumber}
                  onChange={e => setFormData({ ...formData, vehicleNumber: e.target.value })}
                  className="w-full h-10 px-3.5 bg-background border border-border/80 rounded-xl text-xs sm:text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-400/80 transition-all shadow-2xs"
                />
              </div>

            </div>

            {/* Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-border/50">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80 block">
                  Receipt Notes (Visible on Report)
                </label>
                <textarea
                  rows={3}
                  placeholder="Carrier remarks, condition of goods, seal numbers..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-background border border-border/80 rounded-xl text-xs sm:text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-400/80 transition-all resize-none shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80 block">
                  Internal Quality Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Internal inspection checklist, batch observations..."
                  value={formData.internalNotes}
                  onChange={e => setFormData({ ...formData, internalNotes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-background border border-border/80 rounded-xl text-xs sm:text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-400/80 transition-all resize-none shadow-2xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-border/50">
              <button
                type="button"
                onClick={() => setActiveTab('items')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
              >
                <span>Proceed to Line Items</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: ITEMS */}
        {activeTab === 'items' && (
          <div className="bg-card rounded-2xl border border-border/70 p-5 sm:p-6 shadow-xs space-y-5 text-foreground hover:border-border hover:shadow-md transition-all duration-200">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Package size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm tracking-tight">Receipt Line Items</h3>
                  <p className="text-xs text-muted-foreground">Inspect received goods and verify accepted vs. rejected counts.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={addItemRow}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-xs active:scale-95 shadow-2xs"
              >
                <Plus size={14} /> Add Custom Product
              </button>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block rounded-xl border border-border/70 overflow-hidden bg-card shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/70 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3 min-w-[240px]">Product & SKU</th>
                    <th className="py-3 px-3 w-28 text-right">Unit Price</th>
                    <th className="py-3 px-3 w-24 text-center">Ordered</th>
                    <th className="py-3 px-3 w-28 text-center">Received</th>
                    <th className="py-3 px-3 w-28 text-center text-emerald-600 dark:text-emerald-400">Accepted</th>
                    <th className="py-3 px-3 w-24 text-center text-rose-600 dark:text-rose-400">Rejected</th>
                    <th className="py-3 px-3 w-32 text-right">Subtotal</th>
                    <th className="py-3 px-2 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-medium">
                  {formData.items.map((item, index) => {
                    const unitPrice = Number(item.purchaseUnitPrice) || 0;
                    const accepted = Number(item.acceptedQuantity) || 0;
                    const subtotal = accepted * unitPrice;

                    return (
                      <tr key={index} className="hover:bg-muted/30 transition-colors duration-150">
                        <td className="py-3 px-3 text-center text-muted-foreground font-mono text-xs">{index + 1}</td>
                        
                        {/* Product selection */}
                        <td className="py-3 px-3">
                          {item.isFromPO || formData.purchaseOrderId ? (
                            <div className="space-y-0.5">
                              <span className="font-semibold text-foreground block">{item.itemName}</span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md font-mono inline-block">
                                  SKU: {item.sku}
                                </span>
                                {item.uom && (
                                  <span className="text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider inline-block">
                                    {item.uom}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <select
                                required
                                value={item.productId}
                                onChange={e => handleProductSelect(index, e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-background border border-border/80 rounded-xl text-xs font-semibold text-foreground focus:border-blue-500 outline-none hover:border-blue-400/80 transition-all cursor-pointer"
                              >
                                <option value="">Select Product</option>
                                {filteredProducts.map(p => (
                                  <option key={p._id} value={p._id}>
                                    {p.name} ({p.sku})
                                  </option>
                                ))}
                              </select>
                              {item.productId && (
                                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                  <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md font-mono inline-block">
                                    SKU: {item.sku}
                                  </span>
                                  {item.purchaseConversionFactor > 1 && item.purchaseUnit !== item.baseUom ? (
                                    <div className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-1.5 py-0.5 rounded-md">
                                      <span className="text-[9.5px] font-bold text-blue-600 uppercase">Unit:</span>
                                      <select
                                        value={item.uom || item.purchaseUnit || 'BOX'}
                                        onChange={e => handleItemUomChange(index, e.target.value)}
                                        className="h-5 bg-transparent text-[10px] font-black text-blue-700 dark:text-blue-300 outline-none cursor-pointer"
                                      >
                                        <option value={item.purchaseUnit || 'BOX'}>{item.purchaseUnit || 'BOX'} ({item.purchaseConversionFactor} pcs/box)</option>
                                        <option value={item.baseUom || 'Piece'}>{item.baseUom || 'Piece'} (1 pc)</option>
                                      </select>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider inline-block">
                                      Unit: {item.uom || 'PCS'}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Unit Price */}
                        <td className="py-3 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.purchaseUnitPrice}
                            onChange={e => updateItem(index, 'purchaseUnitPrice', e.target.value)}
                            className="w-full h-8 px-2 text-right font-semibold bg-background border border-border/80 rounded-lg text-xs text-foreground focus:border-blue-500 outline-none"
                            required
                          />
                        </td>

                        {/* Ordered */}
                        <td className="py-3 px-3 text-center">
                          {item.isFromPO && formData.purchaseOrderId ? (
                            <span className="font-bold text-foreground bg-muted/60 px-2 py-1 rounded-md text-xs">
                              {item.orderedQuantity}
                            </span>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              value={item.orderedQuantity}
                              onChange={e => updateItem(index, 'orderedQuantity', e.target.value)}
                              className="w-full h-8 px-2 text-center font-bold bg-background border border-border/80 focus:border-blue-500 rounded-lg text-xs text-foreground outline-none hover:border-blue-400/80 transition-all"
                              required
                            />
                          )}
                        </td>

                        {/* Received */}
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.receivedQuantity}
                            onChange={e => updateItem(index, 'receivedQuantity', e.target.value)}
                            className="w-full h-8 px-2 text-center font-bold bg-background border border-border/80 focus:border-blue-500 rounded-lg text-xs text-foreground outline-none hover:border-blue-400/80 transition-all"
                            required
                          />
                          {item.isFromPO && formData.purchaseOrderId && item.remainingQuantity !== undefined && (
                            <span className="text-[10px] text-muted-foreground block mt-0.5 font-mono">
                              Max: {item.remainingQuantity}
                            </span>
                          )}
                        </td>

                        {/* Accepted */}
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.acceptedQuantity}
                            onChange={e => updateItem(index, 'acceptedQuantity', e.target.value)}
                            className="w-full h-8 px-2 text-center font-bold bg-emerald-500/10 border border-emerald-500/30 focus:border-emerald-500 rounded-lg text-xs text-emerald-600 dark:text-emerald-400 outline-none"
                            required
                          />
                          {item.conversionFactor > 1 && (
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold block mt-1 whitespace-nowrap bg-emerald-100/80 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-700 shadow-2xs">
                              = {(Number(item.acceptedQuantity) || 0) * item.conversionFactor} {item.baseUom || 'Pieces'} Stock In
                            </span>
                          )}
                        </td>

                        {/* Rejected */}
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            readOnly
                            value={item.rejectedQuantity || 0}
                            className="w-full h-8 px-2 text-center font-bold bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-500 cursor-not-allowed"
                          />
                        </td>

                        {/* Subtotal */}
                        <td className="py-3 px-3 text-right font-bold text-foreground text-xs">
                          {formatCurrency(subtotal)}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all cursor-pointer"
                            title="Remove Item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View for Items */}
            <div className="block lg:hidden space-y-2.5">
              {formData.items.map((item, index) => {
                const unitPrice = Number(item.purchaseUnitPrice) || 0;
                const accepted = Number(item.acceptedQuantity) || 0;
                const subtotal = accepted * unitPrice;

                return (
                  <div key={index} className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className="text-[10px] font-bold text-muted-foreground font-mono">Item #{index + 1}</span>
                        {item.isFromPO || formData.purchaseOrderId ? (
                          <div className="font-bold text-foreground text-xs">{item.itemName}</div>
                        ) : (
                          <select
                            required
                            value={item.productId}
                            onChange={e => handleProductSelect(index, e.target.value)}
                            className="w-full mt-1 p-2 bg-background border border-border/80 rounded-xl text-xs font-semibold focus:border-blue-500 outline-none hover:border-blue-400/80 transition-all cursor-pointer"
                          >
                            <option value="">Select Product</option>
                            {filteredProducts.map(p => (
                              <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                          </select>
                        )}
                        <span className="font-mono text-[10px] text-muted-foreground">SKU: {item.sku}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Unit Price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.purchaseUnitPrice}
                          onChange={e => updateItem(index, 'purchaseUnitPrice', e.target.value)}
                          className="w-full h-8 px-2 bg-background border border-border/80 rounded-lg font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Ordered</label>
                        {item.isFromPO && formData.purchaseOrderId ? (
                          <input
                            type="number"
                            readOnly
                            value={item.orderedQuantity}
                            className="w-full h-8 px-2 bg-muted/60 border border-border/80 rounded-lg font-bold text-xs"
                          />
                        ) : (
                          <input
                            type="number"
                            min="0"
                            value={item.orderedQuantity}
                            onChange={e => updateItem(index, 'orderedQuantity', e.target.value)}
                            className="w-full h-8 px-2 bg-background border border-border/80 rounded-lg font-bold text-xs focus:border-blue-500 outline-none"
                            required
                          />
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Received</label>
                        <input
                          type="number"
                          value={item.receivedQuantity}
                          onChange={e => updateItem(index, 'receivedQuantity', e.target.value)}
                          className="w-full h-8 px-2 bg-background border border-border/80 rounded-lg font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-emerald-600 block mb-1">Accepted</label>
                        <input
                          type="number"
                          value={item.acceptedQuantity}
                          onChange={e => updateItem(index, 'acceptedQuantity', e.target.value)}
                          className="w-full h-8 px-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg font-bold text-emerald-600 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-border/50">
                      <span className="text-rose-500">Rejected: {item.rejectedQuantity || 0}</span>
                      <span className="text-foreground">Subtotal: {formatCurrency(subtotal)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {formData.items.length === 0 && (
              <div className="text-center py-12 text-muted-foreground space-y-2 rounded-xl border border-dashed border-border/80">
                <Package size={36} className="mx-auto text-muted-foreground/50" />
                <p className="text-xs font-bold uppercase tracking-wider">No line items in this receipt</p>
                <p className="text-xs text-muted-foreground">Select a Purchase Order in Tab 1 or click "Add Custom Product".</p>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-border/50">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className="px-4 py-2 rounded-xl border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-semibold transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-2xs active:scale-95"
              >
                Back to Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('costs')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
              >
                <span>Proceed to Landed Costs</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: COSTS */}
        {activeTab === 'costs' && (
          <div className="bg-card rounded-2xl border border-border/70 p-5 sm:p-6 shadow-xs space-y-5 text-foreground hover:border-border hover:shadow-md transition-all duration-200">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Scale size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm tracking-tight">Additional Landed Costs</h3>
                  <p className="text-xs text-muted-foreground">Add customs duties, freight charges, handling fees, and configure cost distribution.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={formData.allocationMethod}
                  onChange={e => setFormData({ ...formData, allocationMethod: e.target.value })}
                  className="h-9 px-3 bg-background border border-border/80 rounded-xl text-xs font-semibold text-foreground outline-none cursor-pointer shadow-2xs hover:border-blue-400/80 transition-all"
                >
                  {ALLOCATION_METHODS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={addCostRow}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 font-bold text-xs transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-xs active:scale-95 shadow-2xs"
                >
                  <Plus size={14} /> Add Expense
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {formData.additionalCosts.map((cost, idx) => (
                <div key={idx} className="flex flex-wrap md:flex-nowrap gap-3 items-center bg-muted/20 p-3.5 rounded-xl border border-border/60 hover:border-blue-500/50 hover:bg-muted/30 hover:shadow-2xs hover:-translate-y-0.5 transition-all duration-200">
                  <div className="w-full md:w-1/4">
                    <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Cost Type</label>
                    <select
                      value={cost.costType}
                      onChange={e => updateCost(idx, 'costType', e.target.value)}
                      className="w-full h-9 px-2.5 bg-background border border-border/80 rounded-lg text-xs font-semibold text-foreground outline-none hover:border-blue-400/80 transition-all"
                    >
                      {COST_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Description / Invoice No</label>
                    <input
                      type="text"
                      placeholder="e.g. Courier Air Waybill #9842"
                      value={cost.description}
                      onChange={e => updateCost(idx, 'description', e.target.value)}
                      className="w-full h-9 px-2.5 bg-background border border-border/80 rounded-lg text-xs font-medium text-foreground outline-none hover:border-blue-400/80 transition-all"
                    />
                  </div>

                  <div className="w-32">
                    <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cost.amount}
                      onChange={e => updateCost(idx, 'amount', e.target.value)}
                      className="w-full h-9 px-2.5 bg-background border border-border/80 rounded-lg font-bold text-xs text-right text-foreground outline-none hover:border-blue-400/80 transition-all"
                    />
                  </div>

                  <div className="w-24">
                    <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Currency</label>
                    <input
                      type="text"
                      value={cost.currency}
                      onChange={e => updateCost(idx, 'currency', e.target.value)}
                      className="w-full h-9 px-2.5 bg-background border border-border/80 rounded-lg font-bold text-xs text-center text-foreground outline-none hover:border-blue-400/80 transition-all"
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={() => removeCostRow(idx)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer"
                      title="Remove Expense"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}

              {formData.additionalCosts.length === 0 && (
                <div className="text-center py-12 text-muted-foreground space-y-2 rounded-xl border border-dashed border-border/80">
                  <Scale size={36} className="mx-auto text-muted-foreground/50" />
                  <p className="text-xs font-bold uppercase tracking-wider">No additional landed costs recorded</p>
                  <p className="text-xs text-muted-foreground">If there are no freight or customs charges, proceed directly to summary.</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border/70 text-xs">
              <span className="font-semibold text-foreground">Total Additional Expenses:</span>
              <span className="font-bold text-blue-600 text-sm sm:text-base">
                {formatCurrency(liveTotals.totalAdditionalCost)}
              </span>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-border/50">
              <button
                type="button"
                onClick={() => setActiveTab('items')}
                className="px-4 py-2 rounded-xl border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-semibold transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-2xs active:scale-95"
              >
                Back to Items
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('summary')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
              >
                <span>Preview Landed Summary</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: SUMMARY */}
        {activeTab === 'summary' && (
          <div className="bg-card rounded-2xl border border-border/70 p-5 sm:p-6 shadow-xs space-y-5 text-foreground hover:border-border hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <DollarSign size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm tracking-tight">Final Landed Cost Matrix</h3>
                  <p className="text-xs text-muted-foreground">Live distribution preview of allocated costs per unit prior to database commit.</p>
                </div>
              </div>
            </div>

            {/* Total Value Summary Recap Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70">
                <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">Base Purchase Amount</span>
                <span className="text-base sm:text-lg font-bold text-foreground">{formatCurrency(liveTotals.totalPurchaseCost)}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70">
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 block mb-0.5">Additional Landed Expenses</span>
                <span className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">+{formatCurrency(liveTotals.totalAdditionalCost)}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 block mb-0.5">Total Landed Consignment Value</span>
                <span className="text-lg sm:text-xl font-black text-blue-700 dark:text-blue-300">{formatCurrency(liveTotals.totalLandedCost)}</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border/70 bg-card shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/70 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-3">Product & SKU</th>
                    <th className="py-3 px-3 text-center">Accepted Units</th>
                    <th className="py-3 px-3 text-right">Base Purchase Amount</th>
                    <th className="py-3 px-3 text-right text-blue-600">Allocated Cost</th>
                    <th className="py-3 px-3.5 text-right font-bold text-foreground">Total Landed Cost</th>
                    <th className="py-3 px-3.5 text-right font-bold text-emerald-600">Landed Cost / Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-medium">
                  {liveTotals.items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors duration-150">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-foreground text-xs">{it.itemName}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">SKU: {it.sku}</div>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-foreground">
                        {it.acceptedQuantity}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-foreground">
                        {formatCurrency(it.purchaseAmount)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-blue-600">
                        {formData.allocationMethod === 'Manual' ? (
                          <input
                            type="number"
                            step="0.01"
                            className="w-24 px-2 py-1 bg-background border border-border/80 rounded-lg text-right font-bold text-foreground"
                            value={formData.items[idx].manualAllocation || ''}
                            onChange={e => updateItem(idx, 'manualAllocation', e.target.value)}
                            placeholder="0.00"
                          />
                        ) : (
                          formatCurrency(it.allocatedAdditionalCost)
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold text-foreground">
                        {formatCurrency(it.totalLandedCost)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(it.landedUnitCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50 font-bold text-foreground border-t-2 border-border/80 text-xs">
                    <td className="py-3 px-3 uppercase tracking-wider text-[11px]">Grand Totals:</td>
                    <td className="py-3 px-3 text-center">
                      {liveTotals.items.reduce((s, i) => s + (Number(i.acceptedQuantity) || 0), 0)}
                    </td>
                    <td className="py-3 px-3 text-right">{formatCurrency(liveTotals.totalPurchaseCost)}</td>
                    <td className="py-3 px-3 text-right text-blue-600">{formatCurrency(liveTotals.totalAdditionalCost)}</td>
                    <td className="py-3 px-3.5 text-right text-sm">{formatCurrency(liveTotals.totalLandedCost)}</td>
                    <td className="py-3 px-3.5"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {formData.allocationMethod === 'Manual' && !liveTotals.manualValid && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle size={15} />
                Manual allocation sum must exactly equal Total Additional Cost ({formatCurrency(liveTotals.totalAdditionalCost)}).
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-border/50">
              <button
                type="button"
                onClick={() => setActiveTab('costs')}
                className="px-4 py-2 rounded-xl border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-semibold transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-2xs active:scale-95"
              >
                Back to Costs
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-md shadow-blue-600/30 hover:shadow-lg hover:shadow-blue-600/40 hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
              >
                <Save size={15} />
                {submitting ? 'Saving GRN...' : isEditing ? 'Save Changes' : 'Create GRN (Draft)'}
              </button>
            </div>
          </div>
        )}

      </form>

    </div>
  );
};

export default GRNForm;

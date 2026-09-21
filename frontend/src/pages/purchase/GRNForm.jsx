import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { FileText, Save, ArrowLeft, Trash2, Plus } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { FormField } from '../../components/common/FormField';
import { useCurrency } from '../../contexts/CurrencyContext';

const ALLOCATION_METHODS = [
  'By Quantity',
  'By Purchase Value',
  'By Weight',
  'Equal Distribution',
  'Manual'
];

const COST_TYPES = [
  'Transportation', 'Logistics', 'Labor', 'Packing', 
  'Handling', 'Insurance', 'Customs Duty', 'Other'
];

const GRNForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditing = !!id;
  const { formatCurrency, currencySymbol, currency: companyCurrency } = useCurrency();

  const [activeTab, setActiveTab] = useState('details'); // details, items, costs, summary

  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [pos, setPOs] = useState([]);
  const [products, setProducts] = useState([]);
  const [poSchedules, setPoSchedules] = useState([]);

  const [formData, setFormData] = useState({
    supplierId: '',
    branchId: '',
    purchaseOrderId: '',
    deliveryChallanNumber: '',
    vehicleNumber: '',
    notes: '',
    items: [],
    additionalCosts: [],
    allocationMethod: 'By Purchase Value'
  });

  const [poDetails, setPoDetails] = useState(null);
  const [liveTotals, setLiveTotals] = useState({
    totalPurchaseCost: 0,
    totalAdditionalCost: 0,
    totalLandedCost: 0,
    items: []
  });

  useEffect(() => {
    fetchInitialData();
    if (isEditing) {
      fetchGRN();
    }
  }, [id]);

  useEffect(() => {
    if (!isEditing && pos.length > 0) {
      const searchParams = new URLSearchParams(location.search);
      const urlPoId = searchParams.get('poId');
      if (urlPoId && formData.purchaseOrderId !== urlPoId) {
        handlePOChange(urlPoId);
      }
    }
  }, [pos, location.search, isEditing]);

  // Recalculate live totals whenever dependencies change
  useEffect(() => {
    calculateLiveTotals();
  }, [formData.items, formData.additionalCosts, formData.allocationMethod]);

  const fetchInitialData = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [suppRes, brRes, poRes, prodRes] = await Promise.all([
        axios.get('http://localhost:5000/api/v1/suppliers', { headers }),
        axios.get('http://localhost:5000/api/v1/branches', { headers }),
        axios.get('http://localhost:5000/api/v1/purchases', { headers }),
        axios.get('http://localhost:5000/api/v1/inventory/products', { headers })
      ]);
      setSuppliers(suppRes.data);
      setBranches(brRes.data);
      setPOs(poRes.data.filter(po => po.status === 'CONFIRMED' || po.status === 'PARTIALLY_RECEIVED'));
      setProducts(prodRes.data);
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    }
  };

  const fetchGRN = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/v1/grn/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const g = res.data;
      if (g.status !== 'DRAFT') {
        alert('Only DRAFT GRNs can be edited.');
        navigate(`/purchases/grn/${id}`);
        return;
      }
      setFormData({
        supplierId: g.supplierId?._id || '',
        branchId: g.branchId?._id || '',
        purchaseOrderId: g.purchaseOrderId?._id || '',
        deliveryChallanNumber: g.deliveryChallanNumber || '',
        vehicleNumber: g.vehicleNumber || '',
        notes: g.notes || '',
        items: g.items || [],
        additionalCosts: g.additionalCosts || [],
        allocationMethod: g.allocationMethod || 'By Purchase Value'
      });
    } catch (error) {
      console.error('Failed to fetch GRN:', error);
      alert('Failed to load GRN');
      navigate('/purchases/grn');
    }
  };

  const handlePOChange = async (poId) => {
    setFormData({ ...formData, purchaseOrderId: poId, items: [] });
    if (!poId) {
      setPoDetails(null);
      return;
    }
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const res = await axios.get(`http://localhost:5000/api/v1/purchases/${poId}`, { headers });
      const selectedPO = res.data;
      
      const schedulesRes = await axios.get(`http://localhost:5000/api/v1/purchases/${poId}/schedules`, { headers });
      const schedules = schedulesRes.data;
      setPoSchedules(schedules);

      if (selectedPO) {
        setPoDetails(selectedPO);
        
        let newItems = [];
        if (schedules && schedules.length > 0) {
           // Wait until branch is selected to populate items
        } else {
          newItems = (selectedPO.items || []).map(item => {
            const productObj = item.productId || {};
            const pId = productObj._id || productObj;
            const productFromState = products.find(p => p._id === pId);
            
            return {
              productId: pId,
              itemName: productObj.name || (productFromState ? productFromState.name : 'Unknown'),
              sku: productObj.sku || (productFromState ? (productFromState.sku || 'N/A') : 'UNK'),
              orderedQuantity: item.quantity || 1,
              alreadyReceivedQuantity: item.receivedQuantity || 0,
              remainingQuantity: Math.max(0, (item.quantity || 1) - (item.receivedQuantity || 0)),
              receivedQuantity: '',
              acceptedQuantity: '',
              rejectedQuantity: '',
              purchaseUnitPrice: item.unitPrice || productObj.purchasePrice || (productFromState?.purchasePrice) || 0,
              conversionFactor: item.conversionFactor || productObj.uomDetails?.purchaseConversionFactor || productFromState?.uomDetails?.purchaseConversionFactor || 1,
              isFromPO: true
            };
          });
        }

        setFormData(prev => ({
          ...prev,
          purchaseOrderId: poId,
          supplierId: selectedPO.supplierId?._id || selectedPO.supplierId,
          branchId: schedules.length > 0 ? '' : (selectedPO.branchId?._id || selectedPO.branchId),
          items: newItems
        }));
      }
    } catch (err) {
      console.error('Failed to fetch PO details:', err);
      alert('Failed to load PO details');
    }
  };

  const handleBranchChange = (newBranchId) => {
     let newItems = [...formData.items];
     
     if (poSchedules && poSchedules.length > 0 && poDetails) {
        // Filter schedules for this branch
        const branchSchedules = poSchedules.filter(s => 
          s.branchId?._id === newBranchId || s.branchId === newBranchId
        ).filter(s => s.status === 'PENDING' || s.status === 'PARTIALLY_RECEIVED');

        newItems = branchSchedules.map(schedule => {
           const productObj = schedule.productId || {};
           const pId = productObj._id || productObj;
           const productFromState = products.find(p => p._id === pId);
           const poItem = poDetails.items.find(i => 
             (i.productId?._id || i.productId) === pId
           );

           return {
              purchaseOrderScheduleId: schedule._id,
              productId: pId,
              itemName: productObj.name || (productFromState ? productFromState.name : 'Unknown'),
              sku: productObj.sku || (productFromState ? (productFromState.sku || 'N/A') : 'UNK'),
              orderedQuantity: schedule.scheduledQuantity,
              alreadyReceivedQuantity: schedule.receivedQuantity || 0,
              remainingQuantity: Math.max(0, schedule.scheduledQuantity - (schedule.receivedQuantity || 0)),
              receivedQuantity: '',
              acceptedQuantity: '',
              rejectedQuantity: '',
              purchaseUnitPrice: poItem?.unitCost || productObj.purchasePrice || (productFromState?.purchasePrice) || 0,
              conversionFactor: poItem?.conversionFactor || productObj.uomDetails?.purchaseConversionFactor || productFromState?.uomDetails?.purchaseConversionFactor || 1,
              isFromPO: true,
              isFromSchedule: true
           };
        });
     }

     setFormData({ ...formData, branchId: newBranchId, items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    if (field === 'orderedQuantity') {
      const ordered = Number(value) || 0;
      newItems[index].remainingQuantity = Math.max(0, ordered - (newItems[index].alreadyReceivedQuantity || 0));
      if (newItems[index].receivedQuantity !== '' && newItems[index].receivedQuantity > newItems[index].remainingQuantity) {
         newItems[index].receivedQuantity = newItems[index].remainingQuantity;
      }
    }

    if (field === 'receivedQuantity' || field === 'acceptedQuantity') {
      let parsedValue = value === '' ? '' : Number(value);
      if (field === 'receivedQuantity' && parsedValue !== '') {
        const remaining = newItems[index].remainingQuantity !== undefined ? newItems[index].remainingQuantity : Infinity;
        if (parsedValue > remaining) {
           alert('Received quantity cannot exceed remaining quantity');
           newItems[index].receivedQuantity = remaining;
           parsedValue = remaining;
        }
      }
      
      const rec = field === 'receivedQuantity' ? parsedValue : newItems[index].receivedQuantity;
      const acc = field === 'acceptedQuantity' ? parsedValue : newItems[index].acceptedQuantity;
      
      newItems[index].rejectedQuantity = (rec === '' || acc === '') ? '' : Math.max(0, (Number(rec) || 0) - (Number(acc) || 0));
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const addItemRow = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { 
        productId: '', itemName: 'Unknown', sku: 'UNK', 
        orderedQuantity: 1, alreadyReceivedQuantity: 0, remainingQuantity: 1, 
        receivedQuantity: '', acceptedQuantity: '', rejectedQuantity: '', 
        purchaseUnitPrice: 0, conversionFactor: 1, isFromPO: false 
      }]
    });
  };

  const removeItemRow = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateCost = (index, field, value) => {
    const newCosts = [...formData.additionalCosts];
    newCosts[index][field] = value;
    setFormData({ ...formData, additionalCosts: newCosts });
  };

  const addCostRow = () => {
    setFormData({
      ...formData,
      additionalCosts: [...formData.additionalCosts, {
        costType: 'Transportation',
        description: '',
        amount: 0,
        currency: companyCurrency || 'USD'
      }]
    });
  };

  const removeCostRow = (index) => {
    setFormData({
      ...formData,
      additionalCosts: formData.additionalCosts.filter((_, i) => i !== index)
    });
  };

  const roundTo6 = (num) => Math.round(Number(num) * 1000000) / 1000000;

  const calculateLiveTotals = () => {
    let tAdditional = 0;
    formData.additionalCosts.forEach(c => tAdditional += (Number(c.amount) || 0));
    
    let tPurchase = 0;
    const itemsPreview = formData.items.map(item => {
      const accQty = Number(item.acceptedQuantity) || 0;
      const price = Number(item.purchaseUnitPrice) || 0;
      const amt = roundTo6(accQty * price);
      tPurchase += amt;
      const cf = Number(item.conversionFactor) || 1;
      const baseQty = accQty * cf;
      const prod = products.find(p => p._id === item.productId);
      const weight = prod ? (Number(prod.weight) || 0) : 0;
      
      return { ...item, purchaseAmount: amt, baseQuantity: baseQty, weight: weight, calculatedWeight: baseQty * weight, allocatedAdditionalCost: 0, totalLandedCost: amt, landedUnitCost: 0 };
    });

    let remainingCost = tAdditional;
    const numItems = itemsPreview.length;
    let manualValid = true;

    if (tAdditional > 0 && numItems > 0) {
      if (formData.allocationMethod === 'By Quantity') {
        const totalBaseQty = itemsPreview.reduce((s, i) => s + i.baseQuantity, 0);
        if (totalBaseQty > 0) {
          itemsPreview.forEach((it, idx) => {
            if (idx === numItems - 1) it.allocatedAdditionalCost = roundTo6(remainingCost);
            else {
              const alloc = roundTo6(tAdditional * (it.baseQuantity / totalBaseQty));
              it.allocatedAdditionalCost = alloc;
              remainingCost -= alloc;
            }
          });
        }
      } else if (formData.allocationMethod === 'By Purchase Value') {
        if (tPurchase > 0) {
          itemsPreview.forEach((it, idx) => {
            if (idx === numItems - 1) it.allocatedAdditionalCost = roundTo6(remainingCost);
            else {
              const alloc = roundTo6(tAdditional * (it.purchaseAmount / tPurchase));
              it.allocatedAdditionalCost = alloc;
              remainingCost -= alloc;
            }
          });
        }
      } else if (formData.allocationMethod === 'By Weight') {
        const totalWeight = itemsPreview.reduce((s, i) => s + i.calculatedWeight, 0);
        if (totalWeight > 0) {
          itemsPreview.forEach((it, idx) => {
            if (idx === numItems - 1) it.allocatedAdditionalCost = roundTo6(remainingCost);
            else {
              const alloc = roundTo6(tAdditional * (it.calculatedWeight / totalWeight));
              it.allocatedAdditionalCost = alloc;
              remainingCost -= alloc;
            }
          });
        }
      } else if (formData.allocationMethod === 'Equal Distribution') {
        itemsPreview.forEach((it, idx) => {
          if (idx === numItems - 1) it.allocatedAdditionalCost = roundTo6(remainingCost);
          else {
            const alloc = roundTo6(tAdditional / numItems);
            it.allocatedAdditionalCost = alloc;
            remainingCost -= alloc;
          }
        });
      } else if (formData.allocationMethod === 'Manual') {
        let manTotal = 0;
        itemsPreview.forEach(it => manTotal += (Number(it.manualAllocation) || 0));
        itemsPreview.forEach(it => {
          it.allocatedAdditionalCost = Number(it.manualAllocation) || 0;
        });
        if (Math.abs(manTotal - tAdditional) > 0.001) manualValid = false;
      }
    }

    let tLanded = 0;
    itemsPreview.forEach(it => {
      it.totalLandedCost = roundTo6(it.purchaseAmount + it.allocatedAdditionalCost);
      if (it.baseQuantity > 0) {
        it.landedUnitCost = roundTo6(it.totalLandedCost / it.baseQuantity);
      }
      tLanded += it.totalLandedCost;
    });

    setLiveTotals({
      totalPurchaseCost: roundTo6(tPurchase),
      totalAdditionalCost: roundTo6(tAdditional),
      totalLandedCost: roundTo6(tLanded),
      items: itemsPreview,
      manualValid
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      for (const item of formData.items) {
        if (!item.productId) return alert('Please select a product for all items.');
        
        if (item.receivedQuantity === '' || item.receivedQuantity === undefined || item.receivedQuantity === null) {
          setActiveTab('items');
          return alert(`Please enter the Received Quantity for item: ${item.itemName}`);
        }
        
        if (item.acceptedQuantity === '' || item.acceptedQuantity === undefined || item.acceptedQuantity === null) {
          setActiveTab('items');
          return alert(`Please enter the Accepted Quantity for item: ${item.itemName}`);
        }

        if (Number(item.acceptedQuantity) + Number(item.rejectedQuantity || 0) > Number(item.receivedQuantity)) {
           setActiveTab('items');
           return alert('Accepted + Rejected cannot exceed Received Quantity');
        }
      }
      if (formData.allocationMethod === 'Manual' && !liveTotals.manualValid) {
        return alert('Manual allocation total must exactly equal Total Additional Cost.');
      }
      if (formData.allocationMethod === 'By Weight') {
        const hasMissingWeight = liveTotals.items.some(i => i.weight <= 0);
        if (hasMissingWeight && formData.additionalCosts.length > 0) {
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
          allocatedAdditionalCost: liveTotals.items[index].allocatedAdditionalCost
        }));
      }

      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      if (isEditing) {
        await axios.put(`http://localhost:5000/api/v1/grn/${id}`, payload, { headers });
      } else {
        await axios.post('http://localhost:5000/api/v1/grn', payload, { headers });
      }
      
      navigate('/purchases/grn');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save GRN');
    }
  };

  const TabButton = ({ id, label }) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
        activeTab === id 
          ? 'border-blue-600 text-blue-600' 
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6 max-w-6xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/purchases/grn')} className="text-muted-foreground p-2">
            <ArrowLeft size={20} />
          </Button>
          <PageHeader 
            title={isEditing ? `Edit Draft GRN` : "New Goods Receipt Note"}
            description="Receive goods and calculate landed costs."
            icon={<FileText className="text-blue-600 h-8 w-8" />}
          />
        </div>
      </div>

      <div className="flex gap-2 border-b border-border">
        <TabButton id="details" label="1. GRN Details" />
        <TabButton id="items" label="2. Items" />
        <TabButton id="costs" label="3. Additional Costs" />
        <TabButton id="summary" label="4. Landed Cost Summary" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 mt-4">
        
        {/* TAB: DETAILS */}
        {activeTab === 'details' && (
          <Card className="p-6">
            <h3 className="font-bold text-lg mb-4">General Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Purchase Order (Optional)">
                <Select value={formData.purchaseOrderId} onChange={e => handlePOChange(e.target.value)}>
                  <option value="">No PO (Manual GRN)</option>
                  {pos.map(po => <option key={po._id} value={po._id}>{po.purchaseOrderNumber || `PO-${po._id.slice(-6).toUpperCase()}`}</option>)}
                </Select>
              </FormField>

              <FormField label="Supplier">
                <Select required disabled={!!formData.purchaseOrderId} value={formData.supplierId} onChange={e => setFormData({...formData, supplierId: e.target.value})}>
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </Select>
              </FormField>

              <FormField label="Deliver To Branch/Warehouse">
                <Select required disabled={!!formData.purchaseOrderId && poSchedules.length === 0} value={formData.branchId} onChange={e => handleBranchChange(e.target.value)}>
                  <option value="">Select Branch</option>
                  {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </Select>
                {poSchedules.length > 0 && (
                   <span className="text-xs text-blue-600 mt-1 block">Select branch to view pending schedules</span>
                )}
              </FormField>

              <FormField label="Delivery Challan No.">
                <Input value={formData.deliveryChallanNumber} onChange={e => setFormData({...formData, deliveryChallanNumber: e.target.value})} placeholder="e.g. DC-12345" />
              </FormField>

              <FormField label="Vehicle Number">
                <Input value={formData.vehicleNumber} onChange={e => setFormData({...formData, vehicleNumber: e.target.value})} placeholder="e.g. AB-12-CD-3456" />
              </FormField>
              
              <FormField label="Notes / Remarks">
                <textarea 
                  className="w-full p-2 rounded-md border border-input bg-background text-sm"
                  rows={3}
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  placeholder="Any additional information..."
                />
              </FormField>
            </div>
          </Card>
        )}

        {/* TAB: ITEMS */}
        {activeTab === 'items' && (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-lg">Receipt Items</h3>
               <Button type="button" variant="outline" onClick={addItemRow} size="sm" leftIcon={<Plus size={16} />}>Add Item</Button>
            </div>
            
            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="flex flex-wrap gap-4 items-start bg-muted/10 p-4 rounded-lg border border-border">
                  <div className="flex-1 min-w-[200px]">
                    <FormField label="Product">
                      {item.isFromPO || formData.purchaseOrderId ? (
                         <Input readOnly value={`${item.itemName} (${item.sku})`} className="bg-muted text-xs" />
                      ) : (
                        <Select 
                          required 
                          value={item.productId} 
                          onChange={e => {
                            const prod = products.find(p => p._id === e.target.value);
                            updateItem(index, 'productId', e.target.value);
                            if (prod) {
                              updateItem(index, 'itemName', prod.name);
                              updateItem(index, 'sku', prod.sku || 'N/A');
                              updateItem(index, 'purchaseUnitPrice', prod.purchasePrice || 0);
                              updateItem(index, 'conversionFactor', prod.uomDetails?.purchaseConversionFactor || 1);
                            }
                          }}
                        >
                          <option value="">Select Product</option>
                          {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
                        </Select>
                      )}
                    </FormField>
                  </div>
                  
                  <div className="w-24 shrink-0">
                    <FormField label="Pur. Price">
                       <Input type="number" min="0" step="0.01" value={item.purchaseUnitPrice} onChange={e => updateItem(index, 'purchaseUnitPrice', e.target.value)} required />
                    </FormField>
                  </div>

                  <div className="w-20 shrink-0">
                    <FormField label={item.isFromSchedule ? "Scheduled" : "Ordered"}>
                      <Input type="number" readOnly={item.isFromPO || !!formData.purchaseOrderId} className={item.isFromPO || formData.purchaseOrderId ? "bg-muted" : ""} min="1" required value={item.orderedQuantity} onChange={e => updateItem(index, 'orderedQuantity', e.target.value === '' ? '' : Number(e.target.value))} />
                    </FormField>
                  </div>

                  <div className="w-24 shrink-0">
                    <FormField label="Received">
                      <Input type="number" min="0" required value={item.receivedQuantity} onChange={e => updateItem(index, 'receivedQuantity', e.target.value === '' ? '' : Number(e.target.value))} />
                      <div className="text-[10px] text-muted-foreground mt-1">Remaining: {item.remainingQuantity}</div>
                    </FormField>
                  </div>

                  <div className="w-24 shrink-0">
                    <FormField label="Accepted">
                      <Input type="number" min="0" required value={item.acceptedQuantity} onChange={e => updateItem(index, 'acceptedQuantity', e.target.value === '' ? '' : Number(e.target.value))} />
                    </FormField>
                  </div>

                  <div className="w-20 shrink-0">
                    <FormField label="Rejected">
                      <Input type="number" readOnly className="bg-muted" value={item.rejectedQuantity} />
                    </FormField>
                  </div>

                  <Button type="button" variant="outline" onClick={() => removeItemRow(index)} className="mt-7 h-10 px-3 text-error hover:bg-error/10 hover:text-error border-error/50 shrink-0">
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
              {formData.items.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">No items added yet.</div>
              )}
            </div>
          </Card>
        )}

        {/* TAB: COSTS */}
        {activeTab === 'costs' && (
          <Card className="p-6">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-lg">Additional Costs</h3>
               <div className="flex items-center gap-4">
                 <FormField label="Allocation Method">
                   <Select value={formData.allocationMethod} onChange={e => setFormData({...formData, allocationMethod: e.target.value})}>
                     {ALLOCATION_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                   </Select>
                 </FormField>
                 <Button type="button" variant="outline" onClick={addCostRow} size="sm" className="mt-6" leftIcon={<Plus size={16} />}>Add Cost</Button>
               </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm mb-6">
                <thead className="bg-muted/30 border-b">
                  <tr>
                    <th className="p-3 w-1/4">Cost Type</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 w-32">Amount</th>
                    <th className="p-3 w-24">Currency</th>
                    <th className="p-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.additionalCosts.map((cost, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">
                        <Select value={cost.costType} onChange={e => updateCost(idx, 'costType', e.target.value)}>
                          {COST_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input value={cost.description} onChange={e => updateCost(idx, 'description', e.target.value)} placeholder="Notes..." />
                      </td>
                      <td className="p-2">
                        <Input type="number" min="0" step="0.01" value={cost.amount} onChange={e => updateCost(idx, 'amount', e.target.value)} />
                      </td>
                      <td className="p-2">
                        <Input value={cost.currency} onChange={e => updateCost(idx, 'currency', e.target.value)} />
                      </td>
                      <td className="p-2">
                         <Button type="button" variant="ghost" onClick={() => removeCostRow(idx)} className="text-error hover:bg-error/10 p-2"><Trash2 size={16}/></Button>
                      </td>
                    </tr>
                  ))}
                  {formData.additionalCosts.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-muted-foreground">No additional costs added.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end text-lg font-bold border-t pt-4">
              <span>Total Additional Cost: </span>
              <span className="ml-4">{currencySymbol}{liveTotals.totalAdditionalCost.toFixed(2)}</span>
            </div>
          </Card>
        )}

        {/* TAB: SUMMARY */}
        {activeTab === 'summary' && (
          <Card className="p-6">
            <h3 className="font-bold text-lg mb-4">Landed Cost Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm mb-6">
                <thead className="bg-muted/30 border-b">
                  <tr>
                    <th className="p-3">Product</th>
                    <th className="p-3 text-right">Accepted (Base)</th>
                    <th className="p-3 text-right">Purchase Amount</th>
                    <th className="p-3 text-right text-blue-600">Allocated Cost</th>
                    <th className="p-3 text-right text-emerald-600 font-bold">Total Landed</th>
                    <th className="p-3 text-right text-emerald-600 font-bold">Unit Landed</th>
                  </tr>
                </thead>
                <tbody>
                  {liveTotals.items.map((it, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/10">
                      <td className="p-3 font-medium">{it.itemName} <br/><span className="text-xs text-muted-foreground">{it.sku}</span></td>
                      <td className="p-3 text-right">{it.baseQuantity}</td>
                      <td className="p-3 text-right">{currencySymbol}{it.purchaseAmount.toFixed(2)}</td>
                      <td className="p-3 text-right text-blue-600 bg-blue-50/30">
                        {formData.allocationMethod === 'Manual' ? (
                          <Input 
                            type="number" 
                            className="w-24 ml-auto text-right" 
                            value={formData.items[idx].manualAllocation || ''} 
                            onChange={e => updateItem(idx, 'manualAllocation', e.target.value)} 
                            placeholder="0.00" 
                          />
                        ) : (
                          `${currencySymbol}${it.allocatedAdditionalCost.toFixed(2)}`
                        )}
                      </td>
                      <td className="p-3 text-right text-emerald-600 font-bold bg-emerald-50/30">{currencySymbol}{it.totalLandedCost.toFixed(2)}</td>
                      <td className="p-3 text-right text-emerald-600 font-bold bg-emerald-50/30">{currencySymbol}{it.landedUnitCost.toFixed(2)} / base</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/20 font-bold text-base">
                    <td className="p-3" colSpan={2}>GRAND TOTAL</td>
                    <td className="p-3 text-right">{currencySymbol}{liveTotals.totalPurchaseCost.toFixed(2)}</td>
                    <td className="p-3 text-right text-blue-600">{currencySymbol}{liveTotals.totalAdditionalCost.toFixed(2)}</td>
                    <td className="p-3 text-right text-emerald-600">{currencySymbol}{liveTotals.totalLandedCost.toFixed(2)}</td>
                    <td className="p-3"></td>
                  </tr>
                </tbody>
              </table>
              {formData.allocationMethod === 'Manual' && !liveTotals.manualValid && (
                <div className="p-3 bg-error/10 text-error border border-error/20 rounded-md text-sm font-medium">
                  Manual allocation mismatch! The sum of manual allocations must exactly equal the Total Additional Cost ({currencySymbol}{liveTotals.totalAdditionalCost.toFixed(2)}).
                </div>
              )}
            </div>
          </Card>
        )}

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border flex justify-end gap-3 px-[10%] z-10 shadow-lg">
          <Button type="button" variant="outline" onClick={() => navigate('/purchases/grn')}>Cancel</Button>
          <Button type="submit" leftIcon={<Save size={18} />}>
            {isEditing ? 'Save Changes' : 'Create GRN (Draft)'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default GRNForm;

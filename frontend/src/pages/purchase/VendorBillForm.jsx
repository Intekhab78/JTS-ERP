import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
const VendorBillForm = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [pos, setPos] = useState([]);
  
  const [formData, setFormData] = useState({
    supplierId: '',
    branchId: '',
    purchaseOrderId: '',
    grnIds: [],
    billDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    items: [],
    currency: 'AED',
    subtotal: 0,
    grandTotal: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
        const [supRes, brRes, poRes] = await Promise.all([
          axios.get('/api/v1/suppliers', { headers }),
          axios.get('/api/v1/branches', { headers }),
          axios.get('/api/v1/purchases', { headers })
        ]);
        setSuppliers(supRes.data);
        setBranches(brRes.data);
        setPos(poRes.data.filter(po => po.status === 'CONFIRMED' || po.status === 'PARTIALLY_RECEIVED' || po.status === 'RECEIVED'));
      } catch (error) {
        alert('Failed to load form data');
      }
    };
    fetchData();
  }, []);

  const handlePoChange = async (poId) => {
    setFormData(prev => ({ ...prev, purchaseOrderId: poId }));
    if (!poId) return;

    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      // Fetch PO details to get the item prices
      const poRes = await axios.get(`/api/v1/purchases/${poId}`, { headers });
      const poItems = poRes.data.items || [];

      // Auto-fetch related GRNs for this PO to find billable items
      const { data: grns } = await axios.get('/api/v1/grn', { headers });
      const validGrns = grns.filter(g => g.purchaseOrderId?._id === poId && g.status === 'VALIDATED');
      
      const billableItems = [];
      let initialSubtotal = 0;

      validGrns.forEach(grn => {
        grn.items.forEach(item => {
          if (item.acceptedQuantity > 0) {
            const productId = item.productId._id || item.productId;
            // Find corresponding PO item to get the price
            const poItem = poItems.find(p => (p.productId?._id || p.productId) === productId);
            const unitPrice = poItem ? (poItem.unitCost || 0) : 0;
            const subTotal = item.acceptedQuantity * unitPrice;
            
            initialSubtotal += subTotal;

            billableItems.push({
              productId,
              description: item.itemName || 'Item',
              quantity: item.acceptedQuantity,
              uom: item.uom || 'PCS',
              unitPrice,
              taxAmount: 0,
              subTotal
            });
          }
        });
      });

      setFormData(prev => ({ 
        ...prev, 
        grnIds: validGrns.map(g => g._id),
        items: billableItems,
        subtotal: initialSubtotal,
        grandTotal: initialSubtotal
      }));
      alert(`Loaded ${billableItems.length} billable items from GRNs`);
    } catch (error) {
      alert('Failed to load related GRNs');
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = field === 'quantity' || field === 'unitPrice' ? Number(value) : value;
    newItems[index].subTotal = newItems[index].quantity * newItems[index].unitPrice;
    
    const subtotal = newItems.reduce((sum, item) => sum + item.subTotal, 0);
    setFormData(prev => ({ ...prev, items: newItems, subtotal, grandTotal: subtotal }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      await axios.post('/api/v1/vendor-bills', formData, { headers });
      alert('Vendor Bill created successfully');
      navigate('/purchases/bills');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create Vendor Bill');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Vendor Bill</h1>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Branch</label>
            <select required value={formData.branchId} onChange={e => setFormData({...formData, branchId: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              <option value="">Select Branch</option>
              {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Supplier</label>
            <select required value={formData.supplierId} onChange={e => setFormData({...formData, supplierId: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              <option value="">Select Supplier</option>
              {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Purchase Order</label>
            <select value={formData.purchaseOrderId} onChange={e => handlePoChange(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              <option value="">Select PO (Optional)</option>
              {pos.map(p => <option key={p._id} value={p._id}>{p.purchaseOrderNumber}</option>)}
            </select>
          </div>
          
          <div>
             <label className="block text-sm font-medium text-gray-700">Due Date</label>
             <input type="date" required value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mt-6 mb-2">Items</h3>
          {formData.items.length === 0 && <p className="text-sm text-gray-500">Select a PO to auto-populate from validated GRNs.</p>}
          <div className="space-y-4">
            {formData.items.map((item, idx) => (
              <div key={idx} className="flex space-x-4 items-end border p-3 rounded">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700">Description</label>
                  <input type="text" value={item.description} disabled className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm bg-gray-50" />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-gray-700">Qty (Billed)</label>
                  <input type="number" max={item.quantity} value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                </div>
                <div className="w-32">
                  <label className="block text-xs font-medium text-gray-700">Unit Price</label>
                  <input type="number" value={item.unitPrice} onChange={e => handleItemChange(idx, 'unitPrice', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm" />
                </div>
                <div className="w-32">
                  <label className="block text-xs font-medium text-gray-700">Subtotal</label>
                  <div className="mt-2 font-medium">{item.subTotal.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-5 border-t border-gray-200">
          <div className="text-right">
             <p className="text-lg font-bold">Total: {formData.currency} {formData.grandTotal.toFixed(2)}</p>
             <button type="submit" className="mt-4 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
               Save Vendor Bill
             </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default VendorBillForm;

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Select from 'react-select';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, Save } from 'lucide-react';
export default function SalesReturnForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [deliveryNotes, setDeliveryNotes] = useState([]);
  const [returnableInfo, setReturnableInfo] = useState({});
  const [selectedDN, setSelectedDN] = useState(null);

  const [formData, setFormData] = useState({
    deliveryNoteId: '',
    items: [],
    notes: ''
  });

  useEffect(() => {
    fetchDeliveryNotes();
    if (isEdit) fetchReturnData();
  }, [id]);

  const fetchDeliveryNotes = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/delivery-notes', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Only validated (DELIVERED/PARTIALLY_DELIVERED) can be returned
      const validDNs = res.data.filter(dn => ['DELIVERED', 'PARTIALLY_DELIVERED'].includes(dn.status));
      setDeliveryNotes(validDNs);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchReturnData = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/v1/sales/returns/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setFormData(res.data);
      if (res.data.deliveryNoteId) {
        fetchReturnableInfo(res.data.deliveryNoteId._id || res.data.deliveryNoteId);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchReturnableInfo = async (dnId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/v1/sales/returns/returnable/${dnId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setReturnableInfo(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDNSelect = async (dnId) => {
    const dn = deliveryNotes.find(d => d._id === dnId);
    setSelectedDN(dn);
    setFormData({ ...formData, deliveryNoteId: dnId, items: [] });
    
    if (dnId) {
      await fetchReturnableInfo(dnId);
      const initialItems = dn.items.map(item => ({
        productId: item.productId._id || item.productId,
        itemName: item.itemName,
        sku: item.sku,
        uom: item.uom,
        returnQuantity: 0,
        returnReason: ''
      }));
      setFormData(prev => ({ ...prev, items: initialItems }));
    }
  };

  const handleQuantityChange = (index, val) => {
    const items = [...formData.items];
    const max = returnableInfo[items[index].productId]?.returnable || 0;
    
    let qty = Number(val);
    if (qty > max) qty = max;
    if (qty < 0) qty = 0;
    
    items[index].returnQuantity = qty;
    setFormData({ ...formData, items });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        items: formData.items.filter(i => i.returnQuantity > 0)
      };

      if (payload.items.length === 0) {
        alert('Please specify at least one item to return with quantity > 0');
        return;
      }

      const method = isEdit ? 'put' : 'post';
      const url = isEdit 
        ? `http://localhost:5000/api/v1/sales/returns/${id}`
        : 'http://localhost:5000/api/v1/sales/returns';

      await axios[method](url, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      navigate('/sales/returns');
    } catch (error) {
      alert(error.response?.data?.message || 'Error saving return');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/sales/returns')} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full border shadow-sm">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-slate-800">
          {isEdit ? 'Edit Sales Return' : 'New Sales Return'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Note</label>
              <Select
                isDisabled={isEdit}
                options={deliveryNotes.map(dn => ({
                  value: dn._id,
                  label: `${dn.deliveryNoteNumber} - ${dn.customerId?.name}`
                }))}
                value={formData.deliveryNoteId ? {
                  value: formData.deliveryNoteId?._id || formData.deliveryNoteId,
                  label: deliveryNotes.find(dn => dn._id === (formData.deliveryNoteId?._id || formData.deliveryNoteId))
                    ? `${deliveryNotes.find(dn => dn._id === (formData.deliveryNoteId?._id || formData.deliveryNoteId)).deliveryNoteNumber} - ${deliveryNotes.find(dn => dn._id === (formData.deliveryNoteId?._id || formData.deliveryNoteId)).customerId?.name}`
                    : 'Select Delivery Note...'
                } : null}
                onChange={(selectedOption) => handleDNSelect(selectedOption ? selectedOption.value : '')}
                placeholder="Select Delivery Note..."
                isClearable
                className="react-select-container"
                classNamePrefix="react-select"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Internal Notes</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
        </div>

        {formData.items.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-slate-50">
              <h2 className="text-sm font-semibold text-slate-700 uppercase">Return Items</h2>
            </div>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Item</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500">Delivered</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500">Returned</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500">Returnable</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500">Qty to Return</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {formData.items.map((item, idx) => {
                  const info = returnableInfo[item.productId] || { deliveredQuantity: 0, alreadyReturned: 0, returnable: 0 };
                  
                  // Adjust returnable logic for Edit mode (we add current item.returnQuantity to returnable so user can scale it down/up)
                  const currentItemReturnQtyInEdit = isEdit ? (formData.items[idx].returnQuantity || 0) : 0;
                  const displayReturnable = isEdit ? (info.returnable + currentItemReturnQtyInEdit) : info.returnable;

                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-800">
                        {item.itemName} <span className="text-slate-500 font-normal">({item.sku})</span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-slate-600">
                        {info.deliveredQuantity}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-slate-600">
                        {info.alreadyReturned}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-indigo-600 font-medium">
                        {displayReturnable}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <input
                          type="number"
                          min="0"
                          max={displayReturnable}
                          value={item.returnQuantity}
                          onChange={(e) => handleQuantityChange(idx, e.target.value)}
                          className="w-24 p-1 border rounded text-right"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => navigate('/sales/returns')}>
            Cancel
          </Button>
          <Button type="submit" leftIcon={<Save size={18} />}>
            {isEdit ? 'Update Return' : 'Create Return'}
          </Button>
        </div>
      </form>
    </div>
  );
}

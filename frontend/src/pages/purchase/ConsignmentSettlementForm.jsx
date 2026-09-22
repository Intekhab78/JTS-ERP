import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import FormField from '../../components/common/FormField';
import { Card } from '../../components/common/Card';
import { useCurrency } from '../../contexts/CurrencyContext';

export default function ConsignmentSettlementForm() {
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const [consignments, setConsignments] = useState([]);
  const [selectedConsignmentId, setSelectedConsignmentId] = useState('');
  const [stockItems, setStockItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLookups();
  }, []);

  useEffect(() => {
    if (selectedConsignmentId) {
      loadConsignmentStock(selectedConsignmentId);
    } else {
      setStockItems([]);
    }
  }, [selectedConsignmentId]);

  const fetchLookups = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const consRes = await axios.get('/api/v1/consignments?limit=100', { headers });
      setConsignments(consRes.data.data.filter(c => c.status === 'ACTIVE' || c.status === 'CLOSED'));
    } catch (error) {
      console.error('Failed to load lookups', error);
    }
  };

  const loadConsignmentStock = async (consignmentId) => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      
      // We need to find stock lines for this consignment that have (consumed - settled) > 0
      const stockRes = await axios.get(`/api/v1/consignment-stock/all?limit=1000`, { headers });
      const relevantStock = stockRes.data.data.filter(s => 
        s.consignmentId?._id === consignmentId && (s.consumedQuantity - s.settledQuantity) > 0
      );

      // Also get the consignment terms to get the unit price
      const consRes = await axios.get(`/api/v1/consignments/${consignmentId}`, { headers });
      const consTerms = consRes.data.data.items;

      const items = relevantStock.map(stock => {
        const term = consTerms.find(t => t.productId._id === stock.productId._id);
        const eligible = stock.consumedQuantity - stock.settledQuantity;
        return {
          productId: stock.productId._id,
          productName: stock.productId.name,
          sku: stock.productId.sku,
          branchId: stock.branchId._id,
          branchName: stock.branchId.name,
          eligibleQuantity: eligible,
          settlementQuantity: eligible, // Default to settling all eligible
          unitPrice: term?.settlementPrice || term?.unitPrice || 0
        };
      });

      setStockItems(items);
    } catch (error) {
      console.error('Failed to load stock', error);
    }
  };

  const updateItem = (index, value) => {
    const newItems = [...stockItems];
    newItems[index].settlementQuantity = value;
    setStockItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedConsignmentId) return alert('Select a consignment');
    
    const itemsToSettle = stockItems.filter(i => i.settlementQuantity > 0);
    if (itemsToSettle.length === 0) return alert('No valid items to settle');

    for (const item of itemsToSettle) {
      if (item.settlementQuantity > item.eligibleQuantity) {
        return alert(`Cannot settle more than ${item.eligibleQuantity} for ${item.productName}`);
      }
    }

    setLoading(true);
    try {
      const payload = {
        consignmentId: selectedConsignmentId,
        notes,
        items: itemsToSettle
      };

      const res = await axios.post(`/api/v1/consignment-settlements`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Auto-validate it for simplicity since we don't have a detail screen built yet
      await axios.post(`/api/v1/consignment-settlements/${res.data.data._id}/validate`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      alert('Settlement created and validated successfully.');
      navigate(`/purchases/consignments/settlements`);
    } catch (error) {
      alert(error.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = stockItems.reduce((sum, item) => sum + (Number(item.settlementQuantity || 0) * item.unitPrice), 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate('/purchases/consignments/settlements')} className="p-2">
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">New Consignment Settlement</h1>
          <p className="text-slate-600">Calculate supplier liability based on consumed consignment stock.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Consignment Agreement *" required>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={selectedConsignmentId}
                onChange={e => setSelectedConsignmentId(e.target.value)}
                required
              >
                <option value="">Select agreement...</option>
                {consignments.map(c => <option key={c._id} value={c._id}>{c.consignmentNumber} - {c.supplierId?.name}</option>)}
              </select>
            </FormField>
          </div>
          <div className="mt-4">
            <FormField label="Notes">
              <textarea
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="2"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </FormField>
          </div>
        </Card>

        {selectedConsignmentId && (
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Eligible Consumed Stock</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4 font-medium">Product</th>
                    <th className="p-4 font-medium">Branch</th>
                    <th className="p-4 font-medium text-right">Eligible Qty</th>
                    <th className="p-4 font-medium text-right">Unit Price</th>
                    <th className="p-4 font-medium text-right">Settlement Qty</th>
                    <th className="p-4 font-medium text-right text-blue-600">Line Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {stockItems.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/50">
                      <td className="p-4">
                        <div className="font-medium text-slate-900">{item.productName}</div>
                        <div className="text-xs text-slate-500">SKU: {item.sku}</div>
                      </td>
                      <td className="p-4 text-slate-600">{item.branchName}</td>
                      <td className="p-4 text-right font-medium text-slate-700">{item.eligibleQuantity}</td>
                      <td className="p-4 text-right text-slate-600">{formatAmount(item.unitPrice)}</td>
                      <td className="p-4">
                        <input
                          type="number"
                          min="0"
                          max={item.eligibleQuantity}
                          step="0.01"
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 text-right"
                          value={item.settlementQuantity}
                          onChange={(e) => updateItem(index, Number(e.target.value))}
                        />
                      </td>
                      <td className="p-4 text-right font-bold text-blue-600">
                        {formatAmount((Number(item.settlementQuantity) || 0) * item.unitPrice)}
                      </td>
                    </tr>
                  ))}
                  {stockItems.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-500 italic">
                        No consumed stock is eligible for settlement on this agreement.
                      </td>
                    </tr>
                  )}
                </tbody>
                {stockItems.length > 0 && (
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td colSpan="5" className="p-4 text-right font-bold text-slate-700">Total Settlement Value:</td>
                      <td className="p-4 text-right font-bold text-slate-900 text-lg">{formatAmount(totalAmount)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={() => navigate('/purchases/consignments/settlements')}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading} disabled={stockItems.length === 0} leftIcon={<CheckCircle size={16}/>}>
            Create & Validate Settlement
          </Button>
        </div>
      </form>
    </div>
  );
}

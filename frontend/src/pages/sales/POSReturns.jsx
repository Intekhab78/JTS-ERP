import React, { useState } from 'react';
import axios from 'axios';
import { Search, Package, AlertCircle } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import ManagerApprovalModal from '../../components/auth/ManagerApprovalModal';

const POSReturns = () => {
  const [receiptNumber, setReceiptNumber] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [returnItems, setReturnItems] = useState({});
  const [refundAllocations, setRefundAllocations] = useState([{ method: 'CASH', amount: 0 }]);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [reason, setReason] = useState('');
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [recentReturns, setRecentReturns] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  React.useEffect(() => {
    fetchRecentReturns();
  }, []);

  const fetchRecentReturns = async () => {
    try {
      setLoadingRecent(true);
      const res = await axios.get('/api/v1/pos/returns', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRecentReturns(res.data);
    } catch (err) {
      console.error('Failed to fetch recent returns', err);
    } finally {
      setLoadingRecent(false);
    }
  };

  const searchOrder = async (receiptNum = receiptNumber) => {
    if (!receiptNum) return;
    setLoading(true);
    setError('');
    setOrder(null);
    setReturnItems({});
    try {
      const res = await axios.get(`/api/v1/pos/orders?receiptNumber=${receiptNum}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const orders = res.data;
      const found = orders.find(o => o.receiptNumber === receiptNum);
      if (found) {
        // Fetch full details including returns
        const detailRes = await axios.get(`/api/v1/pos/orders/${found._id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        const fullOrder = detailRes.data.order;
        const pastReturns = detailRes.data.returns || [];
        
        // Calculate previously returned quantities
        const returnedQtys = {};
        pastReturns.forEach(pr => {
          pr.returnItems.forEach(item => {
            const pid = typeof item.productId === 'object' ? item.productId._id : item.productId;
            returnedQtys[pid] = (returnedQtys[pid] || 0) + item.quantity;
          });
        });

        fullOrder.pastReturns = pastReturns;
        fullOrder.returnedQtys = returnedQtys;
        setOrder(fullOrder);

        const initReturns = {};
        fullOrder.items.forEach(item => {
          const max = item.quantity - (returnedQtys[item.productId] || 0);
          initReturns[item.productId] = { quantity: 0, max: Math.max(0, max) };
        });
        setReturnItems(initReturns);
      } else {
        setError('Order not found with that receipt number.');
      }
    } catch (err) {
      setError('Error searching for order.');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnQtyChange = (productId, qtyStr) => {
    const qty = parseInt(qtyStr) || 0;
    const max = returnItems[productId].max;
    if (qty >= 0 && qty <= max) {
      setReturnItems({ ...returnItems, [productId]: { ...returnItems[productId], quantity: qty } });
    }
  };

  const calculateTotalRefund = () => {
    if (!order) return 0;
    let total = 0;
    order.items.forEach(item => {
      const retQty = returnItems[item.productId]?.quantity || 0;
      if (retQty > 0) {
        const unitRefund = item.total / item.quantity;
        total += retQty * unitRefund;
      }
    });
    return total;
  };

  const handleAddAllocation = () => {
    setRefundAllocations([...refundAllocations, { method: 'CASH', amount: 0 }]);
  };

  const handleRemoveAllocation = (index) => {
    setRefundAllocations(refundAllocations.filter((_, i) => i !== index));
  };

  const handleAllocationChange = (index, field, value) => {
    const newAllocations = [...refundAllocations];
    if (field === 'amount') {
      newAllocations[index][field] = parseFloat(value) || 0;
    } else {
      newAllocations[index][field] = value;
    }
    setRefundAllocations(newAllocations);
  };

  const calculateAllocatedTotal = () => {
    return refundAllocations.reduce((sum, alloc) => sum + (alloc.amount || 0), 0);
  };

  const processReturn = async (overrideToken = null) => {
    const itemsToReturn = Object.entries(returnItems)
      .filter(([_, data]) => data.quantity > 0)
      .map(([productId, data]) => ({
        productId,
        quantity: data.quantity
      }));

    if (itemsToReturn.length === 0) {
      return alert('Please select at least one item to return.');
    }

    const calculatedRefund = calculateTotalRefund();
    const allocatedRefund = calculateAllocatedTotal();

    if (Math.abs(calculatedRefund - allocatedRefund) > 0.01) {
      return alert(`Allocated amount ($${allocatedRefund.toFixed(2)}) must exactly match the refund total ($${calculatedRefund.toFixed(2)}).`);
    }

    let key = idempotencyKey;
    if (!key) {
      key = crypto.randomUUID();
      setIdempotencyKey(key);
    }

    try {
      const payload = {
        originalOrderId: order._id,
        returnItems: itemsToReturn,
        refundAllocations,
        reason,
        idempotencyKey: key
      };
      if (overrideToken) {
        payload.overrideToken = overrideToken;
      }

      await axios.post('/api/v1/pos/returns', payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Return processed successfully!');
      setOrder(null);
      setReceiptNumber('');
      setIdempotencyKey('');
      setRefundAllocations([{ method: 'CASH', amount: 0 }]);
      setIsManagerModalOpen(false);
      fetchRecentReturns();
    } catch (err) {
      if (err.response?.data?.requiresOverride) {
        setIsManagerModalOpen(true);
      } else {
        alert(err.response?.data?.message || 'Failed to process return');
      }
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Package className="text-blue-600" size={24} />
        <h1 className="text-2xl font-bold">Process POS Return</h1>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <Input 
              placeholder="Scan or enter Receipt Number (e.g., POS-2026-000001)"
              value={receiptNumber}
              onChange={e => setReceiptNumber(e.target.value)}
              className="flex-1"
            />
            <Button onClick={searchOrder} disabled={loading} className="gap-2">
              <Search size={16} /> Search
            </Button>
          </div>
          {error && <p className="text-red-500 mt-2 text-sm flex items-center gap-1"><AlertCircle size={14}/> {error}</p>}
        </CardContent>
      </Card>

      {order && (
        <Card>
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle>Receipt: {order.receiptNumber}</CardTitle>
            <p className="text-sm text-slate-500">Date: {new Date(order.createdAt).toLocaleString()} | Customer: {order.customerName}</p>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-sm">
                  <th className="p-4 border-b">Product</th>
                  <th className="p-4 border-b">Price</th>
                  <th className="p-4 border-b">Qty Sold</th>
                  <th className="p-4 border-b text-slate-500">Prev Returned</th>
                  <th className="p-4 border-b w-32">Return Qty</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map(item => {
                  const prevRet = order.returnedQtys?.[item.productId] || 0;
                  return (
                    <tr key={item.productId} className="border-b text-sm">
                      <td className="p-4 font-medium">{item.productName}</td>
                      <td className="p-4">${(item.total / item.quantity).toFixed(2)}</td>
                      <td className="p-4">{item.quantity}</td>
                      <td className="p-4 text-slate-500">{prevRet}</td>
                      <td className="p-4">
                        <Input 
                          type="number" 
                          min="0" 
                          max={returnItems[item.productId]?.max}
                          value={returnItems[item.productId]?.quantity}
                          onChange={(e) => handleReturnQtyChange(item.productId, e.target.value)}
                          className="w-full text-center"
                          disabled={returnItems[item.productId]?.max === 0}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <div className="p-6 bg-slate-50">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Reason for Return</label>
                    <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Defective, changed mind" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium">Refund Allocations</label>
                      <Button variant="outline" size="sm" onClick={handleAddAllocation}>+ Add Method</Button>
                    </div>
                    {refundAllocations.map((alloc, idx) => (
                      <div key={idx} className="flex gap-2 mb-2 items-center">
                        <Select value={alloc.method} onChange={e => handleAllocationChange(idx, 'method', e.target.value)} className="w-1/2">
                          <option value="CASH">Cash</option>
                          <option value="CARD">Card</option>
                          <option value="ONLINE">Online</option>
                          <option value="UPI">UPI</option>
                          <option value="OTHER">Other</option>
                        </Select>
                        <Input 
                          type="number" 
                          min="0" 
                          value={alloc.amount || ''} 
                          onChange={e => handleAllocationChange(idx, 'amount', e.target.value)} 
                          placeholder="Amount" 
                          className="w-1/2" 
                        />
                        {refundAllocations.length > 1 && (
                          <Button variant="ghost" className="text-red-500" onClick={() => handleRemoveAllocation(idx)}>X</Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 bg-white p-4 rounded-xl border flex flex-col justify-center items-center">
                  <p className="text-slate-500 mb-1">Total Refund</p>
                  <p className="text-3xl font-black text-blue-600">${calculateTotalRefund().toFixed(2)}</p>
                  <div className="w-full mt-4 flex justify-between text-sm text-slate-500">
                    <span>Allocated: ${calculateAllocatedTotal().toFixed(2)}</span>
                    <span className={Math.abs(calculateTotalRefund() - calculateAllocatedTotal()) > 0.01 ? 'text-red-500' : 'text-green-500'}>
                      Remaining: ${(calculateTotalRefund() - calculateAllocatedTotal()).toFixed(2)}
                    </span>
                  </div>
                  <Button 
                    onClick={() => processReturn()} 
                    className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white" 
                    disabled={calculateTotalRefund() <= 0 || Math.abs(calculateTotalRefund() - calculateAllocatedTotal()) > 0.01}
                  >
                    Issue Refund
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {order && order.pastReturns && order.pastReturns.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-lg">Previous Returns for this Order</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-sm">
                  <th className="p-4 border-b">Date</th>
                  <th className="p-4 border-b">Processed By</th>
                  <th className="p-4 border-b">Refund Amount</th>
                  <th className="p-4 border-b">Reason</th>
                  <th className="p-4 border-b">Items Returned</th>
                </tr>
              </thead>
              <tbody>
                {order.pastReturns.map(pr => (
                  <tr key={pr._id} className="border-b text-sm">
                    <td className="p-4">{new Date(pr.createdAt).toLocaleString()}</td>
                    <td className="p-4">{pr.createdBy ? `${pr.createdBy.firstName} ${pr.createdBy.lastName}` : 'System'}</td>
                    <td className="p-4 font-bold text-red-600">-${pr.refundAmount?.toFixed(2)}</td>
                    <td className="p-4">{pr.reason || '-'}</td>
                    <td className="p-4">
                      <ul className="list-disc pl-4">
                        {pr.returnItems.map(item => (
                          <li key={item._id || item.productId?._id}>
                            {item.quantity}x {item.productId?.name || 'Item'}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {!order && (
        <Card className="mt-6">
          <CardHeader className="bg-white border-b">
            <CardTitle className="text-lg">Recent POS Returns</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingRecent ? (
              <div className="p-8 text-center text-slate-500">Loading recent returns...</div>
            ) : recentReturns.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-sm text-slate-500 border-b">
                      <th className="p-4 font-semibold">Date</th>
                      <th className="p-4 font-semibold">Original Receipt</th>
                      <th className="p-4 font-semibold">Branch</th>
                      <th className="p-4 font-semibold">Processed By</th>
                      <th className="p-4 font-semibold">Items</th>
                      <th className="p-4 font-semibold text-right">Refund Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentReturns.map(ret => (
                      <tr key={ret._id} className="border-b last:border-0 hover:bg-slate-50 transition-colors text-sm">
                        <td className="p-4 text-slate-600">{new Date(ret.createdAt).toLocaleString()}</td>
                        <td className="p-4 font-medium text-blue-600 cursor-pointer hover:underline" onClick={() => { 
                          const rNum = ret.originalOrderId?.receiptNumber;
                          setReceiptNumber(rNum); 
                          searchOrder(rNum); 
                        }}>
                          {ret.originalOrderId?.receiptNumber || 'N/A'}
                        </td>
                        <td className="p-4 text-slate-600">{ret.branchId?.name || 'N/A'}</td>
                        <td className="p-4 text-slate-600">{ret.createdBy ? `${ret.createdBy.firstName} ${ret.createdBy.lastName}` : 'N/A'}</td>
                        <td className="p-4 text-slate-600">{ret.returnItems?.reduce((sum, item) => sum + item.quantity, 0)} items</td>
                        <td className="p-4 text-right font-bold text-red-600">-${ret.refundAmount?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                No recent returns found.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isManagerModalOpen && (
        <ManagerApprovalModal
          isOpen={isManagerModalOpen}
          onClose={() => setIsManagerModalOpen(false)}
          requestedAction="OVERRIDE_POS_RETURN"
          contextData={{ branchId: order?.branchId }}
          onApproved={(token) => processReturn(token)}
        />
      )}
    </div>
  );
};

export default POSReturns;

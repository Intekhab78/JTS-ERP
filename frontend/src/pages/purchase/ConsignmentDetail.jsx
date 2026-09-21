import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Building, Calendar, CheckCircle, Ban, Play, FileText, ClipboardList, PackageSearch, Undo2, HandCoins, History, Edit, Check } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useCurrency } from '../../contexts/CurrencyContext';

export default function ConsignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [consignment, setConsignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchConsignment();
  }, [id]);

  const fetchConsignment = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/v1/consignments/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setConsignment(res.data.data);
    } catch (error) {
      alert('Failed to load consignment');
      navigate('/purchases/consignments');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    if (!window.confirm(`Are you sure you want to ${action} this consignment?`)) return;
    try {
      await axios.post(`http://localhost:5000/api/v1/consignments/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchConsignment();
    } catch (error) {
      alert(error.response?.data?.message || `Failed to ${action}`);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!consignment) return <div className="p-8 text-center text-red-500">Not found</div>;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT': return <Badge variant="secondary">DRAFT</Badge>;
      case 'CONFIRMED': return <Badge className="bg-blue-100 text-blue-800">CONFIRMED</Badge>;
      case 'ACTIVE': return <Badge variant="success">ACTIVE</Badge>;
      case 'CLOSED': return <Badge className="bg-slate-200 text-slate-800">CLOSED</Badge>;
      case 'CANCELLED': return <Badge variant="destructive">CANCELLED</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <FileText size={16} /> },
    { id: 'products', label: 'Products', icon: <ClipboardList size={16} /> },
    { id: 'stock', label: 'Consignment Stock', icon: <PackageSearch size={16} /> },
    { id: 'receipts', label: 'Receipts', icon: <Play size={16} /> },
    { id: 'returns', label: 'Returns', icon: <Undo2 size={16} /> },
    { id: 'settlements', label: 'Settlements', icon: <HandCoins size={16} /> },
  ];

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/purchases/consignments')} className="p-2 text-slate-500">
            <ArrowLeft size={20} />
          </Button>
          <PageHeader 
            title={consignment.consignmentNumber}
            description="Consignment Agreement"
          />
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(consignment.status)}
          
          {consignment.status === 'DRAFT' && (
            <>
              <Button onClick={() => navigate(`/purchases/consignments/edit/${consignment._id}`)} variant="outline" leftIcon={<Edit size={16}/>}>Edit</Button>
              <Button onClick={() => handleAction('confirm')} className="bg-blue-600 hover:bg-blue-700" leftIcon={<Check size={16} />}>Confirm</Button>
              <Button variant="destructive" onClick={() => handleAction('cancel')} leftIcon={<Ban size={16} />}>Cancel</Button>
            </>
          )}

          {consignment.status === 'CONFIRMED' && (
            <>
              <Button onClick={() => handleAction('activate')} className="bg-green-600 hover:bg-green-700" leftIcon={<Play size={16} />}>Activate</Button>
              <Button variant="destructive" onClick={() => handleAction('cancel')} leftIcon={<Ban size={16} />}>Cancel</Button>
            </>
          )}

          {consignment.status === 'ACTIVE' && (
            <>
              <Button onClick={() => navigate('/purchases/consignments/receipts/new', { state: { consignmentId: consignment._id } })} variant="outline">
                New Receipt
              </Button>
              <Button onClick={() => navigate('/purchases/consignments/returns/new', { state: { consignmentId: consignment._id } })} variant="outline">
                New Return
              </Button>
              <Button onClick={() => handleAction('close')} className="bg-slate-800 hover:bg-slate-900" leftIcon={<CheckCircle size={16} />}>
                Close Agreement
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex space-x-1 border-b border-slate-200 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 md:col-span-2 flex flex-col gap-6">
            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Building size={16} /> Supplier Information
              </h3>
              <div className="text-lg font-bold text-slate-900">{consignment.supplierId?.name}</div>
              {consignment.supplierId?.email && <div className="text-slate-500">{consignment.supplierId.email}</div>}
            </div>

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Calendar size={16} /> Start Date
                </h3>
                <div className="font-medium text-slate-800">{new Date(consignment.startDate).toLocaleDateString()}</div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Calendar size={16} /> End Date
                </h3>
                <div className="font-medium text-slate-800">{consignment.endDate ? new Date(consignment.endDate).toLocaleDateString() : 'Ongoing'}</div>
              </div>
            </div>
            
            {consignment.notes && (
               <div className="pt-6 border-t border-slate-200">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Notes & Terms</h3>
                  <p className="text-slate-700 whitespace-pre-wrap">{consignment.notes}</p>
               </div>
            )}
          </Card>

          <Card className="p-6 bg-slate-50 border border-slate-200">
             <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Agreement Workflow</h3>
             <div className="space-y-4 text-sm">
               <div className="flex flex-col gap-1 pb-3 border-b border-slate-200">
                 <span className="text-slate-500">Created By</span>
                 <span className="font-medium text-slate-800">{consignment.createdBy?.name || '-'}</span>
               </div>
               <div className="flex flex-col gap-1 pb-3 border-b border-slate-200">
                 <span className="text-slate-500">Confirmed By</span>
                 <span className="font-medium text-slate-800">{consignment.confirmedBy?.name || '-'}</span>
               </div>
               <div className="flex flex-col gap-1 pb-3 border-b border-slate-200">
                 <span className="text-slate-500">Activated By</span>
                 <span className="font-medium text-slate-800">{consignment.activatedBy?.name || '-'}</span>
               </div>
               <div className="flex flex-col gap-1">
                 <span className="text-slate-500">Default Branch</span>
                 <span className="font-medium text-slate-800">{consignment.defaultBranchId?.name || 'Any'}</span>
               </div>
             </div>
          </Card>
        </div>
      )}

      {activeTab === 'products' && (
        <Card className="overflow-hidden border border-slate-200">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-slate-800 text-sm">Agreed Products</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4 font-medium">Product</th>
                  <th className="p-4 font-medium text-right">Agreed Qty</th>
                  <th className="p-4 font-medium text-right">Unit Price</th>
                  <th className="p-4 font-medium text-right text-blue-600">Received</th>
                  <th className="p-4 font-medium text-right text-green-600">Consumed</th>
                  <th className="p-4 font-medium text-right text-orange-600">Returned</th>
                  <th className="p-4 font-medium text-right text-purple-600">Settled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {consignment.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-4">
                      <div className="font-medium text-slate-900">{item.productId?.name}</div>
                      <div className="text-xs text-slate-500">SKU: {item.productId?.sku}</div>
                    </td>
                    <td className="p-4 text-right font-medium text-slate-700">{item.agreedQuantity}</td>
                    <td className="p-4 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                    <td className="p-4 text-right font-bold text-blue-600">{item.receivedQuantity}</td>
                    <td className="p-4 text-right font-bold text-green-600">{item.consumedQuantity}</td>
                    <td className="p-4 text-right font-bold text-orange-600">{item.returnedQuantity}</td>
                    <td className="p-4 text-right font-bold text-purple-600">{item.settledQuantity || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'stock' && (
        <Card className="p-8 text-center text-slate-500 border border-slate-200">
          <PackageSearch size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">Consignment Stock</h3>
          <p>Consignment stock tracking for this agreement.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(`/purchases/consignment-stock?consignmentId=${consignment._id}`)}>
            View Detailed Ledger
          </Button>
        </Card>
      )}

      {activeTab === 'receipts' && (
        <Card className="p-8 text-center text-slate-500 border border-slate-200">
           <Play size={48} className="mx-auto mb-4 text-slate-300" />
           <h3 className="text-lg font-bold text-slate-800 mb-2">Receipts</h3>
           <p>Manage physical receipts of supplier stock.</p>
           <Button variant="outline" className="mt-4" onClick={() => navigate(`/purchases/consignments/receipts?consignmentId=${consignment._id}`)}>
             View Receipts
           </Button>
        </Card>
      )}

      {activeTab === 'returns' && (
         <Card className="p-8 text-center text-slate-500 border border-slate-200">
            <Undo2 size={48} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">Returns</h3>
            <p>Manage physical returns back to the supplier.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate(`/purchases/consignments/returns?consignmentId=${consignment._id}`)}>
              View Returns
            </Button>
         </Card>
      )}

      {activeTab === 'settlements' && (
         <Card className="p-8 text-center text-slate-500 border border-slate-200">
            <HandCoins size={48} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">Settlements</h3>
            <p>Settle consumed consignment inventory.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate(`/purchases/consignments/settlements?consignmentId=${consignment._id}`)}>
              View Settlements
            </Button>
         </Card>
      )}

    </div>
  );
}

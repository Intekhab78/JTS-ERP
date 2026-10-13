import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit, ArrowLeft, Loader2, Tag, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardContent } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

const DiscountDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [discount, setDiscount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDiscount();
  }, [id]);

  const fetchDiscount = async () => {
    try {
      const res = await axios.get(`/api/v1/discounts/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDiscount(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch discount details');
      navigate('/sales/discounts');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={24} /></div>;
  }

  if (!discount) return null;

  const getStatusInfo = (row) => {
    if (!row.isActive) return { label: 'Inactive', variant: 'secondary' };
    if (row.usageLimit > 0 && row.usageCount >= row.usageLimit) return { label: 'Usage Limit Reached', variant: 'danger' };
    const now = new Date();
    if (row.endDate && new Date(row.endDate) < now) return { label: 'Expired', variant: 'danger' };
    if (row.startDate && new Date(row.startDate) > now) return { label: 'Scheduled', variant: 'warning' };
    return { label: 'Active', variant: 'success' };
  };

  const statusInfo = getStatusInfo(discount);

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Promotion Details"
        description="View configuration and usage rules for this discount"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/sales/discounts')} className="gap-2">
              <ArrowLeft size={16} /> Back
            </Button>
            <Button onClick={() => navigate(`/sales/discounts/edit/${id}`)} className="gap-2 bg-[#1e3a8a] text-white">
              <Edit size={16} /> Edit Promotion
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Basic Info & Stats */}
        <div className="space-y-6">
           <Card className="overflow-hidden border-t-4 border-t-[#1e3a8a]">
              <div className="p-6">
                 <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                       <Tag size={24} />
                    </div>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                 </div>
                 
                 <h2 className="text-2xl font-black text-slate-800 leading-tight mb-1">{discount.name}</h2>
                 {discount.isAutomatic ? (
                   <span className="inline-block text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded mb-4">Automatic Promotion</span>
                 ) : (
                   <div className="inline-block border-2 border-dashed border-blue-200 bg-blue-50/50 px-3 py-1.5 rounded font-mono font-bold tracking-widest text-blue-900 mb-4">
                     {discount.code}
                   </div>
                 )}
                 
                 {discount.description && (
                    <p className="text-sm text-slate-600 mb-6">{discount.description}</p>
                 )}
                 
                 <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Usage Tracker</p>
                       <div className="flex justify-between items-end">
                          <span className="text-3xl font-black text-slate-800">{discount.usageCount}</span>
                          <span className="text-sm font-bold text-slate-400 mb-1">/ {discount.usageLimit > 0 ? discount.usageLimit : '∞'} used</span>
                       </div>
                       {discount.usageLimit > 0 && (
                          <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                             <div 
                               className={`h-full ${discount.usageCount >= discount.usageLimit ? 'bg-red-500' : 'bg-blue-500'}`} 
                               style={{ width: `${Math.min((discount.usageCount / discount.usageLimit) * 100, 100)}%` }}>
                             </div>
                          </div>
                       )}
                    </div>
                 </div>
              </div>
           </Card>

           <Card title="Time Validity">
              <CardContent className="p-5 space-y-4">
                 <div className="flex items-start gap-3">
                    <Clock size={18} className="text-slate-400 mt-0.5" />
                    <div>
                       <p className="text-sm font-bold text-slate-700">Start Date</p>
                       <p className="text-sm text-slate-600">
                          {discount.startDate ? format(new Date(discount.startDate), 'PPP') : 'Immediately'}
                          {discount.startTime && ` at ${discount.startTime}`}
                       </p>
                    </div>
                 </div>
                 <div className="flex items-start gap-3">
                    <AlertCircle size={18} className="text-slate-400 mt-0.5" />
                    <div>
                       <p className="text-sm font-bold text-slate-700">End Date</p>
                       <p className="text-sm text-slate-600">
                          {discount.endDate ? format(new Date(discount.endDate), 'PPP') : 'No Expiry'}
                          {discount.endTime && ` at ${discount.endTime}`}
                       </p>
                    </div>
                 </div>
              </CardContent>
           </Card>
        </div>

        {/* Right Column: Rules & Logic */}
        <div className="md:col-span-2 space-y-6">
           <Card title="Promotion Rules">
              <CardContent className="p-0">
                 <table className="w-full text-sm text-left">
                    <tbody>
                       <tr className="border-b border-slate-100">
                          <th className="py-3 px-5 font-bold text-slate-600 w-1/3 bg-slate-50">Discount Type</th>
                          <td className="py-3 px-5 font-semibold text-slate-800">{discount.discountType.replace(/_/g, ' ')}</td>
                       </tr>
                       <tr className="border-b border-slate-100">
                          <th className="py-3 px-5 font-bold text-slate-600 w-1/3 bg-slate-50">Discount Value</th>
                          <td className="py-3 px-5 font-bold text-emerald-600">
                             {discount.discountType === 'PERCENTAGE' && `${discount.value}% OFF`}
                             {discount.discountType === 'FIXED' && `₹${discount.value} OFF`}
                             {discount.discountType === 'BUY_X_GET_Y' && `Buy ${discount.buyXQuantity} Get ${discount.getYQuantity} ${discount.getYDiscountType === 'FREE' ? 'Free' : (discount.getYDiscountValue + '% Off')}`}
                             {['BULK_PURCHASE', 'TIERED_DISCOUNT'].includes(discount.discountType) && `${discount.tiers?.length} Tiers Configured`}
                          </td>
                       </tr>
                       <tr className="border-b border-slate-100">
                          <th className="py-3 px-5 font-bold text-slate-600 w-1/3 bg-slate-50">Applies To</th>
                          <td className="py-3 px-5 text-slate-700 font-medium">
                             {discount.applyTo === 'ORDER' && 'Entire Order Subtotal'}
                             {discount.applyTo === 'CATEGORY' && `${discount.applicableCategories?.length} Categories Selected`}
                             {discount.applyTo === 'SUBCATEGORY' && `${discount.applicableSubcategories?.length} Subcategories Selected`}
                             {discount.applyTo === 'PRODUCT' && `1 Product Selected`}
                             {discount.applyTo === 'MULTIPLE_PRODUCTS' && `${discount.applicableProducts?.length} Products Selected`}
                          </td>
                       </tr>
                       {discount.maxDiscountAmount > 0 && (
                          <tr className="border-b border-slate-100">
                             <th className="py-3 px-5 font-bold text-slate-600 w-1/3 bg-slate-50">Max Discount Limit</th>
                             <td className="py-3 px-5 text-slate-700">₹{discount.maxDiscountAmount}</td>
                          </tr>
                       )}
                       <tr className="border-b border-slate-100">
                          <th className="py-3 px-5 font-bold text-slate-600 w-1/3 bg-slate-50">Minimum Order</th>
                          <td className="py-3 px-5 text-slate-700">{discount.minOrderAmount > 0 ? `₹${discount.minOrderAmount}` : 'None'}</td>
                       </tr>
                       <tr className="border-b border-slate-100">
                          <th className="py-3 px-5 font-bold text-slate-600 w-1/3 bg-slate-50">Evaluation Priority</th>
                          <td className="py-3 px-5 text-slate-700 font-bold">{discount.priority}</td>
                       </tr>
                       <tr>
                          <th className="py-3 px-5 font-bold text-slate-600 w-1/3 bg-slate-50">Stacking Allowed</th>
                          <td className="py-3 px-5">
                             {discount.stackable ? (
                               <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle size={14}/> Yes, combines with others</span>
                             ) : (
                               <span className="text-amber-600 font-bold flex items-center gap-1"><AlertCircle size={14}/> No, blocks lower priorities</span>
                             )}
                          </td>
                       </tr>
                    </tbody>
                 </table>
              </CardContent>
           </Card>

           {['BULK_PURCHASE', 'TIERED_DISCOUNT'].includes(discount.discountType) && (
              <Card title="Tier Definitions">
                 <CardContent className="p-0">
                    <table className="w-full text-sm text-left">
                       <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                             <th className="py-2 px-5 font-bold text-slate-600">{discount.discountType === 'BULK_PURCHASE' ? 'Min Quantity' : 'Min Order Amount (₹)'}</th>
                             <th className="py-2 px-5 font-bold text-slate-600">Discount Type</th>
                             <th className="py-2 px-5 font-bold text-slate-600">Value</th>
                          </tr>
                       </thead>
                       <tbody>
                          {discount.tiers?.map((t, idx) => (
                             <tr key={idx} className="border-b border-slate-50">
                                <td className="py-2 px-5 text-slate-700 font-bold">{t.minQuantity}</td>
                                <td className="py-2 px-5 text-slate-700">{t.discountType === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'}</td>
                                <td className="py-2 px-5 text-emerald-600 font-bold">{t.discountType === 'PERCENTAGE' ? `${t.value}%` : `₹${t.value}`}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </CardContent>
              </Card>
           )}

           <Card title="Eligibility Exclusions">
              <CardContent className="p-5 space-y-4">
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                       <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Branch Restriction</p>
                       <p className="text-sm text-slate-800 font-medium">{discount.branches?.length > 0 ? `${discount.branches.length} Selected Branches` : 'All Branches'}</p>
                    </div>
                    <div>
                       <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Customer Restriction</p>
                       <p className="text-sm text-slate-800 font-medium">
                          {discount.customers?.length > 0 ? `${discount.customers.length} Selected Customers` : 
                           (discount.customerGroups?.length > 0 ? `${discount.customerGroups.length} Customer Groups` : 'All Customers')}
                       </p>
                    </div>
                 </div>
                 {discount.excludedProducts?.length > 0 && (
                    <div className="pt-4 border-t border-slate-100">
                       <p className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-2">Excluded Products</p>
                       <p className="text-sm text-slate-800">{discount.excludedProducts.length} product(s) explicitly barred from this promotion.</p>
                    </div>
                 )}
              </CardContent>
           </Card>

        </div>
      </div>
    </div>
  );
};

export default DiscountDetail;

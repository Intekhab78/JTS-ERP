import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Package, Truck, RotateCcw, XCircle, ExternalLink, 
  ChevronRight, AlertCircle, CheckCircle2, Clock, Search,
  ShieldCheck, ArrowRight, UploadCloud, Check, HelpCircle, 
  Info, CreditCard, Wallet, Building2, Sparkles, Image,
  Upload, Trash2, Camera, Loader2, MapPin, Edit3, ChevronLeft, Star
} from 'lucide-react';
import { format } from 'date-fns';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useStoreSettings } from '../../context/StoreSettingsContext';

const RETURN_REASONS_TREE = [
  {
    id: 'DAMAGED',
    title: 'Received a broken/damaged item',
    badge: 'Defect / Physical',
    icon: '💥',
    requiresImage: true,
    subReasons: [
      'Received a broken/damaged item',
      'One or more of the accessories were broken/damaged',
      'Outer packaging was severely damaged / seal broken',
      'Product has physical scratches or dents'
    ]
  },
  {
    id: 'SIZE_FIT',
    title: "Don't like the size/fit of the product",
    badge: 'Size / Fit',
    icon: '📏',
    requiresImage: false,
    suggestExchange: true,
    subReasons: [
      'Size was too small / tight (Need bigger size)',
      'Size was too large / loose (Need smaller size)',
      'Fit / cut not as expected'
    ]
  },
  {
    id: 'QUALITY',
    title: 'Quality of the product not as expected',
    badge: 'Material / Quality',
    icon: '⭐',
    requiresImage: false,
    subReasons: [
      'Fabric / material quality not satisfactory',
      'Performance / speed not as expected',
      'Color looks faded / different from pictures',
      'Build quality feels substandard'
    ]
  },
  {
    id: 'WRONG_ITEM',
    title: 'Received wrong item',
    badge: 'Incorrect Order',
    icon: '🔁',
    requiresImage: true,
    subReasons: [
      'Completely different product delivered',
      'Wrong color or variant in the box',
      'Wrong size was delivered by seller'
    ]
  },
  {
    id: 'NOT_WANTED',
    title: "Don't want the product anymore",
    badge: 'Buyer Discretion',
    icon: '📦',
    requiresImage: false,
    subReasons: [
      'Ordered by mistake',
      'Found a better price elsewhere',
      'Item arrived later than expected',
      'No longer needed'
    ]
  }
];

const PREDEFINED_REASONS = [
  "Don't want the product anymore",
  "Received a broken/damaged item",
  "Do not like the size/fit of the product",
  "Quality of the product not as expected",
  "Received wrong product",
  "Other reason"
];

const getColorHex = (colorName, colorCode) => {
  if (colorCode && (colorCode.startsWith('#') || colorCode.startsWith('rgb'))) return colorCode;
  const name = (colorName || '').toLowerCase().trim();
  const map = {
    green: '#10B981', emerald: '#059669', blue: '#2563EB', navy: '#1E3A8A', sky: '#0284C7',
    red: '#EF4444', rose: '#F43F5E', black: '#0F172A', dark: '#1E293B', white: '#FFFFFF',
    grey: '#64748B', gray: '#64748B', silver: '#CBD5E1', yellow: '#F59E0B', gold: '#EAB308',
    orange: '#F97316', purple: '#8B5CF6', violet: '#7C3AED', indigo: '#6366F1', pink: '#EC4899',
    titanium: '#8A8680', 'natural titanium': '#9B958C', 'desert titanium': '#C8B29E', 'black titanium': '#2B2B2B', 'white titanium': '#E3E4E5'
  };
  return map[name] || '#94A3B8';
};

export const MyOrders = () => {

  const { token } = useCustomerAuth();
  const { formatCurrency } = useStoreSettings();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Cancellation Modal
  const [cancelModalOrder, setCancelModalOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // 2-IN-1 Flipkart / Amazon Style 3-Step Return & Exchange Modal
  const [returnModalOrder, setReturnModalOrder] = useState(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);

  // Stepper State: 1 = Reason, 2 = Pickup Address, 3 = Resolution (Exchange/Refund)
  const [returnStep, setReturnStep] = useState(1);

  // Step 1: Reason Selection
  const [selectedMainReasonId, setSelectedMainReasonId] = useState('DAMAGED');
  const [selectedSubReason, setSelectedSubReason] = useState('Received a broken/damaged item');
  const [commentsText, setCommentsText] = useState('');
  const [uploadedImages, setUploadedImages] = useState([]);
  const [isReadingImages, setIsReadingImages] = useState(false);

  // Step 2: Pickup Address Verification
  const [pickupAddress, setPickupAddress] = useState({
    fullName: '',
    phone: '',
    street: '',
    street2: '',
    city: '',
    state: '',
    zip: '',
    country: 'India'
  });
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [pickupLandmark, setPickupLandmark] = useState('');

  // Step 3: Resolution Selection (Exchange vs Refund)
  const [returnType, setReturnType] = useState('EXCHANGE'); // 'EXCHANGE' | 'REFUND'

  // Product Variant States for the selected item:
  const [productDetails, setProductDetails] = useState(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');

  // Refund Specific States:
  const [refundMode, setRefundMode] = useState('WALLET_CREDIT'); // 'WALLET_CREDIT' | 'UPI' | 'BANK_ACCOUNT' | 'ORIGINAL_PAYMENT'
  const [refundUpiId, setRefundUpiId] = useState('');
  const [refundBankDetails, setRefundBankDetails] = useState({
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    bankName: ''
  });

  const [isReturning, setIsReturning] = useState(false);

  // Success Confirmation Popup (with Doorstep Verification Code):
  const [successInfo, setSuccessInfo] = useState(null);

  // Flipkart-style compact list -> detail view
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [ratings, setRatings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jts_order_ratings') || '{}'); } catch { return {}; }
  });
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [submittingReview, setSubmittingReview] = useState(null);

  const ratingKey = (orderId, item) => `${orderId}_${item.productId?._id || item.productId}`;
  const RATING_LABELS = ['', 'Very Bad', 'Bad', 'Good', 'Very Good', 'Excellent'];

  const saveRatingLocal = (key, value) => {
    setRatings(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem('jts_order_ratings', JSON.stringify(next));
      return next;
    });
  };

  const submitReview = async (order, item) => {
    const key = ratingKey(order._id, item);
    const draft = reviewDrafts[key] || {};
    const rating = draft.rating || ratings[key]?.rating;
    if (!rating) { alert('Please select a star rating.'); return; }
    setSubmittingReview(key);
    try {
      await axios.post(`/api/v1/ecommerce/products/${item.productId?._id || item.productId}/reviews`, {
        rating,
        comment: [draft.title, draft.comment].filter(Boolean).join(' - ')
      }, { headers: { Authorization: `Bearer ${token}` } });
      saveRatingLocal(key, { rating, submitted: true, title: draft.title || '', comment: draft.comment || '' });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(null);
    }
  };

  const getDeliveryInfo = (order) => {
    const code = (order.ecomStatusCode || order.status || '').toUpperCase();
    if (['CANCELLED', 'CANCELED'].includes(code)) {
      return { text: `Cancelled on ${format(new Date(order.cancelledAt || order.updatedAt || order.createdAt), 'MMM d, yyyy')}`, color: '#ef4444', delivered: false };
    }
    if (order.returnStatus && order.returnStatus !== 'NONE') {
      return { text: `${order.returnType === 'EXCHANGE' ? 'Exchange' : 'Return'} ${String(order.returnStatus).toLowerCase().replace(/_/g, ' ')}`, color: '#f59e0b', delivered: true };
    }
    if (code === 'DELIVERED' || order.deliveredAt) {
      return { text: `Delivered on ${format(new Date(order.deliveredAt || order.updatedAt || order.createdAt), 'MMM d, yyyy')}`, color: '#16a34a', delivered: true };
    }
    const eta = new Date(order.expectedDeliveryDate || (new Date(order.createdAt).getTime() + 5 * 86400000));
    return { text: `Delivery expected by ${format(eta, 'MMM d, yyyy')}`, color: '#2563eb', delivered: false };
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  // Load real product details & active variants for the selected order item
  useEffect(() => {
    if (!returnModalOrder) {
      setProductDetails(null);
      return;
    }
    const item = (returnModalOrder.items || [])[selectedItemIndex] || returnModalOrder.items?.[0];
    const prodId = item?.productId?._id || item?.productId;
    if (!prodId) return;

    setIsLoadingProduct(true);
    axios.get(`/api/v1/ecommerce/products/${prodId}`)
      .then(res => {
        const prod = res.data?.product;
        setProductDetails(prod);

        if (prod?.hasVariants && Array.isArray(prod?.variants) && prod.variants.length > 0) {
          const initialVar = prod.variants.find(v => v.inStock) || prod.variants[0];
          setSelectedVariant(initialVar);

          const attrs = initialVar.attributes || {};
          const vColor = attrs.Color || attrs.color || '';
          let vSize = attrs.Size || attrs.size || '';
          if (!vSize) {
            const other = Object.entries(attrs).find(([k]) => k.toLowerCase() !== 'color');
            if (other) vSize = other[1] || '';
          }
          setSelectedColor(vColor || prod.availableColors?.[0]?.name || '');
          setSelectedSize(vSize || prod.availableSizes?.[0]?.name || '');
        } else {
          setSelectedVariant(null);
          setSelectedColor('');
          setSelectedSize('');
        }

        // Auto-enforce return policy constraints
        if (prod?.returnPolicyType === 'EXCHANGE_ONLY' || prod?.isReturnable === false) {
          setReturnType('EXCHANGE');
        }
      })
      .catch(err => {
        console.error('Failed to load product details for return/exchange:', err);
        setProductDetails(null);
      })
      .finally(() => setIsLoadingProduct(false));
  }, [returnModalOrder, selectedItemIndex]);

  const handleColorSelect = (clrName) => {
    setSelectedColor(clrName);
    if (!productDetails?.variants) return;
    const matched = productDetails.variants.find(v => {
      const attrs = v.attributes || {};
      const vColor = attrs.Color || attrs.color || '';
      const vSize = attrs.Size || attrs.size || '';
      const matchColor = String(vColor).toLowerCase() === String(clrName).toLowerCase();
      const matchSize = !selectedSize || String(vSize).toLowerCase() === String(selectedSize).toLowerCase();
      return matchColor && matchSize;
    }) || productDetails.variants.find(v => {
      const attrs = v.attributes || {};
      return String(attrs.Color || attrs.color || '').toLowerCase() === String(clrName).toLowerCase();
    });
    if (matched) setSelectedVariant(matched);
  };

  const handleSizeSelect = (szName) => {
    setSelectedSize(szName);
    if (!productDetails?.variants) return;
    const matched = productDetails.variants.find(v => {
      const attrs = v.attributes || {};
      const vColor = attrs.Color || attrs.color || '';
      let vSize = attrs.Size || attrs.size || '';
      if (!vSize) {
        const other = Object.entries(attrs).find(([k]) => k.toLowerCase() !== 'color');
        if (other) vSize = other[1] || '';
      }
      const matchSize = String(vSize).toLowerCase() === String(szName).toLowerCase();
      const matchColor = !selectedColor || String(vColor).toLowerCase() === String(selectedColor).toLowerCase();
      return matchColor && matchSize;
    }) || productDetails.variants.find(v => {
      const attrs = v.attributes || {};
      let vSize = attrs.Size || attrs.size || '';
      if (!vSize) {
        const other = Object.entries(attrs).find(([k]) => k.toLowerCase() !== 'color');
        if (other) vSize = other[1] || '';
      }
      return String(vSize).toLowerCase() === String(szName).toLowerCase();
    });
    if (matched) setSelectedVariant(matched);
  };

  const handleImageFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsReadingImages(true);
    const readers = files.map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers)
      .then(base64Urls => {
        setUploadedImages(prev => [...prev, ...base64Urls]);
      })
      .catch(err => {
        console.error('Error reading image files:', err);
        alert('Could not process selected image files.');
      })
      .finally(() => setIsReadingImages(false));
  };

  const removeUploadedImage = (indexToRemove) => {
    setUploadedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const openReturnModal = (order) => {
    setReturnModalOrder(order);
    setSelectedItemIndex(0);
    setReturnStep(1); // Start at Step 1 (Flipkart style)

    setSelectedMainReasonId('DAMAGED');
    setSelectedSubReason('Received a broken/damaged item');
    setCommentsText('');
    setUploadedImages([]);

    const addr = order.shippingAddressObj || {};
    setPickupAddress({
      fullName: addr.fullName || order.customerName || '',
      phone: addr.phone || order.customerPhone || '',
      street: addr.street || order.shippingAddress || '',
      street2: addr.street2 || '',
      city: addr.city || '',
      state: addr.state || '',
      zip: addr.zip || '',
      country: addr.country || 'India'
    });
    setIsEditingAddress(false);
    setPickupLandmark('');

    setReturnType('EXCHANGE');
    setRefundMode('WALLET_CREDIT');
    setRefundUpiId('');
    setRefundBankDetails({
      accountNumber: '',
      confirmAccountNumber: '',
      ifscCode: '',
      accountHolderName: '',
      bankName: ''
    });

    setSelectedVariant(null);
    setSelectedColor('');
    setSelectedSize('');
  };

  const handleProceedToStep2 = () => {
    const mainReasonObj = RETURN_REASONS_TREE.find(r => r.id === selectedMainReasonId) || RETURN_REASONS_TREE[0];
    
    if (!selectedSubReason) {
      alert('Please select a specific reason option.');
      return;
    }

    if (mainReasonObj.requiresImage && uploadedImages.length === 0) {
      alert('Please upload at least 1 photo showing the broken/damaged item or packaging before continuing.');
      return;
    }

    if (mainReasonObj.suggestExchange) {
      setReturnType('EXCHANGE');
    }

    setReturnStep(2);
  };

  const handleProceedToStep3 = () => {
    if (!pickupAddress.fullName.trim() || !pickupAddress.phone.trim() || !pickupAddress.street.trim() || !pickupAddress.city.trim() || !pickupAddress.zip.trim()) {
      alert('Please verify all required address fields (Name, Phone, Street, City, Pincode).');
      return;
    }
    setReturnStep(3);
  };

  const fetchOrders = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const { data } = await axios.get('/api/v1/ecommerce/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(data || []);
    } catch (e) {
      console.error('Failed to load customer orders:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelModalOrder) return;
    setIsCancelling(true);
    try {
      await axios.post(`/api/v1/ecommerce/orders/${cancelModalOrder._id}/cancel`, {
        reason: cancelReason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCancelModalOrder(null);
      setCancelReason('');
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Helper values for current order item being returned/exchanged
  const currentReturnItem = (returnModalOrder?.items || [])[selectedItemIndex] || returnModalOrder?.items?.[0] || {};
  const originalItemPrice = Number(currentReturnItem.unitPrice || currentReturnItem.price || 0);

  const hasProductVariants = Boolean(
    productDetails?.hasVariants &&
    Array.isArray(productDetails?.variants) &&
    productDetails.variants.length > 0
  );

  const replacementPrice = (returnType === 'EXCHANGE' && selectedVariant)
    ? Number(selectedVariant.effectivePrice || selectedVariant.salesPrice || originalItemPrice)
    : originalItemPrice;

  // Price difference calculation:
  // > 0 means customer pays difference; < 0 means customer receives refund for difference
  const exchangePriceDifference = replacementPrice - originalItemPrice;

  let replacementVariantSummary = '';
  if (selectedVariant && selectedVariant.attributes) {
    replacementVariantSummary = Object.entries(selectedVariant.attributes)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
  }
  const replacementName = `${currentReturnItem.productId?.name || currentReturnItem.name || 'Product'} ${replacementVariantSummary ? '(' + replacementVariantSummary + ')' : ''}`;

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnModalOrder) return;

    if (returnType === 'REFUND') {
      if (refundMode === 'UPI' && !refundUpiId.trim()) {
        alert('Please enter your UPI ID (e.g. mobile@upi or name@okhdfcbank) for instant refund transfer.');
        return;
      }

      if (refundMode === 'BANK_ACCOUNT') {
        if (!refundBankDetails.accountNumber || !refundBankDetails.ifscCode || !refundBankDetails.accountHolderName) {
          alert('Please fill all bank account details (Account number, IFSC code, Account holder name).');
          return;
        }
        if (refundBankDetails.accountNumber !== refundBankDetails.confirmAccountNumber) {
          alert('Bank account numbers do not match. Please re-enter.');
          return;
        }
      }
    }

    setIsReturning(true);
    try {
      const mainReasonObj = RETURN_REASONS_TREE.find(r => r.id === selectedMainReasonId) || RETURN_REASONS_TREE[0];
      const fullReason = `${mainReasonObj.title}: ${selectedSubReason}`;

      const payload = {
        returnType,
        returnItem: {
          productId: currentReturnItem.productId?._id || currentReturnItem.productId,
          name: currentReturnItem.productId?.name || currentReturnItem.name,
          sku: selectedVariant?.sku || currentReturnItem.productId?.sku || currentReturnItem.sku,
          quantity: currentReturnItem.quantity || 1,
          price: originalItemPrice,
          image: currentReturnItem.productId?.uploadImage || currentReturnItem.image,
          selectedVariant: replacementVariantSummary || undefined
        },
        returnReason: fullReason,
        returnSubReason: commentsText,
        returnImages: uploadedImages,
        returnNotes: `${commentsText ? 'Reason: ' + commentsText + '. ' : ''}Pickup from: ${pickupAddress.fullName}, ${pickupAddress.phone}, ${pickupAddress.street}, ${pickupAddress.city} - ${pickupAddress.zip}${pickupLandmark ? ' (Landmark: ' + pickupLandmark + ')' : ''}`,
        // Exchange specifics:
        exchangeMode: 'SAME_ITEM_VARIANT',
        exchangeReplacement: returnType === 'EXCHANGE' ? {
          productId: currentReturnItem.productId?._id || currentReturnItem.productId,
          name: replacementName,
          sku: selectedVariant?.sku || currentReturnItem.productId?.sku || '',
          variant: replacementVariantSummary || 'Standard Replacement',
          price: replacementPrice,
          image: selectedVariant?.uploadImage || currentReturnItem.productId?.uploadImage
        } : undefined,
        exchangeItemDetails: replacementName,
        exchangePriceDifference,
        exchangeDifferenceAction: exchangePriceDifference > 0 ? 'COLLECT_FROM_CUSTOMER' : exchangePriceDifference < 0 ? 'REFUND_TO_CUSTOMER' : 'NONE',
        // Refund specifics:
        refundMode: returnType === 'REFUND' ? refundMode : (exchangePriceDifference < 0 ? 'WALLET_CREDIT' : undefined),
        refundDetails: returnType === 'REFUND' ? {
          upiId: refundMode === 'UPI' ? refundUpiId : undefined,
          accountNumber: refundMode === 'BANK_ACCOUNT' ? refundBankDetails.accountNumber : undefined,
          ifscCode: refundMode === 'BANK_ACCOUNT' ? refundBankDetails.ifscCode : undefined,
          accountHolderName: refundMode === 'BANK_ACCOUNT' ? refundBankDetails.accountHolderName : undefined,
          bankName: refundMode === 'BANK_ACCOUNT' ? refundBankDetails.bankName : undefined
        } : undefined,
        refundAmount: returnType === 'REFUND' ? originalItemPrice : Math.abs(exchangePriceDifference)
      };

      const res = await axios.post(`/api/v1/ecommerce/orders/${returnModalOrder._id}/return`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const generatedOtp = res.data?.pickupOtp || res.data?.order?.returnPickupOtp || '849201';
      setSuccessInfo({
        returnType,
        pickupOtp: generatedOtp,
        orderId: `WEB-${returnModalOrder._id.slice(-6).toUpperCase()}`,
        isExchange: returnType === 'EXCHANGE',
        replacementName,
        priceDiff: exchangePriceDifference,
        refundMode: returnType === 'REFUND' ? refundMode : 'DIFFERENCE_WALLET',
        refundAmount: returnType === 'REFUND' ? originalItemPrice : Math.abs(exchangePriceDifference),
        pickupAddress: `${pickupAddress.street}, ${pickupAddress.city}`
      });

      setReturnModalOrder(null);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit return/exchange request.');
    } finally {
      setIsReturning(false);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-slate-500 font-medium animate-pulse">Loading your orders...</div>;
  }

  const filteredOrders = orders.filter(order => {
    let matchesTab = true;
    const status = (order.ecomStatusCode || order.status || '').toUpperCase();
    if (orderFilter === 'PROCESSING') matchesTab = ['PROCESSING', 'PENDING', 'ORDER_PLACED', 'CONFIRMED'].includes(status);
    else if (orderFilter === 'SHIPPED') matchesTab = ['SHIPPED', 'DISPATCHED', 'OUT_FOR_DELIVERY'].includes(status);
    else if (orderFilter === 'DELIVERED') matchesTab = status === 'DELIVERED';
    else if (orderFilter === 'CANCELLED') matchesTab = ['CANCELLED', 'CANCELED'].includes(status);

    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return matchesTab;

    const formattedWebId = `web-${(order._id || '').slice(-6)}`.toLowerCase();
    const shortWebId = (order._id || '').slice(-6).toLowerCase();
    const rawOrderNo = (order.orderNumber || '').toLowerCase();
    const orderId = (order._id || '').toLowerCase();
    const matchesOrderNo = formattedWebId.includes(q) || shortWebId.includes(q) || rawOrderNo.includes(q) || orderId.includes(q);

    const matchesItem = (order.items || []).some(item => {
      const pName = (item.productId?.name || item.name || '').toLowerCase();
      const pSku = (item.productId?.sku || item.sku || '').toLowerCase();
      return pName.includes(q) || pSku.includes(q);
    });

    const matchesTracking = (order.trackingNumber || '').toLowerCase().includes(q) ||
      (order.carrier || '').toLowerCase().includes(q);

    return matchesTab && (matchesOrderNo || matchesItem || matchesTracking);
  });

  return (
    <div className="space-y-3">
      {/* Compact Page Header with Status Tabs and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white">My Orders</h2>
          <p className="text-[11px] text-slate-500">Track shipments, manage cancellations, returns and exchanges.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search Bar */}
          <div className="relative min-w-[200px] sm:w-56">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order #, item name..."
              className="w-full pl-8 pr-7 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold px-1"
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg overflow-x-auto no-scrollbar">
            {[
              { id: 'ALL', label: 'All Orders' },
              { id: 'PROCESSING', label: 'Processing' },
              { id: 'SHIPPED', label: 'Shipped' },
              { id: 'DELIVERED', label: 'Delivered' },
              { id: 'CANCELLED', label: 'Cancelled' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setOrderFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  orderFilter === tab.id
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <Package size={32} className="mx-auto text-slate-300" />
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
            {searchQuery ? `No orders found matching "${searchQuery}"` : `No ${orderFilter !== 'ALL' ? orderFilter.toLowerCase() : ''} orders found`}
          </h3>
          <p className="text-xs text-slate-500">
            {searchQuery ? 'Check the order number (e.g. WEB-357979) or item name, or try clearing the search.' : 'Explore our verified catalog items and place an order.'}
          </p>
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="inline-block mt-1 px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Clear Search
            </button>
          ) : (
            <Link to="/catalog" className="inline-block mt-1 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold">
              Start Shopping
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredOrders.map(order => {
            const statusCode = order.ecomStatusCode || order.status;
            const canCancel = ['ORDER_PLACED', 'PENDING', 'CONFIRMED'].includes(statusCode);
            const canReturn = statusCode === 'DELIVERED' && order.returnStatus !== 'REQUESTED' && order.returnStatus !== 'APPROVED';
            const deliveryInfo = getDeliveryInfo(order);

            if (expandedOrderId && expandedOrderId !== order._id) return null;

            // ===== Compact Flipkart-style rows =====
            if (expandedOrderId !== order._id) {
              return (
                <div key={order._id} className="space-y-2">
                  {(order.items || []).map((item, idx) => {
                    const key = ratingKey(order._id, item);
                    const saved = ratings[key];
                    return (
                      <div
                        key={idx}
                        onClick={() => { setExpandedOrderId(order._id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-md hover:border-blue-300 transition-all p-3 cursor-pointer grid grid-cols-[64px_1fr] sm:grid-cols-[72px_1.6fr_0.6fr_1.4fr] gap-3 items-center"
                      >
                        <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center border border-slate-100 dark:border-slate-700 overflow-hidden">
                          {item.productId?.uploadImage ? (
                            <img src={item.productId.uploadImage} alt={item.productId?.name || item.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                          ) : (
                            <Package size={24} className="text-slate-400" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-blue-600">{item.productId?.name || item.name}</div>
                          {item.selectedAttributes && Object.keys(item.selectedAttributes).length > 0 && (
                            <div className="text-[11px] text-slate-500">{Object.entries(item.selectedAttributes).map(([k, v]) => `${k}: ${v}`).join(', ')}</div>
                          )}
                          <div className="sm:hidden text-sm font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(item.unitPrice)}</div>
                        </div>

                        <div className="hidden sm:block text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(item.unitPrice)}</div>

                        <div className="col-span-2 sm:col-span-1 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: deliveryInfo.color }} />
                            {deliveryInfo.text}
                          </div>
                          {deliveryInfo.delivered && (
                            saved?.rating ? (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star key={s} size={12} className={s <= saved.rating ? 'fill-emerald-500 text-emerald-500' : 'text-slate-300'} />
                                ))}
                                <span className="ml-1">{saved.submitted ? 'Reviewed' : 'Rated'}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-xs font-bold text-blue-600">
                                <Star size={13} className="fill-blue-600" /> Rate & Review Product
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }

            return (
              <div 
                key={order._id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all p-3 space-y-2 text-xs"
              >
                {/* Compact Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setExpandedOrderId(null)}
                      className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 cursor-pointer"
                      title="Back to orders"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-black text-blue-600 tracking-wide">WEB-{order._id.slice(-6).toUpperCase()}</span>
                    <span 
                      className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase text-white shadow-2xs"
                      style={{ backgroundColor: order.ecomStatusId?.color || (statusCode === 'CANCELLED' ? '#ef4444' : '#3b82f6') }}
                    >
                      {order.ecomStatusId?.name || statusCode}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      • {format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="text-right flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Total:</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Compact Items list */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 px-2.5 py-1.5 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 bg-white dark:bg-slate-900 rounded-md flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden">
                          {item.productId?.uploadImage ? (
                            <img src={item.productId.uploadImage} alt="item" className="w-full h-full object-cover" />
                          ) : (
                            <Package size={15} className="text-slate-400" />
                          )}
                        </div>
                        <span className="truncate font-semibold text-slate-900 dark:text-white text-xs">{item.productId?.name || item.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-semibold shrink-0">
                        Qty: {item.quantity} · {formatCurrency(item.unitPrice)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Flipkart-style Order Status Stepper */}
                {(() => {
                  const code = (statusCode || '').toUpperCase();
                  const history = order.statusHistory || [];
                  const findDate = (codes) => {
                    const h = history.find(x => codes.includes(String(x.statusCode || '').toUpperCase()));
                    return h?.changedAt;
                  };
                  const isCancelled = ['CANCELLED', 'CANCELED'].includes(code);
                  const rank = { ORDER_PLACED: 0, PENDING: 0, CONFIRMED: 0, PROCESSING: 0, PACKED: 0, SHIPPED: 1, DISPATCHED: 1, IN_TRANSIT: 1, OUT_FOR_DELIVERY: 2, DELIVERED: 3 };
                  const delivered = code === 'DELIVERED' || !!order.deliveredAt || (order.returnStatus && order.returnStatus !== 'NONE');
                  const current = delivered ? 3 : (rank[code] ?? 0);
                  const steps = isCancelled
                    ? [
                        { label: 'Order Confirmed', date: order.createdAt },
                        { label: 'Cancelled', date: order.cancelledAt || findDate(['CANCELLED']), note: order.cancellationReason }
                      ]
                    : [
                        { label: 'Order Confirmed', date: order.createdAt },
                        { label: 'Shipped', date: findDate(['SHIPPED', 'DISPATCHED', 'IN_TRANSIT']), note: order.carrier ? `${order.carrier}${order.trackingNumber ? ' · ' + order.trackingNumber : ''}` : '' },
                        { label: 'Out For Delivery', date: findDate(['OUT_FOR_DELIVERY']) },
                        { label: 'Delivered', date: order.deliveredAt || findDate(['DELIVERED']) }
                      ];
                  const activeIdx = isCancelled ? 1 : current;
                  const doneColor = isCancelled ? '#ef4444' : '#16a34a';
                  return (
                    <div className="px-3 py-3 rounded-lg border border-slate-100 dark:border-slate-800">
                      {steps.map((s, i) => {
                        const done = i <= activeIdx;
                        const isLast = i === steps.length - 1;
                        const lineDone = i < activeIdx;
                        const color = isCancelled && i === 0 ? '#16a34a' : doneColor;
                        return (
                          <div key={s.label} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div
                                className="w-3.5 h-3.5 rounded-full border-2 shrink-0 mt-0.5"
                                style={{ backgroundColor: done ? color : '#fff', borderColor: done ? color : '#cbd5e1' }}
                              />
                              {!isLast && (
                                <div className="w-0.5 flex-1 min-h-[26px]" style={{ backgroundColor: lineDone ? color : '#e2e8f0' }} />
                              )}
                            </div>
                            <div className={`pb-3 ${done ? '' : 'opacity-50'}`}>
                              <div className="text-xs font-bold text-slate-900 dark:text-white">
                                {s.label}
                                {s.date && done && (
                                  <span className="ml-2 font-medium text-slate-500">{format(new Date(s.date), 'EEE, MMM d')}</span>
                                )}
                              </div>
                              {s.note && done && <div className="text-[11px] text-slate-500">{s.note}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Doorstep Verification Code / OTP Banner (Like Amazon & Flipkart) */}
                {order.returnPickupOtp && (order.returnStatus === 'REQUESTED' || order.returnStatus === 'APPROVED' || order.returnStatus === 'PICKUP_ASSIGNED') && (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-amber-600" />
                        Doorstep Pickup Verification Code (OTP)
                      </div>
                      <div className="text-[11px] text-amber-700 dark:text-amber-300">
                        Share this 6-digit code with the rider when they arrive at your doorstep for pickup:
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-white dark:bg-slate-900 rounded-md font-mono text-base font-black tracking-widest text-amber-600 border border-amber-300 shadow-2xs self-start sm:self-auto">
                      {order.returnPickupOtp}
                    </div>
                  </div>
                )}

                {/* Doorstep Delivery Handover OTP (When order is in transit or out for delivery) */}
                {order.deliveryOtp && !order.deliveredAt && (statusCode === 'SHIPPED' || statusCode === 'OUT_FOR_DELIVERY' || statusCode === 'IN_TRANSIT') && (
                  <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-blue-600" />
                        Doorstep Delivery Handover OTP
                      </div>
                      <div className="text-[11px] text-blue-700 dark:text-blue-300">
                        Share this 4-digit code with the rider when your package arrives at your doorstep:
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-white dark:bg-slate-900 rounded-md font-mono text-base font-black tracking-widest text-blue-600 border border-blue-300 shadow-2xs self-start sm:self-auto">
                      {order.deliveryOtp}
                    </div>
                  </div>
                )}

                {/* Proof of Delivery (POD) Photo Banner (When order is delivered) */}
                {order.deliveryProofPhoto && (
                  <div className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      Doorstep Delivery Verified with Photo Proof (POD)
                    </div>
                    <a href={order.deliveryProofPhoto} target="_blank" rel="noreferrer" className="text-emerald-700 underline font-bold">
                      View Proof Photo
                    </a>
                  </div>
                )}

                {/* Return / Exchange Details Summary on Card */}
                {order.returnType && order.returnType !== 'NONE' && (
                  <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {order.returnType === 'EXCHANGE' ? '🔄 Exchange Specification:' : '💸 Refund Preference:'}
                      </span>
                      <span className="text-slate-500 font-medium">
                        Status: <strong className="text-blue-600 font-bold">{order.returnStatus}</strong>
                      </span>
                    </div>
                    {order.returnType === 'EXCHANGE' ? (
                      <div className="text-purple-700 dark:text-purple-300 font-medium">
                        Replacement: <strong>{order.exchangeItemDetails || 'Same product alternate size/color'}</strong>
                        {order.exchangePriceDifference !== 0 && (
                          <span className="ml-2 font-bold text-xs">
                            {order.exchangePriceDifference > 0 ? (
                              <span className="text-amber-600">(Extra to Pay: {formatCurrency(order.exchangePriceDifference)})</span>
                            ) : (
                              <span className="text-emerald-600">(Refund Difference: {formatCurrency(Math.abs(order.exchangePriceDifference))})</span>
                            )}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-blue-700 dark:text-blue-300 font-medium">
                        Refund Mode: <strong>{order.refundMode || 'Store Wallet / Account'}</strong>
                        {order.refundDetails?.upiId && ` (UPI: ${order.refundDetails.upiId})`}
                        {order.refundDetails?.accountNumber && ` (A/C: ...${order.refundDetails.accountNumber.slice(-4)})`}
                        {' · '}Amount: <strong>{formatCurrency(order.refundAmount || order.subtotalAmount || (order.totalAmount - (order.shippingAmount || 0)))}</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* Delivery status line */}
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: deliveryInfo.color }} />
                  {deliveryInfo.text}
                </div>

                {/* Full Rate & Review (Flipkart style) */}
                {deliveryInfo.delivered && (order.items || []).map((item, idx) => {
                  const key = ratingKey(order._id, item);
                  const saved = ratings[key] || {};
                  const draft = reviewDrafts[key] || {};
                  const current = draft.rating || saved.rating || 0;
                  const setDraft = (patch) => setReviewDrafts(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
                  return (
                    <div key={`rate-${idx}`} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 dark:text-white">Rate this product · <span className="font-semibold text-slate-500">{item.productId?.name || item.name}</span></span>
                        {saved.submitted && <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={11} /> Review submitted</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <button key={s} type="button" disabled={saved.submitted} onClick={() => setDraft({ rating: s })} className="cursor-pointer disabled:cursor-default transition-transform hover:scale-110">
                            <Star size={24} className={s <= current ? (current >= 3 ? 'fill-emerald-500 text-emerald-500' : current === 2 ? 'fill-amber-500 text-amber-500' : 'fill-red-500 text-red-500') : 'text-slate-300'} />
                          </button>
                        ))}
                        {current > 0 && <span className="ml-2 text-xs font-bold text-slate-600">{RATING_LABELS[current]}</span>}
                      </div>
                      {!saved.submitted && current > 0 && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={draft.title || ''}
                            onChange={e => setDraft({ title: e.target.value })}
                            placeholder="Review title (optional)"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <textarea
                            rows={3}
                            value={draft.comment || ''}
                            onChange={e => setDraft({ comment: e.target.value })}
                            placeholder="Describe your experience with the product..."
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => submitReview(order, item)}
                              disabled={submittingReview === key}
                              className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-60 flex items-center gap-1"
                            >
                              {submittingReview === key && <Loader2 size={12} className="animate-spin" />} Submit Review
                            </button>
                          </div>
                        </div>
                      )}
                      {saved.submitted && (saved.title || saved.comment) && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-300">
                          {saved.title && <div className="font-bold">{saved.title}</div>}
                          {saved.comment}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Action Buttons: Cancel & Return */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                  {canCancel && (
                    <button
                      onClick={() => { setCancelModalOrder(order); setCancelReason(''); }}
                      className="px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                    >
                      <XCircle size={13} /> Cancel Order
                    </button>
                  )}

                  {canReturn && (
                    <button
                      onClick={() => openReturnModal(order)}
                      className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-all cursor-pointer flex items-center gap-1 border border-blue-200 dark:border-blue-900"
                    >
                      <RotateCcw size={13} /> Return or Exchange
                    </button>
                  )}

                  {order.returnStatus === 'REQUESTED' && (
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                      order.returnType === 'EXCHANGE'
                        ? 'text-purple-700 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800'
                        : 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800'
                    }`}>
                      <RotateCcw size={11} />
                      {order.returnType === 'EXCHANGE' ? 'Exchange Under Review' : 'Refund Under Review'}
                    </span>
                  )}

                  {order.returnStatus === 'APPROVED' && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={11} />
                      {order.returnType === 'EXCHANGE' ? 'Exchange Approved' : 'Return Approved'}
                    </span>
                  )}

                  {order.returnStatus === 'PICKUP_ASSIGNED' && (
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Truck size={11} />
                      Rider Out for Pickup
                    </span>
                  )}

                  {order.returnStatus === 'PICKED_UP' && (
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={11} />
                      Item Picked Up
                    </span>
                  )}

                  {order.status === 'EXCHANGE_DISPATCHED' && (
                    <span className="text-[10px] font-bold text-sky-700 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Truck size={11} />
                      Replacement Dispatched
                    </span>
                  )}

                  {order.status === 'REFUNDED' && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={11} />
                      Refund Completed
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compact Deals Promo Card */}
      <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-850 rounded-xl border border-blue-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs">
        <div>
          <span className="font-bold text-slate-900 dark:text-white">Special Deals For You</span>
          <span className="text-[11px] text-slate-500 ml-2 hidden sm:inline">Save up to 30% OFF on verified ERP products.</span>
        </div>
        <Link
          to="/catalog?sort=price_asc"
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shrink-0"
        >
          Explore Catalog
        </Link>
      </div>

      {/* CANCELLATION MODAL */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Cancel Order WEB-{cancelModalOrder._id.slice(-6).toUpperCase()}?
            </h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to cancel this order? Reserved items will be restored to inventory.
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Cancellation Reason</label>
                <select
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="Changed mind / found elsewhere">Changed mind / found elsewhere</option>
                  <option value="Ordered by mistake">Ordered by mistake</option>
                  <option value="Delivery time too long">Delivery time too long</option>
                  <option value="Incorrect shipping address entered">Incorrect shipping address entered</option>
                  <option value="Other">Other reason</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalOrder(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  disabled={isCancelling}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLIPKART STYLE 3-STEP ACCORDION RETURN & EXCHANGE MODAL */}
      {returnModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/65 backdrop-blur-sm overflow-hidden animate-fade-in">
          <div className="bg-slate-100 dark:bg-slate-950 rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[94vh] flex flex-col overflow-hidden">
            
            {/* TOP BAR / BREADCRUMB */}
            <div className="bg-white dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Returns & Exchanges
                </span>
                <span className="text-slate-300">/</span>
                <span className="text-xs font-black text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                  WEB-{returnModalOrder._id.slice(-6).toUpperCase()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReturnModalOrder(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white text-sm font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* FORM CONTAINER */}
            <form onSubmit={handleReturnSubmit} className="flex-1 overflow-hidden flex flex-col">
              {/* MODAL MAIN CONTENT (2 COLUMNS: STEPS ON LEFT, ITEM DETAILS ON RIGHT) */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:flex md:gap-4">
                
                {/* LEFT COLUMN: 3 ACCORDION STEPS */}
                <div className="flex-1 space-y-3">

                  {/* STEP 1: REASON FOR RETURN */}
                  {returnStep === 1 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
                      <div className="bg-blue-600 text-white font-extrabold text-xs uppercase px-4 py-3 flex items-center gap-2.5">
                        <span className="w-5 h-5 bg-white text-blue-600 rounded flex items-center justify-center text-xs font-black">
                          1
                        </span>
                        <span>REASON FOR RETURN</span>
                      </div>

                      <div className="p-4 space-y-4 text-xs">
                        {/* Product Policy Banner */}
                        {productDetails?.returnPolicyType === 'NON_RETURNABLE' ? (
                          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
                            <XCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">Non-Returnable Item:</span>{' '}
                              <span>{productDetails.nonReturnableReason || 'This product is not eligible for return or exchange as per store hygiene/clearance policy.'}</span>
                            </div>
                          </div>
                        ) : productDetails?.returnPolicyType === 'EXCHANGE_ONLY' ? (
                          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
                            <RotateCcw size={15} className="text-amber-600 shrink-0" />
                            <span><strong>Replacement Only:</strong> This item is eligible for size/defect replacement only. Cash/bank refund is not available for this item.</span>
                          </div>
                        ) : null}

                        {/* Main Reasons Category Selection Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {RETURN_REASONS_TREE.map(reasonCat => {
                            const isSelected = selectedMainReasonId === reasonCat.id;
                            return (
                              <div
                                key={reasonCat.id}
                                onClick={() => {
                                  setSelectedMainReasonId(reasonCat.id);
                                  setSelectedSubReason(reasonCat.subReasons[0]);
                                }}
                                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-1 ring-blue-600 shadow-2xs'
                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{reasonCat.icon}</span>
                                    <div>
                                      <div className="font-bold text-slate-900 dark:text-white leading-tight">
                                        {reasonCat.title}
                                      </div>
                                      <span className="text-[10px] text-slate-500 font-medium">
                                        {reasonCat.badge}
                                      </span>
                                    </div>
                                  </div>
                                  <input
                                    type="radio"
                                    name="mainReasonSelection"
                                    checked={isSelected}
                                    onChange={() => {
                                      setSelectedMainReasonId(reasonCat.id);
                                      setSelectedSubReason(reasonCat.subReasons[0]);
                                    }}
                                    className="text-blue-600 mt-1"
                                  />
                                </div>

                                {/* When this card is active: show the specific sub-reasons list */}
                                {isSelected && (
                                  <div className="mt-3 pt-3 border-t border-blue-200/60 dark:border-blue-900/60 space-y-1.5" onClick={e => e.stopPropagation()}>
                                    <div className="text-[11px] font-bold text-blue-900 dark:text-blue-300 mb-1">
                                      Select specific issue:
                                    </div>
                                    {reasonCat.subReasons.map((sub, idx) => (
                                      <label
                                        key={idx}
                                        className={`flex items-start gap-2 p-1.5 rounded-lg cursor-pointer transition-colors ${
                                          selectedSubReason === sub
                                            ? 'bg-blue-100/60 dark:bg-blue-900/40 text-blue-950 dark:text-blue-200 font-bold'
                                            : 'hover:bg-blue-50/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                        }`}
                                      >
                                        <input
                                          type="radio"
                                          name="subReasonSelection"
                                          value={sub}
                                          checked={selectedSubReason === sub}
                                          onChange={() => setSelectedSubReason(sub)}
                                          className="mt-0.5 text-blue-600"
                                        />
                                        <span className="text-[11px] leading-tight">{sub}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Comments box (matches Flipkart) */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                            Comments (Optional)
                          </label>
                          <textarea
                            rows={2}
                            value={commentsText}
                            onChange={e => setCommentsText(e.target.value)}
                            placeholder="eg: The phone's display was damaged / describe issue here..."
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>

                        {/* Photo Upload Section (if damaged/broken or wrong item requires image) */}
                        {(() => {
                          const activeCat = RETURN_REASONS_TREE.find(r => r.id === selectedMainReasonId);
                          const requiresImage = activeCat?.requiresImage;
                          return (
                            <div className={`p-3 rounded-xl border space-y-2 ${
                              requiresImage
                                ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                            }`}>
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className={requiresImage ? 'text-amber-900 dark:text-amber-200' : 'text-slate-700 dark:text-slate-300'}>
                                  {requiresImage ? 'Upload Proof Photos *' : 'Attach Photos (Optional)'}
                                </span>
                                {requiresImage && (
                                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                                    Min. 1 photo required
                                  </span>
                                )}
                              </div>

                              <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-white/70 dark:bg-slate-900/50 transition-all">
                                <Upload size={18} className="text-blue-600" />
                                <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                                  {isReadingImages ? 'Processing photos...' : 'Click to Select Photos from Device'}
                                </span>
                                <span className="text-[10px] text-slate-400">Supports JPG, PNG, WEBP (Multiple files allowed)</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={handleImageFileUpload}
                                  className="hidden"
                                  disabled={isReadingImages}
                                />
                              </label>

                              {/* Uploaded Thumbnails Preview */}
                              {uploadedImages.length > 0 && (
                                <div className="flex items-center gap-2 flex-wrap pt-1">
                                  {uploadedImages.map((imgBase64, idx) => (
                                    <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 shadow-2xs group">
                                      <img src={imgBase64} alt={`proof-${idx}`} className="w-full h-full object-cover" />
                                      <button
                                        type="button"
                                        onClick={() => removeUploadedImage(idx)}
                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                                        title="Remove photo"
                                      >
                                        <Trash2 size={14} className="text-rose-400" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Step 1 Footer Action */}
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            disabled={productDetails?.returnPolicyType === 'NON_RETURNABLE'}
                            onClick={handleProceedToStep2}
                            className={`px-8 py-2.5 font-bold text-xs uppercase rounded-lg shadow-sm transition-all ${
                              productDetails?.returnPolicyType === 'NON_RETURNABLE'
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                            }`}
                          >
                            {productDetails?.returnPolicyType === 'NON_RETURNABLE' ? 'Non-Returnable' : 'Continue'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Step 1 Completed (Collapsed with Checkmark & Change Link) */
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                          ✓
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span className="text-slate-400 font-semibold">1. REASON FOR RETURN</span>
                            <span className="text-emerald-600 font-medium text-[11px]">• {selectedSubReason || selectedMainReasonId}</span>
                          </div>
                          {commentsText && (
                            <p className="text-[10px] text-slate-500 italic mt-0.5 truncate max-w-md">"{commentsText}"</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReturnStep(1)}
                        className="text-xs font-bold text-blue-600 hover:underline uppercase tracking-wide cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  {/* STEP 2: PICKUP ADDRESS */}
                  {returnStep === 2 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
                      <div className="bg-blue-600 text-white font-extrabold text-xs uppercase px-4 py-3 flex items-center gap-2.5">
                        <span className="w-5 h-5 bg-white text-blue-600 rounded flex items-center justify-center text-xs font-black">
                          2
                        </span>
                        <span>PICKUP ADDRESS</span>
                      </div>

                      <div className="p-4 space-y-4 text-xs">
                        <p className="text-[11px] text-slate-500">
                          Our courier partner will arrive at this address to inspect and collect the item.
                        </p>

                        {!isEditingAddress ? (
                          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-900 dark:text-white">
                                  {pickupAddress.fullName || 'Customer'}
                                </span>
                                <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold">
                                  {pickupAddress.phone || 'Phone'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                {pickupAddress.street}
                                {pickupAddress.street2 ? `, ${pickupAddress.street2}` : ''}, {pickupAddress.city}, {pickupAddress.state} - <strong className="font-mono text-slate-900 dark:text-white">{pickupAddress.zip}</strong>
                              </p>
                              {pickupLandmark && (
                                <p className="text-[11px] text-slate-500">
                                  <strong>Landmark / Note:</strong> {pickupLandmark}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsEditingAddress(true)}
                              className="text-xs font-bold text-blue-600 hover:underline shrink-0 flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 size={13} /> Edit Address
                            </button>
                          </div>
                        ) : (
                          /* Inline Address Edit Form */
                          <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-3">
                            <div className="text-xs font-bold text-blue-900 dark:text-blue-200">
                              Edit Doorstep Pickup Address
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <input
                                type="text"
                                placeholder="Full Name *"
                                value={pickupAddress.fullName}
                                onChange={e => setPickupAddress({ ...pickupAddress, fullName: e.target.value })}
                                className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                              />
                              <input
                                type="text"
                                placeholder="Phone Number *"
                                value={pickupAddress.phone}
                                onChange={e => setPickupAddress({ ...pickupAddress, phone: e.target.value })}
                                className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                              />
                              <input
                                type="text"
                                placeholder="Flat / House / Street Address *"
                                value={pickupAddress.street}
                                onChange={e => setPickupAddress({ ...pickupAddress, street: e.target.value })}
                                className="sm:col-span-2 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                              />
                              <input
                                type="text"
                                placeholder="City *"
                                value={pickupAddress.city}
                                onChange={e => setPickupAddress({ ...pickupAddress, city: e.target.value })}
                                className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                              />
                              <input
                                type="text"
                                placeholder="Pincode *"
                                value={pickupAddress.zip}
                                onChange={e => setPickupAddress({ ...pickupAddress, zip: e.target.value })}
                                className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                              />
                            </div>
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => setIsEditingAddress(false)}
                                className="px-3 py-1 text-xs font-bold bg-blue-600 text-white rounded-lg cursor-pointer"
                              >
                                Done Editing
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Optional Landmark / Pickup Instructions */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            Pickup Instructions / Landmark (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Near Apollo pharmacy, call before coming..."
                            value={pickupLandmark}
                            onChange={e => setPickupLandmark(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        </div>

                        {/* Step 2 Footer Actions */}
                        <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => setReturnStep(1)}
                            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                          >
                            <ChevronLeft size={14} /> Back
                          </button>
                          <button
                            type="button"
                            onClick={handleProceedToStep3}
                            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase rounded-lg shadow-sm transition-all cursor-pointer"
                          >
                            Continue
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : returnStep > 2 ? (
                    /* Step 2 Completed (Collapsed with Checkmark & Change Link) */
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                          ✓
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span className="text-slate-400 font-semibold">2. PICKUP ADDRESS</span>
                            <span className="text-emerald-600 font-medium text-[11px]">• {pickupAddress.fullName} ({pickupAddress.city})</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-md">
                            {pickupAddress.street}, {pickupAddress.city} - {pickupAddress.zip}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReturnStep(2)}
                        className="text-xs font-bold text-blue-600 hover:underline uppercase tracking-wide cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    /* Step 2 Upcoming / Inactive */
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 flex items-center gap-2.5 text-slate-400">
                      <span className="w-5 h-5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded flex items-center justify-center text-xs font-bold">
                        2
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider">PICKUP ADDRESS</span>
                    </div>
                  )}

                  {/* STEP 3: WHAT DO YOU WANT IN RETURN? (EXCHANGE OR REFUND) */}
                  {returnStep === 3 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
                      <div className="bg-blue-600 text-white font-extrabold text-xs uppercase px-4 py-3 flex items-center gap-2.5">
                        <span className="w-5 h-5 bg-white text-blue-600 rounded flex items-center justify-center text-xs font-black">
                          3
                        </span>
                        <span>WHAT DO YOU WANT IN RETURN?</span>
                      </div>

                      <div className="p-4 space-y-4 text-xs">
                        {/* 1. Select Exchange vs Refund */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => setReturnType('EXCHANGE')}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              returnType === 'EXCHANGE'
                                ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 shadow-xs ring-1 ring-purple-600'
                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-black text-xs text-purple-700 dark:text-purple-300">
                                <RotateCcw size={14} /> Exchange Item
                              </div>
                              {returnType === 'EXCHANGE' && <Check size={14} className="text-purple-600" />}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1 leading-snug">
                              Doorstep replacement for different size, color, or variant.
                            </div>
                          </button>

                          {productDetails?.returnPolicyType === 'EXCHANGE_ONLY' || productDetails?.isReturnable === false ? (
                            <div
                              className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-left opacity-70 cursor-not-allowed"
                              title="Cash refunds not applicable for this item"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-400">
                                  <Package size={14} /> Refund Money
                                </div>
                                <span className="text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold px-1.5 py-0.2 rounded uppercase">
                                  Not Allowed
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                                Replacement only for this product. Cash/bank refund is not allowed as per store policy.
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setReturnType('REFUND')}
                              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                returnType === 'REFUND'
                                  ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 shadow-xs ring-1 ring-blue-600'
                                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-black text-xs text-blue-700 dark:text-blue-300">
                                  <Package size={14} /> Refund Money
                                </div>
                                {returnType === 'REFUND' && <Check size={14} className="text-blue-600" />}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-1 leading-snug">
                                Return product and get 100% money back to Wallet, UPI or Bank.
                              </div>
                            </button>
                          )}
                        </div>

                        {/* 2A. Exchange Options: Real dynamic product variants */}
                        {returnType === 'EXCHANGE' && (
                          <div className="space-y-3 bg-purple-50/40 dark:bg-purple-950/20 p-3.5 rounded-2xl border border-purple-200 dark:border-purple-900/50">
                            <div className="font-bold text-purple-900 dark:text-purple-200 text-xs flex items-center justify-between">
                              <span>Choose Replacement Variant for this Product:</span>
                              {isLoadingProduct && (
                                <span className="text-[10px] text-purple-600 flex items-center gap-1 font-normal">
                                  <Loader2 size={12} className="animate-spin" /> Loading variants...
                                </span>
                              )}
                            </div>

                            {hasProductVariants ? (
                              <div className="space-y-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-purple-100 dark:border-purple-900/60">
                                {/* 1. Real Available Colors */}
                                {Array.isArray(productDetails.availableColors) && productDetails.availableColors.length > 0 && (
                                  <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                                      Select Desired Color / Finish:
                                    </label>
                                    <div className="flex gap-2 flex-wrap">
                                      {productDetails.availableColors.map((clr, i) => {
                                        const isSelected = String(selectedColor).toLowerCase() === String(clr.name).toLowerCase();
                                        const hex = getColorHex(clr.name, clr.code);
                                        return (
                                          <button
                                            key={i}
                                            type="button"
                                            onClick={() => handleColorSelect(clr.name)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border ${
                                              isSelected
                                                ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                                : 'bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-purple-300'
                                            }`}
                                          >
                                            <span
                                              className="w-3 h-3 rounded-full border border-black/20 shrink-0"
                                              style={{ backgroundColor: hex }}
                                            />
                                            <span>{clr.name}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* 2. Real Available Sizes or Capacities */}
                                {Array.isArray(productDetails.availableSizes) && productDetails.availableSizes.length > 0 && (
                                  <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                                      Select Desired Size / Capacity:
                                    </label>
                                    <div className="flex gap-2 flex-wrap">
                                      {productDetails.availableSizes.map((sz, i) => {
                                        const isSelected = String(selectedSize).toLowerCase() === String(sz.name).toLowerCase();
                                        return (
                                          <button
                                            key={i}
                                            type="button"
                                            onClick={() => handleSizeSelect(sz.name)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-all border ${
                                              isSelected
                                                ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                                : 'bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-purple-300'
                                            }`}
                                          >
                                            {sz.name}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Selected Variant Summary & Live Price Difference */}
                                <div className="p-2.5 bg-purple-50/70 dark:bg-purple-950/40 rounded-lg border border-purple-200 dark:border-purple-800 flex items-center justify-between text-xs mt-2">
                                  <div>
                                    <div className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300">Selected Replacement:</div>
                                    <div className="font-bold text-slate-900 dark:text-white">
                                      {replacementVariantSummary || 'Default Variant'}
                                      {selectedVariant?.sku && <span className="text-[10px] font-mono text-slate-400 ml-1">({selectedVariant.sku})</span>}
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    <div className="text-[10px] uppercase font-bold text-slate-500">Price Diff:</div>
                                    <div className={`font-black text-xs ${exchangePriceDifference > 0 ? 'text-amber-600' : exchangePriceDifference < 0 ? 'text-emerald-600' : 'text-purple-700'}`}>
                                      {exchangePriceDifference > 0
                                        ? `Extra to Pay: +${formatCurrency(exchangePriceDifference)} (at Doorstep)`
                                        : exchangePriceDifference < 0
                                        ? `Difference Refund: -${formatCurrency(Math.abs(exchangePriceDifference))}`
                                        : '₹0.00 (Even Replacement)'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* Non-variant product: Standard 1:1 Replacement */
                              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-purple-100 dark:border-purple-900 text-xs space-y-1">
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <CheckCircle2 size={14} className="text-purple-600" />
                                  Standard 1:1 Identical Replacement
                                </div>
                                <p className="text-slate-500 text-[11px]">
                                  This product does not have multiple sizes/colors. A brand new sealed replacement of the exact same product will be delivered to your doorstep.
                                </p>
                                <div className="text-[11px] font-bold text-purple-700 pt-1">
                                  Price Difference: ₹0.00 (Free Replacement)
                                </div>
                              </div>
                            )}

                            {/* Doorstep Swap Notice */}
                            <div className="p-2 bg-purple-100/70 dark:bg-purple-950/60 rounded-xl border border-purple-200 dark:border-purple-800 text-[11px] text-purple-900 dark:text-purple-200 flex items-start gap-1.5">
                              <Sparkles size={13} className="shrink-0 text-purple-600 mt-0.5" />
                              <span>
                                <strong>Doorstep Swap:</strong> The delivery rider brings your replacement item and collects your old item simultaneously.
                              </span>
                            </div>
                          </div>
                        )}

                        {/* 2B. Refund Options: Destination selection */}
                        {returnType === 'REFUND' && (
                          <div className="space-y-3 bg-blue-50/40 dark:bg-blue-950/20 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900/50">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide block">
                              Select Refund Mode / Destination:
                            </label>

                            <div className="space-y-2">
                              {/* 1. Wallet / Store Credit */}
                              <label className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-start gap-2.5 transition-all ${
                                refundMode === 'WALLET_CREDIT'
                                  ? 'border-blue-500 bg-white dark:bg-slate-800 shadow-2xs ring-1 ring-blue-500'
                                  : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-800/60'
                              }`}>
                                <input
                                  type="radio"
                                  name="refundMode"
                                  checked={refundMode === 'WALLET_CREDIT'}
                                  onChange={() => setRefundMode('WALLET_CREDIT')}
                                  className="mt-0.5 text-blue-600"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <Wallet size={14} className="text-blue-600" />
                                    <strong className="text-slate-900 dark:text-white">JTS Store Credit / Wallet</strong>
                                    <span className="text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold px-1.5 py-0.2 rounded uppercase">
                                      Fastest (Within 2 Hours)
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">
                                    Instant credit upon doorstep verification. Can be used anytime on future purchases.
                                  </div>
                                </div>
                              </label>

                              {/* 2. Instant UPI */}
                              <label className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-start gap-2.5 transition-all ${
                                refundMode === 'UPI'
                                  ? 'border-blue-500 bg-white dark:bg-slate-800 shadow-2xs ring-1 ring-blue-500'
                                  : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-800/60'
                              }`}>
                                <input
                                  type="radio"
                                  name="refundMode"
                                  checked={refundMode === 'UPI'}
                                  onChange={() => setRefundMode('UPI')}
                                  className="mt-0.5 text-blue-600"
                                />
                                <div className="flex-1 space-y-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <Sparkles size={14} className="text-purple-600" />
                                    <strong className="text-slate-900 dark:text-white">Instant UPI Transfer</strong>
                                    <span className="text-[9px] bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-extrabold px-1.5 py-0.2 rounded uppercase">
                                      Direct to Bank
                                    </span>
                                  </div>
                                  {refundMode === 'UPI' && (
                                    <input
                                      type="text"
                                      value={refundUpiId}
                                      onChange={e => setRefundUpiId(e.target.value)}
                                      placeholder="Enter your UPI ID (e.g. mobile@upi or name@okhdfcbank)"
                                      className="w-full px-2.5 py-1.5 text-xs border border-purple-300 dark:border-purple-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                                      required
                                    />
                                  )}
                                </div>
                              </label>

                              {/* 3. Direct Bank Account */}
                              <label className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-start gap-2.5 transition-all ${
                                refundMode === 'BANK_ACCOUNT'
                                  ? 'border-blue-500 bg-white dark:bg-slate-800 shadow-2xs ring-1 ring-blue-500'
                                  : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-800/60'
                              }`}>
                                <input
                                  type="radio"
                                  name="refundMode"
                                  checked={refundMode === 'BANK_ACCOUNT'}
                                  onChange={() => setRefundMode('BANK_ACCOUNT')}
                                  className="mt-0.5 text-blue-600"
                                />
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-1.5">
                                    <Building2 size={14} className="text-slate-700 dark:text-slate-300" />
                                    <strong className="text-slate-900 dark:text-white">Bank Account Transfer (NEFT/IMPS)</strong>
                                  </div>
                                  {refundMode === 'BANK_ACCOUNT' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                      <input
                                        type="text"
                                        placeholder="Account Number"
                                        value={refundBankDetails.accountNumber}
                                        onChange={e => setRefundBankDetails({ ...refundBankDetails, accountNumber: e.target.value })}
                                        className="px-2.5 py-1.5 text-xs border rounded-lg bg-slate-50 dark:bg-slate-900"
                                        required
                                      />
                                      <input
                                        type="text"
                                        placeholder="Re-enter Account Number"
                                        value={refundBankDetails.confirmAccountNumber}
                                        onChange={e => setRefundBankDetails({ ...refundBankDetails, confirmAccountNumber: e.target.value })}
                                        className="px-2.5 py-1.5 text-xs border rounded-lg bg-slate-50 dark:bg-slate-900"
                                        required
                                      />
                                      <input
                                        type="text"
                                        placeholder="IFSC Code (e.g. HDFC0001234)"
                                        value={refundBankDetails.ifscCode}
                                        onChange={e => setRefundBankDetails({ ...refundBankDetails, ifscCode: e.target.value.toUpperCase() })}
                                        className="px-2.5 py-1.5 text-xs border rounded-lg bg-slate-50 dark:bg-slate-900 font-mono"
                                        required
                                      />
                                      <input
                                        type="text"
                                        placeholder="Account Holder Name"
                                        value={refundBankDetails.accountHolderName}
                                        onChange={e => setRefundBankDetails({ ...refundBankDetails, accountHolderName: e.target.value })}
                                        className="px-2.5 py-1.5 text-xs border rounded-lg bg-slate-50 dark:bg-slate-900"
                                        required
                                      />
                                    </div>
                                  )}
                                </div>
                              </label>

                              {/* 4. Original Payment Method */}
                              <label className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center gap-2 ${
                                refundMode === 'ORIGINAL_PAYMENT'
                                  ? 'border-blue-500 bg-white dark:bg-slate-800'
                                  : 'border-slate-200 dark:border-slate-800 opacity-80'
                              }`}>
                                <input
                                  type="radio"
                                  name="refundMode"
                                  checked={refundMode === 'ORIGINAL_PAYMENT'}
                                  onChange={() => setRefundMode('ORIGINAL_PAYMENT')}
                                  className="text-blue-600"
                                />
                                <span className="text-slate-700 dark:text-slate-300">
                                  Original Payment Source (Cards / Netbanking reversal - 3 to 5 business days)
                                </span>
                              </label>
                            </div>

                            {/* Refund Amount Banner */}
                            <div className="p-2.5 bg-blue-100/70 dark:bg-blue-950/60 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
                              <div>
                                <span className="font-bold text-blue-900 dark:text-blue-200 block">Total Refund Amount:</span>
                                {Number(returnModalOrder?.shippingAmount || 0) > 0 && (
                                  <span className="text-[10px] text-blue-700/80 dark:text-blue-400 block">
                                    (Product price only. ₹{returnModalOrder.shippingAmount} delivery charge is non-refundable)
                                  </span>
                                )}
                              </div>
                              <span className="text-sm font-black text-blue-700 dark:text-blue-300">{formatCurrency(originalItemPrice)}</span>
                            </div>
                          </div>
                        )}

                        {/* Step 3 Footer Actions */}
                        <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => setReturnStep(2)}
                            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                          >
                            <ChevronLeft size={14} /> Back
                          </button>
                          <button
                            type="submit"
                            disabled={isReturning || isReadingImages}
                            className={`px-8 py-2.5 text-white font-black text-xs uppercase rounded-lg shadow-md transition-all cursor-pointer ${
                              returnType === 'EXCHANGE'
                                ? 'bg-purple-600 hover:bg-purple-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            {isReturning ? 'Submitting Request...' : returnType === 'EXCHANGE' ? 'Confirm Exchange' : 'Confirm Return & Refund'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Step 3 Upcoming / Inactive */
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 flex items-center gap-2.5 text-slate-400">
                      <span className="w-5 h-5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded flex items-center justify-center text-xs font-bold">
                        3
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider">WHAT DO YOU WANT IN RETURN?</span>
                    </div>
                  )}

                </div>

                {/* RIGHT COLUMN: FLIPKART ITEM DETAILS SIDEBAR */}
                <div className="w-72 shrink-0 space-y-3 hidden md:block">
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-2xs">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      ITEM DETAILS
                    </h4>
                    
                    {/* Multiple items switcher (if order has multiple items) */}
                    {(returnModalOrder.items || []).length > 1 && (
                      <div className="text-[10px] text-slate-500 font-medium">
                        Returning item:
                        <div className="space-y-1 mt-1">
                          {returnModalOrder.items.map((it, idx) => (
                            <div
                              key={idx}
                              onClick={() => setSelectedItemIndex(idx)}
                              className={`p-1.5 rounded-lg border text-xs cursor-pointer flex items-center gap-2 ${
                                selectedItemIndex === idx ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 font-bold' : 'border-slate-200'
                              }`}
                            >
                              <input type="radio" checked={selectedItemIndex === idx} onChange={() => setSelectedItemIndex(idx)} />
                              <span className="truncate">{it.productId?.name || it.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Selected Item Card (as in Flipkart screenshot) */}
                    <div className="flex items-start justify-between gap-3 pt-1">
                      <div className="space-y-1 min-w-0">
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white leading-tight line-clamp-2">
                          {currentReturnItem.productId?.name || currentReturnItem.name}
                        </h5>
                        <div className="text-sm font-black text-slate-900 dark:text-white">
                          {formatCurrency(originalItemPrice)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Qty: {currentReturnItem.quantity || 1}
                        </div>
                      </div>
                      <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                        {currentReturnItem.productId?.uploadImage || currentReturnItem.image ? (
                          <img
                            src={currentReturnItem.productId?.uploadImage || currentReturnItem.image}
                            alt="item"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package size={20} className="text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Flipkart / Amazon Trust Badges */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                        <span>7-Days Doorstep Return Guarantee</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Truck size={14} className="text-blue-600 shrink-0" />
                        <span>Free Rider Doorstep Pickup</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-purple-600 shrink-0" />
                        <span>OTP Verification for Safe Handover</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUCCESS CONFIRMATION POPUP (WITH DOORSTEP PICKUP OTP) */}
      {successInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {successInfo.isExchange ? 'Exchange Request Confirmed!' : 'Return & Refund Confirmed!'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Order <strong className="text-slate-800 dark:text-slate-200">{successInfo.orderId}</strong> has been scheduled for reverse doorstep pickup.
              </p>
            </div>

            {/* Verification OTP Box */}
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-1">
              <div className="text-[11px] font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wider">
                Doorstep Pickup Verification Code (OTP)
              </div>
              <div className="font-mono text-2xl font-black text-amber-600 tracking-widest">
                {successInfo.pickupOtp}
              </div>
              <div className="text-[10px] text-amber-700 dark:text-amber-300">
                Please share this code with the rider when they arrive to verify your return package.
              </div>
            </div>

            <div className="text-[11px] text-slate-500 text-left bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl space-y-1">
              <div>📦 <strong>Packing:</strong> Keep product in original box with tags and accessories.</div>
              {successInfo.isExchange ? (
                <div>🔄 <strong>Replacement:</strong> {successInfo.replacementName}</div>
              ) : (
                <div>💳 <strong>Refund:</strong> {formatCurrency(successInfo.refundAmount)} via {successInfo.refundMode}</div>
              )}
            </div>

            <button
              onClick={() => setSuccessInfo(null)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              Done & View Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrders;

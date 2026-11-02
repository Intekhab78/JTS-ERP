import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ShoppingBag, Star, ShieldCheck, Truck, RotateCcw,
  ChevronRight, CheckCircle2, AlertTriangle, Minus, Plus, Heart,
  Barcode as BarcodeIcon, Clock, Award, Share2, MapPin, Check, Zap, ZoomIn, XCircle
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { getProductImage, formatImageUrl, getFallbackImage, NEUTRAL_PRODUCT_FALLBACK } from '../utils/productImageHelper';
import { ProductCard } from '../components/common/ProductCard';
import { QuickViewModal } from '../components/common/QuickViewModal';

const getColorHex = (colorName, colorCode) => {
  if (colorCode && (colorCode.startsWith('#') || colorCode.startsWith('rgb'))) return colorCode;
  const name = (colorName || '').toLowerCase().trim();
  const map = {
    green: '#10B981',
    emerald: '#059669',
    blue: '#2563EB',
    navy: '#1E3A8A',
    sky: '#0284C7',
    cyan: '#06B6D4',
    teal: '#0D9488',
    red: '#EF4444',
    rose: '#F43F5E',
    crimson: '#BE123C',
    black: '#0F172A',
    dark: '#1E293B',
    white: '#FFFFFF',
    grey: '#64748B',
    gray: '#64748B',
    silver: '#CBD5E1',
    yellow: '#F59E0B',
    amber: '#D97706',
    gold: '#EAB308',
    orange: '#F97316',
    purple: '#8B5CF6',
    violet: '#7C3AED',
    indigo: '#6366F1',
    pink: '#EC4899',
    brown: '#78350F',
    maroon: '#800000',
    beige: '#F5F5DC',
    olive: '#808000'
  };
  return map[name] || '#94A3B8';
};

export const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, openCart, syncItemStock } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { isAuthenticated, customer, token } = useCustomerAuth();
  const { formatCurrency, returnWindowDays, freeShippingThreshold } = useStoreSettings();

  const [productData, setProductData] = useState(null);
  const product = productData;
  const [reviews, setReviews] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('DETAILS');
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [deliveryPincode, setDeliveryPincode] = useState(() => localStorage.getItem('jts_delivery_location') || localStorage.getItem('jts_pincode') || 'Indore, 452001');

  // Dynamic Review & Rating States
  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState('');
  const [reviewErrorMsg, setReviewErrorMsg] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated || !token) {
      setReviewErrorMsg('Please sign in to rate and write a review.');
      return;
    }
    if (!newComment.trim()) {
      setReviewErrorMsg('Please write a brief comment sharing your experience.');
      return;
    }
    setIsSubmittingReview(true);
    setReviewErrorMsg('');
    setReviewSuccessMsg('');
    try {
      const { data } = await axios.post(`/api/v1/ecommerce/products/${id}/reviews`, {
        rating: Number(newRating) || 5,
        comment: newComment.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const fullReview = {
        ...data,
        rating: Number(newRating) || 5,
        comment: newComment.trim(),
        createdAt: new Date().toISOString(),
        customerId: {
          _id: customer?._id,
          name: customer?.name || `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || 'Verified Customer',
          firstName: customer?.firstName || 'Verified Customer'
        }
      };

      setReviews(prev => [fullReview, ...prev]);
      setNewComment('');
      setNewRating(5);
      setReviewSuccessMsg('Thank you! Your verified rating and review have been submitted.');
      setShowReviewForm(false);
    } catch (err) {
      setReviewErrorMsg(err.response?.data?.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const reviewCount = Array.isArray(reviews) ? reviews.length : 0;
  const avgRating = reviewCount > 0
    ? (reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / reviewCount).toFixed(1)
    : (productData?.rating && Number(productData.rating) > 0 ? Number(productData.rating).toFixed(1) : null);

  const ratingBreakdown = React.useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (!Array.isArray(reviews)) return counts;
    reviews.forEach(r => {
      const rate = Math.round(Number(r.rating) || 5);
      if (counts[rate] !== undefined) counts[rate]++;
    });
    return counts;
  }, [reviews]);

  // Amazon-style Image Zoom State
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  const handleImageMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  };

  const isPlaceholder = !selectedImage ||
    selectedImage === NEUTRAL_PRODUCT_FALLBACK ||
    (typeof selectedImage === 'string' && (selectedImage.includes('No%20Image%20Available') || selectedImage.includes('No Image Available')));

  const handleImageMouseEnter = () => {
    if (!isPlaceholder) setIsZoomed(true);
  };

  const handleImageMouseLeave = () => {
    setIsZoomed(false);
    setZoomPos({ x: 50, y: 50 });
  };

  useEffect(() => {
    const handleLocationUpdate = (e) => {
      const detail = e?.detail;
      if (detail?.text) {
        setDeliveryPincode(detail.text);
      } else if (detail?.pincode) {
        setDeliveryPincode(detail.pincode);
      }
    };
    window.addEventListener('jts_location_updated', handleLocationUpdate);
    return () => window.removeEventListener('jts_location_updated', handleLocationUpdate);
  }, []);

  // Quick View Modal State
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  const handleOpenQuickView = (prod) => {
    setQuickViewProduct(prod);
    setIsQuickViewOpen(true);
  };

  useEffect(() => {
    fetchProductDetails();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  const fetchProductDetails = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get(`/api/v1/ecommerce/products/${id}`);
      const prod = data.product;
      setProductData(prod);
      setReviews(data.reviews || []);
      setRelatedProducts(data.relatedProducts || []);

      const hasActualVariants = Boolean(prod?.hasVariants && Array.isArray(prod?.variants) && prod.variants.length > 0);
      if (hasActualVariants) {
        // Pick first active variant (preferably in-stock)
        const initialVariant = prod.variants.find(v => v.inStock) || prod.variants[0];
        const vAttrs = initialVariant.attributes || {};
        const vColor = vAttrs.Color || vAttrs.color || '';
        let vSize = vAttrs.Size || vAttrs.size || '';
        if (!vSize) {
          const other = Object.entries(vAttrs).find(([k]) => k.toLowerCase() !== 'color');
          if (other) vSize = other[1] || '';
        }

        const hasColor = Array.isArray(prod.availableColors) && prod.availableColors.length > 0;
        const hasSize = Array.isArray(prod.availableSizes) && prod.availableSizes.length > 0;

        setSelectedColor(hasColor ? (vColor || prod.availableColors[0]?.name || '') : '');
        setSelectedSize(hasSize ? (vSize || prod.availableSizes[0]?.name || '') : '');
      } else {
        // Non-variant or color-gallery-only product: default to first available color if defined
        const hasColor = Array.isArray(prod?.availableColors) && prod.availableColors.length > 0;
        const defaultColor = hasColor
          ? prod.availableColors[0]?.name
          : (Array.isArray(prod?.colorGalleries) && prod.colorGalleries.length > 0 ? prod.colorGalleries[0]?.colorName : (prod?.color || ''));
        setSelectedColor(defaultColor || '');
        setSelectedSize(prod?.size || '');
      }
    } catch (e) {
      console.error('Failed to load product detail:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const hasVariants = Boolean(
    productData?.hasVariants &&
    Array.isArray(productData?.variants) &&
    productData.variants.length > 0
  );

  const availableColors = React.useMemo(() => {
    if (!hasVariants || !Array.isArray(productData?.availableColors)) return [];
    return productData.availableColors;
  }, [hasVariants, productData]);

  const availableSizes = React.useMemo(() => {
    if (!hasVariants || !Array.isArray(productData?.availableSizes)) return [];
    return productData.availableSizes;
  }, [hasVariants, productData]);

  const hasColorDimension = availableColors.length > 0;
  const hasSizeDimension = availableSizes.length > 0;

  // Resolve current active variant matching selectedColor and/or selectedSize
  const currentVariant = React.useMemo(() => {
    if (!hasVariants) {
      return null;
    }
    return productData.variants.find(v => {
      const attrs = v.attributes || {};
      const vColor = attrs.Color || attrs.color || '';
      let vSize = attrs.Size || attrs.size || '';
      if (!vSize) {
        const otherEntry = Object.entries(attrs).find(([k]) => k.toLowerCase() !== 'color');
        if (otherEntry) vSize = otherEntry[1] || '';
      }

      const matchColor = !hasColorDimension || !selectedColor || String(vColor).toLowerCase() === String(selectedColor).toLowerCase();
      const matchSize = !hasSizeDimension || !selectedSize || String(vSize).toLowerCase() === String(selectedSize).toLowerCase();

      return matchColor && matchSize;
    }) || null;
  }, [hasVariants, productData, selectedColor, selectedSize, hasColorDimension, hasSizeDimension]);

  // Gallery resolution hierarchy: Variant Images -> Color Gallery -> Parent General Images
  const allImages = React.useMemo(() => {
    if (!productData) return [];

    // 1. If matching variant has exact-variant images
    if (currentVariant && (currentVariant.uploadImage || (Array.isArray(currentVariant.images) && currentVariant.images.length > 0))) {
      const vImgs = [currentVariant.uploadImage, ...(Array.isArray(currentVariant.images) ? currentVariant.images : [])].filter(Boolean);
      const formatted = Array.from(new Set(vImgs.map(formatImageUrl).filter(Boolean)));
      if (formatted.length > 0) return formatted;
    }

    // 2. If selected color has a color gallery
    if (selectedColor && Array.isArray(productData.colorGalleries)) {
      const matchedCg = productData.colorGalleries.find(cg =>
        cg.colorName && String(cg.colorName).toLowerCase() === String(selectedColor).toLowerCase()
      );
      if (matchedCg && (matchedCg.uploadImage || (matchedCg.images && matchedCg.images.length > 0))) {
        const cgImgs = [matchedCg.uploadImage, ...(matchedCg.images || [])].filter(Boolean);
        const formatted = Array.from(new Set(cgImgs.map(formatImageUrl).filter(Boolean)));
        if (formatted.length > 0) return formatted;
      }
    }

    // 2.5 Fallback to first available color gallery if color galleries exist
    if (Array.isArray(productData.colorGalleries) && productData.colorGalleries.length > 0) {
      const firstCg = productData.colorGalleries[0];
      if (firstCg && (firstCg.uploadImage || (firstCg.images && firstCg.images.length > 0))) {
        const cgImgs = [firstCg.uploadImage, ...(firstCg.images || [])].filter(Boolean);
        const formatted = Array.from(new Set(cgImgs.map(formatImageUrl).filter(Boolean)));
        if (formatted.length > 0) return formatted;
      }
    }

    // 3. Fallback to general product images
    const rawImages = [
      productData.uploadImage,
      ...(Array.isArray(productData.images) ? productData.images : [])
    ];
    const all = Array.from(new Set(rawImages.map(formatImageUrl).filter(Boolean)));
    if (all.length === 0) {
      all.push(getProductImage(productData));
    }
    return all;
  }, [productData, selectedColor, currentVariant]);

  // Keep selectedImage synchronized with active gallery
  useEffect(() => {
    if (allImages.length > 0) {
      const formattedSelected = formatImageUrl(selectedImage);
      if (!formattedSelected || !allImages.includes(formattedSelected)) {
        setSelectedImage(allImages[0]);
      }
    }
  }, [allImages]);

  // Color selection: updates color, keeps compatible size if size dimension exists, updates gallery
  const handleColorSelect = (colorName) => {
    setSelectedColor(colorName);
    setSelectedImage(null);
    if (hasVariants && hasSizeDimension && Array.isArray(productData?.variants)) {
      const sizesForColor = productData.variants
        .filter(v => {
          const c = v.attributes?.Color || v.attributes?.color;
          return String(c).toLowerCase() === String(colorName).toLowerCase();
        })
        .map(v => {
          const s = v.attributes?.Size || v.attributes?.size;
          if (s) return s;
          const other = Object.entries(v.attributes || {}).find(([k]) => k.toLowerCase() !== 'color');
          return other ? other[1] : null;
        })
        .filter(Boolean);

      if (selectedSize && sizesForColor.some(s => String(s).toLowerCase() === String(selectedSize).toLowerCase())) {
        // Size is compatible, preserve it
      } else if (sizesForColor.length > 0) {
        setSelectedSize(sizesForColor[0]);
      }
    }
  };

  // Size selection: updates size while preserving compatible color if color dimension exists
  const handleSizeSelect = (sizeName) => {
    setSelectedSize(sizeName);
    if (hasVariants && hasColorDimension && Array.isArray(productData?.variants)) {
      const colorsForSize = productData.variants
        .filter(v => {
          const s = v.attributes?.Size || v.attributes?.size ||
            (Object.entries(v.attributes || {}).find(([k]) => k.toLowerCase() !== 'color')?.[1]);
          return String(s).toLowerCase() === String(sizeName).toLowerCase();
        })
        .map(v => v.attributes?.Color || v.attributes?.color)
        .filter(Boolean);

      if (selectedColor && colorsForSize.some(c => String(c).toLowerCase() === String(selectedColor).toLowerCase())) {
        // Color is compatible, preserve it
      } else if (colorsForSize.length > 0) {
        setSelectedColor(colorsForSize[0]);
      }
    }
  };

  // Check if a size is compatible and in-stock for currently selected color
  const isSizeAvailableForCurrentColor = (sizeName) => {
    if (!productData?.hasVariants) return true;
    const matching = productData.variants?.find(v => {
      const c = v.attributes?.Color || v.attributes?.color;
      const s = v.attributes?.Size || v.attributes?.size ||
        (Object.entries(v.attributes || {}).find(([k]) => k.toLowerCase() !== 'color')?.[1]);
      const matchColor = !hasColorDimension || !selectedColor || String(c).toLowerCase() === String(selectedColor).toLowerCase();
      const matchSize = String(s).toLowerCase() === String(sizeName).toLowerCase();
      return matchColor && matchSize;
    });
    return matching && matching.inStock !== false && (matching.availableStock === undefined || matching.availableStock > 0);
  };

  // Check if a color is compatible and in-stock for currently selected size
  const isColorAvailableForCurrentSize = (colorName) => {
    if (!productData?.hasVariants) return true;
    const matching = productData.variants?.find(v => {
      const c = v.attributes?.Color || v.attributes?.color;
      const s = v.attributes?.Size || v.attributes?.size ||
        (Object.entries(v.attributes || {}).find(([k]) => k.toLowerCase() !== 'color')?.[1]);
      const matchSize = !hasSizeDimension || !selectedSize || String(s).toLowerCase() === String(selectedSize).toLowerCase();
      const matchColor = String(c).toLowerCase() === String(colorName).toLowerCase();
      return matchColor && matchSize;
    });
    return matching && matching.inStock !== false && (matching.availableStock === undefined || matching.availableStock > 0);
  };

  const price = currentVariant
    ? (currentVariant.effectivePrice || currentVariant.salesPrice || productData?.salesPrice || productData?.price || 0)
    : (productData?.salesPrice || productData?.price || 0);
  const originalPrice = productData?.price || price;
  const hasDiscount = originalPrice > price && price > 0;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const availableQuantity = currentVariant
    ? (typeof currentVariant.availableStock === 'number' ? currentVariant.availableStock : (currentVariant.inStock !== false ? 100 : 0))
    : (typeof productData?.availableStock === 'number' ? productData.availableStock : (productData?.inStock !== false ? 100 : 0));

  const isAvailable = currentVariant
    ? (currentVariant.inStock !== false && availableQuantity > 0)
    : (productData?.inStock !== false && availableQuantity > 0);

  const displaySku = currentVariant ? currentVariant.sku : productData?.sku;

  // Keep cart items updated with real-time stock
  useEffect(() => {
    if (productData && typeof availableQuantity === 'number') {
      const vId = currentVariant?._id || null;
      const itemKey = vId ? `${productData._id}_${vId}` : `${productData._id}_${selectedColor}_${selectedSize}`;
      if (syncItemStock) {
        syncItemStock(itemKey, availableQuantity);
        if (vId) syncItemStock(vId, availableQuantity);
        syncItemStock(productData._id, availableQuantity);
      }
    }
  }, [productData, currentVariant, selectedColor, selectedSize, availableQuantity, syncItemStock]);

  if (isLoading) {
    return <div className="p-16 text-center text-slate-500 font-medium animate-pulse">Loading product details...</div>;
  }

  if (!productData) {
    return (
      <div className="p-16 text-center space-y-3">
        <h2 className="text-xl font-bold text-slate-900">Product Not Found</h2>
        <Link to="/catalog" className="text-sm font-bold text-blue-600 hover:underline">
          Return to Catalog
        </Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (hasVariants && !currentVariant) {
      if (hasColorDimension && hasSizeDimension) {
        alert('Please select an available color and size combination.');
      } else if (hasColorDimension) {
        alert('Please select an available color.');
      } else if (hasSizeDimension) {
        alert('Please select an available size.');
      } else {
        alert('Please select an available product option.');
      }
      return;
    }
    const safeQty = Math.min(Math.max(1, quantity), availableQuantity);
    addToCart(productData, safeQty, {
      color: (hasVariants && hasColorDimension) ? selectedColor : (productData.color || ''),
      size: (hasVariants && hasSizeDimension) ? selectedSize : (productData.size || ''),
      variantId: currentVariant?._id || null,
      variantSku: currentVariant?.sku || productData.sku,
      price: price,
      uploadImage: selectedImage,
      attributes: currentVariant?.attributes || {},
      availableStock: availableQuantity
    });
  };

  const handleBuyNow = () => {
    if (hasVariants && !currentVariant) {
      if (hasColorDimension && hasSizeDimension) {
        alert('Please select an available color and size combination.');
      } else if (hasColorDimension) {
        alert('Please select an available color.');
      } else if (hasSizeDimension) {
        alert('Please select an available size.');
      } else {
        alert('Please select an available product option.');
      }
      return;
    }
    const safeQty = Math.min(Math.max(1, quantity), availableQuantity);
    addToCart(productData, safeQty, {
      color: (hasVariants && hasColorDimension) ? selectedColor : (productData.color || ''),
      size: (hasVariants && hasSizeDimension) ? selectedSize : (productData.size || ''),
      variantId: currentVariant?._id || null,
      variantSku: currentVariant?.sku || productData.sku,
      price: price,
      uploadImage: selectedImage,
      attributes: currentVariant?.attributes || {},
      availableStock: availableQuantity
    });
    navigate('/checkout');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: productData.name,
        url: window.location.href,
      }).catch(() => { });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Product link copied to clipboard!');
    }
  };

  return (
    <div className="w-[96%] mx-auto py-5 sm:py-6 space-y-8 sm:space-y-10">

      {/* Breadcrumb (Panel 3 Exact Match) */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto py-1">
        <Link to="/" className="hover:text-blue-600">Home</Link>
        <ChevronRight size={12} />
        <Link to="/catalog" className="hover:text-blue-600">
          {productData.department || 'Fashion'}
        </Link>
        {productData.category && (
          <>
            <ChevronRight size={12} />
            <Link to={`/catalog?category=${encodeURIComponent(productData.category)}`} className="hover:text-blue-600">
              {productData.category}
            </Link>
          </>
        )}
        <ChevronRight size={12} />
        <span className="font-bold text-slate-800 truncate max-w-xs">{productData.name}</span>
      </div>

      {/* Main 2-Column Product Layout (Panel 3 Exact Match) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

        {/* LEFT: Image Gallery with Left Vertical Thumbnails */}
        <div className="lg:col-span-6 flex flex-col sm:flex-row gap-4 items-start">

          {/* Vertical Thumbnail Strip on Left */}
          {allImages.length > 1 && (
            <div className="flex sm:flex-col gap-2.5 overflow-x-auto sm:overflow-y-auto max-h-[440px] sm:max-h-[460px] shrink-0 no-scrollbar order-2 sm:order-1">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedImage(img);
                    setIsZoomed(false);
                  }}
                  className={`w-15 h-15 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 shrink-0 p-1 bg-white cursor-pointer transition-all ${
                    formatImageUrl(selectedImage) === img ? 'border-blue-600 shadow-sm ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <img
                    src={img}
                    alt={`thumb-${i}`}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getFallbackImage(productData);
                    }}
                    className="w-full h-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Large Main Product Container with Amazon-Style Interactive Zoom */}
          <div className="flex-1 w-full order-1 sm:order-2 space-y-2.5 max-w-[470px]">
            <div
              className={`w-full aspect-square max-h-[440px] sm:max-h-[460px] bg-slate-50/40 rounded-2xl border border-slate-200 p-4 sm:p-5 flex items-center justify-center overflow-hidden relative shadow-xs select-none group ${
                isPlaceholder ? 'cursor-default' : 'cursor-crosshair'
              }`}
              onMouseEnter={handleImageMouseEnter}
              onMouseLeave={handleImageMouseLeave}
              onMouseMove={handleImageMouseMove}
            >
              {discountPercent > 0 && (
                <div className="absolute top-3 left-3 z-10 px-2.5 py-1 bg-emerald-600 text-white font-black text-[10px] uppercase rounded-full shadow-xs pointer-events-none">
                  {discountPercent}% OFF
                </div>
              )}
              {selectedImage ? (
                <img
                  src={formatImageUrl(selectedImage)}
                  alt={productData.name}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = getFallbackImage(productData);
                  }}
                  style={{
                    transformOrigin: isZoomed ? `${zoomPos.x}% ${zoomPos.y}%` : 'center center',
                    transform: isZoomed ? 'scale(2.2)' : 'scale(1)',
                    transition: isZoomed ? 'transform-origin 0.05s ease-out, transform 0.15s ease-out' : 'transform 0.3s ease-out'
                  }}
                  className="w-full h-full object-contain pointer-events-none select-none will-change-transform"
                />
              ) : (
                <ShoppingBag size={80} className="text-slate-300 pointer-events-none" />
              )}

              {/* Amazon-style "Roll over image to zoom" hint */}
              {!isZoomed && selectedImage && !isPlaceholder && (
                <div className="hidden sm:inline-flex items-center gap-1.5 absolute bottom-3 right-3 bg-white/90 backdrop-blur-xs border border-slate-200/90 text-[10px] font-semibold text-slate-500 px-2.5 py-1 rounded-full shadow-2xs pointer-events-none transition-opacity">
                  <ZoomIn size={12} className="text-slate-400" />
                  <span>Roll over image to zoom</span>
                </div>
              )}
            </div>

            {/* Share Button Under Image */}
            <div className="flex items-center justify-center pt-0.5">
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
              >
                <Share2 size={14} />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Product Info, Options & Purchase Box */}
        <div className="lg:col-span-6 space-y-5">

          {/* Brand & Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              {productData.brand && (
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  {productData.brand}
                </span>
              )}
              <span className="text-[11px] text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                SKU: {displaySku}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight">
              {productData.name}
            </h1>

            {/* Ratings and Review Count (100% Dynamic) */}
            {avgRating ? (
              <div className="flex items-center gap-2 text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('REVIEWS');
                    document.getElementById('product-tabs-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex items-center bg-emerald-700 hover:bg-emerald-800 text-white px-2 py-0.5 rounded-md font-bold text-xs gap-1 transition-colors cursor-pointer shadow-2xs"
                  title="View customer ratings"
                >
                  <span>{avgRating}</span>
                  <Star size={11} className="fill-white" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('REVIEWS');
                    document.getElementById('product-tabs-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-slate-500 hover:text-blue-600 transition-colors cursor-pointer font-medium"
                >
                  ({reviewCount} {reviewCount === 1 ? 'rating' : 'ratings'})
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs pt-1">
                <div className="flex items-center text-slate-300">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={12} className="text-slate-300" />
                  ))}
                </div>
                <span className="text-slate-400 font-medium">No ratings yet</span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('REVIEWS');
                    setShowReviewForm(true);
                    document.getElementById('product-tabs-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-blue-600 hover:underline font-bold text-xs cursor-pointer ml-1"
                >
                  Rate this product
                </button>
              </div>
            )}
          </div>

          {/* Pricing Section */}
          <div className="space-y-1 pt-1">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-[#172033]">
                {formatCurrency(price)}
              </span>
              {hasDiscount && (
                <span className="text-base text-slate-400 line-through font-semibold">
                  {formatCurrency(originalPrice)}
                </span>
              )}
              {discountPercent > 0 && (
                <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {discountPercent}% OFF
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">Inclusive of all taxes</p>
          </div>

          {/* Product Short Overview / Summary snippet if present */}
          {productData.description && (
            <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 pt-0.5">
              {productData.description}
            </p>
          )}

          {/* Color Selector (only if product has active Color variants) */}
          {hasVariants && hasColorDimension && availableColors.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Color: <strong className="text-[#172033]">{selectedColor || availableColors[0]?.name}</strong>
                </span>
                {productData.colorGalleries?.some(cg => cg.colorName?.toLowerCase() === (selectedColor || availableColors[0]?.name)?.toLowerCase()) && (
                  <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    Dedicated Color Gallery
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                {availableColors.map(c => {
                  const hex = getColorHex(c.name, c.code);
                  const isCurrent = (selectedColor || availableColors[0]?.name)?.toLowerCase() === c.name.toLowerCase();
                  const isColorAvail = isColorAvailableForCurrentSize(c.name);
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => handleColorSelect(c.name)}
                      style={{ backgroundColor: hex }}
                      className={`w-7 h-7 rounded-full cursor-pointer transition-all border border-slate-300 relative ${isCurrent ? 'ring-2 ring-blue-600 ring-offset-2 scale-110 shadow-sm' : 'hover:scale-105'} ${!isColorAvail ? 'opacity-40' : ''}`}
                      title={`${c.name}${c.code ? ` (${c.code})` : ''}${!isColorAvail ? ' • Out of stock for selected size' : ''}${c.hasGallery ? ' • Has photos' : ''}`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Selector (only if product has active Size variants) */}
          {hasVariants && hasSizeDimension && availableSizes.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-slate-700">
                Size: {(selectedSize || availableSizes[0]?.name) && <strong className="text-[#172033]">{selectedSize || availableSizes[0]?.name}</strong>}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {availableSizes.map(sz => {
                  const isCurrent = (selectedSize || availableSizes[0]?.name)?.toLowerCase() === sz.name.toLowerCase();
                  const isSizeAvail = isSizeAvailableForCurrentColor(sz.name);
                  return (
                    <button
                      key={sz.name}
                      type="button"
                      onClick={() => handleSizeSelect(sz.name)}
                      className={`px-3 py-1.5 min-w-10 rounded-xl text-xs font-bold border transition-all flex items-center justify-center cursor-pointer ${isCurrent
                          ? 'border-blue-600 text-blue-600 bg-blue-50/60 font-black ring-1 ring-blue-600'
                          : isSizeAvail
                            ? 'border-slate-200 text-slate-700 hover:border-slate-400 bg-white'
                            : 'border-slate-200 text-slate-400 bg-slate-50 line-through opacity-60'
                        }`}
                      title={isSizeAvail ? `${sz.name} - Available` : `${sz.name} - Out of stock for ${selectedColor}`}
                    >
                      {sz.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Static attributes display when an attribute is single/fixed rather than a multi-option variant */}
          {((!hasVariants && (Boolean(productData.color) || Boolean(productData.size))) ||
            (hasVariants && !hasColorDimension && Boolean(productData.color)) ||
            (hasVariants && !hasSizeDimension && Boolean(productData.size))) && (
            <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
              {(!hasColorDimension || !hasVariants) && productData.color && (
                <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                  <span className="text-slate-400 font-medium">Color:</span>
                  <strong className="font-bold">{productData.color}</strong>
                </span>
              )}
              {(!hasSizeDimension || !hasVariants) && productData.size && (
                <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                  <span className="text-slate-400 font-medium">Size:</span>
                  <strong className="font-bold">{productData.size}</strong>
                </span>
              )}
            </div>
          )}

          {/* Delivery Box (Placed before purchase actions to balance non-variant spacing) */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-700">
                <MapPin size={14} className="text-blue-600" />
                <span>Deliver to <strong>{deliveryPincode}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('jts_open_location_modal'));
                }}
                className="text-blue-600 font-bold hover:underline cursor-pointer"
              >
                Change
              </button>
            </div>
            <div className="text-[11px] text-slate-500 pl-5">
              Delivery by <strong>2-4 days</strong> • {freeShippingThreshold > 0 && price >= freeShippingThreshold ? <span className="text-emerald-600 font-bold">FREE Delivery</span> : '₹40 Delivery Fee'}
            </div>
          </div>

          {/* Stock Status Badge */}
          <div className="pt-0.5">
            {isAvailable ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                In stock ({availableQuantity} available)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-rose-600 font-bold text-xs bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                Out of Stock
              </span>
            )}
          </div>

          {/* Quantity Selector & Action Buttons (Add to Cart + Buy Now) */}
          {isAvailable ? (
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-3">
                {/* Quantity Stepper */}
                <div className="flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="px-3 py-3.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="Decrease quantity"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="px-3 font-bold text-xs text-slate-900 min-w-8 text-center">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(q => Math.min(availableQuantity, q + 1))}
                    disabled={quantity >= availableQuantity}
                    className="px-3 py-3.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title={quantity >= availableQuantity ? `Max stock (${availableQuantity}) reached` : 'Increase quantity'}
                  >
                    <Plus size={13} />
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  className="flex-1 py-3.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingBag size={15} />
                  <span>Add to Cart</span>
                </button>

                <button
                  onClick={handleBuyNow}
                  className="flex-1 py-3.5 border-2 border-[#2563EB] text-[#2563EB] hover:bg-blue-50/80 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Buy Now</span>
                </button>

                <button
                  onClick={() => toggleWishlist(productData)}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${isWishlisted(productData._id)
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : 'border-slate-200 hover:border-slate-400 text-slate-600'
                    }`}
                  title={isWishlisted(productData._id) ? 'Saved in Wishlist' : 'Add to Wishlist'}
                >
                  <Heart size={18} className={isWishlisted(productData._id) ? 'fill-rose-500 text-rose-500' : ''} />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
              This item is currently out of stock. Please check back later or explore related products.
            </div>
          )}

          {/* Value Props Strip with Dynamic Return/Exchange Policy */}
          <div className="space-y-2 pt-4 border-t border-slate-200">
            {productData?.returnPolicyType === 'NON_RETURNABLE' && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-center gap-2">
                <XCircle size={15} className="text-rose-600 shrink-0" />
                <span>
                  <strong>Non-Returnable Item:</strong> {productData.nonReturnableReason || 'This product is not eligible for return or exchange as per store hygiene/clearance policy.'}
                </span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5">
                {productData?.returnPolicyType === 'NON_RETURNABLE' ? (
                  <>
                    <XCircle size={15} className="text-rose-500 shrink-0" />
                    <span className="font-bold text-rose-600">Non-Returnable</span>
                  </>
                ) : productData?.returnPolicyType === 'EXCHANGE_ONLY' ? (
                  <>
                    <RotateCcw size={15} className="text-amber-600 shrink-0" />
                    <span className="font-bold text-amber-700">{productData.returnWindowDays || returnWindowDays || 7} Days Replacement</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={15} className="text-blue-600 shrink-0" />
                    <span className="font-semibold text-slate-700">{productData?.returnWindowDays || returnWindowDays || 7} Days Return & Exchange</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
                <span>100% Original</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-purple-600 shrink-0" />
                <span>Secure Payments</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* TABS: Product Details | Ratings & Reviews | Q&A */}
      <div id="product-tabs-section" className="pt-8 border-t border-slate-200 space-y-6">
        <div className="flex gap-6 border-b border-slate-200">
          {[
            { id: 'DETAILS', label: 'Product Details' },
            { id: 'REVIEWS', label: `Ratings & Reviews (${reviewCount})` },
            { id: 'QA', label: 'Q&A' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${activeTab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'DETAILS' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Technical Specifications Table */}
            <div className="md:col-span-8 space-y-4">
              <h3 className="text-sm font-bold text-[#172033] uppercase tracking-wider">Specifications</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-slate-50/60">
                      <td className="p-3 font-semibold text-slate-600 w-1/3 border-r border-slate-100">Brand</td>
                      <td className="p-3 text-slate-900 font-medium">{productData.brand || 'Enterprise Collection'}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-600 border-r border-slate-100">Category</td>
                      <td className="p-3 text-slate-900 font-medium">{productData.category || productData.department || 'General'}</td>
                    </tr>
                    <tr className="bg-slate-50/60">
                      <td className="p-3 font-semibold text-slate-600 border-r border-slate-100">SKU</td>
                      <td className="p-3 text-slate-900 font-mono font-medium">{productData.sku || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-600 border-r border-slate-100">Pattern / Style</td>
                      <td className="p-3 text-slate-900 font-medium">{productData.style || 'Check / Casual Standard'}</td>
                    </tr>
                    <tr className="bg-slate-50/60">
                      <td className="p-3 font-semibold text-slate-600 border-r border-slate-100">Country of Origin</td>
                      <td className="p-3 text-slate-900 font-medium">India</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Description */}
              <div className="pt-4 space-y-2">
                <h4 className="text-xs font-bold text-[#172033] uppercase tracking-wider">Description</h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {productData.longDescription || productData.description || 'Verified enterprise quality product dispathed directly from authorized regional warehouses.'}
                </p>
              </div>
            </div>

            {/* Why You'll Love It Highlight Card (Panel 3 Match) */}
            <div className="md:col-span-4 bg-[#F8FAFC] border border-slate-200 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#172033]">Why you'll love it</h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>Premium certified materials for all-day comfort</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>Stylish check pattern for modern casual wear</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>Easy care and long-lasting fabric retention</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>Dispatched with tamper-evident packaging</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'REVIEWS' && (
          <div className="space-y-6 max-w-3xl">
            {/* Reviews Summary & Score Card */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                
                {/* Left: Overall rating score */}
                <div className="flex items-center gap-4">
                  <div className="text-center sm:text-left">
                    <div className="text-4xl font-black text-slate-900 dark:text-white">
                      {avgRating || '0.0'}
                    </div>
                    <div className="flex items-center justify-center sm:justify-start gap-1 my-1 text-amber-500">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={16}
                          className={Number(avgRating || 0) >= s ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      Based on {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
                    </div>
                  </div>
                </div>

                {/* Center: Rating breakdown bars */}
                <div className="flex-1 w-full max-w-xs space-y-1 text-xs">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = ratingBreakdown[star] || 0;
                    const percent = reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0;
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="w-6 text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-0.5 justify-end">
                          {star} <Star size={10} className="fill-amber-400 text-amber-400" />
                        </span>
                        <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="w-8 text-[11px] text-slate-400 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Right: Write a review CTA */}
                <div className="shrink-0 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReviewForm(prev => !prev);
                      setReviewErrorMsg('');
                      setReviewSuccessMsg('');
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Star size={14} /> {showReviewForm ? 'Cancel' : 'Write a Review'}
                  </button>
                </div>
              </div>
            </div>

            {/* Review Success / Error Feedback Alerts */}
            {reviewSuccessMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{reviewSuccessMsg}</span>
              </div>
            )}
            {reviewErrorMsg && (
              <div className="p-4 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
                <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                <span>{reviewErrorMsg}</span>
              </div>
            )}

            {/* Write Review Form Card */}
            {showReviewForm && (
              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4 animate-fade-in">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Write a Verified Product Review
                </h4>

                {!isAuthenticated ? (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-3">
                    <span>You need to be signed in to submit a rating and review.</span>
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shrink-0 cursor-pointer"
                    >
                      Sign In
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    {/* Star selector */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Select Your Rating
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setNewRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              className="p-1 text-slate-300 hover:scale-110 transition-transform cursor-pointer"
                            >
                              <Star
                                size={22}
                                className={(hoverRating || newRating) >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                              />
                            </button>
                          ))}
                        </div>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 ml-2">
                          {{
                            1: 'Poor (1/5)',
                            2: 'Fair (2/5)',
                            3: 'Average (3/5)',
                            4: 'Good (4/5)',
                            5: 'Excellent (5/5)'
                          }[hoverRating || newRating]}
                        </span>
                      </div>
                    </div>

                    {/* Review text */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Your Review
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Tell other shoppers what you loved or how this product performed (fit, quality, material, etc.)..."
                        className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400">
                        Posting as <strong className="text-slate-700 dark:text-slate-300">{customer?.firstName || customer?.name || 'Verified Buyer'}</strong>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowReviewForm(false)}
                          className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingReview}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                        >
                          {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* List of customer reviews */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Customer Reviews ({reviewCount})
              </h4>

              {reviewCount === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                  <Star size={28} className="mx-auto text-slate-300" />
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                    No reviews yet for this product.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Be the first customer to share your thoughts and help others make informed choices.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(true)}
                    className="inline-block mt-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Write the First Review
                  </button>
                </div>
              ) : (
                reviews.map((r, idx) => {
                  const reviewerName = r.customerId?.name || (r.customerId?.firstName ? `${r.customerId.firstName} ${r.customerId.lastName || ''}`.trim() : 'Verified Customer');
                  const firstLetter = reviewerName[0]?.toUpperCase() || 'C';
                  const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

                  return (
                    <div
                      key={r._id || `rev_${idx}`}
                      className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs">
                            {firstLetter}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {reviewerName}
                              </span>
                              <span className="text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                                Verified Buyer
                              </span>
                            </div>
                            {dateStr && (
                              <span className="text-[10px] text-slate-400 block">{dateStr}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex text-amber-500">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={12}
                              className={Number(r.rating || 5) >= s ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed pl-9">
                        {r.comment}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'QA' && (
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <h4 className="font-bold text-slate-900">Have questions about this item?</h4>
            <p>Direct inquiries are answered by our product specialists and verified buyers.</p>
          </div>
        )}
      </div>

      {/* SIMILAR PRODUCTS SHELF (Panel 3 Match) */}
      {relatedProducts && relatedProducts.length > 0 && (
        <div className="pt-8 border-t border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-[#172033] tracking-tight">Similar Products</h3>
            <Link to="/catalog" className="text-xs font-bold text-blue-600 hover:underline">View All</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {relatedProducts.slice(0, 4).map((prod, idx) => (
              <ProductCard
                key={`${prod._id || 'rel'}_${idx}`}
                product={prod}
                onQuickView={handleOpenQuickView}
              />
            ))}
          </div>
        </div>
      )}

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        onClose={() => {
          setIsQuickViewOpen(false);
          setQuickViewProduct(null);
        }}
      />

    </div>
  );
};

export default ProductDetailPage;

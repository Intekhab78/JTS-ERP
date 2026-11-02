import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag, Star, Heart, Eye, CheckCircle2, AlertTriangle,
  Minus, Plus, ShieldCheck, Flame, Zap
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { getProductImage, getFallbackImage } from '../../utils/productImageHelper';

export const ProductCard = ({ product, onQuickView }) => {
  const { addToCart, items, updateQuantity, removeFromCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { formatCurrency } = useStoreSettings();

  if (!product) return null;

  const img = getProductImage(product);
  const wishlisted = isWishlisted(product._id);
  const isAvailable = product.inStock !== false;

  // Check if item is already in cart
  const cartItem = items?.find(i => i.productId === product._id);
  const currentCartQty = cartItem?.quantity || 0;

  // Price calculations
  const price = product.salesPrice || product.price || 0;
  const originalPrice = product.price || price;
  const hasDiscount = originalPrice > price && price > 0;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.hasVariants) {
      if (onQuickView) {
        onQuickView(product);
      } else {
        window.location.href = `/product/${product._id}`;
      }
      return;
    }
    if (isAvailable) {
      addToCart(product, 1, { availableStock: product.availableStock });
    }
  };

  const handleIncrement = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const maxStock = typeof product.availableStock === 'number' ? product.availableStock : 100;
    if (currentCartQty >= maxStock) {
      alert(`Only ${maxStock} unit(s) available in stock.`);
      return;
    }
    updateQuantity(product._id, currentCartQty + 1);
  };

  const handleDecrement = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentCartQty <= 1) {
      removeFromCart(product._id);
    } else {
      updateQuantity(product._id, currentCartQty - 1);
    }
  };

  const handleQuickViewClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onQuickView) onQuickView(product);
  };

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  return (
    <div className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-300 flex flex-col justify-between overflow-hidden relative">

      {/* Top Media Container */}
      <div className="relative aspect-square bg-slate-50 dark:bg-slate-800/50 p-4 flex items-center justify-center overflow-hidden">

        {/* Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
          {product.ecommerceBadge ? (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-xs">
              {product.ecommerceBadge}
            </span>
          ) : discountPercent > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs">
              {discountPercent}% OFF
            </span>
          ) : product.isNewArrival ? (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-xs">
              NEW
            </span>
          ) : null}
        </div>

        {/* Floating Quick Action Buttons */}
        <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all transform sm:translate-x-1 sm:group-hover:translate-x-0">
          <button
            onClick={handleWishlistClick}
            className="p-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-500 hover:text-rose-500 shadow-sm backdrop-blur-xs transition-colors cursor-pointer"
            title={wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
          >
            <Heart size={15} className={wishlisted ? 'fill-rose-500 text-rose-500' : ''} />
          </button>

          {onQuickView && (
            <button
              onClick={handleQuickViewClick}
              className="p-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-500 hover:text-blue-600 shadow-sm backdrop-blur-xs transition-colors cursor-pointer"
              title="Quick View"
            >
              <Eye size={15} />
            </button>
          )}
        </div>

        {/* Product Image */}
        <Link to={`/product/${product._id}`} className="w-full h-full flex items-center justify-center">
          <img
            src={img}
            alt={product.name}
            className="w-full h-full object-contain group-hover:scale-106 transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = getFallbackImage(product);
            }}
          />
        </Link>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          {/* Brand & Category Hierarchy */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span className="text-blue-600 dark:text-blue-400 truncate max-w-[120px]">
              {product.brand || product.category || product.department || ''}
            </span>
            {isAvailable ? (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                In Stock
              </span>
            ) : (
              <span className="text-rose-500 font-bold">
                Out of Stock
              </span>
            )}
          </div>

          {/* Product Name */}
          <Link
            to={`/product/${product._id}`}
            className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2 transition-colors leading-snug"
            title={product.name}
          >
            {product.name}
          </Link>

          {/* Dynamic Ratings or Genuine Badge */}
          {product.rating && product.rating > 0 ? (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center text-amber-400">
                <Star size={11} className="fill-amber-400" />
                <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 ml-1">
                  {Number(product.rating).toFixed(1)}
                </span>
              </div>
              {product.reviewCount ? (
                <span className="text-[10px] text-slate-400">
                  ({product.reviewCount})
                </span>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
              <ShieldCheck size={11} className="text-blue-500" />
              <span>Verified Genuine</span>
            </div>
          )}
        </div>

        {/* Pricing & Cart Action */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-none">
                {formatCurrency(price)}
              </span>
              {hasDiscount && (
                <span className="text-[11px] text-slate-400 line-through">
                  {formatCurrency(originalPrice)}
                </span>
              )}
            </div>
            {discountPercent > 0 && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                {discountPercent}% OFF
              </span>
            )}
          </div>

          {/* Interactive Cart Button or Quantity Stepper */}
          {isAvailable ? (
            currentCartQty > 0 ? (
              <div className="flex items-center justify-between w-full bg-blue-50 dark:bg-blue-950/80 border border-blue-500 rounded-xl overflow-hidden shadow-2xs py-0.5">
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="px-3 py-1.5 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors cursor-pointer"
                  title="Reduce quantity"
                >
                  <Minus size={13} strokeWidth={3} />
                </button>
                <span className="font-black text-xs text-blue-900 dark:text-blue-200">
                  {currentCartQty} in cart
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="px-3 py-1.5 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors cursor-pointer"
                  title="Add more"
                >
                  <Plus size={13} strokeWidth={3} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                title="Add to Cart"
              >
                <ShoppingBag size={13} />
                <span>{product.hasVariants ? 'Select Options' : 'Add to Cart'}</span>
              </button>
            )
          ) : (
            <div className="text-center py-2 text-[11px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl">
              Out of Stock
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;

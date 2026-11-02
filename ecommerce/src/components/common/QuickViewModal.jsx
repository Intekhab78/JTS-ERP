import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  X, Star, ShoppingBag, Heart, CheckCircle2, AlertTriangle, 
  Minus, Plus, ArrowRight, ShieldCheck, Truck, RotateCcw, 
  ExternalLink, Barcode as BarcodeIcon 
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { getProductImage, formatImageUrl, getFallbackImage } from '../../utils/productImageHelper';

export const QuickViewModal = ({ product, isOpen, onClose }) => {
  if (!isOpen || !product) return null;

  const { addToCart, items, updateQuantity } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { formatCurrency, returnWindowDays, freeShippingThreshold } = useStoreSettings();

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(getProductImage(product));

  const cartItem = items?.find(i => i.productId === product._id);
  const inWishlist = isWishlisted(product._id);
  const isAvailable = product.inStock !== false;

  const rawImages = [
    product.uploadImage,
    ...(Array.isArray(product.images) ? product.images : []),
    getProductImage(product)
  ];
  const allImages = Array.from(new Set(rawImages.map(formatImageUrl).filter(Boolean)));

  const discountPercent = product.price > product.salesPrice && product.salesPrice > 0
    ? Math.round(((product.price - product.salesPrice) / product.price) * 100)
    : 0;

  const maxStock = typeof product.availableStock === 'number' ? product.availableStock : 100;

  const handleAddToCart = () => {
    const safeQty = Math.min(quantity, maxStock);
    addToCart(product, safeQty, { availableStock: maxStock });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div 
        className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Left: Product Images Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-6 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-800 shadow-inner group">
              {discountPercent > 0 && (
                <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white shadow-xs">
                  {discountPercent}% OFF
                </span>
              )}
              <img
                src={formatImageUrl(selectedImage)}
                alt={product.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getFallbackImage(product);
                }}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Thumbnail row if multiple */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.slice(0, 5).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 p-1 bg-white dark:bg-slate-800 shrink-0 cursor-pointer transition-all ${
                      formatImageUrl(selectedImage) === img
                        ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <img 
                      src={img} 
                      alt={`thumb-${idx}`} 
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getFallbackImage(product);
                      }}
                      className="w-full h-full object-contain" 
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Details */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {(product.category || product.department) && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-950 px-2.5 py-0.5 rounded-full">
                    {product.category || product.department}
                  </span>
                )}
                {product.brand && (
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    {product.brand}
                  </span>
                )}
                {product.sku && (
                  <span className="text-[10px] font-mono text-slate-400">
                    SKU: {product.sku}
                  </span>
                )}
              </div>

              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
                {product.name}
              </h2>

              {/* Dynamic Ratings & Real Stock Status */}
              <div className="flex items-center gap-2 text-xs flex-wrap">
                {product.rating && product.rating > 0 ? (
                  <>
                    <div className="flex items-center text-amber-400">
                      <Star size={13} className="fill-amber-400" />
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 ml-1">
                        {Number(product.rating).toFixed(1)}
                      </span>
                    </div>
                    {product.reviewCount ? (
                      <span className="text-slate-400">
                        ({product.reviewCount} {product.reviewCount === 1 ? 'rating' : 'ratings'})
                      </span>
                    ) : null}
                    <span className="text-slate-300">•</span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                      <ShieldCheck size={12} className="text-emerald-500" /> Verified Item
                    </span>
                    <span className="text-slate-300">•</span>
                  </>
                )}
                <span className={`font-bold flex items-center gap-1 ${isAvailable ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {isAvailable ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                  {isAvailable ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Commercial Price
                </span>
                <div className="flex items-baseline gap-2.5 mt-0.5">
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    {formatCurrency(product.salesPrice || product.price)}
                  </span>
                  {product.price > product.salesPrice && product.salesPrice > 0 && (
                    <span className="text-xs text-slate-400 line-through font-semibold">
                      {formatCurrency(product.price)}
                    </span>
                  )}
                </div>
              </div>

              {discountPercent > 0 && (
                <span className="text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-200/50">
                  Save {formatCurrency(product.price - product.salesPrice)}
                </span>
              )}
            </div>

            {/* Description snippet */}
            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
              {product.description || product.shortDescription || 'Verified genuine product available for order with real-time stock allocation.'}
            </p>

            {/* Quantity Stepper & Add to Cart */}
            {isAvailable ? (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2 text-slate-600 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="px-3 font-bold text-xs text-slate-900 dark:text-white">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(maxStock, quantity + 1))}
                      disabled={quantity >= maxStock}
                      className={`p-2 transition-colors ${
                        quantity >= maxStock
                          ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-40'
                          : 'text-slate-600 hover:text-slate-900 dark:hover:text-white cursor-pointer'
                      }`}
                      title={quantity >= maxStock ? `Max stock (${maxStock}) reached` : 'Increase quantity'}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {product.hasVariants ? (
                    <Link
                      to={`/product/${product._id}`}
                      onClick={onClose}
                      className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShoppingBag size={15} />
                      <span>Select Options</span>
                    </Link>
                  ) : (
                    <button
                      onClick={handleAddToCart}
                      className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShoppingBag size={15} />
                      <span>Add {quantity} to Cart</span>
                    </button>
                  )}

                  <button
                    onClick={() => toggleWishlist(product)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 hover:bg-rose-50/50 transition-colors cursor-pointer"
                    title={inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  >
                    <Heart size={16} className={inWishlist ? 'fill-rose-500 text-rose-500' : ''} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold text-center">
                Currently Out of Stock
              </div>
            )}

            {/* Quick trust badges */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <Truck size={12} className="text-blue-500" />
                <span>Next-day dispatch available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-emerald-500" />
                <span>100% Genuine Guaranteed</span>
              </div>
            </div>

            {/* Link to full details */}
            <div className="pt-2 text-center">
              <Link
                to={`/product/${product._id}`}
                onClick={onClose}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
              >
                <span>View Full Product Specifications</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickViewModal;

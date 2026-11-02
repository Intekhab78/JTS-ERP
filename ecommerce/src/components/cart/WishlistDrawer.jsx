import React from 'react';
import { Link } from 'react-router-dom';
import { X, Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { getProductImage } from '../../utils/productImageHelper';

export const WishlistDrawer = () => {
  const { wishlistItems, isWishlistOpen, closeWishlist, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart, openCart } = useCart();
  const { formatCurrency } = useStoreSettings();

  if (!isWishlistOpen) return null;

  const handleMoveToCart = (product) => {
    addToCart(product, 1);
    removeFromWishlist(product._id);
    closeWishlist();
    openCart();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
        onClick={closeWishlist}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
          
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                <Heart size={18} className="fill-rose-500 text-rose-500" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">My Wishlist</h3>
                <p className="text-[11px] text-slate-400 font-medium">{wishlistItems.length} saved {wishlistItems.length === 1 ? 'item' : 'items'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {wishlistItems.length > 0 && (
                <button
                  onClick={clearWishlist}
                  className="text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors px-2 py-1"
                >
                  Clear All
                </button>
              )}
              <button 
                onClick={closeWishlist}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body Items */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {wishlistItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center">
                  <Heart size={30} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Your Wishlist is Empty</h4>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Explore our catalog and tap the heart icon on products you love to save them for later!
                  </p>
                </div>
                <button
                  onClick={closeWishlist}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
                >
                  <Link to="/catalog">Explore Catalog</Link>
                  <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              wishlistItems.map((item) => {
                const img = getProductImage(item);
                const hasDiscount = item.price && item.salesPrice && item.price > item.salesPrice;

                return (
                  <div 
                    key={item._id}
                    className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 relative group"
                  >
                    <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1.5">
                      <img 
                        src={img} 
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        {item.brand && (
                          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                            {item.brand}
                          </span>
                        )}
                        <Link
                          to={`/product/${item._id}`}
                          onClick={closeWishlist}
                          className="font-bold text-xs text-slate-900 dark:text-white hover:text-blue-600 line-clamp-1"
                        >
                          {item.name}
                        </Link>
                        {item.sku && (
                          <span className="text-[10px] text-slate-400 font-mono block">SKU: {item.sku}</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        <div>
                          {hasDiscount && (
                            <span className="text-[10px] text-slate-400 line-through mr-1.5">
                              {formatCurrency(item.price)}
                            </span>
                          )}
                          <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                            {formatCurrency(item.salesPrice || item.price)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => removeFromWishlist(item._id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors"
                            title="Remove"
                          >
                            <Trash2 size={13} />
                          </button>
                          <button
                            onClick={() => handleMoveToCart(item)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-black shadow-xs flex items-center gap-1 transition-all"
                          >
                            <ShoppingBag size={12} />
                            <span>Move to Cart</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

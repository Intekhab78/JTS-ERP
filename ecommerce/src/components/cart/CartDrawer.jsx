import React from 'react';
import { useCart } from '../../context/CartContext';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { useNavigate } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, AlertTriangle } from 'lucide-react';

export const CartDrawer = () => {
  const { 
    items, 
    isCartOpen, 
    closeCart, 
    updateQuantity, 
    removeFromCart, 
    cartTotal, 
    cartCount,
    stockNotice,
    clearStockNotice
  } = useCart();
  const { formatCurrency } = useStoreSettings();
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const handleCheckoutClick = () => {
    const overstocked = items.find(i => typeof i.availableStock === 'number' && i.quantity > i.availableStock);
    if (overstocked) {
      alert(`"${overstocked.name}" quantity exceeds available stock (${overstocked.availableStock}). Please reduce quantity to proceed.`);
      return;
    }
    closeCart();
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={closeCart}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">

          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="text-blue-600 h-5 w-5" />
              <h2 className="text-base font-black text-slate-900 dark:text-white">Shopping Cart ({cartCount})</h2>
            </div>
            <button
              onClick={closeCart}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Live Stock Warning Notice if items were clamped */}
          {stockNotice && (
            <div className="mx-4 mt-3 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="leading-tight font-medium">{stockNotice}</span>
              </div>
              <button onClick={clearStockNotice} className="p-1 text-amber-600 hover:text-amber-800 dark:hover:text-amber-200 ml-2 cursor-pointer">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-slate-800 text-blue-600 flex items-center justify-center">
                  <ShoppingBag size={28} />
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-white">Your cart is empty</h3>
                <p className="text-xs text-slate-500 max-w-xs">Looks like you haven't added anything to your cart yet.</p>
                <button
                  onClick={() => { closeCart(); navigate('/catalog'); }}
                  className="mt-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-blue-700 transition-all cursor-pointer"
                >
                  Explore Products
                </button>
              </div>
            ) : (
              items.map((item) => {
                const maxStock = typeof item.availableStock === 'number' ? item.availableStock : null;
                const isAtMaxStock = maxStock !== null && item.quantity >= maxStock;
                const isOverStock = maxStock !== null && item.quantity > maxStock;

                return (
                  <div
                    key={item.itemKey || item.productId}
                    className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs"
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-600 flex items-center justify-center">
                      {item.uploadImage ? (
                        <img src={item.uploadImage} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag size={20} className="text-slate-400" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="font-bold text-slate-900 dark:text-white truncate">{item.name}</h4>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                        <span>SKU: {item.sku || 'N/A'}</span>
                        {item.selectedColor && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-[10px]">
                            {item.selectedColor}
                          </span>
                        )}
                        {item.selectedSize && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[10px]">
                            {item.selectedSize}
                          </span>
                        )}
                      </div>
                      <div className="font-black text-blue-600 dark:text-blue-400">{formatCurrency(item.price)}</div>

                      {/* Quantity controls */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 overflow-hidden">
                          <button
                            onClick={() => updateQuantity(item.itemKey || item.productId, item.quantity - 1)}
                            className="px-2 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                            title="Decrease quantity"
                          >
                            <Minus size={11} />
                          </button>
                          <span className={`px-2.5 font-bold ${isOverStock ? 'text-rose-600 font-black' : 'text-slate-900 dark:text-white'}`}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => !isAtMaxStock && updateQuantity(item.itemKey || item.productId, item.quantity + 1)}
                            disabled={isAtMaxStock}
                            className={`px-2 py-1 transition-colors ${
                              isAtMaxStock
                                ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-40'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer'
                            }`}
                            title={isAtMaxStock ? `Max stock limit (${maxStock}) reached` : 'Increase quantity'}
                          >
                            <Plus size={11} />
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.itemKey || item.productId)}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                          title="Remove from cart"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Stock Cap Feedback */}
                      {maxStock !== null && (
                        <div className="pt-0.5 text-[10px]">
                          {isOverStock ? (
                            <span className="text-rose-600 font-bold flex items-center gap-1">
                              Exceeds stock! Max {maxStock} available
                            </span>
                          ) : isAtMaxStock ? (
                            <span className="text-amber-600 dark:text-amber-400 font-bold">
                              Max stock reached ({maxStock} available)
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              {maxStock} in stock
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer & Checkout Action */}
          {items.length > 0 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-slate-500">Subtotal:</span>
                <span className="font-black text-lg text-slate-900 dark:text-white">{formatCurrency(cartTotal)}</span>
              </div>
              <p className="text-[11px] text-slate-500">Taxes and shipping calculated at checkout.</p>

              <button
                onClick={handleCheckoutClick}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Proceed to Checkout <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

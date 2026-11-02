import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('ecom_cart_items');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [stockNotice, setStockNotice] = useState(null);
  const isValidatingRef = useRef(false);

  // Persist items to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ecom_cart_items', JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to persist cart items to localStorage', e);
    }
  }, [items]);

  // Validate live stock from server for all cart items
  const validateCartStock = useCallback(async () => {
    if (!items || items.length === 0 || isValidatingRef.current) return;
    isValidatingRef.current = true;
    try {
      const payload = items.map(item => ({
        productId: item.productId,
        variantId: item.variantId || undefined,
        itemKey: item.itemKey,
        quantity: item.quantity
      }));

      const { data } = await axios.post('/api/v1/ecommerce/cart/validate', { items: payload });
      if (data && Array.isArray(data.items)) {
        let anyClamped = false;
        const noticeMessages = [];

        setItems(prev => {
          let changed = false;
          const updated = prev.map(item => {
            const match = data.items.find(v => 
              (v.itemKey && item.itemKey && v.itemKey === item.itemKey) ||
              (v.productId === item.productId && (v.variantId || null) === (item.variantId || null))
            );

            if (!match) return item;

            const liveStock = typeof match.availableStock === 'number' ? match.availableStock : item.availableStock;
            let newQty = item.quantity;

            if (typeof liveStock === 'number' && item.quantity > liveStock) {
              newQty = Math.max(0, liveStock);
              anyClamped = true;
              noticeMessages.push(`"${item.name}" quantity adjusted to ${liveStock} (current available stock).`);
              changed = true;
            }

            if (item.availableStock !== liveStock || item.quantity !== newQty) {
              changed = true;
              return {
                ...item,
                availableStock: liveStock,
                quantity: newQty
              };
            }
            return item;
          });

          return changed ? updated : prev;
        });

        if (anyClamped && noticeMessages.length > 0) {
          setStockNotice(noticeMessages.join(' '));
        }
      }
    } catch (err) {
      console.warn('Cart stock validation check failed:', err?.message);
    } finally {
      isValidatingRef.current = false;
    }
  }, [items]);

  // Run live validation whenever cart drawer opens or on initial mount if items exist
  useEffect(() => {
    if (items.length > 0) {
      validateCartStock();
    }
  }, [isCartOpen]);

  // Synchronize stock for a specific item (called from ProductDetailPage when product loads)
  const syncItemStock = useCallback((identifier, availableStock) => {
    if (typeof availableStock !== 'number') return;
    setItems(prev => {
      let changed = false;
      const updated = prev.map(item => {
        const matches = (item.itemKey && item.itemKey === identifier) || item.productId === identifier || item.variantId === identifier;
        if (matches) {
          const clampedQty = item.quantity > availableStock ? Math.max(1, availableStock) : item.quantity;
          if (item.availableStock !== availableStock || item.quantity !== clampedQty) {
            changed = true;
            return {
              ...item,
              availableStock,
              quantity: clampedQty
            };
          }
        }
        return item;
      });
      return changed ? updated : prev;
    });
  }, []);

  const addToCart = (product, quantity = 1, options = {}) => {
    const qty = Number(quantity) || 1;
    const variantPrice = options.price != null && options.price > 0 ? options.price : null;
    const effectivePrice = variantPrice !== null ? variantPrice : (product.salesPrice > 0 ? product.salesPrice : product.price);
    const chosenColor = options.color || product.selectedColor || product.color || '';
    const chosenSize = options.size || product.selectedSize || product.size || '';
    const variantId = options.variantId || product.selectedVariantId || null;
    const variantSku = options.variantSku || product.selectedVariantSku || product.sku;
    const chosenImage = options.uploadImage || product.uploadImage;
    const itemKey = variantId ? `${product._id}_${variantId}` : `${product._id}_${chosenColor}_${chosenSize}`;

    // Available stock from options or product
    const maxStock = typeof options.availableStock === 'number'
      ? options.availableStock
      : (typeof product.availableStock === 'number' ? product.availableStock : 100);

    setItems(prev => {
      const existingIndex = prev.findIndex(i => 
        (i.itemKey && i.itemKey === itemKey) || 
        (!i.itemKey && i.productId === product._id && (i.variantId || null) === variantId && (i.selectedColor || '') === chosenColor && (i.selectedSize || '') === chosenSize)
      );

      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        const effectiveMax = typeof existing.availableStock === 'number' ? existing.availableStock : maxStock;
        const newQty = existing.quantity + qty;

        if (newQty > effectiveMax) {
          alert(`Only ${effectiveMax} unit(s) available in stock. Quantity capped to available stock.`);
          return prev.map((i, idx) => idx === existingIndex ? { ...i, quantity: effectiveMax, availableStock: effectiveMax } : i);
        }
        return prev.map((i, idx) => idx === existingIndex ? { ...i, quantity: newQty, availableStock: effectiveMax } : i);
      } else {
        const finalQty = Math.min(qty, maxStock);
        if (qty > maxStock) {
          alert(`Only ${maxStock} unit(s) available in stock. Adding ${finalQty} to cart.`);
        }
        return [...prev, {
          itemKey,
          productId: product._id,
          variantId,
          name: product.name,
          sku: variantSku,
          price: effectivePrice,
          originalPrice: product.price,
          uploadImage: chosenImage,
          selectedColor: chosenColor,
          selectedSize: chosenSize,
          attributes: options.attributes || {},
          availableStock: maxStock,
          quantity: finalQty
        }];
      }
    });

    setIsCartOpen(true);
  };

  const updateQuantity = (identifier, quantity) => {
    const qty = Number(quantity);
    if (qty <= 0) {
      removeFromCart(identifier);
      return;
    }

    setItems(prev => prev.map(item => {
      if ((item.itemKey && item.itemKey === identifier) || item.productId === identifier) {
        const maxStock = typeof item.availableStock === 'number' ? item.availableStock : 100;
        if (qty > maxStock) {
          alert(`Only ${maxStock} unit(s) available in stock.`);
          return { ...item, quantity: maxStock };
        }
        return { ...item, quantity: qty };
      }
      return item;
    }));
  };

  const removeFromCart = (identifier) => {
    setItems(prev => prev.filter(i => {
      const match = (i.itemKey && i.itemKey === identifier) || (!i.itemKey && i.productId === identifier);
      return !match;
    }));
  };

  const clearCart = () => {
    setItems([]);
  };

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      cartCount,
      cartTotal,
      isCartOpen,
      openCart: () => setIsCartOpen(true),
      closeCart: () => setIsCartOpen(false),
      toggleCart: () => setIsCartOpen(prev => !prev),
      syncItemStock,
      validateCartStock,
      stockNotice,
      clearStockNotice: () => setStockNotice(null)
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};

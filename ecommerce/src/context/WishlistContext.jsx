import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useCustomerAuth } from './CustomerAuthContext';

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const { customer, isAuthenticated, token } = useCustomerAuth();
  const [wishlistItems, setWishlistItems] = useState(() => {
    try {
      const saved = localStorage.getItem('jts_ecommerce_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('jts_ecommerce_wishlist', JSON.stringify(wishlistItems));
    } catch (e) {
      console.warn('Failed to save wishlist to localStorage:', e);
    }
  }, [wishlistItems]);

  // When customer logs in, fetch remote wishlist
  useEffect(() => {
    if (isAuthenticated && token) {
      axios.get('/api/v1/ecommerce/wishlist', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(({ data }) => {
        if (Array.isArray(data) && data.length > 0) {
          // Merge local and remote
          setWishlistItems(prev => {
            const map = new Map();
            data.forEach(p => map.set(p._id, p));
            prev.forEach(p => {
              if (!map.has(p._id)) map.set(p._id, p);
            });
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});
    }
  }, [isAuthenticated, token]);

  const isWishlisted = (productId) => {
    if (!productId) return false;
    return wishlistItems.some(item => (item._id || item) === productId);
  };

  const toggleWishlist = async (product) => {
    if (!product || !product._id) return;
    const exists = isWishlisted(product._id);

    // Optimistic state update
    if (exists) {
      setWishlistItems(prev => prev.filter(i => (i._id || i) !== product._id));
    } else {
      setWishlistItems(prev => [product, ...prev]);
    }

    // Server sync if authenticated
    if (isAuthenticated && token) {
      try {
        await axios.post(`/api/v1/ecommerce/wishlist/${product._id}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.warn('Failed to sync wishlist with server:', err);
      }
    }
  };

  const removeFromWishlist = (productId) => {
    setWishlistItems(prev => prev.filter(i => (i._id || i) !== productId));
    if (isAuthenticated && token) {
      axios.post(`/api/v1/ecommerce/wishlist/${productId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
  };

  const clearWishlist = () => {
    setWishlistItems([]);
    localStorage.removeItem('jts_ecommerce_wishlist');
  };

  return (
    <WishlistContext.Provider value={{
      wishlistItems,
      wishlistCount: wishlistItems.length,
      isWishlisted,
      toggleWishlist,
      removeFromWishlist,
      clearWishlist,
      isWishlistOpen,
      openWishlist: () => setIsWishlistOpen(true),
      closeWishlist: () => setIsWishlistOpen(false)
    }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider');
  return context;
};

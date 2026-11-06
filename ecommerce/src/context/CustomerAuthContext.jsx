import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const CustomerAuthContext = createContext(null);

export const CustomerAuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(() => {
    try {
      const saved = localStorage.getItem('customer_data');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('customer_token') || null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to sync active delivery location across storefront safely after render
  const syncActiveDeliveryLocation = (customerData) => {
    setTimeout(() => {
      const addresses = Array.isArray(customerData?.addresses) ? customerData.addresses : [];
      if (addresses.length > 0) {
        const savedAddrId = localStorage.getItem('jts_active_address_id');
        const active = (savedAddrId && addresses.find(a => a._id === savedAddrId)) ||
                       addresses.find(a => a.isDefault) ||
                       addresses[0];
        if (active) {
          const locText = active.city ? `${active.city} ${active.zip}` : active.zip;
          localStorage.setItem('jts_pincode', active.zip || '');
          localStorage.setItem('jts_delivery_city', active.city || '');
          localStorage.setItem('jts_delivery_location', locText);
          localStorage.setItem('jts_active_address_id', active._id);
          window.dispatchEvent(new CustomEvent('jts_location_updated', { detail: { address: active, pincode: active.zip, text: locText } }));
        }
      }
    }, 0);
  };

  // Initialize customer session on mount
  useEffect(() => {
    let isSubscribed = true;
    if (token) {
      axios.get('/api/v1/ecommerce/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(({ data }) => {
        if (isSubscribed) {
          setCustomer(data);
          try { localStorage.setItem('customer_data', JSON.stringify(data)); } catch {}
          syncActiveDeliveryLocation(data);
        }
      })
      .catch((err) => {
        // Only clear token if 401 Unauthorized
        if (err.response?.status === 401 && isSubscribed) {
          localStorage.removeItem('customer_token');
          localStorage.removeItem('customer_data');
          setToken(null);
          setCustomer(null);
        }
      })
      .finally(() => {
        if (isSubscribed) setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
    return () => {
      isSubscribed = false;
    };
  }, [token]);

  const fetchCustomerProfile = async (authToken) => {
    try {
      const { data } = await axios.get('/api/v1/ecommerce/auth/profile', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setCustomer(data);
      try { localStorage.setItem('customer_data', JSON.stringify(data)); } catch {}
      syncActiveDeliveryLocation(data);
      return data;
    } catch {
      localStorage.removeItem('customer_token');
      localStorage.removeItem('customer_data');
      setToken(null);
      setCustomer(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Send 6-digit verification OTP to email
  const sendRegistrationOtp = async ({ email, firstName }) => {
    const { data } = await axios.post('/api/v1/ecommerce/auth/send-otp', {
      email,
      firstName
    });
    return data;
  };

  // Send 6-digit OTP for password reset
  const sendForgotPasswordOtp = async ({ email }) => {
    const { data } = await axios.post('/api/v1/ecommerce/auth/forgot-password-otp', {
      email
    });
    return data;
  };

  // Verify OTP and reset password
  const resetPasswordWithOtp = async ({ email, otp, newPassword }) => {
    const { data } = await axios.post('/api/v1/ecommerce/auth/reset-password', {
      email,
      otp,
      newPassword
    });
    return data;
  };

  // Verify OTP and complete registration
  const verifyOtpAndRegister = async ({ email, otp, password, firstName, lastName, phone }) => {
    const { data } = await axios.post('/api/v1/ecommerce/auth/verify-otp-register', {
      email,
      otp,
      password,
      firstName,
      lastName,
      phone
    });

    if (data.token) {
      localStorage.setItem('customer_token', data.token);
      localStorage.setItem('customer_data', JSON.stringify(data));
      setToken(data.token);
      setCustomer(data);
    }
    return data;
  };

  // Login existing customer
  const login = async ({ email, password }) => {
    const { data } = await axios.post('/api/v1/ecommerce/auth/login', {
      email,
      password
    });

    if (data.token) {
      localStorage.setItem('customer_token', data.token);
      localStorage.setItem('customer_data', JSON.stringify(data));
      setToken(data.token);
      setCustomer(data);
      syncActiveDeliveryLocation(data);
    }
    return data;
  };

  // Logout customer
  const logout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_data');
    localStorage.removeItem('jts_active_address_id');
    setToken(null);
    setCustomer(null);
  };

  // Update profile info
  const updateProfile = async (profileData) => {
    if (!token) return;
    const { data } = await axios.put('/api/v1/ecommerce/auth/profile', profileData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setCustomer(prev => ({ ...prev, ...data }));
    return data;
  };

  // Add delivery address
  const addAddress = async (addressData) => {
    if (!token) return;
    const { data } = await axios.post('/api/v1/ecommerce/auth/addresses', addressData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const list = data?.addresses || (Array.isArray(data) ? data : []);
    setCustomer(prev => {
      const updated = { ...prev, addresses: list };
      syncActiveDeliveryLocation(updated);
      return updated;
    });
    return data;
  };

  // Update delivery address
  const updateAddress = async (addressId, addressData) => {
    if (!token) return;
    const { data } = await axios.put(`/api/v1/ecommerce/auth/addresses/${addressId}`, addressData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const list = Array.isArray(data) ? data : (data?.addresses || []);
    setCustomer(prev => {
      const updated = { ...prev, addresses: list };
      syncActiveDeliveryLocation(updated);
      return updated;
    });
    return data;
  };

  // Set default / active delivery address
  const setDefaultAddress = async (addressId) => {
    if (!token) return;
    const { data } = await axios.put(`/api/v1/ecommerce/auth/addresses/${addressId}/default`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const list = Array.isArray(data) ? data : (data?.addresses || []);
    const targetAddr = list.find(a => a._id === addressId);
    if (targetAddr) {
      localStorage.setItem('jts_active_address_id', targetAddr._id);
    }
    setCustomer(prev => {
      const updated = { ...prev, addresses: list };
      syncActiveDeliveryLocation(updated);
      return updated;
    });
    return list;
  };

  // Delete delivery address
  const deleteAddress = async (addressId) => {
    if (!token) return;
    const { data } = await axios.delete(`/api/v1/ecommerce/auth/addresses/${addressId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const list = Array.isArray(data) ? data : (data?.addresses || []);
    if (localStorage.getItem('jts_active_address_id') === addressId) {
      localStorage.removeItem('jts_active_address_id');
    }
    setCustomer(prev => {
      const updated = { ...prev, addresses: list };
      syncActiveDeliveryLocation(updated);
      return updated;
    });
    return data;
  };

  return (
    <CustomerAuthContext.Provider value={{
      customer,
      token,
      isAuthenticated: !!(customer || token),
      isLoading,
      login,
      logout,
      sendRegistrationOtp,
      verifyOtpAndRegister,
      sendForgotPasswordOtp,
      resetPasswordWithOtp,
      updateProfile,
      addAddress,
      updateAddress,
      setDefaultAddress,
      deleteAddress,
      refreshProfile: () => fetchCustomerProfile(token)
    }}>
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  return context;
};

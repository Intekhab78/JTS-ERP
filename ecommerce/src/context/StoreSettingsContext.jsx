import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const StoreSettingsContext = createContext(null);
const DEFAULT_SETTINGS = {
  storeName: 'Online Store',
  storeEmail: '',
  supportPhone: '',
  currency: 'INR',
  currencySymbol: '₹',
  shippingCharge: 0,
  freeShippingThreshold: 0,
  allowReturns: true,
  returnWindowDays: 7,
  onlinePaymentMode: 'DEMO'
};

export const StoreSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    let active = true;
    axios.get('/api/v1/ecommerce/store-config')
      .then(({ data }) => {
        if (active) setSettings(current => ({ ...current, ...data }));
      })
      .catch((error) => console.warn('Could not load store settings:', error.message));
    return () => { active = false; };
  }, []);

  const value = useMemo(() => ({
    ...settings,
    formatCurrency: (amount) => {
      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount)) return `${settings.currencySymbol}0.00`;
      try {
        return new Intl.NumberFormat(settings.currency === 'INR' ? 'en-IN' : undefined, {
          style: 'currency',
          currency: settings.currency || 'INR',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(numericAmount);
      } catch {
        return `${settings.currencySymbol}${numericAmount.toFixed(2)}`;
      }
    }
  }), [settings]);

  return <StoreSettingsContext.Provider value={value}>{children}</StoreSettingsContext.Provider>;
};

export const useStoreSettings = () => {
  const context = useContext(StoreSettingsContext);
  if (!context) throw new Error('useStoreSettings must be used within StoreSettingsProvider');
  return context;
};

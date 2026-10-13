import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const CurrencyContext = createContext();

export const useCurrency = () => useContext(CurrencyContext);

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED',
  INR: '₹',
  CAD: 'C$',
  AUD: 'A$',
  JPY: '¥',
  CNY: '¥'
};

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState('USD');
  const [isLoading, setIsLoading] = useState(true);

  const fetchCompanyCurrency = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      
      let baseCurrency = 'USD';

      // 1. Fetch Workspace (Group) Currency as fallback
      const companyRes = await axios.get('/api/v1/company', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (companyRes.data && companyRes.data.currency) {
        baseCurrency = companyRes.data.currency;
      }

      // 2. Fetch Active Legal Company Currency (if selected)
      const activeCompanyId = localStorage.getItem('active_company_id');
      if (activeCompanyId && activeCompanyId !== 'ALL') {
        try {
          const legalRes = await axios.get(`/api/v1/legal-company/${activeCompanyId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (legalRes.data && legalRes.data.baseCurrency) {
            baseCurrency = legalRes.data.baseCurrency;
          }
        } catch (err) {
          console.warn('Could not fetch active legal company currency, falling back to group currency.');
        }
      }

      setCurrency(baseCurrency);
    } catch (error) {
      console.error('Failed to fetch company currency:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyCurrency();
    
    // Listen for custom event to trigger currency refresh
    const handleCurrencyUpdate = () => {
      fetchCompanyCurrency();
    };
    
    window.addEventListener('currencyUpdated', handleCurrencyUpdate);
    
    return () => {
      window.removeEventListener('currencyUpdated', handleCurrencyUpdate);
    };
  }, []);

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '';
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    
    // Format the number to 2 decimal places with commas
    const formattedAmount = Number(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    // Use proper spacing depending on currency format conventions.
    return `${symbol} ${formattedAmount}`;
  };

  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

  return (
    <CurrencyContext.Provider value={{ currency, currencySymbol, formatCurrency, refreshCurrency: fetchCompanyCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

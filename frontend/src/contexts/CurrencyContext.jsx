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
      const res = await axios.get('http://localhost:5000/api/v1/company', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.currency) {
        setCurrency(res.data.currency);
      }
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

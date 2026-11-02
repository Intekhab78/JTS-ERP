import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { AuthModal } from '../../components/auth/AuthModal';
import { Package, MapPin, User, LogOut, Truck, ChevronRight } from 'lucide-react';

export const CustomerDashboard = () => {
  const { customer, isAuthenticated, isLoading, logout } = useCustomerAuth();
  const navigate = useNavigate();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('LOGIN');

  if (isLoading) {
    return <div className="p-16 text-center text-slate-500 font-medium animate-pulse">Loading customer account...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
          <User size={28} />
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Sign In Required</h2>
        <p className="text-xs text-slate-500">
          Your session has expired or you are not signed in. Please sign in to view your orders, delivery addresses, and account details.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => { setAuthModalMode('LOGIN'); setAuthModalOpen(true); }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/25"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setAuthModalMode('REGISTER'); setAuthModalOpen(true); }}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
          >
            Create Account
          </button>
        </div>
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          initialMode={authModalMode}
        />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { to: '/account/orders', label: 'My Orders & Returns', icon: <Package size={16} /> },
    { to: '/account/addresses', label: 'Delivery Addresses', icon: <MapPin size={16} /> },
    { to: '/account/profile', label: 'Profile & Security', icon: <User size={16} /> },
    { to: '/track', label: 'Live Tracking Stepper', icon: <Truck size={16} /> }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
      {/* Sleek Compact Account Greeting Header */}
      <div className="py-2.5 px-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-md text-white font-black text-sm flex items-center justify-center border border-white/20">
            {customer?.firstName ? customer.firstName[0].toUpperCase() : 'C'}
          </div>
          <div>
            <div className="text-sm font-extrabold flex items-center gap-2">
              <span>Hello, {customer?.firstName || 'Valued Customer'}!</span>
            </div>
            <p className="text-[11px] text-blue-200">{customer?.email} • Customer Portal</p>
          </div>
        </div>
      </div>

      {/* 2-Column Layout: Left Nav + Right Content Outlet */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
        {/* Left Navigation Card */}
        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-0.5 text-xs">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `flex items-center justify-between px-3 py-2 rounded-lg font-bold transition-all ${isActive
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
            >
              <div className="flex items-center gap-2.5">
                {item.icon}
                <span>{item.label}</span>
              </div>
              <ChevronRight size={13} className="opacity-60" />
            </NavLink>
          ))}

          <div className="pt-1.5 mt-1.5 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Right Content Outlet */}
        <div className="md:col-span-3">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

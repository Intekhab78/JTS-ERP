import React, { useState, useEffect } from 'react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { X, Mail, Lock, User, Phone, CheckCircle2, ArrowRight, RotateCcw, AlertCircle } from 'lucide-react';

export const AuthModal = ({ isOpen, onClose, initialMode = 'LOGIN' }) => {
  const { login, sendRegistrationOtp, verifyOtpAndRegister } = useCustomerAuth();
  const [mode, setMode] = useState(initialMode); // 'LOGIN' or 'REGISTER'
  const [step, setStep] = useState('FORM'); // 'FORM' or 'OTP'
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Form inputs
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    otp: ''
  });

  // Timer for OTP countdown
  const [timer, setTimer] = useState(600); // 10 minutes in seconds

  useEffect(() => {
    setMode(initialMode);
    setStep('FORM');
    setError('');
    setSuccessMsg('');
  }, [initialMode, isOpen]);

  useEffect(() => {
    let interval = null;
    if (step === 'OTP' && timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login({ email: formData.email, password: formData.password });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!formData.email || !formData.password || !formData.firstName) {
      setError('Please fill in your name, email, and password.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendRegistrationOtp({
        email: formData.email,
        firstName: formData.firstName
      });
      setSuccessMsg(res.message || 'OTP verification code sent to your email.');
      setStep('OTP');
      setTimer(600);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!formData.otp || formData.otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP sent to your email.');
      return;
    }

    setIsLoading(true);
    try {
      await verifyOtpAndRegister(formData);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Tab Toggle (if not in OTP step) */}
        {step === 'FORM' && (
          <div className="flex border-b border-slate-100 dark:border-slate-800 text-center font-bold text-sm">
            <button
              onClick={() => { setMode('LOGIN'); setError(''); }}
              className={`flex-1 py-4 border-b-2 transition-all ${
                mode === 'LOGIN' 
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('REGISTER'); setError(''); }}
              className={`flex-1 py-4 border-b-2 transition-all ${
                mode === 'REGISTER' 
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && !error && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. LOGIN FORM */}
          {mode === 'LOGIN' && step === 'FORM' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Welcome Back!</h3>
                <p className="text-xs text-slate-500 mt-1">Sign in to track orders, manage addresses, and request returns.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input 
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input 
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 mt-4 cursor-pointer"
              >
                {isLoading ? 'Signing In...' : 'Sign In to Account'}
              </button>
            </form>
          )}

          {/* 2. REGISTRATION STEP 1: Details & Request OTP */}
          {mode === 'REGISTER' && step === 'FORM' && (
            <form onSubmit={handleSendOtp} className="space-y-3">
              <div className="text-center mb-4">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Create New Account</h3>
                <p className="text-xs text-slate-500 mt-0.5">We will send a 6-digit verification code to your email.</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">First Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="John"
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Last Name</label>
                  <input 
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Email Address (for OTP)</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input 
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Mobile Phone</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input 
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Password (min. 6 characters)</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input 
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 mt-3 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? 'Sending Verification Code...' : 'Send Verification OTP'} <ArrowRight size={14} />
              </button>
            </form>
          )}

          {/* 3. REGISTRATION STEP 2: Email OTP Input */}
          {mode === 'REGISTER' && step === 'OTP' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 mx-auto flex items-center justify-center">
                <Mail size={24} />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Verify Your Email</h3>
                <p className="text-xs text-slate-500 mt-1">
                  We've sent a 6-digit confirmation code to:
                </p>
                <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">{formData.email}</div>
              </div>

              <div className="py-2">
                <input 
                  type="text"
                  maxLength="6"
                  required
                  autoFocus
                  placeholder="------"
                  value={formData.otp}
                  onChange={e => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') })}
                  className="w-48 mx-auto text-center font-mono text-3xl tracking-widest font-black py-2.5 border-2 border-blue-500 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
                <div className="text-[11px] text-slate-400 mt-2">
                  Expires in <strong className="text-blue-600">{formatTimer(timer)}</strong>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? 'Verifying...' : 'Verify Email & Create Account'}
              </button>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setStep('FORM')}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold"
                >
                  Change Email
                </button>

                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isLoading}
                  className="text-blue-600 hover:underline font-bold flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Resend OTP
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

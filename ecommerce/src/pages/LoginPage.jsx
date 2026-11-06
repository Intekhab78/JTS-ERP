import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { Mail, Lock, Eye, EyeOff, ShoppingBag, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { AuthModal } from '../components/auth/AuthModal';

export const LoginPage = () => {
  const { login, sendRegistrationOtp, verifyOtpAndRegister, isAuthenticated } = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('LOGIN'); // 'LOGIN' or 'REGISTER'
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [regStep, setRegStep] = useState('FORM'); // 'FORM' or 'OTP'
  const [successMsg, setSuccessMsg] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    emailOrMobile: '',
    password: '',
    otp: ''
  });

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/account';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login({
        email: formData.emailOrMobile,
        password: formData.password
      });
      const from = location.state?.from?.pathname || '/account';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (regStep === 'FORM') {
        const res = await sendRegistrationOtp({
          email: formData.emailOrMobile,
          firstName: formData.name
        });
        setSuccessMsg(res.message || 'OTP sent to your email.');
        setRegStep('OTP');
      } else {
        await verifyOtpAndRegister({
          email: formData.emailOrMobile,
          firstName: formData.name,
          password: formData.password,
          otp: formData.otp
        });
        navigate('/account', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-[96%] min-h-[80vh] mx-auto flex items-center justify-center py-8 sm:py-12 bg-[#F8FAFC]">
      <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12">

        {/* LEFT COLUMN: Shopping Illustration & Welcome Message (Panel 5 Match) */}
        <div className="md:col-span-5 bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-100/60 p-8 sm:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200">
          <div className="space-y-6">
            {/* Visual Icon Illustration */}
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
              <ShoppingBag size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight">
                {activeTab === 'LOGIN' ? 'Welcome Back!' : 'Join JTS ERP!'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                {activeTab === 'LOGIN'
                  ? 'Login to your JTS ERP account to continue shopping and get personalized offers.'
                  : 'Create an account to track shipments in real-time, save delivery addresses, and enjoy faster checkouts.'}
              </p>
            </div>
          </div>

          <div className="pt-8 space-y-2 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
              <span>100% Secure Enterprise Login</span>
            </div>
            <div className="flex items-center gap-2">
              <Check size={16} className="text-blue-600 shrink-0" />
              <span>Direct fulfillment from authorized ERP warehouses</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Authentication Form Card (Panel 5 Match) */}
        <div className="md:col-span-7 p-8 sm:p-10 space-y-6">

          {/* Top Tabs Switcher */}
          <div className="flex border-b border-slate-200 pb-1">
            <button
              type="button"
              onClick={() => { setActiveTab('LOGIN'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-all cursor-pointer ${
                activeTab === 'LOGIN'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('REGISTER'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-all cursor-pointer ${
                activeTab === 'REGISTER'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              Register
            </button>
          </div>

          {/* Error / Success Banners */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-medium">
              {successMsg}
            </div>
          )}

          {/* LOGIN FORM */}
          {activeTab === 'LOGIN' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Email or Mobile Number</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Enter your email or mobile"
                    value={formData.emailOrMobile}
                    onChange={e => setFormData({ ...formData, emailOrMobile: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 text-slate-900 font-medium pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Signing In...' : 'Login'}
              </button>

              {/* Social Login Divider (Panel 5 Match) */}
              <div className="relative py-2 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <span className="relative bg-white px-3 text-[11px] font-semibold text-slate-400">
                  or continue with
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => alert('Google Social Sign-In is configured on production domain.')}
                  className="py-2.5 px-4 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => alert('Facebook Social Sign-In is configured on production domain.')}
                  className="py-2.5 px-4 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-[#1877F2]" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span>Facebook</span>
                </button>
              </div>

              <div className="text-center pt-2 text-xs text-slate-600">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('REGISTER')}
                  className="font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Register
                </button>
              </div>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {regStep === 'FORM' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Ankit Sharma"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 text-slate-900 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="ankit@example.com"
                      value={formData.emailOrMobile}
                      onChange={e => setFormData({ ...formData, emailOrMobile: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 text-slate-900 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Password</label>
                    <input
                      type="password"
                      required
                      placeholder="At least 6 characters"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 text-slate-900 font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? 'Sending verification code...' : 'Continue with Email Verification'}
                  </button>
                </>
              ) : (
                <>
                  <div className="space-y-2 text-center p-4 bg-blue-50 rounded-2xl border border-blue-200">
                    <span className="text-xs font-bold text-blue-900">Enter Verification Code</span>
                    <p className="text-[11px] text-blue-700">We've sent a 6-digit code to {formData.emailOrMobile}</p>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={formData.otp}
                      onChange={e => setFormData({ ...formData, otp: e.target.value })}
                      className="w-40 mx-auto px-4 py-2 text-center tracking-widest font-mono text-base font-bold border border-blue-400 rounded-xl bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? 'Verifying...' : 'Complete Registration'}
                  </button>
                </>
              )}

              <div className="text-center pt-2 text-xs text-slate-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('LOGIN')}
                  className="font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Login
                </button>
              </div>
            </form>
          )}

        </div>
      </div>

      {/* Forgot Password Recovery Modal */}
      <AuthModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialMode="FORGOT_PASSWORD"
      />
    </div>
  );
};

export default LoginPage;

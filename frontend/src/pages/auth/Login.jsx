import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FormField } from '../../components/common/FormField';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { Alert } from '../../components/ui/Alert';
import { ArrowRight, Mail, KeyRound, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ApiStatusBadge } from '../../components/common/ApiStatusBadge';

const Login = ({ onToggle }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Forgot Password modal state
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotStatus, setForgotStatus] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const { data } = await axios.post('/api/v1/auth/login', formData);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ 
        email: data.email, 
        tenantId: data.tenantId,
        permissions: data.permissions || [],
        roleName: data.roleName,
        branches: data.branches || []
      }));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForgotModal = () => {
    setForgotEmail(formData.email || '');
    setForgotStatus({ type: '', text: '' });
    setIsForgotOpen(true);
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.trim()) {
      setForgotStatus({ type: 'error', text: 'Please enter your registered email address.' });
      return;
    }

    setForgotLoading(true);
    setForgotStatus({ type: '', text: '' });

    try {
      const res = await axios.post('/api/v1/auth/forgot-password', {
        email: forgotEmail.trim()
      });

      setForgotStatus({
        type: 'success',
        text: res.data?.message || 'Password reset link sent to your email.'
      });
    } catch (err) {
      setForgotStatus({
        type: 'error',
        text: err.response?.data?.message || 'Failed to send password reset email. Please try again.'
      });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col justify-center h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Welcome Back</h2>
          <p className="text-sm font-semibold text-muted-foreground">Enter your credentials to access your workspace.</p>
        </div>
        <ApiStatusBadge />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField label="Email Address" required>
          <Input 
            type="email" 
            required
            placeholder="name@company.com"
            value={formData.email} 
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            disabled={loading}
          />
        </FormField>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Password</label>
            <button
              type="button"
              onClick={handleOpenForgotModal}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors focus:outline-none"
            >
              Forgot Password?
            </button>
          </div>
          <Input 
            type="password" 
            required
            placeholder="••••••••"
            value={formData.password} 
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            disabled={loading}
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="remember" />
          <label htmlFor="remember" className="text-sm font-semibold text-muted-foreground cursor-pointer select-none">
            Remember Me
          </label>
        </div>

        <div className="pt-2">
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-12 text-base font-bold shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
          </Button>
        </div>
      </form>

      <p className="text-center text-xs font-semibold text-muted-foreground mt-8">
        Don't have an account?{' '}
        <button 
          type="button" 
          onClick={() => onToggle('/register')} 
          className="text-blue-600 font-bold hover:underline underline-offset-4 ml-1"
        >
          Request Access
        </button>
      </p>

      {/* Forgot Password Modal */}
      {isForgotOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden transform animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-blue-950 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
                  <KeyRound className="h-6 w-6 text-blue-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Reset Password</h3>
                  <p className="text-xs text-blue-200 font-medium">We'll send a recovery link to your inbox</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsForgotOpen(false)} 
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleForgotSubmit} className="p-6 space-y-4">
              {forgotStatus.type === 'error' && (
                <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200/80 rounded-xl text-red-700 text-xs font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{forgotStatus.text}</span>
                </div>
              )}

              {forgotStatus.type === 'success' ? (
                <div className="py-4 space-y-4 text-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Check Your Email</h4>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {forgotStatus.text}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-2">
                      The reset link will expire in 1 hour.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setIsForgotOpen(false)}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm h-10"
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Enter the email address associated with your ERP account and we'll dispatch a secure password reset link.
                  </p>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                      Your Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        type="email"
                        required
                        placeholder="e.g. employee@company.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        disabled={forgotLoading}
                        className="pl-9"
                      />
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsForgotOpen(false)}
                      disabled={forgotLoading}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={forgotLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 px-5 shadow-sm"
                    >
                      {forgotLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Reset Link'
                      )}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Login;


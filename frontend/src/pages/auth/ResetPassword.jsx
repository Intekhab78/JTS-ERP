import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { LayoutGrid, Lock, KeyRound, CheckCircle2, AlertCircle, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { FormField } from '../../components/common/FormField';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      await axios.put(`/api/v1/auth/reset-password/${token}`, { password });
      setIsSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eaf0f6] flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="w-full max-w-[520px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.06)] overflow-hidden border border-slate-100 p-8 sm:p-12 relative animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header Icon & Brand */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm">
              <KeyRound size={22} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">JTS ERP</h2>
              <p className="text-xs font-semibold text-slate-400">Enterprise Security System</p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full flex items-center gap-1.5">
            <ShieldCheck size={13} /> Secure Reset
          </span>
        </div>

        {isSuccess ? (
          <div className="text-center py-4 space-y-6 animate-in fade-in duration-300">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">Password Reset Complete!</h3>
              <p className="text-sm text-slate-500 font-medium mt-2 max-w-sm mx-auto leading-relaxed">
                Your password has been securely updated. You can now log into your account using your new credentials.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full h-12 text-base font-bold shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Back to Login <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create New Password</h1>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Enter and confirm your new password below. Must be at least 6 characters.
              </p>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="w-4 h-4 mr-2" />
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter new password (min. 6 chars)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              {password && (
                <div className="text-xs space-y-1 pt-1">
                  <div className={`flex items-center gap-1.5 ${password.length >= 6 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <span className="font-bold">{password.length >= 6 ? '✓' : '○'}</span> At least 6 characters
                  </div>
                  {confirmPassword && (
                    <div className={`flex items-center gap-1.5 ${password === confirmPassword ? 'text-emerald-600' : 'text-rose-500'}`}>
                      <span className="font-bold">{password === confirmPassword ? '✓' : '✕'}</span> Passwords match
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 text-base font-bold shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? 'Updating Password...' : 'Reset Password'}
                  {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
                </Button>
              </div>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Cancel and Return to Sign In
                </Link>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default ResetPassword;

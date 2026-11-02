import React, { useState } from 'react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { User, Lock, Mail, Phone, CheckCircle2, AlertCircle, Save } from 'lucide-react';

export const CustomerProfile = () => {
  const { customer, updateProfile } = useCustomerAuth();

  const [formData, setFormData] = useState({
    firstName: customer?.firstName || '',
    lastName: customer?.lastName || '',
    phone: customer?.phone || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.newPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        setError('New passwords do not match');
        return;
      }
      if (!formData.currentPassword) {
        setError('Please enter your current password to set a new password');
        return;
      }
    }

    setIsSaving(true);
    try {
      await updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        currentPassword: formData.currentPassword || undefined,
        newPassword: formData.newPassword || undefined
      });

      setSuccess('Profile details updated successfully!');
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="pb-2.5 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-base font-black text-slate-900 dark:text-white">Profile Details</h2>
        <p className="text-[11px] text-slate-500">Manage your personal contact info and login security.</p>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center gap-2 border border-emerald-200">
          <CheckCircle2 size={15} /> <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs flex items-center gap-2 border border-red-200">
          <AlertCircle size={15} /> <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleProfileSubmit} className="space-y-3 text-xs max-w-xl">
        {/* Personal Details */}
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <User size={15} className="text-blue-600" /> Personal Information
          </h3>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">First Name</label>
              <input 
                type="text"
                required
                value={formData.firstName}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Last Name</label>
              <input 
                type="text"
                value={formData.lastName}
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Email Address</span>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 size={11} /> Verified with OTP
              </span>
            </label>
            <input 
              type="email"
              disabled
              value={customer?.email || ''}
              className="w-full px-2.5 py-1.5 border rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">Phone Number</label>
            <input 
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Change Password */}
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Lock size={15} className="text-blue-600" /> Change Password
          </h3>

          <div className="space-y-2">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Current Password</label>
              <input 
                type="password"
                placeholder="••••••••"
                value={formData.currentPassword}
                onChange={e => setFormData({ ...formData, currentPassword: e.target.value })}
                className="w-full px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">New Password</label>
                <input 
                  type="password"
                  placeholder="••••••••"
                  value={formData.newPassword}
                  onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                  className="w-full px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Confirm New Password</label>
                <input 
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs"
        >
          <Save size={14} /> {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
        </button>
      </form>
    </div>
  );
};

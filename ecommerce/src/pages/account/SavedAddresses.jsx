import React, { useState } from 'react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { MapPin, Plus, Trash2, Edit2, CheckCircle2, Home, Building } from 'lucide-react';

export const SavedAddresses = () => {
  const { customer, addAddress, updateAddress, setDefaultAddress, deleteAddress } = useCustomerAuth();
  const addresses = Array.isArray(customer?.addresses) ? customer.addresses : [];

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSetDefault = async (id) => {
    try {
      await setDefaultAddress(id);
    } catch (err) {
      console.error(err);
      alert('Failed to set default address.');
    }
  };

  const [form, setForm] = useState({
    label: 'Home',
    fullName: '',
    phone: '',
    street: '',
    street2: '',
    city: '',
    state: '',
    zip: '',
    country: 'India',
    isDefault: false
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      label: 'Home',
      fullName: customer?.name || '',
      phone: customer?.phone || '',
      street: '',
      street2: '',
      city: '',
      state: '',
      zip: '',
      country: 'India',
      isDefault: addresses.length === 0
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (addr) => {
    setEditingId(addr._id);
    setForm({
      label: addr.label || 'Home',
      fullName: addr.fullName,
      phone: addr.phone,
      street: addr.street,
      street2: addr.street2 || '',
      city: addr.city,
      state: addr.state,
      zip: addr.zip,
      country: addr.country || 'India',
      isDefault: Boolean(addr.isDefault)
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateAddress(editingId, form);
      } else {
        await addAddress(form);
      }
      setModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this delivery address?')) return;
    try {
      await deleteAddress(id);
    } catch (err) {
      alert('Failed to delete address.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white">Delivery Addresses</h2>
          <p className="text-[11px] text-slate-500">Manage your saved shipping destinations for one-click checkout.</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1 transition-all cursor-pointer"
        >
          <Plus size={13} /> Add Address
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <MapPin size={32} className="mx-auto text-slate-300" />
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">No saved addresses</h3>
          <p className="text-xs text-slate-500">Save your home or office address to checkout faster.</p>
          <button
            onClick={handleOpenCreate}
            className="mt-1 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
          >
            Add Your First Address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {addresses.map(addr => {
            const activeId = localStorage.getItem('jts_active_address_id');
            const isSelected = activeId ? (activeId === addr._id) : addr.isDefault;
            return (
              <div 
                key={addr._id}
                className={`p-3.5 rounded-xl border transition-all space-y-2 relative text-xs ${
                  isSelected 
                    ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-500 shadow-2xs ring-1 ring-blue-500/20' 
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[10px] uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {addr.label || 'Home'}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-black text-blue-600 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={11} /> Default Shipping
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white">{addr.fullName}</div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {addr.street} {addr.street2 ? `, ${addr.street2}` : ''}<br />
                    {addr.city}, {addr.state} {addr.zip}<br />
                    {addr.country}
                  </p>
                  <div className="text-slate-500 font-semibold">Phone: {addr.phone}</div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {!isSelected ? (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(addr._id)}
                      className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 hover:border-blue-600 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <CheckCircle2 size={13} /> Deliver to this address
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={13} /> Active Delivery Location
                    </span>
                  )}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(addr)}
                      className="px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(addr._id)}
                      className="px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {editingId ? 'Edit Delivery Address' : 'Add New Delivery Address'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="flex gap-2">
                {['Home', 'Office', 'Other'].map(lbl => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => setForm({ ...form, label: lbl })}
                    className={`flex-1 py-1.5 rounded-xl font-bold border transition-all ${
                      form.label === lbl 
                        ? 'border-blue-600 bg-blue-50 text-blue-600' 
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    value={form.fullName}
                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Phone</label>
                  <input 
                    type="tel" 
                    required 
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Street Address</label>
                <input 
                  type="text" 
                  required 
                  value={form.street}
                  onChange={e => setForm({ ...form, street: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">City</label>
                  <input 
                    type="text" 
                    required 
                    value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">State</label>
                  <input 
                    type="text" 
                    required 
                    value={form.state}
                    onChange={e => setForm({ ...form, state: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">ZIP</label>
                  <input 
                    type="text" 
                    required 
                    value={form.zip}
                    onChange={e => setForm({ ...form, zip: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input 
                  type="checkbox"
                  id="defaultAddrCheck"
                  checked={form.isDefault}
                  onChange={e => setForm({ ...form, isDefault: e.target.checked })}
                  className="text-blue-600 rounded"
                />
                <label htmlFor="defaultAddrCheck" className="font-bold text-slate-700 cursor-pointer">
                  Set as default shipping address
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                >
                  {isSubmitting ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

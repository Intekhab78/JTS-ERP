import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2 } from 'lucide-react';
import { useStoreSettings } from '../context/StoreSettingsContext';

export const ContactUs = () => {
  const { storeEmail, supportPhone, storeName } = useStoreSettings();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="w-[96%] mx-auto py-8 sm:py-10 space-y-8 sm:space-y-10">
      <div className="text-center space-y-3 max-w-xl mx-auto">
        <span className="text-xs font-black uppercase tracking-wider text-blue-600 block">Customer Support</span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">Get in Touch</h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Have an inquiry regarding your order, returns, or product availability? We're here to assist.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Contact Info Cards */}
        <div className="space-y-4">
          <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 text-xs">
            <div className="flex items-center gap-2 text-blue-600 font-bold mb-1">
              <Mail size={16} /> <span>Email Us</span>
            </div>
            <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
              {storeEmail || 'support@' + window.location.hostname}
            </div>
            <p className="text-slate-400">Direct response from our support team</p>
          </div>

          {supportPhone && (
            <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 text-xs">
              <div className="flex items-center gap-2 text-blue-600 font-bold mb-1">
                <Phone size={16} /> <span>Call Us</span>
              </div>
              <div className="font-extrabold text-sm text-slate-900 dark:text-white">{supportPhone}</div>
              <p className="text-slate-400">Monday - Saturday, 9am - 7pm</p>
            </div>
          )}

          <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 text-xs">
            <div className="flex items-center gap-2 text-blue-600 font-bold mb-1">
              <MapPin size={16} /> <span>Fulfillment Hubs</span>
            </div>
            <div className="font-extrabold text-slate-900 dark:text-white">Central Warehouse & Retail Outlets</div>
            <p className="text-slate-400">Integrated multi-hub inventory allocation</p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="md:col-span-2 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          {submitted ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Message Sent Successfully!</h3>
              <p className="text-xs text-slate-500">
                Thank you for contacting us. Our support team will respond to your email shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Subject / Order ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inquiry on Order WEB-78A9C1"
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Message</label>
                <textarea
                  required
                  placeholder="How can we help you?"
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 h-32"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 flex items-center gap-2 cursor-pointer"
              >
                <Send size={15} /> Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

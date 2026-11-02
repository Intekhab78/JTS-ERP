import React from 'react';
import { ShoppingBag, ShieldCheck, Truck, Building2, Users, Award } from 'lucide-react';

export const AboutUs = () => {
  return (
    <div className="w-[96%] mx-auto py-8 sm:py-10 space-y-8 sm:space-y-10">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="text-xs font-black uppercase tracking-wider text-blue-600 block">Our Story & Mission</span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
          Omnichannel Retail Powered by Modern ERP
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Connecting physical retail outlets and central warehouses with a unified digital shopping experience.
        </p>
      </div>

      {/* Grid Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
            <Building2 size={24} />
          </div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Multi-Location Fulfillment</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Our smart allocation engine reserves safety buffer quantities at each retail branch and warehouse, prioritizing order picking from optimal hubs.
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
            <ShieldCheck size={24} />
          </div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">100% Verified Inventory</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Every product catalog entry is tied directly to active ERP stock batches with accurate serial and barcode tracking for genuine quality assurance.
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
            <Truck size={24} />
          </div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Integrated Logistics</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Integrated courier partnerships provide instant automated shipment tracking and milestone updates directly to your customer account.
          </p>
        </div>
      </div>
    </div>
  );
};

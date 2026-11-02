import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Mail, Phone } from 'lucide-react';
import { useStoreSettings } from '../../context/StoreSettingsContext';

export const Footer = () => {
  const { storeName, storeEmail, supportPhone } = useStoreSettings();

  return (
    <footer className="bg-[#172033] text-white mt-auto border-t border-slate-800">

      {/* Main Footer Links */}
      <div className="w-[96%] mx-auto py-10 sm:py-12 grid grid-cols-1 md:grid-cols-4 gap-8 text-xs">

        {/* Brand & About */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black shadow-md">
              <ShoppingBag size={18} />
            </div>
            <span className="text-xl font-black text-white">{storeName || 'JTS ERP'}</span>
          </div>
          <p className="text-slate-400 leading-relaxed font-medium">
            Your One-Stop Shopping Destination. Verified multi-warehouse inventory dispatched directly to your doorstep.
          </p>
          <div className="space-y-1.5 text-slate-400">
            {storeEmail && (
              <div className="flex items-center gap-2">
                <Mail size={13} className="text-blue-400" />
                <span>{storeEmail}</span>
              </div>
            )}
            {supportPhone && (
              <div className="flex items-center gap-2">
                <Phone size={13} className="text-blue-400" />
                <span>{supportPhone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Company Links */}
        <div className="space-y-3">
          <h4 className="text-sm font-black text-white uppercase tracking-wider">Company</h4>
          <ul className="space-y-2.5 text-slate-400 font-medium">
            <li><Link to="/about-us" className="hover:text-white transition-colors">About Us</Link></li>
            <li><Link to="/contact-us" className="hover:text-white transition-colors">Contact Us</Link></li>
            <li><Link to="/catalog" className="hover:text-white transition-colors">Careers</Link></li>
            <li><Link to="/contact-us" className="hover:text-white transition-colors">Help Center</Link></li>
            <li><Link to="/about-us" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
            <li><Link to="/about-us" className="hover:text-white transition-colors">Privacy Policy</Link></li>
          </ul>
        </div>

        {/* Download Our App Badges (Reference Match) */}
        <div className="space-y-3">
          <h4 className="text-sm font-black text-white uppercase tracking-wider">Download Our App</h4>
          <div className="space-y-2 pt-1">
            <a
              href="#"
              onClick={e => e.preventDefault()}
              className="flex items-center gap-3 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors max-w-[180px]"
            >
              <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                <path d="M3.609 1.814L13.792 12 3.61 22.186a1.597 1.597 0 0 1-.22-.387V2.2c.06-.145.134-.277.22-.386zm11.3 11.302l2.368-2.368-9.923-5.733 7.555 8.1zm2.368 1.768l-2.368-2.369-7.555 8.102 9.923-5.733zm1.185-1.186l2.97-1.718a1.52 1.52 0 0 0 0-2.634l-2.97-1.718-1.768 1.768 1.768 1.768z"/>
              </svg>
              <div>
                <span className="text-[9px] text-slate-400 uppercase block font-semibold">Get it on</span>
                <span className="text-xs font-bold text-white block">Google Play</span>
              </div>
            </a>

            <a
              href="#"
              onClick={e => e.preventDefault()}
              className="flex items-center gap-3 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors max-w-[180px]"
            >
              <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.12c.62-.75 1.04-1.8 1.01-2.85-.9.04-1.99.6-2.61 1.34-.58.69-1.05 1.76-1.01 2.81 1 .08 2.01-.52 2.61-1.3"/>
              </svg>
              <div>
                <span className="text-[9px] text-slate-400 uppercase block font-semibold">Download on the</span>
                <span className="text-xs font-bold text-white block">App Store</span>
              </div>
            </a>
          </div>
        </div>

        {/* Social Links & Trust */}
        <div className="space-y-3">
          <h4 className="text-sm font-black text-white uppercase tracking-wider">Connect with Us</h4>
          <p className="text-slate-400 leading-relaxed font-medium">
            Follow our official enterprise channels for clearance updates and feature releases.
          </p>
          <div className="flex items-center gap-3 pt-2">
            {[
              { name: 'Facebook', bg: 'bg-[#1877F2]' },
              { name: 'Instagram', bg: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600' },
              { name: 'Twitter/X', bg: 'bg-black' },
              { name: 'YouTube', bg: 'bg-[#FF0000]' }
            ].map(social => (
              <a
                key={social.name}
                href="#"
                onClick={e => e.preventDefault()}
                title={social.name}
                className={`w-9 h-9 rounded-xl ${social.bg} text-white flex items-center justify-center shadow-md hover:scale-108 transition-transform font-bold text-xs`}
              >
                {social.name[0]}
              </a>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800 py-6 text-xs text-slate-500">
        <div className="w-[96%] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            &copy; {new Date().getFullYear()} {storeName || 'JTS ERP'}. All rights reserved.
          </div>
          <div className="font-semibold text-slate-400">
            Shop Smarter, Live Better.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

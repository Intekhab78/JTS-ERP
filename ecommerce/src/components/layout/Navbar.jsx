import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ShoppingBag, User, Search, ChevronDown, ChevronRight, Menu,
  X, LogOut, Package, MapPin, Heart,
  ArrowRight, CheckCircle2, Layers
} from 'lucide-react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { AuthModal } from '../auth/AuthModal';
import { getProductImage } from '../../utils/productImageHelper';

export const Navbar = () => {
  const { customer, isAuthenticated, logout, setDefaultAddress } = useCustomerAuth();
  const { cartCount, openCart } = useCart();
  const { wishlistCount, openWishlist } = useWishlist();
  const { formatCurrency, storeName } = useStoreSettings();
  const navigate = useNavigate();

  // Hierarchy, Products & Department Mega Menu State
  const [categoriesTree, setCategoriesTree] = useState({ departments: [], categories: [], families: [] });
  const [navProducts, setNavProducts] = useState([]);
  const [activeDeptMenu, setActiveDeptMenu] = useState(null);
  const deptMenuTimeoutRef = useRef(null);

  // Search & Suggestions State
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState({ suggestions: [], products: [], brands: [], departments: [] });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchBoxRef = useRef(null);

  // Modals & Popovers
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('LOGIN');
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState(() => localStorage.getItem('jts_delivery_location') || localStorage.getItem('jts_pincode') || '');
  const [deliveryPincode, setDeliveryPincode] = useState(() => localStorage.getItem('jts_pincode') || '');
  const [isPincodeModalOpen, setIsPincodeModalOpen] = useState(false);
  const [tempPincode, setTempPincode] = useState(() => localStorage.getItem('jts_pincode') || '');

  useEffect(() => {
    fetchHeaderData();
  }, []);

  useEffect(() => {
    const updateLocation = () => {
      const addresses = Array.isArray(customer?.addresses) ? customer.addresses : [];
      if (addresses.length > 0) {
        const activeId = localStorage.getItem('jts_active_address_id');
        const active = (activeId && addresses.find(a => a._id === activeId)) ||
                       addresses.find(a => a.isDefault) ||
                       addresses[0];
        if (active) {
          const locText = active.city ? `${active.city} ${active.zip}` : active.zip;
          setDeliveryLocation(locText);
          setDeliveryPincode(active.zip || '');
          setTempPincode(active.zip || '');
          localStorage.setItem('jts_pincode', active.zip || '');
          localStorage.setItem('jts_delivery_city', active.city || '');
          localStorage.setItem('jts_delivery_location', locText);
          localStorage.setItem('jts_active_address_id', active._id);
          return;
        }
      }
      const savedLoc = localStorage.getItem('jts_delivery_location') || localStorage.getItem('jts_pincode');
      if (savedLoc) {
        setDeliveryLocation(savedLoc);
        setDeliveryPincode(localStorage.getItem('jts_pincode') || savedLoc);
        setTempPincode(localStorage.getItem('jts_pincode') || savedLoc);
      }
    };

    updateLocation();

    const handleLocationEvent = (e) => {
      if (e.detail?.text) {
        setDeliveryLocation(e.detail.text);
      }
      if (e.detail?.pincode) {
        setDeliveryPincode(e.detail.pincode);
        setTempPincode(e.detail.pincode);
      }
    };

    const handleOpenModal = () => setIsPincodeModalOpen(true);

    window.addEventListener('jts_location_updated', handleLocationEvent);
    window.addEventListener('jts_open_location_modal', handleOpenModal);
    return () => {
      window.removeEventListener('jts_location_updated', handleLocationEvent);
      window.removeEventListener('jts_open_location_modal', handleOpenModal);
    };
  }, [customer]);

  const fetchHeaderData = async () => {
    try {
      const [catsRes, prodsRes] = await Promise.all([
        axios.get('/api/v1/ecommerce/categories'),
        axios.get('/api/v1/ecommerce/products?limit=64')
      ]);
      setCategoriesTree(catsRes.data || { departments: [], categories: [], families: [] });
      setNavProducts(prodsRes.data?.products || []);
    } catch (e) {
      console.warn('Failed to fetch navbar data:', e.message);
    }
  };

  const handleDeptMouseEnter = (deptName) => {
    if (deptMenuTimeoutRef.current) {
      clearTimeout(deptMenuTimeoutRef.current);
    }
    setActiveDeptMenu(deptName);
  };

  const handleDeptMouseLeave = () => {
    deptMenuTimeoutRef.current = setTimeout(() => {
      setActiveDeptMenu(null);
    }, 180);
  };

  // ONLY DEPARTMENTS on the horizontal header line (as requested: "yha header mere kwal department ana chiye")
  const navBarItems = useMemo(() => {
    const list = (categoriesTree.departments || []).map(d => ({
      id: d._id || d.name,
      name: d.name,
      type: 'department',
      productCount: d.productCount || 0,
      link: `/catalog?department=${encodeURIComponent(d.name)}`
    }));

    return list;
  }, [categoriesTree.departments]);

  // When a department is hovered: finds categories inside it, and the real products inside each category
  const activeDepartmentCategories = useMemo(() => {
    if (!activeDeptMenu) return [];

    const allCats = categoriesTree.categories && categoriesTree.categories.length > 0
      ? categoriesTree.categories
      : categoriesTree.sections || [];

    const deptObj = navBarItems.find(d => d.name === activeDeptMenu);
    const deptIdStr = deptObj?.id ? deptObj.id.toString() : '';
    const deptNameLower = (activeDeptMenu || '').trim().toLowerCase();

    // 1. Find categories that belong to this department
    let matchedCats = allCats.filter(c => {
      const cDeptId = c.departmentId ? c.departmentId.toString() : '';
      const cDeptName = (c.department || '').trim().toLowerCase();
      return (deptIdStr && cDeptId === deptIdStr) || 
             (cDeptName && cDeptName === deptNameLower) ||
             navProducts.some(p => (p.department || '').trim().toLowerCase() === deptNameLower && 
                                   (p.categoryId?.toString() === c._id?.toString() || (p.category || '').toLowerCase() === c.name.toLowerCase()));
    });

    if (matchedCats.length === 0) {
      if (deptNameLower.includes('it') || deptNameLower.includes('computer')) {
        matchedCats = allCats.filter(c => {
          const n = (c.name || '').toLowerCase();
          return n.includes('computer') || n.includes('laptop') || n.includes('accessor');
        });
      } else if (deptNameLower.includes('electronic') || deptNameLower.includes('consumer')) {
        matchedCats = allCats.filter(c => {
          const n = (c.name || '').toLowerCase();
          return n.includes('mobile') || n.includes('phone') || n.includes('tablet') || n.includes('audio');
        });
      }
      if (matchedCats.length === 0) {
        matchedCats = allCats.slice(0, 4);
      }
    }

    // 2. For each category, get real products
    return matchedCats.map(cat => {
      const catIdStr = cat._id ? cat._id.toString() : '';
      const catNameLower = (cat.name || '').trim().toLowerCase();

      const prodsInCat = navProducts.filter(p => {
        const pCatId = p.categoryId ? p.categoryId.toString() : '';
        const pCatName = (p.category || '').trim().toLowerCase();
        const pDeptName = (p.department || '').trim().toLowerCase();
        
        const matchesCategory = (catIdStr && pCatId === catIdStr) || (pCatName && pCatName === catNameLower);
        const matchesDept = (pDeptName === deptNameLower);
        
        return matchesCategory && (matchesDept || !p.department);
      });

      const finalProds = prodsInCat.length > 0 
        ? prodsInCat 
        : navProducts.filter(p => {
            const pCatId = p.categoryId ? p.categoryId.toString() : '';
            const pCatName = (p.category || '').trim().toLowerCase();
            return (catIdStr && pCatId === catIdStr) || (pCatName && pCatName === catNameLower);
          });

      return {
        id: cat._id,
        name: cat.name,
        productCount: finalProds.length || cat.productCount || 0,
        products: finalProds
      };
    });
  }, [activeDeptMenu, navBarItems, categoriesTree, navProducts]);

  const totalDepartmentProducts = useMemo(() => {
    return activeDepartmentCategories.reduce((acc, cat) => acc + (cat.products?.length || cat.productCount || 0), 0);
  }, [activeDepartmentCategories]);

  // Close search suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search suggestions with debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSuggestions({ suggestions: [], products: [], brands: [], departments: [] });
      setIsSearchOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await axios.get(`/api/v1/ecommerce/search-suggestions?q=${encodeURIComponent(searchQuery.trim())}`);
        setSuggestions(data || { suggestions: [], products: [], brands: [], departments: [] });
        setIsSearchOpen(true);
      } catch (err) {
        console.warn('Search suggestions error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);


  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setIsSearchOpen(false);
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    navigate(`/catalog?${params.toString()}`);
  };

  const handleSuggestionClick = (queryText) => {
    setSearchQuery(queryText);
    setIsSearchOpen(false);
    navigate(`/catalog?search=${encodeURIComponent(queryText)}`);
  };

  const handleSelectSavedAddress = async (addr) => {
    const locText = addr.city ? `${addr.city} ${addr.zip}` : addr.zip;
    setDeliveryLocation(locText);
    setDeliveryPincode(addr.zip);
    setTempPincode(addr.zip);
    localStorage.setItem('jts_pincode', addr.zip || '');
    localStorage.setItem('jts_delivery_city', addr.city || '');
    localStorage.setItem('jts_delivery_location', locText);
    localStorage.setItem('jts_active_address_id', addr._id);
    window.dispatchEvent(new CustomEvent('jts_location_updated', {
      detail: { address: addr, pincode: addr.zip, text: locText }
    }));
    setIsPincodeModalOpen(false);

    if (setDefaultAddress && addr._id) {
      try {
        await setDefaultAddress(addr._id);
      } catch (err) {
        console.warn('Could not set default address in backend', err);
      }
    }
  };

  const savePincode = (e) => {
    e.preventDefault();
    const pin = tempPincode.trim();
    if (pin) {
      setDeliveryPincode(pin);
      setDeliveryLocation(pin);
      localStorage.setItem('jts_pincode', pin);
      localStorage.setItem('jts_delivery_location', pin);
      localStorage.removeItem('jts_active_address_id');
      window.dispatchEvent(new CustomEvent('jts_location_updated', {
        detail: { pincode: pin, text: pin }
      }));
    }
    setIsPincodeModalOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white text-slate-900 shadow-xs border-b border-slate-200">
        <div className="w-[96%] mx-auto">
          <div className="flex items-center justify-between h-[68px] gap-2 sm:gap-4">

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
              className="lg:hidden p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Menu size={22} />
            </button>

            {/* Brand Logo - Dynamic Store Name */}
            <Link to="/" className="flex items-center gap-2 shrink-0 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-all">
                <ShoppingBag size={19} className="stroke-[2.5]" />
              </div>
              <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                {storeName || 'JTS Store'}
              </span>
            </Link>

            {/* SEARCH BAR */}
            <div ref={searchBoxRef} className="flex-1 max-w-2xl relative hidden md:block">
              <form onSubmit={handleSearchSubmit} className="flex items-center">
                <div className="relative flex-1 flex items-center rounded-xl overflow-hidden border border-slate-200 bg-slate-50/80 hover:border-slate-300 focus-within:border-blue-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 text-slate-900 transition-all">
                  <Search size={17} className="ml-3.5 text-slate-400 shrink-0 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => { if (searchQuery.trim().length >= 2) setIsSearchOpen(true); }}
                    placeholder="Search products, categories, brands, SKU, barcode..."
                    className="w-full pl-2.5 pr-3 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
                      className="px-2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X size={15} />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
                    title="Search Catalog"
                  >
                    Search
                  </button>
                </div>
              </form>

              {/* LIVE AUTOCOMPLETE SUGGESTIONS POPUP (Amazon / Flipkart Style) */}
              {isSearchOpen && (suggestions.suggestions.length > 0 || suggestions.products.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-fade-in">

                  {/* Matching Product Previews */}
                  {suggestions.products.length > 0 && (
                    <div className="p-3 border-b border-slate-100 bg-slate-50/70">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-2 mb-2">
                        Product Results ({suggestions.products.length})
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {suggestions.products.map(p => {
                          const img = getProductImage(p);
                          return (
                            <Link
                              key={p._id}
                              to={`/product/${p._id}`}
                              onClick={() => setIsSearchOpen(false)}
                              className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white hover:shadow-xs border border-transparent hover:border-slate-200 transition-all group"
                            >
                              <div className="w-12 h-12 bg-white rounded-lg p-1 border border-slate-200 shrink-0 flex items-center justify-center">
                                <img src={img} alt={p.name} className="w-full h-full object-contain" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 truncate">
                                  {p.name}
                                </div>
                                <div className="flex items-center gap-2 text-[11px]">
                                  <span className="font-extrabold text-blue-600">{formatCurrency(p.salesPrice || p.price)}</span>
                                  {p.sku && <span className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</span>}
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Autocomplete Text Suggestions */}
                  {suggestions.suggestions.length > 0 && (
                    <div className="py-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-4 mb-1">
                        Search Suggestions
                      </span>
                      {suggestions.suggestions.map((text, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSuggestionClick(text.replace('Brand: ', ''))}
                          className="w-full text-left px-4 py-2 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <Search size={13} className="text-slate-400" />
                            <span>{text}</span>
                          </div>
                          <ArrowRight size={12} className="text-slate-300" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* View all results button */}
                  <div className="p-2.5 bg-slate-100/70 border-t border-slate-200 text-center">
                    <button
                      type="button"
                      onClick={() => handleSearchSubmit()}
                      className="text-xs font-extrabold text-blue-600 hover:underline flex items-center justify-center gap-1 w-full"
                    >
                      <span>See all results for "{searchQuery}"</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Delivery location stays in the main row to keep the storefront compact. */}
            <button
              onClick={() => setIsPincodeModalOpen(true)}
              className="hidden xl:flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-left hover:bg-slate-50 transition-colors group shrink-0 cursor-pointer border border-transparent hover:border-slate-200"
            >
              <MapPin size={18} className="text-blue-600 shrink-0" />
              <span className="leading-tight max-w-[150px] truncate">
                <span className="block text-[10px] text-slate-400 font-medium truncate">Deliver to</span>
                <span className="block text-[11px] font-extrabold text-slate-800 truncate" title={deliveryLocation || deliveryPincode || 'Set location'}>
                  {deliveryLocation || deliveryPincode || 'Set location'}
                </span>
              </span>
            </button>

            {/* RIGHT UTILITY ITEMS: Customer Account, Wishlist, Cart */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">

              {/* Customer Account Dropdown */}
              <div className="relative">
                {isAuthenticated ? (
                  <div>
                    <button
                      onClick={() => setIsAccountDropdownOpen(prev => !prev)}
                      className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-all cursor-pointer text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center ring-2 ring-blue-500/20">
                        {customer?.firstName ? customer.firstName[0].toUpperCase() : 'C'}
                      </div>
                      <div className="hidden lg:block leading-tight">
                        <span className="text-[10px] text-slate-400 block font-medium">Hello,</span>
                        <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                          {customer?.firstName || 'My Account'}
                          <ChevronDown size={12} className="text-slate-400" />
                        </span>
                      </div>
                    </button>

                    {isAccountDropdownOpen && (
                      <div
                        className="absolute right-0 mt-2 w-60 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 py-2 text-xs z-50 animate-fade-in"
                        onMouseLeave={() => setIsAccountDropdownOpen(false)}
                      >
                        <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                          <div className="font-extrabold text-slate-900">{customer?.name}</div>
                          <div className="text-[11px] text-slate-500 truncate">{customer?.email}</div>
                        </div>

                        <Link
                          to="/account/orders"
                          onClick={() => setIsAccountDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 text-slate-700 font-semibold"
                        >
                          <Package size={14} className="text-blue-600" />
                          <span>My Orders & Live Tracking</span>
                        </Link>

                        <button
                          onClick={() => { setIsAccountDropdownOpen(false); openWishlist(); }}
                          className="w-full text-left flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 text-slate-700 font-semibold"
                        >
                          <Heart size={14} className="text-rose-600" />
                          <span>My Wishlist ({wishlistCount})</span>
                        </button>

                        <Link
                          to="/account/addresses"
                          onClick={() => setIsAccountDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 text-slate-700 font-semibold"
                        >
                          <MapPin size={14} className="text-emerald-600" />
                          <span>Saved Addresses</span>
                        </Link>

                        <Link
                          to="/account/profile"
                          onClick={() => setIsAccountDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 text-slate-700 font-semibold"
                        >
                          <User size={14} className="text-purple-600" />
                          <span>Account Settings</span>
                        </Link>

                        <div className="border-t border-slate-100 my-1" />

                        <button
                          onClick={() => { logout(); setIsAccountDropdownOpen(false); }}
                          className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-rose-600 hover:bg-rose-50 font-bold"
                        >
                          <LogOut size={14} />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { setAuthModalMode('LOGIN'); setIsAuthModalOpen(true); }}
                      className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => { setAuthModalMode('REGISTER'); setIsAuthModalOpen(true); }}
                      className="hidden sm:inline-block px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                    >
                      Register
                    </button>
                  </div>
                )}
              </div>

              {/* Wishlist Button with Badge */}
              <button
                onClick={openWishlist}
                className="relative p-2 rounded-xl text-slate-700 hover:text-rose-600 hover:bg-slate-100 transition-all cursor-pointer"
                title="View Wishlist"
              >
                <Heart size={20} className={wishlistCount > 0 ? 'text-rose-600 fill-rose-600' : ''} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black h-4.5 w-4.5 rounded-full flex items-center justify-center shadow-xs animate-scale">
                    {wishlistCount}
                  </span>
                )}
              </button>

              {/* Cart Drawer Trigger */}
              <button
                onClick={openCart}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs cursor-pointer"
                title="View Shopping Cart"
              >
                <div className="relative">
                  <ShoppingBag size={18} />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-yellow-400 text-slate-950 text-[10px] font-black h-4 w-4 rounded-full flex items-center justify-center shadow-xs">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="text-xs font-black hidden sm:inline">
                  Cart
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* SLIM SUB-HEADER BAR (Strictly Departments Only) */}
        <div className="border-t border-b border-slate-200/80 bg-white text-slate-800 hidden md:block relative">
          <div className="w-[96%] mx-auto flex items-center justify-between">

            {/* Horizontal Nav Items: ONLY DEPARTMENTS */}
            <div className="flex items-center gap-7 lg:gap-9 overflow-x-auto no-scrollbar py-0">
              {navBarItems.map(item => {
                const isActive = activeDeptMenu === item.name;
                return (
                  <div
                    key={item.id || item.name}
                    className="relative py-3 cursor-pointer select-none group"
                    onMouseEnter={() => handleDeptMouseEnter(item.name)}
                    onMouseLeave={handleDeptMouseLeave}
                  >
                    <Link
                      to={item.link}
                      className={`text-[13px] tracking-tight transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                        isActive
                          ? 'text-blue-600 font-bold'
                          : 'text-slate-700 hover:text-blue-600 font-semibold'
                      }`}
                    >
                      <span>{item.name}</span>
                      <ChevronDown
                        size={13}
                        className={`transition-transform duration-200 ${
                          isActive ? 'rotate-180 text-blue-600' : 'text-slate-400 group-hover:text-blue-600'
                        }`}
                      />
                    </Link>

                    {/* Active Underline Indicator */}
                    {isActive && (
                      <span className="absolute -bottom-[1px] left-0 right-0 h-[2.5px] bg-blue-600 rounded-t-sm" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right Subtle Action */}
            <Link
              to="/catalog"
              className="hidden xl:flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors shrink-0 pl-4"
            >
              <span>Explore All Catalog</span>
              <ChevronRight size={14} />
            </Link>

          </div>

          {/* SLIDE-DOWN DEPARTMENT MEGA-MENU: Shows categories and live products */}
          {activeDeptMenu && activeDepartmentCategories.length > 0 && (
            <div
              onMouseEnter={() => handleDeptMouseEnter(activeDeptMenu)}
              onMouseLeave={handleDeptMouseLeave}
              className="absolute top-full left-0 right-0 bg-white border-b border-slate-200/90 shadow-2xl z-50 animate-slide-down transition-all duration-200"
            >
              <div className="w-[96%] max-w-7xl mx-auto py-5 px-4 sm:px-6">

                {/* Top Department Header Summary */}
                <div className="flex flex-wrap items-center justify-between pb-3.5 mb-5 border-b border-slate-100 gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Layers size={17} />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] uppercase font-black text-slate-400 tracking-wider">Department:</span>
                      <span className="text-sm font-extrabold text-slate-900">{activeDeptMenu}</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                        {activeDepartmentCategories.length} {activeDepartmentCategories.length === 1 ? 'Category' : 'Categories'}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        ({totalDepartmentProducts} {totalDepartmentProducts === 1 ? 'Product' : 'Products'})
                      </span>
                    </div>
                  </div>

                  <Link
                    to={`/catalog?department=${encodeURIComponent(activeDeptMenu)}`}
                    onClick={() => setActiveDeptMenu(null)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50/70 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <span>View all {activeDeptMenu} products</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>

                {/* Categories & Products Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-start">
                  {activeDepartmentCategories.map(cat => (
                    <div
                      key={cat.id || cat.name}
                      className="bg-slate-50/70 hover:bg-slate-50 rounded-2xl p-4 border border-slate-200/80 transition-all flex flex-col justify-between space-y-3"
                    >
                      {/* Category Header */}
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                        <Link
                          to={`/catalog?category=${encodeURIComponent(cat.name)}`}
                          onClick={() => setActiveDeptMenu(null)}
                          className="text-xs font-black text-slate-900 hover:text-blue-600 transition-colors uppercase tracking-tight flex items-center gap-1.5 truncate"
                          title={cat.name}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span>
                          <span className="truncate">{cat.name}</span>
                        </Link>
                        <span className="text-[10px] font-extrabold bg-white text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs shrink-0">
                          {cat.productCount} {cat.productCount === 1 ? 'item' : 'items'}
                        </span>
                      </div>

                      {/* Products inside this Category */}
                      <div className="space-y-2">
                        {cat.products && cat.products.length > 0 ? (
                          <>
                            {cat.products.slice(0, 4).map(prod => {
                              const img = getProductImage(prod);
                              const price = prod.salesPrice || prod.price || 0;
                              return (
                                <Link
                                  key={prod._id}
                                  to={`/product/${prod._id}`}
                                  onClick={() => setActiveDeptMenu(null)}
                                  className="flex items-center gap-2.5 p-1.5 rounded-xl bg-white hover:bg-blue-50/50 border border-slate-200/70 hover:border-blue-200 transition-all group"
                                >
                                  <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                                    <img
                                      src={img}
                                      alt={prod.name}
                                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                      onError={e => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[11px] font-bold text-slate-800 group-hover:text-blue-600 truncate">
                                      {prod.name}
                                    </div>
                                    <div className="text-[10px] font-extrabold text-blue-600">
                                      {formatCurrency(price)}
                                    </div>
                                  </div>
                                </Link>
                              );
                            })}

                            {cat.products.length > 4 && (
                              <Link
                                to={`/catalog?category=${encodeURIComponent(cat.name)}`}
                                onClick={() => setActiveDeptMenu(null)}
                                className="block text-center text-[11px] font-bold text-blue-600 hover:underline pt-1"
                              >
                                +{cat.products.length - 4} more products in {cat.name}
                              </Link>
                            )}
                          </>
                        ) : (
                          <div className="py-4 text-center">
                            <Package size={22} className="mx-auto text-slate-300 mb-1" />
                            <p className="text-[11px] text-slate-400 font-medium">No items yet</p>
                            <Link
                              to={`/catalog?category=${encodeURIComponent(cat.name)}`}
                              onClick={() => setActiveDeptMenu(null)}
                              className="text-[10px] font-bold text-blue-600 hover:underline mt-1 inline-block"
                            >
                              Explore category
                            </Link>
                          </div>
                        )}
                      </div>

                      {/* Footer Link to Category */}
                      <Link
                        to={`/catalog?category=${encodeURIComponent(cat.name)}`}
                        onClick={() => setActiveDeptMenu(null)}
                        className="pt-1 flex items-center justify-between text-[11px] font-bold text-slate-600 hover:text-blue-600 group transition-colors border-t border-slate-100"
                      >
                        <span>All {cat.name}</span>
                        <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}
        </div>

      </header>

      {/* MOBILE SEARCH BAR */}
      <form onSubmit={handleSearchSubmit} className="md:hidden w-[96%] mx-auto py-2.5 bg-white border-b border-slate-200">
        <div className="relative">
          <input
            type="search"
            placeholder="Search products, brands, SKU, barcode..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
        </div>
      </form>

      {isMobileMenuOpen && (
        <nav className="lg:hidden border-b border-slate-200 bg-white px-4 py-3 shadow-sm space-y-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Departments
          </div>
          <div className="grid grid-cols-2 gap-2">
            {navBarItems.filter(i => i.type === 'department').map(dept => (
              <Link
                key={dept.id || dept.name}
                onClick={() => setIsMobileMenuOpen(false)}
                to={dept.link}
                className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                {dept.name}
              </Link>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-2 grid grid-cols-2 gap-2">
            <Link onClick={() => setIsMobileMenuOpen(false)} to="/catalog?sort=popularity" className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">Deals of the Day</Link>
            <Link onClick={() => setIsMobileMenuOpen(false)} to="/catalog?sort=newest" className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">New Arrivals</Link>
            <button onClick={() => { setIsPincodeModalOpen(true); setIsMobileMenuOpen(false); }} className="col-span-2 rounded-xl bg-blue-50 px-3 py-2 text-left text-xs font-bold text-blue-700 truncate">Deliver to {deliveryLocation || deliveryPincode || 'your location'}</button>
          </div>
        </nav>
      )}

      {/* DELIVERY LOCATION MODAL (Amazon / Modern E-Commerce Style) */}
      {isPincodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <MapPin size={20} className="text-blue-600" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Choose Your Location</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPincodeModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select your delivery location to view real-time shipping dates, local warehouse availability, and exact delivery fees.
            </p>

            {/* Saved Addresses Section (if logged in and has addresses) */}
            {isAuthenticated && Array.isArray(customer?.addresses) && customer.addresses.length > 0 ? (
              <div className="space-y-2.5">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Select a saved address
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {customer.addresses.map((addr) => {
                    const activeId = localStorage.getItem('jts_active_address_id');
                    const isSelected = activeId ? (activeId === addr._id) : addr.isDefault;
                    return (
                      <div
                        key={addr._id}
                        onClick={() => handleSelectSavedAddress(addr)}
                        className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 text-xs ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-600 shadow-xs ring-1 ring-blue-500/20'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="selectedLocationAddress"
                          checked={isSelected}
                          onChange={() => handleSelectSavedAddress(addr)}
                          className="mt-1 text-blue-600 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 dark:text-white">{addr.fullName}</span>
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                              {addr.label || 'Home'}
                            </span>
                            {addr.isDefault && (
                              <span className="text-[9px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5 leading-snug">
                            {addr.street}{addr.street2 ? `, ${addr.street2}` : ''}, {addr.city}, {addr.state} - <strong className="text-slate-900 dark:text-white">{addr.zip}</strong>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center pt-1 text-xs">
                  <Link
                    to="/account/addresses"
                    onClick={() => setIsPincodeModalOpen(false)}
                    className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    Manage address book →
                  </Link>
                </div>
              </div>
            ) : !isAuthenticated ? (
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">Have saved addresses?</div>
                  <div className="text-[11px] text-slate-500">Sign in to view your saved addresses</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsPincodeModalOpen(false);
                    setAuthModalMode('LOGIN');
                    setIsAuthModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            ) : null}

            {/* Pincode Input Divider */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-800" /></div>
              <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white dark:bg-slate-900 px-2">
                Or enter an Indian pincode
              </div>
            </div>

            <form onSubmit={savePincode} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={tempPincode}
                  onChange={e => setTempPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit Pincode"
                  className="flex-1 px-3.5 py-2.5 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap"
                >
                  Apply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Login & OTP Register Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </>
  );
};

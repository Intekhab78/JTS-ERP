import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Filter, Search, SlidersHorizontal, ShoppingBag, Eye,
  ChevronRight, X, ArrowUpDown, Check, Layers, Heart,
  Star, Grid, List, CheckSquare, Square, RotateCcw,
  Sparkles, ShieldCheck, Tag, Barcode as BarcodeIcon,
  ChevronDown
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { getProductImage } from '../utils/productImageHelper';
import { ProductCard } from '../components/common/ProductCard';
import { QuickViewModal } from '../components/common/QuickViewModal';

export const CatalogPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart, openCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { formatCurrency } = useStoreSettings();

  const [products, setProducts] = useState([]);
  const [categoriesTree, setCategoriesTree] = useState({ departments: [], categories: [], families: [] });
  const [facets, setFacets] = useState({ brands: [], departments: [], priceRange: { min: 0, max: 100000 } });
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [brandSearch, setBrandSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  // Quick View Modal State
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  const handleOpenQuickView = (product) => {
    setQuickViewProduct(product);
    setIsQuickViewOpen(true);
  };

  // Active query parameters
  const currentSearch = searchParams.get('search') || '';
  const currentDept = searchParams.get('department') || '';
  const currentCat = searchParams.get('category') || '';
  const currentFamily = searchParams.get('family') || '';
  const currentSubFamily = searchParams.get('subFamily') || '';
  const currentBrands = searchParams.get('brand') ? searchParams.get('brand').split(',').map(b => b.trim()) : [];
  const currentColor = searchParams.get('color') || '';
  const currentSize = searchParams.get('size') || '';
  const currentInStock = searchParams.get('inStock') === 'true';
  const currentSort = searchParams.get('sort') || '';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentLimit = parseInt(searchParams.get('limit') || '16', 10);

  // Price inputs state for smooth typing before applying
  const [minPriceInput, setMinPriceInput] = useState(currentMinPrice);
  const [maxPriceInput, setMaxPriceInput] = useState(currentMaxPrice);

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  useEffect(() => {
    setMinPriceInput(currentMinPrice);
    setMaxPriceInput(currentMaxPrice);
    fetchCatalog();
  }, [searchParams]);

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const fetchHierarchy = async () => {
    try {
      const { data } = await axios.get('/api/v1/ecommerce/categories');
      setCategoriesTree(data || { departments: [], categories: [], families: [] });
    } catch (e) {
      console.warn('Failed to fetch hierarchy tree:', e.message);
    }
  };

  const fetchCatalog = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams(searchParams).toString();
      const { data } = await axios.get(`/api/v1/ecommerce/products?${query}`);
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setTotalPages(data.pages || 1);
      if (data.facets) {
        setFacets(data.facets);
      }
    } catch (error) {
      console.error('Failed to fetch catalog:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFilter = (key, value) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }
    // Reset to page 1 on filter changes
    if (key !== 'page') {
      nextParams.delete('page');
    }
    setSearchParams(nextParams);
  };

  const toggleBrandFilter = (brandName) => {
    const nextParams = new URLSearchParams(searchParams);
    let brands = currentBrands.slice();
    if (brands.includes(brandName)) {
      brands = brands.filter(b => b !== brandName);
    } else {
      brands.push(brandName);
    }
    if (brands.length > 0) {
      nextParams.set('brand', brands.join(','));
    } else {
      nextParams.delete('brand');
    }
    nextParams.delete('page');
    setSearchParams(nextParams);
  };

  const handlePriceApply = (e) => {
    if (e) e.preventDefault();
    const nextParams = new URLSearchParams(searchParams);
    if (minPriceInput) nextParams.set('minPrice', minPriceInput);
    else nextParams.delete('minPrice');
    if (maxPriceInput) nextParams.set('maxPrice', maxPriceInput);
    else nextParams.delete('maxPrice');
    nextParams.delete('page');
    setSearchParams(nextParams);
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
    setMinPriceInput('');
    setMaxPriceInput('');
  };

  const handleAddToCart = (product, e) => {
    if (e) e.stopPropagation();
    addToCart(product, 1);
    openCart();
  };

  const handleWishlistToggle = (product, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    toggleWishlist(product);
  };

  // Filter facets brands with search input
  const filteredBrands = facets.brands.filter(b =>
    !brandSearch || b.name.toLowerCase().includes(brandSearch.toLowerCase())
  );

  return (
    <div className="w-[96%] mx-auto py-5 sm:py-6 space-y-5 sm:space-y-6">

      {/* 1. BREADCRUMBS & TITLE */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto py-1">
          <Link to="/" className="hover:text-blue-600 font-medium">Home</Link>
          <ChevronRight size={12} />
          <Link to="/catalog" className="hover:text-blue-600 font-medium">Catalog</Link>
          {currentCat && (
            <>
              <ChevronRight size={12} />
              <span className="font-bold text-blue-600">{currentCat}</span>
            </>
          )}
          {currentDept && (
            <>
              <ChevronRight size={12} />
              <span className="font-bold text-blue-600">{currentDept}</span>
            </>
          )}
          {currentFamily && (
            <>
              <ChevronRight size={12} />
              <span className="font-bold text-purple-600">{currentFamily}</span>
            </>
          )}
          {currentBrands.length > 0 && (
            <>
              <ChevronRight size={12} />
              <span className="font-bold text-slate-700">{currentBrands.join(', ')}</span>
            </>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {currentSearch
                ? `Search results for "${currentSearch}"`
                : currentCat
                  ? `${currentCat} Collection`
                  : currentDept
                    ? `${currentDept} Store`
                    : currentBrands.length === 1
                      ? `${currentBrands[0]} Collection`
                      : 'All Products'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Showing <strong>{products.length}</strong> of <strong>{total}</strong> verified items from live inventory
            </p>
          </div>

          {/* Controls: Grid/List switch & Sort dropdown */}
          <div className="flex items-center gap-3">
            {/* View Mode Switch */}
            <div className="hidden sm:flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}
                title="Grid View"
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}
                title="List View"
              >
                <List size={16} />
              </button>
            </div>

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="md:hidden flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <Filter size={14} className="text-blue-600" />
              <span>Filters ({[currentDept, currentCat, currentFamily, currentBrands.length, currentMinPrice, currentInStock ? 1 : null].filter(Boolean).length})</span>
            </button>

            {/* Amazon / Flipkart Standard Sort Selector */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-bold hidden sm:inline">Sort by:</span>
              <div className="relative">
                <select
                  value={currentSort}
                  onChange={e => updateFilter('sort', e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-8 py-2 font-bold text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer shadow-xs"
                >
                  <option value="">Featured / Relevance</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="newest">Newest Arrivals</option>
                  <option value="popularity">Popularity / Top Rated</option>
                  <option value="name_asc">Alphabetical: A to Z</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-3 pointer-events-none text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Category & Family Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
          {(() => {
            const displayCategories = (categoriesTree.categories && categoriesTree.categories.length > 0)
              ? categoriesTree.categories
              : (categoriesTree.sections || []);

            // If a category is selected, show child families if available
            if (currentCat) {
              const activeCatObj = displayCategories.find(c => c.name.toLowerCase() === currentCat.toLowerCase());
              const childFamilies = (categoriesTree.families || []).filter(
                f => (activeCatObj && f.categoryId && f.categoryId.toString() === activeCatObj._id?.toString()) ||
                  (f.category && f.category.toLowerCase() === currentCat.toLowerCase())
              );
              if (childFamilies.length > 0) {
                return (
                  <>
                    <button
                      onClick={() => updateFilter('family', '')}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${!currentFamily ? 'bg-[#2563EB] text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                      All in {currentCat}
                    </button>
                    {childFamilies.map((fam, idx) => {
                      const isSelected = currentFamily.toLowerCase() === fam.name.toLowerCase();
                      return (
                        <button
                          key={idx}
                          onClick={() => updateFilter('family', isSelected ? '' : fam.name)}
                          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${isSelected ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                          {fam.name}
                        </button>
                      );
                    })}
                  </>
                );
              }
            }

            // Default pills: All + dynamic store categories
            return (
              <>
                <button
                  onClick={() => {
                    updateFilter('category', '');
                    updateFilter('department', '');
                    updateFilter('family', '');
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${!currentCat && !currentDept && !currentFamily
                      ? 'bg-[#2563EB] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                >
                  All Products
                </button>
                {displayCategories.map((cat, idx) => {
                  const isSelected = currentCat.toLowerCase() === cat.name.toLowerCase();
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        updateFilter('family', '');
                        updateFilter('category', isSelected ? '' : cat.name);
                      }}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${isSelected
                          ? 'bg-[#2563EB] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </>
            );
          })()}
        </div>
      </div>

      {/* 2. ACTIVE FILTER PILLS / CHIPS */}
      {(currentDept || currentCat || currentFamily || currentBrands.length > 0 || currentSearch || currentMinPrice || currentMaxPrice || currentInStock) && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mr-1">
            Active Filters:
          </span>

          {currentSearch && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded-full text-xs font-bold">
              <span>"{currentSearch}"</span>
              <button onClick={() => updateFilter('search', '')}><X size={12} /></button>
            </span>
          )}

          {currentInStock && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full text-xs font-bold">
              <span>In-Stock Only</span>
              <button onClick={() => updateFilter('inStock', '')}><X size={12} /></button>
            </span>
          )}

          {currentDept && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded-full text-xs font-bold">
              <span>Dept: {currentDept}</span>
              <button onClick={() => updateFilter('department', '')}><X size={12} /></button>
            </span>
          )}

          {currentFamily && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 rounded-full text-xs font-bold">
              <span>Collection: {currentFamily}</span>
              <button onClick={() => updateFilter('family', '')}><X size={12} /></button>
            </span>
          )}

          {currentBrands.map(b => (
            <span key={b} className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-full text-xs font-bold">
              <span>Brand: {b}</span>
              <button onClick={() => toggleBrandFilter(b)}><X size={12} /></button>
            </span>
          ))}

          {(currentMinPrice || currentMaxPrice) && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 rounded-full text-xs font-bold">
              <span>Price: {currentMinPrice ? formatCurrency(currentMinPrice) : '₹0'} - {currentMaxPrice ? formatCurrency(currentMaxPrice) : 'Max'}</span>
              <button onClick={() => { updateFilter('minPrice', ''); updateFilter('maxPrice', ''); }}><X size={12} /></button>
            </span>
          )}

          <button
            onClick={clearAllFilters}
            className="text-xs font-extrabold text-rose-600 hover:text-rose-700 hover:underline ml-auto cursor-pointer"
          >
            Clear All
          </button>
        </div>
      )}

      {/* 3. MAIN GRID: LEFT FILTER SIDEBAR + RIGHT PRODUCTS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

        {/* DESKTOP FILTER SIDEBAR */}
        <aside className="hidden md:block space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <SlidersHorizontal size={15} className="text-blue-600" /> Filters
            </span>
            <button
              onClick={clearAllFilters}
              className="text-[11px] font-bold text-slate-400 hover:text-rose-500 transition-colors"
            >
              Reset
            </button>
          </div>

          {/* Quick Filter: In-Stock Only Toggle */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                  In-Stock Only
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Exclude backordered or out-of-stock items
                </span>
              </div>
              <input
                type="checkbox"
                checked={currentInStock}
                onChange={e => updateFilter('inStock', e.target.checked ? 'true' : '')}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </label>
          </div>

          {/* Departments & Hierarchy Tree */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Department
            </h4>
            <div className="space-y-1">
              <button
                onClick={() => updateFilter('department', '')}
                className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${!currentDept
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
              >
                <span>All Departments</span>
                <span className="text-[10px] opacity-75">{total}</span>
              </button>

              {facets.departments.map(dept => (
                <button
                  key={dept.name}
                  onClick={() => updateFilter('department', dept.name)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${currentDept === dept.name
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                  <span className="truncate">{dept.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${currentDept === dept.name ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    {dept.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Categories Filter */}
          {((categoriesTree.categories && categoriesTree.categories.length > 0) || (categoriesTree.sections && categoriesTree.sections.length > 0)) && (
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Category
                </h4>
                {currentCat && (
                  <button
                    onClick={() => updateFilter('category', '')}
                    className="text-[10px] text-blue-600 font-bold hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                <button
                  onClick={() => updateFilter('category', '')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${!currentCat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                  <span>All Categories</span>
                </button>
                {((categoriesTree.categories && categoriesTree.categories.length > 0)
                  ? categoriesTree.categories
                  : categoriesTree.sections
                ).map(cat => {
                  const isSelected = currentCat.toLowerCase() === cat.name.toLowerCase();
                  return (
                    <button
                      key={cat._id || cat.name}
                      onClick={() => updateFilter('category', isSelected ? '' : cat.name)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      <span className="truncate">{cat.name}</span>
                      {cat.productCount > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                          {cat.productCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Brand Filter with Checkboxes & Search */}
          {facets.brands && facets.brands.length > 0 && (
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Brand ({facets.brands.length})
                </h4>
                {currentBrands.length > 0 && (
                  <button
                    onClick={() => updateFilter('brand', '')}
                    className="text-[10px] text-blue-600 font-bold hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Brand Search Input if more than 4 brands */}
              {facets.brands.length > 4 && (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search brands..."
                    value={brandSearch}
                    onChange={e => setBrandSearch(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <Search size={12} className="absolute left-2 top-2 text-slate-400" />
                </div>
              )}

              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {filteredBrands.map(b => {
                  const isChecked = currentBrands.includes(b.name);
                  return (
                    <label
                      key={b.name}
                      onClick={() => toggleBrandFilter(b.name)}
                      className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isChecked ? (
                          <CheckSquare size={15} className="text-blue-600" />
                        ) : (
                          <Square size={15} className="text-slate-400" />
                        )}
                        <span className={`font-semibold ${isChecked ? 'text-blue-600 font-extrabold' : 'text-slate-700 dark:text-slate-300'}`}>
                          {b.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">({b.count})</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Price Range Filter with Inputs & Quick Brackets */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Price Range
            </h4>

            {/* Quick Price Buttons */}
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {[
                { label: 'Under ₹500', min: '', max: '500' },
                { label: '₹500 - ₹2,500', min: '500', max: '2500' },
                { label: '₹2,500 - ₹10,000', min: '2500', max: '10000' },
                { label: 'Over ₹10,000', min: '10000', max: '' }
              ].map((bracket, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setMinPriceInput(bracket.min);
                    setMaxPriceInput(bracket.max);
                    const nextParams = new URLSearchParams(searchParams);
                    if (bracket.min) nextParams.set('minPrice', bracket.min);
                    else nextParams.delete('minPrice');
                    if (bracket.max) nextParams.set('maxPrice', bracket.max);
                    else nextParams.delete('maxPrice');
                    nextParams.delete('page');
                    setSearchParams(nextParams);
                  }}
                  className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 text-slate-600 dark:text-slate-300 text-center font-bold transition-colors"
                >
                  {bracket.label}
                </button>
              ))}
            </div>

            {/* Min and Max Inputs */}
            <form onSubmit={handlePriceApply} className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPriceInput}
                  onChange={e => setMinPriceInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                />
                <span className="text-slate-400 font-bold">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPriceInput}
                  onChange={e => setMaxPriceInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                />
              </div>
              <button
                type="submit"
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Apply Price
              </button>
            </form>
          </div>

          {/* Customer Rating Filter */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Customer Rating
            </h4>
            <div className="space-y-1.5">
              {[
                { stars: 4, label: '4★ & above' },
                { stars: 3, label: '3★ & above' }
              ].map((r, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 hover:text-blue-600 cursor-pointer">
                  <div className="flex items-center text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={13}
                        className={i < r.stars ? 'fill-amber-400' : 'text-slate-300 dark:text-slate-600'}
                      />
                    ))}
                  </div>
                  <span className="font-semibold">{r.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Size Filter (Panel 2 Reference) */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Size
            </h4>
            <div className="flex flex-wrap gap-2">
              {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((sz) => {
                const isSelected = currentSize === sz;
                return (
                  <button
                    key={sz}
                    onClick={() => updateFilter('size', isSelected ? '' : sz)}
                    className={`w-9 h-9 rounded-xl text-xs font-bold border transition-all flex items-center justify-center cursor-pointer ${isSelected
                        ? 'bg-[#2563EB] text-white border-blue-600 shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:border-slate-400 bg-white'
                      }`}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Circles Filter (Panel 2 Reference) */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Color
            </h4>
            <div className="flex flex-wrap gap-2.5">
              {[
                { name: 'Black', hex: '#000000' },
                { name: 'White', hex: '#ffffff', border: true },
                { name: 'Navy', hex: '#1e3a8a' },
                { name: 'Blue', hex: '#3b82f6' },
                { name: 'Red', hex: '#ef4444' },
                { name: 'Green', hex: '#10b981' },
                { name: 'Grey', hex: '#6b7280' }
              ].map((clr) => {
                const isSelected = currentColor.toLowerCase() === clr.name.toLowerCase();
                return (
                  <button
                    key={clr.name}
                    onClick={() => updateFilter('color', isSelected ? '' : clr.name)}
                    style={{ backgroundColor: clr.hex }}
                    title={clr.name}
                    className={`w-6 h-6 rounded-full cursor-pointer transition-all ${clr.border ? 'border border-slate-300' : ''
                      } ${isSelected ? 'ring-2 ring-blue-600 ring-offset-2 scale-110' : 'hover:scale-105'
                      }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Discount Percentage Filter (Panel 2 Reference) */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Discount
            </h4>
            <div className="space-y-1.5">
              {['10% or more', '20% or more', '30% or more', '50% or more'].map((d, idx) => (
                <label key={idx} className="flex items-center gap-2 text-xs text-slate-700 hover:text-blue-600 cursor-pointer">
                  <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                  <span>{d}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sub-Category / Item Family Filter */}
          {categoriesTree.families.length > 0 && (
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Item Family (Subcategory)
              </h4>
              <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                <button
                  onClick={() => updateFilter('family', '')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${!currentFamily ? 'bg-purple-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                  All Families
                </button>
                {categoriesTree.families.map(fam => (
                  <button
                    key={fam._id}
                    onClick={() => updateFilter('family', fam.name)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${currentFamily === fam.name
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                  >
                    {fam.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* RIGHT PRODUCTS LISTING */}
        <div className="md:col-span-3 space-y-6">

          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <div key={n} className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="p-8 sm:p-10 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mx-auto">
                <ShoppingBag size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-slate-900 dark:text-white text-lg">
                  {categoriesTree.departments.length === 0 && (categoriesTree.categories || []).length === 0
                    ? 'No Categories Enabled in ERP Settings'
                    : total === 0 && !currentSearch && !currentDept && !currentCat && !currentFamily && currentBrands.length === 0
                      ? 'We’re stocking the shelves'
                      : 'No products match your criteria'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {categoriesTree.departments.length === 0 && (categoriesTree.categories || []).length === 0
                    ? 'All categories are currently unselected in ERP E-Commerce Settings > Catalog Hierarchy Mapping. Enable categories to make products visible.'
                    : total === 0 && !currentSearch && !currentDept && !currentCat && !currentFamily && currentBrands.length === 0
                      ? 'Products published from your ERP inventory will appear here automatically.'
                      : 'Try clearing some filters or searching for generic terms like “Laptop”, “Mouse” or “Dell”.'}
                </p>
              </div>
              {total === 0 && !currentSearch && !currentDept && !currentCat && !currentFamily && currentBrands.length === 0 ? (
                <Link to="/" className="inline-flex px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 hover:bg-blue-500 transition-all">Back to Home</Link>
              ) : (
                <button onClick={clearAllFilters} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 hover:bg-blue-500 transition-all cursor-pointer">Reset All Filters</button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* 1. 4-COLUMN GRID VIEW (Panel 2 Reference) */
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {products.map(product => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onQuickView={handleOpenQuickView}
                />
              ))}
            </div>

          ) : (
            /* 2. AMAZON LIST VIEW */
            <div className="space-y-4">
              {products.map(product => {
                const img = getProductImage(product);
                const isAvailable = product.inStock !== false;
                const wishlisted = isWishlisted(product._id);
                const hasDiscount = product.price > product.salesPrice;

                return (
                  <div
                    key={product._id}
                    className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs hover:shadow-lg transition-all flex flex-col sm:flex-row gap-5 items-center relative"
                  >
                    <button
                      onClick={(e) => handleWishlistToggle(product, e)}
                      className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500"
                    >
                      <Heart size={16} className={wishlisted ? 'fill-rose-500 text-rose-500' : ''} />
                    </button>

                    <Link
                      to={`/product/${product._id}`}
                      className="w-40 h-40 bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-3"
                    >
                      <img src={img} alt={product.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                    </Link>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                          {product.brand || product.category}
                        </span>
                        {product.sku && <span className="text-[10px] font-mono text-slate-400">SKU: {product.sku}</span>}
                        {product.barcode && <span className="text-[10px] font-mono text-slate-400">Barcode: {product.barcode}</span>}
                      </div>

                      <Link to={`/product/${product._id}`} className="font-extrabold text-base text-slate-900 dark:text-white hover:text-blue-600 transition-colors block">
                        {product.name}
                      </Link>

                      <p className="text-xs text-slate-500 line-clamp-2">
                        {product.description || 'Enterprise inventory verified item with nationwide express fulfillment.'}
                      </p>

                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        {product.rating && product.rating > 0 ? (
                          <>
                            <div className="flex items-center text-amber-400">
                              <Star size={12} className="fill-amber-400" />
                              <span className="text-xs font-black text-slate-800 dark:text-slate-200 ml-1">{Number(product.rating).toFixed(1)}</span>
                            </div>
                            {product.reviewCount ? (
                              <span className="text-slate-400">({product.reviewCount} reviews)</span>
                            ) : null}
                            <span className="text-slate-300">|</span>
                          </>
                        ) : null}
                        <span className={isAvailable ? 'text-emerald-600 font-extrabold' : 'text-rose-600 font-bold'}>
                          {isAvailable ? '✔ In Stock (Live Sync)' : '✖ Out of Stock'}
                        </span>
                      </div>
                    </div>

                    <div className="sm:border-l sm:border-slate-100 sm:pl-5 sm:min-w-[170px] space-y-2 text-right sm:text-left">
                      {hasDiscount && (
                        <div className="text-xs text-slate-400 line-through">
                          {formatCurrency(product.price)}
                        </div>
                      )}
                      <div className="text-xl font-black text-blue-600 dark:text-blue-400">
                        {formatCurrency(product.salesPrice || product.price)}
                      </div>
                      <button
                        onClick={(e) => handleAddToCart(product, e)}
                        disabled={!isAvailable}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <ShoppingBag size={14} />
                        <span>Add to Cart</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 4. PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 font-medium">
                Page {currentPage} of {totalPages}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => updateFilter('page', String(currentPage - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Previous
                </button>

                {[...Array(totalPages)].map((_, i) => {
                  const pNum = i + 1;
                  return (
                    <button
                      key={pNum}
                      onClick={() => updateFilter('page', String(pNum))}
                      className={`w-8 h-8 rounded-lg text-xs font-black transition-all cursor-pointer ${currentPage === pNum
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                    >
                      {pNum}
                    </button>
                  );
                })}

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => updateFilter('page', String(currentPage + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* MOBILE FILTER MODAL DRAWER */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden md:hidden animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setIsMobileFilterOpen(false)} />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xs bg-white dark:bg-slate-900 shadow-2xl p-6 flex flex-col space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="font-black text-sm">Filter Catalog</span>
                <button onClick={() => setIsMobileFilterOpen(false)}><X size={18} /></button>
              </div>

              {/* In-Stock Mobile */}
              <label className="flex items-center justify-between text-xs font-bold">
                <span>In-Stock Only</span>
                <input
                  type="checkbox"
                  checked={currentInStock}
                  onChange={e => updateFilter('inStock', e.target.checked ? 'true' : '')}
                />
              </label>

              {/* Department Mobile */}
              <div className="space-y-1">
                <span className="text-xs font-black uppercase text-slate-400">Department</span>
                <select
                  value={currentDept}
                  onChange={e => updateFilter('department', e.target.value)}
                  className="w-full text-xs font-bold p-2 border rounded-xl"
                >
                  <option value="">All Departments</option>
                  {facets.departments.map(d => (
                    <option key={d.name} value={d.name}>{d.name} ({d.count})</option>
                  ))}
                </select>
              </div>

              {/* Brands Mobile */}
              <div className="space-y-1">
                <span className="text-xs font-black uppercase text-slate-400">Brands</span>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {facets.brands.map(b => (
                    <label key={b.name} className="flex items-center justify-between text-xs py-1">
                      <span>{b.name}</span>
                      <input
                        type="checkbox"
                        checked={currentBrands.includes(b.name)}
                        onChange={() => toggleBrandFilter(b.name)}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t flex gap-2">
                <button
                  onClick={() => { clearAllFilters(); setIsMobileFilterOpen(false); }}
                  className="flex-1 py-2 text-xs font-bold bg-slate-100 rounded-xl"
                >
                  Reset
                </button>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="flex-1 py-2 text-xs font-black bg-blue-600 text-white rounded-xl"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK VIEW FLOATING MODAL */}
      <QuickViewModal
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        onClose={() => {
          setIsQuickViewOpen(false);
          setQuickViewProduct(null);
        }}
      />

    </div>
  );
};

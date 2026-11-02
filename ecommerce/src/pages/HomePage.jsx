import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  ShoppingBag, ArrowRight, ShieldCheck, Truck, RotateCcw,
  Sparkles, Star, ChevronRight, CheckCircle2, PackageCheck, Eye,
  Heart, Flame, Clock, Tag, ChevronLeft, Laptop, Smartphone,
  Monitor, Keyboard, Mouse, Server, Award, Zap, LayoutGrid, Check,
  Headphones, HardDrive, Gamepad2, Layers, ArrowUpRight, Lock,
  HelpCircle, UserCheck, Shirt, Home, Sparkle, Trophy, BookOpen,
  Apple, Car, MoreHorizontal, Cpu, Tv, Pause, Play, ChevronDown
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { getProductImage, formatImageUrl, NEUTRAL_PRODUCT_FALLBACK } from '../utils/productImageHelper';
import { ProductCard } from '../components/common/ProductCard';
import { QuickViewModal } from '../components/common/QuickViewModal';

// Category icon resolver based on lowercase name keyword matching
const getCategoryIcon = (name = '') => {
  const n = (name || '').toLowerCase();
  if (n.includes('computer') || n.includes('laptop') || n.includes('pc') || n.includes('macbook')) return Laptop;
  if (n.includes('mobile') || n.includes('phone') || n.includes('tablet')) return Smartphone;
  if (n.includes('mouse')) return Mouse;
  if (n.includes('keyboard')) return Keyboard;
  if (n.includes('accessor') || n.includes('peripheral') || n.includes('input')) return Keyboard;
  if (n.includes('monitor') || n.includes('screen') || n.includes('display')) return Monitor;
  if (n.includes('headphone') || n.includes('audio') || n.includes('sound') || n.includes('speaker')) return Headphones;
  if (n.includes('server') || n.includes('network') || n.includes('storage') || n.includes('drive')) return Server;
  if (n.includes('electronic') || n.includes('gadget') || n.includes('tech')) return Cpu;
  if (n.includes('fashion') || n.includes('cloth') || n.includes('apparel') || n.includes('wear') || n.includes('shirt')) return Shirt;
  if (n.includes('home') || n.includes('furniture') || n.includes('kitchen') || n.includes('decor')) return Home;
  if (n.includes('appliance')) return Sparkle;
  if (n.includes('beauty') || n.includes('personal') || n.includes('cosmetic')) return Sparkles;
  if (n.includes('toy') || n.includes('baby') || n.includes('game') || n.includes('gaming')) return Gamepad2;
  if (n.includes('sport') || n.includes('fit') || n.includes('gym')) return Trophy;
  if (n.includes('book') || n.includes('stationery') || n.includes('office')) return BookOpen;
  if (n.includes('grocer') || n.includes('food') || n.includes('snack') || n.includes('fresh')) return Apple;
  if (n.includes('auto') || n.includes('car') || n.includes('bike') || n.includes('vehicle')) return Car;
  return Layers;
};

// Curated pastel/vibrant styling palettes for circular categories
const CATEGORY_STYLES = [
  { bg: 'bg-blue-50 hover:bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
  { bg: 'bg-indigo-50 hover:bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' },
  { bg: 'bg-purple-50 hover:bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
  { bg: 'bg-emerald-50 hover:bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200' },
  { bg: 'bg-cyan-50 hover:bg-cyan-100', text: 'text-cyan-600', border: 'border-cyan-200' },
  { bg: 'bg-amber-50 hover:bg-amber-100', text: 'text-amber-600', border: 'border-amber-200' },
  { bg: 'bg-rose-50 hover:bg-rose-100', text: 'text-rose-600', border: 'border-rose-200' },
  { bg: 'bg-teal-50 hover:bg-teal-100', text: 'text-teal-600', border: 'border-teal-200' },
];

// Rich aesthetic color themes for the Hero Carousel Banner
const getSlideTheme = (slide, index) => {
  const grad = (slide?.gradient || '').toLowerCase();
  if (grad.includes('purple')) {
    return {
      bg: 'bg-gradient-to-br from-[#0c0919] via-[#1a0f30] to-[#3b0764]',
      border: 'border-purple-500/30',
      glow1: 'bg-purple-600/30',
      glow2: 'bg-fuchsia-600/20',
      accentText: 'from-purple-100 via-fuchsia-200 to-pink-300',
      badgeBorder: 'border-purple-400/30',
      badgeBg: 'bg-purple-500/20 text-purple-200',
      pingColor: 'bg-fuchsia-400',
      btnGradient: 'from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-purple-500/30',
      imgHalo: 'bg-purple-500/30',
      fullOverlay: 'from-[#0c0919] via-[#0c0919]/90 via-45% to-transparent',
      vignetteBottom: 'from-[#0c0919]/90 via-[#0c0919]/40 to-transparent',
      vignetteTop: 'from-[#0c0919]/60 to-transparent'
    };
  }
  if (grad.includes('indigo')) {
    return {
      bg: 'bg-gradient-to-br from-[#070b1a] via-[#101736] to-[#1e1b4b]',
      border: 'border-indigo-500/30',
      glow1: 'bg-indigo-600/30',
      glow2: 'bg-blue-600/20',
      accentText: 'from-indigo-100 via-sky-200 to-blue-300',
      badgeBorder: 'border-indigo-400/30',
      badgeBg: 'bg-indigo-500/20 text-indigo-200',
      pingColor: 'bg-cyan-400',
      btnGradient: 'from-indigo-600 via-blue-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 shadow-indigo-500/30',
      imgHalo: 'bg-indigo-500/30',
      fullOverlay: 'from-[#070b1a] via-[#070b1a]/90 via-45% to-transparent',
      vignetteBottom: 'from-[#070b1a]/90 via-[#070b1a]/40 to-transparent',
      vignetteTop: 'from-[#070b1a]/60 to-transparent'
    };
  }
  // Default Midnight Sapphire & Cyan theme
  return {
    bg: 'bg-gradient-to-br from-[#050b18] via-[#0d1c38] to-[#172554]',
    border: 'border-blue-500/30',
    glow1: 'bg-blue-600/30',
    glow2: 'bg-cyan-600/20',
    accentText: 'from-white via-blue-100 to-cyan-300',
    badgeBorder: 'border-blue-400/30',
    badgeBg: 'bg-blue-500/20 text-blue-200',
    pingColor: 'bg-cyan-400',
    btnGradient: 'from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-500/30',
    imgHalo: 'bg-blue-500/30',
    fullOverlay: 'from-[#050b18] via-[#050b18]/90 via-45% to-transparent',
    vignetteBottom: 'from-[#050b18]/90 via-[#050b18]/40 to-transparent',
    vignetteTop: 'from-[#050b18]/60 to-transparent'
  };
};

// Gradient themes for dynamic Promotional Banners and Multi-Banner cards
const getBannerGradientTheme = (grad = 'dark') => {
  const g = (grad || '').toLowerCase();
  if (g.includes('sapphire') || g.includes('blue')) {
    return {
      bg: 'bg-gradient-to-br from-[#060e22] via-[#0d1d42] to-[#172554]',
      border: 'border-blue-500/30',
      glow: 'bg-blue-600',
      tagBg: 'bg-blue-500/20 text-blue-200 border-blue-400/30',
      btn: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25'
    };
  }
  if (g.includes('purple') || g.includes('violet')) {
    return {
      bg: 'bg-gradient-to-br from-[#0d071e] via-[#1a0f35] to-[#3b0764]',
      border: 'border-purple-500/30',
      glow: 'bg-purple-600',
      tagBg: 'bg-purple-500/20 text-purple-200 border-purple-400/30',
      btn: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-purple-500/25'
    };
  }
  if (g.includes('emerald') || g.includes('green')) {
    return {
      bg: 'bg-gradient-to-br from-[#041410] via-[#062c20] to-[#064e3b]',
      border: 'border-emerald-500/30',
      glow: 'bg-emerald-600',
      tagBg: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
      btn: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/25'
    };
  }
  if (g.includes('amber') || g.includes('gold') || g.includes('orange')) {
    return {
      bg: 'bg-gradient-to-br from-[#1a0c02] via-[#331704] to-[#78350f]',
      border: 'border-amber-500/30',
      glow: 'bg-amber-600',
      tagBg: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
      btn: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-500/25'
    };
  }
  if (g.includes('rose') || g.includes('red') || g.includes('crimson')) {
    return {
      bg: 'bg-gradient-to-br from-[#1b050d] via-[#370a1b] to-[#881337]',
      border: 'border-rose-500/30',
      glow: 'bg-rose-600',
      tagBg: 'bg-rose-500/20 text-rose-200 border-rose-400/30',
      btn: 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-rose-500/25'
    };
  }
  // Default Deep Obsidian (Pure Dark Tech)
  return {
    bg: 'bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#1e293b]',
    border: 'border-slate-700/60',
    glow: 'bg-cyan-600',
    tagBg: 'bg-slate-800 text-slate-200 border-slate-700',
    btn: 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/25'
  };
};

export const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [dynamicBanners, setDynamicBanners] = useState([]);
  const [homeBlocks, setHomeBlocks] = useState([]);
  const [categoriesTree, setCategoriesTree] = useState({ departments: [], categories: [], families: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');

  // Hero Carousel Interactive State
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState(null);

  // Quick View Modal State
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { formatCurrency, returnWindowDays, freeShippingThreshold, storeName } = useStoreSettings();

  const dealsScrollRef = useRef(null);

  const scrollDeals = (dir) => {
    if (dealsScrollRef.current) {
      dealsScrollRef.current.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
    }
  };

  // Flash Sale Countdown Timer
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 38, seconds: 22 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 6, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    setIsLoading(true);
    try {
      const [prodsRes, catsRes, bannersRes, blocksRes] = await Promise.all([
        axios.get('/api/v1/ecommerce/products?limit=32'),
        axios.get('/api/v1/ecommerce/categories'),
        axios.get('/api/v1/ecommerce/banners'),
        axios.get('/api/v1/ecommerce/home-blocks')
      ]);

      setProducts(prodsRes.data?.products || []);
      setCategoriesTree(catsRes.data || { departments: [], categories: [], families: [] });
      if (bannersRes.data && bannersRes.data.length > 0) {
        setDynamicBanners(bannersRes.data);
      }
      if (blocksRes.data && Array.isArray(blocksRes.data)) {
        setHomeBlocks(blocksRes.data);
      }
    } catch (e) {
      console.warn('Failed to fetch home page data:', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenQuickView = (product) => {
    setQuickViewProduct(product);
    setIsQuickViewOpen(true);
  };

  // 1. DYNAMIC CATEGORIES: derived from database categoriesTree and active products (EXCLUSIVELY CATEGORIES, NO DEPARTMENTS)
  const dynamicCategories = useMemo(() => {
    // Collect all department names so departments are never mixed into category lists
    const deptNameSet = new Set(
      (categoriesTree.departments || []).map(d => (d.name || '').trim().toLowerCase())
    );

    const catsFromTree = (categoriesTree.categories && categoriesTree.categories.length > 0)
      ? categoriesTree.categories
      : (categoriesTree.sections && categoriesTree.sections.length > 0)
        ? categoriesTree.sections
        : [];

    const categoryMap = new Map();

    // Map each actual category with child families/subfamilies
    catsFromTree.forEach(cat => {
      const catName = (cat.name || '').trim();
      const catLower = catName.toLowerCase();
      // Skip if this name belongs to a department
      if (!catName || deptNameSet.has(catLower)) return;

      const catFamilies = (categoriesTree.families || []).filter(
        f => (f.categoryId && cat._id && f.categoryId.toString() === cat._id.toString()) ||
          (f.category && f.category.toLowerCase() === catLower)
      );

      const prodCount = products.filter(
        p => (p.category && p.category.toLowerCase() === catLower) ||
          (p.categoryId && cat._id && p.categoryId.toString() === cat._id.toString())
      ).length || cat.productCount || 0;

      categoryMap.set(catLower, {
        id: cat._id,
        name: catName,
        type: 'category',
        queryParam: 'category',
        productCount: prodCount,
        families: catFamilies
      });
    });

    // Also incorporate actual categories from products (strictly categories, never departments)
    products.forEach(p => {
      const pCat = (p.category || '').trim();
      const pCatLower = pCat.toLowerCase();
      if (pCat && !deptNameSet.has(pCatLower) && !categoryMap.has(pCatLower)) {
        const count = products.filter(item => item.category && item.category.toLowerCase() === pCatLower).length;
        categoryMap.set(pCatLower, {
          id: p.categoryId || pCat,
          name: pCat,
          type: 'category',
          queryParam: 'category',
          productCount: count,
          families: []
        });
      }
    });

    let list = Array.from(categoryMap.values());
    list.sort((a, b) => (b.productCount - a.productCount) || a.name.localeCompare(b.name));

    return list;
  }, [categoriesTree, products]);

  // 2. DYNAMIC HERO CAROUSEL BANNERS: cycle through all active storefront banners
  const heroSlides = useMemo(() => {
    const activeFromDb = dynamicBanners
      .filter(banner => banner.placement === 'HERO_CAROUSEL' && banner.isActive !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (activeFromDb.length > 0) {
      return activeFromDb;
    }

    // Dynamic, high-conversion tech fallback slides
    return [
      {
        _id: 'default_1',
        title: 'Next-Gen Laptops and Pro Workstations',
        subtitle: 'Apple MacBook Pro M3, HP Core i5 and enterprise desktops with instant live stock availability.',
        badge: 'FESTIVE TECH SPECTACULAR - UP TO 45% OFF',
        hoverText: 'Limited Time Deal: Get additional warranty and free express shipping on enterprise workstations.',
        buttonText: 'Shop Tech Deals',
        linkUrl: '/catalog?category=Computers',
        gradient: 'from-slate-950 via-blue-950 to-slate-900',
        imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1400&q=85'
      },
      {
        _id: 'default_2',
        title: 'Flagship 5G Smartphones and Devices',
        subtitle: 'Experience ultra performance with Samsung Galaxy S24, Realme 11 Pro and verified manufacturer warranty.',
        badge: 'LIGHTNING FLASH DEALS - LIMITED TIME',
        hoverText: 'Shop flagship smartphones with guaranteed genuine warranty and easy exchange program.',
        buttonText: 'Explore Mobile Deals',
        linkUrl: '/catalog?search=phone',
        gradient: 'from-slate-950 via-purple-950 to-slate-900',
        imageUrl: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=1400&q=85'
      },
      {
        _id: 'default_3',
        title: 'Ultra-HD Monitors, Mice and Keyboards',
        subtitle: 'Complete workstation bundles with 24 inch Dell displays and high-precision wireless peripherals.',
        badge: 'DESK AND PRODUCTIVITY COMBO - SAVE UP TO 2000',
        hoverText: 'Ergonomic displays and ultra-precise input devices tailored for high-speed workflows.',
        buttonText: 'Shop Peripherals',
        linkUrl: '/catalog?category=Computer%20Accessories',
        gradient: 'from-slate-950 via-indigo-950 to-slate-900',
        imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1400&q=85'
      }
    ];
  }, [dynamicBanners, products]);

  // Autoplay hero carousel (rotates every 5.5s, pauses on hover)
  useEffect(() => {
    if (heroSlides.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % heroSlides.length);
    }, 5500);

    return () => clearInterval(interval);
  }, [heroSlides.length, isPaused]);

  const nextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide(prev => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const activeSlide = heroSlides[currentSlide % heroSlides.length] || heroSlides[0];
  const activeSlideTheme = getSlideTheme(activeSlide, currentSlide);

  // Dynamic Deals of the Day (Strictly tagged deals from ERP)
  const dealsOfTheDay = useMemo(() => {
    return products.filter(p => Boolean(p.isDealOfTheDay));
  }, [products]);

  // Best Sellers (Strictly tagged best sellers from ERP)
  const bestSellers = useMemo(() => {
    return products.filter(p => Boolean(p.isBestSeller));
  }, [products]);

  // New Arrivals (Strictly tagged new arrivals from ERP)
  const newArrivals = useMemo(() => {
    return products.filter(p => Boolean(p.isNewArrival));
  }, [products]);

  // Trending products (Tagged trending, or fallback to catalog products)
  const trendingProducts = useMemo(() => {
    const tagged = products.filter(p => Boolean(p.isTrending));
    return tagged.length > 0 ? tagged : products.slice(0, 8);
  }, [products]);

  // Dynamic Tabs derived from active categories
  const dynamicTabs = useMemo(() => {
    const base = [
      { id: 'ALL', label: 'All Products' },
      { id: 'TRENDING', label: 'Trending' },
      { id: 'BEST_SELLERS', label: 'Best Sellers' },
      { id: 'NEW_ARRIVALS', label: 'New Arrivals' }
    ];

    dynamicCategories.slice(0, 5).forEach(cat => {
      base.push({ id: `CAT_${cat.name}`, label: cat.name, catName: cat.name, queryParam: cat.queryParam });
    });

    return base;
  }, [dynamicCategories]);

  const getTabProducts = () => {
    if (activeTab === 'ALL') return products;
    if (activeTab === 'BEST_SELLERS') return bestSellers;
    if (activeTab === 'NEW_ARRIVALS') return newArrivals;
    if (activeTab === 'TRENDING') return trendingProducts;
    if (activeTab.startsWith('CAT_')) {
      const tabObj = dynamicTabs.find(t => t.id === activeTab);
      const target = (tabObj?.catName || '').toLowerCase();
      return products.filter(p =>
        (p.category || '').toLowerCase().includes(target) ||
        (p.department || '').toLowerCase().includes(target)
      ).slice(0, 8);
    }
    return products.slice(0, 8);
  };

  // Dynamic Promotional Category Banners (3 columns)
  const featuredPromos = useMemo(() => {
    const nonHeroBanners = dynamicBanners.filter(b => b.placement !== 'HERO_CAROUSEL' && b.isActive !== false);
    if (nonHeroBanners.length >= 3) {
      return nonHeroBanners.slice(0, 3).map((b, idx) => ({
        tag: b.badge || 'Featured Offer',
        title: b.title,
        subtitle: b.subtitle || 'Explore collection',
        linkUrl: b.linkUrl || '/catalog',
        imageUrl: b.imageUrl,
        icon: getCategoryIcon(b.title),
        palette: idx === 0 ? 'blue' : idx === 1 ? 'indigo' : 'purple'
      }));
    }

    const topCats = dynamicCategories.slice(0, 3);
    const fallbackTitles = [
      'Laptops & Pro Workstations',
      'Peripherals & Accessories',
      'Mobile & Connected Tech'
    ];
    const fallbackSubtitles = [
      'Apple MacBook M3, Intel Core i5 & performance towers',
      'Ergonomic mice, mechanical keyboards & HD displays',
      'Flagship 5G devices, audio gear & fast chargers'
    ];

    return topCats.map((cat, idx) => ({
      tag: cat.name,
      title: fallbackTitles[idx] || `${cat.name} Deals`,
      subtitle: cat.productCount > 0 ? `${cat.productCount} verified items available in stock` : fallbackSubtitles[idx] || 'Verified live stock',
      linkUrl: `/catalog?${cat.queryParam}=${encodeURIComponent(cat.name)}`,
      icon: getCategoryIcon(cat.name),
      palette: idx === 0 ? 'blue' : idx === 1 ? 'indigo' : 'purple'
    }));
  }, [dynamicBanners, dynamicCategories]);

  // Dynamic Homepage Blocks (honors order and active state strictly from ERP Settings)
  const blocksToRender = useMemo(() => {
    if (homeBlocks && homeBlocks.length > 0) {
      return [...homeBlocks]
        .filter(b => b.isActive !== false)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return [];
  }, [homeBlocks]);

  const renderHeroSection = (block = null) => {
    return (
      <section key={block?._id || 'hero_section'} className="w-[96%] mx-auto pt-4 sm:pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-[17rem_1fr] gap-4 lg:gap-6 items-stretch">

          {/* Left Vertical Dynamic Category Navigation (Strictly Aligned to Banner Height) */}
          <aside className="hidden lg:flex lg:flex-col w-full h-full min-h-[460px] sm:min-h-[500px] lg:min-h-[520px] bg-white rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden">
            <div className="bg-[#172033] text-white px-4 py-3.5 flex items-center justify-between font-bold text-xs uppercase tracking-wider rounded-t-3xl">
              <div className="flex items-center gap-2.5">
                <Layers size={16} className="text-blue-400" />
                <span>All Categories</span>
              </div>
              <span className="text-[10px] bg-blue-600/90 text-white font-mono px-2 py-0.5 rounded-full font-bold">
                {dynamicCategories.length}
              </span>
            </div>

            <div className="flex-1 flex flex-col divide-y divide-slate-100 py-1 overflow-y-auto no-scrollbar">
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-slate-200 rounded" />
                      <div className="w-28 h-3 bg-slate-200 rounded" />
                    </div>
                    <div className="w-4 h-3 bg-slate-100 rounded" />
                  </div>
                ))
              ) : dynamicCategories.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 flex flex-col items-center justify-center flex-1 space-y-2">
                  <Layers size={32} className="text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700">No categories mapped</p>
                  <p className="text-[11px] text-slate-400">Add categories in ERP Settings to view list</p>
                </div>
              ) : (
                <>
                  {dynamicCategories.slice(0, 10).map((cat, idx) => {
                    const IconComponent = getCategoryIcon(cat.name);
                    const linkUrl = `/catalog?${cat.queryParam}=${encodeURIComponent(cat.name)}`;
                    const hasFamilies = cat.families && cat.families.length > 0;

                    return (
                      <div
                        key={cat.id || idx}
                        className="relative"
                        onMouseEnter={() => hasFamilies && setHoveredCategory(cat.name)}
                        onMouseLeave={() => setHoveredCategory(null)}
                      >
                        <Link
                          to={linkUrl}
                          className="flex items-center justify-between px-4 py-3 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50/70 transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <IconComponent size={15} className="text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                            <span className="truncate">{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {cat.productCount > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                                {cat.productCount}
                              </span>
                            )}
                            <ChevronRight size={13} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </Link>

                        {/* Interactive Mega-Flyout on hover if child families exist */}
                        {hasFamilies && hoveredCategory === cat.name && (
                          <div className="absolute left-full top-0 ml-1.5 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 animate-fade-in space-y-2">
                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 pb-1.5 border-b border-slate-100 flex items-center justify-between">
                              <span>{cat.name} Subcategories</span>
                              <span className="text-blue-600 font-bold">{cat.families.length} groups</span>
                            </div>
                            <div className="space-y-1">
                              {cat.families.map(fam => (
                                <div key={fam._id || fam.name} className="space-y-0.5">
                                  <Link
                                    to={`/catalog?${cat.queryParam}=${encodeURIComponent(cat.name)}&family=${encodeURIComponent(fam.name)}`}
                                    className="flex items-center justify-between p-1.5 rounded-lg text-xs font-bold text-slate-800 hover:text-blue-600 hover:bg-slate-50 transition-colors"
                                  >
                                    <span>{fam.name}</span>
                                    {fam.productCount > 0 && (
                                      <span className="text-[10px] text-slate-400 font-mono">({fam.productCount})</span>
                                    )}
                                  </Link>
                                  {fam.subFamilies && fam.subFamilies.length > 0 && (
                                    <div className="pl-3 space-y-0.5 border-l-2 border-slate-100 ml-1.5">
                                      {fam.subFamilies.map(sf => (
                                        <Link
                                          key={sf._id || sf.name}
                                          to={`/catalog?${cat.queryParam}=${encodeURIComponent(cat.name)}&family=${encodeURIComponent(fam.name)}&subFamily=${encodeURIComponent(sf.name)}`}
                                          className="block py-1 text-[11px] text-slate-500 hover:text-blue-600 transition-colors"
                                        >
                                          • {sf.name}
                                        </Link>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                </>
              )}
            </div>

            {/* Bottom Category Sidebar Action */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/60 rounded-b-3xl mt-auto">
              <Link
                to="/catalog"
                className="flex items-center justify-between text-xs font-bold text-blue-600 hover:text-blue-700 py-1 px-2 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <span>Browse All Products</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </aside>

          {/* Right Main Hero Column: Dynamic Banner Carousel */}
          <div className="w-full min-w-0 h-full flex flex-col">

            {/* REDESIGNED DYNAMIC HERO PROMOTIONAL BANNER */}
            <div
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              className="relative rounded-3xl overflow-hidden bg-slate-950 border border-white/10 p-6 sm:p-10 lg:p-14 shadow-2xl flex flex-col justify-center min-h-[460px] sm:min-h-[500px] lg:min-h-[520px] h-full transition-all duration-700 group"
            >
              {/* 1. FULL-BLEED REAL PHOTOGRAPH BACKGROUND (Exact Ergosoul.in Style) */}
              <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
                <img
                  key={activeSlide._id || currentSlide}
                  src={formatImageUrl(activeSlide.imageUrl) || activeSlide.imageUrl || (products[0] ? getProductImage(products[0]) : '')}
                  alt={activeSlide.title || 'Featured item'}
                  className="w-full h-full object-cover object-center md:object-right transform scale-100 group-hover:scale-105 transition-transform duration-1000 ease-out"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = products[0] ? getProductImage(products[0]) : NEUTRAL_PRODUCT_FALLBACK;
                  }}
                />

                {/* Cinematic Scrim Gradient (Dark left for crisp text, crystal clear right for the full photo) */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 via-50% to-black/20 hidden md:block" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/75 to-black/40 md:hidden" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
              </div>

              {/* 2. Hero Content (Ergosoul.in Premium Typography) */}
              <div className="space-y-4 sm:space-y-6 max-w-2xl z-20 text-center md:text-left relative py-4">
                {/* Ergosoul-style Tag */}
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <span className="text-amber-400 font-extrabold tracking-widest uppercase text-xs sm:text-[13px] flex items-center gap-2 drop-shadow-sm">
                    <Sparkles size={14} className="text-amber-400" />
                    <span>{activeSlide.badge || 'PREMIUM TECH COLLECTION'}</span>
                  </span>
                </div>

                {/* Main Headline */}
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08] drop-shadow-xl">
                  {activeSlide.title || 'Next-Gen Laptops and Pro Workstations'}
                </h1>

                {/* Subtitle Description */}
                <p className="text-sm sm:text-base text-slate-200/95 font-medium leading-relaxed max-w-xl drop-shadow-md">
                  {activeSlide.subtitle || 'Apple MacBook Pro M3, HP Core i5 and enterprise desktops with instant live stock availability.'}
                </p>

                {/* Interactive Offer Hint Pill if available */}
                {activeSlide.hoverText && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black/50 border border-white/20 text-slate-200 text-xs sm:text-sm font-semibold backdrop-blur-md">
                    <Sparkles size={14} className="text-yellow-300 shrink-0" />
                    <span>{activeSlide.hoverText}</span>
                  </div>
                )}

                {/* Micro Value Proposition Chips */}
                <div className="hidden sm:flex items-center justify-center md:justify-start gap-3 pt-1 text-xs font-bold text-slate-200">
                  <span className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15">
                    <Zap size={13} className="text-amber-400 fill-amber-400" /> Live Stock
                  </span>
                  <span className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15">
                    <ShieldCheck size={13} className="text-emerald-400" /> Genuine Warranty
                  </span>
                  <span className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15">
                    <Truck size={13} className="text-cyan-400" /> Express Dispatch
                  </span>
                </div>

                {/* CTA Action Buttons (Ergosoul.in Pill Glow Style) */}
                <div className="pt-2 flex items-center justify-center md:justify-start gap-4">
                  <Link
                    to={activeSlide.linkUrl || '/catalog'}
                    className="px-8 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-sm rounded-full shadow-xl shadow-amber-500/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 cursor-pointer group"
                  >
                    <span>{activeSlide.buttonText || 'Explore Collection'}</span>
                    <ArrowRight size={17} className="group-hover:translate-x-1.5 transition-transform" />
                  </Link>

                  <Link
                    to="/catalog"
                    className="px-7 py-4 bg-black/40 hover:bg-black/60 text-white font-bold text-sm rounded-full backdrop-blur-md border border-white/25 hover:border-white/40 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Eye size={16} />
                    <span>Explore Catalog</span>
                  </Link>
                </div>
              </div>

              {/* Floating Top-Right Live Stock Badge */}
              <div className="hidden sm:flex absolute top-6 right-7 backdrop-blur-md bg-black/60 border border-white/20 text-white px-4 py-2 rounded-full text-xs font-bold items-center gap-2 shadow-xl z-20 animate-fade-in">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>Live Stock Verified</span>
              </div>

              {/* Floating Bottom-Right Discount Chip */}
              <div className="hidden md:flex absolute bottom-6 right-8 backdrop-blur-md bg-amber-500/90 border border-amber-300/40 text-slate-950 px-4 py-2 rounded-2xl text-xs font-black shadow-2xl items-center gap-2 z-20 animate-fade-in">
                <Tag size={14} className="text-slate-950" />
                <span>Up to 45% OFF</span>
              </div>

              {/* CAROUSEL CONTROLS: Floating Left / Right Arrow Buttons */}
              {heroSlides.length > 1 && (
                <>
                  <button
                    onClick={prevSlide}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all shadow-xl hover:scale-110 active:scale-95 z-30 group cursor-pointer"
                    title="Previous Slide"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={nextSlide}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all shadow-xl hover:scale-110 active:scale-95 z-30 group cursor-pointer"
                    title="Next Slide"
                    aria-label="Next slide"
                  >
                    <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </>
              )}

              {/* CAROUSEL BOTTOM PROGRESS & SLIDE INDICATORS */}
              {heroSlides.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30 bg-black/40 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-full shadow-lg">
                  {/* Slide Indicators */}
                  <div className="flex items-center gap-1.5">
                    {heroSlides.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlide(idx)}
                        className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${currentSlide === idx
                          ? 'w-7 bg-white shadow-xs'
                          : 'w-2 bg-white/40 hover:bg-white/70'
                          }`}
                        aria-label={`Go to slide ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <span className="text-[10px] font-mono font-bold text-white/80 border-l border-white/20 pl-2">
                    0{currentSlide + 1} / 0{heroSlides.length}
                  </span>

                  {/* Pause / Play Toggle */}
                  <button
                    onClick={() => setIsPaused(prev => !prev)}
                    className="text-white/70 hover:text-white transition-colors cursor-pointer"
                    title={isPaused ? 'Resume autoplay' : 'Pause autoplay'}
                  >
                    {isPaused ? <Play size={11} className="fill-white" /> : <Pause size={11} className="fill-white" />}
                  </button>
                </div>
              )}
            </div>



          </div>
        </div>
      </section>
    );
  };

  const renderCatalogPicks = (block = null) => {
    if (!isLoading && products.length === 0) return null;
    return (
      <section key={block?._id || 'catalog_picks'} className="w-[96%] mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#172033]">
              {block?.title || 'Curated Catalog Picks'}
            </h2>
            <p className="text-xs text-slate-500">
              {block?.subtitle || 'Live inventory confirmed directly from fulfillment branches.'}
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
            {dynamicTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-slate-200" />
            ))}
          </div>
        ) : getTabProducts().length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {getTabProducts().map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                onQuickView={handleOpenQuickView}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 sm:p-10 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
            <LayoutGrid size={28} className="mx-auto text-slate-400" />
            <div className="text-xs font-bold text-slate-700">
              {activeTab === 'ALL'
                ? 'No products available in the store'
                : activeTab === 'BEST_SELLERS'
                  ? 'No items currently tagged as Best Seller'
                  : activeTab === 'NEW_ARRIVALS'
                    ? 'No items currently tagged as New Arrival'
                    : 'No items available under this category'}
            </div>
            <p className="text-[11px] text-slate-500">
              Items published with promotional tags from ERP E-Commerce Media Gallery will appear here.
            </p>
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-10 sm:space-y-12 pb-20 bg-[#F8FAFC] text-slate-900">



      {/* ========================================================== */}
      {/* DYNAMIC HOMEPAGE BLOCKS (Driven by ERP E-Commerce Settings) */}
      {/* ========================================================== */}
      {blocksToRender.map((block) => {
        // 0. HERO BANNER BLOCK
        if (block.blockType === 'HERO_BANNER') {
          return renderHeroSection(block);
        }

        // 1. CATEGORY BUBBLES
        if (block.blockType === 'CATEGORY_BUBBLES') {
          return (
            <section key={block._id} className="w-[96%] mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h2 className="text-lg sm:text-xl font-black text-[#172033] tracking-tight">
                    {block.title || 'Shop by Category'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {block.subtitle || 'Browse verified collections with live warehouse inventory'}
                  </p>
                </div>
                <Link
                  to="/catalog"
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
                >
                  <span>View All</span>
                  <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {dynamicCategories.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
                  {dynamicCategories.slice(0, block.itemLimit || 8).map((cat, idx) => {
                    const Icon = getCategoryIcon(cat.name);
                    const style = CATEGORY_STYLES[idx % CATEGORY_STYLES.length];
                    return (
                      <Link
                        key={cat.id || idx}
                        to={`/catalog?${cat.queryParam}=${encodeURIComponent(cat.name)}`}
                        className="group flex flex-col items-center text-center space-y-2 p-3 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all duration-300"
                      >
                        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${style.bg} ${style.text} ${style.border} border flex items-center justify-center shadow-2xs group-hover:scale-110 group-hover:rotate-2 transition-all duration-300`}>
                          <Icon size={24} className="stroke-[2.2]" />
                        </div>
                        <div className="space-y-0.5 w-full">
                          <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1 block">
                            {cat.name}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400 block">
                            {cat.productCount > 0 ? `${cat.productCount} items` : 'Explore'}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : !isLoading ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
                  No categories currently enabled in Catalog Hierarchy Mapping. Please enable categories in ERP Settings.
                </div>
              ) : null}
            </section>
          );
        }

        // 2. FLASH DEAL BLOCK
        if (block.blockType === 'DEAL_FLASH') {
          const dealItems = (block.products && block.products.length > 0)
            ? block.products.slice(0, block.itemLimit || 4)
            : dealsOfTheDay.slice(0, block.itemLimit || 4);

          if (dealItems.length === 0) return null;

          return (
            <section key={block._id} className="w-[96%] mx-auto space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-[#172033] tracking-tight">
                      {block.title || 'Deal of the Day'}
                    </h2>
                    {block.subtitle && <p className="text-xs text-slate-500">{block.subtitle}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full text-rose-600 text-[11px] font-bold">
                    <Clock size={13} />
                    <span>Ends in: {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m {String(timeLeft.seconds).padStart(2, '0')}s</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => scrollDeals('left')}
                    className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 shadow-2xs transition-colors cursor-pointer"
                    title="Scroll left"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => scrollDeals('right')}
                    className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 shadow-2xs transition-colors cursor-pointer"
                    title="Scroll right"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <Link
                    to="/catalog?sort=price_asc"
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 ml-2 group"
                  >
                    <span>View All</span>
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>

              <div
                ref={dealsScrollRef}
                className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-2"
              >
                {dealItems.map((product) => (
                  <div key={product._id} className="w-56 sm:w-60 shrink-0">
                    <ProductCard product={product} onQuickView={handleOpenQuickView} />
                  </div>
                ))}
              </div>
            </section>
          );
        }

        // 3. PROMO GRID BLOCK (Promotional Feature Highlights)
        if (block.blockType === 'PROMO_GRID') {
          const promoCards = (block.customConfig?.promoCardsMode === 'custom' && Array.isArray(block.customConfig?.promoCards) && block.customConfig.promoCards.length > 0)
            ? block.customConfig.promoCards.map(c => ({
              tag: c.tag || 'Featured',
              title: c.title,
              subtitle: c.subtitle,
              linkUrl: c.linkUrl || '/catalog',
              imageUrl: c.imageUrl,
              icon: getCategoryIcon(c.title || c.tag),
              palette: c.palette || 'blue'
            }))
            : featuredPromos;

          if (promoCards.length === 0) return null;
          return (
            <section key={block._id} className="w-[96%] mx-auto space-y-4">
              <div className="space-y-0.5">
                <h2 className="text-lg sm:text-xl font-black text-[#172033] tracking-tight">
                  {block.title || 'Promotional Feature Highlights'}
                </h2>
                <p className="text-xs text-slate-500">
                  {block.subtitle || 'Curated shopping zones across tech, mobile and peripherals'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {promoCards.slice(0, block.itemLimit || 3).map((promo, idx) => {
                  const PromoIcon = promo.icon;
                  const themeMap = {
                    blue: { bg: 'bg-gradient-to-tr from-blue-100 via-sky-50 to-indigo-50 border-blue-200/80', tag: 'text-blue-700', btn: 'text-blue-700 hover:text-blue-800', iconColor: 'text-blue-600', iconBox: 'bg-white/80 border-blue-200' },
                    indigo: { bg: 'bg-gradient-to-tr from-indigo-100 via-purple-50 to-sky-50 border-indigo-200/80', tag: 'text-indigo-700', btn: 'text-indigo-700 hover:text-indigo-800', iconColor: 'text-indigo-600', iconBox: 'bg-white/80 border-indigo-200' },
                    purple: { bg: 'bg-gradient-to-tr from-purple-100 via-fuchsia-50 to-rose-50 border-purple-200/80', tag: 'text-purple-700', btn: 'text-purple-700 hover:text-purple-800', iconColor: 'text-purple-600', iconBox: 'bg-white/80 border-purple-200' }
                  };
                  const currentTheme = themeMap[promo.palette] || themeMap.blue;

                  return (
                    <div
                      key={idx}
                      className={`rounded-2xl p-6 ${currentTheme.bg} border flex flex-col justify-between min-h-[175px] relative overflow-hidden group shadow-xs`}
                    >
                      <div className="space-y-1.5 z-10 max-w-[65%]">
                        <span className={`text-[11px] font-black uppercase tracking-wider ${currentTheme.tag}`}>
                          {promo.tag}
                        </span>
                        <h3 className="text-xl font-black text-slate-900 leading-tight">
                          {promo.title}
                        </h3>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {promo.subtitle}
                        </p>
                      </div>

                      <Link
                        to={promo.linkUrl}
                        className={`inline-flex items-center gap-1.5 text-xs font-bold ${currentTheme.btn} pt-3 z-10`}
                      >
                        <span>Shop Collection</span>
                        <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                      </Link>

                      <div className="absolute right-3 bottom-3 w-28 h-28 opacity-90 group-hover:scale-110 transition-transform duration-300">
                        {promo.imageUrl ? (
                          <img
                            src={promo.imageUrl}
                            alt={promo.title}
                            className="w-full h-full object-contain rounded-2xl"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className={`w-full h-full rounded-2xl ${currentTheme.iconBox} border flex items-center justify-center shadow-md`}>
                            <PromoIcon size={44} className={currentTheme.iconColor} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        }

        // 4. BEST SELLERS BLOCK
        if (block.blockType === 'BEST_SELLERS') {
          const items = (block.products && block.products.length > 0)
            ? block.products.slice(0, block.itemLimit || 8)
            : bestSellers.slice(0, block.itemLimit || 8);

          if (items.length === 0) return null;

          return (
            <section key={block._id} className="w-[96%] mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h2 className="text-lg sm:text-xl font-black text-[#172033] tracking-tight">
                    {block.title || 'Top Rated Best Sellers'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {block.subtitle || 'Most popular customer selections with 100% verified serial tracking'}
                  </p>
                </div>
                <Link
                  to="/catalog?sort=popularity"
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
                >
                  <span>View All</span>
                  <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {items.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    onQuickView={handleOpenQuickView}
                  />
                ))}
              </div>
            </section>
          );
        }

        // 5. NEW ARRIVALS BLOCK
        if (block.blockType === 'NEW_ARRIVALS') {
          const items = (block.products && block.products.length > 0)
            ? (block.filterType === 'all' ? block.products : block.products.filter(p => Boolean(p.isNewArrival))).slice(0, block.itemLimit || 8)
            : newArrivals.slice(0, block.itemLimit || 8);

          if (items.length === 0) return null;

          return (
            <section key={block._id} className="w-[96%] mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h2 className="text-lg sm:text-xl font-black text-[#172033] tracking-tight">
                    {block.title || 'Fresh New Arrivals'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {block.subtitle || 'Newly inventoried hardware and accessories ready for immediate dispatch'}
                  </p>
                </div>
                <Link
                  to="/catalog?sort=newest"
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
                >
                  <span>View All</span>
                  <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {items.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    onQuickView={handleOpenQuickView}
                  />
                ))}
              </div>
            </section>
          );
        }

        // 6. CATEGORY PRODUCTS OR CUSTOM GRID BLOCK
        if (block.blockType === 'CATEGORY_PRODUCTS' || block.blockType === 'CUSTOM_GRID') {
          const items = (block.products || []).slice(0, block.itemLimit || 8);
          if (items.length === 0) return null;

          return (
            <section key={block._id} className="w-[96%] mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h2 className="text-lg sm:text-xl font-black text-[#172033] tracking-tight">
                    {block.title}
                  </h2>
                  {block.subtitle && <p className="text-xs text-slate-500">{block.subtitle}</p>}
                </div>
                <Link
                  to={block.customConfig?.viewAllLink || '/catalog'}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
                >
                  <span>View All</span>
                  <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {items.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    onQuickView={handleOpenQuickView}
                  />
                ))}
              </div>
            </section>
          );
        }

        // 7. SINGLE PROMOTIONAL BANNER BLOCK
        if (block.blockType === 'SINGLE_BANNER') {
          const conf = block.customConfig || {};
          const theme = getBannerGradientTheme(conf.bgGradient || 'dark');
          const bannerImg = conf.bannerImageUrl;
          const link = conf.bannerLink || '/catalog';
          const btnText = conf.buttonText || 'Shop Now';
          const badge = conf.bannerBadge || conf.badgeText;
          const heightClass = conf.bannerHeight === 'compact' ? 'py-8' : conf.bannerHeight === 'large' ? 'py-16' : 'py-12';

          return (
            <section key={block._id} className="w-[96%] mx-auto">
              <div className={`relative rounded-3xl overflow-hidden border ${theme.border} ${theme.bg} shadow-lg transition-all duration-300 hover:shadow-2xl group`}>
                {/* Glow ambient background effect */}
                <div className={`absolute top-0 right-1/4 w-96 h-96 rounded-full ${theme.glow} blur-3xl pointer-events-none opacity-20 group-hover:opacity-30 transition-opacity`} />
                <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-white/5 blur-2xl pointer-events-none" />

                <div className={`relative z-10 px-6 sm:px-10 lg:px-14 flex flex-col md:flex-row items-center justify-between gap-8 ${heightClass}`}>
                  {/* Left Content */}
                  <div className="space-y-4 max-w-xl text-left">
                    {badge && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase border border-white/20 bg-white/10 backdrop-blur-md shadow-xs">
                        <Sparkles size={12} className="text-amber-400" />
                        <span className="text-white font-bold">{badge}</span>
                      </div>
                    )}

                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                      {block.title}
                    </h2>

                    {block.subtitle && (
                      <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                        {block.subtitle}
                      </p>
                    )}

                    <div className="pt-2">
                      <Link
                        to={link}
                        className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white ${theme.btn} shadow-md hover:shadow-xl transition-all transform hover:scale-105 active:scale-95`}
                      >
                        <span>{btnText}</span>
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>

                  {/* Right Image */}
                  {bannerImg ? (
                    <div className="relative w-full md:w-1/2 flex items-center justify-center">
                      <div className="relative max-h-72 sm:max-h-84 overflow-hidden rounded-2xl shadow-xl border border-white/10">
                        <img
                          src={bannerImg}
                          alt={block.title}
                          className="w-full h-full object-cover object-center rounded-2xl transition-transform duration-700 group-hover:scale-105"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="hidden md:flex items-center justify-center w-72 h-48 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                      <Sparkles size={48} className="text-white/20" />
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        }

        // 8. MULTI BANNER PROMOTIONAL GRID BLOCK (2 or 3 Columns)
        if (block.blockType === 'MULTI_BANNER') {
          const conf = block.customConfig || {};
          const cards = conf.multiBanners && conf.multiBanners.length > 0 ? conf.multiBanners : [];
          if (cards.length === 0) return null;

          const colsClass = cards.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

          return (
            <section key={block._id} className="w-[96%] mx-auto space-y-4">
              {block.title && (
                <div className="space-y-0.5">
                  <h2 className="text-lg sm:text-xl font-black text-[#172033] tracking-tight">{block.title}</h2>
                  {block.subtitle && <p className="text-xs text-slate-500">{block.subtitle}</p>}
                </div>
              )}

              <div className={`grid ${colsClass} gap-6`}>
                {cards.map((card, cIdx) => {
                  const cardTheme = getBannerGradientTheme(card.bgGradient || 'sapphire');
                  return (
                    <div
                      key={cIdx}
                      className={`rounded-3xl p-6 sm:p-8 ${cardTheme.bg} border ${cardTheme.border} relative overflow-hidden group shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between min-h-[220px]`}
                    >
                      <div className="space-y-2 z-10 max-w-[65%]">
                        {card.badge && (
                          <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/15 text-white border border-white/20">
                            {card.badge}
                          </span>
                        )}
                        <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                          {card.title}
                        </h3>
                        {card.subtitle && (
                          <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                            {card.subtitle}
                          </p>
                        )}
                      </div>

                      <div className="pt-4 z-10">
                        <Link
                          to={card.linkUrl || '/catalog'}
                          className={`inline-flex items-center gap-1.5 text-xs font-bold text-white px-4 py-2 rounded-lg ${cardTheme.btn} transition-all`}
                        >
                          <span>{card.buttonText || 'Explore'}</span>
                          <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </div>

                      {card.imageUrl && (
                        <div className="absolute right-2 bottom-2 w-36 h-36 sm:w-44 sm:h-44 overflow-hidden rounded-2xl opacity-90 group-hover:scale-110 transition-transform duration-300">
                          <img
                            src={card.imageUrl}
                            alt={card.title}
                            className="w-full h-full object-contain"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        }

        // 9. STANDALONE TRUST STRIP BLOCK
        if (block.blockType === 'TRUST_STRIP') {
          return (
            <section key={block._id} className="w-[96%] mx-auto">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                <div className="flex items-center gap-3 p-2">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Truck size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#172033]">Free Delivery</h4>
                    <p className="text-[11px] text-slate-500">
                      {freeShippingThreshold > 0 ? `On orders above ${formatCurrency(freeShippingThreshold)}` : 'On all eligible orders'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <RotateCcw size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#172033]">Easy Returns</h4>
                    <p className="text-[11px] text-slate-500">Within {returnWindowDays || 7} days</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2">
                  <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#172033]">Secure Payment</h4>
                    <p className="text-[11px] text-slate-500">100% verified & secure</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2">
                  <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Headphones size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#172033]">24/7 Support</h4>
                    <p className="text-[11px] text-slate-500">We're here to help you</p>
                  </div>
                </div>
              </div>
            </section>
          );
        }

        // 10. CURATED CATALOG PICKS BLOCK
        if (block.blockType === 'CATALOG_PICKS') {
          return renderCatalogPicks(block);
        }

        return null;
      })}



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

export default HomePage;

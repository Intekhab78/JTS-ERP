const mongoose = require('mongoose');
require('dotenv').config({ path: 'e:/ERP_/backend/.env' });

async function seed() {
  const connectDB = require('../config/db');
  await connectDB();

  const Company = require('../core/models/Company');
  const Banner = require('../core/models/Banner');
  const HomeBlock = require('../core/models/HomeBlock');

  const company = await Company.findOne();
  if (!company) {
    console.log('No company found');
    process.exit(0);
  }

  const existingBanners = await Banner.countDocuments({ tenantId: company._id });
  if (existingBanners === 0) {
    await Banner.insertMany([
      {
        tenantId: company._id,
        badge: 'FESTIVE TECH SPECTACULAR - UP TO 45% OFF',
        title: 'Next-Gen Laptops and Pro Workstations',
        subtitle: 'Apple MacBook Pro M3, HP Core i5 and enterprise desktops with instant live stock availability.',
        hoverText: 'Limited Time Deal: Get additional warranty and free express shipping on enterprise workstations.',
        imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
        buttonText: 'Shop Tech Deals',
        linkUrl: '/catalog?category=Computers',
        placement: 'HERO_CAROUSEL',
        gradient: 'from-slate-950 via-blue-950 to-slate-900',
        order: 1,
        isActive: true
      },
      {
        tenantId: company._id,
        badge: 'LIGHTNING FLASH DEALS - LIMITED TIME',
        title: 'Flagship 5G Smartphones and Devices',
        subtitle: 'Experience ultra performance with Samsung Galaxy S24, Realme 11 Pro and verified manufacturer warranty.',
        hoverText: 'Shop flagship smartphones with guaranteed genuine warranty and easy exchange program.',
        imageUrl: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=80',
        buttonText: 'Explore Mobile Deals',
        linkUrl: '/catalog?search=phone',
        placement: 'HERO_CAROUSEL',
        gradient: 'from-slate-950 via-purple-950 to-slate-900',
        order: 2,
        isActive: true
      },
      {
        tenantId: company._id,
        badge: 'DESK AND PRODUCTIVITY COMBO - SAVE UP TO 2000',
        title: 'Ultra-HD Monitors, Mice and Keyboards',
        subtitle: 'Complete workstation bundles with 24 inch Dell displays and high-precision Logitech wireless peripherals.',
        hoverText: 'Ergonomic displays and ultra-precise input devices tailored for high-speed workflows.',
        imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
        buttonText: 'Shop Peripherals',
        linkUrl: '/catalog?category=Computer%20Accessories',
        placement: 'HERO_CAROUSEL',
        gradient: 'from-slate-950 via-indigo-950 to-slate-900',
        order: 3,
        isActive: true
      }
    ]);
    console.log('Seeded 3 default dynamic banners');
  } else {
    console.log('Banners already exist:', existingBanners);
  }

  const existingBlocks = await HomeBlock.countDocuments({ tenantId: company._id });
  if (existingBlocks === 0) {
    await HomeBlock.insertMany([
      {
        tenantId: company._id,
        title: 'Shop by Department and Hierarchy',
        subtitle: 'Quick visual category navigation across all commercial divisions',
        blockType: 'CATEGORY_BUBBLES',
        filterType: 'all',
        order: 1,
        isActive: true
      },
      {
        tenantId: company._id,
        title: 'Deal of the Day',
        subtitle: 'Exclusive flash discounts guaranteed from live multi-location inventory',
        blockType: 'DEAL_FLASH',
        filterType: 'tag',
        itemLimit: 4,
        order: 2,
        isActive: true,
        customConfig: { countdownHours: 6, badgeText: 'FLASH SALE' }
      },
      {
        tenantId: company._id,
        title: 'Promotional Feature Highlights',
        subtitle: '4-Quadrant curated shopping zones across tech, mobile and peripherals',
        blockType: 'PROMO_GRID',
        filterType: 'all',
        order: 3,
        isActive: true
      },
      {
        tenantId: company._id,
        title: 'Top Rated Best Sellers',
        subtitle: 'Most popular customer selections with 100% verified serial tracking',
        blockType: 'BEST_SELLERS',
        filterType: 'tag',
        itemLimit: 8,
        order: 4,
        isActive: true
      },
      {
        tenantId: company._id,
        title: 'Fresh New Arrivals',
        subtitle: 'Newly inventoried hardware and accessories ready for immediate dispatch',
        blockType: 'NEW_ARRIVALS',
        filterType: 'all',
        itemLimit: 8,
        order: 5,
        isActive: true
      }
    ]);
    console.log('Seeded default dynamic homepage blocks');
  } else {
    console.log('Home blocks already exist:', existingBlocks);
  }

  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Banner = require('../../core/models/Banner');
const HomeBlock = require('../../core/models/HomeBlock');
const EcomSettings = require('../../core/models/EcomSettings');
const Product = require('../../core/models/Product');
const ProductVariant = require('../../core/models/ProductVariant');
const Company = require('../../core/models/Company');
const LegalCompany = require('../../core/models/LegalCompany');
const Branch = require('../../core/models/Branch');
const ItemDepartment = require('../../core/models/ItemDepartment');
const Category = require('../../core/models/Category');
const Family = require('../../core/models/Family');
const SubFamily = require('../../core/models/SubFamily');
const Stock = require('../../core/models/Stock');
const CompanyItem = require('../../core/models/CompanyItem');
const { getEcomSettings, resolveEcomActiveScope, calculateProductEcomStock } = require('./ecomStockService');

// Helper to get tenant ID from ERP user or API key
const resolveTenantId = async (req) => {
  if (req.user && (req.user.activeTenantId || req.user.tenantId)) {
    return req.user.activeTenantId || req.user.tenantId;
  }
  if (req.tenantId) {
    return req.tenantId;
  }
  const company = await Company.findOne({ name: /JTS middleeast/i }) || await Company.findOne();
  if (!company) throw new Error('Tenant company not found');
  return company._id;
};

// ==========================================
// 1. BANNERS MANAGEMENT
// ==========================================

// @desc    Get all banners (Admin)
// @route   GET /api/v1/ecommerce/admin/banners
exports.getAdminBanners = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    const banners = await Banner.find({ tenantId }).sort({ order: 1, createdAt: -1 });
    res.status(200).json(banners);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching banners', error: error.message });
  }
};

// @desc    Get active banners for public storefront
// @route   GET /api/v1/ecommerce/banners
exports.getPublicBanners = async (req, res) => {
  try {
    const tenantId = req.tenantId || await resolveTenantId(req);
    const placement = req.query.placement;
    const query = { tenantId, isActive: true };
    if (placement) query.placement = placement;

    const banners = await Banner.find(query).sort({ order: 1, createdAt: -1 }).lean();
    res.status(200).json(banners);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching public banners', error: error.message });
  }
};

// @desc    Create new banner (Admin)
// @route   POST /api/v1/ecommerce/admin/banners
exports.createAdminBanner = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    const {
      title,
      subtitle,
      badge,
      hoverText,
      imageUrl,
      buttonText,
      linkUrl,
      placement,
      gradient,
      order,
      isActive
    } = req.body;

    if (!title || !imageUrl) {
      return res.status(400).json({ message: 'Title and Image URL are required' });
    }

    const banner = await Banner.create({
      tenantId,
      title: title.trim(),
      subtitle: subtitle ? subtitle.trim() : '',
      badge: badge ? badge.trim() : '',
      hoverText: hoverText ? hoverText.trim() : '',
      imageUrl: imageUrl.trim(),
      buttonText: buttonText ? buttonText.trim() : 'Shop Now',
      linkUrl: linkUrl ? linkUrl.trim() : '/catalog',
      placement: placement || 'HERO_CAROUSEL',
      gradient: gradient || 'from-slate-950 via-blue-950 to-slate-900',
      order: order !== undefined ? Number(order) : 0,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user?._id
    });

    res.status(201).json(banner);
  } catch (error) {
    res.status(500).json({ message: 'Error creating banner', error: error.message });
  }
};

// @desc    Update banner (Admin)
// @route   PUT /api/v1/ecommerce/admin/banners/:id
exports.updateAdminBanner = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    const banner = await Banner.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { $set: req.body },
      { returnDocument: 'after', runValidators: true }
    );

    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    res.status(200).json(banner);
  } catch (error) {
    res.status(500).json({ message: 'Error updating banner', error: error.message });
  }
};

// @desc    Delete banner (Admin)
// @route   DELETE /api/v1/ecommerce/admin/banners/:id
exports.deleteAdminBanner = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    const banner = await Banner.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    res.status(200).json({ message: 'Banner deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting banner', error: error.message });
  }
};

// ==========================================
// 2. HOMEPAGE ITEM BLOCKS MANAGEMENT
// Helper to ensure all standard 7 sections exist and have consistent orders
const ensureDefaultHomeBlocks = async (tenantId) => {
  let blocks = await HomeBlock.find({ tenantId }).sort({ order: 1 });
  let updated = false;

  if (blocks.length === 0) {
    await HomeBlock.insertMany([
      { tenantId, title: 'Main Hero Carousel & Banners', subtitle: 'Top rotating storefront hero banner with category navigation', blockType: 'HERO_BANNER', order: 0, isActive: true },
      { tenantId, title: 'Shop by Category', subtitle: 'Quick visual category navigation across all commercial divisions', blockType: 'CATEGORY_BUBBLES', order: 1, isActive: true, itemLimit: 8 },
      { tenantId, title: 'Deal of the Day', subtitle: 'Exclusive flash discounts guaranteed from live multi-location inventory', blockType: 'DEAL_FLASH', order: 2, isActive: true, itemLimit: 4, filterType: 'tag' },
      { tenantId, title: 'Promotional Feature Highlights', subtitle: '4-Quadrant curated shopping zones across tech, mobile and peripherals', blockType: 'PROMO_GRID', order: 3, isActive: true, itemLimit: 8 },
      { tenantId, title: 'Top Rated Best Sellers', subtitle: 'Most popular customer selections with 100% verified serial tracking', blockType: 'BEST_SELLERS', order: 4, isActive: true, itemLimit: 8, filterType: 'tag' },
      { tenantId, title: 'Fresh New Arrivals', subtitle: 'Newly inventoried hardware and accessories ready for immediate dispatch', blockType: 'NEW_ARRIVALS', order: 5, isActive: true, itemLimit: 8, filterType: 'tag' },
      { tenantId, title: 'Curated Catalog Picks', subtitle: 'Tabbed product picks (Trending, Best Sellers, Categories)', blockType: 'CATALOG_PICKS', order: 6, isActive: true }
    ]);
    return await HomeBlock.find({ tenantId }).sort({ order: 1 });
  }

  // Ensure NEW_ARRIVALS block strictly uses tag filtering so untagged items do not appear
  await HomeBlock.updateMany(
    { tenantId, blockType: 'NEW_ARRIVALS', filterType: { $ne: 'tag' } },
    { $set: { filterType: 'tag' } }
  );

  // Check if HERO_BANNER exists
  if (!blocks.some(b => b.blockType === 'HERO_BANNER')) {
    await HomeBlock.create({
      tenantId,
      title: 'Main Hero Carousel & Banners',
      subtitle: 'Top rotating storefront hero banner with category navigation',
      blockType: 'HERO_BANNER',
      order: 0,
      isActive: true
    });
    updated = true;
  }

  // Check if CATALOG_PICKS exists
  if (!blocks.some(b => b.blockType === 'CATALOG_PICKS')) {
    const highestOrder = blocks.reduce((max, b) => Math.max(max, b.order || 0), 0);
    await HomeBlock.create({
      tenantId,
      title: 'Curated Catalog Picks',
      subtitle: 'Tabbed product picks (Trending, Best Sellers, Categories)',
      blockType: 'CATALOG_PICKS',
      order: highestOrder + 1,
      isActive: true
    });
    updated = true;
  }

  if (updated) {
    blocks = await HomeBlock.find({ tenantId }).sort({ order: 1 });
    // Normalize orders: 0, 1, 2, 3...
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].order !== i) {
        await HomeBlock.updateOne({ _id: blocks[i]._id }, { $set: { order: i } });
        blocks[i].order = i;
      }
    }
  }

  return blocks;
};

// @desc    Get all home blocks (Admin)
// @route   GET /api/v1/ecommerce/admin/home-blocks
exports.getAdminHomeBlocks = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    const blocks = await ensureDefaultHomeBlocks(tenantId);
    res.status(200).json(blocks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching home blocks', error: error.message });
  }
};

// @desc    Get public home blocks populated with products
// @route   GET /api/v1/ecommerce/home-blocks
exports.getPublicHomeBlocks = async (req, res) => {
  try {
    const tenantId = req.tenantId || await resolveTenantId(req);
    await ensureDefaultHomeBlocks(tenantId);
    const settings = await getEcomSettings(tenantId);
    const scope = await resolveEcomActiveScope(tenantId, settings);

    const blocks = await HomeBlock.find({ tenantId, isActive: true }).sort({ order: 1 }).lean();

    // If NO company and NO branch is selected/enabled, return empty products for all blocks
    if (!scope.hasActiveScope) {
      return res.status(200).json(blocks.map(b => ({ ...b, products: [] })));
    }

    const stockProductIds = await Stock.distinct('productId', {
      tenantId,
      branchId: { $in: scope.mappedBranchIds }
    });

    const allowedProductFilters = [
      { _id: { $in: stockProductIds } },
      { type: 'SERVICE' }
    ];

    if (scope.mappedBranchIds.length === 0 && scope.mappedCompanyIds.length > 0) {
      const legalCompanies = await LegalCompany.find({ _id: { $in: scope.mappedCompanyIds } }).select('name');
      const compNames = legalCompanies.map(c => c.name);
      if (compNames.length > 0) {
        allowedProductFilters.push({ company: { $in: compNames } });
      }
    }

    const mappedDepts = (settings?.mappedDepartments || []).map(d => (d?._id || d)?.toString()).filter(Boolean);
    const mappedCats = (settings?.mappedCategories || []).map(c => (c?._id || c)?.toString()).filter(Boolean);
    const mappedFams = (settings?.mappedFamilies || []).map(f => (f?._id || f)?.toString()).filter(Boolean);
    const mappedSubFams = (settings?.mappedSubFamilies || []).map(sf => (sf?._id || sf)?.toString()).filter(Boolean);

    const hasMapping = mappedDepts.length > 0 || mappedCats.length > 0 || mappedFams.length > 0 || mappedSubFams.length > 0;

    // If NO category/department is selected in settings, return blocks with empty products!
    if (!hasMapping) {
      return res.status(200).json(blocks.map(b => ({ ...b, products: [] })));
    }

    // Build hierarchy filter
    const hierarchyConditions = [];
    if (mappedDepts.length > 0) hierarchyConditions.push({ department: { $in: mappedDepts } });
    if (mappedCats.length > 0) {
      const catObjIds = mappedCats.filter(id => mongoose.isValidObjectId(id)).map(id => new mongoose.Types.ObjectId(id));
      const catNames = mappedCats.filter(id => !mongoose.isValidObjectId(id));
      if (catObjIds.length > 0) hierarchyConditions.push({ categoryId: { $in: catObjIds } });
      if (catNames.length > 0) {
        hierarchyConditions.push({ category: { $in: catNames } });
        hierarchyConditions.push({ department: { $in: catNames } });
      }
    }
    if (mappedFams.length > 0) hierarchyConditions.push({ family: { $in: mappedFams } });
    if (mappedSubFams.length > 0) hierarchyConditions.push({ subFamily: { $in: mappedSubFams } });

    // Populate each block with its matching products from active mapped catalog
    const populatedBlocks = await Promise.all(blocks.map(async (block) => {
      // Banner and layout blocks don't need product catalog queries
      if (['HERO_BANNER', 'SINGLE_BANNER', 'MULTI_BANNER', 'TRUST_STRIP', 'CATALOG_PICKS'].includes(block.blockType)) {
        return {
          ...block,
          products: []
        };
      }

      let query = {
        tenantId,
        isActive: true,
        isPublishedToEcommerce: { $ne: false },
        $or: allowedProductFilters
      };

      if (hierarchyConditions.length > 0) {
        query.$and = [{ $or: hierarchyConditions }];
      }

      let sort = { createdAt: -1 };

      if (block.blockType === 'BEST_SELLERS') {
        if (block.filterType === 'tag') {
          query.isBestSeller = true;
        } else {
          query.$and = [...(query.$and || []), { $or: [{ isBestSeller: true }, { salesPrice: { $gt: 0 } }] }];
        }
        sort = { salesPrice: -1, createdAt: -1 };
      } else if (block.blockType === 'DEAL_FLASH') {
        if (block.filterType === 'tag') {
          query.isDealOfTheDay = true;
        } else {
          query.$and = [...(query.$and || []), { $or: [{ isDealOfTheDay: true }, { isTrending: true }] }];
        }
        sort = { salesPrice: 1, createdAt: -1 };
      } else if (block.blockType === 'NEW_ARRIVALS') {
        if (block.filterType === 'all') {
          sort = { createdAt: -1 };
        } else {
          query.isNewArrival = true;
          sort = { createdAt: -1 };
        }
      } else if (block.blockType === 'CATEGORY_PRODUCTS' && block.filterValue) {
        if (block.filterType === 'department') query.department = block.filterValue;
        else if (block.filterType === 'category') query.categoryId = block.filterValue;
        else if (block.filterType === 'family') query.family = block.filterValue;
        else if (block.filterType === 'brand') query.brand = new RegExp(`^${block.filterValue}$`, 'i');
      }

      let products = await Product.find(query)
        .select('name sku barcode brand price salesPrice uploadImage images department categoryId family isBestSeller isDealOfTheDay isNewArrival isFeatured isTrending ecommerceBadge')
        .sort(sort)
        .limit(block.itemLimit || 8)
        .lean();

      // Attach dynamic branch stock
      const productsWithStock = await Promise.all(products.map(async (p) => {
        const stockInfo = await calculateProductEcomStock(p._id, tenantId, settings);
        return {
          ...p,
          salesPrice: p.salesPrice > 0 ? p.salesPrice : p.price,
          inStock: stockInfo.totalEcomStock > 0,
          stockCount: stockInfo.totalEcomStock,
          rating: 4.3 + (Math.abs(p.name.charCodeAt(0) % 7) / 10),
          reviewCount: 24 + (Math.abs(p.name.charCodeAt(p.name.length - 1) % 120))
        };
      }));

      return {
        ...block,
        products: productsWithStock
      };
    }));

    res.status(200).json(populatedBlocks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching public blocks', error: error.message });
  }
};

// @desc    Create home block (Admin)
// @route   POST /api/v1/ecommerce/admin/home-blocks
exports.createAdminHomeBlock = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    const { title, subtitle, blockType, filterType, filterValue, itemLimit, order, isActive, customConfig } = req.body;

    if (!title || !blockType) {
      return res.status(400).json({ message: 'Title and Block Type are required' });
    }

    const block = await HomeBlock.create({
      tenantId,
      title: title.trim(),
      subtitle: subtitle ? subtitle.trim() : '',
      blockType,
      filterType: filterType || 'all',
      filterValue: filterValue ? filterValue.trim() : '',
      itemLimit: Number(itemLimit) || 8,
      order: Number(order) || 0,
      isActive: isActive !== undefined ? isActive : true,
      customConfig: customConfig || {}
    });

    res.status(201).json(block);
  } catch (error) {
    res.status(500).json({ message: 'Error creating home block', error: error.message });
  }
};

// @desc    Update home block (Admin)
// @route   PUT /api/v1/ecommerce/admin/home-blocks/:id
exports.updateAdminHomeBlock = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    const block = await HomeBlock.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { $set: req.body },
      { returnDocument: 'after' }
    );
    if (!block) return res.status(404).json({ message: 'Block not found' });
    res.status(200).json(block);
  } catch (error) {
    res.status(500).json({ message: 'Error updating home block', error: error.message });
  }
};

// @desc    Delete home block (Admin)
// @route   DELETE /api/v1/ecommerce/admin/home-blocks/:id
exports.deleteAdminHomeBlock = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    const block = await HomeBlock.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!block) return res.status(404).json({ message: 'Block not found' });
    res.status(200).json({ message: 'Block deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting home block', error: error.message });
  }
};

// ==========================================
// 3. COMPANY & HIERARCHY MAPPING SETTINGS
// ==========================================

// @desc    Get company and branch hierarchy for mapping selector
// @route   GET /api/v1/ecommerce/admin/company-hierarchy
exports.getCompanyHierarchyForMapping = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    const [groupCompany, legalCompanies, branches] = await Promise.all([
      Company.findById(tenantId).select('name code currency email phone'),
      LegalCompany.find({ tenantId, isActive: { $ne: false } }).select('name code registrationNumber country'),
      Branch.find({ tenantId, isActive: { $ne: false } }).select('name code address city phone companyId legalCompanyId')
    ]);

    res.status(200).json({
      groupCompany,
      companies: legalCompanies,
      branches
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching company hierarchy', error: error.message });
  }
};

// @desc    Get item catalog hierarchy (Departments, Sections, Families, SubFamilies) for website mapping
// @route   GET /api/v1/ecommerce/admin/catalog-hierarchy
exports.getCatalogHierarchyForMapping = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    const [departments, categories, families, subFamilies, products] = await Promise.all([
      ItemDepartment.find({ tenantId, isActive: { $ne: false } }).sort({ name: 1 }).lean(),
      Category.find({ tenantId, isActive: { $ne: false } }).sort({ name: 1 }).lean(),
      Family.find({ tenantId, isActive: { $ne: false } }).sort({ name: 1 }).lean(),
      SubFamily.find({ tenantId, isActive: { $ne: false } }).sort({ name: 1 }).lean(),
      Product.find({ tenantId, isActive: true }).select('department categoryId family subFamily').lean()
    ]);

    // Compute active product counts under each tier
    const deptsWithCount = departments.map(d => ({
      _id: d._id,
      name: d.name,
      code: d.code,
      productCount: products.filter(p => p.department === d.name).length
    }));

    const categoriesWithCount = categories.map(c => ({
      _id: c._id,
      name: c.name,
      code: c.code,
      departmentId: (c.itemDepartmentId?._id || c.itemDepartmentId || c.departmentId)?.toString() || null,
      productCount: products.filter(p => p.categoryId?.toString() === c._id.toString() || p.department === c.name).length
    }));

    const familiesWithCount = families.map(f => ({
      _id: f._id,
      name: f.name,
      code: f.code,
      categoryId: (f.categoryId?._id || f.categoryId)?.toString() || null,
      productCount: products.filter(p => p.family === f.name).length
    }));

    const subFamiliesWithCount = subFamilies.map(sf => ({
      _id: sf._id,
      name: sf.name,
      code: sf.code,
      familyId: (sf.familyId?._id || sf.familyId)?.toString() || null,
      productCount: products.filter(p => p.subFamily === sf.name).length
    }));

    res.status(200).json({
      departments: deptsWithCount,
      sections: categoriesWithCount, // Category acts as Section
      families: familiesWithCount,
      subFamilies: subFamiliesWithCount,
      totalProducts: products.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching catalog hierarchy', error: error.message });
  }
};

// @desc    Get full EcomSettings including mappings (Admin)
// @route   GET /api/v1/ecommerce/admin/settings
exports.getAdminEcomSettings = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    let settings = await EcomSettings.findOne({ tenantId });
    if (!settings) {
      settings = await EcomSettings.create({ tenantId });
    }
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching ecommerce settings', error: error.message });
  }
};

// @desc    Update full EcomSettings including mappings (Admin)
// @route   PUT /api/v1/ecommerce/admin/settings
exports.updateAdminEcomSettings = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    const settings = await EcomSettings.findOneAndUpdate(
      { tenantId },
      { $set: req.body },
      { returnDocument: 'after', upsert: true, runValidators: true }
    );
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Error updating ecommerce settings', error: error.message });
  }
};

// ==========================================
// 4. PRODUCT MEDIA & ECOMMERCE ATTRIBUTES
// ==========================================

// @desc    Get products list with media & ecommerce details (Admin)
// @route   GET /api/v1/ecommerce/admin/products
exports.getAdminProducts = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    const {
      search,
      department,
      category,
      isPublished,
      page = 1,
      limit = 50
    } = req.query;

    const query = { tenantId, isActive: true };
    if (search) {
      const reg = new RegExp(search.trim(), 'i');
      query.$or = [{ name: reg }, { sku: reg }, { barcode: reg }, { brand: reg }];
    }
    if (department) query.department = department;
    if (category) query.categoryId = category;
    if (isPublished !== undefined && isPublished !== '') {
      query.isPublishedToEcommerce = isPublished === 'true';
    }

    // AUTOMATICALLY FILTER BY THE COMPANIES & BRANCHES SELECTED IN E-COMMERCE SETTINGS
    const scope = await resolveEcomActiveScope(tenantId);

    if (scope.hasActiveScope) {
      let allowedIds = new Set();

      if (scope.mappedBranchIds.length > 0) {
        // 1. Products that have stock in the active/mapped branches
        const scopeStockProductIds = await Stock.distinct('productId', {
          tenantId,
          branchId: { $in: scope.mappedBranchIds }
        });
        scopeStockProductIds.forEach(id => allowedIds.add(id.toString()));

        // 2. Also include products explicitly assigned to these branches or companies (so admin can configure media/photos even before stock arrives)
        const branchAssignedProds = await Product.find({
          tenantId,
          isActive: true,
          $or: [
            { branchIds: { $in: scope.mappedBranchIds } },
            { companyIds: { $in: scope.mappedCompanyIds } }
          ]
        }).select('_id');
        branchAssignedProds.forEach(p => allowedIds.add(p._id.toString()));
      } else if (scope.mappedCompanyIds.length > 0) {
        // If company is selected without specific branch restrictions
        const compBranches = await Branch.find({
          tenantId,
          legalCompanyId: { $in: scope.mappedCompanyIds },
          isActive: { $ne: false }
        }).distinct('_id');

        const companyStockProductIds = await Stock.distinct('productId', {
          tenantId,
          branchId: { $in: compBranches }
        });
        companyStockProductIds.forEach(id => allowedIds.add(id.toString()));

        const legalCompanies = await LegalCompany.find({ _id: { $in: scope.mappedCompanyIds } }).select('name');
        const compNames = legalCompanies.map(c => c.name).filter(Boolean);
        if (compNames.length > 0) {
          const directCompProds = await Product.find({ tenantId, company: { $in: compNames }, isActive: true }).select('_id');
          directCompProds.forEach(p => allowedIds.add(p._id.toString()));
        }
      }

      query._id = { $in: Array.from(allowedIds).map(id => new mongoose.Types.ObjectId(id)) };
    } else {
      // If no company or branch is enabled in E-Commerce Settings, return empty
      query._id = { $in: [] };
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .select('name sku barcode brand price salesPrice uploadImage images color size colorGalleries hasVariants variantAttributeDefinitions isPublishedToEcommerce isFeatured isBestSeller isTrending isDealOfTheDay isNewArrival ecommerceBadge longDescription specifications features department categoryId family subFamily company location')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    // Attach stock and branch info for each product
    const productIds = products.map(p => p._id);
    const stocks = await Stock.find({
      tenantId,
      productId: { $in: productIds },
      ...(scope.hasActiveScope ? { branchId: { $in: scope.mappedBranchIds } } : {})
    })
      .populate('branchId', 'name')
      .lean();

    const stockMap = new Map();
    stocks.forEach(s => {
      const pid = s.productId.toString();
      if (!stockMap.has(pid)) stockMap.set(pid, []);
      if (s.branchId) {
        stockMap.get(pid).push({
          branchId: s.branchId._id,
          branchName: s.branchId.name,
          quantity: s.quantity || 0
        });
      }
    });

    const productsWithStock = products.map(p => {
      const branchesStock = stockMap.get(p._id.toString()) || [];
      const totalStock = branchesStock.reduce((sum, b) => sum + b.quantity, 0);
      return {
        ...p,
        totalStock,
        branchesStock
      };
    });

    res.status(200).json({
      products: productsWithStock,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products for ecommerce media', error: error.message });
  }
};

// @desc    Update product multiple images, long description & specifications (Admin)
// @route   PUT /api/v1/ecommerce/admin/products/:id
exports.updateAdminProductMedia = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    const {
      uploadImage,
      images,
      longDescription,
      specifications,
      features,
      isPublishedToEcommerce,
      isFeatured,
      isBestSeller,
      isTrending,
      isDealOfTheDay,
      isNewArrival,
      ecommerceBadge,
      isReturnable,
      isExchangeable,
      returnPolicyType,
      returnWindowDays,
      nonReturnableReason,
      color,
      size,
      colorGalleries,
      variants
    } = req.body;

    const updated = await Product.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      {
        $set: {
          ...(uploadImage !== undefined && { uploadImage }),
          ...(images !== undefined && { images }),
          ...(longDescription !== undefined && { longDescription }),
          ...(specifications !== undefined && { specifications }),
          ...(features !== undefined && { features }),
          ...(isPublishedToEcommerce !== undefined && { isPublishedToEcommerce }),
          ...(isFeatured !== undefined && { isFeatured }),
          ...(isBestSeller !== undefined && { isBestSeller }),
          ...(isTrending !== undefined && { isTrending }),
          ...(isDealOfTheDay !== undefined && { isDealOfTheDay }),
          ...(isNewArrival !== undefined && { isNewArrival }),
          ...(ecommerceBadge !== undefined && { ecommerceBadge }),
          ...(isReturnable !== undefined && { isReturnable }),
          ...(isExchangeable !== undefined && { isExchangeable }),
          ...(returnPolicyType !== undefined && { returnPolicyType }),
          ...(returnWindowDays !== undefined && { returnWindowDays }),
          ...(nonReturnableReason !== undefined && { nonReturnableReason }),
          ...(color !== undefined && { color }),
          ...(size !== undefined && { size }),
          ...(colorGalleries !== undefined && { colorGalleries })
        }
      },
      { returnDocument: 'after' }
    );

    if (!updated) return res.status(404).json({ message: 'Product not found' });

    // Synchronize variant-specific images:
    // Update variants that have images, and clear images for variants whose images were removed
    const activeVariantIdsWithImages = new Set();
    if (Array.isArray(variants) && variants.length > 0) {
      for (const v of variants) {
        if (v._id && mongoose.isValidObjectId(v._id)) {
          const vUpdate = {};
          if (v.uploadImage !== undefined) vUpdate.uploadImage = v.uploadImage;
          if (v.images !== undefined) vUpdate.images = v.images;
          if (v.salesPrice !== undefined) vUpdate.salesPrice = v.salesPrice;
          if (Object.keys(vUpdate).length > 0) {
            await ProductVariant.updateOne(
              { _id: v._id, productId: updated._id, tenantId },
              { $set: vUpdate }
            );
            if (v.uploadImage || (Array.isArray(v.images) && v.images.length > 0)) {
              activeVariantIdsWithImages.add(String(v._id));
            }
          }
        }
      }
    }

    // Clear images for any variant that had its images deleted or was not included
    await ProductVariant.updateMany(
      { productId: updated._id, tenantId, _id: { $nin: Array.from(activeVariantIdsWithImages) } },
      { $set: { uploadImage: null, images: [] } }
    );

    // Synchronize disk files: remove any orphaned or deleted files from filesystem
    try {
      const pDir = path.join(__dirname, '../../../uploads/products', tenantId.toString(), updated._id.toString());
      if (fs.existsSync(pDir)) {
        const retainedFiles = new Set();
        const extractBaseName = (url) => {
          if (!url || typeof url !== 'string') return;
          const clean = url.split('?')[0].split('#')[0];
          const base = path.basename(clean);
          if (base) retainedFiles.add(base);
        };

        if (uploadImage) extractBaseName(uploadImage);
        if (Array.isArray(images)) images.forEach(extractBaseName);
        if (Array.isArray(colorGalleries)) {
          colorGalleries.forEach(cg => {
            if (cg.uploadImage) extractBaseName(cg.uploadImage);
            if (Array.isArray(cg.images)) cg.images.forEach(extractBaseName);
          });
        }
        if (Array.isArray(variants)) {
          variants.forEach(v => {
            if (v.uploadImage) extractBaseName(v.uploadImage);
            if (Array.isArray(v.images)) v.images.forEach(extractBaseName);
          });
        }

        const diskFiles = fs.readdirSync(pDir);
        for (const file of diskFiles) {
          if (!retainedFiles.has(file)) {
            try {
              fs.unlinkSync(path.join(pDir, file));
            } catch (err) {
              console.error(`Failed to unlink file ${file}:`, err.message);
            }
          }
        }
      }
    } catch (diskErr) {
      console.error('Disk synchronization error on updateAdminProductMedia:', diskErr.message);
    }

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating product media details', error: error.message });
  }
};

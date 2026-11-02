const Product = require('../../core/models/Product');
const ProductVariant = require('../../core/models/ProductVariant');
const Order = require('../../core/models/Order');
const OrderItem = require('../../core/models/OrderItem');
const Stock = require('../../core/models/Stock');
const Branch = require('../../core/models/Branch');
const ItemDepartment = require('../../core/models/ItemDepartment');
const Category = require('../../core/models/Category');
const Family = require('../../core/models/Family');
const SubFamily = require('../../core/models/SubFamily');
const Size = require('../../core/models/Size');
const Color = require('../../core/models/Color');
const Customer = require('../../core/models/Customer');
const Review = require('../../core/models/Review');
const Coupon = require('../../core/models/Coupon');
const EcomStatus = require('../../core/models/EcomStatus');
const EcomLogistics = require('../../core/models/EcomLogistics');
const Company = require('../../core/models/Company');
const LegalCompany = require('../../core/models/LegalCompany');
const EcomSettings = require('../../core/models/EcomSettings');
const PaymentTransaction = require('../../core/models/PaymentTransaction');
const { getEcomSettings, resolveEcomActiveScope, calculateProductEcomStock, allocateAndDeductStock } = require('./ecomStockService');
const { seedEcomMastersIfEmpty } = require('./ecomSeedHelper');
const { sendOrderConfirmationEmail, sendReturnPickupOtpEmail } = require('../../services/emailService');
const { createPayment } = require('./payments/paymentService');
const AutoPostingService = require('../../services/autoPostingService');
const mongoose = require('mongoose');
const { createHash, randomBytes } = require('crypto');
const fs = require('fs');
const path = require('path');

const hashTrackingToken = (token) => createHash('sha256').update(token).digest('hex');

const normalizeMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  url = url.trim();
  if (!url || url === 'null' || url === 'undefined') return null;
  if (url.includes('/uploads/')) return url.substring(url.indexOf('/uploads/'));
  if (url.startsWith('uploads/')) return '/' + url;
  return url;
};

const resolveProductMedia = (p, tenantId) => {
  const rawImages = Array.isArray(p.images) ? p.images : [];
  let images = rawImages.map(normalizeMediaUrl).filter(Boolean);
  let uploadImage = normalizeMediaUrl(p.uploadImage) || (images.length > 0 ? images[0] : null);

  // If uploadImage is present but not in images array, prepend it
  if (uploadImage && !images.includes(uploadImage)) {
    images = [uploadImage, ...images];
  }

  return { uploadImage: uploadImage || null, images };
};

const restoreFulfillmentStock = async (tenantId, fulfillments = []) => {
  await Promise.all(fulfillments.map(async item => {
    if (item.stockId) {
      return Stock.findByIdAndUpdate(item.stockId, { $inc: { quantity: item.quantity } });
    }
    if (item.productId && item.branchId) {
      return Stock.findOneAndUpdate(
        { tenantId, productId: item.productId, branchId: item.branchId },
        { $inc: { quantity: item.quantity } }
      );
    }
  }));
};

exports.getStorefrontConfig = async (req, res) => {
  try {
    const settings = await getEcomSettings(req.tenantId);
    res.status(200).json({
      storeName: settings.storeName || 'Online Store',
      storeEmail: settings.storeEmail || 'orders@store.com',
      supportPhone: settings.supportPhone || '',
      currency: settings.currency || 'INR',
      currencySymbol: settings.currencySymbol || '₹',
      shippingCharge: Number(settings.shippingCharge || 0),
      freeShippingThreshold: Number(settings.freeShippingThreshold || 0),
      allowReturns: settings.allowReturns,
      returnWindowDays: settings.returnWindowDays,
      paymentMethods: ['COD', 'ONLINE'],
      onlinePaymentMode: 'DEMO'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.quoteCheckout = async (req, res) => {
  try {
    if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty.' });
    }

    const quantities = new Map();
    for (const item of req.body.items) {
      if (!mongoose.isValidObjectId(item.productId)) {
        return res.status(400).json({ message: 'One or more cart items are invalid.' });
      }
      if (item.variantId && !mongoose.isValidObjectId(item.variantId)) {
        return res.status(400).json({ message: 'One or more selected variants are invalid.' });
      }
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ message: 'Cart quantities must be whole numbers above zero.' });
      }
      const key = item.variantId ? `${item.productId}_${item.variantId}` : String(item.productId);
      if (!quantities.has(key)) {
        quantities.set(key, {
          productId: String(item.productId),
          variantId: item.variantId ? String(item.variantId) : null,
          quantity: 0
        });
      }
      quantities.get(key).quantity += quantity;
    }

    if ([...quantities.values()].some(item => item.quantity > 100)) {
      return res.status(400).json({ message: 'A maximum of 100 units per product can be ordered online.' });
    }

    const settings = await getEcomSettings(req.tenantId);
    const items = [];
    let subtotalAmount = 0;
    let taxAmount = 0;
    for (const item of quantities.values()) {
      const product = await Product.findOne({ _id: item.productId, tenantId: req.tenantId, isActive: true });
      if (!product) return res.status(400).json({ message: 'A product in your cart is no longer available.' });

      let variant = null;
      let unitPrice = product.salesPrice > 0 ? product.salesPrice : product.price;
      let displayName = product.name;
      let sku = product.sku;

      const hasActualVariants = product.hasVariants && Boolean(await ProductVariant.exists({ productId: product._id, tenantId: req.tenantId, isActive: true }));
      if (hasActualVariants) {
        if (!item.variantId) {
          return res.status(400).json({ message: `Please select a valid variant (color/size) for "${product.name}".` });
        }
        variant = await ProductVariant.findOne({
          _id: item.variantId,
          productId: product._id,
          tenantId: req.tenantId,
          isActive: true
        });
        if (!variant) {
          return res.status(400).json({ message: `The selected variant for "${product.name}" is no longer available.` });
        }
        if (variant.salesPrice != null && variant.salesPrice > 0) {
          unitPrice = variant.salesPrice;
        }
        sku = variant.sku;
      }

      const stock = await calculateProductEcomStock(product._id, req.tenantId, settings, variant?._id);
      if (item.quantity > stock.totalEcomStock) {
        return res.status(409).json({
          message: `${displayName} (${sku}) only has ${stock.totalEcomStock} units in stock. Please adjust your cart quantity.`,
          productId: item.productId,
          variantId: item.variantId,
          availableStock: stock.totalEcomStock
        });
      }

      const subTotal = unitPrice * item.quantity;
      const taxRate = Number(product.taxRate || 0);
      const itemTaxAmount = (subTotal * taxRate) / 100;
      subtotalAmount += subTotal;
      taxAmount += itemTaxAmount;
      items.push({
        productId: item.productId,
        variantId: item.variantId || null,
        variantSku: sku,
        quantity: item.quantity,
        name: displayName,
        unitPrice,
        subTotal,
        taxRate,
        taxAmount: itemTaxAmount
      });
    }

    const shippingAmount = settings.freeShippingThreshold > 0 && subtotalAmount >= settings.freeShippingThreshold
      ? 0
      : Number(settings.shippingCharge || 0);
    res.status(200).json({
      items,
      currency: settings.currency || 'INR',
      subtotalAmount,
      taxAmount,
      shippingAmount,
      totalAmount: subtotalAmount + taxAmount + shippingAmount,
      freeShippingThreshold: Number(settings.freeShippingThreshold || 0)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Validate cart stock in real-time and return available inventory for each item
// @route   POST /api/v1/ecommerce/cart/validate
// @access  Public
exports.validateCartStock = async (req, res) => {
  try {
    if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
      return res.status(200).json({ valid: true, items: [] });
    }

    const settings = await getEcomSettings(req.tenantId);
    const validatedItems = [];
    let hasOverStock = false;

    for (const item of req.body.items) {
      if (!item || !mongoose.isValidObjectId(item.productId)) continue;
      const variantId = item.variantId && mongoose.isValidObjectId(item.variantId) ? item.variantId : null;
      const requestedQty = Number(item.quantity) || 1;

      const product = await Product.findOne({ _id: item.productId, tenantId: req.tenantId, isActive: true });
      if (!product) {
        validatedItems.push({
          productId: String(item.productId),
          variantId: variantId ? String(variantId) : null,
          itemKey: item.itemKey || (variantId ? `${item.productId}_${variantId}` : String(item.productId)),
          availableStock: 0,
          inStock: false,
          requestedQty,
          maxAllowed: 0,
          exceeds: true,
          removed: true,
          message: 'Product no longer available'
        });
        hasOverStock = true;
        continue;
      }

      let variant = null;
      if (variantId) {
        variant = await ProductVariant.findOne({ _id: variantId, productId: product._id, tenantId: req.tenantId, isActive: true });
      }

      const stock = await calculateProductEcomStock(product._id, req.tenantId, settings, variant?._id);
      const availableStock = Math.max(0, stock.totalEcomStock || 0);
      const exceeds = requestedQty > availableStock;
      if (exceeds) hasOverStock = true;

      validatedItems.push({
        productId: String(item.productId),
        variantId: variantId ? String(variantId) : null,
        itemKey: item.itemKey || (variantId ? `${item.productId}_${variantId}` : String(item.productId)),
        sku: variant?.sku || product.sku,
        name: product.name,
        availableStock,
        inStock: availableStock > 0,
        requestedQty,
        maxAllowed: Math.min(availableStock, 100),
        exceeds
      });
    }

    res.status(200).json({
      valid: !hasOverStock,
      items: validatedItems
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get complete category & item hierarchy tree (Department > Category > Family > Sub-family)
// @route   GET /api/v1/ecommerce/categories
// @access  Public
exports.getCategoriesTree = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    // Check if mappings exist in EcomSettings
    const settings = await EcomSettings.findOne({ tenantId }).lean();
    const scope = await resolveEcomActiveScope(tenantId, settings);

    // If NO company and NO branch is selected/enabled, return empty category tree
    if (!scope.hasActiveScope) {
      return res.status(200).json({
        departments: [],
        sections: [],
        categories: [],
        families: []
      });
    }

    const mappedDepts = (settings?.mappedDepartments || []).map(d => (d?._id || d)?.toString()).filter(Boolean);
    const mappedCats = (settings?.mappedCategories || []).map(c => (c?._id || c)?.toString()).filter(Boolean);
    const mappedFams = (settings?.mappedFamilies || []).map(f => (f?._id || f)?.toString()).filter(Boolean);
    const mappedSubFams = (settings?.mappedSubFamilies || []).map(sf => (sf?._id || sf)?.toString()).filter(Boolean);

    const hasMapping = mappedDepts.length > 0 || mappedCats.length > 0 || mappedFams.length > 0 || mappedSubFams.length > 0;

    // If NO category/department is selected in settings, return empty category tree!
    if (!hasMapping) {
      return res.status(200).json({
        departments: [],
        sections: [],
        categories: [],
        families: [],
        subFamilies: []
      });
    }

    // Allowed products in the enabled branches/companies
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

    let [departments, categories, families, subFamilies, products] = await Promise.all([
      ItemDepartment.find({ tenantId, isActive: { $ne: false } }).sort({ name: 1 }).lean(),
      Category.find({ tenantId, isActive: { $ne: false } }).sort({ name: 1 }).lean(),
      Family.find({ tenantId, isActive: { $ne: false } }).sort({ name: 1 }).lean(),
      SubFamily.find({ tenantId, isActive: { $ne: false } }).sort({ name: 1 }).lean(),
      Product.find({
        tenantId,
        isActive: true,
        isPublishedToEcommerce: { $ne: false },
        $or: allowedProductFilters
      }).select('department categoryId family subFamily').lean()
    ]);

    // Compute active in-stock product hierarchy sets
    const activeProductCatIds = new Set(products.map(p => p.categoryId?.toString()).filter(Boolean));
    const activeProductDeptNames = new Set(products.map(p => p.department).filter(Boolean));
    const activeProductFamNames = new Set(products.map(p => p.family).filter(Boolean));
    const activeProductSubFamNames = new Set(products.map(p => p.subFamily).filter(Boolean));

    // Categories: include if mappedCats is empty, or explicitly mapped, or has active in-stock published products
    if (mappedCats.length > 0) {
      categories = categories.filter(c =>
        mappedCats.includes(c._id.toString()) ||
        mappedCats.includes(c.name) ||
        mappedCats.includes(c.code) ||
        activeProductCatIds.has(c._id.toString()) ||
        activeProductDeptNames.has(c.name)
      );
    }

    // Departments: must be explicitly mapped OR parent of an active category OR has active in-stock published products
    const activeCatDeptIds = new Set(categories.map(c => (c.itemDepartmentId || c.departmentId)?.toString()).filter(Boolean));
    const activeCatDeptNames = new Set(categories.map(c => c.department).filter(Boolean));

    departments = departments.filter(d =>
      mappedDepts.length === 0 ||
      mappedDepts.includes(d._id.toString()) ||
      mappedDepts.includes(d.name) ||
      mappedDepts.includes(d.code) ||
      activeCatDeptIds.has(d._id.toString()) ||
      activeCatDeptNames.has(d.name) ||
      activeProductDeptNames.has(d.name)
    );

    const activeCatIdSet = new Set(categories.map(c => c._id.toString()));

    if (mappedFams.length > 0) {
      families = families.filter(f =>
        mappedFams.includes(f.name) ||
        mappedFams.includes(f._id.toString()) ||
        (f.categoryId && activeCatIdSet.has(f.categoryId.toString())) ||
        activeProductFamNames.has(f.name)
      );
    }

    const activeFamIdSet = new Set(families.map(f => f._id.toString()));

    if (mappedSubFams.length > 0) {
      subFamilies = subFamilies.filter(sf =>
        mappedSubFams.includes(sf.name) ||
        mappedSubFams.includes(sf._id.toString()) ||
        (sf.familyId && activeFamIdSet.has(sf.familyId.toString())) ||
        activeProductSubFamNames.has(sf.name)
      );
    }

    // Only count products matching the enabled categories and departments
    const allowedCatIdSet = new Set(categories.map(c => c._id.toString()));
    const allowedDeptNameSet = new Set(departments.map(d => d.name));

    products = products.filter(p =>
      (p.categoryId && allowedCatIdSet.has(p.categoryId.toString())) ||
      (p.department && allowedDeptNameSet.has(p.department))
    );

    // Return complete 4-tier hierarchical tree (Department > Section/Category > Family > Sub-family)
    const tree = {
      departments: departments.map(d => ({
        _id: d._id,
        name: d.name,
        code: d.code,
        productCount: products.filter(p => p.department === d.name).length
      })),
      sections: categories.map(c => ({
        _id: c._id,
        name: c.name,
        code: c.code,
        departmentId: c.itemDepartmentId || c.departmentId,
        productCount: products.filter(p => p.categoryId?.toString() === c._id.toString() || p.department === c.name).length
      })),
      categories: categories.map(c => ({
        _id: c._id,
        name: c.name,
        code: c.code,
        departmentId: c.itemDepartmentId || c.departmentId,
        productCount: products.filter(p => p.categoryId?.toString() === c._id.toString() || p.department === c.name).length
      })),
      families: families.map(f => {
        const matchingSub = subFamilies.filter(sf => sf.familyId?.toString() === f._id.toString());
        return {
          _id: f._id,
          name: f.name,
          code: f.code,
          categoryId: f.categoryId,
          productCount: products.filter(p => p.family === f.name).length,
          subFamilies: matchingSub.map(sf => ({
            _id: sf._id,
            name: sf.name,
            code: sf.code,
            productCount: products.filter(p => p.subFamily === sf.name).length
          }))
        };
      })
    };

    res.status(200).json(tree);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get public product catalog with dynamic safety-stock calculation
// @route   GET /api/v1/ecommerce/products
// @access  Public
exports.getPublicProducts = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const settings = await getEcomSettings(tenantId);
    const scope = await resolveEcomActiveScope(tenantId, settings);

    // If NO company and NO branch is selected/enabled, return empty catalog!
    if (!scope.hasActiveScope) {
      return res.status(200).json({
        products: [],
        total: 0,
        page: Number(req.query.page || 1),
        pages: 0,
        facets: { brands: [], departments: [], priceRange: { min: 0, max: 0 } },
        message: 'No branches or companies are currently enabled for e-commerce.'
      });
    }

    const {
      search,
      department,
      category,
      family,
      subFamily,
      brand,
      color,
      size,
      inStock,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 24
    } = req.query;

    // Collect allowed product IDs from the enabled branches
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

    // Fetch active categories and departments for tenant to properly resolve names <-> ObjectIds
    const [allDepts, allCats, allFams, allSubFams] = await Promise.all([
      ItemDepartment.find({ tenantId, isActive: { $ne: false } }).select('_id name code').lean(),
      Category.find({ tenantId, isActive: { $ne: false } }).select('_id name code itemDepartmentId departmentId department').lean(),
      Family.find({ tenantId, isActive: { $ne: false } }).select('_id name code categoryId').lean(),
      SubFamily.find({ tenantId, isActive: { $ne: false } }).select('_id name code familyId').lean()
    ]);

    // Active in-stock products hierarchy coverage
    const activeProductsHierarchy = await Product.find({
      tenantId,
      isActive: true,
      isPublishedToEcommerce: { $ne: false },
      $or: allowedProductFilters
    }).select('department categoryId family subFamily').lean();

    const activeProdCatIds = new Set(activeProductsHierarchy.map(p => p.categoryId?.toString()).filter(Boolean));
    const activeProdDeptNames = new Set(activeProductsHierarchy.map(p => p.department).filter(Boolean));
    const activeProdFamNames = new Set(activeProductsHierarchy.map(p => p.family).filter(Boolean));
    const activeProdSubFamNames = new Set(activeProductsHierarchy.map(p => p.subFamily).filter(Boolean));

    // Active categories (explicitly mapped OR has active published in-stock products)
    const activeCategories = allCats.filter(c =>
      mappedCats.length === 0 ||
      mappedCats.includes(c._id.toString()) ||
      mappedCats.includes(c.name) ||
      mappedCats.includes(c.code) ||
      activeProdCatIds.has(c._id.toString()) ||
      activeProdDeptNames.has(c.name)
    );

    const activeCatDeptIds = new Set(activeCategories.map(c => (c.itemDepartmentId || c.departmentId)?.toString()).filter(Boolean));
    const activeCatDeptNames = new Set(activeCategories.map(c => c.department).filter(Boolean));

    // Active departments (explicitly mapped OR parent of active category OR has active published in-stock products)
    const activeDepartments = allDepts.filter(d =>
      mappedDepts.length === 0 ||
      mappedDepts.includes(d._id.toString()) ||
      mappedDepts.includes(d.name) ||
      mappedDepts.includes(d.code) ||
      activeCatDeptIds.has(d._id.toString()) ||
      activeCatDeptNames.has(d.name) ||
      activeProdDeptNames.has(d.name)
    );

    const activeCatIdSet = new Set(activeCategories.map(c => c._id.toString()));

    // Active families
    const activeFamilies = allFams.filter(f =>
      mappedFams.length === 0 ||
      mappedFams.includes(f.name) ||
      mappedFams.includes(f._id.toString()) ||
      (f.categoryId && activeCatIdSet.has(f.categoryId.toString())) ||
      activeProdFamNames.has(f.name)
    );

    const activeFamIdSet = new Set(activeFamilies.map(f => f._id.toString()));

    // Active sub-families
    const activeSubFamilies = allSubFams.filter(sf =>
      mappedSubFams.length === 0 ||
      mappedSubFams.includes(sf.name) ||
      mappedSubFams.includes(sf._id.toString()) ||
      (sf.familyId && activeFamIdSet.has(sf.familyId.toString())) ||
      activeProdSubFamNames.has(sf.name)
    );

    const hasMapping = mappedDepts.length > 0 || mappedCats.length > 0 || mappedFams.length > 0 || mappedSubFams.length > 0;

    // If mapping is enabled and nothing is active in the hierarchy, return empty catalog
    if (hasMapping && activeCategories.length === 0 && activeDepartments.length === 0) {
      return res.status(200).json({
        products: [],
        total: 0,
        page: Number(req.query.page || 1),
        pages: 0,
        facets: { brands: [], departments: [], priceRange: { min: 0, max: 0 } },
        message: 'No categories or departments are currently selected in Catalog Hierarchy Mapping.'
      });
    }

    const query = {
      tenantId,
      isActive: true,
      isPublishedToEcommerce: { $ne: false },
      $or: allowedProductFilters
    };

    // Filter products to active categories/departments/families/subfamilies
    const allowedCatObjIds = activeCategories.map(c => c._id);
    const allowedDeptNames = activeDepartments.map(d => d.name);
    const allowedFamNames = activeFamilies.map(f => f.name);
    const allowedSubFamNames = activeSubFamilies.map(sf => sf.name);

    const hierarchyConditions = [];
    if (allowedCatObjIds.length > 0) {
      hierarchyConditions.push({ categoryId: { $in: allowedCatObjIds } });
    }
    if (allowedDeptNames.length > 0) {
      hierarchyConditions.push({ department: { $in: allowedDeptNames } });
    }
    if (allowedFamNames.length > 0) {
      hierarchyConditions.push({ family: { $in: allowedFamNames } });
    }
    if (allowedSubFamNames.length > 0) {
      hierarchyConditions.push({ subFamily: { $in: allowedSubFamNames } });
    }

    if (hierarchyConditions.length > 0) {
      query.$and = query.$and || [];
      query.$and.push({ $or: hierarchyConditions });
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { name: searchRegex },
          { sku: searchRegex },
          { barcode: searchRegex },
          { brand: searchRegex },
          { description: searchRegex },
          { itemDescriptionDetails: searchRegex }
        ]
      });
    }

    if (department) query.department = department;
    if (category) {
      if (mongoose.isValidObjectId(category)) {
        query.categoryId = category;
      } else {
        const matchedCat = await Category.findOne({ tenantId, name: new RegExp(`^${category}$`, 'i') });
        if (matchedCat) {
          query.categoryId = matchedCat._id;
        } else {
          query.department = new RegExp(`^${category}$`, 'i');
        }
      }
    }
    if (family) query.family = family;
    if (subFamily) query.subFamily = subFamily;

    if (brand) {
      const brandList = Array.isArray(brand) ? brand : brand.split(',').map(b => b.trim()).filter(Boolean);
      if (brandList.length > 0) {
        query.brand = { $in: brandList.map(b => new RegExp(`^${b}$`, 'i')) };
      }
    }

    if (color) {
      const colorList = Array.isArray(color) ? color : color.split(',').map(c => c.trim()).filter(Boolean);
      if (colorList.length > 0) {
        query.color = { $in: colorList.map(c => new RegExp(`^${c}$`, 'i')) };
      }
    }

    if (size) {
      const sizeList = Array.isArray(size) ? size : size.split(',').map(s => s.trim()).filter(Boolean);
      if (sizeList.length > 0) {
        query.size = { $in: sizeList.map(s => new RegExp(`^${s}$`, 'i')) };
      }
    }

    if (minPrice || maxPrice) {
      query.salesPrice = {};
      if (minPrice) query.salesPrice.$gte = Number(minPrice);
      if (maxPrice) query.salesPrice.$lte = Number(maxPrice);
    }

    let sortOptions = { createdAt: -1 };
    if (sort === 'price_asc') sortOptions = { salesPrice: 1, price: 1 };
    else if (sort === 'price_desc') sortOptions = { salesPrice: -1, price: -1 };
    else if (sort === 'name_asc') sortOptions = { name: 1 };
    else if (sort === 'name_desc') sortOptions = { name: -1 };
    else if (sort === 'newest') sortOptions = { createdAt: -1 };
    else if (sort === 'popularity') sortOptions = { totalSold: -1, createdAt: -1 };

    const totalProducts = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('categoryId', 'name')
      .sort(sortOptions)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    // Attach dynamic e-com available stock to each product
    let productsWithStock = await Promise.all(products.map(async (p) => {
      const stockInfo = await calculateProductEcomStock(p._id, tenantId, settings);
      const isAvailable = stockInfo.totalEcomStock > 0;
      const media = resolveProductMedia(p, tenantId);
      let pUploadImage = media.uploadImage;
      let pImages = media.images;
      if (!pUploadImage && Array.isArray(p.colorGalleries) && p.colorGalleries.length > 0) {
        pUploadImage = normalizeMediaUrl(p.colorGalleries[0]?.uploadImage) || normalizeMediaUrl(p.colorGalleries[0]?.images?.[0]) || null;
        if (pImages.length === 0 && pUploadImage) {
          pImages = [pUploadImage];
        }
      }
      return {
        _id: p._id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        brand: p.brand,
        price: p.price,
        salesPrice: p.salesPrice > 0 ? p.salesPrice : p.price,
        uploadImage: pUploadImage,
        images: pImages,
        department: p.department,
        category: p.categoryId ? p.categoryId.name : p.department,
        family: p.family,
        subFamily: p.subFamily,
        type: p.type,
        color: p.color,
        size: p.size,
        hasVariants: Boolean(p.hasVariants),
        description: p.longDescription || p.itemDescriptionDetails || p.name,
        inStock: isAvailable,
        stockCount: stockInfo.totalEcomStock,
        limitedAvailability: isAvailable && stockInfo.totalEcomStock <= 5,
        rating: 4.2 + (Math.abs(p.name.charCodeAt(0) % 8) / 10),
        reviewCount: 12 + (Math.abs(p.name.charCodeAt(p.name.length - 1) % 150)),
        isBestSeller: Boolean(p.isBestSeller),
        isDealOfTheDay: Boolean(p.isDealOfTheDay),
        isFeatured: Boolean(p.isFeatured),
        isTrending: Boolean(p.isTrending),
        isNewArrival: Boolean(p.isNewArrival),
        ecommerceBadge: p.ecommerceBadge || '',
        createdAt: p.createdAt
      };
    }));

    if (inStock === 'true' || inStock === true) {
      productsWithStock = productsWithStock.filter(p => p.inStock);
    }

    // Facet calculation based on active filtered query
    let facets = { brands: [], departments: [], priceRange: { min: 0, max: 100000 } };
    try {
      const distinctBrands = await Product.distinct('brand', query);
      const distinctDepts = await Product.distinct('department', query);

      facets.brands = distinctBrands.filter(Boolean).map(b => ({
        name: b,
        count: products.filter(p => p.brand === b).length || 1
      }));
      facets.departments = distinctDepts.filter(Boolean).map(d => ({
        name: d,
        count: products.filter(p => p.department === d).length || 1
      }));

      const prices = productsWithStock.map(p => p.salesPrice).filter(p => typeof p === 'number' && !isNaN(p));
      if (prices.length > 0) {
        facets.priceRange = {
          min: Math.min(...prices),
          max: Math.max(...prices)
        };
      }
    } catch (facetErr) {
      console.warn('Facet aggregation warning:', facetErr.message);
    }

    res.status(200).json({
      products: productsWithStock,
      total: totalProducts,
      page: Number(page),
      pages: Math.ceil(totalProducts / Number(limit)),
      facets
    });
  } catch (error) {
    console.error('getPublicProducts error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single product details with stock and reviews
// @route   GET /api/v1/ecommerce/products/:id
// @access  Public
exports.getPublicProductById = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const settings = await getEcomSettings(tenantId);
    const scope = await resolveEcomActiveScope(tenantId, settings);

    if (!scope.hasActiveScope) {
      return res.status(404).json({ message: 'No fulfillment branches are currently enabled for online orders.' });
    }

    const product = await Product.findOne({ _id: req.params.id, tenantId, isActive: true, isPublishedToEcommerce: { $ne: false } })
      .populate('categoryId', 'name');

    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Verify product is in scope
    let isProductInScope = product.type === 'SERVICE';
    if (!isProductInScope) {
      const hasBranchStock = await Stock.exists({
        tenantId,
        productId: product._id,
        branchId: { $in: scope.mappedBranchIds }
      });
      if (hasBranchStock) isProductInScope = true;
    }
    if (!isProductInScope && scope.mappedBranchIds.length === 0 && scope.mappedCompanyIds.length > 0) {
      const legalCompanies = await LegalCompany.find({ _id: { $in: scope.mappedCompanyIds } }).select('name');
      const compNames = legalCompanies.map(c => c.name);
      if (compNames.includes(product.company)) isProductInScope = true;
    }

    if (!isProductInScope) {
      return res.status(404).json({ message: 'This item is not available in the currently enabled store branches.' });
    }

    const [stockInfo, reviews, activeColors, activeSizes] = await Promise.all([
      calculateProductEcomStock(product._id, req.tenantId, settings),
      Review.find({ productId: product._id, isApproved: true })
        .populate('customerId', 'firstName lastName name')
        .sort({ createdAt: -1 }),
      Color.find({ tenantId: req.tenantId, isActive: true }).select('name code').sort({ name: 1 }).lean(),
      Size.find({ tenantId: req.tenantId, isActive: true }).select('name code').sort({ name: 1 }).lean()
    ]);

    // Related products in same category/family (only from allowed scope)
    const relatedProducts = await Product.find({
      tenantId: req.tenantId,
      _id: { $ne: product._id },
      $or: [
        { family: product.family },
        { categoryId: product.categoryId }
      ],
      isActive: true,
      isPublishedToEcommerce: { $ne: false }
    }).limit(4).select('name sku salesPrice price uploadImage family');

    const media = resolveProductMedia(product, req.tenantId || product.tenantId);

    // Variants and Color Galleries Serialization
    let variants = [];
    let colorGalleries = Array.isArray(product.colorGalleries) ? product.colorGalleries.map(cg => ({
      colorId: cg.colorId || null,
      colorName: cg.colorName,
      colorCode: cg.colorCode || '',
      uploadImage: normalizeMediaUrl(cg.uploadImage),
      images: Array.isArray(cg.images) ? cg.images.map(normalizeMediaUrl).filter(Boolean) : []
    })) : [];

    let finalColors = [];
    let finalSizes = [];

    if (product.hasVariants) {
      const dbVariants = await ProductVariant.find({
        tenantId: req.tenantId,
        productId: product._id,
        isActive: true
      }).lean();

      variants = await Promise.all(dbVariants.map(async (v) => {
        const vStock = await calculateProductEcomStock(product._id, req.tenantId, settings, v._id);
        const effectivePrice = (v.salesPrice != null && v.salesPrice > 0)
          ? v.salesPrice
          : (product.salesPrice > 0 ? product.salesPrice : product.price);

        let plainAttrs = {};
        if (v.attributes instanceof Map) {
          plainAttrs = Object.fromEntries(v.attributes);
        } else if (v.attributes && typeof v.attributes === 'object') {
          plainAttrs = { ...v.attributes };
        }

        return {
          _id: v._id,
          sku: v.sku,
          barcode: v.barcode,
          attributes: plainAttrs,
          attributeSignature: v.attributeSignature,
          salesPrice: v.salesPrice,
          effectivePrice,
          uploadImage: v.uploadImage ? normalizeMediaUrl(v.uploadImage) : null,
          images: Array.isArray(v.images) ? v.images.map(normalizeMediaUrl).filter(Boolean) : [],
          inStock: vStock.totalEcomStock > 0,
          availableStock: vStock.totalEcomStock
        };
      }));

      if (variants.length > 0) {
        // 1. Inspect what attributes actually exist in the active variants
        const variantColorValues = new Set();
        const variantSizeValues = new Set();

        variants.forEach(v => {
          const attrs = v.attributes || {};
          // Check for Color
          const cVal = attrs.Color || attrs.color;
          if (cVal && typeof cVal === 'string' && cVal.trim()) {
            const clean = cVal.trim();
            if (!['none', 'n/a', 'na', '-', 'default'].includes(clean.toLowerCase())) {
              variantColorValues.add(clean);
            }
          }

          // Check for Size or any non-color variant attribute
          const sVal = attrs.Size || attrs.size;
          if (sVal && typeof sVal === 'string' && sVal.trim()) {
            const clean = sVal.trim();
            if (!['none', 'n/a', 'na', '-', 'default'].includes(clean.toLowerCase())) {
              variantSizeValues.add(clean);
            }
          }
          if (attrs && typeof attrs === 'object') {
            Object.entries(attrs).forEach(([attrKey, attrVal]) => {
              if (attrKey.toLowerCase() !== 'color' && typeof attrVal === 'string' && attrVal.trim()) {
                const clean = attrVal.trim();
                if (!['none', 'n/a', 'na', '-', 'default'].includes(clean.toLowerCase())) {
                  variantSizeValues.add(clean);
                }
              }
            });
          }
        });

        // 2. Only if active variants actually have Color attribute, build finalColors
        if (variantColorValues.size > 0) {
          const orderedColors = [];
          (product.variantAttributeDefinitions || []).forEach(def => {
            if (def.name && def.name.toLowerCase() === 'color' && Array.isArray(def.values)) {
              def.values.forEach(val => {
                if (val && variantColorValues.has(val.trim()) && !orderedColors.includes(val.trim())) {
                  orderedColors.push(val.trim());
                }
              });
            }
          });
          variantColorValues.forEach(c => {
            if (!orderedColors.includes(c)) orderedColors.push(c);
          });

          finalColors = orderedColors.map(cName => {
            const matched = activeColors.find(ac => ac.name && ac.name.toLowerCase() === cName.toLowerCase());
            const gallery = colorGalleries.find(cg => cg.colorName && cg.colorName.toLowerCase() === cName.toLowerCase());
            return {
              name: cName,
              code: matched?.code || gallery?.colorCode || '',
              hasGallery: Boolean(gallery && (gallery.uploadImage || gallery.images?.length > 0))
            };
          });
        } else {
          finalColors = [];
        }

        // 3. Only if active variants actually have Size attribute, build finalSizes
        if (variantSizeValues.size > 0) {
          const orderedSizes = [];
          (product.variantAttributeDefinitions || []).forEach(def => {
            if (def.name && def.name.toLowerCase() !== 'color' && Array.isArray(def.values)) {
              def.values.forEach(val => {
                if (val && variantSizeValues.has(val.trim()) && !orderedSizes.includes(val.trim())) {
                  orderedSizes.push(val.trim());
                }
              });
            }
          });
          variantSizeValues.forEach(s => {
            if (!orderedSizes.includes(s)) orderedSizes.push(s);
          });

          finalSizes = orderedSizes.map(sName => {
            const matched = activeSizes.find(as => as.name && as.name.toLowerCase() === sName.toLowerCase());
            return {
              name: sName,
              code: matched?.code || ''
            };
          });
        } else {
          finalSizes = [];
        }
      }
    } else {
      // Non-variant product: strictly no variant options
      finalColors = [];
      finalSizes = [];
    }

    const hasEffectiveVariants = Boolean(product.hasVariants && variants.length > 0);

    // Fallback: If no general uploadImage was uploaded, but colorGalleries has images,
    // fallback to the first color gallery's image as uploadImage and images
    let resolvedUploadImage = media.uploadImage;
    let resolvedImages = media.images;
    if (!resolvedUploadImage && colorGalleries.length > 0) {
      resolvedUploadImage = colorGalleries[0].uploadImage || colorGalleries[0].images[0] || null;
      if (resolvedImages.length === 0 && resolvedUploadImage) {
        resolvedImages = [resolvedUploadImage, ...(colorGalleries[0].images || [])];
      }
    }

    // Available colors: include variant colors and all colors from colorGalleries
    let effectiveAvailableColors = [...finalColors];
    colorGalleries.forEach(cg => {
      if (cg.colorName && !effectiveAvailableColors.some(c => c.name.toLowerCase() === cg.colorName.toLowerCase())) {
        const matched = activeColors.find(ac => ac.name && ac.name.toLowerCase() === cg.colorName.toLowerCase());
        effectiveAvailableColors.push({
          name: cg.colorName,
          code: matched?.code || cg.colorCode || '',
          hasGallery: Boolean(cg.uploadImage || (cg.images && cg.images.length > 0))
        });
      }
    });

    res.status(200).json({
      product: {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        brand: product.brand,
        price: product.price,
        salesPrice: product.salesPrice > 0 ? product.salesPrice : product.price,
        uploadImage: resolvedUploadImage,
        images: resolvedImages,
        department: product.department,
        category: product.categoryId ? product.categoryId.name : product.department,
        family: product.family,
        subFamily: product.subFamily,
        color: product.color,
        size: product.size,
        hasVariants: hasEffectiveVariants || effectiveAvailableColors.length > 0,
        variantAttributeDefinitions: hasEffectiveVariants ? (product.variantAttributeDefinitions || []) : [],
        colorGalleries: colorGalleries,
        variants: hasEffectiveVariants ? variants : [],
        availableColors: effectiveAvailableColors,
        availableSizes: hasEffectiveVariants ? finalSizes : [],
        description: product.longDescription || product.itemDescriptionDetails || product.name,
        inStock: stockInfo.totalEcomStock > 0,
        limitedAvailability: stockInfo.totalEcomStock > 0 && stockInfo.totalEcomStock <= 5,
        isReturnable: product.isReturnable !== false,
        isExchangeable: product.isExchangeable !== false,
        returnPolicyType: product.returnPolicyType || 'RETURN_AND_EXCHANGE',
        returnWindowDays: product.returnWindowDays || settings.returnWindowDays || 7,
        nonReturnableReason: product.nonReturnableReason || ''
      },
      reviews,
      relatedProducts,
      settings: {
        currencySymbol: settings.currencySymbol || '$',
        allowReturns: settings.allowReturns,
        returnWindowDays: settings.returnWindowDays
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit customer order with priority stock deduction and confirmation email
// @route   POST /api/v1/ecommerce/checkout
// @access  Public / Customer
exports.submitWebOrder = async (req, res) => {
  let allocation;
  let order;
  let inventoryCommitted = false;
  try {
    // If customer token is passed in header, resolve customer
    let authCustomer = req.customer;
    if (!authCustomer && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      const token = req.headers.authorization.split(' ')[1];
      if (!token.startsWith('erp_')) {
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
          authCustomer = await Customer.findOne({ _id: decoded.id, tenantId: req.tenantId });
        } catch (e) { }
      }
    }

    const {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      shippingAddressObj,
      items,
      paymentMethod = 'COD',
      notes
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty' });
    }

    const isOnlinePayment = ['ONLINE', 'UPI', 'CARD', 'NETBANKING'].includes(paymentMethod);
    if (!['COD', 'ONLINE', 'UPI', 'CARD', 'NETBANKING'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Choose a supported payment method.' });
    }

    const itemQuantities = new Map();
    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!mongoose.isValidObjectId(item.productId) || !Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ message: 'One or more cart items are invalid.' });
      }
      if (item.variantId && !mongoose.isValidObjectId(item.variantId)) {
        return res.status(400).json({ message: 'One or more selected variants are invalid.' });
      }
      const key = item.variantId ? `${item.productId}_${item.variantId}` : String(item.productId);
      if (!itemQuantities.has(key)) {
        itemQuantities.set(key, {
          productId: String(item.productId),
          variantId: item.variantId ? String(item.variantId) : null,
          quantity: 0
        });
      }
      itemQuantities.get(key).quantity += quantity;
    }
    const checkoutItems = [...itemQuantities.values()];
    if (checkoutItems.some(item => item.quantity > 100)) {
      return res.status(400).json({ message: 'A maximum of 100 units per product can be ordered online.' });
    }

    const idempotencyKey = String(req.headers['idempotency-key'] || '').slice(0, 128);
    if (idempotencyKey) {
      const existingOrder = await Order.findOne({ tenantId: req.tenantId, idempotencyKey });
      if (existingOrder) {
        const priorTrackingToken = existingOrder.trackingUrl
          ? new URL(existingOrder.trackingUrl).searchParams.get('token')
          : null;
        return res.status(200).json({
          message: 'This checkout was already processed.',
          orderId: existingOrder._id,
          orderNumber: `WEB-${existingOrder._id.toString().slice(-6).toUpperCase()}`,
          totalAmount: existingOrder.totalAmount,
          currency: existingOrder.currency,
          paymentStatus: existingOrder.paymentStatus,
          trackingToken: priorTrackingToken,
          trackingUrl: existingOrder.trackingUrl
        });
      }
    }

    const finalEmail = (customerEmail || (authCustomer && authCustomer.email) || (typeof shippingAddress === 'object' && shippingAddress?.email))?.toLowerCase()?.trim();

    if (!finalEmail) {
      return res.status(400).json({ message: 'Email address is required for order booking' });
    }

    const finalName = customerName || (authCustomer && authCustomer.name) || (typeof shippingAddress === 'object' && (shippingAddress?.name || shippingAddress?.fullName)) || 'Customer';
    const finalPhone = customerPhone || (authCustomer && authCustomer.phone) || (typeof shippingAddress === 'object' && shippingAddress?.phone) || '';

    let formattedAddress = 'Standard Delivery';
    if (typeof shippingAddress === 'string') {
      formattedAddress = shippingAddress;
    } else if (shippingAddress && typeof shippingAddress === 'object') {
      formattedAddress = `${shippingAddress.name || shippingAddress.fullName || ''}, ${shippingAddress.addressLine1 || shippingAddress.street || ''}, ${shippingAddress.city || ''}, ${shippingAddress.state || ''} ${shippingAddress.postalCode || shippingAddress.zip || ''}`;
    } else if (shippingAddressObj) {
      formattedAddress = `${shippingAddressObj.fullName || ''}, ${shippingAddressObj.street || ''}, ${shippingAddressObj.city || ''}, ${shippingAddressObj.state || ''} ${shippingAddressObj.zip || ''}`;
    }

    const tenantId = req.tenantId;
    await seedEcomMastersIfEmpty(tenantId);
    const settings = await getEcomSettings(tenantId);
    const currency = settings.currency || 'INR';
    let subtotalAmount = 0;
    let taxAmount = 0;
    const orderItemsData = [];

    // Prices are always read from the ERP product records. The browser cannot
    // choose or override a product price at checkout.
    for (const item of checkoutItems) {
      const prod = await Product.findOne({ _id: item.productId, tenantId });
      if (!prod) throw new Error(`Product not found: ${item.productId}`);
      if (prod.isActive === false) throw new Error(`${prod.name} is no longer available.`);

      let variant = null;
      let unitPrice = prod.salesPrice > 0 ? prod.salesPrice : prod.price;
      let sku = prod.sku;

      const hasActualVariants = prod.hasVariants && Boolean(await ProductVariant.exists({ productId: prod._id, tenantId, isActive: true }));
      if (hasActualVariants) {
        if (!item.variantId) {
          throw new Error(`Please select a valid variant (color/size) for "${prod.name}".`);
        }
        variant = await ProductVariant.findOne({
          _id: item.variantId,
          productId: prod._id,
          tenantId,
          isActive: true
        });
        if (!variant) throw new Error(`The selected variant for "${prod.name}" is no longer available.`);
        if (variant.salesPrice != null && variant.salesPrice > 0) {
          unitPrice = variant.salesPrice;
        }
        sku = variant.sku;
      }

      if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error(`${prod.name} has an invalid price.`);
      const subTotal = unitPrice * item.quantity;
      const taxRate = Number(prod.taxRate || 0);
      const itemTaxAmount = (subTotal * taxRate) / 100;
      subtotalAmount += subTotal;
      taxAmount += itemTaxAmount;

      orderItemsData.push({
        tenantId,
        productId: prod._id,
        variantId: variant ? variant._id : null,
        variantSku: variant ? variant.sku : undefined,
        selectedAttributes: variant ? (variant.attributes instanceof Map ? Object.fromEntries(variant.attributes) : variant.attributes) : undefined,
        quantity: item.quantity,
        unitPrice,
        subTotal,
        taxRate,
        taxAmount: itemTaxAmount,
        name: prod.name,
        sku
      });
    }

    const shippingAmount = settings.freeShippingThreshold > 0 && subtotalAmount >= settings.freeShippingThreshold
      ? 0
      : Number(settings.shippingCharge || 0);
    const totalAmount = subtotalAmount + taxAmount + shippingAmount;

    // 3. Find Initial Ecom Status (ORDER_PLACED)
    const initialStatus = await EcomStatus.findOne({
      tenantId,
      code: 'ORDER_PLACED'
    }) || await EcomStatus.findOne({ tenantId }).sort({ order: 1 });

    // Link customer if token is passed or matching email exists
    let customerId = (authCustomer && authCustomer._id) || req.customer?._id;
    if (!customerId && finalEmail) {
      const existingCustomer = await Customer.findOne({ email: finalEmail, tenantId });
      if (existingCustomer) customerId = existingCustomer._id;
    }

    const trackingToken = randomBytes(32).toString('hex');
    const trackingUrl = `${process.env.STOREFRONT_URL || 'http://localhost:5174'}/track?token=${trackingToken}`;
    // Atomic location-level deductions protect against two checkouts consuming
    // the same units. If persistence fails, the catch path restores this allocation.
    allocation = await allocateAndDeductStock(checkoutItems, tenantId);
    order = new Order({
      tenantId,
      branchId: allocation.primaryBranchId,
      source: 'WEB',
      customerName: finalName,
      customerEmail: finalEmail,
      customerPhone: finalPhone,
      customerId: customerId || null,
      shippingAddress: formattedAddress,
      shippingAddressObj: shippingAddressObj || null,
      subtotalAmount,
      taxAmount,
      shippingAmount,
      totalAmount,
      currency,
      paymentMethod,
      paymentStatus: isOnlinePayment ? 'PENDING' : 'UNPAID',
      paymentProvider: isOnlinePayment ? (process.env.PAYMENT_PROVIDER || 'DUMMY').toUpperCase() : 'MANUAL',
      trackingTokenHash: hashTrackingToken(trackingToken),
      trackingUrl,
      idempotencyKey: idempotencyKey || undefined,
      notes,
      status: 'ORDER_PLACED',
      ecomStatusId: initialStatus ? initialStatus._id : null,
      ecomStatusCode: initialStatus ? initialStatus.code : 'ORDER_PLACED',
      fulfillmentLocations: allocation.fulfillments,
      statusHistory: [{
        status: initialStatus ? initialStatus.name : 'Order Placed',
        statusCode: initialStatus ? initialStatus.code : 'ORDER_PLACED',
        note: 'Order booked by customer on storefront.',
        changedAt: new Date(),
        changedBy: finalName || 'Customer',
        emailSent: true
      }]
    });
    await order.save();
    await OrderItem.insertMany(orderItemsData.map(item => ({ ...item, orderId: order._id })));
    inventoryCommitted = true;

    let payment = null;
    if (isOnlinePayment) {
      const providerName = (process.env.PAYMENT_PROVIDER || 'DUMMY').toUpperCase();
      const transaction = await PaymentTransaction.create({
        tenantId,
        orderId: order._id,
        provider: providerName,
        method: paymentMethod,
        amount: totalAmount,
        currency,
        status: 'PENDING',
        idempotencyKey: `${order._id}-initial`,
      });
      try {
        const paymentResult = await createPayment({
          orderId: order._id,
          amount: totalAmount,
          currency,
          method: paymentMethod,
          idempotencyKey: `${order._id}-initial`
        });
        transaction.provider = paymentResult.providerName;
        transaction.status = paymentResult.status;
        transaction.providerOrderId = paymentResult.providerOrderId;
        transaction.providerPaymentId = paymentResult.providerPaymentId;
        transaction.metadata = paymentResult.metadata;
        await transaction.save();
        order.paymentStatus = paymentResult.status;
        order.paymentProvider = paymentResult.providerName;
        order.paymentReference = paymentResult.reference;
        await order.save();
        payment = {
          mode: 'DEMO',
          status: paymentResult.status,
          reference: paymentResult.reference,
          checkoutUrl: paymentResult.checkoutUrl || null,
          clientData: paymentResult.clientData || null,
          message: 'Demo payment only. No money was collected.',
          transactionId: transaction._id
        };
      } catch (paymentError) {
        console.error('Payment initialization failed:', paymentError.message);
        transaction.status = 'FAILED';
        transaction.metadata = { error: 'Payment initialization failed.' };
        await transaction.save();
        order.paymentStatus = 'FAILED';
        await order.save();
        payment = {
          mode: providerName,
          status: 'FAILED',
          message: 'The order was saved, but payment could not be initialized. Please contact support.',
          transactionId: transaction._id
        };
      }
    }

    // 7. Send Order Confirmation Email
    const company = await Company.findById(tenantId);
    const companyName = company ? company.name : 'JTS Online Store';

    try {
      await sendOrderConfirmationEmail({
        to: (finalEmail || order.customerEmail || '').toLowerCase().trim(),
        order,
        items: orderItemsData,
        customerName: finalName || order.customerName || 'Valued Customer',
        trackingUrl,
        companyName
      });
    } catch (emailErr) {
      console.warn('Order confirmation email failed or simulated:', emailErr.message);
    }

    // Trigger Double-Entry Auto-Posting (Dr. Gateway Clearing/Cash / Cr. E-Commerce Revenue + Tax)
    await AutoPostingService.postEcommerceOrder(order, req.customer?._id || null);

    res.status(201).json({
      message: 'Order booked successfully',
      orderId: order._id,
      orderNumber: `WEB-${order._id.toString().slice(-6).toUpperCase()}`,
      totalAmount,
      subtotalAmount,
      taxAmount,
      shippingAmount,
      currency,
      paymentStatus: order.paymentStatus,
      payment,
      trackingToken,
      trackingUrl,
      order: {
        _id: order._id,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        currency: order.currency,
        createdAt: order.createdAt
      }
    });

  } catch (error) {
    if (allocation && !inventoryCommitted) {
      try {
        await restoreFulfillmentStock(req.tenantId, allocation.fulfillments);
        if (order?._id) {
          await OrderItem.deleteMany({ orderId: order._id });
          await Order.deleteOne({ _id: order._id, tenantId: req.tenantId });
        }
      } catch (rollbackError) {
        console.error('Checkout rollback failed:', rollbackError.message);
      }
    }
    console.error('submitWebOrder error:', error);
    res.status(400).json({ message: error.message || 'Could not complete checkout.' });
  }
};

// @desc    Get all orders for the authenticated customer
// @route   GET /api/v1/ecommerce/orders
// @access  Private (Customer)
exports.getCustomerOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      customerId: req.customer._id,
      tenantId: req.customer.tenantId
    })
      .populate('ecomStatusId', 'name code color badgeVariant')
      .populate('carrierId', 'carrierName websiteUrl')
      .sort({ createdAt: -1 });

    // Populate order items for each order
    const populated = await Promise.all(orders.map(async (ord) => {
      const items = await OrderItem.find({ orderId: ord._id }).populate('productId', 'name sku uploadImage price');
      return {
        ...ord.toObject(),
        items
      };
    }));

    res.status(200).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single order details by ID (for Customer Portal or Guest Tracking)
// @route   GET /api/v1/ecommerce/orders/:id
// @access  Public / Customer
exports.getCustomerOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      customerId: req.customer._id,
      tenantId: req.customer.tenantId
    })
      .populate('ecomStatusId', 'name code color badgeVariant')
      .populate('carrierId', 'carrierName websiteUrl');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    const items = await OrderItem.find({ orderId: order._id })
      .populate('productId', 'name sku uploadImage salesPrice price');

    const statuses = await EcomStatus.find({ tenantId: order.tenantId, isActive: true }).sort({ order: 1 });

    res.status(200).json({
      order,
      items,
      milestones: statuses
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.trackOrderByToken = async (req, res) => {
  try {
    const token = String(req.params.token || '');
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(404).json({ message: 'Tracking link is invalid or expired.' });
    }

    const order = await Order.findOne({ trackingTokenHash: hashTrackingToken(token), tenantId: req.tenantId })
      .populate('ecomStatusId', 'name code color badgeVariant')
      .populate('carrierId', 'carrierName websiteUrl');
    if (!order) return res.status(404).json({ message: 'Tracking link is invalid or expired.' });

    const items = await OrderItem.find({ orderId: order._id })
      .populate('productId', 'name sku uploadImage salesPrice price');
    const milestones = await EcomStatus.find({ tenantId: order.tenantId, isActive: true }).sort({ order: 1 });
    res.status(200).json({ order, items, milestones });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.trackOrderByDetails = async (req, res) => {
  try {
    const orderId = String(req.body.orderId || '').replace(/^WEB-/i, '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!mongoose.isValidObjectId(orderId) || !email) {
      return res.status(400).json({ message: 'Enter the full order ID and the email used at checkout.' });
    }

    const order = await Order.findOne({ _id: orderId, tenantId: req.tenantId, customerEmail: email })
      .select('_id createdAt status ecomStatusCode ecomStatusId carrier trackingNumber trackingUrl totalAmount currency paymentMethod paymentStatus')
      .populate('ecomStatusId', 'name code color badgeVariant');
    if (!order) return res.status(404).json({ message: 'Order not found. Check the order ID and email.' });

    const items = await OrderItem.find({ orderId: order._id })
      .select('productId quantity unitPrice subTotal')
      .populate('productId', 'name sku uploadImage salesPrice price');
    res.status(200).json({ order, items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel order (Customer action)
// @route   POST /api/v1/ecommerce/orders/:id/cancel
// @access  Private (Customer)
exports.cancelCustomerOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findOne({
      _id: req.params.id,
      customerId: req.customer._id,
      tenantId: req.customer.tenantId
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });

    const settings = await getEcomSettings(req.customer.tenantId);
    if (settings.allowOrderCancellation === false) {
      return res.status(400).json({
        message: 'Order cancellation is not permitted online. Please contact support.'
      });
    }

    const defaultAllowed = ['ORDER_PLACED', 'PENDING', 'CONFIRMED'];
    const allowed = (Array.isArray(settings.cancellationAllowedStatuses) && settings.cancellationAllowedStatuses.length > 0)
      ? settings.cancellationAllowedStatuses
      : defaultAllowed;

    const currentStatus = (order.ecomStatusCode || order.status || '').toUpperCase();
    const isAllowed = allowed.map(s => String(s).toUpperCase()).includes(currentStatus);

    if (!isAllowed) {
      return res.status(400).json({
        message: `Orders with status '${order.status}' cannot be cancelled online. Please contact support.`
      });
    }

    // Restore stock to locations
    if (order.fulfillmentLocations && order.fulfillmentLocations.length > 0) {
      for (const fl of order.fulfillmentLocations) {
        if (fl.productId && fl.branchId) {
          await Stock.findOneAndUpdate(
            { tenantId: order.tenantId, productId: fl.productId, branchId: fl.branchId },
            { $inc: { quantity: fl.quantity } }
          );
        }
      }
    } else if (order.branchId) {
      const orderItems = await OrderItem.find({ orderId: order._id });
      for (const item of orderItems) {
        if (item.productId) {
          await Stock.findOneAndUpdate(
            { tenantId: order.tenantId, productId: item.productId, branchId: order.branchId },
            { $inc: { quantity: item.quantity } }
          );
        }
      }
    }

    const cancelStatus = await EcomStatus.findOne({
      tenantId: order.tenantId,
      code: 'CANCELLED'
    });

    order.status = 'CANCELLED';
    order.ecomStatusCode = 'CANCELLED';
    if (cancelStatus) order.ecomStatusId = cancelStatus._id;
    order.cancellationReason = reason || 'Customer requested cancellation';
    order.cancelledAt = new Date();
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: 'Cancelled',
      statusCode: 'CANCELLED',
      note: `Cancelled by customer. Reason: ${reason || 'N/A'}`,
      changedAt: new Date(),
      changedBy: req.customer.name || 'Customer',
      emailSent: false
    });

    await order.save();

    // Trigger Double-Entry Auto-Reversal
    await AutoPostingService.reverseSourceEntry(order._id, 'EcommerceOrder', order.tenantId, req.customer?._id || null);

    res.status(200).json({ message: 'Order cancelled successfully', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Request Return (Refund) or Exchange for an order
// @route   POST /api/v1/ecommerce/orders/:id/return
// @access  Private (Customer)
exports.requestOrderReturn = async (req, res) => {
  try {
    const {
      returnType = 'REFUND', // 'REFUND' | 'EXCHANGE'
      returnItem,
      returnReason,
      returnSubReason,
      returnImages,
      returnNotes,
      // Exchange Specifics:
      exchangeMode = 'SAME_ITEM_VARIANT', // 'SAME_ITEM_VARIANT' | 'DIFFERENT_PRODUCT'
      exchangeReplacement,
      exchangeItemDetails,
      exchangePriceDifference = 0,
      exchangeDifferenceAction = 'NONE',
      // Refund Specifics:
      refundMode = 'WALLET_CREDIT', // 'WALLET_CREDIT' | 'UPI' | 'BANK_ACCOUNT' | 'ORIGINAL_PAYMENT'
      refundDetails,
      refundAmount
    } = req.body;

    const order = await Order.findOne({
      _id: req.params.id,
      customerId: req.customer._id,
      tenantId: req.customer.tenantId
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.status !== 'DELIVERED') {
      return res.status(400).json({ message: 'Return or Exchange requests can only be placed for delivered orders.' });
    }

    if (order.returnStatus === 'REQUESTED' || order.returnStatus === 'APPROVED' || order.returnStatus === 'PICKUP_ASSIGNED') {
      return res.status(400).json({ message: `A ${order.returnType || 'return'} request is already in progress for this order.` });
    }

    // Check product-level return / exchange policy eligibility
    const targetProdId = returnItem?.productId?._id || returnItem?.productId || order.items?.[0]?.productId?._id || order.items?.[0]?.productId;
    if (targetProdId) {
      const prodDoc = await Product.findById(targetProdId);
      if (prodDoc) {
        if (prodDoc.returnPolicyType === 'NON_RETURNABLE' || (prodDoc.isReturnable === false && prodDoc.isExchangeable === false)) {
          return res.status(400).json({
            message: `This product (${prodDoc.name}) is classified as Non-Returnable (${prodDoc.nonReturnableReason || 'Store Policy'}). Return or exchange is not permitted.`
          });
        }
        if (returnType !== 'EXCHANGE' && (prodDoc.returnPolicyType === 'EXCHANGE_ONLY' || prodDoc.isReturnable === false)) {
          return res.status(400).json({
            message: `This product (${prodDoc.name}) is eligible for replacement/exchange only. Cash or wallet refunds are not permitted.`
          });
        }
      }
    }

    const isExchange = returnType === 'EXCHANGE';
    const statusCode = isExchange ? 'EXCHANGE_REQUESTED' : 'RETURN_REQUESTED';

    let returnStatusDoc = await EcomStatus.findOne({
      tenantId: order.tenantId,
      code: statusCode
    });

    if (!returnStatusDoc) {
      returnStatusDoc = await EcomStatus.findOne({
        tenantId: order.tenantId,
        code: 'RETURN_REQUESTED'
      });
    }

    // Auto generate 6-digit Doorstep Pickup Verification Code (like Amazon/Flipkart)
    const pickupOtp = Math.floor(100000 + Math.random() * 900000).toString();

    order.returnStatus = 'REQUESTED';
    order.returnType = isExchange ? 'EXCHANGE' : 'REFUND';
    order.returnItem = returnItem || null;
    order.returnReason = returnReason || (isExchange ? 'Size / Color Replacement' : 'Return for Refund');
    order.returnSubReason = returnSubReason || '';
    order.returnImages = Array.isArray(returnImages) ? returnImages : [];
    order.returnNotes = returnNotes || '';
    order.returnRequestedAt = new Date();
    order.returnPickupOtp = pickupOtp;
    order.status = statusCode;
    order.ecomStatusCode = statusCode;
    if (returnStatusDoc) order.ecomStatusId = returnStatusDoc._id;

    if (isExchange) {
      order.exchangeMode = exchangeMode;
      order.exchangeReplacement = exchangeReplacement || null;
      order.exchangeReason = returnReason || 'Exchange requested';
      order.exchangeItemDetails = exchangeItemDetails || exchangeReplacement?.name || 'Same product replacement';
      order.exchangePriceDifference = Number(exchangePriceDifference || 0);
      order.exchangeDifferenceAction = exchangeDifferenceAction || (Number(exchangePriceDifference) > 0 ? 'COLLECT_FROM_CUSTOMER' : Number(exchangePriceDifference) < 0 ? 'REFUND_TO_CUSTOMER' : 'NONE');
      order.exchangeDifferencePaymentStatus = Number(exchangePriceDifference) > 0 ? 'PENDING_DOORSTEP' : 'NOT_APPLICABLE';
    } else {
      order.refundMode = refundMode || 'WALLET_CREDIT';
      order.refundDetails = refundDetails || {};
      const fallbackRefund = order.subtotalAmount || (order.totalAmount - Number(order.shippingAmount || 0)) || order.totalAmount;
      order.refundAmount = Number(refundAmount != null ? refundAmount : fallbackRefund);
    }

    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: isExchange ? 'Exchange Requested' : 'Return & Refund Requested',
      statusCode: statusCode,
      note: isExchange
        ? `Exchange requested (${exchangeMode}). Replacement: ${order.exchangeItemDetails}. Price Diff: ₹${order.exchangePriceDifference}. Pickup OTP: ${pickupOtp}`
        : `Refund requested via ${order.refundMode}. Reason: ${order.returnReason}. Pickup OTP: ${pickupOtp}`,
      changedAt: new Date(),
      changedBy: req.customer.name || 'Customer',
      emailSent: true
    });

    if (!order.returnAuditTrail) order.returnAuditTrail = [];
    order.returnAuditTrail.push({
      step: 'REQUEST_INITIATED',
      title: `${isExchange ? 'Exchange' : 'Return & Refund'} Initiated by Customer`,
      actor: req.customer.name || 'Customer',
      deliveryType: 'PENDING_ASSIGNMENT',
      carrierOrRider: 'Not Assigned',
      trackingOrProof: `Verification Code: ${pickupOtp}`,
      note: isExchange
        ? `Mode: ${exchangeMode}. Replacement: ${order.exchangeItemDetails} (Price diff: ₹${order.exchangePriceDifference})`
        : `Refund Mode: ${order.refundMode}. Destination: ${order.refundDetails?.upiId || order.refundDetails?.accountNumber || 'Wallet/Original'}`,
      timestamp: new Date()
    });

    await order.save();

    // Send Doorstep Verification OTP to Customer Email
    if (order.customerEmail) {
      try {
        const company = await Company.findById(order.tenantId);
        await sendReturnPickupOtpEmail({
          to: order.customerEmail,
          customerName: order.customerName,
          orderRef: `WEB-${order._id.toString().slice(-6).toUpperCase()}`,
          pickupOtp,
          returnType: order.returnType,
          itemName: order.returnItem?.name || order.exchangeItemDetails || 'Ordered Product',
          riderName: '',
          riderPhone: '',
          companyName: company ? company.name : 'JTS Store'
        });
      } catch (emailErr) {
        console.warn('Return pickup OTP email error:', emailErr.message);
      }
    }

    res.status(200).json({
      message: `${isExchange ? 'Exchange' : 'Return & Refund'} request submitted successfully. Verification OTP sent to your email.`,
      order,
      pickupOtp
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add review to product
// @route   POST /api/v1/ecommerce/products/:id/reviews
// @access  Private (Customer)
exports.addProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const review = await Review.create({
      tenantId: req.customer.tenantId,
      productId: req.params.id,
      customerId: req.customer._id,
      rating,
      comment,
      isApproved: true
    });
    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Validate coupon
// @route   POST /api/v1/ecommerce/coupons/validate
// @access  Public
exports.validateCoupon = async (req, res) => {
  try {
    const { code, purchaseAmount } = req.body;
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), tenantId: req.tenantId, isActive: true });

    if (!coupon) return res.status(404).json({ message: 'Invalid coupon code' });

    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({ message: 'Coupon code has expired' });
    }

    if (purchaseAmount < coupon.minPurchaseAmount) {
      return res.status(400).json({ message: `Minimum purchase of $${coupon.minPurchaseAmount} required` });
    }

    res.status(200).json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle wishlist item
// @route   POST /api/v1/ecommerce/wishlist/:productId
// @access  Private (Customer)
exports.toggleWishlist = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id);
    const productId = req.params.productId;

    const index = customer.wishlist.indexOf(productId);
    if (index > -1) {
      customer.wishlist.splice(index, 1);
    } else {
      customer.wishlist.push(productId);
    }

    await customer.save();
    res.status(200).json(customer.wishlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get customer wishlist products
// @route   GET /api/v1/ecommerce/wishlist
// @access  Private (Customer)
exports.getWishlist = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id).populate({
      path: 'wishlist',
      select: 'name sku barcode brand price salesPrice uploadImage images department categoryId inStock'
    });
    res.status(200).json(customer.wishlist || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Live search suggestions with SKU & Barcode matching
// @route   GET /api/v1/ecommerce/search-suggestions
// @access  Public
exports.getSearchSuggestions = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(200).json({ suggestions: [], products: [], brands: [], categories: [] });
    }
    const cleanQ = q.trim();
    const regex = new RegExp(cleanQ, 'i');

    const [products, brands, departments] = await Promise.all([
      Product.find({
        tenantId,
        isActive: true,
        $or: [
          { name: regex },
          { sku: regex },
          { barcode: regex },
          { brand: regex }
        ]
      })
        .select('name sku barcode brand salesPrice price uploadImage department')
        .limit(6)
        .lean(),

      Product.distinct('brand', { tenantId, isActive: true, brand: regex }),
      Product.distinct('department', { tenantId, isActive: true, department: regex })
    ]);

    const suggestions = [];
    products.forEach(p => {
      if (!suggestions.includes(p.name)) suggestions.push(p.name);
    });
    brands.filter(Boolean).forEach(b => {
      const bText = `Brand: ${b}`;
      if (!suggestions.includes(bText)) suggestions.push(bText);
    });

    res.status(200).json({
      suggestions: suggestions.slice(0, 8),
      products: products.map(p => ({
        _id: p._id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        brand: p.brand,
        price: p.price,
        salesPrice: p.salesPrice || p.price,
        uploadImage: p.uploadImage,
        department: p.department
      })),
      brands: brands.filter(Boolean).slice(0, 5),
      departments: departments.filter(Boolean).slice(0, 5)
    });
  } catch (error) {
    console.error('getSearchSuggestions error:', error);
    res.status(500).json({ message: error.message });
  }
};


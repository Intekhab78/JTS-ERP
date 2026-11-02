const mongoose = require('mongoose');
const EcomSettings = require('../../core/models/EcomSettings');
const Branch = require('../../core/models/Branch');
const Stock = require('../../core/models/Stock');
const Product = require('../../core/models/Product');
const {
  normalizeVariantId,
  buildCompanyStockFilter,
  resolveEcomStockKey
} = require('../../core/utils/stockQueryHelper');

/**
 * Get or initialize EcomSettings for tenant
 */
const getEcomSettings = async (tenantId) => {
  let settings = await EcomSettings.findOne({ tenantId });
  if (!settings) {
    // Auto-discover existing branches to pre-populate settings
    const branches = await Branch.find({ tenantId, isActive: true }).limit(5);
    const defaultLocations = branches.map((b, index) => ({
      branchId: b._id,
      branchName: b.name,
      safetyStockType: 'FIXED',
      safetyStockValue: 0,
      pickPriority: index + 1,
      isActive: true
    }));

    settings = await EcomSettings.create({
      tenantId,
      includedLocations: defaultLocations,
      defaultSafetyStockType: 'FIXED',
      defaultSafetyStockValue: 0
    });
  }
  return settings;
};

/**
 * Resolve active companies and branch IDs for storefront fulfillment scope.
 */
const resolveEcomActiveScope = async (tenantId, cachedSettings = null) => {
  const settings = cachedSettings || await getEcomSettings(tenantId);
  const activeLocations = (settings.includedLocations || []).filter(loc => loc.isActive);

  // Collect branch IDs from active locations (where isActive === true)
  const activeLocBranches = activeLocations
    .map(l => (l.branchId?._id || l.branchId)?.toString())
    .filter(Boolean);

  // Collect branch IDs from mappedBranches
  const explicitBranches = (settings.mappedBranches || [])
    .map(b => (b?._id || b)?.toString())
    .filter(Boolean);

  // A branch is active ONLY if it is explicitly active in includedLocations
  // or explicitly selected in mappedBranches
  let branchIdStrings = [];
  if (activeLocations.length > 0 && explicitBranches.length > 0) {
    // Both configured: take the intersection (must be active and mapped)
    branchIdStrings = explicitBranches.filter(id => activeLocBranches.includes(id));
  } else if (activeLocations.length > 0) {
    branchIdStrings = activeLocBranches;
  } else if (explicitBranches.length > 0) {
    branchIdStrings = explicitBranches;
  }

  const mappedCompanyIdStrings = (settings.mappedCompanies || [])
    .map(c => (c?._id || c)?.toString())
    .filter(Boolean);

  // If specific legal companies are selected, restrict active branches to those belonging to selected companies
  if (mappedCompanyIdStrings.length > 0 && branchIdStrings.length > 0) {
    const compBranches = await Branch.find({
      tenantId,
      _id: { $in: branchIdStrings },
      $or: [
        { legalCompanyId: { $in: mappedCompanyIdStrings } },
        { companyId: { $in: mappedCompanyIdStrings } }
      ]
    }).select('_id');
    branchIdStrings = compBranches.map(b => b._id.toString());
  }

  // The storefront has an active fulfillment scope ONLY if at least one branch is actively mapped!
  const hasActiveScope = branchIdStrings.length > 0;

  return {
    settings,
    hasActiveScope,
    mappedCompanyIds: mappedCompanyIdStrings,
    mappedBranchIds: branchIdStrings.map(id => new mongoose.Types.ObjectId(id)),
    activeLocations
  };
};

/**
 * Calculate available E-Commerce stock for a single product across included locations
 * Example user logic:
 * Total physical: 100 (Outlet 1: 25, Outlet 2: 35, Warehouse 1: 40)
 * Safety stock: 10 per location -> Availabilities: (25-10=15, 35-10=25, 40-10=30)
 * Total E-Commerce stock: 15 + 25 + 30 = 70
 */
const calculateProductEcomStock = async (productId, tenantId, cachedSettings = null, variantId = null) => {
  const settings = cachedSettings || await getEcomSettings(tenantId);
  const activeLocations = (settings.includedLocations || []).filter(loc => loc.isActive);
  const explicitBranches = (settings.mappedBranches || []).map(b => (b?._id || b)?.toString()).filter(Boolean);
  const activeBranchIds = [...new Set([
    ...activeLocations.map(l => (l.branchId?._id || l.branchId)?.toString()).filter(Boolean),
    ...explicitBranches
  ])];

  // If NO branch is enabled/selected, stock available for e-commerce is ZERO
  if (activeBranchIds.length === 0) {
    return {
      totalEcomStock: 0,
      totalPhysicalStock: 0,
      locationBreakdown: []
    };
  }

  const prod = await Product.findById(productId);
  if (prod && prod.type === 'SERVICE') {
    return {
      totalEcomStock: 9999,
      totalPhysicalStock: 9999,
      isService: true,
      locationBreakdown: []
    };
  }

  const branchObjectIds = activeBranchIds.map(id => new mongoose.Types.ObjectId(id));
  const normVariantId = normalizeVariantId(variantId);

  // Safe Query Rules 1, 2, 9:
  // Explicitly query COMPANY stock partition; supplier consignment stock must never be exposed.
  // Query exact variantId if provided, or base stock if null.
  const stockFilter = {
    tenantId,
    productId,
    branchId: { $in: branchObjectIds },
    ownerType: 'COMPANY'
  };

  let stocks = [];
  let isVariantFallbackToBase = false;

  if (normVariantId) {
    // 1. Try to find stock partitioned specifically for this variant
    stocks = await Stock.find({ ...stockFilter, variantId: normVariantId });

    // 2. Only fall back to base product stock if NO dedicated variant partitions exist
    if (stocks.length === 0) {
      const hasAnyVariantStock = await Stock.exists({
        ...stockFilter,
        variantId: { $exists: true, $ne: null }
      });

      if (!hasAnyVariantStock) {
        const baseStocks = await Stock.find({ ...stockFilter, variantId: { $in: [null, undefined] } });
        const baseQty = baseStocks.reduce((acc, s) => acc + (s.quantity || 0), 0);
        if (baseQty > 0) {
          stocks = baseStocks;
          isVariantFallbackToBase = true;
        }
      }
    }
  } else {
    // For standard products or base stock requests, match all company stocks for this product
    stocks = await Stock.find(stockFilter);
  }

  const stockMap = new Map();
  stocks.forEach(s => {
    // Avoid map key collision between variants or locations
    const mapKey = resolveEcomStockKey(s.branchId, s.variantId);
    stockMap.set(mapKey, s.quantity || 0);
    // Also store total quantity per branchId so it's always accessible
    const bStr = (s.branchId?._id || s.branchId).toString();
    stockMap.set(bStr, (stockMap.get(bStr) || 0) + (s.quantity || 0));
  });

  let totalEcomStock = 0;
  let totalPhysicalStock = 0;
  const locationBreakdown = [];

  // If activeLocations has specific buffer rules, evaluate each location
  if (activeLocations.length > 0) {
    for (const loc of activeLocations) {
      const bIdStr = (loc.branchId?._id || loc.branchId).toString();
      const targetVariantId = isVariantFallbackToBase ? null : normVariantId;
      const mapKey = resolveEcomStockKey(bIdStr, targetVariantId);
      const physicalStock = stockMap.has(mapKey)
        ? (stockMap.get(mapKey) || 0)
        : (normVariantId ? (stockMap.get(resolveEcomStockKey(bIdStr, null)) || 0) : (stockMap.get(bIdStr) || 0));
      totalPhysicalStock += physicalStock;

      let safetyDeduction = 0;
      if (loc.safetyStockType === 'PERCENTAGE') {
        safetyDeduction = Math.round((physicalStock * (loc.safetyStockValue || 0)) / 100);
      } else {
        safetyDeduction = Number(loc.safetyStockValue || 0);
      }

      const available = Math.max(0, physicalStock - safetyDeduction);
      totalEcomStock += available;

      locationBreakdown.push({
        branchId: loc.branchId,
        branchName: loc.branchName,
        physicalStock,
        safetyDeduction,
        availableEcomStock: available,
        pickPriority: loc.pickPriority || 1
      });
    }
  } else {
    // If only mappedBranches were specified without buffer rules
    for (const bId of branchObjectIds) {
      const bIdStr = bId.toString();
      const targetVariantId = isVariantFallbackToBase ? null : normVariantId;
      const mapKey = resolveEcomStockKey(bIdStr, targetVariantId);
      const physicalStock = stockMap.has(mapKey)
        ? (stockMap.get(mapKey) || 0)
        : (normVariantId ? (stockMap.get(resolveEcomStockKey(bIdStr, null)) || 0) : (stockMap.get(bIdStr) || 0));
      totalPhysicalStock += physicalStock;
      totalEcomStock += physicalStock;
      locationBreakdown.push({
        branchId: bId,
        branchName: 'Store Location',
        physicalStock,
        safetyDeduction: 0,
        availableEcomStock: physicalStock,
        pickPriority: 1
      });
    }
  }

  // Sort breakdown by pickPriority ascending
  locationBreakdown.sort((a, b) => a.pickPriority - b.pickPriority);

  return {
    totalEcomStock,
    totalPhysicalStock,
    locationBreakdown
  };
};

/**
 * Deduct stock according to pick priority across enabled locations
 */
const allocateAndDeductStock = async (items, tenantId) => {
  const settings = await getEcomSettings(tenantId);
  const scope = await resolveEcomActiveScope(tenantId, settings);

  let activeLocations = (settings.includedLocations || [])
    .filter(loc => loc.isActive)
    .sort((a, b) => (a.pickPriority || 1) - (b.pickPriority || 1));

  // If no location in includedLocations is explicitly active, but scope has active fulfillment branches,
  // use those mapped branches as the fulfillment locations!
  if (activeLocations.length === 0 && scope.mappedBranchIds.length > 0) {
    const branches = await Branch.find({ _id: { $in: scope.mappedBranchIds } }).lean();
    activeLocations = branches.map((b, idx) => ({
      branchId: b._id,
      branchName: b.name,
      safetyStockType: 'FIXED',
      safetyStockValue: 0,
      pickPriority: idx + 1,
      isActive: true
    }));
  }

  if (!activeLocations || activeLocations.length === 0) {
    throw new Error('No stock locations are enabled for E-Commerce fulfillment.');
  }

  const overallFulfillments = [];

  for (const item of items) {
    let remainingToDeduct = Number(item.quantity);
    const productId = item.productId;
    const prod = await Product.findById(productId);
    if (prod && prod.type === 'SERVICE') {
      overallFulfillments.push({
        productId,
        branchId: activeLocations[0]?.branchId,
        branchName: activeLocations[0]?.branchName || 'Online Services',
        quantity: remainingToDeduct
      });
      continue;
    }

    const itemFulfillments = [];
    const normVariantId = normalizeVariantId(item.variantId);

    // Traverse locations in priority order
    for (const loc of activeLocations) {
      if (remainingToDeduct <= 0) break;

      // Safe Query Rules 1, 2, 9:
      // Strictly deduct from COMPANY stock; honors variantId partition.
      let activeQuery = buildCompanyStockFilter({
        tenantId,
        productId,
        branchId: loc.branchId,
        variantId: normVariantId,
        allowLegacyVariantMatching: false
      });

      let stockDoc = await Stock.findOne(activeQuery);
      // If variant has no partitioned stock record, check if any variant partitions exist
      if (!stockDoc && normVariantId) {
        const hasAnyVariantStock = await Stock.exists({
          tenantId,
          productId,
          branchId: loc.branchId,
          ownerType: 'COMPANY',
          variantId: { $exists: true, $ne: null }
        });
        if (!hasAnyVariantStock) {
          const baseQuery = buildCompanyStockFilter({
            tenantId,
            productId,
            branchId: loc.branchId,
            variantId: null,
            allowLegacyVariantMatching: true
          });
          const baseDoc = await Stock.findOne(baseQuery);
          if (baseDoc && baseDoc.quantity > 0) {
            activeQuery = baseQuery;
            stockDoc = baseDoc;
          }
        }
      }

      if (!stockDoc || stockDoc.quantity <= 0) continue;

      // Re-read and atomically decrement. The quantity guard means concurrent
      // checkouts cannot both consume the same ERP stock units.
      for (let attempt = 0; attempt < 3 && remainingToDeduct > 0; attempt += 1) {
        const currentDoc = await Stock.findOne(activeQuery);
        if (!currentDoc || currentDoc.quantity <= 0) break;

        const safetyDeduction = loc.safetyStockType === 'PERCENTAGE'
          ? Math.round((currentDoc.quantity * loc.safetyStockValue) / 100)
          : Number(loc.safetyStockValue || 0);
        const availableForEcom = Math.max(0, currentDoc.quantity - safetyDeduction);
        if (availableForEcom <= 0) break;

        const pickQty = Math.min(remainingToDeduct, availableForEcom);
        const updatedStock = await Stock.findOneAndUpdate(
          { ...activeQuery, quantity: { $gte: pickQty + safetyDeduction } },
          { $inc: { quantity: -pickQty } },
          { returnDocument: 'after' }
        );
        if (!updatedStock) continue;

        itemFulfillments.push({
          stockId: updatedStock._id,
          productId,
          variantId: normVariantId,
          branchId: loc.branchId,
          branchName: loc.branchName,
          quantity: pickQty
        });
        remainingToDeduct -= pickQty;
      }
    }

    if (remainingToDeduct > 0) {
      throw new Error(`Insufficient e-commerce stock to fulfill product. Shortage of ${remainingToDeduct} unit(s).`);
    }

    overallFulfillments.push(...itemFulfillments);
  }

  return {
    primaryBranchId: activeLocations[0].branchId,
    fulfillments: overallFulfillments
  };
};

module.exports = {
  getEcomSettings,
  resolveEcomActiveScope,
  calculateProductEcomStock,
  allocateAndDeductStock
};

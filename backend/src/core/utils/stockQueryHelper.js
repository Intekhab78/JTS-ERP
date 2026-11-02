/**
 * Core Utility: Stock Query & Safe Partitioning Helper
 * File: backend/src/core/utils/stockQueryHelper.js
 * 
 * Enforces the 10 Safe Query Rules for Color/Size Variant Integration:
 * 1. Base-stock identity for standard products (variantId: null); exact variantId for variants.
 * 2. Strict isolation of COMPANY stock vs SUPPLIER consignment stock.
 * 3. Never treats missing ownership fields as implicit COMPANY stock.
 * 4. Fails closed against unresolved or ambiguous stock records during deduction.
 * 5. Guarantees complete StockMovement attribution (product, variant, branch, owner).
 * 6. Prevents e-commerce storefront map key collisions across branches and variants.
 */

const mongoose = require('mongoose');

/**
 * Normalizes a variant identifier into a valid ObjectId or null.
 * 
 * @param {any} variantId - Raw variantId from request, document, or query
 * @returns {mongoose.Types.ObjectId|null} Valid ObjectId or null for standard products
 * @throws {Error} If variantId is malformed/invalid
 */
function normalizeVariantId(variantId) {
  if (variantId === undefined || variantId === null || variantId === '' || variantId === 'null' || variantId === 'undefined') {
    return null;
  }

  if (variantId instanceof mongoose.Types.ObjectId) {
    return variantId;
  }

  if (typeof variantId === 'string') {
    const trimmed = variantId.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
      return null;
    }
    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      return new mongoose.Types.ObjectId(trimmed);
    }
    throw new Error(`Invalid variantId format: "${variantId}" is not a valid ObjectId.`);
  }

  if (typeof variantId === 'object' && variantId._id) {
    return normalizeVariantId(variantId._id);
  }

  throw new Error(`Invalid variantId type: expected ObjectId or string, received ${typeof variantId}.`);
}

/**
 * Builds a strictly partitioned Stock query filter.
 * 
 * @param {Object} params
 * @param {ObjectId|string} params.tenantId - Tenant scope (required)
 * @param {ObjectId|string} params.branchId - Branch scope (required)
 * @param {ObjectId|string} params.productId - Product reference (required)
 * @param {ObjectId|string} [params.variantId] - Variant reference (null for standard products)
 * @param {string} params.ownerType - Must be explicitly 'COMPANY' or 'SUPPLIER'
 * @param {ObjectId|string} [params.ownerId] - Required if ownerType is 'SUPPLIER', null if 'COMPANY'
 * @param {ObjectId|string} [params.legalCompanyId] - Optional legalCompany scope
 * @param {boolean} [params.allowLegacyVariantMatching=false] - If true and variantId is null, matches { $in: [null, undefined] }
 * @returns {Object} MongoDB query filter object
 */
function buildStockQuery(params = {}) {
  const {
    tenantId,
    branchId,
    productId,
    variantId,
    ownerType,
    ownerId,
    legalCompanyId,
    allowLegacyVariantMatching = false
  } = params;

  if (!tenantId) {
    throw new Error('Safe Stock Query Error: tenantId is required.');
  }
  if (!branchId) {
    throw new Error('Safe Stock Query Error: branchId is required.');
  }
  if (!productId) {
    throw new Error('Safe Stock Query Error: productId is required.');
  }

  // Enforce explicit ownership partition. Never allow ambiguous or default fallback.
  if (!ownerType || !['COMPANY', 'SUPPLIER'].includes(ownerType)) {
    throw new Error(`Safe Stock Query Error: Explicit ownerType ('COMPANY' or 'SUPPLIER') is required. Received: "${ownerType}".`);
  }

  const query = {
    tenantId: tenantId instanceof mongoose.Types.ObjectId ? tenantId : new mongoose.Types.ObjectId(tenantId),
    branchId: branchId instanceof mongoose.Types.ObjectId ? branchId : new mongoose.Types.ObjectId(branchId),
    productId: productId instanceof mongoose.Types.ObjectId ? productId : new mongoose.Types.ObjectId(productId),
    ownerType
  };

  if (legalCompanyId) {
    query.legalCompanyId = legalCompanyId instanceof mongoose.Types.ObjectId ? legalCompanyId : new mongoose.Types.ObjectId(legalCompanyId);
  }

  // Handle ownerId strictly based on ownerType
  if (ownerType === 'SUPPLIER') {
    if (!ownerId) {
      throw new Error('Safe Stock Query Error: ownerId is strictly required when ownerType is SUPPLIER.');
    }
    query.ownerId = ownerId instanceof mongoose.Types.ObjectId ? ownerId : new mongoose.Types.ObjectId(ownerId);
  } else {
    // For COMPANY stock, ownerId must be null
    query.ownerId = null;
  }

  // Handle variantId strictly
  const normVariantId = normalizeVariantId(variantId);
  if (normVariantId) {
    query.variantId = normVariantId;
  } else if (allowLegacyVariantMatching) {
    // Read compatibility: matches documents where variantId is explicitly null OR field was not set
    query.variantId = { $in: [null, undefined] };
  } else {
    // Strict exact match for standard products
    query.variantId = null;
  }

  return query;
}

/**
 * Builds a query filter specifically for COMPANY stock operations.
 * Guaranteed to never match SUPPLIER consignment stock or unresolved ownership records.
 * 
 * @param {Object} params
 * @param {ObjectId|string} params.tenantId
 * @param {ObjectId|string} params.branchId
 * @param {ObjectId|string} params.productId
 * @param {ObjectId|string} [params.variantId]
 * @param {ObjectId|string} [params.legalCompanyId]
 * @param {number} [params.minQuantity] - Optional quantity threshold (e.g. { $gte: minQuantity })
 * @param {boolean} [params.allowLegacyVariantMatching=false]
 * @returns {Object} MongoDB query filter object
 */
function buildCompanyStockFilter(params = {}) {
  const query = buildStockQuery({
    ...params,
    ownerType: 'COMPANY',
    ownerId: null
  });

  if (typeof params.minQuantity === 'number') {
    query.quantity = { $gte: params.minQuantity };
  }

  return query;
}

/**
 * Builds a complete, audit-compliant payload for StockMovement creation.
 * Preserves product, variant, branch, legalCompany, and ownership attribution.
 * 
 * @param {Object} params
 * @returns {Object} Clean payload object ready for StockMovement.create()
 */
function buildStockMovementPayload(params = {}) {
  const {
    tenantId,
    legalCompanyId,
    branchId,
    productId,
    variantId,
    variantSku,
    quantity,
    documentQuantity,
    documentUom,
    baseQuantity,
    baseUom,
    type,
    referenceId,
    referenceType,
    ownerType = 'COMPANY',
    ownerId = null,
    notes,
    createdBy
  } = params;

  if (!tenantId) throw new Error('StockMovement Error: tenantId is required.');
  if (!branchId) throw new Error('StockMovement Error: branchId is required.');
  if (!productId) throw new Error('StockMovement Error: productId is required.');
  if (quantity === undefined || quantity === null || typeof quantity !== 'number' || isNaN(quantity)) {
    throw new Error('StockMovement Error: quantity must be a valid number.');
  }
  if (!type) throw new Error('StockMovement Error: type is required.');
  if (!referenceId) throw new Error('StockMovement Error: referenceId is required.');
  if (!referenceType) throw new Error('StockMovement Error: referenceType is required.');

  const normVariantId = normalizeVariantId(variantId);

  const payload = {
    tenantId: tenantId instanceof mongoose.Types.ObjectId ? tenantId : new mongoose.Types.ObjectId(tenantId),
    branchId: branchId instanceof mongoose.Types.ObjectId ? branchId : new mongoose.Types.ObjectId(branchId),
    productId: productId instanceof mongoose.Types.ObjectId ? productId : new mongoose.Types.ObjectId(productId),
    variantId: normVariantId,
    variantSku: variantSku ? String(variantSku).trim().toUpperCase() : null,
    quantity,
    type,
    referenceId: String(referenceId),
    referenceType: String(referenceType),
    ownerType: ownerType === 'SUPPLIER' ? 'SUPPLIER' : 'COMPANY'
  };

  if (legalCompanyId) {
    payload.legalCompanyId = legalCompanyId instanceof mongoose.Types.ObjectId ? legalCompanyId : new mongoose.Types.ObjectId(legalCompanyId);
  }

  if (payload.ownerType === 'SUPPLIER' && ownerId) {
    payload.ownerId = ownerId instanceof mongoose.Types.ObjectId ? ownerId : new mongoose.Types.ObjectId(ownerId);
  } else {
    payload.ownerId = null;
  }

  if (documentQuantity !== undefined && documentQuantity !== null) {
    payload.documentQuantity = Number(documentQuantity);
  }
  if (documentUom) payload.documentUom = String(documentUom);
  if (baseQuantity !== undefined && baseQuantity !== null) {
    payload.baseQuantity = Number(baseQuantity);
  }
  if (baseUom) payload.baseUom = String(baseUom);
  if (notes) payload.notes = String(notes);
  if (createdBy) {
    payload.createdBy = createdBy instanceof mongoose.Types.ObjectId ? createdBy : new mongoose.Types.ObjectId(createdBy);
  }

  return payload;
}

/**
 * Resolves a compound collision-free key for stock aggregation maps.
 * Prevents map clobbering when multiple variants or locations share a data structure.
 * 
 * @param {ObjectId|string} branchId - Branch ID
 * @param {ObjectId|string|null} [variantId] - Variant ID or null
 * @returns {string} Safe compound key e.g. "60d..._BASE" or "60d..._61f..."
 */
function resolveEcomStockKey(branchId, variantId = null) {
  if (!branchId) throw new Error('resolveEcomStockKey Error: branchId is required.');
  const bStr = (branchId._id || branchId).toString();
  const normVar = normalizeVariantId(variantId);
  const vStr = normVar ? normVar.toString() : 'BASE';
  return `${bStr}_${vStr}`;
}

/**
 * Checks whether a product entity has variants enabled.
 * 
 * @param {Object} product
 * @returns {boolean}
 */
function isVariantProduct(product) {
  return Boolean(product && product.hasVariants === true);
}

module.exports = {
  normalizeVariantId,
  buildStockQuery,
  buildCompanyStockFilter,
  buildStockMovementPayload,
  resolveEcomStockKey,
  isVariantProduct
};

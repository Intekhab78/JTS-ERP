const mongoose = require('mongoose');
const Customer = require('../core/models/Customer');

/**
 * Validates a single discount against order context
 */
const validatePromotionContext = (discountMaster, orderContext) => {
  const { tenantId, branchId, customerId, customerGroup, orderSubtotal, discountCode, now } = orderContext;
  
  if (discountMaster.tenantId.toString() !== tenantId.toString()) {
    return { valid: false, reason: 'Tenant mismatch' };
  }
  if (!discountMaster.isActive) {
    return { valid: false, reason: 'Promotion is inactive' };
  }

  if (discountMaster.isAutomatic === false) {
      if (!discountCode || typeof discountCode !== 'string' || discountCode.trim().toUpperCase() !== discountMaster.code.trim().toUpperCase()) {
          return { valid: false, reason: 'Coupon code required or invalid' };
      }
  }
  
  const evalDate = now || new Date();
  if (discountMaster.startDate && evalDate < new Date(discountMaster.startDate)) {
    return { valid: false, reason: 'Promotion has not started yet' };
  }
  if (discountMaster.endDate && evalDate > new Date(discountMaster.endDate)) {
    return { valid: false, reason: 'Promotion has expired' };
  }
  
  if (discountMaster.startTime && discountMaster.endTime) {
    const currentHourMin = evalDate.getHours().toString().padStart(2, '0') + ':' + evalDate.getMinutes().toString().padStart(2, '0');
    if (currentHourMin < discountMaster.startTime || currentHourMin > discountMaster.endTime) {
      return { valid: false, reason: 'Promotion not active at this time' };
    }
  }

  if (discountMaster.minOrderAmount > 0 && orderSubtotal < discountMaster.minOrderAmount) {
    return { valid: false, reason: `Minimum order amount of ${discountMaster.minOrderAmount} required` };
  }

  if (discountMaster.branches && discountMaster.branches.length > 0) {
    if (!branchId || !discountMaster.branches.some(b => b.toString() === branchId.toString())) {
      return { valid: false, reason: 'Not applicable for this branch' };
    }
  }

  if (discountMaster.customers && discountMaster.customers.length > 0) {
    if (!customerId || !discountMaster.customers.some(c => c.toString() === customerId.toString())) {
      return { valid: false, reason: 'Not applicable for this customer' };
    }
  }

  if (discountMaster.customerGroups && discountMaster.customerGroups.length > 0) {
    if (!customerGroup || !discountMaster.customerGroups.some(g => g.toString() === customerGroup.toString())) {
      return { valid: false, reason: 'Not applicable for this customer group' };
    }
  }

  if (discountMaster.usageLimit > 0 && discountMaster.usageCount >= discountMaster.usageLimit) {
    return { valid: false, reason: 'Promotion usage limit reached' };
  }

  return { valid: true };
};

/**
 * Evaluates a single promotion against the current state of items.
 * Modifies eligibleLines inline to reduce their remaining lineNet for subsequent promotions.
 */
const applySinglePromotion = (promo, eligibleItems, currentOrderSubtotal) => {
  let promoEligibleSubtotal = 0;
  let totalEligibleQuantity = 0;
  const involvedItems = [];

  // Filter items that match the promotion targeting
  const matchedItems = eligibleItems.filter(item => {
    if (item.lineNet <= 0) return false;
    
    let isEligible = false;
    if (promo.applyTo) {
      if (promo.applyTo === 'ORDER') {
        isEligible = true;
      } else if (promo.applyTo === 'PRODUCT' || promo.applyTo === 'MULTIPLE_PRODUCTS') {
        if (promo.applicableProducts && promo.applicableProducts.some(p => p.toString() === item.productId.toString())) {
          isEligible = true;
        }
      } else if (promo.applyTo === 'CATEGORY') {
        if (promo.applicableCategories && promo.applicableCategories.some(c => c.toString() === item.categoryId?.toString())) {
          isEligible = true;
        }
      } else if (promo.applyTo === 'SUBCATEGORY') {
        if (promo.applicableSubcategories && promo.applicableSubcategories.some(s => s.toString() === item.subcategoryId?.toString())) {
          isEligible = true;
        }
      } else if (promo.applyTo === 'DEPARTMENT') {
        if (promo.applicableDepartments && promo.applicableDepartments.some(d => d.toString() === item.departmentId?.toString())) {
          isEligible = true;
        }
      } else if (promo.applyTo === 'FAMILY') {
        if (promo.applicableFamilies && promo.applicableFamilies.some(f => f.toString() === item.familyId?.toString())) {
          isEligible = true;
        }
      } else if (promo.applyTo === 'SUBFAMILY') {
        if (promo.applicableSubFamilies && promo.applicableSubFamilies.some(sf => sf.toString() === item.subFamilyId?.toString())) {
          isEligible = true;
        }
      }
    } else {
      // Legacy Fallback
      if (promo.applicabilityMode === 'ALL_DISCOUNTABLE_PRODUCTS') isEligible = true;
      else if (promo.applicabilityMode === 'SELECTED_PRODUCTS' && promo.applicableProducts?.some(p => p.toString() === item.productId.toString())) isEligible = true;
      else if (promo.applicabilityMode === 'SELECTED_CATEGORIES' && promo.applicableCategories?.some(c => c.toString() === item.categoryId?.toString())) isEligible = true;
    }

    if (isEligible && promo.excludedProducts && promo.excludedProducts.some(p => p.toString() === item.productId.toString())) {
      isEligible = false;
    }
    return isEligible;
  });

  if (matchedItems.length === 0) return { discountAmount: 0, distributedLines: {} };

  matchedItems.forEach(item => {
    promoEligibleSubtotal += item.lineNet;
    totalEligibleQuantity += item.quantity;
  });

  let calculatedDiscount = 0;
  let bogoLinesDistribution = {}; // Specific for BOGO which distributes differently

  if (promo.discountType === 'PERCENTAGE') {
    calculatedDiscount = promoEligibleSubtotal * (promo.value / 100);
    if (promo.maxDiscountAmount > 0 && calculatedDiscount > promo.maxDiscountAmount) {
      calculatedDiscount = promo.maxDiscountAmount;
    }
  } else if (promo.discountType === 'FIXED') {
    calculatedDiscount = promo.value;
  } else if (promo.discountType === 'BUY_X_GET_Y') {
    if (promo.buyXQuantity > 0 && promo.getYQuantity > 0) {
      
      if (promo.buyXGetYMode === 'SAME_PRODUCT') {
        // Group by product
        for (const item of matchedItems) {
            const sets = Math.floor(item.quantity / (promo.buyXQuantity + promo.getYQuantity));
            if (sets > 0) {
                const freeQty = sets * promo.getYQuantity;
                let lineDist = 0;
                if (promo.getYDiscountType === 'FREE') {
                    lineDist = freeQty * item.unitPrice;
                } else if (promo.getYDiscountType === 'PERCENTAGE') {
                    lineDist = freeQty * item.unitPrice * (promo.getYDiscountValue / 100);
                }
                
                // Cap at remaining lineNet
                lineDist = Math.min(lineDist, item.lineNet);
                
                calculatedDiscount += lineDist;
                bogoLinesDistribution[item.productId.toString()] = (bogoLinesDistribution[item.productId.toString()] || 0) + lineDist;
            }
        }
      } else {
        // ELIGIBLE_PRODUCTS mode - mix and match
        const sets = Math.floor(totalEligibleQuantity / (promo.buyXQuantity + promo.getYQuantity));
        if (sets > 0) {
            const sortedItems = [...matchedItems].sort((a, b) => a.unitPrice - b.unitPrice);
            let freeItemsNeeded = sets * promo.getYQuantity;
            for (const item of sortedItems) {
                if (freeItemsNeeded <= 0) break;
                const freeQtyForThisItem = Math.min(item.quantity, freeItemsNeeded);
                let lineDist = 0;
                if (promo.getYDiscountType === 'FREE') {
                    lineDist = freeQtyForThisItem * item.unitPrice;
                } else if (promo.getYDiscountType === 'PERCENTAGE') {
                    lineDist = freeQtyForThisItem * item.unitPrice * (promo.getYDiscountValue / 100);
                }
                lineDist = Math.min(lineDist, item.lineNet);
                calculatedDiscount += lineDist;
                bogoLinesDistribution[item.productId.toString()] = (bogoLinesDistribution[item.productId.toString()] || 0) + lineDist;
                freeItemsNeeded -= freeQtyForThisItem;
            }
        }
      }
    }
  } else if (promo.discountType === 'BULK_PURCHASE' || promo.discountType === 'TIERED_DISCOUNT') {
    if (promo.tiers && promo.tiers.length > 0) {
      const sortedTiers = [...promo.tiers].sort((a, b) => b.minQuantity - a.minQuantity);
      
      // For TIERED_DISCOUNT, we check the ORDER subtotal if applyTo is ORDER
      let metricToCompare = totalEligibleQuantity;
      if (promo.applyTo === 'ORDER' && promo.discountType === 'TIERED_DISCOUNT') {
          // Compare against monetary amount for order tiers
          metricToCompare = currentOrderSubtotal;
      }
      
      const appliedTier = sortedTiers.find(t => metricToCompare >= t.minQuantity);
      if (appliedTier) {
          if (appliedTier.discountType === 'PERCENTAGE') {
              calculatedDiscount = promoEligibleSubtotal * (appliedTier.value / 100);
          } else if (appliedTier.discountType === 'FIXED') {
              calculatedDiscount = appliedTier.value;
          }
      }
    }
  }

  // Cap overall calculated discount at eligible subtotal
  if (calculatedDiscount > promoEligibleSubtotal) {
    calculatedDiscount = promoEligibleSubtotal;
  }
  calculatedDiscount = Math.round(calculatedDiscount * 100) / 100;

  if (calculatedDiscount <= 0) return { discountAmount: 0, distributedLines: {} };

  const distributedLines = {};
  
  if (promo.discountType === 'BUY_X_GET_Y') {
     // BOGO distribution is already calculated precisely per product
     Object.keys(bogoLinesDistribution).forEach(pid => {
        distributedLines[pid] = bogoLinesDistribution[pid];
        const mItem = matchedItems.find(i => i.productId.toString() === pid);
        if (mItem) mItem.lineNet -= bogoLinesDistribution[pid]; // update remaining net
     });
  } else {
    // Proportional distribution for other types
    let distributedTotal = 0;
    matchedItems.sort((a, b) => b.lineNet - a.lineNet);
    matchedItems.forEach((line, index) => {
      if (index === matchedItems.length - 1) {
        const remainder = calculatedDiscount - distributedTotal;
        const finalDist = Math.max(0, Math.round(remainder * 100) / 100);
        distributedLines[line.productId] = finalDist;
        line.lineNet -= finalDist;
      } else {
        const proportion = line.lineNet / promoEligibleSubtotal;
        const lineDist = Math.round((calculatedDiscount * proportion) * 100) / 100;
        distributedLines[line.productId] = lineDist;
        distributedTotal += lineDist;
        line.lineNet -= lineDist;
      }
    });
  }

  return { discountAmount: calculatedDiscount, distributedLines };
};


/**
 * Evaluates multiple promotions (automatic + optional coupon) 
 * prioritizing by Priority, handling Stackable constraints.
 */
exports.evaluatePromotions = (promotions, items, orderContext) => {
  const result = {
    totalDiscountAmount: 0,
    appliedPromotions: [],
    rejectedPromotions: [],
    finalDistributedLines: {} // productId -> total discount amount across all promos
  };

  // 1. Initial validation of each promo against context
  const validPromos = [];
  for (const promo of promotions) {
    const check = validatePromotionContext(promo, orderContext);
    if (check.valid) {
      validPromos.push(promo);
    } else {
      result.rejectedPromotions.push({
        promotionId: promo._id,
        code: promo.code,
        name: promo.name,
        reason: check.reason
      });
    }
  }

  // 2. Sort by priority DESC (higher number = higher priority)
  validPromos.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  // Clone items to track remaining lineNet as discounts stack
  let currentSubtotal = orderContext.orderSubtotal;
  const workingItems = items.map(i => {
     const subtotal = Number(i.subtotal) || (Number(i.quantity) * Number(i.unitPrice));
     const manualDisc = Number(i.discount) || 0;
     return {
        ...i,
        productId: i.productId.toString(),
        subtotal,
        manualDiscount: manualDisc,
        lineNet: subtotal - manualDisc
     };
  });

  // 3. Evaluate Stack
  let blockFurtherPromotions = false;

  for (const promo of validPromos) {
    if (blockFurtherPromotions) {
      result.rejectedPromotions.push({
        promotionId: promo._id,
        code: promo.code,
        name: promo.name,
        reason: 'Blocked by a higher-priority non-stackable promotion'
      });
      continue;
    }

    const promoResult = applySinglePromotion(promo, workingItems, currentSubtotal);

    if (promoResult.discountAmount > 0) {
      result.totalDiscountAmount += promoResult.discountAmount;
      currentSubtotal -= promoResult.discountAmount;
      
      result.appliedPromotions.push({
        promotionId: promo._id,
        promotionCode: promo.code,
        promotionName: promo.name,
        discountType: promo.discountType,
        discountAmount: promoResult.discountAmount,
        snapshot: {
            priority: promo.priority,
            stackable: promo.stackable,
            distributedLines: promoResult.distributedLines
        }
      });

      // Accumulate final distributed lines for POS
      for (const [pid, amt] of Object.entries(promoResult.distributedLines)) {
        result.finalDistributedLines[pid] = (result.finalDistributedLines[pid] || 0) + amt;
      }

      if (promo.stackable === false) {
        blockFurtherPromotions = true;
      }
    } else {
      result.rejectedPromotions.push({
        promotionId: promo._id,
        code: promo.code,
        name: promo.name,
        reason: 'Does not apply to current cart items or yields zero discount'
      });
    }
  }

  // Round final total
  result.totalDiscountAmount = Math.round(result.totalDiscountAmount * 100) / 100;
  
  return result;
};

/**
 * Legacy wrapper for backward compatibility with older tests/POS logic if needed.
 */
exports.calculateOrderDiscount = (discountMaster, items, orderSubtotal, targetProductId = null, tenantId = null) => {
   if (!discountMaster) return { overallDiscountAmount: 0, eligibleDiscountSubtotal: 0, distributedLines: {} };
   const res = exports.evaluatePromotions([discountMaster], items, { tenantId, orderSubtotal, now: new Date() });
   return {
       overallDiscountAmount: res.totalDiscountAmount,
       eligibleDiscountSubtotal: orderSubtotal,
       distributedLines: res.finalDistributedLines
   };
};

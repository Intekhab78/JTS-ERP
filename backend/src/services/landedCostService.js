const Product = require('../core/models/Product');

/**
 * Safely rounds a number to 6 decimal places to prevent float precision issues.
 */
const roundTo6 = (num) => {
  return Math.round(Number(num) * 1000000) / 1000000;
};

/**
 * Calculates landed cost and updates GRN items in place.
 * Returns the modified grn body (or items) with totals.
 */
exports.calculateLandedCost = async (grnData, tenantId) => {
  if (!grnData.items || grnData.items.length === 0) return grnData;

  const additionalCosts = grnData.additionalCosts || [];
  let totalAdditionalCost = 0;

  for (const cost of additionalCosts) {
    if (cost.amount < 0) throw new Error('Additional cost amount cannot be negative');
    totalAdditionalCost += Number(cost.amount) || 0;
  }
  totalAdditionalCost = roundTo6(totalAdditionalCost);

  let totalPurchaseCost = 0;
  
  // Calculate Purchase Amount per item
  for (const item of grnData.items) {
    if ((item.purchaseUnitPrice || 0) < 0) throw new Error(`Purchase unit price cannot be negative for item ${item.itemName}`);
    
    // Purchase amount is based on accepted quantity
    item.purchaseAmount = roundTo6((item.acceptedQuantity || 0) * (item.purchaseUnitPrice || 0));
    totalPurchaseCost += item.purchaseAmount;
    
    // Default base quantity check (prevent division by zero later if baseQty is 0 and we are allocating)
    item.baseQuantity = item.baseQuantity || 0;
  }
  
  totalPurchaseCost = roundTo6(totalPurchaseCost);
  
  const method = grnData.allocationMethod || 'By Purchase Value';

  // Initialize allocatedAdditionalCost to 0 for all items first to prevent NaN
  for (const item of grnData.items) {
    item.allocatedAdditionalCost = 0;
  }

  if (totalAdditionalCost > 0) {
    // We only need to allocate if there are additional costs
    const numItems = grnData.items.length;
    let remainingCost = totalAdditionalCost;

    if (method === 'By Quantity') {
      const totalBaseQty = grnData.items.reduce((sum, item) => sum + (item.baseQuantity || 0), 0);
      if (totalBaseQty > 0) {
        grnData.items.forEach((item, index) => {
          if (index === numItems - 1) {
            item.allocatedAdditionalCost = roundTo6(remainingCost);
          } else {
            const ratio = (item.baseQuantity || 0) / totalBaseQty;
            const allocated = roundTo6(totalAdditionalCost * ratio);
            item.allocatedAdditionalCost = allocated;
            remainingCost -= allocated;
          }
        });
      }
    } else if (method === 'By Purchase Value') {
      if (totalPurchaseCost > 0) {
        grnData.items.forEach((item, index) => {
          if (index === numItems - 1) {
            item.allocatedAdditionalCost = roundTo6(remainingCost);
          } else {
            const ratio = (item.purchaseAmount || 0) / totalPurchaseCost;
            const allocated = roundTo6(totalAdditionalCost * ratio);
            item.allocatedAdditionalCost = allocated;
            remainingCost -= allocated;
          }
        });
      }
    } else if (method === 'By Weight') {
      const productIds = grnData.items.map(i => i.productId);
      const products = await Product.find({ _id: { $in: productIds }, tenantId });
      
      let totalWeight = 0;
      for (const item of grnData.items) {
        const product = products.find(p => p._id.toString() === item.productId.toString());
        if (!product || !product.weight || product.weight <= 0) {
          // If we want to strictly enforce weight we can throw, but for drafts we can just ignore it or set to 0.
          item._calculatedWeight = 0;
        } else {
          item._calculatedWeight = (item.baseQuantity || 0) * product.weight;
        }
        totalWeight += item._calculatedWeight;
      }
      
      if (totalWeight > 0) {
        grnData.items.forEach((item, index) => {
          if (index === numItems - 1) {
            item.allocatedAdditionalCost = roundTo6(remainingCost);
          } else {
            const ratio = item._calculatedWeight / totalWeight;
            const allocated = roundTo6(totalAdditionalCost * ratio);
            item.allocatedAdditionalCost = allocated;
            remainingCost -= allocated;
          }
        });
      }
    } else if (method === 'Equal Distribution') {
      if (numItems <= 0) throw new Error('No items to allocate to');
      
      grnData.items.forEach((item, index) => {
        if (index === numItems - 1) {
          item.allocatedAdditionalCost = roundTo6(remainingCost);
        } else {
          const allocated = roundTo6(totalAdditionalCost / numItems);
          item.allocatedAdditionalCost = allocated;
          remainingCost -= allocated;
        }
      });
    } else if (method === 'Manual') {
      let manualTotal = 0;
      for (const item of grnData.items) {
        manualTotal += Number(item.allocatedAdditionalCost) || 0;
      }
      manualTotal = roundTo6(manualTotal);
      if (Math.abs(manualTotal - totalAdditionalCost) > 0.000001) {
        throw new Error(`Manual allocation total (${manualTotal}) must equal total additional cost (${totalAdditionalCost}).`);
      }
    } else {
      throw new Error(`Invalid allocation method: ${method}`);
    }
  } else {
    // No additional costs
    for (const item of grnData.items) {
      item.allocatedAdditionalCost = 0;
    }
  }

  // Calculate Final Landed Costs
  let totalLandedCost = 0;
  for (const item of grnData.items) {
    item.totalLandedCost = roundTo6(item.purchaseAmount + item.allocatedAdditionalCost);
    if (item.baseQuantity && item.baseQuantity > 0) {
      item.landedUnitCost = roundTo6(item.totalLandedCost / item.baseQuantity);
    } else {
      item.landedUnitCost = 0; // Prevent div by zero
    }
    totalLandedCost += item.totalLandedCost;
  }

  grnData.totalPurchaseCost = totalPurchaseCost;
  grnData.totalAdditionalCost = totalAdditionalCost;
  grnData.totalLandedCost = roundTo6(totalLandedCost);

  return grnData;
};

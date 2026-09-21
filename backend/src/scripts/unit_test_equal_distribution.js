const { default: mongoose } = require('mongoose');

// Helper function logic under test
const calculateEqualDistribution = (poItems, branches, expectedDate, destinationType, tenantId, poId) => {
  let poItemsWithRemainingQuantity = 0;
  let totalRemainingQuantity = 0;
  let totalSchedulesCreated = 0;
  let totalQuantityAllocated = 0;
  let itemsProcessed = 0;
  
  const newSchedules = [];
  const bulkItemUpdates = [];
  const storeCount = branches.length;

  for (const item of poItems) {
    const remaining = Number((item.quantity - (item.scheduledQuantity || 0)).toFixed(6));
    if (remaining <= 0) continue;

    itemsProcessed++;
    poItemsWithRemainingQuantity++;
    totalRemainingQuantity += remaining;
    
    let allocatedForThisItem = 0;
    const isIntegerQty = Number.isInteger(remaining);

    if (isIntegerQty) {
      const baseQuantity = Math.floor(remaining / storeCount);
      let remainder = remaining % storeCount;

      for (let i = 0; i < storeCount; i++) {
        const branch = branches[i];
        let qtyToAllocate = baseQuantity + (i < remainder ? 1 : 0);

        if (qtyToAllocate > 0) {
          newSchedules.push({
            tenantId,
            purchaseOrderId: poId,
            purchaseOrderItemId: item._id,
            productId: item.productId,
            scheduledQuantity: qtyToAllocate,
            expectedDate,
            destinationType,
            branchId: branch._id,
            notes: 'Equal Distribution'
          });
          allocatedForThisItem += qtyToAllocate;
          totalSchedulesCreated++;
        }
      }
    } else {
      const PRECISION = 1000000;
      const remainingUnits = Math.round(remaining * PRECISION);
      const baseUnits = Math.floor(remainingUnits / storeCount);
      const remainderUnits = remainingUnits % storeCount;

      for (let i = 0; i < storeCount; i++) {
        const branch = branches[i];
        const units = baseUnits + (i < remainderUnits ? 1 : 0);
        let qtyToAllocate = Number((units / PRECISION).toFixed(6));

        if (qtyToAllocate > 0) {
          newSchedules.push({
            tenantId,
            purchaseOrderId: poId,
            purchaseOrderItemId: item._id,
            productId: item.productId,
            scheduledQuantity: qtyToAllocate,
            expectedDate,
            destinationType,
            branchId: branch._id,
            notes: 'Equal Distribution'
          });
          allocatedForThisItem = Number((allocatedForThisItem + qtyToAllocate).toFixed(6));
          totalSchedulesCreated++;
        }
      }
    }

    if (Number(allocatedForThisItem.toFixed(6)) !== Number(remaining.toFixed(6))) {
      throw new Error(`Distribution calculation mismatch for item ${item._id}. Expected: ${remaining}, Allocated: ${allocatedForThisItem}`);
    }

    totalQuantityAllocated += allocatedForThisItem;

    bulkItemUpdates.push({
      updateOne: {
        filter: { _id: item._id },
        update: { $inc: { scheduledQuantity: allocatedForThisItem } }
      }
    });
  }

  return {
    poItemsWithRemainingQuantity,
    totalRemainingQuantity: Number(totalRemainingQuantity.toFixed(6)),
    totalSchedulesCreated,
    totalQuantityAllocated: Number(totalQuantityAllocated.toFixed(6)),
    itemsProcessed,
    newSchedules,
    bulkItemUpdates
  };
};

function runUnitTests() {
  console.log('--- Running Equal Distribution Unit Tests ---');
  
  const dummyBranches = [
    { _id: 'b1', name: 'Store 1' },
    { _id: 'b2', name: 'Store 2' },
    { _id: 'b3', name: 'Store 3' }
  ];

  // Test Case 1: Integer quantity 10 across 3 stores -> expect 4, 3, 3 (sum=10)
  const items1 = [{ _id: 'item1', productId: 'p1', quantity: 10, scheduledQuantity: 0 }];
  const res1 = calculateEqualDistribution(items1, dummyBranches, null, 'Store', 't1', 'po1');
  console.log('Test 1 (10 / 3 stores):', res1.newSchedules.map(s => s.scheduledQuantity));
  if (res1.totalQuantityAllocated !== 10) throw new Error('Test 1 sum failed');
  if (res1.newSchedules[0].scheduledQuantity !== 4) throw new Error('Test 1 store 1 failed');
  if (res1.newSchedules[1].scheduledQuantity !== 3) throw new Error('Test 1 store 2 failed');
  if (res1.newSchedules[2].scheduledQuantity !== 3) throw new Error('Test 1 store 3 failed');
  console.log('✓ Test 1 Passed!');

  // Test Case 2: Quantity 2 across 3 stores -> expect 1, 1 (stores 1 & 2 only, no 0 qty for store 3)
  const items2 = [{ _id: 'item2', productId: 'p1', quantity: 2, scheduledQuantity: 0 }];
  const res2 = calculateEqualDistribution(items2, dummyBranches, null, 'Store', 't1', 'po1');
  console.log('Test 2 (2 / 3 stores):', res2.newSchedules.map(s => s.scheduledQuantity));
  if (res2.totalQuantityAllocated !== 2) throw new Error('Test 2 sum failed');
  if (res2.newSchedules.length !== 2) throw new Error('Test 2 should not create zero qty schedule for store 3');
  console.log('✓ Test 2 Passed!');

  // Test Case 3: Decimal quantity 10.55 across 3 stores -> expect sum = 10.55 exactly
  const items3 = [{ _id: 'item3', productId: 'p2', quantity: 10.55, scheduledQuantity: 0 }];
  const res3 = calculateEqualDistribution(items3, dummyBranches, null, 'Store', 't1', 'po1');
  console.log('Test 3 (10.55 / 3 stores):', res3.newSchedules.map(s => s.scheduledQuantity));
  if (res3.totalQuantityAllocated !== 10.55) throw new Error('Test 3 sum failed');
  console.log('✓ Test 3 Passed!');

  // Test Case 4: Partially scheduled item (ordered 500, scheduled 100, remaining 400)
  const items4 = [{ _id: 'item4', productId: 'p1', quantity: 500, scheduledQuantity: 100 }];
  const res4 = calculateEqualDistribution(items4, dummyBranches, null, 'Store', 't1', 'po1');
  console.log('Test 4 (remaining 400 / 3 stores):', res4.newSchedules.map(s => s.scheduledQuantity));
  if (res4.totalQuantityAllocated !== 400) throw new Error('Test 4 sum failed');
  console.log('✓ Test 4 Passed!');

  // Test Case 5: Large scale test (2000 items x 50 stores = 100,000 schedules)
  const largeBranches = Array.from({ length: 50 }, (_, i) => ({ _id: `branch_${i}`, name: `Store ${i}` }));
  const largeItems = Array.from({ length: 2000 }, (_, i) => ({
    _id: `item_${i}`,
    productId: `prod_${i % 100}`,
    quantity: 250,
    scheduledQuantity: 0
  }));
  const startTime = Date.now();
  const res5 = calculateEqualDistribution(largeItems, largeBranches, null, 'Store', 't1', 'po1');
  const elapsed = Date.now() - startTime;
  console.log(`Test 5 (2000 items x 50 stores = ${res5.totalSchedulesCreated} schedules) calculated in ${elapsed}ms`);
  if (res5.totalSchedulesCreated !== 100000) throw new Error('Test 5 schedules count failed');
  if (res5.totalQuantityAllocated !== 500000) throw new Error('Test 5 total quantity failed');
  console.log('✓ Test 5 Passed!');

  console.log('\n=============================================');
  console.log('ALL EQUAL DISTRIBUTION UNIT TESTS PASSED!');
  console.log('=============================================\n');
}

runUnitTests();

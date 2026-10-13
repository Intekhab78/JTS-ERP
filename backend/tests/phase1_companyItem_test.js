const assert = require('assert');
const CompanyItem = require('../src/core/models/CompanyItem');
const LegalCompany = require('../src/core/models/LegalCompany');
const Product = require('../src/core/models/Product');
const Category = require('../src/core/models/Category');
const companyItemService = require('../src/services/companyItemService');

// Mock Data
const tenant1 = '507f191e810c19729de860ea';
const tenant2 = '507f191e810c19729de860eb';
const legalCompany1 = '507f1f77bcf86cd799439011';
const legalCompany2 = '507f1f77bcf86cd799439012';
const legalCompanyTenant2 = '507f1f77bcf86cd799439013';
const product1 = '507f191e810c19729de860f1';
const productTenant2 = '507f191e810c19729de860f2';
const category1 = '507f191e810c19729de860f3';
const categoryTenant2 = '507f191e810c19729de860f4';

const user1 = { accessibleCompanyIds: [legalCompany1, legalCompany2] };
const userRestricted = { accessibleCompanyIds: [legalCompany1] };

// Simple Mock Setup
const mocks = {
  LegalCompany: {
    findOne: async (query) => {
      if (query._id === legalCompany1 && query.tenantId === tenant1) return { _id: legalCompany1 };
      if (query._id === legalCompany2 && query.tenantId === tenant1) return { _id: legalCompany2 };
      if (query._id === legalCompanyTenant2 && query.tenantId === tenant2) return { _id: legalCompanyTenant2 };
      return null;
    }
  },
  Product: {
    findOne: async (query) => {
      if (query._id === product1 && query.tenantId === tenant1) return { _id: product1 };
      if (query._id === productTenant2 && query.tenantId === tenant2) return { _id: productTenant2 };
      return null;
    }
  },
  Category: {
    findOne: async (query) => {
      if (query._id === category1 && query.tenantId === tenant1) return { _id: category1 };
      if (query._id === categoryTenant2 && query.tenantId === tenant2) return { _id: categoryTenant2 };
      return null;
    }
  },
  CompanyItem: {
    db: [],
    findOne: (query) => {
      const queryObj = {
        populate: function() { return this; },
        then: function(resolve, reject) {
          if (query._id && query._id.$ne) {
            resolve(mocks.CompanyItem.db.find(i => i.tenantId.toString() === query.tenantId.toString() && i.legalCompanyId.toString() === query.legalCompanyId.toString() && i.companySku === query.companySku && i._id.toString() !== query._id.$ne.toString()));
            return;
          }
          let result = mocks.CompanyItem.db.find(i => {
            let match = true;
            if (query.tenantId && query.tenantId.toString() !== i.tenantId.toString()) match = false;
            if (query.legalCompanyId && query.legalCompanyId.toString() !== i.legalCompanyId.toString()) match = false;
            if (query.productId && query.productId.toString() !== i.productId.toString()) match = false;
            if (query.companySku && query.companySku !== i.companySku) match = false;
            return match;
          });
          resolve(result);
        }
      };
      return queryObj;
    },
    prototype: {
      save: async function() {
        mocks.CompanyItem.db.push(this);
        return this;
      }
    }
  }
};

// Apply Mocks
LegalCompany.findOne = mocks.LegalCompany.findOne;
Product.findOne = mocks.Product.findOne;
Category.findOne = mocks.Category.findOne;
CompanyItem.findOne = mocks.CompanyItem.findOne;

// Patch CompanyItem constructor for save
CompanyItem.prototype.save = mocks.CompanyItem.prototype.save;

async function runTests() {
  console.log('--- Running Phase 1 CompanyItem Tests ---');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ ${name}`);
      console.error(err);
      failed++;
    }
  }

  mocks.CompanyItem.db = []; // reset db

  await test('valid CompanyItem creation', async () => {
    const data = { tenantId: tenant1, legalCompanyId: legalCompany1, productId: product1, categoryId: category1, companySku: 'SKU001', _id: 'item1' };
    await companyItemService.createCompanyItem(data, user1);
    const item = await companyItemService.getByProductAndCompany(product1, legalCompany1, tenant1, user1);
    assert.ok(item, 'Item was created');
  });

  await test('duplicate product within same LegalCompany rejected', async () => {
    const data = { tenantId: tenant1, legalCompanyId: legalCompany1, productId: product1, companySku: 'SKU002' };
    try {
      await companyItemService.createCompanyItem(data, user1);
      throw new Error('Should have failed');
    } catch (err) {
      assert.strictEqual(err.message, 'CompanyItem already exists for this Product and Legal Company');
    }
  });

  await test('same Product allowed in different LegalCompanies', async () => {
    const data = { tenantId: tenant1, legalCompanyId: legalCompany2, productId: product1, companySku: 'SKU001', _id: 'item2' };
    await companyItemService.createCompanyItem(data, user1);
    assert.strictEqual(mocks.CompanyItem.db.length, 2);
  });

  await test('duplicate companySku within same LegalCompany rejected', async () => {
    const data = { tenantId: tenant1, legalCompanyId: legalCompany1, productId: product1, companySku: 'SKU001' }; // Wait, product1 already exists in legalCompany1, let's use another product if we could, but we mocked findOne for Product to only accept product1. Let's just bypass the product check by updating an item.
    try {
      await companyItemService.updateCompanyItem('item2', { companySku: 'SKU001' }, tenant1, user1);
      // Wait, item2 is in legalCompany2, so SKU001 is allowed! Let's mock a new product for company1.
    } catch(err) {}
    
    const origProductFind = Product.findOne;
    Product.findOne = async () => ({ _id: 'product2' }); // allow any product temporarily
    const data3 = { tenantId: tenant1, legalCompanyId: legalCompany1, productId: 'product2', companySku: 'SKU001' };
    try {
      await companyItemService.createCompanyItem(data3, user1);
      throw new Error('Should have failed');
    } catch (err) {
      assert.strictEqual(err.message, 'companySku must be unique within the Legal Company');
    }
    Product.findOne = origProductFind; // restore
  });

  await test('cross-tenant Product rejected', async () => {
    const data = { tenantId: tenant1, legalCompanyId: legalCompany1, productId: productTenant2 };
    try {
      await companyItemService.createCompanyItem(data, user1);
      throw new Error('Should have failed');
    } catch (err) {
      assert.strictEqual(err.message, 'Product not found or does not belong to the active tenant');
    }
  });

  await test('cross-tenant Category rejected', async () => {
    const data = { tenantId: tenant1, legalCompanyId: legalCompany1, productId: product1, categoryId: categoryTenant2 };
    try {
      await companyItemService.createCompanyItem(data, user1);
      throw new Error('Should have failed');
    } catch (err) {
      assert.strictEqual(err.message, 'Category not found or does not belong to the active tenant');
    }
  });

  await test('cross-tenant LegalCompany rejected', async () => {
    const data = { tenantId: tenant1, legalCompanyId: legalCompanyTenant2, productId: product1 };
    try {
      await companyItemService.createCompanyItem(data, user1);
      throw new Error('Should have failed');
    } catch (err) {
      assert.strictEqual(err.message, 'LegalCompany not found or does not belong to the active tenant');
    }
  });

  await test('unauthorized LegalCompany access rejected', async () => {
    const data = { tenantId: tenant1, legalCompanyId: legalCompany2, productId: product1 };
    try {
      await companyItemService.createCompanyItem(data, userRestricted);
      throw new Error('Should have failed');
    } catch (err) {
      assert.strictEqual(err.message, 'User is not authorized to access this Legal Company');
    }
  });

  console.log(`\nTests completed: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();

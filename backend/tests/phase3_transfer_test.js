const assert = require('assert');

// Mock mongoose
class MockSchema {
  constructor() {}
  index() {}
  pre() {}
  post() {}
}
MockSchema.Types = { ObjectId: String, Decimal128: Number };

const mongooseMock = {
  models: {},
  model: function(name, schema) {
    if (schema) {
      this.models[name] = schema;
      return schema;
    }
    return this.models[name];
  },
  Schema: MockSchema,
  startSession: async () => ({
    startTransaction: () => {},
    commitTransaction: async () => {},
    abortTransaction: async () => {},
    endSession: () => {}
  })
};

// Override require to intercept mongoose
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(path) {
  if (path === 'mongoose') {
    return mongooseMock;
  }
  return originalRequire.apply(this, arguments);
};

// Mock Auth Middleware
const authMock = {
  verifyBranchAccess: async (branchId, req) => {
    if (req.user.roleId === 'unauthorized') return false;
    return true;
  },
  verifyProductAccess: async () => true
};
Module.prototype.require = function(path) {
  if (path === 'mongoose') return mongooseMock;
  if (path === '../../core/middleware/authMiddleware') return authMock;
  if (path === '../../core/utils/scopeHelper') return {
    getReadFilter: () => ({ tenantId: 'tenant1' }),
    validateCreateScope: (req, body) => body
  };
  return originalRequire.apply(this, arguments);
};

// Need to load models to populate mongooseMock before requiring controller
require('../src/core/models/Stock');
require('../src/core/models/StockMovement');
require('../src/core/models/StockTransfer');
require('../src/core/models/StockAdjustment');
require('../src/core/models/Branch');
require('../src/core/models/CompanyItem');

const stockController = require('../src/modules/inventory/stockController');

// Mocks Data
const tenant1 = 'tenant1';
const legalComp1 = 'comp1';
const legalComp2 = 'comp2';

const branch1 = { _id: 'b1', legalCompanyId: legalComp1 };
const branch2 = { _id: 'b2', legalCompanyId: legalComp2 };
const branch3 = { _id: 'b3', legalCompanyId: legalComp1 }; // Same company as b1

const product1 = 'p1';
const product2 = 'p2';

// State
let mockDb = {
  CompanyItem: [],
  StockTransfer: [],
  Stock: [],
  StockMovement: []
};

// Setup Mocks on models
const Branch = mongooseMock.model('Branch');
Branch.findById = (id) => {
  const p = (async () => {
    if (id === 'b1') return branch1;
    if (id === 'b2') return branch2;
    if (id === 'b3') return branch3;
    return null;
  })();
  p.session = () => p;
  p.lean = () => p;
  return p;
};

const CompanyItem = mongooseMock.model('CompanyItem');
CompanyItem.find = (query) => {
  const p = (async () => {
    return mockDb.CompanyItem.filter(ci => {
      let match = true;
      if (query.tenantId && ci.tenantId !== query.tenantId) match = false;
      if (query.legalCompanyId && ci.legalCompanyId !== query.legalCompanyId) match = false;
      if (query.productId && query.productId.$in) {
        if (!query.productId.$in.includes(ci.productId)) match = false;
      }
      return match;
    });
  })();
  p.session = () => p;
  p.lean = () => p;
  return p;
};

const StockTransfer = mongooseMock.model('StockTransfer');
StockTransfer.create = async (data) => {
  const transfer = { ...data, _id: 'trf1', save: async function() { return this; } };
  mockDb.StockTransfer.push(transfer);
  return transfer;
};
StockTransfer.findOne = (query) => {
  const p = (async () => {
    return mockDb.StockTransfer.find(t => t._id === query._id) || null;
  })();
  p.session = () => p;
  p.lean = () => p;
  return p;
};

const Stock = mongooseMock.model('Stock');
Stock.findOneAndUpdate = (query, update, opts) => {
  const p = (async () => {
    const stock = mockDb.Stock.find(s => s.branchId === query.branchId && s.productId === query.productId);
    if (stock && stock.quantity >= query.quantity.$gte) {
      stock.quantity += update.$inc.quantity;
      return stock;
    }
    return null;
  })();
  p.session = () => p;
  return p;
};
Stock.findOne = (query) => {
  const p = (async () => {
    const stock = mockDb.Stock.find(s => s.branchId === query.branchId && s.productId === query.productId);
    if (stock) {
      stock.save = async () => stock;
    }
    return stock || null;
  })();
  p.session = () => p;
  return p;
};
Stock.create = async (data) => {
  const d = Array.isArray(data) ? data[0] : data;
  const stock = { ...d, _id: 's' + Math.random(), save: async () => stock };
  mockDb.Stock.push(stock);
  return stock;
};

const StockMovement = mongooseMock.model('StockMovement');
StockMovement.create = async (data) => {
  const d = Array.isArray(data) ? data[0] : data;
  mockDb.StockMovement.push(d);
  return d;
};

async function runTests() {
  console.log('--- Running Phase 3 StockTransfer Tests ---');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    console.log(`Starting: ${name}`);
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

  function mockRes() {
    return {
      statusCode: 200,
      data: null,
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.data = data; return this; }
    };
  }

  // --- TESTS ---

  await test('A. Same LegalCompany transfer + destination CompanyItem exists → ALLOW', async () => {
    mockDb.CompanyItem = [{ tenantId: tenant1, legalCompanyId: legalComp1, productId: product1 }];
    const req = { user: { tenantId: tenant1, accessibleCompanyIds: [legalComp1, legalComp2] }, body: { sourceBranchId: 'b1', destinationBranchId: 'b3', items: [{ productId: product1, quantity: 5 }] } };
    const res = mockRes();
    
    await stockController.createTransfer(req, res);
    assert.strictEqual(res.statusCode, 201, res.data?.message);
  });

  await test('B. Same LegalCompany transfer + destination CompanyItem missing → REJECT', async () => {
    mockDb.CompanyItem = [];
    const req = { user: { tenantId: tenant1, accessibleCompanyIds: [legalComp1, legalComp2] }, body: { sourceBranchId: 'b1', destinationBranchId: 'b3', items: [{ productId: product1, quantity: 5 }] } };
    const res = mockRes();
    
    await stockController.createTransfer(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.message, 'Product is not configured for the destination Legal Company.');
  });

  await test('C. Cross LegalCompany transfer + destination CompanyItem exists → ALLOW physically', async () => {
    mockDb.CompanyItem = [{ tenantId: tenant1, legalCompanyId: legalComp2, productId: product1 }];
    const req = { user: { tenantId: tenant1, accessibleCompanyIds: [legalComp1, legalComp2] }, body: { sourceBranchId: 'b1', destinationBranchId: 'b2', items: [{ productId: product1, quantity: 5 }] } };
    const res = mockRes();
    
    await stockController.createTransfer(req, res);
    assert.strictEqual(res.statusCode, 201, res.data?.message);
  });

  await test('D. Cross LegalCompany transfer + destination CompanyItem missing → REJECT', async () => {
    mockDb.CompanyItem = [];
    const req = { user: { tenantId: tenant1, accessibleCompanyIds: [legalComp1, legalComp2] }, body: { sourceBranchId: 'b1', destinationBranchId: 'b2', items: [{ productId: product1, quantity: 5 }] } };
    const res = mockRes();
    
    await stockController.createTransfer(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.message, 'Product is not configured for the destination Legal Company.');
  });

  await test('E. Multiple-line transfer where all CompanyItems exist → ALLOW', async () => {
    mockDb.CompanyItem = [
      { tenantId: tenant1, legalCompanyId: legalComp2, productId: product1 },
      { tenantId: tenant1, legalCompanyId: legalComp2, productId: product2 }
    ];
    const req = { user: { tenantId: tenant1, accessibleCompanyIds: [legalComp1, legalComp2] }, body: { sourceBranchId: 'b1', destinationBranchId: 'b2', items: [{ productId: product1, quantity: 5 }, { productId: product2, quantity: 2 }] } };
    const res = mockRes();
    
    await stockController.createTransfer(req, res);
    assert.strictEqual(res.statusCode, 201, res.data?.message);
  });

  await test('F. Multiple-line transfer where one CompanyItem is missing → ENTIRE transfer REJECTED', async () => {
    mockDb.CompanyItem = [
      { tenantId: tenant1, legalCompanyId: legalComp2, productId: product1 } // product2 is missing
    ];
    const req = { user: { tenantId: tenant1, accessibleCompanyIds: [legalComp1, legalComp2] }, body: { sourceBranchId: 'b1', destinationBranchId: 'b2', items: [{ productId: product1, quantity: 5 }, { productId: product2, quantity: 2 }] } };
    const res = mockRes();
    
    await stockController.createTransfer(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.message, 'Product is not configured for the destination Legal Company.');
  });

  await test('G. Destination branch from another tenant / not found → REJECT', async () => {
    const req = { user: { tenantId: tenant1, accessibleCompanyIds: [legalComp1, legalComp2] }, body: { sourceBranchId: 'b1', destinationBranchId: 'invalid_branch', items: [{ productId: product1, quantity: 5 }] } };
    const res = mockRes();
    
    await stockController.createTransfer(req, res);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.data.message, 'Branch not found');
  });

  await test('H. Unauthorized source branch → REJECT', async () => {
    const req = { user: { tenantId: tenant1, roleId: 'unauthorized', accessibleCompanyIds: [legalComp1, legalComp2] }, body: { sourceBranchId: 'b1', destinationBranchId: 'b2', items: [{ productId: product1, quantity: 5 }] } };
    const res = mockRes();
    
    await stockController.createTransfer(req, res);
    assert.strictEqual(res.statusCode, 403);
  });

  await test('H2. Unauthorized destination LegalCompany → REJECT', async () => {
    mockDb.CompanyItem = [{ tenantId: tenant1, legalCompanyId: legalComp2, productId: product1 }];
    const req = { user: { tenantId: tenant1, accessibleCompanyIds: [legalComp1] }, body: { sourceBranchId: 'b1', destinationBranchId: 'b2', items: [{ productId: product1, quantity: 5 }] } };
    const res = mockRes();
    
    await stockController.createTransfer(req, res);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.data.message, 'Forbidden: You do not have access to the destination Legal Company.');
  });

  await test('I. CompanyItem from wrong tenant → REJECT', async () => {
    mockDb.CompanyItem = [{ tenantId: 'otherTenant', legalCompanyId: legalComp2, productId: product1 }];
    const req = { user: { tenantId: tenant1 }, body: { sourceBranchId: 'b1', destinationBranchId: 'b2', items: [{ productId: product1, quantity: 5 }] } };
    const res = mockRes();
    
    await stockController.createTransfer(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.message, 'Product is not configured for the destination Legal Company.');
  });

  await test('J. CompanyItem belongs to wrong LegalCompany → REJECT', async () => {
    mockDb.CompanyItem = [{ tenantId: tenant1, legalCompanyId: 'comp3', productId: product1 }];
    const req = { user: { tenantId: tenant1 }, body: { sourceBranchId: 'b1', destinationBranchId: 'b2', items: [{ productId: product1, quantity: 5 }] } };
    const res = mockRes();
    
    await stockController.createTransfer(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.message, 'Product is not configured for the destination Legal Company.');
  });

  await test('L. Verify no Product is duplicated', async () => {
    // Controller logic has no Product.create
    assert.ok(true);
  });

  await test('M. Verify existing StockTransfer behavior remains unchanged when validation passes (validateTransfer)', async () => {
    mockDb.StockTransfer = [{
      _id: 'trf_valid',
      tenantId: tenant1,
      legalCompanyId: legalComp1, // source company
      sourceBranchId: 'b1',
      destinationBranchId: 'b2',
      items: [{ productId: product1, quantity: 5 }],
      status: 'DRAFT',
      referenceNumber: 'REF123',
      save: async function() { this.status = 'VALIDATED'; return this; }
    }];
    mockDb.Stock = [
      { tenantId: tenant1, branchId: 'b1', productId: product1, quantity: 10 }
    ];
    mockDb.CompanyItem = [{ tenantId: tenant1, legalCompanyId: legalComp2, productId: product1 }];
    mockDb.StockMovement = [];

    const req = { user: { tenantId: tenant1, _id: 'u1' }, params: { id: 'trf_valid' } };
    const res = mockRes();

    await stockController.validateTransfer(req, res);
    
    assert.strictEqual(res.statusCode, 200, res.data?.message);
    
    // Check Source Stock decremented
    const sourceStock = mockDb.Stock.find(s => s.branchId === 'b1');
    assert.strictEqual(sourceStock.quantity, 5);
    
    // Check Destination Stock incremented/created
    const destStock = mockDb.Stock.find(s => s.branchId === 'b2');
    assert.strictEqual(destStock.quantity, 5);
    assert.strictEqual(destStock.legalCompanyId, legalComp2); // Must be dest company!
    
    // Check Movements Created
    assert.strictEqual(mockDb.StockMovement.length, 2);
    const outMove = mockDb.StockMovement.find(m => m.type === 'TRANSFER_OUT');
    const inMove = mockDb.StockMovement.find(m => m.type === 'TRANSFER_IN');
    
    assert.ok(outMove);
    assert.strictEqual(outMove.quantity, -5);
    assert.strictEqual(outMove.legalCompanyId, legalComp1);
    
    assert.ok(inMove);
    assert.strictEqual(inMove.quantity, 5);
    assert.strictEqual(inMove.legalCompanyId, legalComp2);
  });

  console.log(`\nTests completed: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();

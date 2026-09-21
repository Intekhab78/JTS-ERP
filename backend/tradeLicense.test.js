const { validateSupplierTradeLicense } = require('./src/modules/purchase/purchaseHelper');
const Company = require('./src/core/models/Company');
const Supplier = require('./src/core/models/Supplier');

jest.mock('./src/core/models/Company');
jest.mock('./src/core/models/Supplier');

describe('validateSupplierTradeLicense', () => {
  const tenantId = 'tenant123';
  const supplierId = 'supplier123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupMocks = (settingEnabled, expiryDateString) => {
    Company.findById.mockResolvedValue({
      settings: { ENABLE_TRADE_LICENSE_EXPIRY_CHECK: settingEnabled }
    });
    
    Supplier.findOne.mockResolvedValue({
      legalDetails: { tradeLicenseExpiryDate: expiryDateString }
    });
  };

  it('allows PO when setting is DISABLED and license is expired', async () => {
    setupMocks(false, '2020-01-01');
    const result = await validateSupplierTradeLicense(supplierId, tenantId);
    expect(result.valid).toBe(true);
  });

  it('allows PO when setting is DISABLED and license is missing', async () => {
    setupMocks(false, null);
    const result = await validateSupplierTradeLicense(supplierId, tenantId);
    expect(result.valid).toBe(true);
  });

  it('blocks PO when setting is ENABLED and license is expired', async () => {
    setupMocks(true, '2020-01-01');
    const result = await validateSupplierTradeLicense(supplierId, tenantId);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('SUPPLIER_TRADE_LICENSE_EXPIRED');
  });

  it('blocks PO when setting is ENABLED and license is missing', async () => {
    setupMocks(true, null);
    const result = await validateSupplierTradeLicense(supplierId, tenantId);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('SUPPLIER_TRADE_LICENSE_DATE_MISSING');
  });

  it('allows PO when setting is ENABLED and expiry is today', async () => {
    const today = new Date();
    setupMocks(true, today.toISOString());
    const result = await validateSupplierTradeLicense(supplierId, tenantId);
    expect(result.valid).toBe(true);
  });

  it('allows PO when setting is ENABLED and expiry is in the future', async () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    setupMocks(true, future.toISOString());
    const result = await validateSupplierTradeLicense(supplierId, tenantId);
    expect(result.valid).toBe(true);
  });
});

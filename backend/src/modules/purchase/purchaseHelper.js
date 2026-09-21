const Supplier = require('../../core/models/Supplier');
const Company = require('../../core/models/Company');

const validateSupplierTradeLicense = async (supplierId, tenantId) => {
  try {
    const company = await Company.findById(tenantId);
    if (!company) {
      throw new Error('Tenant Company not found');
    }

    const isEnabled = company.settings?.ENABLE_TRADE_LICENSE_EXPIRY_CHECK === true;
    
    if (!isEnabled) {
      return { valid: true };
    }

    const supplier = await Supplier.findOne({ _id: supplierId, tenantId });
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    const expiryDate = supplier.legalDetails?.tradeLicenseExpiryDate;
    
    if (!expiryDate) {
      return {
        valid: false,
        code: 'SUPPLIER_TRADE_LICENSE_DATE_MISSING',
        message: "Purchase Order cannot be created or confirmed because the supplier's Trade License expiry date is missing."
      };
    }

    // Compare date without time-of-day issues
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);

    if (expiry < today) {
      return {
        valid: false,
        code: 'SUPPLIER_TRADE_LICENSE_EXPIRED',
        message: "Purchase Order cannot be created or confirmed because the supplier's Trade License has expired."
      };
    }

    return { valid: true };

  } catch (error) {
    throw error;
  }
};

module.exports = {
  validateSupplierTradeLicense
};

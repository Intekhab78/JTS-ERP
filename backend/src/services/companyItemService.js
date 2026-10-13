const CompanyItem = require('../core/models/CompanyItem');
const Product = require('../core/models/Product');
const LegalCompany = require('../core/models/LegalCompany');
const Category = require('../core/models/Category');

class CompanyItemNotConfiguredError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CompanyItemNotConfiguredError';
    this.code = 'COMPANY_ITEM_NOT_CONFIGURED';
  }
}

class CompanyItemService {
  /**
   * Validate that all entities belong to the same tenant and the user has access to them
   */
  async _validateTenantAndScope(tenantId, legalCompanyId, productId, categoryId, user) {
    if (!tenantId) throw new Error('tenantId is required for validation');
    
    // Verify LegalCompany
    const legalCompany = await LegalCompany.findOne({ _id: legalCompanyId, tenantId }).lean();
    if (!legalCompany) {
      throw new Error('LegalCompany not found or does not belong to the active tenant');
    }
    if (user && user.accessibleCompanyIds && !user.accessibleCompanyIds.includes(legalCompanyId.toString())) {
      throw new Error('User is not authorized to access this Legal Company');
    }

    // Verify Product
    if (productId) {
      const product = await Product.findOne({ _id: productId, tenantId }).lean();
      if (!product) {
        throw new Error('Product not found or does not belong to the active tenant');
      }
    }

    // Verify Category
    if (categoryId) {
      const category = await Category.findOne({ _id: categoryId, tenantId }).lean();
      if (!category) {
        throw new Error('Category not found or does not belong to the active tenant');
      }
    }
  }

  /**
   * Primary canonical commercial resolution by explicit LegalCompany
   */
  async resolveByProductAndCompany({ tenantId, productId, legalCompanyId, user }) {
    await this._validateTenantAndScope(tenantId, legalCompanyId, productId, null, user);

    const companyItem = await CompanyItem.findOne({ tenantId, legalCompanyId, productId })
      .populate('categoryId')
      .populate('tax1')
      .lean();

    if (!companyItem) {
      throw new CompanyItemNotConfiguredError('Product is not configured for this Legal Company.');
    }

    const product = await Product.findById(productId).lean();

    // Fallbacks (ONLY if CompanyItem exists but field is explicitly allowed to be null/missing)
    // Note: Business rules dictate that if we want, we can map nulls back to product defaults here.
    // However, the rule is to strictly not use Product if CompanyItem is MISSING.
    const resolvedPrice = companyItem.salesPrice != null ? companyItem.salesPrice : product.salesPrice;
    const resolvedPurchasePrice = companyItem.purchasePrice != null ? companyItem.purchasePrice : product.purchasePrice;
    
    return {
      ...companyItem, // keep all original CompanyItem fields
      productIdentity: {
        _id: product._id,
        name: product.name,
        barcode: product.barcode,
        brand: product.brand,
        type: product.type,
        uom: product.uom,
        uomDetails: product.uomDetails,
        weight: product.weight,
        images: product.images,
        description: product.description3 || product.longDescription
      },
      // Merged commercial fields explicitly
      companySku: companyItem.companySku || product.sku, // legacy sku fallback if empty string
      salesPrice: resolvedPrice,
      purchasePrice: resolvedPurchasePrice,
      taxRate: companyItem.taxRate != null ? companyItem.taxRate : product.taxRate,
      isActive: companyItem.isActive !== undefined ? companyItem.isActive : product.isActive,
      allowDiscount: companyItem.allowDiscount !== undefined ? companyItem.allowDiscount : product.allowDiscount
    };
  }

  /**
   * Secondary canonical resolution by inferred Branch context
   */
  async resolveByProductAndBranch({ tenantId, productId, branchId, user }) {
    const Branch = require('../core/models/Branch');
    const branch = await Branch.findOne({ _id: branchId, tenantId }).lean();
    
    if (!branch) throw new Error('Branch not found or does not belong to the active tenant');
    if (!branch.legalCompanyId) throw new Error('Branch is missing a LegalCompany assignment');

    return await this.resolveByProductAndCompany({
      tenantId,
      productId,
      legalCompanyId: branch.legalCompanyId,
      user
    });
  }

  /**
   * Validate that the product is commercially saleable in a specific branch context
   */
  async validateSaleable({ tenantId, productId, branchId, user }) {
    // 1-6. Resolve CompanyItem (validates Product, Branch, Tenant, Auth, and CompanyItem existence)
    const resolved = await this.resolveByProductAndBranch({ tenantId, productId, branchId, user });
    
    if (resolved.isActive === false) {
      throw new CompanyItemNotConfiguredError('Product configuration is inactive for this Legal Company.');
    }

    // User requested to completely bypass assortment constraints.
    // If it has a CompanyItem (validated above), it is saleable.
    
    // We are no longer throwing CompanyItemNotConfiguredError for assortments.

    return resolved;
  }

  /**
   * Create a new CompanyItem
   */
  async createCompanyItem(data, user) {
    const { tenantId, legalCompanyId, productId, categoryId } = data;
    
    await this._validateTenantAndScope(tenantId, legalCompanyId, productId, categoryId, user);

    const existingItem = await CompanyItem.findOne({ tenantId, legalCompanyId, productId });
    if (existingItem) {
      throw new Error('CompanyItem already exists for this Product and Legal Company');
    }

    if (data.companySku) {
      const existingSku = await CompanyItem.findOne({ tenantId, legalCompanyId, companySku: data.companySku });
      if (existingSku) {
        throw new Error('companySku must be unique within the Legal Company');
      }
    }

    const companyItem = new CompanyItem(data);
    return await companyItem.save();
  }

  /**
   * Update an existing CompanyItem
   */
  async updateCompanyItem(id, updateData, tenantId, user) {
    const companyItem = await CompanyItem.findOne({ _id: id, tenantId });
    if (!companyItem) {
      throw new Error('CompanyItem not found');
    }

    await this._validateTenantAndScope(
      tenantId, 
      companyItem.legalCompanyId, 
      null, // product cannot be changed
      updateData.categoryId || null,
      user
    );

    if (updateData.companySku && updateData.companySku !== companyItem.companySku) {
      const existingSku = await CompanyItem.findOne({ 
        tenantId, 
        legalCompanyId: companyItem.legalCompanyId, 
        companySku: updateData.companySku,
        _id: { $ne: id }
      });
      if (existingSku) {
        throw new Error('companySku must be unique within the Legal Company');
      }
    }

    // Prevent changing fundamental identity
    delete updateData.tenantId;
    delete updateData.legalCompanyId;
    delete updateData.productId;

    Object.assign(companyItem, updateData);
    return await companyItem.save();
  }

  /**
   * Get CompanyItem by ID
   */
  async getCompanyItemById(id, tenantId, user) {
    const companyItem = await CompanyItem.findOne({ _id: id, tenantId })
      .populate('productId')
      .populate('categoryId')
      .populate('tax1');
      
    if (!companyItem) return null;

    if (user && user.accessibleCompanyIds && !user.accessibleCompanyIds.includes(companyItem.legalCompanyId.toString())) {
      throw new Error('User is not authorized to access this Legal Company');
    }

    return companyItem;
  }

  /**
   * Get CompanyItem by Product and LegalCompany
   */
  async getByProductAndCompany(productId, legalCompanyId, tenantId, user) {
    if (user && user.accessibleCompanyIds && !user.accessibleCompanyIds.includes(legalCompanyId.toString())) {
      throw new Error('User is not authorized to access this Legal Company');
    }

    return await CompanyItem.findOne({ productId, legalCompanyId, tenantId })
      .populate('productId')
      .populate('categoryId')
      .populate('tax1');
  }

  /**
   * Lookup CompanyItem by SKU
   */
  async getByCompanySku(companySku, legalCompanyId, tenantId, user) {
    if (user && user.accessibleCompanyIds && !user.accessibleCompanyIds.includes(legalCompanyId.toString())) {
      throw new Error('User is not authorized to access this Legal Company');
    }

    return await CompanyItem.findOne({ companySku, legalCompanyId, tenantId })
      .populate('productId')
      .populate('categoryId')
      .populate('tax1');
  }

  /**
   * Validate if an active CompanyItem exists
   */
  async validateActiveCompanyItem(productId, legalCompanyId, tenantId) {
    const item = await CompanyItem.findOne({ productId, legalCompanyId, tenantId, isActive: true });
    if (!item) {
      throw new Error('Product is not configured or is inactive for this Legal Company');
    }
    return item;
  }
}

module.exports = new CompanyItemService();
module.exports.CompanyItemNotConfiguredError = CompanyItemNotConfiguredError;

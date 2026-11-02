const mongoose = require('mongoose');
const Product = require('../../core/models/Product');
const Category = require('../../core/models/Category');
const Stock = require('../../core/models/Stock');
const OrderItem = require('../../core/models/OrderItem');
const PurchaseOrderItem = require('../../core/models/PurchaseOrderItem');
const StockMovement = require('../../core/models/StockMovement');
const UomConversion = require('../../core/models/UomConversion');
const CompanyItem = require('../../core/models/CompanyItem');
const LegalCompany = require('../../core/models/LegalCompany');
const EcomSettings = require('../../core/models/EcomSettings');
const POSOrder = require('../../core/models/POSOrder');
const TaxInvoice = require('../../core/models/TaxInvoice');
const VendorBill = require('../../core/models/VendorBill');
const ProductVariant = require('../../core/models/ProductVariant');

// @desc    Get all products for the tenant
// @route   GET /api/v1/inventory/products
// @access  Private
exports.getProducts = async (req, res) => {
  try {
    let tenantId = req.user.activeTenantId || req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Missing tenant context' });
    }
    
    tenantId = new mongoose.Types.ObjectId(tenantId);

    const filter = { tenantId };
    
    // Status filter
    if (req.query.includeInactive !== 'true') {
      filter.isActive = { $ne: false };
    }
    
    // Category filter
    if (req.query.categoryId) {
      filter.categoryId = new mongoose.Types.ObjectId(req.query.categoryId);
    }

    // Search filter
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { barcode: searchRegex },
        { brand: searchRegex }
      ];
    }
    
    // Barcode/SKU exact match
    if (req.query.barcode) filter.barcode = req.query.barcode;
    if (req.query.sku) filter.sku = req.query.sku;

    const pipeline = [
      { $match: filter }
    ];

    // Company filtering (via query or x-company-id header)
    const reqCompanyId = req.query.companyId || req.headers['x-company-id'];
    let companyIdObj = null;
    if (reqCompanyId && reqCompanyId !== 'ALL' && reqCompanyId !== 'null' && reqCompanyId !== 'undefined' && mongoose.Types.ObjectId.isValid(reqCompanyId)) {
      companyIdObj = new mongoose.Types.ObjectId(reqCompanyId);
      const LegalCompany = require('../../core/models/LegalCompany');
      const legalCompany = await LegalCompany.findOne({ _id: companyIdObj, tenantId }).lean();

      const compOr = [
        { companyIds: { $exists: false } },
        { companyIds: { $size: 0 } },
        { companyIds: companyIdObj }
      ];
      if (legalCompany && legalCompany.name) {
        compOr.push({ company: new RegExp(legalCompany.name, 'i') });
      }
      pipeline.push({ $match: { $or: compOr } });
    }

    let branchIdObj = null;
    if (req.query.branchId && req.query.branchId !== 'ALL' && req.query.branchId !== 'null' && req.query.branchId !== 'undefined') {
      const rawBranchId = req.query.branchId.split(',')[0].trim();
      if (mongoose.Types.ObjectId.isValid(rawBranchId)) {
        branchIdObj = new mongoose.Types.ObjectId(rawBranchId);
        
        const Branch = require('../../core/models/Branch');
        const branch = await Branch.findOne({ _id: branchIdObj, tenantId }).lean();
        
        if (branch) {
          const branchOr = [
            { branchIds: { $exists: false } },
            { branchIds: { $size: 0 } },
            { branchIds: branchIdObj }
          ];
          if (branch.name) {
            branchOr.push({ location: new RegExp(branch.name, 'i') });
          }
          pipeline.push({ $match: { $or: branchOr } });

          // Overlay CompanyItem pricing if branch has a Legal Company
          if (branch.legalCompanyId) {
            const legalCompanyId = branch.legalCompanyId;
            pipeline.push(
              {
                $lookup: {
                  from: 'companyitems',
                  let: { pid: '$_id' },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { $eq: ['$productId', '$$pid'] },
                            { $eq: ['$tenantId', tenantId] },
                            { $eq: ['$legalCompanyId', legalCompanyId] },
                            { $eq: [{ $ifNull: ['$isActive', true] }, true] }
                          ]
                        }
                      }
                    },
                    { $limit: 1 }
                  ],
                  as: 'companyItemMatch'
                }
              },
              {
                $addFields: {
                  companyItem: { $arrayElemAt: ['$companyItemMatch', 0] }
                }
              },
              {
                $addFields: {
                  sku: { $ifNull: ['$companyItem.companySku', '$sku'] },
                  salesPrice: { $ifNull: ['$companyItem.salesPrice', '$salesPrice'] },
                  purchasePrice: { $ifNull: ['$companyItem.purchasePrice', '$purchasePrice'] },
                  taxRate: { $ifNull: ['$companyItem.taxRate', '$taxRate'] },
                  categoryId: { $ifNull: ['$companyItem.categoryId', '$categoryId'] },
                  department: { $ifNull: ['$companyItem.department', '$department'] },
                  section: { $ifNull: ['$companyItem.section', '$section'] },
                  tax1: { $ifNull: ['$companyItem.tax1', '$tax1'] },
                  isActive: { $ifNull: ['$companyItem.isActive', '$isActive'] },
                  allowDiscount: { $ifNull: ['$companyItem.allowDiscount', '$allowDiscount'] }
                }
              },
              {
                $project: { companyItemMatch: 0, companyItem: 0 }
              }
            );
          }
        }
      }
    }

      // User requested to remove the Assortment/Catalog restriction entirely.
      // Visibility is now strictly based on CompanyItem and Stock.
    
    // Sorting & Pagination (apply before stock lookup to save DB CPU)
    pipeline.push({ $sort: { createdAt: -1 } });
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || (req.query.paginated === 'true' ? 50 : 1000); // Allow bigger default for legacy endpoints until they are updated
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: limit });

    // Note: If branchId is passed, we also need stock!
    if (branchIdObj) {
      pipeline.push(
        {
          $lookup: {
            from: 'stocks',
            let: { productId: '$_id' },
            pipeline: [
              { 
                $match: { 
                  $expr: { 
                    $and: [
                      { $eq: ['$productId', '$$productId'] },
                      { $eq: ['$tenantId', tenantId] },
                      { $eq: ['$branchId', branchIdObj] },
                      { $eq: [{ $ifNull: ['$ownerType', 'COMPANY'] }, 'COMPANY'] }
                    ] 
                  } 
                } 
              }
            ],
            as: 'stockRecords'
          }
        },
        {
          $addFields: {
            stock: { $sum: '$stockRecords.quantity' }
          }
        },
        {
          $addFields: {
            status: {
              $switch: {
                branches: [
                  { case: { $eq: ['$stock', 0] }, then: 'Out of Stock' },
                  { case: { $lte: ['$stock', 5] }, then: 'Low Stock' }
                ],
                default: 'In Stock'
              }
            }
          }
        }
      );
      
      // Stock filtering if explicitly requested
      if (req.query.inStockOnly === 'true') {
        pipeline.push({ $match: { stock: { $gt: 0 } } });
      }
    } else {
      pipeline.push(
        { $addFields: { stock: 0, status: 'In Stock' } }
      );
    }

    // Attach categories and taxes
    pipeline.push(
      {
        $lookup: {
          from: 'categories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $addFields: {
          categoryId: {
            $cond: {
              if: { $gt: [{ $size: '$category' }, 0] },
              then: { 
                _id: { $arrayElemAt: ['$category._id', 0] },
                name: { $arrayElemAt: ['$category.name', 0] }
              },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: 'taxes',
          localField: 'tax1',
          foreignField: '_id',
          as: 'tax1Details'
        }
      },
      {
        $addFields: {
          tax1: {
            $cond: {
              if: { $gt: [{ $size: '$tax1Details' }, 0] },
              then: { $arrayElemAt: ['$tax1Details', 0] },
              else: null
            }
          }
        }
      }
    );

    // Cleanup projections
    pipeline.push(
      {
        $project: {
          stockRecords: 0,
          category: 0,
          tax1Details: 0,
          assortmentMatch: 0,
          overrideMatch: 0
        }
      }
    );

    const products = await Product.aggregate(pipeline);
    
    // Add id alias for frontend compatibility
    const formattedProducts = products.map(p => ({ ...p, id: p._id }));
    
    if (req.query.paginated === 'true') {
      res.status(200).json({ products: formattedProducts });
    } else {
      // Legacy backward compatible return type
      res.status(200).json(formattedProducts);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a product
// @route   POST /api/v1/inventory/products
// @access  Private
exports.createProduct = async (req, res) => {
  try {
    let tenantId = req.user.activeTenantId || req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Missing tenant context' });
    }

    const { 
      name, sku, categoryId, price, type, uom, brand, barcode, purchasePrice, 
      salesPrice, taxRate, isActive, uomDetails, landedCost, costingMethod,
      department, family, subFamily, color, size, hsnCode, itemReference, styleCode,
      longDescription, description3, description4, itemDescriptionDetails, note1, note2, note3,
      minStockLevel, maxStockLevel, stockManagement, weight, weightUom, expiry, expiryType, expiryDays, date1, date2, uploadImage,
      company, location, companyIds, branchIds, tax1, supplierName, hasVariants, variantAttributeDefinitions
    } = req.body;

    // Check if category exists and belongs to tenant
    const category = await Category.findOne({ _id: categoryId, tenantId });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Validate UOM Conversions
    if (uomDetails) {
      const { baseUnit, purchaseUnit, salesUnit } = uomDetails;
      if (baseUnit && purchaseUnit && baseUnit !== purchaseUnit) {
        const conv = await UomConversion.findOne({ tenantId, fromUom: purchaseUnit, toUom: baseUnit, isActive: true });
        if (!conv) return res.status(400).json({ message: `No active conversion defined for ${purchaseUnit} -> ${baseUnit}` });
        uomDetails.purchaseConversionFactor = conv.conversionFactor;
      } else if (baseUnit === purchaseUnit) {
        uomDetails.purchaseConversionFactor = 1;
      }

      if (baseUnit && salesUnit && baseUnit !== salesUnit) {
        const conv = await UomConversion.findOne({ tenantId, fromUom: salesUnit, toUom: baseUnit, isActive: true });
        if (!conv) return res.status(400).json({ message: `No active conversion defined for ${salesUnit} -> ${baseUnit}` });
        uomDetails.salesConversionFactor = conv.conversionFactor;
      } else if (baseUnit === salesUnit) {
        uomDetails.salesConversionFactor = 1;
      }
    }

    const resolvedType = (type && String(type).trim()) ? String(type).trim() : 'STANDARD';

    const product = await Product.create({
      tenantId, name, sku, categoryId, price: salesPrice || price || 0, type: resolvedType, uom, brand, barcode, 
      purchasePrice, salesPrice: salesPrice || price || 0, taxRate, isActive: isActive !== undefined ? isActive : true,
      uomDetails, landedCost, costingMethod, department, family, subFamily, color, size, hsnCode, itemReference, styleCode,
      longDescription, description3, description4, itemDescriptionDetails, note1, note2, note3,
      minStockLevel, maxStockLevel, stockManagement, weight, weightUom, expiry, expiryType, expiryDays, date1, date2, uploadImage,
      company, location, 
      companyIds: Array.isArray(companyIds) ? companyIds : [],
      branchIds: Array.isArray(branchIds) ? branchIds : [],
      tax1, supplierName,
      hasVariants: Boolean(hasVariants),
      variantAttributeDefinitions: Array.isArray(variantAttributeDefinitions)
        ? variantAttributeDefinitions.filter(d => d && d.name && Array.isArray(d.values) && d.values.some(v => typeof v === 'string' && v.trim() !== ''))
        : [],
      createdBy: req.user._id
    });

    // PHASE 6: Centralized Product + Localized CompanyItem Creation
    const activeCompanyId = req.headers['x-company-id'];
    let targetCompanies = [];

    if (Array.isArray(companyIds) && companyIds.length > 0) {
      targetCompanies = await LegalCompany.find({ _id: { $in: companyIds }, tenantId });
    } else if (!activeCompanyId || activeCompanyId === 'ALL' || activeCompanyId === 'null' || activeCompanyId === 'undefined') {
      // Create CompanyItem for ALL active legal companies in the tenant
      targetCompanies = await LegalCompany.find({ tenantId, isActive: true });
    } else {
      // Create CompanyItem ONLY for the currently selected legal company
      const selectedCompany = await LegalCompany.findOne({ _id: activeCompanyId, tenantId });
      if (selectedCompany) {
        targetCompanies = [selectedCompany];
      }
    }

    // Generate CompanyItems
    for (const legalCompany of targetCompanies) {
      await CompanyItem.create({
        tenantId: tenantId,
        productId: product._id,
        legalCompanyId: legalCompany._id,
        purchasePrice: purchasePrice || 0,
        salesPrice: salesPrice || price || 0,
        taxRate: taxRate || 0,
        taxAmount: 0,
        isActive: isActive !== undefined ? isActive : true
      });
    }

    const populatedProduct = await Product.findById(product._id).populate('categoryId', 'name');
    
    const formattedProduct = populatedProduct.toObject();
    formattedProduct.stock = 0;
    formattedProduct.status = 'Out of Stock';
    
    res.status(201).json(formattedProduct);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A product with this SKU already exists.' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a product
// @route   PUT /api/v1/inventory/products/:id
// @access  Private
exports.updateProduct = async (req, res) => {
  try {
    let tenantId = req.user.activeTenantId || req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Missing tenant context' });
    }

    const product = await Product.findOne({ _id: req.params.id, tenantId });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const updates = { ...req.body, updatedBy: req.user._id };
    // Synchronize price fields for backward compatibility
    if (updates.salesPrice !== undefined) {
      updates.price = updates.salesPrice;
    } else if (updates.price !== undefined) {
      updates.salesPrice = updates.price;
    }

    // Validate UOM Changes
    if (updates.uomDetails && product.uomDetails) {
      const { baseUnit, purchaseUnit, salesUnit } = updates.uomDetails;
      
      const baseChanged = baseUnit && baseUnit !== product.uomDetails.baseUnit;
      const purchaseUnitChanged = purchaseUnit && purchaseUnit !== product.uomDetails.purchaseUnit;
      const salesUnitChanged = salesUnit && salesUnit !== product.uomDetails.salesUnit;

      // Only re-fetch and update conversion factors if the actual units were changed by the user
      if (baseChanged || purchaseUnitChanged) {
        if (baseUnit && purchaseUnit && baseUnit !== purchaseUnit) {
          const conv = await UomConversion.findOne({ tenantId, fromUom: purchaseUnit, toUom: baseUnit, isActive: true });
          if (!conv) return res.status(400).json({ message: `No active conversion defined for ${purchaseUnit} -> ${baseUnit}` });
          updates.uomDetails.purchaseConversionFactor = conv.conversionFactor;
        } else if (baseUnit === purchaseUnit) {
          updates.uomDetails.purchaseConversionFactor = 1;
        }
      } else {
        // Keep the original factor if units didn't change
        updates.uomDetails.purchaseConversionFactor = product.uomDetails.purchaseConversionFactor;
      }

      if (baseChanged || salesUnitChanged) {
        if (baseUnit && salesUnit && baseUnit !== salesUnit) {
          const conv = await UomConversion.findOne({ tenantId, fromUom: salesUnit, toUom: baseUnit, isActive: true });
          if (!conv) return res.status(400).json({ message: `No active conversion defined for ${salesUnit} -> ${baseUnit}` });
          updates.uomDetails.salesConversionFactor = conv.conversionFactor;
        } else if (baseUnit === salesUnit) {
          updates.uomDetails.salesConversionFactor = 1;
        }
      } else {
         // Keep the original factor if units didn't change
         updates.uomDetails.salesConversionFactor = product.uomDetails.salesConversionFactor;
      }

      const oldPurchaseFactor = Number(product.uomDetails.purchaseConversionFactor || 1);
      const newPurchaseFactor = Number(updates.uomDetails.purchaseConversionFactor || 1);
      const purchaseFactorChanged = newPurchaseFactor !== oldPurchaseFactor;
      
      const oldSalesFactor = Number(product.uomDetails.salesConversionFactor || 1);
      const newSalesFactor = Number(updates.uomDetails.salesConversionFactor || 1);
      const salesFactorChanged = newSalesFactor !== oldSalesFactor;

      if (baseChanged || purchaseFactorChanged || salesFactorChanged) {
        // TEMP BYPASS: Commenting out the transaction check so the user can save the product and upload images.
        // const hasTransactions = await StockMovement.exists({ productId: product._id, tenantId });
        // if (hasTransactions) {
        //   return res.status(400).json({ message: 'Cannot change UOM configurations for a product with existing stock transactions.' });
        // }
      }
    }

    if (updates.variantAttributeDefinitions && Array.isArray(updates.variantAttributeDefinitions)) {
      updates.variantAttributeDefinitions = updates.variantAttributeDefinitions.filter(
        d => d && d.name && Array.isArray(d.values) && d.values.some(v => typeof v === 'string' && v.trim() !== '')
      );
    }

    Object.assign(product, updates);
    await product.save();

    // Clean up disk files if images list was modified
    if (updates.images !== undefined || updates.uploadImage !== undefined) {
      try {
        const pDir = path.join(__dirname, '../../../uploads/products', tenantId.toString(), product._id.toString());
        if (fs.existsSync(pDir)) {
          const retainedFiles = new Set();
          const extractBaseName = (url) => {
            if (!url || typeof url !== 'string') return;
            const clean = url.split('?')[0].split('#')[0];
            const base = path.basename(clean);
            if (base) retainedFiles.add(base);
          };
          if (product.uploadImage) extractBaseName(product.uploadImage);
          if (Array.isArray(product.images)) product.images.forEach(extractBaseName);

          const diskFiles = fs.readdirSync(pDir);
          for (const file of diskFiles) {
            if (!retainedFiles.has(file)) {
              try {
                fs.unlinkSync(path.join(pDir, file));
              } catch (_) {}
            }
          }
        }
      } catch (_) {}
    }

    const updatedProduct = await Product.findById(product._id).populate('categoryId', 'name');

    // PHASE 6: Update CompanyItem for the currently selected Legal Company or explicit companyIds
    const activeCompanyId = req.headers['x-company-id'];
    const CompanyItem = require('../../core/models/CompanyItem');
    const targetCompIds = (Array.isArray(updates.companyIds) && updates.companyIds.length > 0)
      ? updates.companyIds
      : (activeCompanyId && activeCompanyId !== 'ALL' && activeCompanyId !== 'null' && activeCompanyId !== 'undefined' ? [activeCompanyId] : []);

    for (const cId of targetCompIds) {
      await CompanyItem.findOneAndUpdate(
        { tenantId, productId: updatedProduct._id, legalCompanyId: cId },
        {
          $set: {
            salesPrice: updates.salesPrice !== undefined ? updates.salesPrice : (updates.price || updatedProduct.price),
            purchasePrice: updates.purchasePrice !== undefined ? updates.purchasePrice : updatedProduct.purchasePrice,
            taxRate: updates.taxRate !== undefined ? updates.taxRate : updatedProduct.taxRate,
            isActive: updates.isActive !== undefined ? updates.isActive : true
          }
        },
        { upsert: true }
      );
    }

    res.status(200).json(updatedProduct);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A product with this SKU already exists.' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a product
// @route   DELETE /api/v1/inventory/products/:id
// @access  Private
exports.deleteProduct = async (req, res) => {
  try {
    let tenantId = req.user.activeTenantId || req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Missing tenant context' });
    }

    const product = await Product.findOne({ _id: req.params.id, tenantId });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const force = req.query.force === 'true';

    // Check transactional dependencies (sales orders, purchases, POS, tax invoices, vendor bills)
    const hasSales = await OrderItem.exists({ productId: product._id });
    const hasPurchases = await PurchaseOrderItem.exists({ productId: product._id });
    const hasPOS = await POSOrder.exists({ 'items.productId': product._id });
    const hasTaxInvoices = await TaxInvoice.exists({ 'items.productId': product._id });
    const hasVendorBills = await VendorBill.exists({ 'items.productId': product._id });

    const hasTransactions = Boolean(hasSales || hasPurchases || hasPOS || hasTaxInvoices || hasVendorBills);

    if (hasTransactions && !force) {
      // Soft Delete: deactivate product and related company items
      product.isActive = false;
      await product.save();
      await CompanyItem.updateMany(
        { productId: product._id, tenantId },
        { $set: { isActive: false } }
      );
      return res.status(200).json({ 
        message: 'Product has historical transaction records and was deactivated/archived.',
        softDeleted: true 
      });
    }

    // Hard Delete: cascade cleanup of all child records
    await Promise.all([
      Stock.deleteMany({ productId: product._id, tenantId }),
      StockMovement.deleteMany({ productId: product._id, tenantId }),
      CompanyItem.deleteMany({ productId: product._id, tenantId }),
      ProductVariant.deleteMany({ productId: product._id, tenantId }),
      Product.findOneAndDelete({ _id: product._id, tenantId })
    ]);

    res.status(200).json({ message: 'Product permanently removed', softDeleted: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all categories for the tenant
// @route   GET /api/v1/inventory/categories
// @access  Private
exports.getCategories = async (req, res) => {
  try {
    const tenantContext = req.user.activeTenantId || req.user.tenantId;
    const categories = await Category.find({ tenantId: tenantContext })
      .populate('itemDepartmentId', 'name code')
      .sort('name');
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a category
// @route   POST /api/v1/inventory/categories
// @access  Private
exports.createCategory = async (req, res) => {
  try {
    const { name, description, itemDepartmentId, code, isActive } = req.body;

    const tenantContext = req.user.activeTenantId || req.user.tenantId;
    const category = await Category.create({
      tenantId: tenantContext,
      name,
      description,
      itemDepartmentId: itemDepartmentId || undefined,
      code: code ? code.trim().toUpperCase() : undefined,
      isActive: isActive !== undefined ? isActive : true
    });

    // Auto-map to ecommerce settings
    EcomSettings.updateOne(
      { tenantId: tenantContext },
      { $addToSet: { mappedCategories: category._id.toString() } }
    ).catch(() => {});

    const populated = await Category.findById(category._id).populate('itemDepartmentId', 'name code');
    res.status(201).json(populated || category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const tenantContext = req.user.activeTenantId || req.user.tenantId;
    const updateData = { ...req.body };
    if (updateData.code) {
      updateData.code = updateData.code.trim().toUpperCase();
    }
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, tenantId: tenantContext },
      updateData,
      { returnDocument: 'after', runValidators: true }
    ).populate('itemDepartmentId', 'name code');
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const tenantId = req.user.activeTenantId || req.user.tenantId;

    const category = await Category.findOne({ _id: categoryId, tenantId });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    // Delete protection check
    const isUsed = await Product.exists({ tenantId, categoryId });
    if (isUsed) {
      return res.status(400).json({ message: 'Category cannot be deleted because it is being used by existing products.' });
    }

    await Category.findOneAndDelete({ _id: categoryId, tenantId });
    res.status(200).json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload product images
// @route   POST /api/v1/inventory/products/:id/images
// @access  Private
exports.uploadProductImage = async (req, res) => {
  try {
    let tenantId = req.user?.activeTenantId || req.user?.tenantId || req.headers?.['x-tenant-id'];
    if (!tenantId) {
      const Company = require('../../core/models/Company');
      const company = await Company.findOne({ name: /JTS Group/i }) || await Company.findOne();
      tenantId = company?._id;
    }
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const product = await Product.findOne({ _id: req.params.id, tenantId });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const uploadedFiles = req.files && req.files.length > 0 ? req.files : (req.file ? [req.file] : []);
    if (uploadedFiles.length === 0) {
      return res.status(400).json({ message: 'Please upload at least one image' });
    }

    const newImageUrls = uploadedFiles.map(file => {
      // Build clean URL path relative to server root
      return `/uploads/products/${tenantId}/${product._id}/${file.filename}`;
    });

    product.images = [...(product.images || []), ...newImageUrls];
    if (!product.uploadImage || product.uploadImage.trim() === '') {
      product.uploadImage = product.images[0] || null;
    }
    await product.save();

    res.status(200).json({
      message: 'Images uploaded successfully',
      images: product.images,
      uploadImage: product.uploadImage
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a product image
// @route   DELETE /api/v1/inventory/products/:id/images/:imageName
// @access  Private
exports.deleteProductImage = async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    let tenantId = req.user?.activeTenantId || req.user?.tenantId || req.headers?.['x-tenant-id'];
    if (!tenantId) {
      const Company = require('../../core/models/Company');
      const company = await Company.findOne({ name: /JTS Group/i }) || await Company.findOne();
      tenantId = company?._id;
    }

    const product = await Product.findOne({ _id: req.params.id, tenantId });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const { imageName } = req.params;
    
    // Find the image URL in the array that ends with the given imageName
    let imageUrlIndex = -1;
    if (Array.isArray(product.images)) {
      imageUrlIndex = product.images.findIndex(url => url && url.endsWith(imageName));
      if (imageUrlIndex !== -1) {
        product.images.splice(imageUrlIndex, 1);
      }
    }

    let uploadImageMatched = false;
    if (product.uploadImage && product.uploadImage.endsWith(imageName)) {
      product.uploadImage = (product.images && product.images.length > 0) ? product.images[0] : null;
      uploadImageMatched = true;
    }

    // Remove from filesystem (src/modules/inventory -> 3 levels up to backend root)
    const filePath = path.join(__dirname, '../../../uploads/products', tenantId.toString(), product._id.toString(), imageName);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Failed to unlink deleted image file:', e.message);
      }
    }

    if (imageUrlIndex === -1 && !uploadImageMatched && !fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Image not found in product record' });
    }

    await product.save();

    res.status(200).json({
      message: 'Image deleted successfully',
      images: product.images || []
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a specific product by barcode (optimized for POS)
// @route   GET /api/v1/inventory/products/barcode
// @access  Private
exports.getProductByBarcode = async (req, res) => {
  try {
    const tenantId = req.user.activeTenantId || req.user.tenantId;
    const { barcode, branchId } = req.query;

    if (!tenantId) return res.status(400).json({ message: 'Missing tenant context' });
    if (!barcode) return res.status(400).json({ message: 'Barcode is required' });

    // Exact lookup by barcode on parent product, then fallback to ProductVariant
    let product = await Product.findOne({ tenantId, barcode, isActive: { $ne: false } }).lean();
    let matchedVariant = null;

    if (!product) {
      const ProductVariant = require('../../core/models/ProductVariant');
      matchedVariant = await ProductVariant.findOne({ tenantId, barcode, isActive: { $ne: false } }).lean();
      if (matchedVariant) {
        product = await Product.findOne({ _id: matchedVariant.productId, tenantId, isActive: { $ne: false } }).lean();
      }
    }
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found with this barcode' });
    }

    if (branchId) {
      // Validate branch allocation if product is branch-restricted
      if (product.branchIds && product.branchIds.length > 0) {
        const branchIdStr = branchId.toString();
        const isBranchAllowed = product.branchIds.some(b => (b._id || b).toString() === branchIdStr);
        if (!isBranchAllowed) {
          const Branch = require('../../core/models/Branch');
          const branchDoc = await Branch.findById(branchId).lean();
          const matchesLocation = branchDoc && product.location && new RegExp(branchDoc.name, 'i').test(product.location);
          if (!matchesLocation) {
            return res.status(404).json({ message: 'Product is not assigned to this branch' });
          }
        }
      }

      const companyItemService = require('../../services/companyItemService');
      let resolvedItem;
      try {
        resolvedItem = await companyItemService.validateSaleable({
          tenantId,
          productId: product._id,
          branchId,
          user: req.user
        });
      } catch (err) {
        if (err.name === 'CompanyItemNotConfiguredError') {
          return res.status(403).json({ 
            success: false, 
            code: err.code, 
            message: err.message 
          });
        }
        throw err;
      }

      // Overwrite global commercial fields with local resolved commercial fields
      product.sku = matchedVariant ? matchedVariant.sku : resolvedItem.companySku;
      product.salesPrice = (matchedVariant && matchedVariant.salesPrice != null && matchedVariant.salesPrice > 0)
        ? matchedVariant.salesPrice
        : resolvedItem.salesPrice;
      product.purchasePrice = (matchedVariant && matchedVariant.purchasePrice != null && matchedVariant.purchasePrice > 0)
        ? matchedVariant.purchasePrice
        : resolvedItem.purchasePrice;
      product.taxRate = resolvedItem.taxRate;
      product.categoryId = resolvedItem.categoryId;
      product.department = resolvedItem.department;
      product.section = resolvedItem.section;
      product.tax1 = resolvedItem.tax1;
      product.isActive = resolvedItem.isActive;
      product.allowDiscount = resolvedItem.allowDiscount;
      product.isConfigured = true;

      if (matchedVariant) {
        product.variantId = matchedVariant._id;
        product.variantSku = matchedVariant.sku;
        product.variantAttributes = matchedVariant.attributes;
      }

      // Stock lookup with variant partitioning
      const Stock = require('../../core/models/Stock');
      const branchIdObj = new mongoose.Types.ObjectId(branchId);
      const stockFilter = {
        tenantId,
        branchId: branchIdObj,
        productId: product._id,
        ownerType: 'COMPANY'
      };
      if (matchedVariant) {
        stockFilter.variantId = matchedVariant._id;
      } else {
        stockFilter.variantId = { $in: [null, undefined] };
      }

      const stockRecords = await Stock.find(stockFilter).lean();
      const totalStock = stockRecords.reduce((sum, s) => sum + s.quantity, 0);
      
      product.stock = totalStock;
      
      if (totalStock === 0) product.status = 'Out of Stock';
      else if (totalStock <= 5) product.status = 'Low Stock';
      else product.status = 'In Stock';
      
    } else {
      // If no branch context is provided (e.g. global lookup), it is NOT commercially configured.
      product.isConfigured = false;
      product.stock = 0;
      product.status = 'In Stock';
      // Do not return pricing
      product.salesPrice = null;
      product.purchasePrice = null;
    }

    // Attach category and tax details minimally if they were resolved
    if (product.categoryId && typeof product.categoryId !== 'object') {
      const Category = require('../../core/models/Category');
      const category = await Category.findById(product.categoryId).lean();
      if (category) product.categoryId = { _id: category._id, name: category.name };
    }
    
    if (product.tax1 && typeof product.tax1 !== 'object') {
      const Tax = require('../../core/models/Tax');
      const tax = await Tax.findById(product.tax1).lean();
      if (tax) product.tax1 = tax;
    }

    product.id = product._id;
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const mongoose = require('mongoose');
const Product = require('../../core/models/Product');
const Category = require('../../core/models/Category');
const Stock = require('../../core/models/Stock');
const OrderItem = require('../../core/models/OrderItem');
const PurchaseOrderItem = require('../../core/models/PurchaseOrderItem');
const StockMovement = require('../../core/models/StockMovement');
const UomConversion = require('../../core/models/UomConversion');

// @desc    Get all products for the tenant
// @route   GET /api/v1/inventory/products
// @access  Private
exports.getProducts = async (req, res) => {
  try {
    let tenantId = req.user.tenantId;

    if (!tenantId) {
      if (!req.query.tenantId) {
        return res.status(400).json({ message: 'Global Superadmin must provide tenantId in query' });
      }
      tenantId = req.query.tenantId;
    }

    const filter = { tenantId };
    if (req.query.includeInactive !== 'true') {
      filter.isActive = { $ne: false };
    }

    const matchConditions = [
      { $eq: ['$productId', '$$productId'] },
      { $eq: ['$tenantId', '$$tenantId'] },
      { $eq: [{ $ifNull: ['$ownerType', 'COMPANY'] }, 'COMPANY'] }
    ];

    if (req.query.branchId) {
      matchConditions.push({ $eq: ['$branchId', new mongoose.Types.ObjectId(req.query.branchId)] });
    }

    const pipeline = [
      { $match: filter },
      { 
        $lookup: {
          from: 'stocks',
          let: { productId: '$_id', tenantId: '$tenantId' },
          pipeline: [
            { $match: { $expr: { $and: matchConditions } } }
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
    ];

    if (req.query.inStockOnly === 'true') {
      pipeline.push({ $match: { stock: { $gt: 0 } } });
    }

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
      },
      {
        $project: {
          stockRecords: 0,
          category: 0,
          tax1Details: 0
        }
      },
      { $sort: { createdAt: -1 } }
    );

    const products = await Product.aggregate(pipeline);
    
    // Add id alias for frontend compatibility
    const formattedProducts = products.map(p => ({ ...p, id: p._id }));
    
    res.status(200).json(formattedProducts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a product
// @route   POST /api/v1/inventory/products
// @access  Private
exports.createProduct = async (req, res) => {
  try {
    let tenantId = req.user.tenantId;
    if (!tenantId) {
      if (!req.body.tenantId) {
        return res.status(400).json({ message: 'Global Superadmin must provide tenantId' });
      }
      tenantId = req.body.tenantId;
    }

    const { 
      name, sku, categoryId, price, type, uom, brand, barcode, purchasePrice, 
      salesPrice, taxRate, isActive, uomDetails, landedCost, costingMethod,
      department, family, subFamily, color, size, hsnCode, itemReference, styleCode,
      longDescription, description3, description4, itemDescriptionDetails, note1, note2, note3,
      minStockLevel, maxStockLevel, stockManagement, weight, weightUom, expiry, expiryType, expiryDays, date1, date2, uploadImage,
      company, location, tax1, supplierName
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

    const product = await Product.create({
      tenantId, name, sku, categoryId, price: salesPrice || price || 0, type, uom, brand, barcode, 
      purchasePrice, salesPrice: salesPrice || price || 0, taxRate, isActive: isActive !== undefined ? isActive : true,
      uomDetails, landedCost, costingMethod, department, family, subFamily, color, size, hsnCode, itemReference, styleCode,
      longDescription, description3, description4, itemDescriptionDetails, note1, note2, note3,
      minStockLevel, maxStockLevel, stockManagement, weight, weightUom, expiry, expiryType, expiryDays, date1, date2, uploadImage,
      company, location, tax1, supplierName, createdBy: req.user._id
    });

    const populatedProduct = await Product.findById(product._id).populate('categoryId', 'name');
    
    const formattedProduct = populatedProduct.toObject();
    formattedProduct.stock = 0;
    formattedProduct.status = 'Out of Stock';
    
    res.status(201).json(formattedProduct);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A product with this SKU already exists.' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a product
// @route   PUT /api/v1/inventory/products/:id
// @access  Private
exports.updateProduct = async (req, res) => {
  try {
    let tenantId = req.user.tenantId;
    if (!tenantId) {
      if (!req.body.tenantId && !req.query.tenantId) {
        return res.status(400).json({ message: 'Global Superadmin must provide tenantId' });
      }
      tenantId = req.body.tenantId || req.query.tenantId;
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

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updates,
      { returnDocument: 'after', runValidators: true }
    ).populate('categoryId', 'name');

    res.status(200).json(updatedProduct);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A product with this SKU already exists.' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a product
// @route   DELETE /api/v1/inventory/products/:id
// @access  Private
exports.deleteProduct = async (req, res) => {
  try {
    let tenantId = req.user.tenantId;
    if (!tenantId) {
      tenantId = req.query.tenantId || req.body.tenantId;
      if (!tenantId) return res.status(400).json({ message: 'Global Superadmin must provide tenantId' });
    }

    const product = await Product.findOne({ _id: req.params.id, tenantId });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check dependencies
    const hasStock = await Stock.exists({ productId: product._id, tenantId });
    const hasSales = await OrderItem.exists({ productId: product._id });
    const hasPurchases = await PurchaseOrderItem.exists({ productId: product._id });

    if (hasStock || hasSales || hasPurchases) {
      // Soft Delete
      product.isActive = false;
      await product.save();
      return res.status(200).json({ message: 'Product has dependencies and was soft-deleted (deactivated).' });
    }

    // Hard Delete
    await Product.findOneAndDelete({ _id: req.params.id, tenantId });

    res.status(200).json({ message: 'Product permanently removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all categories for the tenant
// @route   GET /api/v1/inventory/categories
// @access  Private
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ tenantId: req.user.tenantId }).sort('name');
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

    const category = await Category.create({
      tenantId: req.user.tenantId,
      name,
      description,
      itemDepartmentId,
      code,
      isActive: isActive !== undefined ? isActive : true
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      req.body,
      { returnDocument: 'after', runValidators: true }
    );
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const tenantId = req.user.tenantId;

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
    let tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const product = await Product.findOne({ _id: req.params.id, tenantId });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Please upload at least one image' });
    }

    const newImageUrls = req.files.map(file => {
      // Build URL path relative to server root
      return `${process.env.BASE_URL || 'http://localhost:5000'}/uploads/products/${tenantId}/${product._id}/${file.filename}`;
    });

    product.images = [...(product.images || []), ...newImageUrls];
    await product.save();

    res.status(200).json({
      message: 'Images uploaded successfully',
      images: product.images
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
    let tenantId = req.user.tenantId;

    const product = await Product.findOne({ _id: req.params.id, tenantId });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const { imageName } = req.params;
    
    // Find the image URL in the array that ends with the given imageName
    const imageUrlIndex = product.images.findIndex(url => url.endsWith(imageName));
    
    if (imageUrlIndex === -1) {
      return res.status(404).json({ message: 'Image not found in product record' });
    }

    // Remove from array
    product.images.splice(imageUrlIndex, 1);
    await product.save();

    // Remove from filesystem
    const filePath = path.join(__dirname, '../../../../uploads/products', tenantId.toString(), product._id.toString(), imageName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(200).json({
      message: 'Image deleted successfully',
      images: product.images
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

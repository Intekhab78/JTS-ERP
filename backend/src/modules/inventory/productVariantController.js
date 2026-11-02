/**
 * Product Variant Master Controller
 * File: backend/src/modules/inventory/productVariantController.js
 * 
 * Implements tenant-scoped ProductVariant CRUD, attribute validation,
 * canonical attribute signatures, unique SKU/barcode validation, and matrix bulk operations.
 */

const mongoose = require('mongoose');
const Product = require('../../core/models/Product');
const ProductVariant = require('../../core/models/ProductVariant');
const Stock = require('../../core/models/Stock');

/**
 * @desc    Get all variants for a specific product
 * @route   GET /api/v1/inventory/products/:productId/variants
 * @access  Private
 */
exports.getProductVariants = async (req, res) => {
  try {
    const tenantId = req.user.activeTenantId || req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Missing tenant context' });
    }

    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    const parentProduct = await Product.findOne({ _id: productId, tenantId });
    if (!parentProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const filter = {
      tenantId: new mongoose.Types.ObjectId(tenantId),
      productId: new mongoose.Types.ObjectId(productId)
    };

    if (req.query.includeInactive !== 'true') {
      filter.isActive = { $ne: false };
    }

    const variants = await ProductVariant.find(filter)
      .sort({ createdAt: 1, sku: 1 })
      .lean();

    // Convert Map attributes to plain objects for clean JSON responses
    const formatted = variants.map(v => {
      let attributesObj = {};
      if (v.attributes instanceof Map) {
        attributesObj = Object.fromEntries(v.attributes);
      } else if (v.attributes && typeof v.attributes === 'object') {
        attributesObj = { ...v.attributes };
      }
      return {
        ...v,
        id: v._id,
        attributes: attributesObj
      };
    });

    res.status(200).json({
      success: true,
      count: formatted.length,
      product: {
        _id: parentProduct._id,
        name: parentProduct.name,
        sku: parentProduct.sku,
        hasVariants: parentProduct.hasVariants,
        variantAttributeDefinitions: parentProduct.variantAttributeDefinitions || []
      },
      variants: formatted
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get a single product variant by ID
 * @route   GET /api/v1/inventory/variants/:variantId
 * @access  Private
 */
exports.getProductVariantById = async (req, res) => {
  try {
    const tenantId = req.user.activeTenantId || req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Missing tenant context' });
    }

    const { variantId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      return res.status(400).json({ message: 'Invalid variant ID format' });
    }

    const variant = await ProductVariant.findOne({ _id: variantId, tenantId })
      .populate('productId', 'name sku price salesPrice uom hasVariants variantAttributeDefinitions')
      .lean();

    if (!variant) {
      return res.status(404).json({ message: 'Product variant not found' });
    }

    let attributesObj = {};
    if (variant.attributes instanceof Map) {
      attributesObj = Object.fromEntries(variant.attributes);
    } else if (variant.attributes && typeof variant.attributes === 'object') {
      attributesObj = { ...variant.attributes };
    }

    res.status(200).json({
      success: true,
      variant: {
        ...variant,
        id: variant._id,
        attributes: attributesObj
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Create a single product variant
 * @route   POST /api/v1/inventory/products/:productId/variants
 * @access  Private
 */
exports.createProductVariant = async (req, res) => {
  try {
    const tenantId = req.user.activeTenantId || req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Missing tenant context' });
    }

    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    const parentProduct = await Product.findOne({ _id: productId, tenantId });
    if (!parentProduct) {
      return res.status(404).json({ message: 'Parent product not found' });
    }

    if (!parentProduct.hasVariants) {
      return res.status(400).json({
        message: 'Parent product does not have variants enabled. Enable variants on the product master first.'
      });
    }

    const {
      sku,
      barcode,
      attributes,
      salesPrice,
      purchasePrice,
      priceAdjustment,
      weight,
      isActive,
      uploadImage,
      images
    } = req.body;

    if (!sku || typeof sku !== 'string' || sku.trim() === '') {
      return res.status(400).json({ message: 'Variant SKU is required' });
    }
    const cleanSku = sku.trim().toUpperCase();

    // Check SKU collision against Product Master
    const productSkuCollision = await Product.exists({ tenantId, sku: cleanSku });
    if (productSkuCollision) {
      return res.status(409).json({ message: `SKU "${cleanSku}" is already assigned to a product master.` });
    }

    // Check SKU collision against other ProductVariants
    const variantSkuCollision = await ProductVariant.exists({ tenantId, sku: cleanSku });
    if (variantSkuCollision) {
      return res.status(409).json({ message: `SKU "${cleanSku}" is already assigned to another variant.` });
    }

    // Barcode collision check if provided
    let cleanBarcode = undefined;
    if (barcode && typeof barcode === 'string' && barcode.trim() !== '') {
      cleanBarcode = barcode.trim();
      const productBarcodeCollision = await Product.exists({ tenantId, barcode: cleanBarcode });
      if (productBarcodeCollision) {
        return res.status(409).json({ message: `Barcode "${cleanBarcode}" is already assigned to a product master.` });
      }
      const variantBarcodeCollision = await ProductVariant.exists({ tenantId, barcode: cleanBarcode });
      if (variantBarcodeCollision) {
        return res.status(409).json({ message: `Barcode "${cleanBarcode}" is already assigned to another variant.` });
      }
    }

    // Generate and validate canonical attribute signature
    const signature = ProductVariant.generateCanonicalAttributeSignature(
      attributes,
      parentProduct.variantAttributeDefinitions
    );

    // Check attribute signature collision for this parent product
    const signatureCollision = await ProductVariant.exists({
      tenantId,
      productId: parentProduct._id,
      attributeSignature: signature
    });
    if (signatureCollision) {
      return res.status(409).json({
        message: `A variant with the combination "${signature}" already exists for this product.`
      });
    }

    const newVariant = await ProductVariant.create({
      tenantId,
      productId: parentProduct._id,
      sku: cleanSku,
      barcode: cleanBarcode,
      attributes,
      attributeSignature: signature,
      salesPrice: salesPrice !== undefined && salesPrice !== null && salesPrice !== '' ? Number(salesPrice) : null,
      purchasePrice: purchasePrice !== undefined && purchasePrice !== null && purchasePrice !== '' ? Number(purchasePrice) : null,
      priceAdjustment: Number(priceAdjustment || 0),
      weight: Number(weight || 0),
      isActive: isActive !== false,
      uploadImage: uploadImage || null,
      images: Array.isArray(images) ? images : [],
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      variant: newVariant
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * @desc    Bulk create or update variants for a product (Matrix Sync)
 * @route   POST /api/v1/inventory/products/:productId/variants/bulk
 * @access  Private
 */
exports.bulkSaveProductVariants = async (req, res) => {
  try {
    const tenantId = req.user.activeTenantId || req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Missing tenant context' });
    }

    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    const parentProduct = await Product.findOne({ _id: productId, tenantId });
    if (!parentProduct) {
      return res.status(404).json({ message: 'Parent product not found' });
    }

    const { variantAttributeDefinitions, variants } = req.body;

    // 1. Update parent product attribute definitions if provided
    if (Array.isArray(variantAttributeDefinitions)) {
      const cleanDefs = variantAttributeDefinitions.filter(
        d => d && d.name && Array.isArray(d.values) && d.values.some(v => typeof v === 'string' && v.trim() !== '')
      );
      parentProduct.hasVariants = cleanDefs.length > 0;
      parentProduct.variantAttributeDefinitions = cleanDefs;
      await parentProduct.save();
    }

    if (!Array.isArray(variants) || variants.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Attribute definitions updated. No variants to sync.',
        variants: []
      });
    }

    // 2. Validate intra-batch uniqueness
    const seenSkus = new Set();
    const seenBarcodes = new Set();
    const seenSignatures = new Set();
    const preparedVariants = [];

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.sku || typeof v.sku !== 'string' || v.sku.trim() === '') {
        return res.status(400).json({ message: `Row ${i + 1}: Variant SKU is required.` });
      }
      const cleanSku = v.sku.trim().toUpperCase();
      if (seenSkus.has(cleanSku)) {
        return res.status(400).json({ message: `Duplicate SKU "${cleanSku}" detected within variant matrix.` });
      }
      seenSkus.add(cleanSku);

      let cleanBarcode = undefined;
      if (v.barcode && typeof v.barcode === 'string' && v.barcode.trim() !== '') {
        cleanBarcode = v.barcode.trim();
        if (seenBarcodes.has(cleanBarcode)) {
          return res.status(400).json({ message: `Duplicate barcode "${cleanBarcode}" detected within variant matrix.` });
        }
        seenBarcodes.add(cleanBarcode);
      }

      // Generate canonical signature
      const signature = ProductVariant.generateCanonicalAttributeSignature(
        v.attributes,
        parentProduct.variantAttributeDefinitions
      );

      if (seenSignatures.has(signature)) {
        return res.status(400).json({
          message: `Duplicate attribute combination "${signature}" detected within variant matrix.`
        });
      }
      seenSignatures.add(signature);

      preparedVariants.push({
        _id: v._id && mongoose.Types.ObjectId.isValid(v._id) ? new mongoose.Types.ObjectId(v._id) : undefined,
        sku: cleanSku,
        barcode: cleanBarcode,
        attributes: v.attributes,
        attributeSignature: signature,
        salesPrice: v.salesPrice !== undefined && v.salesPrice !== null && v.salesPrice !== '' ? Number(v.salesPrice) : null,
        purchasePrice: v.purchasePrice !== undefined && v.purchasePrice !== null && v.purchasePrice !== '' ? Number(v.purchasePrice) : null,
        priceAdjustment: Number(v.priceAdjustment || 0),
        weight: Number(v.weight || 0),
        isActive: v.isActive !== false
      });
    }

    // 3. Database collision checks against Product Master and other ProductVariants
    const variantIdsToIgnore = preparedVariants.map(v => v._id).filter(Boolean);

    for (const v of preparedVariants) {
      // Check SKU against Product Master
      const productSkuCollision = await Product.exists({ tenantId, sku: v.sku });
      if (productSkuCollision) {
        return res.status(409).json({ message: `SKU "${v.sku}" is already assigned to a product master.` });
      }

      // Check SKU against other ProductVariants
      const variantSkuFilter = { tenantId, sku: v.sku };
      if (variantIdsToIgnore.length > 0) {
        variantSkuFilter._id = { $nin: variantIdsToIgnore };
      }
      const variantSkuCollision = await ProductVariant.exists(variantSkuFilter);
      if (variantSkuCollision) {
        return res.status(409).json({ message: `SKU "${v.sku}" is already assigned to another variant in the database.` });
      }

      // Check Barcode against Product Master & ProductVariants
      if (v.barcode) {
        const prodBarcodeCollision = await Product.exists({ tenantId, barcode: v.barcode });
        if (prodBarcodeCollision) {
          return res.status(409).json({ message: `Barcode "${v.barcode}" is already assigned to a product master.` });
        }
        const varBarcodeFilter = { tenantId, barcode: v.barcode };
        if (variantIdsToIgnore.length > 0) {
          varBarcodeFilter._id = { $nin: variantIdsToIgnore };
        }
        const varBarcodeCollision = await ProductVariant.exists(varBarcodeFilter);
        if (varBarcodeCollision) {
          return res.status(409).json({ message: `Barcode "${v.barcode}" is already assigned to another variant in the database.` });
        }
      }
    }

    // 4. Save/Update records
    const results = [];
    for (const v of preparedVariants) {
      if (v._id) {
        const updated = await ProductVariant.findOneAndUpdate(
          { _id: v._id, tenantId, productId: parentProduct._id },
          {
            sku: v.sku,
            barcode: v.barcode,
            attributes: v.attributes,
            attributeSignature: v.attributeSignature,
            salesPrice: v.salesPrice,
            purchasePrice: v.purchasePrice,
            priceAdjustment: v.priceAdjustment,
            weight: v.weight,
            isActive: v.isActive,
            updatedBy: req.user._id
          },
          { returnDocument: 'after', runValidators: true }
        );
        results.push(updated);
      } else {
        const created = await ProductVariant.create({
          tenantId,
          productId: parentProduct._id,
          sku: v.sku,
          barcode: v.barcode,
          attributes: v.attributes,
          attributeSignature: v.attributeSignature,
          salesPrice: v.salesPrice,
          purchasePrice: v.purchasePrice,
          priceAdjustment: v.priceAdjustment,
          weight: v.weight,
          isActive: v.isActive,
          createdBy: req.user._id
        });
        results.push(created);
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully synchronized ${results.length} variants.`,
      variants: results
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * @desc    Update a single product variant
 * @route   PUT /api/v1/inventory/variants/:variantId
 * @access  Private
 */
exports.updateProductVariant = async (req, res) => {
  try {
    const tenantId = req.user.activeTenantId || req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Missing tenant context' });
    }

    const { variantId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      return res.status(400).json({ message: 'Invalid variant ID format' });
    }

    const variant = await ProductVariant.findOne({ _id: variantId, tenantId });
    if (!variant) {
      return res.status(404).json({ message: 'Product variant not found' });
    }

    const parentProduct = await Product.findOne({ _id: variant.productId, tenantId });
    if (!parentProduct) {
      return res.status(404).json({ message: 'Parent product not found' });
    }

    const updates = { ...req.body, updatedBy: req.user._id };

    // SKU update validation
    if (updates.sku) {
      const cleanSku = updates.sku.trim().toUpperCase();
      if (cleanSku !== variant.sku) {
        const productSkuCollision = await Product.exists({ tenantId, sku: cleanSku });
        if (productSkuCollision) {
          return res.status(409).json({ message: `SKU "${cleanSku}" is already assigned to a product master.` });
        }
        const variantSkuCollision = await ProductVariant.exists({
          tenantId,
          sku: cleanSku,
          _id: { $ne: variant._id }
        });
        if (variantSkuCollision) {
          return res.status(409).json({ message: `SKU "${cleanSku}" is already assigned to another variant.` });
        }
        updates.sku = cleanSku;
      }
    }

    // Barcode update validation
    if (updates.barcode !== undefined) {
      if (updates.barcode && typeof updates.barcode === 'string' && updates.barcode.trim() !== '') {
        const cleanBarcode = updates.barcode.trim();
        if (cleanBarcode !== variant.barcode) {
          const productBarcodeCollision = await Product.exists({ tenantId, barcode: cleanBarcode });
          if (productBarcodeCollision) {
            return res.status(409).json({ message: `Barcode "${cleanBarcode}" is already assigned to a product master.` });
          }
          const variantBarcodeCollision = await ProductVariant.exists({
            tenantId,
            barcode: cleanBarcode,
            _id: { $ne: variant._id }
          });
          if (variantBarcodeCollision) {
            return res.status(409).json({ message: `Barcode "${cleanBarcode}" is already assigned to another variant.` });
          }
          updates.barcode = cleanBarcode;
        }
      } else {
        updates.barcode = undefined;
      }
    }

    // Attributes update validation
    if (updates.attributes) {
      const signature = ProductVariant.generateCanonicalAttributeSignature(
        updates.attributes,
        parentProduct.variantAttributeDefinitions
      );

      if (signature !== variant.attributeSignature) {
        const signatureCollision = await ProductVariant.exists({
          tenantId,
          productId: parentProduct._id,
          attributeSignature: signature,
          _id: { $ne: variant._id }
        });
        if (signatureCollision) {
          return res.status(409).json({
            message: `A variant with the combination "${signature}" already exists for this product.`
          });
        }
        updates.attributeSignature = signature;
      }
    }

    const updatedVariant = await ProductVariant.findOneAndUpdate(
      { _id: variant._id, tenantId },
      updates,
      { returnDocument: 'after', runValidators: true }
    );

    res.status(200).json({
      success: true,
      variant: updatedVariant
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * @desc    Delete or deactivate a product variant
 * @route   DELETE /api/v1/inventory/variants/:variantId
 * @access  Private
 */
exports.deleteProductVariant = async (req, res) => {
  try {
    const tenantId = req.user.activeTenantId || req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Missing tenant context' });
    }

    const { variantId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      return res.status(400).json({ message: 'Invalid variant ID format' });
    }

    const variant = await ProductVariant.findOne({ _id: variantId, tenantId });
    if (!variant) {
      return res.status(404).json({ message: 'Product variant not found' });
    }

    // Check if variant has physical stock
    const activeStock = await Stock.findOne({
      tenantId,
      variantId: variant._id,
      quantity: { $gt: 0 }
    });

    if (activeStock) {
      return res.status(400).json({
        message: 'Cannot delete variant with active inventory stock. Deactivate the variant instead.'
      });
    }

    // Soft-deactivate if stock records exist with 0 quantity, or delete if completely unused
    const anyStockRecord = await Stock.exists({ tenantId, variantId: variant._id });
    if (anyStockRecord) {
      variant.isActive = false;
      variant.updatedBy = req.user._id;
      await variant.save();
      return res.status(200).json({
        success: true,
        message: 'Variant has past stock history; it has been deactivated rather than purged.',
        variant
      });
    }

    await ProductVariant.deleteOne({ _id: variant._id, tenantId });
    res.status(200).json({
      success: true,
      message: 'Product variant successfully removed.'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

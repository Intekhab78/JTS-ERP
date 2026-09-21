const mongoose = require('mongoose');
const ConsignmentStock = require('../../core/models/ConsignmentStock');

exports.getStock = async (req, res) => {
  try {
    const { page = 1, limit = 50, supplierId, consignmentId, productId, branchId } = req.query;
    
    const query = { tenantId: req.user.tenantId };
    
    if (supplierId) query.supplierId = supplierId;
    if (consignmentId) query.consignmentId = consignmentId;
    if (productId) query.productId = productId;
    if (branchId) query.branchId = branchId;
    
    // Default to only showing items that have some stock or activity
    if (!req.query.showEmpty) {
      query.$or = [
        { receivedQuantity: { $gt: 0 } },
        { consumedQuantity: { $gt: 0 } },
        { returnedQuantity: { $gt: 0 } }
      ];
    }

    const stock = await ConsignmentStock.find(query)
      .populate('supplierId', 'name')
      .populate('consignmentId', 'consignmentNumber')
      .populate('productId', 'name sku')
      .populate('branchId', 'name')
      .sort({ lastActivityAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ConsignmentStock.countDocuments(query);

    res.status(200).json({ 
      success: true, 
      data: stock,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStockById = async (req, res) => {
  try {
    const stock = await ConsignmentStock.findOne({ _id: req.params.id, tenantId: req.user.tenantId })
      .populate('supplierId')
      .populate('consignmentId')
      .populate('productId')
      .populate('branchId');
      
    if (!stock) return res.status(404).json({ success: false, message: 'Consignment Stock not found' });
    res.status(200).json({ success: true, data: stock });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

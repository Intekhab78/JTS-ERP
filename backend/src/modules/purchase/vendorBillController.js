const mongoose = require('mongoose');
const VendorBill = require('../../core/models/VendorBill');
const PurchaseOrder = require('../../core/models/PurchaseOrder');
const PurchaseOrderItem = require('../../core/models/PurchaseOrderItem');
const GRN = require('../../core/models/GRN');
const Counter = require('../../core/models/Counter');
const { verifyBranchAccess } = require('../../core/middleware/authMiddleware');

const generateBillNumber = async (tenantId, session) => {
  const currentYear = new Date().getFullYear();
  const counterId = `VB_${currentYear}`;
  
  const counter = await Counter.findOneAndUpdate(
    { tenantId, sequenceName: counterId, year: currentYear },
    { $inc: { sequenceValue: 1 } },
    { returnDocument: 'after', upsert: true, session }
  );

  const seqStr = String(counter.sequenceValue).padStart(6, '0');
  return `VB-${currentYear}-${seqStr}`;
};

exports.getVendorBills = async (req, res) => {
  try {
    const bills = await VendorBill.find({ tenantId: req.user.tenantId, isActive: true })
      .populate('branchId', 'name')
      .populate('supplierId', 'name email')
      .populate('purchaseOrderId', 'purchaseOrderNumber')
      .sort({ createdAt: -1 });
    res.status(200).json(bills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getVendorBillById = async (req, res) => {
  try {
    const bill = await VendorBill.findOne({ _id: req.params.id, tenantId: req.user.tenantId, isActive: true })
      .populate('branchId', 'name')
      .populate('supplierId', 'name email phone address')
      .populate('purchaseOrderId', 'purchaseOrderNumber expectedDate')
      .populate('grnIds', 'grnNumber receiptDate status')
      .populate('createdBy', 'firstName lastName');
    if (!bill) return res.status(404).json({ message: 'Vendor Bill not found' });
    res.status(200).json(bill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createVendorBill = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const tenantId = req.user.tenantId;
    const body = { ...req.body };
    
    // Auth Check
    const isAuthorized = await verifyBranchAccess(body.branchId, req);
    if (!isAuthorized) throw new Error('Forbidden: You do not have access to this branch');

    if (!body.billNumber) {
      body.billNumber = await generateBillNumber(tenantId, session);
    }
    
    if (body.purchaseOrderId && body.grnIds && body.grnIds.length > 0) {
      // Validate GRNs
      const grns = await GRN.find({ _id: { $in: body.grnIds }, tenantId }).session(session);
      for (const grn of grns) {
        if (grn.status !== 'VALIDATED') {
          throw new Error(`GRN ${grn.grnNumber} is not VALIDATED. Only VALIDATED GRNs can be billed.`);
        }
      }

      // Check for double billing
      // 1. Gather all accepted quantities from selected GRNs for this PO
      const eligibleQuantities = {}; // productId -> max billable
      grns.forEach(grn => {
        grn.items.forEach(item => {
          const pid = item.productId.toString();
          if (!eligibleQuantities[pid]) eligibleQuantities[pid] = 0;
          eligibleQuantities[pid] += (item.acceptedQuantity || 0);
        });
      });

      // 2. Gather all already billed quantities across ALL POSTED or DRAFT bills for these GRNs
      // Wait, double billing usually works at the PO level, but if we strictly bill by GRN:
      // A GRN might be partially billed. 
      // A simpler, robust rule: For a PO, sum of all billed item quantities (in non-cancelled bills) 
      // cannot exceed the sum of all accepted item quantities across all VALIDATED GRNs for that PO.
      const allValidGrnsForPo = await GRN.find({ purchaseOrderId: body.purchaseOrderId, tenantId, status: 'VALIDATED' }).session(session);
      const totalAccepted = {};
      allValidGrnsForPo.forEach(g => {
         g.items.forEach(item => {
           const pid = item.productId.toString();
           totalAccepted[pid] = (totalAccepted[pid] || 0) + (item.acceptedQuantity || 0);
         });
      });

      const existingBills = await VendorBill.find({ 
        purchaseOrderId: body.purchaseOrderId, 
        tenantId, 
        status: { $ne: 'CANCELLED' } 
      }).session(session);
      
      const totalBilled = {};
      existingBills.forEach(bill => {
         bill.items.forEach(item => {
           const pid = item.productId.toString();
           totalBilled[pid] = (totalBilled[pid] || 0) + item.quantity;
         });
      });

      // 3. Validate requested items against (totalAccepted - totalBilled)
      for (const item of body.items) {
        const pid = item.productId.toString();
        const accepted = totalAccepted[pid] || 0;
        const billedAlready = totalBilled[pid] || 0;
        const remainingBillable = accepted - billedAlready;
        
        if (item.quantity > remainingBillable) {
           throw new Error(`Cannot bill quantity ${item.quantity} for product ${pid}. Only ${remainingBillable} remaining billable (Accepted: ${accepted}, Already Billed: ${billedAlready}).`);
        }
      }
    }

    const bill = await VendorBill.create([{
      ...body,
      tenantId,
      createdBy: req.user._id,
      status: 'DRAFT',
      amountPaid: 0,
      balanceDue: body.grandTotal
    }], { session });

    await session.commitTransaction();
    res.status(201).json(bill[0]);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

exports.updateVendorBill = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const bill = await VendorBill.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).session(session);
    if (!bill) throw new Error('Vendor Bill not found');
    if (bill.status !== 'DRAFT') throw new Error('Only DRAFT bills can be edited');

    const body = req.body;

    // Double billing check again
    if (bill.purchaseOrderId) {
      const allValidGrnsForPo = await GRN.find({ purchaseOrderId: bill.purchaseOrderId, tenantId: req.user.tenantId, status: 'VALIDATED' }).session(session);
      const totalAccepted = {};
      allValidGrnsForPo.forEach(g => {
         g.items.forEach(item => {
           const pid = item.productId.toString();
           totalAccepted[pid] = (totalAccepted[pid] || 0) + (item.acceptedQuantity || 0);
         });
      });

      // Exclude CURRENT bill from existing totals
      const existingBills = await VendorBill.find({ 
        purchaseOrderId: bill.purchaseOrderId, 
        tenantId: req.user.tenantId, 
        _id: { $ne: bill._id },
        status: { $ne: 'CANCELLED' } 
      }).session(session);
      
      const totalBilled = {};
      existingBills.forEach(b => {
         b.items.forEach(item => {
           const pid = item.productId.toString();
           totalBilled[pid] = (totalBilled[pid] || 0) + item.quantity;
         });
      });

      for (const item of (body.items || bill.items)) {
        const pid = item.productId.toString();
        const accepted = totalAccepted[pid] || 0;
        const billedAlready = totalBilled[pid] || 0;
        const remainingBillable = accepted - billedAlready;
        
        if (item.quantity > remainingBillable) {
           throw new Error(`Cannot bill quantity ${item.quantity} for product ${pid}. Only ${remainingBillable} remaining billable.`);
        }
      }
    }

    Object.assign(bill, body);
    bill.balanceDue = bill.grandTotal - bill.amountPaid; // Just in case
    
    await bill.save({ session });
    await session.commitTransaction();
    res.status(200).json(bill);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

exports.postVendorBill = async (req, res) => {
  try {
    const bill = await VendorBill.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!bill) return res.status(404).json({ message: 'Vendor Bill not found' });
    if (bill.status !== 'DRAFT') return res.status(400).json({ message: 'Only DRAFT bills can be posted' });

    bill.status = 'POSTED';
    await bill.save();
    res.status(200).json(bill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.cancelVendorBill = async (req, res) => {
  try {
    const bill = await VendorBill.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!bill) return res.status(404).json({ message: 'Vendor Bill not found' });
    if (bill.status !== 'DRAFT') return res.status(400).json({ message: 'Only DRAFT bills can be cancelled' });

    bill.status = 'CANCELLED';
    await bill.save();
    res.status(200).json(bill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteVendorBill = async (req, res) => {
  try {
    const bill = await VendorBill.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!bill) return res.status(404).json({ message: 'Vendor Bill not found' });
    if (bill.status !== 'DRAFT' && bill.status !== 'CANCELLED') {
      return res.status(400).json({ message: 'Only DRAFT or CANCELLED bills can be deleted' });
    }
    await VendorBill.deleteOne({ _id: bill._id });
    res.status(200).json({ message: 'Vendor Bill deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

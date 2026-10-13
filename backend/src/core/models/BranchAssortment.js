const mongoose = require('mongoose');

const branchAssortmentSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  assortmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductAssortment',
    required: true
  }
}, {
  timestamps: true
});

// A branch cannot be assigned the same assortment multiple times
branchAssortmentSchema.index({ tenantId: 1, branchId: 1, assortmentId: 1 }, { unique: true });
// Reverse lookup to find all branches for an assortment
branchAssortmentSchema.index({ tenantId: 1, assortmentId: 1, branchId: 1 });

async function validateCrossCompanyAssignment(doc) {
  if (!doc.branchId || !doc.assortmentId) return;
  
  const mongoose = require('mongoose');
  const Branch = mongoose.model('Branch');
  const ProductAssortment = mongoose.model('ProductAssortment');
  
  const [branch, assortment] = await Promise.all([
    Branch.findById(doc.branchId).select('legalCompanyId').lean(),
    ProductAssortment.findById(doc.assortmentId).select('legalCompanyId').lean()
  ]);
  
  if (!branch) throw new Error('Branch not found');
  if (!assortment) throw new Error('Assortment not found');
  
  if (!assortment.legalCompanyId) return;
  if (!branch.legalCompanyId) return;
  
  if (branch.legalCompanyId.toString() !== assortment.legalCompanyId.toString()) {
    throw new Error('Cross-company assortment mapping forbidden: Branch and Assortment must belong to the same Legal Company');
  }
}

async function validateUpdateCrossCompanyAssignment() {
  const update = this.getUpdate();
  const branchId = update.branchId || update.$set?.branchId;
  const assortmentId = update.assortmentId || update.$set?.assortmentId;
  
  if (!branchId && !assortmentId) return;
  
  let bId = branchId;
  let aId = assortmentId;
  
  if (!bId || !aId) {
    const docToUpdate = await this.model.findOne(this.getQuery()).select('branchId assortmentId').lean();
    if (!docToUpdate) return;
    bId = bId || docToUpdate.branchId;
    aId = aId || docToUpdate.assortmentId;
  }
  
  const mongoose = require('mongoose');
  const Branch = mongoose.model('Branch');
  const ProductAssortment = mongoose.model('ProductAssortment');
  
  const [branch, assortment] = await Promise.all([
    Branch.findById(bId).select('legalCompanyId').lean(),
    ProductAssortment.findById(aId).select('legalCompanyId').lean()
  ]);
  
  if (assortment && assortment.legalCompanyId && branch && branch.legalCompanyId) {
    if (branch.legalCompanyId.toString() !== assortment.legalCompanyId.toString()) {
      throw new Error('Cross-company assortment mapping forbidden: Branch and Assortment must belong to the same Legal Company');
    }
  }
}

branchAssortmentSchema.pre('save', async function() {
  await validateCrossCompanyAssignment(this);
});

branchAssortmentSchema.pre('insertMany', async function(next, docs) {
  // In mongoose, docs might be passed as second arg for insertMany pre hook
  const documents = Array.isArray(docs) ? docs : (Array.isArray(next) ? next : [this]);
  for (const doc of documents) {
    await validateCrossCompanyAssignment(doc);
  }
});

branchAssortmentSchema.pre('updateOne', validateUpdateCrossCompanyAssignment);
branchAssortmentSchema.pre('findOneAndUpdate', validateUpdateCrossCompanyAssignment);
branchAssortmentSchema.pre('updateMany', async function() {
  throw new Error('updateMany is forbidden on BranchAssortment to prevent cross-company bypasses');
});

module.exports = mongoose.model('BranchAssortment', branchAssortmentSchema);

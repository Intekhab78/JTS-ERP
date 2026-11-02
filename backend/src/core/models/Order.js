const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  legalCompanyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LegalCompany'
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  source: {
    type: String,
    enum: ['POS', 'WEB', 'ERP'],
    default: 'POS'
  },
  shippingAddress: {
    type: String
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  quoteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quote'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  customerName: {
    type: String,
    default: 'Walk-in Customer'
  },
  customerEmail: {
    type: String
  },
  customerPhone: {
    type: String
  },
  notes: {
    type: String,
    maxlength: 1000
  },
  totalAmount: {
    type: Number,
    required: true
  },
  subtotalAmount: {
    type: Number,
    default: 0
  },
  shippingAmount: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    default: 'PENDING'
  },
  deliveryStatus: {
    type: String,
    enum: ['PENDING', 'PARTIAL', 'DELIVERED'],
    default: 'PENDING'
  },
  invoiceStatus: {
    type: String,
    enum: ['PENDING', 'PARTIAL', 'INVOICED'],
    default: 'PENDING'
  },
  ecomStatusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EcomStatus'
  },
  ecomStatusCode: {
    type: String
  },
  carrierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EcomLogistics'
  },
  carrier: {
    type: String
  },
  trackingNumber: {
    type: String
  },
  trackingUrl: {
    type: String
  },
  deliveryType: {
    type: String,
    enum: ['THIRD_PARTY', 'IN_HOUSE'],
    default: 'THIRD_PARTY'
  },
  driverName: {
    type: String
  },
  driverPhone: {
    type: String
  },
  vehicleNumber: {
    type: String
  },
  deliveryOtp: {
    type: String
  },
  deliveryProofPhoto: {
    type: String
  },
  deliveredAt: {
    type: Date
  },
  deliveredByRider: {
    type: String
  },
  deliveryNotes: {
    type: String
  },
  customerSignature: {
    type: String
  },
  shippingAddressObj: {
    fullName: { type: String },
    phone: { type: String },
    street: { type: String },
    street2: { type: String },
    city: { type: String },
    state: { type: String },
    zip: { type: String },
    country: { type: String }
  },
  paymentMethod: {
    type: String,
    default: 'COD'
  },
  paymentStatus: {
    type: String,
    enum: ['UNPAID', 'PENDING', 'SIMULATED', 'PAID', 'FAILED', 'REFUNDED'],
    default: 'UNPAID'
  },
  paymentProvider: {
    type: String,
    default: 'MANUAL'
  },
  paymentReference: {
    type: String
  },
  codCollectionMethod: {
    type: String,
    enum: ['NONE', 'CASH', 'UPI_QR', 'CARD_POS'],
    default: 'NONE'
  },
  codTransactionId: {
    type: String
  },
  codCollectedAmount: {
    type: Number,
    default: 0
  },
  codCollectedAt: {
    type: Date
  },
  codSettlementStatus: {
    type: String,
    enum: ['NOT_APPLICABLE', 'PENDING_COLLECTION', 'IN_RIDER_HAND', 'SETTLED_TO_HUB', 'SETTLED_DIGITAL'],
    default: 'NOT_APPLICABLE'
  },
  codSettledAt: {
    type: Date
  },
  codSettledBy: {
    type: String
  },
  codSettlementRef: {
    type: String
  },
  trackingTokenHash: {
    type: String,
    select: false,
    index: true
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true
  },
  cancellationReason: {
    type: String
  },
  cancelledAt: {
    type: Date
  },
  returnStatus: {
    type: String,
    enum: ['NONE', 'REQUESTED', 'APPROVED', 'REJECTED', 'PICKUP_ASSIGNED', 'PICKED_UP', 'INSPECTED', 'COMPLETED'],
    default: 'NONE'
  },
  returnType: {
    type: String,
    enum: ['NONE', 'REFUND', 'EXCHANGE'],
    default: 'NONE'
  },
  returnItem: {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String },
    sku: { type: String },
    quantity: { type: Number, default: 1 },
    price: { type: Number, default: 0 },
    image: { type: String },
    selectedVariant: { type: String }
  },
  returnReason: {
    type: String
  },
  returnSubReason: {
    type: String
  },
  returnImages: [{
    type: String
  }],
  returnRequestedAt: {
    type: Date
  },
  returnNotes: {
    type: String
  },

  // Exchange Specifics:
  exchangeMode: {
    type: String,
    enum: ['SAME_ITEM_VARIANT', 'DIFFERENT_PRODUCT'],
    default: 'SAME_ITEM_VARIANT'
  },
  exchangeReplacement: {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String },
    sku: { type: String },
    variant: { type: String },
    price: { type: Number, default: 0 },
    image: { type: String }
  },
  exchangeReason: {
    type: String
  },
  exchangeItemDetails: {
    type: String
  },
  exchangePriceDifference: {
    type: Number,
    default: 0
  },
  exchangeDifferenceAction: {
    type: String,
    enum: ['NONE', 'COLLECT_FROM_CUSTOMER', 'REFUND_TO_CUSTOMER'],
    default: 'NONE'
  },
  exchangeDifferencePaymentStatus: {
    type: String,
    enum: ['NOT_APPLICABLE', 'PENDING_DOORSTEP', 'PAID', 'REFUNDED'],
    default: 'NOT_APPLICABLE'
  },

  // Refund Destination & Details:
  refundMode: {
    type: String,
    enum: ['ORIGINAL_PAYMENT', 'WALLET_CREDIT', 'UPI', 'BANK_ACCOUNT'],
    default: 'ORIGINAL_PAYMENT'
  },
  refundDetails: {
    upiId: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String },
    accountHolderName: { type: String },
    bankName: { type: String }
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundTransactionId: {
    type: String
  },
  refundedAt: {
    type: Date
  },

  // Reverse Logistics & Rider Handover (Step 3):
  returnDeliveryType: {
    type: String,
    enum: ['IN_HOUSE', 'THIRD_PARTY'],
    default: 'IN_HOUSE'
  },
  returnPickupOtp: {
    type: String
  },
  returnRiderName: {
    type: String
  },
  returnRiderPhone: {
    type: String
  },
  returnVehicleNumber: {
    type: String
  },
  returnCarrierName: {
    type: String
  },
  returnTrackingNumber: {
    type: String
  },
  returnPickupProof: {
    type: String
  },
  returnPickedUpAt: {
    type: Date
  },

  // Warehouse Quality Inspection (Step 4):
  inspectionResult: {
    type: String,
    enum: ['PENDING', 'PASSED_SELLABLE', 'FAILED_DAMAGED'],
    default: 'PENDING'
  },
  inspectionNotes: {
    type: String
  },
  inspectedBy: {
    type: String
  },
  inspectedAt: {
    type: Date
  },
  restockBranchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },

  // Replacement Dispatch & Tracking (Step 5 for Exchange):
  exchangeDeliveryType: {
    type: String,
    enum: ['IN_HOUSE', 'THIRD_PARTY'],
    default: 'IN_HOUSE'
  },
  exchangeRiderName: {
    type: String
  },
  exchangeRiderPhone: {
    type: String
  },
  exchangeVehicleNumber: {
    type: String
  },
  exchangeCarrierName: {
    type: String
  },
  exchangeTrackingNumber: {
    type: String
  },
  exchangeDeliveryOtp: {
    type: String
  },
  exchangeDeliveredAt: {
    type: Date
  },

  // Immutable Reverse Logistics & Proof Audit Trail:
  returnAuditTrail: [{
    step: { type: String },
    title: { type: String },
    actor: { type: String },
    deliveryType: { type: String },
    carrierOrRider: { type: String },
    trackingOrProof: { type: String },
    note: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  fulfillmentLocations: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    branchName: { type: String },
    quantity: { type: Number }
  }],
  statusHistory: [{
    status: { type: String },
    statusCode: { type: String },
    note: { type: String },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: String },
    emailSent: { type: Boolean, default: false }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);

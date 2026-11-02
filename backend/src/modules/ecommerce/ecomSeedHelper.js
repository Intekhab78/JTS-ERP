const EcomStatus = require('../../core/models/EcomStatus');
const EcomLogistics = require('../../core/models/EcomLogistics');

const DEFAULT_STATUSES = [
  {
    name: 'Order Placed',
    code: 'ORDER_PLACED',
    color: '#2563eb',
    badgeVariant: 'primary',
    order: 1,
    sendEmailToCustomer: true,
    emailSubject: 'Your Order #{{orderId}} is Booked Successfully',
    emailTemplate: 'Thank you! We have received your order and are preparing it.',
    isSystem: true
  },
  {
    name: 'Order Confirmed',
    code: 'CONFIRMED',
    color: '#059669',
    badgeVariant: 'success',
    order: 2,
    sendEmailToCustomer: true,
    emailSubject: 'Order #{{orderId}} Confirmed',
    emailTemplate: 'Your order has been verified and approved.',
    isSystem: true
  },
  {
    name: 'Internal Processing',
    code: 'INTERNAL_PROCESSING',
    color: '#d97706',
    badgeVariant: 'warning',
    order: 3,
    sendEmailToCustomer: false, // Internal step: NO email sent to customer
    emailSubject: 'Order #{{orderId}} Internal Processing',
    emailTemplate: 'Order allocated to warehouse fulfillment queue.',
    isSystem: true
  },
  {
    name: 'Packed & Staged',
    code: 'PACKED',
    color: '#7c3aed',
    badgeVariant: 'info',
    order: 4,
    sendEmailToCustomer: false, // Internal step: NO email sent to customer
    emailSubject: 'Order #{{orderId}} Packed',
    emailTemplate: 'Your package is packed and awaiting courier pickup.',
    isSystem: true
  },
  {
    name: 'Dispatched / In Transit',
    code: 'SHIPPED',
    color: '#0284c7',
    badgeVariant: 'info',
    order: 5,
    sendEmailToCustomer: true,
    emailSubject: 'Your Order #{{orderId}} has been Shipped!',
    emailTemplate: 'Your package is in transit with our logistics partner. Click your tracking link below to track live.',
    isSystem: true
  },
  {
    name: 'Out for Delivery',
    code: 'OUT_FOR_DELIVERY',
    color: '#0d9488',
    badgeVariant: 'warning',
    order: 6,
    sendEmailToCustomer: true,
    emailSubject: 'Out for Delivery: Order #{{orderId}}',
    emailTemplate: 'Your package is out for delivery today with the courier executive.',
    isSystem: true
  },
  {
    name: 'Delivered',
    code: 'DELIVERED',
    color: '#16a34a',
    badgeVariant: 'success',
    order: 7,
    sendEmailToCustomer: true,
    emailSubject: 'Delivered: Order #{{orderId}}',
    emailTemplate: 'Your order has been safely delivered. Thank you for shopping with us!',
    isSystem: true
  },
  {
    name: 'Cancelled',
    code: 'CANCELLED',
    color: '#dc2626',
    badgeVariant: 'danger',
    order: 8,
    sendEmailToCustomer: true,
    emailSubject: 'Order #{{orderId}} has been Cancelled',
    emailTemplate: 'Your order has been cancelled.',
    isSystem: true
  },
  {
    name: 'Return Requested',
    code: 'RETURN_REQUESTED',
    color: '#ea580c',
    badgeVariant: 'warning',
    order: 9,
    sendEmailToCustomer: true,
    emailSubject: 'Return Request Received for Order #{{orderId}}',
    emailTemplate: 'We have received your return request. Our team will inspect and review your request shortly.',
    isSystem: true
  },
  {
    name: 'Return Approved',
    code: 'RETURN_APPROVED',
    color: '#0891b2',
    badgeVariant: 'info',
    order: 10,
    sendEmailToCustomer: true,
    emailSubject: 'Return Request Approved for Order #{{orderId}}',
    emailTemplate: 'Your return request has been approved. A courier partner will pick up the package.',
    isSystem: true
  },
  {
    name: 'Return Rejected',
    code: 'RETURN_REJECTED',
    color: '#991b1b',
    badgeVariant: 'danger',
    order: 11,
    sendEmailToCustomer: true,
    emailSubject: 'Return Request Update: Order #{{orderId}}',
    emailTemplate: 'Your return request could not be approved.',
    isSystem: true
  },
  {
    name: 'Refund Completed',
    code: 'REFUNDED',
    color: '#475569',
    badgeVariant: 'neutral',
    order: 12,
    sendEmailToCustomer: true,
    emailSubject: 'Refund Issued for Order #{{orderId}}',
    emailTemplate: 'Refund has been processed to your original payment method.',
    isSystem: true
  }
];

const DEFAULT_LOGISTICS = [
  {
    carrierName: 'Blue Dart Express',
    carrierCode: 'BLUEDART',
    trackingUrlTemplate: 'https://www.bluedart.com/tracking?pin={{trackingNumber}}',
    contactPhone: '1860 233 1234',
    websiteUrl: 'https://www.bluedart.com',
    isDefault: true,
    isActive: true
  },
  {
    carrierName: 'Delhivery',
    carrierCode: 'DELHIVERY',
    trackingUrlTemplate: 'https://www.delhivery.com/track/package/{{trackingNumber}}',
    contactPhone: '0124 671 9500',
    websiteUrl: 'https://www.delhivery.com',
    isActive: true
  },
  {
    carrierName: 'DTDC Express',
    carrierCode: 'DTDC',
    trackingUrlTemplate: 'https://www.dtdc.in/tracking/shipment-tracking.asp?strTrackingNo={{trackingNumber}}',
    contactPhone: '080 2536 5032',
    websiteUrl: 'https://www.dtdc.in',
    isActive: true
  },
  {
    carrierName: 'FedEx Express',
    carrierCode: 'FEDEX',
    trackingUrlTemplate: 'https://www.fedex.com/fedextrack/?trknbr={{trackingNumber}}',
    contactPhone: '1800 209 6161',
    websiteUrl: 'https://www.fedex.com',
    isActive: true
  },
  {
    carrierName: 'DHL Express',
    carrierCode: 'DHL',
    trackingUrlTemplate: 'https://www.dhl.com/en/express/tracking.html?AWB={{trackingNumber}}',
    contactPhone: '1800 111 345',
    websiteUrl: 'https://www.dhl.com',
    isActive: true
  }
];

const seedEcomMastersIfEmpty = async (tenantId) => {
  if (!tenantId) return;
  try {
    const statusOps = DEFAULT_STATUSES.map(s => ({
      updateOne: {
        filter: { tenantId, code: s.code },
        update: { $setOnInsert: { ...s, tenantId } },
        upsert: true
      }
    }));
    await EcomStatus.bulkWrite(statusOps, { ordered: false });

    const logisticsOps = DEFAULT_LOGISTICS.map(l => ({
      updateOne: {
        filter: { tenantId, carrierCode: l.carrierCode },
        update: { $setOnInsert: { ...l, tenantId } },
        upsert: true
      }
    }));
    await EcomLogistics.bulkWrite(logisticsOps, { ordered: false });
  } catch (error) {
    if (error.code !== 11000) {
      console.error('seedEcomMastersIfEmpty error:', error.message);
    }
  }
};

module.exports = {
  seedEcomMastersIfEmpty,
  DEFAULT_STATUSES,
  DEFAULT_LOGISTICS
};

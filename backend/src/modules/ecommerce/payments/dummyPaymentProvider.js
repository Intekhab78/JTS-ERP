const { randomUUID } = require('crypto');

/** Demo-only provider. It never contacts a payment network or marks an order paid. */
const createPayment = async ({ orderId, amount, currency, method }) => ({
  provider: 'DUMMY',
  providerOrderId: `demo_${randomUUID()}`,
  reference: `DEMO-${randomUUID().slice(0, 8).toUpperCase()}`,
  status: 'SIMULATED',
  amount,
  currency,
  method,
  metadata: { orderId: String(orderId), message: 'No money was collected.' }
});

module.exports = { createPayment };

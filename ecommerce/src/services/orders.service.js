import apiClient from './apiClient';

export const ordersService = {
  // Calculate verified server quote (prices, tax, discounts, shipping)
  getQuote: async (quotePayload) => {
    const res = await apiClient.post('/checkout/quote', quotePayload);
    return res.data;
  },

  // Place order with idempotency protection
  placeOrder: async (orderPayload, idempotencyKey) => {
    const headers = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    const res = await apiClient.post('/checkout', orderPayload, { headers });
    return res.data;
  },

  // Get authenticated customer's order history
  getCustomerOrders: async () => {
    const res = await apiClient.get('/orders');
    return res.data;
  },

  // Track order by order number or tracking number
  trackOrder: async (orderNumber) => {
    const res = await apiClient.get(`/track/${orderNumber}`);
    return res.data;
  }
};

export default ordersService;

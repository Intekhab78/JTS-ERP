# Ecommerce payment providers

Checkout uses the provider interface in `paymentService.js`. `DUMMY` is the
default and is intentionally non-collecting: it returns `SIMULATED`, never
`PAID`, and stores a transaction reference for the ERP order.

To add a live provider later:

1. Add a provider module that implements `createPayment({ orderId, amount, currency, method, idempotencyKey })`.
2. Return the provider name, provider order/payment IDs, a status, and any redirect or client-safe data needed by the storefront.
3. Add signature verification for provider webhooks and only move a transaction to `PAID` after server-side verification.
4. Register the provider in `paymentService.js` and select it with `PAYMENT_PROVIDER` after adding its secrets to the backend environment.
5. Keep provider secrets on the backend. Never trust a browser callback as proof of payment.

The order and payment transaction are separate records so retries, provider
references, refunds, and reconciliation can be added without changing the
ERP order model's basic sales flow.

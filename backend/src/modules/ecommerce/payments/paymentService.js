const dummyPaymentProvider = require('./dummyPaymentProvider');

// A real provider can be added here later without changing checkout logic.
const providers = { DUMMY: dummyPaymentProvider };

const getPaymentProvider = () => {
  const providerName = (process.env.PAYMENT_PROVIDER || 'DUMMY').toUpperCase();
  const provider = providers[providerName];
  if (!provider) throw new Error(`Payment provider '${providerName}' is not configured.`);
  return { name: providerName, provider };
};

const createPayment = async (details) => {
  const { name, provider } = getPaymentProvider();
  return { providerName: name, ...(await provider.createPayment(details)) };
};

module.exports = { createPayment };

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  ShoppingBag, MapPin, CreditCard, ShieldCheck, Truck,
  ArrowRight, CheckCircle2, AlertCircle, Plus, User, Mail, Phone
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useStoreSettings } from '../context/StoreSettingsContext';

export const CheckoutPage = () => {
  const { items, cartTotal, clearCart, syncItemStock, updateQuantity } = useCart();
  const { customer, isAuthenticated, addAddress } = useCustomerAuth();
  const { formatCurrency, shippingCharge, freeShippingThreshold, currency } = useStoreSettings();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Selected address state (for authenticated user)
  const customerAddresses = Array.isArray(customer?.addresses) ? customer.addresses : [];
  const defaultAddr = customerAddresses.find(a => a.isDefault) || customerAddresses[0];
  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddr?._id || 'NEW');

  useEffect(() => {
    if (customer && Array.isArray(customer.addresses) && customer.addresses.length > 0) {
      const def = customer.addresses.find(a => a.isDefault) || customer.addresses[0];
      if (def && selectedAddressId === 'NEW') {
        setSelectedAddressId(def._id);
      }
    }
  }, [customer]);

  // New Address / Guest shipping form
  const [shippingForm, setShippingForm] = useState({
    fullName: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    street: '',
    street2: '',
    city: '',
    state: '',
    zip: '',
    country: 'India'
  });

  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [orderNotes, setOrderNotes] = useState('');
  const checkoutKeyRef = useRef(null);
  const [quote, setQuote] = useState(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  useEffect(() => {
    let active = true;
    if (!items.length) {
      setQuote(null);
      setQuoteError('');
      return () => { active = false; };
    }

    setIsQuoteLoading(true);
    setQuoteError('');
    axios.post('/api/v1/ecommerce/checkout/quote', {
      items: items.map(item => ({
        productId: item.productId,
        variantId: item.variantId || undefined,
        quantity: item.quantity
      }))
    })
      .then(({ data }) => { if (active) setQuote(data); })
      .catch((err) => {
        if (!active) return;
        setQuote(null);
        if (err.response?.status === 409 && typeof err.response.data?.availableStock === 'number') {
          const avail = err.response.data.availableStock;
          const targetId = err.response.data.productId;
          const targetVariant = err.response.data.variantId;
          const key = targetVariant ? `${targetId}_${targetVariant}` : targetId;
          if (syncItemStock) syncItemStock(key, avail);
          if (updateQuantity) updateQuantity(key, avail);
        }
        setQuoteError(err.response?.data?.message || 'Could not refresh prices and stock. Try again.');
      })
      .finally(() => { if (active) setIsQuoteLoading(false); });

    return () => { active = false; };
  }, [items]);

  const displaySubtotal = quote?.subtotalAmount ?? cartTotal;
  const displayTax = quote?.taxAmount ?? 0;
  const estimatedShipping = quote?.shippingAmount ?? (shippingCharge <= 0 || (freeShippingThreshold > 0 && displaySubtotal >= freeShippingThreshold) ? 0 : shippingCharge);
  const displayTotal = quote?.totalAmount ?? displaySubtotal + estimatedShipping;

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
          <ShoppingBag size={28} />
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Your cart is empty</h2>
        <p className="text-xs text-slate-500">Add products before proceeding to checkout.</p>
        <Link to="/catalog" className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold">
          Explore Products
        </Link>
      </div>
    );
  }

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Determine shipping address string & object
      let chosenAddressString = '';
      let chosenAddressObj = null;

      if (isAuthenticated && selectedAddressId !== 'NEW') {
        const found = customerAddresses.find(a => a._id === selectedAddressId);
        if (found) {
          chosenAddressObj = found;
          chosenAddressString = `${found.fullName || customer?.name || ''}, ${found.street || ''}, ${found.city || ''}, ${found.state || ''} ${found.zip || ''}, ${found.country || ''}`;
        }
      } else {
        if (!shippingForm.fullName || !shippingForm.email || !shippingForm.street || !shippingForm.city) {
          throw new Error('Please fill in your complete shipping address details');
        }
        chosenAddressObj = shippingForm;
        chosenAddressString = `${shippingForm.fullName}, ${shippingForm.street}, ${shippingForm.city}, ${shippingForm.state} ${shippingForm.zip}, ${shippingForm.country}`;

        // Save address to address book if logged in
        if (isAuthenticated) {
          await addAddress(shippingForm);
        }
      }

      const checkoutPayload = {
        customerName: chosenAddressObj?.fullName || customer?.name || 'Customer',
        customerEmail: shippingForm.email || customer?.email,
        customerPhone: chosenAddressObj.phone || shippingForm.phone || customer?.phone,
        shippingAddress: chosenAddressString,
        shippingAddressObj: chosenAddressObj,
        paymentMethod,
        notes: orderNotes,
        items: items.map(i => ({
          productId: i.productId,
          variantId: i.variantId || undefined,
          quantity: i.quantity
        }))
      };

      const token = localStorage.getItem('customer_token');
      if (!checkoutKeyRef.current) checkoutKeyRef.current = crypto.randomUUID();
      const headers = {
        'Idempotency-Key': checkoutKeyRef.current,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const { data } = await axios.post('/api/v1/ecommerce/checkout', checkoutPayload, { headers });

      // Clear cart on successful booking
      clearCart();
      checkoutKeyRef.current = null;

      // Redirect to Order Confirmation / Tracking Page
      navigate(`/track?token=${encodeURIComponent(data.trackingToken)}&success=1&payment=${encodeURIComponent(data.paymentStatus || 'UNPAID')}`);

    } catch (err) {
      console.error('Order booking error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-[96%] mx-auto py-6 sm:py-8 space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Checkout</h1>
        <p className="text-xs text-slate-500 mt-1">Complete your delivery details to book your order. Prices are shown in {currency}.</p>
      </div>

      {/* 3-Step Stepper (Panel 4 Reference) */}
      <div className="flex items-center justify-center gap-3 sm:gap-6 py-3 border-y border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">1</span>
          <span>Shipping</span>
        </div>
        <div className="w-12 sm:w-20 h-0.5 bg-blue-600"></div>
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">2</span>
          <span>Payment</span>
        </div>
        <div className="w-12 sm:w-20 h-0.5 bg-slate-200 dark:bg-slate-700"></div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center text-xs font-bold">3</span>
          <span>Review</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-700 dark:text-red-300 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {quoteError && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-800 dark:text-amber-300 rounded-2xl text-xs">
          {quoteError}
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        {/* Left Column (2 Cols): Address & Payment */}
        <div className="lg:col-span-2 space-y-6">

          {/* 1. SHIPPING ADDRESS */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <MapPin className="text-blue-600 h-5 w-5" />
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Delivery Address</h2>
            </div>

            {/* If Customer Logged In with Saved Addresses */}
            {isAuthenticated && customerAddresses.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-500 block">Select Saved Address:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {customerAddresses.map(addr => (
                    <label
                      key={addr._id}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all text-xs space-y-1 block ${selectedAddressId === addr._id
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <input
                          type="radio"
                          name="addressRadio"
                          checked={selectedAddressId === addr._id}
                          onChange={() => setSelectedAddressId(addr._id)}
                          className="text-blue-600"
                        />
                        <span className="font-bold uppercase text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">
                          {addr.label || 'Home'}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white">{addr.fullName}</div>
                      <div className="text-slate-500">{addr.street}, {addr.city}, {addr.state} {addr.zip}</div>
                      <div className="text-slate-500">Phone: {addr.phone}</div>
                    </label>
                  ))}

                  <label
                    className={`p-3.5 rounded-2xl border-2 border-dashed cursor-pointer transition-all text-xs flex items-center justify-center gap-2 ${selectedAddressId === 'NEW' ? 'border-blue-600 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
                      }`}
                  >
                    <input
                      type="radio"
                      name="addressRadio"
                      checked={selectedAddressId === 'NEW'}
                      onChange={() => setSelectedAddressId('NEW')}
                      className="hidden"
                    />
                    <Plus size={16} className="text-blue-600" />
                    <span className="font-bold text-slate-700">Add New Address</span>
                  </label>
                </div>
              </div>
            )}

            {/* Address Form (if Guest or adding NEW address) */}
            {(!isAuthenticated || selectedAddressId === 'NEW') && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      value={shippingForm.fullName}
                      onChange={e => setShippingForm({ ...shippingForm, fullName: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={shippingForm.phone}
                      onChange={e => setShippingForm({ ...shippingForm, phone: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Email Address <span className="text-[10px] text-blue-600">(Order tracking link will be sent here)</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={shippingForm.email}
                    onChange={e => setShippingForm({ ...shippingForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Street Address</label>
                  <input
                    type="text"
                    required
                    placeholder="Apartment, suite, unit, building, floor"
                    value={shippingForm.street}
                    onChange={e => setShippingForm({ ...shippingForm, street: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">City</label>
                    <input
                      type="text"
                      required
                      placeholder="Mumbai"
                      value={shippingForm.city}
                      onChange={e => setShippingForm({ ...shippingForm, city: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">State</label>
                    <input
                      type="text"
                      required
                      placeholder="Maharashtra"
                      value={shippingForm.state}
                      onChange={e => setShippingForm({ ...shippingForm, state: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">ZIP / PIN</label>
                    <input
                      type="text"
                      required
                      placeholder="400001"
                      value={shippingForm.zip}
                      onChange={e => setShippingForm({ ...shippingForm, zip: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. DELIVERY METHOD (Controlled by ERP Store Settings) */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Truck className="text-blue-600 h-5 w-5" />
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Delivery Method</h2>
            </div>

            <div className="space-y-3">
              <label className="p-4 rounded-2xl border-2 border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <input type="radio" name="deliveryMethod" defaultChecked className="text-blue-600" />
                  <div>
                    <strong className="text-xs text-slate-900 dark:text-white block">Standard Delivery</strong>
                    <span className="text-[11px] text-slate-500">
                      Fulfilled from company warehouse
                      {freeShippingThreshold > 0 && (
                        <span> • Free on orders above {formatCurrency(freeShippingThreshold)}</span>
                      )}
                    </span>
                  </div>
                </div>
                <span className={`text-xs font-black ${estimatedShipping === 0 ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                  {estimatedShipping === 0 ? 'FREE' : formatCurrency(estimatedShipping)}
                </span>
              </label>
            </div>
          </div>

          {/* 3. PAYMENT METHOD (Panel 4 Reference) */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <CreditCard className="text-blue-600 h-5 w-5" />
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Payment Method</h2>
            </div>

            <div className="space-y-3">
              {[
                { id: 'UPI', title: 'UPI (GPay, PhonePe, Paytm)', desc: 'Instant UPI transfer & QR code scan' },
                { id: 'CARD', title: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay, Amex' },
                { id: 'NETBANKING', title: 'Net Banking', desc: 'All Indian major banks supported' },
                { id: 'COD', title: 'Cash on Delivery', desc: 'Pay cash or UPI upon package arrival' }
              ].map(method => (
                <label
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                    paymentMethod === method.id
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentRadio"
                      checked={paymentMethod === method.id}
                      onChange={() => setPaymentMethod(method.id)}
                      className="text-blue-600"
                    />
                    <div>
                      <strong className="text-xs text-slate-900 dark:text-white block">{method.title}</strong>
                      <span className="text-[11px] text-slate-500">{method.desc}</span>
                    </div>
                  </div>
                  {method.id === 'COD' ? <Truck size={17} className="text-blue-600" /> : <CreditCard size={17} className="text-blue-600" />}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary, Place Order CTA & Coupon Card */}
        <div className="space-y-4">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Order Summary</h3>
              <span className="text-xs font-bold text-blue-600">{items.length} item(s)</span>
            </div>

            {/* Items preview */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto pr-1">
              {items.map((item, idx) => {
                const quotedItem = quote?.items?.find(quoteLine => 
                  (item.variantId && quoteLine.variantId === item.variantId) || 
                  quoteLine.productId === item.productId
                );
                const unitPrice = quotedItem?.unitPrice ?? item.price;
                const uniqueKey = item.itemKey || (item.variantId ? `${item.productId}_${item.variantId}` : `${item.productId}_${idx}`);
                return (
                  <div key={uniqueKey} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white line-clamp-1">{item.name}</div>
                      <div className="text-slate-400 text-[11px]">
                        {item.quantity} x {formatCurrency(unitPrice)}
                        {(item.selectedColor || item.selectedSize) && (
                          <span className="ml-1 text-slate-500 font-medium">
                            ({[item.selectedColor, item.selectedSize].filter(Boolean).join(' / ')})
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-black text-slate-900 dark:text-white">
                      {formatCurrency(item.quantity * unitPrice)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Pricing calculations */}
            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Items Total:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(displaySubtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Shipping Fee:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {isQuoteLoading ? 'Calculating…' : estimatedShipping === 0 ? <span className="text-emerald-600">FREE</span> : formatCurrency(estimatedShipping)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                <span>Total:</span>
                <span className="text-blue-600 dark:text-blue-400 text-lg">{formatCurrency(displayTotal)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isQuoteLoading || Boolean(quoteError)}
              className="w-full py-3.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Booking Order...' : 'Place Order'}
              <ArrowRight size={15} />
            </button>
          </div>

          {/* Apply Coupon Card (Panel 4 Reference) */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Apply Coupon</span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter coupon code"
                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 uppercase font-mono"
              />
              <button
                type="button"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Security & Need Help Reassurance (Panel 4 Match) */}
          <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-slate-200 space-y-3 text-xs text-slate-600">
            <div className="flex items-center gap-2 text-emerald-700 font-semibold text-[11px]">
              <ShieldCheck size={16} />
              <span>Your order is safe and secure. All transactions are encrypted.</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <span>Need Help?</span>
              <a href="tel:18001234567" className="font-bold text-blue-600 hover:underline">Call 1800-123-4567</a>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

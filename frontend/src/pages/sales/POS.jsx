import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, Power, PauseCircle, PlayCircle, Printer, X, Search, Store, Loader2, Edit2, SplitSquareHorizontal, Receipt } from 'lucide-react';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/common/Card';
import NewSessionModal from '../../components/sales/NewSessionModal';
import DiscountModal from '../../components/sales/DiscountModal';
import NewCustomerModal from '../../components/sales/NewCustomerModal';
import PaymentModal from '../../components/sales/PaymentModal';
import CloseSessionModal from '../../components/sales/CloseSessionModal';
import CashDrawerModal from '../../components/sales/CashDrawerModal';
import ManagerApprovalModal from '../../components/auth/ManagerApprovalModal';
import { useCurrency } from '../../contexts/CurrencyContext';

const POS = () => {
  const { formatCurrency, currencySymbol } = useCurrency();
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);

  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [discount, setDiscount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Session State
  const [activeSession, setActiveSession] = useState(null);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [openingCash, setOpeningCash] = useState('');
  const [isCloseSessionModalOpen, setIsCloseSessionModalOpen] = useState(false);
  const [closingCash, setClosingCash] = useState('');

  // Payment State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [payments, setPayments] = useState([{ method: 'CASH', amount: 0 }]);
  const [receipt, setReceipt] = useState(null);
  const [idempotencyKey, setIdempotencyKey] = useState(null);

  // Hold Order State
  const [heldOrders, setHeldOrders] = useState([]);
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);

  // Cash Drawer State
  const [isCashDrawerModalOpen, setIsCashDrawerModalOpen] = useState(false);
  const [isManagerApprovalModalOpen, setIsManagerApprovalModalOpen] = useState(false);
  const [drawerReason, setDrawerReason] = useState('');
  const [isDrawerProcessing, setIsDrawerProcessing] = useState(false);

  // Overrides State
  const [posMaxDiscountLimit, setPosMaxDiscountLimit] = useState(10);
  const [priceOverrideToken, setPriceOverrideToken] = useState(null);
  const [discountOverrideToken, setDiscountOverrideToken] = useState(null);
  const [managerOverrideAction, setManagerOverrideAction] = useState('');
  const [managerOverrideContext, setManagerOverrideContext] = useState({});
  const [editingPriceProductId, setEditingPriceProductId] = useState(null);
  const [tempPrice, setTempPrice] = useState('');

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  const fetchCompanyConfig = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/company', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data && res.data.settings && res.data.settings.posMaxDiscountLimit !== undefined) {
        setPosMaxDiscountLimit(res.data.settings.posMaxDiscountLimit);
      }
    } catch (error) {
      console.error('Failed to fetch company settings', error);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchCustomers();
    fetchCategories();
    loadHeldOrders();
    fetchCompanyConfig();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      fetchProducts();
      checkActiveSession();
    }
  }, [selectedBranch]);

  const fetchBranches = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/branches', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      let allowedBranches = res.data;
      // If user has specific branches assigned, filter the list
      if (authUser.branches && authUser.branches.length > 0) {
        allowedBranches = res.data.filter(b => authUser.branches.includes(b._id));
      } else if (!authUser.permissions?.includes('*')) {
        // Standard user with no branches assigned sees nothing
        allowedBranches = [];
      }
      setBranches(allowedBranches);
      if (allowedBranches.length > 0) setSelectedBranch(allowedBranches[0]._id);
    } catch (error) {
      console.error('Failed to fetch branches', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/inventory/categories', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setCategories(res.data);
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/crm/customers', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setCustomers(res.data);
    } catch (error) {
      console.error('Failed to fetch customers', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/v1/inventory/products?branchId=${selectedBranch}&inStockOnly=true`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setProducts(res.data);
    } catch (error) {
      console.error('Failed to fetch products', error);
    }
  };

  const checkActiveSession = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/pos/sessions/active', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setActiveSession(res.data);
    } catch (error) {
      setActiveSession(null);
      if (hasPermission('CREATE_POS_SESSIONS')) {
        setIsSessionModalOpen(true);
      }
    }
  };

  const handleOpenSessionSuccess = () => {
    setIsSessionModalOpen(false);
    checkActiveSession();
  };

  const handleCloseSessionSuccess = () => {
    setIsCloseSessionModalOpen(false);
    setActiveSession(null);
    setIsSessionModalOpen(true);
  };

  // --- Cart Logic ---
  const addToCart = (product) => {
    if (!activeSession) return alert('Please open a session first.');
    const existing = cart.find(item => item.productId === product._id);
    if (existing) {
      setCart(cart.map(item => item.productId === product._id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      let appliedTaxRate = product.taxRate || 0;
      let taxType = 'Percentage';
      
      if (product.tax1 && product.tax1.isActive) {
        appliedTaxRate = product.tax1.rate;
        taxType = product.tax1.type;
      }

      setCart([...cart, { 
        productId: product._id, 
        name: product.name, 
        sku: product.sku, 
        unitPrice: product.price || product.salesPrice || 0, 
        quantity: 1, 
        discount: 0, 
        taxRate: appliedTaxRate,
        taxType: taxType
      }]);
    }
  };

  const updateQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.productId === productId) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (productId) => setCart(cart.filter(item => item.productId !== productId));
  const getSubtotal = () => cart.reduce((sum, item) => {
    const price = item.overriddenPrice !== undefined ? item.overriddenPrice : item.unitPrice;
    return sum + (price * item.quantity);
  }, 0);
  
  const getItemTax = (item) => {
    const price = item.overriddenPrice !== undefined ? item.overriddenPrice : item.unitPrice;
    const taxable = (price * item.quantity) - (item.discount || 0);
    if (item.taxType === 'Fixed') {
      return (item.taxRate || 0) * item.quantity;
    }
    return taxable * ((item.taxRate || 0) / 100);
  };
  
  const getTaxTotal = () => cart.reduce((sum, item) => sum + getItemTax(item), 0);
  const getTotal = () => Math.max(0, getSubtotal() - discount + getTaxTotal());

  // --- Hold Order Logic ---
  const getHeldOrdersKey = () => `pos_held_orders_${authUser._id}`;
  
  const loadHeldOrders = () => {
    const held = JSON.parse(localStorage.getItem(getHeldOrdersKey()) || '[]');
    setHeldOrders(held);
  };

  const holdOrder = () => {
    if (cart.length === 0) return;
    const order = {
      id: Date.now(),
      cart,
      selectedCustomer,
      discount,
      timestamp: new Date().toISOString()
    };
    const updated = [...heldOrders, order];
    localStorage.setItem(getHeldOrdersKey(), JSON.stringify(updated));
    setHeldOrders(updated);
    setCart([]);
    setSelectedCustomer('');
    setDiscount(0);
  };

  const resumeOrder = (order) => {
    setCart(order.cart);
    setSelectedCustomer(order.selectedCustomer);
    setDiscount(order.discount);
    const updated = heldOrders.filter(o => o.id !== order.id);
    localStorage.setItem(getHeldOrdersKey(), JSON.stringify(updated));
    setHeldOrders(updated);
    setIsHoldModalOpen(false);
  };

  // --- Payment Logic ---
  const processPaymentAndSubmit = async (paymentDetails) => {
    try {
      setIsProcessing(true);
      const payload = {
        branchId: selectedBranch,
        idempotencyKey: idempotencyKey || crypto.randomUUID(),
        customerId: selectedCustomer || undefined,
        customerName: selectedCustomer ? customers.find(c => c._id === selectedCustomer)?.name : 'Walk-in Customer',
        payments: [{ 
          method: paymentDetails.method === 'card' ? 'CARD' : 'CASH', 
          amount: paymentDetails.amount, 
          cashTendered: paymentDetails.tendered !== undefined ? paymentDetails.tendered : paymentDetails.amount 
        }],
        discountAmount: discount,
        taxAmount: getTaxTotal(),
        totalAmount: getTotal(),
        discountOverrideToken,
        priceOverrideToken,
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          overriddenPrice: item.overriddenPrice,
          discount: item.discount,
          tax: getItemTax(item)
        }))
      };

      const res = await axios.post('http://localhost:5000/api/v1/pos/orders', payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setLastOrder(res.data);
      setReceipt(res.data);
      setIsPaymentModalOpen(false);
      setCart([]);
      setSelectedCustomer('');
      setDiscount(0);
      setIdempotencyKey(null);
      setPriceOverrideToken(null);
      setDiscountOverrideToken(null);
    } catch (error) {
      console.error('Checkout failed', error);
      alert(error.response?.data?.message || 'Failed to process checkout');
    } finally {
      setIsProcessing(false);
    }
  };

  const showLastSlip = () => {
    if (lastOrder) {
      setReceipt(lastOrder);
    } else {
      alert('No previous orders in this session.');
    }
  };

  const triggerCheckoutFlow = () => {
    if (cart.length === 0) return alert('Cart is empty!');
    if (!activeSession) return alert('Active session required!');

    const hasWildcard = hasPermission('*') || authUser.roleName === 'TENANT ADMIN';
    const hasPriceOverridePerm = hasWildcard || hasPermission('OVERRIDE_POS_PRICE');
    const hasDiscountOverridePerm = hasWildcard || hasPermission('OVERRIDE_POS_DISCOUNT');

    let needsPriceOverride = false;
    for (const item of cart) {
      if (item.overriddenPrice !== undefined && item.overriddenPrice !== item.unitPrice) {
        needsPriceOverride = true;
      }
    }

    if (needsPriceOverride && !hasPriceOverridePerm && !priceOverrideToken) {
      setManagerOverrideAction('OVERRIDE_POS_PRICE');
      setManagerOverrideContext({ branchId: selectedBranch });
      setIsManagerApprovalModalOpen(true);
      return;
    }

    const totalOrderDiscount = discount + cart.reduce((sum, item) => sum + (item.discount || 0), 0);
    const totalSubtotal = getSubtotal();
    
    if (totalSubtotal > 0) {
      const discountPercentage = (totalOrderDiscount / totalSubtotal) * 100;
      if (discountPercentage > posMaxDiscountLimit && !hasDiscountOverridePerm && !discountOverrideToken) {
        setManagerOverrideAction('OVERRIDE_POS_DISCOUNT');
        setManagerOverrideContext({ branchId: selectedBranch });
        setIsManagerApprovalModalOpen(true);
        return;
      }
    }

    setPayments([{ method: 'CASH', amount: getTotal() }]);
    setIdempotencyKey(crypto.randomUUID());
    setIsPaymentModalOpen(true);
  };

  const handleAddPaymentLine = () => setPayments([...payments, { method: 'CASH', amount: 0 }]);
  const handleRemovePaymentLine = (idx) => setPayments(payments.filter((_, i) => i !== idx));
  const handlePaymentChange = (idx, field, value) => {
    const updated = [...payments];
    updated[idx][field] = value;
    setPayments(updated);
  };

  const handleCheckout = async () => {
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    if (Math.abs(totalPaid - getTotal()) > 0.01) {
      return alert(`Payment amount must exactly match order total. Paid: ${totalPaid}, Total: ${getTotal()}`);
    }

    setIsProcessing(true);
    try {
      const payload = {
        branchId: selectedBranch,
        idempotencyKey: idempotencyKey,
        customerId: selectedCustomer || undefined,
        customerName: selectedCustomer ? customers.find(c => c._id === selectedCustomer)?.name : 'Walk-in Customer',
        payments: payments.map(p => {
          const amount = Number(p.amount);
          if (p.method === 'CASH') {
            const cashTendered = p.cashTendered !== undefined ? Number(p.cashTendered) : amount;
            return { method: p.method, amount, cashTendered };
          }
          return { method: p.method, amount };
        }),
        discountAmount: discount,
        taxAmount: getTaxTotal(),
        totalAmount: getTotal(),
        discountOverrideToken,
        priceOverrideToken,
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          overriddenPrice: item.overriddenPrice,
          discount: item.discount,
          tax: getItemTax(item)
        }))
      };

      const res = await axios.post('http://localhost:5000/api/v1/pos/orders', payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setReceipt(res.data);
      setIsPaymentModalOpen(false);
      setCart([]);
      setSelectedCustomer('');
      setDiscount(0);
      setIdempotencyKey(null);
      setPriceOverrideToken(null);
      setDiscountOverrideToken(null);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to process checkout');
    } finally {
      setIsProcessing(false);
    }
  };

  const printReceipt = () => {
    window.print();
  };

  // --- Cash Drawer Logic ---
  const handleOpenDrawerClick = () => {
    if (!activeSession) {
      alert('Active session required to open the drawer.');
      return;
    }
    setIsCashDrawerModalOpen(true);
  };

  const handleDrawerReasonSubmit = async (reason) => {
    setDrawerReason(reason);
    setIsCashDrawerModalOpen(false);

    if (hasPermission('OPEN_CASH_DRAWER') || authUser.roleName === 'TENANT ADMIN') {
      await executeDrawerOpen(reason, null);
    } else {
      setManagerOverrideAction('OPEN_CASH_DRAWER');
      setManagerOverrideContext({ branchId: activeSession.branchId._id || activeSession.branchId });
      setIsManagerApprovalModalOpen(true);
    }
  };

  const handleManagerApprovalSuccess = async (overrideToken) => {
    setIsManagerApprovalModalOpen(false);
    
    if (managerOverrideAction === 'OPEN_CASH_DRAWER') {
      await executeDrawerOpen(drawerReason, overrideToken);
    } else if (managerOverrideAction === 'OVERRIDE_POS_PRICE') {
      setPriceOverrideToken(overrideToken);
      setTimeout(triggerCheckoutFlow, 100);
    } else if (managerOverrideAction === 'OVERRIDE_POS_DISCOUNT') {
      setDiscountOverrideToken(overrideToken);
      setTimeout(triggerCheckoutFlow, 100);
    }
  };

  const executeDrawerOpen = async (reason, overrideToken) => {
    setIsDrawerProcessing(true);
    try {
      await axios.post(`http://localhost:5000/api/v1/pos/registers/${activeSession.registerId._id || activeSession.registerId}/drawer-open`, {
        reason,
        overrideToken,
        context: {
          branchId: activeSession.branchId._id || activeSession.branchId
        }
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Cash drawer open authorized successfully.');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to authorize cash drawer opening.');
    } finally {
      setIsDrawerProcessing(false);
      setDrawerReason('');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || (p.category && p.category._id === selectedCategory) || p.categoryId === selectedCategory || (p.category && p.category.name === selectedCategory);
    return matchesSearch && matchesCategory;
  });

  // --- Render Modals ---
  const renderDiscountModal = () => (
      <DiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        currentDiscount={discount}
        onApply={(val) => setDiscount(val)}
      />
    );

    const renderNewCustomerModal = () => (
      <NewCustomerModal
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        onSuccess={(newCustomer) => {
          setCustomers([...customers, newCustomer]);
          setSelectedCustomer(newCustomer._id);
        }}
      />
    );

    const renderPaymentModal = () => (
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        total={getTotal() + (getSubtotal() * 0.05)}
        orderNumber="#ORD-9043"
        onComplete={processPaymentAndSubmit}
      />
    );
    const renderSessionModal = () => (
    <NewSessionModal
      isOpen={isSessionModalOpen}
      onClose={() => setIsSessionModalOpen(false)}
      onSuccess={handleOpenSessionSuccess}
      initialBranchId={selectedBranch}
    />
  );

  const renderCloseSessionModal = () => (
    <CloseSessionModal
      isOpen={isCloseSessionModalOpen}
      onClose={() => setIsCloseSessionModalOpen(false)}
      session={activeSession || {}}
      onSuccess={handleCloseSessionSuccess}
    />
  );

  const renderCashDrawerModal = () => (
    <CashDrawerModal
      isOpen={isCashDrawerModalOpen}
      onClose={() => setIsCashDrawerModalOpen(false)}
      onSubmit={handleDrawerReasonSubmit}
      isProcessing={false}
    />
  );

  const renderManagerApprovalModal = () => (
    <ManagerApprovalModal
      isOpen={isManagerApprovalModalOpen}
      onClose={() => {
        setIsManagerApprovalModalOpen(false);
        setDrawerReason('');
      }}
      onSuccess={handleManagerApprovalSuccess}
      requestedAction={managerOverrideAction}
      contextData={managerOverrideContext}
    />
  );

  const renderHoldModal = () => (
    isHoldModalOpen && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Held Orders</h2>
              <button onClick={() => setIsHoldModalOpen(false)}><X size={20}/></button>
            </div>
            {heldOrders.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No held orders found.</p>
            ) : (
              <div className="space-y-3">
                {heldOrders.map(order => (
                  <div key={order.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-slate-50">
                    <div>
                      <p className="font-bold">Order from {new Date(order.timestamp).toLocaleTimeString()}</p>
                      <p className="text-sm text-slate-500">{order.cart.length} items • Total: {formatCurrency(order.cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0) - order.discount)}</p>
                    </div>
                    <Button onClick={() => resumeOrder(order)} variant="outline" className="gap-2"><PlayCircle size={16}/> Resume</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  );



  const renderReceiptModal = () => {
    if (!receipt) return null;

    const branch = branches.find(b => b._id === receipt.branchId);
    const date = new Date(receipt.createdAt);
    const totalItemsCount = receipt.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalLinesCount = receipt.items.length;
    
    // Fallbacks if data is missing
    const amountPaid = receipt.amountPaid || receipt.totalAmount;
    const changeDue = amountPaid - receipt.totalAmount;

    return (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 print:static print:block print:p-0 print:bg-transparent print:m-0">
        <style>{`
          .thermal-receipt, .thermal-receipt * { 
            font-family: 'Courier New', Courier, monospace !important; 
          }
          .thermal-receipt-container { 
            background: #fffdf9; 
          }
          @media print {
            @page { margin: 0; size: 80mm auto; }
            body { margin: 0; }
            .print\\:hidden { display: none !important; }
            #receipt-content {
              width: 80mm !important;
              max-width: 80mm !important;
              margin: 0 auto !important;
            }
          }
        `}</style>
        
        <Card className="w-full max-w-[380px] max-h-[90vh] flex flex-col mx-auto bg-white rounded-none shadow-2xl print:w-[380px] print:max-h-none print:shadow-none print:border-none print:mx-auto print:block">
          <div className="overflow-y-auto flex-1 p-6 thermal-receipt-container thermal-receipt print:overflow-visible print:h-auto print:p-0 print:block">
            <div id="receipt-content" className="text-xs text-slate-800 leading-tight">
              {/* Header */}
              <div className="text-center mb-4">
                <h2 className="text-base font-bold uppercase tracking-wider mb-1">*** {authUser.companyName || 'JTS ENTERPRISE LLC'} ***</h2>
                <p className="uppercase font-bold mb-2">{branch?.name || 'DUBAI CENTRAL FLAGSHIP'}</p>
                <p className="text-[10px]">Financial Center Road, Downtown Dubai, UAE</p>
                <p className="text-[10px]">TRN/VAT: 100482910400003</p>
                <p className="text-[10px]">Tel: +971 4 382 9100 | www.jts-erp.com</p>
              </div>
              
              <div className="border-t border-dashed border-slate-300 my-3"></div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-1 text-[11px] mb-3 uppercase">
                <div>DATE: {date.toLocaleDateString('en-GB')}</div>
                <div className="text-right">TIME: {date.toLocaleTimeString('en-GB')}</div>
                <div>RECEIPT: {receipt.receiptNumber}</div>
                <div className="text-right">MODE: Walk-in</div>
                <div>CASHIER: {authUser.firstName} {authUser.lastName ? authUser.lastName[0] + '.' : ''}</div>
                <div className="text-right">STATION: {receipt.registerId?.name || 'Counter #01'}</div>
              </div>

              <div className="border-t border-dashed border-slate-300 my-3"></div>

              {/* Table Header */}
              <div className="flex justify-between font-bold text-[11px] mb-2 uppercase">
                <div className="w-1/2">ITEM / DESC</div>
                <div className="w-1/4 text-right">QTY@UNIT</div>
                <div className="w-1/4 text-right">TOTAL</div>
              </div>

              {/* Items */}
              <div className="space-y-3 mb-3">
                {receipt.items.map((item, idx) => (
                  <div key={idx} className="text-[11px] uppercase">
                    <div className="flex justify-between font-bold">
                      <div className="truncate pr-2">{item.productName}</div>
                      <div>{formatCurrency(item.total)}</div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-600">
                      <div>SKU: {item.sku || 'N/A'}</div>
                      <div>{item.quantity} PCS @ {formatCurrency(item.unitPrice)}</div>
                    </div>
                    {item.discount > 0 && (
                      <div className="text-[10px] text-slate-600 italic">
                        Discount Applied: -{formatCurrency(item.discount)}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-300 my-3"></div>

              {/* Totals */}
              <div className="space-y-1 text-[11px] uppercase">
                <div className="flex justify-between">
                  <span>SUBTOTAL (EXCL. TAX):</span>
                  <span>{formatCurrency(receipt.totalAmount - (receipt.taxAmount || 0))}</span>
                </div>
                {(receipt.taxAmount > 0) && (
                  <div className="flex justify-between">
                    <span>VAT / TAX:</span>
                    <span>{formatCurrency(receipt.taxAmount)}</span>
                  </div>
                )}
                {(receipt.discountAmount > 0) && (
                  <div className="flex justify-between">
                    <span>DISCOUNT:</span>
                    <span>-{formatCurrency(receipt.discountAmount)}</span>
                  </div>
                )}
              </div>

              <div className="border-t-2 border-double border-slate-300 my-3"></div>

              <div className="flex justify-between items-center font-bold text-sm uppercase mb-3">
                <span>TOTAL AMOUNT:</span>
                <span className="text-base">{formatCurrency(receipt.totalAmount)}</span>
              </div>

              <div className="border-t-2 border-double border-slate-300 my-3"></div>

              {/* Payment details */}
              <div className="space-y-1 text-[11px] uppercase mb-4 mt-3">
                <div className="flex justify-between">
                  <span>PAYMENT METHOD:</span>
                  <span className="font-bold text-emerald-600">{receipt.paymentMethod || 'CASH'} TENDERED</span>
                </div>
                <div className="flex justify-between">
                  <span>{receipt.paymentMethod === 'CASH' ? 'CASH RECEIVED:' : 'AMOUNT CHARGED:'}</span>
                  <span>{formatCurrency(amountPaid)}</span>
                </div>
                {receipt.paymentMethod === 'CASH' && (
                  <div className="flex justify-between">
                    <span>CHANGE DUE:</span>
                    <span>{formatCurrency(changeDue)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500 mt-2 pt-2 border-t border-dashed border-slate-200">
                  <span>TOTAL ITEMS COUNT:</span>
                  <span>{totalItemsCount} PCS ({totalLinesCount} LINES)</span>
                </div>
              </div>

              {/* Barcode & Footer */}
              <div className="text-center mt-6">
                <p className="text-[10px] tracking-widest uppercase mb-6">*{receipt.receiptNumber}-TRX*</p>
                
                <p className="font-bold text-[11px] mb-2 uppercase">THANK YOU FOR SHOPPING WITH US!</p>
                <p className="text-[9px] mb-1">Goods exchangeable within 14 days with original receipt.</p>
                <p className="text-[9px] mb-2">System generated thermal slip. No signature required.</p>
                
                <p className="text-[8px] text-slate-400 mt-6">Powered by JTS ERP POS v4.2 Cloud Bridge</p>
                <p className="text-[9px] text-slate-400 mt-1">[ESC/POS FULL CUT]</p>
              </div>

            </div>
            
            <div className="mt-8 flex gap-3 print:hidden sticky bottom-0 bg-[#fffdf9] pt-2">
              <button 
                onClick={() => setReceipt(null)} 
                className="flex-1 py-2 px-4 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm transition-colors !font-sans"
              >
                New Order
              </button>
              <button 
                onClick={printReceipt} 
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex justify-center items-center gap-2 font-medium text-sm transition-colors shadow-sm shadow-blue-200 !font-sans"
              >
                <Printer size={16}/> Print
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <>
      <div className="absolute top-20 left-0 right-0 bottom-0 flex bg-surface overflow-hidden z-10 print:hidden font-body-md text-body-md text-on-surface">
        {renderSessionModal()}
      {renderDiscountModal()}
      {renderNewCustomerModal()}
      {renderPaymentModal()}
        {renderCloseSessionModal()}
        {renderHoldModal()}
        {renderCashDrawerModal()}
        {renderManagerApprovalModal()}
        
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* LEFT WORKSPACE: POS CATALOG & CONTROLS */}
          <section className="flex-1 flex flex-col overflow-hidden border-r border-outline-variant/50 bg-[#f8fafc]">
            {/* POS Control Sub-header */}
            <div className="p-4 bg-surface-container-lowest border-b border-outline-variant/40 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-[#1e3a8a] flex items-center justify-center shadow-sm">
                  <Store size={26} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-extrabold text-[#1e3a8a] tracking-tight">Point of Sale</h1>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-100 text-blue-800 tracking-wider">LIVE RETAIL</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Fast checkout, offline sync & barcoding</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className="appearance-none bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold py-2 pl-3.5 pr-9 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer">
                    <option value="" disabled>Select Branch</option>
                    {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </Select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
                
                {activeSession && activeSession.registerId && (
                  <div className="flex items-center px-3 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium h-10">
                    {activeSession.registerId.name}
                  </div>
                )}
                
                <Button variant="outline" onClick={() => setIsHoldModalOpen(true)} className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/70 text-on-surface font-label-lg text-label-lg font-semibold transition-all">
                  <PauseCircle size={18} className="text-amber-600"/>
                  <span>Held Orders</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-label-sm font-bold">{heldOrders.length}</span>
                </Button>
                
                <Button variant="outline" onClick={handleOpenDrawerClick} disabled={isDrawerProcessing || !activeSession} className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/70 text-on-surface font-label-lg text-label-lg font-semibold transition-all">
                  {isDrawerProcessing ? <Loader2 size={18} className="animate-spin text-slate-400" /> : <Store size={18} className="text-slate-400"/>}
                  <span className="hidden sm:inline">{isDrawerProcessing ? 'Opening...' : 'Open Drawer'}</span>
                </Button>
                
                {activeSession ? (
                  <div className={`flex items-center gap-3 px-4 h-10 rounded-xl border shadow-sm transition-all ${activeSession.branchId?._id !== selectedBranch ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                    <div className={`w-2 h-2 rounded-full animate-pulse ${activeSession.branchId?._id !== selectedBranch ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                    <span className="text-sm font-bold">Session Open {activeSession.branchId ? `(${activeSession.branchId.name})` : ''}</span>
                    <div className="w-px h-4 bg-current opacity-20 mx-1"></div>
                    <button onClick={() => setIsCloseSessionModalOpen(true)} className="hover:opacity-70 transition-opacity" title="Close Session">
                      <Power size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                ) : (
                  <Button onClick={() => setIsSessionModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#fabc14] hover:bg-amber-500 text-white text-sm font-bold shadow-sm transition-transform active:scale-95">
                    <Power size={18} />
                    <span>Open Register</span>
                  </Button>
                )}
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="px-5 py-3 bg-white border-b border-slate-200 flex gap-4 items-center flex-wrap md:flex-nowrap">
              <div className="w-full md:w-80 relative flex items-center shrink-0">
                <Search size={18} className="absolute left-3 text-blue-600" />
                <input
                  type="text"
                  placeholder="Search products by name..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-14 py-2 bg-white border border-slate-200 rounded text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 rounded border border-slate-200">F2</span>
                  <span className="text-slate-400 ml-1 cursor-pointer"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg></span>
                </div>
              </div>
              <div className="flex-1 flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                <button 
                  onClick={() => setSelectedCategory('All')} 
                  className={`px-4 py-1.5 rounded-full font-bold text-xs whitespace-nowrap transition-colors ${selectedCategory === 'All' ? 'bg-[#1e3a8a] text-white' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                >
                  All Items
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat._id}
                    onClick={() => setSelectedCategory(cat._id)} 
                    className={`px-4 py-1.5 rounded-full font-bold text-xs whitespace-nowrap transition-colors ${selectedCategory === cat._id ? 'bg-[#1e3a8a] text-white' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map(product => {
                  const cartItem = cart.find(item => item.productId === product._id);
                  const isInCart = !!cartItem;
                  return (
                    <div key={product._id} onClick={() => addToCart(product)} className={`group cursor-pointer bg-white rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md relative flex flex-col h-full min-h-[260px] transition-all p-3 ${isInCart ? 'border-2 border-blue-600' : 'border border-slate-200'}`}>
                      <div className="flex justify-between items-start mb-2 relative z-10">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-full flex flex-col items-center justify-center border border-emerald-100 shadow-sm leading-none shrink-0">
                          <span className="text-xs font-black">{product.stock || 0}</span>
                          <span className="text-[8px] font-bold">LEFT</span>
                        </div>
                        {isInCart ? (
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider text-right leading-tight">IN CART<br/>({cartItem.quantity})</span>
                        ) : (
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">{product.category?.name || 'ITEM'}</span>
                        )}
                      </div>
                      
                      <div className="flex-1 flex justify-center items-center py-2">
                        {product.images && product.images.length > 0 ? (
                          <img src={product.images[0]} alt={product.name} className="w-24 h-24 object-contain drop-shadow-sm group-hover:scale-110 transition-transform" />
                        ) : product.uploadImage ? (
                          <img src={product.uploadImage} alt={product.name} className="w-24 h-24 object-contain drop-shadow-sm group-hover:scale-110 transition-transform" />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-slate-50 text-slate-300 flex items-center justify-center group-hover:text-blue-500 transition-colors">
                            <ShoppingCart size={32} />
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-auto text-left flex flex-col relative z-10 w-full pt-2">
                        <h3 className="font-bold text-sm text-slate-800 line-clamp-2 leading-tight min-h-[40px]">{product.name}</h3>
                        <p className="text-[10px] text-slate-400 font-medium mt-1 mb-2 uppercase tracking-wide">SKU: {product.sku}</p>
                        
                        <div className="flex justify-between items-center w-full mt-2">
                          <span className="font-black text-lg text-slate-900 tracking-tight">{formatCurrency(product.price || 0)}</span>
                          {isInCart ? (
                            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black shadow-sm shrink-0">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl hover:bg-blue-100 transition-colors pb-0.5 shadow-sm shrink-0">+</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {filteredProducts.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 mt-20">
                  <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                    <Search size={48} className="text-slate-200" />
                  </div>
                  <p className="font-medium text-lg text-slate-500">No products found</p>
                  <p className="text-sm">Try adjusting your search criteria</p>
                </div>
              )}
            </div>
          </section>
          
          {/* RIGHT WORKSPACE: DOCKED CART */}
          <aside className="w-full lg:w-[410px] flex-shrink-0 bg-white flex flex-col justify-between lg:border-l border-t lg:border-t-0 border-slate-200 shadow-lg z-10 h-1/2 lg:h-auto">
            {/* Cart Header */}
            <div className="p-4 border-b border-slate-200 space-y-4 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={18} className="text-blue-600" />
                  <h2 className="text-[15px] font-bold text-slate-800">Active Register Cart</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded">#ORD-9043</span>
                  <button onClick={() => setCart([])} className="text-slate-400 hover:text-red-500 text-xs p-1 rounded hover:bg-red-50 flex items-center" title="Clear All Items">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">CUSTOMER</label>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className="w-full appearance-none bg-white font-medium text-sm text-slate-700 py-2 pl-3 pr-8 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="">Walk-in Customer</option>
                      {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </Select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                  </div>
                  <button onClick={() => setIsNewCustomerModalOpen(true)} className="w-9 h-9 shrink-0 rounded border border-slate-200 flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <ShoppingCart size={48} className="text-slate-300 mb-2 opacity-50" />
                  <p className="font-bold text-slate-700">Cart is Empty</p>
                  <p className="text-xs text-slate-400 font-medium">Click items in catalog to start checkout</p>
                </div>
              ) : (
                <>
                  {cart.map((item, index) => (
                    <div key={`${item.productId}-${index}`} className="flex flex-col gap-2 p-3 rounded-[12px] border border-slate-200 bg-white shadow-sm relative group">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-slate-800 pr-6 line-clamp-1">{item.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{formatCurrency(item.overriddenPrice !== undefined ? item.overriddenPrice : item.unitPrice)} / unit</span>
                        </div>
                        <span className="font-bold text-[13px] text-slate-800">{formatCurrency((item.overriddenPrice !== undefined ? item.overriddenPrice : item.unitPrice) * item.quantity)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <div className="flex items-center gap-3 bg-white rounded border border-slate-200 px-2 py-1 shadow-sm">
                          <button onClick={() => updateQuantity(item.productId, -1)} className="text-slate-400 hover:text-slate-600"><Minus size={14}/></button>
                          <span className="font-bold text-sm w-4 text-center text-slate-700">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.productId, 1)} className="text-slate-400 hover:text-slate-600"><Plus size={14}/></button>
                        </div>
                        <button onClick={() => removeFromCart(item.productId)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))}
                  <button className="w-full py-3 mt-4 text-xs font-bold text-slate-500 flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors">
                    <Plus size={14} /> Add Custom Line or Note
                  </button>
                </>
              )}
            </div>
            
            {/* Totals & Checkout */}
            <div className="p-5 border-t border-slate-200 bg-white space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-800">{formatCurrency(getSubtotal())}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>VAT / Tax (5%)</span>
                  <span className="font-bold text-slate-800">{formatCurrency(getSubtotal() * 0.05)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500 font-medium">
                  <span className="flex items-center gap-1">Discount <span onClick={() => setIsDiscountModalOpen(true)} className="text-blue-500 text-xs cursor-pointer hover:underline">(Add Code)</span></span>
                  <span className="font-bold text-slate-800">
                    {discount > 0 ? `-${formatCurrency(discount)}` : formatCurrency(0)}
                  </span>
                </div>
                
                <div className="h-px bg-slate-200 my-3"></div>
                
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-lg font-black text-slate-800">Total</span>
                  <span className="text-3xl font-black text-[#1e3a8a]">{formatCurrency(getTotal() + (getSubtotal() * 0.05))}</span>
                </div>
              </div>
              
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => { if(cart.length>0) setIsPaymentModalOpen(true); }} disabled={cart.length === 0} className="py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-700 flex flex-col items-center gap-1 disabled:opacity-50">
                    <Banknote size={18} className="text-emerald-500" />
                    <span>Cash</span>
                  </button>
                  <button onClick={() => { if(cart.length>0) setIsPaymentModalOpen(true); }} disabled={cart.length === 0} className="py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-700 flex flex-col items-center gap-1 disabled:opacity-50">
                    <CreditCard size={18} className="text-blue-500" />
                    <span>Card / POS</span>
                  </button>
                  <button onClick={() => { if(cart.length>0) setIsPaymentModalOpen(true); }} disabled={cart.length === 0} className="py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-700 flex flex-col items-center gap-1 disabled:opacity-50">
                    <SplitSquareHorizontal size={18} className="text-purple-500" />
                    <span>Split Tender</span>
                  </button>
                </div>
                
                <button onClick={triggerCheckoutFlow} disabled={cart.length === 0 || !activeSession || !hasPermission('CREATE_POS_ORDERS')} className="w-full h-12 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-base flex items-center justify-center shadow-md active:scale-[0.99] transition-all disabled:opacity-50">
                  Checkout <span className="font-mono text-blue-200 mx-2 text-sm px-1.5 py-0.5 border border-blue-700 rounded bg-blue-950/30">[Space]</span>
                </button>
                
                <div className="flex gap-2">
                  <button onClick={holdOrder} disabled={cart.length === 0} className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                    <PauseCircle size={16} className="text-amber-500" /> Hold Order
                  </button>
                  <button onClick={showLastSlip} className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                    <Receipt size={16} className="text-slate-500" /> Last Slip
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </main>
      </div>
      {renderReceiptModal()}
    </>
  );
};

export default POS;

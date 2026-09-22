import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, Power, PauseCircle, PlayCircle, Printer, X, Search, Store, Loader2, Edit2 } from 'lucide-react';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/common/Card';
import NewSessionModal from '../../components/sales/NewSessionModal';
import CloseSessionModal from '../../components/sales/CloseSessionModal';
import CashDrawerModal from '../../components/sales/CashDrawerModal';
import ManagerApprovalModal from '../../components/auth/ManagerApprovalModal';

const POS = () => {
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [customers, setCustomers] = useState([]);
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
      const res = await axios.get('/api/v1/company', {
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
      const res = await axios.get('/api/v1/branches', {
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

  const fetchCustomers = async () => {
    try {
      const res = await axios.get('/api/v1/crm/customers', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setCustomers(res.data);
    } catch (error) {
      console.error('Failed to fetch customers', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`/api/v1/inventory/products?branchId=${selectedBranch}&inStockOnly=true`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setProducts(res.data);
    } catch (error) {
      console.error('Failed to fetch products', error);
    }
  };

  const checkActiveSession = async () => {
    try {
      const res = await axios.get('/api/v1/pos/sessions/active', {
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

      const res = await axios.post('/api/v1/pos/orders', payload, {
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
      await axios.post(`/api/v1/pos/registers/${activeSession.registerId._id || activeSession.registerId}/drawer-open`, {
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

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));

  // --- Render Modals ---
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
                      <p className="text-sm text-slate-500">{order.cart.length} items • Total: ${(order.cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0) - order.discount).toFixed(2)}</p>
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

  const renderPaymentModal = () => (
    isPaymentModalOpen && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Payment</h2>
              <button onClick={() => setIsPaymentModalOpen(false)}><X size={20}/></button>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl mb-6 space-y-2">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span>${getSubtotal().toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Discount:</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              {getTaxTotal() > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Tax:</span>
                  <span>${getTaxTotal().toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t font-medium">
                <span className="text-slate-700">Total Due:</span>
                <span className="text-2xl font-black text-blue-600">${getTotal().toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {payments.map((p, idx) => (
                <div key={idx} className="flex flex-col gap-2 mb-2 p-3 border rounded-lg bg-white">
                  <div className="flex gap-3 items-center">
                    <Select value={p.method} onChange={e => handlePaymentChange(idx, 'method', e.target.value)} className="w-1/2">
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="ONLINE">Online</option>
                      <option value="OTHER">Other</option>
                    </Select>
                    <Input type="number" min="0" value={p.amount} onChange={e => handlePaymentChange(idx, 'amount', e.target.value)} className="w-1/2" />
                    {payments.length > 1 && (
                      <button onClick={() => handleRemovePaymentLine(idx)} className="text-red-500 p-2 hover:bg-red-50 rounded"><Trash2 size={18}/></button>
                    )}
                  </div>
                  {p.method === 'CASH' && (
                    <div className="flex flex-col gap-2 mt-2 bg-slate-50 p-3 rounded border border-slate-100">
                      <div className="flex justify-between items-center">
                         <span className="text-sm font-medium text-slate-600">Cash Tendered:</span>
                         <Input type="number" min={p.amount} value={p.cashTendered !== undefined ? p.cashTendered : p.amount} onChange={e => handlePaymentChange(idx, 'cashTendered', e.target.value)} className="w-1/2 text-right" />
                      </div>
                      <div className="flex justify-between items-center">
                         <span className="text-sm font-medium text-slate-600">Change Due:</span>
                         <span className={`font-bold ${((Number(p.cashTendered !== undefined ? p.cashTendered : p.amount) || 0) - Number(p.amount)) < 0 ? 'text-red-500' : 'text-green-600'}`}>
                           ${((Number(p.cashTendered !== undefined ? p.cashTendered : p.amount) || 0) - Number(p.amount)).toFixed(2)}
                         </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <Button variant="outline" onClick={handleAddPaymentLine} className="w-full mb-6 gap-2"><Plus size={16}/> Split Payment</Button>
            
            <div className="flex justify-end gap-3">
              <Button onClick={handleCheckout} disabled={isProcessing} className="w-full h-12 text-lg">
                {isProcessing ? 'Processing...' : 'Validate Payment'}
              </Button>
            </div>
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
                      <div>${item.total.toFixed(2)}</div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-600">
                      <div>SKU: {item.sku || 'N/A'}</div>
                      <div>{item.quantity} PCS @ ${item.unitPrice.toFixed(2)}</div>
                    </div>
                    {item.discount > 0 && (
                      <div className="text-[10px] text-slate-600 italic">
                        Discount Applied: -${item.discount.toFixed(2)}
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
                  <span>${(receipt.totalAmount - (receipt.taxAmount || 0)).toFixed(2)}</span>
                </div>
                {(receipt.taxAmount > 0) && (
                  <div className="flex justify-between">
                    <span>VAT / TAX:</span>
                    <span>${receipt.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                {(receipt.discountAmount > 0) && (
                  <div className="flex justify-between">
                    <span>DISCOUNT:</span>
                    <span>-${receipt.discountAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="border-t-2 border-double border-slate-300 my-3"></div>

              <div className="flex justify-between items-center font-bold text-sm uppercase mb-3">
                <span>TOTAL AMOUNT:</span>
                <span className="text-base">${receipt.totalAmount.toFixed(2)}</span>
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
                  <span>${amountPaid.toFixed(2)}</span>
                </div>
                {receipt.paymentMethod === 'CASH' && (
                  <div className="flex justify-between">
                    <span>CHANGE DUE:</span>
                    <span>${changeDue.toFixed(2)}</span>
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
      <div className="absolute top-20 left-0 right-0 bottom-0 flex bg-slate-50 overflow-hidden z-10 print:hidden font-sans">
        {renderSessionModal()}
        {renderCloseSessionModal()}
        {renderHoldModal()}
        {renderPaymentModal()}
        {renderCashDrawerModal()}
        {renderManagerApprovalModal()}
        
        {/* Left side: Products Grid */}
        <div className="flex-1 flex flex-col relative z-0">
        {/* Header */}
        <div className="px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex justify-between items-center z-20">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-indigo-600 to-blue-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-200/50">
              <Store size={22} strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 hidden sm:block">Point of Sale</h1>
            <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>
            <div className="flex gap-4">
              <Select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className="w-56 text-sm font-semibold shadow-sm border-slate-200 focus:ring-indigo-500 bg-white">
                <option value="" disabled>Select Branch</option>
                {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </Select>
              {activeSession && activeSession.registerId && (
                <div className="flex items-center px-3 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium">
                  {activeSession.registerId.name}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleOpenDrawerClick} disabled={isDrawerProcessing || !activeSession} className="gap-2 bg-white hover:bg-slate-50 border-slate-200 font-semibold shadow-sm transition-all rounded-xl h-10 px-4">
              {isDrawerProcessing ? <Loader2 size={18} className="animate-spin text-slate-400" /> : <Store size={18} className="text-slate-400"/>}
              <span className="hidden sm:inline">{isDrawerProcessing ? 'Opening...' : 'Open Drawer'}</span>
            </Button>
            
            <Button variant="outline" onClick={() => setIsHoldModalOpen(true)} className="gap-2 bg-white hover:bg-slate-50 border-slate-200 font-semibold shadow-sm transition-all rounded-xl h-10 px-4">
              <PlayCircle size={18} className="text-slate-400"/> 
              <span className="hidden sm:inline">Held Orders</span> 
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs ml-1">{heldOrders.length}</span>
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
              <Button onClick={() => setIsSessionModalOpen(true)} className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 shadow-lg shadow-amber-200 rounded-xl h-10 px-5 font-bold transition-all hover:scale-105 active:scale-95">
                <Power size={16} strokeWidth={2.5} /> Open Register
              </Button>
            )}
          </div>
        </div>
        
        {/* Search Bar Area */}
        <div className="px-6 py-5 z-10">
          <div className="relative group max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
               <Search size={20} strokeWidth={2} />
            </div>
            <input
               type="text"
               placeholder="Search products by name, SKU..."
               value={search}
               onChange={e => setSearch(e.target.value)}
               className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200/80 rounded-2xl text-slate-700 focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 shadow-sm transition-all outline-none text-sm font-medium placeholder:text-slate-400"
            />
          </div>
        </div>
        
        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {filteredProducts.map(product => (
              <div key={product._id} onClick={() => addToCart(product)} className="group cursor-pointer hover:-translate-y-1 transition-all duration-300 bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-slate-200/60 hover:border-indigo-200 relative flex flex-col h-[200px]">
                <div className="p-4 flex flex-col items-center text-center flex-1">
                  {/* Stock tag */}
                  {product.stock !== undefined && (
                    <div className={`absolute top-3 right-3 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md backdrop-blur-md ${product.stock > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                      {product.stock > 0 ? `${product.stock} left` : 'Out'}
                    </div>
                  )}
                  
                  {/* Image / Icon Area */}
                  {product.images && product.images.length > 0 ? (
                    <img 
                      src={product.images[0]} 
                      alt={product.name} 
                      className="w-16 h-16 object-cover rounded-2xl mb-3 mt-2 shadow-sm"
                    />
                  ) : product.uploadImage ? (
                    <img 
                      src={product.uploadImage} 
                      alt={product.name} 
                      className="w-16 h-16 object-cover rounded-2xl mb-3 mt-2 shadow-sm"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mb-3 mt-2 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors duration-300">
                      <ShoppingCart size={24} strokeWidth={1.5} />
                    </div>
                  )}
                  
                  <h3 className="font-semibold text-sm text-slate-700 mb-1 line-clamp-2 px-1 group-hover:text-indigo-900 transition-colors">{product.name}</h3>
                </div>
                
                {/* Price Footer */}
                <div className="bg-slate-50/50 py-3 px-4 border-t border-slate-100 group-hover:bg-indigo-50/50 transition-colors flex items-center justify-center">
                  <span className="font-black text-[17px] tracking-tight text-slate-900 group-hover:text-indigo-700">${product.price?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            ))}
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
      </div>

      {/* Right side: Cart (Sleek Sidebar) */}
      <div className="w-[420px] bg-white flex flex-col shadow-[0_0_40px_-15px_rgba(0,0,0,0.1)] z-20 shrink-0 border-l border-slate-200">
        
        {/* Customer Select */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/30">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Customer</label>
          <Select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className="w-full font-bold h-12 bg-white border-slate-200 rounded-xl shadow-sm text-slate-700 focus:ring-indigo-500">
            <option value="">Walk-in Customer</option>
            {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </Select>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-slate-50/30">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <div className="w-32 h-32 mb-6 rounded-full bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center">
                <ShoppingCart size={40} className="text-slate-300" strokeWidth={1.5} />
              </div>
              <p className="font-semibold text-slate-500">Cart is empty</p>
              <p className="text-xs mt-1">Select products to add</p>
            </div>
          ) : (
            <div className="space-y-2 p-3">
              {cart.map((item, index) => (
                <div key={`${item.productId}-${index}`} className="flex flex-col bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-3 pr-6">
                    <span className="font-bold text-sm text-slate-800 leading-snug">{item.name}</span>
                    <button onClick={() => removeFromCart(item.productId)} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors bg-white rounded-full p-1"><Trash2 size={16}/></button>
                  </div>
                  <div className="flex justify-between items-center mt-auto">
                    {editingPriceProductId === item.productId ? (
                      <input 
                        type="number"
                        min="0"
                        autoFocus
                        value={tempPrice}
                        onChange={e => setTempPrice(e.target.value)}
                        onBlur={() => {
                          const num = Number(tempPrice);
                          if (!isNaN(num) && num >= 0) {
                            setCart(cart.map(i => i.productId === item.productId ? { ...i, overriddenPrice: num } : i));
                          }
                          setEditingPriceProductId(null);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') e.target.blur();
                        }}
                        className="w-24 px-2 py-1 text-lg font-black text-indigo-600 border border-indigo-300 rounded focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-2 cursor-pointer group/price" onClick={() => { setEditingPriceProductId(item.productId); setTempPrice(item.overriddenPrice !== undefined ? item.overriddenPrice : item.unitPrice); }}>
                        <span className="font-black text-indigo-600 text-lg">${((item.overriddenPrice !== undefined ? item.overriddenPrice : item.unitPrice) * item.quantity).toFixed(2)}</span>
                        <div className="text-slate-300 group-hover/price:text-indigo-400 transition-colors">
                          <Edit2 size={14} />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-1 bg-slate-100/80 rounded-xl p-1 shadow-inner border border-slate-200/60">
                      <button onClick={() => updateQuantity(item.productId, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg shadow-sm text-slate-600 transition-colors"><Minus size={14} strokeWidth={3}/></button>
                      <span className="font-bold text-sm w-8 text-center text-slate-800">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.productId, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg shadow-sm text-slate-600 transition-colors"><Plus size={14} strokeWidth={3}/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals & Actions */}
        <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] rounded-t-3xl relative z-10">
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm items-center">
              <span className="text-slate-500 font-medium">Subtotal</span>
              <span className="font-bold text-slate-700">${getSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Discount</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input 
                  type="number" 
                  min="0" 
                  value={discount === 0 ? '' : discount} 
                  placeholder="0.00"
                  onChange={e => setDiscount(Number(e.target.value) || 0)} 
                  className="w-24 pl-6 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-right font-bold focus:ring-2 focus:ring-indigo-500 outline-none" 
                  disabled={!hasPermission('CREATE_POS_ORDERS')} 
                />
              </div>
            </div>
            <div className="flex justify-between text-2xl font-black mt-4 pt-4 border-t border-slate-100 items-end">
              <span className="text-slate-800 tracking-tight">Total</span>
              <span className="text-indigo-600 tracking-tight">${getTotal().toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <Button variant="outline" onClick={holdOrder} disabled={cart.length === 0} className="flex-1 gap-2 text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl h-12 font-bold shadow-sm">
              <PauseCircle size={18}/> Hold Order
            </Button>
          </div>
          
          <Button 
            onClick={triggerCheckoutFlow}
            disabled={cart.length === 0 || !activeSession || !hasPermission('CREATE_POS_ORDERS')}
            className={`w-full h-16 text-xl font-black tracking-wide rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 ${
              cart.length === 0 || !activeSession || !hasPermission('CREATE_POS_ORDERS') 
              ? 'bg-slate-100 text-slate-400 shadow-none' 
              : 'bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 text-white shadow-indigo-200 hover:-translate-y-1 active:translate-y-0 active:shadow-sm'
            }`}
          >
            <Banknote size={24} className={cart.length > 0 && activeSession ? 'animate-bounce' : ''} /> 
            Checkout
          </Button>
        </div>
      </div>
    </div>
    {renderReceiptModal()}
  </>
  );
};

export default POS;

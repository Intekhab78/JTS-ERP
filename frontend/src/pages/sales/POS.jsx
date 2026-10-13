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
import Modal from '../../components/common/Modal';
import { useCurrency } from '../../contexts/CurrencyContext';

const POS = () => {
  const { formatCurrency, currencySymbol, currency } = useCurrency();
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
  const [appliedDiscountCode, setAppliedDiscountCode] = useState(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(50);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const [evaluationResult, setEvaluationResult] = useState({ totalDiscountAmount: 0, appliedPromotions: [], rejectedPromotions: [], finalDistributedLines: {} });
  const [isEvaluatingPromos, setIsEvaluatingPromos] = useState(false);
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

  // App Alert State
  const [appAlert, setAppAlert] = useState({ isOpen: false, message: '', title: '' });

  const showAlert = (message, title = 'Notice') => {
    setAppAlert({ isOpen: true, message, title });
  };
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
    fetchCategories();
    loadHeldOrders();
    fetchCompanyConfig();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      setCart([]);
      setAppliedDiscountCode(null);
      checkActiveSession(selectedBranch);
    } else {
      setActiveSession(null);
    }
  }, [selectedBranch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedBranch) fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedBranch, search, selectedCategory, page]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedCategory]);

  const barcodeBuffer = useRef('');
  const barcodeTimer = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Enter' && e.target.type === 'text' && search === e.target.value) {
            handleBarcodeScan(e.target.value);
            e.preventDefault();
        }
        return;
      }
      if (e.key !== 'Enter') {
        barcodeBuffer.current += e.key;
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => { barcodeBuffer.current = ''; }, 50);
      } else {
        if (barcodeBuffer.current.length > 3) {
          handleBarcodeScan(barcodeBuffer.current);
          barcodeBuffer.current = '';
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBranch]);

  const handleBarcodeScan = async (code) => {
    if (!selectedBranch) return;
    const isCurrentBranchSession = activeSession && 
      (activeSession.branchId?._id === selectedBranch || activeSession.branchId === selectedBranch);

    if (!isCurrentBranchSession) {
      showAlert('Please open a register session for this branch first.', 'Action Required');
      return;
    }

    try {
      const res = await axios.get(`/api/v1/inventory/products/barcode?barcode=${code}&branchId=${selectedBranch}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data) {
        addToCart(res.data);
        setSearch('');
      }
    } catch (error) {
      showAlert(error.response?.data?.message || 'Barcode not found', 'Scan Error');
    }
  };

  useEffect(() => {
    evaluatePromotions();
  }, [cart, selectedCustomer, selectedBranch, appliedDiscountCode]);

  const evaluatePromotions = async () => {
     if (!selectedBranch || cart.length === 0) {
        setEvaluationResult({ totalDiscountAmount: 0, appliedPromotions: [], rejectedPromotions: [], finalDistributedLines: {} });
        return;
     }
     
     setIsEvaluatingPromos(true);
     try {
       const payload = {
         branchId: selectedBranch,
         customerId: selectedCustomer || undefined,
         discountCode: appliedDiscountCode || undefined,
         items: cart.map(i => ({
           productId: i.productId,
           quantity: i.quantity,
           unitPrice: i.unitPrice,
           overriddenPrice: i.overriddenPrice,
           discount: i.discount
         }))
       };
       const res = await axios.post('/api/v1/pos/promotions/evaluate', payload, {
         headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
       });
       setEvaluationResult(res.data);
     } catch (err) {
       console.error("Promo evaluation failed:", err);
     } finally {
       setIsEvaluatingPromos(false);
     }
  };

  const fetchBranches = async () => {
    try {
      let url = '/api/v1/branches';
      const activeCompanyId = localStorage.getItem('active_company_id');
      if (activeCompanyId && activeCompanyId !== 'ALL') url += `?legalCompanyId=${activeCompanyId}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      let allowedBranches = res.data;
      // If user has specific branches assigned, filter the list
      if (authUser.branches && authUser.branches.length > 0) {
        const userBranchIds = authUser.branches.map(br => typeof br === 'object' && br !== null ? (br._id || br) : br);
        allowedBranches = res.data.filter(b => userBranchIds.includes(b._id));
      } else if (!authUser.permissions?.includes('*') && authUser.roleName !== 'TENANT ADMIN') {
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
      const res = await axios.get('/api/v1/inventory/categories', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await axios.get('/api/v1/crm/customers', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setCustomers(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to fetch customers', error);
    }
  };

  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      let url = `/api/v1/inventory/products?branchId=${selectedBranch}&inStockOnly=true&paginated=true&page=${page}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (selectedCategory && selectedCategory !== 'All') {
        url += `&categoryId=${selectedCategory}`;
      }
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data && Array.isArray(res.data.products)) {
         setProducts(res.data.products);
         setTotalPages(res.data.pagination?.pages || 1);
      } else if (Array.isArray(res.data)) {
         setProducts(res.data);
         setTotalPages(1);
      } else {
         setProducts([]);
         setTotalPages(1);
      }
    } catch (error) {
      console.error('Failed to fetch products', error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const checkActiveSession = async (branchIdToUse) => {
    const branch = branchIdToUse || selectedBranch;
    if (!branch) {
      setActiveSession(null);
      return;
    }
    try {
      const res = await axios.get(`/api/v1/pos/sessions/active?branchId=${branch}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data && res.data.active === false) {
        setActiveSession(null);
      } else if (res.data && res.data._id) {
        const sessionBranchId = res.data.branchId?._id || res.data.branchId;
        if (sessionBranchId && sessionBranchId.toString() === branch.toString()) {
          setActiveSession(res.data);
        } else {
          setActiveSession(null);
        }
      } else {
        setActiveSession(null);
      }
    } catch (error) {
      setActiveSession(null);
    }
  };

  const handleOpenSessionSuccess = () => {
    setIsSessionModalOpen(false);
    checkActiveSession(selectedBranch);
  };

  const handleCloseSessionSuccess = () => {
    setIsCloseSessionModalOpen(false);
    setActiveSession(null);
    checkActiveSession(selectedBranch);
  };

  // --- Cart Logic ---
  const addToCart = (product) => {
    const isCurrentBranchSession = activeSession && 
      (activeSession.branchId?._id === selectedBranch || activeSession.branchId === selectedBranch);

    if (!isCurrentBranchSession) {
      return showAlert('Please open a register session for this branch first.', 'Action Required');
    }
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
  const getManualDiscountTotal = () => cart.reduce((sum, item) => sum + (item.discount || 0), 0);

  const getSubtotal = () => cart.reduce((sum, item) => {
    const price = item.overriddenPrice !== undefined ? item.overriddenPrice : item.unitPrice;
    return sum + (price * item.quantity);
  }, 0);

  const getOverallDiscountAmount = () => evaluationResult.totalDiscountAmount || 0;

  const getTaxableAmount = () => {
    return Math.max(0, getSubtotal() - getManualDiscountTotal() - getOverallDiscountAmount());
  };

  const getItemTax = (item) => {
    const distributedLines = evaluationResult?.finalDistributedLines || {};
    const price = item.overriddenPrice !== undefined ? item.overriddenPrice : item.unitPrice;
    const lineNet = (price * item.quantity) - (item.discount || 0);
    const itemPromoDiscount = distributedLines[item.productId] || 0;
    
    const taxable = Math.max(0, lineNet - itemPromoDiscount);
    
    if (item.taxType === 'Fixed') {
      return (item.taxRate || 0) * item.quantity;
    }
    return taxable * ((item.taxRate || 0) / 100);
  };

  const getTaxTotal = () => {
    return cart.reduce((sum, item) => sum + getItemTax(item), 0);
  };
  
  const getTotal = () => {
     return Math.max(0, getTaxableAmount() + getTaxTotal());
  };

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
      appliedDiscountCode,
      timestamp: new Date().toISOString()
    };
    const updated = [...heldOrders, order];
    localStorage.setItem(getHeldOrdersKey(), JSON.stringify(updated));
    setHeldOrders(updated);
    setCart([]);
    setSelectedCustomer('');
    setAppliedDiscountCode(null);
  };

  const resumeOrder = (order) => {
    setCart(order.cart);
    setSelectedCustomer(order.selectedCustomer);
    setAppliedDiscountCode(order.appliedDiscountCode || null);
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
        payments: paymentDetails.method === 'split' ? paymentDetails.payments : [{ 
          method: paymentDetails.method === 'card' ? 'CARD' : 'CASH', 
          amount: paymentDetails.amount, 
          cashTendered: paymentDetails.tendered !== undefined ? paymentDetails.tendered : paymentDetails.amount 
        }],
        discountCode: appliedDiscountCode,
        taxAmount: getTaxTotal(),
        totalAmount: getTotal(),
        currency: currency || 'AED',
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
      
      setLastOrder(res.data);
      setReceipt(res.data);
      setIsPaymentModalOpen(false);
      setCart([]);
      setSelectedCustomer('');
      setAppliedDiscountCode(null);
      setIdempotencyKey(null);
      setPriceOverrideToken(null);
      setDiscountOverrideToken(null);
    } catch (error) {
      console.error('Checkout failed', error);
      showAlert(error.response?.data?.message || 'Failed to process checkout', 'Checkout Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const showLastSlip = () => {
    if (lastOrder) {
      setReceipt(lastOrder);
    } else {
      showAlert('No previous orders in this session.', 'Notice');
    }
  };

  const triggerCheckoutFlow = () => {
    if (cart.length === 0) return showAlert('Cart is empty!', 'Notice');
    const isCurrentBranchSession = activeSession && 
      (activeSession.branchId?._id === selectedBranch || activeSession.branchId === selectedBranch);

    if (!isCurrentBranchSession) {
      return showAlert('Active register session for this branch is required to checkout!', 'Action Required');
    }

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

    const totalOrderDiscount = getOverallDiscountAmount() + getManualDiscountTotal();
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
      return showAlert(`Payment amount must exactly match order total. Paid: ${formatCurrency(totalPaid)}, Total: ${formatCurrency(getTotal())}`, 'Payment Error');
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
        discountCode: appliedDiscountCode,
        taxAmount: getTaxTotal(),
        totalAmount: getTotal(),
        currency: currency || 'AED',
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
      setAppliedDiscountCode(null);
      setIdempotencyKey(null);
      setPriceOverrideToken(null);
      setDiscountOverrideToken(null);
    } catch (error) {
      showAlert(error.response?.data?.message || 'Failed to process checkout', 'Checkout Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const printReceipt = () => {
    window.print();
  };

  // --- Cash Drawer Logic ---
  const handleOpenDrawerClick = () => {
    const isCurrentBranchSession = activeSession && 
      (activeSession.branchId?._id === selectedBranch || activeSession.branchId === selectedBranch);

    if (!isCurrentBranchSession) {
      showAlert('Active session for this branch is required to open the drawer.', 'Action Required');
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
      showAlert('Cash drawer open authorized successfully.', 'Success');
    } catch (error) {
      showAlert(error.response?.data?.message || 'Failed to authorize cash drawer opening.', 'Error');
    } finally {
      setIsDrawerProcessing(false);
      setDrawerReason('');
    }
  };

  const filteredProducts = products;

  // --- Render Modals ---
  const renderDiscountModal = () => (
      <DiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        currentDiscountCode={appliedDiscountCode}
        onApply={(discountData) => setAppliedDiscountCode(discountData)}
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
        total={getTotal()}
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
                      <p className="text-sm text-slate-500">{order.cart.length} items • Total: {formatCurrency(order.cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0) - order.discount || 0)}</p>
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
        
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50">
          {/* LEFT WORKSPACE: POS CATALOG & CONTROLS */}
          <section className="flex-1 flex flex-col overflow-hidden bg-transparent">
            {/* Aggressive Tech Header */}
            <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-[#0a0f1c] border-l-4 border-blue-500 p-6 text-white shadow-2xl m-3 md:m-4 z-10">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-8 w-8 bg-blue-600 flex items-center justify-center rounded">
                      <Store size={18} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-white uppercase">Point of Sale</h1>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400 tracking-widest border border-emerald-500/30 uppercase">LIVE RETAIL</span>
                  </div>
                  <p className="text-slate-400 text-xs font-medium tracking-wide">
                    TERMINAL COMMAND • FAST CHECKOUT & BARCODING
                  </p>
                </div>
              
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative group">
                    <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className="appearance-none bg-[#111827] hover:bg-slate-800 text-white text-xs font-bold py-2 pl-3 pr-8 rounded border border-slate-700 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer uppercase tracking-wider">
                      <option value="" disabled>SELECT BRANCH</option>
                      {branches.map(b => <option key={b._id} value={b._id}>{b.name.toUpperCase()}</option>)}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                  </div>
                  
                  {activeSession && activeSession.registerId && (activeSession.branchId?._id === selectedBranch || activeSession.branchId === selectedBranch) && (
                    <div className="flex items-center px-3 bg-[#111827] border border-slate-700 rounded text-xs text-slate-300 font-bold h-[34px] uppercase tracking-wider">
                      {activeSession.registerId.name}
                    </div>
                  )}
                  
                  <button onClick={() => setIsHoldModalOpen(true)} className="flex items-center gap-2 px-3 h-[34px] rounded bg-[#111827] hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs transition-colors uppercase tracking-wider">
                    <PauseCircle size={14} className="text-amber-500" />
                    <span>Held</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-black">{heldOrders.length}</span>
                  </button>
                  
                  <button onClick={handleOpenDrawerClick} disabled={isDrawerProcessing || !activeSession || (activeSession.branchId?._id !== selectedBranch && activeSession.branchId !== selectedBranch)} className="flex items-center gap-2 px-3 h-[34px] rounded bg-[#111827] hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs transition-colors uppercase tracking-wider disabled:opacity-50">
                    {isDrawerProcessing ? <Loader2 size={14} className="animate-spin text-slate-400" /> : <Store size={14} className="text-slate-400" />}
                    <span className="hidden sm:inline">{isDrawerProcessing ? 'OPENING...' : 'DRAWER'}</span>
                  </button>
                  
                  {activeSession && (activeSession.branchId?._id === selectedBranch || activeSession.branchId === selectedBranch) ? (
                    <div className="flex items-center gap-2 px-3 h-[34px] rounded border transition-colors uppercase tracking-wider text-xs font-bold bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                      <div className="w-2 h-2 shrink-0 rounded-full animate-pulse bg-emerald-500"></div>
                      <span className="whitespace-nowrap">OPEN {activeSession.branchId ? `(${activeSession.branchId.name || 'SESSION'})` : ''}</span>
                      <div className="w-px h-4 bg-current opacity-20 mx-1"></div>
                      <button onClick={() => setIsCloseSessionModalOpen(true)} className="hover:text-white transition-colors" title="Close Session">
                        <Power size={14} strokeWidth={3} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setIsSessionModalOpen(true)} className="flex items-center gap-2 px-4 h-[34px] rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors uppercase tracking-wider border border-blue-400 shadow-sm">
                      <Power size={14} strokeWidth={3} />
                      <span>OPEN REGISTER</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Search Bar & Categories - FLOATING DESIGN */}
            <div className="px-4 pb-2 flex gap-4 items-center flex-wrap md:flex-nowrap relative z-0">
              <div className="w-full md:w-96 relative flex items-center shrink-0 shadow-sm rounded-xl">
                <Search size={18} className="absolute left-4 text-[#0f4c5c]" strokeWidth={2.5} />
                <input
                  type="text"
                  placeholder="Search products by name or SKU..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-11 pr-14 py-3 bg-white border border-slate-200/80 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f4c5c]/20 transition-all placeholder:text-slate-400"
                />
                <div className="absolute right-3 flex items-center gap-1.5">
                  <span className="px-2 py-1 text-[9px] font-black bg-slate-100 text-slate-400 rounded-md border border-slate-200/60 shadow-sm">F2</span>
                </div>
              </div>
              <div className="flex-1 flex items-center gap-2.5 overflow-x-auto custom-scrollbar pb-2 pt-2 px-1 mask-linear-fade">
                <button 
                  onClick={() => setSelectedCategory('All')} 
                  className={`px-5 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all shadow-sm ${selectedCategory === 'All' ? 'bg-[#0f4c5c] text-white shadow-teal-900/20' : 'bg-white text-slate-600 border border-slate-200/60 hover:bg-slate-50'}`}
                >
                  All Items
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat._id}
                    onClick={() => setSelectedCategory(cat._id)} 
                    className={`px-5 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all shadow-sm ${selectedCategory === cat._id ? 'bg-[#0f4c5c] text-white shadow-teal-900/20' : 'bg-white text-slate-600 border border-slate-200/60 hover:bg-slate-50'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Product Grid - PREMIUM LOOK */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2 custom-scrollbar">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                {isLoadingProducts ? (
                  <div className="col-span-full h-40 flex items-center justify-center">
                    <Loader2 size={32} className="animate-spin text-teal-600" />
                  </div>
                ) : filteredProducts.map(product => {
                  const cartItem = cart.find(item => item.productId === product._id);
                  const isInCart = !!cartItem;
                  return (
                    <div key={product._id} onClick={() => addToCart(product)} className={`group cursor-pointer bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md relative flex flex-col h-full min-h-[140px] transition-all duration-300 p-2 border ${isInCart ? 'border-[#0f4c5c] ring-1 ring-[#0f4c5c]' : 'border-slate-100 hover:border-slate-200'}`}>
                      <div className="flex justify-between items-start mb-2 relative z-10">
                        <div className="w-8 h-8 bg-teal-50/80 backdrop-blur-sm text-[#0f4c5c] rounded-lg flex flex-col items-center justify-center border border-teal-100/50 shadow-sm leading-none shrink-0 transition-transform group-hover:scale-105">
                          <span className="text-[11px] font-black">{product.stock || 0}</span>
                        </div>
                        {isInCart ? (
                          <div className="bg-[#0f4c5c]/10 text-[#0f4c5c] px-2 py-1 rounded-md flex items-center gap-1 border border-[#0f4c5c]/20">
                            <span className="w-3 h-3 rounded-full bg-[#0f4c5c] text-white flex items-center justify-center text-[8px] font-bold">{cartItem.quantity}</span>
                          </div>
                        ) : (
                          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest text-right bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 line-clamp-1 max-w-[60px]">{product.category?.name || 'ITEM'}</span>
                        )}
                      </div>
                      
                      <div className="flex-1 flex justify-center items-center py-2 relative">
                        {/* Soft background glow */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50/50 rounded-xl -z-10 group-hover:to-teal-50/30 transition-colors"></div>
                        {product.images && product.images.length > 0 ? (
                          <img src={product.images[0]} alt={product.name} className="w-16 h-16 object-contain drop-shadow-sm group-hover:scale-105 transition-all duration-300" />
                        ) : product.uploadImage ? (
                          <img src={product.uploadImage} alt={product.name} className="w-16 h-16 object-contain drop-shadow-sm group-hover:scale-105 transition-all duration-300" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-slate-100 text-slate-200 flex items-center justify-center group-hover:text-[#0f4c5c] group-hover:bg-teal-50/50 transition-all duration-300">
                            <ShoppingCart size={24} strokeWidth={1.5} />
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-auto text-left flex flex-col relative z-10 w-full pt-2 border-t border-slate-50 group-hover:border-teal-50 transition-colors">
                        <h3 className="font-bold text-xs text-slate-800 line-clamp-2 leading-tight min-h-[32px] group-hover:text-[#0f4c5c] transition-colors">{product.name}</h3>
                        
                        <div className="flex justify-between items-end w-full mt-1 pt-1">
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block mb-0.5">PRICE</span>
                            <span className="font-black text-sm text-slate-900 tracking-tight leading-none">{formatCurrency(product.price || 0)}</span>
                          </div>
                          {isInCart ? (
                            <div className="w-7 h-7 rounded-lg bg-[#0f4c5c] text-white flex items-center justify-center shadow-md shadow-teal-900/20 shrink-0 transform transition-transform active:scale-90">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-[#0f4c5c] group-hover:text-white transition-all duration-300 shadow-sm shrink-0">
                              <Plus size={16} strokeWidth={2.5} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {!isLoadingProducts && filteredProducts.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 mt-20 pb-20">
                  <div className="bg-white p-8 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.04)] mb-6 border border-slate-50">
                    <Search size={56} className="text-slate-200" strokeWidth={1.5} />
                  </div>
                  <p className="font-black text-xl text-slate-700 tracking-tight mb-2">No products found</p>
                  <p className="text-sm font-medium">Try adjusting your search criteria or categories</p>
                </div>
              )}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center px-4 py-3 bg-white border-t border-slate-100 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] relative z-10">
                <Button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} variant="outline" className="px-4 py-2 h-9 text-xs rounded-lg font-bold border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><polyline points="15 18 9 12 15 6"></polyline></svg> Previous
                </Button>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Page</span>
                  <span className="text-xs font-black text-slate-800 bg-white px-2 py-0.5 rounded shadow-sm border border-slate-200/50">{page}</span>
                  <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase mx-0.5">OF</span>
                  <span className="text-xs font-black text-slate-500">{totalPages}</span>
                </div>
                <Button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} variant="outline" className="px-4 py-2 h-9 text-xs rounded-lg font-bold border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                  Next <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-1.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </Button>
              </div>
            )}
          </section>
          
          {/* RIGHT WORKSPACE: DOCKED CART - PREMIUM STYLING */}
          <aside className="w-full lg:w-[440px] flex-shrink-0 bg-white flex flex-col justify-between shadow-[-10px_0_40px_rgba(0,0,0,0.04)] z-20 h-full overflow-hidden border-l border-slate-100 lg:rounded-l-[32px]">
            {/* Cart Header */}
            <div className="px-4 py-3 border-b border-slate-100 bg-white z-10 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-[#0f4c5c]">
                    <ShoppingCart size={16} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-800 tracking-tight leading-tight">Current Order</h2>
                    <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">
                      {(activeSession && (activeSession.branchId?._id === selectedBranch || activeSession.branchId === selectedBranch)) ? (activeSession.registerId?.name || 'Register') : 'No Active Session'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-500 text-[9px] font-black tracking-widest rounded-md">#ORD-9043</span>
                  <button onClick={() => setCart([])} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all" title="Clear All Items">
                    <Trash2 size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
              
              <div className="bg-slate-50/80 rounded-xl p-2 border border-slate-100/80">
                <div className="flex items-center justify-between mb-1 px-1">
                  <label className="block text-[8px] uppercase font-black text-slate-400 tracking-widest">CUSTOMER</label>
                  <button onClick={() => setIsNewCustomerModalOpen(true)} className="text-[#0f4c5c] text-[9px] font-bold hover:underline flex items-center gap-1">
                    <Plus size={8} strokeWidth={3}/> Add New
                  </button>
                </div>
                <div className="relative">
                  <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className="w-full appearance-none bg-white font-bold text-xs text-slate-700 py-1.5 pl-3 pr-8 rounded-lg border border-slate-200/60 focus:outline-none focus:ring-2 focus:ring-[#0f4c5c]/30 shadow-sm cursor-pointer transition-all">
                    <option value="">Walk-in Customer</option>
                    {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 custom-scrollbar bg-slate-50/30 min-h-0">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 pb-10">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-3 border border-slate-100">
                    <ShoppingCart size={28} className="text-slate-200" strokeWidth={1.5} />
                  </div>
                  <p className="font-black text-base text-slate-700 tracking-tight">Cart is Empty</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">Add items from catalog to start</p>
                </div>
              ) : (
                <>
                  {cart.map((item, index) => (
                    <div key={`${item.productId}-${index}`} className="flex flex-col gap-1 p-2 rounded-lg border border-slate-200/60 bg-white shadow-sm relative group hover:border-[#0f4c5c]/30 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col flex-1 pr-2">
                          <span className="font-bold text-[11px] text-slate-800 line-clamp-1 leading-tight">{item.name}</span>
                          <span className="text-[8px] text-slate-400 font-bold tracking-wider uppercase">{formatCurrency(item.overriddenPrice !== undefined ? item.overriddenPrice : item.unitPrice)} / unit</span>
                        </div>
                        <span className="font-black text-[11px] text-[#0f4c5c] bg-teal-50/50 px-1.5 py-0.5 rounded">{formatCurrency((item.overriddenPrice !== undefined ? item.overriddenPrice : item.unitPrice) * item.quantity)}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-50 pt-1">
                        <div className="flex items-center gap-1.5 bg-slate-50 rounded p-0.5 border border-slate-100">
                          <button onClick={() => updateQuantity(item.productId, -1)} className="w-5 h-5 rounded-sm bg-white text-slate-500 hover:text-slate-800 flex items-center justify-center shadow-sm border border-slate-200/50 transition-colors"><Minus size={10} strokeWidth={2.5}/></button>
                          <span className="font-black text-[10px] w-3 text-center text-slate-800">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.productId, 1)} className="w-5 h-5 rounded-sm bg-white text-slate-500 hover:text-slate-800 flex items-center justify-center shadow-sm border border-slate-200/50 transition-colors"><Plus size={10} strokeWidth={2.5}/></button>
                        </div>
                        <button onClick={() => removeFromCart(item.productId)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 w-5 h-5 rounded flex items-center justify-center transition-all"><Trash2 size={12}/></button>
                      </div>
                    </div>
                  ))}
                  <button className="w-full py-2 mt-2 text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1.5 border-2 border-dashed border-slate-200 rounded-lg hover:bg-slate-50 hover:text-[#0f4c5c] hover:border-[#0f4c5c]/30 transition-all">
                    <Plus size={12} strokeWidth={2.5} /> Add Custom Line or Note
                  </button>
                </>
              )}
            </div>
            
            {/* Totals & Checkout - FLOATING CARD LOOK */}
            <div className="p-4 bg-white border-t border-slate-100 rounded-t-[24px] shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-20 relative">
              <div className="space-y-1.5 text-[11px] mb-3">
                <div className="flex justify-between text-slate-500 font-bold">
                  <span>Subtotal</span>
                  <span className="text-slate-800 font-black">{formatCurrency(getSubtotal())}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-bold">
                  <span>VAT / Tax</span>
                  <span className="text-slate-800 font-black">{formatCurrency(getTaxTotal())}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500 font-bold">
                  <span className="flex items-center gap-1.5">Discount 
                    <button onClick={() => setIsDiscountModalOpen(true)} className="px-1.5 py-0.5 rounded bg-teal-50 text-[#0f4c5c] text-[8px] uppercase tracking-widest hover:bg-teal-100 transition-colors font-black">
                      Add Code
                    </button>
                  </span>
                  <span className="font-black text-slate-800">
                    {appliedDiscountCode ? (
                      <div className="flex items-center gap-1.5">
                        <button onClick={(e) => { e.stopPropagation(); setAppliedDiscountCode(null); }} className="text-red-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50 transition-colors" title="Remove Discount"><Trash2 size={10} strokeWidth={3}/></button>
                        <div className="text-[9px] text-green-700 bg-green-100 px-1.5 py-0.5 rounded uppercase tracking-widest">{appliedDiscountCode}</div>
                        <span className="text-green-600">-{formatCurrency(getOverallDiscountAmount())}</span>
                      </div>
                    ) : formatCurrency(0)}
                  </span>
                </div>
                
                <div className="h-px bg-slate-200/60 my-2"></div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Total</span>
                  <span className="text-xl font-black text-[#0f4c5c] tracking-tight">{formatCurrency(getTotal())}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <button onClick={triggerCheckoutFlow} disabled={cart.length === 0 || !activeSession || (activeSession.branchId?._id !== selectedBranch && activeSession.branchId !== selectedBranch) || !hasPermission('CREATE_POS_ORDERS')} className="w-full h-10 rounded-lg bg-gradient-to-r from-[#0f4c5c] to-[#145d70] hover:from-[#0c3e4b] hover:to-[#0f4c5c] text-white font-black text-xs flex items-center justify-center shadow active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none tracking-wide">
                  Checkout
                </button>
                
                <div className="flex gap-2">
                  <button onClick={holdOrder} disabled={cart.length === 0} className="flex-1 py-1.5 rounded-lg bg-slate-100/80 hover:bg-slate-200 text-slate-600 font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 border border-transparent hover:border-slate-300">
                    <PauseCircle size={12} className="text-amber-500" strokeWidth={2.5} /> Hold Order
                  </button>
                  <button onClick={showLastSlip} className="flex-1 py-1.5 rounded-lg bg-slate-100/80 hover:bg-slate-200 text-slate-600 font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors border border-transparent hover:border-slate-300">
                    <Receipt size={12} className="text-slate-500" strokeWidth={2.5} /> Last Slip
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </main>

      </div>
      {renderReceiptModal()}

      {/* App Alert Modal */}
      <Modal
        isOpen={appAlert.isOpen}
        onClose={() => setAppAlert({ ...appAlert, isOpen: false })}
        title={appAlert.title}
        size="sm"
        footer={
          <Button onClick={() => setAppAlert({ ...appAlert, isOpen: false })} className="w-full sm:w-auto">
            OK
          </Button>
        }
      >
        <p className="text-slate-600 text-sm">{appAlert.message}</p>
      </Modal>
    </>
  );
};

export default POS;

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, Power, 
  PauseCircle, PlayCircle, Printer, X, Search, Store, Loader2, Edit2, 
  SplitSquareHorizontal, Receipt, Building2, Sparkles, Check, Package, 
  ChevronDown, User, Wallet, ArrowRight, Tag, AlertTriangle
} from 'lucide-react';
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
      <div className="h-full w-full flex flex-col lg:flex-row overflow-hidden bg-slate-100/70 dark:bg-background print:hidden font-sans">
        {renderSessionModal()}
        {renderDiscountModal()}
        {renderNewCustomerModal()}
        {renderPaymentModal()}
        {renderCloseSessionModal()}
        {renderHoldModal()}
        {renderCashDrawerModal()}
        {renderManagerApprovalModal()}

        {/* LEFT WORKSPACE: TERMINAL HEADER, SEARCH, CATEGORIES & PRODUCT CATALOG */}
        <section className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
          
          {/* 1. EXECUTIVE TERMINAL HEADER BANNER */}
          <div className="p-3.5 px-4 bg-gradient-to-r from-[#0f172a] via-[#1e1b4b] to-[#1e293b] text-white shadow-md border-b border-white/10 shrink-0">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Store size={16} />
                  </div>
                  <h1 className="text-xl font-black tracking-tight text-white uppercase">
                    Point of Sale
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 tracking-widest uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    LIVE TERMINAL
                  </span>
                  {activeSession && activeSession.registerId && (activeSession.branchId?._id === selectedBranch || activeSession.branchId === selectedBranch) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase">
                      {activeSession.registerId.name}
                    </span>
                  )}
                </div>
                <p className="text-slate-300 text-[11px] font-medium tracking-wide">
                  Fast Barcode Checkout (F2) · Instant Billing & Counter POS
                </p>
              </div>

              {/* Station Controls & Register Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Branch Selector */}
                <div className="relative">
                  <select
                    value={selectedBranch}
                    onChange={e => setSelectedBranch(e.target.value)}
                    className="appearance-none bg-white/10 hover:bg-white/15 text-white text-xs font-bold h-9 pl-8 pr-8 rounded-xl border border-white/20 focus:outline-none focus:border-blue-400 transition-colors cursor-pointer uppercase tracking-wider shadow-xs"
                  >
                    <option value="" disabled className="bg-slate-900 text-white">SELECT BRANCH</option>
                    {branches.map(b => (
                      <option key={b._id} value={b._id} className="bg-slate-900 text-white">
                        {b.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <Building2 size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-blue-300" />
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300" />
                </div>

                {/* Held Orders Button */}
                <button
                  type="button"
                  onClick={() => setIsHoldModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs transition-all active:scale-95 shadow-xs cursor-pointer"
                  title="View Held Orders"
                >
                  <PauseCircle size={14} className="text-amber-400" />
                  <span>Held</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-300 text-[10px] font-black border border-amber-400/30">
                    {heldOrders.length}
                  </span>
                </button>

                {/* Cash Drawer Button */}
                <button
                  type="button"
                  onClick={handleOpenDrawerClick}
                  disabled={isDrawerProcessing || !activeSession || (activeSession.branchId?._id !== selectedBranch && activeSession.branchId !== selectedBranch)}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs transition-all active:scale-95 shadow-xs cursor-pointer disabled:opacity-50"
                  title="Open Cash Drawer"
                >
                  {isDrawerProcessing ? <Loader2 size={14} className="animate-spin text-slate-300" /> : <Wallet size={14} className="text-slate-300" />}
                  <span className="hidden sm:inline">{isDrawerProcessing ? 'OPENING...' : 'DRAWER'}</span>
                </button>

                {/* Session Active Indicator OR Open Register Button */}
                {activeSession && (activeSession.branchId?._id === selectedBranch || activeSession.branchId === selectedBranch) ? (
                  <div className="flex items-center gap-2 px-3 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="truncate max-w-[130px]">
                      {activeSession.branchId ? (activeSession.branchId.name || 'SESSION') : 'OPEN'}
                    </span>
                    <div className="w-px h-3.5 bg-white/20 mx-0.5"></div>
                    <button
                      type="button"
                      onClick={() => setIsCloseSessionModalOpen(true)}
                      className="p-1 rounded-lg hover:bg-white/20 text-rose-300 hover:text-white transition-colors cursor-pointer"
                      title="Close POS Register Session"
                    >
                      <Power size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSessionModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all active:scale-95 shadow-md cursor-pointer border border-blue-400/40"
                  >
                    <Power size={14} strokeWidth={2.5} />
                    <span>OPEN REGISTER</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2. SEARCH & CATEGORY BAR */}
          <div className="p-3 px-4 bg-card/60 border-b border-border/70 flex flex-col md:flex-row items-center gap-3 shrink-0">
            {/* Search Input */}
            <div className="w-full md:w-80 lg:w-96 relative flex items-center shrink-0">
              <Search size={16} className="absolute left-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search products by name, SKU or barcode... [F2]"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-14 bg-background border border-border/80 hover:border-border focus:border-blue-500 rounded-xl text-xs font-bold text-foreground placeholder:text-muted-foreground/75 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-2xs"
              />
              <div className="absolute right-2.5 flex items-center gap-1 pointer-events-none">
                <kbd className="px-1.5 py-0.5 text-[9.5px] font-bold font-mono tracking-wider bg-muted border border-border/80 rounded-md text-muted-foreground">
                  F2
                </kbd>
              </div>
            </div>

            {/* Category Pills Slider */}
            <div className="flex-1 w-full flex items-center gap-2 overflow-x-auto custom-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => setSelectedCategory('All')}
                className={`px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all shadow-2xs cursor-pointer ${
                  selectedCategory === 'All'
                    ? 'bg-blue-600 text-white shadow-blue-500/20 font-black'
                    : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                All Items
              </button>
              {categories.map(cat => (
                <button
                  key={cat._id}
                  type="button"
                  onClick={() => setSelectedCategory(cat._id)}
                  className={`px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all shadow-2xs cursor-pointer ${
                    selectedCategory === cat._id
                      ? 'bg-blue-600 text-white shadow-blue-500/20 font-black'
                      : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* 3. PRODUCT CATALOG GRID */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {isLoadingProducts ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <Loader2 size={32} className="animate-spin text-blue-600" />
                <span className="text-xs font-bold text-muted-foreground">Loading products catalog...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-muted/60 border border-border/80 flex items-center justify-center mb-4 text-muted-foreground">
                  <Search size={28} />
                </div>
                <h3 className="font-black text-base text-foreground tracking-tight mb-1">No products found</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Try adjusting your search criteria, scanning a different barcode, or choosing another category.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5">
                {filteredProducts.map(product => {
                  const cartItem = cart.find(item => item.productId === product._id);
                  const isInCart = !!cartItem;
                  const stock = Number(product.stock) || 0;
                  const isOutOfStock = stock <= 0;
                  const imgSrc = (product.images && product.images.length > 0) ? product.images[0] : (product.uploadImage || null);

                  return (
                    <div
                      key={product._id}
                      onClick={() => addToCart(product)}
                      className={`group cursor-pointer rounded-2xl border bg-card p-3 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between relative ${
                        isInCart
                          ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-500/[0.02]'
                          : 'border-border/80 hover:border-blue-500/40'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            Out of Stock
                          </span>
                        ) : stock <= 10 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            {stock} left
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {stock} in stock
                          </span>
                        )}

                        {isInCart ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white shadow-2xs">
                            In Cart: {cartItem.quantity}
                          </span>
                        ) : (
                          <span className="text-[9.5px] font-bold text-muted-foreground uppercase truncate max-w-[80px]">
                            {product.category?.name || 'Item'}
                          </span>
                        )}
                      </div>

                      {/* Product Image / Visual Fallback */}
                      <div className="flex-1 flex items-center justify-center py-2 relative">
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt={product.name}
                            className="w-20 h-20 object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500/10 via-indigo-500/10 to-violet-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex flex-col items-center justify-center gap-1 group-hover:scale-105 transition-transform duration-200">
                            <Package size={20} />
                            <span className="text-[9px] font-black uppercase tracking-wider opacity-80">
                              {(product.name || 'SKU').slice(0, 3)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Bottom Info */}
                      <div className="mt-2 pt-2 border-t border-border/60">
                        <h3 className="font-bold text-xs text-foreground line-clamp-2 leading-snug min-h-[32px] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {product.name}
                        </h3>

                        <div className="flex items-center justify-between mt-2 pt-1">
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">
                              Unit Price
                            </span>
                            <span className="font-black text-sm text-foreground">
                              {formatCurrency(product.price || 0)}
                            </span>
                          </div>

                          {isInCart ? (
                            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                              <Check size={16} strokeWidth={2.5} />
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="w-8 h-8 rounded-xl bg-muted hover:bg-blue-600 text-foreground hover:text-white flex items-center justify-center transition-all duration-200 shadow-2xs group-hover:bg-blue-600 group-hover:text-white active:scale-90"
                              title="Add to order"
                            >
                              <Plus size={16} strokeWidth={2.5} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. PAGINATION FOOTER */}
          {totalPages > 1 && (
            <div className="p-3 px-4 bg-card border-t border-border/80 flex items-center justify-between shrink-0 text-xs">
              <Button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                variant="outline"
                className="h-8 px-3 text-xs font-bold rounded-lg"
              >
                Previous
              </Button>
              <div className="flex items-center gap-1.5 text-muted-foreground font-bold">
                <span>Page</span>
                <strong className="text-foreground">{page}</strong>
                <span>of</span>
                <strong className="text-foreground">{totalPages}</strong>
              </div>
              <Button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                variant="outline"
                className="h-8 px-3 text-xs font-bold rounded-lg"
              >
                Next
              </Button>
            </div>
          )}
        </section>

        {/* RIGHT WORKSPACE: DOCKED CART & CHECKOUT TERMINAL */}
        <aside className="w-full lg:w-[420px] xl:w-[460px] shrink-0 bg-card border-l border-border/80 flex flex-col justify-between shadow-xl z-20 h-full overflow-hidden">
          
          {/* Cart Header & Customer Selector */}
          <div className="p-4 border-b border-border/80 bg-muted/20 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <ShoppingCart size={16} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-foreground tracking-tight leading-tight">
                    Current Order
                  </h2>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {(activeSession && (activeSession.branchId?._id === selectedBranch || activeSession.branchId === selectedBranch))
                      ? (activeSession.registerId?.name || 'Active Register')
                      : 'No Active Session'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-card border border-border/80 text-foreground text-[10px] font-black tracking-wider rounded-lg">
                  #ORD-9043
                </span>
                <button
                  type="button"
                  onClick={() => setCart([])}
                  disabled={cart.length === 0}
                  className="w-8 h-8 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
                  title="Clear All Items"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {/* Customer Box */}
            <div className="p-2.5 rounded-xl bg-card border border-border/70 space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[9px] uppercase font-black text-muted-foreground tracking-wider flex items-center gap-1">
                  <User size={11} className="text-blue-500" />
                  <span>Customer / Recipient</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(true)}
                  className="text-blue-600 dark:text-blue-400 text-[10px] font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus size={10} strokeWidth={3} /> Add New
                </button>
              </div>
              <div className="relative">
                <select
                  value={selectedCustomer}
                  onChange={e => setSelectedCustomer(e.target.value)}
                  className="w-full appearance-none bg-muted/40 font-bold text-xs text-foreground py-2 pl-3 pr-8 rounded-lg border border-border/60 focus:outline-none focus:border-blue-500 cursor-pointer transition-all"
                >
                  <option value="">Walk-in Customer</option>
                  {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Cart Items Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar bg-muted/10 min-h-0">
            {cart.length === 0 ? (
              <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                <div className="w-16 h-16 rounded-2xl bg-card border border-border/80 flex items-center justify-center mb-3 text-muted-foreground/60 shadow-2xs">
                  <ShoppingCart size={28} strokeWidth={1.5} />
                </div>
                <h3 className="font-black text-sm text-foreground tracking-tight">Cart is Empty</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                  Tap products in the catalog or scan barcodes (F2) to start order.
                </p>
              </div>
            ) : (
              cart.map((item, index) => {
                const effectivePrice = item.overriddenPrice !== undefined ? item.overriddenPrice : item.unitPrice;
                const lineTotal = effectivePrice * item.quantity;

                return (
                  <div
                    key={`${item.productId}-${index}`}
                    className="p-3 rounded-xl border border-border/80 bg-card shadow-2xs hover:border-blue-500/30 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-xs text-foreground line-clamp-1 leading-tight">
                          {item.name}
                        </h4>
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          {formatCurrency(effectivePrice)} / unit
                        </span>
                      </div>
                      <span className="font-black text-xs text-foreground whitespace-nowrap">
                        {formatCurrency(lineTotal)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/60">
                      {/* Stepper */}
                      <div className="flex items-center gap-1.5 bg-muted/60 p-0.5 rounded-lg border border-border/60">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, -1)}
                          className="w-6 h-6 rounded-md bg-card hover:bg-muted text-foreground flex items-center justify-center shadow-2xs border border-border/60 transition-colors cursor-pointer"
                        >
                          <Minus size={11} strokeWidth={2.5} />
                        </button>
                        <span className="font-black text-xs w-6 text-center text-foreground">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, 1)}
                          className="w-6 h-6 rounded-md bg-card hover:bg-muted text-foreground flex items-center justify-center shadow-2xs border border-border/60 transition-colors cursor-pointer"
                        >
                          <Plus size={11} strokeWidth={2.5} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.productId)}
                        className="w-7 h-7 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 flex items-center justify-center transition-colors cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Pricing Summary & Checkout Button */}
          <div className="p-4 bg-card border-t border-border/80 shadow-lg shrink-0 space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground font-semibold">
                <span>Subtotal (Excl. Tax)</span>
                <span className="text-foreground font-bold">{formatCurrency(getSubtotal())}</span>
              </div>
              <div className="flex justify-between text-muted-foreground font-semibold">
                <span>VAT / Tax</span>
                <span className="text-foreground font-bold">{formatCurrency(getTaxTotal())}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground font-semibold">
                <span className="flex items-center gap-1.5">
                  <span>Discount</span>
                  <button
                    type="button"
                    onClick={() => setIsDiscountModalOpen(true)}
                    className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase hover:bg-blue-500/20 transition-colors cursor-pointer"
                  >
                    Add Code
                  </button>
                </span>
                <span>
                  {appliedDiscountCode ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setAppliedDiscountCode(null); }}
                        className="text-rose-500 hover:text-rose-700 p-0.5 rounded cursor-pointer"
                        title="Remove code"
                      >
                        <Trash2 size={11} />
                      </button>
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded uppercase">
                        {appliedDiscountCode}
                      </span>
                      <span className="text-emerald-600 font-bold">
                        -{formatCurrency(getOverallDiscountAmount())}
                      </span>
                    </div>
                  ) : (
                    <span className="text-foreground font-bold">{formatCurrency(0)}</span>
                  )}
                </span>
              </div>

              <div className="h-px bg-border/80 my-2"></div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                  Total Payable
                </span>
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                  {formatCurrency(getTotal())}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={triggerCheckoutFlow}
                disabled={cart.length === 0 || !activeSession || (activeSession.branchId?._id !== selectedBranch && activeSession.branchId !== selectedBranch) || !hasPermission('CREATE_POS_ORDERS')}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-50 disabled:shadow-none cursor-pointer"
              >
                <CreditCard size={15} />
                <span>Checkout & Pay</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={holdOrder}
                  disabled={cart.length === 0}
                  className="h-8.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 border border-border/60 cursor-pointer"
                >
                  <PauseCircle size={13} className="text-amber-500" />
                  <span>Hold Order</span>
                </button>
                <button
                  type="button"
                  onClick={showLastSlip}
                  className="h-8.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors border border-border/60 cursor-pointer"
                >
                  <Receipt size={13} className="text-blue-500" />
                  <span>Last Slip</span>
                </button>
              </div>
            </div>
          </div>
        </aside>

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
        <p className="text-slate-600 dark:text-slate-300 text-sm">{appAlert.message}</p>
      </Modal>
    </>
  );
};

export default POS;

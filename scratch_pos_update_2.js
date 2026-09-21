const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'sales', 'POS.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Import PaymentModal
content = content.replace(
  /import NewCustomerModal from '\.\.\/\.\.\/components\/sales\/NewCustomerModal';/,
  "import NewCustomerModal from '../../components/sales/NewCustomerModal';\nimport PaymentModal from '../../components/sales/PaymentModal';"
);

// 2. Add state for PaymentModal and Last Slip
content = content.replace(
  /const \[isNewCustomerModalOpen, setIsNewCustomerModalOpen\] = useState\(false\);/,
  "const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);\n  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);\n  const [lastOrder, setLastOrder] = useState(null);"
);

// 3. Update triggerCheckoutFlow to open the modal instead of instantly submitting
content = content.replace(
  /const triggerCheckoutFlow = async \(\) => \{[\s\S]*?setReceiptOrder\(res\.data\);[\s\S]*?\} catch \(error\) \{[\s\S]*?\}\n  \};/,
  `const triggerCheckoutFlow = () => {
    if (cart.length === 0 || !activeSession) return;
    setIsPaymentModalOpen(true);
  };

  const processPaymentAndSubmit = async (paymentDetails) => {
    try {
      const orderData = {
        sessionId: activeSession._id,
        customerId: selectedCustomer || null,
        branchId: selectedBranch,
        items: cart.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.overriddenPrice !== undefined ? i.overriddenPrice : i.unitPrice
        })),
        subtotal: getSubtotal(),
        taxAmount: getSubtotal() * 0.05,
        discountAmount: discount,
        totalAmount: getTotal() + (getSubtotal() * 0.05),
        paymentMethod: paymentDetails.method === 'card' ? 'CARD' : 'CASH',
        amountTendered: paymentDetails.tendered || getTotal() + (getSubtotal() * 0.05),
        changeAmount: paymentDetails.change || 0
      };

      const res = await axios.post('http://localhost:5000/api/v1/pos/orders', orderData, {
        headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` }
      });
      
      setLastOrder(res.data);
      setIsPaymentModalOpen(false);
      setCart([]);
      setDiscount(0);
      setReceiptOrder(res.data);
    } catch (error) {
      console.error('Checkout failed', error);
      alert('Checkout failed');
    }
  };
  
  const showLastSlip = () => {
    if (lastOrder) {
      setReceiptOrder(lastOrder);
    } else {
      alert('No previous orders in this session.');
    }
  };`
);

// 4. Update the styling of the buttons
content = content.replace(
  /<button onClick=\{triggerCheckoutFlow\} disabled=\{cart\.length === 0 \|\| !activeSession \|\| !hasPermission\('CREATE_POS_ORDERS'\)\} className="w-full h-14 rounded-xl bg-\[#1e3a8a\] hover:bg-blue-900 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-blue-900\/20 active:scale-\[0\.99\] transition-all disabled:opacity-50">/,
  `<button onClick={triggerCheckoutFlow} disabled={cart.length === 0 || !activeSession || !hasPermission('CREATE_POS_ORDERS')} className="w-full h-12 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-base flex items-center justify-center shadow-md active:scale-[0.99] transition-all disabled:opacity-50">`
);

content = content.replace(
  /<div className="grid grid-cols-3 gap-2">\s*<button onClick=\{\(\) => \{ \/\* Quick Pay Cash \*\/ \}\} disabled=\{cart\.length === 0\} className="py-2\.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold text-sm text-slate-700 flex flex-col items-center gap-1 disabled:opacity-50">/g,
  `<div className="grid grid-cols-3 gap-2">
                  <button onClick={() => { if(cart.length>0) setIsPaymentModalOpen(true); }} disabled={cart.length === 0} className="py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-700 flex flex-col items-center gap-1 disabled:opacity-50">`
);

content = content.replace(
  /<button onClick=\{\(\) => \{ \/\* Quick Pay Card \*\/ \}\} disabled=\{cart\.length === 0\} className="py-2\.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold text-sm text-slate-700 flex flex-col items-center gap-1 disabled:opacity-50">/g,
  `<button onClick={() => { if(cart.length>0) setIsPaymentModalOpen(true); }} disabled={cart.length === 0} className="py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-700 flex flex-col items-center gap-1 disabled:opacity-50">`
);

content = content.replace(
  /<button onClick=\{\(\) => \{ \/\* Split Tender \*\/ \}\} disabled=\{cart\.length === 0\} className="py-2\.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold text-sm text-slate-700 flex flex-col items-center gap-1 disabled:opacity-50">/g,
  `<button onClick={() => { if(cart.length>0) setIsPaymentModalOpen(true); }} disabled={cart.length === 0} className="py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-700 flex flex-col items-center gap-1 disabled:opacity-50">`
);

// 5. Update Last Slip button
content = content.replace(
  /<button className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 transition-colors">\s*<Receipt size=\{16\} className="text-slate-500" \/> Last Slip\s*<\/button>/,
  `<button onClick={showLastSlip} className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                    <Receipt size={16} className="text-slate-500" /> Last Slip
                  </button>`
);

// 6. Render PaymentModal
content = content.replace(
  /const renderSessionModal = \(\) => \(/,
  `const renderPaymentModal = () => (
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        total={getTotal() + (getSubtotal() * 0.05)}
        orderNumber="#ORD-9043"
        onComplete={processPaymentAndSubmit}
      />
    );

    const renderSessionModal = () => (`
);

content = content.replace(
  /\{renderNewCustomerModal\(\)\}/,
  "{renderNewCustomerModal()}\n      {renderPaymentModal()}"
);


fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated POS.jsx for PaymentModal, Last Slip, and smaller buttons!');

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'sales', 'POS.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add new imports
content = content.replace(
  /import NewSessionModal from '\.\.\/\.\.\/components\/sales\/NewSessionModal';/,
  "import NewSessionModal from '../../components/sales/NewSessionModal';\nimport DiscountModal from '../../components/sales/DiscountModal';\nimport NewCustomerModal from '../../components/sales/NewCustomerModal';"
);

// 2. Add new state variables
content = content.replace(
  /const \[customers, setCustomers\] = useState\(\[\]\);/,
  "const [customers, setCustomers] = useState([]);\n  const [categories, setCategories] = useState([]);\n  const [selectedCategory, setSelectedCategory] = useState('All');\n  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);\n  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);"
);

// 3. Add fetchCategories inside useEffect
content = content.replace(
  /fetchCustomers\(\);/,
  "fetchCustomers();\n    fetchCategories();"
);

// 4. Add fetchCategories function
content = content.replace(
  /const fetchCustomers = async \(\) => \{/,
  `const fetchCategories = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/inventory/categories', {
        headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` }
      });
      setCategories(res.data);
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  const fetchCustomers`
);

// 5. Update filtering logic for products
content = content.replace(
  /const filteredProducts = products\.filter\(p => p\.name\.toLowerCase\(\)\.includes\(search\.toLowerCase\(\)\) \|\| p\.sku\.toLowerCase\(\)\.includes\(search\.toLowerCase\(\)\)\);/,
  `const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || (p.category && p.category._id === selectedCategory) || p.categoryId === selectedCategory || (p.category && p.category.name === selectedCategory);
    return matchesSearch && matchesCategory;
  });`
);

// 6. Update responsive layout wrapper
content = content.replace(
  /<main className="flex-1 flex overflow-hidden">/,
  '<main className="flex-1 flex flex-col lg:flex-row overflow-hidden">'
);

// 7. Update Cart aside width for responsiveness
content = content.replace(
  /<aside className="w-\[410px\] flex-shrink-0 bg-white flex flex-col justify-between border-l border-outline-variant\/50 shadow-lg z-10">/,
  '<aside className="w-full lg:w-[410px] flex-shrink-0 bg-white flex flex-col justify-between lg:border-l border-t lg:border-t-0 border-slate-200 shadow-lg z-10 h-1/2 lg:h-auto">'
);

// 8. Make categories dynamic
content = content.replace(
  /<div className="flex-1 flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">\s*<button[\s\S]*?<\/div>/,
  `<div className="flex-1 flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                <button 
                  onClick={() => setSelectedCategory('All')} 
                  className={\`px-4 py-1.5 rounded-full font-bold text-xs whitespace-nowrap transition-colors \${selectedCategory === 'All' ? 'bg-[#1e3a8a] text-white' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}\`}
                >
                  All Items
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat._id}
                    onClick={() => setSelectedCategory(cat._id)} 
                    className={\`px-4 py-1.5 rounded-full font-bold text-xs whitespace-nowrap transition-colors \${selectedCategory === cat._id ? 'bg-[#1e3a8a] text-white' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}\`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>`
);

// 9. Update Discount click handler
content = content.replace(
  /<span className="flex items-center gap-1">Discount <span className="text-blue-500 text-xs cursor-pointer">\(Add Code\)<\/span><\/span>\s*<div className="relative">\s*<span className="absolute left-2 top-1\/2 -translate-y-1\/2 text-slate-400 font-bold">\$<\/span>\s*<input type="number"[\s\S]*?<\/div>/,
  `<span className="flex items-center gap-1">Discount <span onClick={() => setIsDiscountModalOpen(true)} className="text-blue-500 text-xs cursor-pointer hover:underline">(Add Code)</span></span>
                  <span className="font-bold text-slate-800">
                    {discount > 0 ? \`-\$\${discount.toFixed(2)}\` : '$0.00'}
                  </span>`
);

// 10. Update Add Customer click handler
content = content.replace(
  /<button className="w-9 h-9 shrink-0 rounded border border-slate-200 flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors">/,
  '<button onClick={() => setIsNewCustomerModalOpen(true)} className="w-9 h-9 shrink-0 rounded border border-slate-200 flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors">'
);

// 11. Add Modals to render section
content = content.replace(
  /const renderSessionModal = \(\) => \(/,
  `const renderDiscountModal = () => (
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

    const renderSessionModal = () => (`
);

content = content.replace(
  /\{renderSessionModal\(\)\}/,
  "{renderSessionModal()}\n      {renderDiscountModal()}\n      {renderNewCustomerModal()}"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated POS.jsx for responsive, discount, category, and customer modals!');

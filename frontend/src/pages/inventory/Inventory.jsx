import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ProductTable from '../../components/inventory/ProductTable';
import AddProductModal from '../../components/inventory/AddProductModal';
import { Plus, Package, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = authUser.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [productsRes, categoriesRes] = await Promise.all([
        axios.get('/api/v1/inventory/products?includeInactive=true', { headers }),
        axios.get('/api/v1/inventory/categories', { headers })
      ]);
      
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Compute filtered products
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesStatus = statusFilter === 'ALL' || product.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate dashboard stats
  const totalProducts = products.length;
  const inStock = products.filter(p => p.status === 'In Stock').length;
  const lowStock = products.filter(p => p.status === 'Low Stock').length;
  const outOfStock = products.filter(p => p.status === 'Out of Stock').length;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title="Inventory Management"
        description="Manage your product catalog, categories, and stock levels."
        actions={
          hasPermission('CREATE_INVENTORY') && (
            <Button onClick={() => { setProductToEdit(null); setIsModalOpen(true); }} leftIcon={<Plus className="h-4 w-4" />}>
              Add Product
            </Button>
          )
        }
      />

      {/* Mini Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden p-6 border-0 shadow-md bg-gradient-to-br from-blue-500 to-blue-700 text-white transition-transform hover:-translate-y-1 hover:shadow-lg group">
          <div className="absolute right-0 top-0 -mr-4 -mt-4 opacity-20 transition-transform group-hover:scale-110">
            <Package size={100} />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <p className="text-sm font-medium text-blue-100 uppercase tracking-wider">Total Products</p>
            <div className="p-2 bg-white/20 rounded-lg"><Package size={20} /></div>
          </div>
          <h3 className="relative z-10 text-4xl font-bold mt-4 tracking-tight">{totalProducts}</h3>
        </Card>

        <Card className="relative overflow-hidden p-6 border-0 shadow-md bg-gradient-to-br from-emerald-500 to-emerald-700 text-white transition-transform hover:-translate-y-1 hover:shadow-lg group">
          <div className="absolute right-0 top-0 -mr-4 -mt-4 opacity-20 transition-transform group-hover:scale-110">
            <CheckCircle size={100} />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <p className="text-sm font-medium text-emerald-100 uppercase tracking-wider">In Stock</p>
            <div className="p-2 bg-white/20 rounded-lg"><CheckCircle size={20} /></div>
          </div>
          <h3 className="relative z-10 text-4xl font-bold mt-4 tracking-tight">{inStock}</h3>
        </Card>

        <Card className="relative overflow-hidden p-6 border-0 shadow-md bg-gradient-to-br from-amber-500 to-orange-600 text-white transition-transform hover:-translate-y-1 hover:shadow-lg group">
          <div className="absolute right-0 top-0 -mr-4 -mt-4 opacity-20 transition-transform group-hover:scale-110">
            <AlertTriangle size={100} />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <p className="text-sm font-medium text-amber-100 uppercase tracking-wider">Low Stock</p>
            <div className="p-2 bg-white/20 rounded-lg"><AlertTriangle size={20} /></div>
          </div>
          <h3 className="relative z-10 text-4xl font-bold mt-4 tracking-tight">{lowStock}</h3>
        </Card>

        <Card className="relative overflow-hidden p-6 border-0 shadow-md bg-gradient-to-br from-rose-500 to-red-700 text-white transition-transform hover:-translate-y-1 hover:shadow-lg group">
          <div className="absolute right-0 top-0 -mr-4 -mt-4 opacity-20 transition-transform group-hover:scale-110">
            <XCircle size={100} />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <p className="text-sm font-medium text-rose-100 uppercase tracking-wider">Out of Stock</p>
            <div className="p-2 bg-white/20 rounded-lg"><XCircle size={20} /></div>
          </div>
          <h3 className="relative z-10 text-4xl font-bold mt-4 tracking-tight">{outOfStock}</h3>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="w-full sm:max-w-xs">
            <SearchInput 
              placeholder="Search products by name or SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-auto flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-input text-foreground transition-colors"
            >
              <option value="ALL">All Status</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground font-medium">Loading inventory...</div>
        ) : (
          <ProductTable 
            products={filteredProducts} 
            fetchInventory={fetchInventory} 
            onEdit={(product) => { setProductToEdit(product); setIsModalOpen(true); }} 
          />
        )}
      </Card>

      {isModalOpen && (
        <AddProductModal 
          onClose={() => { setIsModalOpen(false); setProductToEdit(null); }} 
          categories={categories}
          refresh={fetchInventory}
          productToEdit={productToEdit}
        />
      )}
    </div>
  );
};

export default Inventory;

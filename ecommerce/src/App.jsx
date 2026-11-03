import React from 'react';
import './config/api';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/cart/CartDrawer';
import { WishlistDrawer } from './components/cart/WishlistDrawer';

// Pages
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { TrackOrderPage } from './pages/TrackOrderPage';
import { AboutUs } from './pages/AboutUs';
import { ContactUs } from './pages/ContactUs';
import { LoginPage } from './pages/LoginPage';

// Customer Account
import { CustomerDashboard } from './pages/account/CustomerDashboard';
import { MyOrders } from './pages/account/MyOrders';
import { SavedAddresses } from './pages/account/SavedAddresses';
import { CustomerProfile } from './pages/account/CustomerProfile';
import { StoreSettingsProvider } from './context/StoreSettingsContext';

function App() {
  return (
    <Router>
      <CustomerAuthProvider>
        <StoreSettingsProvider>
          <CartProvider>
            <WishlistProvider>
              <div className="flex flex-col min-h-screen bg-white text-slate-900">
                <Navbar />
                <CartDrawer />
                <WishlistDrawer />
                
                <main className="flex-1 bg-[#F8FAFC]">
                  <Routes>
                    {/* Public Storefront Routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/catalog" element={<CatalogPage />} />
                    <Route path="/product/:id" element={<ProductDetailPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/track" element={<TrackOrderPage />} />
                    <Route path="/about-us" element={<AboutUs />} />
                    <Route path="/contact-us" element={<ContactUs />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<LoginPage />} />

                    {/* Customer Account Portal */}
                    <Route path="/account" element={<CustomerDashboard />}>
                      <Route index element={<Navigate to="/account/orders" replace />} />
                      <Route path="orders" element={<MyOrders />} />
                      <Route path="addresses" element={<SavedAddresses />} />
                      <Route path="profile" element={<CustomerProfile />} />
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>

                <Footer />
              </div>
            </WishlistProvider>
          </CartProvider>
        </StoreSettingsProvider>
      </CustomerAuthProvider>
    </Router>
  );
}

export default App;

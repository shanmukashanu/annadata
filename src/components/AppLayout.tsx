import React, { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import CallbackModal from './CallbackModal';
import FloatingCallbackButton from './FloatingCallbackButton';
import CartSidebar from './CartSidebar';
import HomePage from '@/pages/HomePage';
import ProductsPage from '@/pages/ProductsPage';
import AboutPage from '@/pages/AboutPage';
import ServicesPage from '@/pages/ServicesPage';
import ReviewsPage from '@/pages/ReviewsPage';
import InsightsPage from '@/pages/InsightsPage';
import LuckyPage from '@/pages/LuckyPage';
import ContactPage from '@/pages/ContactPage';
import AdminLoginPage from '@/pages/AdminLoginPage';
import AdminPage from '@/pages/AdminPage';
import CheckoutPage from '@/pages/CheckoutPage';
import OrderTrackingPage from '@/pages/OrderTrackingPage';
import NotFound from '@/pages/NotFound';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import DeveloperInfoModal from './DeveloperInfoModal';
import { useEffect } from 'react';

const AppLayout: React.FC = () => {
  const [showCallback, setShowCallback] = useState(false);
  const [showDevInfo, setShowDevInfo] = useState(false);
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isCheckoutRoute = location.pathname === '/checkout';

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = (e.key || '').toLowerCase();
      if (e.ctrlKey && key === 'm') {
        e.preventDefault();
        setShowDevInfo(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <AuthProvider>
      <CartProvider>
        <div className="min-h-screen flex flex-col">
          {!isAdminRoute && !isCheckoutRoute && (
            <Navbar onCallbackClick={() => setShowCallback(true)} />
          )}
          
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/reviews" element={<ReviewsPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/lucky" element={<LuckyPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/track-order" element={<OrderTrackingPage />} />
              <Route path="/admin-login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>

          {!isAdminRoute && !isCheckoutRoute && <Footer onSecretTrigger={() => setShowDevInfo(true)} />}
          
          {!isAdminRoute && !isCheckoutRoute && (
            <FloatingCallbackButton onClick={() => setShowCallback(true)} />
          )}

          <CallbackModal
            isOpen={showCallback}
            onClose={() => setShowCallback(false)}
          />

          <DeveloperInfoModal
            isOpen={showDevInfo}
            onClose={() => setShowDevInfo(false)}
          />

          <CartSidebar />
        </div>
      </CartProvider>
    </AuthProvider>
  );
};

export default AppLayout;

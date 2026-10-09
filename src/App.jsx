import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import PerksBar from './components/PerksBar';
import ProductGrid from './components/ProductGrid';
import MelaninGuideSection from './components/MelaninGuideSection';
import TestimonialsSection from './components/TestimonialsSection';
import Footer from './components/Footer';
import ProductModal from './components/ProductModal';
import SkinQuizModal from './components/SkinQuizModal';
import CartDrawer from './components/CartDrawer';
import CheckoutModal from './components/CheckoutModal';
import AdminDashboard from './components/AdminDashboard';
import AIChatbotEnquiry from './components/AIChatbotEnquiry';
import WhatsAppFloatingButton from './components/WhatsAppFloatingButton';
import { PRODUCTS } from './data/products';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  // Product Catalog State (Persisted in localStorage)
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem('lumiere_products');
      return saved ? JSON.parse(saved) : PRODUCTS;
    } catch {
      return PRODUCTS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('lumiere_products', JSON.stringify(products));
    } catch {
      // LocalStorage fallback
    }
  }, [products]);

  // Route Detection (/admin, /enquiry, #/admin, #/enquiry)
  const [currentRoute, setCurrentRoute] = useState(() => {
    return window.location.hash || window.location.pathname;
  });

  useEffect(() => {
    const handleRouteChange = () => {
      const nextRoute = window.location.hash || window.location.pathname;
      setCurrentRoute(nextRoute);
    };

    handleRouteChange();
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);

  const isAdminView = currentRoute.includes('/admin') || window.location.pathname.includes('/admin');
  const isEnquiryView = currentRoute.includes('/enquiry') || window.location.pathname.includes('/enquiry');

  // Store Configuration
  const [currency, setCurrency] = useState('NGN');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers
  const [activeProduct, setActiveProduct] = useState(null);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState('');

  // Cart State (Initialized from localStorage)
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('lumiere_cart');
      return saved ? JSON.parse(saved) : [
        { ...PRODUCTS[0], quantity: 1 }
      ];
    } catch {
      return [{ ...PRODUCTS[0], quantity: 1 }];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('lumiere_cart', JSON.stringify(cart));
    } catch {
      // LocalStorage fallback
    }
  }, [cart]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  // Vendor Admin Catalog Handlers
  const handleAddProduct = (newProd) => {
    setProducts((prev) => [newProd, ...prev]);
    showToast(`Added ${newProd.name} to vendor catalog`);
  };

  const handleUpdateProduct = (updatedProd) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProd.id ? updatedProd : p))
    );
    showToast(`Updated ${updatedProd.name}`);
  };

  const handleDeleteProduct = (productId) => {
    const prodToDelete = products.find(p => p.id === productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    showToast(`Deleted ${prodToDelete?.name || 'product'} from catalog`);
  };

  const handleResetCatalog = () => {
    if (window.confirm('Reset all catalog items to initial factory defaults?')) {
      setProducts(PRODUCTS);
      localStorage.removeItem('lumiere_products');
      showToast('Product catalog reset to default');
    }
  };

  const handleNavigateToStore = () => {
    window.location.hash = '';
    if (window.location.pathname.includes('/admin') || window.location.pathname.includes('/enquiry')) {
      window.history.pushState({}, '', '/');
    }
    setCurrentRoute('/');
  };

  const handleNavigateToEnquiry = () => {
    const nextPath = '/enquiry';
    window.history.pushState({}, '', nextPath);
    setCurrentRoute(nextPath);
  };

  // Cart Handlers
  const handleAddToCart = (product, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [...prev, { ...product, quantity: qty }];
    });
    showToast(`Added ${product.name} to your bag`);
  };

  const handleAddRoutineToCart = (routineProducts) => {
    setCart((prev) => {
      let newCart = [...prev];
      routineProducts.forEach((prod) => {
        const existing = newCart.find((i) => i.id === prod.id);
        if (existing) {
          existing.quantity += 1;
        } else {
          newCart.push({ ...prod, quantity: 1 });
        }
      });
      return newCart;
    });
    showToast('Complete Routine added to your bag with 10% discount!');
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const handleRemoveItem = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
    showToast('Item removed from bag');
  };

  const handleProceedToCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleOrderSuccess = () => {
    setCart([]);
    showToast('Order confirmed! Tracking details sent.');
  };

  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);

  // If Vendor Admin View
  if (isAdminView) {
    return (
      <div className="min-h-screen bg-cream-100">
        {toastMessage && (
          <div className="fixed top-6 right-4 sm:right-8 z-50 bg-botanic-950 text-cream-50 px-4 py-3 rounded-2xl shadow-2xl border border-gold-400/40 flex items-center gap-2.5 text-xs font-semibold animate-slide-up">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
        <AdminDashboard
          products={products}
          currency={currency}
          onAddProduct={handleAddProduct}
          onUpdateProduct={handleUpdateProduct}
          onDeleteProduct={handleDeleteProduct}
          onResetCatalog={handleResetCatalog}
          onNavigateToStore={handleNavigateToStore}
        />
      </div>
    );
  }

  // If AI Enquiry Chatbot View
  if (isEnquiryView) {
    return (
      <div className="min-h-screen bg-cream-50">
        {toastMessage && (
          <div className="fixed top-20 right-4 sm:right-8 z-50 bg-botanic-950 text-cream-50 px-4 py-3 rounded-2xl shadow-2xl border border-gold-400/40 flex items-center gap-2.5 text-xs font-semibold animate-slide-up">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
        <AIChatbotEnquiry
          products={products}
          currency={currency}
          onAddToCart={handleAddToCart}
          onNavigateToStore={handleNavigateToStore}
        />
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cart={cart}
          currency={currency}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onProceedToCheckout={handleProceedToCheckout}
        />
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          cart={cart}
          currency={currency}
          onOrderSuccess={handleOrderSuccess}
        />
      </div>
    );
  }

  // Customer Store View
  return (
    <div className="min-h-screen flex flex-col bg-cream-50 selection:bg-gold-400 selection:text-botanic-950">
      
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-24 right-4 sm:right-8 z-50 bg-botanic-950 text-cream-50 px-4 py-3 rounded-2xl shadow-2xl border border-gold-400/40 flex items-center gap-2.5 text-xs font-semibold animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Navbar
        cartCount={cartItemsCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenQuiz={handleNavigateToEnquiry}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          const el = document.getElementById('catalog-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Main Page Layout */}
      <main className="flex-1">
        <Hero
          onOpenQuiz={handleNavigateToEnquiry}
          onShopClick={() => {
            const el = document.getElementById('catalog-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          onSelectProduct={(p) => setActiveProduct(p)}
          products={products}
        />

        <PerksBar />

        <ProductGrid
          products={products}
          currency={currency}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onAddToCart={handleAddToCart}
          onQuickView={(p) => setActiveProduct(p)}
        />

        <MelaninGuideSection onOpenQuiz={handleNavigateToEnquiry} />

        <TestimonialsSection />
      </main>

      {/* Footer */}
      <Footer
        onOpenQuiz={handleNavigateToEnquiry}
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          const el = document.getElementById('catalog-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Modals & Overlays */}
      <ProductModal
        product={activeProduct}
        currency={currency}
        onClose={() => setActiveProduct(null)}
        onAddToCart={handleAddToCart}
      />

      <SkinQuizModal
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        products={products}
        currency={currency}
        onAddRoutineToCart={handleAddRoutineToCart}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        currency={currency}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onProceedToCheckout={handleProceedToCheckout}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        currency={currency}
        onOrderSuccess={handleOrderSuccess}
      />

      {/* Direct WhatsApp Consultant Button */}
      <WhatsAppFloatingButton />

    </div>
  );
}

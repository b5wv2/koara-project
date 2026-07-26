import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle2, Package, X, Tag, ArrowLeft, ArrowRight, Loader2, ShoppingBag, ShieldCheck, Landmark, Receipt, Plus, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import DashButton from '../components/ui/DashButton';
import { useAppContext } from '../context/AppContext';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { CartProvider, useCart } from '../context/CartContext';
import CartDrawer from '../components/CartDrawer';
import TopupConfigModal from '../components/modals/TopupConfigModal';
import { getImageUrl } from '../utils/imageUrl';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Scoped styles
const ScopedStyles = ({ custom }) => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');

    .sf-root {
      font-family: ${custom.fontFamily || "'Sora', ui-sans-serif, system-ui, sans-serif"};
    }
    .sf-display {
      font-family: ${custom.fontFamily || "'Sora', ui-sans-serif, system-ui, sans-serif"};
    }
    @keyframes sfRise {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .sf-rise {
      animation: sfRise 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .sf-focusable:focus-visible {
      outline: 2px solid ${custom.primaryColor || '#3B82F6'};
      outline-offset: 2px;
    }
  `}</style>
);

const AmbientBackground = ({ custom }) => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
    <div
      className="absolute top-0 start-1/2 -translate-x-1/2 w-[1000px] h-[500px] rounded-full opacity-20 blur-[140px]"
      style={{ background: `radial-gradient(circle, ${custom.primaryColor || '#2563EB'} 0%, transparent 70%)` }}
    />
  </div>
);

const StorefrontInner = ({ store }) => {
  const { t, language, formatCurrency, formatDate, setLanguage } = useAppContext();
  const { execute: executeSubmitOrder, loading: submittingOrder } = useAsyncAction();
  const { cartItems, addToCart, clearCart, getCartSubtotal, cartCount } = useCart();

  const storeId = store.id;
  const custom = store?.customization || {};

  const [catalog, setCatalog] = useState({ categories: [], products: [], promos: [], platform_products: [] });
  const [topupsCatalogs, setTopupsCatalogs] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState(null);

  // Cart & Checkout UI States
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isCartCheckout, setIsCartCheckout] = useState(false);
  const [topupConfigModal, setTopupConfigModal] = useState({ isOpen: false, product: null, fields: [] });
  const [createdOrders, setCreatedOrders] = useState([]);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoadingCatalog(true);
        const [catalogRes, topupsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/store/${storeId}/catalog`),
          fetch(`${API_BASE_URL}/api/store/topups/catalog/${storeId}`).catch(() => null)
        ]);

        if (catalogRes.ok) {
          const data = await catalogRes.json();
          if (data.success) {
            setCatalog({
              categories: data.categories || [],
              products: data.products || [],
              promos: data.promos || [],
              platform_products: data.platform_products || []
            });
          } else {
            setCatalogError('Failed to load catalog.');
          }
        } else {
          setCatalogError('Failed to load catalog.');
        }

        if (topupsRes && topupsRes.ok) {
          const tData = await topupsRes.json();
          if (tData.success) {
            setTopupsCatalogs(tData.catalogs || []);
          }
        }
      } catch (err) {
        console.error('Error fetching catalog:', err);
        setCatalogError('Connection error while loading catalog.');
      } finally {
        setLoadingCatalog(false);
      }
    };

    fetchCatalog();
  }, [storeId]);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState(0); // 0: closed, 1: form, 2: success
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [topupFormFields, setTopupFormFields] = useState({});

  const merchant = store ? {
    id: store.id,
    name: store.store_name,
    logoUrl: store.logo_url || store.logoUrl || null,
    active: store.status === 'active',
    bankName: store.bank_name,
    bankAccountName: store.account_name,
    bankAccountNumber: store.account_no
  } : null;

  if (!merchant || !merchant.active) {
    return (
      <div className="sf-root min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: custom.bgColor || '#020617', color: custom.textColor || '#FFFFFF', fontFamily: custom.fontFamily || "'Sora', ui-sans-serif, system-ui, sans-serif" }}>
        <ScopedStyles custom={custom} />
        <AmbientBackground custom={custom} />
        <div className="relative z-10 max-w-md w-full p-8 text-center sf-rise" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: custom.borderRadius || '16px' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <X size={28} style={{ color: '#f87171' }} />
          </div>
          <h2 className="sf-display text-xl font-bold mb-2" style={{ color: custom.textColor || '#FFFFFF' }}>
            {t('store_unavailable')}
          </h2>
          <p className="text-slate-400 text-sm">
            {t('this_store_is_currently_not_ta')}
          </p>
        </div>
      </div>
    );
  }

  if (loadingCatalog) {
    return (
      <div className="sf-root min-h-screen flex flex-col" style={{ background: custom.bgColor || '#020617', color: custom.textColor || '#FFFFFF' }}>
        <ScopedStyles custom={custom} />
        <AmbientBackground custom={custom} />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-8 py-12 flex flex-col items-center justify-center">
          <div className="w-full space-y-8">
            <div className="h-44 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} />
              ))}
            </div>
          </div>
        </main>
        <div className="relative z-10 flex items-center justify-center gap-2 pb-8 text-xs font-medium" style={{ color: '#475569' }}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: custom.primaryColor || '#3B82F6' }} />
          {t('loading_catalog')}
        </div>
      </div>
    );
  }

  if (catalogError) {
    return (
      <div className="sf-root min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: custom.bgColor || '#020617', color: custom.textColor || '#FFFFFF' }}>
        <ScopedStyles custom={custom} />
        <AmbientBackground custom={custom} />
        <div className="relative z-10 sf-rise">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <X size={24} style={{ color: '#f87171' }} />
          </div>
          <p className="text-slate-400 font-medium text-sm max-w-xs">{catalogError}</p>
        </div>
      </div>
    );
  }

  const storeProducts = catalog.products;
  const platformProducts = catalog.platform_products || [];

  const activeCategoryProducts = selectedCategoryId
    ? (topupsCatalogs.some(c => c.category.id === selectedCategoryId)
        ? topupsCatalogs.find(c => c.category.id === selectedCategoryId).offers.map(o => ({ ...o, id: o.offer_id, category: selectedCategoryId, isTopup: true }))
        : typeof selectedCategoryId === 'string'
          ? platformProducts.filter(p => p.category === selectedCategoryId)
          : storeProducts.filter(p => p.category_id === selectedCategoryId || p.categoryId === selectedCategoryId))
    : [];

  // Direct 1-Click Buy Now
  const handleBuyNow = (product) => {
    setIsCartCheckout(false);
    setSelectedProduct(product);
    setCheckoutStep(1);
    setPromoCode('');
    setAppliedPromo(null);
    setPromoError('');
    setCustomerName('');
    setCustomerEmail('');
    setWhatsapp('');
    setReceiptFile(null);
    setSubmitError('');
    setTopupFormFields({});
    setCreatedOrders([]);
  };

  // Add to Cart handler
  const handleAddToCart = (product) => {
    const isTopup = !!product.isTopup || !!product.offer_id || !!product.offerId;
    if (isTopup) {
      // Find dynamic fields config from topup catalog
      const catalogObj = topupsCatalogs.find(c => c.category.id === product.category || c.offers.some(o => o.offer_id === product.id));
      const fields = catalogObj?.fields || [];
      setTopupConfigModal({ isOpen: true, product, fields });
    } else {
      addToCart(product, 1);
      setIsCartDrawerOpen(true);
    }
  };

  // Confirm Top-Up addition from modal
  const handleConfirmTopupAddToCart = (product, quantity, fieldsData) => {
    addToCart(product, quantity, fieldsData);
    setIsCartDrawerOpen(true);
  };

  // Open Cart Checkout
  const handleProceedToCartCheckout = () => {
    setIsCartCheckout(true);
    setCheckoutStep(1);
    setCustomerName('');
    setCustomerEmail('');
    setWhatsapp('');
    setReceiptFile(null);
    setSubmitError('');
    setCreatedOrders([]);
  };

  const calculateTotal = () => {
    if (isCartCheckout) {
      const sub = getCartSubtotal();
      let disc = 0;
      if (appliedPromo) {
        if (appliedPromo.discount_type === 'percentage') {
          disc = sub * (parseFloat(appliedPromo.value) / 100);
        } else if (appliedPromo.discount_type === 'fixed') {
          disc = parseFloat(appliedPromo.value);
        }
        if (disc > sub) disc = sub;
      }
      return Math.max(0, sub - disc).toFixed(2);
    }

    if (!selectedProduct) return '0.00';
    let basePrice = selectedProduct.selling_price
      ? parseFloat(selectedProduct.selling_price)
      : (selectedProduct.salePrice !== null && selectedProduct.salePrice !== undefined ? selectedProduct.salePrice : selectedProduct.price);

    if (appliedPromo) {
      if (appliedPromo.discount_type === 'percentage') {
        basePrice = basePrice * (1 - parseFloat(appliedPromo.value) / 100);
      } else if (appliedPromo.discount_type === 'fixed') {
        basePrice = Math.max(0, basePrice - parseFloat(appliedPromo.value));
      }
    }
    return basePrice.toFixed(2);
  };

  const handleApplyPromo = () => {
    setPromoError('');
    if (!promoCode.trim()) return;
    const foundPromo = catalog.promos.find(p => p.code.toUpperCase() === promoCode.toUpperCase());

    if (foundPromo) {
      setAppliedPromo(foundPromo);
    } else {
      setAppliedPromo(null);
      setPromoError('Invalid or inactive promo code.');
    }
  };

  // Submit Order (Single Product or Cart Multi-Order)
  const handleSubmitOrder = (e) => executeSubmitOrder(async () => {
    if (e && e.preventDefault) e.preventDefault();
    setSubmitError('');

    if (!receiptFile) {
      setSubmitError(t('upload_receipt_required') || 'Please upload a payment receipt.');
      return { success: false };
    }

    // MULTI-ITEM CART CHECKOUT
    if (isCartCheckout) {
      const formData = new FormData();
      formData.append('customerName', customerName);
      formData.append('customerEmail', customerEmail);
      formData.append('whatsapp', whatsapp);
      formData.append('cartItems', JSON.stringify(cartItems));
      formData.append('receipt', receiptFile);
      if (appliedPromo) formData.append('promoCode', appliedPromo.code);

      const response = await fetch(`${API_BASE_URL}/api/store/${storeId}/cart/checkout`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setCreatedOrders(data.orders || []);
        clearCart();
        setCheckoutStep(2);
        return { success: true };
      } else {
        setSubmitError(data.error || 'Failed to submit cart order.');
        return { success: false };
      }
    }

    // SINGLE PRODUCT FAST CHECKOUT
    if (selectedProduct.isTopup) {
      const formData = new FormData();
      formData.append('offerId', selectedProduct.id);
      formData.append('customerName', customerName);
      formData.append('customerEmail', customerEmail);
      formData.append('whatsapp', whatsapp);
      formData.append('fields', JSON.stringify(topupFormFields));
      formData.append('receipt', receiptFile);
      if (appliedPromo) formData.append('promoCode', appliedPromo.code);

      const response = await fetch(`${API_BASE_URL}/api/store/topups/order/${storeId}`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setCurrentOrderId(data.order.orderId);
        setCheckoutStep(2);
        return { success: true };
      } else {
        setSubmitError(data.error || 'Failed to submit top-up order.');
        return { success: false };
      }
    }

    const formData = new FormData();
    formData.append('customerName', customerName);
    formData.append('customerEmail', customerEmail);
    formData.append('whatsapp', whatsapp);
    formData.append('platformProductId', selectedProduct.id);
    formData.append('receipt', receiptFile);
    if (appliedPromo) formData.append('promoCode', appliedPromo.code);

    const response = await fetch(`${API_BASE_URL}/api/store/${storeId}/orders`, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();

    if (response.ok && data.success) {
      setCurrentOrderId(data.order.order_number);
      setCheckoutStep(2);
      return { success: true };
    } else {
      setSubmitError(data.error || 'Failed to submit order.');
      return { success: false };
    }
  });

  const closeCheckout = () => {
    setSelectedProduct(null);
    setIsCartCheckout(false);
    setCheckoutStep(0);
    setCreatedOrders([]);
  };

  // Category card component
  const CategoryCard = ({ onClick, color, logoSrc, iconText, name, productCount }) => (
    <div
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      role="button"
      tabIndex={0}
      className="sf-focusable group overflow-hidden cursor-pointer flex flex-col transition-all duration-300 relative"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: custom.borderRadius || '16px' }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.background = `rgba(255,255,255,0.05)`;
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = `0 20px 40px -14px ${color}40, 0 8px 20px -10px rgba(0,0,0,0.5)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <div className="h-1 w-full relative z-20" style={{ background: color }} />
      <div className="w-full relative overflow-hidden" style={{ height: '180px', borderRadius: 'inherit', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 30%, ${color}14 0%, transparent 65%)` }} aria-hidden="true" />
        {logoSrc ? (
          <img src={logoSrc} alt={name} className="w-full h-full object-cover object-center block transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/5">
            <div className="relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center font-extrabold text-xl transition-transform duration-300 group-hover:scale-105" style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
              {iconText || name.charAt(0)}
            </div>
          </div>
        )}
      </div>

      <div className="p-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="sf-display font-bold text-white text-sm truncate" style={{ color: custom.textColor || '#FFFFFF' }}>{name}</h3>
          <div className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: `${color}14`, color }}>
            {productCount} {productCount === 1 ? (t('item')) : (t('items'))}
          </div>
        </div>
        <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" style={{ background: 'rgba(255,255,255,0.05)', color: '#64748B' }}>
          {language === 'ar' ? <ArrowLeft size={13} /> : <ArrowRight size={13} />}
        </div>
      </div>
    </div>
  );

  // Product Card with Dual Buttons ("Add to Cart" and "Buy Now")
  const ProductCard = ({ product, onBuyNow, onAddToCart }) => {
    const hasDiscount = product.sale_price !== null && !product.selling_price;
    const isTopup = !!product.isTopup || !!product.offer_id || !!product.offerId;

    return (
      <div
        className="sf-focusable group overflow-hidden flex flex-col transition-all duration-300 relative"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: custom.borderRadius || '16px' }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = custom.primaryColor || 'rgba(59,130,246,0.35)';
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = `0 20px 40px -12px ${custom.primaryColor || 'rgba(37,99,235,0.25)'}, 0 8px 20px -10px rgba(0,0,0,0.5)`;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = '';
        }}
      >
        {/* Image area */}
        <div className="aspect-video flex items-center justify-center p-6 relative overflow-hidden" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: `radial-gradient(circle at 50% 20%, ${custom.primaryColor || 'rgba(59,130,246,0.1)'}18 0%, transparent 70%)` }}
            aria-hidden="true"
          />
          {product.image_url || product.image ? (
            <img src={getImageUrl(product.image_url || product.image)} alt={product.name} className="relative max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <Package size={36} className="relative" style={{ color: '#2D3748', opacity: 0.6 }} />
          )}
          {hasDiscount && (
            <div
              className="absolute top-0 end-0 rtl:end-auto rtl:start-0 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
              style={{ background: custom.primaryColor || '#ef4444', borderBottomLeftRadius: '0.75rem', borderBottomRightRadius: language === 'ar' ? '0.75rem' : 0 }}
            >
              {t('sale')}
            </div>
          )}
        </div>

        {/* Info & Dual Buttons */}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2 mb-3 group-hover:text-blue-300 transition-colors" style={{ color: custom.textColor || '#FFFFFF' }}>
            {product.name}
          </h3>
          
          <div className="mt-auto flex items-center justify-between gap-2 mb-3">
            {product.selling_price ? (
              <span className="sf-display font-black text-lg" style={{ color: custom.primaryColor || '#FFFFFF' }}>${parseFloat(product.selling_price).toFixed(2)}</span>
            ) : product.sale_price !== null && product.sale_price !== undefined ? (
              <div className="flex flex-col">
                <span className="text-xs line-through mb-0.5" style={{ color: '#475569' }}>${parseFloat(product.price).toFixed(2)}</span>
                <span className="sf-display font-black text-lg" style={{ color: custom.primaryColor || '#FFFFFF' }}>${parseFloat(product.sale_price).toFixed(2)}</span>
              </div>
            ) : (
              <span className="sf-display font-black text-lg" style={{ color: custom.primaryColor || '#FFFFFF' }}>${parseFloat(product.price).toFixed(2)}</span>
            )}
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5 uppercase">
              {isTopup ? (t('top_up')) : (t('gift_card'))}
            </span>
          </div>

          {/* Dual Actions: Add to Cart vs Buy Now */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
              className="py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10"
            >
              <ShoppingBag size={13} className="text-blue-400" />
              {t('add')}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onBuyNow(product); }}
              className="py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
            >
              {t('buy_now')}
              {language === 'ar' ? <ArrowLeft size={12} /> : <ArrowRight size={12} />}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="sf-root min-h-screen flex flex-col" style={{ background: custom.bgColor || '#020617', color: custom.textColor || '#FFFFFF', fontFamily: custom.fontFamily || "'Sora', ui-sans-serif, system-ui, sans-serif" }}>
      <ScopedStyles custom={custom} />
      <AmbientBackground custom={custom} />

      {/* ── Store Header ── */}
      <header
        className="sticky top-0 z-40 py-3.5 px-4 sm:px-8 flex justify-between items-center shrink-0"
        style={{
          background: `${custom.bgColor || '#020617'}D9`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {merchant.logoUrl ? (
            <img
              src={getImageUrl(merchant.logoUrl)}
              alt={merchant.name}
              className="w-10 h-10 object-cover shrink-0"
              style={{ border: '1px solid rgba(255,255,255,0.12)', boxShadow: `0 0 0 3px ${custom.primaryColor || '#2563EB'}15`, borderRadius: custom.borderRadius || '12px' }}
            />
          ) : (
            <div
              className="w-10 h-10 flex items-center justify-center text-white font-bold text-base shrink-0"
              style={{ background: `linear-gradient(135deg, ${custom.primaryColor || '#2563EB'}, #4F46E5)`, boxShadow: `0 0 0 3px ${custom.primaryColor || '#2563EB'}15`, borderRadius: custom.borderRadius || '12px' }}
            >
              {merchant.name ? merchant.name.charAt(0) : 'S'}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="sf-display font-bold text-base tracking-tight truncate" style={{ color: custom.textColor || '#FFFFFF' }}>{merchant.name}</h1>
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium" style={{ color: '#4ade80' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              {t('store_open')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Cart Icon Button with Badge */}
          <button
            onClick={() => setIsCartDrawerOpen(true)}
            className="sf-focusable relative flex items-center justify-center p-2.5 rounded-xl transition-all hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#FFFFFF' }}
            title="Shopping Cart"
          >
            <ShoppingBag size={18} className="text-blue-400" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#020617] animate-pulse">
                {cartCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setLanguage(t('ar'))}
            className="sf-focusable text-xs font-bold tracking-wide transition-colors px-3 py-2"
            style={{ color: custom.textColor || '#94A3B8', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: custom.borderRadius || '8px' }}
          >
            {t('ar_1')}
          </button>
        </div>
      </header>

      {/* ── Catalog ── */}
      <main className="flex-1 relative z-10 max-w-5xl mx-auto w-full px-4 sm:px-8 py-10 sm:py-14">
        {selectedCategoryId === null ? (
          /* Category / Catalog Selection Grid */
          <div className="space-y-12">
            {custom.showHero !== false && (
              <div
                className="sf-rise p-8 sm:p-12 relative overflow-hidden flex flex-col items-center text-center shadow-xl"
                style={{
                  backgroundColor: custom.secondaryColor || '#1E293B',
                  color: custom.textColor || '#FFFFFF',
                  borderRadius: custom.borderRadius || '16px',
                  border: `1px solid ${custom.primaryColor || '#3B82F6'}30`
                }}
              >
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.2) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                <h1 className="sf-display text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 relative z-10" style={{ color: custom.textColor || '#FFFFFF' }}>
                  {language === 'en' ? `Welcome to ${merchant.name}` : `مرحباً بك في ${merchant.name}`}
                </h1>
                <p className="text-sm sm:text-base opacity-80 max-w-xl mx-auto mb-6 relative z-10">
                  {t('discover_top_tier_digital_prod')}
                </p>
              </div>
            )}

            {/* Categories & Topup Catalogs Grid */}
            <div className="space-y-8">
              <h2 className="sf-display text-xl font-bold tracking-tight" style={{ color: custom.textColor || '#FFFFFF' }}>
                {t('browse_categories')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {catalog.categories.map((cat) => {
                  const count = storeProducts.filter(p => p.category_id === cat.id || p.categoryId === cat.id).length;
                  return (
                    <CategoryCard
                      key={cat.id}
                      name={cat.name}
                      color={cat.color || custom.primaryColor || '#3B82F6'}
                      logoSrc={getImageUrl(cat.logo_url || cat.logoUrl)}
                      iconText={cat.icon_text || cat.iconText}
                      productCount={count}
                      onClick={() => setSelectedCategoryId(cat.id)}
                    />
                  );
                })}

                {/* Direct Topup Catalogs */}
                {topupsCatalogs.map((topupCat) => {
                  const count = topupCat.offers ? topupCat.offers.length : 0;
                  return (
                    <CategoryCard
                      key={`topup-${topupCat.category.id}`}
                      name={topupCat.category.name}
                      color="#7C3AED"
                      logoSrc={getImageUrl(topupCat.category.image_url)}
                      iconText={topupCat.category.name.charAt(0)}
                      productCount={count}
                      onClick={() => setSelectedCategoryId(topupCat.category.id)}
                    />
                  );
                })}

                {/* Platform Products Categories (Gift Cards, Subscriptions, etc.) */}
                {(() => {
                  const platformCategoriesMap = {};
                  platformProducts.forEach(p => {
                    const catName = p.category || 'Gift Cards';
                    if (!platformCategoriesMap[catName]) {
                      platformCategoriesMap[catName] = [];
                    }
                    platformCategoriesMap[catName].push(p);
                  });

                  return Object.keys(platformCategoriesMap).map((catName) => {
                    const items = platformCategoriesMap[catName];
                    return (
                      <CategoryCard
                        key={`platform-${catName}`}
                        name={catName}
                        color="#2563EB"
                        logoSrc={null}
                        iconText={catName.charAt(0)}
                        productCount={items.length}
                        onClick={() => setSelectedCategoryId(catName)}
                      />
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        ) : (
          /* Products Sub-Grid View */
          <div className="space-y-8">
            <div className="sf-rise flex items-center gap-4">
              <button
                onClick={() => setSelectedCategoryId(null)}
                className="sf-focusable w-9 h-9 flex items-center justify-center transition-colors shrink-0"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8', borderRadius: custom.borderRadius || '12px' }}
                aria-label={t('back_to_catalog')}
              >
                {language === 'ar' ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-0.5" style={{ color: '#475569' }}>
                  <span>{t('catalog')}</span>
                  <ChevronDivider language={language} />
                  <span style={{ color: custom.primaryColor || '#60A5FA' }} className="truncate">
                    {typeof selectedCategoryId === 'string'
                      ? selectedCategoryId
                      : catalog.categories.find(c => c.id === selectedCategoryId)?.name}
                  </span>
                </div>
                <h2 className="sf-display text-xl sm:text-2xl font-bold tracking-tight truncate" style={{ color: custom.textColor || '#FFFFFF' }}>
                  {typeof selectedCategoryId === 'string'
                    ? selectedCategoryId
                    : catalog.categories.find(c => c.id === selectedCategoryId)?.name}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {activeCategoryProducts.length === 0 ? (
                <div className="col-span-full koara-empty-state">
                  <Package size={40} />
                  <p className="text-sm font-medium">
                    {t('no_active_products_in_this_cat')}
                  </p>
                </div>
              ) : activeCategoryProducts.map((product, idx) => (
                <div key={product.id} className="sf-rise" style={{ animationDelay: `${Math.min(idx, 8) * 45}ms` }}>
                  <ProductCard
                    product={product}
                    onBuyNow={handleBuyNow}
                    onAddToCart={handleAddToCart}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-4 sm:px-8 border-t border-white/5 mt-auto text-center">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {merchant.name}. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <span className="font-semibold text-slate-400">Koara</span>
          </div>
        </div>
      </footer>

      {/* ── Slide-Over Cart Drawer ── */}
      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        onProceedToCheckout={handleProceedToCartCheckout}
        catalogPromos={catalog.promos}
        appliedPromo={appliedPromo}
        setAppliedPromo={setAppliedPromo}
        language={language}
      />

      {/* ── Top-Up Config Modal ── */}
      <TopupConfigModal
        isOpen={topupConfigModal.isOpen}
        onClose={() => setTopupConfigModal({ isOpen: false, product: null, fields: [] })}
        product={topupConfigModal.product}
        fields={topupConfigModal.fields}
        onConfirmAddToCart={handleConfirmTopupAddToCart}
        language={language}
      />

      {/* ── Checkout Modal (Single Product or Multi-Item Cart) ── */}
      <Modal
        isOpen={checkoutStep > 0 && checkoutStep < 3}
        onClose={closeCheckout}
        title={checkoutStep === 1 
          ? (isCartCheckout ? (t('cart_checkout')) : (t('checkout')))
          : (t('order_status'))}
      >
        {checkoutStep === 1 && (() => {
          return (
            <form onSubmit={handleSubmitOrder} className="space-y-5">
              <div className="flex items-center gap-2 -mt-1 mb-1">
                <StepDot active label={t('details')} />
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <StepDot label={t('confirmed')} />
              </div>

              {/* Multi-Item Cart Summary */}
              {isCartCheckout ? (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    {t('cart_order_summary')} ({cartItems.length})
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2 pe-1 scrollbar-none">
                    {cartItems.map((item) => (
                      <div key={item.cartItemId} className="flex justify-between items-center p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                        <div className="truncate pe-2">
                          <span className="font-semibold text-white block truncate">{item.name}</span>
                          {item.isTopup && item.dynamicFields && Object.values(item.dynamicFields).length > 0 && (
                            <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
                              ID: {Object.values(item.dynamicFields)[0]}
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-blue-400 font-bold shrink-0" dir="ltr">
                          {item.quantity}x ${item.selling_price.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Single Product summary card */
                selectedProduct && (
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden shrink-0" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {selectedProduct.image_url ? (
                        <img src={getImageUrl(selectedProduct.image_url)} alt={selectedProduct.name} className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="font-extrabold text-xs text-blue-400">{selectedProduct.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-white leading-tight truncate">{selectedProduct.name}</h4>
                      <span className="text-xs font-mono text-blue-400" dir="ltr">${calculateTotal()}</span>
                    </div>
                  </div>
                )
              )}

              {/* Price breakdown */}
              <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white text-sm">{t('total')}:</span>
                  <span className="sf-display text-xl font-black" style={{ color: '#3B82F6' }} dir="ltr">${calculateTotal()}</span>
                </div>
              </div>

              {/* Customer Info */}
              <div className="space-y-3">
                <div>
                  <label className="koara-label">{t('name')}</label>
                  <input required type="text" placeholder="Alex Johnson" className="koara-input" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="koara-label">{t('email')}</label>
                    <input required type="email" placeholder="alex@email.com" className="koara-input" dir="ltr" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <label className="koara-label">{t('whatsapp_number')}</label>
                    <input required type="text" placeholder="+1 234 567 8900" className="koara-input" dir="ltr" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Dynamic Top-up Fields for Single Product */}
              {!isCartCheckout && selectedProduct && selectedProduct.isTopup && (() => {
                 const currentCatalog = topupsCatalogs.find(c => c.category.id === selectedProduct.category);
                 return currentCatalog && currentCatalog.fields && currentCatalog.fields.length > 0 && (
                    <div className="space-y-3 mt-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94A3B8' }}>
                        {t('top_up_details')}
                      </h4>
                      {currentCatalog.fields.map(field => (
                        <div key={field.key}>
                          <label className="koara-label">{field.label}</label>
                          <input
                            required
                            type={field.type === 'text' ? 'text' : field.type}
                            placeholder={field.label}
                            className="koara-input"
                            value={topupFormFields[field.key] || ''}
                            onChange={e => setTopupFormFields(prev => ({...prev, [field.key]: e.target.value}))}
                          />
                        </div>
                      ))}
                    </div>
                  );
               })()}

              {/* Payment Details */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: '#94A3B8' }}>
                  <Landmark size={12} />
                  {t('payment_details')}
                </h4>
                <div className="rounded-xl p-4 text-sm space-y-2.5 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex justify-between gap-3">
                    <span style={{ color: '#64748B' }}>{t('bank')}</span>
                    <span className="font-medium text-white text-end">{merchant.bankName || 'Chase Bank'}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span style={{ color: '#64748B' }}>{t('account_name')}</span>
                    <span className="font-medium text-white text-end">{merchant.bankAccountName || 'Alfa Store LLC'}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span style={{ color: '#64748B' }}>{t('account_no')}</span>
                    <span className="font-medium font-mono text-white" dir="ltr">{merchant.bankAccountNumber || '1234567890'}</span>
                  </div>
                </div>

                {/* Upload Zone */}
                <label className="koara-upload-zone block relative cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={e => setReceiptFile(e.target.files[0])}
                  />
                  {receiptFile ? (
                    <CheckCircle2 size={20} className="mb-2 mx-auto" style={{ color: '#4ade80' }} />
                  ) : (
                    <UploadCloud size={20} className="mb-2 mx-auto transition-transform group-hover:-translate-y-0.5" style={{ color: '#3B82F6' }} />
                  )}
                  <p className="text-sm font-medium text-white">
                    {receiptFile ? receiptFile.name : (t('upload_transfer_receipt'))}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#475569' }}>
                    {t('image_or_pdf_max_10mb')}
                  </p>
                </label>
              </div>

              {submitError && (
                <div className="p-3 rounded-lg text-sm font-medium" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                  {submitError}
                </div>
              )}

              <DashButton
                type="submit"
                loading={submittingOrder}
                onClick={handleSubmitOrder}
                className="dash-btn dash-btn-primary w-full justify-center py-3 text-sm font-bold rounded-xl"
              >
                {t('complete_purchase')}
              </DashButton>
            </form>
          );
        })()}

        {/* Success Screen */}
        {checkoutStep === 2 && (
          <div className="text-center py-8 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-6">
              <StepDot done label={t('details')} />
              <div className="w-8 h-px" style={{ background: 'rgba(74,222,128,0.4)' }} />
              <StepDot active success label={t('confirmed')} />
            </div>

            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(74,222,128,0.15)' }} />
              <div className="relative w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)' }}>
                <CheckCircle2 size={36} style={{ color: '#4ade80' }} />
              </div>
            </div>

            <h4 className="sf-display text-xl font-bold text-white mb-2">
              {isCartCheckout ? (t('cart_orders_submitted')) : t('order_success')}
            </h4>

            {isCartCheckout && createdOrders.length > 0 ? (
              <div className="w-full max-w-xs space-y-2 mb-6 text-start">
                <div className="text-xs font-semibold text-slate-400 text-center mb-2">
                  {t('generated_independent_orders')}
                </div>
                {createdOrders.map((ord) => (
                  <div key={ord.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-mono font-bold text-blue-400">
                    <span className="truncate">{ord.productName}</span>
                    <span dir="ltr">{ord.orderNumber}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-base font-mono font-bold mb-6 px-4 py-2 rounded-lg" style={{ color: '#60A5FA', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }} dir="ltr">
                <Receipt size={15} />
                {language === 'en' ? 'Order' : ''} {currentOrderId}
              </div>
            )}

            <p className="text-sm mb-8 max-w-xs mx-auto leading-relaxed" style={{ color: '#64748B' }}>
              {isCartCheckout 
                ? (t('each_item_has_been_converted_i'))
                : t('awaiting_verification')}
            </p>

            <button
              onClick={closeCheckout}
              className="dash-btn dash-btn-secondary py-2.5 px-8 rounded-full text-sm font-bold"
            >
              {t('close')}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

// Wrapper Component that supplies CartProvider to Storefront
const Storefront = ({ store }) => (
  <CartProvider storeId={store?.id}>
    <StorefrontInner store={store} />
  </CartProvider>
);

const ChevronDivider = ({ language }) => (
  language === 'ar'
    ? <ArrowLeft size={10} style={{ color: '#334155' }} />
    : <ArrowRight size={10} style={{ color: '#334155' }} />
);

const StepDot = ({ active, done, success, label }) => (
  <div className="flex items-center gap-1.5">
    <div
      className="w-1.5 h-1.5 rounded-full transition-colors"
      style={{
        background: success ? '#4ade80' : active || done ? '#3B82F6' : 'rgba(255,255,255,0.15)',
      }}
    />
    <span
      className="text-[10px] font-bold uppercase tracking-wider"
      style={{ color: success ? '#4ade80' : active || done ? '#94A3B8' : '#334155' }}
    >
      {label}
    </span>
  </div>
);

export default Storefront;
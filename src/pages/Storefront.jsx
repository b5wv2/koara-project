import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle2, Package, X, Tag, ArrowLeft, ArrowRight, Loader2, ShoppingBag, ShieldCheck, Landmark, Receipt } from 'lucide-react';
import Modal from '../components/Modal';
import { useAppContext } from '../context/AppContext';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Scoped styles: a distinctive display face for headings, a subtle themed
// scrollbar, and the entrance/shimmer motion used across the page. Kept in
// one place so every early-return branch below can reuse the same block.
// All colors here are pulled from the palette already used throughout this
// file (#020617, #3B82F6, slate grays) — nothing new is introduced.
const ScopedStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&display=swap');

    .sf-display { font-family: 'Sora', ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.01em; }

    .sf-root { scrollbar-width: thin; scrollbar-color: rgba(59,130,246,0.35) transparent; }
    .sf-root::-webkit-scrollbar { width: 10px; height: 10px; }
    .sf-root::-webkit-scrollbar-track { background: transparent; }
    .sf-root::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.25); border-radius: 999px; border: 2px solid #020617; }
    .sf-root::-webkit-scrollbar-thumb:hover { background: rgba(59,130,246,0.4); }

    @keyframes sf-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .sf-rise { animation: sf-rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }

    @keyframes sf-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    .sf-skeleton {
      background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.07) 37%, rgba(255,255,255,0.03) 63%);
      background-size: 200% 100%;
      animation: sf-shimmer 1.6s ease-in-out infinite;
    }

    .sf-focusable:focus-visible {
      outline: 2px solid #3B82F6;
      outline-offset: 3px;
      border-radius: 1rem;
    }

    @media (prefers-reduced-motion: reduce) {
      .sf-rise { animation: none; }
      .sf-skeleton { animation: none; }
    }
  `}</style>
);

// Fixed ambient backdrop shared by every screen of the storefront.
const AmbientBackground = () => (
  <div
    className="fixed inset-0 pointer-events-none z-0"
    style={{ background: 'radial-gradient(ellipse 80% 40% at 50% -10%, rgba(37,99,235,0.08) 0%, transparent 70%)' }}
    aria-hidden="true"
  />
);

const Storefront = ({ store }) => {
  const { t, language, setLanguage, createOrder } = useAppContext();

  // Strictly use the ID from the dynamically loaded store
  const storeId = store.id;

  const [catalog, setCatalog] = useState({ categories: [], products: [], promos: [], platform_products: [] });
  const [topupsCatalogs, setTopupsCatalogs] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState(null);

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
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [topupFormFields, setTopupFormFields] = useState({});

  // Map the passed store to the merchant structure expected by the UI
  const merchant = store ? {
    id: store.id,
    name: store.store_name,
    logoUrl: store.logo_url,
    active: store.status === 'active',
    bankName: store.bank_name,
    bankAccountName: store.account_name,
    bankAccountNumber: store.account_no
  } : null;

  // ── Error states ──

  if (!merchant || !merchant.active) {
    return (
      <div className="sf-root min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: '#020617' }}>
        <ScopedStyles />
        <AmbientBackground />
        <div className="relative z-10 max-w-md w-full rounded-2xl p-8 text-center sf-rise" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <X size={28} style={{ color: '#f87171' }} />
          </div>
          <h2 className="sf-display text-xl font-bold text-white mb-2">
            {language === 'en' ? 'Store Suspended' : 'تم إيقاف المتجر'}
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            {language === 'en'
              ? 'This store is temporarily suspended by the platform administration.'
              : 'هذا المتجر تم إيقافه مؤقتاً من قبل إدارة المنصة.'}
          </p>
        </div>
      </div>
    );
  }

  if (loadingCatalog) {
    return (
      <div className="sf-root min-h-screen flex flex-col" style={{ background: '#020617' }}>
        <ScopedStyles />
        <AmbientBackground />
        <header className="relative z-10 py-4 px-4 sm:px-8 flex justify-between items-center shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl sf-skeleton" />
            <div className="w-28 h-4 rounded sf-skeleton" />
          </div>
        </header>
        <main className="flex-1 relative z-10 max-w-5xl mx-auto w-full px-4 sm:px-8 py-10 sm:py-14">
          <div className="space-y-8">
            <div className="space-y-2">
              <div className="w-20 h-3 rounded sf-skeleton" />
              <div className="w-56 h-7 rounded sf-skeleton" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="h-32 sf-skeleton" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }} />
                  <div className="p-5 space-y-2">
                    <div className="w-2/3 h-3.5 rounded sf-skeleton" />
                    <div className="w-1/3 h-2.5 rounded sf-skeleton" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
        <div className="relative z-10 flex items-center justify-center gap-2 pb-8 text-xs font-medium" style={{ color: '#475569' }}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#3B82F6' }} />
          {language === 'en' ? 'Loading catalog…' : 'جارٍ تحميل الكتالوج…'}
        </div>
      </div>
    );
  }

  if (catalogError) {
    return (
      <div className="sf-root min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: '#020617' }}>
        <ScopedStyles />
        <AmbientBackground />
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
  const platformCategories = [...new Set(platformProducts.map(p => p.category))];

  const activeCategoryProducts = selectedCategoryId
    ? (topupsCatalogs.some(c => c.category.id === selectedCategoryId)
        ? topupsCatalogs.find(c => c.category.id === selectedCategoryId).offers.map(o => ({ ...o, id: o.offer_id, category: selectedCategoryId, isTopup: true }))
        : typeof selectedCategoryId === 'string'
          ? platformProducts.filter(p => p.category === selectedCategoryId)
          : storeProducts.filter(p => p.category_id === selectedCategoryId || p.categoryId === selectedCategoryId))
    : [];

  const handleProductClick = (product) => {
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
  };

  const calculateTotal = () => {
    if (!selectedProduct) return 0;
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
    const foundPromo = catalog.promos.find(p => p.code.toUpperCase() === promoCode.toUpperCase());

    if (foundPromo) {
      setAppliedPromo(foundPromo);
    } else {
      setAppliedPromo(null);
      setPromoError('Invalid or inactive promo code.');
    }
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!receiptFile) {
      setSubmitError(t('upload_receipt_required') || 'Please upload a payment receipt.');
      return;
    }

    if (selectedProduct.isTopup) {
      setSubmittingOrder(true);
      try {
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
        } else {
          setSubmitError(data.error || 'Failed to submit top-up order.');
        }
      } catch (err) {
        setSubmitError('Connection error. Please try again.');
      } finally {
        setSubmittingOrder(false);
      }
      return;
    }


    setSubmittingOrder(true);
    try {
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
      } else {
        setSubmitError(data.error || 'Failed to submit order.');
      }
    } catch (err) {
      setSubmitError('Connection error. Please try again.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const closeCheckout = () => {
    setSelectedProduct(null);
    setCheckoutStep(0);
  };

  // ── Category card component ──
  const CategoryCard = ({ onClick, color, logoSrc, iconText, name, productCount }) => (
    <div
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      role="button"
      tabIndex={0}
      className="sf-focusable group rounded-2xl overflow-hidden cursor-pointer flex flex-col transition-all duration-300"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${color}55`;
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
      {/* Color bar */}
      <div className="h-1 w-full" style={{ background: color }} />

      {/* Image / Icon area */}
      <div
        className="flex-1 flex items-center justify-center p-8 relative"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: `radial-gradient(circle at 50% 30%, ${color}14 0%, transparent 65%)` }}
          aria-hidden="true"
        />
        {logoSrc ? (
          <img src={logoSrc} alt={name} className="relative max-h-20 max-w-full object-contain transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div
            className="relative w-16 h-16 rounded-2xl flex items-center justify-center font-extrabold text-xl transition-transform duration-300 group-hover:scale-105"
            style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
          >
            {iconText || name.charAt(0)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="sf-display font-bold text-white text-sm truncate">{name}</h3>
          <div className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: `${color}14`, color }}>
            {productCount} {productCount === 1 ? (language === 'en' ? 'item' : 'منتج') : (language === 'en' ? 'items' : 'منتجات')}
          </div>
        </div>
        <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" style={{ background: 'rgba(255,255,255,0.05)', color: '#64748B' }}>
          {language === 'ar' ? <ArrowLeft size={13} /> : <ArrowRight size={13} />}
        </div>
      </div>
    </div>
  );

  // ── Product card component ──
  const ProductCard = ({ product, onClick }) => {
    const hasDiscount = product.sale_price !== null && !product.selling_price;
    return (
      <div
        onClick={onClick}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
        role="button"
        tabIndex={0}
        className="sf-focusable group rounded-2xl overflow-hidden cursor-pointer flex flex-col transition-all duration-300"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(59,130,246,0.35)';
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 20px 40px -12px rgba(37,99,235,0.25), 0 8px 20px -10px rgba(0,0,0,0.5)';
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
            style={{ background: 'radial-gradient(circle at 50% 20%, rgba(59,130,246,0.1) 0%, transparent 70%)' }}
            aria-hidden="true"
          />
          {product.image_url || product.image ? (
            <img src={product.image_url || product.image} alt={product.name} className="relative max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <Package size={36} className="relative" style={{ color: '#2D3748', opacity: 0.6 }} />
          )}
          {hasDiscount && (
            <div
              className="absolute top-0 right-0 rtl:right-auto rtl:left-0 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
              style={{ background: '#ef4444', borderBottomLeftRadius: '0.75rem', borderBottomRightRadius: language === 'ar' ? '0.75rem' : 0 }}
            >
              {language === 'ar' ? 'تخفيض' : 'Sale'}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2 mb-3 group-hover:text-blue-300 transition-colors">
            {product.name}
          </h3>
          <div className="mt-auto flex items-end justify-between gap-2">
            {product.selling_price ? (
              <span className="sf-display font-black text-white text-lg">${parseFloat(product.selling_price).toFixed(2)}</span>
            ) : product.sale_price !== null && product.sale_price !== undefined ? (
              <div className="flex flex-col">
                <span className="text-xs line-through mb-0.5" style={{ color: '#475569' }}>${parseFloat(product.price).toFixed(2)}</span>
                <span className="sf-display font-black text-white text-lg">${parseFloat(product.sale_price).toFixed(2)}</span>
              </div>
            ) : (
              <span className="sf-display font-black text-white text-lg">${parseFloat(product.price).toFixed(2)}</span>
            )}
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors" style={{ background: 'rgba(59,130,246,0.12)', color: '#60A5FA' }}>
              {language === 'ar' ? <ArrowLeft size={12} /> : <ArrowRight size={12} />}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="sf-root min-h-screen flex flex-col" style={{ background: '#020617' }}>
      <ScopedStyles />
      <AmbientBackground />

      {/* ── Store Header ── */}
      <header
        className="sticky top-0 z-40 py-3.5 px-4 sm:px-8 flex justify-between items-center shrink-0"
        style={{
          background: 'rgba(2,6,23,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {merchant.logoUrl ? (
            <img
              src={merchant.logoUrl}
              alt={merchant.name}
              className="w-10 h-10 rounded-xl object-cover shrink-0"
              style={{ border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 0 0 3px rgba(37,99,235,0.08)' }}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shrink-0"
              style={{ background: 'linear-gradient(135deg, #2563EB, #4F46E5)', boxShadow: '0 0 0 3px rgba(37,99,235,0.08)' }}
            >
              {merchant.name ? merchant.name.charAt(0) : 'S'}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="sf-display font-bold text-white text-base tracking-tight truncate">{merchant.name}</h1>
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium" style={{ color: '#4ade80' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              {language === 'en' ? 'Store open' : 'المتجر متاح الآن'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="sf-focusable text-xs font-bold tracking-wide transition-colors px-3 py-2 rounded-lg"
            style={{ color: '#94A3B8', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {language === 'en' ? 'AR' : 'EN'}
          </button>
        </div>
      </header>

      {/* ── Catalog ── */}
      <main className="flex-1 relative z-10 max-w-5xl mx-auto w-full px-4 sm:px-8 py-10 sm:py-14">
        {selectedCategoryId === null ? (
          /* Category Selection Grid */
          <div className="space-y-8">
            <div className="sf-rise">
              <div className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: '#60A5FA' }}>
                <ShoppingBag size={12} />
                {language === 'en' ? 'Catalog' : 'الكتالوج'}
              </div>
              <h2 className="sf-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {language === 'en' ? 'Browse by category' : 'تصفح حسب الفئة'}
              </h2>
              <p className="text-sm mt-1.5" style={{ color: '#64748B' }}>
                {language === 'en' ? 'Pick a category to see what\u2019s in stock' : 'اختر فئة لعرض المنتجات المتوفرة'}
              </p>
            </div>

            {/* Category grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {catalog.categories.filter(c => storeProducts.some(p => p.category_id === c.id || p.categoryId === c.id)).map((category, idx) => {
                const count = storeProducts.filter(p => p.category_id === category.id || p.categoryId === category.id).length;
                return (
                  <div key={category.id} className="sf-rise" style={{ animationDelay: `${Math.min(idx, 8) * 45}ms` }}>
                    <CategoryCard
                      onClick={() => setSelectedCategoryId(category.id)}
                      color={category.color || '#3b82f6'}
                      logoSrc={category.logo_url || category.logoUrl}
                      iconText={category.icon_text || category.iconText}
                      name={category.name}
                      productCount={count}
                    />
                  </div>
                );
              })}

              {platformCategories.map((catName, idx) => {
                const colors = { 'Free Fire': '#FF4C29', 'PUBG Mobile': '#F2A154' };
                const color = colors[catName] || '#3b82f6';
                const count = platformProducts.filter(p => p.category === catName).length;
                return (
                  <div key={`platform-${catName}`} className="sf-rise" style={{ animationDelay: `${Math.min(idx, 8) * 45}ms` }}>
                    <CategoryCard
                      onClick={() => setSelectedCategoryId(catName)}
                      color={color}
                      logoSrc={null}
                      iconText={catName.charAt(0)}
                      name={catName}
                      productCount={count}
                    />
                  </div>
                );
              })}

              {topupsCatalogs.map((tc, idx) => (
                tc.offers.length > 0 && (
                  <div key={`topups-${tc.category.id}`} className="sf-rise" style={{ animationDelay: `${Math.min(idx, 8) * 45}ms` }}>
                    <CategoryCard
                      onClick={() => setSelectedCategoryId(tc.category.id)}
                      color={'#8b5cf6'}
                      logoSrc={null}
                      iconText={tc.category.name.charAt(0)}
                      name={tc.category.name}
                      productCount={tc.offers.length}
                    />
                  </div>
                )
              ))}
            </div>
          </div>
        ) : (
          /* Products Sub-Grid View */
          <div className="space-y-8">
            <div className="sf-rise flex items-center gap-4">
              <button
                onClick={() => setSelectedCategoryId(null)}
                className="sf-focusable w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94A3B8'; }}
                aria-label={language === 'en' ? 'Back to catalog' : 'العودة للكتالوج'}
              >
                {language === 'ar' ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-0.5" style={{ color: '#475569' }}>
                  <span>{language === 'en' ? 'Catalog' : 'الكتالوج'}</span>
                  <ChevronDivider language={language} />
                  <span style={{ color: '#60A5FA' }} className="truncate">
                    {typeof selectedCategoryId === 'string'
                      ? selectedCategoryId
                      : catalog.categories.find(c => c.id === selectedCategoryId)?.name}
                  </span>
                </div>
                <h2 className="sf-display text-xl sm:text-2xl font-bold tracking-tight text-white truncate">
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
                    {language === 'en' ? 'No active products in this category yet.' : 'لا توجد منتجات نشطة في هذه الفئة بعد.'}
                  </p>
                </div>
              ) : activeCategoryProducts.map((product, idx) => (
                <div key={product.id} className="sf-rise" style={{ animationDelay: `${Math.min(idx, 8) * 45}ms` }}>
                  <ProductCard
                    product={product}
                    onClick={() => handleProductClick(product)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 w-full py-7" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex flex-col items-center gap-3 px-4">
          <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#475569' }}>
            <ShieldCheck size={13} style={{ color: '#3B82F6' }} />
            {language === 'en' ? 'Every order is manually verified before delivery' : 'يتم التحقق من كل طلب يدويًا قبل التسليم'}
          </div>
          <div className="text-sm" style={{ color: '#334155' }}>
            {merchant.name} · {language === 'en' ? 'Powered by' : 'بواسطة'}{' '}
            <span className="font-semibold" style={{ color: '#475569' }}>Koara</span>
          </div>
        </div>
      </footer>

      {/* ── Checkout Modal ── */}
      <Modal
        isOpen={checkoutStep > 0 && checkoutStep < 3}
        onClose={closeCheckout}
        title={checkoutStep === 1 ? (language === 'en' ? 'Checkout' : 'إتمام الشراء') : (language === 'en' ? 'Order status' : 'حالة الطلب')}
      >
        {checkoutStep === 1 && selectedProduct && (() => {
          const parentCategory = catalog.categories.find(c => c.id === selectedProduct.categoryId);
          const displayPrice = selectedProduct.selling_price
            ? parseFloat(selectedProduct.selling_price).toFixed(2)
            : (selectedProduct.salePrice ?? selectedProduct.sale_price ?? selectedProduct.price)?.toFixed
              ? parseFloat(selectedProduct.salePrice ?? selectedProduct.sale_price ?? selectedProduct.price).toFixed(2)
              : '0.00';

          return (
            <form onSubmit={handleSubmitOrder} className="space-y-5">
              {/* Step indicator — purely visual, mirrors the existing checkoutStep state */}
              <div className="flex items-center gap-2 -mt-1 mb-1">
                <StepDot active label={language === 'en' ? 'Details' : 'التفاصيل'} />
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <StepDot label={language === 'en' ? 'Confirmed' : 'التأكيد'} />
              </div>

              {/* Product summary card */}
              {parentCategory && (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden shrink-0" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {parentCategory.logoUrl ? (
                      <img src={parentCategory.logoUrl} alt={parentCategory.name} className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="font-extrabold text-xs" style={{ color: parentCategory.color }}>{parentCategory.iconText}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-white leading-tight truncate">{selectedProduct.name}</h4>
                    <span className="text-xs font-medium" style={{ color: '#475569' }}>{parentCategory.name}</span>
                  </div>
                </div>
              )}

              {/* Promo Code */}
              <div>
                <div className="flex gap-2 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <input
                    type="text"
                    placeholder={t('promo_code')}
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="flex-1 px-4 py-2.5 text-sm bg-transparent outline-none uppercase font-mono text-white placeholder-slate-600"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="sf-focusable px-4 text-xs font-bold transition-colors"
                    style={{ color: '#60A5FA' }}
                  >
                    {t('apply')}
                  </button>
                </div>
                {promoError && <p className="text-xs font-medium mt-1.5" style={{ color: '#f87171' }}>{promoError}</p>}
              </div>

              {/* Price breakdown */}
              <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex justify-between items-center text-sm">
                  <span style={{ color: '#64748B' }}>{selectedProduct.name}</span>
                  <span className="font-medium text-white" dir="ltr">${displayPrice}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between items-center text-sm" style={{ color: '#60A5FA' }}>
                    <span className="flex items-center gap-1"><Tag size={12} /> {appliedPromo.code}</span>
                    <span className="font-medium" dir="ltr">
                      -{appliedPromo.discount_type === 'percentage' ? `${parseFloat(appliedPromo.value)}%` : `$${parseFloat(appliedPromo.value).toFixed(2)}`}
                    </span>
                  </div>
                )}
                <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
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

              {/* Dynamic Top-up Fields */}
              {selectedProduct.isTopup && (() => {
                 const currentCatalog = topupsCatalogs.find(c => c.category.id === selectedProduct.category);
                 return currentCatalog && currentCatalog.fields && currentCatalog.fields.length > 0 && (
                   <div className="space-y-3 mt-4">
                     <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94A3B8' }}>
                       {language === 'en' ? 'Top-up details' : 'تفاصيل الشحن'}
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
                  {language === 'en' ? 'Payment details' : 'تفاصيل الدفع'}
                </h4>
                <div className="rounded-xl p-4 text-sm space-y-2.5 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex justify-between gap-3">
                    <span style={{ color: '#64748B' }}>{language === 'en' ? 'Bank' : 'البنك'}</span>
                    <span className="font-medium text-white text-right">{merchant.bankName || 'Chase Bank'}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span style={{ color: '#64748B' }}>{language === 'en' ? 'Account name' : 'اسم الحساب'}</span>
                    <span className="font-medium text-white text-right">{merchant.bankAccountName || 'Alfa Store LLC'}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span style={{ color: '#64748B' }}>{language === 'en' ? 'Account no.' : 'رقم الحساب'}</span>
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
                    {receiptFile ? receiptFile.name : (language === 'en' ? 'Upload transfer receipt' : 'ارفع إيصال التحويل')}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#475569' }}>
                    {language === 'en' ? 'Image or PDF · Max 10MB' : 'صورة أو PDF · بحد أقصى 10 ميجابايت'}
                  </p>
                </label>
              </div>

              {submitError && (
                <div className="p-3 rounded-lg text-sm font-medium" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={submittingOrder}
                className="dash-btn dash-btn-primary w-full justify-center py-3 text-sm font-bold rounded-xl"
              >
                {submittingOrder ? <Loader2 size={18} className="animate-spin" /> : t('complete_purchase')}
              </button>
            </form>
          );
        })()}

        {checkoutStep === 2 && (() => {
          const parentCategory = selectedProduct ? catalog.categories.find(c => c.id === selectedProduct.categoryId) : null;
          return (
            <div className="text-center py-8 flex flex-col items-center">
              <div className="flex items-center gap-2 mb-6">
                <StepDot done label={language === 'en' ? 'Details' : 'التفاصيل'} />
                <div className="w-8 h-px" style={{ background: 'rgba(74,222,128,0.4)' }} />
                <StepDot active success label={language === 'en' ? 'Confirmed' : 'التأكيد'} />
              </div>

              <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(74,222,128,0.15)' }} />
                <div className="relative w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)' }}>
                  <CheckCircle2 size={36} style={{ color: '#4ade80' }} />
                </div>
              </div>
              <h4 className="sf-display text-xl font-bold text-white mb-2">{t('order_success')}</h4>
              <div className="flex items-center gap-2 text-base font-mono font-bold mb-6 px-4 py-2 rounded-lg" style={{ color: '#60A5FA', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }} dir="ltr">
                <Receipt size={15} />
                {language === 'en' ? 'Order' : ''} {currentOrderId}
              </div>

              {selectedProduct && parentCategory && (
                <div className="flex items-center gap-3 p-3 rounded-xl mb-6 max-w-xs w-full text-left rtl:text-right" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    {parentCategory.logoUrl ? (
                      <img src={parentCategory.logoUrl} alt={parentCategory.name} className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="font-bold text-[10px]" style={{ color: parentCategory.color }}>{parentCategory.iconText}</span>
                    )}
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-xs text-white truncate">{selectedProduct.name}</div>
                    <div className="text-[10px]" style={{ color: '#475569' }}>{parentCategory.name}</div>
                  </div>
                </div>
              )}

              <p className="text-sm mb-8 max-w-xs mx-auto leading-relaxed" style={{ color: '#64748B' }}>
                {t('awaiting_verification')}
              </p>
              <button
                onClick={closeCheckout}
                className="dash-btn dash-btn-secondary py-2.5 px-8 rounded-full text-sm font-bold"
              >
                {language === 'en' ? 'Close' : 'إغلاق'}
              </button>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

// Small breadcrumb divider — purely presentational.
const ChevronDivider = ({ language }) => (
  language === 'ar'
    ? <ArrowLeft size={10} style={{ color: '#334155' }} />
    : <ArrowRight size={10} style={{ color: '#334155' }} />
);

// Two-dot progress indicator for the checkout modal. Visual only — reads
// nothing from and writes nothing to application state.
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
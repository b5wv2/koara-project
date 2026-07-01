import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle2, Package, X, Tag, ArrowLeft, ArrowRight, Loader2, ShoppingBag } from 'lucide-react';
import Modal from '../components/Modal';
import { useAppContext } from '../context/AppContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;

const Storefront = ({ store }) => {
  const { t, language, setLanguage, createOrder } = useAppContext();

  // Strictly use the ID from the dynamically loaded store
  const storeId = store.id;

  const [catalog, setCatalog] = useState({ categories: [], products: [], promos: [], platform_products: [] });
  const [topupsData, setTopupsData] = useState({ category: null, fields: [], offers: [] });
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
            setTopupsData({
              category: tData.category,
              fields: tData.fields || [],
              offers: tData.offers || []
            });
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
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: '#020617' }}>
        <div className="max-w-md w-full rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <X size={28} style={{ color: '#f87171' }} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
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
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: '#020617' }}>
        <Loader2 className="w-10 h-10 animate-spin mb-4 mx-auto" style={{ color: '#3B82F6' }} />
        <p className="text-slate-400 font-medium text-sm">Loading catalog...</p>
      </div>
    );
  }

  if (catalogError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: '#020617' }}>
        <div className="mb-4" style={{ color: '#f87171' }}><X size={32} className="mx-auto" /></div>
        <p className="text-slate-400 font-medium text-sm">{catalogError}</p>
      </div>
    );
  }

  const storeProducts = catalog.products;
  const platformProducts = catalog.platform_products || [];
  const platformCategories = [...new Set(platformProducts.map(p => p.category))];

  const activeCategoryProducts = selectedCategoryId
    ? (selectedCategoryId === topupsData.category?.id
        ? topupsData.offers.map(o => ({ ...o, id: o.offer_id, category: topupsData.category.id, isTopup: true }))
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
      if (appliedPromo.type === 'percentage') {
        basePrice = basePrice * (1 - appliedPromo.value / 100);
      } else if (appliedPromo.type === 'fixed') {
        basePrice = Math.max(0, basePrice - appliedPromo.value);
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

    if (selectedProduct.isTopup) {
      setSubmittingOrder(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/store/topups/order/${storeId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offerId: selectedProduct.id,
            customerName,
            customerEmail,
            whatsapp,
            fields: topupFormFields
          })
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

    if (!receiptFile) {
      setSubmitError('Please upload a payment receipt.');
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
      // quantity could be added here if implemented in UI

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
      className="group rounded-2xl overflow-hidden cursor-pointer flex flex-col transition-all duration-300"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${color}40`;
        e.currentTarget.style.background = `rgba(255,255,255,0.05)`;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 12px 30px -8px rgba(0,0,0,0.4)`;
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
      <div className="flex-1 flex items-center justify-center p-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {logoSrc ? (
          <img src={logoSrc} alt={name} className="max-h-20 max-w-full object-contain transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center font-extrabold text-xl transition-transform duration-300 group-hover:scale-105"
            style={{ background: `${color}18`, color }}
          >
            {iconText || name.charAt(0)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-sm">{name}</h3>
          <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
            {productCount} {productCount === 1 ? 'Product' : 'Products'}
          </p>
        </div>
        <div className="transition-colors" style={{ color: '#475569' }}>
          {language === 'ar' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
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
        className="group rounded-2xl overflow-hidden cursor-pointer flex flex-col transition-all duration-300"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(37,99,235,0.3)';
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 16px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(37,99,235,0.15)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = '';
        }}
      >
        {/* Image area */}
        <div className="aspect-video flex items-center justify-center p-6 relative" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          {product.image_url || product.image ? (
            <img src={product.image_url || product.image} alt={product.name} className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <Package size={40} style={{ color: '#2D3748', opacity: 0.5 }} />
          )}
          {hasDiscount && (
            <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
              {language === 'ar' ? 'تخفيض' : 'Sale'}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2 mb-3 group-hover:text-blue-300 transition-colors">
            {product.name}
          </h3>
          <div className="mt-auto">
            {product.selling_price ? (
              <span className="font-black text-white text-lg">${parseFloat(product.selling_price).toFixed(2)}</span>
            ) : product.sale_price !== null && product.sale_price !== undefined ? (
              <div className="flex flex-col">
                <span className="text-xs line-through mb-0.5" style={{ color: '#475569' }}>${parseFloat(product.price).toFixed(2)}</span>
                <span className="font-black text-white text-lg">${parseFloat(product.sale_price).toFixed(2)}</span>
              </div>
            ) : (
              <span className="font-black text-white text-lg">${parseFloat(product.price).toFixed(2)}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#020617' }}>
      {/* Ambient background */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{ background: 'radial-gradient(ellipse 80% 40% at 50% -10%, rgba(37,99,235,0.06) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      {/* ── Store Header ── */}
      <header
        className="sticky top-0 z-40 py-4 px-4 sm:px-8 flex justify-between items-center shrink-0"
        style={{
          background: 'rgba(2,6,23,0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-3">
          {merchant.logoUrl ? (
            <img src={merchant.logoUrl} alt={merchant.name} className="w-9 h-9 rounded-xl object-cover" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
          ) : (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-base" style={{ background: 'linear-gradient(135deg, #2563EB, #4F46E5)' }}>
              {merchant.name ? merchant.name.charAt(0) : 'S'}
            </div>
          )}
          <h1 className="font-bold text-white text-base tracking-tight">{merchant.name}</h1>
          {/* Live indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
            Live
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="text-sm font-semibold transition-colors px-3 py-1.5 rounded-lg"
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
            <div>
              <div className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: '#60A5FA' }}>
                <ShoppingBag size={12} />
                Catalog
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {language === 'en' ? 'Browse by Category' : 'تصفح حسب الفئة'}
              </h2>
              <p className="text-sm mt-1" style={{ color: '#64748B' }}>
                {language === 'en' ? 'Select a category to view items' : 'اختر فئة لعرض المنتجات'}
              </p>
            </div>

            {/* Category grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {catalog.categories.filter(c => storeProducts.some(p => p.category_id === c.id || p.categoryId === c.id)).map(category => {
                const count = storeProducts.filter(p => p.category_id === category.id || p.categoryId === category.id).length;
                return (
                  <CategoryCard
                    key={category.id}
                    onClick={() => setSelectedCategoryId(category.id)}
                    color={category.color || '#3b82f6'}
                    logoSrc={category.logo_url || category.logoUrl}
                    iconText={category.icon_text || category.iconText}
                    name={category.name}
                    productCount={count}
                  />
                );
              })}

              {platformCategories.map(catName => {
                const colors = { 'Free Fire': '#FF4C29', 'PUBG Mobile': '#F2A154' };
                const color = colors[catName] || '#3b82f6';
                const count = platformProducts.filter(p => p.category === catName).length;
                return (
                  <CategoryCard
                    key={`platform-${catName}`}
                    onClick={() => setSelectedCategoryId(catName)}
                    color={color}
                    logoSrc={null}
                    iconText={catName.charAt(0)}
                    name={catName}
                    productCount={count}
                  />
                );
              })}

              {topupsData.category && topupsData.offers.length > 0 && (
                <CategoryCard
                  key={`topups-${topupsData.category.id}`}
                  onClick={() => setSelectedCategoryId(topupsData.category.id)}
                  color={'#8b5cf6'}
                  logoSrc={null}
                  iconText={'T'}
                  name={topupsData.category.name}
                  productCount={topupsData.offers.length}
                />
              )}
            </div>
          </div>
        ) : (
          /* Products Sub-Grid View */
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedCategoryId(null)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94A3B8'; }}
              >
                {language === 'ar' ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
              </button>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  {typeof selectedCategoryId === 'string'
                    ? selectedCategoryId
                    : catalog.categories.find(c => c.id === selectedCategoryId)?.name}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                  {language === 'en' ? 'Select an option below' : 'اختر أحد الخيارات أدناه'}
                </p>
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
              ) : activeCategoryProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => handleProductClick(product)}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 w-full py-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-center text-sm" style={{ color: '#334155' }}>
          {merchant.name} · Powered by{' '}
          <span className="font-semibold" style={{ color: '#475569' }}>Koara</span>
        </div>
      </footer>

      {/* ── Checkout Modal ── */}
      <Modal
        isOpen={checkoutStep > 0 && checkoutStep < 3}
        onClose={closeCheckout}
        title={checkoutStep === 1 ? 'Checkout' : 'Order Status'}
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
                  <div>
                    <h4 className="font-bold text-sm text-white leading-tight">{selectedProduct.name}</h4>
                    <span className="text-xs font-medium" style={{ color: '#475569' }}>{parentCategory.name}</span>
                  </div>
                </div>
              )}

              {/* Promo Code */}
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
                  className="px-4 text-xs font-bold transition-colors"
                  style={{ color: '#60A5FA' }}
                >
                  {t('apply')}
                </button>
              </div>
              {promoError && <p className="text-xs font-medium" style={{ color: '#f87171' }}>{promoError}</p>}

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
                      -{appliedPromo.type === 'percentage' ? `${appliedPromo.value}%` : `$${appliedPromo.value.toFixed(2)}`}
                    </span>
                  </div>
                )}
                <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white text-sm">{t('total')}:</span>
                  <span className="text-xl font-black" style={{ color: '#3B82F6' }} dir="ltr">${calculateTotal()}</span>
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
              {selectedProduct.isTopup && topupsData.fields && topupsData.fields.length > 0 && (
                <div className="space-y-3 mt-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94A3B8' }}>Top-up Details</h4>
                  {topupsData.fields.map(field => (
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
              )}

              {/* Payment Details (Only for Gift Cards) */}
              {!selectedProduct.isTopup && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#94A3B8' }}>Payment Details</h4>
                <div className="rounded-xl p-4 text-sm space-y-2 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex justify-between">
                    <span style={{ color: '#64748B' }}>Bank:</span>
                    <span className="font-medium text-white">{merchant.bankName || 'Chase Bank'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: '#64748B' }}>Account Name:</span>
                    <span className="font-medium text-white">{merchant.bankAccountName || 'Alfa Store LLC'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: '#64748B' }}>Account No:</span>
                    <span className="font-medium font-mono text-white" dir="ltr">{merchant.bankAccountNumber || '1234567890'}</span>
                  </div>
                </div>

                {/* Upload Zone */}
                <label className="koara-upload-zone block relative cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/*,application/pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={e => setReceiptFile(e.target.files[0])}
                  />
                  <UploadCloud size={20} className="mb-2 mx-auto" style={{ color: '#3B82F6' }} />
                  <p className="text-sm font-medium text-white">
                    {receiptFile ? receiptFile.name : 'Upload Transfer Receipt'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#475569' }}>Image or PDF (Max 10MB)</p>
                </label>
              </div>
              )}

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
              <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(74,222,128,0.15)' }} />
                <div className="relative w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)' }}>
                  <CheckCircle2 size={36} style={{ color: '#4ade80' }} />
                </div>
              </div>
              <h4 className="text-xl font-bold text-white mb-2">{t('order_success')}</h4>
              <div className="text-base font-mono font-bold mb-6 px-4 py-2 rounded-lg" style={{ color: '#60A5FA', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }} dir="ltr">
                Order {currentOrderId}
              </div>

              {selectedProduct && parentCategory && (
                <div className="flex items-center gap-3 p-3 rounded-xl mb-6 max-w-xs w-full text-left" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
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
                Close
              </button>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default Storefront;

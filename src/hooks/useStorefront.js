import { useState, useEffect } from 'react';
import { fetchStoreCatalog, fetchTopupsCatalog } from '../services/storefrontService';

/**
 * Storefront data + checkout logic hook.
 * Encapsulates catalog fetching, product selection, checkout flow, and promo code logic.
 */
export function useStorefront(storeId) {
  const [catalog, setCatalog] = useState({ categories: [], products: [], promos: [], platform_products: [] });
  const [topupsData, setTopupsData] = useState({ category: null, fields: [], offers: [] });
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState(null);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState(0);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  // Customer form fields
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [topupFormFields, setTopupFormFields] = useState({});

  useEffect(() => {
    const load = async () => {
      setLoadingCatalog(true);
      const [catalogResult, topupsResult] = await Promise.all([
        fetchStoreCatalog(storeId),
        fetchTopupsCatalog(storeId),
      ]);

      if (catalogResult.success) {
        setCatalog({
          categories: catalogResult.categories,
          products: catalogResult.products,
          promos: catalogResult.promos,
          platform_products: catalogResult.platform_products,
        });
      } else {
        setCatalogError(catalogResult.error);
      }

      if (topupsResult.success) {
        setTopupsData({
          category: topupsResult.category,
          fields: topupsResult.fields,
          offers: topupsResult.offers,
        });
      }

      setLoadingCatalog(false);
    };
    load();
  }, [storeId]);

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
      : (selectedProduct.salePrice !== null && selectedProduct.salePrice !== undefined
        ? selectedProduct.salePrice
        : selectedProduct.price);

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

  const closeCheckout = () => {
    setSelectedProduct(null);
    setCheckoutStep(0);
  };

  return {
    // Catalog data
    catalog,
    topupsData,
    loadingCatalog,
    catalogError,

    // Category selection
    selectedCategoryId,
    setSelectedCategoryId,

    // Product selection & checkout
    selectedProduct,
    checkoutStep,
    setCheckoutStep,
    handleProductClick,
    closeCheckout,
    calculateTotal,

    // Promo
    promoCode,
    setPromoCode,
    appliedPromo,
    promoError,
    handleApplyPromo,

    // Customer form
    customerName,
    setCustomerName,
    customerEmail,
    setCustomerEmail,
    whatsapp,
    setWhatsapp,
    receiptFile,
    setReceiptFile,
    submittingOrder,
    setSubmittingOrder,
    submitError,
    setSubmitError,
    topupFormFields,
    setTopupFormFields,

    // Order
    currentOrderId,
    setCurrentOrderId,
  };
}

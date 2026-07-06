import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../translations';

const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null); // { role: 'admin' | 'merchant', email, storeName }
  const [store, setStore] = useState(null);
  const [language, setLanguage] = useState('en');
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setUser({
            id: data.user.id,
            role: data.user.role === 'super_admin' ? 'admin' : data.user.role,
            email: data.user.email,
            name: data.user.name,
            storeId: data.store ? data.store.id : null,
            storeName: data.store ? data.store.store_name : null
          });
          setStore(data.store);
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setIsAuthLoading(false);
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const t = (key) => {
    return translations[language][key] || key;
  };


  const [merchants, setMerchants] = useState([]);

  const [kycApplications, setKycApplications] = useState([
    { id: 99, storeName: 'Test Store', applicant: 'Awad Alkrim', status: 'pending', docUrl: 'https://via.placeholder.com/400x250?text=Mock+ID+Passport' }
  ]);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [promos, setPromos] = useState([]);
  const [platformProducts, setPlatformProducts] = useState([]);
  const [merchantPlatformProducts, setMerchantPlatformProducts] = useState([]);
  const [providers, setProviders] = useState([]);

  const [orders, setOrders] = useState([]);

  const [ledger, setLedger] = useState([]);

  const login = async (email, password) => {
    try {

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Check if it's a pending or rejected store request
        if (data.status === 'pending' || data.status === 'rejected') {
          return { success: true, isStoreRequest: true, status: data.status, rejection_reason: data.rejection_reason, request: data.store_request };
        }

        // Construct user state profile
        const sessionUser = {
          id: data.user.id,
          role: data.user.role === 'super_admin' ? 'admin' : data.user.role,
          email: data.user.email,
          name: data.user.name,
          storeId: data.store ? data.store.id : null,
          storeName: data.store ? data.store.store_name : null
        };

        setUser(sessionUser);
        setStore(data.store);

        // Keep local merchants list in sync with the database record details if merchant
        if (data.store) {
          setMerchants(prev => {
            const exists = prev.some(m => m.id === data.store.id);
            if (!exists) {
              return [
                ...prev,
                {
                  id: data.store.id,
                  name: data.store.store_name,
                  email: data.user.email,
                  balance: parseFloat(data.store.balance) || 0.00,
                  active: data.store.status === 'active',
                  subdomain: data.store.subdomain,
                  logoUrl: null,
                  bankName: data.store.bank_name || 'Chase Bank',
                  bankAccountName: data.store.account_name || `${data.store.store_name} LLC`,
                  bankAccountNumber: data.store.account_no || '1234567890'
                }
              ];
            } else {
              return prev.map(m => m.id === data.store.id ? {
                ...m,
                name: data.store.store_name,
                active: data.store.status === 'active',
                subdomain: data.store.subdomain,
                bankName: data.store.bank_name || m.bankName,
                bankAccountName: data.store.account_name || m.bankAccountName,
                bankAccountNumber: data.store.account_no || m.bankAccountNumber
              } : m);
            }
          });
        }

        return { success: true };
      } else {
        return { success: false, message: data.message || 'Invalid credentials. Please try again.' };
      }
    } catch (err) {
      console.error('Database authentication fetch error:', err.message);
      // Fallback for mock login credentials in case database is offline or during testing
      if (email === 'admin@gmil.com' && password === 'admin1234') {
        setUser({ role: 'admin', email });
        setStore(null);
        return { success: true };
      }
      return { success: false, message: 'Connection failed. Please ensure the backend server is running.' };
    }
  };

  const googleLogin = async (idToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/google-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ idToken })
      });

      const data = await response.json();

      if (response.ok) {
        if (data.status === 'requires_otp') {
          return { success: true, requiresOtp: true, message: data.message };
        }
        
        // Construct user state profile
        const sessionUser = {
          id: data.user.id,
          role: data.user.role === 'super_admin' ? 'admin' : data.user.role,
          email: data.user.email,
          name: data.user.name,
          storeId: data.store ? data.store.id : null,
          storeName: data.store ? data.store.store_name : null
        };

        setUser(sessionUser);
        setStore(data.store);

        if (data.store) {
          setMerchants(prev => {
            const exists = prev.some(m => m.id === data.store.id);
            if (!exists) {
              return [
                ...prev,
                {
                  id: data.store.id,
                  name: data.store.store_name,
                  email: data.user.email,
                  balance: parseFloat(data.store.balance) || 0.00,
                  active: data.store.status === 'active',
                  subdomain: data.store.subdomain,
                  logoUrl: null,
                  bankName: data.store.bank_name || 'Chase Bank',
                  bankAccountName: data.store.account_name || `${data.store.store_name} LLC`,
                  bankAccountNumber: data.store.account_no || '1234567890'
                }
              ];
            } else {
              return prev.map(m => m.id === data.store.id ? {
                ...m,
                name: data.store.store_name,
                active: data.store.status === 'active',
                subdomain: data.store.subdomain,
                bankName: data.store.bank_name || m.bankName,
                bankAccountName: data.store.account_name || m.bankAccountName,
                bankAccountNumber: data.store.account_no || m.bankAccountNumber
              } : m);
            }
          });
        }

        return { success: true, requiresOtp: false };
      } else {
        return { success: false, message: data.message || data.error || 'Google Login failed' };
      }
    } catch (err) {
      console.error('Google Login error:', err);
      return { success: false, message: 'Server connection error' };
    }
  };

  const googleRegister = async (idToken, code) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/google-register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken, code })
      });

      const data = await response.json();

      if (response.ok) {
        const sessionUser = {
          id: data.user.id,
          role: data.user.role === 'super_admin' ? 'admin' : data.user.role,
          email: data.user.email,
          name: data.user.name,
          storeId: null,
          storeName: null
        };

        setUser(sessionUser);
        setStore(null);

        return { success: true };
      } else {
        return { success: false, message: data.error || data.message || 'Google Registration failed' };
      }
    } catch (err) {
      console.error('Google Register error:', err);
      return { success: false, message: 'Server connection error' };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    setUser(null);
    setStore(null);
  };

  const deleteStore = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/stores/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setMerchants(prev => prev.filter(m => m.id !== id));
        setOrders(prev => prev.filter(o => o.store_id !== id));
        setProducts(prev => prev.filter(p => p.storeId !== id));
        setPromos(prev => prev.filter(p => p.storeId !== id));
        return { success: true };
      } else {
        const data = await response.json();
        return { success: false, message: data.error || 'Failed to delete store.' };
      }
    } catch (err) {
      console.error('Error deleting store:', err);
      return { success: false, message: 'Connection error' };
    }
  };

  const adminAddCredit = async (id, amount, reason) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/stores/${id}/add-credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason })
      });
      const data = await response.json();
      if (response.ok) {
        setMerchants(merchants.map(m => m.id === id ? { ...m, balance: parseFloat(data.balance) } : m));
        // If logged in as the same store, update the store object
        if (store && store.id === id) {
          setStore(s => ({ ...s, balance: parseFloat(data.balance) }));
        }
        return { success: true, balance: parseFloat(data.balance) };
      } else {
        return { success: false, message: data.error };
      }
    } catch (err) {
      console.error('Error adding credit:', err);
      return { success: false, message: 'Connection error' };
    }
  };

  const adminDeduct = async (id, amount, reason) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/stores/${id}/deduct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason })
      });
      const data = await response.json();
      if (response.ok) {
        setMerchants(merchants.map(m => m.id === id ? { ...m, balance: parseFloat(data.balance) } : m));
        // If logged in as the same store, update the store object
        if (store && store.id === id) {
          setStore(s => ({ ...s, balance: parseFloat(data.balance) }));
        }
        return { success: true, balance: parseFloat(data.balance) };
      } else {
        return { success: false, message: data.error };
      }
    } catch (err) {
      console.error('Error deducting credit:', err);
      return { success: false, message: 'Connection error' };
    }
  };

  const fetchTransactions = async (storeId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/stores/${storeId}/transactions`);
      if (response.ok) {
        const data = await response.json();
        return data.transactions || [];
      }
      return [];
    } catch (err) {
      console.error('Error fetching transactions:', err);
      return [];
    }
  };

  const fetchGlobalTransactions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/transactions`);
      if (response.ok) {
        const data = await response.json();
        setLedger((data.transactions || []).map(t => ({
          id: `TXN-${t.id}`,
          date: new Date(t.created_at).toLocaleString(),
          storeName: t.store_name,
          transaction_type: t.transaction_type,
          amount: parseFloat(t.amount),
          reason: t.reason,
          status: 'completed'
        })));
        return data.transactions;
      }
      return [];
    } catch (err) {
      console.error('Error fetching global transactions:', err);
      return [];
    }
  };

  const fetchMerchantOrders = async (storeId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/merchant/orders?store_id=${storeId}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        return data.orders || [];
      }
      return [];
    } catch (err) {
      console.error('Error fetching merchant orders:', err);
      return [];
    }
  };

  const updateOrderStatus = async (orderId, storeId, status, isTopup = false) => {
    try {
      let url = `${API_BASE_URL}/api/merchant/orders/${orderId}/status`;
      let body = { store_id: storeId, status };
      let method = 'PUT';
      
      if (isTopup) {
         url = `${API_BASE_URL}/api/merchant/topups/orders/${orderId}/${status === 'approved' ? 'approve' : 'reject'}`;
         body = { store_id: storeId };
         method = 'POST';
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (response.ok && (data.success || data.order)) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: data.status || status } : o));
        return { success: true };
      }
      return { success: false, message: data.error || 'Update failed' };
    } catch (err) {
      console.error('Error updating order status:', err);
      return { success: false, message: 'Connection error' };
    }
  };

  const updateStoreLogo = (storeId, logoUrl) => {
    setMerchants(prev => prev.map(m => m.id === storeId ? { ...m, logoUrl } : m));
    setStore(prev => prev && prev.id === storeId ? { ...prev, logo_url: logoUrl } : prev);
  };

  const updateCategoryLogo = (categoryId, logoUrl) => {
    setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, logoUrl } : c));
  };

  const toggleStoreActive = async (storeId) => {
    const merchant = merchants.find(m => m.id === storeId);
    if (!merchant) return;
    const newStatus = merchant.active ? 'suspended' : 'active';
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/stores/${storeId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        setMerchants(prev => prev.map(m => m.id === storeId ? { ...m, active: newStatus === 'active', status: newStatus } : m));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update store status');
      }
    } catch (err) {
      console.error('Error toggling store status:', err);
      alert('Connection error');
    }
  };

  const updateMerchantBanking = (storeId, bankDetails) => {
    setMerchants(prev => prev.map(m => m.id === storeId ? { ...m, ...bankDetails } : m));
    setStore(prev => prev && prev.id === storeId ? {
      ...prev,
      bank_name: bankDetails.bankName !== undefined ? bankDetails.bankName : prev.bank_name,
      account_name: bankDetails.bankAccountName !== undefined ? bankDetails.bankAccountName : prev.account_name,
      account_no: bankDetails.bankAccountNumber !== undefined ? bankDetails.bankAccountNumber : prev.account_no
    } : prev);
  };

  const fetchAllStoresAdmin = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/stores`);
      if (response.ok) {
        const data = await response.json();
        const liveStores = (data.stores || data || []).map(store => ({
          ...store,
          id: store.id,
          name: store.store_name || store.name,
          email: store.email,
          balance: parseFloat(store.balance) || 0.00,
          active: store.status === 'active',
          status: store.status,
          subdomain: store.subdomain,
          logoUrl: store.logo_url || store.logoUrl || null,
          bankName: store.bank_name || 'Chase Bank',
          bankAccountName: store.account_name || `${store.store_name} LLC`,
          bankAccountNumber: store.account_no || '1234567890'
        }));
        setMerchants(liveStores);
        return liveStores;
      }
      return [];
    } catch (err) {
      console.error('Error fetching all stores:', err);
      return [];
    }
  };

  // --- Platform Product Architecture API functions ---

  const fetchPlatformProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/catalog/products`);
      if (response.ok) {
        const data = await response.json();
        setPlatformProducts(data.products || []);
        return data.products || [];
      }
      return [];
    } catch (err) {
      console.error('Error fetching platform products:', err);
      return [];
    }
  };

  const createPlatformProduct = async (productData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/catalog/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      const data = await response.json();
      if (response.ok) {
        setPlatformProducts(prev => [...prev, data.product]);
        return { success: true, product: data.product };
      }
      return { success: false, message: data.error };
    } catch (err) {
      return { success: false, message: 'Connection error' };
    }
  };

  const updatePlatformProduct = async (id, productData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/catalog/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      const data = await response.json();
      if (response.ok) {
        setPlatformProducts(prev => prev.map(p => p.id === id ? data.product : p));
        return { success: true, product: data.product };
      }
      return { success: false, message: data.error };
    } catch (err) {
      return { success: false, message: 'Connection error' };
    }
  };

  const deactivatePlatformProduct = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/catalog/products/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setPlatformProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: false } : p));
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      return { success: false, message: 'Connection error' };
    }
  };

  const fetchProviders = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/catalog/providers`);
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
        return data.providers || [];
      }
      return [];
    } catch (err) {
      console.error('Error fetching providers:', err);
      return [];
    }
  };

  const fetchProviderMappings = async (productId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/catalog/products/${productId}/providers`);
      if (response.ok) {
        const data = await response.json();
        return data.mappings || [];
      }
      return [];
    } catch (err) {
      return [];
    }
  };

  const addProviderMapping = async (productId, mappingData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/catalog/products/${productId}/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mappingData)
      });
      const data = await response.json();
      return response.ok ? { success: true, mapping: data.mapping } : { success: false, message: data.error };
    } catch (err) {
      return { success: false, message: 'Connection error' };
    }
  };

  const fetchMerchantPlatformProducts = async (storeId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/merchant/products?store_id=${storeId}`);
      if (response.ok) {
        const data = await response.json();
        setMerchantPlatformProducts(data.products || []);
        return data.products || [];
      }
      return [];
    } catch (err) {
      console.error('Error fetching merchant platform products:', err);
      return [];
    }
  };

  const updateMerchantProduct = async (productId, storeId, updates) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/merchant/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId, ...updates })
      });
      const data = await response.json();
      if (response.ok) {
        setMerchantPlatformProducts(prev => prev.map(p => 
          p.id === productId ? { ...p, ...data.merchant_product, selling_price: data.merchant_product.selling_price, is_enabled: data.merchant_product.is_enabled, merchant_product_id: data.merchant_product.id } : p
        ));
        return { success: true };
      }
      return { success: false, message: data.error };
    } catch (err) {
      return { success: false, message: 'Connection error' };
    }
  };

  const fetchPendingKyc = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/kyc/pending`);
      if (response.ok) {
        const data = await response.json();
        return data.pending || [];
      }
      return [];
    } catch (err) {
      console.error('Error fetching pending KYC:', err);
      return [];
    }
  };

  const approveKyc = async (storeId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/kyc/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId })
      });
      if (response.ok) {
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error approving KYC:', err);
      return false;
    }
  };

  const rejectKyc = async (storeId, reason) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/kyc/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId, reason })
      });
      if (response.ok) {
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error rejecting KYC:', err);
      return false;
    }
  };

  return (
    <AppContext.Provider value={{
      user, store, isAuthLoading, login, googleLogin, googleRegister, logout,
      language, setLanguage,
      t,
      merchants, setMerchants, deleteStore, adminAddCredit, adminDeduct, fetchTransactions, fetchGlobalTransactions, toggleStoreActive, updateMerchantBanking,
      kycApplications, setKycApplications,
      fetchAllStoresAdmin, fetchPendingKyc, approveKyc, rejectKyc,
      categories, setCategories, updateCategoryLogo, updateStoreLogo,
      products, setProducts,
      promos, setPromos,
      orders, setOrders, fetchMerchantOrders, updateOrderStatus,
      ledger, setLedger,
      platformProducts, setPlatformProducts, fetchPlatformProducts, createPlatformProduct, updatePlatformProduct, deactivatePlatformProduct,
      providers, setProviders, fetchProviders, fetchProviderMappings, addProviderMapping,
      merchantPlatformProducts, setMerchantPlatformProducts, fetchMerchantPlatformProducts, updateMerchantProduct
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);

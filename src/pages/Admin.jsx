import React, { useState } from 'react';
import { LayoutDashboard, Users, Database, LogOut, Package, Store, Image as ImageIcon, Trash2, ArrowUpRight, ArrowDownRight, Activity, Tag, Percent, UploadCloud, Settings, CreditCard, ShieldCheck, FileText, Menu, X, ChevronRight, Edit2, Crown, Check, Banknote, Palette, Loader2 } from 'lucide-react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { useAppContext } from '../context/AppContext';
import KoaraLogo from '../assets/koara-logo.svg';
import PaymentProviderModal from '../components/PaymentProviderModal';
import CryptoPaymentModal from '../components/CryptoPaymentModal';
import LocalBankTransferModal from '../components/LocalBankTransferModal';
import SubscriptionPaymentModal from '../components/SubscriptionPaymentModal';
import MerchantWithdrawalModal from '../components/modals/MerchantWithdrawalModal';
import MerchantCustomizationTab from '../components/MerchantCustomizationTab';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// ── Shared sub-components ──────────────────────────────────────────────

const SectionHeader = ({ title, description, action }) => (
  <div className="px-6 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
    <div>
      <h3 className="font-semibold text-white text-sm">{title}</h3>
      {description && <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{description}</p>}
    </div>
    {action}
  </div>
);

const StatCard = ({ label, value, sub }) => (
  <div className="dash-card p-6">
    <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#475569' }}>{label}</div>
    <div className="text-3xl font-extrabold text-white tracking-tight">{value}</div>
    {sub && <div className="text-xs mt-2" style={{ color: '#94A3B8' }}>{sub}</div>}
  </div>
);

const StatusBadge = ({ status }) => {
  const map = {
    active:    'koara-badge-active',
    approved:  'koara-badge-approved',
    delivered: 'koara-badge-delivered',
    completed: 'koara-badge-completed',
    pending:   'koara-badge-pending',
    pending_kyc: 'koara-badge-pending',
    pending_approval: 'koara-badge-pending',
    rejected:  'koara-badge-rejected',
    failed:    'koara-badge-failed',
    suspended: 'koara-badge-suspended',
    processing:'koara-badge-processing',
    inactive:  'koara-badge-inactive',
  };
  const cls = map[status?.toLowerCase()] || 'koara-badge-inactive';
  const labels = {
    active: 'Active', approved: 'Approved', delivered: 'Delivered', completed: 'Completed',
    pending: 'Pending', pending_kyc: 'Pending KYC', pending_approval: 'Pending',
    rejected: 'Rejected', failed: 'Failed', suspended: 'Suspended', processing: 'Processing',
    inactive: 'Inactive',
  };
  return <span className={`koara-badge ${cls}`}>{labels[status?.toLowerCase()] || status}</span>;
};

const Toggle = ({ on, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    className="koara-toggle"
    data-on={on ? 'true' : 'false'}
    style={{ background: on ? '#2563EB' : 'rgba(255,255,255,0.12)' }}
  >
    <span className="koara-toggle-thumb" style={{ transform: on ? 'translateX(19px)' : 'translateX(3px)' }} />
  </button>
);

const PremiumLockOverlay = ({ isPlusActive, onUpgrade, children, compact = false }) => {
  if (isPlusActive) {
    return <div className="relative h-full">
      <div className="absolute top-2 right-2 z-10 pointer-events-none">
        <div className="flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow-sm">
          <Crown size={10} /> PLUS
        </div>
      </div>
      {children}
    </div>;
  }
  return (
    <div className="relative rounded-xl overflow-hidden group h-full">
      <div className="opacity-40 pointer-events-none blur-[1px] select-none h-full">
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center" style={{ background: 'rgba(2, 6, 23, 0.6)', backdropFilter: 'blur(3px)' }}>
        <div className="flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow-sm mb-3">
          <Crown size={10} /> PLUS
        </div>
        {!compact && <div className="text-sm font-semibold text-white mb-1">Upgrade to Koara Plus to unlock this feature.</div>}
        <button onClick={onUpgrade} className="dash-btn py-1.5 px-4 rounded-lg text-xs font-bold text-white shadow-lg mt-2 transition-transform hover:scale-105" style={{ background: 'linear-gradient(135deg, #2563EB, #4F46E5)' }}>
          Upgrade
        </button>
      </div>
    </div>
  );
};

// ── AdminDashboard ──────────────────────────────────────────────────────

const AdminDashboard = () => {
  const { user, isAuthLoading, store, logout, t, language, setLanguage, merchants, deleteStore, adminAddCredit, adminDeduct, fetchTransactions, fetchGlobalTransactions, kycApplications, setKycApplications, fetchAllStoresAdmin, fetchPendingKyc, approveKyc, rejectKyc, products, setProducts, promos, setPromos, orders, setOrders, fetchMerchantOrders, updateOrderStatus, ledger, categories, setCategories, updateCategoryLogo, updateStoreLogo, toggleStoreActive, updateMerchantBanking, platformProducts, fetchPlatformProducts, createPlatformProduct, updatePlatformProduct, deactivatePlatformProduct, providers, fetchProviders, fetchProviderMappings, addProviderMapping, merchantPlatformProducts, fetchMerchantPlatformProducts, updateMerchantProduct, subscription, isPlusActive, upgradeSubscription, fetchSubscription, adminWithdrawals, fetchAdminWithdrawals, approveWithdrawal, rejectWithdrawal, syncWalletBalance } = useAppContext();

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [kycPendingLoading, setKycPendingLoading] = useState(false);
  const [customizingProduct, setCustomizingProduct] = useState(null);

  // Modals
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [balanceModal, setBalanceModal] = useState({ isOpen: false, type: '', storeId: null, amount: 0, error: '' });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, storeId: null, storeName: '' });
  const [merchantActionModal, setMerchantActionModal] = useState({ isOpen: false, type: '', amount: 0 });
  const [providerModal, setProviderModal] = useState({ isOpen: false, amount: 0 });
  const [cryptoModal, setCryptoModal] = useState({ isOpen: false, amount: 0 });
  const [localBankModal, setLocalBankModal] = useState({ isOpen: false, amount: 0 });
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [selectedKyc, setSelectedKyc] = useState(null);
  const [rejectKycModal, setRejectKycModal] = useState({ isOpen: false, storeId: null });
  const [rejectReason, setRejectReason] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedCategoryId, setExpandedCategoryId] = useState(null);

  // Catalog management state (admin)
  const [catalogCreateModal, setCatalogCreateModal] = useState(false);
  const [catalogEditModal, setCatalogEditModal] = useState({ isOpen: false, product: null });
  const [catalogProviderModal, setCatalogProviderModal] = useState({ isOpen: false, productId: null, productName: '', mappings: [] });
  const [newProduct, setNewProduct] = useState({ name: '', category: '', description: '' });
  const [newMapping, setNewMapping] = useState({ provider_id: '', provider_product_id: '', cost_price: '' });

  // Merchant price editing
  const [editingMerchantPrice, setEditingMerchantPrice] = useState({});

  // Merchant Top-ups
  const [merchantTopups, setMerchantTopups] = useState([]);
  const [topupsLoading, setTopupsLoading] = useState(false);
  const [editingTopupPrice, setEditingTopupPrice] = useState({});

  // Withdrawals
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [withdrawalProcessingId, setWithdrawalProcessingId] = useState(null);
  const [withdrawalsSearch, setWithdrawalsSearch] = useState('');

  // Promotions
  const [promotions, setPromotions] = useState([]);
  const [promotionsLoading, setPromotionsLoading] = useState(false);
  const [promoModal, setPromoModal] = useState({ isOpen: false, promoId: null, code: '', discount_type: 'percentage', value: '', usage_limit: '', status: 'active' });

  // Subscription
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [subscriptionPaymentOpen, setSubscriptionPaymentOpen] = useState(false);
  const [upgradeMethod, setUpgradeMethod] = useState('wallet');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [billingHistory, setBillingHistory] = useState([]);

  // Wait for the session check (/api/auth/me) to finish before deciding the user
  // is logged out. Without this, `user` is still null on the very first render
  // after a hard refresh (the cookie hasn't been verified yet), and this used to
  // redirect a perfectly-logged-in merchant straight back to "/".
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-koara-blue animate-spin mb-3" />
        <p className="text-slate-500 text-sm font-medium tracking-wide">Restoring your session...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/" />;

  const role = user.role;
  const storeId = user.storeId;
  const merchantObj = merchants.find(m => m.id === storeId) || {};

  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  React.useEffect(() => {
    const activeStore = store || merchantObj;
    if (activeStore) {
      setBankName(activeStore.bank_name || activeStore.bankName || '');
      setBankAccountName(activeStore.account_name || activeStore.bankAccountName || '');
      setBankAccountNumber(activeStore.account_no || activeStore.bankAccountNumber || '');
    }
  }, [store, merchantObj.bankName, merchantObj.bankAccountName, merchantObj.bankAccountNumber]);

  React.useEffect(() => {
    if (role === 'admin') {
      const loadDashboardData = async () => {
        if (activeTab === 'kyc') {
          setKycPendingLoading(true);
          fetchPendingKyc().then(result => {
            const liveData = result.pending || result || [];
            setKycApplications(liveData);
            setKycPendingLoading(false);
          }).catch(err => {
            console.error(err);
            setKycPendingLoading(false);
          });
        }
        if (activeTab === 'merchants' || activeTab === 'dashboard' || activeTab === 'kyc') {
          fetchAllStoresAdmin().catch(console.error);
        }
        if (activeTab === 'ledger' || activeTab === 'dashboard') {
          fetchGlobalTransactions().catch(console.error);
        }
        if (activeTab === 'catalog') {
          fetchPlatformProducts().catch(console.error);
          fetchProviders().catch(console.error);
        }
        if (activeTab === 'withdrawals') {
          setWithdrawalsLoading(true);
          fetchAdminWithdrawals()
            .catch(console.error)
            .finally(() => setWithdrawalsLoading(false));
        }
      };
      loadDashboardData();
    }
  }, [activeTab, role]);

  React.useEffect(() => {
    if (role === 'merchant' && storeId) {
      syncWalletBalance(storeId);
      if (activeTab === 'products') {
        fetchMerchantPlatformProducts(storeId).catch(console.error);
      }
      if (activeTab === 'topups') {
        setTopupsLoading(true);
        fetch(`${API_BASE_URL}/api/merchant/topups?store_id=${storeId}`, { credentials: 'include' })
          .then(r => r.json())
          .then(data => { if(data.success) setMerchantTopups(data.topups); })
          .catch(console.error)
          .finally(() => setTopupsLoading(false));
      }
      if (activeTab === 'orders') {
        fetchMerchantOrders(storeId).catch(console.error);
      }
      if (activeTab === 'subscription') {
        fetch(`${import.meta.env.VITE_API_URL}/api/subscription/history`, { credentials: 'include' })
          .then(res => res.json())
          .then(data => setBillingHistory(data))
          .catch(console.error);
      }
      if (activeTab === 'promotions' && isPlusActive) {
        fetchMerchantPromotions();
      }
    }
  }, [activeTab, role, storeId, isPlusActive, syncWalletBalance]);

  const fetchMerchantPromotions = async () => {
    setPromotionsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/merchant/promotions`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setPromotions(data.promotions);
      }
    } catch (err) {
      console.error('Failed to fetch promotions', err);
    } finally {
      setPromotionsLoading(false);
    }
  };

  const handleSavePaymentSettings = (e) => {
    e.preventDefault();
    setIsSavingBank(true);
    setSaveSuccess(false);
    setTimeout(() => {
      updateMerchantBanking(storeId, { bankName, bankAccountName, bankAccountNumber });
      setIsSavingBank(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 800);
  };

  const handleToggleCategory = (id) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
  };

  const handleToggleProduct = (id) => {
    setProducts(products.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  const handleUpdateProduct = (id, field, value) => {
    setProducts(products.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleTogglePromo = async (id) => {
    const promo = promotions.find(p => p.id === id);
    if (!promo) return;
    
    const newStatus = promo.status === 'active' ? 'inactive' : 'active';
    setPromotions(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/merchant/promotions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!data.success) {
        // revert
        setPromotions(prev => prev.map(p => p.id === id ? { ...p, status: promo.status } : p));
        alert('Failed to update promo status');
      }
    } catch (err) {
      setPromotions(prev => prev.map(p => p.id === id ? { ...p, status: promo.status } : p));
    }
  };

  const handleSavePromo = async (e) => {
    e.preventDefault();
    try {
      const url = promoModal.promoId 
        ? `${API_BASE_URL}/api/merchant/promotions/${promoModal.promoId}`
        : `${API_BASE_URL}/api/merchant/promotions`;
      
      const method = promoModal.promoId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          code: promoModal.code,
          discount_type: promoModal.discount_type,
          value: parseFloat(promoModal.value),
          usage_limit: promoModal.usage_limit ? parseInt(promoModal.usage_limit, 10) : null,
          status: promoModal.status
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setPromoModal({ isOpen: false, promoId: null, code: '', discount_type: 'percentage', value: '', usage_limit: '', status: 'active' });
        fetchMerchantPromotions();
      } else {
        alert(data.error || 'Failed to save promo');
      }
    } catch (err) {
      alert('Network error while saving promo');
    }
  };

  const handleDeletePromo = async (id) => {
    if (!window.confirm('Are you sure you want to delete this promo code?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/merchant/promotions/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        fetchMerchantPromotions();
      } else {
        alert(data.error || 'Failed to delete promo');
      }
    } catch (err) {
      alert('Network error while deleting promo');
    }
  };

  const handleProcessOrder = async (id, action, isTopup = false) => {
    const res = await updateOrderStatus(id, storeId, action, isTopup);
    if (res.success) {
      setSelectedReceipt(null);
      syncWalletBalance(storeId);
    } else {
      alert(res.message);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleAdminBalanceUpdate = async (e) => {
    e.preventDefault();
    setBalanceModal(prev => ({ ...prev, error: '' }));
    const amount = Number(balanceModal.amount);
    let result;
    if (balanceModal.type === 'add') {
      result = await adminAddCredit(balanceModal.storeId, amount, 'Admin Manual Credit');
    } else {
      result = await adminDeduct(balanceModal.storeId, amount, 'Admin Manual Debit');
    }
    if (result.success) {
      setBalanceModal({ isOpen: false, type: '', storeId: null, amount: 0, error: '' });
      if (activeTab === 'merchants' || activeTab === 'dashboard') fetchAllStoresAdmin();
      if (activeTab === 'ledger' || activeTab === 'dashboard') fetchGlobalTransactions();
    } else {
      setBalanceModal(prev => ({ ...prev, error: result.message }));
    }
  };

  const handleMerchantAction = (e) => {
    e.preventDefault();
    if (merchantActionModal.type === 'add') {
      const amount = merchantActionModal.amount;
      setMerchantActionModal({ isOpen: false, type: '', amount: 0 });
      setProviderModal({ isOpen: true, amount });
    } else {
      setTimeout(() => {
        alert(`Request to ${merchantActionModal.type} $${merchantActionModal.amount} submitted to admin.`);
        setMerchantActionModal({ isOpen: false, type: '', amount: 0 });
      }, 500);
    }
  };

  const handleApproveKyc = async (storeId) => {
    const success = await approveKyc(storeId);
    if (success) {
      alert('Application approved successfully!');
      fetchPendingKyc().then(data => setKycApplications(data || []));
      fetchAllStoresAdmin();
    } else {
      alert('Failed to approve application.');
    }
  };

  const handleRejectKycSubmit = async (e) => {
    if (e) e.preventDefault();
    const success = await rejectKyc(rejectKycModal.storeId, rejectReason);
    if (success) {
      alert('Application rejected successfully.');
      setRejectKycModal({ isOpen: false, storeId: null });
      setRejectReason('');
      fetchPendingKyc().then(data => setKycApplications(data || []));
    } else {
      alert('Failed to reject application.');
    }
  };

  // ── Suspended State ──
  if (role === 'merchant' && store?.status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#020617' }}>
        <div className="max-w-md w-full rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <ShieldCheck size={28} style={{ color: '#f87171' }} />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Store Suspended</h1>
          <p className="text-sm mb-8 leading-relaxed" style={{ color: '#64748B' }}>
            Your store has been temporarily suspended by the administration team.
            If you believe this is a mistake, please contact support for assistance.
          </p>
          <div className="space-y-3">
            <button className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-colors" style={{ background: 'linear-gradient(135deg,#2563EB,#3B82F6)' }}>
              Contact Support
            </button>
            <button onClick={logout} className="w-full py-3 rounded-xl text-sm font-semibold transition-colors" style={{ background: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Nav items ──
  const adminNavItems = [
    { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { key: 'merchants', icon: Users, label: 'Store Management' },
    { key: 'ledger', icon: Database, label: 'Global Ledger' },
    { key: 'withdrawals', icon: Banknote, label: 'Withdrawals' },
    { key: 'kyc', icon: ShieldCheck, label: 'KYC Requests' },
    { key: 'catalog', icon: Package, label: 'Product Catalog' },
  ];

  const merchantNavItems = [
    { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { key: 'products', icon: Package, label: 'Gift Cards' },
    { key: 'topups', icon: Package, label: 'Direct Top-ups' },
    { key: 'promotions', icon: Tag, label: 'Promotions' },
    { key: 'customization', icon: Palette, label: 'Store Customization' },
    { key: 'settings', icon: Settings, label: 'Store Settings' },
    { key: 'payouts', icon: CreditCard, label: 'Payment Details' },
    { key: 'subscription', icon: Crown, label: 'Subscription' },
  ];

  const navItems = role === 'admin' ? adminNavItems : merchantNavItems;

  const handleAdminWithdrawalApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this withdrawal? Ensure you have sent the funds manually.')) return;
    setWithdrawalProcessingId(id);
    const res = await approveWithdrawal(id);
    if (!res.success) alert(res.message || 'Failed to approve withdrawal');
    setWithdrawalProcessingId(null);
  };

  const handleAdminWithdrawalReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this withdrawal? Funds will be refunded to the merchant wallet.')) return;
    setWithdrawalProcessingId(id);
    const res = await rejectWithdrawal(id);
    if (!res.success) alert(res.message || 'Failed to reject withdrawal');
    setWithdrawalProcessingId(null);
  };

  const filteredAdminWithdrawals = adminWithdrawals?.filter(w => {
    if (!withdrawalsSearch) return true;
    const q = withdrawalsSearch.toLowerCase();
    return (
      w.store_name?.toLowerCase().includes(q) ||
      w.bank_name?.toLowerCase().includes(q) ||
      w.bank_holder_name?.toLowerCase().includes(q) ||
      w.account_number?.toLowerCase().includes(q)
    );
  }) || [];

  // ── Main Render ──
  const handleUpgrade = async () => {
    setIsUpgrading(true);
    setUpgradeError('');
    try {
      if (upgradeMethod === 'wallet') {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/subscription/upgrade/wallet`, {
          method: 'POST',
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
          await syncWalletBalance(storeId);
          fetchSubscription();
          setUpgradeModalOpen(false);
          setUpgradeSuccess(true);
        } else {
          setUpgradeError(data.message || 'Upgrade failed');
        }
      } else if (upgradeMethod === 'crypto') {
        setUpgradeModalOpen(false);
        setSubscriptionPaymentOpen(true);
      }
    } catch (e) {
      setUpgradeError(e.message || 'Network error');
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#020617' }}>

      {/* ── Mobile sidebar overlay ── */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`w-60 koara-sidebar flex flex-col fixed md:relative z-40 h-full transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-5 shrink-0 justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5">
            <img src={KoaraLogo} alt="Koara" className="h-6 w-auto" />
            <div>
              <div className="font-bold text-sm text-white leading-none">Koara</div>
              <div className="text-[10px] mt-0.5" style={{ color: '#475569' }}>
                {role === 'admin' ? 'Super Admin' : (store?.store_name || 'Dashboard')}
              </div>
            </div>
          </div>
          <button className="md:hidden text-slate-500 hover:text-white transition-colors" onClick={() => setIsSidebarOpen(false)}>
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-none">
          {navItems.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setIsSidebarOpen(false); syncWalletBalance(); }}
              className={`koara-sidebar-nav-item ${activeTab === key ? 'active' : ''}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}

          {role === 'merchant' && (
            <Link
              to="/store"
              className="koara-sidebar-nav-item mt-2 pt-4"
              style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Store size={16} />
              View Storefront
            </Link>
          )}
        </nav>

        {/* User + Logout */}
        <div className="p-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-3 py-2 mb-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="text-xs font-medium text-white truncate">{user.email}</div>
            <div className="text-[10px] mt-0.5 capitalize" style={{ color: '#475569' }}>{role}</div>
          </div>
          <button
            onClick={handleLogout}
            className="koara-sidebar-nav-item w-full text-left"
            style={{ color: '#ef4444' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <LogOut size={16} />
            {t('logout')}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Top Header */}
        <header className="koara-dash-header h-14 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-slate-500 hover:text-white transition-colors" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <h2 className="font-semibold text-white text-sm capitalize">
              {navItems.find(n => n.key === activeTab)?.label || activeTab}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="text-xs font-bold transition-colors px-2.5 py-1.5 rounded-lg"
              style={{ color: '#94A3B8', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {language === 'en' ? 'AR' : 'EN'}
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-none">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* ══ ADMIN: Dashboard ══ */}
            {role === 'admin' && activeTab === 'dashboard' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard label="Total Stores" value={merchants.length} sub="All registered merchants" />
                  <StatCard label="Platform Ledger" value={`$${merchants.reduce((acc, m) => acc + m.balance, 0).toFixed(2)}`} sub="Combined wallet balance" />
                  <StatCard label="Total Transactions" value={ledger.length} sub="All time" />
                </div>

                {/* Recent transactions preview on dashboard */}
                <div className="dash-card overflow-hidden">
                  <SectionHeader title="Recent Transactions" description="Live platform ledger activity" />
                  <div className="overflow-x-auto">
                    <table className="koara-table">
                      <thead>
                        <tr>
                          <th>TXN ID</th>
                          <th>Date</th>
                          <th>Store</th>
                          <th>Type</th>
                          <th className="text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledger.slice(0, 8).map(txn => (
                          <tr key={txn.id}>
                            <td className="cell-mono">{txn.id}</td>
                            <td>{txn.date}</td>
                            <td className="cell-primary">{txn.storeName}</td>
                            <td>
                              <StatusBadge status={txn.transaction_type === 'credit' ? 'approved' : 'rejected'} />
                            </td>
                            <td className="text-right font-mono font-semibold" dir="ltr" style={{ color: txn.transaction_type === 'credit' ? '#4ade80' : '#f87171' }}>
                              {txn.transaction_type === 'credit' ? '+' : '-'}{txn.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        {ledger.length === 0 && (
                          <tr><td colSpan="5"><div className="koara-empty-state"><Activity size={32} /><span>No transactions yet.</span></div></td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ══ ADMIN: KYC ══ */}
            {role === 'admin' && activeTab === 'kyc' && (
              <div className="dash-card overflow-hidden">
                <SectionHeader
                  title="Pending KYC Applications"
                  action={<span className="koara-badge koara-badge-pending">Action Required</span>}
                />
                <div className="overflow-x-auto">
                  <table className="koara-table">
                    <thead>
                      <tr>
                        <th>Store Details</th>
                        <th>Applicant Info</th>
                        <th>Bank Information</th>
                        <th>Document</th>
                        <th>Status</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kycPendingLoading ? (
                        <tr><td colSpan="6"><div className="koara-empty-state"><div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /><span>Loading live requests...</span></div></td></tr>
                      ) : (kycApplications || []).length === 0 ? (
                        <tr><td colSpan="6"><div className="koara-empty-state"><ShieldCheck size={32} /><span>No pending applications found.</span></div></td></tr>
                      ) : (kycApplications || []).map(app => (
                        <tr key={app.id}>
                          <td className="cell-primary">{app.storeName}</td>
                          <td>
                            <div className="font-medium text-white text-sm">{app.applicant}</div>
                            <div className="text-xs" style={{ color: '#475569' }}>{app.email}</div>
                          </td>
                          <td>
                            <div className="text-xs space-y-0.5">
                              <div><span className="font-semibold text-white">Bank:</span> <span style={{ color: '#94A3B8' }}>{app.bank_name}</span></div>
                              <div><span className="font-semibold text-white">Name:</span> <span style={{ color: '#94A3B8' }}>{app.account_holder_name}</span></div>
                              <div><span className="font-semibold text-white">No:</span> <span style={{ color: '#94A3B8' }} dir="ltr">{app.account_number}</span></div>
                            </div>
                          </td>
                          <td>
                            {app.kyc_document_url ? (
                              <button
                                onClick={() => setSelectedKyc(app)}
                                className="dash-btn dash-btn-secondary"
                              >
                                <FileText size={13} /> View Doc
                              </button>
                            ) : (
                              <span style={{ color: '#475569', fontSize: '0.75rem' }}>N/A</span>
                            )}
                          </td>
                          <td><StatusBadge status={app.status} /></td>
                          <td className="text-right">
                            {app.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <button onClick={() => handleApproveKyc(app.id)} className="dash-btn dash-btn-success">Approve</button>
                                <button onClick={() => setRejectKycModal({ isOpen: true, storeId: app.id })} className="dash-btn dash-btn-danger">Reject</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ══ ADMIN: Merchants ══ */}
            {role === 'admin' && activeTab === 'merchants' && (
              <div className="dash-card overflow-hidden">
                <SectionHeader title="Store Management & Governance" />
                <div className="overflow-x-auto">
                  <table className="koara-table">
                    <thead>
                      <tr>
                        <th>Active</th>
                        <th>Store</th>
                        <th>Email</th>
                        <th>Wallet</th>
                        <th>Status</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(merchants || []).length === 0 ? (
                        <tr><td colSpan="6"><div className="koara-empty-state"><Users size={32} /><span>No stores found.</span></div></td></tr>
                      ) : (merchants || []).map(merchant => (
                        <tr key={merchant.id}>
                          <td>
                            <Toggle on={merchant.active} onChange={() => toggleStoreActive(merchant.id)} />
                          </td>
                          <td className="cell-primary">{merchant.name}</td>
                          <td style={{ color: '#94A3B8' }}>{merchant.email}</td>
                          <td className="font-mono font-semibold text-white" dir="ltr">${merchant.balance.toFixed(2)}</td>
                          <td>
                            <StatusBadge status={
                              merchant.status === 'active' || (merchant.active && !merchant.status) ? 'active'
                              : merchant.status === 'pending_kyc' || merchant.status === 'pending_approval' || merchant.status === 'pending' ? 'pending'
                              : merchant.status === 'rejected' ? 'rejected'
                              : 'suspended'
                            } />
                          </td>
                          <td className="text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setBalanceModal({ isOpen: true, type: 'add', storeId: merchant.id, amount: '' })} className="dash-btn dash-btn-success">
                                <ArrowUpRight size={13} /> Add
                              </button>
                              <button onClick={() => setBalanceModal({ isOpen: true, type: 'deduct', storeId: merchant.id, amount: '' })} className="dash-btn dash-btn-warning">
                                <ArrowDownRight size={13} /> Deduct
                              </button>
                              <button onClick={() => setDeleteModal({ isOpen: true, storeId: merchant.id, storeName: merchant.name })} className="dash-btn dash-btn-danger">
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ══ ADMIN: Ledger ══ */}
            {role === 'admin' && activeTab === 'ledger' && (
              <div className="dash-card overflow-hidden">
                <SectionHeader title="Global Ledger & Transactions" />
                <div className="overflow-x-auto">
                  <table className="koara-table">
                    <thead>
                      <tr>
                        <th>TXN ID</th>
                        <th>Date</th>
                        <th>Store</th>
                        <th>Type</th>
                        <th className="text-right">Amount</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.length === 0 ? (
                        <tr><td colSpan="6"><div className="koara-empty-state"><Database size={32} /><span>No transactions yet.</span></div></td></tr>
                      ) : ledger.map(txn => (
                        <tr key={txn.id}>
                          <td className="cell-mono">{txn.id}</td>
                          <td style={{ color: '#64748B' }}>{txn.date}</td>
                          <td className="cell-primary">{txn.storeName}</td>
                          <td>
                            <StatusBadge status={txn.transaction_type === 'credit' ? 'approved' : 'rejected'} />
                          </td>
                          <td className="text-right font-mono font-semibold" dir="ltr" style={{ color: txn.transaction_type === 'credit' ? '#4ade80' : '#f87171' }}>
                            {txn.transaction_type === 'credit' ? '+' : '-'}{txn.amount.toFixed(2)}
                          </td>
                          <td className="max-w-[180px] truncate" style={{ color: '#64748B' }} title={txn.reason}>{txn.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ══ ADMIN: Withdrawals ══ */}
            {role === 'admin' && activeTab === 'withdrawals' && (
              <div className="space-y-6">
                <div className="dash-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Banknote className="text-blue-400" />
                      Manual Withdrawals
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">Review and process merchant withdrawal requests.</p>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <input 
                        type="text" 
                        placeholder="Search store, bank..." 
                        value={withdrawalsSearch}
                        onChange={(e) => setWithdrawalsSearch(e.target.value)}
                        className="koara-input text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="dash-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="koara-table">
                      <thead>
                        <tr>
                          <th>Request ID</th>
                          <th>Store</th>
                          <th>Bank Details</th>
                          <th className="text-right">Amount</th>
                          <th className="text-center">Status</th>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {withdrawalsLoading && adminWithdrawals.length === 0 ? (
                          <tr><td colSpan="6"><div className="koara-empty-state"><Activity size={32} /><span>Loading withdrawals...</span></div></td></tr>
                        ) : filteredAdminWithdrawals.length === 0 ? (
                          <tr><td colSpan="6"><div className="koara-empty-state"><Banknote size={32} /><span>No withdrawal requests found.</span></div></td></tr>
                        ) : filteredAdminWithdrawals.map(w => (
                          <tr key={w.id}>
                            <td className="cell-mono text-xs" style={{ color: '#64748B' }}>#{w.id}</td>
                            <td>
                              <div className="font-semibold text-white">{w.store_name}</div>
                              <div className="text-xs text-slate-400">{new Date(w.created_at).toLocaleString()}</div>
                            </td>
                            <td>
                              <div className="font-medium text-white">{w.bank_name}</div>
                              <div className="text-xs text-slate-400">{w.bank_holder_name}</div>
                              <div className="text-xs text-slate-500 font-mono mt-0.5">{w.account_number}</div>
                            </td>
                            <td className="text-right font-mono font-semibold text-white" dir="ltr">
                              ${parseFloat(w.amount).toFixed(2)}
                            </td>
                            <td className="text-center">
                              {w.status === 'pending' && <span className="koara-badge koara-badge-pending">Pending</span>}
                              {w.status === 'approved' && <span className="koara-badge koara-badge-approved">Approved</span>}
                              {w.status === 'rejected' && <span className="koara-badge koara-badge-rejected">Rejected</span>}
                            </td>
                            <td className="text-right">
                              {w.status === 'pending' ? (
                                <div className="flex items-center justify-end gap-2">
                                  <button onClick={() => handleAdminWithdrawalApprove(w.id)} disabled={withdrawalProcessingId !== null} className="dash-btn dash-btn-primary py-1.5 px-3 text-xs">Approve</button>
                                  <button onClick={() => handleAdminWithdrawalReject(w.id)} disabled={withdrawalProcessingId !== null} className="dash-btn dash-btn-secondary py-1.5 px-3 text-xs" style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)' }}>Reject</button>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-500">{new Date(w.processed_at).toLocaleDateString()}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ══ ADMIN: Catalog ══ */}
            {role === 'admin' && activeTab === 'catalog' && (
              <>
                <div className="dash-card overflow-hidden">
                  <SectionHeader
                    title="Platform Product Catalog"
                    action={
                      <button
                        onClick={() => { setNewProduct({ name: '', category: '', description: '' }); setCatalogCreateModal(true); }}
                        className="dash-btn dash-btn-primary"
                      >
                        + New Product
                      </button>
                    }
                  />
                  <div className="overflow-x-auto">
                    <table className="koara-table">
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Product Name</th>
                          <th>Category</th>
                          <th>Providers</th>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(platformProducts || []).length === 0 ? (
                          <tr><td colSpan="5"><div className="koara-empty-state"><Package size={32} /><span>No platform products yet.</span></div></td></tr>
                        ) : platformProducts.map(product => (
                          <tr key={product.id} style={{ opacity: product.is_active ? 1 : 0.5 }}>
                            <td><StatusBadge status={product.is_active ? 'active' : 'inactive'} /></td>
                            <td className="cell-primary">{product.name}</td>
                            <td style={{ color: '#94A3B8' }}>{product.category}</td>
                            <td>
                              <button
                                onClick={async () => {
                                  const mappings = await fetchProviderMappings(product.id);
                                  setCatalogProviderModal({ isOpen: true, productId: product.id, productName: product.name, mappings });
                                }}
                                className="dash-btn dash-btn-secondary"
                              >
                                Manage Providers
                              </button>
                            </td>
                            <td className="text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => setCatalogEditModal({ isOpen: true, product: { ...product } })} className="dash-btn dash-btn-secondary">Edit</button>
                                {product.is_active && (
                                  <button onClick={async () => { await deactivatePlatformProduct(product.id); }} className="dash-btn dash-btn-danger">Deactivate</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="dash-card overflow-hidden">
                  <SectionHeader title="Registered Providers" />
                  <div className="overflow-x-auto">
                    <table className="koara-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Provider Name</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(providers || []).length === 0 ? (
                          <tr><td colSpan="3"><div className="koara-empty-state"><Activity size={32} /><span>No providers registered.</span></div></td></tr>
                        ) : (providers || []).map(provider => (
                          <tr key={provider.id}>
                            <td className="cell-mono">{provider.id}</td>
                            <td className="cell-primary">{provider.name}</td>
                            <td><StatusBadge status={provider.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ══ MERCHANT: Dashboard ══ */}
            {role === 'merchant' && activeTab === 'dashboard' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Wallet Card */}
                  <div className="lg:col-span-1">
                    <div className="dash-card p-6 relative overflow-hidden">
                      {/* Blue accent bar */}
                      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg,#2563EB,#60A5FA)' }} />
                      <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#475569' }}>Live Wallet Balance</div>
                      <div className="text-4xl font-extrabold text-white tracking-tight mb-6" dir="ltr">
                        ${parseFloat(store?.balance || 0).toFixed(2)}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setMerchantActionModal({ isOpen: true, type: 'add' })} className="dash-btn dash-btn-secondary justify-center py-2.5 rounded-xl text-xs font-semibold">
                          Add Funds
                        </button>
                        <button onClick={() => setShowWithdrawalModal(true)} className="dash-btn dash-btn-primary justify-center py-2.5 rounded-xl text-xs font-semibold">
                          Withdraw
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="dash-card p-6">
                      <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#475569' }}>Store URL</div>
                      <div className="text-sm font-bold break-all" style={{ color: '#60A5FA' }}>
                        {store?.subdomain ? `${store.subdomain}.getkoara.com` : 'No store available'}
                      </div>
                    </div>
                    <div className="dash-card p-6">
                      <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#475569' }}>Pending Orders</div>
                      <div className="text-4xl font-extrabold text-white">{orders.filter(o => o.store_id === storeId && o.status === 'pending').length}</div>
                    </div>
                  </div>

                  {/* Monthly Reports (Premium Feature) */}
                  <div className="lg:col-span-3">
                    <PremiumLockOverlay isPlusActive={isPlusActive} onUpgrade={() => setUpgradeModalOpen(true)}>
                      <div className="dash-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.1)' }}>
                            <FileText size={24} style={{ color: '#60A5FA' }} />
                          </div>
                          <div>
                            <h3 className="font-bold text-white">Automatic Monthly Reports</h3>
                            <p className="text-sm" style={{ color: '#94A3B8' }}>AI-generated insights on your top products, sales trends, and profit margins.</p>
                          </div>
                        </div>
                        <button className="dash-btn dash-btn-primary shrink-0" disabled>Download Latest Report</button>
                      </div>
                    </PremiumLockOverlay>
                  </div>
                </div>

                {/* Orders Queue */}
                <div className="dash-card overflow-hidden">
                  <SectionHeader title="Incoming Orders Queue" description="Review and process pending customer orders" />
                  {orders.filter(o => o.store_id === storeId).length === 0 ? (
                    <div className="koara-empty-state">
                      <Package size={32} />
                      <span>No recent orders yet.</span>
                    </div>
                  ) : (
                    orders.filter(o => o.store_id === storeId).map(order => (
                      <div key={order.id} className="px-6 py-4 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-bold text-sm text-white">{order.order_number} — {order.product_name}</div>
                            <div className="text-xs mt-1" style={{ color: '#475569' }}>{order.customer_name} · {order.whatsapp}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-sm text-white" dir="ltr">${parseFloat(order.total_amount || 0).toFixed(2)}</span>
                            <StatusBadge status={order.status} />
                          </div>
                        </div>
                        {order.status === 'pending' && (
                          <button
                            onClick={() => setSelectedReceipt(order)}
                            className="dash-btn dash-btn-secondary"
                          >
                            <ImageIcon size={13} /> Inspect Receipt
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* ══ MERCHANT: Products ══ */}
            {role === 'merchant' && activeTab === 'products' && (
              <div className="dash-card overflow-hidden">
                <SectionHeader
                  title="Platform Products"
                  description="Enable products for your storefront and set selling prices. Only Koara admins manage the catalog."
                />
                <div className="overflow-x-auto">
                  <table className="koara-table">
                    <thead>
                      <tr>
                        <th>Enabled</th>
                        <th>Product Name</th>
                        <th>Category</th>
                        <th>Selling Price ($)</th>
                        <th className="text-right">Customize</th>
                        <th className="text-right">Save</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(merchantPlatformProducts || []).length === 0 ? (
                        <tr><td colSpan="5"><div className="koara-empty-state"><Package size={32} /><span>No products available yet.</span></div></td></tr>
                      ) : (merchantPlatformProducts || []).map(product => {
                        const merchantData = product;
                        const isEnabled = merchantData.is_enabled ?? false;
                        const currentPrice = editingMerchantPrice[product.id] ?? (product.selling_price || '');

                        return (
                          <tr key={product.id}>
                            <td>
                              <Toggle
                                on={isEnabled}
                                onChange={async () => {
                                  await updateMerchantProduct(product.id, storeId, {
                                    selling_price: parseFloat(currentPrice) || 0,
                                    is_enabled: !isEnabled
                                  });
                                  await fetchMerchantPlatformProducts(storeId);
                                }}
                              />
                            </td>
                            <td className="cell-primary">{product.name}</td>
                            <td style={{ color: '#94A3B8' }}>{product.category}</td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={currentPrice}
                                onChange={(e) => setEditingMerchantPrice(prev => ({ ...prev, [product.id]: e.target.value }))}
                                className="koara-input w-32 py-1.5 text-sm"
                                dir="ltr"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="text-right">
                              <PremiumLockOverlay isPlusActive={isPlusActive} onUpgrade={() => setUpgradeModalOpen(true)} compact>
                                <button
                                  onClick={() => {
                                    setCustomizingProduct({
                                      ...product,
                                      custom_title: product.custom_title || '',
                                      custom_description: product.custom_description || '',
                                      custom_image_url: product.custom_image_url || '',
                                      previewImage: product.custom_image_url || product.image_url || ''
                                    });
                                  }}
                                  className="dash-btn dash-btn-secondary"
                                >
                                  <Edit2 size={14} className="mr-1 inline" /> Customize
                                </button>
                              </PremiumLockOverlay>
                            </td>
                            <td className="text-right">
                              <button
                                onClick={async () => {
                                  const price = parseFloat(editingMerchantPrice[product.id] ?? product.selling_price);
                                  if (!price || price <= 0) return alert('Please enter a valid price');
                                  await updateMerchantProduct(product.id, storeId, { 
                                    selling_price: price, 
                                    is_enabled: isEnabled,
                                    custom_title: product.custom_title,
                                    custom_description: product.custom_description,
                                    custom_image_url: product.custom_image_url
                                  });
                                  setEditingMerchantPrice(prev => { const n = { ...prev }; delete n[product.id]; return n; });
                                  await fetchMerchantPlatformProducts(storeId);
                                }}
                                className="dash-btn dash-btn-primary"
                              >
                                Save
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ══ MERCHANT: Direct Top-ups ══ */}
            {role === 'merchant' && activeTab === 'topups' && (
              <div className="dash-card overflow-hidden">
                <SectionHeader
                  title="Direct Top-ups"
                  description="Enable direct game top-ups for your customers. Prices listed under Cost are charged to your wallet."
                />
                <div className="overflow-x-auto">
                  <table className="koara-table">
                    <thead>
                      <tr>
                        <th>Enabled</th>
                        <th>Product Name</th>
                        <th>Provider Cost ($)</th>
                        <th>Selling Price ($)</th>
                        <th className="text-right">Save</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topupsLoading ? (
                        <tr><td colSpan="5"><div className="koara-empty-state"><div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /><span>Loading topups...</span></div></td></tr>
                      ) : merchantTopups.length === 0 ? (
                        <tr><td colSpan="5"><div className="koara-empty-state"><Package size={32} /><span>No topups available.</span></div></td></tr>
                      ) : merchantTopups.map(topup => {
                        const currentPrice = editingTopupPrice[topup.offer_id] ?? (topup.selling_price || '');
                        return (
                          <tr key={topup.offer_id}>
                            <td>
                              <Toggle
                                on={topup.is_enabled}
                                onChange={async () => {
                                  try {
                                    await fetch(`${API_BASE_URL}/api/merchant/topups/${topup.offer_id}`, {
                                      method: 'PUT',
                                      credentials: 'include',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        store_id: storeId,
                                        selling_price: parseFloat(currentPrice) || 0,
                                        is_enabled: !topup.is_enabled
                                      })
                                    });
                                    // Reload
                                    setTopupsLoading(true);
                                    const res = await fetch(`${API_BASE_URL}/api/merchant/topups?store_id=${storeId}`, { credentials: 'include' });
                                    const data = await res.json();
                                    if (data.success) setMerchantTopups(data.topups);
                                    setTopupsLoading(false);
                                  } catch(e) {}
                                }}
                              />
                            </td>
                            <td className="cell-primary">{topup.name}</td>
                            <td className="font-mono text-sm text-slate-400">${parseFloat(topup.price_usd).toFixed(4)}</td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={currentPrice}
                                onChange={(e) => setEditingTopupPrice(prev => ({ ...prev, [topup.offer_id]: e.target.value }))}
                                className="koara-input w-32 py-1.5 text-sm"
                                dir="ltr"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="text-right">
                              <button
                                onClick={async () => {
                                  const price = parseFloat(editingTopupPrice[topup.offer_id] ?? topup.selling_price);
                                  if (!price || price <= 0) return alert('Please enter a valid price');
                                  try {
                                    await fetch(`${API_BASE_URL}/api/merchant/topups/${topup.offer_id}`, {
                                      method: 'PUT',
                                      credentials: 'include',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        store_id: storeId,
                                        selling_price: price,
                                        is_enabled: topup.is_enabled
                                      })
                                    });
                                    setEditingTopupPrice(prev => { const n = { ...prev }; delete n[topup.offer_id]; return n; });
                                    // Reload
                                    setTopupsLoading(true);
                                    const res = await fetch(`${API_BASE_URL}/api/merchant/topups?store_id=${storeId}`, { credentials: 'include' });
                                    const data = await res.json();
                                    if (data.success) setMerchantTopups(data.topups);
                                    setTopupsLoading(false);
                                  } catch (err) {
                                    alert('Failed to save');
                                  }
                                }}
                                className="dash-btn dash-btn-primary"
                              >
                                Save
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ══ MERCHANT: Promotions ══ */}
            {role === 'merchant' && activeTab === 'promotions' && (
              <div className="dash-card overflow-hidden">
                <SectionHeader
                  title="Marketing & Promos"
                  description="Create discount codes for your customers."
                  action={
                    isPlusActive && (
                      <button className="dash-btn dash-btn-primary hidden sm:inline-flex" onClick={() => setPromoModal({ isOpen: true, promoId: null, code: '', discount_type: 'percentage', value: '', usage_limit: '', status: 'active' })}>
                        + New Code
                      </button>
                    )
                  }
                />
                <PremiumLockOverlay isPlusActive={isPlusActive} onUpgrade={() => setUpgradeModalOpen(true)}>
                  <div className="overflow-x-auto">
                    <table className="koara-table">
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Promo Code</th>
                          <th>Type</th>
                          <th>Value</th>
                          <th>Usage</th>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {promotionsLoading ? (
                           <tr><td colSpan="6"><div className="koara-empty-state"><div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /><span>Loading promos...</span></div></td></tr>
                        ) : promotions.length === 0 ? (
                          <tr><td colSpan="6"><div className="koara-empty-state"><Tag size={32} /><span>No promo codes yet.</span></div></td></tr>
                        ) : promotions.map(promo => (
                          <tr key={promo.id}>
                            <td>
                              <Toggle on={promo.status === 'active'} onChange={() => handleTogglePromo(promo.id)} />
                            </td>
                            <td className="font-mono font-bold text-white">{promo.code}</td>
                            <td className="capitalize" style={{ color: '#94A3B8' }}>{promo.discount_type}</td>
                            <td className="font-bold" style={{ color: '#60A5FA' }} dir="ltr">
                              {promo.discount_type === 'percentage' ? `${parseFloat(promo.value)}%` : `$${parseFloat(promo.value).toFixed(2)}`}
                            </td>
                            <td className="text-sm" style={{ color: '#94A3B8' }}>
                              {promo.used_count} {promo.usage_limit ? `/ ${promo.usage_limit}` : 'uses'}
                            </td>
                            <td className="text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => setPromoModal({ isOpen: true, promoId: promo.id, code: promo.code, discount_type: promo.discount_type, value: promo.value, usage_limit: promo.usage_limit || '', status: promo.status })} className="dash-btn dash-btn-secondary">
                                  Edit
                                </button>
                                <button onClick={() => handleDeletePromo(promo.id)} className="dash-btn dash-btn-danger">
                                  <Trash2 size={13} /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </PremiumLockOverlay>
              </div>
            )}

            {/* ══ MERCHANT: Store Customization ══ */}
            {role === 'merchant' && activeTab === 'customization' && (
              <div className="h-full w-full">
                <PremiumLockOverlay isPlusActive={isPlusActive} onUpgrade={() => setUpgradeModalOpen(true)}>
                  <MerchantCustomizationTab />
                </PremiumLockOverlay>
              </div>
            )}

            {/* ══ MERCHANT: Settings ══ */}
            {role === 'merchant' && activeTab === 'settings' && (
              <div className="dash-card p-6">
                <div className="mb-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <h3 className="text-base font-bold text-white">Store Settings</h3>
                  <p className="text-xs mt-1" style={{ color: '#475569' }}>Configure your storefront branding and personalization.</p>
                </div>

                <div className="max-w-xl space-y-8">
                  {/* Logo */}
                  <div>
                    <label className="koara-label text-sm mb-3 block">Storefront Logo</label>
                    <p className="text-xs mb-4" style={{ color: '#475569' }}>This logo will appear at the top-left of your public live storefront.</p>

                    <div className="flex items-center gap-5">
                      {/* Preview */}
                      <div className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden shrink-0" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {merchants.find(m => m.id === storeId)?.logoUrl ? (
                          <img src={merchants.find(m => m.id === storeId)?.logoUrl} alt="Store Logo" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl" style={{ background: 'linear-gradient(135deg,#2563EB,#4F46E5)' }}>
                            {merchants.find(m => m.id === storeId)?.name.charAt(0) || 'S'}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <label className="dash-btn dash-btn-secondary cursor-pointer">
                            <UploadCloud size={13} /> Upload Image
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => updateStoreLogo(storeId, event.target.result);
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          {merchants.find(m => m.id === storeId)?.logoUrl && (
                            <button onClick={() => updateStoreLogo(storeId, null)} className="dash-btn dash-btn-danger">
                              <Trash2 size={13} /> Remove
                            </button>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: '#475569' }}>PNG, JPG, WEBP. Max 2MB.</p>
                      </div>
                    </div>
                  </div>

                  <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

                  {/* Koara Branding */}
                  <PremiumLockOverlay isPlusActive={isPlusActive} onUpgrade={() => setUpgradeModalOpen(true)}>
                    <div>
                      <label className="koara-label text-sm mb-3 block">Remove Koara Branding</label>
                      <p className="text-xs mb-4" style={{ color: '#475569' }}>Remove all "Powered by Koara" watermarks from your storefront.</p>
                      <Toggle on={true} onChange={() => {}} />
                    </div>
                  </PremiumLockOverlay>

                  <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

                  {/* Custom Domain */}
                  <PremiumLockOverlay isPlusActive={isPlusActive} onUpgrade={() => setUpgradeModalOpen(true)}>
                    <div>
                      <label className="koara-label text-sm mb-3 block">Custom Domain</label>
                      <p className="text-xs mb-4" style={{ color: '#475569' }}>Connect your own domain name (e.g. store.com) instead of using the koara subdomain.</p>
                      <div className="flex gap-3">
                        <input type="text" placeholder="www.yourstore.com" className="koara-input" disabled />
                        <button className="dash-btn dash-btn-primary" disabled>Connect</button>
                      </div>
                    </div>
                  </PremiumLockOverlay>

                  <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

                  {/* Email Branding */}
                  <PremiumLockOverlay isPlusActive={isPlusActive} onUpgrade={() => setUpgradeModalOpen(true)}>
                    <div>
                      <label className="koara-label text-sm mb-3 block">Email Branding</label>
                      <p className="text-xs mb-4" style={{ color: '#475569' }}>Customize the receipt emails sent to your customers.</p>
                      <button className="dash-btn dash-btn-secondary" disabled>Edit Email Template</button>
                    </div>
                  </PremiumLockOverlay>

                  <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

                  {/* Read-only Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="koara-label">Store Name</label>
                      <input
                        type="text"
                        value={store?.store_name || merchants.find(m => m.id === storeId)?.name || ''}
                        disabled
                        className="koara-input"
                      />
                    </div>
                    <div>
                      <label className="koara-label">Subdomain</label>
                      <div className="flex" dir="ltr">
                        <input
                          type="text"
                          value={store?.subdomain || merchants.find(m => m.id === storeId)?.subdomain || ''}
                          disabled
                          className="koara-input rounded-r-none border-r-0 flex-1"
                        />
                        <span className="inline-flex items-center px-3 text-sm rounded-r-[10px]" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#475569' }}>
                          .getkoara.com
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ MERCHANT: Payouts ══ */}
            {role === 'merchant' && activeTab === 'payouts' && (
              <div className="dash-card p-6">
                <div className="mb-6 pb-5 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <div>
                    <h3 className="text-base font-bold text-white">Payment & Payout Settings</h3>
                    <p className="text-xs mt-1" style={{ color: '#475569' }}>Configure the bank details that customers will see when transferring funds.</p>
                  </div>
                  <CreditCard size={20} style={{ color: '#60A5FA' }} />
                </div>

                <div className="max-w-xl space-y-5">
                  <div className="space-y-4">
                    <div>
                      <label className="koara-label">Bank Name</label>
                      <input readOnly type="text" value={bankName} className="koara-input opacity-70 cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="koara-label">Account Name</label>
                      <input readOnly type="text" value={bankAccountName} className="koara-input opacity-70 cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="koara-label">Account Number</label>
                      <input readOnly type="text" value={bankAccountNumber} className="koara-input font-mono opacity-70 cursor-not-allowed" dir="ltr" />
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
                    Your banking information is locked for security after verification. 
                    If you need to update these details, please contact administrator support.
                  </div>
                </div>
              </div>
            )}

            {/* ══ MERCHANT: Subscription ══ */}
            {role === 'merchant' && activeTab === 'subscription' && (
              <div className="max-w-4xl space-y-6">
                <div className="dash-card p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                  {/* Decorative background for Plus */}
                  {isPlusActive && (
                    <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at top right, rgba(59,130,246,0.1), transparent 50%)' }}></div>
                  )}
                  
                  <div className="relative z-10 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-extrabold text-white">
                        {isPlusActive ? 'Koara Plus' : 'Koara Basic'}
                      </h3>
                      {isPlusActive && (
                        <div className="flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2 py-1 rounded text-xs font-bold uppercase shadow-sm">
                          <Crown size={12} /> Active
                        </div>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: '#94A3B8' }}>
                      {isPlusActive 
                        ? 'You are enjoying all premium features and customizations.' 
                        : 'You are currently on the free basic plan with limited features.'}
                    </p>
                    
                    {isPlusActive && subscription.expires_at && (
                      <div className="mt-6 flex flex-wrap gap-6">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#475569' }}>Started</div>
                          <div className="text-sm text-white">{new Date(subscription.starts_at).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#475569' }}>Renews</div>
                          <div className="text-sm text-white">{new Date(subscription.expires_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="relative z-10 shrink-0 w-full md:w-auto">
                    {isPlusActive ? (
                      <div className="flex flex-col gap-3">
                        <button className="dash-btn dash-btn-secondary w-full md:w-auto justify-center py-3 px-8 rounded-xl font-semibold">
                          Manage Billing
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <button onClick={() => setUpgradeModalOpen(true)} className="dash-btn w-full md:w-auto justify-center py-3 px-8 rounded-xl font-bold text-white transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #2563EB, #4F46E5)', boxShadow: '0 4px 15px rgba(37,99,235,0.3)' }}>
                          Upgrade to Plus
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="dash-card overflow-hidden">
                  <SectionHeader title="Billing History" description="View past subscription invoices." />
                  <div className="overflow-x-auto">
                    <table className="koara-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Invoice</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billingHistory.length === 0 ? (
                          <tr><td colSpan="4"><div className="koara-empty-state"><FileText size={32} /><span>No billing history available.</span></div></td></tr>
                        ) : (
                          billingHistory.map((item) => (
                            <tr key={item.id}>
                              <td>{new Date(item.timestamp).toLocaleDateString()}</td>
                              <td>{item.transaction_id || '-'}</td>
                              <td className="font-semibold text-white">${parseFloat(item.amount).toFixed(2)}</td>
                              <td>
                                <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${item.event === 'activated' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                  {item.event}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ══ MODALS ══ */}

      {/* Upgrade to Plus Modal */}
      <Modal isOpen={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} title="Upgrade to Koara Plus">
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
              <Crown size={32} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Unlock Premium Features</h3>
            <p className="text-sm text-slate-400">Take your store to the next level with Koara Plus.</p>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 space-y-4">
            {[
              'Remove ALL Koara branding',
              'Connect your own custom domain',
              'Automatic monthly reports',
              'Full storefront customization',
              'Full email branding customization',
              'Discount codes & promotional campaigns'
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 bg-blue-500/20 w-5 h-5 rounded-full flex items-center justify-center">
                  <Check size={12} className="text-blue-400" />
                </div>
                <span className="text-sm font-medium text-slate-200">{feature}</span>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <div>
              <div className="text-sm font-bold text-white">Koara Plus</div>
              <div className="text-xs text-blue-400">Monthly Subscription</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold text-white">$4.99</div>
              <div className="text-xs text-slate-400">/ month</div>
            </div>
          </div>

          <div className="space-y-3">
            <div 
              onClick={() => setUpgradeMethod('wallet')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${upgradeMethod === 'wallet' ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/20'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <CreditCard size={20} />
                </div>
                <div>
                  <div className="font-semibold text-white">Pay via Wallet Balance</div>
                  <div className="text-xs text-slate-400">Instant activation. $4.99 will be deducted.</div>
                </div>
              </div>
            </div>

            <div 
              onClick={() => setUpgradeMethod('crypto')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${upgradeMethod === 'crypto' ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/20'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                  <span className="font-bold">₿</span>
                </div>
                <div>
                  <div className="font-semibold text-white">Pay via Crypto</div>
                  <div className="text-xs text-slate-400">Powered by NOWPayments</div>
                </div>
              </div>
            </div>
          </div>

          {upgradeError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm flex gap-2">
              <ShieldCheck size={16} className="shrink-0 mt-0.5" />
              <span>{upgradeError}</span>
            </div>
          )}

          <button 
            onClick={handleUpgrade} 
            disabled={isUpgrading}
            className="w-full py-4 rounded-xl font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex justify-center items-center gap-2" 
            style={{ background: 'linear-gradient(135deg, #2563EB, #4F46E5)', boxShadow: '0 4px 15px rgba(37,99,235,0.3)' }}
          >
            {isUpgrading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              upgradeMethod === 'crypto' ? 'Proceed to Payment' : 'Upgrade Now'
            )}
          </button>
        </div>
      </Modal>

      {/* Balance Modal */}
      <Modal
        isOpen={balanceModal.isOpen}
        onClose={() => setBalanceModal({ isOpen: false, type: '', storeId: null, amount: 0, error: '' })}
        title={`${balanceModal.type === 'add' ? 'Add Credit to' : 'Deduct Credit from'} Store`}
      >
        <form onSubmit={handleAdminBalanceUpdate} className="space-y-4">
          <p className="text-sm" style={{ color: '#64748B' }}>
            {balanceModal.type === 'add' ? 'Enter the amount of credit to add to this store.' : 'Enter the amount of credit to deduct from this store.'}
          </p>
          {balanceModal.error && <div className="koara-error-msg">{balanceModal.error}</div>}
          <div>
            <label className="koara-label">Amount ($)</label>
            <input type="number" step="0.01" min="0.01" required value={balanceModal.amount || ''} onChange={(e) => setBalanceModal({ ...balanceModal, amount: e.target.value })} className="koara-input" dir="ltr" />
          </div>
          <button type="submit" className={`dash-btn w-full justify-center py-2.5 rounded-xl text-sm font-semibold ${balanceModal.type === 'add' ? 'dash-btn-success' : 'dash-btn-warning'}`}>
            Confirm {balanceModal.type === 'add' ? 'Addition' : 'Deduction'}
          </button>
        </form>
      </Modal>

      {/* Merchant Action Modal */}
      <Modal
        isOpen={merchantActionModal.isOpen}
        onClose={() => setMerchantActionModal({ isOpen: false, type: '', amount: 0 })}
        title={merchantActionModal.type === 'add' ? 'Request Funds Top-up' : 'Request Payout'}
      >
        <form onSubmit={handleMerchantAction} className="space-y-4">
          <p className="text-sm" style={{ color: '#64748B' }}>
            {merchantActionModal.type === 'add'
              ? 'Enter the amount you wired to the platform bank account. Admin will verify and credit your wallet.'
              : 'Enter the amount you wish to withdraw to your bank account. Admin will process the payout.'}
          </p>
          <div>
            <label className="koara-label">Amount ($)</label>
            <input type="number" step="0.01" min="0.01" value={merchantActionModal.amount} onChange={(e) => setMerchantActionModal({ ...merchantActionModal, amount: e.target.value })} className="koara-input" required dir="ltr" />
          </div>
          <button type="submit" className="dash-btn dash-btn-primary w-full justify-center py-2.5 rounded-xl text-sm font-semibold">
            Submit Request
          </button>
        </form>
      </Modal>

      {/* Payment Provider Modal */}
      <PaymentProviderModal
        isOpen={providerModal.isOpen}
        onClose={() => setProviderModal({ isOpen: false, amount: 0 })}
        amount={providerModal.amount}
        onSelectProvider={(provider) => {
          const amount = providerModal.amount;
          setProviderModal({ isOpen: false, amount: 0 });
          if (provider === 'nowpayments') {
            setCryptoModal({ isOpen: true, amount });
          } else if (provider === 'local_bank') {
            setLocalBankModal({ isOpen: true, amount });
          }
        }}
      />

      <CryptoPaymentModal
        isOpen={cryptoModal.isOpen}
        onClose={() => setCryptoModal({ isOpen: false, amount: 0 })}
        amount={cryptoModal.amount}
        storeId={storeId}
      />

      <LocalBankTransferModal
        isOpen={localBankModal.isOpen}
        onClose={() => setLocalBankModal({ isOpen: false, amount: 0 })}
        amount={localBankModal.amount}
        onSuccess={() => {
          setLocalBankModal({ isOpen: false, amount: 0 });
          alert('Local bank transfer successful!');
          syncWalletBalance(storeId);
          if (activeTab === 'dashboard') {
            fetchMerchantOrders(storeId).catch(console.error);
            // Re-fetch to update balance if needed. Since we don't have a direct fetchBalance method,
            // merchant can refresh or it might automatically update.
          }
        }}
        storeId={storeId}
      />

      {/* Customize Product Modal */}
      <Modal isOpen={!!customizingProduct} onClose={() => setCustomizingProduct(null)} title="Customize Product Display">
        {customizingProduct && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">Override how this product looks on your storefront. Leave blank to use defaults.</p>
            
            <div>
              <label className="koara-label">Custom Title</label>
              <input 
                type="text" 
                className="koara-input" 
                placeholder={customizingProduct.name}
                value={customizingProduct.custom_title}
                onChange={e => setCustomizingProduct(p => ({ ...p, custom_title: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="koara-label">Custom Description</label>
              <textarea 
                className="koara-input min-h-[80px]" 
                placeholder={customizingProduct.description || 'Default description...'}
                value={customizingProduct.custom_description}
                onChange={e => setCustomizingProduct(p => ({ ...p, custom_description: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="koara-label">Custom Image</label>
              <div className="flex items-center gap-4 mt-2">
                <div className="w-20 h-20 rounded-xl flex items-center justify-center overflow-hidden shrink-0" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {customizingProduct.previewImage ? (
                    <img src={customizingProduct.previewImage.startsWith('http') || customizingProduct.previewImage.startsWith('data:') || customizingProduct.previewImage.startsWith('/') ? customizingProduct.previewImage : `${API_BASE_URL}${customizingProduct.previewImage}`} alt="Preview" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <ImageIcon size={24} className="text-slate-500" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="koara-upload-zone block relative cursor-pointer py-3 text-center transition-colors" style={{ background: 'rgba(59,130,246,0.05)', border: '1px dashed rgba(59,130,246,0.3)', borderRadius: '12px' }}>
                    <input 
                      type="file" 
                      accept="image/jpeg,image/png,image/webp"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        
                        setCustomizingProduct(p => ({ ...p, uploading: true }));
                        const formData = new FormData();
                        formData.append('image', file);
                        
                        try {
                          const res = await fetch(`${API_BASE_URL}/api/merchant/products/upload-image`, {
                            method: 'POST',
                            body: formData
                          });
                          const data = await res.json();
                          if (data.success) {
                            setCustomizingProduct(p => ({ 
                              ...p, 
                              custom_image_url: data.url, 
                              previewImage: data.url,
                              uploading: false 
                            }));
                          } else {
                            alert(data.error || 'Upload failed');
                            setCustomizingProduct(p => ({ ...p, uploading: false }));
                          }
                        } catch (err) {
                          alert('Error uploading image');
                          setCustomizingProduct(p => ({ ...p, uploading: false }));
                        }
                      }}
                    />
                    {customizingProduct.uploading ? (
                      <span className="text-sm font-medium" style={{ color: '#60A5FA' }}>Uploading...</span>
                    ) : (
                      <span className="text-sm font-medium flex items-center justify-center gap-2" style={{ color: '#60A5FA' }}>
                        <UploadCloud size={16} /> Upload Custom Image
                      </span>
                    )}
                  </label>
                  {customizingProduct.custom_image_url && (
                    <button 
                      onClick={() => setCustomizingProduct(p => ({ ...p, custom_image_url: '', previewImage: p.image_url || '' }))}
                      className="text-xs font-medium w-full text-left transition-colors"
                      style={{ color: '#F87171' }}
                    >
                      Remove Custom Image
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="pt-4 flex justify-end gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => setCustomizingProduct(null)} className="dash-btn dash-btn-secondary">Cancel</button>
              <button 
                onClick={async () => {
                  try {
                    await updateMerchantProduct(customizingProduct.id, storeId, {
                      selling_price: customizingProduct.selling_price || 0,
                      is_enabled: customizingProduct.is_enabled ?? true,
                      custom_title: customizingProduct.custom_title,
                      custom_description: customizingProduct.custom_description,
                      custom_image_url: customizingProduct.custom_image_url
                    });
                    await fetchMerchantPlatformProducts(storeId);
                    setCustomizingProduct(null);
                  } catch (err) {
                    alert('Failed to save custom changes');
                  }
                }} 
                className="dash-btn dash-btn-primary"
                disabled={customizingProduct.uploading}
              >
                Save Customizations
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Receipt Review Modal */}
      <Modal isOpen={!!selectedReceipt} onClose={() => setSelectedReceipt(null)} title="Review Payment Receipt">
        {selectedReceipt && (
          <div className="space-y-5 text-center">
            <div className="w-full h-48 rounded-xl flex items-center justify-center overflow-hidden text-sm" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {selectedReceipt.receipt_url ? (
                <img src={`${API_BASE_URL}${selectedReceipt.receipt_url}`} alt="Receipt" className="max-h-full object-contain" />
              ) : (
                <span style={{ color: '#475569' }}>No receipt uploaded</span>
              )}
            </div>
            <div className="flex justify-between text-left text-sm p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div>
                <div className="text-xs mb-1" style={{ color: '#475569' }}>Customer</div>
                <div className="font-semibold text-white">{selectedReceipt.customer_name}</div>
              </div>
              <div className="text-right" dir="ltr">
                <div className="text-xs mb-1" style={{ color: '#475569' }}>Amount</div>
                <div className="font-semibold" style={{ color: '#4ade80' }}>${parseFloat(selectedReceipt.total_amount || 0).toFixed(2)}</div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => handleProcessOrder(selectedReceipt.id, 'rejected', selectedReceipt.order_type === 'topup')} className="dash-btn dash-btn-danger flex-1 justify-center py-2.5 rounded-xl">
                Reject Order
              </button>
              <button onClick={() => handleProcessOrder(selectedReceipt.id, 'approved', selectedReceipt.order_type === 'topup')} className="dash-btn dash-btn-success flex-1 justify-center py-2.5 rounded-xl">
                Approve Payment
              </button>
            </div>
            <p className="text-xs" style={{ color: '#475569' }}>
              Approving will automatically debit the platform fee from your Wallet and send the digital product to the customer.
            </p>
          </div>
        )}
      </Modal>

      {/* Reject KYC Modal */}
      <Modal
        isOpen={rejectKycModal.isOpen}
        onClose={() => setRejectKycModal({ isOpen: false, storeId: null })}
        title="Reject Store Application"
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: '#64748B' }}>Please provide a reason for rejecting this merchant application.</p>
          <div>
            <label className="koara-label">Reason for Rejection</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Invalid ID document, mismatched information..."
              className="koara-textarea"
              rows={3}
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setRejectKycModal({ isOpen: false, storeId: null })} className="dash-btn dash-btn-secondary px-4 py-2.5 rounded-xl">
              Cancel
            </button>
            <button onClick={handleRejectKycSubmit} className="dash-btn dash-btn-danger flex-1 justify-center py-2.5 rounded-xl">
              Confirm Rejection
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Store Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, storeId: null, storeName: '' })}
        title="Delete Store"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <p className="font-bold mb-1" style={{ color: '#f87171' }}>This action is permanent and cannot be undone.</p>
            <p style={{ color: '#94A3B8' }}>All store data, wallet history, and merchant access will be permanently removed.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setDeleteModal({ isOpen: false, storeId: null, storeName: '' })} className="dash-btn dash-btn-secondary flex-1 justify-center py-2.5 rounded-xl">
              Cancel
            </button>
            <button
              onClick={async () => {
                const res = await deleteStore(deleteModal.storeId);
                setDeleteModal({ isOpen: false, storeId: null, storeName: '' });
                if (res.success) {
                  if (activeTab === 'merchants' || activeTab === 'dashboard') fetchAllStoresAdmin();
                  if (activeTab === 'ledger' || activeTab === 'dashboard') fetchGlobalTransactions();
                } else {
                  alert(res.message || 'Failed to delete store');
                }
              }}
              className="dash-btn dash-btn-danger flex-1 justify-center py-2.5 rounded-xl"
            >
              Delete Permanently
            </button>
          </div>
        </div>
      </Modal>

      {/* KYC Document Preview Modal */}
      {selectedKyc && (
        <Modal isOpen={!!selectedKyc} onClose={() => setSelectedKyc(null)} title="KYC Document Preview">
          <div className="space-y-5">
            <div className="rounded-xl overflow-hidden flex justify-center p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {selectedKyc.kyc_document_url?.endsWith('.pdf') ? (
                <div className="w-full space-y-4 text-center py-8">
                  <FileText size={40} className="mx-auto" style={{ color: '#475569' }} />
                  <p className="text-sm font-medium" style={{ color: '#94A3B8' }}>PDF Document</p>
                  <a
                    href={`${API_BASE_URL}${selectedKyc.kyc_document_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="dash-btn dash-btn-primary inline-flex py-2 px-5 rounded-lg"
                  >
                    Open PDF in New Tab
                  </a>
                </div>
              ) : (
                <img
                  src={`${API_BASE_URL}${selectedKyc.kyc_document_url}`}
                  alt="KYC Document"
                  className="max-w-full max-h-[55vh] object-contain rounded-lg"
                />
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedKyc(null);
                  setRejectKycModal({ isOpen: true, storeId: selectedKyc.store_id || selectedKyc.id });
                }}
                className="dash-btn dash-btn-danger flex-1 justify-center py-2.5 rounded-xl"
              >
                Reject Application
              </button>
              <button
                onClick={() => {
                  handleApproveKyc(selectedKyc.store_id || selectedKyc.id);
                  setSelectedKyc(null);
                }}
                className="dash-btn dash-btn-success flex-1 justify-center py-2.5 rounded-xl"
              >
                Approve & Activate
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Promo Modal */}
      <Modal isOpen={promoModal.isOpen} onClose={() => setPromoModal({ isOpen: false, promoId: null, code: '', discount_type: 'percentage', value: '', usage_limit: '', status: 'active' })} title={promoModal.promoId ? 'Edit Promo Code' : 'Create Promo Code'}>
        <form onSubmit={handleSavePromo} className="space-y-4">
          <div>
            <label className="koara-label">Promo Code</label>
            <input required type="text" value={promoModal.code} onChange={(e) => setPromoModal({ ...promoModal, code: e.target.value.toUpperCase() })} className="koara-input font-mono" placeholder="e.g. SUMMER10" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="koara-label">Discount Type</label>
              <select value={promoModal.discount_type} onChange={(e) => setPromoModal({ ...promoModal, discount_type: e.target.value })} className="koara-select">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>
            <div>
              <label className="koara-label">Discount Value</label>
              <input required type="number" step="0.01" min="0.01" value={promoModal.value} onChange={(e) => setPromoModal({ ...promoModal, value: e.target.value })} className="koara-input" dir="ltr" placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="koara-label">Usage Limit (Optional)</label>
            <input type="number" min="1" value={promoModal.usage_limit} onChange={(e) => setPromoModal({ ...promoModal, usage_limit: e.target.value })} className="koara-input" placeholder="e.g. 100" />
            <p className="text-xs mt-1" style={{ color: '#64748B' }}>Leave blank for unlimited uses.</p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <label className="koara-label m-0">Active:</label>
            <Toggle
              on={promoModal.status === 'active'}
              onChange={() => setPromoModal({ ...promoModal, status: promoModal.status === 'active' ? 'inactive' : 'active' })}
            />
          </div>
          <button type="submit" className="dash-btn dash-btn-primary w-full justify-center py-2.5 rounded-xl text-sm font-semibold">
            {promoModal.promoId ? 'Save Changes' : 'Create Code'}
          </button>
        </form>
      </Modal>

      {/* Catalog: Create Product Modal */}
      <Modal isOpen={catalogCreateModal} onClose={() => setCatalogCreateModal(false)} title="Create Platform Product">
        <form onSubmit={async (e) => {
          e.preventDefault();
          const result = await createPlatformProduct(newProduct);
          if (result.success) {
            setCatalogCreateModal(false);
            setNewProduct({ name: '', category: '', description: '' });
          } else {
            alert(result.message || 'Failed to create product');
          }
        }} className="space-y-4">
          <div>
            <label className="koara-label">Product Name</label>
            <input required type="text" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className="koara-input" placeholder="e.g. Free Fire 520 Diamonds" />
          </div>
          <div>
            <label className="koara-label">Category</label>
            <input required type="text" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} className="koara-input" placeholder="e.g. Free Fire" />
          </div>
          <div>
            <label className="koara-label">Description (optional)</label>
            <textarea value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} className="koara-textarea" rows={2} placeholder="Brief product description" />
          </div>
          <button type="submit" className="dash-btn dash-btn-primary w-full justify-center py-2.5 rounded-xl text-sm font-semibold">Create Product</button>
        </form>
      </Modal>

      {/* Catalog: Edit Product Modal */}
      <Modal isOpen={catalogEditModal.isOpen} onClose={() => setCatalogEditModal({ isOpen: false, product: null })} title="Edit Platform Product">
        {catalogEditModal.product && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            const p = catalogEditModal.product;
            const result = await updatePlatformProduct(p.id, { name: p.name, category: p.category, description: p.description, is_active: p.is_active });
            if (result.success) {
              setCatalogEditModal({ isOpen: false, product: null });
            } else {
              alert(result.message || 'Failed to update product');
            }
          }} className="space-y-4">
            <div>
              <label className="koara-label">Product Name</label>
              <input required type="text" value={catalogEditModal.product.name} onChange={(e) => setCatalogEditModal(prev => ({ ...prev, product: { ...prev.product, name: e.target.value } }))} className="koara-input" />
            </div>
            <div>
              <label className="koara-label">Category</label>
              <input required type="text" value={catalogEditModal.product.category} onChange={(e) => setCatalogEditModal(prev => ({ ...prev, product: { ...prev.product, category: e.target.value } }))} className="koara-input" />
            </div>
            <div>
              <label className="koara-label">Description</label>
              <textarea value={catalogEditModal.product.description || ''} onChange={(e) => setCatalogEditModal(prev => ({ ...prev, product: { ...prev.product, description: e.target.value } }))} className="koara-textarea" rows={2} />
            </div>
            <div className="flex items-center gap-3">
              <label className="koara-label m-0">Active:</label>
              <Toggle
                on={catalogEditModal.product.is_active}
                onChange={() => setCatalogEditModal(prev => ({ ...prev, product: { ...prev.product, is_active: !prev.product.is_active } }))}
              />
            </div>
            <button type="submit" className="dash-btn dash-btn-primary w-full justify-center py-2.5 rounded-xl text-sm font-semibold">Save Changes</button>
          </form>
        )}
      </Modal>

      {/* Catalog: Provider Mappings Modal */}
      <Modal
        isOpen={catalogProviderModal.isOpen}
        onClose={() => setCatalogProviderModal({ isOpen: false, productId: null, productName: '', mappings: [] })}
        title={`Provider Mappings — ${catalogProviderModal.productName}`}
      >
        <div className="space-y-5">
          {catalogProviderModal.mappings.length > 0 ? (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <table className="koara-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Product ID</th>
                    <th>Cost Price</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogProviderModal.mappings.map(m => (
                    <tr key={m.id}>
                      <td className="cell-primary">{m.provider_name}</td>
                      <td className="cell-mono">{m.provider_product_id}</td>
                      <td className="font-mono text-sm text-white">{m.cost_price ? `$${parseFloat(m.cost_price).toFixed(2)}` : '—'}</td>
                      <td><StatusBadge status={m.is_active ? 'active' : 'inactive'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="koara-empty-state py-8">
              <Activity size={28} />
              <span>No provider mappings yet.</span>
            </div>
          )}

          <div className="pt-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <h4 className="text-sm font-bold text-white">Add Provider Mapping</h4>
            <div>
              <label className="koara-label">Provider</label>
              <select value={newMapping.provider_id} onChange={(e) => setNewMapping({ ...newMapping, provider_id: e.target.value })} className="koara-select">
                <option value="">Select provider...</option>
                {(providers || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="koara-label">Provider Product ID</label>
              <input type="text" value={newMapping.provider_product_id} onChange={(e) => setNewMapping({ ...newMapping, provider_product_id: e.target.value })} className="koara-input" placeholder="e.g. 3449" />
            </div>
            <div>
              <label className="koara-label">Cost Price ($)</label>
              <input type="number" step="0.01" value={newMapping.cost_price} onChange={(e) => setNewMapping({ ...newMapping, cost_price: e.target.value })} className="koara-input" placeholder="0.00" dir="ltr" />
            </div>
            <button
              type="button"
              onClick={async () => {
                if (!newMapping.provider_id || !newMapping.provider_product_id) return alert('Provider and Product ID are required');
                const result = await addProviderMapping(catalogProviderModal.productId, {
                  provider_id: parseInt(newMapping.provider_id),
                  provider_product_id: newMapping.provider_product_id,
                  cost_price: newMapping.cost_price ? parseFloat(newMapping.cost_price) : null
                });
                if (result.success) {
                  const updatedMappings = await fetchProviderMappings(catalogProviderModal.productId);
                  setCatalogProviderModal(prev => ({ ...prev, mappings: updatedMappings }));
                  setNewMapping({ provider_id: '', provider_product_id: '', cost_price: '' });
                } else {
                  alert(result.message || 'Failed to add mapping');
                }
              }}
              className="dash-btn dash-btn-primary w-full justify-center py-2.5 rounded-xl text-sm font-semibold"
            >
              Add Mapping
            </button>
          </div>
        </div>
      </Modal>

      <SubscriptionPaymentModal 
        isOpen={subscriptionPaymentOpen}
        onClose={() => setSubscriptionPaymentOpen(false)}
        onSuccess={() => {
          setSubscriptionPaymentOpen(false);
          fetchSubscription();
          syncWalletBalance(storeId);
          setUpgradeSuccess(true);
        }}
      />
      
      <MerchantWithdrawalModal 
        isOpen={showWithdrawalModal} 
        onClose={() => setShowWithdrawalModal(false)} 
      />

    </div>
  );
};

export default AdminDashboard;
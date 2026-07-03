import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';
import { useMerchantDashboard } from '../../hooks/useMerchantDashboard';
import { ADMIN_NAV_ITEMS, MERCHANT_NAV_ITEMS } from '../../constants/navigation';

// Layout
import Sidebar from './components/Sidebar';
import DashboardHeader from './components/DashboardHeader';
import SuspendedState from './components/SuspendedState';

// Admin tabs
import AdminDashboardTab from './tabs/AdminDashboardTab';
import AdminKycTab from './tabs/AdminKycTab';
import AdminMerchantsTab from './tabs/AdminMerchantsTab';
import AdminLedgerTab from './tabs/AdminLedgerTab';
import AdminCatalogTab from './tabs/AdminCatalogTab';

// Merchant tabs
import MerchantDashboardTab from './tabs/MerchantDashboardTab';
import MerchantProductsTab from './tabs/MerchantProductsTab';
import MerchantTopupsTab from './tabs/MerchantTopupsTab';
import MerchantPromotionsTab from './tabs/MerchantPromotionsTab';
import MerchantSettingsTab from './tabs/MerchantSettingsTab';
import MerchantPayoutsTab from './tabs/MerchantPayoutsTab';

// Modals
import PaymentProviderModal from '../../components/PaymentProviderModal';
import CryptoPaymentModal from '../../components/CryptoPaymentModal';
import BalanceModal from '../../components/modals/BalanceModal';
import MerchantActionModal from '../../components/modals/MerchantActionModal';
import CustomizeProductModal from '../../components/modals/CustomizeProductModal';
import ReceiptReviewModal from '../../components/modals/ReceiptReviewModal';
import RejectKycModal from '../../components/modals/RejectKycModal';
import DeleteStoreModal from '../../components/modals/DeleteStoreModal';
import KycDocumentModal from '../../components/modals/KycDocumentModal';
import CatalogCreateModal from '../../components/modals/CatalogCreateModal';
import CatalogEditModal from '../../components/modals/CatalogEditModal';
import ProviderMappingsModal from '../../components/modals/ProviderMappingsModal';

// ── AdminPage ──────────────────────────────────────────────────────

const AdminPage = () => {
  const {
    user, store, logout, t, language, setLanguage,
    merchants, deleteStore, adminAddCredit, adminDeduct,
    fetchAllStoresAdmin, fetchGlobalTransactions,
    fetchPendingKyc, setKycApplications, approveKyc, rejectKyc,
    platformProducts, createPlatformProduct, updatePlatformProduct, deactivatePlatformProduct,
    providers, fetchProviderMappings, addProviderMapping,
    updateMerchantProduct, fetchMerchantPlatformProducts, updateOrderStatus,
  } = useAppContext();

  const navigate = useNavigate();
  const { activeTab, setActiveTab, kycPendingLoading } = useAdminDashboard();
  const merchantDash = useMerchantDashboard(activeTab);

  // Modal state
  const [balanceModal, setBalanceModal] = useState({ isOpen: false, type: '', storeId: null, amount: 0, error: '' });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, storeId: null, storeName: '' });
  const [merchantActionModal, setMerchantActionModal] = useState({ isOpen: false, type: '', amount: 0 });
  const [providerModal, setProviderModal] = useState({ isOpen: false, amount: 0 });
  const [cryptoModal, setCryptoModal] = useState({ isOpen: false, amount: 0 });
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedKyc, setSelectedKyc] = useState(null);
  const [rejectKycModal, setRejectKycModal] = useState({ isOpen: false, storeId: null });
  const [rejectReason, setRejectReason] = useState('');
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [catalogCreateModal, setCatalogCreateModal] = useState(false);
  const [catalogEditModal, setCatalogEditModal] = useState({ isOpen: false, product: null });
  const [catalogProviderModal, setCatalogProviderModal] = useState({ isOpen: false, productId: null, productName: '', mappings: [] });
  const [newProduct, setNewProduct] = useState({ name: '', category: '', description: '' });
  const [newMapping, setNewMapping] = useState({ provider_id: '', provider_product_id: '', cost_price: '' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!user) return <Navigate to="/" />;

  const role = user.role;
  const storeId = user.storeId;

  // Suspended merchant
  if (role === 'merchant' && store?.status === 'suspended') {
    return <SuspendedState logout={logout} />;
  }

  const navItems = role === 'admin' ? ADMIN_NAV_ITEMS : MERCHANT_NAV_ITEMS;

  // ── Event Handlers ──

  const handleLogout = () => { logout(); navigate('/'); };

  const handleAdminBalanceUpdate = async (e) => {
    e.preventDefault();
    setBalanceModal(prev => ({ ...prev, error: '' }));
    const amount = Number(balanceModal.amount);
    const result = balanceModal.type === 'add'
      ? await adminAddCredit(balanceModal.storeId, amount, 'Admin Manual Credit')
      : await adminDeduct(balanceModal.storeId, amount, 'Admin Manual Debit');
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

  const handleProcessOrder = async (id, action, isTopup = false) => {
    const res = await updateOrderStatus(id, storeId, action, isTopup);
    if (res.success) { setSelectedReceipt(null); } else { alert(res.message); }
  };

  const handleApproveKyc = async (kycStoreId) => {
    const success = await approveKyc(kycStoreId);
    if (success) {
      alert('Application approved successfully!');
      fetchPendingKyc().then(data => setKycApplications(data || []));
      fetchAllStoresAdmin();
    } else { alert('Failed to approve application.'); }
  };

  const handleRejectKycSubmit = async (e) => {
    if (e) e.preventDefault();
    const success = await rejectKyc(rejectKycModal.storeId, rejectReason);
    if (success) {
      alert('Application rejected successfully.');
      setRejectKycModal({ isOpen: false, storeId: null });
      setRejectReason('');
      fetchPendingKyc().then(data => setKycApplications(data || []));
    } else { alert('Failed to reject application.'); }
  };

  const handleSaveCustomization = async () => {
    try {
      await updateMerchantProduct(customizingProduct.id, storeId, {
        selling_price: customizingProduct.selling_price || 0,
        is_enabled: customizingProduct.is_enabled ?? true,
        custom_title: customizingProduct.custom_title,
        custom_description: customizingProduct.custom_description,
        custom_image_url: customizingProduct.custom_image_url,
      });
      await fetchMerchantPlatformProducts(storeId);
      setCustomizingProduct(null);
    } catch { alert('Failed to save custom changes'); }
  };

  const handleDeleteStore = async () => {
    const res = await deleteStore(deleteModal.storeId);
    setDeleteModal({ isOpen: false, storeId: null, storeName: '' });
    if (res.success) {
      if (activeTab === 'merchants' || activeTab === 'dashboard') fetchAllStoresAdmin();
      if (activeTab === 'ledger' || activeTab === 'dashboard') fetchGlobalTransactions();
    } else { alert(res.message || 'Failed to delete store'); }
  };

  // ── Render ──

  const renderTab = () => {
    if (role === 'admin') {
      switch (activeTab) {
        case 'dashboard': return <AdminDashboardTab />;
        case 'kyc': return <AdminKycTab kycPendingLoading={kycPendingLoading} onApproveKyc={handleApproveKyc} onRejectKyc={(id) => setRejectKycModal({ isOpen: true, storeId: id })} onViewDocument={setSelectedKyc} />;
        case 'merchants': return <AdminMerchantsTab onAddBalance={(id) => setBalanceModal({ isOpen: true, type: 'add', storeId: id, amount: '' })} onDeductBalance={(id) => setBalanceModal({ isOpen: true, type: 'deduct', storeId: id, amount: '' })} onDeleteStore={(id, name) => setDeleteModal({ isOpen: true, storeId: id, storeName: name })} />;
        case 'ledger': return <AdminLedgerTab />;
        case 'catalog': return <AdminCatalogTab onCreateProduct={() => { setNewProduct({ name: '', category: '', description: '' }); setCatalogCreateModal(true); }} onEditProduct={(p) => setCatalogEditModal({ isOpen: true, product: { ...p } })} onDeactivateProduct={async (id) => { await deactivatePlatformProduct(id); }} onManageProviders={async (p) => { const mappings = await fetchProviderMappings(p.id); setCatalogProviderModal({ isOpen: true, productId: p.id, productName: p.name, mappings }); }} />;
        default: return null;
      }
    } else {
      switch (activeTab) {
        case 'dashboard': return <MerchantDashboardTab onAddFunds={() => setMerchantActionModal({ isOpen: true, type: 'add' })} onWithdraw={() => setMerchantActionModal({ isOpen: true, type: 'withdraw' })} onInspectReceipt={setSelectedReceipt} />;
        case 'products': return <MerchantProductsTab editingMerchantPrice={merchantDash.editingMerchantPrice} setEditingMerchantPrice={merchantDash.setEditingMerchantPrice} onCustomize={(p) => setCustomizingProduct({ ...p, custom_title: p.custom_title || '', custom_description: p.custom_description || '', custom_image_url: p.custom_image_url || '', previewImage: p.custom_image_url || p.image_url || '' })} />;
        case 'topups': return <MerchantTopupsTab merchantTopups={merchantDash.merchantTopups} topupsLoading={merchantDash.topupsLoading} editingTopupPrice={merchantDash.editingTopupPrice} setEditingTopupPrice={merchantDash.setEditingTopupPrice} reloadTopups={merchantDash.reloadTopups} />;
        case 'promotions': return <MerchantPromotionsTab />;
        case 'settings': return <MerchantSettingsTab />;
        case 'payouts': return <MerchantPayoutsTab />;
        default: return null;
      }
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#020617' }}>
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-30" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setIsSidebarOpen(false)} />
      )}

      <Sidebar role={role} store={store} user={user} navItems={navItems} activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} onLogout={handleLogout} t={t} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <DashboardHeader navItems={navItems} activeTab={activeTab} language={language} setLanguage={setLanguage} setIsSidebarOpen={setIsSidebarOpen} />
        <div className="flex-1 overflow-y-auto p-6 scrollbar-none">
          <div className="max-w-5xl mx-auto space-y-6">
            {renderTab()}
          </div>
        </div>
      </main>

      {/* ── Modals ── */}
      <BalanceModal balanceModal={balanceModal} setBalanceModal={setBalanceModal} onSubmit={handleAdminBalanceUpdate} />
      <MerchantActionModal merchantActionModal={merchantActionModal} setMerchantActionModal={setMerchantActionModal} onSubmit={handleMerchantAction} />
      <PaymentProviderModal isOpen={providerModal.isOpen} onClose={() => setProviderModal({ isOpen: false, amount: 0 })} amount={providerModal.amount} onSelectProvider={(provider) => { if (provider === 'nowpayments') { const amount = providerModal.amount; setProviderModal({ isOpen: false, amount: 0 }); setCryptoModal({ isOpen: true, amount }); } }} />
      <CryptoPaymentModal isOpen={cryptoModal.isOpen} onClose={() => setCryptoModal({ isOpen: false, amount: 0 })} amount={cryptoModal.amount} storeId={storeId} />
      <CustomizeProductModal customizingProduct={customizingProduct} setCustomizingProduct={setCustomizingProduct} onSave={handleSaveCustomization} />
      <ReceiptReviewModal selectedReceipt={selectedReceipt} setSelectedReceipt={setSelectedReceipt} onProcessOrder={handleProcessOrder} />
      <RejectKycModal rejectKycModal={rejectKycModal} setRejectKycModal={setRejectKycModal} rejectReason={rejectReason} setRejectReason={setRejectReason} onSubmit={handleRejectKycSubmit} />
      <DeleteStoreModal deleteModal={deleteModal} setDeleteModal={setDeleteModal} onConfirm={handleDeleteStore} />
      <KycDocumentModal selectedKyc={selectedKyc} setSelectedKyc={setSelectedKyc} onApprove={handleApproveKyc} onReject={(id) => setRejectKycModal({ isOpen: true, storeId: id })} />
      <CatalogCreateModal isOpen={catalogCreateModal} onClose={() => setCatalogCreateModal(false)} newProduct={newProduct} setNewProduct={setNewProduct} onCreate={createPlatformProduct} />
      <CatalogEditModal catalogEditModal={catalogEditModal} setCatalogEditModal={setCatalogEditModal} onUpdate={updatePlatformProduct} />
      <ProviderMappingsModal catalogProviderModal={catalogProviderModal} setCatalogProviderModal={setCatalogProviderModal} newMapping={newMapping} setNewMapping={setNewMapping} providers={providers} onAddMapping={addProviderMapping} onFetchMappings={fetchProviderMappings} />
    </div>
  );
};

export default AdminPage;

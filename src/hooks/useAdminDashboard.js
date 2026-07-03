import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

/**
 * Admin dashboard data-loading hook.
 * Manages tab switching, data refresh effects, and stat computations.
 */
export function useAdminDashboard() {
  const {
    user, store, merchants,
    fetchAllStoresAdmin, fetchGlobalTransactions, fetchPendingKyc, setKycApplications,
    fetchPlatformProducts, fetchProviders, ledger,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [kycPendingLoading, setKycPendingLoading] = useState(false);

  const role = user?.role;

  // Admin data loading effect
  useEffect(() => {
    if (role !== 'admin') return;

    const loadDashboardData = async () => {
      if (activeTab === 'kyc') {
        setKycPendingLoading(true);
        fetchPendingKyc()
          .then(result => {
            const liveData = result.pending || result || [];
            setKycApplications(liveData);
            setKycPendingLoading(false);
          })
          .catch(err => {
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
    };
    loadDashboardData();
  }, [activeTab, role]);

  return {
    activeTab,
    setActiveTab,
    kycPendingLoading,
  };
}

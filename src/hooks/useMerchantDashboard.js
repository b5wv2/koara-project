import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import * as topupService from '../services/topupService';

/**
 * Merchant dashboard data-loading hook.
 * Manages merchant-specific tab data and topup state.
 */
export function useMerchantDashboard(activeTab) {
  const {
    user, store,
    fetchMerchantPlatformProducts, fetchMerchantOrders,
  } = useAppContext();

  const role = user?.role;
  const storeId = user?.storeId;

  const [merchantTopups, setMerchantTopups] = useState([]);
  const [topupsLoading, setTopupsLoading] = useState(false);
  const [editingTopupPrice, setEditingTopupPrice] = useState({});
  const [editingMerchantPrice, setEditingMerchantPrice] = useState({});

  // Merchant data loading effect
  useEffect(() => {
    if (role !== 'merchant' || !storeId) return;

    if (activeTab === 'products') {
      fetchMerchantPlatformProducts(storeId).catch(console.error);
    }
    if (activeTab === 'topups') {
      setTopupsLoading(true);
      topupService.fetchMerchantTopups(storeId)
        .then(topups => setMerchantTopups(topups))
        .catch(console.error)
        .finally(() => setTopupsLoading(false));
    }
    if (activeTab === 'dashboard') {
      fetchMerchantOrders(storeId).catch(console.error);
    }
  }, [activeTab, role, storeId]);

  const reloadTopups = async () => {
    setTopupsLoading(true);
    const topups = await topupService.fetchMerchantTopups(storeId);
    setMerchantTopups(topups);
    setTopupsLoading(false);
  };

  return {
    merchantTopups,
    setMerchantTopups,
    topupsLoading,
    setTopupsLoading,
    editingTopupPrice,
    setEditingTopupPrice,
    editingMerchantPrice,
    setEditingMerchantPrice,
    reloadTopups,
  };
}

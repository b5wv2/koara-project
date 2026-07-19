import React from 'react';
import { Package } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import SectionHeader from '../../../components/ui/SectionHeader';
import Toggle from '../../../components/ui/Toggle';
import * as topupService from '../../../services/topupService';
import DashButton from '../../../components/ui/DashButton';

/**
 * Merchant topups tab — direct top-ups table.
 */
const MerchantTopupsTab = ({ merchantTopups, topupsLoading, editingTopupPrice, setEditingTopupPrice, reloadTopups }) => {
  const { user } = useAppContext();
  const storeId = user?.storeId;

  return (
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
                        await topupService.updateTopup(topup.offer_id, storeId, {
                          selling_price: parseFloat(currentPrice) || 0,
                          is_enabled: !topup.is_enabled,
                        });
                        await reloadTopups();
                      }}
                    />
                  </td>
                  <td className="cell-primary">{topup.name}</td>
                  <td className="font-mono text-sm text-slate-400">${parseFloat(topup.price_usd).toFixed(4)}</td>
                  <td>
                    <input
                      type="number" step="0.01" min="0.01"
                      value={currentPrice}
                      onChange={(e) => setEditingTopupPrice(prev => ({ ...prev, [topup.offer_id]: e.target.value }))}
                      className="koara-input w-32 py-1.5 text-sm"
                      dir="ltr" placeholder="0.00"
                    />
                  </td>
                  <td className="text-right">
                    <DashButton
                      onClick={async () => {
                        const price = parseFloat(editingTopupPrice[topup.offer_id] ?? topup.selling_price);
                        if (!price || price <= 0) {
                          alert('Please enter a valid price');
                          return { success: false };
                        }
                        await topupService.updateTopup(topup.offer_id, storeId, {
                          selling_price: price,
                          is_enabled: topup.is_enabled,
                        });
                        setEditingTopupPrice(prev => { const n = { ...prev }; delete n[topup.offer_id]; return n; });
                        await reloadTopups();
                        return { success: true };
                      }}
                      className="dash-btn dash-btn-primary"
                    >
                      Save
                    </DashButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MerchantTopupsTab;

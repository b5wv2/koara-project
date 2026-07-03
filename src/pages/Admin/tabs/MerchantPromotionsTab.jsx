import React from 'react';
import { Tag } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import SectionHeader from '../../../components/ui/SectionHeader';
import Toggle from '../../../components/ui/Toggle';

/**
 * Merchant promotions tab — promo codes table.
 */
const MerchantPromotionsTab = () => {
  const { user, promos, setPromos } = useAppContext();
  const storeId = user?.storeId;

  const handleTogglePromo = (id) => {
    setPromos(promos.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  return (
    <div className="dash-card overflow-hidden">
      <SectionHeader
        title="Marketing & Promos"
        description="Create discount codes for your customers."
        action={
          <button className="dash-btn dash-btn-primary hidden sm:inline-flex">+ New Code</button>
        }
      />
      <div className="overflow-x-auto">
        <table className="koara-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Promo Code</th>
              <th>Discount Type</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {promos.filter(p => p.storeId === storeId).length === 0 ? (
              <tr><td colSpan="4"><div className="koara-empty-state"><Tag size={32} /><span>No promo codes yet.</span></div></td></tr>
            ) : promos.filter(p => p.storeId === storeId).map(promo => (
              <tr key={promo.id}>
                <td>
                  <Toggle on={promo.active} onChange={() => handleTogglePromo(promo.id)} />
                </td>
                <td className="font-mono font-bold text-white">{promo.code}</td>
                <td className="capitalize" style={{ color: '#94A3B8' }}>{promo.type}</td>
                <td className="font-bold" style={{ color: '#60A5FA' }} dir="ltr">
                  {promo.type === 'percentage' ? `${promo.value}%` : `$${promo.value.toFixed(2)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MerchantPromotionsTab;

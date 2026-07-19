import React from 'react';
import { Package, Edit2 } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import SectionHeader from '../../../components/ui/SectionHeader';
import Toggle from '../../../components/ui/Toggle';
import DashButton from '../../../components/ui/DashButton';

/**
 * Merchant products tab — platform products enable/price/customize table.
 */
const MerchantProductsTab = ({ editingMerchantPrice, setEditingMerchantPrice, onCustomize }) => {
  const { user, merchantPlatformProducts, updateMerchantProduct, fetchMerchantPlatformProducts } = useAppContext();
  const storeId = user?.storeId;

  return (
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
              const isEnabled = product.is_enabled ?? false;
              const currentPrice = editingMerchantPrice[product.id] ?? (product.selling_price || '');

              return (
                <tr key={product.id}>
                  <td>
                    <Toggle
                      on={isEnabled}
                      onChange={async () => {
                        await updateMerchantProduct(product.id, storeId, {
                          selling_price: parseFloat(currentPrice) || 0,
                          is_enabled: !isEnabled,
                        });
                        await fetchMerchantPlatformProducts(storeId);
                      }}
                    />
                  </td>
                  <td className="cell-primary">{product.name}</td>
                  <td style={{ color: '#94A3B8' }}>{product.category}</td>
                  <td>
                    <input
                      type="number" step="0.01" min="0.01"
                      value={currentPrice}
                      onChange={(e) => setEditingMerchantPrice(prev => ({ ...prev, [product.id]: e.target.value }))}
                      className="koara-input w-32 py-1.5 text-sm"
                      dir="ltr" placeholder="0.00"
                    />
                  </td>
                  <td className="text-right">
                    <DashButton onClick={() => onCustomize(product)} className="dash-btn dash-btn-secondary">
                      <Edit2 size={14} className="mr-1 inline" /> Customize
                    </DashButton>
                  </td>
                  <td className="text-right">
                    <DashButton
                      onClick={async () => {
                        const price = parseFloat(editingMerchantPrice[product.id] ?? product.selling_price);
                        if (!price || price <= 0) {
                          alert('Please enter a valid price');
                          return { success: false };
                        }
                        await updateMerchantProduct(product.id, storeId, {
                          selling_price: price,
                          is_enabled: isEnabled,
                          custom_title: product.custom_title,
                          custom_description: product.custom_description,
                          custom_image_url: product.custom_image_url,
                        });
                        setEditingMerchantPrice(prev => { const n = { ...prev }; delete n[product.id]; return n; });
                        await fetchMerchantPlatformProducts(storeId);
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

export default MerchantProductsTab;

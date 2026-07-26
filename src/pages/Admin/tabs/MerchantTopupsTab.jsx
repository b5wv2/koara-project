import React, { useRef } from 'react';
import { Package, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import SectionHeader from '../../../components/ui/SectionHeader';
import Toggle from '../../../components/ui/Toggle';
import * as topupService from '../../../services/topupService';
import DashButton from '../../../components/ui/DashButton';

/**
 * Merchant topups tab — direct top-ups table with Category & Product image management.
 */
const MerchantTopupsTab = ({ merchantTopups, topupCategories = [], topupsLoading, editingTopupPrice, setEditingTopupPrice, reloadTopups }) => {
  const { user } = useAppContext();
  const storeId = user?.storeId;

  // File input refs map
  const catInputRefs = useRef({});
  const prodInputRefs = useRef({});

  // Category Image Upload
  const handleCategoryFileUpload = async (categoryId, file) => {
    if (!file) return;
    const uploadRes = await topupService.uploadTopupImage(file);
    if (uploadRes.success) {
      await topupService.updateTopupCategory(categoryId, storeId, {
        custom_image_url: uploadRes.url
      });
      await reloadTopups();
    } else {
      alert(uploadRes.message || 'Image upload failed');
    }
  };

  // Category Image Delete
  const handleDeleteCategoryImage = async (categoryId) => {
    await topupService.updateTopupCategory(categoryId, storeId, {
      custom_image_url: null
    });
    await reloadTopups();
  };

  // Product Image Upload
  const handleProductFileUpload = async (topup, file) => {
    if (!file) return;
    const uploadRes = await topupService.uploadTopupImage(file);
    if (uploadRes.success) {
      const price = parseFloat(editingTopupPrice[topup.offer_id] ?? topup.selling_price) || 0;
      await topupService.updateTopup(topup.offer_id, storeId, {
        selling_price: price,
        is_enabled: topup.is_enabled,
        custom_image_url: uploadRes.url
      });
      await reloadTopups();
    } else {
      alert(uploadRes.message || 'Image upload failed');
    }
  };

  // Product Image Delete
  const handleDeleteProductImage = async (topup) => {
    const price = parseFloat(editingTopupPrice[topup.offer_id] ?? topup.selling_price) || 0;
    await topupService.updateTopup(topup.offer_id, storeId, {
      selling_price: price,
      is_enabled: topup.is_enabled,
      custom_image_url: null
    });
    await reloadTopups();
  };

  return (
    <div className="space-y-8">
      {/* Category Images Management */}
      <div className="dash-card p-6">
        <SectionHeader
          title="Direct Top-Up Categories & Images"
          description="Upload custom banner/cover images for each game category on your storefront."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-4">
          {topupCategories.length === 0 ? (
            <div className="col-span-full text-slate-400 text-sm py-4 text-center">Loading categories…</div>
          ) : topupCategories.map(cat => {
            const hasCustomImage = !!cat.custom_image_url;
            const displayImage = cat.image_url || cat.custom_image_url;

            return (
              <div key={cat.category_id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex flex-col items-center text-center relative space-y-3">
                <div className="w-full h-32 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-center overflow-hidden relative group">
                  {displayImage ? (
                    <img src={displayImage} alt={cat.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-slate-500 text-xs">
                      <ImageIcon size={28} className="opacity-50" />
                      <span>No Category Image</span>
                    </div>
                  )}
                </div>

                <div className="w-full">
                  <h4 className="font-bold text-sm text-white">{cat.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">{hasCustomImage ? 'Custom Merchant Image' : 'Default Category'}</p>
                </div>

                <div className="flex items-center gap-2 w-full pt-1">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={el => catInputRefs.current[cat.category_id] = el}
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        handleCategoryFileUpload(cat.category_id, e.target.files[0]);
                      }
                    }}
                  />
                  <DashButton
                    onClick={() => catInputRefs.current[cat.category_id]?.click()}
                    className="dash-btn dash-btn-secondary flex-1 text-xs py-1.5 justify-center"
                  >
                    <Upload size={13} className="mr-1 inline" />
                    {hasCustomImage ? 'Replace' : 'Upload'}
                  </DashButton>

                  {hasCustomImage && (
                    <DashButton
                      onClick={() => handleDeleteCategoryImage(cat.category_id)}
                      className="dash-btn dash-btn-danger px-2.5 py-1.5 text-xs"
                      title="Remove Category Custom Image"
                    >
                      <Trash2 size={13} />
                    </DashButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Product Offers Table */}
      <div className="dash-card overflow-hidden">
        <SectionHeader
          title="Direct Top-Up Products"
          description="Enable direct game top-ups, set custom product images, and set selling prices for your store."
        />
        <div className="overflow-x-auto">
          <table className="koara-table">
            <thead>
              <tr>
                <th>Enabled</th>
                <th>Image</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Provider Cost ($)</th>
                <th>Selling Price ($)</th>
                <th className="text-right">Save</th>
              </tr>
            </thead>
            <tbody>
              {topupsLoading ? (
                <tr><td colSpan="7"><div className="koara-empty-state"><div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /><span>Loading topups...</span></div></td></tr>
              ) : merchantTopups.length === 0 ? (
                <tr><td colSpan="7"><div className="koara-empty-state"><Package size={32} /><span>No topups available.</span></div></td></tr>
              ) : merchantTopups.map(topup => {
                const currentPrice = editingTopupPrice[topup.offer_id] ?? (topup.selling_price || '');
                const hasCustomProductImage = !!topup.custom_image_url;
                const displayProductImage = topup.image_url;

                return (
                  <tr key={topup.offer_id}>
                    <td>
                      <Toggle
                        on={topup.is_enabled}
                        onChange={async () => {
                          await topupService.updateTopup(topup.offer_id, storeId, {
                            selling_price: parseFloat(currentPrice) || 0,
                            is_enabled: !topup.is_enabled,
                            custom_image_url: topup.custom_image_url
                          });
                          await reloadTopups();
                        }}
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                          {displayProductImage ? (
                            <img src={displayProductImage} alt={topup.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={16} className="text-slate-600" />
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={el => prodInputRefs.current[topup.offer_id] = el}
                          onChange={e => {
                            if (e.target.files && e.target.files[0]) {
                              handleProductFileUpload(topup, e.target.files[0]);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => prodInputRefs.current[topup.offer_id]?.click()}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs"
                          title={hasCustomProductImage ? 'Replace product image' : 'Upload custom product image'}
                        >
                          <Upload size={12} />
                        </button>
                        {hasCustomProductImage && (
                          <button
                            type="button"
                            onClick={() => handleDeleteProductImage(topup)}
                            className="p-1.5 rounded bg-red-950/60 hover:bg-red-900/60 text-red-400 transition-colors text-xs"
                            title="Remove custom product image"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="cell-primary">{topup.name}</td>
                    <td style={{ color: '#94A3B8' }}>{topup.category_name}</td>
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
                            custom_image_url: topup.custom_image_url
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
    </div>
  );
};

export default MerchantTopupsTab;

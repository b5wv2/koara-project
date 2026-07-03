import React from 'react';
import { Trash2, UploadCloud } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';

/**
 * Merchant settings tab — store settings (logo, name, subdomain).
 */
const MerchantSettingsTab = () => {
  const { user, store, merchants, updateStoreLogo } = useAppContext();
  const storeId = user?.storeId;
  const currentMerchant = merchants.find(m => m.id === storeId);

  return (
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
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden shrink-0" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {currentMerchant?.logoUrl ? (
                <img src={currentMerchant.logoUrl} alt="Store Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl" style={{ background: 'linear-gradient(135deg,#2563EB,#4F46E5)' }}>
                  {currentMerchant?.name.charAt(0) || 'S'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <label className="dash-btn dash-btn-secondary cursor-pointer">
                  <UploadCloud size={13} /> Upload Image
                  <input
                    type="file" accept="image/*" className="hidden"
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
                {currentMerchant?.logoUrl && (
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

        {/* Read-only Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="koara-label">Store Name</label>
            <input
              type="text"
              value={store?.store_name || currentMerchant?.name || ''}
              disabled
              className="koara-input"
            />
          </div>
          <div>
            <label className="koara-label">Subdomain</label>
            <div className="flex" dir="ltr">
              <input
                type="text"
                value={store?.subdomain || currentMerchant?.subdomain || ''}
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
  );
};

export default MerchantSettingsTab;

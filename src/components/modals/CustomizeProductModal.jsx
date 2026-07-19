import React from 'react';
import { Image as ImageIcon, UploadCloud } from 'lucide-react';
import Modal from '../Modal';
import { API_BASE_URL } from '../../services/api';
import { uploadProductImage } from '../../services/merchantProductService';
import DashButton from '../ui/DashButton';

/**
 * Customize product modal — merchant product customization with image upload.
 */
const CustomizeProductModal = ({ customizingProduct, setCustomizingProduct, onSave }) => (
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
                <img
                  src={customizingProduct.previewImage.startsWith('http') || customizingProduct.previewImage.startsWith('data:') || customizingProduct.previewImage.startsWith('/')
                    ? customizingProduct.previewImage
                    : `${API_BASE_URL}${customizingProduct.previewImage}`}
                  alt="Preview"
                  className="max-h-full max-w-full object-contain"
                />
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
                    const result = await uploadProductImage(file);
                    if (result.success) {
                      setCustomizingProduct(p => ({
                        ...p,
                        custom_image_url: result.url,
                        previewImage: result.url,
                        uploading: false,
                      }));
                    } else {
                      alert(result.message);
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
          <DashButton
            onClick={onSave}
            className="dash-btn dash-btn-primary"
            disabled={customizingProduct.uploading}
          >
            Save Customizations
          </DashButton>
        </div>
      </div>
    )}
  </Modal>
);

export default CustomizeProductModal;

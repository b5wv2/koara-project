import React from 'react';
import Modal from '../Modal';
import Toggle from '../ui/Toggle';

/**
 * Catalog edit modal — edit an existing platform product.
 */
const CatalogEditModal = ({ catalogEditModal, setCatalogEditModal, onUpdate }) => (
  <Modal isOpen={catalogEditModal.isOpen} onClose={() => setCatalogEditModal({ isOpen: false, product: null })} title="Edit Platform Product">
    {catalogEditModal.product && (
      <form onSubmit={async (e) => {
        e.preventDefault();
        const p = catalogEditModal.product;
        const result = await onUpdate(p.id, { name: p.name, category: p.category, description: p.description, is_active: p.is_active });
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
);

export default CatalogEditModal;

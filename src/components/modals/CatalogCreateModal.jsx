import React from 'react';
import Modal from '../Modal';
import DashButton from '../ui/DashButton';

/**
 * Catalog create modal — create a new platform product.
 */
const CatalogCreateModal = ({ isOpen, onClose, newProduct, setNewProduct, onCreate }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Create Platform Product">
    <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
      <div>
        <label className="koara-label">Product Name</label>
        <input required type="text" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className="koara-input" placeholder="e.g. Free Fire 520 Diamonds" />
      </div>
      <div>
        <label className="koara-label">Category</label>
        <input required type="text" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} className="koara-input" placeholder="e.g. Free Fire" />
      </div>
      <div>
        <label className="koara-label">Description (optional)</label>
        <textarea value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} className="koara-textarea" rows={2} placeholder="Brief product description" />
      </div>
      <DashButton
        type="submit"
        onClick={async (e) => {
          if (e && e.preventDefault) e.preventDefault();
          const result = await onCreate(newProduct);
          if (result.success) {
            onClose();
            setNewProduct({ name: '', category: '', description: '' });
          } else {
            alert(result.message || 'Failed to create product');
          }
          return result;
        }}
        className="dash-btn dash-btn-primary w-full justify-center py-2.5 rounded-xl text-sm font-semibold"
      >
        Create Product
      </DashButton>
    </form>
  </Modal>
);

export default CatalogCreateModal;

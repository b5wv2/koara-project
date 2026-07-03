import React from 'react';
import Modal from '../Modal';

/**
 * Delete store modal — admin store deletion confirmation.
 */
const DeleteStoreModal = ({ deleteModal, setDeleteModal, onConfirm }) => (
  <Modal
    isOpen={deleteModal.isOpen}
    onClose={() => setDeleteModal({ isOpen: false, storeId: null, storeName: '' })}
    title="Delete Store"
  >
    <div className="space-y-4">
      <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
        <p className="font-bold mb-1" style={{ color: '#f87171' }}>This action is permanent and cannot be undone.</p>
        <p style={{ color: '#94A3B8' }}>All store data, wallet history, and merchant access will be permanently removed.</p>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={() => setDeleteModal({ isOpen: false, storeId: null, storeName: '' })} className="dash-btn dash-btn-secondary flex-1 justify-center py-2.5 rounded-xl">
          Cancel
        </button>
        <button onClick={onConfirm} className="dash-btn dash-btn-danger flex-1 justify-center py-2.5 rounded-xl">
          Delete Permanently
        </button>
      </div>
    </div>
  </Modal>
);

export default DeleteStoreModal;

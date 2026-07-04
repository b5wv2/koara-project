import React from 'react';
import Modal from '../Modal';

/**
 * Merchant action modal — Request funds top-up or payout.
 */
const MerchantActionModal = ({ merchantActionModal, setMerchantActionModal, onSubmit }) => (
  <Modal
    isOpen={merchantActionModal.isOpen}
    onClose={() => setMerchantActionModal({ isOpen: false, type: '', amount: 0 })}
    title={merchantActionModal.type === 'add' ? 'Request Funds Top-up' : 'Request Payout'}
  >
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm" style={{ color: '#64748B' }}>
        {merchantActionModal.type === 'add'
          ? 'Enter the amount you wired to the platform bank account. Admin will verify and credit your wallet.'
          : 'Enter the amount you wish to withdraw to your bank account. Admin will process the payout.'}
      </p>
      <div>
        <label className="koara-label">Amount ($)</label>
        <input
          type="number" step="0.01" min="0.01"
          value={merchantActionModal.amount}
          onChange={(e) => setMerchantActionModal({ ...merchantActionModal, amount: e.target.value })}
          className="koara-input" required dir="ltr"
        />
      </div>
      <button type="submit" className="dash-btn dash-btn-primary w-full justify-center py-2.5 rounded-xl text-sm font-semibold">
        Submit Request
      </button>
    </form>
  </Modal>
);

export default MerchantActionModal;

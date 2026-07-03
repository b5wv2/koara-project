import React from 'react';
import Modal from '../Modal';

/**
 * Admin balance modal — Add/Deduct credit to/from a store.
 */
const BalanceModal = ({ balanceModal, setBalanceModal, onSubmit }) => (
  <Modal
    isOpen={balanceModal.isOpen}
    onClose={() => setBalanceModal({ isOpen: false, type: '', storeId: null, amount: 0, error: '' })}
    title={`${balanceModal.type === 'add' ? 'Add Credit to' : 'Deduct Credit from'} Store`}
  >
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm" style={{ color: '#64748B' }}>
        {balanceModal.type === 'add'
          ? 'Enter the amount of credit to add to this store.'
          : 'Enter the amount of credit to deduct from this store.'}
      </p>
      {balanceModal.error && <div className="koara-error-msg">{balanceModal.error}</div>}
      <div>
        <label className="koara-label">Amount ($)</label>
        <input
          type="number" step="0.01" min="0.01" required
          value={balanceModal.amount || ''}
          onChange={(e) => setBalanceModal({ ...balanceModal, amount: e.target.value })}
          className="koara-input" dir="ltr"
        />
      </div>
      <button
        type="submit"
        className={`dash-btn w-full justify-center py-2.5 rounded-xl text-sm font-semibold ${balanceModal.type === 'add' ? 'dash-btn-success' : 'dash-btn-warning'}`}
      >
        Confirm {balanceModal.type === 'add' ? 'Addition' : 'Deduction'}
      </button>
    </form>
  </Modal>
);

export default BalanceModal;

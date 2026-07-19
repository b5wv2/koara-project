import React from 'react';
import Modal from '../Modal';
import DashButton from '../ui/DashButton';

/**
 * Reject KYC modal — admin KYC rejection with reason.
 */
const RejectKycModal = ({ rejectKycModal, setRejectKycModal, rejectReason, setRejectReason, onSubmit }) => (
  <Modal
    isOpen={rejectKycModal.isOpen}
    onClose={() => setRejectKycModal({ isOpen: false, storeId: null })}
    title="Reject Store Application"
  >
    <div className="space-y-4">
      <p className="text-sm" style={{ color: '#64748B' }}>Please provide a reason for rejecting this merchant application.</p>
      <div>
        <label className="koara-label">Reason for Rejection</label>
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="e.g. Invalid ID document, mismatched information..."
          className="koara-textarea"
          rows={3}
        />
      </div>
      <div className="flex gap-3">
        <button onClick={() => setRejectKycModal({ isOpen: false, storeId: null })} className="dash-btn dash-btn-secondary px-4 py-2.5 rounded-xl">
          Cancel
        </button>
        <DashButton onClick={onSubmit} className="dash-btn dash-btn-danger flex-1 justify-center py-2.5 rounded-xl">
          Confirm Rejection
        </DashButton>
      </div>
    </div>
  </Modal>
);

export default RejectKycModal;

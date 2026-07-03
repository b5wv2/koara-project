import React from 'react';
import Modal from '../Modal';
import { API_BASE_URL } from '../../services/api';

/**
 * Receipt review modal — inspect customer payment receipt and approve/reject.
 */
const ReceiptReviewModal = ({ selectedReceipt, setSelectedReceipt, onProcessOrder }) => (
  <Modal isOpen={!!selectedReceipt} onClose={() => setSelectedReceipt(null)} title="Review Payment Receipt">
    {selectedReceipt && (
      <div className="space-y-5 text-center">
        <div className="w-full h-48 rounded-xl flex items-center justify-center overflow-hidden text-sm" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {selectedReceipt.receipt_url ? (
            <img src={`${API_BASE_URL}${selectedReceipt.receipt_url}`} alt="Receipt" className="max-h-full object-contain" />
          ) : (
            <span style={{ color: '#475569' }}>No receipt uploaded</span>
          )}
        </div>
        <div className="flex justify-between text-left text-sm p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <div className="text-xs mb-1" style={{ color: '#475569' }}>Customer</div>
            <div className="font-semibold text-white">{selectedReceipt.customer_name}</div>
          </div>
          <div className="text-right" dir="ltr">
            <div className="text-xs mb-1" style={{ color: '#475569' }}>Amount</div>
            <div className="font-semibold" style={{ color: '#4ade80' }}>${parseFloat(selectedReceipt.total_amount || 0).toFixed(2)}</div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => onProcessOrder(selectedReceipt.id, 'rejected', selectedReceipt.order_type === 'topup')} className="dash-btn dash-btn-danger flex-1 justify-center py-2.5 rounded-xl">
            Reject Order
          </button>
          <button onClick={() => onProcessOrder(selectedReceipt.id, 'approved', selectedReceipt.order_type === 'topup')} className="dash-btn dash-btn-success flex-1 justify-center py-2.5 rounded-xl">
            Approve Payment
          </button>
        </div>
        <p className="text-xs" style={{ color: '#475569' }}>
          Approving will automatically debit the platform fee from your Wallet and send the digital product to the customer.
        </p>
      </div>
    )}
  </Modal>
);

export default ReceiptReviewModal;

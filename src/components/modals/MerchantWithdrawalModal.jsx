import React, { useState } from 'react';
import Modal from '../Modal';
import { useAppContext } from '../../context/AppContext';
import DashButton from '../ui/DashButton';
import { useAsyncAction } from '../../hooks/useAsyncAction';

/**
 * Merchant Withdrawal Modal - specific to manual withdrawals.
 */
const MerchantWithdrawalModal = ({ isOpen, onClose }) => {
  const { store, requestWithdrawal } = useAppContext();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { execute, loading: isSubmitting } = useAsyncAction();

  const handleSubmit = (e) => execute(async () => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    setSuccess('');
    
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Amount must be greater than zero');
      return { success: false };
    }
    
    if (parsedAmount > parseFloat(store?.balance || 0)) {
      setError('Insufficient wallet balance');
      return { success: false };
    }

    const res = await requestWithdrawal(parsedAmount);

    if (res.success) {
      setSuccess('Withdrawal requested successfully');
      setAmount('');
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 2000);
    } else {
      setError(res.message || 'Failed to request withdrawal');
    }
    return res;
  });

  const handleClose = () => {
    setAmount('');
    setError('');
    setSuccess('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Request Withdrawal"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-sm p-3 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-500 text-sm p-3 rounded">
            {success}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="koara-label">Available Balance</label>
            <input 
              type="text" 
              value={`$${parseFloat(store?.balance || 0).toFixed(2)}`} 
              readOnly 
              className="koara-input opacity-70 cursor-not-allowed font-semibold text-green-400" 
            />
          </div>
          <div>
            <label className="koara-label">Withdrawal Amount ($)</label>
            <input
              type="number" 
              step="0.01" 
              min="0.01"
              max={store?.balance || 0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="koara-input" 
              required 
              dir="ltr"
              disabled={isSubmitting || success !== ''}
            />
          </div>
        </div>

        <div className="space-y-3 mt-4 pt-4 border-t border-white/10">
          <h4 className="text-sm font-semibold text-white/80 mb-2">Destination Bank Account</h4>
          <div>
            <label className="koara-label text-xs">Bank Name</label>
            <input 
              readOnly 
              type="text" 
              value={store?.bank_name || 'Not provided'} 
              className="koara-input opacity-70 cursor-not-allowed text-sm py-1.5" 
            />
          </div>
          <div>
            <label className="koara-label text-xs">Account Holder</label>
            <input 
              readOnly 
              type="text" 
              value={store?.account_name || 'Not provided'} 
              className="koara-input opacity-70 cursor-not-allowed text-sm py-1.5" 
            />
          </div>
          <div>
            <label className="koara-label text-xs">IBAN / Account Number</label>
            <input 
              readOnly 
              type="text" 
              value={store?.account_no || 'Not provided'} 
              className="koara-input opacity-70 cursor-not-allowed font-mono text-sm py-1.5" 
              dir="ltr" 
            />
          </div>
        </div>

        <DashButton 
          type="submit" 
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting || success !== ''}
          className="dash-btn dash-btn-primary w-full justify-center py-2.5 rounded-xl text-sm font-semibold mt-6"
        >
          Confirm Withdrawal
        </DashButton>
      </form>
    </Modal>
  );
};

export default MerchantWithdrawalModal;

import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Copy, CheckCircle, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import { useAppContext } from '../context/AppContext';

const LocalBankTransferModal = ({ isOpen, onClose, amount, onSuccess, storeId: propStoreId }) => {
  const { user, store, t } = useAppContext();
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [transactionId, setTransactionId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const storeId = propStoreId || user?.storeId;

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/local/config`);
      const data = await response.json();
      setConfig(data);
    } catch (err) {
      console.error('Failed to fetch local payment config', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleCopy = () => {
    if (config?.account_number) {
      navigator.clipboard.writeText(config.account_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVerify = async () => {
    if (!transactionId.trim()) {
      setError(t('err_req_transaction_id'));
      return;
    }

    setIsVerifying(true);
    setError('');
    setSuccessMsg('');

    try {
      if (!storeId) {
        throw new Error(t('err_store_id_not_found'));
      }

      console.log({
        user,
        merchant: user,
        store,
        storeId
      });

      const response = await fetch(`${API_BASE_URL}/api/payments/local/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          store_id: storeId,
          transaction_id: transactionId,
          amount: parseFloat(amount)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('err_verification_failed'));
      }

      setSuccessMsg(t('success_wallet_credited'));
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('local_bank_transfer')}>
      <div className="space-y-6">
        <div className="text-sm" style={{ color: '#94A3B8' }}>
          {t('desc_transfer_exact')} <strong className="text-white" dir="ltr">${amount}</strong> {t('desc_to_following_account')}
        </div>

        {loadingConfig ? (
          <div className="flex justify-center p-4">
            <Loader2 className="animate-spin text-koara-primary" size={24} />
          </div>
        ) : config ? (
          <div className="space-y-4">
            <div 
              className="p-4 rounded-xl flex justify-between items-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div>
                <div className="text-xs" style={{ color: '#64748B' }}>{t('account_number_label')}</div>
                <div className="text-lg font-bold text-white tracking-wider">{config.account_number}</div>
                {config.account_name && (
                  <div className="text-xs mt-1" style={{ color: '#94A3B8' }}>{config.account_name}</div>
                )}
              </div>
              <button 
                onClick={handleCopy}
                className="p-2 rounded-lg transition-colors hover:bg-white/10 text-koara-primary"
                title={t('copy_account_number')}
              >
                {copied ? <CheckCircle size={20} className="text-green-400" /> : <Copy size={20} />}
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold" style={{ color: '#94A3B8' }}>{t('transaction_id_label')}</label>
              <input 
                type="text"
                value={transactionId}
                onChange={(e) => { setTransactionId(e.target.value); setError(''); }}
                placeholder={t('transaction_id_placeholder')}
                className="w-full bg-transparent border rounded-lg px-4 py-3 text-white text-sm outline-none transition-all"
                style={{
                  borderColor: error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)',
                }}
              />
              {error && <div className="text-xs text-red-400">{error}</div>}
            </div>

            <button
              onClick={handleVerify}
              disabled={isVerifying || !!successMsg}
              className="w-full py-3 rounded-lg font-bold text-white flex justify-center items-center gap-2 transition-all"
              style={{ 
                background: (isVerifying || successMsg) ? 'rgba(255,255,255,0.1)' : 'var(--koara-primary)',
                opacity: (isVerifying || successMsg) ? 0.7 : 1
              }}
            >
              {isVerifying ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> {t('verifying_payment')}
                </>
              ) : successMsg ? (
                <>
                  <CheckCircle size={18} /> {t('verified_payment')}
                </>
              ) : (
                t('verify_payment')
              )}
            </button>
            {isVerifying && (
              <div className="text-xs text-blue-400 mt-2 text-center leading-relaxed">
                {t('desc_verifying_payment')}<br/>
                {t('desc_verifying_payment_sub')}
              </div>
            )}
            {successMsg && (
              <div className="text-xs text-green-400 mt-2 text-center">
                {successMsg}
              </div>
            )}
          </div>
        ) : (
          <div className="text-red-400 text-sm">{t('err_failed_load_bank')}</div>
        )}
      </div>
    </Modal>
  );
};

export default LocalBankTransferModal;

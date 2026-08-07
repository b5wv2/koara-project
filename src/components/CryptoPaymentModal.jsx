import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { Loader2, ExternalLink, ShieldCheck, CheckCircle, AlertCircle, Check } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import DashButton from './ui/DashButton';
import { useAsyncAction } from '../hooks/useAsyncAction';

const CryptoPaymentModal = ({ isOpen, onClose, amount, storeId }) => {
  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [error, setError] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const popupRef = useRef(null);
  const { t, syncWalletBalance, formatCurrency } = useAppContext();
  const { execute: executeInvoice, loading } = useAsyncAction();

  const API_BASE_URL = import.meta.env.VITE_API_URL;

  const openPaymentWindow = (url) => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
    } else {
      const width = 600;
      const height = 800;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;
      popupRef.current = window.open(url, 'NOWPaymentsCheckout', `width=${width},height=${height},top=${top},left=${left}`);
    }
  };

  const createInvoice = () => executeInvoice(async () => {
    setError('');
    setPaymentConfirmed(false);

    const res = await fetch(`${API_BASE_URL}/api/payments/nowpayments/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: storeId, amount: parseFloat(amount) })
    });
    const data = await res.json();
    if (data.success && data.invoice_url) {
      setInvoiceUrl(data.invoice_url);
      setInvoiceId(data.invoice_id);
      openPaymentWindow(data.invoice_url);
      return { success: true };
    } else {
      setError(data.error || t('err_failed_gen_invoice'));
      return { success: false };
    }
  });

  useEffect(() => {
    if (isOpen && amount && storeId && !invoiceUrl && !paymentConfirmed && !error) {
      createInvoice();
    }
  }, [isOpen, amount, storeId, invoiceUrl, paymentConfirmed, error]);

  useEffect(() => {
    let intervalId;
    if (isOpen && invoiceId && !paymentConfirmed && !error) {
      const checkStatus = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/payments/status/${invoiceId}`);
          const data = await res.json();
          if (data.success) {
            if (data.status === 'finished' || data.status === 'completed') {
              setPaymentConfirmed(true);
              clearInterval(intervalId);
              if (popupRef.current && !popupRef.current.closed) {
                popupRef.current.close();
              }
              setTimeout(() => {
                onClose();
                syncWalletBalance(storeId);
              }, 3000);
            } else if (data.status === 'failed' || data.status === 'refunded') {
              setError(`${t('payment_status_is')} ${data.status}`);
              clearInterval(intervalId);
            }
          }
        } catch (err) {
          console.error('Error polling payment status:', err);
        }
      };

      intervalId = setInterval(checkStatus, 4000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, invoiceId, paymentConfirmed, error, API_BASE_URL, onClose, storeId, syncWalletBalance]);

  const handleCancel = () => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    setInvoiceUrl('');
    setInvoiceId('');
    setError('');
    setPaymentConfirmed(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title={t('crypto_checkout_nowpayments')}>
      <div className="flex flex-col items-center p-4">
        {loading && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="animate-spin mb-4" size={32} style={{ color: '#60A5FA' }} />
            <p className="text-sm font-semibold text-white mb-1">{t('gen_secure_invoice')}</p>
            <p className="text-xs text-slate-400">{t('connecting_nowpayments')}</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center py-6 w-full">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(248,113,113,0.1)' }}>
              <AlertCircle size={24} className="text-red-400" />
            </div>
            <p className="text-sm font-semibold text-red-400 mb-4 text-center">{error}</p>
            <DashButton 
              onClick={createInvoice} 
              loading={loading}
              className="dash-btn dash-btn-primary py-2 px-6 rounded-lg text-sm font-semibold"
            >
              {t('try_again')}
            </DashButton>
          </div>
        )}

        {!loading && !error && paymentConfirmed && (
          <div className="flex flex-col items-center py-8">
            <div className="relative mb-4 flex items-center justify-center">
              <div
                className="absolute top-1/2 start-1/2 w-16 h-16 rounded-full"
                style={{ background: 'rgba(74,222,128,0.18)', filter: 'blur(8px)', transform: 'translate(-50%, -50%)' }}
              />
              <div className="relative w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.1)' }}>
                <CheckCircle size={32} style={{ color: '#4ade80' }} />
              </div>
            </div>
            <h2 className="text-lg font-bold text-white mb-1">{t('payment_confirmed')}</h2>
            <p className="text-xs text-slate-400">{t('wallet_credited_closing')}</p>
          </div>
        )}

        {!loading && !error && !paymentConfirmed && invoiceUrl && (
          <div className="flex flex-col items-center w-full">
            <div className="mb-6 text-center">
              <span className="text-xs text-slate-400 block mb-1">{t('amount_to_pay')}</span>
              <span className="text-2xl font-black text-white font-mono" dir="ltr">{formatCurrency(amount)}</span>
            </div>

            <div className="p-4 rounded-xl mb-6 w-full text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-center gap-2 mb-2 text-xs font-semibold text-blue-400">
                <Loader2 size={14} className="animate-spin" />
                <span>{t('waiting_for_payment')}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('complete_in_window')}
              </p>
            </div>

            <div className="w-full space-y-3">
              <DashButton
                onClick={() => openPaymentWindow(invoiceUrl)}
                className="dash-btn dash-btn-primary w-full justify-center py-3 rounded-xl text-sm font-bold flex items-center gap-2"
              >
                <ExternalLink size={16} /> {t('open_payment_window')}
              </DashButton>

              <button
                onClick={handleCancel}
                className="w-full py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                {t('cancel')}
              </button>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck size={14} className="text-green-400" />
              <span>{t('secure_trans_nowpayments')}</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CryptoPaymentModal;

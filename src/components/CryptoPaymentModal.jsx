import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { Loader2, ExternalLink, ShieldCheck, CheckCircle } from 'lucide-react';

const CryptoPaymentModal = ({ isOpen, onClose, amount, storeId }) => {
  const [loading, setLoading] = useState(true);
  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [error, setError] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const popupRef = useRef(null);
  
  const API_BASE_URL = import.meta.env.VITE_API_URL || `https://koara-project-production.up.railway.app`;

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

  useEffect(() => {
    let isMounted = true;
    if (isOpen && amount && storeId && !invoiceUrl && !paymentConfirmed && !error) {
      setLoading(true);
      setError('');
      setPaymentConfirmed(false);

      fetch(`${API_BASE_URL}/api/payments/nowpayments/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId, amount: parseFloat(amount) })
      })
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data.success && data.invoice_url) {
          setInvoiceUrl(data.invoice_url);
          setInvoiceId(data.invoice_id);
          setLoading(false);
          openPaymentWindow(data.invoice_url);
        } else {
          setError(data.error || 'Failed to generate invoice.');
          setLoading(false);
        }
      })
      .catch(err => {
        if (!isMounted) return;
        setError('Network error generating invoice.');
        setLoading(false);
      });
    }

    return () => { isMounted = false; };
  }, [isOpen, amount, storeId, API_BASE_URL, invoiceUrl, paymentConfirmed, error]);

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
                window.location.reload(); // Refresh wallet and transaction history
              }, 3000);
            } else if (data.status === 'failed' || data.status === 'refunded') {
              setError(`Payment status: ${data.status}`);
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
  }, [isOpen, invoiceId, paymentConfirmed, error, API_BASE_URL, onClose]);

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
    <Modal isOpen={isOpen} onClose={handleCancel} title="Crypto Checkout">
      <div className="flex flex-col items-center p-4">
        <div className="mb-6 w-32 h-auto">
          <img src="https://nowpayments.io/images/embeds/payments-button-black.svg" alt="NOWPayments" className="w-full" />
        </div>

        {loading && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="animate-spin mb-4" size={32} style={{ color: '#60A5FA' }} />
            <p className="text-sm font-medium" style={{ color: '#94A3B8' }}>Generating secure invoice...</p>
          </div>
        )}

        {error && (
          <div className="koara-error-msg w-full mb-4">
            {error}
          </div>
        )}

        {paymentConfirmed && (
          <div className="flex flex-col items-center py-8">
             <CheckCircle className="mb-4" size={48} style={{ color: '#4ade80' }} />
             <h2 className="text-xl font-bold text-white mb-2">Payment Confirmed</h2>
             <p className="text-sm text-center" style={{ color: '#94A3B8' }}>
               Your wallet has been updated successfully.
             </p>
          </div>
        )}

        {!loading && !error && !paymentConfirmed && invoiceUrl && (
          <div className="w-full flex flex-col items-center">
            <div className="mb-8 text-center flex flex-col items-center">
              <Loader2 className="animate-spin mb-4" size={40} style={{ color: '#60A5FA' }} />
              <p className="text-sm text-white font-semibold mb-2">Payment window has been opened</p>
              <p className="text-xs" style={{ color: '#94A3B8' }}>Please complete your payment in the popup window.</p>
              <p className="text-xs mt-1" style={{ color: '#64748B' }}>Waiting for payment confirmation...</p>
            </div>

            <div className="w-full space-y-3">
              <button onClick={() => openPaymentWindow(invoiceUrl)} className="dash-btn dash-btn-primary w-full justify-center py-2.5">
                <ExternalLink size={16} className="mr-2" /> Open Payment Window Again
              </button>
              <button onClick={handleCancel} className="dash-btn dash-btn-secondary w-full justify-center py-2.5" style={{ color: '#f87171' }}>
                Cancel Payment
              </button>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs" style={{ color: '#64748B' }}>
              <ShieldCheck size={14} style={{ color: '#4ade80' }} />
              Secure transaction via NOWPayments
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CryptoPaymentModal;

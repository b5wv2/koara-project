import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { Loader2, ExternalLink, ShieldCheck, CheckCircle, AlertCircle, Check } from 'lucide-react';

const CryptoPaymentModal = ({ isOpen, onClose, amount, storeId }) => {
  const [loading, setLoading] = useState(true);
  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [error, setError] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const popupRef = useRef(null);

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

  // Derived progress step for the indicator: 1 = generating invoice, 2 = awaiting payment, 3 = confirmed
  const step = paymentConfirmed ? 3 : invoiceUrl ? 2 : 1;
  const steps = [
    { id: 1, label: 'Invoice' },
    { id: 2, label: 'Payment' },
    { id: 3, label: 'Confirmed' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Crypto Checkout">
      <div className="flex flex-col items-center p-4">

        <div className="mb-6 w-full flex flex-col items-center">
          <div className="w-28 h-auto p-3 rounded-xl mb-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <img src="https://nowpayments.io/images/embeds/payments-button-black.svg" alt="NOWPayments" className="w-full" />
          </div>

          {!error && (
            <div className="w-full max-w-[260px]">
              <div className="flex gap-1.5 mb-2">
                {steps.map((s) => {
                  const isDone = paymentConfirmed || step > s.id;
                  const isActive = !isDone && step === s.id;
                  return (
                    <div
                      key={s.id}
                      className="flex-1 h-1.5 rounded-full transition-all duration-500"
                      style={{ background: isDone ? '#4ade80' : isActive ? '#60A5FA' : 'rgba(255,255,255,0.08)' }}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between">
                {steps.map((s) => {
                  const isDone = paymentConfirmed || step > s.id;
                  return (
                    <span
                      key={s.id}
                      className="text-[10px] font-medium flex items-center gap-1"
                      style={{ color: isDone || step === s.id ? '#CBD5E1' : '#475569' }}
                    >
                      {isDone && <Check size={10} style={{ color: '#4ade80' }} />}
                      {s.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex flex-col items-center py-10">
            <Loader2 className="animate-spin mb-4" size={32} style={{ color: '#60A5FA' }} />
            <p className="text-sm font-semibold text-white mb-1">Generating secure invoice</p>
            <p className="text-xs" style={{ color: '#64748B' }}>This will only take a moment...</p>
          </div>
        )}

        {error && (
          <div className="w-full flex flex-col items-center py-2">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(248,113,113,0.12)' }}>
              <AlertCircle size={28} style={{ color: '#f87171' }} />
            </div>
            <div className="koara-error-msg w-full mb-4 text-center">
              {error}
            </div>
            <button onClick={handleCancel} className="dash-btn dash-btn-secondary w-full justify-center py-2.5">
              Close
            </button>
          </div>
        )}

        {paymentConfirmed && (
          <div className="flex flex-col items-center py-8">
            <div className="relative mb-5 flex items-center justify-center">
              <div
                className="absolute top-1/2 left-1/2 w-20 h-20 rounded-full"
                style={{ background: 'rgba(74,222,128,0.18)', filter: 'blur(10px)', transform: 'translate(-50%, -50%)' }}
              />
              <div className="relative w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.1)' }}>
                <CheckCircle size={36} style={{ color: '#4ade80' }} />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white mb-1.5">Payment Confirmed</h2>
            <p className="text-sm text-center max-w-[240px]" style={{ color: '#94A3B8' }}>
              Your wallet has been updated successfully.
            </p>
          </div>
        )}

        {!loading && !error && !paymentConfirmed && invoiceUrl && (
          <div className="w-full flex flex-col items-center">
            <div
              className="mb-7 w-full text-center flex flex-col items-center px-3 py-6 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Loader2 className="animate-spin mb-4" size={30} style={{ color: '#60A5FA' }} />
              <p className="text-sm text-white font-semibold mb-1.5">Payment window opened</p>
              <p className="text-xs max-w-[260px]" style={{ color: '#94A3B8' }}>Please complete your payment in the popup window.</p>
              <p className="text-[11px] mt-2" style={{ color: '#64748B' }}>Waiting for payment confirmation...</p>
            </div>

            <div className="w-full space-y-2.5">
              <button
                onClick={() => openPaymentWindow(invoiceUrl)}
                className="dash-btn dash-btn-primary w-full justify-center py-3 gap-2 transition-all duration-300"
                style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #7C3AED 100%)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 12px 24px -8px rgba(59,130,246,0.5)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <ExternalLink size={16} /> Open Payment Window Again
              </button>
              <button
                onClick={handleCancel}
                className="dash-btn dash-btn-secondary w-full justify-center py-3 transition-all duration-300"
                style={{ color: '#f87171' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; }}
              >
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
import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { Loader2, ExternalLink, ShieldCheck } from 'lucide-react';

const CryptoPaymentModal = ({ isOpen, onClose, amount, storeId }) => {
  const [loading, setLoading] = useState(true);
  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [error, setError] = useState('');
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const API_BASE_URL = import.meta.env.VITE_API_URL || `https://koara-project-production.up.railway.app`;

  useEffect(() => {
    let isMounted = true;
    if (isOpen && amount && storeId) {
      setLoading(true);
      setError('');
      setInvoiceUrl('');
      setIframeBlocked(false);

      // Generate a brand new invoice
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
          localStorage.setItem('pending_crypto_invoice', data.invoice_id);
        } else {
          setError(data.error || 'Failed to generate invoice.');
        }
      })
      .catch(err => {
        if (!isMounted) return;
        setError('Network error generating invoice.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    }

    return () => { isMounted = false; };
  }, [isOpen, amount, storeId, API_BASE_URL]);

  const handleOpenPopup = () => {
    if (invoiceUrl) {
      const width = 600;
      const height = 800;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;
      window.open(invoiceUrl, 'NOWPayments', `width=${width},height=${height},top=${top},left=${left}`);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Crypto Payment">
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

        {invoiceUrl && !loading && (
          <div className="w-full flex flex-col items-center">
            {/* Payment Status Message */}
            <div className="mb-4 text-center">
              <p className="text-sm text-white font-semibold">Invoice generated for ${parseFloat(amount).toFixed(2)}</p>
              <p className="text-xs mt-1" style={{ color: '#64748B' }}>Please complete the payment in the window below.</p>
            </div>

            {/* IFRAME Container */}
            {!iframeBlocked ? (
              <div className="w-full bg-white rounded-xl overflow-hidden mb-4 relative" style={{ height: '500px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <iframe
                  src={invoiceUrl}
                  title="NOWPayments Checkout"
                  className="w-full h-full border-0"
                  onLoad={(e) => {
                    // Very basic heuristic: if it fails to load due to X-Frame-Options, we might catch it, 
                    // though browsers usually block script access to cross-origin frame states.
                    // We provide a manual fallback button below anyway.
                  }}
                  onError={() => setIframeBlocked(true)}
                />
              </div>
            ) : null}

            {/* Fallback / External Link */}
            <div className="w-full p-4 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs mb-3" style={{ color: '#94A3B8' }}>If the payment page does not load in the frame above, open it securely in a new window.</p>
              <button onClick={handleOpenPopup} className="dash-btn dash-btn-primary w-full justify-center">
                <ExternalLink size={16} className="mr-2" /> Open Payment Window
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

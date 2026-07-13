import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Loader2, ExternalLink, ShieldCheck, CheckCircle, AlertCircle, Check, Copy } from 'lucide-react';
import QRCode from 'react-qr-code';

const NETWORKS = [
  { id: 'usdttrc20', name: 'USDT (TRC20)', symbol: '₮' },
  { id: 'usdtbsc', name: 'USDT (BEP20)', symbol: '₮' },
  { id: 'usdtmatic', name: 'USDT (Polygon)', symbol: '₮' }
];

const SubscriptionPaymentModal = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1 = network, 2 = loading, 3 = payment, 4 = confirmed, 5 = expired
  const [selectedNetwork, setSelectedNetwork] = useState('');
  
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState('');
  
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  // Reset modal state when it opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedNetwork('');
      setPaymentData(null);
      setError('');
    }
  }, [isOpen]);

  const handleNetworkSelect = (networkId) => {
    setSelectedNetwork(networkId);
  };

  const handleCreateInvoice = async () => {
    if (!selectedNetwork) return;
    
    setStep(2); // Loading
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/subscription/upgrade/crypto-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pay_currency: selectedNetwork })
      });
      
      const data = await res.json();
      
      if (data.success && data.pay_address) {
        setPaymentData(data);
        setStep(3); // Payment view
      } else {
        setError(data.error || 'Failed to generate invoice.');
        setStep(1); // Back to selection if error
      }
    } catch (err) {
      console.error('Error creating invoice:', err);
      setError('Network error generating invoice.');
      setStep(1);
    }
  };

  // Polling for subscription status
  useEffect(() => {
    let intervalId;
    if (isOpen && step === 3) {
      const checkStatus = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/subscription`, { credentials: 'include' });
          const data = await res.json();
          
          if (data && data.plan === 'plus' && data.status === 'active') {
            setStep(4); // Confirmed
            clearInterval(intervalId);
            setTimeout(() => {
              onSuccess(); // Close modal and refresh externally
            }, 3000);
          }
        } catch (err) {
          console.error('Error polling subscription status:', err);
        }
      };

      intervalId = setInterval(checkStatus, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, step, API_BASE_URL, onSuccess]);

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
  };

  const handleClose = () => {
    // If we close before payment is confirmed, do nothing special, webhook handles it
    onClose();
  };

  const currentNetwork = NETWORKS.find(n => n.id === selectedNetwork);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Koara Plus Checkout">
      <div className="flex flex-col items-center p-4">

        {/* --- STEP 1: NETWORK SELECTION --- */}
        {step === 1 && (
          <div className="w-full">
            <h3 className="text-lg font-bold text-white mb-4 text-center">Select Network</h3>
            <div className="space-y-3 mb-6">
              {NETWORKS.map(net => (
                <button
                  key={net.id}
                  onClick={() => handleNetworkSelect(net.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 border ${selectedNetwork === net.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700/50 bg-slate-800/30'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${selectedNetwork === net.id ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                      {net.symbol}
                    </div>
                    <span className="font-semibold text-white">{net.name}</span>
                  </div>
                  {selectedNetwork === net.id && <CheckCircle size={20} className="text-blue-400" />}
                </button>
              ))}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm flex gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleCreateInvoice}
              disabled={!selectedNetwork}
              className="dash-btn dash-btn-primary w-full justify-center py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Payment
            </button>
          </div>
        )}

        {/* --- STEP 2: LOADING --- */}
        {step === 2 && (
          <div className="flex flex-col items-center py-10 w-full">
            <Loader2 className="animate-spin mb-4" size={32} style={{ color: '#60A5FA' }} />
            <p className="text-sm font-semibold text-white mb-1">Generating secure invoice</p>
            <p className="text-xs" style={{ color: '#64748B' }}>Connecting to {currentNetwork?.name}...</p>
          </div>
        )}

        {/* --- STEP 3: PAYMENT DETAILS --- */}
        {step === 3 && paymentData && (
          <div className="w-full flex flex-col items-center">
            
            <div className="mb-5 w-full max-w-[260px]">
              <div className="flex justify-between items-center mb-1.5">
                 <span className="text-xs font-semibold text-slate-300">Awaiting Payment</span>
                 <Loader2 size={12} className="animate-spin text-blue-400" />
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full w-2/3 animate-pulse"></div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl mb-6 flex justify-center items-center shadow-lg shadow-white/5">
              <QRCode 
                value={paymentData.pay_address} 
                size={160} 
                level="M" 
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>

            <div className="w-full space-y-4 mb-6">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <p className="text-xs text-slate-400 mb-1">Amount to send</p>
                <div className="flex justify-between items-center">
                  <div className="font-mono text-lg font-bold text-white">
                    {paymentData.pay_amount} <span className="text-sm text-slate-400">{paymentData.pay_currency?.toUpperCase()}</span>
                  </div>
                  <button onClick={() => handleCopy(paymentData.pay_amount, 'Amount')} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors" title="Copy Amount">
                    <Copy size={16} className="text-slate-300" />
                  </button>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <p className="text-xs text-slate-400 mb-1">Payment Address ({currentNetwork?.name})</p>
                <div className="flex justify-between items-center gap-3">
                  <div className="font-mono text-xs text-slate-300 break-all leading-tight">
                    {paymentData.pay_address}
                  </div>
                  <button onClick={() => handleCopy(paymentData.pay_address, 'Address')} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors shrink-0" title="Copy Address">
                    <Copy size={16} className="text-slate-300" />
                  </button>
                </div>
              </div>
            </div>

            {paymentData.invoice_url && (
              <a 
                href={paymentData.invoice_url} 
                target="_blank" 
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 mb-4 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <ExternalLink size={16} /> Open in NOWPayments (Fallback)
              </a>
            )}

            <div className="flex items-center justify-center gap-2 text-xs" style={{ color: '#64748B' }}>
              <ShieldCheck size={14} style={{ color: '#4ade80' }} />
              Secure transaction via NOWPayments
            </div>
          </div>
        )}

        {/* --- STEP 4: CONFIRMED --- */}
        {step === 4 && (
          <div className="flex flex-col items-center py-8 w-full">
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
              Your Koara Plus subscription has been activated successfully.
            </p>
          </div>
        )}

        {/* --- STEP 5: EXPIRED --- */}
        {step === 5 && (
          <div className="flex flex-col items-center py-8 w-full">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: 'rgba(248,113,113,0.1)' }}>
               <AlertCircle size={32} className="text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Payment Expired</h2>
            <p className="text-sm text-center max-w-[240px] text-slate-400 mb-6">
              The time window to pay this invoice has closed.
            </p>
            <div className="w-full space-y-3">
              <button 
                onClick={() => setStep(1)} 
                className="dash-btn dash-btn-primary w-full justify-center py-3 rounded-xl"
              >
                Create New Invoice
              </button>
              <button 
                onClick={handleClose} 
                className="w-full py-3 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Close
              </button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};

export default SubscriptionPaymentModal;

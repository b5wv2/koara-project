import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import KoaraLogo from '../assets/koara-logo.svg';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('waiting'); // waiting, finished, error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const invoiceId = localStorage.getItem('pending_crypto_invoice');
    
    if (!invoiceId) {
      setErrorMsg('No pending payment found. Return to dashboard.');
      setStatus('error');
      return;
    }

    let intervalId;
    
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/payments/status/${invoiceId}`);
        const data = await res.json();
        
        if (data.success) {
          if (data.status === 'finished' || data.status === 'completed') {
            setStatus('finished');
            localStorage.removeItem('pending_crypto_invoice');
            clearInterval(intervalId);
            
            // Redirect after showing success for 3 seconds
            setTimeout(() => {
              navigate('/admin');
            }, 3000);
          } else if (data.status === 'failed' || data.status === 'expired' || data.status === 'refunded') {
            setStatus('error');
            setErrorMsg(`Payment status: ${data.status}`);
            clearInterval(intervalId);
          }
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    };

    // Check immediately, then every 5 seconds
    checkStatus();
    intervalId = setInterval(checkStatus, 5000);

    return () => clearInterval(intervalId);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden" style={{ background: '#020617' }}>
      
      {/* Background aesthetics */}
      <div className="absolute top-1/4 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />

      <div className="z-10 text-center flex flex-col items-center max-w-md w-full">
        <img src={KoaraLogo} alt="Koara" className="h-10 w-auto mb-10" />

        <div className="dash-card p-8 w-full">
          {status === 'waiting' && (
            <>
              <Loader2 className="animate-spin mx-auto mb-6" size={48} style={{ color: '#60A5FA' }} />
              <h2 className="text-xl font-bold text-white mb-2">Payment Received</h2>
              <p className="text-sm" style={{ color: '#94A3B8' }}>
                Waiting for blockchain confirmation...<br/>
                Please do not close this page.
              </p>
            </>
          )}

          {status === 'finished' && (
            <>
              <CheckCircle className="mx-auto mb-6" size={48} style={{ color: '#4ade80' }} />
              <h2 className="text-xl font-bold text-white mb-2">Wallet Updated Successfully</h2>
              <p className="text-sm" style={{ color: '#94A3B8' }}>
                Your funds have been credited to your store's wallet.
              </p>
              <div className="mt-6 flex justify-center">
                <Loader2 className="animate-spin" size={16} style={{ color: '#475569' }} />
                <span className="text-xs ml-2" style={{ color: '#64748B' }}>Redirecting to dashboard...</span>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertTriangle className="mx-auto mb-6" size={48} style={{ color: '#f87171' }} />
              <h2 className="text-xl font-bold text-white mb-2">Payment Issue</h2>
              <p className="text-sm" style={{ color: '#94A3B8' }}>
                {errorMsg}
              </p>
              <button 
                onClick={() => navigate('/admin')}
                className="mt-8 dash-btn dash-btn-secondary w-full justify-center py-3"
              >
                Return to Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;

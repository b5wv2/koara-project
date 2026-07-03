import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import KoaraLogo from '../assets/koara-logo.svg';

const PaymentCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden" style={{ background: '#020617' }}>
      
      {/* Background aesthetics */}
      <div className="absolute top-1/4 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #f87171 0%, transparent 70%)' }} />

      <div className="z-10 text-center flex flex-col items-center max-w-md w-full">
        <img src={KoaraLogo} alt="Koara" className="h-10 w-auto mb-10" />

        <div className="dash-card p-8 w-full">
          <XCircle className="mx-auto mb-6" size={48} style={{ color: '#f87171' }} />
          <h2 className="text-xl font-bold text-white mb-2">Payment Cancelled</h2>
          <p className="text-sm mb-8" style={{ color: '#94A3B8' }}>
            Your payment was not completed.<br/>
            No funds have been added to your wallet.
          </p>
          
          <button 
            onClick={() => navigate('/admin')}
            className="dash-btn dash-btn-primary w-full justify-center py-3"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;

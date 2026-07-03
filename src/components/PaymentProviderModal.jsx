import React from 'react';
import Modal from './Modal';
import { CreditCard, ChevronRight } from 'lucide-react';

const PaymentProviderModal = ({ isOpen, onClose, amount, onSelectProvider }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Choose Payment Provider">
      <div className="space-y-4">
        <p className="text-sm" style={{ color: '#64748B' }}>
          Select a payment method to add <strong>${amount}</strong> to your wallet.
        </p>

        <div className="space-y-3">
          {/* NOWPayments Option */}
          <button
            onClick={() => onSelectProvider('nowpayments')}
            className="w-full flex items-center justify-between p-4 rounded-xl transition-all"
            style={{ 
              background: 'rgba(255,255,255,0.03)', 
              border: '1px solid rgba(255,255,255,0.08)' 
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
            }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-white shrink-0">
                <img 
                  src="https://nowpayments.io/images/embeds/payments-button-black.svg" 
                  alt="NOWPayments" 
                  className="w-full h-auto"
                />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-white">NOWPayments</div>
                <div className="text-xs" style={{ color: '#94A3B8' }}>Pay with Crypto</div>
              </div>
            </div>
            <ChevronRight size={18} style={{ color: '#64748B' }} />
          </button>

          {/* Future Extensibility: Stripe, PayPal, etc. */}
          {/* 
          <button disabled className="w-full flex items-center justify-between p-4 rounded-xl opacity-50 cursor-not-allowed" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 flex items-center justify-center rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                 <CreditCard size={20} style={{ color: '#94A3B8' }} />
               </div>
               <div className="text-left">
                 <div className="text-sm font-bold text-white">Stripe (Coming Soon)</div>
                 <div className="text-xs" style={{ color: '#94A3B8' }}>Credit / Debit Cards</div>
               </div>
             </div>
          </button>
          */}
        </div>
      </div>
    </Modal>
  );
};

export default PaymentProviderModal;

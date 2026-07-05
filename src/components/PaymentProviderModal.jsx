import React from 'react';
import Modal from './Modal';
import { Landmark, ChevronRight, ShieldCheck } from 'lucide-react';

const PaymentProviderModal = ({ isOpen, onClose, amount, onSelectProvider }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Choose Payment Provider">
      <div className="space-y-5">
        <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>
          Select a payment method to add <span className="text-white font-bold">${amount}</span> to your wallet.
        </p>

        <div className="space-y-3">
          {/* NOWPayments Option */}
          <button
            onClick={() => onSelectProvider('nowpayments')}
            className="w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.borderColor = 'rgba(139,92,246,0.45)';
              e.currentTarget.style.boxShadow = '0 14px 28px -12px rgba(139,92,246,0.4)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 flex items-center justify-center rounded-xl shrink-0 p-2.5"
                style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #7C3AED 100%)' }}
              >
                <div className="w-full h-full flex items-center justify-center rounded-lg bg-white p-1.5">
                  <img
                    src="https://nowpayments.io/images/embeds/payments-button-black.svg"
                    alt="NOWPayments"
                    className="w-full h-auto"
                  />
                </div>
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-white mb-0.5">NOWPayments</div>
                <div className="text-xs" style={{ color: '#94A3B8' }}>Pay with Crypto</div>
              </div>
            </div>
            <ChevronRight size={18} style={{ color: '#64748B' }} />
          </button>

          {/* Local Bank Transfer Option */}
          <button
            onClick={() => onSelectProvider('local_bank')}
            className="w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.borderColor = 'rgba(16,185,129,0.45)';
              e.currentTarget.style.boxShadow = '0 14px 28px -12px rgba(16,185,129,0.4)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 flex items-center justify-center rounded-xl shrink-0"
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)' }}
              >
                <Landmark size={26} color="white" strokeWidth={2} />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-white mb-0.5">Local Bank Transfer</div>
                <div className="text-xs" style={{ color: '#94A3B8' }}>Direct Transfer to our Bank</div>
              </div>
            </div>
            <ChevronRight size={18} style={{ color: '#64748B' }} />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 pt-1 text-xs" style={{ color: '#64748B' }}>
          <ShieldCheck size={13} style={{ color: '#4ade80' }} />
          All transactions are encrypted and secure
        </div>
      </div>
    </Modal>
  );
};

export default PaymentProviderModal;
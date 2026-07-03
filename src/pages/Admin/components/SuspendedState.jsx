import React from 'react';
import { ShieldCheck } from 'lucide-react';

/**
 * Suspended store full-page message.
 */
const SuspendedState = ({ logout }) => (
  <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#020617' }}>
    <div className="max-w-md w-full rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <ShieldCheck size={28} style={{ color: '#f87171' }} />
      </div>
      <h1 className="text-xl font-bold text-white mb-2">Store Suspended</h1>
      <p className="text-sm mb-8 leading-relaxed" style={{ color: '#64748B' }}>
        Your store has been temporarily suspended by the administration team.
        If you believe this is a mistake, please contact support for assistance.
      </p>
      <div className="space-y-3">
        <button className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-colors" style={{ background: 'linear-gradient(135deg,#2563EB,#3B82F6)' }}>
          Contact Support
        </button>
        <button onClick={logout} className="w-full py-3 rounded-xl text-sm font-semibold transition-colors" style={{ background: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
          Logout
        </button>
      </div>
    </div>
  </div>
);

export default SuspendedState;

import React from 'react';
import { Crown } from 'lucide-react';

const PremiumLockOverlay = ({ isPlusActive, onUpgrade, children, compact = false }) => {
  if (isPlusActive) {
    return (
      <div className="relative h-full">
        <div className="absolute top-2 right-2 z-10 pointer-events-none">
          <div className="flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow-sm">
            <Crown size={10} /> PLUS
          </div>
        </div>
        {children}
      </div>
    );
  }
  return (
    <div className="relative rounded-xl overflow-hidden group h-full">
      <div className="opacity-40 pointer-events-none blur-[1px] select-none h-full">
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center" style={{ background: 'rgba(2, 6, 23, 0.6)', backdropFilter: 'blur(3px)' }}>
        <div className="flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow-sm mb-3">
          <Crown size={10} /> PLUS
        </div>
        {!compact && <div className="text-sm font-semibold text-white mb-1">Upgrade to Koara Plus to unlock this feature.</div>}
        <button onClick={onUpgrade} className="dash-btn py-1.5 px-4 rounded-lg text-xs font-bold text-white shadow-lg mt-2 transition-transform hover:scale-105" style={{ background: 'linear-gradient(135deg, #2563EB, #4F46E5)' }}>
          Upgrade
        </button>
      </div>
    </div>
  );
};

export default PremiumLockOverlay;

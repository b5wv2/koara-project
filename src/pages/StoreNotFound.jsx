import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const StoreNotFound = () => {
  const { language } = useAppContext();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: '#020617' }}>
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(37,99,235,0.08) 0%, transparent 70%)'
        }}
        aria-hidden="true"
      />

      <div
        className="relative z-10 max-w-md w-full text-center p-10 rounded-3xl"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 80px -12px rgba(0,0,0,0.5)'
        }}
      >
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{
            background: 'rgba(37,99,235,0.12)',
            border: '1px solid rgba(37,99,235,0.2)',
          }}
        >
          <ShoppingBag size={36} style={{ color: '#60A5FA' }} />
        </div>

        {/* Label */}
        <div
          className="text-xs font-bold uppercase tracking-widest mb-4 inline-flex items-center gap-2"
          style={{ color: '#60A5FA' }}
        >
          404
        </div>

        <h1 className="text-2xl font-bold text-white mb-3 tracking-tight">
          {language === 'ar' ? 'المتجر غير موجود' : 'Store Not Found'}
        </h1>
        <p className="text-slate-400 mb-8 leading-relaxed text-sm">
          {language === 'ar'
            ? 'المتجر الذي تحاول الوصول إليه غير موجود أو تم إيقافه.'
            : 'The store you are trying to access does not exist or has been suspended.'}
        </p>

        <a
          href={import.meta.env.VITE_MAIN_URL || 'https://getkoara.com'}
          className="inline-flex items-center gap-2 font-semibold text-sm py-3 px-7 rounded-full transition-all"
          style={{
            background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
            color: '#fff',
            boxShadow: '0 4px 20px -4px rgba(37,99,235,0.5)'
          }}
        >
          {language === 'ar' ? 'العودة للصفحة الرئيسية' : 'Return to Homepage'}
          <ArrowRight size={15} />
        </a>
      </div>

      <div className="mt-8 text-sm text-slate-600 relative z-10">
        Powered by <span className="font-semibold text-slate-500">Koara</span>
      </div>
    </div>
  );
};

export default StoreNotFound;

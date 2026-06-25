import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import OnboardingModal from '../components/OnboardingModal';
import LoginModal from '../components/LoginModal';
import StoreStatusModal from '../components/StoreStatusModal';
import PasswordResetModal from '../components/PasswordResetModal';
import { Store, Wallet, ShieldCheck, FileText, BarChart2, TrendingUp, ArrowRight, Zap, Globe, Lock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import AmbientWaveBackground from '../components/AmbientWaveBackground';
import InteractiveGrid from '../components/InteractiveGrid';
import LightPillar from '../components/LightPillar';

const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="glass-card p-7 relative z-10 group">
    <div className="feature-icon mb-5">
      <Icon size={22} />
    </div>
    <h3 className="font-bold text-lg mb-2.5 text-white">{title}</h3>
    <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
  </div>
);

const LandingPage = () => {
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [storeRequestStatus, setStoreRequestStatus] = useState(null);
  const { t } = useAppContext();


  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: '#020617' }}>
      <AmbientWaveBackground />
      <InteractiveGrid />

      <Header
        onStartSelling={() => setIsOnboardingOpen(true)}
        onSignIn={() => setIsLoginOpen(true)}
      />

      <main className="flex-1 relative z-10">
        {/* ═══════════════════════════════════════════════════════════════
            HERO SECTION
        ═══════════════════════════════════════════════════════════════ */}
        <section className="max-w-5xl mx-auto px-4 sm:px-8 pt-20 sm:pt-32 pb-24 sm:pb-36 relative text-center">
          <div className="flex flex-col items-center justify-center relative">

            {/* Hero Content */}
            <div className="w-full relative flex flex-col items-center justify-center z-10">

              <div className="text-xs font-bold uppercase tracking-[0.2em] mb-6 inline-flex items-center justify-center gap-3" style={{ color: '#60A5FA' }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#3B82F6' }}></span>
                PLATFORM OVERVIEW
              </div>

              {/* Headline with LightPillar effect behind the text */}
              <div className="relative mb-8 w-full max-w-4xl">
                {/* Dark radial backdrop — provides contrast for the LightPillar */}
                <div className="hero-light-backdrop" aria-hidden="true" />
                {/* LightPillar layer — sits below the text via z-index */}
                <div className="hero-light-effect" aria-hidden="true">
                  <LightPillar
                    topColor="#4438fa"
                    bottomColor="#00bfff"
                    intensity={0.9}
                    rotationSpeed={0.2}
                    glowAmount={0.0015}
                    pillarWidth={3}
                    pillarHeight={0.4}
                    noiseIntensity={0.25}
                    pillarRotation={25}
                    interactive={false}
                    mixBlendMode="normal"
                    quality="low"
                  />
                </div>
                <h1
                  className="relative z-10 text-4xl sm:text-6xl md:text-[5.5rem] font-extrabold tracking-tight leading-[1.05]"
                  style={{ color: '#ffffff', textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}
                >
                  A single platform,<br />
                  a year's worth<br />
                  of impact.
                </h1>
              </div>

              <p className="text-lg sm:text-xl mb-10 max-w-2xl leading-relaxed font-medium mx-auto" style={{ color: '#94A3B8' }}>
                Start selling digital products in MENA seamlessly. No coding required. Handle KYC, accept payments, and automatically deliver digital codes in seconds.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={() => setIsOnboardingOpen(true)}
                  className="btn-primary px-8 py-4 text-base flex items-center justify-center gap-2"
                >
                  {t('start_store_free')} <ArrowRight size={18} className="rtl:rotate-180" />
                </button>
                <button className="btn-secondary px-6 py-4 text-sm">
                  Watch demo
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            STATS / SOCIAL PROOF SECTION
        ═══════════════════════════════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-8 pb-20 sm:pb-28 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              ['10K+', 'Active Merchants'],
              ['$2.4M', 'Monthly Volume'],
              ['99.9%', 'Uptime SLA'],
              ['<1s', 'Delivery Speed']
            ].map(([value, label]) => (
              <div key={label} className="glass-card text-center py-8 px-4">
                <div className="stat-value mb-2">{value}</div>
                <div className="text-sm font-medium" style={{ color: '#94A3B8' }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            FEATURES SECTION
        ═══════════════════════════════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-8 py-20 sm:py-28 relative z-10 section-glow">
          <div className="mb-16 text-center">
            <div className="text-xs font-bold uppercase tracking-[0.2em] mb-4 inline-flex items-center gap-2" style={{ color: '#60A5FA' }}>
              <Zap size={14} />
              FEATURES
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-6">{t('features_title')}</h2>
            <p className="text-lg sm:text-xl max-w-2xl mx-auto" style={{ color: '#94A3B8' }}>
              From merchant KYC to wallet ledger entries, the whole commerce lifecycle ships as one cohesive system, beautifully integrated.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            <FeatureCard
              icon={Store}
              title={t('feature_1_title')}
              description={t('feature_1_desc')}
            />
            <FeatureCard
              icon={Wallet}
              title={t('feature_2_title')}
              description={t('feature_2_desc')}
            />
            <FeatureCard
              icon={ShieldCheck}
              title="KYC Onboarding"
              description="Multi-step verification with bank details and ID document review natively integrated."
            />
            <FeatureCard
              icon={FileText}
              title="Receipt Inspection"
              description="Customers upload bank transfer slips seamlessly. Merchants approve or reject instantly."
            />
            <FeatureCard
              icon={BarChart2}
              title="Data-Rich Dashboards"
              description="Revenue charts, transaction ledgers, and platform-wide analytics at your fingertips."
            />
            <FeatureCard
              icon={TrendingUp}
              title={t('feature_3_title')}
              description={t('feature_3_desc')}
            />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            HOW IT WORKS SECTION
        ═══════════════════════════════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-8 py-20 sm:py-28 relative z-10 section-glow">
          <div className="mb-16 text-center">
            <div className="text-xs font-bold uppercase tracking-[0.2em] mb-4 inline-flex items-center gap-2" style={{ color: '#60A5FA' }}>
              <Globe size={14} />
              HOW IT WORKS
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-6">Three steps to launch</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: '#94A3B8' }}>
              Go from zero to live storefront in minutes, not weeks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create your store', desc: 'Sign up, complete KYC verification, and configure your digital product catalog.' },
              { step: '02', title: 'Connect payments', desc: 'Link your bank account or wallet. We handle the payment processing and settlements.' },
              { step: '03', title: 'Start selling', desc: 'Share your storefront link. Orders are fulfilled automatically with instant code delivery.' }
            ].map(({ step, title, desc }) => (
              <div key={step} className="glass-card p-8 relative group">
                <div className="text-5xl font-black mb-6" style={{ color: 'rgba(37,99,235,0.15)' }}>{step}</div>
                <h3 className="text-lg font-bold text-white mb-3">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            SECURITY / TRUST SECTION
        ═══════════════════════════════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-8 py-20 sm:py-28 relative z-10 section-glow">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] mb-4 inline-flex items-center gap-2" style={{ color: '#60A5FA' }}>
                <Lock size={14} />
                ENTERPRISE SECURITY
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-6">
                Built for trust.<br />Designed for scale.
              </h2>
              <p className="text-lg leading-relaxed mb-8" style={{ color: '#94A3B8' }}>
                Every transaction is encrypted, every merchant is verified, and every wallet balance is reconciled in real-time. Your data never leaves our secure infrastructure.
              </p>
              <div className="flex flex-wrap gap-3">
                {['End-to-End Encryption', 'KYC Verified', 'PCI Compliant', 'Real-time Audit Logs'].map(tag => (
                  <span key={tag} className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', color: '#60A5FA' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { val: '256-bit', label: 'AES Encryption' },
                { val: '100%', label: 'KYC Coverage' },
                { val: '<50ms', label: 'API Latency' },
                { val: '24/7', label: 'Monitoring' }
              ].map(({ val, label }) => (
                <div key={label} className="glass-card p-6 text-center">
                  <div className="text-2xl font-extrabold text-white mb-1">{val}</div>
                  <div className="text-xs font-medium" style={{ color: '#94A3B8' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            CTA SECTION
        ═══════════════════════════════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-8 py-20 sm:py-28 relative z-10">
          <div className="rounded-[2rem] p-12 sm:p-16 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0B1220 0%, #080D18 50%, #0B1220 100%)', border: '1px solid rgba(255,255,255,0.04)' }}>
            {/* Background glow */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-gradient-to-br from-[#2563EB]/20 via-[#4F46E5]/10 to-transparent blur-[80px] rounded-full"></div>
            </div>

            <div className="relative z-10">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-6">
                Ready to transform your<br />digital commerce?
              </h2>
              <p className="text-lg max-w-xl mx-auto mb-10" style={{ color: '#94A3B8' }}>
                Join thousands of merchants already selling on Koara. Set up your store in minutes.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => setIsOnboardingOpen(true)}
                  className="btn-primary px-10 py-4 text-base flex items-center gap-2"
                >
                  Get started free <ArrowRight size={18} className="rtl:rotate-180" />
                </button>
                <button className="btn-secondary px-8 py-4 text-sm">
                  Talk to sales
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <OnboardingModal isOpen={isOnboardingOpen} onClose={() => setIsOnboardingOpen(false)} />
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} onStoreStatus={setStoreRequestStatus} onForgot={() => setIsPasswordResetOpen(true)} />
      <PasswordResetModal isOpen={isPasswordResetOpen} onClose={() => setIsPasswordResetOpen(false)} />
      <StoreStatusModal isOpen={!!storeRequestStatus} onClose={() => setStoreRequestStatus(null)} storeRequestStatus={storeRequestStatus} />
    </div>
  );
};

export default LandingPage;

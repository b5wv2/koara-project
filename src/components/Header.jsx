import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import KoaraLogo from '../assets/koara-logo.svg';

const Header = ({ onStartSelling, onSignIn }) => {
  const { language, setLanguage, t } = useAppContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLanguage = () => {
    setLanguage(t('ar'));
    setIsMobileMenuOpen(false);
  };

  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  const handleSignInClick = () => {
    setIsMobileMenuOpen(false);
    onSignIn();
  };

  const handleStartSellingClick = () => {
    setIsMobileMenuOpen(false);
    onStartSelling();
  };

  return (
    <>
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#020617]/80 backdrop-blur-lg border-b border-white/5 py-3' : 'bg-transparent py-5'}`}>
        <div className="flex items-center justify-between px-4 sm:px-8 max-w-7xl mx-auto w-full">
          <div className="flex-1 flex items-center justify-start">
            <Link to="/" onClick={handleNavClick}>
              <img src={KoaraLogo} alt="Koara" className="h-7 sm:h-8 w-auto relative z-50" />
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            <a href="#" className="text-sm font-medium text-slate-400 hover:text-white transition-colors duration-200">{t('nav_platform')}</a>
            <a href="#" className="text-sm font-medium text-slate-400 hover:text-white transition-colors duration-200">{t('nav_wallet')}</a>
            <a href="#" className="text-sm font-medium text-slate-400 hover:text-white transition-colors duration-200">{t('nav_merchants')}</a>
            <Link to="/terms" className="text-sm font-medium text-slate-400 hover:text-white transition-colors duration-200">{t('nav_terms')}</Link>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center justify-end flex-1 gap-5">
            {/* Language switch temporarily hidden
            <button onClick={toggleLanguage} className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
              {t('ar_1')}
            </button>
            */}
            <button className="text-sm font-semibold text-slate-400 hover:text-white transition-colors" onClick={onSignIn}>
              {t('signin')}
            </button>
            <button onClick={onStartSelling} className="btn-primary px-5 py-2.5 text-sm">
              {t('start_selling')}
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            className="block lg:hidden text-slate-400 hover:text-white transition-colors p-2 -mr-2 relative z-50"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Drawer */}
      <div className={`fixed top-0 right-0 h-full w-[80%] max-w-sm bg-[#0B1220] border-l border-white/10 z-40 transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col pt-24 px-6 pb-8 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <nav className="flex flex-col gap-6 mb-10">
          <a href="#" onClick={handleNavClick} className="text-lg font-semibold text-slate-300 hover:text-white transition-colors">{t('nav_platform')}</a>
          <a href="#" onClick={handleNavClick} className="text-lg font-semibold text-slate-300 hover:text-white transition-colors">{t('nav_wallet')}</a>
          <a href="#" onClick={handleNavClick} className="text-lg font-semibold text-slate-300 hover:text-white transition-colors">{t('nav_merchants')}</a>
          <Link to="/terms" onClick={handleNavClick} className="text-lg font-semibold text-slate-300 hover:text-white transition-colors">{t('nav_terms')}</Link>
        </nav>

        <div className="mt-auto flex flex-col gap-4">
          {/* Language switch temporarily hidden
          <button onClick={toggleLanguage} className="w-full py-3 text-base font-semibold text-slate-300 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
            {t('ar_1')}
          </button>
          */}
          <button onClick={handleSignInClick} className="w-full py-3 text-base font-semibold text-slate-300 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
            {t('signin')}
          </button>
          <button onClick={handleStartSellingClick} className="btn-primary w-full py-4 text-base rounded-xl flex items-center justify-center">
            {t('start_selling')}
          </button>
        </div>
      </div>
    </>
  );
};

export default Header;

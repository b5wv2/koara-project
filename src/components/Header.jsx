import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import KoaraLogo from '../assets/koara-logo.svg';

const Header = ({ onStartSelling, onSignIn }) => {
  const { language, setLanguage, t } = useAppContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <header className="header-glass sticky top-0 z-50">
      <div className="flex flex-wrap items-center justify-between px-4 sm:px-8 py-4 sm:py-5 max-w-7xl mx-auto w-full">
        <div className="flex-1 flex items-center justify-start gap-2.5">
          <img src={KoaraLogo} alt="Koara" className="h-7 sm:h-8 w-auto" />
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          className="block lg:hidden text-slate-400 hover:text-white transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>

        {/* Center Nav Links */}
        <nav className={`${isMobileMenuOpen ? 'flex' : 'hidden'} lg:flex flex-col lg:flex-row items-center w-full lg:w-auto gap-6 lg:gap-8 order-3 lg:order-none mt-6 lg:mt-0`}>
          <a href="#" className="text-sm font-medium text-slate-400 hover:text-white transition-colors duration-200">{t('nav_platform')}</a>
          <a href="#" className="text-sm font-medium text-slate-400 hover:text-white transition-colors duration-200">{t('nav_wallet')}</a>
          <a href="#" className="text-sm font-medium text-slate-400 hover:text-white transition-colors duration-200">{t('nav_merchants')}</a>
          <a href="#" className="text-sm font-medium text-slate-400 hover:text-white transition-colors duration-200">{t('nav_terms')}</a>
        </nav>

        {/* Right Action Links */}
        <div className={`${isMobileMenuOpen ? 'flex' : 'hidden'} lg:flex flex-col lg:flex-row items-center justify-end w-full lg:w-auto flex-1 gap-4 sm:gap-5 order-2 lg:order-none mt-4 lg:mt-0`}>
          <button onClick={toggleLanguage} className="text-sm font-semibold text-slate-500 hover:text-white transition-colors">
            {language === 'en' ? 'AR' : 'EN'}
          </button>
          <button className="text-sm font-semibold text-slate-400 hover:text-white transition-colors" onClick={onSignIn}>
            {t('signin')}
          </button>
          <button
            onClick={onStartSelling}
            className="btn-primary px-5 py-2 text-sm w-full sm:w-auto"
          >
            {t('start_selling')}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

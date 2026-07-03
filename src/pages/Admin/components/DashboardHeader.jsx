import React from 'react';
import { Menu } from 'lucide-react';

/**
 * Dashboard header bar — shows current tab title + language toggle.
 */
const DashboardHeader = ({ navItems, activeTab, language, setLanguage, setIsSidebarOpen }) => (
  <header className="koara-dash-header h-14 flex items-center justify-between px-4 sm:px-6 shrink-0">
    <div className="flex items-center gap-3">
      <button className="md:hidden text-slate-500 hover:text-white transition-colors" onClick={() => setIsSidebarOpen(true)}>
        <Menu size={20} />
      </button>
      <h2 className="font-semibold text-white text-sm capitalize">
        {navItems.find(n => n.key === activeTab)?.label || activeTab}
      </h2>
    </div>
    <div className="flex items-center gap-3">
      <button
        onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
        className="text-xs font-bold transition-colors px-2.5 py-1.5 rounded-lg"
        style={{ color: '#94A3B8', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {language === 'en' ? 'AR' : 'EN'}
      </button>
    </div>
  </header>
);

export default DashboardHeader;

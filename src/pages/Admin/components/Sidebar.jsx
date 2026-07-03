import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Store, X } from 'lucide-react';
import KoaraLogo from '../../../assets/koara-logo.svg';

/**
 * Admin/Merchant dashboard sidebar.
 */
const Sidebar = ({ role, store, user, navItems, activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen, onLogout, t }) => (
  <aside
    className={`w-60 koara-sidebar flex flex-col fixed md:relative z-40 h-full transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
  >
    {/* Logo */}
    <div className="h-14 flex items-center px-5 shrink-0 justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2.5">
        <img src={KoaraLogo} alt="Koara" className="h-6 w-auto" />
        <div>
          <div className="font-bold text-sm text-white leading-none">Koara</div>
          <div className="text-[10px] mt-0.5" style={{ color: '#475569' }}>
            {role === 'admin' ? 'Super Admin' : (store?.store_name || 'Dashboard')}
          </div>
        </div>
      </div>
      <button className="md:hidden text-slate-500 hover:text-white transition-colors" onClick={() => setIsSidebarOpen(false)}>
        <X size={16} />
      </button>
    </div>

    {/* Nav */}
    <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-none">
      {navItems.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          onClick={() => { setActiveTab(key); setIsSidebarOpen(false); }}
          className={`koara-sidebar-nav-item ${activeTab === key ? 'active' : ''}`}
        >
          <Icon size={16} />
          {label}
        </button>
      ))}

      {role === 'merchant' && (
        <Link
          to="/store"
          className="koara-sidebar-nav-item mt-2 pt-4"
          style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Store size={16} />
          View Storefront
        </Link>
      )}
    </nav>

    {/* User + Logout */}
    <div className="p-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="px-3 py-2 mb-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="text-xs font-medium text-white truncate">{user.email}</div>
        <div className="text-[10px] mt-0.5 capitalize" style={{ color: '#475569' }}>{role}</div>
      </div>
      <button
        onClick={onLogout}
        className="koara-sidebar-nav-item w-full text-left"
        style={{ color: '#ef4444' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <LogOut size={16} />
        {t('logout')}
      </button>
    </div>
  </aside>
);

export default Sidebar;

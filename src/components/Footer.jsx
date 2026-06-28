import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full py-12 mt-0 section-glow">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Top: Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2.5">
              <li><a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Platform</a></li>
              <li><a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Wallet</a></li>
              <li><a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Analytics</a></li>
              <li><a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Integrations</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2.5">
              <li><a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">About</a></li>
              <li><a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Merchants</a></li>
              <li><a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Careers</a></li>
              <li><a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Press</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-2.5">
              <li><a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Documentation</a></li>
              <li><a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">API Reference</a></li>
              <li><a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Guides</a></li>
              <li><a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Support</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2.5">
              <li><a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Privacy</a></li>
              <li><a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Terms</a></li>
              <li><a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Cookies</a></li>
              <li><a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Licenses</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 text-sm" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-slate-500">&copy; 2026 Koara · Multi-tenant commerce</div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <span className="text-slate-600">v0.1</span>
            <div className="px-3 py-1.5 rounded-full flex items-center gap-2 font-medium text-xs text-white" style={{ background: 'linear-gradient(135deg, #2563EB 11%, #7C3AED 79%)', boxShadow: '0 0 15px -3px rgba(124, 58, 237, 0.3)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Ko
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

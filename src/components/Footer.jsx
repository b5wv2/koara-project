import React from 'react';
import { Link } from 'react-router-dom';
import { FaWhatsapp, FaFacebook, FaXTwitter } from 'react-icons/fa6';
import KoaraLogo from '../assets/koara-logo.svg';

const Footer = () => {
  return (
    <footer className="w-full py-16 mt-0 section-glow relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        
        <div className="flex flex-col lg:flex-row justify-between gap-12 mb-16">
          {/* Logo & Description */}
          <div className="lg:w-1/3">
            <img src={KoaraLogo} alt="Koara" className="h-8 w-auto mb-6 opacity-90" />
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              The unified digital commerce platform designed for the MENA region. Launch your digital storefront, accept payments, and scale your business effortlessly.
            </p>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:w-2/3">
            <div>
              <h4 className="text-sm font-semibold text-white mb-5">Product</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">Platform</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">Wallet</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">Analytics</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-5">Company</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">About</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">Merchants</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">Careers</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">Press</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-5">Resources</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">Documentation</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">API Reference</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">Guides</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-5">Legal</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">Privacy Policy</a></li>
                <li><Link to="/terms" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">Terms of Service</Link></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">Cookies</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">Licenses</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Social Icons Section */}
        <div className="flex flex-col items-center justify-center py-10 border-t border-white/5">
          <h4 className="text-sm font-semibold text-white mb-6 tracking-widest text-opacity-80">CONNECT WITH US</h4>
          <div className="flex items-center gap-6">
            <a href="https://www.whatsapp.com/" target="_blank" rel="noopener noreferrer" className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:scale-110 transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.02)] hover:shadow-[0_0_25px_rgba(255,255,255,0.1)] group">
              <FaWhatsapp size={26} className="text-slate-400 group-hover:text-white transition-colors" />
            </a>
            <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:scale-110 transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.02)] hover:shadow-[0_0_25px_rgba(255,255,255,0.1)] group">
              <FaFacebook size={26} className="text-slate-400 group-hover:text-white transition-colors" />
            </a>
            <a href="https://www.x.com/" target="_blank" rel="noopener noreferrer" className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:scale-110 transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.02)] hover:shadow-[0_0_25px_rgba(255,255,255,0.1)] group">
              <FaXTwitter size={26} className="text-slate-400 group-hover:text-white transition-colors" />
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 pb-4 text-sm border-t border-white/5">
          <div className="text-slate-500 mb-6 md:mb-0">
            &copy; {new Date().getFullYear()} Koara · All rights reserved
          </div>

          <div className="flex items-center gap-4">
            <span className="text-slate-600 font-medium">v0.1</span>
            <div className="px-3 py-1.5 rounded-full flex items-center gap-2 font-medium text-xs text-white" style={{ background: 'linear-gradient(135deg, #2563EB 11%, #7C3AED 79%)', boxShadow: '0 0 15px -3px rgba(124, 58, 237, 0.3)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Ko Beta
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;

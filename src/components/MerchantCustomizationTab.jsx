import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Monitor, Smartphone, UploadCloud, Layout, Type, Palette, LayoutGrid, Lock, ShoppingCart } from 'lucide-react';
import DashButton from './ui/DashButton';

const PRESETS = {
  default: {
    primaryColor: '#2563EB',
    secondaryColor: '#1E293B',
    bgColor: '#F8FAFC',
    textColor: '#0F172A',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '8px',
    showHero: true,
    showFeaturedProducts: true,
    showCategories: true,
    showTestimonials: false,
    animations: 'smooth'
  },
  dark: {
    primaryColor: '#6366F1',
    secondaryColor: '#1E1E2E',
    bgColor: '#0B0F19',
    textColor: '#F1F5F9',
    fontFamily: 'Roboto, sans-serif',
    borderRadius: '4px',
    showHero: true,
    showFeaturedProducts: true,
    showCategories: true,
    showTestimonials: true,
    animations: 'fast'
  },
  gaming: {
    primaryColor: '#10B981',
    secondaryColor: '#111827',
    bgColor: '#000000',
    textColor: '#E5E7EB',
    fontFamily: 'Orbitron, sans-serif',
    borderRadius: '0px',
    showHero: true,
    showFeaturedProducts: true,
    showCategories: true,
    showTestimonials: false,
    animations: 'flashy'
  },
  minimal: {
    primaryColor: '#000000',
    secondaryColor: '#FFFFFF',
    bgColor: '#FFFFFF',
    textColor: '#111827',
    fontFamily: 'Helvetica Neue, sans-serif',
    borderRadius: '12px',
    showHero: false,
    showFeaturedProducts: true,
    showCategories: false,
    showTestimonials: false,
    animations: 'none'
  }
};

const MerchantCustomizationTab = () => {
  const [theme, setTheme] = useState(PRESETS.default);
  const [originalTheme, setOriginalTheme] = useState(PRESETS.default);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState('presets');
  const [previewMode, setPreviewMode] = useState('desktop');

  useEffect(() => {
    const isChanged = JSON.stringify(theme) !== JSON.stringify(originalTheme);
    setHasChanges(isChanged);
  }, [theme, originalTheme]);

  const handleSave = async () => {
    await new Promise(resolve => setTimeout(resolve, 400));
    setOriginalTheme(theme);
    setHasChanges(false);
    return { success: true };
  };

  const handleDiscard = () => {
    setTheme(originalTheme);
  };

  const handleReset = () => {
    setTheme(PRESETS.default);
    if (JSON.stringify(PRESETS.default) === JSON.stringify(originalTheme)) {
      setHasChanges(false);
    }
  };

  const applyPreset = (presetKey) => {
    setTheme(PRESETS[presetKey]);
  };

  const updateTheme = (key, value) => {
    setTheme(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] text-white rounded-xl overflow-hidden shadow-2xl border border-white/5" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0 bg-[#0B0F19]">
        <div>
          <h2 className="text-lg font-bold">Store Customization</h2>
          <p className="text-xs text-slate-400 mt-0.5">Design your storefront exactly how you want it.</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && <span className="text-amber-400 text-xs font-medium animate-pulse flex items-center gap-1.5 mr-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div> Unsaved Changes</span>}
          <button onClick={handleReset} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition-colors">Reset</button>
          <button onClick={handleDiscard} disabled={!hasChanges} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-medium transition-colors">Discard</button>
          <DashButton onClick={handleSave} disabled={!hasChanges} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-lg shadow-blue-900/20">
            <Save size={14} /> Save
          </DashButton>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Controls */}
        <div className="w-72 border-r border-white/10 flex flex-col bg-[#0B0F19]/50 shrink-0">
          <div className="flex items-center p-2 border-b border-white/5 gap-1">
            <button onClick={() => setActiveSection('presets')} className={`flex-1 py-2 px-1 rounded flex flex-col items-center gap-1 transition-colors ${activeSection === 'presets' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-white/5 text-slate-400'}`}>
              <LayoutGrid size={16} />
              <span className="text-[9px] uppercase font-bold tracking-wider">Presets</span>
            </button>
            <button onClick={() => setActiveSection('colors')} className={`flex-1 py-2 px-1 rounded flex flex-col items-center gap-1 transition-colors ${activeSection === 'colors' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-white/5 text-slate-400'}`}>
              <Palette size={16} />
              <span className="text-[9px] uppercase font-bold tracking-wider">Colors</span>
            </button>
            <button onClick={() => setActiveSection('typography')} className={`flex-1 py-2 px-1 rounded flex flex-col items-center gap-1 transition-colors ${activeSection === 'typography' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-white/5 text-slate-400'}`}>
              <Type size={16} />
              <span className="text-[9px] uppercase font-bold tracking-wider">Type</span>
            </button>
            <button onClick={() => setActiveSection('layout')} className={`flex-1 py-2 px-1 rounded flex flex-col items-center gap-1 transition-colors ${activeSection === 'layout' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-white/5 text-slate-400'}`}>
              <Layout size={16} />
              <span className="text-[9px] uppercase font-bold tracking-wider">Layout</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
            {activeSection === 'presets' && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">Theme Presets</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(PRESETS).map(preset => (
                    <button key={preset} onClick={() => applyPreset(preset)} className={`aspect-video rounded-lg border overflow-hidden relative group transition-all ${JSON.stringify(theme) === JSON.stringify(PRESETS[preset]) ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-white/10 hover:border-white/30'}`}>
                      <div className="absolute inset-0 opacity-50" style={{ background: `linear-gradient(135deg, ${PRESETS[preset].bgColor} 0%, ${PRESETS[preset].secondaryColor} 100%)` }}></div>
                      <div className="absolute bottom-1.5 left-1.5 text-[10px] font-bold capitalize z-10 drop-shadow-md text-white">{preset}</div>
                      <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full z-10 shadow-sm" style={{ backgroundColor: PRESETS[preset].primaryColor }}></div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'colors' && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Color Palette</h3>
                {['primaryColor', 'secondaryColor', 'bgColor', 'textColor'].map((colorKey) => (
                  <div key={colorKey}>
                    <label className="text-[11px] text-slate-400 block mb-1 capitalize">{colorKey.replace(/([A-Z])/g, ' $1').trim()}</label>
                    <div className="flex items-center gap-2">
                      <div className="relative w-7 h-7 rounded border border-white/10 overflow-hidden shrink-0">
                        <input type="color" value={theme[colorKey]} onChange={(e) => updateTheme(colorKey, e.target.value)} className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer border-0 p-0" />
                      </div>
                      <input type="text" value={theme[colorKey].toUpperCase()} onChange={(e) => updateTheme(colorKey, e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs font-mono text-white outline-none focus:border-blue-500 transition-colors uppercase" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeSection === 'typography' && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Typography & Styling</h3>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Primary Font</label>
                  <select value={theme.fontFamily} onChange={(e) => updateTheme('fontFamily', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500 appearance-none">
                    <option value="Inter, sans-serif" className="bg-slate-900">Inter</option>
                    <option value="Roboto, sans-serif" className="bg-slate-900">Roboto</option>
                    <option value="Orbitron, sans-serif" className="bg-slate-900">Orbitron</option>
                    <option value="Helvetica Neue, sans-serif" className="bg-slate-900">Helvetica</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Border Radius</label>
                  <select value={theme.borderRadius} onChange={(e) => updateTheme('borderRadius', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500 appearance-none">
                    <option value="0px" className="bg-slate-900">Sharp (0px)</option>
                    <option value="4px" className="bg-slate-900">Slight (4px)</option>
                    <option value="8px" className="bg-slate-900">Normal (8px)</option>
                    <option value="12px" className="bg-slate-900">Rounded (12px)</option>
                    <option value="24px" className="bg-slate-900">Pill (24px)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Animations</label>
                  <select value={theme.animations} onChange={(e) => updateTheme('animations', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500 appearance-none">
                    <option value="none" className="bg-slate-900">None</option>
                    <option value="smooth" className="bg-slate-900">Smooth</option>
                    <option value="fast" className="bg-slate-900">Fast & Snappy</option>
                  </select>
                </div>
              </div>
            )}

            {activeSection === 'layout' && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Homepage Sections</h3>
                {['showHero', 'showFeaturedProducts', 'showCategories', 'showTestimonials'].map((toggleKey) => (
                  <div key={toggleKey} className="flex items-center justify-between bg-white/5 p-2.5 rounded border border-white/5 hover:border-white/10 transition-colors">
                    <span className="text-xs text-slate-300 capitalize">{toggleKey.replace('show', '').replace(/([A-Z])/g, ' $1').trim()}</span>
                    <button
                      type="button"
                      onClick={() => updateTheme(toggleKey, !theme[toggleKey])}
                      className="w-8 h-4 rounded-full relative transition-colors duration-200 focus:outline-none"
                      style={{ backgroundColor: theme[toggleKey] ? '#2563EB' : 'rgba(255,255,255,0.1)' }}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full bg-white absolute top-[3px] transition-transform duration-200 ${theme[toggleKey] ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                    </button>
                  </div>
                ))}
                
                <div className="pt-4 border-t border-white/5">
                  <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-3">Branding</h3>
                  <div className="border border-dashed border-white/20 rounded p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500/50 hover:bg-white/5 transition-colors">
                    <UploadCloud size={18} className="text-slate-400 mb-1.5" />
                    <span className="text-[10px] text-slate-300 font-medium">Upload Custom Logo</span>
                    <span className="text-[9px] text-slate-500 mt-0.5">PNG, SVG (Max 2MB)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Preview Area */}
        <div className="flex-1 bg-[#020617] flex flex-col items-center relative overflow-hidden">
          {/* Subtle grid background */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          
          <div className="absolute top-4 bg-[#0B0F19] border border-white/10 rounded-full px-1.5 py-1 flex items-center gap-0.5 z-10 shadow-xl">
            <button onClick={() => setPreviewMode('desktop')} className={`p-1.5 rounded-full transition-colors ${previewMode === 'desktop' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}>
              <Monitor size={14} />
            </button>
            <button onClick={() => setPreviewMode('mobile')} className={`p-1.5 rounded-full transition-colors ${previewMode === 'mobile' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}>
              <Smartphone size={14} />
            </button>
          </div>

          <div className={`mt-14 mb-6 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-2xl rounded-lg overflow-hidden border flex flex-col z-0 ${previewMode === 'desktop' ? 'w-[720px] h-[480px]' : 'w-[320px] h-[568px]'}`} style={{ borderColor: theme.primaryColor + '40' }}>
            {/* Browser chrome */}
            <div className="h-6 bg-[#1E293B] flex items-center px-2.5 gap-2 shrink-0 border-b border-black/20">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500/80"></div>
                <div className="w-2 h-2 rounded-full bg-amber-500/80"></div>
                <div className="w-2 h-2 rounded-full bg-green-500/80"></div>
              </div>
              <div className="flex-1 mx-4 bg-black/30 rounded-sm text-[9px] text-slate-400 px-2 py-0.5 flex items-center justify-center font-mono">
                <Lock size={8} className="mr-1" /> my-store.koara.app
              </div>
            </div>
            
            {/* Storefront Mock Content */}
            <div 
              className="flex-1 overflow-y-auto scrollbar-none"
              style={{ 
                backgroundColor: theme.bgColor, 
                color: theme.textColor,
                fontFamily: theme.fontFamily,
                transition: 'all 0.3s'
              }}
            >
              {/* Mock Header */}
              <div className="px-5 py-3 flex items-center justify-between shadow-sm sticky top-0 z-20" style={{ backgroundColor: theme.bgColor }}>
                <div className="font-extrabold text-lg tracking-tight" style={{ color: theme.primaryColor }}>STORE</div>
                <div className="flex gap-3 text-[11px] font-medium opacity-70 hidden md:flex">
                  <span className="hover:opacity-100 cursor-pointer">Home</span>
                  <span className="hover:opacity-100 cursor-pointer">Products</span>
                  <span className="hover:opacity-100 cursor-pointer">About</span>
                </div>
                <div className="w-6 h-6 rounded flex items-center justify-center text-white" style={{ backgroundColor: theme.secondaryColor, borderRadius: theme.borderRadius }}>
                  <ShoppingCart size={12} />
                </div>
              </div>

              {/* Mock Hero */}
              {theme.showHero && (
                <div className="py-10 px-5 text-center relative overflow-hidden" style={{ backgroundColor: theme.secondaryColor, color: '#fff' }}>
                  <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
                  <h1 className="text-2xl font-black mb-2 relative z-10">Welcome to Our Store</h1>
                  <p className="text-[11px] opacity-80 max-w-sm mx-auto mb-5 relative z-10">Discover the best products tailored just for you. Explore our amazing collection today.</p>
                  <button className="px-5 py-2 text-xs font-bold shadow-lg relative z-10 hover:brightness-110 active:scale-95" style={{ backgroundColor: theme.primaryColor, color: '#fff', borderRadius: theme.borderRadius, transition: theme.animations === 'none' ? 'none' : 'all 0.2s' }}>
                    Shop Now
                  </button>
                </div>
              )}

              {/* Mock Categories */}
              {theme.showCategories && (
                <div className="py-6 px-5">
                  <h2 className="text-sm font-bold mb-3 opacity-90">Shop by Category</h2>
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="aspect-square flex items-center justify-center relative overflow-hidden group cursor-pointer" style={{ backgroundColor: theme.secondaryColor, borderRadius: theme.borderRadius }}>
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                        <span className="text-[10px] font-bold text-white relative z-10 drop-shadow-md">Category {i}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mock Featured Products */}
              {theme.showFeaturedProducts && (
                <div className="py-6 px-5 pb-10">
                  <h2 className="text-sm font-bold mb-3 opacity-90">Featured Products</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="p-2.5 border shadow-sm group hover:shadow-md transition-shadow" style={{ borderRadius: theme.borderRadius, borderColor: theme.textColor + '15', backgroundColor: theme.bgColor }}>
                        <div className="aspect-[4/3] mb-2.5 relative overflow-hidden" style={{ backgroundColor: theme.secondaryColor + '80', borderRadius: parseInt(theme.borderRadius) > 0 ? `${Math.max(2, parseInt(theme.borderRadius) - 2)}px` : '0px' }}>
                          <div className="absolute inset-0 flex items-center justify-center opacity-30 text-white"><ShoppingCart size={20} /></div>
                        </div>
                        <div className="text-[11px] font-bold mb-0.5 opacity-90">Premium Item {i}</div>
                        <div className="text-[10px] font-bold mb-2" style={{ color: theme.primaryColor }}>$29.99</div>
                        <button className="w-full py-1.5 text-[10px] font-bold hover:brightness-110 transition-all active:scale-95" style={{ backgroundColor: theme.secondaryColor, color: '#fff', borderRadius: parseInt(theme.borderRadius) > 0 ? `${Math.max(2, parseInt(theme.borderRadius) - 4)}px` : '0px' }}>
                          Add to Cart
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mock Footer */}
              <div className="py-6 px-5 text-center mt-auto" style={{ backgroundColor: theme.secondaryColor, color: '#fff' }}>
                <div className="font-bold text-xs mb-2 opacity-90">My Store</div>
                <div className="text-[9px] opacity-60">© 2026 All rights reserved.</div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerchantCustomizationTab;

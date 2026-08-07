import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'SDG', label: 'SDG - Sudanese Pound' },
  { value: 'SAR', label: 'SAR - Saudi Riyal' },
  { value: 'AED', label: 'AED - UAE Dirham' },
  { value: 'EGP', label: 'EGP - Egyptian Pound' },
  { value: 'KWD', label: 'KWD - Kuwaiti Dinar' },
  { value: 'QAR', label: 'QAR - Qatari Riyal' },
  { value: 'BHD', label: 'BHD - Bahraini Dinar' },
  { value: 'OMR', label: 'OMR - Omani Rial' }
];

export default function CurrencySelect({ value, onChange, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = CURRENCY_OPTIONS.find(opt => opt.value === value) || CURRENCY_OPTIONS[0];

  return (
    <div className={`relative ${className}`} ref={containerRef} dir="ltr">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-900 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none flex items-center justify-between transition-colors hover:border-slate-600/50 text-sm"
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
          {CURRENCY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                value === option.value 
                  ? 'bg-blue-500/10 text-blue-400 font-semibold' 
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span className="truncate">{option.label}</span>
              {value === option.value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

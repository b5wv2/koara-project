import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="koara-modal-overlay">
      {/* Backdrop */}
      <div
        className="koara-modal-backdrop"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="koara-modal-content">
        {/* Header */}
        <div className="koara-modal-header">
          <h3 className="font-semibold text-base text-white tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="koara-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;

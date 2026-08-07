import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import DashButton from '../ui/DashButton';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useAppContext } from '../../context/AppContext';

const TopupConfigModal = ({ isOpen, onClose, product, fields = [], onConfirmAddToCart, language = 'en' }) => {
  const { t } = useAppContext();
  const [formFields, setFormFields] = useState({});
  const [errorMsg, setErrorMsg] = useState('');
  const { execute, loading } = useAsyncAction();

  useEffect(() => {
    if (isOpen) {
      setFormFields({});
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!product) return null;

  const handleConfirm = () => execute(async () => {
    setErrorMsg('');
    
    // Validate required fields
    for (const field of fields) {
      if (!formFields[field.key] || !formFields[field.key].trim()) {
        const fieldName = field.label || field.key;
        const err = language === 'en' 
          ? `Please enter your ${fieldName}` 
          : `يرجى إدخال ${fieldName}`;
        setErrorMsg(err);
        return { success: false };
      }
    }

    onConfirmAddToCart(product, 1, formFields);
    onClose();
    return { success: true };
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('configure_top_up_details')}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-koara-accent/10 text-koara-accent font-bold text-sm shrink-0">
            {product.name ? product.name.charAt(0) : 'T'}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-white truncate">{product.name}</h4>
            <span className="text-xs text-slate-400" dir="ltr">
              ${parseFloat(product.selling_price || product.price || 0).toFixed(2)}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          {t('please_enter_your_account_deta')}
        </p>

        {errorMsg && (
          <div className="p-3 rounded-lg text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400">
            {errorMsg}
          </div>
        )}

        <div className="space-y-3">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="koara-label text-xs font-medium text-slate-300 mb-1 block">
                {field.label} <span className="text-red-400">*</span>
              </label>
              <input
                required
                type={field.type === 'text' ? 'text' : field.type || 'text'}
                placeholder={field.label}
                className="koara-input w-full"
                value={formFields[field.key] || ''}
                onChange={(e) => setFormFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                dir="ltr"
              />
            </div>
          ))}
        </div>

        <div className="pt-2">
          <DashButton
            onClick={handleConfirm}
            loading={loading}
            disabled={loading}
            className="dash-btn dash-btn-primary w-full justify-center py-2.5 text-sm font-semibold rounded-xl"
          >
            <ShoppingBag size={16} />
            {t('add_to_cart')}
          </DashButton>
        </div>
      </div>
    </Modal>
  );
};

export default TopupConfigModal;

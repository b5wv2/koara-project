import React, { useState, useEffect } from 'react';
import { CreditCard } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';

/**
 * Merchant payouts tab — payment/payout bank details form.
 */
const MerchantPayoutsTab = () => {
  const { user, store, merchants, updateMerchantBanking } = useAppContext();
  const storeId = user?.storeId;
  const merchantObj = merchants.find(m => m.id === storeId) || {};

  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const activeStore = store || merchantObj;
    if (activeStore) {
      setBankName(activeStore.bank_name || activeStore.bankName || '');
      setBankAccountName(activeStore.account_name || activeStore.bankAccountName || '');
      setBankAccountNumber(activeStore.account_no || activeStore.bankAccountNumber || '');
    }
  }, [store, merchantObj.bankName, merchantObj.bankAccountName, merchantObj.bankAccountNumber]);

  const handleSavePaymentSettings = (e) => {
    e.preventDefault();
    setIsSavingBank(true);
    setSaveSuccess(false);
    setTimeout(() => {
      updateMerchantBanking(storeId, { bankName, bankAccountName, bankAccountNumber });
      setIsSavingBank(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 800);
  };

  return (
    <div className="dash-card p-6">
      <div className="mb-6 pb-5 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div>
          <h3 className="text-base font-bold text-white">Payment & Payout Settings</h3>
          <p className="text-xs mt-1" style={{ color: '#475569' }}>Configure the bank details that customers will see when transferring funds.</p>
        </div>
        <CreditCard size={20} style={{ color: '#60A5FA' }} />
      </div>

      <div className="max-w-xl space-y-5">
        <div className="space-y-4">
          <div>
            <label className="koara-label">Bank Name</label>
            <input readOnly type="text" value={bankName} className="koara-input opacity-70 cursor-not-allowed" />
          </div>
          <div>
            <label className="koara-label">Account Name</label>
            <input readOnly type="text" value={bankAccountName} className="koara-input opacity-70 cursor-not-allowed" />
          </div>
          <div>
            <label className="koara-label">Account Number</label>
            <input readOnly type="text" value={bankAccountNumber} className="koara-input font-mono opacity-70 cursor-not-allowed" dir="ltr" />
          </div>
        </div>

        <div className="text-xs text-slate-400 mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
          Your banking information is locked for security after verification. 
          If you need to update these details, please contact administrator support.
        </div>
      </div>
    </div>
  );
};

export default MerchantPayoutsTab;

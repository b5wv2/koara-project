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

      <form onSubmit={handleSavePaymentSettings} className="max-w-xl space-y-5">
        {saveSuccess && (
          <div className="koara-success-msg">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
            Changes saved successfully!
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="koara-label">Bank Name</label>
            <input required type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Chase Bank" className="koara-input" />
          </div>
          <div>
            <label className="koara-label">Account Name</label>
            <input required type="text" value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} placeholder="e.g. Alfa Store LLC" className="koara-input" />
          </div>
          <div>
            <label className="koara-label">Account Number</label>
            <input required type="text" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} placeholder="e.g. 1234567890" className="koara-input font-mono" dir="ltr" />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSavingBank}
          className="dash-btn dash-btn-primary py-2.5 px-6 rounded-xl text-sm font-semibold"
        >
          {isSavingBank ? (
            <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
          ) : 'Save Changes'}
        </button>
      </form>
    </div>
  );
};

export default MerchantPayoutsTab;

import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Copy, CheckCircle, Loader2, UploadCloud, ChevronRight, Check } from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import { useAppContext } from '../context/AppContext';
import DashButton from './ui/DashButton';

const LocalBankTransferModal = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useAppContext();
  const [config, setConfig] = useState({ depositMethods: [], currencies: [] });
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [amount, setAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    setStep(1);
    setError('');
    setSuccessMsg('');
    setAmount('');
    setSelectedCurrency(null);
    setSelectedMethod(null);
    setReceiptFile(null);
    setIsSubmitting(false);
    setCopied(false);
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/merchant/wallet/config`, {
        credentials: 'include'
      });
      const data = await response.json();
      setConfig(data);
      if (data.currencies?.length > 0) {
        setSelectedCurrency(data.currencies.find(c => c.is_base_currency) || data.currencies[0]);
      }
    } catch (err) {
      console.error('Failed to fetch wallet config', err);
      setError(t('err_failed_load_bank') || 'Failed to load configuration');
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleCopy = (text) => {
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async () => {
    if (!amount || !selectedCurrency || !selectedMethod || !receiptFile) {
      setError(t('err_missing_fields') || 'Please complete all fields');
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    try {
      // 1. Upload receipt
      const formData = new FormData();
      formData.append('receipt', receiptFile);

      const uploadRes = await fetch(`${API_BASE_URL}/api/merchant/wallet/upload-receipt`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload receipt');

      const requestedAmt = parseFloat(amount);
      const exRate = parseFloat(selectedCurrency.exchange_rate);
      const creditedAmt = selectedCurrency.is_base_currency ? requestedAmt : (requestedAmt / exRate);
      const baseCurrencyCode = config.currencies.find(c => c.is_base_currency)?.code || 'USD';

      const depositData = {
        requested_amount: requestedAmt,
        requested_currency: selectedCurrency.code,
        exchange_rate_used: exRate,
        credited_amount: creditedAmt,
        credited_currency: baseCurrencyCode,
        deposit_method_id: selectedMethod.id,
        receipt_url: uploadData.url
      };

      const depRes = await fetch(`${API_BASE_URL}/api/merchant/wallet/deposit`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(depositData)
      });

      const depResData = await depRes.json();
      if (!depRes.ok) throw new Error(depResData.error || 'Failed to submit deposit');

      setSuccessMsg(t('success_deposit_submitted') || 'Deposit request submitted successfully! Pending approval.');
      setTimeout(() => {
        onSuccess && onSuccess();
        onClose();
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8 text-xs font-semibold">
      {[1, 2, 3].map(s => (
        <React.Fragment key={s}>
          <div className={`flex flex-col items-center flex-1 ${step >= s ? 'text-koara-primary' : 'text-slate-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-all ${step >= s ? 'bg-koara-primary/20 text-koara-primary ring-1 ring-koara-primary' : 'bg-slate-800'}`}>
              {step > s ? <Check size={14} /> : s}
            </div>
            <span>{s === 1 ? 'Details' : s === 2 ? 'Transfer' : 'Receipt'}</span>
          </div>
          {s < 3 && <div className={`h-px flex-1 mx-2 ${step > s ? 'bg-koara-primary' : 'bg-slate-800'}`} />}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('wallet_deposit') || 'Wallet Deposit'}>
      <div className="space-y-6">
        {loadingConfig ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-koara-primary" size={32} />
          </div>
        ) : config ? (
          <>
            {renderStepIndicator()}
            
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="koara-label">{t('currency') || 'Select Currency'}</label>
                  <select 
                    className="koara-input"
                    value={selectedCurrency?.code || ''}
                    onChange={e => setSelectedCurrency(config.currencies.find(c => c.code === e.target.value))}
                  >
                    {config.currencies.map(c => (
                      <option key={c.id} value={c.code}>{c.code} - {c.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="koara-label">{t('amount') || 'Amount'} ({selectedCurrency?.symbol})</label>
                  <input 
                    type="number" 
                    min="1" 
                    step="0.01" 
                    className="koara-input" 
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    dir="ltr"
                  />
                  {!selectedCurrency?.is_base_currency && amount && (
                    <div className="text-xs text-slate-400 mt-2">
                      Exchange Rate: 1 Base Currency = {selectedCurrency?.exchange_rate} {selectedCurrency?.code}<br/>
                      Wallet will be credited: <strong className="text-white">{(amount / selectedCurrency?.exchange_rate).toFixed(2)} Base Currency</strong>
                    </div>
                  )}
                </div>

                <DashButton
                  onClick={() => {
                    if (amount > 0) setStep(2);
                  }}
                  disabled={!amount || amount <= 0}
                  className="dash-btn dash-btn-primary w-full justify-center mt-4"
                >
                  {t('next') || 'Next'} <ChevronRight size={16} className="ml-1" />
                </DashButton>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <label className="koara-label">{t('deposit_method') || 'Select Deposit Method'}</label>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {config.depositMethods.map(method => (
                    <div 
                      key={method.id}
                      onClick={() => setSelectedMethod(method)}
                      className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedMethod?.id === method.id ? 'border-koara-primary bg-koara-primary/10' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}
                    >
                      <div className="font-semibold text-white mb-1 flex justify-between items-center">
                        {method.name}
                        {selectedMethod?.id === method.id && <CheckCircle size={16} className="text-koara-primary" />}
                      </div>
                      <div className="text-xs text-slate-400 line-clamp-2">{method.instructions}</div>
                    </div>
                  ))}
                </div>

                {selectedMethod && (
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl mt-4 space-y-3">
                    {selectedMethod.account_holder && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Account Holder</span>
                        <span className="text-white font-medium">{selectedMethod.account_holder}</span>
                      </div>
                    )}
                    {selectedMethod.account_number && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Account Number</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium tracking-wider">{selectedMethod.account_number}</span>
                          <button onClick={() => handleCopy(selectedMethod.account_number)} className="text-koara-primary hover:text-white transition-colors">
                            {copied ? <Check size={14}/> : <Copy size={14}/>}
                          </button>
                        </div>
                      </div>
                    )}
                    {selectedMethod.iban && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">IBAN</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium tracking-wider">{selectedMethod.iban}</span>
                          <button onClick={() => handleCopy(selectedMethod.iban)} className="text-koara-primary hover:text-white transition-colors">
                            {copied ? <Check size={14}/> : <Copy size={14}/>}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="pt-2 mt-2 border-t border-slate-800 text-xs text-orange-200 bg-orange-950/30 p-3 rounded-lg">
                      Please transfer exactly <strong className="text-white">{amount} {selectedCurrency?.code}</strong> to the account above.
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <button onClick={() => setStep(1)} className="flex-1 py-3 text-sm text-slate-300 hover:text-white transition-colors">Back</button>
                  <DashButton
                    onClick={() => {
                      if (selectedMethod) setStep(3);
                    }}
                    disabled={!selectedMethod}
                    className="dash-btn dash-btn-primary flex-1 justify-center"
                  >
                    {t('next') || 'Next'} <ChevronRight size={16} className="ml-1" />
                  </DashButton>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <label className="koara-label">{t('upload_receipt') || 'Upload Transfer Receipt'}</label>
                
                <div className="relative border-2 border-dashed border-slate-700 rounded-xl p-8 hover:border-koara-primary/50 transition-colors bg-slate-900/50 group text-center cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/*,.pdf" 
                    onChange={e => setReceiptFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <UploadCloud size={40} className={`mx-auto mb-3 transition-colors ${receiptFile ? 'text-koara-primary' : 'text-slate-500 group-hover:text-slate-400'}`} />
                  <div className="text-sm font-medium text-white mb-1">
                    {receiptFile ? receiptFile.name : 'Click to upload or drag and drop'}
                  </div>
                  <div className="text-xs text-slate-500">
                    JPG, PNG or PDF (max. 5MB)
                  </div>
                </div>

                {error && <div className="text-xs text-red-400 p-3 bg-red-950/30 rounded-lg">{error}</div>}
                {successMsg && <div className="text-xs text-green-400 p-3 bg-green-950/30 rounded-lg flex items-center gap-2"><CheckCircle size={16}/> {successMsg}</div>}

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(2)} disabled={isSubmitting || successMsg} className="flex-1 py-3 text-sm text-slate-300 hover:text-white transition-colors disabled:opacity-50">Back</button>
                  <DashButton
                    onClick={handleSubmit}
                    loading={isSubmitting}
                    disabled={!receiptFile || isSubmitting || !!successMsg}
                    className="dash-btn dash-btn-primary flex-1 justify-center"
                  >
                    {isSubmitting ? 'Uploading...' : 'Submit Deposit'}
                  </DashButton>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-red-400 text-sm">{t('err_failed_load_bank') || 'Could not load configuration.'}</div>
        )}
      </div>
    </Modal>
  );
};

export default LocalBankTransferModal;

import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Copy, CheckCircle, Loader2, UploadCloud, ChevronRight, Check, Landmark, ChevronDown } from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import { useAppContext } from '../context/AppContext';
import DashButton from './ui/DashButton';
import { getImageUrl } from '../utils/imageUrl';

const LocalBankTransferModal = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useAppContext();
  const [config, setConfig] = useState({ depositMethods: [], currencies: [] });
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  
  const [amount, setAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [copiedField, setCopiedField] = useState(null);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
      resetState();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.currency-dropdown')) {
        setIsCurrencyOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resetState = () => {
    setStep(1);
    setError('');
    setAmount('');
    setSelectedCurrency(null);
    setSelectedMethod(null);
    setReceiptFile(null);
    setIsSubmitting(false);
    setCopiedField(null);
    setIsCurrencyOpen(false);
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

  const handleCopy = (text, fieldName) => {
    if (text) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
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
      const formData = new FormData();
      formData.append('receipt', receiptFile);

      const uploadRes = await fetch(`${API_BASE_URL}/api/merchant/wallet/upload-receipt`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload receipt');

      const receiveAmt = parseFloat(amount);
      const exRate = parseFloat(selectedCurrency.exchange_rate);
      const transferAmt = selectedCurrency.is_base_currency ? receiveAmt : (receiveAmt * exRate);
      const baseCurrencyCode = config.currencies.find(c => c.is_base_currency)?.code || 'USD';

      const depositData = {
        requested_amount: transferAmt,
        requested_currency: selectedCurrency.code,
        exchange_rate_used: exRate,
        credited_amount: receiveAmt,
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

      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewHistory = () => {
    onSuccess && onSuccess();
    onClose();
    window.location.href = '/admin?tab=wallet';
  };

  const renderStepIndicator = () => {
    if (step === 4) return null;
    return (
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
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={step === 4 ? '' : (t('wallet_deposit') || 'Wallet Deposit')}>
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
                <div className="relative currency-dropdown">
                  <label className="koara-label">{t('currency') || 'Select Currency'}</label>
                  <div 
                    className="koara-input flex justify-between items-center cursor-pointer select-none"
                    onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                  >
                    <span>{selectedCurrency ? `${selectedCurrency.code} - ${selectedCurrency.name}` : 'Select Currency'}</span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isCurrencyOpen ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {isCurrencyOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                      {config.currencies.map(c => (
                        <div 
                          key={c.id} 
                          className={`px-4 py-3 cursor-pointer text-sm transition-colors flex justify-between items-center
                            ${selectedCurrency?.code === c.code ? 'bg-koara-primary/10 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                          onClick={() => {
                            setSelectedCurrency(c);
                            setIsCurrencyOpen(false);
                          }}
                        >
                          <span>{c.code} - {c.name}</span>
                          {selectedCurrency?.code === c.code && <Check size={14} className="text-koara-primary" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="koara-label">Wallet Credit (USD)</label>
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
                  {!selectedCurrency?.is_base_currency && amount > 0 && (
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl mt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Wallet Credit:</span>
                        <span className="text-white font-medium">{amount} USD</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Exchange Rate:</span>
                        <span className="text-white font-medium">1 USD = {Number(selectedCurrency?.exchange_rate).toLocaleString()} {selectedCurrency?.code}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 mt-2 border-t border-slate-800 font-bold">
                        <span className="text-koara-primary">Amount To Pay:</span>
                        <span className="text-koara-primary text-lg">{Number((amount * selectedCurrency?.exchange_rate).toFixed(2)).toLocaleString()} {selectedCurrency?.code}</span>
                      </div>
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
                      className={`p-4 rounded-xl cursor-pointer transition-all border flex gap-4 items-center ${selectedMethod?.id === method.id ? 'border-koara-primary bg-koara-primary/10' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}
                    >
                      <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center p-1 shrink-0">
                        {method.logo_url ? (
                          <img src={getImageUrl(method.logo_url)} alt={method.name} className="max-w-full max-h-full rounded object-contain" />
                        ) : (
                          <Landmark size={20} className="text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white mb-1 flex justify-between items-center">
                          <span className="truncate pr-2">{method.name}</span>
                          {selectedMethod?.id === method.id && <CheckCircle size={16} className="text-koara-primary shrink-0" />}
                        </div>
                        {method.instructions && <div className="text-xs text-slate-400 line-clamp-2">{method.instructions}</div>}
                      </div>
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
                          <button onClick={() => handleCopy(selectedMethod.account_number, 'account')} className="text-koara-primary hover:text-white transition-colors">
                            {copiedField === 'account' ? <Check size={14}/> : <Copy size={14}/>}
                          </button>
                        </div>
                      </div>
                    )}
                    {selectedMethod.iban && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">IBAN</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium tracking-wider">{selectedMethod.iban}</span>
                          <button onClick={() => handleCopy(selectedMethod.iban, 'iban')} className="text-koara-primary hover:text-white transition-colors">
                            {copiedField === 'iban' ? <Check size={14}/> : <Copy size={14}/>}
                          </button>
                        </div>
                      </div>
                    )}
                    {selectedMethod.bban && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">BBAN</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium tracking-wider">{selectedMethod.bban}</span>
                          <button onClick={() => handleCopy(selectedMethod.bban, 'bban')} className="text-koara-primary hover:text-white transition-colors">
                            {copiedField === 'bban' ? <Check size={14}/> : <Copy size={14}/>}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="pt-2 mt-2 border-t border-slate-800 text-xs text-orange-200 bg-orange-950/30 p-3 rounded-lg">
                      Please transfer exactly <strong className="text-white">{Number((amount * (selectedCurrency?.exchange_rate || 1)).toFixed(2)).toLocaleString()} {selectedCurrency?.code}</strong> to the account above.
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
              <div className="space-y-6 animate-fade-in">
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
                  <h4 className="text-sm font-bold text-white mb-2 pb-2 border-b border-white/5">Deposit Summary</h4>
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <div className="text-slate-400">Wallet Credit:</div>
                    <div className="text-white font-medium text-right">{parseFloat(amount).toFixed(2)} USD</div>
                    
                    <div className="text-slate-400">Payment Currency:</div>
                    <div className="text-white font-medium text-right">{selectedCurrency?.code}</div>
                    
                    {selectedCurrency && !selectedCurrency.is_base_currency && (
                      <>
                        <div className="text-slate-400">Exchange Rate:</div>
                        <div className="text-white font-medium text-right">1 USD = {Number(selectedCurrency.exchange_rate).toLocaleString()} {selectedCurrency.code}</div>
                      </>
                    )}
                    
                    <div className="text-slate-400 font-bold text-koara-primary mt-2">Total Amount to Pay:</div>
                    <div className="text-koara-primary font-bold text-right mt-2 text-lg">{Number((amount * (selectedCurrency?.exchange_rate || 1)).toFixed(2)).toLocaleString()} {selectedCurrency?.code}</div>
                  </div>
                  
                  <div className="border-t border-white/5 pt-3 mt-3">
                    <h5 className="text-xs font-semibold text-slate-500 mb-2 uppercase">Payment Details</h5>
                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                      <div className="text-slate-400">Method:</div>
                      <div className="text-white text-right">{selectedMethod?.name}</div>
                      <div className="text-slate-400">Account Holder:</div>
                      <div className="text-white text-right">{selectedMethod?.account_holder}</div>
                      <div className="text-slate-400">Account Number:</div>
                      <div className="text-white text-right font-mono">{selectedMethod?.account_number}</div>
                      {selectedMethod?.iban && (
                        <>
                          <div className="text-slate-400">IBAN:</div>
                          <div className="text-white text-right font-mono">{selectedMethod.iban}</div>
                        </>
                      )}
                      {selectedMethod?.bban && (
                        <>
                          <div className="text-slate-400">BBAN:</div>
                          <div className="text-white text-right font-mono">{selectedMethod.bban}</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="koara-label">{t('upload_receipt') || 'Upload Transfer Receipt'}</label>
                  <div className="relative border-2 border-dashed border-slate-700 rounded-xl p-6 hover:border-koara-primary/50 transition-colors bg-slate-900/50 group text-center cursor-pointer">
                    <input 
                      type="file" 
                      accept="image/*,.pdf" 
                      onChange={e => setReceiptFile(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <UploadCloud size={32} className={`mx-auto mb-2 transition-colors ${receiptFile ? 'text-koara-primary' : 'text-slate-500 group-hover:text-slate-400'}`} />
                    <div className="text-sm font-medium text-white mb-1">
                      {receiptFile ? receiptFile.name : 'Click to upload or drag and drop'}
                    </div>
                    <div className="text-xs text-slate-500">
                      JPG, PNG or PDF (max. 5MB)
                    </div>
                  </div>
                </div>

                {error && <div className="text-xs text-red-400 p-3 bg-red-950/30 rounded-lg">{error}</div>}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(2)} disabled={isSubmitting} className="flex-1 py-3 text-sm text-slate-300 hover:text-white transition-colors disabled:opacity-50">Back</button>
                  <DashButton
                    onClick={handleSubmit}
                    loading={isSubmitting}
                    disabled={!receiptFile || isSubmitting}
                    className="dash-btn dash-btn-primary flex-1 justify-center"
                  >
                    {isSubmitting ? 'Uploading...' : 'Submit Deposit'}
                  </DashButton>
                </div>
              </div>
            )}
            
            {step === 4 && (
              <div className="text-center py-10 animate-fade-in space-y-6">
                <div className="mx-auto mb-6 flex justify-center">
                  <div className="koara-success-animation">
                    <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                      <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
                      <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white">Deposit Request Submitted</h2>
                <p className="text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Your deposit request has been submitted successfully.<br/>
                  Our team will review your payment and credit your wallet after approval.
                </p>
                <div className="flex flex-col gap-3 pt-6 max-w-xs mx-auto">
                  <DashButton onClick={handleViewHistory} className="dash-btn dash-btn-primary justify-center">
                    View Deposit History
                  </DashButton>
                  <button type="button" onClick={onClose} className="dash-btn dash-btn-secondary justify-center">
                    Close
                  </button>
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

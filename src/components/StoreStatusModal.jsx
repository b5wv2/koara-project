import React, { useState } from 'react';
import Modal from './Modal';
import { UploadCloud, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import DashButton from './ui/DashButton';
import { useAsyncAction } from '../hooks/useAsyncAction';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const StoreStatusModal = ({ isOpen, onClose, storeRequestStatus }) => {
  const { t } = useAppContext();
  const { execute, loading } = useAsyncAction();
  const [errorMsg, setErrorMsg] = useState('');
  
  // Resubmission states
  const [bankName, setBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [kycDocument, setKycDocument] = useState(null);
  const [resubmitted, setResubmitted] = useState(false);

  // Pre-fill when modal opens with a rejected status
  React.useEffect(() => {
    if (storeRequestStatus && storeRequestStatus.status === 'rejected') {
      const req = storeRequestStatus.request;
      setBankName(req.bank_name || '');
      setAccountHolderName(req.account_holder_name || '');
      setAccountNumber(req.account_number || '');
      setResubmitted(false);
      setKycDocument(null);
    }
  }, [storeRequestStatus]);

  if (!storeRequestStatus) return null;

  const { status, reason, request } = storeRequestStatus;

  const handleResubmit = (e) => execute(async () => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMsg('');

    const formData = new FormData();
    formData.append('store_id', request.id);
    formData.append('bank_name', bankName.trim());
    formData.append('account_holder_name', accountHolderName.trim());
    formData.append('account_number', accountNumber.trim());
    if (kycDocument) {
      formData.append('kyc_document', kycDocument);
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/resubmit`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to resubmit application.');
    }

    setResubmitted(true);
    return { success: true };
  });

  if (resubmitted) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Application Resubmitted">
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h4 className="text-xl font-semibold mb-2 text-black">Successfully Resubmitted</h4>
          <p className="text-sm text-slate-500 mb-8">
            Your store application has been updated and sent back for review.
          </p>
          <button onClick={onClose} className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
            Close
          </button>
        </div>
      </Modal>
    );
  }

  if (status === 'pending') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Application Status">
        <div className="text-center py-8 bg-slate-900 border border-slate-800 rounded-2xl animate-warning-box">
          <div className="mx-auto mb-6 flex justify-center">
            <div className="relative w-20 h-20 flex items-center justify-center rounded-full" style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)' }}>
              <svg className="w-10 h-10 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle className="animate-warning-circle" cx="12" cy="12" r="10" />
                <path className="animate-warning-icon" d="M12 8v4" />
                <path className="animate-warning-icon" d="M12 16h.01" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Pending Review</h2>
          <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto leading-relaxed">
            Your store application has been submitted successfully and is currently under review by the Koara administration team.
          </p>
          <div className="bg-slate-800/50 p-4 rounded-lg text-start text-sm mb-8 max-w-sm mx-auto border border-slate-700/50">
            <p className="mb-2"><span className="font-semibold text-slate-300">Store Name:</span> <span className="text-white">{request.store_name}</span></p>
            <p className="mb-2"><span className="font-semibold text-slate-300">Subdomain:</span> <span className="text-white">{request.store_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}</span></p>
            <p className="mb-0"><span className="font-semibold text-slate-300">Submitted:</span> <span className="text-white">{new Date(request.created_at).toLocaleDateString()}</span></p>
          </div>
          <div className="px-6 max-w-sm mx-auto">
            <DashButton onClick={onClose} className="dash-btn dash-btn-primary w-full justify-center py-3 font-semibold rounded-xl cursor-pointer">
              Close
            </DashButton>
          </div>
        </div>
      </Modal>
    );
  }

  if (status === 'rejected') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Application Rejected">
        <div className="text-center py-4 border-b border-slate-100 mb-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
          </div>
          <h4 className="text-lg font-semibold text-black">Application Rejected</h4>
          <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm text-start font-medium">
            <div className="font-bold mb-1">Reason for Rejection:</div>
            {reason || 'No reason provided.'}
          </div>
        </div>

        <form onSubmit={handleResubmit} className="space-y-4">
          <p className="text-sm text-slate-500 mb-2 font-medium">Please correct your information and resubmit.</p>
          
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-lg mb-4">
              {errorMsg}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Bank Name</label>
              <input 
                required
                type="text" 
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-koara-blue focus:ring-1 focus:ring-koara-blue" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Account Holder Name</label>
              <input 
                required
                type="text" 
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                className="w-full px-3 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-koara-blue focus:ring-1 focus:ring-koara-blue" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Account Number</label>
              <input 
                required
                type="text" 
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-3 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-koara-blue focus:ring-1 focus:ring-koara-blue" 
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-slate-700 mb-1">Upload New KYC Document (Optional)</label>
            <label className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer group">
              <div className="w-8 h-8 bg-koara-blue/10 text-koara-blue rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <UploadCloud size={16} />
              </div>
              <p className="text-xs font-medium text-slate-900 mb-1">
                {kycDocument ? kycDocument.name : 'Click to select a new document'}
              </p>
              <input 
                type="file" 
                accept=".png,.jpg,.jpeg,.pdf" 
                className="hidden" 
                onChange={(e) => setKycDocument(e.target.files[0])}
              />
            </label>
          </div>

          <DashButton 
            type="submit"
            onClick={handleResubmit}
            loading={loading}
            disabled={loading}
            className="w-full mt-6 bg-koara-blue text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            Resubmit Application
          </DashButton>
        </form>
      </Modal>
    );
  }

  return null;
};

export default StoreStatusModal;

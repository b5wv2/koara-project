import React, { useState } from 'react';
import Modal from './Modal';
import { UploadCloud, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import DashButton from './ui/DashButton';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const StoreStatusModal = ({ isOpen, onClose, storeRequestStatus }) => {
  const { t } = useAppContext();
  const [loading, setLoading] = useState(false);
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

  const handleResubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
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
    } catch (err) {
      console.error('Resubmit error:', err.message);
      setErrorMsg(err.message);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

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
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <h4 className="text-xl font-semibold mb-2 text-black">Pending Review</h4>
          <p className="text-sm text-slate-500 mb-6">
            Your store application has been submitted successfully and is currently under review by the Koara administration team.
          </p>
          <div className="bg-slate-50 p-4 rounded-lg text-left text-sm mb-8">
            <p className="mb-1"><span className="font-semibold text-slate-700">Store Name:</span> {request.store_name}</p>
            <p className="mb-1"><span className="font-semibold text-slate-700">Subdomain:</span> {request.store_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}</p>
            <p className="mb-1"><span className="font-semibold text-slate-700">Submitted:</span> {new Date(request.created_at).toLocaleDateString()}</p>
          </div>
          <button onClick={onClose} className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
            Close
          </button>
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
          <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm text-left font-medium">
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

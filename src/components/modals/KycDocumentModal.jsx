import React from 'react';
import { FileText } from 'lucide-react';
import Modal from '../Modal';
import { API_BASE_URL } from '../../services/api';

/**
 * KYC document preview modal — view document + approve/reject actions.
 */
const KycDocumentModal = ({ selectedKyc, setSelectedKyc, onApprove, onReject }) => {
  if (!selectedKyc) return null;

  return (
    <Modal isOpen={!!selectedKyc} onClose={() => setSelectedKyc(null)} title="KYC Document Preview">
      <div className="space-y-5">
        <div className="rounded-xl overflow-hidden flex justify-center p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {selectedKyc.kyc_document_url?.endsWith('.pdf') ? (
            <div className="w-full space-y-4 text-center py-8">
              <FileText size={40} className="mx-auto" style={{ color: '#475569' }} />
              <p className="text-sm font-medium" style={{ color: '#94A3B8' }}>PDF Document</p>
              <a
                href={`${API_BASE_URL}${selectedKyc.kyc_document_url}`}
                target="_blank"
                rel="noreferrer"
                className="dash-btn dash-btn-primary inline-flex py-2 px-5 rounded-lg"
              >
                Open PDF in New Tab
              </a>
            </div>
          ) : (
            <img
              src={`${API_BASE_URL}${selectedKyc.kyc_document_url}`}
              alt="KYC Document"
              className="max-w-full max-h-[55vh] object-contain rounded-lg"
            />
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              const id = selectedKyc.store_id || selectedKyc.id;
              setSelectedKyc(null);
              onReject(id);
            }}
            className="dash-btn dash-btn-danger flex-1 justify-center py-2.5 rounded-xl"
          >
            Reject Application
          </button>
          <button
            onClick={() => {
              onApprove(selectedKyc.store_id || selectedKyc.id);
              setSelectedKyc(null);
            }}
            className="dash-btn dash-btn-success flex-1 justify-center py-2.5 rounded-xl"
          >
            Approve & Activate
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default KycDocumentModal;

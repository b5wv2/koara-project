import React from 'react';
import { ShieldCheck, FileText } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import SectionHeader from '../../../components/ui/SectionHeader';
import StatusBadge from '../../../components/ui/StatusBadge';
import DashButton from '../../../components/ui/DashButton';

/**
 * Admin KYC tab — pending KYC applications table.
 */
const AdminKycTab = ({ kycPendingLoading, onApproveKyc, onRejectKyc, onViewDocument }) => {
  const { kycApplications } = useAppContext();

  return (
    <div className="dash-card overflow-hidden">
      <SectionHeader
        title="Pending KYC Applications"
        action={<span className="koara-badge koara-badge-pending">Action Required</span>}
      />
      <div className="overflow-x-auto">
        <table className="koara-table">
          <thead>
            <tr>
              <th>Store Details</th>
              <th>Applicant Info</th>
              <th>Bank Information</th>
              <th>Document</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {kycPendingLoading ? (
              <tr><td colSpan="6"><div className="koara-empty-state"><div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /><span>Loading live requests...</span></div></td></tr>
            ) : (kycApplications || []).length === 0 ? (
              <tr><td colSpan="6"><div className="koara-empty-state"><ShieldCheck size={32} /><span>No pending applications found.</span></div></td></tr>
            ) : (kycApplications || []).map(app => (
              <tr key={app.id}>
                <td className="cell-primary">{app.storeName}</td>
                <td>
                  <div className="font-medium text-white text-sm">{app.applicant}</div>
                  <div className="text-xs" style={{ color: '#475569' }}>{app.email}</div>
                </td>
                <td>
                  <div className="text-xs space-y-0.5">
                    <div><span className="font-semibold text-white">Bank:</span> <span style={{ color: '#94A3B8' }}>{app.bank_name}</span></div>
                    <div><span className="font-semibold text-white">Name:</span> <span style={{ color: '#94A3B8' }}>{app.account_holder_name}</span></div>
                    <div><span className="font-semibold text-white">No:</span> <span style={{ color: '#94A3B8' }} dir="ltr">{app.account_number}</span></div>
                  </div>
                </td>
                <td>
                  {app.kyc_document_url ? (
                    <DashButton onClick={() => onViewDocument(app)} className="dash-btn dash-btn-secondary">
                      <FileText size={13} /> View Doc
                    </DashButton>
                  ) : (
                    <span style={{ color: '#475569', fontSize: '0.75rem' }}>N/A</span>
                  )}
                </td>
                <td><StatusBadge status={app.status} /></td>
                <td className="text-right">
                  {app.status === 'pending' && (
                    <div className="flex justify-end gap-2">
                      <DashButton onClick={() => onApproveKyc(app.id)} className="dash-btn dash-btn-success">Approve</DashButton>
                      <DashButton onClick={() => onRejectKyc(app.id)} className="dash-btn dash-btn-danger">Reject</DashButton>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminKycTab;

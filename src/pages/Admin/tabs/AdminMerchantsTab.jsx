import React from 'react';
import { Users, ArrowUpRight, ArrowDownRight, Trash2 } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import SectionHeader from '../../../components/ui/SectionHeader';
import StatusBadge from '../../../components/ui/StatusBadge';
import Toggle from '../../../components/ui/Toggle';

/**
 * Admin merchants tab — store management table.
 */
const AdminMerchantsTab = ({ onAddBalance, onDeductBalance, onDeleteStore }) => {
  const { merchants, toggleStoreActive } = useAppContext();

  return (
    <div className="dash-card overflow-hidden">
      <SectionHeader title="Store Management & Governance" />
      <div className="overflow-x-auto">
        <table className="koara-table">
          <thead>
            <tr>
              <th>Active</th>
              <th>Store</th>
              <th>Email</th>
              <th>Wallet</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(merchants || []).length === 0 ? (
              <tr><td colSpan="6"><div className="koara-empty-state"><Users size={32} /><span>No stores found.</span></div></td></tr>
            ) : (merchants || []).map(merchant => (
              <tr key={merchant.id}>
                <td>
                  <Toggle on={merchant.active} onChange={() => toggleStoreActive(merchant.id)} />
                </td>
                <td className="cell-primary">{merchant.name}</td>
                <td style={{ color: '#94A3B8' }}>{merchant.email}</td>
                <td className="font-mono font-semibold text-white" dir="ltr">${merchant.balance.toFixed(2)}</td>
                <td>
                  <StatusBadge status={
                    merchant.status === 'active' || (merchant.active && !merchant.status) ? 'active'
                    : merchant.status === 'pending_kyc' || merchant.status === 'pending_approval' || merchant.status === 'pending' ? 'pending'
                    : merchant.status === 'rejected' ? 'rejected'
                    : 'suspended'
                  } />
                </td>
                <td className="text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => onAddBalance(merchant.id)} className="dash-btn dash-btn-success">
                      <ArrowUpRight size={13} /> Add
                    </button>
                    <button onClick={() => onDeductBalance(merchant.id)} className="dash-btn dash-btn-warning">
                      <ArrowDownRight size={13} /> Deduct
                    </button>
                    <button onClick={() => onDeleteStore(merchant.id, merchant.name)} className="dash-btn dash-btn-danger">
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminMerchantsTab;

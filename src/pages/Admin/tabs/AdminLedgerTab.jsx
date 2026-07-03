import React from 'react';
import { Database } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import SectionHeader from '../../../components/ui/SectionHeader';
import StatusBadge from '../../../components/ui/StatusBadge';

/**
 * Admin ledger tab — global ledger transactions table.
 */
const AdminLedgerTab = () => {
  const { ledger } = useAppContext();

  return (
    <div className="dash-card overflow-hidden">
      <SectionHeader title="Global Ledger & Transactions" />
      <div className="overflow-x-auto">
        <table className="koara-table">
          <thead>
            <tr>
              <th>TXN ID</th>
              <th>Date</th>
              <th>Store</th>
              <th>Type</th>
              <th className="text-right">Amount</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {ledger.length === 0 ? (
              <tr><td colSpan="6"><div className="koara-empty-state"><Database size={32} /><span>No transactions yet.</span></div></td></tr>
            ) : ledger.map(txn => (
              <tr key={txn.id}>
                <td className="cell-mono">{txn.id}</td>
                <td style={{ color: '#64748B' }}>{txn.date}</td>
                <td className="cell-primary">{txn.storeName}</td>
                <td>
                  <StatusBadge status={txn.transaction_type === 'credit' ? 'approved' : 'rejected'} />
                </td>
                <td className="text-right font-mono font-semibold" dir="ltr" style={{ color: txn.transaction_type === 'credit' ? '#4ade80' : '#f87171' }}>
                  {txn.transaction_type === 'credit' ? '+' : '-'}{txn.amount.toFixed(2)}
                </td>
                <td className="max-w-[180px] truncate" style={{ color: '#64748B' }} title={txn.reason}>{txn.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminLedgerTab;

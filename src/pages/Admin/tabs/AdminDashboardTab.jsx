import React from 'react';
import { Activity } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import StatCard from '../../../components/ui/StatCard';
import SectionHeader from '../../../components/ui/SectionHeader';
import StatusBadge from '../../../components/ui/StatusBadge';

/**
 * Admin dashboard tab — stats + recent transactions table.
 */
const AdminDashboardTab = () => {
  const { merchants, ledger } = useAppContext();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Stores" value={merchants.length} sub="All registered merchants" />
        <StatCard label="Platform Ledger" value={`$${merchants.reduce((acc, m) => acc + m.balance, 0).toFixed(2)}`} sub="Combined wallet balance" />
        <StatCard label="Total Transactions" value={ledger.length} sub="All time" />
      </div>

      <div className="dash-card overflow-hidden">
        <SectionHeader title="Recent Transactions" description="Live platform ledger activity" />
        <div className="overflow-x-auto">
          <table className="koara-table">
            <thead>
              <tr>
                <th>TXN ID</th>
                <th>Date</th>
                <th>Store</th>
                <th>Type</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {ledger.slice(0, 8).map(txn => (
                <tr key={txn.id}>
                  <td className="cell-mono">{txn.id}</td>
                  <td>{txn.date}</td>
                  <td className="cell-primary">{txn.storeName}</td>
                  <td>
                    <StatusBadge status={txn.transaction_type === 'credit' ? 'approved' : 'rejected'} />
                  </td>
                  <td className="text-right font-mono font-semibold" dir="ltr" style={{ color: txn.transaction_type === 'credit' ? '#4ade80' : '#f87171' }}>
                    {txn.transaction_type === 'credit' ? '+' : '-'}{txn.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
              {ledger.length === 0 && (
                <tr><td colSpan="5"><div className="koara-empty-state"><Activity size={32} /><span>No transactions yet.</span></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default AdminDashboardTab;

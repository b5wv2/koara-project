import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, Banknote, Search } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';

const AdminWithdrawalsTab = () => {
  const { adminWithdrawals, fetchAdminWithdrawals, approveWithdrawal, rejectWithdrawal } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const loadWithdrawals = async () => {
    setLoading(true);
    await fetchAdminWithdrawals();
    setLoading(false);
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this withdrawal? Ensure you have sent the funds manually.')) return;
    setProcessingId(id);
    const res = await approveWithdrawal(id);
    if (!res.success) {
      alert(res.message || 'Failed to approve withdrawal');
    }
    setProcessingId(null);
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this withdrawal? Funds will be refunded to the merchant wallet.')) return;
    setProcessingId(id);
    const res = await rejectWithdrawal(id);
    if (!res.success) {
      alert(res.message || 'Failed to reject withdrawal');
    }
    setProcessingId(null);
  };

  const filteredWithdrawals = adminWithdrawals.filter(w => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      w.store_name?.toLowerCase().includes(q) ||
      w.bank_name?.toLowerCase().includes(q) ||
      w.bank_holder_name?.toLowerCase().includes(q) ||
      w.account_number?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="dash-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Banknote className="text-blue-400" />
            Manual Withdrawals
          </h2>
          <p className="text-sm text-slate-400 mt-1">Review and process merchant withdrawal requests.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search store, bank..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="koara-input pl-10 text-sm"
            />
          </div>
          <button 
            onClick={loadWithdrawals} 
            disabled={loading}
            className="p-2.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="dash-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-800/50 text-slate-400 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-semibold">Store</th>
                <th className="px-6 py-4 font-semibold">Bank Details</th>
                <th className="px-6 py-4 font-semibold text-right">Amount</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && adminWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400">Loading withdrawals...</td>
                </tr>
              ) : filteredWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400">No withdrawal requests found.</td>
                </tr>
              ) : (
                filteredWithdrawals.map(w => (
                  <tr key={w.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{w.store_name}</div>
                      <div className="text-xs text-slate-400">{new Date(w.created_at).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{w.bank_name}</div>
                      <div className="text-xs text-slate-400">{w.bank_holder_name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{w.account_number}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-white">${parseFloat(w.amount).toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {w.status === 'pending' && <span className="inline-block px-2.5 py-1 rounded bg-yellow-500/20 text-yellow-400 text-xs font-semibold">Pending</span>}
                      {w.status === 'approved' && <span className="inline-block px-2.5 py-1 rounded bg-green-500/20 text-green-400 text-xs font-semibold">Approved</span>}
                      {w.status === 'rejected' && <span className="inline-block px-2.5 py-1 rounded bg-red-500/20 text-red-400 text-xs font-semibold">Rejected</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {w.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleReject(w.id)}
                            disabled={processingId !== null}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors disabled:opacity-50"
                            title="Reject & Refund"
                          >
                            <XCircle size={20} />
                          </button>
                          <button
                            onClick={() => handleApprove(w.id)}
                            disabled={processingId !== null}
                            className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded transition-colors disabled:opacity-50"
                            title="Mark as Approved"
                          >
                            <CheckCircle size={20} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">
                          {new Date(w.processed_at).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminWithdrawalsTab;

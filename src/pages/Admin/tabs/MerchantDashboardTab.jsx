import React from 'react';
import { Package, Image as ImageIcon } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import SectionHeader from '../../../components/ui/SectionHeader';
import StatusBadge from '../../../components/ui/StatusBadge';

/**
 * Merchant dashboard tab — wallet card + stats + orders queue.
 */
const MerchantDashboardTab = ({ onAddFunds, onWithdraw, onInspectReceipt }) => {
  const { user, store, merchants, orders } = useAppContext();
  const storeId = user?.storeId;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Wallet Card */}
        <div className="lg:col-span-1">
          <div className="dash-card p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg,#2563EB,#60A5FA)' }} />
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#475569' }}>Live Wallet Balance</div>
            <div className="text-4xl font-extrabold text-white tracking-tight mb-6" dir="ltr">
              ${merchants.find(m => m.id === storeId)?.balance.toFixed(2) || '0.00'}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={onAddFunds} className="dash-btn dash-btn-secondary justify-center py-2.5 rounded-xl text-xs font-semibold">
                Add Funds
              </button>
              <button onClick={onWithdraw} className="dash-btn dash-btn-primary justify-center py-2.5 rounded-xl text-xs font-semibold">
                Withdraw
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="dash-card p-6">
            <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#475569' }}>Store URL</div>
            <div className="text-sm font-bold break-all" style={{ color: '#60A5FA' }}>
              {store?.subdomain ? `${store.subdomain}.getkoara.com` : 'No store available'}
            </div>
          </div>
          <div className="dash-card p-6">
            <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#475569' }}>Pending Orders</div>
            <div className="text-4xl font-extrabold text-white">{orders.filter(o => o.store_id === storeId && o.status === 'pending').length}</div>
          </div>
        </div>
      </div>

      {/* Orders Queue */}
      <div className="dash-card overflow-hidden">
        <SectionHeader title="Incoming Orders Queue" description="Review and process pending customer orders" />
        {orders.filter(o => o.store_id === storeId).length === 0 ? (
          <div className="koara-empty-state">
            <Package size={32} />
            <span>No recent orders yet.</span>
          </div>
        ) : (
          orders.filter(o => o.store_id === storeId).map(order => (
            <div key={order.id} className="px-6 py-4 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-bold text-sm text-white">{order.order_number} — {order.product_name}</div>
                  <div className="text-xs mt-1" style={{ color: '#475569' }}>{order.customer_name} · {order.whatsapp}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm text-white" dir="ltr">${parseFloat(order.total_amount || 0).toFixed(2)}</span>
                  <StatusBadge status={
                    order.status === 'pending' ? 'pending'
                    : order.status === 'approved' ? 'approved'
                    : 'rejected'
                  } />
                </div>
              </div>
              {order.status === 'pending' && (
                <button onClick={() => onInspectReceipt(order)} className="dash-btn dash-btn-secondary">
                  <ImageIcon size={13} /> Inspect Receipt
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
};

export default MerchantDashboardTab;

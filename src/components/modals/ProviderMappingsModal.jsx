import React from 'react';
import { Activity } from 'lucide-react';
import Modal from '../Modal';
import StatusBadge from '../ui/StatusBadge';
import DashButton from '../ui/DashButton';

/**
 * Provider mappings modal — manage provider-to-product mappings.
 */
const ProviderMappingsModal = ({
  catalogProviderModal, setCatalogProviderModal,
  newMapping, setNewMapping,
  providers,
  onAddMapping, onFetchMappings,
}) => (
  <Modal
    isOpen={catalogProviderModal.isOpen}
    onClose={() => setCatalogProviderModal({ isOpen: false, productId: null, productName: '', mappings: [] })}
    title={`Provider Mappings — ${catalogProviderModal.productName}`}
  >
    <div className="space-y-5">
      {catalogProviderModal.mappings.length > 0 ? (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <table className="koara-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Product ID</th>
                <th>Cost Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {catalogProviderModal.mappings.map(m => (
                <tr key={m.id}>
                  <td className="cell-primary">{m.provider_name}</td>
                  <td className="cell-mono">{m.provider_product_id}</td>
                  <td className="font-mono text-sm text-white">{m.cost_price ? `$${parseFloat(m.cost_price).toFixed(2)}` : '—'}</td>
                  <td><StatusBadge status={m.is_active ? 'active' : 'inactive'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="koara-empty-state py-8">
          <Activity size={28} />
          <span>No provider mappings yet.</span>
        </div>
      )}

      <div className="pt-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <h4 className="text-sm font-bold text-white">Add Provider Mapping</h4>
        <div>
          <label className="koara-label">Provider</label>
          <select value={newMapping.provider_id} onChange={(e) => setNewMapping({ ...newMapping, provider_id: e.target.value })} className="koara-select">
            <option value="">Select provider...</option>
            {(providers || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="koara-label">Provider Product ID</label>
          <input type="text" value={newMapping.provider_product_id} onChange={(e) => setNewMapping({ ...newMapping, provider_product_id: e.target.value })} className="koara-input" placeholder="e.g. 3449" />
        </div>
        <div>
          <label className="koara-label">Cost Price ($)</label>
          <input type="number" step="0.01" value={newMapping.cost_price} onChange={(e) => setNewMapping({ ...newMapping, cost_price: e.target.value })} className="koara-input" placeholder="0.00" dir="ltr" />
        </div>
        <DashButton
          type="button"
          onClick={async () => {
            if (!newMapping.provider_id || !newMapping.provider_product_id) {
              alert('Provider and Product ID are required');
              return { success: false };
            }
            const result = await onAddMapping(catalogProviderModal.productId, {
              provider_id: parseInt(newMapping.provider_id),
              provider_product_id: newMapping.provider_product_id,
              cost_price: newMapping.cost_price ? parseFloat(newMapping.cost_price) : null,
            });
            if (result.success) {
              const updatedMappings = await onFetchMappings(catalogProviderModal.productId);
              setCatalogProviderModal(prev => ({ ...prev, mappings: updatedMappings }));
              setNewMapping({ provider_id: '', provider_product_id: '', cost_price: '' });
            } else {
              alert(result.message || 'Failed to add mapping');
            }
            return result;
          }}
          className="dash-btn dash-btn-primary w-full justify-center py-2.5 rounded-xl text-sm font-semibold"
        >
          Add Mapping
        </DashButton>
      </div>
    </div>
  </Modal>
);

export default ProviderMappingsModal;

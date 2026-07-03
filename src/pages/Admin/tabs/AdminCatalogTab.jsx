import React from 'react';
import { Package, Activity } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import SectionHeader from '../../../components/ui/SectionHeader';
import StatusBadge from '../../../components/ui/StatusBadge';

/**
 * Admin catalog tab — platform product catalog + providers table.
 */
const AdminCatalogTab = ({ onCreateProduct, onEditProduct, onDeactivateProduct, onManageProviders }) => {
  const { platformProducts, providers } = useAppContext();

  return (
    <>
      <div className="dash-card overflow-hidden">
        <SectionHeader
          title="Platform Product Catalog"
          action={
            <button onClick={onCreateProduct} className="dash-btn dash-btn-primary">
              + New Product
            </button>
          }
        />
        <div className="overflow-x-auto">
          <table className="koara-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Providers</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(platformProducts || []).length === 0 ? (
                <tr><td colSpan="5"><div className="koara-empty-state"><Package size={32} /><span>No platform products yet.</span></div></td></tr>
              ) : platformProducts.map(product => (
                <tr key={product.id} style={{ opacity: product.is_active ? 1 : 0.5 }}>
                  <td><StatusBadge status={product.is_active ? 'active' : 'inactive'} /></td>
                  <td className="cell-primary">{product.name}</td>
                  <td style={{ color: '#94A3B8' }}>{product.category}</td>
                  <td>
                    <button onClick={() => onManageProviders(product)} className="dash-btn dash-btn-secondary">
                      Manage Providers
                    </button>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => onEditProduct(product)} className="dash-btn dash-btn-secondary">Edit</button>
                      {product.is_active && (
                        <button onClick={() => onDeactivateProduct(product.id)} className="dash-btn dash-btn-danger">Deactivate</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dash-card overflow-hidden">
        <SectionHeader title="Registered Providers" />
        <div className="overflow-x-auto">
          <table className="koara-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Provider Name</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(providers || []).length === 0 ? (
                <tr><td colSpan="3"><div className="koara-empty-state"><Activity size={32} /><span>No providers registered.</span></div></td></tr>
              ) : (providers || []).map(provider => (
                <tr key={provider.id}>
                  <td className="cell-mono">{provider.id}</td>
                  <td className="cell-primary">{provider.name}</td>
                  <td><StatusBadge status={provider.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default AdminCatalogTab;

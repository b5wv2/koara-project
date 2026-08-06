import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Edit2, Check, X, Landmark, UploadCloud, Save } from 'lucide-react';
import { API_BASE_URL } from '../../services/api';
import { useAppContext } from '../../context/AppContext';
import { getImageUrl } from '../../utils/imageUrl';

const DepositMethodsManagement = () => {
  const { t } = useAppContext();
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/deposit-methods`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch deposit methods');
      const data = await res.json();
      setMethods(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (isNew) => {
    try {
      if (!editForm.name || !editForm.currency_code) {
        return setError('Name and Currency are required');
      }

      const method = isNew ? 'POST' : 'PUT';
      const url = isNew 
        ? `${API_BASE_URL}/api/admin/deposit-methods` 
        : `${API_BASE_URL}/api/admin/deposit-methods/${editingId}`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save deposit method');
      }

      await fetchMethods();
      setEditingId(null);
      setIsAdding(false);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('logo', file);

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/deposit-methods/logo`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setEditForm(prev => ({ ...prev, logo_url: data.logo_url }));
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err) {
      alert('Error uploading logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const startEdit = (method) => {
    setEditingId(method.id);
    setEditForm({ ...method });
    setIsAdding(false);
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setEditForm({
      name: '', type: 'bank_transfer', account_holder: '', account_number: '', 
      iban: '', bban: '', swift: '', currency_code: 'USD', country: '', notes: '', 
      logo_url: '', instructions: '', min_deposit: 10, max_deposit: 100000, 
      is_active: true, display_order: 0
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Landmark className="text-blue-400" />
            Deposit Methods
          </h2>
          <p className="text-sm text-slate-400 mt-1">Manage bank accounts and deposit options for merchants.</p>
        </div>
        {!isAdding && !editingId && (
          <button onClick={startAdd} className="dash-btn dash-btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Deposit Method
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {(isAdding || editingId) && editForm ? (
        <div className="dash-card p-6 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all">
          <h3 className="text-lg font-bold text-white mb-4">
            {isAdding ? 'Add New Deposit Method' : 'Edit Deposit Method'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Method Name</label>
                <input type="text" className="dash-input w-full" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="e.g. Bank of Khartoum" />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-400 mb-1">Currency Code</label>
                  <input type="text" className="dash-input w-full uppercase" value={editForm.currency_code} onChange={e => setEditForm({...editForm, currency_code: e.target.value.toUpperCase()})} placeholder="SDG" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-400 mb-1">Sort Order</label>
                  <input type="number" className="dash-input w-full" value={editForm.display_order} onChange={e => setEditForm({...editForm, display_order: parseInt(e.target.value)})} />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Method Logo</label>
                <div className="flex items-center gap-4">
                  {editForm.logo_url && (
                    <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center p-1">
                      <img src={getImageUrl(editForm.logo_url)} alt="Logo" className="max-w-full max-h-full rounded" />
                    </div>
                  )}
                  <label className="dash-btn dash-btn-secondary cursor-pointer flex items-center gap-2 text-sm py-1.5">
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                    {uploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                    {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Account Holder</label>
                <input type="text" className="dash-input w-full" value={editForm.account_holder} onChange={e => setEditForm({...editForm, account_holder: e.target.value})} placeholder="Koara LLC" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Account Number</label>
                <input type="text" className="dash-input w-full font-mono text-sm" value={editForm.account_number} onChange={e => setEditForm({...editForm, account_number: e.target.value})} placeholder="123456789" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">IBAN (Optional)</label>
                <input type="text" className="dash-input w-full font-mono text-sm" value={editForm.iban} onChange={e => setEditForm({...editForm, iban: e.target.value})} placeholder="SA..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">BBAN (Optional)</label>
                <input type="text" className="dash-input w-full font-mono text-sm" value={editForm.bban || ''} onChange={e => setEditForm({...editForm, bban: e.target.value})} placeholder="001..." />
              </div>
            </div>
            
            <div className="md:col-span-2 space-y-4 pt-4 border-t border-white/10">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-400 mb-1">Min Deposit</label>
                  <input type="number" className="dash-input w-full" value={editForm.min_deposit} onChange={e => setEditForm({...editForm, min_deposit: parseFloat(e.target.value)})} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-400 mb-1">Max Deposit</label>
                  <input type="number" className="dash-input w-full" value={editForm.max_deposit} onChange={e => setEditForm({...editForm, max_deposit: parseFloat(e.target.value)})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Transfer Instructions</label>
                <textarea 
                  className="dash-input w-full h-24 resize-none" 
                  value={editForm.instructions || ''} 
                  onChange={e => setEditForm({...editForm, instructions: e.target.value})} 
                  placeholder="E.g., Please include your store name in the transfer notes..."
                ></textarea>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="methodActive" checked={editForm.is_active} onChange={e => setEditForm({...editForm, is_active: e.target.checked})} className="w-4 h-4 rounded bg-slate-800 border-white/20" />
                <label htmlFor="methodActive" className="text-sm text-slate-300">Method is Active</label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="dash-btn dash-btn-secondary">Cancel</button>
            <button onClick={() => handleSave(isAdding)} className="dash-btn dash-btn-primary flex items-center gap-2">
              <Save size={16} /> Save Method
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {methods.map(method => (
            <div key={method.id} className="dash-card p-4 hover:border-white/20 transition-all flex flex-col justify-between group">
              <div className="flex gap-4 items-start">
                <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-2 flex-shrink-0">
                  {method.logo_url ? (
                    <img src={getImageUrl(method.logo_url)} alt={method.name} className="max-w-full max-h-full rounded" />
                  ) : (
                    <Landmark size={24} className="text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-white text-lg truncate">{method.name}</h3>
                    {method.is_active ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">ACTIVE</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/20 text-slate-400">INACTIVE</span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-blue-400 mt-0.5">{method.currency_code}</div>
                  
                  <div className="mt-3 space-y-1">
                    <div className="text-xs flex gap-2">
                      <span className="text-slate-500 w-16">Holder:</span>
                      <span className="text-slate-300 truncate">{method.account_holder}</span>
                    </div>
                    <div className="text-xs flex gap-2">
                      <span className="text-slate-500 w-16">Account:</span>
                      <span className="text-slate-300 font-mono truncate">{method.account_number}</span>
                    </div>
                    {method.iban && (
                      <div className="text-xs flex gap-2">
                        <span className="text-slate-500 w-16">IBAN:</span>
                        <span className="text-slate-300 font-mono truncate">{method.iban}</span>
                      </div>
                    )}
                    {method.bban && (
                      <div className="text-xs flex gap-2">
                        <span className="text-slate-500 w-16">BBAN:</span>
                        <span className="text-slate-300 font-mono truncate">{method.bban}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                <div className="text-xs text-slate-500">
                  Limits: {method.min_deposit} - {method.max_deposit} {method.currency_code}
                </div>
                <button onClick={() => startEdit(method)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit2 size={16} />
                </button>
              </div>
            </div>
          ))}

          {methods.length === 0 && (
            <div className="col-span-1 lg:col-span-2 dash-card p-10 text-center text-slate-400">
              <Landmark size={48} className="mx-auto mb-4 opacity-20" />
              <p>No deposit methods configured yet.</p>
              <button onClick={startAdd} className="dash-btn dash-btn-primary mx-auto mt-4">Add First Method</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DepositMethodsManagement;

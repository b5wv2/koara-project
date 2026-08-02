import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Edit2, Check, X, DollarSign } from 'lucide-react';
import { API_BASE_URL } from '../../services/api';
import { useAppContext } from '../../context/AppContext';

const CurrenciesManagement = () => {
  const { t } = useAppContext();
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ code: '', name: '', symbol: '', exchange_rate: 1.0, is_base_currency: false, is_active: true });

  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/currencies`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch currencies');
      const data = await res.json();
      setCurrencies(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (isNew) => {
    try {
      if (!editForm.code || !editForm.name) {
        return setError('Code and name are required');
      }

      const method = isNew ? 'POST' : 'PUT';
      const url = isNew 
        ? `${API_BASE_URL}/api/admin/currencies` 
        : `${API_BASE_URL}/api/admin/currencies/${editingId}`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save currency');
      }

      await fetchCurrencies();
      setEditingId(null);
      setIsAdding(false);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (currency) => {
    setEditingId(currency.id);
    setEditForm({ ...currency });
    setIsAdding(false);
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setEditForm({ code: '', name: '', symbol: '', exchange_rate: 1.0, is_base_currency: false, is_active: true });
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
            <DollarSign className="text-emerald-400" />
            {t('currencies_management') || 'Currencies Management'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">Configure supported currencies and exchange rates.</p>
        </div>
        <button onClick={startAdd} className="dash-btn dash-btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Currency
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="dash-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-white/5 border-b border-white/10 text-slate-400">
              <tr>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Symbol</th>
                <th className="px-6 py-4">Rate (to Base)</th>
                <th className="px-6 py-4">Base Currency</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isAdding && (
                <tr className="bg-blue-500/5">
                  <td className="px-6 py-3"><input type="text" className="dash-input w-20 py-1" value={editForm.code} onChange={e => setEditForm({...editForm, code: e.target.value.toUpperCase()})} placeholder="USD" /></td>
                  <td className="px-6 py-3"><input type="text" className="dash-input w-full py-1" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="US Dollar" /></td>
                  <td className="px-6 py-3"><input type="text" className="dash-input w-16 py-1" value={editForm.symbol} onChange={e => setEditForm({...editForm, symbol: e.target.value})} placeholder="$" /></td>
                  <td className="px-6 py-3"><input type="number" step="0.000001" className="dash-input w-24 py-1" value={editForm.exchange_rate} onChange={e => setEditForm({...editForm, exchange_rate: parseFloat(e.target.value)})} /></td>
                  <td className="px-6 py-3">
                    <input type="checkbox" checked={editForm.is_base_currency} onChange={e => setEditForm({...editForm, is_base_currency: e.target.checked})} className="rounded bg-slate-800 border-white/20" />
                  </td>
                  <td className="px-6 py-3">
                    <input type="checkbox" checked={editForm.is_active} onChange={e => setEditForm({...editForm, is_active: e.target.checked})} className="rounded bg-slate-800 border-white/20" />
                  </td>
                  <td className="px-6 py-3 flex justify-end gap-2">
                    <button onClick={() => handleSave(true)} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30"><Check size={16} /></button>
                    <button onClick={() => setIsAdding(false)} className="p-1.5 bg-slate-500/20 text-slate-400 rounded hover:bg-slate-500/30"><X size={16} /></button>
                  </td>
                </tr>
              )}

              {currencies.map(c => {
                const isEditing = editingId === c.id;
                return (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 font-bold text-white">
                      {isEditing ? <input type="text" className="dash-input w-20 py-1" value={editForm.code} onChange={e => setEditForm({...editForm, code: e.target.value.toUpperCase()})} /> : c.code}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {isEditing ? <input type="text" className="dash-input w-full py-1" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /> : c.name}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {isEditing ? <input type="text" className="dash-input w-16 py-1" value={editForm.symbol} onChange={e => setEditForm({...editForm, symbol: e.target.value})} /> : (c.symbol || '-')}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {isEditing ? <input type="number" step="0.000001" className="dash-input w-24 py-1" value={editForm.exchange_rate} onChange={e => setEditForm({...editForm, exchange_rate: parseFloat(e.target.value)})} /> : parseFloat(c.exchange_rate).toFixed(6)}
                    </td>
                    <td className="px-6 py-4">
                      {isEditing 
                        ? <input type="checkbox" checked={editForm.is_base_currency} onChange={e => setEditForm({...editForm, is_base_currency: e.target.checked})} className="rounded bg-slate-800 border-white/20" />
                        : (c.is_base_currency ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">BASE</span> : '-')
                      }
                    </td>
                    <td className="px-6 py-4">
                      {isEditing 
                        ? <input type="checkbox" checked={editForm.is_active} onChange={e => setEditForm({...editForm, is_active: e.target.checked})} className="rounded bg-slate-800 border-white/20" />
                        : (c.is_active 
                            ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">ACTIVE</span>
                            : <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/20 text-slate-400">INACTIVE</span>)
                      }
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isEditing ? (
                          <>
                            <button onClick={() => handleSave(false)} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30"><Check size={16} /></button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 bg-slate-500/20 text-slate-400 rounded hover:bg-slate-500/30"><X size={16} /></button>
                          </>
                        ) : (
                          <button onClick={() => startEdit(c)} className="p-1.5 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"><Edit2 size={16} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {currencies.length === 0 && !isAdding && (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-400">
                    No currencies configured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CurrenciesManagement;

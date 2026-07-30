import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { Megaphone, Send, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const AdminBroadcastsTab = () => {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'push', // push, email, both
    title: '',
    subject: '',
    message: ''
  });

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchBroadcasts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/broadcasts');
      if (res.data.success) {
        setBroadcasts(res.data.broadcasts);
      }
    } catch (err) {
      console.error('Failed to fetch broadcasts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.message.trim()) return 'Message is required.';
    if (formData.message.length > 5000) return 'Message is too long (max 5000 chars).';
    if ((formData.type === 'push' || formData.type === 'both') && !formData.title.trim()) {
      return 'Title is required for push notifications.';
    }
    if ((formData.type === 'email' || formData.type === 'both') && !formData.subject.trim()) {
      return 'Subject is required for emails.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!window.confirm(`Are you sure you want to send this broadcast to ALL merchants via ${formData.type.toUpperCase()}?`)) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/admin/broadcast', formData);
      if (res.data.success) {
        setSuccess('Broadcast successfully scheduled!');
        setFormData({ type: 'push', title: '', subject: '', message: '' });
        fetchBroadcasts();
      } else {
        setError(res.data.error || 'Failed to send broadcast');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send broadcast');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <Megaphone className="w-6 h-6 mr-2 text-blue-500" />
          Broadcast Center
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Section */}
        <div className="lg:col-span-1 bg-slate-800 rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">New Broadcast</h3>
          
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2 shrink-0 mt-0.5" />
              <span className="text-sm text-red-200">{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start">
              <CheckCircle className="w-5 h-5 text-green-400 mr-2 shrink-0 mt-0.5" />
              <span className="text-sm text-green-200">{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Delivery Method</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="push">Push Notification Only</option>
                <option value="email">Email Only</option>
                <option value="both">Push + Email</option>
              </select>
            </div>

            {(formData.type === 'push' || formData.type === 'both') && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Push Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. System Maintenance"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  maxLength={100}
                />
              </div>
            )}

            {(formData.type === 'email' || formData.type === 'both') && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="e.g. Important Platform Update"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  maxLength={150}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Message</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Write your announcement here..."
                rows={6}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                maxLength={5000}
              />
              <div className="text-right text-xs text-slate-500 mt-1">
                {formData.message.length}/5000
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center transition-colors"
            >
              {submitting ? (
                <span className="flex items-center"><Clock className="animate-spin w-4 h-4 mr-2" /> Sending...</span>
              ) : (
                <span className="flex items-center"><Send className="w-4 h-4 mr-2" /> Send Broadcast</span>
              )}
            </button>
          </form>
        </div>

        {/* History Section */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Broadcast History</h3>
          
          {loading ? (
            <div className="text-slate-400 text-center py-8">Loading history...</div>
          ) : broadcasts.length === 0 ? (
            <div className="text-slate-500 text-center py-8 bg-slate-900/50 rounded-lg border border-slate-800">
              No broadcasts have been sent yet.
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {broadcasts.map(b => (
                <div key={b.id} className="bg-slate-900 rounded-lg p-4 border border-slate-700/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${b.type === 'push' ? 'bg-purple-500/20 text-purple-300' : b.type === 'email' ? 'bg-orange-500/20 text-orange-300' : 'bg-blue-500/20 text-blue-300'}`}>
                          {b.type}
                        </span>
                        <span className="text-slate-400 text-sm">
                          {new Date(b.created_at).toLocaleString()} by {b.created_by_name}
                        </span>
                      </div>
                      <h4 className="text-white font-medium mt-2">
                        {b.type === 'email' ? b.subject : b.title}
                        {b.type === 'both' && <span className="text-slate-500 text-sm font-normal ml-2">(Push: {b.title})</span>}
                      </h4>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-300">Targets: {b.total_targets}</div>
                      <div className="flex space-x-3 mt-1 text-xs">
                        <span className="text-green-400 flex items-center"><CheckCircle className="w-3 h-3 mr-1" /> {b.successful}</span>
                        <span className="text-red-400 flex items-center"><AlertCircle className="w-3 h-3 mr-1" /> {b.failed}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-slate-300 text-sm mt-3 p-3 bg-slate-800 rounded border border-slate-700 whitespace-pre-wrap">
                    {b.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminBroadcastsTab;

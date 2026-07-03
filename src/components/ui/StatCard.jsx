import React from 'react';

/**
 * Dashboard stat card.
 * Displays a metric label, value, and optional sub-text.
 */
const StatCard = ({ label, value, sub }) => (
  <div className="dash-card p-6">
    <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#475569' }}>{label}</div>
    <div className="text-3xl font-extrabold text-white tracking-tight">{value}</div>
    {sub && <div className="text-xs mt-2" style={{ color: '#94A3B8' }}>{sub}</div>}
  </div>
);

export default StatCard;

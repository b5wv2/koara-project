import React from 'react';

/**
 * Section header used in dashboard cards.
 * Displays a title, optional description, and optional action button.
 */
const SectionHeader = ({ title, description, action }) => (
  <div className="px-6 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
    <div>
      <h3 className="font-semibold text-white text-sm">{title}</h3>
      {description && <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{description}</p>}
    </div>
    {action}
  </div>
);

export default SectionHeader;

import React from 'react';

/**
 * Toggle switch component.
 * Renders an on/off toggle button.
 */
const Toggle = ({ on, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    className="koara-toggle"
    data-on={on ? 'true' : 'false'}
    style={{ background: on ? '#2563EB' : 'rgba(255,255,255,0.12)' }}
  >
    <span className="koara-toggle-thumb" style={{ transform: on ? 'translateX(19px)' : 'translateX(3px)' }} />
  </button>
);

export default Toggle;

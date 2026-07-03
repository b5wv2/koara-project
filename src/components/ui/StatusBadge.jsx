import React from 'react';
import { STATUS_CLASS_MAP, STATUS_LABELS } from '../../constants/status';

/**
 * Status badge component.
 * Renders a styled badge for a given status string.
 */
const StatusBadge = ({ status }) => {
  const key = status?.toLowerCase();
  const cls = STATUS_CLASS_MAP[key] || 'koara-badge-inactive';
  const label = STATUS_LABELS[key] || status;

  return <span className={`koara-badge ${cls}`}>{label}</span>;
};

export default StatusBadge;

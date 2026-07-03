import React from 'react';

/**
 * Empty state placeholder.
 * Renders a centered icon + message for empty tables/lists.
 *
 * @param {React.ReactNode} icon - Lucide icon element
 * @param {string} message - Display message
 * @param {number} [colSpan] - If inside a table, wraps in <tr><td colSpan>
 */
const EmptyState = ({ icon, message, colSpan }) => {
  const content = (
    <div className="koara-empty-state">
      {icon}
      <span>{message}</span>
    </div>
  );

  if (colSpan) {
    return (
      <tr>
        <td colSpan={colSpan}>{content}</td>
      </tr>
    );
  }

  return content;
};

export default EmptyState;

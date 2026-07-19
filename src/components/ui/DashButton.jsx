import React, { useState } from 'react';

/**
 * Reusable dashboard action button with automatic loading/spinner state and double-submit prevention.
 *
 * @param {object} props
 * @param {boolean} [props.loading] - Optional external loading control
 * @param {function} [props.onClick] - Click handler, automatically tracks Promise execution
 */
const DashButton = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  type = 'button',
  className = '',
  style = {},
  ...props
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const isBusy = loading || internalLoading;

  const handleClick = async (e) => {
    if (disabled || isBusy || !onClick) return;

    const result = onClick(e);
    if (result && typeof result.then === 'function') {
      setInternalLoading(true);
      try {
        const res = await result;
        // If the promise resolves to false or an object containing { success: false }
        if (res === false || (res && typeof res === 'object' && res.success === false)) {
          setInternalLoading(false);
        }
        // If successful, we keep internalLoading true until component unmounts or parent re-renders/closes
      } catch (err) {
        setInternalLoading(false);
      }
    }
  };

  return (
    <button
      type={type}
      disabled={disabled || isBusy}
      onClick={onClick ? handleClick : undefined}
      className={`${className} relative`}
      style={style}
      {...props}
    >
      {isBusy ? (
        <>
          <span className="opacity-0 flex items-center justify-center gap-1.5">{children}</span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default DashButton;

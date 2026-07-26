import React, { useState, useRef, useEffect } from 'react';

/**
 * Reusable dashboard action button with automatic loading/spinner state,
 * double-submit prevention, unmount safety, and timeout recovery.
 *
 * @param {object} props
 * @param {boolean} [props.loading] - Optional external loading control
 * @param {function} [props.onClick] - Click handler, automatically tracks Promise execution
 * @param {number} [props.timeoutMs=15000] - Timeout limit in ms to auto-release loading if stalled
 */
const DashButton = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  type = 'button',
  className = '',
  style = {},
  timeoutMs = 15000,
  ...props
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isBusy = loading || internalLoading;

  const handleClick = async (e) => {
    if (disabled || isBusy || !onClick) return;

    let timerId = null;
    try {
      const result = onClick(e);
      if (result && typeof result.then === 'function') {
        if (isMountedRef.current) setInternalLoading(true);

        const timeoutPromise = new Promise((_, reject) => {
          timerId = setTimeout(() => {
            reject(new Error('Action timed out'));
          }, timeoutMs);
        });

        try {
          await Promise.race([result, timeoutPromise]);
        } catch (err) {
          console.warn('DashButton async execution error or timeout:', err);
        } finally {
          if (timerId) clearTimeout(timerId);
          if (isMountedRef.current) {
            setInternalLoading(false);
          }
        }
      }
    } catch (err) {
      console.error('DashButton click handler error:', err);
      if (isMountedRef.current) {
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

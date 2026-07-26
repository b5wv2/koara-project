import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Reusable hook for safe async actions with loading state, duplicate click prevention,
 * unmount safety, and automatic timeout recovery.
 *
 * Can be initialized with a function: `useAsyncAction(asyncFn, options)`
 * Or initialized empty and called with an inline function: `const { execute } = useAsyncAction(); execute(async () => ...)`
 */
export function useAsyncAction(initialFnOrOptions, optionsParam = {}) {
  let asyncFn = typeof initialFnOrOptions === 'function' ? initialFnOrOptions : null;
  let options = typeof initialFnOrOptions === 'object' && initialFnOrOptions !== null ? initialFnOrOptions : optionsParam;

  const { timeoutMs = 15000, onError } = options || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);
  const asyncFnRef = useRef(asyncFn);

  useEffect(() => {
    asyncFnRef.current = asyncFn;
  }, [asyncFn]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args) => {
      if (loading) return { success: false, error: 'Operation already in progress' };

      let targetFn = asyncFnRef.current;
      let targetArgs = args;

      if (typeof args[0] === 'function') {
        targetFn = args[0];
        targetArgs = args.slice(1);
      }

      if (!targetFn) {
        console.warn('useAsyncAction: No function provided to execute');
        return { success: false, error: 'No async function provided' };
      }

      if (isMountedRef.current) {
        setLoading(true);
        setError(null);
      }

      let timerId = null;
      const timeoutPromise = new Promise((_, reject) => {
        timerId = setTimeout(() => {
          reject(new Error('Request timed out. Please try again.'));
        }, timeoutMs);
      });

      try {
        const res = await Promise.race([targetFn(...targetArgs), timeoutPromise]);
        return res;
      } catch (err) {
        console.error('Async action failed:', err);
        const errorMsg = err.message || 'An unexpected error occurred.';
        if (isMountedRef.current) {
          setError(errorMsg);
        }
        if (onError) onError(err);
        return { success: false, error: errorMsg };
      } finally {
        if (timerId) clearTimeout(timerId);
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [loading, timeoutMs, onError]
  );

  const reset = useCallback(() => {
    if (isMountedRef.current) {
      setLoading(false);
      setError(null);
    }
  }, []);

  return { execute, loading, error, setError, reset };
}

export default useAsyncAction;

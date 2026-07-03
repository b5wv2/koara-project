import { useState } from 'react';

/**
 * Generic modal state hook.
 * Manages open/close/update for modal state objects.
 *
 * @param {Object} initialState - The default closed state
 * @returns {[state, open, close, update]}
 *
 * Usage:
 *   const [modal, openModal, closeModal, updateModal] = useModalState({ isOpen: false, storeId: null });
 *   openModal({ storeId: 5 })   → merges { isOpen: true, storeId: 5 }
 *   closeModal()                 → resets to initialState
 *   updateModal({ error: '!' })  → merges into current state
 */
export function useModalState(initialState) {
  const [state, setState] = useState(initialState);

  const open = (overrides = {}) => {
    setState({ ...initialState, isOpen: true, ...overrides });
  };

  const close = () => {
    setState(initialState);
  };

  const update = (overrides) => {
    setState(prev => ({ ...prev, ...overrides }));
  };

  return [state, open, close, update];
}

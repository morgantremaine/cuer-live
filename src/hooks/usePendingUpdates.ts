
import { useState, useCallback } from 'react';

export const usePendingUpdates = () => {
  const [hasPendingUpdates, setHasPendingUpdates] = useState(false);

  const markPendingUpdates = useCallback(() => {
    setHasPendingUpdates(true);
  }, []);

  const clearPendingUpdates = useCallback(() => {
    setHasPendingUpdates(false);
  }, []);

  return {
    hasPendingUpdates,
    markPendingUpdates,
    clearPendingUpdates
  };
};

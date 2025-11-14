import { useState, useEffect } from 'react';
import { connectionState } from '@/services/ConnectionState';

/**
 * Hook to read unified connection state
 * Single source of truth for connection status
 */
export const useConnectionState = () => {
  const [state, setState] = useState(connectionState.getState());

  useEffect(() => {
    const unsubscribe = connectionState.subscribe(setState);
    return unsubscribe;
  }, []);

  return state;
};

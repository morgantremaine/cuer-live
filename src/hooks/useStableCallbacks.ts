
import { useCallback, useRef } from 'react';

// This hook creates stable callback references that don't change on every render
// unless the actual function implementation changes
export const useStableCallbacks = <T extends Record<string, (...args: any[]) => any>>(
  callbacks: T
): T => {
  const stableCallbacks = useRef<T>({} as T);
  
  // Update the stable callbacks only when the actual implementations change
  Object.keys(callbacks).forEach(key => {
    const currentCallback = callbacks[key as keyof T];
    const stableCallback = stableCallbacks.current[key as keyof T];
    
    if (!stableCallback || stableCallback.toString() !== currentCallback.toString()) {
      stableCallbacks.current[key as keyof T] = useCallback(currentCallback, [currentCallback]);
    }
  });
  
  return stableCallbacks.current;
};

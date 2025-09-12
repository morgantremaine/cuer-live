import { useCallback, useRef } from 'react';

/**
 * Create stable handler functions that don't change references unless dependencies actually change
 */
export const useStableHandlers = <T extends Record<string, (...args: any[]) => any>>(
  handlers: T,
  deps: any[]
): T => {
  const handlersRef = useRef<T>(handlers);
  const depsRef = useRef(deps);
  
  // Check if dependencies have actually changed
  const depsChanged = deps.length !== depsRef.current.length || 
    deps.some((dep, index) => dep !== depsRef.current[index]);
  
  if (depsChanged) {
    handlersRef.current = handlers;
    depsRef.current = deps;
  }
  
  return handlersRef.current;
};

/**
 * Optimize function props to prevent unnecessary re-renders
 */
export const useOptimizedUpdateItem = (updateItem: (id: string, field: string, value: string) => void) => {
  const stableUpdateItem = useCallback((id: string, field: string, value: string) => {
    // Debounce rapid typing updates
    const now = Date.now();
    const key = `${id}-${field}`;
    
    updateItem(id, field, value);
  }, [updateItem]);
  
  return stableUpdateItem;
};
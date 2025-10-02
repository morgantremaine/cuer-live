import { useCallback, useRef } from 'react';

interface DebouncedOperation {
  itemId: string;
  field: string;
  value: any;
  timeoutId: NodeJS.Timeout;
}

interface UseTextDebounceOptions {
  onFlush: (itemId: string, field: string, value: any) => void;
  debounceMs?: number;
}

/**
 * Hook for debouncing text operations to reduce network traffic
 * while maintaining instant local updates
 */
export const useTextDebounce = ({ 
  onFlush, 
  debounceMs = 300 
}: UseTextDebounceOptions) => {
  // Map of pending operations by cell (itemId + field)
  const pendingOpsRef = useRef<Map<string, DebouncedOperation>>(new Map());

  /**
   * Debounce a text operation - will flush after user stops typing
   */
  const debounceOperation = useCallback((
    itemId: string,
    field: string,
    value: any
  ) => {
    const cellKey = `${itemId}-${field}`;
    
    // Clear existing timeout for this cell
    const existing = pendingOpsRef.current.get(cellKey);
    if (existing) {
      clearTimeout(existing.timeoutId);
    }

    // Schedule new flush
    const timeoutId = setTimeout(() => {
      onFlush(itemId, field, value);
      pendingOpsRef.current.delete(cellKey);
    }, debounceMs);

    // Store pending operation
    pendingOpsRef.current.set(cellKey, {
      itemId,
      field,
      value,
      timeoutId
    });
  }, [onFlush, debounceMs]);

  /**
   * Immediately flush a specific cell's pending operation
   */
  const flushCell = useCallback((itemId: string, field: string) => {
    const cellKey = `${itemId}-${field}`;
    const pending = pendingOpsRef.current.get(cellKey);
    
    if (pending) {
      clearTimeout(pending.timeoutId);
      onFlush(pending.itemId, pending.field, pending.value);
      pendingOpsRef.current.delete(cellKey);
    }
  }, [onFlush]);

  /**
   * Flush all pending operations immediately
   */
  const flushAll = useCallback(() => {
    pendingOpsRef.current.forEach((op) => {
      clearTimeout(op.timeoutId);
      onFlush(op.itemId, op.field, op.value);
    });
    pendingOpsRef.current.clear();
  }, [onFlush]);

  /**
   * Check if a cell has a pending operation
   */
  const hasPending = useCallback((itemId: string, field: string) => {
    const cellKey = `${itemId}-${field}`;
    return pendingOpsRef.current.has(cellKey);
  }, []);

  return {
    debounceOperation,
    flushCell,
    flushAll,
    hasPending
  };
};

import { useCallback, useRef } from 'react';
import { logger } from '@/utils/logger';

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
 * Simplified text debouncing hook
 * Debounces text field saves to reduce network traffic
 * No complex batching - just simple timer-based debouncing
 */
export const useTextDebounce = ({ 
  onFlush, 
  debounceMs = 800 // Increased to 800ms for better batching
}: UseTextDebounceOptions) => {
  // Map of pending operations by cell (itemId + field)
  const pendingOpsRef = useRef<Map<string, DebouncedOperation>>(new Map());

  /**
   * Debounce a text operation - will flush after user stops typing
   * Simple timer-based debouncing with no complex batching
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
      logger.debug('🔄 TEXT DEBOUNCE: Cancelled previous save', { itemId, field });
    }

    // Schedule new flush after user stops typing
    const timeoutId = setTimeout(() => {
      logger.debug('💾 TEXT DEBOUNCE: Flushing to database', { itemId, field, value: String(value).substring(0, 30) });
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

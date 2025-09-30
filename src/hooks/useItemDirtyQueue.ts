/**
 * Item-Level Dirty Queue - DISABLED
 * Operations handle sync - no need for queueing
 */

import { useCallback, useRef } from 'react';

interface QueuedUpdate {
  payload: any;
  timestamp: string;
  docVersion: number;
  queuedAt: number;
}

export const useItemDirtyQueue = () => {
  const queueRef = useRef<QueuedUpdate[]>([]);
  const processingRef = useRef(false);

  // No-op - operations handle sync
  const queueIfDirty = useCallback((payload: any, timestamp: string, docVersion: number): boolean => {
    return false; // Never queue - let operations handle it
  }, []);

  // No-op
  const processQueue = useCallback((onApplyUpdate: (update: QueuedUpdate) => void) => {
    // Operations handle sync
  }, []);

  // No-op
  const cleanupQueue = useCallback(() => {
    // Operations handle sync
  }, []);

  // Empty status
  const getQueueStatus = useCallback(() => {
    return {
      queueSize: 0,
      isProcessing: false,
      hasActiveItems: false
    };
  }, []);

  return {
    queueIfDirty,
    processQueue,
    cleanupQueue,
    getQueueStatus
  };
};
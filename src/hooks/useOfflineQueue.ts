import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownState } from './useRundownState';
import { useNetworkStatus } from './useNetworkStatus';

interface QueuedOperation {
  id: string;
  type: 'save' | 'delete' | 'create';
  timestamp: number;
  retryCount: number;
  data: any;
  rundownId: string | null;
  clientTimestamp: string;
}

interface OfflineChange {
  fieldKey: string;
  value: any;
  timestamp: number;
  applied: boolean;
}

const STORAGE_KEY = 'rundown_offline_queue';
const CHANGES_KEY = 'rundown_offline_changes';
const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000]; // Progressive delays

export const useOfflineQueue = (rundownId: string | null) => {
  const [queue, setQueue] = useState<QueuedOperation[]>([]);
  const [offlineChanges, setOfflineChanges] = useState<Map<string, OfflineChange>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const { isConnected, connectionType } = useNetworkStatus();
  const processingRef = useRef(false);

  // Load persisted queue and changes on mount
  useEffect(() => {
    try {
      const savedQueue = localStorage.getItem(STORAGE_KEY);
      if (savedQueue) {
        const parsed = JSON.parse(savedQueue);
        setQueue(parsed);
      }

      const savedChanges = localStorage.getItem(`${CHANGES_KEY}_${rundownId}`);
      if (savedChanges) {
        const parsed = JSON.parse(savedChanges);
        const changesMap = new Map<string, OfflineChange>();
        Object.entries(parsed).forEach(([key, value]) => {
          if (value && typeof value === 'object' && 'fieldKey' in value) {
            changesMap.set(key, value as OfflineChange);
          }
        });
        setOfflineChanges(changesMap);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  }, [rundownId]);

  // Persist queue and changes to localStorage
  const persistQueue = useCallback((newQueue: QueuedOperation[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newQueue));
    } catch (error) {
      console.error('Failed to persist queue:', error);
    }
  }, []);

  const persistChanges = useCallback((changes: Map<string, OfflineChange>) => {
    try {
      const changesObj = Object.fromEntries(changes);
      localStorage.setItem(`${CHANGES_KEY}_${rundownId}`, JSON.stringify(changesObj));
    } catch (error) {
      console.error('Failed to persist offline changes:', error);
    }
  }, [rundownId]);

  // Add operation to queue
  const queueOperation = useCallback((
    type: QueuedOperation['type'],
    data: any,
    targetRundownId: string | null = rundownId
  ) => {
    const operation: QueuedOperation = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: Date.now(),
      retryCount: 0,
      data,
      rundownId: targetRundownId,
      clientTimestamp: new Date().toISOString()
    };

    setQueue(prev => {
      const newQueue = [...prev, operation];
      persistQueue(newQueue);
      return newQueue;
    });

    console.log('📦 Queued offline operation:', operation.type, operation.id);
    return operation.id;
  }, [rundownId, persistQueue]);

  // Record offline field change
  const recordOfflineChange = useCallback((fieldKey: string, value: any) => {
    if (isConnected) return; // Only record when offline

    const change: OfflineChange = {
      fieldKey,
      value,
      timestamp: Date.now(),
      applied: false
    };

    setOfflineChanges(prev => {
      const newChanges = new Map(prev);
      newChanges.set(fieldKey, change);
      persistChanges(newChanges);
      return newChanges;
    });

    console.log('💾 Recorded offline change:', fieldKey, value);
  }, [isConnected, persistChanges]);

  // Process a single operation
  const processOperation = useCallback(async (operation: QueuedOperation): Promise<boolean> => {
    try {
      console.log('🔄 Processing queued operation:', operation.type, operation.id);

      switch (operation.type) {
        case 'save':
          if (!operation.rundownId) {
            // Create new rundown
            const { data: teamData } = await supabase
              .from('team_members')
              .select('team_id')
              .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
              .limit(1)
              .single();

            if (!teamData) throw new Error('No team found');

            const { error } = await supabase
              .from('rundowns')
              .insert({
                ...operation.data,
                team_id: teamData.team_id,
                user_id: (await supabase.auth.getUser()).data.user?.id
              });

            if (error) throw error;
          } else {
            // Update existing rundown
            const { error } = await supabase
              .from('rundowns')
              .update({
                ...operation.data,
                updated_at: new Date().toISOString()
              })
              .eq('id', operation.rundownId);

            if (error) throw error;
          }
          break;

        case 'delete':
          const { error: deleteError } = await supabase
            .from('rundowns')
            .delete()
            .eq('id', operation.rundownId);

          if (deleteError) throw deleteError;
          break;

        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }

      console.log('✅ Operation completed:', operation.id);
      return true;
    } catch (error) {
      console.error('❌ Operation failed:', operation.id, error);
      return false;
    }
  }, []);

  // Process entire queue
  const processQueue = useCallback(async () => {
    if (processingRef.current || !isConnected || queue.length === 0) {
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);

    console.log('🚀 Processing offline queue:', queue.length, 'operations');

    const newQueue: QueuedOperation[] = [];

    for (const operation of queue) {
      const success = await processOperation(operation);

      if (success) {
        // Operation succeeded - remove from queue
        continue;
      } else {
        // Operation failed - check retry count
        if (operation.retryCount < MAX_RETRIES) {
          const updatedOperation = {
            ...operation,
            retryCount: operation.retryCount + 1
          };

          // Schedule retry with exponential backoff
          const delay = RETRY_DELAYS[Math.min(operation.retryCount, RETRY_DELAYS.length - 1)];
          setTimeout(() => {
            setQueue(prev => {
              const newQueue = [updatedOperation, ...prev.filter(op => op.id !== operation.id)];
              persistQueue(newQueue);
              return newQueue;
            });
          }, delay);

          console.log(`⏰ Retrying operation ${operation.id} in ${delay}ms (attempt ${updatedOperation.retryCount})`);
        } else {
          // Max retries exceeded - drop operation
          console.error('💀 Operation exceeded max retries:', operation.id);
        }
      }
    }

    setQueue(newQueue);
    persistQueue(newQueue);
    setIsProcessing(false);
    processingRef.current = false;

    console.log('🏁 Queue processing complete');
  }, [isConnected, queue, processOperation, persistQueue]);

  // Auto-process queue when connection is restored
  useEffect(() => {
    if (isConnected && queue.length > 0) {
      console.log('🔌 Connection restored - processing queue');
      processQueue();
    }
  }, [isConnected, processQueue, queue.length]);

  // Get offline changes for current rundown
  const getOfflineChanges = useCallback(() => {
    const changes: Record<string, any> = {};
    offlineChanges.forEach((change, fieldKey) => {
      if (!change.applied) {
        changes[fieldKey] = change.value;
      }
    });
    return changes;
  }, [offlineChanges]);

  // Mark offline changes as applied
  const markChangesApplied = useCallback((fieldKeys: string[]) => {
    setOfflineChanges(prev => {
      const newChanges = new Map(prev);
      fieldKeys.forEach(fieldKey => {
        const change = newChanges.get(fieldKey);
        if (change) {
          newChanges.set(fieldKey, { ...change, applied: true });
        }
      });
      persistChanges(newChanges);
      return newChanges;
    });
  }, [persistChanges]);

  // Clear applied changes
  const clearAppliedChanges = useCallback(() => {
    setOfflineChanges(prev => {
      const newChanges = new Map();
      prev.forEach((change, fieldKey) => {
        if (!change.applied) {
          newChanges.set(fieldKey, change);
        }
      });
      persistChanges(newChanges);
      return newChanges;
    });
  }, [persistChanges]);

  // Get queued operations (useful for debugging/status)
  const getQueuedOperations = useCallback(() => {
    return [...queue];
  }, [queue]);

  // Clear entire queue (useful for cleanup after session expiry)
  const clearQueue = useCallback(() => {
    setQueue([]);
    persistQueue([]);
    console.log('🗑️ Cleared offline queue');
  }, [persistQueue]);

  return {
    // Queue management
    queueOperation,
    processQueue,
    isProcessing,
    queueLength: queue.length,
    getQueuedOperations,
    clearQueue,
    
    // Offline changes
    recordOfflineChange,
    getOfflineChanges,
    markChangesApplied,
    clearAppliedChanges,
    hasOfflineChanges: offlineChanges.size > 0,
    
    // Status
    isConnected,
    connectionType
  };
};
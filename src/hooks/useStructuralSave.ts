import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownItem } from '@/types/rundown';
import { cellBroadcast } from '@/utils/cellBroadcast';
import { ownUpdateTracker } from '@/services/OwnUpdateTracker';
import { saveWithTimeout } from '@/utils/saveTimeout';

interface StructuralOperationData {
  items?: RundownItem[];
  order?: string[];
  deletedIds?: string[];
  newItems?: RundownItem[];
  insertIndex?: number;
  sequenceNumber?: number;
  contentSnapshot?: RundownItem[]; // Snapshot of current content to prevent race conditions
  lockedRowNumbers?: { [itemId: string]: string }; // For lock operations
  numberingLocked?: boolean; // For lock operations
}

interface StructuralOperation {
  rundownId: string;
  operationType: 'add_row' | 'delete_row' | 'move_rows' | 'copy_rows' | 'reorder' | 'add_header' | 'toggle_lock';
  operationData: StructuralOperationData;
  userId: string;
  timestamp: string;
}

export const useStructuralSave = (
  rundownId: string | null,
  onSaveComplete?: () => void,
  onSaveStart?: () => void,
  onUnsavedChanges?: () => void,
  currentUserId?: string
) => {
  const pendingOperationsRef = useRef<StructuralOperation[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const saveInProgressRef = useRef<boolean>(false);

  // Debounced save for batching operations
  const saveStructuralOperations = useCallback(async (): Promise<void> => {
    if (!rundownId || pendingOperationsRef.current.length === 0) {
      return;
    }

    // Prevent concurrent saves
    if (saveInProgressRef.current) {
      console.log('⏳ Save in progress, new operations will be batched next');
      return;
    }

    saveInProgressRef.current = true;
    const operations = [...pendingOperationsRef.current];
    pendingOperationsRef.current = [];
    
    onSaveStart?.();

    try {
      // Validate auth session before processing operations
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('❌ Structural save: Auth session invalid - re-queuing operations');
        // Re-queue operations instead of losing them
        pendingOperationsRef.current.unshift(...operations);
        throw new Error('Authentication required');
      }
      
      // Refresh token if expiring soon (< 5 minutes)
      const expiresAt = session.expires_at || 0;
      const now = Math.floor(Date.now() / 1000);
      
      if (expiresAt - now < 300) {
        console.log('🔄 Structural save: Token expiring soon - refreshing');
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error('❌ Token refresh failed:', refreshError);
          throw new Error('Token refresh failed');
        }
      }

      // PHASE 1: BROADCAST ALL OPERATIONS SEQUENTIALLY (maintains order)
      // This ensures other users see changes instantly, in the correct order
      for (const operation of operations) {
        if (rundownId && currentUserId) {
          // Import mapping functions dynamically to avoid circular dependencies
          const { mapOperationToBroadcastField, mapOperationDataToPayload } = await import('@/utils/structuralOperationMapping');
          
          const broadcastField = mapOperationToBroadcastField(operation.operationType);
          const payload = mapOperationDataToPayload(operation.operationType, operation.operationData);
          
          console.log('📡 Broadcasting structural operation (BEFORE save):', {
            operationType: operation.operationType,
            broadcastField,
            payload
          });
          
          cellBroadcast.broadcastCellUpdate(
            rundownId,
            undefined,
            broadcastField,
            payload,
            currentUserId
          );
        }
      }
      
      // PHASE 2: SAVE ALL OPERATIONS TO DATABASE IN PARALLEL
      // This dramatically improves throughput (20 ops: 6s → 300-500ms)
      console.log(`💾 Saving ${operations.length} structural operations in parallel...`);
      const saveStartTime = performance.now();
      
      const savePromises = operations.map(operation =>
        saveWithTimeout(
          () => supabase.functions.invoke('structural-operation-save', {
            body: operation
          }),
          `structural-save-${operation.operationType}`,
          20000
        )
        .then(result => ({ operation, success: true, result }))
        .catch(error => ({ operation, success: false, error }))
      );
      
      const saveResults = await Promise.allSettled(savePromises);
      const saveEndTime = performance.now();
      console.log(`✅ Parallel saves completed in ${Math.round(saveEndTime - saveStartTime)}ms`);
      
      // PHASE 3: HANDLE RESULTS
      const failedOperations: StructuralOperation[] = [];
      const successfulResults: Array<{ operation: StructuralOperation; result: any }> = [];
      
      for (const settledResult of saveResults) {
        if (settledResult.status === 'fulfilled') {
          const saveResult = settledResult.value;
          
          if (saveResult.success && 'result' in saveResult && saveResult.result?.data?.success) {
            successfulResults.push({ operation: saveResult.operation, result: saveResult.result.data });
          } else {
            const errorMsg = 'error' in saveResult ? saveResult.error : saveResult.result?.error;
            console.error('Structural save failed for operation:', saveResult.operation.operationType, errorMsg);
            failedOperations.push(saveResult.operation);
          }
        } else {
          // Promise itself was rejected (shouldn't happen with our .catch, but handle anyway)
          console.error('Save promise rejected:', settledResult.reason);
        }
      }
      
      // Track successful operations to prevent conflict detection
      for (const { result } of successfulResults) {
        if (result.updatedAt) {
          const context = rundownId ? `realtime-${rundownId}` : undefined;
          ownUpdateTracker.track(result.updatedAt, context);
        }
      }
      
      console.log(`✅ ${successfulResults.length}/${operations.length} operations saved successfully`);
      
      // Re-queue only failed operations for retry
      if (failedOperations.length > 0) {
        console.warn(`⚠️ Re-queuing ${failedOperations.length} failed operations for retry`);
        pendingOperationsRef.current.unshift(...failedOperations);
        throw new Error(`${failedOperations.length} operations failed - will retry`);
      }
      
      onSaveComplete?.();
    } catch (error) {
      console.error('Structural save batch error:', error);
      // Re-queue failed operations for retry
      pendingOperationsRef.current.unshift(...operations);
      throw error;
    } finally {
      saveInProgressRef.current = false;
      
      // If more operations arrived during save, schedule another batch
      if (pendingOperationsRef.current.length > 0) {
        console.log(`🔄 ${pendingOperationsRef.current.length} new operations queued, scheduling next batch`);
        saveTimeoutRef.current = setTimeout(() => {
          saveStructuralOperations().catch(console.error);
        }, 100);
      }
    }
  }, [rundownId, onSaveStart, onSaveComplete, currentUserId]);

  // Queue a structural operation with coordination
  const queueStructuralOperation = useCallback(
    (
      operationType: StructuralOperation['operationType'],
      operationData: StructuralOperationData,
      userId: string,
      sequenceNumber?: number
    ) => {
      if (!rundownId) return;

      const operation: StructuralOperation = {
        rundownId,
        operationType,
        operationData: {
          ...operationData,
          sequenceNumber
        },
        userId,
        timestamp: new Date().toISOString()
      };

      pendingOperationsRef.current.push(operation);
      onUnsavedChanges?.();

      // Debounce save operations - but ONLY if no save is running
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Only schedule a new save if one isn't already in progress
      if (!saveInProgressRef.current) {
        saveTimeoutRef.current = setTimeout(() => {
          saveStructuralOperations().catch(error => {
            console.error('Structural save error:', error);
          });
        }, 100);
      }
      // If save is running, operations will queue and be handled by the finally block
    },
    [rundownId, saveStructuralOperations, onUnsavedChanges]
  );

  // Flush all pending operations immediately
  const flushPendingOperations = useCallback(async (): Promise<void> => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    return await saveStructuralOperations();
  }, [saveStructuralOperations]);

  // Check if there are pending operations
  const hasPendingOperations = useCallback((): boolean => {
    return pendingOperationsRef.current.length > 0;
  }, []);

  // Add beforeunload handler to prevent data loss on tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasPendingOperations()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved structural changes. Are you sure you want to leave?';
        
        // Best-effort synchronous flush
        flushPendingOperations().catch(console.error);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasPendingOperations, flushPendingOperations]);

  // Add visibilitychange handler to prevent data loss from background tab throttling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && hasPendingOperations()) {
        console.log('🌙 Tab hidden - flushing structural operations immediately');
        flushPendingOperations().catch(console.error);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [hasPendingOperations, flushPendingOperations]);

  return {
    queueStructuralOperation,
    flushPendingOperations,
    hasPendingOperations
  };
};
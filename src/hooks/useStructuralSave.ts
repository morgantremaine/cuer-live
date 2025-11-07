import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownItem } from '@/types/rundown';
import { cellBroadcast } from '@/utils/cellBroadcast';
import { ownUpdateTracker } from '@/services/OwnUpdateTracker';
import { saveWithTimeout } from '@/utils/saveTimeout';
import { getTabId } from '@/utils/tabUtils';

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

  // Debounced save for batching operations
  const saveStructuralOperations = useCallback(async (): Promise<void> => {
    if (!rundownId || pendingOperationsRef.current.length === 0) {
      return;
    }

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

      for (const operation of operations) {
        // PHASE 1: BROADCAST FIRST (Dual Broadcasting Pattern - immediate broadcast)
        // This ensures other users see changes instantly, before database persistence
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
            currentUserId,
            getTabId()
          );
        }
        
        // PHASE 2: DATABASE PERSISTENCE (parallel/after broadcast)
        const { data, error } = await saveWithTimeout(
          () => supabase.functions.invoke('structural-operation-save', {
            body: operation
          }),
          `structural-save-${operation.operationType}`,
          20000
        );

        if (error) {
          console.error('Structural save error:', error);
          throw error;
        }

        if (data?.success) {
          // Track our own update to prevent conflict detection via centralized tracker
          if (data.updatedAt) {
            const context = rundownId ? `realtime-${rundownId}` : undefined;
            ownUpdateTracker.track(data.updatedAt, context);
          }
          
          console.log('✅ Structural operation saved to database:', operation.operationType);
        }
      }
      
      onSaveComplete?.();
    } catch (error) {
      console.error('Structural save batch error:', error);
      // Re-queue failed operations for retry
      pendingOperationsRef.current.unshift(...operations);
      throw error;
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

      // Debounce save operations
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveStructuralOperations().catch(error => {
          console.error('Structural save error:', error);
        });
      }, 100);
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

  // REMOVED: Save-on-unmount/beforeunload handlers
  // Prevents overwriting newer data with stale structural operations
  // Users should rely on regular auto-save during active editing

  return {
    queueStructuralOperation,
    flushPendingOperations,
    hasPendingOperations
  };
};
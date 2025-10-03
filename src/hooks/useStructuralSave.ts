import { useCallback, useRef } from 'react';
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
}

interface StructuralOperation {
  rundownId: string;
  operationType: 'add_row' | 'delete_row' | 'move_rows' | 'copy_rows' | 'reorder' | 'add_header';
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
            currentUserId
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

  return {
    queueStructuralOperation,
    flushPendingOperations,
    hasPendingOperations
  };
};
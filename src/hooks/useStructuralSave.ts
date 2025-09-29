import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownItem } from '@/types/rundown';
import { debugLogger } from '@/utils/debugLogger';

interface StructuralOperationData {
  items?: RundownItem[];
  order?: string[];
  deletedIds?: string[];
  newItems?: RundownItem[];
  insertIndex?: number;
  sequenceNumber?: number;
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
  trackOwnUpdate: (timestamp: string) => void
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

    console.log('🏗️ STRUCTURAL SAVE: Processing', operations.length, 'operations');

    try {
      // For now, process operations sequentially to maintain order
      // TODO: Optimize with batch processing if needed
      for (const operation of operations) {
        const { data, error } = await supabase.functions.invoke('structural-operation-save', {
          body: operation
        });

        if (error) {
          console.error('🚨 STRUCTURAL SAVE ERROR:', error);
          debugLogger.autosave(`Structural save failed: ${error.message}`);
          throw error;
        }

        if (data?.success) {
          console.log('✅ STRUCTURAL SAVE SUCCESS:', {
            operation: operation.operationType,
            docVersion: data.docVersion,
            itemCount: data.itemCount
          });

          // Track our own update to prevent conflict detection
          if (data.updatedAt) {
            trackOwnUpdate(data.updatedAt);
          }

          debugLogger.autosave(`Structural save success: ${operation.operationType}`);
        }
      }
    } catch (error) {
      console.error('🚨 STRUCTURAL SAVE BATCH ERROR:', error);
      // Re-queue failed operations for retry
      pendingOperationsRef.current.unshift(...operations);
      throw error;
    }
  }, [rundownId, trackOwnUpdate]);

  // Queue a structural operation with coordination
  const queueStructuralOperation = useCallback(
    (
      operationType: StructuralOperation['operationType'],
      operationData: StructuralOperationData,
      userId: string,
      sequenceNumber?: number
    ) => {
      if (!rundownId) {
        console.warn('🚨 Cannot queue structural operation: no rundownId');
        return;
      }

      const operation: StructuralOperation = {
        rundownId,
        operationType,
        operationData: {
          ...operationData,
          sequenceNumber // Add sequence number for ordering
        },
        userId,
        timestamp: new Date().toISOString()
      };

      console.log('🏗️ STRUCTURAL SAVE: Queuing operation', {
        type: operationType,
        rundownId,
        userId,
        sequenceNumber,
        dataKeys: Object.keys(operationData)
      });

      pendingOperationsRef.current.push(operation);

      // Debounce save operations with shorter delay for better coordination
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveStructuralOperations().catch(error => {
          console.error('🚨 STRUCTURAL SAVE ERROR:', error);
        });
      }, 100); // Reduced to 100ms for better responsiveness during coordination
    },
    [rundownId, saveStructuralOperations]
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
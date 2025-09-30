import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownItem } from '@/types/rundown';
import { debugLogger } from '@/utils/debugLogger';
import { cellBroadcast } from '@/utils/cellBroadcast';
import { ownUpdateTracker } from '@/services/OwnUpdateTracker';
import { useOperationCoordinator } from './useOperationCoordinator';

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
  onSaveComplete?: () => void,
  onSaveStart?: () => void,
  onUnsavedChanges?: () => void,
  currentUserId?: string
) => {
  const pendingOperationsRef = useRef<StructuralOperation[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Operation coordinator for broadcasting intent
  const operationCoordinator = useOperationCoordinator();

  // Debounced save for batching operations
  const saveStructuralOperations = useCallback(async (): Promise<void> => {
    if (!rundownId || pendingOperationsRef.current.length === 0) {
      return;
    }

    const operations = [...pendingOperationsRef.current];
    pendingOperationsRef.current = [];

    console.log('🏗️ STRUCTURAL SAVE: Processing', operations.length, 'operations');
    
    // Notify UI that save is starting
    console.log('🏗️ STRUCTURAL SAVE: Triggering onSaveStart callback');
    if (onSaveStart) {
      onSaveStart();
    }

    try {
      // For now, process operations sequentially to maintain order
      // TODO: Optimize with batch processing if needed
      for (const operation of operations) {
        console.log('🏗️ STRUCTURAL SAVE: Sending to edge function', {
          operation: operation.operationType,
          sentItemsCount: operation.operationData.items?.length,
          sentNewItemsCount: operation.operationData.newItems?.length,
          sentDeletedIdsCount: operation.operationData.deletedIds?.length,
          hasOrder: !!operation.operationData.order
        });

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

          // Track our own update to prevent conflict detection via centralized tracker
          if (data.updatedAt) {
            const context = rundownId ? `realtime-${rundownId}` : undefined;
            ownUpdateTracker.track(data.updatedAt, context);
            console.log('🏷️ Tracked own update via centralized tracker:', data.updatedAt);
          }

          // Broadcast structural change to other users for real-time updates
          if (rundownId && currentUserId) {
            const broadcastData = {
              operationType: operation.operationType,
              operationData: operation.operationData,
              docVersion: data.docVersion,
              timestamp: operation.timestamp
            };
            
            console.log('📡 Broadcasting structural operation:', {
              operation: operation.operationType,
              rundownId,
              userId: currentUserId
            });
            
            cellBroadcast.broadcastCellUpdate(
              rundownId,
              undefined,
              `structural:${operation.operationType}`,
              broadcastData,
              currentUserId
            );
          }

          debugLogger.autosave(`Structural save success: ${operation.operationType}`);
        }
      }
      
      // Notify UI that save completed successfully
      console.log('🏗️ STRUCTURAL SAVE: Triggering onSaveComplete callback');
      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (error) {
      console.error('🚨 STRUCTURAL SAVE BATCH ERROR:', error);
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

      // Broadcast structural operation intent
      const affectedItemIds = [
        ...(operationData.items?.map(item => item.id) || []),
        ...(operationData.newItems?.map(item => item.id) || []),
        ...(operationData.deletedIds || [])
      ];
      
      operationCoordinator.broadcastIntent(
        `structural-${Date.now()}`,
        operationType,
        {
          affectedItemIds,
          operationType: 'structural'
        }
      );

      console.log('🏗️ STRUCTURAL SAVE: Queuing operation', {
        type: operationType,
        rundownId,
        userId,
        sequenceNumber,
        affectedItemIds,
        dataKeys: Object.keys(operationData)
      });

      pendingOperationsRef.current.push(operation);
      
      // Notify UI of unsaved changes
      console.log('🏗️ STRUCTURAL SAVE: Triggering onUnsavedChanges callback');
      if (onUnsavedChanges) {
        onUnsavedChanges();
      }

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
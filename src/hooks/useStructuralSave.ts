import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownItem } from '@/types/rundown';
import { debugLogger } from '@/utils/debugLogger';
import { ownUpdateTracker } from '@/services/OwnUpdateTracker';
import { useBroadcast, UnifiedOperationPayload, OperationType } from '@/contexts/BroadcastContext';
import { v4 as uuidv4 } from 'uuid';

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
  clientId: string; // Track client ID for broadcast
}

export const useStructuralSave = (
  rundownId: string | null,
  onSaveComplete?: () => void,
  onSaveStart?: () => void,
  onUnsavedChanges?: () => void,
  currentUserId?: string
) => {
  const { broadcast, instanceId } = useBroadcast();
  const pendingOperationsRef = useRef<StructuralOperation[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const isUnloadingRef = useRef(false);
  const lastSaveTimestampRef = useRef<number>(0);
  const clientIdRef = useRef(uuidv4());

  console.log('🏗️ STRUCTURAL SAVE HOOK INITIALIZED:', {
    rundownId,
    currentUserId,
    clientId: clientIdRef.current,
    broadcastInstanceId: instanceId
  });

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

          // CRITICAL: Use operation.userId (from when operation was queued) for broadcast
          // This ensures we have the userId even if currentUserId prop changes
          const broadcastUserId = operation.userId;
          const broadcastClientId = operation.clientId;

          console.log('🔍 STRUCTURAL: Checking broadcast prerequisites', {
            hasRundownId: !!rundownId,
            hasBroadcastUserId: !!broadcastUserId,
            broadcastUserId,
            broadcastClientId,
            willBroadcast: !!(rundownId && broadcastUserId)
          });

          // Broadcast via unified system for real-time updates
          if (rundownId && broadcastUserId) {
            const operationTypeMap: Record<string, OperationType> = {
              'add_row': 'ROW_INSERT',
              'delete_row': 'ROW_DELETE',
              'move_rows': 'ROW_MOVE',
              'copy_rows': 'ROW_COPY',
              'reorder': 'ROW_MOVE',
              'add_header': 'ROW_INSERT'
            };

            const unifiedPayload: UnifiedOperationPayload = {
              type: operationTypeMap[operation.operationType] || 'ROW_INSERT',
              rundownId,
              clientId: broadcastClientId,
              userId: broadcastUserId,
              timestamp: Date.now(),
              sequenceNumber: data.docVersion,
              data: {
                operationType: operation.operationType,
                operationData: operation.operationData,
                docVersion: data.docVersion
              }
            };
            
            console.log('📡 STRUCTURAL: Broadcasting via unified system', {
              type: unifiedPayload.type,
              operation: operation.operationType,
              clientId: broadcastClientId,
              userId: broadcastUserId
            });
            
            try {
              await broadcast(unifiedPayload);
              console.log('✅ STRUCTURAL: Broadcast sent successfully');
            } catch (broadcastError) {
              console.error('❌ STRUCTURAL: Broadcast failed:', broadcastError);
            }
          } else {
            console.error('❌ STRUCTURAL: Cannot broadcast - missing prerequisites', {
              hasRundownId: !!rundownId,
              hasBroadcastUserId: !!broadcastUserId
            });
          }

          debugLogger.autosave(`Structural save success: ${operation.operationType}`);
        } else {
          console.error('❌ STRUCTURAL SAVE: Edge function did not return success', {
            data,
            operation: operation.operationType
          });
        }
      }
      
      // Track last successful save time to prevent stale flushes
      lastSaveTimestampRef.current = Date.now();
      
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
        timestamp: new Date().toISOString(),
        clientId: clientIdRef.current // Capture client ID at queue time
      };

      console.log('🏗️ STRUCTURAL SAVE: Queuing operation', {
        type: operationType,
        rundownId,
        userId,
        sequenceNumber,
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

  // Flush pending operations before page unload to prevent data loss
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingOperationsRef.current.length > 0) {
        // Check if there was a recent save - if so, the debounce timer should handle it
        const timeSinceLastSave = Date.now() - lastSaveTimestampRef.current;
        if (timeSinceLastSave < 500) {
          console.log('⏭️ Skipping beforeunload flush - recent save already completed:', timeSinceLastSave, 'ms ago');
          return;
        }
        
        console.log('🚨 Page unloading with pending operations, flushing...');
        isUnloadingRef.current = true;
        
        // Cancel any pending timeout
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        
        // Flush immediately (synchronous)
        saveStructuralOperations();
        
        // Show browser warning
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Cleanup on unmount - only flush if not recently saved
      if (pendingOperationsRef.current.length > 0 && !isUnloadingRef.current) {
        const timeSinceLastSave = Date.now() - lastSaveTimestampRef.current;
        if (timeSinceLastSave < 500) {
          console.log('⏭️ Skipping unmount flush - recent save already completed:', timeSinceLastSave, 'ms ago');
          return;
        }
        console.log('🧹 Component unmounting with pending operations, flushing...');
        saveStructuralOperations();
      }
    };
  }, [saveStructuralOperations]);

  return {
    queueStructuralOperation,
    flushPendingOperations,
    hasPendingOperations
  };
};
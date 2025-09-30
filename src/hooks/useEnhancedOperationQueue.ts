/**
 * Enhanced Operation Queue with Multi-User Coordination
 * Prevents conflicts when multiple users are editing simultaneously
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { debugLogger } from '@/utils/debugLogger';
import { multiUserConflictResolver } from '@/utils/multiUserConflictResolver';

interface Operation {
  id: string;
  rundownId: string;
  operationType: 'CELL_EDIT' | 'ROW_INSERT' | 'ROW_DELETE' | 'ROW_MOVE' | 'GLOBAL_EDIT' | 'ROW_COPY';
  operationData: any;
  userId: string;
  clientId: string;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount?: number;
  conflictResolved?: boolean;
}

interface UseEnhancedOperationQueueOptions {
  rundownId: string;
  userId: string;
  clientId: string;
  onOperationApplied?: (operation: Operation) => void;
  onOperationFailed?: (operation: Operation, error: any) => void;
}

export const useEnhancedOperationQueue = ({
  rundownId,
  userId,
  clientId,
  onOperationApplied,
  onOperationFailed
}: UseEnhancedOperationQueueOptions) => {
  const queueRef = useRef<Operation[]>([]);
  const processingRef = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Generate unique operation ID
  const generateOperationId = useCallback(() => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${clientId}_${timestamp}_${random}`;
  }, [clientId]);

  // Enhanced queue operation with conflict pre-check
  const queueOperation = useCallback((
    operationType: Operation['operationType'],
    operationData: any
  ) => {
    // Pre-check for potential conflicts
    if (operationType === 'CELL_EDIT' && operationData.itemId && operationData.field) {
      const conflictResult = multiUserConflictResolver.resolveConflict({
        incomingUpdate: {
          itemId: operationData.itemId,
          field: operationData.field,
          value: operationData.newValue,
          timestamp: Date.now(),
          userId,
          clientId
        },
        currentUserId: userId,
        currentClientId: clientId
      });

      if (!conflictResult.shouldApply && conflictResult.action === 'reject') {
        console.log('🛡️ OPERATION: Pre-rejected due to conflict:', conflictResult.reason);
        return null; // Don't queue conflicted operations
      }
    }

    const operation: Operation = {
      id: generateOperationId(),
      rundownId,
      operationType,
      operationData,
      userId,
      clientId,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      conflictResolved: true
    };

    console.log('🔄 ENHANCED QUEUING OPERATION:', {
      id: operation.id,
      type: operationType,
      data: operationData
    });

    // Create operation fingerprint for tracking
    import('@/utils/operationFingerprint').then(({ operationFingerprinter }) => {
      try {
        if (operationType === 'CELL_EDIT' && operationData.itemId && operationData.field) {
          operationFingerprinter.createFingerprint(
            'cell_edit',
            operationData.itemId,
            operationData.newValue,
            operationData.field,
            clientId
          );
        }
      } catch (error) {
        console.warn('⚠️ Failed to create operation fingerprint:', error);
      }
    });

    queueRef.current.push(operation);
    
    // Process queue immediately
    processQueue();

    return operation.id;
  }, [rundownId, userId, clientId, generateOperationId]);

  // Enhanced queue processing with conflict resolution
  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) {
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);
    setSaveError(null);

    try {
      const MAX_RETRIES = 3;
      const processedOperations: string[] = [];

      while (queueRef.current.length > 0) {
        const operation = queueRef.current[0];

        // Skip operations that have exceeded retry limit
        if ((operation.retryCount || 0) >= MAX_RETRIES) {
          console.error('❌ OPERATION: Exceeded retry limit:', operation.id);
          queueRef.current.shift();
          continue;
        }

        console.log('📤 ENHANCED OPERATION: Processing operation', {
          operationId: operation.id,
          type: operation.operationType,
          status: operation.status,
          retryCount: operation.retryCount || 0
        });

        try {
          operation.status = 'processing';

          // Call edge function with conflict resolution metadata
          const { data, error } = await supabase.functions.invoke('apply-operation', {
            body: {
              operation: {
                ...operation,
                conflictMetadata: {
                  conflictResolved: operation.conflictResolved,
                  clientId: operation.clientId,
                  timestamp: operation.timestamp
                }
              }
            }
          });

          if (error) {
            throw error;
          }

          // Operation succeeded
          operation.status = 'completed';
          setLastSaved(new Date());

          console.log('✅ ENHANCED OPERATION: Completed successfully:', operation.id);

          // Notify success callback
          if (onOperationApplied) {
            onOperationApplied(operation);
          }

          // Remove completed operation
          queueRef.current.shift();
          processedOperations.push(operation.id);

        } catch (error) {
          console.error('❌ ENHANCED OPERATION: Failed:', operation.id, error);

          // Handle operation failure
          operation.retryCount = (operation.retryCount || 0) + 1;
          operation.status = 'failed';

          if ((operation.retryCount || 0) >= MAX_RETRIES) {
            // Permanent failure
            setSaveError(`Operation failed after ${MAX_RETRIES} retries: ${error}`);
            
            if (onOperationFailed) {
              onOperationFailed(operation, error);
            }

            // Remove failed operation
            queueRef.current.shift();
          } else {
            // Retry with exponential backoff
            const delay = Math.pow(2, operation.retryCount || 0) * 1000;
            console.log(`🔄 ENHANCED OPERATION: Retrying in ${delay}ms:`, operation.id);
            
            setTimeout(() => {
              processQueue();
            }, delay);
            
            break; // Exit processing loop to wait for retry
          }
        }
      }

      console.log('✅ ENHANCED OPERATION: Batch processing completed', {
        processedCount: processedOperations.length,
        remainingQueue: queueRef.current.length
      });

    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [onOperationApplied, onOperationFailed]);

  // Process conflicts when typing stops
  useEffect(() => {
    const interval = setInterval(() => {
      if (!processingRef.current) {
        multiUserConflictResolver.processQueuedConflicts((update) => {
          console.log('🔄 ENHANCED OPERATION: Processing queued conflict:', update);
          // Apply the update locally since it was resolved as safe
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Operation helper methods
  const cellEdit = useCallback((itemId: string, field: string, newValue: any) => {
    return queueOperation('CELL_EDIT', {
      itemId,
      field,
      newValue,
      oldValue: null // Will be filled by edge function
    });
  }, [queueOperation]);

  const rowInsert = useCallback((insertIndex: number, newItem: any) => {
    return queueOperation('ROW_INSERT', {
      insertIndex,
      newItem
    });
  }, [queueOperation]);

  const rowDelete = useCallback((itemId: string, itemData: any) => {
    return queueOperation('ROW_DELETE', {
      itemId,
      itemData
    });
  }, [queueOperation]);

  const rowMove = useCallback((fromIndex: number, toIndex: number, itemId: string) => {
    return queueOperation('ROW_MOVE', {
      fromIndex,
      toIndex,
      itemId
    });
  }, [queueOperation]);

  const globalEdit = useCallback((field: string, newValue: any) => {
    return queueOperation('GLOBAL_EDIT', {
      field,
      newValue,
      oldValue: null
    });
  }, [queueOperation]);

  const rowCopy = useCallback((sourceIndex: number, insertIndex: number, sourceItem: any) => {
    return queueOperation('ROW_COPY', {
      sourceIndex,
      insertIndex,
      sourceItem
    });
  }, [queueOperation]);

  // Get queue status
  const getQueueStatus = useCallback(() => {
    const pending = queueRef.current.filter(op => op.status === 'pending').length;
    const failed = queueRef.current.filter(op => op.status === 'failed').length;
    
    return {
      total: queueRef.current.length,
      pending,
      failed,
      processing: processingRef.current
    };
  }, []);

  // Clear failed operations
  const clearFailedOperations = useCallback(() => {
    queueRef.current = queueRef.current.filter(op => op.status !== 'failed');
    setSaveError(null);
    console.log('🧹 ENHANCED OPERATION: Cleared failed operations');
  }, []);

  return {
    // Operation methods
    cellEdit,
    rowInsert,
    rowDelete,
    rowMove,
    globalEdit,
    rowCopy,
    
    // Queue management
    queueOperation,
    processQueue,
    getQueueStatus,
    clearFailedOperations,
    
    // Status
    isProcessing,
    lastSaved,
    saveError,
    queueLength: queueRef.current.length
  };
};
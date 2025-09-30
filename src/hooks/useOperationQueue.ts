import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Operation {
  id: string;
  rundownId: string;
  operationType: 'CELL_EDIT' | 'ROW_INSERT' | 'ROW_DELETE' | 'ROW_MOVE' | 'ROW_COPY' | 'GLOBAL_EDIT';
  operationData: any;
  userId: string;
  clientId: string;
  timestamp: number;
  status: 'pending' | 'sent' | 'acknowledged' | 'failed';
}

interface UseOperationQueueOptions {
  rundownId: string;
  userId: string;
  clientId: string;
  onOperationApplied?: (operation: Operation) => void;
  onOperationFailed?: (operation: Operation, error: string) => void;
}

export const useOperationQueue = ({
  rundownId,
  userId,
  clientId,
  onOperationApplied,
  onOperationFailed
}: UseOperationQueueOptions) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const queueRef = useRef<Operation[]>([]);
  const processingRef = useRef(false);

  // Generate unique operation ID
  const generateOperationId = useCallback(() => {
    return `${clientId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, [clientId]);

  // Queue an operation
  const queueOperation = useCallback((
    operationType: Operation['operationType'],
    operationData: any
  ) => {
    const operation: Operation = {
      id: generateOperationId(),
      rundownId,
      operationType,
      operationData,
      userId,
      clientId,
      timestamp: Date.now(),
      status: 'pending'
    };

    console.log('🔄 QUEUING OPERATION:', {
      id: operation.id,
      type: operationType,
      data: operationData
    });

    // Create operation fingerprint for network-safe gap resolution
    import('@/utils/operationFingerprint').then(({ operationFingerprinter }) => {
      try {
        if (operationType === 'CELL_EDIT' && operationData.itemId && operationData.field) {
          operationFingerprinter.createFingerprint(
            'cell_edit',
            operationData.itemId,
            operationData.newValue,
            operationData.field,
            clientId || 'unknown'
          );
        } else if (operationType === 'GLOBAL_EDIT' && operationData.field) {
          operationFingerprinter.createFingerprint(
            'global_edit',
            operationData.field,
            operationData.newValue,
            undefined,
            clientId || 'unknown'
          );
        } else if (operationType === 'ROW_DELETE' && operationData.itemId) {
          operationFingerprinter.createFingerprint(
            'row_delete',
            operationData.itemId,
            null,
            undefined,
            clientId || 'unknown'
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

  // Process the operation queue
  const processQueue = useCallback(async () => {
    console.log('🔄 OPERATION QUEUE: processQueue called', {
      queueLength: queueRef.current.length,
      isProcessing: processingRef.current,
      timestamp: new Date().toISOString()
    });
    
    if (processingRef.current || queueRef.current.length === 0) {
      console.log('⏸️ OPERATION QUEUE: Skipping processing', {
        alreadyProcessing: processingRef.current,
        queueEmpty: queueRef.current.length === 0
      });
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);
    
    console.log('🚀 OPERATION QUEUE: Starting batch processing', {
      queueLength: queueRef.current.length,
      operations: queueRef.current.map(op => ({ 
        id: op.id.slice(-8), 
        type: op.operationType, 
        status: op.status,
        timestamp: op.timestamp 
      }))
    });

    try {
      while (queueRef.current.length > 0) {
        const operation = queueRef.current[0];
        
        console.log('📤 OPERATION QUEUE: Processing operation', {
          operationId: operation.id,
          type: operation.operationType,
          status: operation.status
        });
        
        if (operation.status === 'pending') {
          console.log('📤 SENDING OPERATION:', operation.id, {
            remainingInQueue: queueRef.current.length,
            operationType: operation.operationType
          });
          
          // Add retry mechanism with timeout
          let retryCount = 0;
          const maxRetries = 3;
          let success = false;
          
          while (retryCount < maxRetries && !success) {
            try {
              operation.status = 'sent';
              
              // Add timeout to the operation (30 seconds)
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Operation timeout after 30 seconds')), 30000)
              );
              
              const operationPromise = supabase.functions.invoke('apply-operation', {
                body: operation
              });
              
              const result = await Promise.race([operationPromise, timeoutPromise]);
              const { data, error } = result as any;

              if (error) {
                throw error;
              }

              if (!data?.success) {
                throw new Error(data?.error || 'Operation failed');
              }

              operation.status = 'acknowledged';
              console.log('✅ OPERATION ACKNOWLEDGED:', operation.id, {
                retryCount,
                sequenceNumber: data.sequenceNumber,
                docVersion: data.docVersion,
                remainingInQueue: queueRef.current.length - 1
              });
              
              // Remove from queue
              queueRef.current.shift();
              
              // Update save state on successful operation
              setLastSaved(new Date());
              setSaveError(null);
              success = true;
              
              // Notify success
              if (onOperationApplied) {
                onOperationApplied(operation);
              }

            } catch (error) {
              retryCount++;
              console.warn(`⚠️ OPERATION RETRY ${retryCount}/${maxRetries}:`, operation.id, {
                error: error instanceof Error ? error.message : error,
                operationType: operation.operationType
              });
              
              if (retryCount >= maxRetries) {
                console.error('❌ OPERATION FAILED AFTER RETRIES:', operation.id, {
                  error: error instanceof Error ? error.message : error,
                  operationType: operation.operationType,
                  finalRetryCount: retryCount
                });
                operation.status = 'failed';
                
                // Update save error state
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                setSaveError(errorMessage);
                
                // Remove failed operation from queue
                queueRef.current.shift();
                
                // Notify failure
                if (onOperationFailed) {
                  onOperationFailed(operation, errorMessage);
                }
              } else {
                // Reset status for retry
                operation.status = 'pending';
                // Add exponential backoff: 1s, 2s, 4s
                const backoffMs = Math.pow(2, retryCount) * 1000;
                console.log(`⏳ WAITING ${backoffMs}ms before retry ${retryCount + 1}`);
                await new Promise(resolve => setTimeout(resolve, backoffMs));
              }
            }
          }
        } else {
          // Remove non-pending operations
          queueRef.current.shift();
        }
      }
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [onOperationApplied, onOperationFailed]);

  // Create specific operation types
  const cellEdit = useCallback((itemId: string, field: string, newValue: any, oldValue?: any) => {
    console.log('🎯 OPERATION QUEUE: cellEdit called', {
      itemId,
      field,
      newValue,
      oldValue,
      timestamp: Date.now()
    });
    
    return queueOperation('CELL_EDIT', {
      itemId,
      field,
      newValue,
      oldValue
    });
  }, [queueOperation]);

  const rowInsert = useCallback((insertIndex: number, newItem: any) => {
    return queueOperation('ROW_INSERT', {
      insertIndex,
      newItem
    });
  }, [queueOperation]);

  const rowDelete = useCallback((itemId: string, deletedItem: any) => {
    return queueOperation('ROW_DELETE', {
      itemId,
      deletedItem
    });
  }, [queueOperation]);

  const rowMove = useCallback((fromIndex: number, toIndex: number, itemId: string) => {
    return queueOperation('ROW_MOVE', {
      fromIndex,
      toIndex,
      itemId
    });
  }, [queueOperation]);

  const rowCopy = useCallback((sourceItemId: string, newItem: any, insertIndex: number) => {
    return queueOperation('ROW_COPY', {
      sourceItemId,
      newItem,
      insertIndex
    });
  }, [queueOperation]);

  const globalEdit = useCallback((field: string, newValue: any, oldValue?: any) => {
    return queueOperation('GLOBAL_EDIT', {
      [field]: newValue,
      oldValue: { [field]: oldValue }
    });
  }, [queueOperation]);

  // Get queue status
  const getQueueStatus = useCallback(() => {
    return {
      length: queueRef.current.length,
      isProcessing,
      pendingOperations: queueRef.current.filter(op => op.status === 'pending'),
      failedOperations: queueRef.current.filter(op => op.status === 'failed')
    };
  }, [isProcessing]);

  // Clear failed operations
  const clearFailedOperations = useCallback(() => {
    queueRef.current = queueRef.current.filter(op => op.status !== 'failed');
  }, []);

    return {
    // Queue operations
    cellEdit,
    rowInsert,
    rowDelete,
    rowMove,
    rowCopy,
    globalEdit,
    
    // Queue management
    queueOperation,
    processQueue,
    getQueueStatus,
    clearFailedOperations,
    
    // Status
    isProcessing,
    queueLength: queueRef.current.length,
    
    // Save state for indicators
    lastSaved,
    saveError
  };
};
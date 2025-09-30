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
  const batchTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Batch configuration
  const BATCH_WINDOW_MS = 50; // Collect operations for 50ms before sending
  const MAX_BATCH_SIZE = 20; // Send up to 20 operations at once

  // Generate unique operation ID
  const generateOperationId = useCallback(() => {
    return `${clientId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, [clientId]);

  // Queue an operation with batching
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

    queueRef.current.push(operation);
    
    // Clear existing timeout
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
    
    // If queue is large enough, process immediately
    if (queueRef.current.length >= MAX_BATCH_SIZE) {
      console.log('📦 BATCH SIZE REACHED - processing immediately');
      processQueue();
    } else {
      // Otherwise, wait for batch window
      batchTimeoutRef.current = setTimeout(() => {
        console.log('⏱️ BATCH WINDOW ELAPSED - processing batch');
        processQueue();
      }, BATCH_WINDOW_MS);
    }

    return operation.id;
  }, [rundownId, userId, clientId, generateOperationId]);

  // Process the operation queue with batching
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
        // Get batch of pending operations (up to MAX_BATCH_SIZE)
        const batch = queueRef.current
          .filter(op => op.status === 'pending')
          .slice(0, MAX_BATCH_SIZE);
        
        if (batch.length === 0) {
          // No pending operations, remove non-pending ones
          queueRef.current = queueRef.current.filter(op => op.status === 'pending');
          break;
        }
        
        console.log('📦 PROCESSING BATCH:', {
          batchSize: batch.length,
          operationIds: batch.map(op => op.id.slice(-8)),
          remainingInQueue: queueRef.current.length
        });
        
        // Mark all as sent
        batch.forEach(op => op.status = 'sent');
        
        // Send batch in parallel
        let retryCount = 0;
        const maxRetries = 3;
        let success = false;
        
        while (retryCount < maxRetries && !success) {
          try {
            console.log('📤 SENDING BATCH:', {
              size: batch.length,
              attempt: retryCount + 1
            });
            
            // Send all operations in parallel
            const promises = batch.map(operation =>
              supabase.functions.invoke('apply-operation', {
                body: operation
              }).then(result => ({ operation, result }))
            );
            
            // Wait for all with timeout
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Batch timeout after 30 seconds')), 30000)
            );
            
            const results = await Promise.race([
              Promise.allSettled(promises),
              timeoutPromise
            ]) as PromiseSettledResult<{ operation: Operation; result: any }>[];
            
            // Process results
            const succeeded: Operation[] = [];
            const failed: { operation: Operation; error: string }[] = [];
            
            results.forEach((result, index) => {
              const operation = batch[index];
              
              if (result.status === 'fulfilled') {
                const { data, error } = result.value.result;
                
                if (error || !data?.success) {
                  const errorMsg = error?.message || data?.error || 'Operation failed';
                  failed.push({ operation, error: errorMsg });
                } else {
                  operation.status = 'acknowledged';
                  succeeded.push(operation);
                  console.log('✅ OPERATION APPLIED:', operation.id);
                  
                  // Notify success
                  if (onOperationApplied) {
                    onOperationApplied(operation);
                  }
                }
              } else {
                const errorMsg = result.reason?.message || 'Promise rejected';
                failed.push({ operation, error: errorMsg });
              }
            });
            
            console.log('📊 BATCH RESULTS:', {
              succeeded: succeeded.length,
              failed: failed.length,
              retryAttempt: retryCount + 1
            });
            
            // Remove succeeded operations from queue
            succeeded.forEach(op => {
              const index = queueRef.current.findIndex(q => q.id === op.id);
              if (index !== -1) queueRef.current.splice(index, 1);
            });
            
            // Handle failures
            if (failed.length > 0 && retryCount < maxRetries - 1) {
              // Retry failed operations
              console.warn(`⚠️ RETRYING ${failed.length} FAILED OPERATIONS (attempt ${retryCount + 2}/${maxRetries})`);
              failed.forEach(({ operation }) => {
                operation.status = 'pending';
              });
              
              retryCount++;
              const backoffMs = Math.pow(2, retryCount) * 1000;
              await new Promise(resolve => setTimeout(resolve, backoffMs));
            } else if (failed.length > 0) {
              // Max retries reached
              console.error(`❌ ${failed.length} OPERATIONS FAILED AFTER ${maxRetries} RETRIES`);
              failed.forEach(({ operation, error }) => {
                operation.status = 'failed';
                setSaveError(error);
                
                // Remove from queue
                const index = queueRef.current.findIndex(q => q.id === operation.id);
                if (index !== -1) queueRef.current.splice(index, 1);
                
                if (onOperationFailed) {
                  onOperationFailed(operation, error);
                }
              });
              success = true;
            } else {
              // All succeeded
              success = true;
              setLastSaved(new Date());
              setSaveError(null);
            }
            
          } catch (error) {
            retryCount++;
            console.error(`❌ BATCH ERROR (attempt ${retryCount}/${maxRetries}):`, error);
            
            if (retryCount >= maxRetries) {
              // Mark all as failed
              batch.forEach(operation => {
                operation.status = 'failed';
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                setSaveError(errorMessage);
                
                const index = queueRef.current.findIndex(q => q.id === operation.id);
                if (index !== -1) queueRef.current.splice(index, 1);
                
                if (onOperationFailed) {
                  onOperationFailed(operation, errorMessage);
                }
              });
              success = true;
            } else {
              // Reset for retry
              batch.forEach(op => op.status = 'pending');
              const backoffMs = Math.pow(2, retryCount) * 1000;
              await new Promise(resolve => setTimeout(resolve, backoffMs));
            }
          }
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
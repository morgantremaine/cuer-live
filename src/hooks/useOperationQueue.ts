import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  getPriorityConfig, 
  canBatchTogether, 
  sortOperationsByPriority,
  EMERGENCY_FLUSH_THRESHOLD 
} from '@/config/operationPriority';

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
  const batchTimeoutsByType = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Generate unique operation ID
  const generateOperationId = useCallback(() => {
    return `${clientId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, [clientId]);

  // Queue an operation with SMART BATCHING based on priority
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

    // Get priority config for this operation type
    const priorityConfig = getPriorityConfig(operationType);

    console.log('🔄 QUEUING OPERATION (Smart Batch):', {
      id: operation.id,
      type: operationType,
      priority: priorityConfig.priority,
      batchWindow: priorityConfig.batchWindowMs,
      data: operationData
    });

    queueRef.current.push(operation);
    
    // EMERGENCY FLUSH: If queue is too large, process immediately regardless of type
    if (queueRef.current.length >= EMERGENCY_FLUSH_THRESHOLD) {
      console.log('🚨 EMERGENCY FLUSH - queue too large:', queueRef.current.length);
      clearAllBatchTimeouts();
      processQueue();
      return operation.id;
    }
    
    // Check if we should batch with existing operations of same priority
    const existingTimeout = batchTimeoutsByType.current.get(operationType);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // If queue reached max batch size for this priority, process immediately
    if (queueRef.current.length >= priorityConfig.maxBatchSize) {
      console.log('📦 PRIORITY BATCH SIZE REACHED:', {
        type: operationType,
        priority: priorityConfig.priority,
        size: queueRef.current.length
      });
      clearAllBatchTimeouts();
      processQueue();
    } else {
      // Set priority-specific timeout
      const timeout = setTimeout(() => {
        console.log('⏱️ PRIORITY BATCH WINDOW ELAPSED:', {
          type: operationType,
          priority: priorityConfig.priority,
          window: priorityConfig.batchWindowMs
        });
        batchTimeoutsByType.current.delete(operationType);
        processQueue();
      }, priorityConfig.batchWindowMs);
      
      batchTimeoutsByType.current.set(operationType, timeout);
    }

    return operation.id;
  }, [rundownId, userId, clientId, generateOperationId]);

  // Helper to clear all batch timeouts
  const clearAllBatchTimeouts = useCallback(() => {
    batchTimeoutsByType.current.forEach(timeout => clearTimeout(timeout));
    batchTimeoutsByType.current.clear();
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
  }, []);

  // Process the operation queue with SMART PRIORITIZATION
  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) {
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);

    try {
      const authToken = (await supabase.auth.getSession()).data.session?.access_token;
      if (!authToken) {
        throw new Error('No auth token available');
      }

      // SMART BATCHING: Sort operations by priority (HOT first)
      const sortedQueue = sortOperationsByPriority(queueRef.current);
      
      // Get the highest priority operation type to determine batch
      const firstOp = sortedQueue[0];
      const priorityConfig = getPriorityConfig(firstOp.operationType);
      
      // Batch operations of same priority together
      const batch = sortedQueue
        .filter(op => canBatchTogether(firstOp.operationType, op.operationType))
        .slice(0, priorityConfig.maxBatchSize);
      
      console.log('📤 PROCESSING SMART BATCH:', {
        batchSize: batch.length,
        totalQueued: queueRef.current.length,
        priority: priorityConfig.priority,
        batchWindow: priorityConfig.batchWindowMs,
        types: [...new Set(batch.map(op => op.operationType))],
        rundownId
      });

      // Update status to 'sent'
      batch.forEach(op => op.status = 'sent');

      // Send entire batch in a single request
      const SUPABASE_URL = 'https://khdiwrkgahsbjszlwnob.supabase.co';
      try {
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/apply-operation`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              rundownId,
              operations: batch.map(op => ({
                id: op.id,
                rundownId: op.rundownId,
                operationType: op.operationType,
                operationData: op.operationData,
                userId: op.userId,
                clientId: op.clientId,
                timestamp: op.timestamp
              }))
            })
          }
        );

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Batch operation failed');
        }

        // Mark all operations as acknowledged
        batch.forEach(operation => {
          operation.status = 'acknowledged';
          console.log('✅ OPERATION APPLIED:', operation.id);
          onOperationApplied?.(operation);
        });

        // Update last saved
        setLastSaved(new Date());
        setSaveError(null);

      } catch (error) {
        console.error('❌ BATCH FAILED:', error);
        
        // Mark all operations in batch as failed
        batch.forEach(operation => {
          operation.status = 'failed';
          onOperationFailed?.(operation, error instanceof Error ? error.message : 'Unknown error');
        });

        setSaveError('Failed to save changes');
      }

      // Remove acknowledged operations
      queueRef.current = queueRef.current.filter(op => op.status !== 'acknowledged');

    } finally {
      processingRef.current = false;
      setIsProcessing(false);
      
      // Continue processing if there are more items in queue
      if (queueRef.current.length > 0) {
        setTimeout(() => processQueue(), 100);
      }
    }
  }, [rundownId, onOperationApplied, onOperationFailed]);

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
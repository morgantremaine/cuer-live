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

  // Process the operation queue by sending batched operations
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

      // Get batch of operations to send
      const batchSize = Math.min(queueRef.current.length, MAX_BATCH_SIZE);
      const batch = queueRef.current.slice(0, batchSize);
      
      console.log('📤 PROCESSING BATCH:', {
        batchSize: batch.length,
        totalQueued: queueRef.current.length,
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

        // Broadcast operations via P2P channel for instant updates (matches cell edit speed)
        try {
          const channel = supabase.channel(`rundown-operations-${rundownId}`);
          for (const operation of batch) {
            await channel.send({
              type: 'broadcast',
              event: 'operation',
              payload: {
                type: 'operation_applied',
                operation: {
                  ...operation,
                  sequenceNumber: Date.now(), // Will be replaced by actual sequence from DB
                  appliedAt: new Date().toISOString()
                },
                rundownId
              }
            });
            console.log('📡 BROADCASTED OPERATION VIA CHANNEL:', operation.id);
          }
        } catch (broadcastError) {
          // Don't fail if broadcast fails - DB realtime is fallback
          console.warn('⚠️ P2P BROADCAST FAILED (DB realtime will sync):', broadcastError);
        }

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
import { useCallback, useRef } from 'react';
import { useCellUpdateContext } from '@/contexts/CellUpdateContext';
import { useRaceConditionDetector } from './useRaceConditionDetector';

interface OperationMetadata {
  affectedItemIds?: string[];
  affectedFields?: string[];
  operationType?: 'cell' | 'row' | 'structural' | 'showcaller';
}

interface CoordinationWindow {
  isActive: boolean;
  startTime: number;
  operations: Array<{
    id: string;
    type: string;
    metadata: OperationMetadata;
  }>;
}

/**
 * Advanced operation coordinator that implements coordination windows
 * and intent broadcasting to prevent race conditions
 */
export const useOperationCoordinator = () => {
  const { queueOperation } = useCellUpdateContext();
  const { 
    recordOperationStart, 
    recordOperationComplete, 
    analyzeRaceCondition 
  } = useRaceConditionDetector();

  const coordinationWindowRef = useRef<CoordinationWindow>({
    isActive: false,
    startTime: 0,
    operations: []
  });

  // Broadcast operation intent before executing
  const broadcastIntent = useCallback((
    operationId: string,
    operationType: string,
    metadata: OperationMetadata
  ) => {
    console.log('📢 Coordinator: Broadcasting operation intent', {
      operationId,
      operationType,
      metadata
    });

    // Open coordination window for structural operations
    if (metadata.operationType === 'structural') {
      coordinationWindowRef.current = {
        isActive: true,
        startTime: Date.now(),
        operations: [{
          id: operationId,
          type: operationType,
          metadata
        }]
      };

      // Close window after brief delay
      setTimeout(() => {
        if (coordinationWindowRef.current.isActive) {
          console.log('🔓 Coordinator: Closing coordination window');
          coordinationWindowRef.current.isActive = false;
        }
      }, 500); // 500ms coordination window
    }
  }, []);

  // Execute operation with coordination
  const executeWithCoordination = useCallback(async <T>(
    operationId: string,
    operationType: string,
    metadata: OperationMetadata,
    operation: () => Promise<T>
  ): Promise<T> => {
    // Analyze for race conditions
    const analysis = analyzeRaceCondition(
      operationType,
      operationId,
      undefined,
      metadata
    );

    // If coordination window is active and this is a cell edit during structural operation
    if (
      coordinationWindowRef.current.isActive &&
      metadata.operationType === 'cell'
    ) {
      console.log('⏸️ Coordinator: Queuing cell edit during structural operation window');
      
      return new Promise<T>((resolve, reject) => {
        queueOperation({
          id: operationId,
          type: metadata.operationType,
          priority: 3,
          execute: async () => {
            try {
              const result = await operation();
              resolve(result);
            } catch (error) {
              reject(error);
            }
          }
        });
      }) as Promise<T>;
    }

    // Handle based on race condition analysis
    if (analysis.hasRaceCondition && analysis.resolution === 'queue') {
      console.log('⏸️ Coordinator: Queueing operation due to conflicts');
      
      return new Promise<T>((resolve, reject) => {
        queueOperation({
          id: operationId,
          type: metadata.operationType || 'cell',
          priority: metadata.operationType === 'structural' ? 5 : 3,
          execute: async () => {
            try {
              const result = await operation();
              resolve(result);
            } catch (error) {
              reject(error);
            }
          }
        });
      }) as Promise<T>;
    }

    if (analysis.hasRaceCondition && analysis.resolution === 'abort') {
      console.warn('🛑 Coordinator: Aborting operation due to conflicts');
      throw new Error(`Operation aborted: ${analysis.reason}`);
    }

    // Broadcast intent for structural operations
    if (metadata.operationType === 'structural') {
      broadcastIntent(operationId, operationType, metadata);
    }

    // Execute operation with tracking
    recordOperationStart(operationType, operationId, undefined, metadata);
    
    try {
      const result = await operation();
      recordOperationComplete(operationType, operationId);
      return result;
    } catch (error) {
      recordOperationComplete(operationType, operationId);
      throw error;
    }
  }, [analyzeRaceCondition, queueOperation, broadcastIntent, recordOperationStart, recordOperationComplete]);

  // Check if coordination window is active
  const isCoordinationWindowActive = useCallback(() => {
    return coordinationWindowRef.current.isActive;
  }, []);

  // Get operations in current coordination window
  const getCoordinationWindowOperations = useCallback(() => {
    return coordinationWindowRef.current.operations;
  }, []);

  return {
    executeWithCoordination,
    isCoordinationWindowActive,
    getCoordinationWindowOperations,
    broadcastIntent
  };
};

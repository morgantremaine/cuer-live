import React, { createContext, useContext, useRef, ReactNode, useCallback } from 'react';

interface PendingOperation {
  id: string;
  type: 'cell' | 'structural' | 'showcaller';
  priority: number;
  execute: () => Promise<void>;
  timestamp: number;
}

interface CellUpdateContextType {
  cellUpdateInProgressRef: React.MutableRefObject<boolean>;
  showcallerOperationRef: React.MutableRefObject<boolean>;
  structuralOperationRef: React.MutableRefObject<boolean>;
  operationQueueRef: React.MutableRefObject<PendingOperation[]>;
  sequenceNumberRef: React.MutableRefObject<number>;
  setCellUpdateInProgress: (inProgress: boolean) => void;
  setShowcallerOperation: (inProgress: boolean) => void;
  setStructuralOperation: (inProgress: boolean) => void;
  queueOperation: (operation: Omit<PendingOperation, 'timestamp'>) => Promise<void>;
  getNextSequenceNumber: () => number;
  isAnyOperationInProgress: () => boolean;
}

const CellUpdateContext = createContext<CellUpdateContextType | undefined>(undefined);

export const useCellUpdateContext = () => {
  const context = useContext(CellUpdateContext);
  if (!context) {
    throw new Error('useCellUpdateContext must be used within a CellUpdateProvider');
  }
  return context;
};

interface CellUpdateProviderProps {
  children: ReactNode;
}

export const CellUpdateProvider = ({ children }: CellUpdateProviderProps) => {
  const cellUpdateInProgressRef = useRef<boolean>(false);
  const showcallerOperationRef = useRef<boolean>(false);
  const structuralOperationRef = useRef<boolean>(false);
  const operationQueueRef = useRef<PendingOperation[]>([]);
  const sequenceNumberRef = useRef<number>(0);
  const processingRef = useRef<boolean>(false);

  const setCellUpdateInProgress = (inProgress: boolean) => {
    cellUpdateInProgressRef.current = inProgress;
    if (inProgress) {
      console.log('🔒 Cell broadcast update started - AutoSave blocked');
    } else {
      console.log('🔓 Cell broadcast update finished - AutoSave unblocked');
    }
  };

  const setShowcallerOperation = (inProgress: boolean) => {
    showcallerOperationRef.current = inProgress;
    if (inProgress) {
      console.log('📺 Showcaller operation started - AutoSave coordination active');
    } else {
      console.log('📺 Showcaller operation finished - AutoSave coordination cleared');
    }
  };

  const setStructuralOperation = (inProgress: boolean) => {
    structuralOperationRef.current = inProgress;
    if (inProgress) {
      console.log('🏗️ Structural operation started - Cell updates blocked');
    } else {
      console.log('🏗️ Structural operation finished - Cell updates unblocked');
    }
  };

  const getNextSequenceNumber = useCallback(() => {
    return ++sequenceNumberRef.current;
  }, []);

  const isAnyOperationInProgress = useCallback(() => {
    return cellUpdateInProgressRef.current || 
           showcallerOperationRef.current || 
           structuralOperationRef.current ||
           processingRef.current;
  }, []);

  // Process operation queue with proper priority and coordination
  const processQueue = useCallback(async () => {
    if (processingRef.current || operationQueueRef.current.length === 0) {
      return;
    }

    processingRef.current = true;
    console.log('🔄 Processing operation queue:', operationQueueRef.current.length, 'operations');

    try {
      // Sort by priority (higher priority first), then by timestamp
      operationQueueRef.current.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return a.timestamp - b.timestamp; // Earlier timestamp first
      });

      // Process operations sequentially to prevent conflicts
      while (operationQueueRef.current.length > 0) {
        const operation = operationQueueRef.current.shift()!;
        
        console.log(`⚡ Executing ${operation.type} operation:`, operation.id);
        
        try {
          await operation.execute();
          console.log(`✅ ${operation.type} operation completed:`, operation.id);
        } catch (error) {
          console.error(`❌ ${operation.type} operation failed:`, operation.id, error);
          // Continue processing other operations even if one fails
        }
      }
    } finally {
      processingRef.current = false;
      console.log('🏁 Operation queue processing complete');

      // Check if more operations were added during processing
      if (operationQueueRef.current.length > 0) {
        // Schedule next batch processing
        setTimeout(() => processQueue(), 10);
      }
    }
  }, []);

  const queueOperation = useCallback(async (operation: Omit<PendingOperation, 'timestamp'>) => {
    const queuedOperation: PendingOperation = {
      ...operation,
      timestamp: Date.now()
    };

    console.log(`🔄 Queuing ${operation.type} operation:`, operation.id, 'Priority:', operation.priority);
    operationQueueRef.current.push(queuedOperation);

    // Start processing if not already running
    if (!processingRef.current) {
      await processQueue();
    }
  }, [processQueue]);

  const value: CellUpdateContextType = {
    cellUpdateInProgressRef,
    showcallerOperationRef,
    structuralOperationRef,
    operationQueueRef,
    sequenceNumberRef,
    setCellUpdateInProgress,
    setShowcallerOperation,
    setStructuralOperation,
    queueOperation,
    getNextSequenceNumber,
    isAnyOperationInProgress
  };

  return (
    <CellUpdateContext.Provider value={value}>
      {children}
    </CellUpdateContext.Provider>
  );
};
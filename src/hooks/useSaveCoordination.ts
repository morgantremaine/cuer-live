import { useCallback, useRef, useState } from 'react';

interface SaveOperation {
  id: string;
  type: 'rundown' | 'teleprompter' | 'blueprint';
  startTime: number;
  isActive: boolean;
}

export const useSaveCoordination = () => {
  const [activeSaveOperations, setActiveSaveOperations] = useState<Map<string, SaveOperation>>(new Map());
  const [globalSaveSequence, setGlobalSaveSequence] = useState(0);
  const saveQueueRef = useRef<Array<() => Promise<void>>>([]);
  const processingQueueRef = useRef(false);
  
  // Register a save operation
  const registerSaveOperation = useCallback((type: SaveOperation['type'], operationId?: string): string => {
    const id = operationId || `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const operation: SaveOperation = {
      id,
      type,
      startTime: Date.now(),
      isActive: true
    };
    
    setActiveSaveOperations(prev => {
      const newOps = new Map(prev);
      newOps.set(id, operation);
      return newOps;
    });
    
    console.log('📝 Registered save operation:', { id, type });
    return id;
  }, []);
  
  // Complete a save operation
  const completeSaveOperation = useCallback((operationId: string) => {
    setActiveSaveOperations(prev => {
      const newOps = new Map(prev);
      const operation = newOps.get(operationId);
      
      if (operation) {
        const duration = Date.now() - operation.startTime;
        console.log('✅ Completed save operation:', { 
          id: operationId, 
          type: operation.type, 
          duration: `${duration}ms` 
        });
        newOps.delete(operationId);
      }
      
      return newOps;
    });
  }, []);
  
  // Check if any save operation is active
  const hasActiveSaveOperations = useCallback((excludeTypes?: SaveOperation['type'][]): boolean => {
    const operations = Array.from(activeSaveOperations.values());
    
    if (excludeTypes) {
      return operations.some(op => op.isActive && !excludeTypes.includes(op.type));
    }
    
    return operations.some(op => op.isActive);
  }, [activeSaveOperations]);
  
  // Check if a specific type of save is active
  const isSaveTypeActive = useCallback((type: SaveOperation['type']): boolean => {
    const operations = Array.from(activeSaveOperations.values());
    return operations.some(op => op.isActive && op.type === type);
  }, [activeSaveOperations]);
  
  // Queue a save operation for sequential execution
  const queueSaveOperation = useCallback(async (
    saveFunction: () => Promise<void>,
    priority: 'high' | 'normal' = 'normal'
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const wrappedSave = async () => {
        try {
          await saveFunction();
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      
      if (priority === 'high') {
        saveQueueRef.current.unshift(wrappedSave);
      } else {
        saveQueueRef.current.push(wrappedSave);
      }
      
      // Process queue if not already processing
      if (!processingQueueRef.current) {
        processQueueRef.current();
      }
    });
  }, []);
  
  // Process the save queue
  const processQueueRef = useRef(async () => {
    if (processingQueueRef.current || saveQueueRef.current.length === 0) {
      return;
    }
    
    processingQueueRef.current = true;
    console.log('🔄 Processing save queue, items:', saveQueueRef.current.length);
    
    while (saveQueueRef.current.length > 0) {
      const saveOperation = saveQueueRef.current.shift();
      if (saveOperation) {
        try {
          await saveOperation();
          // Small delay between operations to prevent conflicts
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error('❌ Save queue operation failed:', error);
        }
      }
    }
    
    processingQueueRef.current = false;
    console.log('✅ Save queue processing complete');
  });
  
  // Coordinate between different save sources
  const coordinatedSave = useCallback(async (
    type: SaveOperation['type'],
    saveFunction: () => Promise<void>,
    options: {
      waitForOtherSaves?: boolean;
      priority?: 'high' | 'normal';
      timeout?: number;
    } = {}
  ): Promise<void> => {
    const { waitForOtherSaves = true, priority = 'normal', timeout = 10000 } = options;
    
    // Register the operation
    const operationId = registerSaveOperation(type);
    
    try {
      if (waitForOtherSaves) {
        // Wait for conflicting save types to complete
        const conflictingTypes: SaveOperation['type'][] = type === 'rundown' 
          ? ['teleprompter', 'blueprint'] 
          : type === 'teleprompter' 
            ? ['rundown'] 
            : ['rundown'];
        
        const startWait = Date.now();
        while (hasActiveSaveOperations(conflictingTypes) && (Date.now() - startWait) < timeout) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      // Execute the save
      if (priority === 'high' || !waitForOtherSaves) {
        // Execute immediately
        await saveFunction();
      } else {
        // Queue for sequential execution
        await queueSaveOperation(saveFunction, priority);
      }
      
    } finally {
      completeSaveOperation(operationId);
    }
  }, [registerSaveOperation, completeSaveOperation, hasActiveSaveOperations, queueSaveOperation]);
  
  // Get current save statistics
  const getSaveStatistics = useCallback(() => {
    const operations = Array.from(activeSaveOperations.values());
    return {
      totalActive: operations.length,
      byType: operations.reduce((acc, op) => {
        acc[op.type] = (acc[op.type] || 0) + 1;
        return acc;
      }, {} as Record<SaveOperation['type'], number>),
      queuedOperations: saveQueueRef.current.length,
      isProcessingQueue: processingQueueRef.current
    };
  }, [activeSaveOperations]);
  
  return {
    // Operation management
    registerSaveOperation,
    completeSaveOperation,
    
    // State queries
    hasActiveSaveOperations,
    isSaveTypeActive,
    getSaveStatistics,
    
    // Coordination
    coordinatedSave,
    queueSaveOperation,
    
    // Sequence tracking
    globalSaveSequence,
    incrementSequence: () => setGlobalSaveSequence(prev => prev + 1)
  };
};
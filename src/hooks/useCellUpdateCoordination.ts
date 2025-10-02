import { useCallback } from 'react';
import { useCellUpdateContext } from '@/contexts/CellUpdateContext';

export const useCellUpdateCoordination = () => {
  const { 
    cellUpdateInProgressRef, 
    showcallerOperationRef,
    structuralOperationRef,
    setCellUpdateInProgress, 
    setShowcallerOperation,
    setStructuralOperation,
    queueOperation,
    getNextSequenceNumber,
    isAnyOperationInProgress
  } = useCellUpdateContext();

  // Execute a cell update with proper coordination
  const executeWithCellUpdate = useCallback(async (callback: () => void | Promise<void>) => {
    // Check if structural operation is in progress
    if (structuralOperationRef.current) {
      console.log('🔄 Cell update queued - structural operation in progress');
      
      // Queue the cell update to execute after structural operation completes
      await queueOperation({
        id: `cell-update-${Date.now()}`,
        type: 'cell',
        priority: 50, // Medium priority
        execute: async () => {
          setCellUpdateInProgress(true);
          try {
            await callback();
          } finally {
            Promise.resolve().then(() => {
              setCellUpdateInProgress(false);
            });
          }
        }
      });
      return;
    }

    setCellUpdateInProgress(true);
    try {
      await callback();
    } finally {
      // Use a micro-task to ensure cleanup happens after all synchronous operations
      Promise.resolve().then(() => {
        setCellUpdateInProgress(false);
      });
    }
  }, [setCellUpdateInProgress, structuralOperationRef, queueOperation]);

  // Execute a structural operation with proper coordination
  const executeWithStructuralOperation = useCallback(async (callback: () => void | Promise<void>) => {
    // Check if any operation is already in progress
    if (isAnyOperationInProgress()) {
      console.log('🔄 Structural operation queued - other operations in progress');
      
      // Queue the structural operation with high priority
      await queueOperation({
        id: `structural-${Date.now()}`,
        type: 'structural',
        priority: 100, // High priority
        execute: async () => {
          setStructuralOperation(true);
          try {
            await callback();
          } finally {
            Promise.resolve().then(() => {
              setStructuralOperation(false);
            });
          }
        }
      });
      return;
    }

    setStructuralOperation(true);
    try {
      await callback();
    } finally {
      Promise.resolve().then(() => {
        setStructuralOperation(false);
      });
    }
  }, [setStructuralOperation, isAnyOperationInProgress, queueOperation]);

  // Execute a showcaller operation with proper coordination
  const executeWithShowcallerOperation = useCallback(async (callback: () => void | Promise<void>) => {
    // Check if structural or cell operations are in progress
    if (structuralOperationRef.current || cellUpdateInProgressRef.current) {
      console.log('🔄 Showcaller operation queued - other operations in progress');
      
      await queueOperation({
        id: `showcaller-${Date.now()}`,
        type: 'showcaller',
        priority: 30, // Lower priority than structural but higher than regular cell updates
        execute: async () => {
          setShowcallerOperation(true);
          try {
            await callback();
          } finally {
            setTimeout(() => {
              setShowcallerOperation(false);
            }, 300);
          }
        }
      });
      return;
    }

    setShowcallerOperation(true);
    try {
      await callback();
    } finally {
      // Clear after a longer delay to ensure showcaller state fully propagates
      setTimeout(() => {
        setShowcallerOperation(false);
      }, 300);
    }
  }, [setShowcallerOperation, structuralOperationRef, cellUpdateInProgressRef, queueOperation]);

  // Enhanced blocking check that considers all coordination states
  const shouldBlockAutoSave = useCallback(() => {
    const cellBlocked = cellUpdateInProgressRef.current;
    const showcallerBlocked = showcallerOperationRef.current;
    const structuralBlocked = structuralOperationRef.current;
    
    if (structuralBlocked) {
      console.log('🏗️ AutoSave blocked - structural operation in progress');
      return true;
    }
    
    if (cellBlocked) {
      console.log('🛑 AutoSave blocked - cell update in progress');
      return true;
    }
    
    if (showcallerBlocked) {
      console.log('📺 AutoSave deferred - showcaller operation in progress');
      return true;
    }
    
    return false;
  }, [cellUpdateInProgressRef, showcallerOperationRef, structuralOperationRef]);

  // Check if teleprompter saves should be blocked
  const shouldBlockTeleprompterSave = useCallback(() => {
    // Teleprompter saves can proceed during showcaller operations
    // but should wait for structural and cell updates to complete
    const cellBlocked = cellUpdateInProgressRef.current;
    const structuralBlocked = structuralOperationRef.current;
    
    if (structuralBlocked) {
      console.log('🏗️ Teleprompter save blocked - structural operation in progress');
      return true;
    }
    
    if (cellBlocked) {
      console.log('🛑 Teleprompter save blocked - cell update in progress');
      return true;
    }
    
    return false;
  }, [cellUpdateInProgressRef, structuralOperationRef]);

  // Check if showcaller operations should be blocked
  const shouldBlockShowcallerOperation = useCallback(() => {
    // Showcaller operations should wait for structural operations
    // but can coordinate with other showcaller operations
    const showcallerBlocked = showcallerOperationRef.current;
    const structuralBlocked = structuralOperationRef.current;
    
    if (structuralBlocked) {
      console.log('🏗️ Showcaller operation blocked - structural operation in progress');
      return true;
    }
    
    if (showcallerBlocked) {
      console.log('📺 Showcaller operation blocked - another showcaller operation in progress');
      return true;
    }
    
    return false;
  }, [showcallerOperationRef, structuralOperationRef]);

  // Check if structural operations should be blocked
  const shouldBlockStructuralOperation = useCallback(() => {
    // Structural operations should wait for all other operations to complete
    return isAnyOperationInProgress();
  }, [isAnyOperationInProgress]);

  return {
    executeWithCellUpdate,
    executeWithStructuralOperation,
    executeWithShowcallerOperation,
    shouldBlockAutoSave,
    shouldBlockTeleprompterSave,
    shouldBlockShowcallerOperation,
    shouldBlockStructuralOperation,
    getNextSequenceNumber,
    isAnyOperationInProgress,
    cellUpdateInProgressRef,
    showcallerOperationRef,
    structuralOperationRef
  };
};
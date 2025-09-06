import { useCallback } from 'react';
import { useCellUpdateContext } from '@/contexts/CellUpdateContext';

export const useCellUpdateCoordination = () => {
  const { 
    cellUpdateInProgressRef, 
    showcallerOperationRef,
    setCellUpdateInProgress, 
    setShowcallerOperation 
  } = useCellUpdateContext();

  // Execute a cell update with proper coordination
  const executeWithCellUpdate = useCallback(async (callback: () => void | Promise<void>) => {
    setCellUpdateInProgress(true);
    try {
      await callback();
    } finally {
      // Use a micro-task to ensure cleanup happens after all synchronous operations
      Promise.resolve().then(() => {
        setCellUpdateInProgress(false);
      });
    }
  }, [setCellUpdateInProgress]);

  // Execute a showcaller operation with proper coordination
  const executeWithShowcallerOperation = useCallback(async (callback: () => void | Promise<void>) => {
    setShowcallerOperation(true);
    try {
      await callback();
    } finally {
      // Clear after a longer delay to ensure showcaller state fully propagates
      setTimeout(() => {
        setShowcallerOperation(false);
      }, 300);
    }
  }, [setShowcallerOperation]);

  // Enhanced blocking check that considers all coordination states
  const shouldBlockAutoSave = useCallback(() => {
    const cellBlocked = cellUpdateInProgressRef.current;
    const showcallerBlocked = showcallerOperationRef.current;
    
    if (cellBlocked) {
      console.log('🛑 AutoSave blocked - cell update in progress');
      return true;
    }
    
    if (showcallerBlocked) {
      console.log('📺 AutoSave deferred - showcaller operation in progress');
      return true;
    }
    
    return false;
  }, [cellUpdateInProgressRef, showcallerOperationRef]);

  // Check if teleprompter saves should be blocked
  const shouldBlockTeleprompterSave = useCallback(() => {
    // Teleprompter saves can proceed during showcaller operations
    // but should wait for cell updates to complete
    const cellBlocked = cellUpdateInProgressRef.current;
    
    if (cellBlocked) {
      console.log('🛑 Teleprompter save blocked - cell update in progress');
      return true;
    }
    
    return false;
  }, [cellUpdateInProgressRef]);

  // Check if showcaller operations should be blocked
  const shouldBlockShowcallerOperation = useCallback(() => {
    // Showcaller operations can proceed during most other operations
    // but should coordinate with ongoing showcaller operations
    const showcallerBlocked = showcallerOperationRef.current;
    
    if (showcallerBlocked) {
      console.log('📺 Showcaller operation blocked - another showcaller operation in progress');
      return true;
    }
    
    return false;
  }, [showcallerOperationRef]);

  return {
    executeWithCellUpdate,
    executeWithShowcallerOperation,
    shouldBlockAutoSave,
    shouldBlockTeleprompterSave,
    shouldBlockShowcallerOperation,
    cellUpdateInProgressRef,
    showcallerOperationRef
  };
};
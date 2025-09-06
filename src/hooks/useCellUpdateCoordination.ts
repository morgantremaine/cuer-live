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
      // Clear after a brief delay to allow showcaller state to propagate
      setTimeout(() => {
        setShowcallerOperation(false);
      }, 100);
    }
  }, [setShowcallerOperation]);

  // Check if AutoSave should be blocked
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

  return {
    executeWithCellUpdate,
    executeWithShowcallerOperation,
    shouldBlockAutoSave,
    cellUpdateInProgressRef,
    showcallerOperationRef
  };
};
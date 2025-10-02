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

  // Execute a cell update - simplified to immediate execution (no more queuing/blocking)
  const executeWithCellUpdate = useCallback(async (callback: () => void | Promise<void>) => {
    try {
      await callback();
    } catch (error) {
      console.error('Cell update error:', error);
    }
  }, []);

  // Execute a structural operation - simplified to immediate execution (no more queuing/blocking)
  const executeWithStructuralOperation = useCallback(async (callback: () => void | Promise<void>) => {
    try {
      await callback();
    } catch (error) {
      console.error('Structural operation error:', error);
    }
  }, []);

  // Execute a showcaller operation - simplified to immediate execution (no more queuing/blocking)
  const executeWithShowcallerOperation = useCallback(async (callback: () => void | Promise<void>) => {
    try {
      await callback();
    } catch (error) {
      console.error('Showcaller operation error:', error);
    }
  }, []);

  // AutoSave blocking removed - never block saves (embrace immediate saves)
  const shouldBlockAutoSave = useCallback(() => {
    return false;
  }, []);

  // Teleprompter save blocking removed - never block saves
  const shouldBlockTeleprompterSave = useCallback(() => {
    return false;
  }, []);

  // Showcaller operation blocking removed - showcaller operates independently
  const shouldBlockShowcallerOperation = useCallback(() => {
    return false;
  }, []);

  // Structural operation blocking removed - use simple mutex per rundown instead
  const shouldBlockStructuralOperation = useCallback(() => {
    return false;
  }, []);

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
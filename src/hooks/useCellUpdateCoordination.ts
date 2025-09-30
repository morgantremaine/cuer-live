import { useCallback } from 'react';
import { useCellUpdateContext } from '@/contexts/CellUpdateContext';

/**
 * Simplified cell update coordination
 * Just tracks state, no complex queueing - operations handle themselves
 */
export const useCellUpdateCoordination = () => {
  const { 
    cellUpdateInProgressRef, 
    showcallerOperationRef,
    structuralOperationRef,
    setCellUpdateInProgress, 
    setShowcallerOperation,
    setStructuralOperation
  } = useCellUpdateContext();

  // Execute a cell update
  const executeWithCellUpdate = useCallback(async (callback: () => void | Promise<void>) => {
    setCellUpdateInProgress(true);
    try {
      await callback();
    } finally {
      setCellUpdateInProgress(false);
    }
  }, [setCellUpdateInProgress]);

  // Execute a structural operation
  const executeWithStructuralOperation = useCallback(async (callback: () => void | Promise<void>) => {
    setStructuralOperation(true);
    try {
      await callback();
    } finally {
      setStructuralOperation(false);
    }
  }, [setStructuralOperation]);

  // Execute a showcaller operation
  const executeWithShowcallerOperation = useCallback(async (callback: () => void | Promise<void>) => {
    setShowcallerOperation(true);
    try {
      await callback();
    } finally {
      setShowcallerOperation(false);
    }
  }, [setShowcallerOperation]);

  // Only block autosave for showcaller operations
  // Structural operations coordinate with each other but don't block autosave
  const shouldBlockAutoSave = useCallback(() => {
    return showcallerOperationRef.current;
  }, [showcallerOperationRef]);

  // Check if any operation is in progress
  const isAnyOperationInProgress = useCallback(() => {
    return cellUpdateInProgressRef.current || 
           showcallerOperationRef.current || 
           structuralOperationRef.current;
  }, [cellUpdateInProgressRef, showcallerOperationRef, structuralOperationRef]);

  // No-op sequence number (not needed in simplified system)
  const getNextSequenceNumber = useCallback(() => {
    return Date.now();
  }, []);

  return {
    executeWithCellUpdate,
    executeWithStructuralOperation,
    executeWithShowcallerOperation,
    shouldBlockAutoSave,
    isAnyOperationInProgress,
    getNextSequenceNumber,
    cellUpdateInProgressRef,
    showcallerOperationRef,
    structuralOperationRef
  };
};

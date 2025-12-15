import { useCallback, useRef } from 'react';
import { RundownState } from './useRundownState';
import { useCellLevelSave } from './useCellLevelSave';
import { useStructuralSave } from './useStructuralSave';
import { useCellUpdateCoordination } from './useCellUpdateCoordination';
import { debugLogger } from '@/utils/debugLogger';
import { RundownItem } from '@/types/rundown';

interface PerCellSaveOptions {
  rundownId: string | null;
  isPerCellEnabled: boolean;
  currentUserId?: string;
  onSaveComplete?: (completionCount?: number) => void;
  onSaveStart?: () => void;
  onUnsavedChanges?: () => void;
  onChangesSaved?: () => void;
  onSaveError?: (error: string) => void;
  isTypingActive?: () => boolean;
  saveInProgressRef?: React.MutableRefObject<boolean>;
  typingIdleMs?: number;
}

export const usePerCellSaveCoordination = ({
  rundownId,
  isPerCellEnabled,
  currentUserId,
  onSaveComplete,
  onSaveStart,
  onUnsavedChanges,
  onChangesSaved,
  onSaveError,
  isTypingActive,
  saveInProgressRef,
  typingIdleMs
}: PerCellSaveOptions) => {
  

  // Coordination system for managing concurrent operations
  const coordination = useCellUpdateCoordination();

  // Cell-level save system - per-cell save is always enabled
  const handleCellSaveComplete = useCallback((savedUpdates?: any[], completionCount?: number) => {
    if (onSaveComplete && completionCount !== undefined) {
      onSaveComplete(completionCount);
    }
  }, [onSaveComplete]);

  const handleCellSaveError = useCallback((error: string) => {
    if (onSaveError) {
      onSaveError(error);
    }
  }, [onSaveError]);

  const {
    trackCellChange,
    flushPendingUpdates: flushCellUpdates,
    hasPendingUpdates: hasPendingCellUpdates,
    retryFailedSaves,
    getFailedSavesCount
  } = useCellLevelSave(rundownId, handleCellSaveComplete, onSaveStart, onUnsavedChanges, onChangesSaved, isTypingActive, saveInProgressRef, typingIdleMs, handleCellSaveError);

  // Structural save system for row operations
  const {
    queueStructuralOperation,
    flushPendingOperations: flushStructuralOperations,
    hasPendingOperations: hasPendingStructuralOperations,
    retryFailedStructuralOperations,
    getFailedStructuralOperationsCount
  } = useStructuralSave(rundownId, onSaveComplete, onSaveStart, onUnsavedChanges, currentUserId, handleCellSaveError);

  // Unified field tracking - always uses per-cell save
  const trackFieldChange = useCallback((itemId: string | undefined, field: string, value: any) => {
    trackCellChange(itemId, field, value);
  }, [trackCellChange]);

  // Unified save function - flushes pending cell updates
  const saveState = useCallback(async (currentState: RundownState) => {
    if (hasPendingCellUpdates()) {
      debugLogger.autosave('Per-cell save: flushing pending updates');
      return await flushCellUpdates();
    } else {
      debugLogger.autosave('Per-cell save: no pending updates to flush');
      throw new Error('No changes to save');
    }
  }, [hasPendingCellUpdates, flushCellUpdates]);


  // Handle structural operations with enhanced coordination and content snapshot
  const handleStructuralOperation = useCallback((
    operationType: 'add_row' | 'delete_row' | 'move_rows' | 'copy_rows' | 'reorder' | 'add_header' | 'toggle_lock' | 'update_sort_order',
    operationData: {
      items?: RundownItem[];
      order?: string[];
      deletedIds?: string[];
      newItems?: RundownItem[];
      insertIndex?: number;
      lockedRowNumbers?: { [itemId: string]: string };
      numberingLocked?: boolean;
      sortOrderUpdates?: { itemId: string; sortOrder: string }[];
    },
    currentItems?: RundownItem[]
  ) => {
    if (currentUserId) {
      coordination.executeWithStructuralOperation(async () => {
        const sequenceNumber = coordination.getNextSequenceNumber();
        queueStructuralOperation(operationType, operationData, currentUserId, sequenceNumber);
      });
    }
  }, [currentUserId, queueStructuralOperation, coordination]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return hasPendingCellUpdates() || hasPendingStructuralOperations();
  }, [hasPendingCellUpdates, hasPendingStructuralOperations]);

  // Enhanced save function with coordination
  const enhancedSaveState = useCallback(async (currentState: RundownState) => {
    const hasCellChanges = hasPendingCellUpdates();
    const hasStructuralChanges = hasPendingStructuralOperations();

    if (!hasCellChanges && !hasStructuralChanges) {
      throw new Error('No changes to save');
    }

    if (hasStructuralChanges) {
      await coordination.executeWithStructuralOperation(async () => {
        await flushStructuralOperations();
      });
    }

    if (hasCellChanges) {
      await coordination.executeWithCellUpdate(async () => {
        await flushCellUpdates();
      });
    }

    return;
  }, [hasPendingCellUpdates, hasPendingStructuralOperations, flushStructuralOperations, flushCellUpdates, coordination]);

  // Combine cell and structural failed saves count
  const getTotalFailedSavesCount = useCallback(() => {
    return getFailedSavesCount() + getFailedStructuralOperationsCount();
  }, [getFailedSavesCount, getFailedStructuralOperationsCount]);

  // Retry both cell and structural failures
  const retryAllFailedSaves = useCallback(async () => {
    await retryFailedSaves();
    await retryFailedStructuralOperations();
  }, [retryFailedSaves, retryFailedStructuralOperations]);

  return {
    trackFieldChange,
    saveState: enhancedSaveState,
    hasUnsavedChanges,
    handleStructuralOperation,
    retryFailedSaves: retryAllFailedSaves,
    getFailedSavesCount: getTotalFailedSavesCount
  };
};

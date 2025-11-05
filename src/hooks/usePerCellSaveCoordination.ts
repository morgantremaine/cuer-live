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
  isTypingActive?: () => boolean;
  saveInProgressRef?: React.MutableRefObject<boolean>;
  typingIdleMs?: number;
  onConflictDetected?: (conflict: { currentState: any; currentDocVersion: number; localUpdates: any[] }) => void;
}

export const usePerCellSaveCoordination = ({
  rundownId,
  isPerCellEnabled,
  currentUserId,
  onSaveComplete,
  onSaveStart,
  onUnsavedChanges,
  onChangesSaved,
  isTypingActive,
  saveInProgressRef,
  typingIdleMs,
  onConflictDetected
}: PerCellSaveOptions) => {
  const lastSavedStateRef = useRef<RundownState | null>(null);

  // Coordination system for managing concurrent operations
  const coordination = useCellUpdateCoordination();

  // Cell-level save system - per-cell save is always enabled
  const handleCellSaveComplete = useCallback((savedUpdates?: any[], completionCount?: number) => {
    if (onSaveComplete) {
      onSaveComplete(completionCount);
    }
  }, [onSaveComplete]);

  const {
    trackCellChange,
    flushPendingUpdates: flushCellUpdates,
    hasPendingUpdates: hasPendingCellUpdates
  } = useCellLevelSave(rundownId, handleCellSaveComplete, onSaveStart, onUnsavedChanges, onChangesSaved, isTypingActive, saveInProgressRef, typingIdleMs, onConflictDetected);

  // Structural save system for row operations
  const {
    queueStructuralOperation,
    flushPendingOperations: flushStructuralOperations,
    hasPendingOperations: hasPendingStructuralOperations
  } = useStructuralSave(rundownId, onSaveComplete, onSaveStart, onUnsavedChanges, currentUserId);

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

  // Initialize saved state baseline (no-op for per-cell save)
  const initializeBaseline = useCallback((state: RundownState) => {
    lastSavedStateRef.current = JSON.parse(JSON.stringify(state));
  }, []);

  // Handle structural operations with enhanced coordination and content snapshot
  const handleStructuralOperation = useCallback((
    operationType: 'add_row' | 'delete_row' | 'move_rows' | 'copy_rows' | 'reorder' | 'add_header',
    operationData: {
      items?: RundownItem[];
      order?: string[];
      deletedIds?: string[];
      newItems?: RundownItem[];
      insertIndex?: number;
      lockedRowNumbers?: { [itemId: string]: string };
      numberingLocked?: boolean;
    },
    currentItems?: RundownItem[]
  ) => {
    if (currentUserId) {
      coordination.executeWithStructuralOperation(async () => {
        const sequenceNumber = coordination.getNextSequenceNumber();
        // Include content snapshot to prevent race conditions with concurrent edits
        const dataWithSnapshot = {
          ...operationData,
          contentSnapshot: currentItems || operationData.items
        };
        queueStructuralOperation(operationType, dataWithSnapshot, currentUserId, sequenceNumber);
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

  return {
    trackFieldChange,
    saveState: enhancedSaveState,
    initializeBaseline,
    hasUnsavedChanges,
    handleStructuralOperation
  };
};

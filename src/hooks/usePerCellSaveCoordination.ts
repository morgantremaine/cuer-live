import { useCallback, useRef } from 'react';
import { RundownState } from './useRundownState';
import { useCellLevelSave } from './useCellLevelSave';
import { useFieldDeltaSave } from './useFieldDeltaSave';
import { useStructuralSave } from './useStructuralSave';
import { useCellUpdateCoordination } from './useCellUpdateCoordination';
import { debugLogger } from '@/utils/debugLogger';
import { RundownItem } from '@/types/rundown';

interface PerCellSaveOptions {
  rundownId: string | null;
  isPerCellEnabled: boolean;
  currentUserId?: string;
  onSaveComplete?: () => void; // Add callback for when saves complete
  onSaveStart?: () => void; // Add callback for when saves start
  onUnsavedChanges?: () => void; // Add callback for unsaved changes
  onChangesSaved?: () => void; // Add callback for when changes are saved (queue cleared)
  isTypingActive?: () => boolean; // Typing detection from main autosave
  saveInProgressRef?: React.MutableRefObject<boolean>; // Save state from main autosave
  typingIdleMs?: number; // Timing configuration from main autosave
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
  typingIdleMs
}: PerCellSaveOptions) => {
  const lastSavedStateRef = useRef<RundownState | null>(null);

  // Coordination system for managing concurrent operations
  const coordination = useCellUpdateCoordination();

  // Cell-level save system with typing awareness (no trackOwnUpdate needed - uses centralized tracker)
  const {
    trackCellChange,
    flushPendingUpdates: flushCellUpdates,
    hasPendingUpdates: hasPendingCellUpdates
  } = useCellLevelSave(rundownId, onSaveComplete, onSaveStart, onUnsavedChanges, onChangesSaved, isTypingActive, saveInProgressRef, typingIdleMs);

  // Delta save system (fallback - no trackOwnUpdate needed)
  const {
    saveDeltaState,
    initializeSavedState,
    trackFieldChange: trackDeltaFieldChange
  } = useFieldDeltaSave(rundownId);

  // Structural save system (for per-cell mode - no trackOwnUpdate needed)
  const {
    queueStructuralOperation,
    flushPendingOperations: flushStructuralOperations,
    hasPendingOperations: hasPendingStructuralOperations
  } = useStructuralSave(rundownId, onSaveComplete, onSaveStart, onUnsavedChanges, currentUserId);

  // Unified field tracking - routes to appropriate system
  const trackFieldChange = useCallback((itemId: string | undefined, field: string, value: any) => {
    if (isPerCellEnabled) {
      trackCellChange(itemId, field, value);
    } else {
      trackDeltaFieldChange(itemId, field, value);
    }
  }, [isPerCellEnabled, trackCellChange, trackDeltaFieldChange]);

  // Unified save function
  const saveState = useCallback(async (currentState: RundownState) => {
    if (isPerCellEnabled) {
      // Per-cell save: flush any pending cell updates
      if (hasPendingCellUpdates()) {
        debugLogger.autosave('Per-cell save: flushing pending updates');
        return await flushCellUpdates();
      } else {
        debugLogger.autosave('Per-cell save: no pending updates to flush');
        throw new Error('No changes to save');
      }
    } else {
      // Delta save: use existing delta system
      debugLogger.autosave('Delta save: saving state deltas');
      return await saveDeltaState(currentState);
    }
  }, [isPerCellEnabled, hasPendingCellUpdates, flushCellUpdates, saveDeltaState]);

  // Initialize saved state baseline
  const initializeBaseline = useCallback((state: RundownState) => {
    lastSavedStateRef.current = JSON.parse(JSON.stringify(state));
    
    if (!isPerCellEnabled) {
      initializeSavedState(state);
    }
  }, [isPerCellEnabled, initializeSavedState]);

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
    currentItems?: RundownItem[] // Pass current items for snapshot
  ) => {
    if (isPerCellEnabled && currentUserId) {
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
  }, [isPerCellEnabled, currentUserId, queueStructuralOperation, coordination]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (isPerCellEnabled) {
      return hasPendingCellUpdates() || hasPendingStructuralOperations();
    }
    return false;
  }, [isPerCellEnabled, hasPendingCellUpdates, hasPendingStructuralOperations]);

  // Enhanced save function with coordination
  const enhancedSaveState = useCallback(async (currentState: RundownState) => {
    if (isPerCellEnabled) {
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
    } else {
      return await saveDeltaState(currentState);
    }
  }, [isPerCellEnabled, hasPendingCellUpdates, hasPendingStructuralOperations, flushStructuralOperations, flushCellUpdates, saveDeltaState, coordination]);

  return {
    trackFieldChange,
    saveState: enhancedSaveState,
    initializeBaseline,
    hasUnsavedChanges,
    handleStructuralOperation,
    isPerCellEnabled
  };
};
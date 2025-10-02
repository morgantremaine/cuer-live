import { useCallback, useRef } from 'react';
import { RundownState } from './useRundownState';
import { useCellLevelSave } from './useCellLevelSave';
import { useCellUpdateCoordination } from './useCellUpdateCoordination';
import { debugLogger } from '@/utils/debugLogger';
import { RundownItem } from '@/types/rundown';

interface PerCellSaveOptions {
  rundownId: string | null;
  currentUserId?: string;
  onSaveComplete?: () => void; // Add callback for when saves complete
  onSaveStart?: () => void; // Add callback for when saves start
  onUnsavedChanges?: () => void; // Add callback for unsaved changes
  onChangesSaved?: () => void; // Add callback for when changes are saved (queue cleared)
  saveInProgressRef?: React.MutableRefObject<boolean>; // Save state from main autosave
  typingIdleMs?: number; // Timing configuration from main autosave
}

export const usePerCellSaveCoordination = ({
  rundownId,
  currentUserId,
  onSaveComplete,
  onSaveStart,
  onUnsavedChanges,
  onChangesSaved,
  saveInProgressRef,
  typingIdleMs
}: PerCellSaveOptions) => {
  const lastSavedStateRef = useRef<RundownState | null>(null);

  // Coordination system for managing concurrent operations
  const coordination = useCellUpdateCoordination();

  // Cell-level save system with direct database saves
  const {
    trackCellChange,
    flushPendingUpdates: flushCellUpdates,
    hasPendingUpdates: hasPendingCellUpdates
  } = useCellLevelSave(rundownId, onSaveComplete, onSaveStart, onUnsavedChanges, onChangesSaved, undefined, saveInProgressRef, typingIdleMs);

  // Field change tracking - routes to per-cell save system
  const trackFieldChange = useCallback((itemId: string | undefined, field: string, value: any) => {
    console.log('🧪 PER-CELL SAVE: trackFieldChange called', {
      itemId,
      field,
      value: typeof value === 'string' ? value.substring(0, 50) : value,
      rundownId
    });
    
    trackCellChange(itemId, field, value);
    debugLogger.autosave(`Per-cell save: tracked ${field} change`);
  }, [trackCellChange, rundownId]);

  // Save function - flushes pending updates
  const saveState = useCallback(async (currentState: RundownState) => {
    if (hasPendingCellUpdates()) {
      debugLogger.autosave('Per-cell save: flushing pending updates');
      return await flushCellUpdates();
    } else {
      debugLogger.autosave('Per-cell save: no pending updates to flush');
      throw new Error('No changes to save');
    }
  }, [hasPendingCellUpdates, flushCellUpdates]);

  // Initialize saved state baseline
  const initializeBaseline = useCallback((state: RundownState) => {
    console.log('🧪 PER-CELL SAVE: Initializing baseline', {
      rundownId,
      itemCount: state.items?.length || 0
    });
    
    lastSavedStateRef.current = JSON.parse(JSON.stringify(state));
    debugLogger.autosave('Initialized baseline for per-cell save');
  }, [rundownId]);

  // Structural operations are handled by the direct save system
  // This placeholder maintains API compatibility
  const handleStructuralOperation = useCallback(async (
    operationType: 'add_row' | 'delete_row' | 'move_rows' | 'copy_rows' | 'reorder' | 'add_header',
    operationData: {
      items?: RundownItem[];
      order?: string[];
      deletedIds?: string[];
      newItems?: RundownItem[];
      insertIndex?: number;
    }
  ) => {
    // Structural operations handled by direct save system in parent components
    console.log('⚠️ Structural operation called on deprecated path', {
      operationType,
      rundownId
    });
  }, [rundownId]);

  // Check if there are unsaved changes (only cell-level now)
  const hasUnsavedChanges = useCallback(() => {
    const cellChanges = hasPendingCellUpdates();
    return cellChanges;
  }, [hasPendingCellUpdates]);

  // Enhanced save function for cell-level changes only
  const enhancedSaveState = useCallback(async (currentState: RundownState) => {
    const hasCellChanges = hasPendingCellUpdates();

    if (!hasCellChanges) {
      debugLogger.autosave('Per-cell save: no pending changes to flush');
      throw new Error('No changes to save');
    }

    // Flush cell updates with coordination
    await coordination.executeWithCellUpdate(async () => {
      debugLogger.autosave('Per-cell save: coordinated flush of cell updates');
      await flushCellUpdates();
    });

    return;
  }, [hasPendingCellUpdates, flushCellUpdates, coordination]);

  return {
    trackFieldChange,
    saveState: enhancedSaveState,
    initializeBaseline,
    hasUnsavedChanges,
    handleStructuralOperation
  };
};
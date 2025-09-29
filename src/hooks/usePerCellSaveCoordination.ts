import { useCallback, useRef } from 'react';
import { RundownState } from './useRundownState';
import { useCellLevelSave } from './useCellLevelSave';
import { useFieldDeltaSave } from './useFieldDeltaSave';
import { debugLogger } from '@/utils/debugLogger';

interface PerCellSaveOptions {
  rundownId: string | null;
  trackOwnUpdate: (timestamp: string) => void;
  isPerCellEnabled: boolean;
}

export const usePerCellSaveCoordination = ({
  rundownId,
  trackOwnUpdate,
  isPerCellEnabled
}: PerCellSaveOptions) => {
  const lastSavedStateRef = useRef<RundownState | null>(null);

  // Cell-level save system
  const {
    trackCellChange,
    flushPendingUpdates: flushCellUpdates,
    hasPendingUpdates: hasPendingCellUpdates
  } = useCellLevelSave(rundownId, trackOwnUpdate);

  // Delta save system (fallback)
  const {
    saveDeltaState,
    initializeSavedState,
    trackFieldChange: trackDeltaFieldChange
  } = useFieldDeltaSave(rundownId, trackOwnUpdate);

  // Unified field tracking - routes to appropriate system
  const trackFieldChange = useCallback((itemId: string | undefined, field: string, value: any) => {
    console.log('🧪 SAVE COORDINATION: trackFieldChange called', {
      itemId,
      field,
      value: typeof value === 'string' ? value.substring(0, 50) : value,
      isPerCellEnabled,
      rundownId
    });
    
    if (isPerCellEnabled) {
      // Use cell-level save system
      console.log('🧪 SAVE COORDINATION: Routing to per-cell save system');
      trackCellChange(itemId, field, value);
      debugLogger.autosave(`Per-cell save: tracked ${field} change`);
    } else {
      // Use delta save system
      console.log('🧪 SAVE COORDINATION: Routing to delta save system');
      trackDeltaFieldChange(itemId, field, value);
      debugLogger.autosave(`Delta save: tracked ${field} change`);
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
    console.log('🧪 SAVE COORDINATION: Initializing baseline', {
      isPerCellEnabled,
      rundownId,
      itemCount: state.items?.length || 0
    });
    
    lastSavedStateRef.current = JSON.parse(JSON.stringify(state));
    
    if (!isPerCellEnabled) {
      // Only initialize delta system if not using per-cell
      console.log('🧪 SAVE COORDINATION: Initializing delta save system');
      initializeSavedState(state);
    } else {
      console.log('🧪 SAVE COORDINATION: Skipping delta initialization for per-cell save');
    }
    
    debugLogger.autosave(`Initialized baseline for ${isPerCellEnabled ? 'per-cell' : 'delta'} save`);
  }, [isPerCellEnabled, initializeSavedState]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (isPerCellEnabled) {
      return hasPendingCellUpdates();
    } else {
      // For delta system, we'd need to check if current state differs from saved
      // This is handled by the calling autosave system
      return false;
    }
  }, [isPerCellEnabled, hasPendingCellUpdates]);

  return {
    trackFieldChange,
    saveState,
    initializeBaseline,
    hasUnsavedChanges,
    isPerCellEnabled
  };
};
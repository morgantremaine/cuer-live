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
  trackOwnUpdate: (timestamp: string) => void;
  isPerCellEnabled: boolean;
  currentUserId?: string;
}

export const usePerCellSaveCoordination = ({
  rundownId,
  trackOwnUpdate,
  isPerCellEnabled,
  currentUserId
}: PerCellSaveOptions) => {
  const lastSavedStateRef = useRef<RundownState | null>(null);

  // Coordination system for managing concurrent operations
  const coordination = useCellUpdateCoordination();

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

  // Structural save system (for per-cell mode)
  const {
    queueStructuralOperation,
    flushPendingOperations: flushStructuralOperations,
    hasPendingOperations: hasPendingStructuralOperations
  } = useStructuralSave(rundownId, trackOwnUpdate);

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

  // Handle structural operations with enhanced coordination
  const handleStructuralOperation = useCallback((
    operationType: 'add_row' | 'delete_row' | 'move_rows' | 'copy_rows' | 'reorder' | 'add_header',
    operationData: {
      items?: RundownItem[];
      order?: string[];
      deletedIds?: string[];
      newItems?: RundownItem[];
      insertIndex?: number;
    }
  ) => {
    console.log('🧪 SAVE COORDINATION: Coordinated structural operation', {
      operationType,
      isPerCellEnabled,
      currentUserId,
      rundownId
    });

    if (isPerCellEnabled && currentUserId) {
      // Use coordination system to manage the structural operation
      coordination.executeWithStructuralOperation(async () => {
        const sequenceNumber = coordination.getNextSequenceNumber();
        
        console.log('🧪 SAVE COORDINATION: Executing coordinated structural operation', {
          operationType,
          sequenceNumber
        });
        
        queueStructuralOperation(operationType, operationData, currentUserId, sequenceNumber);
        debugLogger.autosave(`Coordinated per-cell structural save: ${operationType} (seq: ${sequenceNumber})`);
      });
    } else {
      // For delta mode, structural operations fall back to full autosave
      console.log('🧪 SAVE COORDINATION: Structural operation in delta mode - letting autosave handle it');
      debugLogger.autosave(`Delta mode structural operation: ${operationType} (handled by autosave)`);
    }
  }, [isPerCellEnabled, currentUserId, queueStructuralOperation, rundownId, coordination]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (isPerCellEnabled) {
      const cellChanges = hasPendingCellUpdates();
      const structuralChanges = hasPendingStructuralOperations();
      console.log('🧪 SAVE COORDINATION: Checking unsaved changes', {
        cellChanges,
        structuralChanges,
        total: cellChanges || structuralChanges
      });
      return cellChanges || structuralChanges;
    } else {
      // For delta system, we'd need to check if current state differs from saved
      // This is handled by the calling autosave system
      return false;
    }
  }, [isPerCellEnabled, hasPendingCellUpdates, hasPendingStructuralOperations]);

  // Enhanced save function with coordination
  const enhancedSaveState = useCallback(async (currentState: RundownState) => {
    if (isPerCellEnabled) {
      const hasCellChanges = hasPendingCellUpdates();
      const hasStructuralChanges = hasPendingStructuralOperations();
      
      console.log('🧪 SAVE COORDINATION: Coordinated enhanced save state', {
        hasCellChanges,
        hasStructuralChanges,
        totalChanges: hasCellChanges || hasStructuralChanges
      });

      if (!hasCellChanges && !hasStructuralChanges) {
        debugLogger.autosave('Per-cell save: no pending changes to flush');
        throw new Error('No changes to save');
      }

      // Use coordination system to ensure proper sequencing
      if (hasStructuralChanges) {
        await coordination.executeWithStructuralOperation(async () => {
          debugLogger.autosave('Per-cell save: coordinated flush of structural operations');
          await flushStructuralOperations();
        });
      }

      if (hasCellChanges) {
        await coordination.executeWithCellUpdate(async () => {
          debugLogger.autosave('Per-cell save: coordinated flush of cell updates');
          await flushCellUpdates();
        });
      }

      return;
    } else {
      // Delta save: use existing delta system
      debugLogger.autosave('Delta save: saving state deltas');
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
import { useCallback, useRef } from 'react';
import { RundownState } from './useRundownState';
import { useCellLevelSave } from './useCellLevelSave';
import { useStructuralSave } from './useStructuralSave';
import { useCellUpdateCoordination } from './useCellUpdateCoordination';
import { useOperationCoordinator } from './useOperationCoordinator';
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
  
  // Advanced operation coordinator for race condition prevention
  const operationCoordinator = useOperationCoordinator();

  // Cell-level save system without typing awareness (operations handle sync)
  const {
    trackCellChange,
    flushPendingUpdates: flushCellUpdates,
    hasPendingUpdates: hasPendingCellUpdates
  } = useCellLevelSave(rundownId, onSaveComplete, onSaveStart, onUnsavedChanges, onChangesSaved, undefined, saveInProgressRef, typingIdleMs);

  // Structural save system for row operations
  const {
    queueStructuralOperation,
    flushPendingOperations: flushStructuralOperations,
    hasPendingOperations: hasPendingStructuralOperations
  } = useStructuralSave(rundownId, onSaveComplete, onSaveStart, onUnsavedChanges, currentUserId);

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

  // Handle structural operations with advanced coordination
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
    console.log('🧪 PER-CELL STRUCTURAL: Coordinated operation', {
      operationType,
      currentUserId,
      rundownId
    });

    if (currentUserId) {
      // Collect affected item IDs for race condition analysis
      const affectedItemIds = [
        ...(operationData.items?.map(item => item.id) || []),
        ...(operationData.newItems?.map(item => item.id) || []),
        ...(operationData.deletedIds || [])
      ];

      // Use advanced operation coordinator with metadata
      operationCoordinator.executeWithCoordination(
        `structural-${Date.now()}`,
        operationType,
        {
          affectedItemIds,
          operationType: 'structural'
        },
        async () => {
          // Execute the actual structural operation with basic coordination
          await coordination.executeWithStructuralOperation(async () => {
            const sequenceNumber = coordination.getNextSequenceNumber();
            
            console.log('🧪 PER-CELL STRUCTURAL: Executing coordinated operation', {
              operationType,
              sequenceNumber,
              affectedItemIds
            });
            
            queueStructuralOperation(operationType, operationData, currentUserId, sequenceNumber);
            debugLogger.autosave(`Coordinated structural save: ${operationType} (seq: ${sequenceNumber})`);
          });
        }
      );
    } else {
      console.warn('🚨 PER-CELL STRUCTURAL: No user ID - cannot save');
    }
  }, [currentUserId, queueStructuralOperation, rundownId, coordination, operationCoordinator]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    const cellChanges = hasPendingCellUpdates();
    const structuralChanges = hasPendingStructuralOperations();
    console.log('🧪 PER-CELL SAVE: Checking unsaved changes', {
      cellChanges,
      structuralChanges,
      total: cellChanges || structuralChanges
    });
    return cellChanges || structuralChanges;
  }, [hasPendingCellUpdates, hasPendingStructuralOperations]);

  // Enhanced save function with coordination (bypasses doc_version)
  const enhancedSaveState = useCallback(async (currentState: RundownState) => {
    const hasCellChanges = hasPendingCellUpdates();
    const hasStructuralChanges = hasPendingStructuralOperations();
    
    console.log('🧪 PER-CELL SAVE: Enhanced save - bypassing doc_version logic', {
      hasCellChanges,
      hasStructuralChanges,
      totalChanges: hasCellChanges || hasStructuralChanges
    });

    if (!hasCellChanges && !hasStructuralChanges) {
      debugLogger.autosave('Per-cell save: no pending changes to flush');
      throw new Error('No changes to save');
    }

    // Use coordination system to ensure proper sequencing (no doc_version conflicts)
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
  }, [hasPendingCellUpdates, hasPendingStructuralOperations, flushStructuralOperations, flushCellUpdates, coordination]);

  return {
    trackFieldChange,
    saveState: enhancedSaveState,
    initializeBaseline,
    hasUnsavedChanges,
    handleStructuralOperation
  };
};
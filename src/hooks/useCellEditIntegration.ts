import { useCallback, useState } from 'react';
import { usePerCellSaveCoordination } from './usePerCellSaveCoordination';
import { cellBroadcast } from '@/utils/cellBroadcast';
import { getTabId } from '@/utils/tabUtils';

interface CellEditIntegrationProps {
  rundownId: string | null;
  isPerCellEnabled: boolean;
  userId?: string;
  userName?: string;
  onSaveComplete?: (completionCount?: number) => void;
  onSaveStart?: () => void;
  onUnsavedChanges?: () => void;
}

/**
 * Integration hook that connects cell editing UI components with the per-cell save system.
 * This replaces the need for full document saves when individual cells are edited.
 */
export const useCellEditIntegration = ({
  rundownId,
  isPerCellEnabled,
  userId,
  userName,
  onSaveComplete,
  onSaveStart,
  onUnsavedChanges
}: CellEditIntegrationProps) => {
  const [isPerCellSaving, setIsPerCellSaving] = useState(false);
  const [hasPerCellUnsavedChanges, setHasPerCellUnsavedChanges] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Get the coordinated save system (no trackOwnUpdate needed - uses centralized tracker)
  const coordination = usePerCellSaveCoordination({
    rundownId,
    isPerCellEnabled,
    currentUserId: userId,
    onSaveComplete: (completionCount?: number) => {
      setIsPerCellSaving(false);
      setHasPerCellUnsavedChanges(false);
      setSaveError(null); // Clear error on successful save
      onSaveComplete?.(completionCount);
    },
    onSaveStart: () => {
      setIsPerCellSaving(true);
      onSaveStart?.();
    },
    onUnsavedChanges: () => {
      setHasPerCellUnsavedChanges(true);
      onUnsavedChanges?.();
    },
    onSaveError: (error: string) => {
      setSaveError(error);
    }
  });

  // Handle cell value changes from editing components
  const handleCellChange = useCallback((
    itemId: string | undefined,
    fieldName: string,
    newValue: any
  ) => {
    if (!isPerCellEnabled) {
      return;
    }

    // Track the field change in the per-cell system
    coordination.trackFieldChange(itemId, fieldName, newValue);
  }, [isPerCellEnabled, coordination.trackFieldChange]);

  // Handle when user starts editing a cell - broadcasts focus state
  const handleCellEditStart = useCallback((
    itemId: string | undefined,
    fieldName: string,
    currentValue: any
  ) => {
    console.log('🔔 handleCellEditStart called', { rundownId, userId, userName, itemId, fieldName });
    
    if (!rundownId || userId === undefined || !userName) {
      console.log('⏭️ Skipping broadcast - missing required data', { rundownId, userId, userName });
      return;
    }

    const tabId = getTabId();

    console.log('📤 Broadcasting cell focus (START)', { rundownId, itemId, fieldName, userId, userName, tabId });
    
    // Broadcast focus state to other users
    cellBroadcast.broadcastCellFocus(
      rundownId,
      itemId || null,
      fieldName,
      userId,
      userName,
      tabId,
      true // isFocused = true
    );
  }, [rundownId, userId, userName]);

  // Handle when user finishes editing a cell - broadcasts blur state
  const handleCellEditComplete = useCallback((
    itemId: string | undefined,
    fieldName: string,
    finalValue: any
  ) => {
    console.log('🔔 handleCellEditComplete called', { rundownId, userId, userName, itemId, fieldName });
    
    if (!rundownId || userId === undefined || !userName) {
      console.log('⏭️ Skipping broadcast - missing required data', { rundownId, userId, userName });
      return;
    }

    const tabId = getTabId();

    console.log('📤 Broadcasting cell focus (COMPLETE)', { rundownId, itemId, fieldName, userId, userName, tabId });
    
    // Broadcast blur state to other users
    cellBroadcast.broadcastCellFocus(
      rundownId,
      itemId || null,
      fieldName,
      userId,
      userName,
      tabId,
      false // isFocused = false
    );
  }, [rundownId, userId, userName]);

  return {
    handleCellChange,
    handleCellEditStart,
    handleCellEditComplete,
    hasUnsavedChanges: hasPerCellUnsavedChanges,
    isPerCellEnabled,
    isPerCellSaving,
    saveError,
    // Expose coordination methods for structural operations
    saveCoordination: {
      handleStructuralOperation: coordination.handleStructuralOperation,
      retryFailedSaves: coordination.retryFailedSaves,
      getFailedSavesCount: coordination.getFailedSavesCount
    }
  };
};
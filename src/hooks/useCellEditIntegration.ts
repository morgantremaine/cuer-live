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

  // Get the coordinated save system (no trackOwnUpdate needed - uses centralized tracker)
  const { trackFieldChange, hasUnsavedChanges } = usePerCellSaveCoordination({
    rundownId,
    isPerCellEnabled,
    onSaveComplete: (completionCount?: number) => {
      setIsPerCellSaving(false);
      setHasPerCellUnsavedChanges(false);
      onSaveComplete?.(completionCount);
    },
    onSaveStart: () => {
      setIsPerCellSaving(true);
      onSaveStart?.();
    },
    onUnsavedChanges: () => {
      setHasPerCellUnsavedChanges(true);
      onUnsavedChanges?.();
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
    trackFieldChange(itemId, fieldName, newValue);
  }, [isPerCellEnabled, trackFieldChange]);

  // Handle when user starts editing a cell - broadcasts focus state
  const handleCellEditStart = useCallback((
    itemId: string | undefined,
    fieldName: string,
    currentValue: any
  ) => {
    if (!rundownId || !userId || !userName) {
      return;
    }

    const tabId = getTabId();

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
    if (!rundownId || !userId || !userName) {
      return;
    }

    const tabId = getTabId();

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
    isPerCellSaving
  };
};
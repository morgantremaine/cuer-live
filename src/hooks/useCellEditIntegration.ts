import { useCallback, useState } from 'react';
import { usePerCellSaveCoordination } from './usePerCellSaveCoordination';

interface CellEditIntegrationProps {
  rundownId: string | null;
  isPerCellEnabled: boolean;
  onSaveComplete?: (completionCount?: number) => void;
  onSaveStart?: () => void;
  onUnsavedChanges?: () => void;
  onBroadcastReady?: (savedUpdates: Array<{ itemId?: string; field: string; value: any }>) => void;
}

/**
 * Integration hook that connects cell editing UI components with the per-cell save system.
 * This replaces the need for full document saves when individual cells are edited.
 */
export const useCellEditIntegration = ({
  rundownId,
  isPerCellEnabled,
  onSaveComplete,
  onSaveStart,
  onUnsavedChanges,
  onBroadcastReady
}: CellEditIntegrationProps) => {
  const [isPerCellSaving, setIsPerCellSaving] = useState(false);
  const [hasPerCellUnsavedChanges, setHasPerCellUnsavedChanges] = useState(false);

  // Get the coordinated save system (no trackOwnUpdate needed - uses centralized tracker)
  const { trackFieldChange, hasUnsavedChanges } = usePerCellSaveCoordination({
    rundownId,
    isPerCellEnabled,
    onBroadcastReady,
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

  // Handle when user starts editing a cell (for LocalShadow integration)
  const handleCellEditStart = useCallback((
    itemId: string | undefined,
    fieldName: string,
    currentValue: any
  ) => {
    // Placeholder for future LocalShadow integration
  }, []);

  // Handle when user finishes editing a cell
  const handleCellEditComplete = useCallback((
    itemId: string | undefined,
    fieldName: string,
    finalValue: any
  ) => {
    // No-op: handleCellChange already tracked the change
    // This prevents duplicate tracking
  }, []);

  return {
    handleCellChange,
    handleCellEditStart,
    handleCellEditComplete,
    hasUnsavedChanges: hasPerCellUnsavedChanges,
    isPerCellEnabled,
    isPerCellSaving
  };
};
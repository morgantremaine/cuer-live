import { useCallback, useRef, useState } from 'react';
import { usePerCellSaveCoordination } from './usePerCellSaveCoordination';
import { debugLogger } from '@/utils/debugLogger';

interface CellEditIntegrationProps {
  rundownId: string | null;
  isPerCellEnabled: boolean;
  onSaveComplete?: () => void;
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
  onSaveComplete,
  onSaveStart,
  onUnsavedChanges
}: CellEditIntegrationProps) => {
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const [isPerCellSaving, setIsPerCellSaving] = useState(false);
  const [hasPerCellUnsavedChanges, setHasPerCellUnsavedChanges] = useState(false);

  // Get the coordinated save system (no trackOwnUpdate needed - uses centralized tracker)
  const { trackFieldChange, hasUnsavedChanges } = usePerCellSaveCoordination({
    rundownId,
    isPerCellEnabled,
    onSaveComplete: () => {
      console.log('🧪 CELL EDIT INTEGRATION: Per-cell save completed');
      setIsPerCellSaving(false);
      setHasPerCellUnsavedChanges(false);
      if (onSaveComplete) {
        onSaveComplete();
      }
    },
    onSaveStart: () => {
      console.log('🧪 CELL EDIT INTEGRATION: Per-cell save started');
      setIsPerCellSaving(true);
      if (onSaveStart) {
        onSaveStart();
      }
    },
    onUnsavedChanges: () => {
      console.log('🧪 CELL EDIT INTEGRATION: Per-cell unsaved changes detected');
      setHasPerCellUnsavedChanges(true);
      if (onUnsavedChanges) {
        onUnsavedChanges();
      }
    }
  });

  // Handle cell value changes from editing components
  const handleCellChange = useCallback((
    itemId: string | undefined,
    fieldName: string,
    newValue: any
  ) => {
    console.log('🧪 CELL EDIT INTEGRATION: handleCellChange called', {
      itemId,
      fieldName,
      newValue: typeof newValue === 'string' ? newValue.substring(0, 50) : newValue,
      isPerCellEnabled,
      rundownId
    });
    
    if (!isPerCellEnabled) {
      // Fallback to normal change tracking for non-per-cell rundowns
      console.log('🧪 CELL EDIT INTEGRATION: Per-cell disabled, using normal tracking');
      debugLogger.autosave(`Cell change (non-per-cell): ${fieldName} for item ${itemId || 'global'}`);
      return;
    }

    console.log('🧪 CELL EDIT INTEGRATION: Per-cell enabled, tracking field change');
    // Track the field change in the per-cell system
    trackFieldChange(itemId, fieldName, newValue);
    
    debugLogger.autosave(`Per-cell change tracked: ${fieldName} for item ${itemId || 'global'}`);

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // The save will be handled automatically by the per-cell system's debouncing
  }, [isPerCellEnabled, trackFieldChange]);

  // Handle when user starts editing a cell (for LocalShadow integration)
  const handleCellEditStart = useCallback((
    itemId: string | undefined,
    fieldName: string,
    currentValue: any
  ) => {
    if (!isPerCellEnabled) return;

    debugLogger.autosave(`Cell edit started: ${fieldName} for item ${itemId || 'global'}`);
    
    // The LocalShadow system will be managed by the underlying save coordination
    // This hook just provides the integration point for UI components
  }, [isPerCellEnabled]);

  // Handle when user finishes editing a cell
  const handleCellEditComplete = useCallback((
    itemId: string | undefined,
    fieldName: string,
    finalValue: any
  ) => {
    if (!isPerCellEnabled) return;

    debugLogger.autosave(`Cell edit completed: ${fieldName} for item ${itemId || 'global'}`);
    
    // Final value change will trigger the coordinated save
    trackFieldChange(itemId, fieldName, finalValue);
  }, [isPerCellEnabled, trackFieldChange]);

  return {
    handleCellChange,
    handleCellEditStart,
    handleCellEditComplete,
    hasUnsavedChanges: hasPerCellUnsavedChanges,
    isPerCellEnabled,
    isPerCellSaving
  };
};
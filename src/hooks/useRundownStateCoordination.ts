
import { useCallback, useMemo, useRef } from 'react';
import { useRundownGridCore } from './useRundownGridCore';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownGridUI } from './useRundownGridUI';
import { useResizableColumns } from './useResizableColumns';

export const useRundownStateCoordination = () => {
  const coreState = useRundownGridCore();
  
  // Stable refs to prevent infinite loops
  const stableUpdateItemRef = useRef(coreState.updateItem);
  const stableMarkAsChangedRef = useRef(coreState.markAsChanged);
  
  // Update refs when core functions change
  stableUpdateItemRef.current = coreState.updateItem;
  stableMarkAsChangedRef.current = coreState.markAsChanged;

  // Stable color selection function
  const handleColorSelection = useCallback((id: string, color: string) => {
    stableUpdateItemRef.current(id, 'color', color);
    stableMarkAsChangedRef.current();
  }, []);

  // Use resizable columns with width change handler
  const { getColumnWidth, updateColumnWidth } = useResizableColumns(
    coreState.columns, 
    coreState.handleUpdateColumnWidth
  );

  // Get interaction handlers
  const interactions = useRundownGridInteractions(
    coreState.items,
    coreState.setItems,
    coreState.updateItem,
    coreState.addRow,
    coreState.addHeader,
    coreState.deleteRow,
    coreState.toggleFloatRow,
    coreState.deleteMultipleRows,
    coreState.addMultipleRows,
    coreState.handleDeleteColumn,
    coreState.calculateEndTime,
    handleColorSelection,
    coreState.markAsChanged,
    coreState.setRundownTitle
  );

  // Get UI state
  const uiState = useRundownGridUI(
    coreState.items,
    coreState.visibleColumns,
    coreState.columns,
    coreState.updateItem,
    coreState.currentSegmentId,
    coreState.currentTime,
    coreState.markAsChanged
  );

  // Override the UI state's selectColor with our stable version and include updateTrigger
  const stableUIState = useMemo(() => ({
    ...uiState,
    selectColor: handleColorSelection,
    getColumnWidth,
    updateColumnWidth
  }), [uiState, handleColorSelection, getColumnWidth, updateColumnWidth]);

  // Memoize the complete state with updateTrigger as a dependency to force re-calculation
  return useMemo(() => ({
    coreState,
    interactions,
    uiState: stableUIState
  }), [
    coreState,
    interactions,
    stableUIState,
    coreState.updateTrigger // Include updateTrigger to force re-calculation on remote updates
  ]);
};

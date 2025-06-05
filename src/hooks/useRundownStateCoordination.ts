
import { useCallback, useMemo, useRef } from 'react';
import { useRundownCoreState } from './useRundownCoreState';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownGridUI } from './useRundownGridUI';
import { useResizableColumns } from './useResizableColumns';

export const useRundownStateCoordination = () => {
  const coreState = useRundownCoreState();
  
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

  // Create adapter functions for interactions
  const adaptedAddRow = useCallback((calculateEndTime: any, insertAfterIndex?: number) => {
    coreState.addRow(calculateEndTime, insertAfterIndex);
  }, [coreState.addRow]);

  const adaptedAddHeader = useCallback((insertAfterIndex?: number) => {
    coreState.addHeader(insertAfterIndex);
  }, [coreState.addHeader]);

  // Get interaction handlers
  const interactions = useRundownGridInteractions(
    coreState.items,
    coreState.setItems,
    coreState.updateItem,
    adaptedAddRow,
    adaptedAddHeader,
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

  // Memoize the complete state object
  const stableUIState = useMemo(() => ({
    ...uiState,
    selectColor: handleColorSelection,
    getColumnWidth,
    updateColumnWidth
  }), [uiState, handleColorSelection, getColumnWidth, updateColumnWidth]);

  return {
    coreState,
    interactions,
    uiState: stableUIState
  };
};

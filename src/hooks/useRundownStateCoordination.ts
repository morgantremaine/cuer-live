
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

  // Create adapter functions that match the expected signatures for useRundownGridInteractions
  // These functions need to match the signature: (calculateEndTime: any, insertAfterIndex?: number) => void
  const adaptedAddRow = useCallback((calculateEndTime: any, insertAfterIndex?: number) => {
    // Call the core addRow function with just the calculateEndTime function
    // The core function may have a different signature, so we'll call it with the expected parameters
    coreState.addRow(calculateEndTime);
  }, [coreState.addRow]);

  const adaptedAddHeader = useCallback((insertAfterIndex?: number) => {
    // Call the core addHeader function without the insertAfterIndex parameter
    // The core function may have a different signature
    coreState.addHeader();
  }, [coreState.addHeader]);

  // Get interaction handlers - use adapted functions with correct signatures
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

  // Override the UI state's selectColor with our stable version
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

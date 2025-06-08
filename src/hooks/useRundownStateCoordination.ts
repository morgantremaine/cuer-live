
import { useCallback, useMemo, useRef } from 'react';
import { useRundownGridCore } from './useRundownGridCore';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownGridUI } from './useRundownGridUI';
import { useResizableColumns } from './useResizableColumns';
import { useCellNavigation } from './useCellNavigation';

export const useRundownStateCoordination = () => {
  const coreState = useRundownGridCore();
  
  // Stable refs to prevent infinite loops
  const stableUpdateItemRef = useRef(coreState.updateItem);
  const stableMarkAsChangedRef = useRef(coreState.markAsChanged);
  
  // Simple cellRefs storage with stable reference (kept for compatibility)
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});
  
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

  // Use the new cell navigation system
  const { handleCellNavigation } = useCellNavigation(coreState.items);

  // Simple cell click handler - completely stable
  const handleCellClick = useCallback((itemId: string, field: string) => {
    // Just log for now, can be expanded if needed
    console.log('Cell clicked:', itemId, field);
  }, []);

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

  // Override the UI state's selectColor with our stable version and add navigation
  const stableUIState = useMemo(() => ({
    ...uiState,
    selectColor: handleColorSelection,
    getColumnWidth,
    updateColumnWidth,
    handleCellClick,
    handleKeyDown: handleCellNavigation,
    cellRefs
  }), [uiState, handleColorSelection, getColumnWidth, updateColumnWidth, handleCellClick, handleCellNavigation]);

  return {
    coreState,
    interactions,
    uiState: stableUIState
  };
};

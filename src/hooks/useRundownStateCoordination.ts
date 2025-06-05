
import { useMemo } from 'react';
import { useRundownCoreState } from './useRundownCoreState';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownUIState } from './useRundownUIState';

export const useRundownStateCoordination = () => {
  // Get core state
  const coreState = useRundownCoreState();
  
  // Get interaction handlers - pass all required parameters with correct signatures
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
    coreState.selectColor,
    coreState.markAsChanged,
    coreState.setRundownTitle
  );
  
  // Get UI state - fix: provide the required parameters
  const uiState = useRundownUIState(
    coreState.items,
    coreState.visibleColumns,
    interactions.selectedRows,
    interactions.draggedItemIndex,
    interactions.isDraggingMultiple,
    interactions.dropTargetIndex,
    interactions.colorPickerRowId
  );

  // Memoize the coordinated state
  return useMemo(() => ({
    coreState,
    interactions,
    uiState
  }), [coreState, interactions, uiState]);
};

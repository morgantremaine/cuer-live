
import { useMemo } from 'react';
import { useRundownCoreState } from './useRundownCoreState';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownUIState } from './useRundownUIState';

export const useRundownStateCoordination = () => {
  // Get core state
  const coreState = useRundownCoreState();
  
  // Get interaction handlers - fix the setItems signature and add selectColor
  const interactions = useRundownGridInteractions(
    coreState.items,
    (items: any[]) => coreState.setItems(() => items), // Fix: wrap in function
    coreState.updateItem,
    coreState.addRow,
    coreState.addHeader,
    coreState.deleteRow,
    coreState.toggleFloatRow,
    coreState.deleteMultipleRows,
    coreState.addMultipleRows,
    coreState.handleDeleteColumn,
    coreState.calculateEndTime,
    coreState.selectColor, // Add selectColor from coreState
    coreState.markAsChanged,
    coreState.setRundownTitle
  );
  
  // Get UI state
  const uiState = useRundownUIState();

  // Memoize the coordinated state
  return useMemo(() => ({
    coreState,
    interactions,
    uiState
  }), [coreState, interactions, uiState]);
};

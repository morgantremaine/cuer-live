
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownData } from './useRundownData';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownUIState } from './useRundownUIState';
import { useRundownUndo } from './useRundownUndo';

export const useRundownStateCoordination = () => {
  const { id: rundownId } = useParams<{ id: string }>();
  
  // Core rundown data and operations
  const {
    items,
    setItems,
    columns,
    visibleColumns,
    title,
    setTitle,
    selectedRowId,
    handleRowSelection,
    clearRowSelection,
    currentTime,
    updateItem,
    deleteRow,
    deleteMultipleRows,
    addRow,
    addHeader,
    toggleFloatRow,
    getRowNumber,
    calculateHeaderDuration,
    scrollContainerRef,
    loading,
    error
  } = useRundownData(rundownId);

  // Undo functionality
  const { saveState: saveUndoState, undo, canUndo, lastAction } = useRundownUndo({
    rundownId,
    currentTitle: title,
    currentItems: items,
    currentColumns: columns
  });

  // Interactive behaviors with undo support
  const interactions = useRundownGridInteractions({
    items,
    setItems,
    deleteRow,
    deleteMultipleRows,
    addRow,
    addHeader,
    scrollContainerRef,
    saveUndoState
  });

  // UI state management
  const uiState = useRundownUIState({
    items,
    columns,
    visibleColumns,
    updateItem,
    saveUndoState
  });

  // Core state object
  const coreState = useMemo(() => ({
    rundownId,
    items,
    columns,
    visibleColumns,
    title,
    setTitle,
    selectedRowId,
    handleRowSelection,
    clearRowSelection,
    currentTime,
    updateItem,
    deleteRow,
    deleteMultipleRows,
    addRow,
    addHeader,
    toggleFloatRow,
    getRowNumber,
    calculateHeaderDuration,
    loading,
    error,
    saveUndoState,
    undo,
    canUndo,
    lastAction
  }), [
    rundownId,
    items,
    columns,
    visibleColumns,
    title,
    setTitle,
    selectedRowId,
    handleRowSelection,
    clearRowSelection,
    currentTime,
    updateItem,
    deleteRow,
    deleteMultipleRows,
    addRow,
    addHeader,
    toggleFloatRow,
    getRowNumber,
    calculateHeaderDuration,
    loading,
    error,
    saveUndoState,
    undo,
    canUndo,
    lastAction
  ]);

  return {
    coreState,
    interactions,
    uiState
  };
};

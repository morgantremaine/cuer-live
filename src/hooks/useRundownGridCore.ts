
import { useCallback } from 'react';
import { useRundownCoreState } from './useRundownCoreState';
import { useRundownWrappedOperations } from './useRundownWrappedOperations';
import { useRundownKeyboardShortcuts } from './useRundownKeyboardShortcuts';

export const useRundownGridCore = () => {
  // Get all core state and functionality
  const coreState = useRundownCoreState();

  // Create wrapped operations with undo support
  const {
    wrappedAddRow,
    wrappedAddHeader,
    wrappedDeleteRow,
    wrappedDeleteMultipleRows,
    wrappedToggleFloatRow,
    wrappedSetItems,
    wrappedAddMultipleRows,
    wrappedSetRundownTitle
  } = useRundownWrappedOperations({
    items: coreState.items,
    columns: coreState.columns,
    rundownTitle: coreState.rundownTitle,
    saveState: coreState.saveState,
    addRow: coreState.addRow,
    addHeader: coreState.addHeader,
    deleteRow: coreState.deleteRow,
    deleteMultipleRows: coreState.deleteMultipleRows,
    toggleFloatRow: coreState.toggleFloatRow,
    setItems: coreState.setItems,
    addMultipleRows: coreState.addMultipleRows,
    setRundownTitle: coreState.setRundownTitle
  });

  const handleUndo = useCallback(() => {
    const action = coreState.undo(coreState.setItems, (cols) => coreState.handleLoadLayout(cols), coreState.setRundownTitleDirectly);
    if (action) {
      coreState.markAsChanged();
      console.log(`Undid: ${action}`);
    }
  }, [coreState]);

  // Set up keyboard shortcuts
  useRundownKeyboardShortcuts({
    canUndo: coreState.canUndo,
    handleUndo
  });

  return {
    // Basic state
    currentTime: coreState.currentTime,
    timezone: coreState.timezone,
    setTimezone: coreState.setTimezone,
    showColumnManager: coreState.showColumnManager,
    setShowColumnManager: coreState.setShowColumnManager,
    rundownTitle: coreState.rundownTitle,
    setRundownTitle: wrappedSetRundownTitle,
    rundownStartTime: coreState.rundownStartTime,
    setRundownStartTime: coreState.setRundownStartTime,
    rundownId: coreState.rundownId,
    markAsChanged: coreState.markAsChanged,

    // Items and data - use wrapped versions for undo support
    items: coreState.items,
    setItems: wrappedSetItems,
    updateItem: coreState.updateItem,
    addRow: wrappedAddRow,
    addHeader: wrappedAddHeader,
    deleteRow: wrappedDeleteRow,
    deleteMultipleRows: wrappedDeleteMultipleRows,
    addMultipleRows: wrappedAddMultipleRows,
    getRowNumber: coreState.getRowNumber,
    toggleFloatRow: wrappedToggleFloatRow,
    calculateTotalRuntime: coreState.calculateTotalRuntime,
    calculateHeaderDuration: coreState.calculateHeaderDuration,
    visibleColumns: coreState.visibleColumns,
    columns: coreState.columns,

    // Playback
    isPlaying: coreState.isPlaying,
    currentSegmentId: coreState.currentSegmentId,
    timeRemaining: coreState.timeRemaining,
    play: coreState.play,
    pause: coreState.pause,
    forward: coreState.forward,
    backward: coreState.backward,

    // Column management
    handleAddColumn: coreState.handleAddColumn,
    handleReorderColumns: coreState.handleReorderColumns,
    handleDeleteColumn: coreState.handleDeleteColumn,
    handleRenameColumn: coreState.handleRenameColumn,
    handleToggleColumnVisibility: coreState.handleToggleColumnVisibility,
    handleLoadLayout: coreState.handleLoadLayout,
    handleUpdateColumnWidth: coreState.handleUpdateColumnWidth,

    // Save state - now properly integrated with auto-save
    hasUnsavedChanges: coreState.hasUnsavedChanges,
    isSaving: coreState.isSaving,
    calculateEndTime: coreState.calculateEndTime,

    // Undo functionality
    handleUndo,
    canUndo: coreState.canUndo,
    lastAction: coreState.lastAction
  };
};

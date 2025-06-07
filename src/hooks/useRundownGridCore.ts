
import { useRundownBasicState } from './useRundownBasicState';
import { useRundownItems } from './useRundownItems';
import { useColumnsManager } from './useColumnsManager';
import { useTimeCalculations } from './useTimeCalculations';
import { usePlaybackControls } from './usePlaybackControls';
import { useRundownDataLoader } from './useRundownDataLoader';
import { useAutoSave } from './useAutoSave';
import { useCallback } from 'react';

export const useRundownGridCore = () => {
  // Basic state management
  const {
    rundownId,
    rundownTitle,
    setRundownTitle,
    timezone,
    setTimezone,
    rundownStartTime,
    setRundownStartTime,
    currentTime,
    showColumnManager,
    setShowColumnManager,
    markAsChanged
  } = useRundownBasicState();

  // Items management - direct usage without complex integration
  const {
    items,
    setItems,
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    deleteMultipleRows,
    addMultipleRows,
    getRowNumber,
    toggleFloatRow,
    calculateTotalRuntime,
    calculateHeaderDuration,
    setMarkAsChangedCallback
  } = useRundownItems();

  // Columns management
  const {
    columns,
    visibleColumns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleRenameColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    handleUpdateColumnWidth,
    setMarkAsChangedCallback: setColumnsMarkAsChangedCallback
  } = useColumnsManager();

  // Auto-save functionality
  const { 
    hasUnsavedChanges, 
    isSaving, 
    setRundownId,
    setOnRundownCreated 
  } = useAutoSave(
    items,
    rundownTitle,
    columns,
    timezone,
    rundownStartTime
  );

  // Connect markAsChanged callbacks
  setMarkAsChangedCallback(markAsChanged);
  setColumnsMarkAsChangedCallback(markAsChanged);

  // Create calculateEndTime function
  const calculateEndTime = useCallback((startTime: string, duration: string) => {
    if (!startTime || !duration) return '';
    
    // Parse start time
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const startTotalMinutes = startHours * 60 + startMinutes;
    
    // Parse duration
    const durationParts = duration.split(':');
    let durationMinutes = 0;
    
    if (durationParts.length === 2) {
      // MM:SS format
      const [minutes, seconds] = durationParts.map(Number);
      durationMinutes = minutes + (seconds / 60);
    } else if (durationParts.length === 3) {
      // HH:MM:SS format
      const [hours, minutes, seconds] = durationParts.map(Number);
      durationMinutes = hours * 60 + minutes + (seconds / 60);
    }
    
    // Calculate end time
    const endTotalMinutes = startTotalMinutes + durationMinutes;
    const endHours = Math.floor(endTotalMinutes / 60);
    const endMinutes = Math.floor(endTotalMinutes % 60);
    
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  }, []);

  // Time calculations
  const { getRowStatus } = useTimeCalculations(
    items,
    rundownStartTime,
    timezone
  );

  // Playback controls
  const {
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward
  } = usePlaybackControls(items);

  // Data loading
  useRundownDataLoader(
    rundownId,
    setItems,
    setRundownTitle,
    setTimezone,
    setRundownStartTime,
    handleLoadLayout
  );

  // Simple title change handler
  const handleTitleChange = useCallback((title: string) => {
    setRundownTitle(title);
    markAsChanged();
  }, [setRundownTitle, markAsChanged]);

  // Enhanced wrapper functions - fix signatures to match what components expect
  const enhancedAddRow = useCallback((selectedRowId?: string) => {
    addRow(selectedRowId);
    markAsChanged();
  }, [addRow, markAsChanged]);

  const enhancedAddHeader = useCallback((selectedRowId?: string) => {
    addHeader(selectedRowId);
    markAsChanged();
  }, [addHeader, markAsChanged]);

  const enhancedUpdateItem = useCallback((id: string, field: string, value: string) => {
    updateItem(id, field, value);
    markAsChanged();
  }, [updateItem, markAsChanged]);

  return {
    // Core state
    rundownId,
    rundownTitle,
    setRundownTitle: handleTitleChange,
    timezone,
    setTimezone,
    rundownStartTime,
    setRundownStartTime,
    hasUnsavedChanges,
    isSaving,
    markAsChanged,
    currentTime,
    showColumnManager,
    setShowColumnManager,
    
    // Items
    items,
    setItems,
    updateItem: enhancedUpdateItem,
    addRow: enhancedAddRow,
    addHeader: enhancedAddHeader,
    deleteRow,
    deleteMultipleRows,
    addMultipleRows,
    getRowNumber,
    toggleFloatRow,
    calculateTotalRuntime,
    calculateHeaderDuration,
    calculateEndTime,
    
    // Columns
    columns,
    visibleColumns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleRenameColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    handleUpdateColumnWidth,
    
    // Time
    getRowStatus,
    
    // Playback controls
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward,
    selectedRowId: null,
    
    // Simplified handlers for compatibility
    handleUpdateItem: enhancedUpdateItem,
    handleAddRow: enhancedAddRow,
    handleAddHeader: enhancedAddHeader,
    handleDeleteRow: deleteRow,
    handleToggleFloat: toggleFloatRow,
    handleColorSelect: (id: string, color: string) => {
      enhancedUpdateItem(id, 'color', color);
    },
    handleDeleteSelectedRows: () => {}, // Placeholder
    handlePasteRows: () => {}, // Placeholder
    handleDeleteColumnWithCleanup: handleDeleteColumn,
    
    // Simplified state properties
    updateTrigger: 0,
    forceRenderTrigger: 0,
    handleUndo: () => {},
    canUndo: false,
    lastAction: null as string | null,
    isConnected: true,
    hasPendingChanges: false,
    isEditing: false
  };
};

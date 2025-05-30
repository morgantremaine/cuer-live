
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownItems } from '@/hooks/useRundownItems';
import { useColumnsManager } from '@/hooks/useColumnsManager';
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { useCellNavigation } from '@/hooks/useCellNavigation';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useTimeCalculations } from '@/hooks/useTimeCalculations';
import { useColorPicker } from '@/hooks/useColorPicker';
import { useMultiRowSelection } from '@/hooks/useMultiRowSelection';
import { useClipboard } from '@/hooks/useClipboard';
import { usePlaybackControls } from '@/hooks/usePlaybackControls';
import { useRundownDataLoader } from '@/hooks/useRundownDataLoader';
import { useRundownTimers } from '@/hooks/useRundownTimers';
import { useAutoSave } from '@/hooks/useAutoSave';

export const useRundownGridState = () => {
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [rundownTitle, setRundownTitle] = useState('Live Broadcast Rundown');

  const { id: rundownId } = useParams<{ id: string }>();

  console.log('🏗️ useRundownGridState: Initializing with rundownId:', rundownId);

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
    calculateHeaderDuration
  } = useRundownItems();

  const {
    columns,
    visibleColumns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleToggleColumnVisibility,
    handleLoadLayout
  } = useColumnsManager();

  const {
    columnWidths,
    updateColumnWidth,
    getColumnWidth
  } = useResizableColumns(visibleColumns);

  const {
    selectedCell,
    cellRefs,
    handleCellClick,
    handleKeyDown
  } = useCellNavigation(visibleColumns, items);

  const {
    draggedItemIndex,
    handleDragStart,
    handleDragOver,
    handleDrop
  } = useDragAndDrop(items, setItems);

  const {
    calculateEndTime,
    getRowStatus
  } = useTimeCalculations(items, updateItem);

  const {
    showColorPicker,
    handleToggleColorPicker,
    handleColorSelect
  } = useColorPicker();

  const {
    selectedRows,
    toggleRowSelection,
    clearSelection
  } = useMultiRowSelection();

  const {
    clipboardItems,
    copyItems,
    hasClipboardData
  } = useClipboard();

  const {
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward
  } = usePlaybackControls(items, updateItem);

  // Load saved rundown data
  const { isDataLoaded } = useRundownDataLoader(rundownId, setItems, setRundownTitle, handleLoadLayout);

  // Timer management
  const { currentTime, timezone, setTimezone } = useRundownTimers();

  // Auto-save functionality
  const autoSave = useAutoSave({
    rundownId: rundownId || 'new',
    items,
    rundownTitle,
    columns,
    isDataLoaded
  });

  console.log('📊 useRundownGridState: Current state summary', {
    rundownId,
    title: rundownTitle,
    itemsCount: items.length,
    columnsCount: columns.length,
    isDataLoaded,
    hasUnsavedChanges: autoSave.hasUnsavedChanges,
    isSaving: autoSave.isSaving
  });

  return {
    // Basic state
    currentTime,
    timezone,
    setTimezone,
    showColumnManager,
    setShowColumnManager,
    rundownTitle,
    setRundownTitle,
    rundownId: rundownId || '',
    
    // Items state
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
    
    // Columns state
    columns,
    visibleColumns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    
    // Resizable columns state
    columnWidths,
    updateColumnWidth,
    getColumnWidth,
    
    // Cell navigation state
    selectedCell,
    cellRefs,
    handleCellClick,
    handleKeyDown,
    
    // Drag and drop state
    draggedItemIndex,
    handleDragStart,
    handleDragOver,
    handleDrop,
    
    // Time calculations
    calculateEndTime,
    getRowStatus,
    
    // Color picker state
    showColorPicker,
    handleToggleColorPicker,
    selectColor: handleColorSelect,
    
    // Row selection state
    selectedRows,
    toggleRowSelection,
    clearSelection,
    
    // Clipboard state
    clipboardItems,
    copyItems,
    hasClipboardData,
    
    // Playback state
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward,

    // Auto-save state
    hasUnsavedChanges: autoSave.hasUnsavedChanges,
    isSaving: autoSave.isSaving,
    lastSaved: autoSave.lastSaved,
    manualSave: autoSave.manualSave
  };
};


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
import { useAutoSave } from '@/hooks/useAutoSave';
import { useRundownStorage } from '@/hooks/useRundownStorage';

export const useRundownGridState = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timezone, setTimezone] = useState('America/New_York');
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [rundownTitle, setRundownTitle] = useState('Live Broadcast Rundown');
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const { id: rundownId } = useParams<{ id: string }>();
  const { savedRundowns, loading } = useRundownStorage();

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

  // Initialize auto-save after columns are set up
  const { hasUnsavedChanges, markAsChanged, manualSave } = useAutoSave(items, rundownTitle, columns);

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

  // Load saved rundown data when component mounts or rundownId changes
  useEffect(() => {
    console.log('useRundownGridState: Effect triggered', { rundownId, loading, savedRundownsLength: savedRundowns.length, isDataLoaded });
    
    if (rundownId && !loading && savedRundowns.length > 0 && !isDataLoaded) {
      const savedRundown = savedRundowns.find(r => r.id === rundownId);
      console.log('useRundownGridState: Looking for rundown with id:', rundownId);
      console.log('useRundownGridState: Found rundown:', savedRundown);
      
      if (savedRundown) {
        console.log('useRundownGridState: Loading saved rundown data');
        console.log('useRundownGridState: Items to load:', savedRundown.items);
        console.log('useRundownGridState: Column config to load:', savedRundown.column_config);
        
        // Load the rundown data
        if (savedRundown.items && Array.isArray(savedRundown.items)) {
          setItems(savedRundown.items);
        }
        
        if (savedRundown.title) {
          setRundownTitle(savedRundown.title);
        }
        
        // Load column configuration if it exists
        if (savedRundown.column_config && Array.isArray(savedRundown.column_config)) {
          console.log('useRundownGridState: Loading column configuration');
          handleLoadLayout(savedRundown.column_config);
        }
        
        setIsDataLoaded(true);
        console.log('useRundownGridState: Data loading complete');
      } else {
        console.log('useRundownGridState: No rundown found with id:', rundownId);
      }
    }
  }, [rundownId, savedRundowns, loading, isDataLoaded, setItems, setRundownTitle, handleLoadLayout]);

  // Reset data loaded flag when rundownId changes
  useEffect(() => {
    console.log('useRundownGridState: Rundown ID changed, resetting data loaded flag');
    setIsDataLoaded(false);
  }, [rundownId]);

  // Timer effect for current time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    
    // Auto-save state
    hasUnsavedChanges,
    markAsChanged,
    manualSave,
    
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
    backward
  };
};

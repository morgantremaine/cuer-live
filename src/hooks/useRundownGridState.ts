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
  const [rundownTitle, setRundownTitle] = useState('Live Broadcast Rundown');
  const [rundownStartTime, setRundownStartTime] = useState('09:00:00');

  const { id: rundownId } = useParams<{ id: string }>();
  const { savedRundowns, loading } = useRundownStorage();

  // Load the title from existing rundown
  useEffect(() => {
    if (loading) return;
    
    if (rundownId && savedRundowns.length > 0) {
      const existingRundown = savedRundowns.find(r => r.id === rundownId);
      if (existingRundown) {
        console.log('Loading rundown title:', existingRundown.title);
        setRundownTitle(existingRundown.title);
      }
    } else if (!rundownId) {
      console.log('New rundown, using default title');
      setRundownTitle('Live Broadcast Rundown');
    }
  }, [rundownId, savedRundowns, loading]);

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

  // Create a temporary markAsChanged function that will be replaced
  const [tempMarkAsChanged, setTempMarkAsChanged] = useState<(() => void) | null>(null);

  const {
    columns,
    visibleColumns,
    handleAddColumn,
    handleUpdateColumnName
  } = useColumnsManager(tempMarkAsChanged || (() => {}));

  const { hasUnsavedChanges, isSaving, markAsChanged } = useAutoSave(items, rundownTitle, columns);

  // Update the temp function once the real one is available
  useEffect(() => {
    setTempMarkAsChanged(() => markAsChanged);
  }, [markAsChanged]);

  // Timer effect for current time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
  } = useTimeCalculations(items, updateItem, rundownStartTime);

  const {
    showColorPicker,
    handleToggleColorPicker,
    handleColorSelect: selectColor
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

  return {
    // Basic state
    currentTime,
    timezone,
    setTimezone,
    rundownTitle,
    setRundownTitle,
    rundownStartTime,
    setRundownStartTime,
    rundownId,
    
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
    isSaving,
    markAsChanged,
    
    // Columns state
    columns,
    visibleColumns,
    handleAddColumn,
    handleUpdateColumnName,
    
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
    selectColor,
    
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

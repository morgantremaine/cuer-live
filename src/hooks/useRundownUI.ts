
import { useState, useCallback, useRef } from 'react';
import { useMultiRowSelection } from './useMultiRowSelection';
import { useDragAndDrop } from './useDragAndDrop';
import { useRundownClipboard } from './useRundownClipboard';
import { useResizableColumns } from './useResizableColumns';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

export const useRundownUI = (
  items: RundownItem[],
  setItems: (updater: (prev: RundownItem[]) => RundownItem[]) => void,
  columns: Column[],
  handleUpdateColumnWidth: (columnId: string, width: number) => void
) => {
  // UI state
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});

  // Multi-row selection
  const { selectedRows, toggleRowSelection, clearSelection } = useMultiRowSelection();
  
  // Drag and drop
  const { 
    draggedItemIndex, 
    isDraggingMultiple, 
    dropTargetIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop
  } = useDragAndDrop(items, setItems, selectedRows);

  // Clipboard
  const { clipboardItems, copyItems, hasClipboardData } = useRundownClipboard();

  // Resizable columns
  const { getColumnWidth, updateColumnWidth } = useResizableColumns(
    columns, 
    handleUpdateColumnWidth
  );

  // Color picker handling
  const handleToggleColorPicker = useCallback((itemId: string) => {
    setShowColorPicker(showColorPicker === itemId ? null : itemId);
  }, [showColorPicker]);

  return {
    // UI state
    showColumnManager,
    setShowColumnManager,
    showColorPicker,
    cellRefs,
    
    // Selection
    selectedRows,
    toggleRowSelection,
    clearSelection,
    
    // Drag and drop
    draggedItemIndex,
    isDraggingMultiple,
    dropTargetIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    
    // Clipboard
    clipboardItems,
    copyItems,
    hasClipboardData,
    
    // Columns
    getColumnWidth,
    updateColumnWidth,
    
    // Color picker
    handleToggleColorPicker
  };
};

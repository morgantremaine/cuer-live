

import { useMultiRowSelection } from './useMultiRowSelection';
import { useDragAndDrop } from './useDragAndDrop';
import { useClipboard } from './useClipboard';
import { useRundownGridHandlers } from './useRundownGridHandlers';
import { RundownItem } from '@/types/rundown';

export const useRundownInteractionHandlers = (
  items: RundownItem[],
  setItems: (updater: (prev: RundownItem[]) => RundownItem[]) => void,
  updateItem: (id: string, field: string, value: string) => void,
  addRow: () => void,
  addHeader: () => void,
  deleteRow: (id: string) => void,
  toggleFloatRow: (id: string) => void,
  deleteMultipleRows: (ids: string[]) => void,
  addMultipleRows: (items: RundownItem[], calculateEndTime: (startTime: string, duration: string) => string) => void,
  handleDeleteColumn: (columnId: string) => void,
  calculateEndTime: (startTime: string, duration: string) => string,
  selectColor: (id: string, color: string) => void,
  markAsChanged: () => void,
  setRundownTitle: (title: string) => void,
  addRowAtIndex: (insertIndex: number) => void,
  addHeaderAtIndex: (insertIndex: number) => void
) => {
  // Multi-row selection
  const { selectedRows, toggleRowSelection, clearSelection } = useMultiRowSelection();

  // Drag and drop - fix the function call to match expected signature
  const { 
    draggedItemIndex, 
    isDraggingMultiple,
    dropTargetIndex,
    handleDragStart, 
    handleDragOver,
    handleDragLeave,
    handleDrop 
  } = useDragAndDrop(items, (newItems: RundownItem[]) => setItems(() => newItems), selectedRows);

  // Clipboard functionality
  const { clipboardItems, copyItems, hasClipboardData } = useClipboard();

  // Create a wrapper for toggleRowSelection that matches the expected interface signature
  const wrappedToggleRowSelection = (id: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    // Call the original function with the items array as the 5th parameter
    toggleRowSelection(id, index, isShiftClick, isCtrlClick, items);
  };

  // Grid handlers - fix the function call to match expected signature
  const {
    handleUpdateItem,
    handleAddRow,
    handleAddHeader,
    handleDeleteRow,
    handleToggleFloat,
    handleColorSelect,
    handleDeleteSelectedRows,
    handlePasteRows,
    handleDeleteColumnWithCleanup,
    handleCopySelectedRows,
    handleRowSelection,
    handleTitleChange
  } = useRundownGridHandlers({
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    toggleFloatRow,
    deleteMultipleRows,
    addMultipleRows,
    handleDeleteColumn,
    setItems,
    calculateEndTime,
    selectColor,
    markAsChanged,
    selectedRows,
    clearSelection,
    copyItems,
    clipboardItems,
    hasClipboardData: hasClipboardData(), // Call the function to get boolean value
    toggleRowSelection: wrappedToggleRowSelection, // Use the wrapper function
    items,
    setRundownTitle,
    addRowAtIndex,
    addHeaderAtIndex
  });

  return {
    selectedRows,
    toggleRowSelection: wrappedToggleRowSelection,
    clearSelection,
    draggedItemIndex,
    isDraggingMultiple,
    dropTargetIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    clipboardItems,
    copyItems,
    hasClipboardData: hasClipboardData(), // Return boolean value, not function
    handleUpdateItem,
    handleAddRow,
    handleAddHeader,
    handleDeleteRow,
    handleToggleFloat,
    handleColorSelect,
    handleDeleteSelectedRows,
    handlePasteRows,
    handleDeleteColumnWithCleanup,
    handleCopySelectedRows,
    handleRowSelection,
    handleTitleChange
  };
};


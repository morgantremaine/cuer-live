
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

  // Create a wrapper for setItems that ensures undo state is saved
  const setItemsWithUndo = (newItems: RundownItem[]) => {
    setItems(() => {
      // Mark as changed to trigger undo state saving
      markAsChanged();
      return newItems;
    });
  };

  // Drag and drop - use the wrapper function
  const { 
    draggedItemIndex, 
    isDraggingMultiple,
    dropTargetIndex,
    handleDragStart, 
    handleDragOver,
    handleDragLeave,
    handleDrop 
  } = useDragAndDrop(items, setItemsWithUndo, selectedRows);

  // Clipboard functionality
  const { clipboardItems, copyItems, hasClipboardData } = useClipboard();

  // Grid handlers
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
    hasClipboardData,
    toggleRowSelection,
    items,
    setRundownTitle,
    addRowAtIndex,
    addHeaderAtIndex
  });

  return {
    selectedRows,
    toggleRowSelection,
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
    hasClipboardData,
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

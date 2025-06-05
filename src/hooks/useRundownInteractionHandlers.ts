
import { useMultiRowSelection } from './useMultiRowSelection';
import { useDragAndDrop } from './useDragAndDrop';
import { useClipboard } from './useClipboard';
import { useRundownGridHandlers } from './useRundownGridHandlers';
import { RundownItem } from '@/types/rundown';

export const useRundownInteractionHandlers = (
  items: RundownItem[],
  setItems: (updater: (prev: RundownItem[]) => RundownItem[]) => void,
  updateItem: (id: string, field: string, value: string) => void,
  addRow: (calculateEndTime: (startTime: string, duration: string) => string) => void,
  addHeader: () => void,
  deleteRow: (id: string) => void,
  toggleFloatRow: (id: string) => void,
  deleteMultipleRows: (ids: string[]) => void,
  addMultipleRows: (items: RundownItem[], calculateEndTime: (startTime: string, duration: string) => string) => void,
  handleDeleteColumn: (columnId: string) => void,
  calculateEndTime: (startTime: string, duration: string) => string,
  selectColor: (id: string, color: string) => void,
  markAsChanged: () => void,
  setRundownTitle: (title: string) => void
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
    hasClipboardData,
    toggleRowSelection,
    items,
    setRundownTitle
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


import { useMemo } from 'react';
import { RundownItem } from '@/types/rundown';
import { useDragAndDrop } from './useDragAndDrop';
import { useMultiRowSelection } from './useMultiRowSelection';
import { useRundownClipboard } from './useRundownClipboard';

interface UseRundownGridInteractionsProps {
  items: RundownItem[];
  setItems: (items: RundownItem[]) => void;
  deleteRow: (id: string) => void;
  deleteMultipleRows: (ids: string[]) => void;
  addRow: () => void;
  addHeader: () => void;
  scrollContainerRef?: React.RefObject<HTMLElement>;
  saveUndoState?: (items: RundownItem[], action: string) => void;
}

export const useRundownGridInteractions = ({
  items,
  setItems,
  deleteRow,
  deleteMultipleRows,
  addRow,
  addHeader,
  scrollContainerRef,
  saveUndoState
}: UseRundownGridInteractionsProps) => {
  // Multi-row selection
  const {
    selectedRows,
    handleRowSelection,
    clearSelection
  } = useMultiRowSelection(items);

  // Drag and drop with undo support
  const {
    draggedItemIndex,
    isDraggingMultiple,
    dropTargetIndex,
    isDragging,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop
  } = useDragAndDrop(items, setItems, selectedRows, scrollContainerRef, saveUndoState);

  // Clipboard operations
  const {
    handleCopySelectedRows,
    handlePasteRows,
    hasClipboardData
  } = useRundownClipboard(items, setItems, selectedRows, saveUndoState);

  // Handle delete selected rows with undo
  const handleDeleteSelectedRows = () => {
    if (selectedRows.size === 0) return;
    
    if (saveUndoState) {
      saveUndoState(items, `Delete ${selectedRows.size} rows`);
    }
    
    const selectedIds = Array.from(selectedRows);
    deleteMultipleRows(selectedIds);
    clearSelection();
  };

  // Handle add row with undo
  const handleAddRow = () => {
    if (saveUndoState) {
      saveUndoState(items, 'Add row');
    }
    addRow();
  };

  // Handle add header with undo
  const handleAddHeader = () => {
    if (saveUndoState) {
      saveUndoState(items, 'Add header');
    }
    addHeader();
  };

  return useMemo(() => ({
    // Selection state
    selectedRows,
    
    // Drag and drop state
    draggedItemIndex,
    isDraggingMultiple,
    dropTargetIndex,
    isDragging,
    
    // Event handlers
    handleRowSelection,
    clearSelection,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleCopySelectedRows,
    handleDeleteSelectedRows,
    handlePasteRows,
    handleAddRow,
    handleAddHeader,
    hasClipboardData
  }), [
    selectedRows,
    draggedItemIndex,
    isDraggingMultiple,
    dropTargetIndex,
    isDragging,
    handleRowSelection,
    clearSelection,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleCopySelectedRows,
    handleDeleteSelectedRows,
    handlePasteRows,
    handleAddRow,
    handleAddHeader,
    hasClipboardData
  ]);
};

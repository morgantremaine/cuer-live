import { useState, useCallback, useMemo } from 'react';
import { RundownItem } from '@/types/rundown';

interface UseRundownInteractionsProps {
  items: RundownItem[];
  updateItem: (id: string, field: string, value: string) => void;
  deleteRow: (id: string) => void;
  addRow: () => void;
  addHeader: () => void;
  deleteMultipleItems: (ids: string[]) => void;
}

export const useRundownInteractions = ({
  items,
  updateItem,
  deleteRow,
  addRow,
  addHeader,
  deleteMultipleItems
}: UseRundownInteractionsProps) => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [clipboardData, setClipboardData] = useState<RundownItem[]>([]);

  const toggleRowSelection = useCallback((itemId: string, index: number, isShiftClick: boolean = false, isCtrlClick: boolean = false, allItems: RundownItem[], headerGroupItemIds?: string[]) => {
    setSelectedRows(prev => {
      const newSelection = new Set(prev);
      
      if (isShiftClick) {
        // Handle shift+click range selection
        newSelection.clear();
        // TODO: Implement range selection logic
        newSelection.add(itemId);
      } else if (isCtrlClick) {
        // Handle ctrl+click multi-selection
        if (newSelection.has(itemId)) {
          newSelection.delete(itemId);
        } else {
          newSelection.add(itemId);
        }
      } else {
        // Normal single selection
        newSelection.clear();
        newSelection.add(itemId);
      }
      
      return newSelection;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
  }, []);

  const isDraggingMultiple = useMemo(() => {
    return selectedRows.size > 1 && draggedItemIndex !== null;
  }, [selectedRows.size, draggedItemIndex]);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetIndex?: number) => {
    if (targetIndex !== undefined) {
      setDropTargetIndex(targetIndex);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    setDropTargetIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    // TODO: Implement drag and drop reordering logic
    setDraggedItemIndex(null);
    setDropTargetIndex(null);
  }, []);

  const handleCopySelectedRows = useCallback(() => {
    const selectedItems = items.filter(item => selectedRows.has(item.id));
    setClipboardData(selectedItems);
  }, [items, selectedRows]);

  const handlePasteRows = useCallback(() => {
    // TODO: Implement paste logic with clipboard data
    console.log('Pasting rows:', clipboardData);
  }, [clipboardData]);

  const handleDeleteSelectedRows = useCallback(() => {
    const selectedIds = Array.from(selectedRows);
    deleteMultipleItems(selectedIds);
    clearSelection();
  }, [selectedRows, deleteMultipleItems, clearSelection]);

  const handleRowSelection = useCallback((itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    toggleRowSelection(itemId, index, isShiftClick, isCtrlClick, items);
  }, [toggleRowSelection, items]);

  const handleAddRow = useCallback(() => {
    addRow();
  }, [addRow]);

  const handleAddHeader = useCallback(() => {
    addHeader();
  }, [addHeader]);

  const hasClipboardData = useCallback(() => clipboardData.length > 0, [clipboardData]);

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
    hasClipboardData,
    handleCopySelectedRows,
    handlePasteRows,
    handleDeleteSelectedRows,
    handleRowSelection,
    handleAddRow,
    handleAddHeader
  };
};
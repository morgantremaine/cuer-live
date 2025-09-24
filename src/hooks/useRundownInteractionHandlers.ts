
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
  addHeaderAtIndex: (insertIndex: number) => void,
  saveUndoState?: (items: RundownItem[], columns: any[], title: string, action: string) => void,
  markStructuralChange?: () => void,
  columns?: any[],
  title?: string,
  getHeaderGroupItemIds?: (headerId: string) => string[],
  isHeaderCollapsed?: (headerId: string) => boolean,
  rundownId?: string,
  currentUserId?: string
) => {
  // Multi-row selection
  const { selectedRows, toggleRowSelection, clearSelection } = useMultiRowSelection();

  // Enhanced drag and drop with better error handling
  const { 
    draggedItemIndex, 
    isDraggingMultiple,
    dropTargetIndex,
    handleDragStart, 
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    resetDragState
  } = useDragAndDrop(
    items, 
    (newItems: RundownItem[]) => {
      console.log('🔄 Setting items from drag and drop');
      console.log('🔄 Items being set:', {
        count: newItems.length,
        firstFew: newItems.slice(0, 3).map(item => ({
          id: item.id.slice(-6),
          type: item.type,
          rowNumber: item.rowNumber,
          name: item.name?.slice(0, 15)
        }))
      });
      setItems(() => newItems);
      markAsChanged();
    }, 
    selectedRows,
    undefined,
    saveUndoState,
    columns,
    title,
    getHeaderGroupItemIds,
    isHeaderCollapsed,
    markStructuralChange,
    rundownId,
    currentUserId
  );

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
    handleDragEnd,
    resetDragState,
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

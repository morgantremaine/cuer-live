
import { useRundownInteractionHandlers } from './useRundownInteractionHandlers';
import { RundownItem } from '@/types/rundown';

export const useRundownGridInteractions = (
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
  markStructuralChange?: (operationType: string, operationData: any) => void,
  columns?: any[],
  title?: string,
  getHeaderGroupItemIds?: (headerId: string) => string[],
  isHeaderCollapsed?: (headerId: string) => boolean,
  rundownId?: string,
  currentUserId?: string,
  // Accept drag state from primary drag instance  
  dragState?: {
    draggedItemIndex: number | null;
    isDraggingMultiple: boolean;
    dropTargetIndex: number | null;
    handleDragStart: (e: React.DragEvent, index: number) => void;
    handleDragOver: (e: React.DragEvent, index: number) => void;
    handleDragLeave: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent, index: number) => void;
    handleDragEnd: (e: React.DragEvent) => void;
    resetDragState: () => void;
  }
) => {
  const {
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
  } = useRundownInteractionHandlers(
    items,
    setItems,
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    toggleFloatRow,
    deleteMultipleRows,
    addMultipleRows,
    handleDeleteColumn,
    calculateEndTime,
    selectColor,
    markAsChanged,
    setRundownTitle,
    addRowAtIndex,
    addHeaderAtIndex,
    saveUndoState,
    markStructuralChange,
    columns,
    title,
    getHeaderGroupItemIds,
    isHeaderCollapsed,
    rundownId,
    currentUserId,
    dragState // Pass the drag state from primary instance
  );

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
    handleTitleChange,
    addRowAtIndex,
    addHeaderAtIndex
  };
};

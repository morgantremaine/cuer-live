
import { useMultiRowSelection } from './useMultiRowSelection';
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
  addRowAtIndex: (insertIndex: number, count?: number) => void,
  addHeaderAtIndex: (insertIndex: number) => void,
  saveUndoState?: (items: RundownItem[], columns: any[], title: string, action: string) => void,
  markStructuralChange?: ((operationType: string, operationData: any) => void) | (() => void),
  columns?: any[],
  title?: string,
  getHeaderGroupItemIds?: (headerId: string) => string[],
  isHeaderCollapsed?: (headerId: string) => boolean,
  rundownId?: string | null,
  currentUserId?: string | null,
  isPerCellEnabled?: boolean,
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
  },
  // OT system handlers
  operationHandlers?: {
    handleRowDelete?: (itemId: string) => void;
    handleRowInsert?: (insertIndex: number, newItem: any) => void;
    handleRowCopy?: (sourceItemId: string, newItem: any, insertIndex: number) => void;
  }
) => {
  // Multi-row selection
  const { selectedRows, toggleRowSelection, clearSelection } = useMultiRowSelection();

  // Accept drag state and handlers as parameters (no duplicate drag instance)
  // These will be passed from the primary drag instance

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
    addHeaderAtIndex,
    markStructuralChange: typeof markStructuralChange === 'function' 
      ? markStructuralChange as (operationType: string, operationData: any) => void
      : undefined,
    isPerCellEnabled,
    rundownId,
    currentUserId,
    operationHandlers // Pass OT handlers through
  });

  return {
    selectedRows,
    toggleRowSelection,
    clearSelection,
    // Use drag state from primary instance if provided, otherwise provide fallbacks
    draggedItemIndex: dragState?.draggedItemIndex ?? null,
    isDraggingMultiple: dragState?.isDraggingMultiple ?? false,
    dropTargetIndex: dragState?.dropTargetIndex ?? null,
    handleDragStart: dragState?.handleDragStart ?? (() => {}),
    handleDragOver: dragState?.handleDragOver ?? (() => {}),
    handleDragLeave: dragState?.handleDragLeave ?? (() => {}),
    handleDrop: dragState?.handleDrop ?? (() => {}),
    handleDragEnd: dragState?.handleDragEnd ?? (() => {}),
    resetDragState: dragState?.resetDragState ?? (() => {}),
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

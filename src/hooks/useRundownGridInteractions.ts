
import { useState, useRef, useCallback, useEffect } from 'react';
import { RundownItem } from '@/types/rundown';
import { useMultiRowSelection } from './useMultiRowSelection';
import { useDragAndDrop } from './useDragAndDrop';
import { markGlobalUserAction } from './useAutoSaveOperations';
import { useParams } from 'react-router-dom';

export const useRundownGridInteractions = (
  items: RundownItem[],
  setItems: (updater: (prev: RundownItem[]) => RundownItem[]) => void,
  updateItem: (id: string, field: keyof RundownItem, value: any) => void,
  addRow: (selectedRows?: Set<string>) => void,
  addHeader: (selectedRows?: Set<string>) => void,
  deleteRow: (id: string) => void,
  toggleFloatRow: (id: string) => void,
  deleteMultipleRows: (ids: string[]) => void,
  addMultipleRows: (newItems: RundownItem[], insertAfterIndex?: number) => void,
  handleDeleteColumn: (columnId: string) => void,
  calculateEndTime: any,
  selectColor: (id: string, color: string) => void,
  markAsChanged: () => void,
  setRundownTitle: (title: string) => void
) => {
  const params = useParams<{ id: string }>();
  const rundownId = params.id;

  // Multi-row selection
  const {
    selectedRows,
    toggleRowSelection,
    toggleRowSelectionWithItems,
    clearSelection,
    selectAll
  } = useMultiRowSelection();

  // Drag and drop - ensure setItems uses the updater pattern correctly
  const {
    draggedItemIndex,
    isDraggingMultiple,
    dropTargetIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop
  } = useDragAndDrop(items, setItems, selectedRows);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    rowId: string;
  } | null>(null);
  const [colorPickerRowId, setColorPickerRowId] = useState<string | null>(null);

  // Enhanced row operations that mark user actions
  const enhancedAddRow = useCallback((selectedRows?: Set<string>) => {
    if (rundownId) {
      markGlobalUserAction(rundownId);
    }
    addRow(selectedRows);
  }, [addRow, rundownId]);

  const enhancedAddHeader = useCallback((selectedRows?: Set<string>) => {
    if (rundownId) {
      markGlobalUserAction(rundownId);
    }
    addHeader(selectedRows);
  }, [addHeader, rundownId]);

  const enhancedDeleteRow = useCallback((id: string) => {
    if (rundownId) {
      markGlobalUserAction(rundownId);
    }
    deleteRow(id);
  }, [deleteRow, rundownId]);

  const enhancedToggleFloatRow = useCallback((id: string) => {
    if (rundownId) {
      markGlobalUserAction(rundownId);
    }
    toggleFloatRow(id);
  }, [toggleFloatRow, rundownId]);

  const enhancedUpdateItem = useCallback((id: string, field: keyof RundownItem, value: any) => {
    if (rundownId) {
      markGlobalUserAction(rundownId);
    }
    updateItem(id, field, value);
  }, [updateItem, rundownId]);

  const enhancedSelectColor = useCallback((id: string, color: string) => {
    if (rundownId) {
      markGlobalUserAction(rundownId);
    }
    selectColor(id, color);
  }, [selectColor, rundownId]);

  const enhancedSetRundownTitle = useCallback((title: string) => {
    if (rundownId) {
      markGlobalUserAction(rundownId);
    }
    setRundownTitle(title);
  }, [setRundownTitle, rundownId]);

  // Create a wrapper for row selection that can handle both 4 and 5 parameter calls
  const handleRowSelection = useCallback((itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    // Use the enhanced version that includes the items array for shift-click functionality
    toggleRowSelectionWithItems(itemId, index, isShiftClick, isCtrlClick, items);
  }, [toggleRowSelectionWithItems, items]);

  // Context menu handlers
  const handleRightClick = useCallback((event: React.MouseEvent, rowId: string) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      rowId
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleColorPicker = useCallback((rowId: string) => {
    setColorPickerRowId(rowId);
    closeContextMenu();
  }, [closeContextMenu]);

  const closeColorPicker = useCallback(() => {
    setColorPickerRowId(null);
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      closeContextMenu();
    };

    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu, closeContextMenu]);

  return {
    // Selection - provide all expected properties
    selectedRows,
    toggleRowSelection: handleRowSelection, // Use the wrapper that handles both signatures
    clearSelection,
    selectAll,
    selectRow: handleRowSelection, // Alias for compatibility
    selectMultipleRows: selectAll, // Alias for compatibility
    isRowSelected: (id: string) => selectedRows.has(id), // Helper function
    
    // Drag and drop - provide all expected properties
    draggedItemIndex,
    isDraggingMultiple,
    dropTargetIndex,
    draggedItems: selectedRows.size > 0 ? Array.from(selectedRows) : [], // Compatibility
    dragOverIndex: dropTargetIndex, // Alias for compatibility
    isDragging: draggedItemIndex !== -1, // Computed property
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd: () => {}, // Placeholder for compatibility
    
    // Context menu
    contextMenu,
    colorPickerRowId,
    handleRightClick,
    closeContextMenu,
    handleColorPicker,
    closeColorPicker,
    
    // Enhanced operations with user action tracking
    addRow: enhancedAddRow,
    addHeader: enhancedAddHeader,
    deleteRow: enhancedDeleteRow,
    toggleFloatRow: enhancedToggleFloatRow,
    updateItem: enhancedUpdateItem,
    selectColor: enhancedSelectColor,
    setRundownTitle: enhancedSetRundownTitle,
    
    // Pass through operations
    deleteMultipleRows,
    addMultipleRows,
    handleDeleteColumn,
    calculateEndTime,
    markAsChanged
  };
};


import { useState, useRef, useCallback, useEffect } from 'react';
import { RundownItem } from '@/types/rundown';
import { useMultiRowSelection } from './useMultiRowSelection';
import { useDragAndDrop } from './useDragAndDrop';
import { markGlobalUserAction } from './useAutoSaveOperations';
import { useParams } from 'react-router-dom';

export const useRundownGridInteractions = (
  items: RundownItem[],
  setItems: (items: RundownItem[]) => void,
  updateItem: (id: string, field: keyof RundownItem, value: any) => void,
  addRow: (calculateEndTime: any, insertAfterIndex?: number) => void,
  addHeader: (insertAfterIndex?: number) => void,
  deleteRow: (id: string) => void,
  toggleFloatRow: (id: string) => void,
  deleteMultipleRows: (ids: string[]) => void,
  addMultipleRows: (newItems: RundownItem[], insertAfterIndex?: number) => void,
  handleDeleteColumn: (columnId: string) => void,
  calculateEndTime: (item: RundownItem, prevEndTime?: string) => string,
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
    clearSelection,
    selectAll
  } = useMultiRowSelection();

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

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    rowId: string;
  } | null>(null);
  const [colorPickerRowId, setColorPickerRowId] = useState<string | null>(null);

  // Enhanced row operations that mark user actions
  const enhancedAddRow = useCallback((calculateEndTimeFunc: any, insertAfterIndex?: number) => {
    if (rundownId) {
      markGlobalUserAction(rundownId);
    }
    addRow(calculateEndTimeFunc, insertAfterIndex);
  }, [addRow, rundownId]);

  const enhancedAddHeader = useCallback((insertAfterIndex?: number) => {
    if (rundownId) {
      markGlobalUserAction(rundownId);
    }
    addHeader(insertAfterIndex);
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
    toggleRowSelection,
    clearSelection,
    selectAll,
    selectRow: toggleRowSelection, // Alias for compatibility
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

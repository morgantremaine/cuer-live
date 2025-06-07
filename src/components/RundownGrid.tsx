
import React, { useRef, useMemo } from 'react';
import RundownTable from './RundownTable';
import { useRundownGridState } from '@/hooks/useRundownGridState';
import { useColorPicker } from '@/hooks/useColorPicker';
import { useCellNavigation } from '@/hooks/useCellNavigation';

const RundownGrid = () => {
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});
  
  const {
    items,
    visibleColumns,
    currentTime,
    selectedRows,
    draggedItemIndex,
    isDraggingMultiple,
    dropTargetIndex,
    currentSegmentId,
    hasClipboardData,
    updateTrigger,
    forceRenderTrigger,
    getColumnWidth,
    updateColumnWidth,
    handleUpdateItem,
    handleRowSelection,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleCopySelectedRows,
    handleDeleteSelectedRows,
    handlePasteRows,
    clearSelection,
    handleAddRow,
    handleAddHeader,
    toggleFloatRow,
    deleteRow,
    getRowNumber,
    getRowStatus,
    calculateHeaderDuration
  } = useRundownGridState();

  const { showColorPicker, handleToggleColorPicker, handleColorSelect: colorPickerSelect } = useColorPicker();

  const { handleCellClick, handleKeyDown } = useCellNavigation(
    visibleColumns,
    items
  );

  // Create a wrapper function that matches the expected signature
  const handleColorSelect = (id: string, color: string) => {
    handleUpdateItem(id, 'color', color);
    colorPickerSelect(id, color);
  };

  // Enhanced debug logging
  console.log('RundownGrid: updateTrigger value:', updateTrigger, '- Remote updates trigger');
  console.log('RundownGrid: forceRenderTrigger value:', forceRenderTrigger, '- Force render trigger');
  console.log('RundownGrid: items count:', items?.length || 0);
  console.log('RundownGrid: items array reference check:', items);

  // Create multiple render keys with timestamp to ensure re-renders
  const renderKey = useMemo(() => {
    const timestamp = Date.now();
    return `rundown-table-${updateTrigger}-${forceRenderTrigger}-${items?.length || 0}-${timestamp}`;
  }, [updateTrigger, forceRenderTrigger, items?.length, items]);

  // Additional safety: force re-render on items change with comprehensive dependencies
  const tableProps = useMemo(() => ({
    items,
    visibleColumns,
    currentTime,
    showColorPicker,
    cellRefs,
    selectedRows,
    draggedItemIndex,
    isDraggingMultiple,
    dropTargetIndex,
    currentSegmentId,
    hasClipboardData,
    getColumnWidth,
    updateColumnWidth,
    getRowNumber,
    getRowStatus,
    calculateHeaderDuration,
    onUpdateItem: handleUpdateItem,
    onCellClick: handleCellClick,
    onKeyDown: handleKeyDown,
    onToggleColorPicker: handleToggleColorPicker,
    onColorSelect: handleColorSelect,
    onDeleteRow: deleteRow,
    onToggleFloat: toggleFloatRow,
    onRowSelect: handleRowSelection,
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    onCopySelectedRows: handleCopySelectedRows,
    onDeleteSelectedRows: handleDeleteSelectedRows,
    onPasteRows: handlePasteRows,
    onClearSelection: clearSelection,
    onAddRow: handleAddRow,
    onAddHeader: handleAddHeader,
  }), [
    items, visibleColumns, currentTime, showColorPicker, selectedRows,
    draggedItemIndex, isDraggingMultiple, dropTargetIndex, currentSegmentId,
    hasClipboardData, getColumnWidth, updateColumnWidth, getRowNumber,
    getRowStatus, calculateHeaderDuration, handleUpdateItem, handleCellClick,
    handleKeyDown, handleToggleColorPicker, handleColorSelect, deleteRow,
    toggleFloatRow, handleRowSelection, handleDragStart, handleDragOver,
    handleDragLeave, handleDrop, handleCopySelectedRows, handleDeleteSelectedRows,
    handlePasteRows, clearSelection, handleAddRow, handleAddHeader,
    updateTrigger, forceRenderTrigger, JSON.stringify(items)
  ]);

  return (
    <RundownTable
      key={renderKey} // Force re-render when any trigger changes
      {...tableProps}
    />
  );
};

export default RundownGrid;

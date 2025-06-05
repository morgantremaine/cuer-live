
import React, { useRef, useEffect } from 'react';
import RundownTable from './RundownTable';
import { useRundownGridState } from '@/hooks/useRundownGridState';
import { useRundownGridUI } from '@/hooks/useRundownGridUI';
import { useColorPicker } from '@/hooks/useColorPicker';
import { useCellNavigation } from '@/hooks/useCellNavigation';

const RundownGrid = () => {
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});
  const gridRef = useRef<HTMLDivElement>(null);
  
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

  // Add keyboard shortcut for Cmd/Ctrl + Enter to add new segment
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd/Ctrl + Enter or Cmd/Ctrl + Return
      if ((e.metaKey || e.ctrlKey) && (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter')) {
        // Only trigger if we're not in an input field
        const activeElement = document.activeElement;
        const isInInput = activeElement && (
          activeElement.tagName === 'INPUT' || 
          activeElement.tagName === 'TEXTAREA' || 
          activeElement.contentEditable === 'true'
        );
        
        if (!isInInput) {
          e.preventDefault();
          handleAddRow();
        }
      }
    };

    // Add event listener to document to capture keyboard events globally
    document.addEventListener('keydown', handleGlobalKeyDown);

    // Cleanup event listener
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [handleAddRow]);

  // Create a wrapper function that matches the expected signature
  const handleColorSelect = (id: string, color: string) => {
    handleUpdateItem(id, 'color', color);
    colorPickerSelect(id, color);
  };

  console.log('RundownGrid: handleAddRow exists?', !!handleAddRow);
  console.log('RundownGrid: handleAddHeader exists?', !!handleAddHeader);

  return (
    <div 
      ref={gridRef}
      tabIndex={0}
      className="focus:outline-none"
    >
      <RundownTable
        items={items}
        visibleColumns={visibleColumns}
        currentTime={currentTime}
        showColorPicker={showColorPicker}
        cellRefs={cellRefs}
        selectedRows={selectedRows}
        draggedItemIndex={draggedItemIndex}
        isDraggingMultiple={isDraggingMultiple}
        dropTargetIndex={dropTargetIndex}
        currentSegmentId={currentSegmentId}
        hasClipboardData={hasClipboardData}
        getColumnWidth={getColumnWidth}
        updateColumnWidth={updateColumnWidth}
        getRowNumber={getRowNumber}
        getRowStatus={getRowStatus}
        calculateHeaderDuration={calculateHeaderDuration}
        onUpdateItem={handleUpdateItem}
        onCellClick={handleCellClick}
        onKeyDown={handleKeyDown}
        onToggleColorPicker={handleToggleColorPicker}
        onColorSelect={handleColorSelect}
        onDeleteRow={deleteRow}
        onToggleFloat={toggleFloatRow}
        onRowSelect={handleRowSelection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onCopySelectedRows={handleCopySelectedRows}
        onDeleteSelectedRows={handleDeleteSelectedRows}
        onPasteRows={handlePasteRows}
        onClearSelection={clearSelection}
        onAddRow={handleAddRow}
        onAddHeader={handleAddHeader}
      />
    </div>
  );
};

export default RundownGrid;

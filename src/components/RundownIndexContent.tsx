
import React from 'react';
import RundownContainer from '@/components/RundownContainer';
import CuerChatButton from '@/components/cuer/CuerChatButton';
import { useRundownGridState } from '@/hooks/useRundownGridState';
import { useIndexHandlers } from '@/hooks/useIndexHandlers';

const RundownIndexContent = () => {
  const gridState = useRundownGridState();
  
  const {
    currentTime,
    timezone,
    showColumnManager,
    setShowColumnManager,
    rundownTitle,
    setRundownTitle,
    rundownStartTime,
    rundownId,
    items,
    visibleColumns,
    columns,
    showColorPicker,
    cellRefs,
    selectedRows,
    draggedItemIndex,
    isDraggingMultiple,
    dropTargetIndex,
    currentSegmentId,
    getColumnWidth,
    updateColumnWidth,
    getRowNumber,
    getRowStatus,
    calculateHeaderDuration,
    updateItem,
    handleCellClick,
    handleKeyDown,
    handleToggleColorPicker,
    selectColor,
    deleteRow,
    toggleFloatRow,
    toggleRowSelection,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    addRow,
    addHeader,
    hasClipboardData,
    clearSelection,
    isPlaying,
    timeRemaining,
    play,
    pause,
    forward,
    backward,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleRenameColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    hasUnsavedChanges,
    isSaving,
    calculateTotalRuntime,
    calculateEndTime,
    markAsChanged,
    handleCopySelectedRows,
    handlePasteRows,
    handleDeleteSelectedRows,
    setRundownStartTime,
    setTimezone,
    handleUndo,
    canUndo,
    lastAction,
    // Polling props
    hasRemoteUpdates,
    clearRemoteUpdatesIndicator
  } = gridState;

  const {
    handleRundownStartTimeChange,
    handleTimezoneChange,
    handleOpenTeleprompter,
    handleRowSelect,
    handleAddRow,
    handleAddHeader
  } = useIndexHandlers({
    items,
    selectedRows,
    rundownId,
    addRow,
    addHeader,
    calculateEndTime,
    toggleRowSelection,
    setRundownStartTime,
    setTimezone,
    markAsChanged
  });

  const selectedRowsArray = Array.from(selectedRows);
  const selectedRowId = selectedRowsArray.length === 1 ? selectedRowsArray[0] : null;

  // Create wrapper functions to fix signature mismatches
  const handleKeyDownWrapper = (event: React.KeyboardEvent) => {
    // Extract the target element to determine itemId and field
    const target = event.target as HTMLElement;
    const itemId = target.getAttribute('data-item-id') || '';
    const field = target.getAttribute('data-field') || '';
    handleKeyDown(event, itemId, field);
  };

  const handleRowSelectWrapper = (itemId: string, event: React.MouseEvent) => {
    const index = items.findIndex(item => item.id === itemId);
    if (index !== -1) {
      handleRowSelect(itemId, index, event.shiftKey, event.ctrlKey || event.metaKey);
    }
  };

  const handleDragStartWrapper = (index: number) => {
    const event = {} as React.DragEvent;
    handleDragStart(event, index);
  };

  const handleDragOverWrapper = (index: number) => {
    const event = {} as React.DragEvent;
    handleDragOver(event, index);
  };

  const handleDragLeaveWrapper = () => {
    const event = {} as React.DragEvent;
    handleDragLeave(event);
  };

  const handleDropWrapper = (targetIndex: number) => {
    const event = {} as React.DragEvent;
    handleDrop(event, targetIndex);
  };

  // Convert getRowStatus to return correct type
  const getRowStatusWrapper = (item: any) => {
    const status = getRowStatus(item);
    // Map 'completed' to 'past' to match expected type
    return status === 'completed' ? 'past' : status;
  };

  // Create adapter for getColumnWidth that takes string and returns number
  const getColumnWidthAdapter = (columnId: string): number => {
    // Find the column by ID and call the original function
    const column = columns.find(col => col.id === columnId);
    if (column) {
      const width = getColumnWidth(column);
      // Convert string width to number if needed
      if (typeof width === 'string') {
        return parseInt(width.replace('px', '')) || 150;
      }
      return width;
    }
    return 150; // Default width
  };

  // Create adapter for handleReorderColumns
  const handleReorderColumnsWrapper = (startIndex: number, endIndex: number) => {
    // This is a simplified implementation - you may need to adjust based on your actual requirements
    const newColumns = [...columns];
    const [removed] = newColumns.splice(startIndex, 1);
    newColumns.splice(endIndex, 0, removed);
    handleLoadLayout(newColumns);
  };

  // Convert hasClipboardData to boolean
  const hasClipboardDataBoolean = typeof hasClipboardData === 'function' ? hasClipboardData() : Boolean(hasClipboardData);

  // Convert timeRemaining to string
  const timeRemainingString = typeof timeRemaining === 'number' ? timeRemaining.toString() : (timeRemaining || '0');

  // Prepare rundown data for Cuer AI
  const rundownData = {
    id: rundownId,
    title: rundownTitle,
    startTime: rundownStartTime,
    timezone: timezone,
    items: items,
    columns: columns,
    totalRuntime: calculateTotalRuntime()
  };

  return (
    <>
      <RundownContainer
        currentTime={currentTime}
        timezone={timezone}
        onTimezoneChange={handleTimezoneChange}
        totalRuntime={calculateTotalRuntime()}
        showColumnManager={showColumnManager}
        setShowColumnManager={setShowColumnManager}
        items={items}
        visibleColumns={visibleColumns}
        columns={columns}
        showColorPicker={showColorPicker}
        cellRefs={cellRefs}
        selectedRows={selectedRows}
        draggedItemIndex={draggedItemIndex}
        isDraggingMultiple={isDraggingMultiple}
        dropTargetIndex={dropTargetIndex}
        currentSegmentId={currentSegmentId}
        getColumnWidth={getColumnWidthAdapter}
        updateColumnWidth={updateColumnWidth}
        getRowNumber={getRowNumber}
        getRowStatus={getRowStatusWrapper}
        calculateHeaderDuration={calculateHeaderDuration}
        onUpdateItem={updateItem}
        onCellClick={handleCellClick}
        onKeyDown={handleKeyDownWrapper}
        onToggleColorPicker={handleToggleColorPicker}
        onColorSelect={(id, color) => selectColor(id, color)}
        onDeleteRow={deleteRow}
        onToggleFloat={toggleFloatRow}
        onRowSelect={handleRowSelectWrapper}
        onDragStart={handleDragStartWrapper}
        onDragOver={handleDragOverWrapper}
        onDragLeave={handleDragLeaveWrapper}
        onDrop={handleDropWrapper}
        onAddRow={handleAddRow}
        onAddHeader={handleAddHeader}
        selectedCount={selectedRows.size}
        hasClipboardData={hasClipboardDataBoolean}
        onCopySelectedRows={handleCopySelectedRows}
        onPasteRows={handlePasteRows}
        onDeleteSelectedRows={handleDeleteSelectedRows}
        onClearSelection={clearSelection}
        selectedRowId={selectedRowId}
        isPlaying={isPlaying}
        timeRemaining={timeRemainingString}
        onPlay={play}
        onPause={pause}
        onForward={forward}
        onBackward={backward}
        handleAddColumn={handleAddColumn}
        handleReorderColumns={handleReorderColumnsWrapper}
        handleDeleteColumnWithCleanup={handleDeleteColumn}
        handleRenameColumn={handleRenameColumn}
        handleToggleColumnVisibility={handleToggleColumnVisibility}
        handleLoadLayout={handleLoadLayout}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        rundownTitle={rundownTitle}
        onTitleChange={setRundownTitle}
        rundownStartTime={rundownStartTime}
        onRundownStartTimeChange={handleRundownStartTimeChange}
        rundownId={rundownId || ''}
        onOpenTeleprompter={handleOpenTeleprompter}
        onUndo={handleUndo}
        canUndo={canUndo}
        lastAction={lastAction}
        // Polling props
        hasRemoteUpdates={hasRemoteUpdates || false}
        clearRemoteUpdatesIndicator={clearRemoteUpdatesIndicator || (() => {})}
      />
      
      {/* Cuer AI Chat Button with rundown data */}
      <CuerChatButton rundownData={rundownData} />
    </>
  );
};

export default RundownIndexContent;

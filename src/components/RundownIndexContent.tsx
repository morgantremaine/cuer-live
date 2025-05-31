
import React from 'react';
import RundownContainer from '@/components/RundownContainer';
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
    setTimezone
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

  return (
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
      currentSegmentId={currentSegmentId}
      getColumnWidth={getColumnWidth}
      updateColumnWidth={updateColumnWidth}
      getRowNumber={getRowNumber}
      getRowStatus={getRowStatus}
      calculateHeaderDuration={calculateHeaderDuration}
      onUpdateItem={updateItem}
      onCellClick={handleCellClick}
      onKeyDown={handleKeyDown}
      onToggleColorPicker={handleToggleColorPicker}
      onColorSelect={(id, color) => selectColor(id, color)}
      onDeleteRow={deleteRow}
      onToggleFloat={toggleFloatRow}
      onRowSelect={handleRowSelect}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onAddRow={handleAddRow}
      onAddHeader={handleAddHeader}
      selectedCount={selectedRows.size}
      hasClipboardData={hasClipboardData()}
      onCopySelectedRows={handleCopySelectedRows}
      onPasteRows={handlePasteRows}
      onDeleteSelectedRows={handleDeleteSelectedRows}
      onClearSelection={clearSelection}
      selectedRowId={selectedRowId}
      isPlaying={isPlaying}
      timeRemaining={timeRemaining}
      onPlay={play}
      onPause={pause}
      onForward={forward}
      onBackward={backward}
      handleAddColumn={handleAddColumn}
      handleReorderColumns={handleReorderColumns}
      handleDeleteColumnWithCleanup={handleDeleteColumn}
      handleToggleColumnVisibility={handleToggleColumnVisibility}
      handleLoadLayout={handleLoadLayout}
      hasUnsavedChanges={hasUnsavedChanges}
      isSaving={isSaving}
      rundownTitle={rundownTitle}
      onTitleChange={setRundownTitle}
      rundownStartTime={rundownStartTime}
      onRundownStartTimeChange={handleRundownStartTimeChange}
      rundownId={rundownId}
      onOpenTeleprompter={handleOpenTeleprompter}
    />
  );
};

export default RundownIndexContent;

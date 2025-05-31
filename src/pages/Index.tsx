
import React from 'react';
import RundownContainer from '@/components/RundownContainer';
import { useRundownGridState } from '@/hooks/useRundownGridState';

const Index = () => {
  const {
    currentTime,
    timezone,
    setTimezone,
    showColumnManager,
    setShowColumnManager,
    rundownTitle,
    setRundownTitle,
    rundownStartTime,
    setRundownStartTime,
    items,
    visibleColumns,
    columns,
    showColorPicker,
    cellRefs,
    selectedRows,
    draggedItemIndex,
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
    selectedRows: selectedRowsSet,
    hasClipboardData,
    copyItems,
    addMultipleRows,
    deleteMultipleRows,
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
    markAsChanged
  } = useRundownGridState();

  const selectedRowsArray = Array.from(selectedRowsSet);
  const selectedRowId = selectedRowsArray.length === 1 ? selectedRowsArray[0] : null;

  const handleRundownStartTimeChange = (startTime: string) => {
    setRundownStartTime(startTime);
    markAsChanged();
  };

  const handleTimezoneChange = (timezone: string) => {
    setTimezone(timezone);
    markAsChanged();
  };

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
      selectedRows={selectedRowsSet}
      draggedItemIndex={draggedItemIndex}
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
      onColorSelect={(id, color) => selectColor(id, color, updateItem)}
      onDeleteRow={deleteRow}
      onToggleFloat={toggleFloatRow}
      onRowSelect={(itemId, index, isShiftClick, isCtrlClick) => 
        toggleRowSelection(itemId, index, isShiftClick, isCtrlClick, items)
      }
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onAddRow={() => addRow(calculateEndTime)}
      onAddHeader={addHeader}
      selectedCount={selectedRowsSet.size}
      hasClipboardData={hasClipboardData()}
      onCopySelectedRows={() => copyItems(Array.from(selectedRowsSet).map(id => items.find(item => item.id === id)!).filter(Boolean))}
      onPasteRows={() => addMultipleRows([], calculateEndTime)}
      onDeleteSelectedRows={() => deleteMultipleRows(Array.from(selectedRowsSet))}
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
    />
  );
};

export default Index;

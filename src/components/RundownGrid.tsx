
import React, { useState, useEffect } from 'react';
import RundownContainer from './RundownContainer';
import { useRundownItems } from '@/hooks/useRundownItems';
import { useColumnsManager } from '@/hooks/useColumnsManager';
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { useCellNavigation } from '@/hooks/useCellNavigation';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useTimeCalculations } from '@/hooks/useTimeCalculations';
import { useColorPicker } from '@/hooks/useColorPicker';
import { useMultiRowSelection } from '@/hooks/useMultiRowSelection';
import { useClipboard } from '@/hooks/useClipboard';
import { usePlaybackControls } from '@/hooks/usePlaybackControls';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useRundownHandlers } from '@/hooks/useRundownHandlers';

const RundownGrid = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timezone, setTimezone] = useState('America/New_York');
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [rundownTitle, setRundownTitle] = useState('Live Broadcast Rundown');

  const {
    items,
    setItems,
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    deleteMultipleRows,
    addMultipleRows,
    getRowNumber,
    toggleFloatRow,
    calculateTotalRuntime,
    calculateHeaderDuration
  } = useRundownItems();

  const { hasUnsavedChanges, markAsChanged } = useAutoSave(items, rundownTitle);

  const {
    columns,
    visibleColumns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleToggleColumnVisibility
  } = useColumnsManager();

  const {
    columnWidths,
    updateColumnWidth,
    getColumnWidth
  } = useResizableColumns(visibleColumns);

  const {
    selectedCell,
    cellRefs,
    handleCellClick,
    handleKeyDown
  } = useCellNavigation(visibleColumns, items);

  const {
    draggedItemIndex,
    handleDragStart,
    handleDragOver,
    handleDrop
  } = useDragAndDrop(items, setItems);

  const {
    calculateEndTime,
    getRowStatus
  } = useTimeCalculations(items, updateItem);

  const {
    showColorPicker,
    handleToggleColorPicker,
    handleColorSelect: selectColor
  } = useColorPicker();

  const {
    selectedRows,
    toggleRowSelection,
    clearSelection
  } = useMultiRowSelection();

  const {
    clipboardItems,
    copyItems,
    hasClipboardData
  } = useClipboard();

  const {
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward
  } = usePlaybackControls(items, updateItem);

  const {
    handleUpdateItem,
    handleAddRow,
    handleAddHeader,
    handleDeleteRow,
    handleToggleFloat,
    handleColorSelect,
    handleDeleteSelectedRows,
    handlePasteRows,
    handleDeleteColumnWithCleanup
  } = useRundownHandlers({
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
    markAsChanged
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopySelectedRows = () => {
    const selectedItems = items.filter(item => selectedRows.has(item.id));
    copyItems(selectedItems);
    clearSelection();
  };

  const handleRowSelection = (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    toggleRowSelection(itemId, index, isShiftClick, isCtrlClick, items);
  };

  const handleTitleChange = (title: string) => {
    setRundownTitle(title);
    markAsChanged();
  };

  const selectedCount = selectedRows.size;
  const selectedRowId = selectedCount === 1 ? Array.from(selectedRows)[0] : null;

  return (
    <RundownContainer
      currentTime={currentTime}
      timezone={timezone}
      onTimezoneChange={setTimezone}
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
      currentSegmentId={currentSegmentId}
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
      onDeleteRow={handleDeleteRow}
      onToggleFloat={handleToggleFloat}
      onRowSelect={handleRowSelection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onAddRow={handleAddRow}
      onAddHeader={handleAddHeader}
      selectedCount={selectedCount}
      hasClipboardData={hasClipboardData()}
      onCopySelectedRows={handleCopySelectedRows}
      onPasteRows={() => handlePasteRows(clipboardItems, hasClipboardData)}
      onDeleteSelectedRows={() => handleDeleteSelectedRows(selectedRows, clearSelection)}
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
      handleDeleteColumnWithCleanup={handleDeleteColumnWithCleanup}
      handleToggleColumnVisibility={handleToggleColumnVisibility}
      hasUnsavedChanges={hasUnsavedChanges}
      rundownTitle={rundownTitle}
      onTitleChange={handleTitleChange}
    />
  );
};

export default RundownGrid;

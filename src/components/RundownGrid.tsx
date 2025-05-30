
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

const RundownGrid = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timezone, setTimezone] = useState('America/New_York');
  const [showColumnManager, setShowColumnManager] = useState(false);

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
    handleColorSelect
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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDeleteColumnWithCleanup = (columnId: string) => {
    handleDeleteColumn(columnId);
    setItems(prev => prev.map(item => {
      if (item.customFields) {
        const { [columnId]: removed, ...rest } = item.customFields;
        return { ...item, customFields: rest };
      }
      return item;
    }));
  };

  const handleCopySelectedRows = () => {
    const selectedItems = items.filter(item => selectedRows.has(item.id));
    copyItems(selectedItems);
    clearSelection();
  };

  const handlePasteRows = () => {
    if (hasClipboardData()) {
      addMultipleRows(clipboardItems, calculateEndTime);
    }
  };

  const handleDeleteSelectedRows = () => {
    deleteMultipleRows(Array.from(selectedRows));
    clearSelection();
  };

  const handleRowSelection = (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    toggleRowSelection(itemId, index, isShiftClick, isCtrlClick, items);
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
      onUpdateItem={updateItem}
      onCellClick={handleCellClick}
      onKeyDown={handleKeyDown}
      onToggleColorPicker={handleToggleColorPicker}
      onColorSelect={(id, color) => handleColorSelect(id, color, updateItem)}
      onDeleteRow={deleteRow}
      onToggleFloat={toggleFloatRow}
      onRowSelect={handleRowSelection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onAddRow={() => addRow(calculateEndTime)}
      onAddHeader={addHeader}
      selectedCount={selectedCount}
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
      handleDeleteColumnWithCleanup={handleDeleteColumnWithCleanup}
      handleToggleColumnVisibility={handleToggleColumnVisibility}
    />
  );
};

export default RundownGrid;

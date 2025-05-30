import React, { useState, useEffect, useCallback } from 'react';
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
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useParams } from 'react-router-dom';

const RundownGrid = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timezone, setTimezone] = useState('America/New_York');
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [rundownTitle, setRundownTitle] = useState('Live Broadcast Rundown');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { id: rundownId } = useParams<{ id: string }>();

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

  const { updateRundown } = useRundownStorage();

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

  // Debounced auto-save functionality
  const debouncedSave = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          if (rundownId && hasUnsavedChanges) {
            console.log('Auto-saving rundown...');
            await updateRundown(rundownId, rundownTitle, items);
            setHasUnsavedChanges(false);
          }
        }, 2000); // 2 second debounce
      };
    })(),
    [rundownId, rundownTitle, items, hasUnsavedChanges, updateRundown]
  );

  // Track changes to items and trigger auto-save
  useEffect(() => {
    if (rundownId) {
      setHasUnsavedChanges(true);
      debouncedSave();
    }
  }, [items, rundownTitle, debouncedSave, rundownId]);

  // Wrapped update functions to trigger auto-save
  const handleUpdateItem = (id: string, field: string, value: string) => {
    updateItem(id, field, value);
    setHasUnsavedChanges(true);
  };

  const handleAddRow = () => {
    addRow(calculateEndTime);
    setHasUnsavedChanges(true);
  };

  const handleAddHeader = () => {
    addHeader();
    setHasUnsavedChanges(true);
  };

  const handleDeleteRow = (id: string) => {
    deleteRow(id);
    setHasUnsavedChanges(true);
  };

  const handleToggleFloat = (id: string) => {
    toggleFloatRow(id);
    setHasUnsavedChanges(true);
  };

  const handleColorSelect = (id: string, color: string) => {
    handleColorSelect(id, color, updateItem);
    setHasUnsavedChanges(true);
  };

  const handleDeleteSelectedRows = () => {
    deleteMultipleRows(Array.from(selectedRows));
    clearSelection();
    setHasUnsavedChanges(true);
  };

  const handlePasteRows = () => {
    if (hasClipboardData()) {
      addMultipleRows(clipboardItems, calculateEndTime);
      setHasUnsavedChanges(true);
    }
  };

  const handleDeleteColumnWithCleanup = (columnId: string) => {
    handleDeleteColumn(columnId);
    setItems(prev => prev.map(item => {
      if (item.customFields) {
        const { [columnId]: removed, ...rest } = item.customFields;
        return { ...item, customFields: rest };
      }
      return item;
    }));
    setHasUnsavedChanges(true);
  };

  const handleCopySelectedRows = () => {
    const selectedItems = items.filter(item => selectedRows.has(item.id));
    copyItems(selectedItems);
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
      hasUnsavedChanges={hasUnsavedChanges}
      rundownTitle={rundownTitle}
      onTitleChange={setRundownTitle}
    />
  );
};

export default RundownGrid;

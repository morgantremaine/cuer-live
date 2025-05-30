
import React from 'react';
import RundownContainer from './RundownContainer';
import { useRundownGridState } from '@/hooks/useRundownGridState';
import { useRundownGridHandlers } from '@/hooks/useRundownGridHandlers';

const RundownGrid = () => {
  const state = useRundownGridState();
  
  const handlers = useRundownGridHandlers({
    updateItem: state.updateItem,
    addRow: state.addRow,
    addHeader: state.addHeader,
    deleteRow: state.deleteRow,
    toggleFloatRow: state.toggleFloatRow,
    deleteMultipleRows: state.deleteMultipleRows,
    addMultipleRows: state.addMultipleRows,
    handleDeleteColumn: state.handleDeleteColumn,
    setItems: state.setItems,
    calculateEndTime: state.calculateEndTime,
    selectColor: state.selectColor,
    markAsChanged: state.markAsChanged,
    manualSave: state.manualSave,
    selectedRows: state.selectedRows,
    clearSelection: state.clearSelection,
    copyItems: state.copyItems,
    clipboardItems: state.clipboardItems,
    hasClipboardData: state.hasClipboardData,
    toggleRowSelection: state.toggleRowSelection,
    items: state.items,
    setRundownTitle: state.setRundownTitle
  });

  const selectedCount = state.selectedRows.size;
  const selectedRowId = selectedCount === 1 ? Array.from(state.selectedRows)[0] : null;

  console.log('RundownGrid render - hasUnsavedChanges:', state.hasUnsavedChanges);

  return (
    <RundownContainer
      currentTime={state.currentTime}
      timezone={state.timezone}
      onTimezoneChange={state.setTimezone}
      totalRuntime={state.calculateTotalRuntime()}
      showColumnManager={state.showColumnManager}
      setShowColumnManager={state.setShowColumnManager}
      items={state.items}
      visibleColumns={state.visibleColumns}
      columns={state.columns}
      showColorPicker={state.showColorPicker}
      cellRefs={state.cellRefs}
      selectedRows={state.selectedRows}
      draggedItemIndex={state.draggedItemIndex}
      currentSegmentId={state.currentSegmentId}
      getColumnWidth={state.getColumnWidth}
      updateColumnWidth={state.updateColumnWidth}
      getRowNumber={state.getRowNumber}
      getRowStatus={state.getRowStatus}
      calculateHeaderDuration={state.calculateHeaderDuration}
      onUpdateItem={handlers.handleUpdateItem}
      onCellClick={state.handleCellClick}
      onKeyDown={state.handleKeyDown}
      onToggleColorPicker={state.handleToggleColorPicker}
      onColorSelect={handlers.handleColorSelect}
      onDeleteRow={handlers.handleDeleteRow}
      onToggleFloat={handlers.handleToggleFloat}
      onRowSelect={handlers.handleRowSelection}
      onDragStart={state.handleDragStart}
      onDragOver={state.handleDragOver}
      onDrop={state.handleDrop}
      onAddRow={handlers.handleAddRow}
      onAddHeader={handlers.handleAddHeader}
      selectedCount={selectedCount}
      hasClipboardData={state.hasClipboardData()}
      onCopySelectedRows={handlers.handleCopySelectedRows}
      onPasteRows={handlers.handlePasteRows}
      onDeleteSelectedRows={handlers.handleDeleteSelectedRows}
      onClearSelection={state.clearSelection}
      selectedRowId={selectedRowId}
      isPlaying={state.isPlaying}
      timeRemaining={state.timeRemaining}
      onPlay={state.play}
      onPause={state.pause}
      onForward={state.forward}
      onBackward={state.backward}
      handleAddColumn={(name: string) => {
        console.log('Adding column:', name);
        state.handleAddColumn(name);
        state.markAsChanged();
      }}
      handleReorderColumns={(columns) => {
        console.log('Reordering columns');
        state.handleReorderColumns(columns);
        state.markAsChanged();
      }}
      handleDeleteColumnWithCleanup={handlers.handleDeleteColumnWithCleanup}
      handleToggleColumnVisibility={(columnId: string) => {
        console.log('Toggling column visibility:', columnId);
        state.handleToggleColumnVisibility(columnId);
        state.markAsChanged();
      }}
      handleLoadLayout={(layoutColumns) => {
        console.log('Loading layout');
        state.handleLoadLayout(layoutColumns);
        state.markAsChanged();
      }}
      hasUnsavedChanges={state.hasUnsavedChanges}
      rundownTitle={state.rundownTitle}
      onTitleChange={handlers.handleTitleChange}
      onManualSave={handlers.handleManualSave}
    />
  );
};

export default RundownGrid;

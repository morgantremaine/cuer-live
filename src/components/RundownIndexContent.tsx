
import React from 'react';
import RundownContainer from './RundownContainer';
import { useRundownGridState } from '@/hooks/useRundownGridState';

const RundownIndexContent = () => {
  const state = useRundownGridState();

  return (
    <div className="min-h-screen bg-gray-50">
      <RundownContainer
        currentTime={state.currentTime}
        timezone={state.timezone}
        onTimezoneChange={state.setTimezone}
        totalRuntime={state.calculateTotalRuntime()}
        onAddRow={state.addRow}
        onAddHeader={state.addHeader}
        onShowColumnManager={() => state.setShowColumnManager(true)}
        selectedCount={state.selectedRows.size}
        hasClipboardData={state.hasClipboardData}
        onCopySelectedRows={state.handleCopySelectedRows}
        onPasteRows={state.handlePasteRows}
        onDeleteSelectedRows={state.handleDeleteSelectedRows}
        onClearSelection={state.clearSelection}
        selectedRowId={state.selectedRows.size === 1 ? Array.from(state.selectedRows)[0] : null}
        isPlaying={state.isPlaying}
        currentSegmentId={state.currentSegmentId}
        timeRemaining={state.timeRemaining}
        onPlay={state.play}
        onPause={state.pause}
        onForward={state.forward}
        onBackward={state.backward}
        hasUnsavedChanges={state.hasUnsavedChanges}
        isSaving={state.isSaving}
        rundownTitle={state.rundownTitle}
        onTitleChange={state.setRundownTitle}
        rundownStartTime={state.rundownStartTime}
        onRundownStartTimeChange={state.setRundownStartTime}
        rundownId={state.rundownId}
        onOpenTeleprompter={() => {}}
        items={state.items}
        visibleColumns={state.visibleColumns}
        columns={state.columns}
        showColorPicker={state.showColorPicker}
        cellRefs={state.cellRefs}
        selectedRows={state.selectedRows}
        draggedItemIndex={state.draggedItemIndex}
        isDraggingMultiple={state.isDraggingMultiple}
        dropTargetIndex={state.dropTargetIndex}
        getColumnWidth={state.getColumnWidth}
        updateColumnWidth={state.updateColumnWidth}
        getRowNumber={state.getRowNumber}
        getRowStatus={state.getRowStatus}
        calculateHeaderDuration={state.calculateHeaderDuration}
        onUpdateItem={state.updateItem}
        onCellClick={state.handleCellClick}
        onKeyDown={state.handleKeyDown}
        onToggleColorPicker={state.handleToggleColorPicker}
        onColorSelect={state.selectColor}
        onDeleteRow={state.deleteRow}
        onToggleFloat={state.toggleFloatRow}
        onRowSelect={state.handleRowSelect}
        onDragStart={state.handleDragStart}
        onDragOver={state.handleDragOver}
        onDragLeave={state.handleDragLeave}
        onDrop={state.handleDrop}
        showColumnManager={state.showColumnManager}
        handleAddColumn={state.handleAddColumn}
        handleReorderColumns={state.handleReorderColumns}
        handleDeleteColumnWithCleanup={state.handleDeleteColumnWithCleanup}
        handleToggleColumnVisibility={state.handleToggleColumnVisibility}
        handleLoadLayout={state.handleLoadLayout}
        onCloseColumnManager={() => state.setShowColumnManager(false)}
        onHighlightMatch={() => {}}
        onReplaceText={() => {}}
        currentHighlight={null}
      />
    </div>
  );
};

export default RundownIndexContent;

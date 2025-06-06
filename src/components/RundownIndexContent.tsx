
import React from 'react';
import RundownContainer from '@/components/RundownContainer';
import CuerChatButton from '@/components/cuer/CuerChatButton';
import { useUnifiedRundownState } from '@/hooks/useUnifiedRundownState';

const RundownIndexContent = () => {
  const { state, handlers } = useUnifiedRundownState();

  const selectedRowsArray = Array.from(state.selectedRows);
  const selectedRowId = selectedRowsArray.length === 1 ? selectedRowsArray[0] : null;

  // Prepare rundown data for Cuer AI
  const rundownData = {
    id: state.rundownId,
    title: state.rundownTitle,
    startTime: state.rundownStartTime,
    timezone: state.timezone,
    items: state.items,
    columns: state.columns,
    totalRuntime: handlers.calculateTotalRuntime()
  };

  return (
    <>
      <RundownContainer
        currentTime={state.currentTime}
        timezone={state.timezone}
        onTimezoneChange={handlers.onTimezoneChange}
        totalRuntime={handlers.calculateTotalRuntime()}
        showColumnManager={state.showColumnManager}
        setShowColumnManager={handlers.setShowColumnManager}
        items={state.items}
        visibleColumns={state.visibleColumns}
        columns={state.columns}
        showColorPicker={state.showColorPicker}
        cellRefs={state.cellRefs}
        selectedRows={state.selectedRows}
        draggedItemIndex={state.draggedItemIndex}
        isDraggingMultiple={state.isDraggingMultiple}
        dropTargetIndex={state.dropTargetIndex}
        currentSegmentId={state.currentSegmentId}
        getColumnWidth={handlers.getColumnWidth}
        updateColumnWidth={handlers.updateColumnWidth}
        getRowNumber={handlers.getRowNumber}
        getRowStatus={handlers.getRowStatus}
        calculateHeaderDuration={handlers.calculateHeaderDuration}
        onUpdateItem={handlers.onUpdateItem}
        onCellClick={handlers.onCellClick}
        onKeyDown={handlers.onKeyDown}
        onToggleColorPicker={handlers.onToggleColorPicker}
        onColorSelect={handlers.onColorSelect}
        onDeleteRow={handlers.onDeleteRow}
        onToggleFloat={handlers.onToggleFloat}
        onRowSelect={handlers.onRowSelect}
        onDragStart={handlers.onDragStart}
        onDragOver={handlers.onDragOver}
        onDragLeave={handlers.onDragLeave}
        onDrop={handlers.onDrop}
        onAddRow={handlers.onAddRow}
        onAddHeader={handlers.onAddHeader}
        selectedCount={state.selectedRows.size}
        hasClipboardData={state.hasClipboardData}
        onCopySelectedRows={handlers.onCopySelectedRows}
        onPasteRows={handlers.onPasteRows}
        onDeleteSelectedRows={handlers.onDeleteSelectedRows}
        onClearSelection={handlers.onClearSelection}
        selectedRowId={selectedRowId}
        isPlaying={state.isPlaying}
        timeRemaining={state.timeRemaining.toString()}
        onPlay={handlers.onPlay}
        onPause={handlers.onPause}
        onForward={handlers.onForward}
        onBackward={handlers.onBackward}
        handleAddColumn={handlers.handleAddColumn}
        handleReorderColumns={handlers.handleReorderColumns}
        handleDeleteColumnWithCleanup={handlers.handleDeleteColumn}
        handleRenameColumn={handlers.handleRenameColumn}
        handleToggleColumnVisibility={handlers.handleToggleColumnVisibility}
        handleLoadLayout={handlers.handleLoadLayout}
        hasUnsavedChanges={state.hasUnsavedChanges}
        isSaving={state.isSaving}
        rundownTitle={state.rundownTitle}
        onTitleChange={handlers.onTitleChange}
        rundownStartTime={state.rundownStartTime}
        onRundownStartTimeChange={handlers.onRundownStartTimeChange}
        rundownId={state.rundownId}
        onOpenTeleprompter={handlers.onOpenTeleprompter}
        onUndo={handlers.onUndo}
        canUndo={state.canUndo}
        lastAction={state.lastAction}
        hasRemoteUpdates={state.hasRemoteUpdates}
        clearRemoteUpdatesIndicator={handlers.clearRemoteUpdatesIndicator}
      />
      
      {/* Cuer AI Chat Button with rundown data */}
      <CuerChatButton rundownData={rundownData} />
    </>
  );
};

export default RundownIndexContent;


import React from 'react';
import { useRundownGridState } from '@/hooks/useRundownGridState';
import { useGlobalKeyboardControls } from '@/hooks/useGlobalKeyboardControls';
import RundownHeader from './RundownHeader';
import RundownMainContent from './RundownMainContent';
import RundownFooter from './RundownFooter';
import ColumnManager from './ColumnManager';

const RundownGrid = () => {
  const state = useRundownGridState();

  // Add global keyboard controls
  useGlobalKeyboardControls({
    isPlaying: state.isPlaying,
    onPlay: () => {
      if (state.currentSegmentId) {
        state.play();
      }
    },
    onPause: state.pause,
    onForward: state.forward,
    onBackward: state.backward
  });

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <RundownHeader
        currentTime={state.currentTime}
        timezone={state.timezone}
        onTimezoneChange={state.setTimezone}
        totalRuntime={state.calculateTotalRuntime()}
        hasUnsavedChanges={state.hasUnsavedChanges}
        isSaving={state.isSaving}
        title={state.rundownTitle}
        onTitleChange={state.setRundownTitle}
        rundownStartTime={state.rundownStartTime}
        onRundownStartTimeChange={state.setRundownStartTime}
        items={state.items}
        visibleColumns={state.visibleColumns}
        onHighlightMatch={state.onHighlightMatch}
        onReplaceText={state.onReplaceText}
        currentHighlight={state.currentHighlight}
      />
      
      <RundownMainContent
        items={state.items}
        visibleColumns={state.visibleColumns}
        columns={state.columns}
        currentTime={state.currentTime}
        showColorPicker={state.showColorPicker}
        cellRefs={state.cellRefs}
        selectedRows={state.selectedRows}
        draggedItemIndex={state.draggedItemIndex}
        isDraggingMultiple={state.isDraggingMultiple}
        dropTargetIndex={state.dropTargetIndex}
        currentSegmentId={state.currentSegmentId}
        hasClipboardData={state.hasClipboardData}
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
        onCopySelectedRows={state.handleCopySelectedRows}
        onDeleteSelectedRows={state.handleDeleteSelectedRows}
        onPasteRows={state.handlePasteRows}
        onClearSelection={state.clearSelection}
        showColumnManager={state.showColumnManager}
        handleAddColumn={state.handleAddColumn}
        handleReorderColumns={state.handleReorderColumns}
        handleDeleteColumnWithCleanup={state.handleDeleteColumnWithCleanup}
        handleToggleColumnVisibility={state.handleToggleColumnVisibility}
        handleLoadLayout={state.handleLoadLayout}
        onCloseColumnManager={() => state.setShowColumnManager(false)}
      />
      
      <RundownFooter totalSegments={state.items.length} />
      
      {state.showColumnManager && (
        <ColumnManager
          columns={state.columns}
          onAddColumn={state.handleAddColumn}
          onReorderColumns={state.handleReorderColumns}
          onDeleteColumn={state.handleDeleteColumnWithCleanup}
          onToggleColumnVisibility={state.handleToggleColumnVisibility}
          onLoadLayout={state.handleLoadLayout}
          onClose={() => state.setShowColumnManager(false)}
        />
      )}
    </div>
  );
};

export default RundownGrid;

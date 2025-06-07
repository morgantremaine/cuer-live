
import React from 'react';
import RundownHeader from './RundownHeader';
import RundownMainContent from './RundownMainContent';
import RundownFooter from './RundownFooter';
import { RundownContainerProps } from '@/types/rundownContainer';

const RundownContainer = (props: RundownContainerProps) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <RundownHeader 
        rundownTitle={props.rundownTitle}
        onTitleChange={props.onTitleChange}
        timezone={props.timezone}
        onTimezoneChange={props.onTimezoneChange}
        totalRuntime={props.totalRuntime}
        hasUnsavedChanges={props.hasUnsavedChanges}
        isSaving={props.isSaving}
        rundownStartTime={props.rundownStartTime}
        onRundownStartTimeChange={props.onRundownStartTimeChange}
        rundownId={props.rundownId}
        onOpenTeleprompter={props.onOpenTeleprompter}
        isConnected={props.isConnected}
        isProcessingRealtimeUpdate={props.isProcessingRealtimeUpdate}
      />
      
      <RundownMainContent 
        // Playback controls props
        selectedRowId={props.selectedRowId}
        isPlaying={props.isPlaying}
        timeRemaining={props.timeRemaining}
        onPlay={props.onPlay}
        onPause={props.onPause}
        onForward={props.onForward}
        onBackward={props.onBackward}
        
        // Toolbar props
        selectedCount={props.selectedCount}
        hasClipboardData={props.hasClipboardData}
        onCopySelectedRows={props.onCopySelectedRows}
        onPasteRows={props.onPasteRows}
        onDeleteSelectedRows={props.onDeleteSelectedRows}
        onClearSelection={props.onClearSelection}
        onUndo={props.onUndo}
        canUndo={props.canUndo}
        lastAction={props.lastAction}
        
        // Grid props
        currentTime={props.currentTime}
        showColumnManager={props.showColumnManager}
        setShowColumnManager={props.setShowColumnManager}
        items={props.items}
        visibleColumns={props.visibleColumns}
        columns={props.columns}
        showColorPicker={props.showColorPicker}
        cellRefs={props.cellRefs}
        selectedRows={props.selectedRows}
        draggedItemIndex={props.draggedItemIndex}
        isDraggingMultiple={props.isDraggingMultiple}
        dropTargetIndex={props.dropTargetIndex}
        currentSegmentId={props.currentSegmentId}
        getColumnWidth={props.getColumnWidth}
        updateColumnWidth={props.updateColumnWidth}
        getRowNumber={props.getRowNumber}
        getRowStatus={props.getRowStatus}
        calculateHeaderDuration={props.calculateHeaderDuration}
        onUpdateItem={props.onUpdateItem}
        onCellClick={props.onCellClick}
        onKeyDown={props.onKeyDown}
        onToggleColorPicker={props.onToggleColorPicker}
        onColorSelect={props.onColorSelect}
        onDeleteRow={props.onDeleteRow}
        onToggleFloat={props.onToggleFloat}
        onRowSelect={props.onRowSelect}
        onDragStart={props.onDragStart}
        onDragOver={props.onDragOver}
        onDragLeave={props.onDragLeave}
        onDrop={props.onDrop}
        onAddRow={props.onAddRow}
        onAddHeader={props.onAddHeader}
        
        // Column management
        handleAddColumn={props.handleAddColumn}
        handleReorderColumns={props.handleReorderColumns}
        handleDeleteColumnWithCleanup={props.handleDeleteColumnWithCleanup}
        handleRenameColumn={props.handleRenameColumn}
        handleToggleColumnVisibility={props.handleToggleColumnVisibility}
        handleLoadLayout={props.handleLoadLayout}
      />
      
      <RundownFooter 
        rundownId={props.rundownId}
      />
    </div>
  );
};

export default RundownContainer;

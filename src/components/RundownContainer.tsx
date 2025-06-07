
import React from 'react';
import RundownHeaderPropsAdapter from './RundownHeaderPropsAdapter';
import RundownMainContent from './RundownMainContent';
import RundownFooter from './RundownFooter';
import { RundownContainerProps } from '@/types/rundownContainer';

const RundownContainer = (props: RundownContainerProps) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <RundownHeaderPropsAdapter props={props} />
      
      <RundownMainContent 
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
        hasClipboardData={props.hasClipboardData}
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
        onCopySelectedRows={props.onCopySelectedRows}
        onDeleteSelectedRows={props.onDeleteSelectedRows}
        onPasteRows={props.onPasteRows}
        onClearSelection={props.onClearSelection}
        onAddRow={props.onAddRow}
        onAddHeader={props.onAddHeader}
        
        // Playback controls - pass through from props
        timeRemaining={props.timeRemaining}
        isPlaying={props.isPlaying}
        currentSegmentName={props.currentSegmentId ? props.items.find(item => item.id === props.currentSegmentId)?.name || '' : ''}
        totalDuration={props.totalRuntime}
        
        // Column management
        handleAddColumn={props.handleAddColumn}
        handleReorderColumns={props.handleReorderColumns}
        handleDeleteColumnWithCleanup={props.handleDeleteColumnWithCleanup}
        handleRenameColumn={props.handleRenameColumn}
        handleToggleColumnVisibility={props.handleToggleColumnVisibility}
        handleLoadLayout={props.handleLoadLayout}
      />
      
      <RundownFooter 
        totalSegments={props.items?.length || 0}
      />
    </div>
  );
};

export default RundownContainer;

import React from 'react';
import RundownHeaderSection from './RundownHeaderSection';
import RundownMainContent from './RundownMainContent';
import RealtimeStatusIndicator from './RealtimeStatusIndicator';
import { RundownContainerProps } from '@/types/rundownContainer';

interface RundownMainPropsAdapterProps {
  props: RundownContainerProps;
}

const RundownMainPropsAdapter = ({ props }: RundownMainPropsAdapterProps) => {
  const {
    currentTime,
    timezone,
    onTimezoneChange,
    totalRuntime,
    onAddRow,
    onAddHeader,
    showColumnManager,
    setShowColumnManager,
    selectedCount,
    hasClipboardData,
    onCopySelectedRows,
    onPasteRows,
    onDeleteSelectedRows,
    onClearSelection,
    selectedRowId,
    isPlaying,
    currentSegmentId,
    timeRemaining,
    onPlay,
    onPause,
    onForward,
    onBackward,
    hasUnsavedChanges,
    isSaving,
    rundownTitle,
    onTitleChange,
    rundownStartTime,
    onRundownStartTimeChange,
    rundownId,
    onOpenTeleprompter,
    items,
    visibleColumns,
    onUndo,
    canUndo,
    lastAction,
    isConnected,
    isProcessingRealtimeUpdate,
    cellRefs,
    columns,
    showColorPicker,
    draggedItemIndex,
    isDraggingMultiple,
    dropTargetIndex,
    getColumnWidth,
    updateColumnWidth,
    getRowNumber,
    getRowStatus,
    calculateHeaderDuration,
    onUpdateItem,
    onCellClick,
    onKeyDown,
    onToggleColorPicker,
    onColorSelect,
    onDeleteRow,
    onToggleFloat,
    onRowSelect,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumnWithCleanup,
    handleRenameColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
  } = props;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar Section with Realtime Status */}
      <div className="relative">
        <RundownHeaderSection
          currentTime={currentTime}
          timezone={timezone}
          onTimezoneChange={onTimezoneChange}
          totalRuntime={totalRuntime}
          onAddRow={onAddRow}
          onAddHeader={onAddHeader}
          onShowColumnManager={() => setShowColumnManager(true)}
          selectedCount={selectedCount}
          hasClipboardData={hasClipboardData}
          onCopySelectedRows={onCopySelectedRows}
          onPasteRows={onPasteRows}
          onDeleteSelectedRows={onDeleteSelectedRows}
          onClearSelection={onClearSelection}
          selectedRowId={selectedRowId}
          isPlaying={isPlaying}
          currentSegmentId={currentSegmentId}
          timeRemaining={timeRemaining}
          onPlay={onPlay}
          onPause={onPause}
          onForward={onForward}
          onBackward={onBackward}
          hasUnsavedChanges={hasUnsavedChanges}
          isSaving={isSaving}
          rundownTitle={rundownTitle}
          onTitleChange={onTitleChange}
          rundownStartTime={rundownStartTime}
          onRundownStartTimeChange={onRundownStartTimeChange}
          rundownId={rundownId}
          onOpenTeleprompter={onOpenTeleprompter}
          items={items}
          visibleColumns={visibleColumns}
          onUndo={onUndo}
          canUndo={canUndo}
          lastAction={lastAction}
        />
        
        {/* Realtime Status Indicator - positioned in top right */}
        {rundownId && (
          <div className="absolute top-2 right-2 z-10">
            <RealtimeStatusIndicator
              isConnected={isConnected || false}
              isProcessingUpdate={isProcessingRealtimeUpdate || false}
            />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <RundownMainContent {...props} />
      </div>
    </div>
  );
};

export default RundownMainPropsAdapter;

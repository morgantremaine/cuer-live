import React from 'react';
import RundownHeaderSection from './RundownHeaderSection';
import RundownMainContent from './RundownMainContent';
import RealtimeStatusIndicator from './RealtimeStatusIndicator';
import { RundownContainerProps } from '@/types/rundownContainer';
import { CSVExportData } from '@/utils/csvExport';

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
    onReset,
    hasUnsavedChanges,
    isSaving,
    rundownTitle,
    onTitleChange,
    rundownStartTime,
    onRundownStartTimeChange,
    rundownId,
    onOpenTeleprompter,
    onOpenSearch,
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
    autoScrollEnabled,
    onToggleAutoScroll
  } = props;

  // Create rundown data for CSV export
  const rundownData: CSVExportData = {
    items: items || [],
    visibleColumns: visibleColumns || []
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar Section */}
      <RundownHeaderSection
        currentTime={props.currentTime}
        timezone={props.timezone}
        onTimezoneChange={props.onTimezoneChange}
        totalRuntime={props.totalRuntime}
        onAddRow={props.onAddRow}
        onAddHeader={props.onAddHeader}
        onShowColumnManager={() => props.setShowColumnManager(true)}
        selectedCount={props.selectedCount}
        hasClipboardData={props.hasClipboardData}
        onCopySelectedRows={props.onCopySelectedRows}
        onPasteRows={props.onPasteRows}
        onDeleteSelectedRows={props.onDeleteSelectedRows}
        onClearSelection={props.onClearSelection}
        selectedRowId={props.selectedRowId}
        isPlaying={props.isPlaying}
        currentSegmentId={props.currentSegmentId}
        timeRemaining={props.timeRemaining}
        onPlay={props.onPlay}
        onPause={props.onPause}
        onForward={props.onForward}
        onBackward={props.onBackward}
        onReset={props.onReset}
        hasUnsavedChanges={props.hasUnsavedChanges}
        isSaving={props.isSaving}
        rundownTitle={props.rundownTitle}
        onTitleChange={props.onTitleChange}
        rundownStartTime={props.rundownStartTime}
        onRundownStartTimeChange={props.onRundownStartTimeChange}
        rundownId={props.rundownId}
        onOpenTeleprompter={props.onOpenTeleprompter}
        onOpenSearch={props.onOpenSearch}
        items={props.items}
        visibleColumns={props.visibleColumns}
        onUndo={props.onUndo}
        canUndo={props.canUndo}
        lastAction={props.lastAction}
        isConnected={props.isConnected}
        isProcessingRealtimeUpdate={props.isProcessingRealtimeUpdate}
        rundownData={undefined}
        autoScrollEnabled={props.autoScrollEnabled}
        onToggleAutoScroll={props.onToggleAutoScroll}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <RundownMainContent
          {...props}
          currentSegmentName={currentSegmentId ? items.find(item => item.id === currentSegmentId)?.name || '' : ''}
          totalDuration={totalRuntime}
        />
      </div>
    </div>
  );
};

export default RundownMainPropsAdapter;

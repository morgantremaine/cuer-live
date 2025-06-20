
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

  // Create rundown data for CSV export
  const rundownData: CSVExportData = {
    items: items || [],
    visibleColumns: visibleColumns || []
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar Section */}
      <RundownHeaderSection
        currentTime={currentTime}
        timezone={timezone}
        onTimezoneChange={onTimezoneChange}
        totalRuntime={totalRuntime}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        rundownTitle={rundownTitle}
        onTitleChange={onTitleChange}
        rundownStartTime={rundownStartTime}
        onRundownStartTimeChange={onRundownStartTimeChange}
        rundownId={rundownId}
        onOpenTeleprompter={onOpenTeleprompter}
        items={items}
        onUndo={onUndo}
        canUndo={canUndo}
        lastAction={lastAction}
        isConnected={isConnected}
        isProcessingRealtimeUpdate={isProcessingRealtimeUpdate}
        showColumnManager={showColumnManager}
        setShowColumnManager={setShowColumnManager}
        columns={columns}
        handleAddColumn={handleAddColumn}
        handleReorderColumns={handleReorderColumns}
        handleDeleteColumnWithCleanup={handleDeleteColumnWithCleanup}
        handleRenameColumn={handleRenameColumn}
        handleToggleColumnVisibility={handleToggleColumnVisibility}
        handleLoadLayout={handleLoadLayout}
        onUpdateItem={onUpdateItem}
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

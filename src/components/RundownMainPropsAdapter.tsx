
import React, { useState } from 'react';
import RundownHeaderSection from './RundownHeaderSection';
import RundownMainContent from './RundownMainContent';
import RealtimeStatusIndicator from './RealtimeStatusIndicator';
import FindReplaceDialog from './FindReplaceDialog';
import { RundownContainerProps } from '@/types/rundownContainer';
import { CSVExportData } from '@/utils/csvExport';
import { useColumnLayoutStorage } from '@/hooks/useColumnLayoutStorage';

interface RundownMainPropsAdapterProps {
  props: RundownContainerProps;
}

const RundownMainPropsAdapter = ({ props }: RundownMainPropsAdapterProps) => {
  const [showFindReplace, setShowFindReplace] = useState(false);
  const { savedLayouts, loading, saveLayout, updateLayout, renameLayout, deleteLayout, canEditLayout } = useColumnLayoutStorage();
  const layoutOperations = { saveLayout, updateLayout, renameLayout, deleteLayout, canEditLayout, loading };
  
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
    showDate,
    onShowDateChange,
    rundownId,
    onOpenTeleprompter,
    items,
    visibleColumns,
    onUndo,
    canUndo,
    lastAction,
    isConnected,
    isProcessingRealtimeUpdate,
    hasActiveTeammates,
    activeTeammateNames,
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
    onToggleAutoScroll,
    onShowNotes,
    // Zoom controls
    zoomLevel,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    canZoomIn,
    canZoomOut,
    isDefaultZoom
  } = props;

  // Create rundown data for CSV export
  const rundownData: CSVExportData = {
    items: items || [],
    visibleColumns: visibleColumns || []
  };

  // Calculate current segment name for RundownMainContent
  const currentSegmentName = currentSegmentId ? items?.find(item => item.id === currentSegmentId)?.name || '' : '';

  // Function to manually scroll to current segment
  const handleJumpToCurrentSegment = () => {
    if (!currentSegmentId) return;
    
    // Find the element with the current segment ID
    const targetElement = document.querySelector(`[data-item-id="${currentSegmentId}"]`);
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar Section */}
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
        onReset={onReset}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        rundownTitle={rundownTitle}
        onTitleChange={onTitleChange}
        rundownStartTime={rundownStartTime}
        onRundownStartTimeChange={onRundownStartTimeChange}
        showDate={showDate}
        onShowDateChange={onShowDateChange}
        rundownId={rundownId}
        onOpenTeleprompter={onOpenTeleprompter}
        items={items}
        visibleColumns={visibleColumns}
        onUndo={onUndo}
        canUndo={canUndo}
        lastAction={lastAction}
        isConnected={isConnected}
        isProcessingRealtimeUpdate={isProcessingRealtimeUpdate}
        hasActiveTeammates={hasActiveTeammates}
        activeTeammateNames={activeTeammateNames}
        rundownData={rundownData}
        autoScrollEnabled={autoScrollEnabled}
        onToggleAutoScroll={onToggleAutoScroll}
        onJumpToCurrentSegment={handleJumpToCurrentSegment}
        onUpdateItem={onUpdateItem}
        onShowFindReplace={() => setShowFindReplace(true)}
        onShowNotes={onShowNotes}
        // Zoom controls
        zoomLevel={zoomLevel}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onResetZoom={onResetZoom}
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
        isDefaultZoom={isDefaultZoom}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <RundownMainContent
          {...props}
          currentSegmentName={currentSegmentName}
          totalDuration={totalRuntime}
          savedLayouts={savedLayouts}
          layoutOperations={layoutOperations}
        />
      </div>
      
      <FindReplaceDialog 
        isOpen={showFindReplace}
        onClose={() => setShowFindReplace(false)}
        onUpdateItem={onUpdateItem}
        items={items || []}
        columns={columns || []}
      />
    </div>
  );
};

export default RundownMainPropsAdapter;

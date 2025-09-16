
import React, { useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import RundownHeaderSection from './RundownHeaderSection';
import RundownMainContent from './RundownMainContent';
import RealtimeStatusIndicator from './RealtimeStatusIndicator';
import FindReplaceDialog from './FindReplaceDialog';
import { RundownContainerProps } from '@/types/rundownContainer';
import { CSVExportData } from '@/utils/csvExport';
import { useColumnLayoutStorage } from '@/hooks/useColumnLayoutStorage';
import { useResponsiveLayout } from '@/hooks/use-mobile';

interface RundownMainPropsAdapterProps {
  props: RundownContainerProps;
}

const RundownMainPropsAdapter = ({ props }: RundownMainPropsAdapterProps) => {
  const [showFindReplace, setShowFindReplace] = useState(false);
  const { savedLayouts, loading, saveLayout, updateLayout, renameLayout, deleteLayout, canEditLayout } = useColumnLayoutStorage();
  const layoutOperations = { saveLayout, updateLayout, renameLayout, deleteLayout, canEditLayout, loading };
  
  // Mobile layout detection
  const { isMobileOrTablet } = useResponsiveLayout();
  
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

  // Move item up/down handlers for mobile context menu - use the actual move functions from props
  const handleMoveItemUp = (index: number) => {
    if (props.onMoveItemUp) {
      props.onMoveItemUp(index);
    }
  };

  const handleMoveItemDown = (index: number) => {
    if (props.onMoveItemDown) {
      props.onMoveItemDown(index);
    }
  };

  // Function to manually scroll to current segment (matches autoscroll behavior)
  const handleJumpToCurrentSegment = () => {
    if (!currentSegmentId) return;
    
    // Find the element with the current segment ID
    const targetElement = document.querySelector(`[data-item-id="${currentSegmentId}"]`);
    if (targetElement) {
      // First scroll to center, then apply offset like autoscroll does
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });

      // Apply the same offset logic as autoscroll to position at 1/4 down
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const scrollContainer = document.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
            || document.querySelector('[data-scroll-viewport]') as HTMLElement
            || document.querySelector('.scroll-viewport') as HTMLElement
            || document.documentElement;

          const viewportRect = scrollContainer.getBoundingClientRect();
          const elementRect = (targetElement as HTMLElement).getBoundingClientRect();

          // Desired position: 1/4 down from the top of the viewport (same as autoscroll)
          const desiredTop = viewportRect.top + (viewportRect.height * 1 / 4);
          const offsetNeeded = elementRect.top - desiredTop;

          if (Math.abs(offsetNeeded) > 4) {
            scrollContainer.scrollBy({ top: offsetNeeded, behavior: 'smooth' });
          }
        });
      });
    }
  };

  return (
    <div className={`${isMobileOrTablet ? 'mobile-full-height' : 'h-full'} ${isMobileOrTablet ? 'grid grid-rows-[auto_1fr]' : 'flex flex-col h-full'}`}>
      {/* Header Section - Sticky on mobile/tablet */}
      <div className={`${isMobileOrTablet ? 'sticky top-0 z-30 bg-background' : ''}`}>
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
      </div>

      {/* Main Content - Scrollable area */}
      <div className={`${isMobileOrTablet ? 'mobile-full-height overflow-hidden' : 'flex-1 overflow-hidden'}`}>
        <RundownMainContent
          {...props}
          currentSegmentName={currentSegmentName}
          totalDuration={totalRuntime}
          savedLayouts={savedLayouts}
          layoutOperations={layoutOperations}
          onMoveItemUp={handleMoveItemUp}
          onMoveItemDown={handleMoveItemDown}
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

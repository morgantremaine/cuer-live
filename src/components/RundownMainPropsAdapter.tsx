
import React, { useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
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
    enhancedSaveState,
    handleKeystroke,
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
    onRedo,
    canUndo,
    canRedo,
    lastAction,
    nextAction,
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
    isDefaultZoom,
    dragAndDrop
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
    if (!targetElement) return;

    try {
      // Find the scroll container - same logic as useRundownAutoscroll
      const viewport = document.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      
      if (!viewport) {
        // Fallback to desktop scrollIntoView if no proper viewport found
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
        return;
      }

      // Check if mobile or tablet (including landscape tablets)
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobileOrTablet = window.innerWidth < 1280 && isTouchDevice;

      if (isMobileOrTablet) {
        // Mobile/Tablet: Use manual scroll calculation to stay within container bounds
        const viewportRect = viewport.getBoundingClientRect();
        const elementRect = targetElement.getBoundingClientRect();
        const currentScrollTop = viewport.scrollTop;
        
        // Calculate where the element is relative to the viewport top
        const elementOffsetFromViewportTop = elementRect.top - viewportRect.top;
        
        // Position at 1/4 down from viewport top
        const desiredPositionInViewport = viewportRect.height * 0.25;
        
        // Calculate the scroll adjustment needed
        const scrollAdjustment = elementOffsetFromViewportTop - desiredPositionInViewport;
        const targetScrollTop = currentScrollTop + scrollAdjustment;
        
        // Ensure we don't scroll beyond container bounds
        const maxScrollTop = viewport.scrollHeight - viewport.clientHeight;
        const finalScrollTop = Math.max(0, Math.min(maxScrollTop, targetScrollTop));
        
        // Perform the scroll operation only within the container
        if (Math.abs(finalScrollTop - currentScrollTop) > 4) {
          viewport.scrollTo({ 
            top: finalScrollTop, 
            behavior: 'smooth' 
          });
        }
      } else {
        // Desktop: Use the existing scrollIntoView approach
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });

        // Apply the same offset logic for desktop positioning
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const viewportRect = viewport.getBoundingClientRect();
            const elementRect = targetElement.getBoundingClientRect();

            // Desired position: 1/4 down from the top of the viewport
            const desiredTop = viewportRect.top + (viewportRect.height * 0.25);
            const offsetNeeded = elementRect.top - desiredTop;

            if (Math.abs(offsetNeeded) > 4) {
              viewport.scrollBy({ top: offsetNeeded, behavior: 'smooth' });
            }
          });
        });
      }
    } catch (error) {
      console.warn('Error in handleJumpToCurrentSegment:', error);
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
      hasUnsavedChanges={enhancedSaveState?.hasUnsavedChanges ?? hasUnsavedChanges}
      isSaving={enhancedSaveState?.isSaving ?? isSaving}
      enhancedSaveState={enhancedSaveState}
      handleKeystroke={handleKeystroke}
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
        onRedo={onRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        lastAction={lastAction}
        nextAction={nextAction}
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
          onMoveItemUp={handleMoveItemUp}
          onMoveItemDown={handleMoveItemDown}
          dragAndDrop={dragAndDrop}
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

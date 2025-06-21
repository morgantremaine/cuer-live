
import React from 'react';
import { useParams } from 'react-router-dom';
import { useRundownStateCoordination } from '@/hooks/useRundownStateCoordination';
import RundownLayoutWrapper from '@/components/RundownLayoutWrapper';
import RundownHeader from '@/components/RundownHeader';
import RundownContent from '@/components/RundownContent';
import RundownFooter from '@/components/RundownFooter';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const RundownIndex = () => {
  const { id } = useParams<{ id: string }>();
  const { coreState, interactions, uiState } = useRundownStateCoordination();

  // Don't render until we have the rundown loaded
  if (coreState.isLoading || !id) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600 dark:text-gray-300">Loading rundown...</div>
      </div>
    );
  }

  // Helper function to get row status
  const getRowStatus = (item: any) => {
    const status = coreState.getItemVisualStatus(item.id);
    // Convert string status to the expected union type
    if (status === 'current') return 'current';
    if (status === 'completed') return 'completed';
    return 'upcoming';
  };

  return (
    <ErrorBoundary fallbackTitle="Rundown Error">
      <RundownLayoutWrapper>
        {/* Header with timing indicator */}
        <RundownHeader
          title={coreState.rundownTitle}
          startTime={coreState.rundownStartTime}
          timezone={coreState.timezone}
          currentTime={coreState.currentTime}
          totalRuntime={coreState.totalRuntime}
          items={coreState.items}
          currentSegmentId={coreState.currentSegmentId}
          isPlaying={coreState.isPlaying}
          timeRemaining={coreState.timeRemaining}
        />

        {/* Main Content */}
        <RundownContent
          items={coreState.items}
          visibleColumns={coreState.visibleColumns}
          currentTime={coreState.currentTime}
          showColorPicker={uiState.showColorPicker}
          cellRefs={uiState.cellRefs}
          selectedRows={interactions.selectedRows}
          draggedItemIndex={interactions.draggedItemIndex}
          isDraggingMultiple={interactions.isDraggingMultiple}
          dropTargetIndex={interactions.dropTargetIndex}
          currentSegmentId={coreState.currentSegmentId}
          hasClipboardData={interactions.hasClipboardData()}
          selectedRowId={coreState.selectedRowId}
          isPlaying={coreState.isPlaying}
          autoScrollEnabled={coreState.autoScrollEnabled}
          onToggleAutoScroll={coreState.toggleAutoScroll}
          getColumnWidth={uiState.getColumnWidth}
          updateColumnWidth={(columnId: string, width: number) => coreState.updateColumnWidth(columnId, width.toString())}
          getRowNumber={coreState.getRowNumber}
          getRowStatus={getRowStatus}
          calculateHeaderDuration={coreState.calculateHeaderDuration}
          onUpdateItem={coreState.updateItem}
          onCellClick={(itemId: string, field: string) => uiState.handleCellClick(itemId, field, {} as React.MouseEvent)}
          onKeyDown={(e: React.KeyboardEvent, itemId: string, field: string) => uiState.handleKeyDown(e, itemId, field)}
          onToggleColorPicker={uiState.handleToggleColorPicker}
          onColorSelect={interactions.handleColorSelect}
          onDeleteRow={coreState.deleteRow}
          onToggleFloat={coreState.toggleFloatRow}
          onRowSelect={interactions.handleRowSelection}
          onDragStart={interactions.handleDragStart}
          onDragOver={interactions.handleDragOver}
          onDragLeave={interactions.handleDragLeave}
          onDrop={interactions.handleDrop}
          onCopySelectedRows={interactions.handleCopySelectedRows}
          onDeleteSelectedRows={interactions.handleDeleteSelectedRows}
          onPasteRows={interactions.handlePasteRows}
          onClearSelection={interactions.clearSelection}
          onAddRow={coreState.addRow}
          onAddHeader={coreState.addHeader}
          onJumpToHere={coreState.jumpToSegment}
        />

        {/* Footer */}
        <RundownFooter
          totalSegments={coreState.items.length}
        />
      </RundownLayoutWrapper>
    </ErrorBoundary>
  );
};

export default RundownIndex;

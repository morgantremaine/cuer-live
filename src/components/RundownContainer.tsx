
import React from 'react';
import { useRundownStateCoordination } from '@/hooks/useRundownStateCoordination';
import RundownLayoutWrapper from './RundownLayoutWrapper';
import RundownHeaderSection from './RundownHeaderSection';
import RundownMainContent from './RundownMainContent';

const RundownContainer = () => {
  const { coreState, interactions, uiState } = useRundownStateCoordination();

  return (
    <RundownLayoutWrapper rundownId={coreState.rundownId} showActiveUsers={true}>
      <div className="flex flex-col h-full">
        <RundownHeaderSection 
          currentTime={coreState.currentTime}
          timezone={coreState.timezone}
          onTimezoneChange={coreState.setTimezone}
          totalRuntime={coreState.calculateTotalRuntime()}
          onAddRow={interactions.handleAddRow}
          onAddHeader={interactions.handleAddHeader}
          onShowColumnManager={() => coreState.setShowColumnManager(true)}
          selectedCount={interactions.selectedRows.size}
          hasClipboardData={interactions.hasClipboardData()}
          onCopySelectedRows={interactions.handleCopySelectedRows}
          onPasteRows={interactions.handlePasteRows}
          onDeleteSelectedRows={interactions.handleDeleteSelectedRows}
          onClearSelection={interactions.clearSelection}
          selectedRowId={Array.from(interactions.selectedRows).length === 1 ? Array.from(interactions.selectedRows)[0] : null}
          isPlaying={coreState.isPlaying}
          currentSegmentId={coreState.currentSegmentId}
          timeRemaining={coreState.timeRemaining}
          onPlay={coreState.play}
          onPause={coreState.pause}
          onForward={coreState.forward}
          onBackward={coreState.backward}
          hasUnsavedChanges={coreState.hasUnsavedChanges}
          isSaving={coreState.isSaving}
          rundownTitle={coreState.rundownTitle}
          onTitleChange={coreState.setRundownTitle}
          rundownStartTime={coreState.rundownStartTime}
          onRundownStartTimeChange={coreState.setRundownStartTime}
          rundownId={coreState.rundownId}
          onOpenTeleprompter={() => {}}
          items={coreState.items}
          visibleColumns={coreState.visibleColumns}
          onUndo={coreState.handleUndo}
          canUndo={coreState.canUndo}
          lastAction={coreState.lastAction}
          isConnected={coreState.isConnected}
          isProcessingRealtimeUpdate={coreState.isProcessingRealtimeUpdate}
        />
        <RundownMainContent 
          currentTime={coreState.currentTime}
          items={coreState.items}
          visibleColumns={coreState.visibleColumns}
          columns={coreState.columns}
          showColorPicker={uiState.showColorPicker}
          cellRefs={uiState.cellRefs}
          selectedRows={interactions.selectedRows}
          draggedItemIndex={interactions.draggedItemIndex}
          isDraggingMultiple={interactions.isDraggingMultiple}
          dropTargetIndex={interactions.dropTargetIndex}
          currentSegmentId={coreState.currentSegmentId}
          hasClipboardData={interactions.hasClipboardData()}
          getColumnWidth={uiState.getColumnWidth}
          updateColumnWidth={uiState.updateColumnWidth}
          getRowNumber={coreState.getRowNumber}
          getRowStatus={uiState.getRowStatus}
          calculateHeaderDuration={coreState.calculateHeaderDuration}
          onUpdateItem={coreState.updateItem}
          onCellClick={uiState.handleCellClick}
          onKeyDown={uiState.handleKeyDown}
          onToggleColorPicker={uiState.handleToggleColorPicker}
          onColorSelect={uiState.selectColor}
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
          showColumnManager={coreState.showColumnManager}
          setShowColumnManager={coreState.setShowColumnManager}
          handleAddColumn={coreState.handleAddColumn}
          handleReorderColumns={coreState.handleReorderColumns}
          handleDeleteColumnWithCleanup={coreState.handleDeleteColumn}
          handleRenameColumn={coreState.handleRenameColumn}
          handleToggleColumnVisibility={coreState.handleToggleColumnVisibility}
          handleLoadLayout={coreState.handleLoadLayout}
          timeRemaining={coreState.timeRemaining}
          isPlaying={coreState.isPlaying}
          currentSegmentName={coreState.currentSegmentId ? coreState.items.find(item => item.id === coreState.currentSegmentId)?.name || '' : ''}
          totalDuration={coreState.calculateTotalRuntime()}
          onAddRow={interactions.handleAddRow}
          onAddHeader={interactions.handleAddHeader}
        />
      </div>
    </RundownLayoutWrapper>
  );
};

export default RundownContainer;

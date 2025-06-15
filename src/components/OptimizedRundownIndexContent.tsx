
import React, { useRef, useCallback, useMemo } from 'react';
import RundownContainer from '@/components/RundownContainer';
import CuerChatButton from '@/components/cuer/CuerChatButton';
import RealtimeConnectionProvider from '@/components/RealtimeConnectionProvider';
import { useStreamlinedRundownState } from '@/hooks/useStreamlinedRundownState';
import { useIndexHandlers } from '@/hooks/useIndexHandlers';

const OptimizedRundownIndexContent = React.memo(() => {
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});
  
  // Use streamlined state management
  const { state, interactions, uiState } = useStreamlinedRundownState();
  
  // State for column manager
  const [showColumnManager, setShowColumnManager] = React.useState(false);

  // Memoized handlers to prevent unnecessary re-renders
  const handlers = useMemo(() => {
    const {
      selectedRows,
      toggleRowSelection,
      clearSelection,
      draggedItemIndex,
      isDraggingMultiple,
      dropTargetIndex,
      handleDragStart,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      hasClipboardData,
      handleCopySelectedRows,
      handlePasteRows,
      handleDeleteSelectedRows,
      handleRowSelection,
      handleAddRow,
      handleAddHeader
    } = interactions;

    const { 
      showColorPicker, 
      handleCellClick, 
      handleKeyDown, 
      handleToggleColorPicker, 
      selectColor, 
      getRowStatus,
      getColumnWidth
    } = uiState;

    return {
      selectedRows,
      toggleRowSelection,
      clearSelection,
      draggedItemIndex,
      isDraggingMultiple,
      dropTargetIndex,
      handleDragStart,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      hasClipboardData,
      handleCopySelectedRows,
      handlePasteRows,
      handleDeleteSelectedRows,
      handleRowSelection,
      handleAddRow,
      handleAddHeader,
      showColorPicker,
      handleCellClick,
      handleKeyDown,
      handleToggleColorPicker,
      selectColor,
      getRowStatus,
      getColumnWidth
    };
  }, [interactions, uiState]);

  // Create wrapper functions with proper signatures
  const handleCellClickWrapper = useCallback((itemId: string, field: string) => {
    const mockEvent = { preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent;
    handlers.handleCellClick(itemId, field, mockEvent);
  }, [handlers.handleCellClick]);

  const handleKeyDownWrapper = useCallback((e: React.KeyboardEvent, itemId: string, field: string) => {
    const itemIndex = state.items.findIndex(item => item.id === itemId);
    handlers.handleKeyDown(e, itemId, field, itemIndex);
  }, [handlers.handleKeyDown, state.items]);

  const getRowStatusForContainer = useCallback((item: any): 'upcoming' | 'current' | 'completed' => {
    const status = handlers.getRowStatus(item);
    if (status === 'header') {
      return 'upcoming';
    }
    return status;
  }, [handlers.getRowStatus]);

  // Fix getRowNumber to work with index-based interface - create a proper index-based wrapper
  const getRowNumberWrapper = useCallback((index: number): string => {
    if (index >= 0 && index < state.items.length) {
      // Use index directly for row number calculation
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let headerIndex = 0;
      let itemIndex = 0;
      
      // Count headers and items up to current index
      for (let i = 0; i <= index; i++) {
        const item = state.items[i];
        if (item?.type === 'header') {
          headerIndex++;
          itemIndex = 0; // Reset item count for new section
        } else {
          itemIndex++;
        }
      }
      
      const currentItem = state.items[index];
      if (currentItem?.type === 'header') {
        return letters[headerIndex - 1] || 'A';
      } else {
        const letter = letters[headerIndex - 1] || 'A';
        return `${letter}${itemIndex}`;
      }
    }
    return '';
  }, [state.items]);

  // Use simplified handlers for common operations
  const {
    handleRundownStartTimeChange,
    handleTimezoneChange,
    handleOpenTeleprompter,
    handleRowSelect
  } = useIndexHandlers({
    items: state.items,
    selectedRows: handlers.selectedRows,
    rundownId: state.rundownId,
    addRow: state.addRow,
    addHeader: state.addHeader,
    calculateEndTime: state.calculateEndTime,
    toggleRowSelection: handlers.toggleRowSelection,
    setRundownStartTime: state.setStartTime,
    setTimezone: state.setTimezone,
    markAsChanged: () => {} // Handled internally
  });

  const selectedRowsArray = Array.from(handlers.selectedRows);
  const selectedRowId = selectedRowsArray.length === 1 ? selectedRowsArray[0] : null;
  const timeRemainingNumber = typeof state.timeRemaining === 'string' ? 0 : state.timeRemaining;

  // Memoized rundown data for Cuer AI
  const rundownData = useMemo(() => ({
    id: state.rundownId,
    title: state.rundownTitle,
    startTime: state.rundownStartTime,
    timezone: state.timezone,
    items: state.items,
    columns: state.columns,
    totalRuntime: state.totalRuntime
  }), [state.rundownId, state.rundownTitle, state.rundownStartTime, state.timezone, state.items, state.columns, state.totalRuntime]);

  // Memoized drag handlers
  const dragHandlers = useMemo(() => ({
    handleDragStart: (e: React.DragEvent, index: number) => handlers.handleDragStart(e, index),
    handleDragOver: (e: React.DragEvent, targetIndex?: number) => handlers.handleDragOver(e, targetIndex),
    handleDragLeave: (e: React.DragEvent) => handlers.handleDragLeave(e),
    handleDrop: (e: React.DragEvent, targetIndex: number) => handlers.handleDrop(e, targetIndex)
  }), [handlers.handleDragStart, handlers.handleDragOver, handlers.handleDragLeave, handlers.handleDrop]);

  return (
    <RealtimeConnectionProvider
      isConnected={state.isConnected || false}
      isProcessingUpdate={state.isProcessingRealtimeUpdate || false}
    >
      <RundownContainer
        currentTime={state.currentTime}
        timezone={state.timezone}
        onTimezoneChange={handleTimezoneChange}
        totalRuntime={state.totalRuntime}
        showColumnManager={showColumnManager}
        setShowColumnManager={setShowColumnManager}
        items={state.items}
        visibleColumns={state.visibleColumns}
        columns={state.columns}
        showColorPicker={handlers.showColorPicker}
        cellRefs={cellRefs}
        selectedRows={handlers.selectedRows}
        draggedItemIndex={handlers.draggedItemIndex}
        isDraggingMultiple={handlers.isDraggingMultiple}
        dropTargetIndex={handlers.dropTargetIndex}
        currentSegmentId={state.currentSegmentId}
        getColumnWidth={handlers.getColumnWidth}
        updateColumnWidth={(columnId: string, width: number) => state.updateColumnWidth(columnId, `${width}px`)}
        getRowNumber={getRowNumberWrapper}
        getRowStatus={getRowStatusForContainer}
        calculateHeaderDuration={state.getHeaderDuration}
        onUpdateItem={state.updateItem}
        onCellClick={handleCellClickWrapper}
        onKeyDown={handleKeyDownWrapper}
        onToggleColorPicker={handlers.handleToggleColorPicker}
        onColorSelect={(id, color) => handlers.selectColor(id, color)}
        onDeleteRow={state.deleteRow}
        onToggleFloat={state.toggleFloat}
        onRowSelect={handleRowSelect}
        onDragStart={dragHandlers.handleDragStart}
        onDragOver={dragHandlers.handleDragOver}
        onDragLeave={dragHandlers.handleDragLeave}
        onDrop={dragHandlers.handleDrop}
        onAddRow={handlers.handleAddRow}
        onAddHeader={handlers.handleAddHeader}
        selectedCount={handlers.selectedRows.size}
        hasClipboardData={handlers.hasClipboardData()}
        onCopySelectedRows={handlers.handleCopySelectedRows}
        onPasteRows={handlers.handlePasteRows}
        onDeleteSelectedRows={handlers.handleDeleteSelectedRows}
        onClearSelection={handlers.clearSelection}
        selectedRowId={selectedRowId}
        isPlaying={state.isPlaying}
        timeRemaining={timeRemainingNumber}
        onPlay={state.play}
        onPause={state.pause}
        onForward={state.forward}
        onBackward={state.backward}
        handleAddColumn={state.addColumn}
        handleReorderColumns={state.reorderColumns}
        handleDeleteColumnWithCleanup={state.deleteColumn}
        handleRenameColumn={state.renameColumn}
        handleToggleColumnVisibility={state.toggleColumnVisibility}
        handleLoadLayout={state.loadLayout}
        hasUnsavedChanges={state.hasUnsavedChanges}
        isSaving={state.isSaving}
        rundownTitle={state.rundownTitle}
        onTitleChange={state.setTitle}
        rundownStartTime={state.rundownStartTime}
        onRundownStartTimeChange={handleRundownStartTimeChange}
        rundownId={state.rundownId}
        onOpenTeleprompter={handleOpenTeleprompter}
        onUndo={state.undo}
        canUndo={state.canUndo}
        lastAction={state.lastAction || ''}
        isConnected={state.isConnected}
        isProcessingRealtimeUpdate={state.isProcessingRealtimeUpdate}
      />
      
      <CuerChatButton rundownData={rundownData} />
    </RealtimeConnectionProvider>
  );
});

OptimizedRundownIndexContent.displayName = 'OptimizedRundownIndexContent';

export default OptimizedRundownIndexContent;

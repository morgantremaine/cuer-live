
import React, { useRef } from 'react';
import RundownContainer from '@/components/RundownContainer';
import CuerChatButton from '@/components/cuer/CuerChatButton';
import RealtimeConnectionProvider from '@/components/RealtimeConnectionProvider';
import { useRundownStateCoordination } from '@/hooks/useRundownStateCoordination';
import { useIndexHandlers } from '@/hooks/useIndexHandlers';

const RundownIndexContent = () => {
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});
  
  const {
    coreState,
    interactions,
    uiState
  } = useRundownStateCoordination();
  
  // Extract all needed values from the unified state
  const {
    currentTime,
    timezone,
    rundownTitle,
    rundownStartTime,
    rundownId,
    items,
    visibleColumns,
    columns,
    currentSegmentId,
    getRowNumber,
    calculateHeaderDuration,
    updateItem,
    deleteRow,
    toggleFloatRow,
    addRow,
    addHeader,
    isPlaying,
    timeRemaining,
    play,
    pause,
    forward,
    backward,
    hasUnsavedChanges,
    isSaving,
    totalRuntime,
    setTitle,
    setStartTime,
    setTimezone,
    undo,
    canUndo,
    lastAction,
    isConnected,
    isProcessingRealtimeUpdate,
    addColumn,
    updateColumnWidth,
    setColumns
  } = coreState;

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
    handleRowSelection
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

  // State for column manager
  const [showColumnManager, setShowColumnManager] = React.useState(false);

  // Calculate end time helper
  const calculateEndTime = (startTime: string, duration: string) => {
    const startParts = startTime.split(':').map(Number);
    const durationParts = duration.split(':').map(Number);
    
    let totalSeconds = 0;
    if (startParts.length >= 2) {
      totalSeconds += startParts[0] * 3600 + startParts[1] * 60 + (startParts[2] || 0);
    }
    if (durationParts.length >= 2) {
      totalSeconds += durationParts[0] * 60 + durationParts[1];
    }
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Create wrapper functions to match expected signatures
  const handleDragStartWrapper = (e: React.DragEvent, index: number) => {
    const item = items[index];
    if (item) {
      handleDragStart(index, item.id);
    }
  };

  const handleDragOverWrapper = (e: React.DragEvent) => {
    // Find the target index based on the drag event
    const target = e.currentTarget as HTMLElement;
    const index = parseInt(target.dataset.index || '0', 10);
    handleDragOver(index);
  };

  const handleDropWrapper = (e: React.DragEvent, index: number) => {
    handleDrop(index);
  };

  // Create wrapper for cell click to match signature
  const handleCellClickWrapper = (itemId: string, field: string) => {
    const mockEvent = { preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent;
    handleCellClick(itemId, field, mockEvent);
  };

  // Create wrapper for key down to match signature
  const handleKeyDownWrapper = (e: React.KeyboardEvent, itemId: string, field: string) => {
    const itemIndex = items.findIndex(item => item.id === itemId);
    handleKeyDown(e, itemId, field, itemIndex);
  };

  // Use simplified handlers for common operations
  const {
    handleRundownStartTimeChange,
    handleTimezoneChange,
    handleOpenTeleprompter,
    handleRowSelect,
    handleAddRow,
    handleAddHeader
  } = useIndexHandlers({
    items,
    selectedRows,
    rundownId,
    addRow: () => addRow(),
    addHeader: () => addHeader(),
    calculateEndTime,
    toggleRowSelection,
    setRundownStartTime: setStartTime,
    setTimezone,
    markAsChanged: () => {} // Handled internally by unified state
  });

  const selectedRowsArray = Array.from(selectedRows);
  const selectedRowId = selectedRowsArray.length === 1 ? selectedRowsArray[0] : null;

  // Convert timeRemaining to number (assuming it's in seconds)
  const timeRemainingNumber = typeof timeRemaining === 'string' ? 0 : timeRemaining;

  // Create a wrapper for handleAddColumn that takes a string
  const handleAddColumnWrapper = (name: string) => {
    const newColumn = {
      id: `custom_${Date.now()}`,
      name,
      key: name.toLowerCase().replace(/\s+/g, '_'),
      isVisible: true,
      width: '150px',
      isCustom: true,
      isEditable: true
    };
    addColumn(newColumn);
  };

  // Prepare rundown data for Cuer AI
  const rundownData = {
    id: rundownId,
    title: rundownTitle,
    startTime: rundownStartTime,
    timezone: timezone,
    items: items,
    columns: columns,
    totalRuntime: totalRuntime
  };

  return (
    <RealtimeConnectionProvider
      isConnected={isConnected || false}
      isProcessingUpdate={isProcessingRealtimeUpdate || false}
    >
      <RundownContainer
        currentTime={currentTime}
        timezone={timezone}
        onTimezoneChange={handleTimezoneChange}
        totalRuntime={totalRuntime}
        showColumnManager={showColumnManager}
        setShowColumnManager={setShowColumnManager}
        items={items}
        visibleColumns={visibleColumns}
        columns={columns}
        showColorPicker={showColorPicker}
        cellRefs={cellRefs}
        selectedRows={selectedRows}
        draggedItemIndex={draggedItemIndex}
        isDraggingMultiple={isDraggingMultiple}
        dropTargetIndex={dropTargetIndex}
        currentSegmentId={currentSegmentId}
        getColumnWidth={getColumnWidth}
        updateColumnWidth={(columnId: string, width: number) => updateColumnWidth(columnId, `${width}px`)}
        getRowNumber={getRowNumber}
        getRowStatus={(item) => getRowStatus(item)}
        calculateHeaderDuration={calculateHeaderDuration}
        onUpdateItem={updateItem}
        onCellClick={handleCellClickWrapper}
        onKeyDown={handleKeyDownWrapper}
        onToggleColorPicker={handleToggleColorPicker}
        onColorSelect={(id, color) => selectColor(id, color)}
        onDeleteRow={deleteRow}
        onToggleFloat={toggleFloatRow}
        onRowSelect={handleRowSelect}
        onDragStart={handleDragStartWrapper}
        onDragOver={handleDragOverWrapper}
        onDragLeave={handleDragLeave}
        onDrop={handleDropWrapper}
        onAddRow={handleAddRow}
        onAddHeader={handleAddHeader}
        selectedCount={selectedRows.size}
        hasClipboardData={hasClipboardData()}
        onCopySelectedRows={handleCopySelectedRows}
        onPasteRows={handlePasteRows}
        onDeleteSelectedRows={handleDeleteSelectedRows}
        onClearSelection={clearSelection}
        selectedRowId={selectedRowId}
        isPlaying={isPlaying}
        timeRemaining={timeRemainingNumber}
        onPlay={play}
        onPause={pause}
        onForward={forward}
        onBackward={backward}
        handleAddColumn={handleAddColumnWrapper}
        handleReorderColumns={() => {}} // TODO: Implement if needed
        handleDeleteColumnWithCleanup={(columnId) => {
          const newColumns = columns.filter(col => col.id !== columnId);
          setColumns(newColumns);
        }}
        handleRenameColumn={() => {}} // TODO: Implement if needed
        handleToggleColumnVisibility={() => {}} // TODO: Implement if needed
        handleLoadLayout={() => {}} // TODO: Implement if needed
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        rundownTitle={rundownTitle}
        onTitleChange={setTitle}
        rundownStartTime={rundownStartTime}
        onRundownStartTimeChange={handleRundownStartTimeChange}
        rundownId={rundownId}
        onOpenTeleprompter={handleOpenTeleprompter}
        onUndo={undo}
        canUndo={canUndo}
        lastAction={lastAction || ''}
        isConnected={isConnected}
        isProcessingRealtimeUpdate={isProcessingRealtimeUpdate}
      />
      
      <CuerChatButton rundownData={rundownData} />
    </RealtimeConnectionProvider>
  );
};

export default RundownIndexContent;

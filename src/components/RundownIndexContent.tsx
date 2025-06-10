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
  
  const {
    currentTime,
    timezone,
    showColumnManager,
    setShowColumnManager,
    rundownTitle,
    setRundownTitle,
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
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleRenameColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    hasUnsavedChanges,
    isSaving,
    calculateTotalRuntime,
    calculateEndTime,
    markAsChanged,
    setRundownStartTime,
    setTimezone,
    handleUndo,
    canUndo,
    lastAction,
    isConnected,
    isProcessingRealtimeUpdate
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
    getColumnWidth,
    updateColumnWidth
  } = uiState;

  // Fix useIndexHandlers to match expected signature
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
    setRundownStartTime,
    setTimezone,
    markAsChanged
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
    handleAddColumn(newColumn);
  };

  // Prepare rundown data for Cuer AI
  const rundownData = {
    id: rundownId,
    title: rundownTitle,
    startTime: rundownStartTime,
    timezone: timezone,
    items: items,
    columns: columns,
    totalRuntime: calculateTotalRuntime()
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
        totalRuntime={calculateTotalRuntime()}
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
        updateColumnWidth={updateColumnWidth}
        getRowNumber={getRowNumber}
        getRowStatus={(item) => getRowStatus(item)}
        calculateHeaderDuration={calculateHeaderDuration}
        onUpdateItem={updateItem}
        onCellClick={handleCellClick}
        onKeyDown={handleKeyDown}
        onToggleColorPicker={handleToggleColorPicker}
        onColorSelect={(id, color) => selectColor(id, color)}
        onDeleteRow={deleteRow}
        onToggleFloat={toggleFloatRow}
        onRowSelect={handleRowSelect}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
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
        handleReorderColumns={handleReorderColumns}
        handleDeleteColumnWithCleanup={handleDeleteColumn}
        handleRenameColumn={handleRenameColumn}
        handleToggleColumnVisibility={handleToggleColumnVisibility}
        handleLoadLayout={handleLoadLayout}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        rundownTitle={rundownTitle}
        onTitleChange={setRundownTitle}
        rundownStartTime={rundownStartTime}
        onRundownStartTimeChange={handleRundownStartTimeChange}
        rundownId={rundownId}
        onOpenTeleprompter={handleOpenTeleprompter}
        onUndo={handleUndo}
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

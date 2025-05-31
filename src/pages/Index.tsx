
import React from 'react';
import RundownContainer from '@/components/RundownContainer';
import { useRundownGridState } from '@/hooks/useRundownGridState';
import { useToast } from '@/hooks/use-toast';
import CuerChatButton from '@/components/cuer/CuerChatButton';

const Index = () => {
  const { toast } = useToast();
  
  const {
    currentTime,
    timezone,
    setTimezone,
    showColumnManager,
    setShowColumnManager,
    rundownTitle,
    setRundownTitle,
    rundownStartTime,
    setRundownStartTime,
    rundownId,
    items,
    visibleColumns,
    columns,
    showColorPicker,
    cellRefs,
    selectedRows,
    draggedItemIndex,
    isDraggingMultiple,
    currentSegmentId,
    getColumnWidth,
    updateColumnWidth,
    getRowNumber,
    getRowStatus,
    calculateHeaderDuration,
    updateItem,
    handleCellClick,
    handleKeyDown,
    handleToggleColorPicker,
    selectColor,
    deleteRow,
    toggleFloatRow,
    toggleRowSelection,
    handleDragStart,
    handleDragOver,
    handleDrop,
    addRow,
    addHeader,
    selectedRows: selectedRowsSet,
    hasClipboardData,
    copyItems,
    addMultipleRows,
    deleteMultipleRows,
    clearSelection,
    isPlaying,
    timeRemaining,
    play,
    pause,
    forward,
    backward,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    hasUnsavedChanges,
    isSaving,
    calculateTotalRuntime,
    calculateEndTime,
    markAsChanged,
    clipboardItems,
    // Get the proper handlers
    handleCopySelectedRows,
    handlePasteRows,
    handleDeleteSelectedRows
  } = useRundownGridState();

  const selectedRowsArray = Array.from(selectedRowsSet);
  const selectedRowId = selectedRowsArray.length === 1 ? selectedRowsArray[0] : null;

  const handleRundownStartTimeChange = (startTime: string) => {
    setRundownStartTime(startTime);
    markAsChanged();
  };

  const handleTimezoneChange = (newTimezone: string) => {
    setTimezone(newTimezone);
    markAsChanged();
  };

  const handleOpenTeleprompter = () => {
    if (!rundownId) {
      toast({
        title: "Cannot open teleprompter",
        description: "Save this rundown first to access the teleprompter.",
        variant: "destructive"
      });
      return;
    }

    const teleprompterUrl = `${window.location.origin}/teleprompter/${rundownId}`;
    window.open(teleprompterUrl, '_blank', 'width=1200,height=800');
  };

  const handleRowSelect = (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    toggleRowSelection(itemId, index, isShiftClick, isCtrlClick, items);
  };

  const handleAddRow = () => {
    // If there's a single selected row, insert after it
    if (selectedRowsArray.length === 1) {
      const selectedItemId = selectedRowsArray[0];
      const selectedIndex = items.findIndex(item => item.id === selectedItemId);
      if (selectedIndex !== -1) {
        addRow(calculateEndTime, selectedIndex);
        return;
      }
    }
    // Default behavior: add to the end
    addRow(calculateEndTime);
  };

  const handleAddHeader = () => {
    // If there's a single selected row, insert after it
    if (selectedRowsArray.length === 1) {
      const selectedItemId = selectedRowsArray[0];
      const selectedIndex = items.findIndex(item => item.id === selectedItemId);
      if (selectedIndex !== -1) {
        addHeader(selectedIndex);
        return;
      }
    }
    // Default behavior: add to the end
    addHeader();
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
        selectedRows={selectedRowsSet}
        draggedItemIndex={draggedItemIndex}
        isDraggingMultiple={isDraggingMultiple}
        currentSegmentId={currentSegmentId}
        getColumnWidth={getColumnWidth}
        updateColumnWidth={updateColumnWidth}
        getRowNumber={getRowNumber}
        getRowStatus={getRowStatus}
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
        onDrop={handleDrop}
        onAddRow={handleAddRow}
        onAddHeader={handleAddHeader}
        selectedCount={selectedRowsSet.size}
        hasClipboardData={hasClipboardData()}
        onCopySelectedRows={handleCopySelectedRows}
        onPasteRows={handlePasteRows}
        onDeleteSelectedRows={handleDeleteSelectedRows}
        onClearSelection={clearSelection}
        selectedRowId={selectedRowId}
        isPlaying={isPlaying}
        timeRemaining={timeRemaining}
        onPlay={play}
        onPause={pause}
        onForward={forward}
        onBackward={backward}
        handleAddColumn={handleAddColumn}
        handleReorderColumns={handleReorderColumns}
        handleDeleteColumnWithCleanup={handleDeleteColumn}
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
      />
      
      {/* Add Cuer Chat Button */}
      <CuerChatButton 
        rundownData={{
          title: rundownTitle,
          startTime: rundownStartTime,
          items: items
        }}
      />
    </div>
  );
};

export default Index;

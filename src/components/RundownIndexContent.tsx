import React, { useRef, useEffect } from 'react';
import RundownContainer from '@/components/RundownContainer';
import CuerChatPanel from '@/components/cuer/CuerChatPanel';
import RealtimeConnectionProvider from '@/components/RealtimeConnectionProvider';
import { FloatingNotesWindow } from '@/components/FloatingNotesWindow';
import { useRundownStateCoordination } from '@/hooks/useRundownStateCoordination';
import { useIndexHandlers } from '@/hooks/useIndexHandlers';
import { useColumnsManager } from '@/hooks/useColumnsManager';
import { useUserColumnPreferences } from '@/hooks/useUserColumnPreferences';

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
    reset,
    hasUnsavedChanges,
    isSaving,
    isLoading,
    totalRuntime,
    setTitle,
    setStartTime,
    setTimezone,
    undo,
    canUndo,
    lastAction,
    isConnected,
    isProcessingRealtimeUpdate,
    autoScrollEnabled,
    toggleAutoScroll,
    // Header collapse functions
    toggleHeaderCollapse,
    isHeaderCollapsed,
    getHeaderGroupItemIds,
    visibleItems
  } = coreState;

  // Use user column preferences for persistent column management
  const { 
    columns: userColumns, 
    setColumns: setUserColumns, 
    updateColumnWidth: updateUserColumnWidth,
    isLoading: isLoadingPreferences,
    isSaving: isSavingPreferences 
  } = useUserColumnPreferences(rundownId);

  // Use columns manager for operations only - don't use its state
  const {
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleRenameColumn,
    handleToggleColumnVisibility,
    debugColumns,
    resetToDefaults
  } = useColumnsManager(() => {
    // Mark as changed - handled by auto-save
  });

  // Check if we're still loading - show spinner until everything is ready
  const isFullyLoading = isLoading || isLoadingPreferences || (!items || items.length === 0);

  // Filter visible columns
  const visibleColumns = Array.isArray(userColumns) ? userColumns.filter(col => col.isVisible !== false) : [];

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

  // State for column manager
  const [showColumnManager, setShowColumnManager] = React.useState(false);
  
  // State for notes window
  const [showNotesWindow, setShowNotesWindow] = React.useState(false);
  
  // State for Cuer AI chat
  const [showCuerAI, setShowCuerAI] = React.useState(false);

  // Update browser tab title when rundown title changes
  useEffect(() => {
    if (rundownTitle && rundownTitle !== 'Untitled Rundown') {
      document.title = rundownTitle;
    } else {
      document.title = 'Cuer Live';
    }

    // Cleanup: reset title when component unmounts
    return () => {
      document.title = 'Cuer Live';
    };
  }, [rundownTitle]);

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

  // Create the handleJumpToHere function that respects current playing state
  const handleJumpToHere = (segmentId: string) => {
    
    // Find the target segment to ensure it exists
    const targetSegment = items.find(item => item.id === segmentId);
    
    
    if (!targetSegment) {
      console.error('🎯 IndexContent: Cannot jump - target segment not found');
      return;
    }
    
    // CRITICAL FIX: Check current playing state and act accordingly
    if (isPlaying) {
      
      if (play) {
        play();
      }
    } else {
      
      if (coreState.jumpToSegment) {
        coreState.jumpToSegment(segmentId);
      } else {
        console.error('🎯 IndexContent: jumpToSegment function not available');
      }
    }
    
    // Clear the selection after jumping, like other context menu actions
    clearSelection();
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

  // Create wrapper for getRowStatus that filters out "header" for components that don't expect it
  const getRowStatusForContainer = (item: any): 'upcoming' | 'current' | 'completed' => {
    const status = getRowStatus(item);
    if (status === 'header') {
      return 'upcoming'; // Default fallback for headers
    }
    return status;
  };

  // Use simplified handlers for common operations (but NOT add operations)
  const {
    handleRundownStartTimeChange,
    handleTimezoneChange,
    handleOpenTeleprompter,
    handleRowSelect
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

  // Enhanced column management handlers that integrate with user preferences
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
    
    // Add to existing columns and update user preferences
    const updatedColumns = [...userColumns];
    updatedColumns.splice(1, 0, newColumn); // Insert after segment name
    setUserColumns(updatedColumns, true); // Immediate save for structural changes
  };

  const handleReorderColumnsWrapper = (reorderedColumns: any[]) => {
    
    setUserColumns(reorderedColumns, true); // Immediate save for reordering
  };

  const handleDeleteColumnWrapper = (columnId: string) => {
    
    const filteredColumns = userColumns.filter(col => col.id !== columnId);
    setUserColumns(filteredColumns, true); // Immediate save for deletion
  };

  const handleRenameColumnWrapper = (columnId: string, newName: string) => {
    
    const updatedColumns = userColumns.map(col => {
      if (col.id === columnId) {
        return { ...col, name: newName };
      }
      return col;
    });
    setUserColumns(updatedColumns, true); // Immediate save for renaming
  };

  const handleToggleColumnVisibilityWrapper = (columnId: string) => {
    
    const updatedColumns = userColumns.map(col => {
      if (col.id === columnId) {
        const newVisibility = col.isVisible !== false ? false : true;
        return { ...col, isVisible: newVisibility };
      }
      return col;
    });
    setUserColumns(updatedColumns, true); // Immediate save for visibility changes
  };

  const handleLoadLayoutWrapper = (layoutColumns: any[]) => {
    console.log('🔄 RundownIndexContent: Loading layout with', layoutColumns.length, 'columns');
    
    if (!Array.isArray(layoutColumns)) {
      console.error('❌ Invalid layout columns - not an array:', layoutColumns);
      return;
    }

    // Validate and clean the layout columns
    const validColumns = layoutColumns.filter(col => 
      col && 
      typeof col === 'object' && 
      col.id && 
      col.name && 
      col.key
    );

    if (validColumns.length === 0) {
      console.error('❌ No valid columns found in layout');
      return;
    }

    console.log('✅ Setting user column preferences from loaded layout');
    setUserColumns(validColumns, true); // Immediate save for layout loading
  };

  const handleUpdateColumnWidthWrapper = (columnId: string, width: number) => {
    // Use the specialized updateColumnWidth method from useUserColumnPreferences
    // which handles proper debouncing during resize operations
    updateUserColumnWidth(columnId, `${width}px`);
  };

  // Prepare rundown data for Cuer AI
  const rundownData = {
    id: rundownId,
    title: rundownTitle,
    startTime: rundownStartTime,
    timezone: timezone,
    items: items,
    columns: userColumns,
    totalRuntime: totalRuntime
  };

  // Create wrapper functions that match the expected signatures for drag operations
  const handleDragStartWrapper = (e: React.DragEvent, index: number) => {
    handleDragStart(e, index);
  };

  const handleDragOverWrapper = (e: React.DragEvent, targetIndex?: number) => {
    handleDragOver(e, targetIndex);
  };

  const handleDragLeaveWrapper = (e: React.DragEvent) => {
    handleDragLeave(e);
  };

  const handleDropWrapper = (e: React.DragEvent, targetIndex: number) => {
    handleDrop(e, targetIndex);
  };

  // Show loading spinner until everything is ready
  if (isFullyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
        columns={userColumns}
        showColorPicker={showColorPicker}
        cellRefs={cellRefs}
        selectedRows={selectedRows}
        draggedItemIndex={draggedItemIndex}
        isDraggingMultiple={isDraggingMultiple}
        dropTargetIndex={dropTargetIndex}
        currentSegmentId={currentSegmentId}
        getColumnWidth={getColumnWidth}
        updateColumnWidth={handleUpdateColumnWidthWrapper}
        getRowNumber={getRowNumber}
        getRowStatus={getRowStatusForContainer}
        calculateHeaderDuration={calculateHeaderDuration}
        onUpdateItem={updateItem}
        onCellClick={handleCellClickWrapper}
        onKeyDown={handleKeyDownWrapper}
        onToggleColorPicker={handleToggleColorPicker}
        onColorSelect={(id, color) => selectColor(id, color)}
        onDeleteRow={deleteRow}
        onToggleFloat={toggleFloatRow}
        onRowSelect={handleRowSelection} // Use the proper grid row selection handler
        onDragStart={handleDragStartWrapper}
        onDragOver={handleDragOverWrapper}
        onDragLeave={handleDragLeaveWrapper}
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
        onReset={reset}
        handleAddColumn={handleAddColumnWrapper}
        handleReorderColumns={handleReorderColumnsWrapper}
        handleDeleteColumnWithCleanup={handleDeleteColumnWrapper}
        handleRenameColumn={handleRenameColumnWrapper}
        handleToggleColumnVisibility={handleToggleColumnVisibilityWrapper}
        handleLoadLayout={handleLoadLayoutWrapper}
        debugColumns={debugColumns}
        resetToDefaults={resetToDefaults}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving || isSavingPreferences}
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
        onJumpToHere={handleJumpToHere}
        autoScrollEnabled={autoScrollEnabled}
        onToggleAutoScroll={toggleAutoScroll}
        onShowNotes={() => setShowNotesWindow(true)}
        onShowCuerAI={() => setShowCuerAI(true)}
        // Header collapse functions
        toggleHeaderCollapse={toggleHeaderCollapse}
        isHeaderCollapsed={isHeaderCollapsed}
        getHeaderGroupItemIds={getHeaderGroupItemIds}
        visibleItems={visibleItems}
      />
      
      {/* Floating Notes Window */}
      {showNotesWindow && rundownId && (
        <FloatingNotesWindow
          rundownId={rundownId}
          onClose={() => setShowNotesWindow(false)}
        />
      )}
      
      {/* Cuer AI Chat Panel */}
      <CuerChatPanel
        isOpen={showCuerAI}
        onClose={() => setShowCuerAI(false)}
        rundownData={rundownData}
      />
    </RealtimeConnectionProvider>
  );
};

export default RundownIndexContent;

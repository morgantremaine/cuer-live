import React, { useRef, useEffect, useCallback, useState } from 'react';
import RundownContainer from '@/components/RundownContainer';
import CuerChatButton from '@/components/cuer/CuerChatButton';
import RealtimeConnectionProvider from '@/components/RealtimeConnectionProvider';
import { FloatingNotesWindow } from '@/components/FloatingNotesWindow';
import RundownLoadingSkeleton from '@/components/RundownLoadingSkeleton';
import { useRundownStateCoordination } from '@/hooks/useRundownStateCoordination';
import { useIndexHandlers } from '@/hooks/useIndexHandlers';
// Column management now handled by useSimplifiedRundownState internally
import { useSharedRundownLayout } from '@/hooks/useSharedRundownLayout';
import { calculateEndTime } from '@/utils/rundownCalculations';
import { useTeam } from '@/hooks/useTeam';
import { useRundownZoom } from '@/hooks/useRundownZoom';
import { useUserPresence } from '@/hooks/useUserPresence';
import { supabase } from '@/integrations/supabase/client';
// Import timing test to run calculations check
import '@/utils/timingValidationTest';
import { OperationModeToggle } from '@/components/OperationModeToggle';


const RundownIndexContent = () => {
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});
  
  const {
    coreState,
    interactions,
    uiState,
    dragAndDrop
  } = useRundownStateCoordination();
  
  // Extract all needed values from the unified state
  const {
    currentTime,
    timezone,
    rundownTitle,
    rundownStartTime,
    showDate,
    rundownId,
    items,
    columns,
    visibleColumns,
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
    isInitialized,
    hasLoadedInitialState,
    totalRuntime,
    setTitle,
    setStartTime,
    setTimezone,
    setShowDate,
    undo,
    canUndo,
    lastAction,
    isConnected,
    isProcessingRealtimeUpdate,
    autoScrollEnabled,
    toggleAutoScroll,
    // Column management functions
    addColumn,
    updateColumnWidth,
    setColumns,
    // Header collapse functions
    toggleHeaderCollapse,
    isHeaderCollapsed,
    getHeaderGroupItemIds,
    visibleItems,
    // Move functions for mobile
    moveItemUp,
    moveItemDown
  } = coreState;

  // Get team data for column deletion
  const { team } = useTeam();

  // Set up user presence tracking for this rundown
  const { otherUsers, isConnected: presenceConnected } = useUserPresence({
    rundownId,
    enabled: true,
    hasUnsavedChanges,
  });

  // Show teammate editing when any teammate is active and has unsaved changes
  const activeTeammates = otherUsers.filter(user => {
    const lastSeen = new Date(user.lastSeen);
    const now = new Date();
    const timeDiff = (now.getTime() - lastSeen.getTime()) / 1000;
    const isActive = timeDiff < 120; // Active if seen within 2 minutes
    const isEditing = !!user.hasUnsavedChanges;
    
    return isActive && isEditing;
  });

  const hasActiveTeammates = activeTeammates.length > 0;
  const activeTeammateNames = activeTeammates.map(user => user.userFullName || 'Unknown User');

  // Get columns from the main state system (no duplicate column management)
  const userColumns = columns;
  const isLoadingPreferences = isLoading;
  const isSavingPreferences = isSaving;

  // Get shared layout information to prevent flashing during layout loads
  const { 
    isLoading: isLoadingSharedLayout 
  } = useSharedRundownLayout(rundownId);

  // Track layout stabilization to prevent flashing
  const [isLayoutStabilized, setIsLayoutStabilized] = useState(false);
  
  // Removed redundant useTeamCustomColumns - useUserColumnPreferences handles team columns internally

  // Prevent skeleton from reappearing after first reveal - but keep it lightweight
  const [hasRevealed, setHasRevealed] = useState(false);

  // Mark layout as stabilized after a brief delay when all loading is complete  
  useEffect(() => {
    if (!isLoadingPreferences && !isLoadingSharedLayout && userColumns.length > 0) {
      const stabilizationTimer = setTimeout(() => {
        setIsLayoutStabilized(true);
      }, 100); // Shorter delay for faster reveal
      
      return () => clearTimeout(stabilizationTimer);
    } else {
      setIsLayoutStabilized(false);
    }
  }, [isLoadingPreferences, isLoadingSharedLayout, userColumns.length]);


  // Create wrapper functions that operate on userColumns from useUserColumnPreferences
  const handleAddColumnWrapper = useCallback((name: string) => {
    const newColumn = {
      id: `custom_${Date.now()}`,
      name,
      key: `custom_${Date.now()}`,
      width: '150px',
      isCustom: true,
      isEditable: true,
      isVisible: true
    };
    
    // Insert the new column right after the segment name column (index 1)
    const newColumns = [...userColumns];
    newColumns.splice(1, 0, newColumn);
    setColumns(newColumns); // Auto-save
  }, [userColumns, setColumns]);

  const handleReorderColumnsWrapper = useCallback((newColumns: any[]) => {
    if (!Array.isArray(newColumns)) return;
    setColumns(newColumns); // Auto-save
  }, [setColumns]);

  const handleDeleteColumnWrapper = useCallback(async (columnId: string) => {
    console.log('🗑️ Delete column wrapper called with ID:', columnId);
    
    const columnToDelete = userColumns.find(col => col.id === columnId);
    if (!columnToDelete) {
      console.error('🗑️ Column not found:', columnId);
      return;
    }

    console.log('🗑️ Column to delete:', columnToDelete);
    console.log('🗑️ Is team column:', (columnToDelete as any).isTeamColumn);
    console.log('🗑️ Team ID:', team?.id);

    // If it's a team column, delete it from the database
    if ((columnToDelete as any).isTeamColumn && team?.id) {
      console.log('🗑️ Deleting team column from database...');
      
      try {
        const { error } = await supabase
          .from('team_custom_columns')
          .delete()
          .eq('team_id', team.id)
          .eq('column_key', columnToDelete.key);

        if (error) {
          console.error('🗑️ Error deleting team custom column:', error);
          return; // Don't proceed with local deletion if database deletion failed
        }

        console.log('🗑️ Successfully deleted team column from database');

        // Clean up this column from all user column preferences for this team
        const { error: cleanupError } = await supabase
          .rpc('cleanup_deleted_team_column', {
            team_uuid: team.id,
            column_key: columnToDelete.key
          });

        if (cleanupError) {
          console.warn('🗑️ Warning: Could not clean up deleted team column from user preferences:', cleanupError);
        } else {
          console.log('🗑️ Successfully cleaned up team column references');
        }
      } catch (dbError) {
        console.error('🗑️ Error deleting team column from database:', dbError);
        return; // Don't proceed with local deletion if database operation failed
      }
    }

    // Remove from local state
    console.log('🗑️ Removing column from local state...');
    const filtered = userColumns.filter(col => col.id !== columnId);
    setColumns(filtered); // Auto-save
    console.log('🗑️ Column deletion complete');
  }, [userColumns, setColumns, team?.id]);

  const handleRenameColumnWrapper = useCallback((columnId: string, newName: string) => {
    const updated = userColumns.map(col => {
      if (col.id === columnId) {
        return { ...col, name: newName };
      }
      return col;
    });
    setColumns(updated); // Auto-save
  }, [userColumns, setColumns]);

  const handleToggleColumnVisibilityWrapper = useCallback((columnId: string, insertIndex?: number) => {
    const target = userColumns.find(col => col.id === columnId);
    if (!target) return;

    // If currently visible, hide it
    if (target.isVisible !== false) {
      const updated = userColumns.map(col => (
        col.id === columnId ? { ...col, isVisible: false } : col
      ));
      setColumns(updated); // Auto-save
      return;
    }

    // If currently hidden, show it and optionally reposition
    const updated = userColumns.map(col => (
      col.id === columnId ? { ...col, isVisible: true } : col
    ));

    if (typeof insertIndex === 'number') {
      const currentIndex = updated.findIndex(col => col.id === columnId);
      if (currentIndex !== -1) {
        const [col] = updated.splice(currentIndex, 1);
        const clampedIndex = Math.min(Math.max(insertIndex, 0), updated.length);
        updated.splice(clampedIndex, 0, col);
      }
    }

    setColumns(updated); // Auto-save
  }, [userColumns, setColumns]);

  // Keep these from useColumnsManager for compatibility
  const debugColumns = useCallback(() => {
    console.log('Current userColumns:', userColumns);
  }, [userColumns]);

  const resetToDefaults = useCallback(() => {
    // Reset to default columns - this should reload from useUserColumnPreferences defaults
    console.log('Reset to defaults - this should be handled by useUserColumnPreferences');
  }, []);

  // Show skeleton until ALL systems are ready, including layout stabilization
  const isFullyLoading = (
    isLoading ||
    !isInitialized ||
    !hasLoadedInitialState ||
    !rundownId ||
    !items || items.length === 0 ||
    isLoadingSharedLayout ||
    !isLayoutStabilized
  );
  const showSkeleton = !hasRevealed ? isFullyLoading : false;

  // After core rundown loads, prevent skeleton from reappearing
  useEffect(() => {
    if (!isFullyLoading && !hasRevealed) {
      setHasRevealed(true);
    }
  }, [isFullyLoading, hasRevealed]);

  // visibleColumns comes from coreState - no need to filter here

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
  
  // Enhanced column manager opener that ensures fresh data
  useEffect(() => {
    if (showColumnManager) {
      console.log('📊 Column Manager opened - current columns:', {
        totalColumns: userColumns.length,
        visibleColumns: visibleColumns.length,
        defaultColumns: userColumns.filter(col => !col.isCustom).length,
        customColumns: userColumns.filter(col => col.isCustom && !(col as any).isTeamColumn).length,
        teamColumns: userColumns.filter(col => (col as any).isTeamColumn).length,
        columnDetails: userColumns.map(col => ({
          name: col.name,
          key: col.key,
          isCustom: col.isCustom,
          isTeamColumn: (col as any).isTeamColumn || false,
          isVisible: col.isVisible
        }))
      });
    }
  }, [showColumnManager, userColumns, visibleColumns]);
  
  // State for notes window
  const [showNotesWindow, setShowNotesWindow] = React.useState(false);

  // Zoom functionality
  const {
    zoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
    canZoomIn,
    canZoomOut,
    isDefaultZoom
  } = useRundownZoom(rundownId);

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
    handleShowDateChange,
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
    setShowDate,
    markAsChanged: () => {} // Handled internally by unified state
  });

  const selectedRowsArray = Array.from(selectedRows);
  const selectedRowId = selectedRowsArray.length === 1 ? selectedRowsArray[0] : null;

  // Convert timeRemaining to number (assuming it's in seconds)
  const timeRemainingNumber = typeof timeRemaining === 'string' ? 0 : timeRemaining;

  // Remove duplicate handlers - using the ones from earlier in the file

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

    console.log('✅ Applying layout as persistent user preference for this rundown');
    // Use applyLayout to permanently set this as the user's preference for this rundown  
    setColumns(validColumns);
  };

  const handleUpdateColumnWidthWrapper = (columnId: string, width: number) => {
    // Use the updateColumnWidth method from the core state
    updateColumnWidth(columnId, `${width}px`);
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

  // Show loading spinner only for core data, let column layout settle smoothly
  if (showSkeleton) {
    return <RundownLoadingSkeleton />;
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
        totalRuntime={totalRuntime || ''}
        showColumnManager={showColumnManager}
        setShowColumnManager={(show: boolean) => {
          if (show) {
            // Column manager will use the current columns from state
            console.log('🔄 Opening column manager - using current columns from state');
          }
          setShowColumnManager(show);
        }}
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
        onAddRow={() => handleAddRow()}
        onAddHeader={() => handleAddHeader()}
        selectedCount={selectedRows.size}
        hasClipboardData={typeof hasClipboardData === 'function' ? hasClipboardData() : false}
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
        showDate={showDate}
        onShowDateChange={handleShowDateChange}
        rundownId={rundownId}
        onOpenTeleprompter={handleOpenTeleprompter}
        onUndo={undo}
        canUndo={canUndo}
        lastAction={lastAction || ''}
        isConnected={isConnected}
        isProcessingRealtimeUpdate={isProcessingRealtimeUpdate}
        hasActiveTeammates={hasActiveTeammates}
        activeTeammateNames={activeTeammateNames}
        onJumpToHere={handleJumpToHere}
        autoScrollEnabled={autoScrollEnabled}
        onToggleAutoScroll={toggleAutoScroll}
        onShowNotes={() => setShowNotesWindow(true)}
        // Zoom controls
        zoomLevel={zoomLevel}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
        isDefaultZoom={isDefaultZoom}
        // Header collapse functions
        toggleHeaderCollapse={toggleHeaderCollapse}
        isHeaderCollapsed={isHeaderCollapsed}
        getHeaderGroupItemIds={getHeaderGroupItemIds}
        visibleItems={visibleItems}
        onMoveItemUp={moveItemUp}
        onMoveItemDown={moveItemDown}
        dragAndDrop={dragAndDrop}
      />
      
      {/* Floating Notes Window */}
      {showNotesWindow && rundownId && (
        <FloatingNotesWindow
          rundownId={rundownId}
          onClose={() => setShowNotesWindow(false)}
        />
      )}
      
      {/* Operation Mode Toggle */}
      {rundownId && (
        <div className="fixed top-4 right-4 z-50">
          <OperationModeToggle rundownId={rundownId} />
        </div>
      )}
      
      <CuerChatButton
        rundownData={rundownData}
        modDeps={{
          items,
          updateItem,
          addRow,
          addHeader,
          addRowAtIndex: coreState.addRowAtIndex,
          addHeaderAtIndex: coreState.addHeaderAtIndex,
          deleteRow,
          calculateEndTime: coreState.calculateEndTime,
          markAsChanged: coreState.markAsChanged
        }}
      />
    </RealtimeConnectionProvider>
  );
};

export default RundownIndexContent;

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import RundownContainer from '@/components/RundownContainer';
import CuerChatButton from '@/components/cuer/CuerChatButton';
import RealtimeConnectionProvider from '@/components/RealtimeConnectionProvider';
import { FloatingNotesWindow } from '@/components/FloatingNotesWindow';
import RundownLoadingSkeleton from '@/components/RundownLoadingSkeleton';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import RundownHistory from '@/components/RundownHistory';
import { useRundownStateCoordination } from '@/hooks/useRundownStateCoordination';
import { useIndexHandlers } from '@/hooks/useIndexHandlers';
// Column management now handled by useSimplifiedRundownState internally
import { useSharedRundownLayout } from '@/hooks/useSharedRundownLayout';
import { calculateEndTime } from '@/utils/rundownCalculations';
import { useTeam } from '@/hooks/useTeam';
import { useRundownZoom } from '@/hooks/useRundownZoom';
import { useUserPresence } from '@/hooks/useUserPresence';
import { useRundownKeyboardShortcuts } from '@/hooks/useRundownKeyboardShortcuts';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCellEditors } from '@/hooks/useActiveCellEditors';
import { useCellEditIntegration } from '@/hooks/useCellEditIntegration';
import { useMOSIntegration } from '@/hooks/useMOSIntegration';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { supabase } from '@/integrations/supabase/client';
import { realtimeReconnectionCoordinator } from '@/services/RealtimeReconnectionCoordinator';
import { DEMO_RUNDOWN_ID } from '@/data/demoRundownData';
// Import timing test to run calculations check
import '@/utils/timingValidationTest';


const RundownIndexContent = () => {
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});
  
  // Enable realtime connection notifications
  useRealtimeNotifications();
  
  // Get team data and user for MOS integration setup
  const { team, userRole } = useTeam();
  const { user } = useAuth();
  
  const {
    coreState,
    interactions,
    uiState,
    dragAndDrop,
    mosIntegration
  } = useRundownStateCoordination();
  
  // Extract all needed values from the unified state
  const {
    currentTime,
    timezone,
    rundownTitle,
    rundownStartTime,
    rundownEndTime,
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
    setEndTime,
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
    moveItemDown,
    // Numbering lock
    numberingLocked,
    toggleLock
  } = coreState;

  const userId = user?.id || '';
  const userName = user?.user_metadata?.full_name || user?.email || 'Anonymous';

  // Get MOS integration handlers from coordination
  const { handleSegmentChange } = mosIntegration;

  // Cell editor setup ready

  // Set up per-cell active editor tracking
  const { getEditorForCell, getAllActiveEditors } = useActiveCellEditors(rundownId);

  // Set up cell edit integration for broadcasting focus states
  const { handleCellEditStart, handleCellEditComplete } = useCellEditIntegration({
    rundownId,
    isPerCellEnabled: true,
    userId,
    userName
  });

  // Handle scroll to editor - scroll to the row where another user is editing
  const handleScrollToEditor = useCallback((itemId: string) => {
    // Find the scroll container from the DOM
    const scrollContainer = document.querySelector('[data-radix-scroll-area-viewport]');
    
    if (!scrollContainer) return;
    
    const targetElement = scrollContainer.querySelector(
      `[data-item-id="${itemId}"]`
    );
    
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, []);

  // Track the last edit location for presence broadcasting
  const [lastEditLocation, setLastEditLocation] = useState<{ itemId: string; field: string } | null>(null);

  // Set up user presence tracking for this rundown
  const { otherUsers, isConnected: presenceConnected } = useUserPresence({
    rundownId,
    enabled: true,
    hasUnsavedChanges,
    lastEditedItemId: lastEditLocation?.itemId,
    lastEditedField: lastEditLocation?.field,
  });

  // Track reconnection status
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  useEffect(() => {
    const checkReconnecting = () => {
      setIsReconnecting(realtimeReconnectionCoordinator.isCurrentlyReconnecting());
    };
    
    // Poll for reconnection status every 100ms
    const interval = setInterval(checkReconnecting, 100);
    
    return () => clearInterval(interval);
  }, []);
  
  // Show teammate editing when any teammate is active and has unsaved changes
  const activeTeammates = otherUsers.filter(user => {
    const lastSeen = new Date(user.lastSeen);
    const now = new Date();
    const timeDiff = (now.getTime() - lastSeen.getTime()) / 1000;
    const isActive = timeDiff < 120; // Active if seen within 2 minutes
    const isEditing = !!(user.lastEditedItemId && user.lastEditedField);
    
    return isActive && isEditing;
  });

  // Create presence users array for avatar display (all active users, not just editing)
  const presentUsers = otherUsers
    .filter(user => {
      const timeDiff = (Date.now() - new Date(user.lastSeen).getTime()) / 1000;
      return timeDiff < 120; // Active within 2 minutes
    })
    .map(user => ({
      userId: user.userId,
      userFullName: user.userFullName || 'Unknown User',
      isEditing: !!(user.lastEditedItemId && user.lastEditedField),
      lastEditedItemId: user.lastEditedItemId,
      lastEditedField: user.lastEditedField,
    }));

  // Handle scroll to user - scrolls to where a specific user is editing
  const handleScrollToUser = useCallback((user: { userId: string; lastEditedItemId?: string }) => {
    if (user.lastEditedItemId) {
      console.log('📍 Scrolling to user location:', user);
      handleScrollToEditor(user.lastEditedItemId);
    }
  }, [handleScrollToEditor]);

  // Handle scroll to active teammate - finds the first cell being edited by any teammate and scrolls to it
  const handleScrollToActiveTeammate = useCallback(() => {
    // Find active teammates with location data from presence
    const teammateWithLocation = activeTeammates.find(
      user => user.lastEditedItemId && user.lastEditedField
    );
    
    if (teammateWithLocation && teammateWithLocation.lastEditedItemId) {
      console.log('📍 Found teammate with location:', teammateWithLocation);
      console.log('📍 Scrolling to itemId:', teammateWithLocation.lastEditedItemId);
      handleScrollToEditor(teammateWithLocation.lastEditedItemId);
    } else {
      // Fallback: use cell editor tracking if no presence location data
      const allEditors = getAllActiveEditors();
      const teammateEditor = allEditors.find(
        editor => editor.editor.userId !== userId
      );
      
      if (teammateEditor) {
        handleScrollToEditor(teammateEditor.itemId);
      }
    }
  }, [activeTeammates, getAllActiveEditors, userId, handleScrollToEditor]);

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
    const columnToDelete = userColumns.find(col => col.id === columnId);
    if (!columnToDelete) {
      console.error('Column not found:', columnId);
      return;
    }

    // If it's a team column, delete it from the database
    if ((columnToDelete as any).isTeamColumn && team?.id) {
      try {
        const { error } = await supabase
          .from('team_custom_columns')
          .delete()
          .eq('team_id', team.id)
          .eq('column_key', columnToDelete.key);

        if (error) {
          console.error('Error deleting team custom column:', error);
          return; // Don't proceed with local deletion if database deletion failed
        }

        // Clean up this column from all user column preferences for this team
        const { error: cleanupError } = await supabase
          .rpc('cleanup_deleted_team_column', {
            team_uuid: team.id,
            column_key: columnToDelete.key
          });

        if (cleanupError) {
          console.warn('Warning: Could not clean up deleted team column from user preferences:', cleanupError);
        }
      } catch (dbError) {
        console.error('Error deleting team column from database:', dbError);
        return; // Don't proceed with local deletion if database operation failed
      }
    }

    // Remove from local state
    const filtered = userColumns.filter(col => col.id !== columnId);
    setColumns(filtered); // Auto-save
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

  // Show skeleton until core rundown is ready (non-blocking for subscription/layout)
  const isFullyLoading = (
    isLoading ||
    !isInitialized ||
    !hasLoadedInitialState ||
    !rundownId ||
    !items || items.length === 0
  );
  const showSkeleton = !hasRevealed ? isFullyLoading : false;

  // After core rundown loads, prevent skeleton from reappearing
  useEffect(() => {
    if (!isFullyLoading && !hasRevealed) {
      setHasRevealed(true);
    }
  }, [isFullyLoading, hasRevealed, isLoading, isInitialized, hasLoadedInitialState, rundownId, items]);

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
    handleDragEnd,
    hasClipboardData,
    handleCopySelectedRows,
    handlePasteRows,
    handleDeleteSelectedRows,
    handleRowSelection,
    handleAddRow,
    handleAddHeader
  } = interactions;

  // Add keyboard shortcuts for copy/paste/add row and showcaller controls
  useRundownKeyboardShortcuts({
    onCopy: handleCopySelectedRows,
    onPaste: handlePasteRows,
    onAddRow: handleAddRow,
    selectedRows: interactions.selectedRows,
    hasClipboardData: hasClipboardData(),
    onShowcallerPlay: play,
    onShowcallerPause: pause,
    onShowcallerForward: forward,
    onShowcallerBackward: backward,
    onShowcallerReset: reset,
    isShowcallerPlaying: isPlaying,
    onUndo: undo,
    canUndo: canUndo,
    onRedo: coreState.redo,
    canRedo: coreState.canRedo,
    userRole: userRole
  });

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
  
  // State for history sheet
  const [showHistory, setShowHistory] = React.useState(false);

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
      document.title = 'Cuer';
    }

    // Cleanup: reset title when component unmounts
    return () => {
      document.title = 'Cuer';
    };
  }, [rundownTitle]);

  // Send MOS messages to Xpression when current segment changes
  useEffect(() => {
    if (currentSegmentId && items.length > 0) {
      const currentSegment = items.find(item => item.id === currentSegmentId);
      if (currentSegment) {
        // Send segment data to MOS integration
        handleSegmentChange(currentSegmentId, currentSegment);
      }
    }
  }, [currentSegmentId, items, handleSegmentChange]);


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
    handleRundownEndTimeChange,
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
    setRundownEndTime: setEndTime,
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
    if (!Array.isArray(layoutColumns)) {
      console.error('Invalid layout columns - not an array:', layoutColumns);
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
      console.error('No valid columns found in layout');
      return;
    }

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

  const handleDragEndWrapper = (e: React.DragEvent) => {
    handleDragEnd(e);
  };

  // Show loading spinner only for core data, let column layout settle smoothly
  if (showSkeleton) {
    return <RundownLoadingSkeleton />;
  }

  return (
    <RealtimeConnectionProvider
      isConnected={isConnected || false}
      isProcessingUpdate={isProcessingRealtimeUpdate || false}
      isReconnecting={isReconnecting}
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
        onDragEnd={handleDragEndWrapper}
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
        rundownEndTime={rundownEndTime}
        onRundownEndTimeChange={handleRundownEndTimeChange}
        showDate={showDate}
        onShowDateChange={handleShowDateChange}
        rundownId={rundownId}
        teamId={team?.id}
        onOpenTeleprompter={handleOpenTeleprompter}
        onUndo={coreState.undo}
        canUndo={coreState.canUndo}
        lastAction={coreState.lastAction}
        onRedo={coreState.redo}
        canRedo={coreState.canRedo}
        nextRedoAction={coreState.nextRedoAction}
        isConnected={coreState.isConnected}
        isProcessingRealtimeUpdate={isProcessingRealtimeUpdate}
        hasActiveTeammates={hasActiveTeammates}
        activeTeammateNames={activeTeammateNames}
        presentUsers={presentUsers}
        onScrollToUser={handleScrollToUser}
        onJumpToHere={handleJumpToHere}
        autoScrollEnabled={autoScrollEnabled}
        onToggleAutoScroll={toggleAutoScroll}
        saveCompletionCount={coreState.saveCompletionCount}
        failedSavesCount={coreState.failedSavesCount}
        onRetryFailedSaves={coreState.onRetryFailedSaves}
        saveError={coreState.saveError}
        onShowNotes={() => setShowNotesWindow(true)}
        onShowHistory={() => setShowHistory(true)}
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
        numberingLocked={numberingLocked}
        onToggleLock={toggleLock}
        // Per-cell editor indicators
        getEditorForCell={getEditorForCell}
        onCellFocus={(itemId, field) => {
          setLastEditLocation({ itemId, field });
          handleCellEditStart(itemId, field, '');
        }}
        onCellBlur={(itemId, field) => {
          setLastEditLocation(null);
          handleCellEditComplete(itemId, field, '');
        }}
        onScrollToEditor={handleScrollToEditor}
        onScrollToActiveTeammate={handleScrollToActiveTeammate}
        userRole={userRole}
      />
      
      {/* Floating Notes Window */}
      {showNotesWindow && rundownId && (
        <FloatingNotesWindow
          rundownId={rundownId}
          onClose={() => setShowNotesWindow(false)}
        />
      )}
      
      {/* History Sheet */}
      {rundownId && (
        <Sheet open={showHistory} onOpenChange={setShowHistory}>
          <SheetContent side="right" className="w-[500px] p-0">
            <RundownHistory rundownId={rundownId} />
          </SheetContent>
        </Sheet>
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

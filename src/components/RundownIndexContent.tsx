import React, { useRef, useEffect, useCallback } from 'react';
import RundownContainer from '@/components/RundownContainer';
import CuerChatButton from '@/components/cuer/CuerChatButton';
import RealtimeConnectionProvider from '@/components/RealtimeConnectionProvider';
import { FloatingNotesWindow } from '@/components/FloatingNotesWindow';
import RundownLoadingSkeleton from '@/components/RundownLoadingSkeleton';
import { useBulletproofRundownState } from '@/hooks/useBulletproofRundownState';
import { useUserColumnPreferences } from '@/hooks/useUserColumnPreferences';
import { useTeam } from '@/hooks/useTeam';
import { supabase } from '@/integrations/supabase/client';
import RealtimeDebugOverlay from '@/components/debug/RealtimeDebugOverlay';

const RundownIndexContent = () => {
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});
  
  // Use the bulletproof state management directly
  const bulletproofState = useBulletproofRundownState();
  
  // Extract needed values from bulletproof state
  const {
    currentTime,
    timezone,
    title: rundownTitle,
    startTime: rundownStartTime,
    showDate,
    rundownId,
    items,
    isLoading,
    isInitialized,
    isSaving,
    isConnected,
    selectedRowId,
    handleFieldChange,
    addItem,
    deleteItem,
    updateItem,
    setTitle,
    setStartTime,
    setTimezone,
    setShowDate,
    handleRowSelection
  } = bulletproofState;

  // Get team data for column deletion
  const { team } = useTeam();

  // Use user column preferences for persistent column management
  const { 
    columns: userColumns, 
    setColumns: setUserColumns, 
    updateColumnWidth: updateUserColumnWidth,
    applyLayout: applyUserLayout,
    isLoading: isLoadingPreferences,
    isSaving: isSavingPreferences,
    reloadPreferences
  } = useUserColumnPreferences(rundownId);

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
    setUserColumns(newColumns, true); // Immediate save
  }, [userColumns, setUserColumns]);

  const handleDeleteColumnWrapper = useCallback(async (columnId: string) => {
    console.log('🗑️ Delete column wrapper called with ID:', columnId);
    
    const columnToDelete = userColumns.find(col => col.id === columnId);
    if (!columnToDelete) {
      console.error('🗑️ Column not found:', columnId);
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
          console.error('🗑️ Error deleting team custom column:', error);
          return;
        }

        // Clean up this column from all user column preferences for this team
        const { error: cleanupError } = await supabase
          .rpc('cleanup_deleted_team_column', {
            team_uuid: team.id,
            column_key: columnToDelete.key
          });

        if (cleanupError) {
          console.warn('🗑️ Warning: Could not clean up deleted team column from user preferences:', cleanupError);
        }
      } catch (dbError) {
        console.error('🗑️ Error deleting team column from database:', dbError);
        return;
      }
    }

    // Remove from local state
    const filtered = userColumns.filter(col => col.id !== columnId);
    setUserColumns(filtered, true); // Immediate save
  }, [userColumns, setUserColumns, team?.id]);

  // Check if we're still loading
  const isFullyLoading = isLoading || !isInitialized || isLoadingPreferences || !rundownId || !items || items.length === 0 || !userColumns || userColumns.length === 0;

  // Filter visible columns
  const visibleColumns = Array.isArray(userColumns) ? userColumns.filter(col => col.isVisible !== false) : [];

  // State for column manager
  const [showColumnManager, setShowColumnManager] = React.useState(false);
  
  // State for notes window
  const [showNotesWindow, setShowNotesWindow] = React.useState(false);

  // Update browser tab title when rundown title changes
  useEffect(() => {
    if (rundownTitle && rundownTitle !== 'Untitled Rundown') {
      document.title = rundownTitle;
    } else {
      document.title = 'Cuer Live';
    }

    return () => {
      document.title = 'Cuer Live';
    };
  }, [rundownTitle]);

  // Simple wrappers for basic functionality
  const handleUpdateColumnWidthWrapper = (columnId: string, width: number) => {
    updateUserColumnWidth(columnId, `${width}px`);
  };

  // Simple add operations - create complete RundownItem objects  
  const handleAddRow = () => {
    const newItem = {
      id: `item_${Date.now()}`,
      type: 'regular' as const,
      rowNumber: (items.length + 1).toString(),
      name: 'New Segment',
      startTime: '00:00:00',
      endTime: '00:00:30',
      duration: '00:00:30',
      elapsedTime: '00:00:00',
      talent: '',
      script: '',
      gfx: '',
      audio: '',
      video: '',
      lighting: '',
      other: '',
      notes: '',
      segmentName: 'New Segment',
      images: '',
      color: '',
      isFloating: false
    };
    bulletproofState.addItem(newItem);
  };

  const handleAddHeader = () => {
    const newHeader = {
      id: `header_${Date.now()}`,
      type: 'header' as const,
      rowNumber: (items.length + 1).toString(),
      name: 'New Header',
      startTime: '00:00:00',
      endTime: '00:00:00',
      duration: '00:00:00',
      elapsedTime: '00:00:00',
      talent: '',
      script: '',
      gfx: '',
      audio: '',
      video: '',
      lighting: '',
      other: '',
      notes: '',
      segmentName: 'New Header',
      images: '',
      color: '',
      isFloating: false
    };
    bulletproofState.addItem(newHeader);
  };

  // Mock functions for missing features to prevent errors
  const getRowNumber = (index: number) => (index + 1).toString();
  const getRowStatus = (item: any, currentTime: Date) => 'upcoming' as const;
  const calculateHeaderDuration = (index: number) => '0:00';
  const getColumnWidth = (column: any) => '150px';

  // Simple handlers
  const handleCellClick = () => {};
  const handleKeyDown = () => {};
  const handleToggleColorPicker = () => {};
  const selectColor = () => {};
  const clearSelection = () => {};

  // Mock drag and drop handlers
  const selectedRows = new Set<string>();
  const handleDragStart = () => {};
  const handleDragOver = () => {};
  const handleDragLeave = () => {};
  const handleDrop = () => {};
  const handleCopySelectedRows = () => {};
  const handlePasteRows = () => {};
  const handleDeleteSelectedRows = () => {};
  const hasClipboardData = () => false;

  // Show loading spinner until everything is ready
  if (isFullyLoading) {
    return <RundownLoadingSkeleton />;
  }

  return (
    <RealtimeConnectionProvider
      isConnected={isConnected || false}
      isProcessingUpdate={false}
    >
      <RundownContainer
        currentTime={currentTime}
        timezone={timezone}
        onTimezoneChange={setTimezone}
        totalRuntime="0:00"
        showColumnManager={showColumnManager}
        setShowColumnManager={setShowColumnManager}
        items={items}
        visibleColumns={visibleColumns}
        columns={userColumns}
        showColorPicker={null}
        cellRefs={cellRefs}
        selectedRows={selectedRows}
        draggedItemIndex={-1}
        isDraggingMultiple={false}
        dropTargetIndex={-1}
        currentSegmentId={null}
        getColumnWidth={getColumnWidth}
        updateColumnWidth={handleUpdateColumnWidthWrapper}
        getRowNumber={getRowNumber}
        getRowStatus={getRowStatus}
        calculateHeaderDuration={calculateHeaderDuration}
        onUpdateItem={(id, field, value) => handleFieldChange(`${id}-${field}`, value)}
        onCellClick={handleCellClick}
        onKeyDown={handleKeyDown}
        onToggleColorPicker={handleToggleColorPicker}
        onColorSelect={selectColor}
        onDeleteRow={deleteItem}
        onToggleFloat={() => {}}
        onRowSelect={(itemId, index, isShiftClick, isCtrlClick, headerGroupItemIds) => handleRowSelection(itemId)}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onAddRow={handleAddRow}
        onAddHeader={handleAddHeader}
        selectedCount={0}
        hasClipboardData={hasClipboardData()}
        onCopySelectedRows={handleCopySelectedRows}
        onPasteRows={handlePasteRows}
        onDeleteSelectedRows={handleDeleteSelectedRows}
        onClearSelection={clearSelection}
        selectedRowId={selectedRowId}
        isPlaying={false}
        timeRemaining={0}
        onPlay={() => {}}
        onPause={() => {}}
        onForward={() => {}}
        onBackward={() => {}}
        onReset={() => {}}
        handleAddColumn={handleAddColumnWrapper}
        handleReorderColumns={() => {}}
        handleDeleteColumnWithCleanup={handleDeleteColumnWrapper}
        handleRenameColumn={() => {}}
        handleToggleColumnVisibility={() => {}}
        handleLoadLayout={() => {}}
        hasUnsavedChanges={bulletproofState.hasUnsavedChanges}
        isSaving={isSaving}
        rundownTitle={rundownTitle}
        onTitleChange={setTitle}
        rundownStartTime={rundownStartTime}
        onRundownStartTimeChange={setStartTime}
        showDate={showDate}
        onShowDateChange={setShowDate}
        rundownId={rundownId || ''}
        onOpenTeleprompter={() => {}}
        onUndo={() => {}}
        canUndo={false}
        lastAction={null}
        isConnected={isConnected}
        autoScrollEnabled={true}
        onToggleAutoScroll={() => {}}
        toggleHeaderCollapse={() => {}}
        isHeaderCollapsed={() => false}
        getHeaderGroupItemIds={() => []}
        visibleItems={items}
      />

      <CuerChatButton 
        rundownData={{
          id: rundownId,
          title: rundownTitle,
          startTime: rundownStartTime,
          timezone: timezone,
          items: items,
          columns: userColumns,
          totalRuntime: "0:00"
        }}
        modDeps={{
          items,
          updateItem: (id: string, field: string, value: string) => handleFieldChange(`${id}-${field}`, value),
          addRow: handleAddRow,
          addHeader: handleAddHeader,
          deleteRow: deleteItem,
          addRowAtIndex: handleAddRow,
          addHeaderAtIndex: handleAddHeader,
          calculateEndTime: () => '00:00:00',
          markAsChanged: () => {}
        }}
      />

      {showNotesWindow && (
        <FloatingNotesWindow
          rundownId={rundownId || ''}
          onClose={() => setShowNotesWindow(false)}
        />
      )}

      <RealtimeDebugOverlay 
        rundownId={rundownId || ''}
        connectionStatus={isConnected}
      />
    </RealtimeConnectionProvider>
  );
};

export default RundownIndexContent;
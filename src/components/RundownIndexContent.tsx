
import React, { useRef, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import RundownContainer from '@/components/RundownContainer';
import CuerChatButton from '@/components/cuer/CuerChatButton';
import { useSimpleRundownState } from '@/hooks/useSimpleRundownState';
import { useRundownBasicState } from '@/hooks/useRundownBasicState';
import { useSimpleDataLoader } from '@/hooks/useSimpleDataLoader';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useIndexHandlers } from '@/hooks/useIndexHandlers';

const RundownIndexContent = () => {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  
  // Create cellRefs with proper type - MUST be before any conditional returns
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});

  // Use only the basic state management - MUST be before any conditional returns
  const basicState = useRundownBasicState();
  
  // Get storage functionality - MUST be before any conditional returns
  const { savedRundowns, loading, saveRundown } = useRundownStorage();

  // Handle new rundown creation when on /rundown without ID
  useEffect(() => {
    const createNewRundown = async () => {
      if (!params.id && window.location.pathname === '/rundown' && !isCreatingNew && !loading) {
        console.log('RundownIndexContent: Creating new rundown');
        setIsCreatingNew(true);
        
        try {
          // Create a new rundown with default values
          const newRundown = await saveRundown(
            'Untitled Rundown',
            [], // Empty items array
            undefined, // No custom columns
            'America/New_York', // Default timezone
            '10:00:00' // Default start time
          );
          
          if (newRundown && newRundown.id) {
            console.log('RundownIndexContent: New rundown created, redirecting to:', newRundown.id);
            navigate(`/rundown/${newRundown.id}`);
          }
        } catch (error) {
          console.error('RundownIndexContent: Failed to create new rundown:', error);
          setIsCreatingNew(false);
        }
      }
    };

    createNewRundown();
  }, [params.id, isCreatingNew, loading, saveRundown, navigate]);

  // Use simple data loader - MUST be before any conditional returns
  const dataLoader = useSimpleDataLoader({
    savedRundowns,
    loading,
    setRundownTitle: basicState.setRundownTitleDirectly,
    setTimezone: basicState.setTimezoneDirectly,
    setRundownStartTime: basicState.setRundownStartTimeDirectly,
    handleLoadLayout: () => {}, // Will be handled by rundown state
    setItems: () => {}, // Will be handled by rundown state
    setIsLoading: () => {} // Will be handled by rundown state
  });

  // Use the simple rundown state system - MUST be before any conditional returns
  const rundownState = useSimpleRundownState(
    basicState.rundownTitle,
    basicState.timezone,
    basicState.rundownStartTime
  );

  const {
    handleRundownStartTimeChange,
    handleTimezoneChange,
    handleOpenTeleprompter,
    handleRowSelect,
    handleAddRow,
    handleAddHeader
  } = useIndexHandlers({
    items: rundownState.items,
    selectedRows: new Set(), // Simplified for now
    rundownId: basicState.rundownId,
    addRow: rundownState.addRow,
    addHeader: rundownState.addHeader,
    calculateEndTime: rundownState.calculateTotalRuntime, // Use available function
    toggleRowSelection: () => {}, // Simplified for now
    setRundownStartTime: basicState.setRundownStartTime,
    setTimezone: basicState.setTimezone,
    markAsChanged: rundownState.markAsChanged
  });

  // Prepare rundown data for Cuer AI
  const rundownData = {
    id: basicState.rundownId || 'new',
    title: basicState.rundownTitle,
    startTime: basicState.rundownStartTime,
    timezone: basicState.timezone,
    items: rundownState.items,
    columns: rundownState.columns,
    totalRuntime: rundownState.calculateTotalRuntime()
  };

  // NOW we can do conditional returns after all hooks are called
  // Show loading state while creating new rundown
  if (!params.id && (isCreatingNew || loading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Creating New Rundown...</h2>
          <p className="text-gray-600">Please wait while we set up your rundown.</p>
        </div>
      </div>
    );
  }

  // If we're still on /rundown without an ID and not creating, something went wrong
  if (!params.id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Error</h2>
          <p className="text-gray-600">Unable to create new rundown. Please try again.</p>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <RundownContainer
        currentTime={basicState.currentTime}
        timezone={basicState.timezone}
        onTimezoneChange={handleTimezoneChange}
        totalRuntime={rundownState.calculateTotalRuntime()}
        showColumnManager={basicState.showColumnManager}
        setShowColumnManager={basicState.setShowColumnManager}
        items={rundownState.items}
        visibleColumns={rundownState.visibleColumns}
        columns={rundownState.columns}
        showColorPicker={null}
        cellRefs={cellRefs}
        selectedRows={new Set()}
        draggedItemIndex={null}
        isDraggingMultiple={false}
        dropTargetIndex={null}
        currentSegmentId={null}
        getColumnWidth={() => "150px"}
        updateColumnWidth={() => {}}
        getRowNumber={rundownState.getRowNumber}
        getRowStatus={() => 'upcoming'}
        calculateHeaderDuration={rundownState.calculateHeaderDuration}
        onUpdateItem={rundownState.updateItem}
        onCellClick={() => {}}
        onKeyDown={() => {}}
        onToggleColorPicker={() => {}}
        onColorSelect={() => {}}
        onDeleteRow={rundownState.deleteRow}
        onToggleFloat={rundownState.toggleFloatRow}
        onRowSelect={handleRowSelect}
        onDragStart={() => {}}
        onDragOver={() => {}}
        onDragLeave={() => {}}
        onDrop={() => {}}
        onAddRow={handleAddRow}
        onAddHeader={handleAddHeader}
        selectedCount={0}
        hasClipboardData={false}
        onCopySelectedRows={() => {}}
        onPasteRows={() => {}}
        onDeleteSelectedRows={() => {}}
        onClearSelection={() => {}}
        selectedRowId={null}
        isPlaying={false}
        timeRemaining={0}
        onPlay={() => {}}
        onPause={() => {}}
        onForward={() => {}}
        onBackward={() => {}}
        handleAddColumn={rundownState.handleAddColumn}
        handleReorderColumns={rundownState.handleReorderColumns}
        handleDeleteColumnWithCleanup={rundownState.handleDeleteColumn}
        handleRenameColumn={rundownState.handleRenameColumn}
        handleToggleColumnVisibility={rundownState.handleToggleColumnVisibility}
        handleLoadLayout={rundownState.handleLoadLayout}
        hasUnsavedChanges={rundownState.hasUnsavedChanges}
        isSaving={rundownState.isSaving}
        rundownTitle={basicState.rundownTitle}
        onTitleChange={basicState.setRundownTitle}
        rundownStartTime={basicState.rundownStartTime}
        onRundownStartTimeChange={handleRundownStartTimeChange}
        rundownId={basicState.rundownId}
        onOpenTeleprompter={handleOpenTeleprompter}
        onUndo={() => {}}
        canUndo={false}
        lastAction={null}
      />
      
      <CuerChatButton rundownData={rundownData} />
    </>
  );
};

export default RundownIndexContent;

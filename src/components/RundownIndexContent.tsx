
import React, { useRef } from 'react';
import RundownContainer from '@/components/RundownContainer';
import CuerChatButton from '@/components/cuer/CuerChatButton';
import { useSimpleRundownState } from '@/hooks/useSimpleRundownState';
import { useRundownBasicState } from '@/hooks/useRundownBasicState';
import { useSimpleDataLoader } from '@/hooks/useSimpleDataLoader';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useIndexHandlers } from '@/hooks/useIndexHandlers';

const RundownIndexContent = () => {
  // Create cellRefs with proper type
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});

  // Use only the basic state management
  const basicState = useRundownBasicState();
  
  // Get storage functionality
  const { savedRundowns, loading } = useRundownStorage();
  
  // Use simple data loader
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

  // Use the simple rundown state system
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

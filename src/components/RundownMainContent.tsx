
import React, { useEffect } from 'react';
import RundownGrid from './RundownGrid';
import RundownHeaderSection from './RundownHeaderSection';
import { useRundownGridCore } from '@/hooks/useRundownGridCore';
import { useAutoSave } from '@/hooks/useAutoSave';
import { usePlaybackControls } from '@/hooks/usePlaybackControls';

const RundownMainContent = () => {
  const {
    // Core state
    items,
    visibleColumns,
    currentTime,
    selectedRows,
    rundownId,
    rundownTitle,
    rundownStartTime,
    hasUnsavedChanges,
    timezone,
    totalRuntime,
    
    // Handlers
    updateItem,
    onTitleChange,
    onRundownStartTimeChange,
    onTimezoneChange,
    handleAddRow,
    handleAddHeader,
    onShowColumnManager,
    onCopySelectedRows,
    onPasteRows,
    onDeleteSelectedRows,
    onClearSelection,
    onOpenTeleprompter,
    onUndo,
    canUndo,
    lastAction,
    
    // State
    hasClipboardData,
    selectedRowId,
    markAsChanged,
    isConnected,
    isProcessingRealtimeUpdate
  } = useRundownGridCore();

  // Auto-save functionality
  const { isSaving } = useAutoSave({
    items,
    rundownId,
    rundownTitle,
    rundownStartTime,
    hasUnsavedChanges,
    markAsChanged
  });

  // Playback controls - now with showcaller sync
  const {
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward
  } = usePlaybackControls(items, updateItem, rundownId);

  // Keyboard shortcuts for playback
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle shortcuts when not focused on input elements
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) {
          pause();
        } else if (selectedRowId || currentSegmentId) {
          play(selectedRowId || undefined);
        }
      } else if (e.code === 'ArrowRight' && e.ctrlKey) {
        e.preventDefault();
        forward();
      } else if (e.code === 'ArrowLeft' && e.ctrlKey) {
        e.preventDefault();
        backward();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, selectedRowId, currentSegmentId, play, pause, forward, backward]);

  return (
    <div className="h-full flex flex-col">
      <RundownHeaderSection
        currentTime={currentTime}
        timezone={timezone}
        onTimezoneChange={onTimezoneChange}
        totalRuntime={totalRuntime}
        onAddRow={handleAddRow}
        onAddHeader={handleAddHeader}
        onShowColumnManager={onShowColumnManager}
        selectedCount={selectedRows.size}
        hasClipboardData={hasClipboardData}
        onCopySelectedRows={onCopySelectedRows}
        onPasteRows={onPasteRows}
        onDeleteSelectedRows={onDeleteSelectedRows}
        onClearSelection={onClearSelection}
        selectedRowId={selectedRowId}
        isPlaying={isPlaying}
        currentSegmentId={currentSegmentId}
        timeRemaining={timeRemaining}
        onPlay={play}
        onPause={pause}
        onForward={forward}
        onBackward={backward}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        rundownTitle={rundownTitle}
        onTitleChange={onTitleChange}
        rundownStartTime={rundownStartTime}
        onRundownStartTimeChange={onRundownStartTimeChange}
        rundownId={rundownId}
        onOpenTeleprompter={onOpenTeleprompter}
        items={items}
        visibleColumns={visibleColumns}
        onUndo={onUndo}
        canUndo={canUndo}
        lastAction={lastAction}
        isConnected={isConnected}
        isProcessingRealtimeUpdate={isProcessingRealtimeUpdate}
      />
      
      <div className="flex-1 overflow-auto">
        <RundownGrid />
      </div>
    </div>
  );
};

export default RundownMainContent;

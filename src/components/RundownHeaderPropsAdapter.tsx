import React from 'react';
import RundownHeader from './RundownHeader';
import { useRundownGridCore } from '@/hooks/useRundownGridCore';

interface RundownHeaderPropsAdapterProps {
  rundownId: string | undefined;
  onOpenTeleprompter: () => void;
  onOpenSearch?: () => void;
}

const RundownHeaderPropsAdapter = ({ 
  rundownId, 
  onOpenTeleprompter,
  onOpenSearch
}: RundownHeaderPropsAdapterProps) => {
  const unifiedState = useRundownGridCore();

  const {
    rundownTitle,
    rundownStartTime,
    timezone,
    currentTime,
    totalRuntime,
    hasUnsavedChanges,
    isSaving,
    isConnected,
    isProcessingRealtimeUpdate,
    items,
    visibleColumns,
    setTitle,
    setStartTime,
    undo,
    canUndo,
    lastAction,
    // Showcaller state
    isPlaying,
    currentSegmentId,
    timeRemaining,
    // Autoscroll state
    autoScrollEnabled,
    toggleAutoScroll
  } = unifiedState.coreState;

  return (
    <RundownHeader
      currentTime={currentTime}
      timezone={timezone}
      totalRuntime={totalRuntime}
      hasUnsavedChanges={hasUnsavedChanges}
      isSaving={isSaving}
      title={rundownTitle}
      onTitleChange={setTitle}
      rundownStartTime={rundownStartTime}
      onRundownStartTimeChange={setStartTime}
      items={items}
      visibleColumns={visibleColumns}
      onUndo={undo}
      canUndo={canUndo}
      lastAction={lastAction}
      isConnected={isConnected}
      isProcessingRealtimeUpdate={isProcessingRealtimeUpdate}
      isPlaying={isPlaying}
      currentSegmentId={currentSegmentId}
      timeRemaining={timeRemaining}
      autoScrollEnabled={autoScrollEnabled}
      onToggleAutoScroll={toggleAutoScroll}
      onOpenSearch={onOpenSearch}
    />
  );
};

export default RundownHeaderPropsAdapter;

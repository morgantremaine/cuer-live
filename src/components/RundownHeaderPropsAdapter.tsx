
import React from 'react';
import RundownHeader from './RundownHeader';
import { RundownContainerProps } from '@/types/rundownContainer';

interface RundownHeaderPropsAdapterProps {
  props: RundownContainerProps;
}

const RundownHeaderPropsAdapter = ({ props }: RundownHeaderPropsAdapterProps) => {
  const {
    currentTime,
    timezone,
    onTimezoneChange,
    totalRuntime,
    rundownTitle,
    onTitleChange,
    rundownStartTime,
    onRundownStartTimeChange,
    rundownId,
    hasUnsavedChanges,
    isSaving,
    onUndo,
    canUndo,
    lastAction,
    items,
    visibleColumns,
    isConnected,
    isProcessingRealtimeUpdate,
    isPlaying,
    currentSegmentId,
    timeRemaining,
    autoScrollEnabled,
    onToggleAutoScroll
  } = props;

  return (
    <RundownHeader
      currentTime={currentTime}
      timezone={timezone}
      onTimezoneChange={onTimezoneChange}
      totalRuntime={totalRuntime}
      hasUnsavedChanges={hasUnsavedChanges}
      isSaving={isSaving}
      title={rundownTitle}
      onTitleChange={onTitleChange}
      rundownStartTime={rundownStartTime}
      onRundownStartTimeChange={onRundownStartTimeChange}
      items={items}
      visibleColumns={visibleColumns}
      onUndo={onUndo}
      canUndo={canUndo}
      lastAction={lastAction}
      isConnected={isConnected}
      isProcessingRealtimeUpdate={isProcessingRealtimeUpdate}
      isPlaying={isPlaying}
      currentSegmentId={currentSegmentId}
      timeRemaining={timeRemaining}
      autoScrollEnabled={autoScrollEnabled}
      onToggleAutoScroll={onToggleAutoScroll}
    />
  );
};

export default RundownHeaderPropsAdapter;


import React from 'react';
import RundownHeader from './RundownHeader';
import { RundownContainerProps } from '@/types/rundownContainer';
import { logger } from '@/utils/logger';

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
    rundownEndTime,
    onRundownEndTimeChange,
    rundownId,
    hasUnsavedChanges,
    isSaving,
    saveCompletionCount,
    onUndo,
    canUndo,
    lastAction,
    onRedo,
    canRedo,
    nextRedoAction,
    items,
    visibleColumns,
    isConnected,
    isProcessingRealtimeUpdate,
    isPlaying,
    currentSegmentId,
    timeRemaining,
    autoScrollEnabled,
    onToggleAutoScroll,
    onUpdateItem
  } = props;

  // Debug logging for prop passing
  logger.log('🔄 RundownHeaderPropsAdapter: Received props:', {
    autoScrollEnabled,
    hasToggleFunction: !!onToggleAutoScroll,
    toggleFunctionType: typeof onToggleAutoScroll,
    hasTimezoneHandler: !!onTimezoneChange,
    currentTimezone: timezone
  });

  return (
    <RundownHeader
      currentTime={currentTime}
      timezone={timezone}
      onTimezoneChange={onTimezoneChange}
      totalRuntime={totalRuntime}
      hasUnsavedChanges={hasUnsavedChanges}
      isSaving={isSaving}
      saveCompletionCount={saveCompletionCount}
      title={rundownTitle}
      onTitleChange={onTitleChange}
      rundownStartTime={rundownStartTime}
      onRundownStartTimeChange={onRundownStartTimeChange}
      rundownEndTime={rundownEndTime}
      onRundownEndTimeChange={onRundownEndTimeChange}
      items={items}
      visibleColumns={visibleColumns}
      onUndo={onUndo}
      canUndo={canUndo}
      lastAction={lastAction}
      onRedo={onRedo}
      canRedo={canRedo}
      nextRedoAction={nextRedoAction}
      isConnected={isConnected}
      isProcessingRealtimeUpdate={isProcessingRealtimeUpdate}
      isPlaying={isPlaying}
      currentSegmentId={currentSegmentId}
      timeRemaining={timeRemaining}
      autoScrollEnabled={autoScrollEnabled}
      onToggleAutoScroll={onToggleAutoScroll}
      rundownId={rundownId}
      onUpdateItem={onUpdateItem}
    />
  );
};

export default RundownHeaderPropsAdapter;


import React from 'react';
import RundownHeader from './RundownHeader';
import RealtimeStatusIndicator from './RealtimeStatusIndicator';
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
    isPlaying,
    timeRemaining,
    onPlay,
    onPause,
    onForward,
    onBackward,
    rundownTitle,
    onTitleChange,
    rundownStartTime,
    onRundownStartTimeChange,
    rundownId,
    onOpenTeleprompter,
    hasUnsavedChanges,
    isSaving,
    onUndo,
    canUndo,
    lastAction,
    isConnected,
    isProcessingRealtimeUpdate
  } = props;

  return (
    <div className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-2">
        <RundownHeader
          currentTime={currentTime}
          timezone={timezone}
          onTimezoneChange={onTimezoneChange}
          totalRuntime={totalRuntime}
          isPlaying={isPlaying}
          timeRemaining={timeRemaining}
          onPlay={onPlay}
          onPause={onPause}
          onForward={onForward}
          onBackward={onBackward}
          rundownTitle={rundownTitle}
          onTitleChange={onTitleChange}
          rundownStartTime={rundownStartTime}
          onRundownStartTimeChange={onRundownStartTimeChange}
          rundownId={rundownId}
          onOpenTeleprompter={onOpenTeleprompter}
          hasUnsavedChanges={hasUnsavedChanges}
          isSaving={isSaving}
          onUndo={onUndo}
          canUndo={canUndo}
          lastAction={lastAction}
        />
        
        {/* Add realtime status indicator */}
        {rundownId && (
          <RealtimeStatusIndicator
            isConnected={isConnected || false}
            isProcessingUpdate={isProcessingRealtimeUpdate || false}
            className="ml-4"
          />
        )}
      </div>
    </div>
  );
};

export default RundownHeaderPropsAdapter;

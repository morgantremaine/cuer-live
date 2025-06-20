import React from 'react';
import { useRundown } from '@/hooks/useRundown';
import { RundownHeader } from './RundownHeader';

interface RundownHeaderPropsAdapterProps {
  rundownId: string;
  autoScroll?: boolean;
  onToggleAutoScroll?: (enabled: boolean) => void;
}

const RundownHeaderPropsAdapter = ({ rundownId, autoScroll, onToggleAutoScroll }: RundownHeaderPropsAdapterProps) => {
  const { 
    rundown, 
    currentSegmentId, 
    currentTime, 
    timeRemaining, 
    isDark, 
    toggleTheme,
    showcallerState
  } = useRundown(rundownId);

  if (!rundown) {
    return <div>Loading rundown header...</div>;
  }

  const isPlaying = showcallerState?.isPlaying || false;

  return (
    <RundownHeader
      title={rundown.title}
      startTime={rundown.startTime || '09:00:00'}
      timezone={rundown.timezone || 'UTC'}
      currentSegmentId={currentSegmentId}
      isPlaying={isPlaying}
      timeRemaining={timeRemaining}
      isDark={isDark}
      onToggleTheme={toggleTheme}
      autoScroll={autoScroll}
      onToggleAutoScroll={onToggleAutoScroll}
    />
  );
};

export default RundownHeaderPropsAdapter;

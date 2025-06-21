
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
    totalRuntime,
    rundownTitle,
    rundownStartTime,
    items,
    isPlaying,
    currentSegmentId,
    timeRemaining
  } = props;

  return (
    <RundownHeader
      title={rundownTitle}
      startTime={rundownStartTime}
      timezone={timezone}
      currentTime={currentTime}
      totalRuntime={totalRuntime}
      items={items}
      currentSegmentId={currentSegmentId}
      isPlaying={isPlaying}
      timeRemaining={timeRemaining}
    />
  );
};

export default RundownHeaderPropsAdapter;

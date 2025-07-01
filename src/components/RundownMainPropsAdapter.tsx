
import React from 'react';
import RundownMainContent from './RundownMainContent';
import { RundownContainerProps } from '@/types/rundownContainer';

interface RundownMainPropsAdapterProps {
  props: RundownContainerProps;
}

const RundownMainPropsAdapter = ({ props }: RundownMainPropsAdapterProps) => {
  // Calculate current segment name for display
  const currentSegmentName = props.currentSegmentId 
    ? props.items.find(item => item.id === props.currentSegmentId)?.name || 'Unknown Segment'
    : 'No Active Segment';

  // Calculate total duration from all items
  const totalDuration = props.totalRuntime;

  return (
    <RundownMainContent 
      {...props} 
      currentSegmentName={currentSegmentName}
      totalDuration={totalDuration}
    />
  );
};

export default RundownMainPropsAdapter;

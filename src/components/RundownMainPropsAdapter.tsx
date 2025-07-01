
import React from 'react';
import RundownHeaderSection from './RundownHeaderSection';
import RundownMainContent from './RundownMainContent';
import RealtimeStatusIndicator from './RealtimeStatusIndicator';
import { RundownContainerProps } from '@/types/rundownContainer';

interface RundownMainPropsAdapterProps {
  props: RundownContainerProps;
}

const RundownMainPropsAdapter = ({ props }: RundownMainPropsAdapterProps) => {
  // Calculate current segment name for RundownMainContent
  const currentSegmentName = props.currentSegmentId ? 
    props.items?.find(item => item.id === props.currentSegmentId)?.name || '' : '';

  return (
    <div className="flex flex-col h-full">
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <RundownMainContent
          {...props}
          currentSegmentName={currentSegmentName}
          totalDuration={props.totalRuntime}
        />
      </div>
    </div>
  );
};

export default RundownMainPropsAdapter;

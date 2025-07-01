
import React from 'react';
import RundownContent from './RundownContent';
import { RundownContainerProps } from '@/types/rundownContainer';

interface RundownMainContentProps extends RundownContainerProps {
  currentSegmentName: string;
  totalDuration: string;
}

const RundownMainContent = (props: RundownMainContentProps) => {
  // For now, just render a simple container since we don't have all the required props
  // This component will need to be properly integrated with the full rundown state later
  return (
    <div className="flex-1 overflow-hidden">
      <div className="h-full p-4 text-center text-muted-foreground">
        Rundown content will be rendered here when properly integrated with the full state management.
      </div>
    </div>
  );
};

export default RundownMainContent;

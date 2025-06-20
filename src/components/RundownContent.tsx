import React from 'react';
import { RundownHeaderPropsAdapter } from './RundownHeaderPropsAdapter';
import { RundownMainPropsAdapter } from './RundownMainPropsAdapter';
import { RundownFooter } from './RundownFooter';

interface RundownContentProps {
  rundownId: string;
  autoScroll?: boolean;
  onToggleAutoScroll?: (enabled: boolean) => void;
}

const RundownContent = ({ rundownId, autoScroll = true, onToggleAutoScroll }: RundownContentProps) => {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <RundownHeaderPropsAdapter 
        rundownId={rundownId}
        autoScroll={autoScroll}
        onToggleAutoScroll={onToggleAutoScroll}
      />
      <RundownMainPropsAdapter 
        rundownId={rundownId}
        autoScroll={autoScroll}
      />
      <RundownFooter />
    </div>
  );
};

export default RundownContent;

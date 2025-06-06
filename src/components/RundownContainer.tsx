
import React from 'react';
import RundownLayoutWrapper from './RundownLayoutWrapper';
import RundownHeaderPropsAdapter from './RundownHeaderPropsAdapter';
import RundownMainPropsAdapter from './RundownMainPropsAdapter';
import RundownUpdateIndicator from './RundownUpdateIndicator';
import { RundownContainerProps } from '@/types/rundownContainer';

const RundownContainer = (props: RundownContainerProps) => {
  return (
    <RundownLayoutWrapper>
      <RundownHeaderPropsAdapter props={props} />
      <RundownMainPropsAdapter props={props} />
      
      {/* Real-time collaboration indicator */}
      <RundownUpdateIndicator
        hasRemoteUpdates={props.hasRemoteUpdates || false}
        hasConflict={false} // Will be implemented if needed
        onClearIndicator={props.clearRemoteUpdatesIndicator || (() => {})}
      />
    </RundownLayoutWrapper>
  );
};

export default RundownContainer;
